import React, { useState, useCallback } from 'react';
import Layout from '../components/Layout';
import CameraCapture from '../components/CameraCapture';
import ImageModal from '../components/ImageModal';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { facesAPI } from '../services/api';
import { Search as SearchIcon, Upload, User, Image, Camera } from 'lucide-react';

const Search = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [threshold, setThreshold] = useState(0.7);
  const [dragActive, setDragActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [modalImage, setModalImage] = useState(null);
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

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setResults(null);
    }
  }, []);

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResults(null);
    }
  };

  const handleCameraCapture = (capturedFile) => {
    setFile(capturedFile);
    setPreview(URL.createObjectURL(capturedFile));
    setResults(null);
    setShowCamera(false);
  };

  const handleSearch = async () => {
    if (!file) return;

    setSearching(true);
    setResults(null);

    try {
      const res = await facesAPI.search(file, 20, threshold);
      setResults(res.data);
    } catch (error) {
      console.error('Search error:', error);
      setResults({
        query_faces_detected: 0,
        results: [],
        total_matches: 0,
        error: error.response?.data?.detail || t('errors.unknownError')
      });
    } finally {
      setSearching(false);
    }
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
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('search.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('search.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('search.queryImage')}</h2>

            {!preview ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{t('search.dragDropImage')}</p>
                <div className={`flex flex-col sm:flex-row justify-center ${isRTL ? 'sm:space-x-reverse' : ''} space-y-2 sm:space-y-0 sm:space-x-3`}>
                  <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition text-sm">
                    {t('upload.browseFiles')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowCamera(true)}
                    className={`inline-flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t('nav.camera')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt="Query"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setResults(null);
                    }}
                    className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                  >
                    {t('common.remove')}
                  </button>
                  <button
                    onClick={() => setShowCamera(true)}
                    className={`flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-1`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t('search.retake')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Search Settings */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search.similarityThreshold')}: {threshold}
              </label>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t('search.moreResults')}</span>
                <span>{t('search.moreAccurate')}</span>
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={!file || searching}
              className={`mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}
            >
              {searching ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('search.searching')}</span>
                </>
              ) : (
                <>
                  <SearchIcon className="w-5 h-5" />
                  <span>{t('common.search')}</span>
                </>
              )}
            </button>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('search.searchResults')}</h2>

            {!results ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <SearchIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base">{t('search.uploadAndSearch')}</p>
              </div>
            ) : results.error ? (
              <div className="text-center py-8 sm:py-12 text-red-500">
                <p className="text-sm sm:text-base">{results.error}</p>
              </div>
            ) : results.query_faces_detected === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <p className="text-sm sm:text-base">{t('search.noFaceDetected')}</p>
              </div>
            ) : results.results.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <p className="text-sm sm:text-base">{t('search.noMatches')}</p>
                <p className="text-xs sm:text-sm mt-2">{t('search.tryLowerThreshold')}</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  {t('search.foundMatches', { count: results.total_matches })}
                </p>
                <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                  {results.results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 sm:space-x-4 p-2 sm:p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition`}
                      onClick={() => openFaceModal(index)}
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        <img
                          src={getFaceImageUrl(result.face_image_path)}
                          alt={`Match ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                          {result.person_name ? (
                            <>
                              <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium text-sm sm:text-base truncate">{result.person_name}</span>
                            </>
                          ) : (
                            <span className="text-gray-500 text-sm sm:text-base">{t('search.unknownPerson')}</span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {t('common.image')} #{result.image_id}
                        </p>
                      </div>
                      <div className={`text-${isRTL ? 'left' : 'right'} flex-shrink-0`}>
                        <div className={`text-base sm:text-lg font-bold ${
                          result.similarity_score >= 0.8
                            ? 'text-green-600'
                            : result.similarity_score >= 0.6
                            ? 'text-yellow-600'
                            : 'text-orange-600'
                        }`}>
                          {(result.similarity_score * 100).toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500 hidden sm:block">{t('search.similarity')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Full-size Face Modal */}
      <ImageModal
        isOpen={modalImage !== null}
        onClose={() => setModalImage(null)}
        imageSrc={modalImage !== null && results?.results?.[modalImage] ? getFaceImageUrl(results.results[modalImage].face_image_path) : ''}
        alt="Search Result"
        images={results?.results || []}
        currentIndex={modalImage || 0}
        onNavigate={(index) => setModalImage(index)}
      />
    </Layout>
  );
};

export default Search;
