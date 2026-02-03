const express = require('express');
const router = express.Router();
const Environment = require('../models/Environment');
const EnvironmentHistory = require('../models/EnvironmentHistory');
const { notifyEnvironmentOccupied, notifyEnvironmentReleased } = require('../services/slackService');

// Obtener todos los ambientes
router.get('/environments', async (req, res) => {
  try {
    const environments = await Environment.find().sort({ name: 1 });
    res.json(environments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ambientes', error: error.message });
  }
});

// Obtener un ambiente específico
router.get('/environments/:name', async (req, res) => {
  try {
    const environment = await Environment.findOne({ name: req.params.name });
    if (!environment) {
      return res.status(404).json({ message: 'Ambiente no encontrado' });
    }
    res.json(environment);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ambiente', error: error.message });
  }
});

// Desplegar rama (ocupar ambiente)
router.post('/environments/:name/deploy', async (req, res) => {
  try {
    const { branch, deployedBy } = req.body;
    
    if (!branch || !deployedBy) {
      return res.status(400).json({ message: 'Se requiere branch y deployedBy' });
    }

    const environment = await Environment.findOne({ name: req.params.name });
    
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
    environment.deployedAt = new Date();

    await environment.save();

    // Guardar en el histórico
    console.log('💾 Guardando en histórico - Deploy:', { environmentName: environment.name, branch, performedBy: deployedBy });
    const historyEntry = await EnvironmentHistory.create({
      environmentName: environment.name,
      action: 'deploy',
      branch: branch,
      performedBy: deployedBy,
      performedAt: new Date()
    });
    console.log('✅ Histórico guardado:', historyEntry._id);

    // Enviar notificación a Slack
    await notifyEnvironmentOccupied(environment.name, branch, deployedBy);

    // Emitir evento WebSocket
    const io = req.app.get('io');
    io.emit('environment-updated', environment);

    res.json(environment);
  } catch (error) {
    res.status(500).json({ message: 'Error al desplegar', error: error.message });
  }
});

// Liberar ambiente
router.post('/environments/:name/release', async (req, res) => {
  try {
    const { releasedBy } = req.body;

    if (!releasedBy) {
      return res.status(400).json({ message: 'Se requiere releasedBy (nombre de quien libera)' });
    }

    const environment = await Environment.findOne({ name: req.params.name });
    
    if (!environment) {
      return res.status(404).json({ message: 'Ambiente no encontrado' });
    }

    if (environment.status === 'Libre') {
      return res.status(400).json({ message: 'El ambiente ya está libre' });
    }

    // Guardar información antes de limpiar para el histórico
    const previousBranch = environment.branch;
    const previousDeployedBy = environment.deployedBy;

    environment.status = 'Libre';
    environment.branch = null;
    environment.deployedBy = null;
    environment.deployedAt = null;

    await environment.save();

    // Guardar en el histórico
    console.log('💾 Guardando en histórico - Release:', { environmentName: environment.name, branch: previousBranch, performedBy: releasedBy });
    const historyEntry = await EnvironmentHistory.create({
      environmentName: environment.name,
      action: 'release',
      branch: previousBranch,
      performedBy: releasedBy,
      performedAt: new Date(),
      metadata: {
        previousDeployedBy: previousDeployedBy
      }
    });
    console.log('✅ Histórico guardado:', historyEntry._id);

    // Enviar notificación a Slack
    await notifyEnvironmentReleased(environment.name);

    // Emitir evento WebSocket
    const io = req.app.get('io');
    io.emit('environment-updated', environment);

    res.json(environment);
  } catch (error) {
    res.status(500).json({ message: 'Error al liberar ambiente', error: error.message });
  }
});

// Inicializar ambientes (crear dev4 y test4 si no existen)
router.post('/environments/init', async (req, res) => {
  try {
    const environments = ['dev4', 'test4'];
    const results = [];

    for (const envName of environments) {
      let env = await Environment.findOne({ name: envName });
      if (!env) {
        env = new Environment({ name: envName });
        await env.save();
        results.push({ created: envName });
      } else {
        results.push({ exists: envName });
      }
    }

    res.json({ message: 'Ambientes inicializados', results });
  } catch (error) {
    res.status(500).json({ message: 'Error al inicializar ambientes', error: error.message });
  }
});

// Obtener histórico de un ambiente
router.get('/environments/:name/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const history = await EnvironmentHistory.find({ 
      environmentName: req.params.name 
    })
      .sort({ performedAt: -1 })
      .limit(parseInt(limit));

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener histórico', error: error.message });
  }
});

// Obtener todo el histórico (ambos ambientes)
router.get('/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const history = await EnvironmentHistory.find()
      .sort({ performedAt: -1 })
      .limit(parseInt(limit));

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener histórico', error: error.message });
  }
});

module.exports = router;
