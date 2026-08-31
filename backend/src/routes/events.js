const express = require('express');
const router = express.Router();
const eventHub = require('../services/eventHub');

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onProgress = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'broadcast_progress', data })}\n\n`);
  };
  
  const onError = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'broadcast_error', data })}\n\n`);
  };

  eventHub.on('broadcast_progress', onProgress);
  eventHub.on('broadcast_error', onError);

  req.on('close', () => {
    eventHub.removeListener('broadcast_progress', onProgress);
    eventHub.removeListener('broadcast_error', onError);
  });
});

module.exports = router;
