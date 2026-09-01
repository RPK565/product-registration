import { useState, useEffect, useCallback } from 'react';
import { getAllProducts, getSetting } from '../../db/productRepository';
import { validateProducts } from '../../utils/validation';
import type { Product } from '../../types/Product';

interface ExportPreviewProps {
  onClose: () => void;
}

export default function ExportPreview({ onClose }: ExportPreviewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sectionName, setSectionName] = useState('');
  const [validCount, setValidCount] = useState(0);
  const [issues, setIssues] = useState<Product[]>([]);
  const [showIssues, setShowIssues] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const all = await getAllProducts();
    const setting = await getSetting();
    setProducts(all);
    setSectionName(setting.sectionName);
    const { valid, issues: issueList } = validateProducts(all);
    setValidCount(valid.length);
    setIssues(issueList);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const issueCount = issues.length;
  const safeSection = sectionName.replace(/\s+/g, '_').toUpperCase();
  const fileName = `MAC_SUPERMARKET_${safeSection}.xlsx`;

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>EXPORT</h3>
        <div className="modal-body export-info">
          <p><strong>Section:</strong> {sectionName}</p>
          <p><strong>Products:</strong> {products.length}</p>
          <p><strong>File:</strong> {fileName}</p>
          <div className="export-validation">
            <p className={issueCount === 0 ? 'valid' : 'warning'}>
              <span className="check-icon">{issueCount === 0 ? '✓' : '⚠'}</span>
              {' '}{validCount} valid products
              {issueCount > 0 && `, ${issueCount} products need attention`}
            </p>
          </div>

          {issueCount > 0 && (
            <div className="issues-section">
              <button className="btn btn-small btn-secondary" onClick={() => setShowIssues(!showIssues)}>
                {showIssues ? 'Hide' : 'View'} problematic products ({issueCount})
              </button>
              {showIssues && (
                <ul className="issues-list">
                  {issues.map((p, i) => (
                    <li key={i}>
                      <span className="issue-name">{p.productName || '(no name)'}</span>
                      <span className="issue-barcode">{p.barcode || 'no barcode'}</span>
                      <span className="issue-reason">
                        {!p.barcode && 'missing barcode; '}
                        {!p.productName && 'missing name; '}
                        {p.mrp < 0 && 'invalid MRP; '}
                        {p.buyingPrice < 0 && 'invalid buying price; '}
                        {p.sellingPrice !== undefined && p.sellingPrice < 0 && 'invalid selling price; '}
                        {p.openingStock < 0 && 'invalid stock'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={async () => {
              const { exportToExcel } = await import('../../services/excelService');
              exportToExcel(products, sectionName);
              onClose();
            }}
          >
            EXPORT EXCEL
          </button>
          <button
            className="btn btn-primary"
            onClick={async () => {
              const { exportToCsv } = await import('../../services/excelService');
              exportToCsv(products, sectionName);
              onClose();
            }}
          >
            EXPORT CSV
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}