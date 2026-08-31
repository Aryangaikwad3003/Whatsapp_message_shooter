const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dispatcher = require('../services/dispatcher');
const uploadStore = require('../db/uploadStore');
const templateStore = require('../db/templateStore');
const broadcastStore = require('../db/broadcastStore');
const xlsx = require('xlsx');

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

router.get('/:id/export-failed', (req, res) => {
  const data = broadcastStore.get(req.params.id);
  if (!data) return res.status(404).json({ error: 'Not found' });

  const failedRows = data.rows.filter(r => r.__status === 'FAILED' || r.__status === 'INVALID');
  
  if (failedRows.length === 0) {
    return res.status(400).send('No failed rows to export.');
  }

  // Convert values to strings to absolutely guarantee Excel doesn't format them as scientific notation
  const exportData = failedRows.map(r => {
    const { __index, __status, __error, ...originalData } = r;
    const safeData = {};
    for (const key in originalData) {
      safeData[key] = originalData[key] != null ? String(originalData[key]) : '';
    }
    return {
      ...safeData,
      Failure_Reason: __error || 'Unknown',
      Status: __status
    };
  });

  const sheet = xlsx.utils.json_to_sheet(exportData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, sheet, "Failed Contacts");
  
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="failed_contacts.xlsx"`);
  res.send(buffer);
});

router.get('/', (req, res) => {
  res.json(broadcastStore.getAll());
});

module.exports = router;
