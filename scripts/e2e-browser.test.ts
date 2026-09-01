import puppeteer, { type Page, type Browser } from 'puppeteer-core';
import * as XLSX from 'xlsx';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP = 'http://localhost:5173/';

let failures = 0;
let browser: Browser;
let page: Page;

function check(cond: boolean, label: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ FAIL: ${label}`);
  }
  if (!cond) failures++;
}

async function bodyHas(text: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(
      (t) => {
        const body = document.body.innerText.toLowerCase();
        return body.includes(t.toLowerCase());
      },
      { timeout },
      text
    );
    return true;
  } catch {
    return false;
  }
}

async function clickByPartial(selector: string, text: string, timeout = 10000) {
  const needle = text.toLowerCase();
  const ok = await page
    .waitForFunction(
      (sel, needleText) => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
        return els.some((e) => (e.textContent || '').toLowerCase().includes(needleText));
      },
      { timeout },
      selector,
      needle
    )
    .then(() => true)
    .catch(() => false);
  if (!ok) throw new Error(`No element ${selector} containing "${text}"`);
  await page.evaluate(
    (sel, needleText) => {
      const els = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
      const el = els.find((e) => (e.textContent || '').toLowerCase().includes(needleText));
      if (!el) throw new Error('Element disappeared');
      el.click();
    },
    selector,
    needle
  );
  await new Promise((r) => setTimeout(r, 250));
}

async function fillForm(p: { barcode: string; name: string; mrp: string; buy: string; sell: string; stock: string }) {
  const inputs = await page.$$('.product-form input');
  await inputs[0].type(p.barcode);
  await inputs[1].type(p.name);
  await inputs[2].type(p.mrp);
  await inputs[3].type(p.buy);
  await inputs[4].type(p.sell);
  await inputs[5].type(p.stock);
}

// Capture downloads at the DOM level (blob URLs) because real downloads
// are unreliable in headless Chrome. This still verifies the app's
// download trigger logic and lets us parse the yielded bytes.
async function prepareDownloadCapture() {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    const origCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b: Blob) => {
      const u = origCreate(b);
      w['__lastBlobUrl'] = u;
      w['__lastBlob'] = b;
      return u;
    };
    URL.revokeObjectURL = () => {};
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      const a = this as unknown as { download: string; href: string };
      if (a.download) {
        w['__lastDownload'] = { name: a.download, url: a.href };
      }
      if (!w['__captureOnly']) origClick.call(this);
    };
  });
}

async function readLastDownload(): Promise<{ name: string; text: string; buffer: Buffer } | null> {
  const res = await page.evaluate(async () => {
    const w = window as unknown as Record<string, unknown>;
    const dl = w['__lastDownload'] as { name: string; url: string } | undefined;
    if (!dl) return null;
    const resp = await fetch(dl.url);
    const buf = await resp.arrayBuffer();
    const bytes = Array.from(new Uint8Array(buf));
    return { name: dl.name, bytes };
  });
  if (!res) return null;
  return { name: res.name, text: Buffer.from(res.bytes).toString('utf8'), buffer: Buffer.from(res.bytes) };
}

async function snapshot(label: string) {
  const text = await page.evaluate(() => document.body.innerText.slice(0, 1200));
  console.log(`--- [${label}] page text ---`);
  console.log(text.replace(/\n+/g, ' | '));
}

console.log('=== MAC SUPERMARKET BROWSER E2E TEST ===');

async function main() {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  console.log('STEP 1 - First launch shows Setup');
  await page.goto(APP, { waitUntil: 'networkidle0', timeout: 20000 });
  const setupShown = await bodyHas('Select your section');
  check(setupShown, 'Setup page shows "Select your section"');
  if (!setupShown) await snapshot('after-goto');

  console.log('STEP 2 - Configure Section + Device');
  await clickByPartial('button', 'Section 1');
  await clickByPartial('button', 'NEXT');
  const deviceShown = await bodyHas('Device Name');
  check(deviceShown, 'Device step shown');
  await clickByPartial('button', 'Phone 1');
  await clickByPartial('button', 'SAVE & START');
  const regShown = await bodyHas('SAVE PRODUCT', 15000);
  check(regShown, 'Register screen shown after setup');

  console.log('STEP 3 - Register product with leading-zero barcode');
  await fillForm({ barcode: '097449062317', name: 'Test Product', mrp: '100', buy: '80', sell: '90', stock: '10' });
  await clickByPartial('button', 'SAVE PRODUCT');
  const savedToast = await bodyHas('Product Saved');
  check(savedToast, 'Save success toast shown');
  const countOne = await bodyHas('Products:');
  check(countOne, 'Product count badge shown');
  if (!countOne) await snapshot('after-save');

  console.log('STEP 4 - Refresh persistence');
  await page.reload({ waitUntil: 'networkidle0' });
  const stillOne = await bodyHas('Products:', 15000);
  check(stillOne, 'Product persists after browser refresh');

  console.log('STEP 5 - Duplicate detection');
  await fillForm({ barcode: '097449062317', name: 'Test Product', mrp: '100', buy: '80', sell: '90', stock: '10' });
  await clickByPartial('button', 'SAVE PRODUCT');
  const dupShown = await bodyHas('PRODUCT ALREADY EXISTS');
  check(dupShown, 'Duplicate barcode detected');
  await clickByPartial('button', 'CANCEL');

  console.log('STEP 6 - Product list + search');
  await clickByPartial('nav button', 'Products');
  const listShown = await bodyHas('Products Registered: 1', 15000);
  check(listShown, 'Products page shows registered count 1');
  const cardShown = await bodyHas('097449062317');
  check(cardShown, 'Product card shows leading-zero barcode');
  const searchInput = await page.$('.search-input');
  if (searchInput) {
    await searchInput.type('09744906');
    await new Promise((r) => setTimeout(r, 900));
    check(await bodyHas('097449062317'), 'Search by barcode finds product');
    await page.evaluate(() => {
      const input = document.querySelector('.search-input') as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  console.log('STEP 7 - Edit product (name) + preserve barcode');
  await clickByPartial('button', 'Edit');
  const editModal = await bodyHas('EDIT PRODUCT');
  check(editModal, 'Edit modal opens');
  const editInputs = await page.$$('.modal-edit input');
  let nameInput: import('puppeteer-core').ElementHandle<Element> | null = null;
  for (const h of editInputs) {
    const v = await h.evaluate((el) => (el as HTMLInputElement).value);
    if (v === 'Test Product') { nameInput = h; break; }
  }
  if (!nameInput) throw new Error('edit name input not found');
  await nameInput.click({ clickCount: 3 });
  await page.keyboard.type('Edited Test Product');
  await clickByPartial('button', 'SAVE');
  const editedShown = await bodyHas('Edited Test Product', 15000);
  check(editedShown, 'Edit persists in list');
  check(await bodyHas('097449062317'), 'Barcode preserved after edit');

  console.log('STEP 8 - Delete product');
  await clickByPartial('button', 'Delete');
  const delConfirm = await bodyHas('DELETE PRODUCT?');
  check(delConfirm, 'Delete confirmation shown');
  await clickByPartial('button', 'DELETE');
  const emptyShown = await bodyHas('Products Registered: 0', 15000);
  check(emptyShown, 'Product deleted, count 0');

  console.log('STEP 9 - Re-register then export Excel');
  await clickByPartial('nav button', 'Register');
  await bodyHas('SAVE PRODUCT', 15000);
  await fillForm({ barcode: '097449062317', name: 'Test Product', mrp: '100', buy: '80', sell: '90', stock: '10' });
  await clickByPartial('button', 'SAVE PRODUCT');
  await bodyHas('Products:', 15000);

  await prepareDownloadCapture();

  await clickByPartial('nav button', 'Settings');
  await bodyHas('Export Excel / CSV', 15000);
  await clickByPartial('button', 'Export Excel / CSV');
  const previewShown = await bodyHas('MAC_SUPERMARKET_SECTION_1.xlsx');
  check(previewShown, 'Export preview shows correct filename');

  await clickByPartial('button', 'EXPORT EXCEL');
  const xlsx = await readLastDownload();
  check(xlsx !== null, 'Excel export triggered a download');
  if (xlsx) {
    check(xlsx.name === 'MAC_SUPERMARKET_SECTION_1.xlsx', 'Excel filename correct');
    const wb = XLSX.read(xlsx.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[];
    check(rows.length === 1, 'Excel has exactly 1 data row');
    check(
      JSON.stringify(headers) === JSON.stringify(['Barcode', 'Product Name', 'MRP', 'Buying Price', 'Selling Price', 'Opening Stock', 'Expiry']),
      'Excel has exactly the 7 required columns'
    );
    check(rows[0]['Barcode'] === '097449062317', 'Excel preserves leading-zero barcode exactly');
    check(ws['A2'] && ws['A2'].t === 's', 'Excel barcode cell is text type');
    check(rows[0]['Product Name'] === 'Test Product', 'Excel product name correct');
    check(rows[0]['MRP'] === 100 && rows[0]['Buying Price'] === 80 && rows[0]['Selling Price'] === 90 && rows[0]['Opening Stock'] === 10, 'Excel MRP/buy/sell/stock correct');
  }

  console.log('STEP 10 - CSV export');
  await clickByPartial('button', 'Export Excel / CSV');
  await clickByPartial('button', 'EXPORT CSV');
  const csv = await readLastDownload();
  check(csv !== null, 'CSV export triggered a download');
  if (csv) {
    check(csv.name === 'MAC_SUPERMARKET_SECTION_1.csv', 'CSV filename correct');
    check(csv.text.includes('097449062317'), 'CSV contains leading-zero barcode');
  }

  console.log('STEP 11 - Backup JSON download');
  await clickByPartial('button', 'Backup Data (JSON)');
  const backup = await readLastDownload();
  check(backup !== null, 'Backup triggered a download');
  if (backup) {
    check(backup.name === 'MAC_SUPERMARKET_SECTION_1_BACKUP.json', 'Backup filename correct');
    const data = JSON.parse(backup.text);
    check(data.sectionName === 'Section 1' && data.deviceName === 'Phone 1', 'Backup contains section and device');
    check(data.products && data.products.length === 1 && data.products[0].barcode === '097449062317', 'Backup contains product with exact barcode');
  }

  console.log('STEP 12 - Clear All Data requires typed confirmation');
  await clickByPartial('button', 'Clear All Data');
  const warnShown = await bodyHas('Type');
  check(warnShown, 'Warning shown before clearing');
  const confirmInput = await page.$('.confirm-input');
  if (!confirmInput) throw new Error('confirm input not found');
  await confirmInput.type('DELETE');
  await new Promise((r) => setTimeout(r, 300));
  await clickByPartial('button', 'DELETE ALL DATA');
  const cleared = await bodyHas('All data cleared');
  check(cleared, 'Clear data required typed confirmation');

  check(consoleErrors.length === 0, `No console/page errors (${consoleErrors.length})`);

  console.log('');
  if (failures === 0) {
    console.log('ALL BROWSER E2E TESTS PASSED');
  } else {
    console.error(`${failures} BROWSER TEST(S) FAILED`);
  }
}

main()
  .catch((err) => {
    console.error('E2E run failed:', err);
    failures++;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (failures > 0) process.exit(1);
  });