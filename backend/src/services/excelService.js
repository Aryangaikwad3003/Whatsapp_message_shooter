const xlsx = require('xlsx');

class ExcelService {
  parse(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    
    if (json.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = Object.keys(json[0]);
    return { headers, rows: json };
  }
}

module.exports = new ExcelService();
