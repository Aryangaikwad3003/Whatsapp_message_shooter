class UploadStore {
  constructor() {
    this.uploads = new Map();
  }

  save(id, data) {
    this.uploads.set(id, data);
  }

  get(id) {
    return this.uploads.get(id);
  }

  getAll() {
    const results = [];
    for (const [id, data] of this.uploads.entries()) {
      results.push({
        id,
        filename: data.filename,
        uploadedAt: data.uploadedAt,
        rowCount: data.rowCount,
        headers: data.headers
      });
    }
    // Return newest first
    return results.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }
}

module.exports = new UploadStore();
