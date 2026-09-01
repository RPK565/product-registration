import { useState, useEffect } from 'react';
import { getSetting, getProductCount, saveSetting } from '../../db/productRepository';
import BackupRestore from '../../components/BackupRestore/BackupRestore';
import ExportPreview from '../../components/ExportPreview/ExportPreview';

export default function SettingsPage() {
  const [sectionName, setSectionName] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [productCount, setProductCount] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [editSection, setEditSection] = useState(false);
  const [editDevice, setEditDevice] = useState(false);
  const [newSection, setNewSection] = useState('');
  const [newDevice, setNewDevice] = useState('');

  const loadSettings = async () => {
    const setting = await getSetting();
    setSectionName(setting.sectionName);
    setDeviceName(setting.deviceName);
    setProductCount(await getProductCount());
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSection = async () => {
    if (newSection.trim()) {
      await saveSetting(newSection.trim(), deviceName);
      setSectionName(newSection.trim());
    }
    setEditSection(false);
  };

  const handleSaveDevice = async () => {
    if (newDevice.trim()) {
      await saveSetting(sectionName, newDevice.trim());
      setDeviceName(newDevice.trim());
    }
    setEditDevice(false);
  };

  return (
    <div className="settings-page">
      {showExport && <ExportPreview onClose={() => setShowExport(false)} />}

      <div className="settings-group">
        <h3>SHOP INFO</h3>
        <div className="settings-row">
          <span className="settings-label">Shop:</span>
          <span className="settings-value">MAC SUPERMARKET</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Section:</span>
          {editSection ? (
            <div className="settings-edit">
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                autoFocus
              />
              <button className="btn btn-small btn-primary" onClick={handleSaveSection}>Save</button>
              <button className="btn btn-small btn-secondary" onClick={() => setEditSection(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <span className="settings-value">{sectionName}</span>
              <button className="btn btn-small btn-secondary" onClick={() => { setNewSection(sectionName); setEditSection(true); }}>
                Change
              </button>
            </>
          )}
        </div>
        <div className="settings-row">
          <span className="settings-label">Device:</span>
          {editDevice ? (
            <div className="settings-edit">
              <input
                type="text"
                value={newDevice}
                onChange={(e) => setNewDevice(e.target.value)}
                autoFocus
              />
              <button className="btn btn-small btn-primary" onClick={handleSaveDevice}>Save</button>
              <button className="btn btn-small btn-secondary" onClick={() => setEditDevice(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <span className="settings-value">{deviceName}</span>
              <button className="btn btn-small btn-secondary" onClick={() => { setNewDevice(deviceName); setEditDevice(true); }}>
                Change
              </button>
            </>
          )}
        </div>
        <div className="settings-row">
          <span className="settings-label">Products:</span>
          <span className="settings-value">{productCount}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Storage:</span>
          <span className="settings-value">IndexedDB ✓</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Internet:</span>
          <span className="settings-value">Not required</span>
        </div>
      </div>

      <div className="settings-group">
        <h3>EXPORT</h3>
        <button className="btn btn-block btn-primary" onClick={() => setShowExport(true)}>
          Export Excel / CSV
        </button>
      </div>

      <BackupRestore />
    </div>
  );
}
