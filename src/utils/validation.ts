import type { Product } from '../types/Product';

export function validateProducts(products: Product[]): { valid: Product[]; issues: Product[] } {
  const valid: Product[] = [];
  const issues: Product[] = [];

  for (const p of products) {
    const hasIssue =
      !p.barcode ||
      !p.productName ||
      p.mrp < 0 ||
      p.buyingPrice < 0 ||
      p.openingStock < 0;
    if (hasIssue) {
      issues.push(p);
    } else {
      valid.push(p);
    }
  }

  return { valid, issues };
}