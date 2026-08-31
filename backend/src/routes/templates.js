const express = require('express');
const router = express.Router();
const templateStore = require('../db/templateStore');
const uploadStore = require('../db/uploadStore');

router.post('/', (req, res) => {
  const { name, body } = req.body;
  if (!name || !body) return res.status(400).json({ error: 'Name and body required' });
  const tmpl = templateStore.create({ name, body });
  res.json(tmpl);
});

router.get('/', (req, res) => {
  const { uploadId } = req.query;
  let templates = templateStore.getAll();

  if (uploadId) {
    const uploadData = uploadStore.get(uploadId);
    if (uploadData) {
      const headers = new Set(uploadData.headers);
      templates = templates.map(t => {
        const missing = t.placeholders.filter(p => !headers.has(p));
        return {
          ...t,
          matchesHeaders: missing.length === 0,
          missingPlaceholders: missing
        };
      });
      // Sort matching first
      templates.sort((a, b) => (a.matchesHeaders === b.matchesHeaders) ? 0 : a.matchesHeaders ? -1 : 1);
    }
  }
  res.json(templates);
});

router.get('/:id', (req, res) => {
  const tmpl = templateStore.get(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Not found' });
  res.json(tmpl);
});

router.put('/:id', (req, res) => {
  const updated = templateStore.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const success = templateStore.delete(req.params.id);
  if (!success) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

router.post('/:id/validate', (req, res) => {
  const { uploadId } = req.body;
  const tmpl = templateStore.get(req.params.id);
  const uploadData = uploadStore.get(uploadId);
  
  if (!tmpl || !uploadData) return res.status(404).json({ error: 'Template or Upload not found' });
  
  const headers = new Set(uploadData.headers);
  const missing = tmpl.placeholders.filter(p => !headers.has(p));
  
  res.json({
    valid: missing.length === 0,
    missing
  });
});

module.exports = router;
