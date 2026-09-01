import { useNavigate, useLocation } from 'react-router-dom';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="app-nav">
      <button
        className={`nav-btn ${location.pathname === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <span className="nav-icon">📦</span>
        <span className="nav-label">Register</span>
      </button>
      <button
        className={`nav-btn ${location.pathname === '/products' ? 'active' : ''}`}
        onClick={() => navigate('/products')}
      >
        <span className="nav-icon">📋</span>
        <span className="nav-label">Products</span>
      </button>
      <button
        className={`nav-btn ${location.pathname === '/settings' ? 'active' : ''}`}
        onClick={() => navigate('/settings')}
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Settings</span>
      </button>
    </nav>
  );
}
