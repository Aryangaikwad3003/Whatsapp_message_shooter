const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const excelService = require('../services/excelService');
const uploadStore = require('../db/uploadStore');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const { headers, rows } = excelService.parse(req.file.buffer);
    const id = uuidv4();
    
    uploadStore.save(id, {
      filename: req.file.originalname,
      uploadedAt: Date.now(),
      rowCount: rows.length,
      headers,
      rows
    });

    res.json({
      uploadId: id,
      headers,
      rowCount: rows.length,
      preview: rows.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse Excel file', details: err.message });
  }
});

router.get('/:id', (req, res) => {
  const data = uploadStore.get(req.params.id);
  if (!data) return res.status(404).json({ error: 'Upload not found' });
  res.json(data);
});

router.get('/', (req, res) => {
  res.json(uploadStore.getAll());
});

module.exports = router;
