import React, { useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

const ImageModal = ({
  isOpen,
  onClose,
  imageSrc,
  alt = 'Image',
  images = [],
  currentIndex = 0,
  onNavigate = null
}) => {
  const [zoom, setZoom] = React.useState(1);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && onNavigate && currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else if (e.key === 'ArrowRight' && onNavigate && currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    } else if (e.key === '+' || e.key === '=') {
      setZoom(prev => Math.min(prev + 0.25, 3));
    } else if (e.key === '-') {
      setZoom(prev => Math.max(prev - 0.25, 0.5));
    }
  }, [isOpen, onClose, onNavigate, currentIndex, images.length]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    setZoom(1);
  }, [imageSrc]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const showNavigation = onNavigate && images.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition z-10"
        aria-label="Close"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 flex space-x-2 z-10">
        <button
          onClick={handleZoomOut}
          className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="p-2 bg-black bg-opacity-50 text-white rounded-lg text-sm min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Arrows */}
      {showNavigation && (
        <>
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            className={`absolute left-4 p-3 bg-black bg-opacity-50 text-white rounded-full transition ${
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-opacity-70'
            }`}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex === images.length - 1}
            className={`absolute right-4 p-3 bg-black bg-opacity-50 text-white rounded-full transition ${
              currentIndex === images.length - 1
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-opacity-70'
            }`}
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image Counter */}
      {showNavigation && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black bg-opacity-50 text-white rounded-lg text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Image Container */}
      <div className="max-w-[90vw] max-h-[90vh] overflow-auto">
        <img
          src={imageSrc}
          alt={alt}
          className="max-w-none transition-transform duration-200"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center'
          }}
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23333" width="200" height="200"/><text x="100" y="100" text-anchor="middle" dy=".35em" fill="%23666" font-size="16">Image not found</text></svg>';
          }}
        />
      </div>
    </div>
  );
};

export default ImageModal;
