import React, { useState, useCallback } from 'react';
import Layout from '../components/Layout';
import CameraCapture from '../components/CameraCapture';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { imagesAPI } from '../services/api';
import { Upload as UploadIcon, X, CheckCircle, AlertCircle, Image, Camera } from 'lucide-react';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith('image/')
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const handleCameraCapture = (file) => {
    setFiles((prev) => [...prev, file]);
    setShowCamera(false);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setResults([]);

    try {
      if (files.length === 1) {
        const res = await imagesAPI.upload(files[0]);
        setResults([res.data]);
      } else {
        const res = await imagesAPI.bulkUpload(files);
        setResults(res.data.results);
      }
      setFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      setResults([{
        filename: t('common.error'),
        faces_detected: 0,
        message: error.response?.data?.detail || 'Upload failed'
      }]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('upload.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('upload.subtitle')}</p>
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <UploadIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-base sm:text-lg font-medium text-gray-700 mb-2">
            {t('upload.dragDrop')}
          </p>
          <p className="text-gray-500 mb-3 sm:mb-4">{t('upload.or')}</p>
          <div className={`flex flex-col sm:flex-row justify-center ${isRTL ? 'sm:space-x-reverse' : ''} space-y-3 sm:space-y-0 sm:space-x-4`}>
            <label className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition text-sm sm:text-base">
              {t('upload.browseFiles')}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowCamera(true)}
              className={`inline-flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base`}
            >
              <Camera className="w-5 h-5" />
              <span>{t('upload.useCamera')}</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
            {t('upload.supportedFormats')}
          </p>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold">
                {t('upload.selectedFiles')} ({files.length})
              </h2>
              <button
                onClick={() => setFiles([])}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                {t('common.clearAll')}
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg`}
                >
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 sm:space-x-3 flex-1 min-w-0`}>
                    <Image className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:inline">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className={`text-gray-400 hover:text-red-500 flex-shrink-0 ${isRTL ? 'mr-2' : 'ml-2'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm sm:text-base"
            >
              {uploading ? t('upload.uploading') : t('upload.uploadFiles', { count: files.length })}
            </button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('upload.uploadResults')}</h2>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                    result.faces_detected > 0
                      ? 'bg-green-50'
                      : 'bg-yellow-50'
                  }`}
                >
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 sm:space-x-3 flex-1 min-w-0`}>
                    {result.faces_detected > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{result.filename}</span>
                  </div>
                  <span className={`text-xs sm:text-sm font-medium flex-shrink-0 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                    {t('upload.facesDetected', { count: result.faces_detected })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </Layout>
  );
};

export default Upload;
