import puppeteer, { type Page } from 'puppeteer-core';
import { execSync } from 'child_process';

const CDP = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5175/';
const ADB = 'C:\\Tools\\platform-tools\\adb.exe';

let failures = 0;
let page: Page;

function check(cond: boolean, label: string) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    console.error(`  ✗ FAIL: ${label}`);
    failures++;
  }
}

async function bodyHas(text: string, timeout = 12000): Promise<boolean> {
  try {
    await page.waitForFunction(
      (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
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
      (sel, n) =>
        Array.from(document.querySelectorAll(sel)).some((e) =>
          (e.textContent || '').toLowerCase().includes(n)
        ),
      { timeout },
      selector,
      needle
    )
    .then(() => true)
    .catch(() => false);
  if (!ok) throw new Error(`No element ${selector} containing "${text}"`);
  await page.evaluate(
    (sel, n) => {
      const el = Array.from(document.querySelectorAll(sel)).find((e) =>
        (e.textContent || '').toLowerCase().includes(n)
      ) as HTMLElement;
      el.click();
    },
    selector,
    needle
  );
  await new Promise((r) => setTimeout(r, 300));
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
      if (a.download) w['__lastDownload'] = { name: a.download, url: a.href };
      if (!w['__captureOnly']) origClick.call(this);
    };
  });
}

async function readLastDownload(): Promise<{ name: string; isXlsxZip: boolean } | null> {
  const res = await page.evaluate(async () => {
    const w = window as unknown as Record<string, unknown>;
    const dl = w['__lastDownload'] as { name: string; url: string } | undefined;
    if (!dl) return null;
    const resp = await fetch(dl.url);
    const ab = await resp.arrayBuffer();
    const head = Array.from(new Uint8Array(ab, 0, 4));
    const isXlsxZip = head[0] === 0x50 && head[1] === 0x4b;
    return { name: dl.name, isXlsxZip };
  });
  return res;
}

console.log('=== MAC SUPERMARKET ON-DEVICE TEST (Samsung Galaxy A56) ===');

async function main() {
  const version = await fetch(`${CDP}/json/version`).then((r) => r.json());
  const browser = await puppeteer.connect({
    browserWSEndpoint: version.webSocketDebuggerUrl,
    defaultViewport: null,
  });

  const opened = { done: false };
  const findAppTarget = async () => {
    const targets = await browser.targets();
    for (const t of targets) {
      const url = (t as unknown as { url(): string }).url();
      if (url.startsWith(APP) || url.includes('localhost:5175')) {
        return t;
      }
    }
    return null;
  };

  let appTarget = await findAppTarget();
  if (!appTarget && !opened.done) {
    opened.done = true;
    try {
      execSync(`"${ADB}" shell am start -a android.intent.action.VIEW -d "${APP}"`, { stdio: 'pipe' });
    } catch {
      /* ignore */
    }
  }
  for (let i = 0; i < 30 && !appTarget; i++) {
    await new Promise((r) => setTimeout(r, 500));
    appTarget = await findAppTarget();
  }
  if (!appTarget) {
    console.error('App tab did not open on the phone.');
    await browser.disconnect();
    process.exit(1);
  }
  const appPage = await appTarget.page();
  page = appPage;

  const env = await page.evaluate(() => ({
    secure: window.isSecureContext,
    protocol: location.protocol,
  }));
  check(env.secure, `Secure context on device (${env.protocol}) — enables camera & PWA`);

  // Reset the app's local data so the test always starts at first launch
  const cleared = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const req = indexedDB.open('MacSupermarketDB');
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const dbConn = req.result;
          const tx = dbConn.transaction(['products', 'settings'], 'readwrite');
          tx.objectStore('products').clear();
          tx.objectStore('settings').clear();
          tx.oncomplete = () => {
            dbConn.close();
            resolve(true);
          };
          tx.onerror = () => resolve(false);
        };
      })
  );
  check(cleared, 'Device data reset to clean state');
  await page.reload({ waitUntil: 'networkidle0' });

  const sw = await page.evaluate(() =>
    navigator.serviceWorker?.getRegistrations().then((r) => r.length > 0)
  );
  check(sw === true, 'Service worker registered (PWA active)');

  console.log('STEP 1 - First launch shows Setup');
  check(await bodyHas('Select your section'), 'Setup page rendered on phone');

  console.log('STEP 2 - Configure (custom section + custom device = unlimited phones)');
  await clickByPartial('button', 'Custom Section');
  await page.type('.custom-option input', 'Grocery');
  await clickByPartial('button', 'NEXT');
  await bodyHas('Device Name');
  await clickByPartial('button', 'Custom Device');
  await page.type('.custom-option input', 'Phone 1');
  await clickByPartial('button', 'SAVE & START');
  check(await bodyHas('SAVE PRODUCT', 15000), 'Register screen shown (custom names accepted)');

  console.log('STEP 3 - Register leading-zero barcode');
  await fillForm({ barcode: '097449062317', name: 'Test Product', mrp: '100', buy: '80', sell: '90', stock: '10' });
  await clickByPartial('button', 'SAVE PRODUCT');
  check(await bodyHas('Product Saved'), 'Save success toast');
  check(await bodyHas('Products:'), 'Count badge shown');

  console.log('STEP 4 - Duplicate detection');
  await fillForm({ barcode: '097449062317', name: 'Test Product', mrp: '100', buy: '80', sell: '90', stock: '10' });
  await clickByPartial('button', 'SAVE PRODUCT');
  check(await bodyHas('PRODUCT ALREADY EXISTS'), 'Duplicate barcode blocked');
  await clickByPartial('button', 'CANCEL');

  console.log('STEP 5 - List + search');
  await clickByPartial('nav button', 'Products');
  check(await bodyHas('Products Registered: 1', 15000), '1 product listed');
  check(await bodyHas('097449062317'), 'Leading-zero barcode visible');
  const si = await page.$('.search-input');
  if (si) {
    await si.type('09744906');
    check(await bodyHas('097449062317'), 'Search finds product');
  }

  console.log('STEP 6 - Edit name (barcode preserved)');
  await clickByPartial('button', 'Edit');
  check(await bodyHas('EDIT PRODUCT'), 'Edit modal opens');
  const editInputs = await page.$$('.modal-edit input');
  let nameInput: import('puppeteer-core').ElementHandle<Element> | null = null;
  for (const h of editInputs) {
    const v = await h.evaluate((el) => (el as HTMLInputElement).value);
    if (v === 'Test Product') { nameInput = h; break; }
  }
  await nameInput!.click({ clickCount: 3 });
  await page.keyboard.type('Phone Test Item');
  await clickByPartial('button', 'SAVE');
  check(await bodyHas('Phone Test Item', 15000), 'Edit persisted');
  check(await bodyHas('097449062317'), 'Barcode preserved after edit');

  console.log('STEP 7 - Export Excel (blob capture)');
  await clickByPartial('button', 'Delete');
  await clickByPartial('button', 'DELETE');
  await bodyHas('Products Registered: 0', 15000);
  await clickByPartial('nav button', 'Register');
  await bodyHas('SAVE PRODUCT', 15000);
  await fillForm({ barcode: '097449062317', name: 'Test Product', mrp: '100', buy: '80', sell: '90', stock: '10' });
  await clickByPartial('button', 'SAVE PRODUCT');
  await bodyHas('Products:', 15000);
  await prepareDownloadCapture();
  await clickByPartial('nav button', 'Settings');
  await bodyHas('Export Excel / CSV', 15000);
  await clickByPartial('button', 'Export Excel / CSV');
  await clickByPartial('button', 'EXPORT EXCEL');
  const dl = await readLastDownload();
  check(dl !== null && dl.name === 'MAC_SUPERMARKET_GROCERY.xlsx', `Excel export triggered on phone (${dl?.name})`);
  if (dl) check(dl.isXlsxZip, 'Excel blob is a valid xlsx (ZIP) file');

  console.log('');
  if (failures === 0) console.log('ALL ON-DEVICE TESTS PASSED');
  else console.error(`${failures} ON-DEVICE TEST(S) FAILED`);

  await browser.disconnect();
}

main().catch((e) => {
  console.error('On-device test failed:', e);
  process.exit(1);
});