import type { Product } from '../../types/Product';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <div className="product-card">
      <div className="card-barcode">{product.barcode}</div>
      <div className="card-name">{product.productName}</div>
      <div className="card-prices">
        <span className="card-selling">Sell ₹{product.sellingPrice ?? 0}</span>
        <span className="card-mrp">MRP ₹{product.mrp}</span>
      </div>
      <div className="card-details">
        <span className="card-buy">Buy {product.buyingPrice}</span>
        <span className="card-stock">Stock: {product.openingStock}</span>
        {product.expiry && <span className="card-expiry">Exp: {product.expiry}</span>}
      </div>
      <div className="card-actions">
        <button className="btn btn-small btn-edit" onClick={() => onEdit(product)}>
          Edit
        </button>
        <button className="btn btn-small btn-delete" onClick={() => onDelete(product)}>
          Delete
        </button>
      </div>
    </div>
  );
}
