const express = require('express');
const router = express.Router();
const Environment = require('../models/Environment');
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

    // Enviar notificación a Slack
    await notifyEnvironmentOccupied(environment.name, branch, deployedBy);

    res.json(environment);
  } catch (error) {
    res.status(500).json({ message: 'Error al desplegar', error: error.message });
  }
});

// Liberar ambiente
router.post('/environments/:name/release', async (req, res) => {
  try {
    const environment = await Environment.findOne({ name: req.params.name });
    
    if (!environment) {
      return res.status(404).json({ message: 'Ambiente no encontrado' });
    }

    if (environment.status === 'Libre') {
      return res.status(400).json({ message: 'El ambiente ya está libre' });
    }

    environment.status = 'Libre';
    environment.branch = null;
    environment.deployedBy = null;
    environment.deployedAt = null;

    await environment.save();

    // Enviar notificación a Slack
    await notifyEnvironmentReleased(environment.name);

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

module.exports = router;
