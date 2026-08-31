const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const eventHub = require('../services/eventHub');

router.post('/init', (req, res) => {
  whatsappService.initialize();
  res.json({ success: true, status: whatsappService.getStatus().status });
});

router.get('/status', (req, res) => {
  res.json(whatsappService.getStatus());
});

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onStatus = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  eventHub.on('auth_status', onStatus);
  // Send immediate status
  res.write(`data: ${JSON.stringify(whatsappService.getStatus())}\n\n`);

  req.on('close', () => {
    eventHub.removeListener('auth_status', onStatus);
  });
});

router.post('/logout', async (req, res) => {
  await whatsappService.logout();
  res.json({ success: true });
});

module.exports = router;
