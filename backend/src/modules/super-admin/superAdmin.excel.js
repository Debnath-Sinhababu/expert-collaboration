const ExcelJS = require('exceljs');

function safeSheetName(name) {
  return String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
}

function normalizeValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function addSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(safeSheetName(name));
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || Math.max(14, String(column.header).length + 4),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F5F1' },
  };
  for (const row of rows || []) {
    const next = {};
    for (const column of columns) next[column.key] = normalizeValue(column.value ? column.value(row) : row[column.key]);
    sheet.addRow(next);
  }
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
}

async function workbookBuffer(build) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CalxMap Super Admin';
  workbook.created = new Date();
  await build(workbook);
  return workbook.xlsx.writeBuffer();
}

module.exports = {
  addSheet,
  workbookBuffer,
};
