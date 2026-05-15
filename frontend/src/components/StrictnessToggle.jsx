import React from 'react';
import { useTranslation } from 'react-i18next';

const OPTIONS = ['strict', 'balanced', 'loose'];

const StrictnessToggle = ({ value, onChange, disabled = false }) => {
  const { t } = useTranslation();

  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
        {t('strictness.label', 'Strictness')}
      </label>
      <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
        {OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition
                ${active
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {t(`strictness.${opt}`, opt[0].toUpperCase() + opt.slice(1))}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-1.5">
        {t(`strictness.${value}_hint`, '')}
      </p>
    </div>
  );
};

export default StrictnessToggle;
