const whatsappService = require('./whatsappService');
const eventHub = require('./eventHub');
const broadcastStore = require('../db/broadcastStore');

class Broadcast {
  constructor(id, upload, template, config) {
    this.id = id;
    this.upload = upload;
    this.template = template;
    this.config = config;
    
    this.state = 'INIT'; // INIT, RUNNING, PAUSED, CANCELLED, COMPLETED
    this.currentIndex = 0;
    this.rows = upload.rows.map((row, index) => ({
      ...row,
      __index: index,
      __status: 'PENDING',
      __error: null
    }));

    this.stats = {
      total: this.rows.length,
      sentCount: 0,
      failedCount: 0,
      invalidCount: 0
    };

    this.waitingMs = 0;
    this._sleepPromise = null;
    this._resolveSleep = null;

    this._saveState();
  }

  _saveState() {
    broadcastStore.save(this.id, {
      id: this.id,
      uploadId: this.upload.id,
      templateId: this.template.id,
      status: this.state,
      createdAt: Date.now(),
      total: this.stats.total,
      sentCount: this.stats.sentCount,
      failedCount: this.stats.failedCount,
      invalidCount: this.stats.invalidCount,
      currentIndex: this.currentIndex,
      rows: this.rows
    });
    this._emitProgress();
  }

  _emitProgress() {
    eventHub.emit('broadcast_progress', broadcastStore.get(this.id));
  }

  async _sleepChunked(ms) {
    this.waitingMs = ms;
    this._emitProgress();
    const interval = 250;
    
    while (this.waitingMs > 0) {
      if (this.state === 'CANCELLED' || this.state === 'PAUSED') {
        break; // Interrupt sleep
      }
      const sleepTime = Math.min(interval, this.waitingMs);
      await new Promise(r => {
        this._resolveSleep = r;
        this._sleepPromise = setTimeout(r, sleepTime);
      });
      if (this._sleepPromise) clearTimeout(this._sleepPromise);
      if (this.state === 'RUNNING') {
        this.waitingMs -= sleepTime;
        // Don't emit every 250ms, just rely on frontend countdown or emit occasionally?
        // Emitting every 250ms is too chatty. Let frontend handle countdown.
      }
    }
    this.waitingMs = 0;
    this._emitProgress();
  }

  _interpolate(body, row) {
    return body.replace(/\{([^}]+)\}/g, (match, key) => {
      return row[key] !== undefined ? row[key] : match;
    });
  }

  async start() {
    if (this.state !== 'INIT' && this.state !== 'PAUSED') return;
    this.state = 'RUNNING';
    this._saveState();
    
    while (this.currentIndex < this.rows.length && this.state === 'RUNNING') {
      const row = this.rows[this.currentIndex];
      const phoneRaw = row[this.config.phoneColumn];
      
      if (!phoneRaw) {
        row.__status = 'INVALID';
        row.__error = 'Missing phone';
        this.stats.invalidCount++;
      } else {
        const text = this._interpolate(this.template.body, row);
        try {
          const chatId = await whatsappService.toChatId(String(phoneRaw));
          if (!chatId) {
            row.__status = 'INVALID';
            row.__error = 'Invalid WhatsApp number';
            this.stats.invalidCount++;
          } else {
            const res = await whatsappService.sendMessage(chatId, text);
            if (res.success) {
              row.__status = 'SENT';
              this.stats.sentCount++;
            } else {
              row.__status = 'FAILED';
              row.__error = res.error;
              this.stats.failedCount++;
            }
          }
        } catch (err) {
          row.__status = 'FAILED';
          row.__error = err.message;
          this.stats.failedCount++;
        }
      }

      this.currentIndex++;
      this._saveState();

      if (this.currentIndex < this.rows.length && this.state === 'RUNNING') {
        const minMs = (this.config.minDelay || 0) * 60 * 1000;
        const maxMs = (this.config.maxDelay || 0) * 60 * 1000;
        
        // Pick a random delay between minMs and maxMs
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        
        await this._sleepChunked(delay);
      }
    }

    if (this.state === 'RUNNING') {
      this.state = 'COMPLETED';
      this._saveState();
    }
  }

  pause() {
    if (this.state === 'RUNNING') {
      this.state = 'PAUSED';
      if (this._resolveSleep) this._resolveSleep(); // interrupt sleep immediately
      this._saveState();
    }
  }

  resume() {
    if (this.state === 'PAUSED') {
      this.start();
    }
  }

  cancel() {
    if (this.state === 'RUNNING' || this.state === 'PAUSED') {
      this.state = 'CANCELLED';
      if (this._resolveSleep) this._resolveSleep(); // interrupt sleep immediately
      this._saveState();
    }
  }
}

class Dispatcher {
  constructor() {
    this.activeBroadcasts = new Map();
  }

  start(id, upload, template, config) {
    const broadcast = new Broadcast(id, upload, template, config);
    this.activeBroadcasts.set(id, broadcast);
    // Background execution
    broadcast.start().catch(err => console.error('Broadcast error:', err));
    return broadcast;
  }

  getBroadcast(id) {
    return this.activeBroadcasts.get(id);
  }
}

module.exports = new Dispatcher();
