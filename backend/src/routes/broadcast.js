const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dispatcher = require('../services/dispatcher');
const uploadStore = require('../db/uploadStore');
const templateStore = require('../db/templateStore');
const broadcastStore = require('../db/broadcastStore');

router.post('/start', (req, res) => {
  const { uploadId, templateId, phoneColumn, minDelay, maxDelay } = req.body;
  const upload = uploadStore.get(uploadId);
  const template = templateStore.get(templateId);

  if (!upload || !template) {
    return res.status(400).json({ error: 'Invalid uploadId or templateId' });
  }
  if (!upload.headers.includes(phoneColumn)) {
    return res.status(400).json({ error: 'Phone column not found in upload' });
  }

  const id = uuidv4();
  dispatcher.start(id, upload, template, {
    phoneColumn,
    minDelay: parseFloat(minDelay) || 0,
    maxDelay: parseFloat(maxDelay) || 0
  });

  res.json({ success: true, broadcastId: id });
});

router.post('/:id/pause', (req, res) => {
  const b = dispatcher.getBroadcast(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  b.pause();
  res.json({ success: true, state: b.state });
});

router.post('/:id/resume', (req, res) => {
  const b = dispatcher.getBroadcast(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  b.resume();
  res.json({ success: true, state: b.state });
});

router.post('/:id/cancel', (req, res) => {
  const b = dispatcher.getBroadcast(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  b.cancel();
  res.json({ success: true, state: b.state });
});

router.get('/:id', (req, res) => {
  const data = broadcastStore.get(req.params.id);
  if (!data) return res.status(404).json({ error: 'Not found' });
  
  // Mix in the current countdown state if it's active in memory
  const active = dispatcher.getBroadcast(req.params.id);
  if (active) {
    data.waitingMs = active.waitingMs;
  }
  
  res.json(data);
});

router.get('/', (req, res) => {
  res.json(broadcastStore.getAll());
});

module.exports = router;
