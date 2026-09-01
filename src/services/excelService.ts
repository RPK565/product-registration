import * as XLSX from 'xlsx';
import type { Product } from '../types/Product';

function buildSheet(products: Product[]): XLSX.WorkSheet {
  const data = products.map((p) => ({
    Barcode: p.barcode,
    'Product Name': p.productName,
    MRP: p.mrp,
    'Buying Price': p.buyingPrice,
    'Selling Price': p.sellingPrice ?? 0,
    'Opening Stock': p.openingStock,
    Expiry: p.expiry || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[cellRef]) {
      ws[cellRef].t = 's';
      ws[cellRef].v = String(ws[cellRef].v);
    }
  }

  ws['!cols'] = [
    { wch: 20 },
    { wch: 40 },
    { wch: 10 },
    { wch: 12 },
    { wch: 13 },
    { wch: 14 },
    { wch: 15 },
  ];

  return ws;
}

export function buildWorkbook(products: Product[]): XLSX.WorkBook {
  const ws = buildSheet(products);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  return wb;
}

export function getFileName(sectionName: string, extension: 'xlsx' | 'csv'): string {
  const safeSection = sectionName.replace(/\s+/g, '_').toUpperCase();
  return `MAC_SUPERMARKET_${safeSection}.${extension}`;
}

export function exportToExcel(products: Product[], sectionName: string): void {
  const wb = buildWorkbook(products);
  XLSX.writeFile(wb, getFileName(sectionName, 'xlsx'));
}

export function exportToCsv(products: Product[], sectionName: string): void {
  const ws = buildSheet(products);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = getFileName(sectionName, 'csv');
  link.click();
  URL.revokeObjectURL(link.href);
}

export function parseImportedExcel(file: File): Promise<{ barcode: string; productName: string; mrp: number; buyingPrice: number; sellingPrice: number; openingStock: number; expiry: string }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const products = rows.map((row) => ({
          barcode: String(row['Barcode'] || ''),
          productName: String(row['Product Name'] || ''),
          mrp: Number(row['MRP']) || 0,
          buyingPrice: Number(row['Buying Price']) || 0,
          sellingPrice: Number(row['Selling Price']) || 0,
          openingStock: Number(row['Opening Stock']) || 0,
          expiry: String(row['Expiry'] || ''),
        }));

        resolve(products);
      } catch {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}