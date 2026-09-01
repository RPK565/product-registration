import Dexie, { type Table } from 'dexie';
import type { Product, AppSettings } from '../types/Product';

class MacDatabase extends Dexie {
  products!: Table<Product, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('MacSupermarketDB');
    this.version(1).stores({
      products: '++id, barcode, productName, createdAt',
      settings: '++id',
    });
  }
}

export const db = new MacDatabase();
