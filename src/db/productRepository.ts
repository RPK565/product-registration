import { db } from './database';
import type { Product } from '../types/Product';

export async function addProduct(product: Product): Promise<number> {
  return db.products.add(product);
}

export async function updateProduct(id: number, product: Partial<Product>): Promise<number> {
  return db.products.update(id, product);
}

export async function deleteProduct(id: number): Promise<void> {
  return db.products.delete(id);
}

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  return db.products.where('barcode').equals(barcode).first();
}

export async function getAllProducts(): Promise<Product[]> {
  return db.products.toArray();
}

export async function searchProducts(query: string): Promise<Product[]> {
  const lower = query.toLowerCase();
  const all = await db.products.toArray();
  return all.filter(
    (p) =>
      p.productName.toLowerCase().includes(lower) ||
      p.barcode.toLowerCase().includes(lower)
  );
}

export async function getProductCount(): Promise<number> {
  return db.products.count();
}

export async function clearAllProducts(): Promise<void> {
  await db.products.clear();
}

export async function bulkAddProducts(products: Product[]): Promise<void> {
  await db.products.bulkAdd(products);
}

export async function getSetting(): Promise<{ sectionName: string; deviceName: string; isConfigured: boolean }> {
  const setting = await db.settings.toCollection().first();
  return setting || { sectionName: '', deviceName: '', isConfigured: false };
}

export async function saveSetting(sectionName: string, deviceName: string): Promise<void> {
  await db.settings.clear();
  await db.settings.add({ sectionName, deviceName, isConfigured: true });
}
