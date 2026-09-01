# MAC SUPERMARKET - Product Registration

A fully offline PWA for registering supermarket products on Android phones. Each phone is an independent registration station with its own local IndexedDB database. Products are exported to Excel per phone and merged manually on a PC.

## 1. Project Structure

```
mac-supermarket/
├── public/
│   ├── favicon.svg
│   └── icons/                 # App icons (192, 512, apple-touch)
├── scripts/
│   ├── generate-icons.cjs     # Icon generator
│   ├── verify-db.test.ts      # Storage/workflow tests
│   └── verify-export.test.ts  # Excel export tests
├── src/
│   ├── components/
│   │   ├── BarcodeScanner/    # html5-qrcode camera scanning
│   │   ├── ProductForm/       # Main entry form
│   │   ├── ProductList/       # Search/list/edit/delete
│   │   ├── ProductCard/       # Mobile product card
│   │   ├── Header/            # Shop/section/device display
│   │   ├── Navigation/        # Bottom navigation
│   │   ├── BackupRestore/     # Backup/restore/import/clear
│   │   └── ExportPreview/     # Export dialog + validation
│   ├── pages/
│   │   ├── Setup/             # First-time section/device setup
│   │   ├── Register/          # Product entry screen
│   │   ├── Products/          # Product list page
│   │   └── Settings/          # Settings page
│   ├── db/
│   │   ├── database.ts        # Dexie.js IndexedDB schema
│   │   └── productRepository.ts
│   ├── services/
│   │   ├── excelService.ts    # XLSX/CSV export + import
│   │   ├── backupService.ts   # JSON backup/restore
│   │   └── barcodeService.ts
│   ├── types/                 # Product and Settings types
│   ├── utils/                 # Helpers + validation
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts             # Vite + PWA plugin
└── package.json
```

## 2. Installation

```bash
npm install
```

## 3. Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## 4. Production Build

```bash
npm run build
npm run preview
```

Run the tests:

```bash
npm test          # storage + export tests
npm run lint      # lint check
```

## 5. Deploy the Static PWA

The `dist/` folder is a fully static site. Host it with any static file server:

```bash
# Example: serve dist over your network with HTTPS (required for camera on Android)
npx serve dist --listen 8080 --ssl-cert cert.pem --ssl-key key.pem
```

For testing on four phones on the same Wi-Fi:

```bash
npm run dev -- --host   # then open http://<PC-IP>:5173 on each phone
```

Camera scanning requires a secure context (HTTPS) or `localhost`. Use a free HTTPS tunnel (e.g. Cloudflare Tunnel) or a local HTTPS server for real device testing.

## 6. Open on Android

1. Open the URL in Chrome on each phone.
2. First launch shows the setup screen.
3. Chrome menu → **Add to Home screen** → install.
4. Launch from the home screen; the app opens standalone and offline.

## 7. Install as Android PWA

- Load the site in Chrome (HTTPS required).
- Tap **⋮** (menu) → **Add to Home screen** → **Install**.
- Confirm the app name **MAC SUPERMARKET - Product Registration**.
- The app now works fully offline.

## 8. Configure the Four Phones

Each phone is configured independently:

- **Phone 1** → choose **Section 1** (rename to e.g. `Grocery`), device `Phone 1`
- **Phone 2** → choose **Section 2** (e.g. `Cleaning`), device `Phone 2`
- **Phone 3** → choose **Section 3** (e.g. `Personal Care`), device `Phone 3`
- **Phone 4** → choose **Section 4** (e.g. `Beverages`), device `Phone 4`

The header on every screen shows the current section and device so you never register into the wrong section.

## 9. Select Sections

On first open, tap your section (or "Custom Section"), then tap NEXT, pick the device name, then **SAVE & START**. Change either later in **Settings**.

## 10. Scan Products

- Tap the **📷** camera button next to the Barcode field.
- Point the rear camera at the barcode (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF).
- The scanner stops automatically after one detection and fills the barcode field.
- If the camera is unavailable, type the barcode manually.

## 11. Register Products

1. Barcode is scanned or typed.
2. Focus moves automatically: Product Name → MRP → Buying Price → Opening Stock.
3. Fill required fields and tap **SAVE PRODUCT** (or press Enter).
4. The form clears instantly and the barcode field is refocused for the next product.

Duplicates on the same phone are rejected (EDIT/CANCEL dialog). Cross-phone duplicates are handled during the final Excel merge.

## 12. Backup Data

**Settings → Backup Data (JSON)** downloads `MAC_SUPERMARKET_<SECTION>_BACKUP.json` containing all products and settings.

To restore: **Settings → Restore Backup**, choose the file, then **Replace** or **Add** to current data.

## 13. Export Excel / CSV

1. **Settings → Export Excel / CSV**.
2. Review the export preview (section, product count, file name, validation check).
3. Tap **EXPORT EXCEL** (`.xlsx`) or **EXPORT CSV**.

Columns (exactly six, one product per row):

```
Barcode | Product Name | MRP | Buying Price | Opening Stock | Expiry
```

Barcodes are stored as text, so leading zeros (e.g. `097449062317`) are preserved in Excel. No serial, ID, section, or date columns are added.

## 14. Merge the Four Excel Files (Manual)

1. Collect `MAC_SUPERMARKET_*.xlsx` from each phone (send them to the PC via cable, email, or messaging).
2. Open the four files in Excel.
3. Copy rows 2..end from files 2, 3 and 4 into file 1 below its data.
4. Save as one master workbook with the same 6 columns.
5. Check for duplicate barcodes across sections and remove/merge them as needed.

## 15. Import the Master Excel into Your Existing BILLER

1. Take the merged master Excel file (columns: `Barcode, Product Name, MRP, Buying Price, Opening Stock, Expiry`).
2. In your existing BILLER, use its **Inventory Import** feature.
3. Select the master file; each row creates one product with its stock.
4. Removing the ID/device/section columns in the export keeps the file compatible with your importer.

## Data Privacy

- No cloud database, no server, no analytics, no tracking.
- All data stays in each phone's local IndexedDB until you export it manually.
- The app works completely offline after installation.

## Output Files

| Action | File name |
| --- | --- |
| Excel export | `MAC_SUPERMARKET_<SECTION>.xlsx` |
| CSV export | `MAC_SUPERMARKET_<SECTION>.csv` |
| Backup | `MAC_SUPERMARKET_<SECTION>_BACKUP.json` |