import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

interface BarcodeDetectorLike {
  detect(source: unknown): Promise<Array<{ rawValue: string }>>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const DETECTOR_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'itf',
  'qr_code',
  'data_matrix',
  'aztec',
];

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load photo'));
    img.src = url;
  });
}

async function decodeFromFile(file: File): Promise<string> {
  // 1) Native BarcodeDetector (Chrome on Android) — fast, uses the full photo.
  const BarcodeDetectorCtor = (
    globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  ).BarcodeDetector;
  if (BarcodeDetectorCtor) {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const detector = new BarcodeDetectorCtor({ formats: DETECTOR_FORMATS });
        const codes = await detector.detect(bitmap);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          return codes[0].rawValue;
        }
      } finally {
        bitmap.close();
      }
    } catch {
      // fall through to ZXing
    }
  }

  // 2) ZXing (works everywhere) on the high-resolution photo.
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const reader = new BrowserMultiFormatReader();
    const result = await Promise.race([
      reader.decodeFromImageElement(img),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 20000)
      ),
    ]);
    return result.getText();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onScanRef = useRef(onScan);
  const [mode, setMode] = useState<'native' | 'live'>('native');
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchError, setTorchError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    if (mode !== 'live') return;
    let mounted = true;

    const startScanner = async () => {
      if (!containerRef.current) return;

      try {
        const scanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.5,
            // Higher resolution + continuous autofocus = sharper scans
            videoConstraints: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              advanced: [
                { focusMode: 'continuous' } as unknown as MediaTrackConstraintSet,
              ],
            },
          },
          (decodedText) => {
            if (mounted) {
              setScanning(false);
              onScanRef.current(decodedText);
              void scanner.stop();
            }
          },
          () => {}
        );
      } catch {
        if (mounted) {
          setError('Camera unavailable. You can enter the barcode manually.');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        Promise.resolve(scannerRef.current.stop()).catch(() => {});
        Promise.resolve(scannerRef.current.clear()).catch(() => {});
      }
    };
  }, [mode]);

  const stopLiveScanner = () => {
    if (scannerRef.current) {
      Promise.resolve(scannerRef.current.stop()).catch(() => {});
      Promise.resolve(scannerRef.current.clear()).catch(() => {});
    }
  };

  const handleClose = () => {
    stopLiveScanner();
    onClose();
  };

  const handleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      // Do NOT rely on getCapabilities().torch: many Android devices (incl.
      // Samsung) support torch but hide it from capabilities(), so attempt
      // the constraint directly and only fall back if the device rejects it.
      const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
      let next: boolean;
      try {
        next = !(torch.value() ?? torchOn);
      } catch {
        next = !torchOn;
      }
      await scanner.applyVideoConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
      setTorchError('');
    } catch {
      setTorchError('Flashlight not supported on this device');
      setTimeout(() => setTorchError(''), 2500);
    }
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReadingPhoto(true);
    setPhotoError('');
    try {
      const barcode = await decodeFromFile(file);
      if (barcode) {
        onScanRef.current(barcode);
      } else {
        setPhotoError(
          'No barcode found in that photo. Retake with the barcode centered and clear.'
        );
      }
    } catch {
      setPhotoError(
        'Could not read the barcode. Retake with the barcode centered and clear.'
      );
    } finally {
      setReadingPhoto(false);
    }
  };

  if (error) {
    return (
      <div className="scanner-overlay">
        <div className="scanner-modal">
          <div className="scanner-error">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={handleClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="scanner-header">
          <h3>Scan Barcode</h3>
          <button className="btn-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="scanner-mode-tabs">
          <button
            className={`scanner-mode-tab ${mode === 'native' ? 'scanner-mode-tab-active' : ''}`}
            onClick={() => setMode('native')}
          >
            📷 Camera App
          </button>
          <button
            className={`scanner-mode-tab ${mode === 'live' ? 'scanner-mode-tab-active' : ''}`}
            onClick={() => setMode('live')}
          >
            Live Preview
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelected}
          hidden
        />

        {mode === 'native' && (
          <div className="scanner-native">
            <p className="scanner-native-note">
              Opens your phone&apos;s camera app — full quality, real autofocus —
              then reads the barcode from the photo automatically.
            </p>
            <button
              className="btn btn-primary btn-scanner-launch"
              disabled={readingPhoto}
              onClick={() => fileRef.current?.click()}
            >
              {readingPhoto ? 'Reading barcode…' : '📷 Open Camera App'}
            </button>
            <p className="scanner-hint">
              Take the photo with the barcode centered, close-up and flat.
            </p>
          </div>
        )}

        {mode === 'live' && (
          <>
            <div
              id="barcode-reader"
              ref={containerRef}
              className="scanner-container"
            />
            {torchError && <p className="scanner-torch-error">{torchError}</p>}
            {scanning && <p className="scanner-hint">Point camera at barcode</p>}
            <button
              className={`btn-torch ${torchOn ? 'btn-torch-on' : ''}`}
              onClick={handleTorch}
              aria-pressed={torchOn}
            >
              🔦 {torchOn ? 'ON' : 'Flashlight'}
            </button>
          </>
        )}

        {photoError && <p className="scanner-torch-error">{photoError}</p>}
      </div>
    </div>
  );
}