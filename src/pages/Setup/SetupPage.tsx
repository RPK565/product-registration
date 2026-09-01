import { useState } from 'react';
import { saveSetting } from '../../db/productRepository';

const DEFAULT_SECTIONS = ['Section 1', 'Section 2', 'Section 3', 'Section 4'];

interface SetupPageProps {
  onSetupComplete: () => void;
}

export default function SetupPage({ onSetupComplete }: SetupPageProps) {
  const [step, setStep] = useState<'section' | 'device'>('section');
  const [sectionName, setSectionName] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [customSection, setCustomSection] = useState('');
  const [customDevice, setCustomDevice] = useState('');
  const [useCustomSection, setUseCustomSection] = useState(false);
  const [useCustomDevice, setUseCustomDevice] = useState(false);

  const handleSave = async () => {
    const finalSection = useCustomSection ? customSection.trim() : sectionName;
    const finalDevice = useCustomDevice ? customDevice.trim() : deviceName;

    if (!finalSection) return;
    if (!finalDevice) return;

    await saveSetting(finalSection, finalDevice);
    onSetupComplete();
  };

  return (
    <div className="setup-page">
      <div className="setup-card">
        <h1 className="setup-title">MAC SUPERMARKET</h1>
        <h2 className="setup-subtitle">PRODUCT REGISTRATION</h2>

        {step === 'section' && (
          <div className="setup-step">
            <h3>Select your section:</h3>
            <div className="setup-options">
              {DEFAULT_SECTIONS.map((s) => (
                <button
                  key={s}
                  className={`btn btn-section ${sectionName === s ? 'selected' : ''}`}
                  onClick={() => { setSectionName(s); setUseCustomSection(false); }}
                >
                  {s}
                </button>
              ))}
              <div className="custom-option">
                <button
                  className={`btn btn-section ${useCustomSection ? 'selected' : ''}`}
                  onClick={() => setUseCustomSection(true)}
                >
                  Custom Section
                </button>
                {useCustomSection && (
                  <input
                    type="text"
                    placeholder="Enter section name"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                    autoFocus
                  />
                )}
              </div>
            </div>
            <button
              className="btn btn-primary btn-next"
              disabled={!sectionName && !customSection}
              onClick={() => setStep('device')}
            >
              NEXT
            </button>
          </div>
        )}

        {step === 'device' && (
          <div className="setup-step">
            <h3>Device Name:</h3>
            <div className="setup-options">
              {['Phone 1', 'Phone 2', 'Phone 3', 'Phone 4'].map((d) => (
                <button
                  key={d}
                  className={`btn btn-section ${deviceName === d ? 'selected' : ''}`}
                  onClick={() => { setDeviceName(d); setUseCustomDevice(false); }}
                >
                  {d}
                </button>
              ))}
              <div className="custom-option">
                <button
                  className={`btn btn-section ${useCustomDevice ? 'selected' : ''}`}
                  onClick={() => setUseCustomDevice(true)}
                >
                  Custom Device
                </button>
                {useCustomDevice && (
                  <input
                    type="text"
                    placeholder="Enter device name"
                    value={customDevice}
                    onChange={(e) => setCustomDevice(e.target.value)}
                    autoFocus
                  />
                )}
              </div>
            </div>
            <div className="setup-nav-buttons">
              <button className="btn btn-secondary" onClick={() => setStep('section')}>
                BACK
              </button>
              <button
                className="btn btn-primary"
                disabled={(!deviceName && !customDevice)}
                onClick={handleSave}
              >
                SAVE & START
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
