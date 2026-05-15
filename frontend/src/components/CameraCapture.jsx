import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { Camera, CameraOff, RefreshCw, Check, X } from 'lucide-react';

const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const startCamera = useCallback(async (deviceId = null) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setError(t('camera.noCameraAccess'));
    }
  }, [facingMode, stream, t]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const getDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting devices:', err);
    }
  }, [selectedDevice]);

  useEffect(() => {
    getDevices();
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const handleDeviceChange = (deviceId) => {
    setSelectedDevice(deviceId);
    startCamera(deviceId);
  };

  const toggleFacingMode = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedImage({
          file,
          preview: canvas.toDataURL('image/jpeg')
        });
      }, 'image/jpeg', 0.95);
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const confirmCapture = () => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage.file);
      stopCamera();
      if (onClose) onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    if (onClose) onClose();
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-3 sm:p-4 bg-black bg-opacity-50">
        <h2 className={`text-white text-base sm:text-lg font-semibold flex items-center ${isRTL ? 'space-x-reverse' : ''}`}>
          <Camera className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {t('camera.title')}
        </h2>
        <button onClick={handleClose} className="text-white hover:text-gray-300 p-1">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera/Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {error ? (
          <div className="text-center text-white">
            <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <p className="text-red-400 mb-2">{error}</p>
            <p className="text-gray-400 text-sm mb-4">{t('camera.cameraPermission')}</p>
            <button
              onClick={() => startCamera()}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : capturedImage ? (
          <img
            src={capturedImage.preview}
            alt={t('camera.capturedImage')}
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-full max-w-full rounded-lg"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-3 sm:p-4 bg-black bg-opacity-50 safe-area-inset-bottom">
        {/* Device selector */}
        {devices.length > 1 && !capturedImage && (
          <div className="mb-3 sm:mb-4">
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 text-white rounded-lg border border-gray-700 text-sm sm:text-base"
            >
              {devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `${t('nav.camera')} ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action buttons */}
        <div className={`flex justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 sm:space-x-4`}>
          {capturedImage ? (
            <>
              <button
                onClick={retake}
                className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm sm:text-base`}
              >
                <RefreshCw className="w-5 h-5" />
                <span>{t('camera.retake')}</span>
              </button>
              <button
                onClick={confirmCapture}
                className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base`}
              >
                <Check className="w-5 h-5" />
                <span>{t('camera.usePhoto')}</span>
              </button>
            </>
          ) : (
            <>
              {devices.length > 1 && (
                <button
                  onClick={toggleFacingMode}
                  className="p-3 bg-gray-600 text-white rounded-full hover:bg-gray-700"
                  title={t('camera.switchCamera')}
                >
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
              <button
                onClick={capturePhoto}
                className="p-3 sm:p-4 bg-white rounded-full hover:bg-gray-200"
                title={t('camera.capture')}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
