import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllProducts, searchProducts, deleteProduct, updateProduct, getProductCount, getProductByBarcode } from '../../db/productRepository';
import ProductCard from '../ProductCard/ProductCard';
import { getCurrentTimestamp } from '../../utils/helpers';
import type { Product } from '../../types/Product';

const PAGE_SIZE = 100;
const SHOW_ALL_THRESHOLD = 200;

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [count, setCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({ barcode: '', productName: '', mrp: '', buyingPrice: '', sellingPrice: '', openingStock: '', expiry: '' });
  const prevSearch = useRef(search);

  const loadProducts = useCallback(async () => {
    const all = search ? await searchProducts(search) : await getAllProducts();
    setProducts(all);
    setCount(await getProductCount());
    // Unlimited storage: small lists show every product at once; only very
    // large lists paginate (LOAD MORE) so phones stay responsive.
    setVisibleCount(all.length <= SHOW_ALL_THRESHOLD ? all.length : PAGE_SIZE);
  }, [search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (search === prevSearch.current) return;
    prevSearch.current = search;
    const timer = setTimeout(() => loadProducts(), 300);
    return () => clearTimeout(timer);
  }, [search, loadProducts]);

  const handleDelete = async (product: Product) => {
    if (product.id) {
      await deleteProduct(product.id);
      setDeleteConfirm(null);
      loadProducts();
    }
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setEditError('');
    setEditForm({
      barcode: product.barcode,
      productName: product.productName,
      mrp: String(product.mrp),
      buyingPrice: String(product.buyingPrice),
      sellingPrice: String(product.sellingPrice ?? 0),
      openingStock: String(product.openingStock),
      expiry: product.expiry || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editProduct?.id) return;

    const trimmedBarcode = editForm.barcode.trim();
    const trimmedName = editForm.productName.trim();
    const parsedMrp = parseFloat(editForm.mrp);
    const parsedBuy = editForm.buyingPrice.trim() === '' ? parsedMrp : parseFloat(editForm.buyingPrice);
    const parsedSell = editForm.sellingPrice.trim() === '' ? parsedMrp : parseFloat(editForm.sellingPrice);
    const parsedStock = parseInt(editForm.openingStock, 10);

    if (!trimmedBarcode) {
      setEditError('Barcode cannot be empty.');
      return;
    }
    if (!trimmedName) {
      setEditError('Product name cannot be empty.');
      return;
    }
    if (isNaN(parsedMrp) || parsedMrp < 0) {
      setEditError('MRP must be 0 or greater.');
      return;
    }
    if (isNaN(parsedBuy) || parsedBuy < 0) {
      setEditError('Buying price must be 0 or greater.');
      return;
    }
    if (isNaN(parsedSell) || parsedSell < 0) {
      setEditError('Selling price must be 0 or greater.');
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0) {
      setEditError('Opening stock must be 0 or greater.');
      return;
    }

    if (trimmedBarcode !== editProduct.barcode) {
      const existing = await getProductByBarcode(trimmedBarcode);
      if (existing && existing.id !== editProduct.id) {
        setEditError(`Barcode ${trimmedBarcode} already exists for another product.`);
        return;
      }
    }

    setEditError('');

    await updateProduct(editProduct.id, {
      barcode: trimmedBarcode,
      productName: trimmedName,
      mrp: parsedMrp,
      buyingPrice: parsedBuy,
      sellingPrice: parsedSell,
      openingStock: parsedStock,
      expiry: editForm.expiry,
      updatedAt: getCurrentTimestamp(),
    });

    setEditProduct(null);
    loadProducts();
  };

  return (
    <div className="product-list-container">
      <div className="list-header">
        <div className="list-count">Products Registered: {count}</div>
        <input
          type="text"
          placeholder="Search by name or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {editProduct && (
        <div className="modal-overlay">
          <div className="modal modal-edit">
            <h3>EDIT PRODUCT</h3>
            <div className="edit-form">
              <div className="form-group">
                <label>Barcode</label>
                <input
                  type="text"
                  value={editForm.barcode}
                  onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  value={editForm.productName}
                  onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>MRP</label>
                <input
                  type="number"
                  value={editForm.mrp}
                  onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Buying Price</label>
                <input
                  type="number"
                  value={editForm.buyingPrice}
                  onChange={(e) => setEditForm({ ...editForm, buyingPrice: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Selling Price</label>
                <input
                  type="number"
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Opening Stock</label>
                <input
                  type="number"
                  value={editForm.openingStock}
                  onChange={(e) => setEditForm({ ...editForm, openingStock: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Expiry</label>
                <input
                  type="text"
                  value={editForm.expiry}
                  onChange={(e) => setEditForm({ ...editForm, expiry: e.target.value })}
                />
              </div>
            </div>
            {editError && <div className="form-error">{editError}</div>}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                SAVE
              </button>
              <button className="btn btn-secondary" onClick={() => setEditProduct(null)}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>DELETE PRODUCT?</h3>
            <div className="modal-body">
              <p><strong>{deleteConfirm.productName}</strong></p>
              <p>{deleteConfirm.barcode}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                DELETE
              </button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="empty-state">
          {search ? 'No products match your search.' : 'No products registered yet.'}
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.slice(0, visibleCount).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={handleEdit}
                onDelete={(prod) => setDeleteConfirm(prod)}
              />
            ))}
          </div>
          {visibleCount < products.length && (
            <button className="btn btn-secondary load-more-btn" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
              LOAD MORE ({products.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
