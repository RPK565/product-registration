import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { getProductByBarcode, addProduct, updateProduct } from '../../db/productRepository';
import { getCurrentTimestamp } from '../../utils/helpers';
import type { Product } from '../../types/Product';

const BarcodeScanner = lazy(() => import('../BarcodeScanner/BarcodeScanner'));

interface ProductFormProps {
  onProductSaved: () => void;
}

export default function ProductForm({ onProductSaved }: ProductFormProps) {
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [mrp, setMrp] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [openingStock, setOpeningStock] = useState('1');
  const [expiry, setExpiry] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const mrpRef = useRef<HTMLInputElement>(null);
  const buyRef = useRef<HTMLInputElement>(null);
  const sellRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const clearForm = () => {
    setBarcode('');
    setProductName('');
    setMrp('');
    setBuyingPrice('');
    setSellingPrice('');
    setOpeningStock('1');
    setExpiry('');
    setEditMode(false);
    setEditId(null);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 2500);
  };

  const checkBarcodeExists = async (barcodeValue: string) => {
    const trimmed = barcodeValue.trim();
    if (!trimmed) return;
    const existing = await getProductByBarcode(trimmed);
    if (existing && !(editMode && existing.id === editId)) {
      showMessage(`Barcode already exists: ${existing.productName}`, 'error');
    }
  };

  const handleScan = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    setShowScanner(false);
    void checkBarcodeExists(scannedBarcode);
    nameRef.current?.focus();
  };

  const handleMrpChange = (value: string) => {
    setMrp(value);
    if (buyingPrice === '') setBuyingPrice(value);
    if (sellingPrice === '') setSellingPrice(value);
  };

  const resolvePrice = (rawValue: string, parsedMrp: number): number => {
    return rawValue.trim() === '' ? parsedMrp : parseFloat(rawValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedBarcode = barcode.trim();
    const trimmedName = productName.trim();
    const parsedMrp = parseFloat(mrp);
    const parsedBuy = resolvePrice(buyingPrice, parsedMrp);
    const parsedSell = resolvePrice(sellingPrice, parsedMrp);
    const parsedStock = parseInt(openingStock, 10);

    if (!trimmedBarcode) {
      showMessage('Barcode cannot be empty.', 'error');
      barcodeRef.current?.focus();
      return;
    }
    if (!trimmedName) {
      showMessage('Product name cannot be empty.', 'error');
      nameRef.current?.focus();
      return;
    }
    if (isNaN(parsedMrp) || parsedMrp < 0) {
      showMessage('MRP must be 0 or greater.', 'error');
      mrpRef.current?.focus();
      return;
    }
    if (isNaN(parsedBuy) || parsedBuy < 0) {
      showMessage('Buying price must be 0 or greater.', 'error');
      buyRef.current?.focus();
      return;
    }
    if (isNaN(parsedSell) || parsedSell < 0) {
      showMessage('Selling price must be 0 or greater.', 'error');
      sellRef.current?.focus();
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0) {
      showMessage('Opening stock must be 0 or greater.', 'error');
      stockRef.current?.focus();
      return;
    }

    // Check duplicate barcode (not in edit mode, or barcode changed)
    if (!editMode || (editMode && trimmedBarcode !== barcode)) {
      const existing = await getProductByBarcode(trimmedBarcode);
      if (existing && (!editMode || existing.id !== editId)) {
        setDuplicateProduct(existing);
        return;
      }
    }

    const now = getCurrentTimestamp();

    if (editMode && editId) {
      await updateProduct(editId, {
        barcode: trimmedBarcode,
        productName: trimmedName,
        mrp: parsedMrp,
        buyingPrice: parsedBuy,
        sellingPrice: parsedSell,
        openingStock: parsedStock,
        expiry,
        updatedAt: now,
      });
      showMessage('✓ Product Updated', 'success');
    } else {
      const product: Product = {
        barcode: trimmedBarcode,
        productName: trimmedName,
        mrp: parsedMrp,
        buyingPrice: parsedBuy,
        sellingPrice: parsedSell,
        openingStock: parsedStock,
        expiry,
        createdAt: now,
        updatedAt: now,
      };
      await addProduct(product);
      showMessage('✓ Product Saved', 'success');
    }

    clearForm();
    onProductSaved();
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef.current?.focus();
    }
    if (e.key === 'Escape') {
      clearForm();
    }
  };

  return (
    <div className="product-form-container">
      {message && (
        <div className={`toast ${messageType}`}>
          {message}
        </div>
      )}

      {duplicateProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>PRODUCT ALREADY EXISTS</h3>
            <div className="modal-body">
              <p><strong>Barcode:</strong> {duplicateProduct.barcode}</p>
              <p><strong>Product:</strong> {duplicateProduct.productName}</p>
              <p><strong>MRP:</strong> ₹{duplicateProduct.mrp}</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setBarcode(duplicateProduct.barcode);
                  setProductName(duplicateProduct.productName);
                  setMrp(String(duplicateProduct.mrp));
                  setBuyingPrice(String(duplicateProduct.buyingPrice));
                  setSellingPrice(String(duplicateProduct.sellingPrice ?? 0));
                  setOpeningStock(String(duplicateProduct.openingStock));
                  setExpiry(duplicateProduct.expiry || '');
                  setEditMode(true);
                  setEditId(duplicateProduct.id || null);
                  setDuplicateProduct(null);
                  nameRef.current?.focus();
                }}
              >
                EDIT PRODUCT
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setDuplicateProduct(null);
                  clearForm();
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <Suspense fallback={<div className="loading">Loading scanner...</div>}>
          <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label>BARCODE</label>
          <div className="barcode-input-row">
            <input
              ref={barcodeRef}
              type="text"
              inputMode="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onBlur={() => { void checkBarcodeExists(barcode); }}
              onKeyDown={(e) => handleKeyDown(e, nameRef)}
              placeholder="Scan or type barcode"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-camera"
              onClick={() => setShowScanner(true)}
              title="Scan with camera"
            >
              📷
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>PRODUCT NAME</label>
          <input
            ref={nameRef}
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, mrpRef)}
            placeholder="Enter product name"
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label>MRP</label>
          <input
            ref={mrpRef}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={mrp}
            onChange={(e) => handleMrpChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, buyRef)}
            placeholder="0.00"
          />
        </div>

        <div className="form-group">
          <label>BUYING PRICE (OPTIONAL)</label>
          <input
            ref={buyRef}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={buyingPrice}
            onChange={(e) => setBuyingPrice(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, sellRef)}
            placeholder="Defaults to MRP if empty"
          />
        </div>

        <div className="form-group">
          <label>SELLING PRICE (OPTIONAL)</label>
          <input
            ref={sellRef}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, stockRef)}
            placeholder="Defaults to MRP if empty"
          />
        </div>

        <div className="form-group">
          <label>OPENING STOCK</label>
          <input
            ref={stockRef}
            type="number"
            inputMode="numeric"
            min="0"
            value={openingStock}
            onChange={(e) => setOpeningStock(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, expiryRef)}
            placeholder="1"
          />
        </div>

        <div className="form-group">
          <label>EXPIRY (OPTIONAL)</label>
          <input
            ref={expiryRef}
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
              if (e.key === 'Escape') clearForm();
            }}
            placeholder="e.g. 12/2025"
          />
        </div>

        <button type="submit" className="btn btn-save">
          {editMode ? 'UPDATE PRODUCT' : 'SAVE PRODUCT'}
        </button>

        {editMode && (
          <button type="button" className="btn btn-secondary" onClick={clearForm}>
            CANCEL EDIT
          </button>
        )}
      </form>
    </div>
  );
}
