const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMPLATES_FILE = path.join(__dirname, '..', '..', 'templates.json');

class TemplateStore {
  constructor() {
    this._ensureFile();
  }

  _ensureFile() {
    if (!fs.existsSync(TEMPLATES_FILE)) {
      fs.writeFileSync(TEMPLATES_FILE, JSON.stringify([]), 'utf-8');
    }
  }

  _read() {
    this._ensureFile();
    try {
      const data = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return [];
    }
  }

  _write(data) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  _extractPlaceholders(body) {
    const regex = /\{([^}]+)\}/g;
    const matches = [...body.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
  }

  getAll() {
    return this._read();
  }

  get(id) {
    return this._read().find(t => t.id === id);
  }

  create(data) {
    const templates = this._read();
    const newTemplate = {
      id: uuidv4(),
      name: data.name,
      body: data.body,
      placeholders: this._extractPlaceholders(data.body || ''),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    templates.push(newTemplate);
    this._write(templates);
    return newTemplate;
  }

  update(id, data) {
    const templates = this._read();
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return null;

    const updated = {
      ...templates[index],
      ...data,
      placeholders: data.body ? this._extractPlaceholders(data.body) : templates[index].placeholders,
      updatedAt: Date.now()
    };
    templates[index] = updated;
    this._write(templates);
    return updated;
  }

  delete(id) {
    const templates = this._read();
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length !== templates.length) {
      this._write(filtered);
      return true;
    }
    return false;
  }
}

module.exports = new TemplateStore();
