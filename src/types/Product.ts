export interface Product {
  id?: number;
  barcode: string;
  productName: string;
  mrp: number;
  buyingPrice: number;
  sellingPrice: number;
  openingStock: number;
  expiry: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id?: number;
  sectionName: string;
  deviceName: string;
  isConfigured: boolean;
}
