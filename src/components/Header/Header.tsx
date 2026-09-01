import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSetting } from '../../db/productRepository';

export default function Header() {
  const [section, setSection] = useState('');
  const [device, setDevice] = useState('');
  const location = useLocation();

  useEffect(() => {
    getSetting().then((s) => {
      setSection(s.sectionName);
      setDevice(s.deviceName);
    });
  }, [location.pathname]);

  return (
    <header className="app-header">
      <div className="header-shop">MAC SUPERMARKET</div>
      {section && <div className="header-section">{section}</div>}
      {device && <div className="header-device">Device: {device}</div>}
    </header>
  );
}
