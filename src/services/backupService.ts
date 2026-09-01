import { getAllProducts } from '../db/productRepository';
import { db } from '../db/database';
import type { Product } from '../types/Product';

export async function createBackup(sectionName: string, deviceName: string): Promise<void> {
  const products = await getAllProducts();
  const backup = {
    version: 1,
    sectionName,
    deviceName,
    exportedAt: new Date().toISOString(),
    products,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const safeSection = sectionName.replace(/\s+/g, '_').toUpperCase();
  link.download = `MAC_SUPERMARKET_${safeSection}_BACKUP.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function parseBackup(file: File): Promise<{ products: Product[]; sectionName: string; deviceName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        if (!backup.products || !Array.isArray(backup.products)) {
          throw new Error('Invalid backup file');
        }
        resolve({
          products: backup.products,
          sectionName: backup.sectionName || '',
          deviceName: backup.deviceName || '',
        });
      } catch {
        reject(new Error('Invalid backup file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function restoreBackupReplace(products: Product[]): Promise<number> {
  await db.products.clear();
  await db.products.bulkAdd(products);
  return products.length;
}

export async function restoreBackupAdd(products: Product[]): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;

  for (const product of products) {
    const existing = await db.products.where('barcode').equals(product.barcode).first();
    if (existing) {
      skipped++;
    } else {
      await db.products.add(product);
      added++;
    }
  }

  return { added, skipped };
}

export async function clearAllData(): Promise<void> {
  await db.products.clear();
}
