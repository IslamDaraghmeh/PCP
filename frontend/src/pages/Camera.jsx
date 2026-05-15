import React, { useState } from 'react';
import Layout from '../components/Layout';
import CameraCapture from '../components/CameraCapture';
import ImageModal from '../components/ImageModal';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { imagesAPI, facesAPI } from '../services/api';
import { Camera as CameraIcon, Upload, Search, CheckCircle, AlertCircle, Users } from 'lucide-react';

const Camera = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [mode, setMode] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const handleCapture = async (file) => {
    setCapturedPreview(URL.createObjectURL(file));
    setShowCamera(false);
    setProcessing(true);
    setResult(null);

    try {
      if (mode === 'upload') {
        const res = await imagesAPI.upload(file);
        setResult({
          success: true,
          type: 'upload',
          data: res.data
        });
      } else if (mode === 'search') {
        const res = await facesAPI.search(file, 20);
        setResult({
          success: true,
          type: 'search',
          data: res.data
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.detail || t('errors.unknownError')
      });
    } finally {
      setProcessing(false);
    }
  };

  const startCapture = (captureMode) => {
    setMode(captureMode);
    setShowCamera(true);
    setResult(null);
    setCapturedPreview(null);
  };

  const reset = () => {
    setResult(null);
    setCapturedPreview(null);
    setMode(null);
  };

  const getFaceImageUrl = (path) => {
    if (!path) return null;
    const filename = path.split('/').pop().split('\\').pop();
    return `/uploads/faces/${filename}`;
  };

  const openFaceModal = (index) => {
    setModalImage(index);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('camera.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('camera.subtitle')}</p>
        </div>

        {/* Mode Selection */}
        {!capturedPreview && !processing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <button
              onClick={() => startCapture('upload')}
              className={`bg-white rounded-xl shadow-sm p-5 sm:p-8 hover:shadow-md transition ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 sm:space-x-4`}>
                <div className="p-3 sm:p-4 bg-blue-100 rounded-lg">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">{t('camera.captureUpload')}</h3>
                  <p className="text-sm text-gray-500">{t('camera.takePhotoDetect')}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startCapture('search')}
              className={`bg-white rounded-xl shadow-sm p-5 sm:p-8 hover:shadow-md transition ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 sm:space-x-4`}>
                <div className="p-3 sm:p-4 bg-green-100 rounded-lg">
                  <Search className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">{t('camera.captureSearch')}</h3>
                  <p className="text-sm text-gray-500">{t('camera.takePhotoSearch')}</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Processing State */}
        {processing && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {mode === 'upload' ? t('camera.detectingFaces') : t('camera.searchingMatches')}
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 sm:space-y-6">
            {/* Captured Image Preview */}
            {capturedPreview && (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('camera.capturedImage')}</h3>
                <img
                  src={capturedPreview}
                  alt="Captured"
                  className="max-h-48 sm:max-h-64 rounded-lg mx-auto"
                />
              </div>
            )}

            {/* Result Content */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              {result.success ? (
                result.type === 'upload' ? (
                  <div className="text-center">
                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">{t('camera.uploadSuccessful')}</h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      {t('upload.facesDetected', { count: result.data.faces_detected })}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className={`font-semibold mb-3 sm:mb-4 flex items-center text-sm sm:text-base ${isRTL ? 'space-x-reverse' : ''}`}>
                      <Users className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t('search.searchResults')} ({result.data.total_matches} {t('common.faces')})
                    </h3>
                    {result.data.results.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm sm:text-base">{t('search.noMatches')}</p>
                    ) : (
                      <div className="space-y-2 sm:space-y-3 max-h-72 sm:max-h-96 overflow-y-auto">
                        {result.data.results.map((match, index) => (
                          <div
                            key={index}
                            className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 sm:space-x-4 p-2 sm:p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition`}
                            onClick={() => openFaceModal(index)}
                          >
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                              <img
                                src={getFaceImageUrl(match.face_image_path)}
                                alt={`${t('search.matchScore')} ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">
                                {match.person_name || t('search.unknownPerson')}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {t('common.image')} #{match.image_id}
                              </p>
                            </div>
                            <div className={`text-base sm:text-lg font-bold flex-shrink-0 ${
                              match.similarity_score >= 0.8
                                ? 'text-green-600'
                                : match.similarity_score >= 0.6
                                ? 'text-yellow-600'
                                : 'text-orange-600'
                            }`}>
                              {(match.similarity_score * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center">
                  <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-red-600 mb-2">{t('common.error')}</h3>
                  <p className="text-sm sm:text-base text-gray-600">{result.message}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`flex flex-col sm:flex-row justify-center ${isRTL ? 'sm:space-x-reverse' : ''} space-y-3 sm:space-y-0 sm:space-x-4`}>
              <button
                onClick={reset}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm sm:text-base"
              >
                {t('common.startOver')}
              </button>
              <button
                onClick={() => startCapture(mode)}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
              >
                {t('common.captureAgain')}
              </button>
            </div>
          </div>
        )}

        {/* Camera Modal */}
        {showCamera && (
          <CameraCapture
            onCapture={handleCapture}
            onClose={() => setShowCamera(false)}
          />
        )}

        {/* Full-size Face Modal */}
        {result?.success && result?.type === 'search' && (
          <ImageModal
            isOpen={modalImage !== null}
            onClose={() => setModalImage(null)}
            imageSrc={modalImage !== null && result?.data?.results?.[modalImage] ? getFaceImageUrl(result.data.results[modalImage].face_image_path) : ''}
            alt={t('search.searchResults')}
            images={result?.data?.results || []}
            currentIndex={modalImage || 0}
            onNavigate={(index) => setModalImage(index)}
          />
        )}
      </div>
    </Layout>
  );
};

export default Camera;
