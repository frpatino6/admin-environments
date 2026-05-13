const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Environment = require('../models/Environment');
const EnvironmentHistory = require('../models/EnvironmentHistory');
const { notifyEnvironmentOccupied, notifyEnvironmentReleased } = require('../services/slackService');

// List teams
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find().sort({ slug: 1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener equipos', error: error.message });
  }
});

// Seed default teams + environments — must be before /teams/:team routes
router.post('/teams/init', async (req, res) => {
  try {
    // Migrate legacy environments: stamp team field based on name mapping
    const nameToTeam = { dev4: 'xqo', test4: 'xqo', dev1: 'xqa', test1: 'xqa', dev2: 'xqb', test2: 'xqb' };
    for (const [envName, teamSlug] of Object.entries(nameToTeam)) {
      await Environment.updateMany(
        { name: envName, team: { $exists: false } },
        { $set: { team: teamSlug } }
      );
    }
    // Remove any remaining teamless envs that aren't in the mapping
    await Environment.deleteMany({ team: { $exists: false } });

    const defaultTeams = [
      { slug: 'xqo', displayName: 'XQO', environments: ['dev4', 'test4'] },
      { slug: 'xqa', displayName: 'XQA', environments: ['dev1', 'test1'] },
      { slug: 'xqb', displayName: 'XQB', environments: ['dev2', 'test2'] },
    ];

    // Migrate legacy history records that lack team field
    for (const teamData of defaultTeams) {
      for (const envName of teamData.environments) {
        await EnvironmentHistory.updateMany(
          { environmentName: envName, team: { $exists: false } },
          { $set: { team: teamData.slug } }
        );
      }
    }

    const results = [];

    for (const teamData of defaultTeams) {
      let team = await Team.findOne({ slug: teamData.slug });
      if (!team) {
        team = new Team(teamData);
        await team.save();
        results.push({ created: teamData.slug });
      } else {
        results.push({ exists: teamData.slug });
      }

      for (const envName of teamData.environments) {
        await Environment.findOneAndUpdate(
          { name: envName, team: teamData.slug },
          { $setOnInsert: { name: envName, team: teamData.slug, status: 'Libre', branch: null, deployedBy: null, deployedAt: null } },
          { upsert: true }
        );
      }
    }

    // Seed shared environments (visible to all teams)
    const sharedEnvs = ['uat'];
    for (const envName of sharedEnvs) {
      await Environment.findOneAndUpdate(
        { name: envName, team: 'shared' },
        { $setOnInsert: { name: envName, team: 'shared', shared: true, status: 'Libre', branch: null, deployedBy: null, deployedByTeam: null, deployedAt: null } },
        { upsert: true }
      );
    }

    res.json({ message: 'Equipos inicializados', results });
  } catch (error) {
    res.status(500).json({ message: 'Error al inicializar equipos', error: error.message });
  }
});

// Get single team
router.get('/teams/:team', async (req, res) => {
  try {
    const team = await Team.findOne({ slug: req.params.team });
    if (!team) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener equipo', error: error.message });
  }
});

// Create team
router.post('/teams', async (req, res) => {
  try {
    const { slug, displayName, environments } = req.body;
    if (!slug || !displayName || !environments?.length) {
      return res.status(400).json({ message: 'Se requiere slug, displayName y environments' });
    }
    const team = new Team({ slug, displayName, environments });
    await team.save();

    for (const envName of environments) {
      await Environment.create({ name: envName, team: slug });
    }

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear equipo', error: error.message });
  }
});

// Update team Slack webhook
router.patch('/teams/:team/slack-webhook', async (req, res) => {
  try {
    const { slackWebhookUrl } = req.body;
    const team = await Team.findOneAndUpdate(
      { slug: req.params.team },
      { slackWebhookUrl: slackWebhookUrl || null },
      { new: true }
    );
    if (!team) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }
    res.json({ slug: team.slug, slackWebhookUrl: team.slackWebhookUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar webhook', error: error.message });
  }
});

// Get environments for a team (own + shared)
router.get('/teams/:team/environments', async (req, res) => {
  try {
    const environments = await Environment.find({
      $or: [{ team: req.params.team }, { shared: true }]
    }).sort({ shared: 1, name: 1 });
    res.json(environments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ambientes', error: error.message });
  }
});

// Deploy
router.post('/teams/:team/environments/:name/deploy', async (req, res) => {
  try {
    const { branch, deployedBy } = req.body;
    const { team, name } = req.params;

    if (!branch || !deployedBy) {
      return res.status(400).json({ message: 'Se requiere branch y deployedBy' });
    }

    const environment = await Environment.findOne({ name, $or: [{ team }, { shared: true }] });
    if (!environment) {
      return res.status(404).json({ message: 'Ambiente no encontrado' });
    }

    if (environment.status === 'Ocupado') {
      return res.status(400).json({
        message: `Ambiente ya está ocupado con la rama ${environment.branch} por ${environment.deployedBy}`
      });
    }

    environment.status = 'Ocupado';
    environment.branch = branch;
    environment.deployedBy = deployedBy;
    environment.deployedByTeam = environment.shared ? team : null;
    environment.deployedAt = new Date();
    await environment.save();

    await EnvironmentHistory.create({
      environmentName: name,
      team,
      action: 'deploy',
      branch,
      performedBy: deployedBy,
      performedAt: new Date()
    });

    const teamDoc = await Team.findOne({ slug: team });
    await notifyEnvironmentOccupied(environment.name, branch, deployedBy, teamDoc?.slackWebhookUrl);

    const io = req.app.get('io');
    io.emit('environment-updated', environment);

    res.json(environment);
  } catch (error) {
    res.status(500).json({ message: 'Error al desplegar', error: error.message });
  }
});

// Release
router.post('/teams/:team/environments/:name/release', async (req, res) => {
  try {
    const { releasedBy } = req.body;
    const { team, name } = req.params;

    if (!releasedBy) {
      return res.status(400).json({ message: 'Se requiere releasedBy' });
    }

    const environment = await Environment.findOne({ name, $or: [{ team }, { shared: true }] });
    if (!environment) {
      return res.status(404).json({ message: 'Ambiente no encontrado' });
    }

    if (environment.status === 'Libre') {
      return res.status(400).json({ message: 'El ambiente ya está libre' });
    }

    const previousBranch = environment.branch;
    const previousDeployedBy = environment.deployedBy;

    environment.status = 'Libre';
    environment.branch = null;
    environment.deployedBy = null;
    environment.deployedByTeam = null;
    environment.deployedAt = null;
    await environment.save();

    await EnvironmentHistory.create({
      environmentName: name,
      team,
      action: 'release',
      branch: previousBranch,
      performedBy: releasedBy,
      performedAt: new Date(),
      metadata: { previousDeployedBy }
    });

    const teamDoc = await Team.findOne({ slug: team });
    await notifyEnvironmentReleased(environment.name, releasedBy, teamDoc?.slackWebhookUrl);

    const io = req.app.get('io');
    io.emit('environment-updated', environment);

    res.json(environment);
  } catch (error) {
    res.status(500).json({ message: 'Error al liberar ambiente', error: error.message });
  }
});

// History for a specific environment
router.get('/teams/:team/environments/:name/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await EnvironmentHistory.find({
      environmentName: req.params.name,
      $or: [{ team: req.params.team }, { team: { $exists: false } }]
    })
      .sort({ performedAt: -1 })
      .limit(parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener histórico', error: error.message });
  }
});

// History for all environments in a team
router.get('/teams/:team/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    // Load team to know which env names belong to it
    const team = await Team.findOne({ slug: req.params.team });
    const envNames = team?.environments ?? [];
    const history = await EnvironmentHistory.find({
      $or: [
        { team: req.params.team },
        { team: { $exists: false }, environmentName: { $in: envNames } }
      ]
    })
      .sort({ performedAt: -1 })
      .limit(parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener histórico', error: error.message });
  }
});

module.exports = router;
