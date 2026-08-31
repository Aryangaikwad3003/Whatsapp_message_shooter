class BroadcastStore {
  constructor() {
    this.broadcasts = new Map();
  }

  save(id, data) {
    this.broadcasts.set(id, data);
  }

  get(id) {
    return this.broadcasts.get(id);
  }

  getAll() {
    const results = [];
    for (const [id, data] of this.broadcasts.entries()) {
      results.push({
        id,
        uploadId: data.uploadId,
        templateId: data.templateId,
        status: data.status,
        createdAt: data.createdAt,
        total: data.total,
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        invalidCount: data.invalidCount
      });
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }
}

module.exports = new BroadcastStore();
