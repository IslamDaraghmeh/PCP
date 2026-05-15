import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ImageModal from '../components/ImageModal';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { imagesAPI } from '../services/api';
import { Image, Trash2, Users, Calendar, HardDrive, X, Maximize2 } from 'lucide-react';

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const res = await imagesAPI.list(0, 100);
      setImages(res.data);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('gallery.deleteConfirm'))) return;

    try {
      await imagesAPI.delete(id);
      setImages(images.filter((img) => img.id !== id));
      if (selectedImage?.id === id) setSelectedImage(null);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const getImageUrl = (image) => {
    return `/uploads/${image.filename}`;
  };

  const openFullSize = (image) => {
    setModalImage(image);
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('gallery.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('gallery.imagesUploaded', { count: images.length })}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t('gallery.noImages')}</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Image Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => setSelectedImage(image)}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden bg-gray-200 aspect-square ${
                      selectedImage?.id === image.id
                        ? 'ring-2 ring-blue-500'
                        : ''
                    }`}
                  >
                    <img
                      src={getImageUrl(image)}
                      alt={image.original_filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ddd" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".35em" fill="%23999" font-size="12">No Image</text></svg>';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition">
                      {/* Full-size button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openFullSize(image);
                        }}
                        className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} p-1.5 bg-black bg-opacity-50 rounded-lg text-white opacity-0 group-hover:opacity-100 transition hover:bg-opacity-70`}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <div className={`absolute bottom-0 ${isRTL ? 'right-0 left-0' : 'left-0 right-0'} p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition`}>
                        <p className="text-white text-xs truncate">
                          {image.original_filename}
                        </p>
                        <p className={`text-white text-xs flex items-center ${isRTL ? 'space-x-reverse' : ''}`}>
                          <Users className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                          {image.face_count || 0} {t('common.faces')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Details Panel - Desktop */}
            {selectedImage && (
              <div className={`hidden lg:block w-80 bg-white rounded-xl shadow-sm p-6 h-fit sticky top-6`}>
                <div className="relative">
                  <img
                    src={getImageUrl(selectedImage)}
                    alt={selectedImage.original_filename}
                    className="w-full aspect-square object-cover rounded-lg mb-4 cursor-pointer"
                    onClick={() => openFullSize(selectedImage)}
                  />
                  <button
                    onClick={() => openFullSize(selectedImage)}
                    className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition`}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-semibold text-lg truncate mb-4">
                  {selectedImage.original_filename}
                </h3>

                <div className="space-y-3 text-sm">
                  <div className={`flex items-center text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <Users className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    <span>{t('gallery.facesDetected', { count: selectedImage.face_count || 0 })}</span>
                  </div>
                  <div className={`flex items-center text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <HardDrive className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    <span>
                      {selectedImage.file_size
                        ? `${(selectedImage.file_size / 1024 / 1024).toFixed(2)} MB`
                        : t('gallery.unknownSize')}
                    </span>
                  </div>
                  {selectedImage.width && selectedImage.height && (
                    <div className={`flex items-center text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
                      <Image className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      <span>
                        {selectedImage.width} x {selectedImage.height}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-center text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <Calendar className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    <span>
                      {new Date(selectedImage.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(selectedImage.id)}
                  className={`mt-6 w-full py-2 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('gallery.deleteImage')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile Image Details Modal */}
        {selectedImage && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-y-auto">
              <div className={`sticky top-0 bg-white p-4 border-b flex justify-between items-center`}>
                <h3 className={`font-semibold text-lg truncate ${isRTL ? 'pl-4' : 'pr-4'}`}>
                  {selectedImage.original_filename}
                </h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="relative">
                  <img
                    src={getImageUrl(selectedImage)}
                    alt={selectedImage.original_filename}
                    className="w-full aspect-square object-cover rounded-lg mb-4 cursor-pointer"
                    onClick={() => openFullSize(selectedImage)}
                  />
                  <button
                    onClick={() => openFullSize(selectedImage)}
                    className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition`}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className={`flex items-center text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <Users className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    <span>{selectedImage.face_count || 0} {t('common.faces')}</span>
                  </div>
                  <div className={`flex items-center text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <HardDrive className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    <span>
                      {selectedImage.file_size
                        ? `${(selectedImage.file_size / 1024 / 1024).toFixed(2)} MB`
                        : t('gallery.unknownSize')}
                    </span>
                  </div>
                  {selectedImage.width && selectedImage.height && (
                    <div className={`flex items-center text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
                      <Image className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      <span>
                        {selectedImage.width} x {selectedImage.height}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-center text-gray-600 ${isRTL ? 'space-x-reverse' : ''}`}>
                    <Calendar className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    <span>
                      {new Date(selectedImage.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(selectedImage.id)}
                  className={`w-full py-3 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('gallery.deleteImage')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full-size Image Modal */}
        <ImageModal
          isOpen={!!modalImage}
          onClose={() => setModalImage(null)}
          imageSrc={modalImage ? getImageUrl(modalImage) : ''}
          alt={modalImage?.original_filename}
          images={images}
          currentIndex={modalImage ? images.findIndex(img => img.id === modalImage.id) : 0}
          onNavigate={(index) => setModalImage(images[index])}
        />
      </div>
    </Layout>
  );
};

export default Gallery;
