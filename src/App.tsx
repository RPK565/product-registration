import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { getSetting } from './db/productRepository';
import Header from './components/Header/Header';
import Navigation from './components/Navigation/Navigation';
import SetupPage from './pages/Setup/SetupPage';
import RegisterPage from './pages/Register/RegisterPage';
import ProductsPage from './pages/Products/ProductsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import './App.css';

async function checkSetup(): Promise<boolean> {
  const setting = await getSetting();
  return setting.isConfigured;
}

function App() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    checkSetup().then(setIsConfigured);
  }, []);

  const onSetupComplete = async () => {
    setIsConfigured(await checkSetup());
  };

  if (isConfigured === null) {
    return (
      <div className="loading-screen">
        <div className="loading-text">MAC SUPERMARKET</div>
        <div className="loading-sub">Loading...</div>
      </div>
    );
  }

  if (!isConfigured) {
    return <SetupPage onSetupComplete={onSetupComplete} />;
  }

  return (
    <HashRouter>
      <div className="app">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<RegisterPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <Navigation />
      </div>
    </HashRouter>
  );
}

export default App;