import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const FaceCard = ({ face, onClick, selected = false, onFullSize = null }) => {
  const { isRTL } = useLanguage();

  const imageSrc = face.face_image_path
    ? `/uploads/faces/${face.face_image_path.split('/').pop()}`
    : '/placeholder-face.png';

  const handleClick = (e) => {
    if (onFullSize) {
      onFullSize(e);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative cursor-pointer rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="aspect-square bg-gray-200">
        <img
          src={imageSrc}
          alt={`Face ${face.id}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ddd" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".35em" fill="%23999" font-size="14">No Face</text></svg>';
          }}
        />
      </div>
      {face.confidence && (
        <div className={`absolute bottom-0 ${isRTL ? 'right-0 left-0' : 'left-0 right-0'} bg-black bg-opacity-50 text-white text-xs p-1 text-center`}>
          {(face.confidence * 100).toFixed(1)}%
        </div>
      )}
      {face.person_name && (
        <div className={`absolute top-0 ${isRTL ? 'right-0 left-0' : 'left-0 right-0'} bg-blue-600 text-white text-xs p-1 text-center truncate`}>
          {face.person_name}
        </div>
      )}
    </div>
  );
};

export default FaceCard;
