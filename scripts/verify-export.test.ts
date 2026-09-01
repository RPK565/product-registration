import * as XLSX from 'xlsx';
import { buildWorkbook, getFileName } from '../src/services/excelService';
import type { Product } from '../src/types/Product';

let failures = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failures++;
  }
}

function makeProducts(): Product[] {
  const products: Product[] = [];
  // 3 explicit test products including leading-zero barcode
  products.push({
    barcode: '097449062317',
    productName: 'Leading Zero Product',
    mrp: 75,
    buyingPrice: 60,
    sellingPrice: 70,
    openingStock: 25,
    expiry: '12/2025',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  products.push({
    barcode: '8901234567890',
    productName: 'Standard EAN',
    mrp: 120,
    buyingPrice: 95,
    sellingPrice: 110,
    openingStock: 20,
    expiry: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  // 97 more to reach 100 total
  for (let i = 3; i <= 100; i++) {
    products.push({
      barcode: `890${String(i).padStart(9, '0')}`,
      productName: `Test Product ${i}`,
      mrp: 10 + i,
      buyingPrice: 5 + i,
      sellingPrice: 8 + i,
      openingStock: i,
      expiry: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return products;
}

console.log('TEST: Excel export structure and leading-zero barcode protection');

const products = makeProducts();
const wb = buildWorkbook(products);
const ws = wb.Sheets['Products'];

// Headers must be exactly the seven required columns in A..G
console.log('Column headers:');
const expectedHeaders = ['Barcode', 'Product Name', 'MRP', 'Buying Price', 'Selling Price', 'Opening Stock', 'Expiry'];
expectedHeaders.forEach((h, i) => {
  const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
  assert(cell && cell.v === h, `Column ${i + 1} header = "${h}"`);
});

// No serial number / ID / Section column may exist
console.log('No unwanted extra columns:');
const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
assert(range.e.c === 6, `Sheet has only 7 columns (found ${range.e.c + 1})`);

// Leading zero barcode must be preserved exactly as text
console.log('Leading zero protection:');
const a2 = ws.A2;
assert(a2.t === 's', `A2 cell type is text/s ("${a2.t}")`);
assert(String(a2.v) === '097449062317', `A2 value is "097449062317" (got "${a2.v}")`);

// Row count: 100 products + header = 101 rows
assert(range.e.r === 100, `Exactly 100 product rows (found ${range.e.r})`);

// Verify all rows have numeric money/stock columns as text-safe numbers
console.log('Row format validation:');
const a3 = ws.A3;
assert(String(a3.v) === '8901234567890', `A3 value is "8901234567890" (got "${a3.v}")`);
const row2 = XLSX.utils.sheet_to_json(ws)[0] as Record<string, unknown>;
assert(row2['Barcode'] === '097449062317', 'Round-trip barcode unchanged via sheet_to_json');
assert(row2['Buying Price'] === 60 && row2['Selling Price'] === 70, 'Selling price column populated (Buy 60 / Sell 70)');

// File name format
assert(getFileName('Grocery', 'xlsx') === 'MAC_SUPERMARKET_GROCERY.xlsx', 'Filename for Grocery');
assert(getFileName('Personal Care', 'xlsx') === 'MAC_SUPERMARKET_PERSONAL_CARE.xlsx', 'Filename for Personal Care');
assert(getFileName('Grocery', 'csv') === 'MAC_SUPERMARKET_GROCERY.csv', 'CSV filename for Grocery');

// Round-trip: write to file, re-read, verify structure
console.log('Physical file round-trip:');
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(currentDir, '..', 'tmp-exports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const filePath = path.join(outDir, 'MAC_SUPERMARKET_TEST.xlsx');
XLSX.writeFile(wb, filePath);
const fileBuf = fs.readFileSync(filePath);
const wb2 = XLSX.read(fileBuf, { type: 'buffer' });
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const b2 = ws2.A2;
assert(String(b2.v) === '097449062317', 'On-disk file preserves "097449062317"');
assert(b2.t === 's', 'On-disk file stores barcode as text');
const headers2 = XLSX.utils.sheet_to_json(ws2, { header: 1 })[0] as unknown[];
assert(JSON.stringify(headers2) === JSON.stringify(expectedHeaders), 'On-disk file has exactly the 6 expected headers');

// Cleanup temp file
fs.rmSync(outDir, { recursive: true, force: true });

console.log('');
if (failures === 0) {
  console.log('ALL EXPORT TESTS PASSED');
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}