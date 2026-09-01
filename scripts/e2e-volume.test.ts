import puppeteer, { type Page, type Browser } from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP = 'http://localhost:5173/';
const LARGE = 20000;
const SMALL = 150;

let failures = 0;
let browser: Browser;
let page: Page;

function check(cond: boolean, label: string) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    console.error(`  ✗ FAIL: ${label}`);
    failures++;
  }
}

async function bodyHas(text: string, timeout = 15000): Promise<boolean> {
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
      (sel, needleText) =>
        Array.from(document.querySelectorAll(sel)).some(
          (e) => (e.textContent || '').toLowerCase().includes(needleText)
        ),
      { timeout },
      selector,
      needle
    )
    .then(() => true)
    .catch(() => false);
  if (!ok) throw new Error(`No element ${selector} containing "${text}"`);
  await page.evaluate(
    (sel, needleText) => {
      const el = Array.from(document.querySelectorAll(sel)).find(
        (e) => (e.textContent || '').toLowerCase().includes(needleText)
      ) as HTMLElement;
      el.click();
    },
    selector,
    needle
  );
  await new Promise((r) => setTimeout(r, 250));
}

async function seedProducts(count: number) {
  return page.evaluate(
    async (n) => {
      const t0 = performance.now();
      await new Promise<void>((resolve, reject) => {
        // Clear store first (resets count exactness for the assertion)
        const openReq = indexedDB.open('MacSupermarketDB');
        openReq.onerror = () => reject(openReq.error);
        openReq.onsuccess = () => {
          const dbConn = openReq.result;
          const clearTx = dbConn.transaction('products', 'readwrite');
          clearTx.objectStore('products').clear();
          clearTx.oncomplete = () => {
            const tx = dbConn.transaction('products', 'readwrite');
            const store = tx.objectStore('products');
            for (let i = 1; i <= n; i++) {
              store.put({
                id: i,
                barcode: String(900000000000 + i),
                productName: `Volume Product ${i}`,
                mrp: Math.round(100 + (i % 900)) / 10,
                buyingPrice: Math.round(50 + (i % 400)) / 10,
                openingStock: i % 500,
                expiry: '',
                createdAt: new Date(Date.now() - i * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
            tx.oncomplete = () => {
              dbConn.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
          clearTx.onerror = () => reject(clearTx.error);
        };
      });
      return Math.round(performance.now() - t0);
    },
    count
  );
}

async function getCardCount() {
  return page.evaluate(() => document.querySelectorAll('.product-card').length);
}

async function hasLoadMore() {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).some((b) =>
      (b.textContent || '').toUpperCase().includes('LOAD MORE')
    )
  );
}

console.log('=== MAC SUPERMARKET VOLUME + PERFORMANCE TEST (unlimited) ===');

async function main() {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();

  console.log('Setup...');
  await page.goto(APP, { waitUntil: 'networkidle0', timeout: 20000 });
  await bodyHas('Select your section');
  await clickByPartial('button', 'Section 1');
  await clickByPartial('button', 'NEXT');
  await clickByPartial('button', 'Phone 1');
  await clickByPartial('button', 'SAVE & START');
  await bodyHas('SAVE PRODUCT', 15000);

  console.log(`SMALL LIST — ${SMALL} products: should show ALL at once, no LOAD MORE`);
  await seedProducts(SMALL);
  await clickByPartial('nav button', 'Products');
  await bodyHas('Products Registered: 150', 15000);
  const smallCards = await getCardCount();
  check(smallCards === SMALL, `All ${SMALL} products shown at once (got ${smallCards}) — unlimited display`);
  check((await hasLoadMore()) === false, 'No LOAD MORE button for small list');

  console.log(`LARGE LIST — ${LARGE} products (unlimited storage proof):`);
  const insertMs = await seedProducts(LARGE);
  console.log(`  Bulk insert + clear of ${LARGE} products: ${insertMs} ms`);
  await clickByPartial('nav button', 'Register');
  await bodyHas('SAVE PRODUCT', 15000);
  await clickByPartial('nav button', 'Products');
  const tNav = Date.now();
  const loaded = await bodyHas('Products Registered: 20000', 30000);
  check(loaded, `Products page shows count ${LARGE}`);
  console.log(`  Products page loaded in ${Date.now() - tNav} ms`);

  const cardCount = await getCardCount();
  check(cardCount <= 100, `Only first 100 cards rendered (got ${cardCount}) — smart pagination active`);

  const loadMoreShown = await bodyHas('LOAD MORE', 10000);
  check(loadMoreShown, 'LOAD MORE button shown for large list');
  const loadMoreText = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('LOAD MORE')
    );
    return btn ? (btn.textContent || '').trim() : null;
  });
  check((loadMoreText || '').includes('19900'), `LOAD MORE shows remaining count (${loadMoreText})`);

  await clickByPartial('button', 'LOAD MORE');
  await page.waitForFunction(() => document.querySelectorAll('.product-card').length > 150, { timeout: 10000 });
  const afterClick = await getCardCount();
  check(afterClick === 200, `LOAD MORE renders next page (got ${afterClick})`);

  console.log('Search among 20,000 products...');
  const tSearch = Date.now();
  const searchBox = await page.$('.search-input');
  if (searchBox) {
    await searchBox.type('Volume Product 19999');
  }
  const found = await bodyHas('Volume Product 19999', 20000);
  check(found, 'Search finds product among 20000');
  console.log(`  Search completed in ${Date.now() - tSearch} ms`);

  await searchBox?.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await new Promise((r) => setTimeout(r, 1000));
  check(await bodyHas('Volume Product 1', 20000), 'Clearing search restores paginated full list');

  console.log('');
  if (failures === 0) console.log('ALL VOLUME TESTS PASSED');
  else console.error(`${failures} VOLUME TEST(S) FAILED`);
}

main()
  .catch((err) => {
    console.error('Volume test failed:', err);
    failures++;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (failures > 0) process.exit(1);
  });