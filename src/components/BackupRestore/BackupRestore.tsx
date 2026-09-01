import { useState, useRef } from 'react';
import { getSetting, clearAllProducts, getProductByBarcode, addProduct, updateProduct } from '../../db/productRepository';
import { createBackup, parseBackup, restoreBackupReplace, restoreBackupAdd } from '../../services/backupService';
import { validateProducts } from '../../utils/validation';
import type { Product } from '../../types/Product';

export default function BackupRestore() {
  const [status, setStatus] = useState('');
  const [restoreMode, setRestoreMode] = useState(false);
  const [restoreData, setRestoreData] = useState<Product[]>([]);
  const [importMode, setImportMode] = useState(false);
  const [importData, setImportData] = useState<Product[]>([]);
  const [importStats, setImportStats] = useState<{ total: number; valid: number; existing: number; fresh: number } | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearText, setClearText] = useState('');
  const backupRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    const setting = await getSetting();
    await createBackup(setting.sectionName, setting.deviceName);
    setStatus('✓ Backup downloaded');
    setTimeout(() => setStatus(''), 2500);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseBackup(file);
      setRestoreData(data.products as Product[]);
      setRestoreMode(true);
    } catch {
      setStatus('Error: Invalid backup file');
      setTimeout(() => setStatus(''), 3000);
    }
    e.target.value = '';
  };

  const handleRestoreReplace = async () => {
    const count = await restoreBackupReplace(restoreData);
    setRestoreMode(false);
    setRestoreData([]);
    setStatus(`✓ Restored ${count} products (replaced)`);
    setTimeout(() => setStatus(''), 2500);
  };

  const handleRestoreAdd = async () => {
    const result = await restoreBackupAdd(restoreData);
    setRestoreMode(false);
    setRestoreData([]);
    setStatus(`✓ Added ${result.added}, Skipped ${result.skipped}`);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { parseImportedExcel } = await import('../../services/excelService');
      const data = await parseImportedExcel(file);
      const products = data as Product[];
      setImportData(products);
      const { valid } = validateProducts(products);
      let existing = 0;
      for (const p of valid) {
        if (await getProductByBarcode(p.barcode)) existing++;
      }
      setImportStats({
        total: products.length,
        valid: valid.length,
        existing,
        fresh: valid.length - existing,
      });
      setImportMode(true);
    } catch {
      setStatus('Error: Invalid Excel file');
      setTimeout(() => setStatus(''), 3000);
    }
    e.target.value = '';
  };

  const handleImport = async (mode: 'skip' | 'update') => {
    let added = 0;
    let skipped = 0;
    let updated = 0;
    const now = new Date().toISOString();

    const { valid } = validateProducts(importData);

    for (const product of valid) {
      const existing = await getProductByBarcode(product.barcode);
      if (existing) {
        if (mode === 'update') {
          await updateProduct(existing.id as number, {
            productName: product.productName,
            mrp: product.mrp,
            buyingPrice: product.buyingPrice,
            sellingPrice: product.sellingPrice ?? 0,
            openingStock: product.openingStock,
            expiry: product.expiry,
            updatedAt: now,
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await addProduct({
          ...product,
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    }

    setImportMode(false);
    setImportData([]);
    const summary =
      mode === 'update'
        ? `✓ Added ${added}, Updated ${updated}`
        : `✓ Added ${added}, Skipped ${skipped}`;
    setStatus(summary);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleClear = async () => {
    if (clearText !== 'DELETE') return;
    await clearAllProducts();
    setClearConfirm(false);
    setClearText('');
    setStatus('✓ All data cleared');
    setTimeout(() => setStatus(''), 2500);
  };

  return (
    <div className="backup-section">
      {status && <div className="toast success">{status}</div>}

      {restoreMode && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>RESTORE BACKUP</h3>
            <div className="modal-body">
              <p>Products in backup: {restoreData.length}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleRestoreReplace}>
                REPLACE CURRENT DATA
              </button>
              <button className="btn btn-primary" onClick={handleRestoreAdd}>
                ADD TO CURRENT DATA
              </button>
              <button className="btn btn-secondary" onClick={() => setRestoreMode(false)}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {importMode && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>IMPORT PREVIEW</h3>
            <div className="modal-body">
              {importStats && (
                <div className="import-stats">
                  <p>Total Rows: {importStats.total}</p>
                  <p>New: <strong>{importStats.fresh}</strong></p>
                  <p>Existing: <strong>{importStats.existing}</strong></p>
                  <p>Errors (skipped): <strong>{importStats.total - importStats.valid}</strong></p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => handleImport('skip')}>
                IMPORT (Skip Existing)
              </button>
              <button className="btn btn-primary" onClick={() => handleImport('update')}>
                IMPORT (Update Existing)
              </button>
              <button className="btn btn-secondary" onClick={() => setImportMode(false)}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {clearConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>WARNING</h3>
            <div className="modal-body">
              <p>This will permanently delete all products stored on this phone.</p>
              <p>Type <strong>DELETE</strong> to confirm:</p>
              <input
                type="text"
                value={clearText}
                onChange={(e) => setClearText(e.target.value)}
                placeholder="Type DELETE"
                className="confirm-input"
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={handleClear}
                disabled={clearText !== 'DELETE'}
              >
                DELETE ALL DATA
              </button>
              <button className="btn btn-secondary" onClick={() => { setClearConfirm(false); setClearText(''); }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="settings-group">
        <h3>DATA MANAGEMENT</h3>
        <button className="btn btn-block" onClick={handleBackup}>
          Backup Data (JSON)
        </button>
        <input
          ref={backupRef}
          type="file"
          accept=".json"
          onChange={handleRestoreFile}
          style={{ display: 'none' }}
        />
        <button className="btn btn-block" onClick={() => backupRef.current?.click()}>
          Restore Backup
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
        <button className="btn btn-block" onClick={() => importRef.current?.click()}>
          Import Excel
        </button>
      </div>

      <div className="settings-group danger-zone">
        <h3>DANGER ZONE</h3>
        <button className="btn btn-block btn-danger" onClick={() => setClearConfirm(true)}>
          Clear All Data
        </button>
      </div>
    </div>
  );
}
