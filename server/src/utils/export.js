import ExcelJS from 'exceljs';

/**
 * Send `rows` (array of plain objects) to the client as CSV or XLSX.
 * `columns` is [{ key, header }] describing which fields to include and their order.
 */
export async function sendExport(res, { format = 'csv', filename = 'export', columns, rows }) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]).map((k) => ({ key: k, header: k })) : []);

  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Export');
    ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: 22 }));
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    await wb.xlsx.write(res);
    return res.end();
  }

  // CSV
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    cols.map((c) => escape(c.header)).join(','),
    ...rows.map((r) => cols.map((c) => escape(r[c.key])).join(',')),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  return res.send(lines.join('\n'));
}
