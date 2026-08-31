const { Client, LocalAuth } = require('whatsapp-web.js');
const eventHub = require('./eventHub');
const path = require('path');
const fs = require('fs');

class WhatsappService {
  constructor() {
    this.client = null;
    this.status = 'DISCONNECTED';
    this.qr = null;
  }

  initialize() {
    if (this.client) return;

    this.status = 'INITIALIZING';
    this._broadcastStatus();

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', '..', 'sessions') }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.client.on('qr', async (qr) => {
      this.status = 'QR_READY';
      try {
        this.qr = await require('qrcode').toDataURL(qr);
      } catch (err) {
        this.qr = null;
      }
      this._broadcastStatus();
    });

    this.client.on('ready', () => {
      this.status = 'READY';
      this.qr = null;
      this._broadcastStatus();
    });

    this.client.on('authenticated', () => {
      this.status = 'AUTHENTICATED';
      this.qr = null;
      this._broadcastStatus();
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'AUTH_FAILED';
      this.qr = null;
      this._broadcastStatus();
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'DISCONNECTED';
      this.qr = null;
      this.client = null;
      this._broadcastStatus();
    });

    this.client.initialize();
  }

  _broadcastStatus() {
    eventHub.emit('auth_status', {
      status: this.status,
      qr: this.qr
    });
  }

  getStatus() {
    return {
      status: this.status,
      qr: this.qr
    };
  }

  isReady() {
    return this.status === 'READY';
  }

  async logout() {
    if (this.client) {
      try {
        await this.client.logout();
      } catch (e) {} // ignore if already logged out
      try {
        await this.client.destroy();
      } catch (e) {} // ignore if already destroyed
      this.client = null;
    }

    // Hard-delete the session folder to guarantee a clean slate for the next QR code
    const sessionPath = path.join(__dirname, '..', '..', 'sessions');
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Could not delete session folder:', e);
    }

    this.status = 'DISCONNECTED';
    this.qr = null;
    this._broadcastStatus();
  }

  async toChatId(phone) {
    if (!this.isReady()) throw new Error('WhatsApp client not ready');
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    try {
      const numberId = await this.client.getNumberId(formattedPhone);
      if (!numberId) {
        return null;
      }
      return numberId._serialized;
    } catch (err) {
      return null;
    }
  }

  async sendMessage(chatId, text) {
    if (!this.isReady()) throw new Error('WhatsApp client not ready');
    try {
      // Human-like typing simulation
      try {
        const chat = await this.client.getChatById(chatId);
        await chat.sendStateTyping();
        
        // Dynamic typing time: roughly 50ms per character, min 1.5s, max 10s
        const baseTime = Math.min(Math.max(text.length * 50, 1500), 10000);
        // Add random jitter (± 30%) to the typing duration
        const typingMs = baseTime + (Math.random() * 0.6 - 0.3) * baseTime;
        
        await new Promise(resolve => setTimeout(resolve, typingMs));
        // Note: Sending the message automatically clears the typing state!
      } catch (typingErr) {
        // If fetching chat or setting typing state fails for any reason, quietly ignore it
        // and proceed to send the message normally.
      }

      const response = await this.client.sendMessage(chatId, text);
      return { success: true, messageId: response?.id?._serialized || 'unknown' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new WhatsappService();
