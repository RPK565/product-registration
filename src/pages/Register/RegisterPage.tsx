import { useState, useEffect } from 'react';
import ProductForm from '../../components/ProductForm/ProductForm';
import { getProductCount } from '../../db/productRepository';

export default function RegisterPage() {
  const [count, setCount] = useState(0);

  const loadCount = async () => {
    setCount(await getProductCount());
  };

  useEffect(() => {
    loadCount();
  }, []);

  return (
    <div className="register-page">
      <div className="count-badge">
        <span className="count-label">Products:</span>
        <span className="count-number">{count}</span>
      </div>
      <ProductForm onProductSaved={loadCount} />
    </div>
  );
}
