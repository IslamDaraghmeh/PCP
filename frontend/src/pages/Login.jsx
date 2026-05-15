import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { User, Lock, AlertCircle, Globe } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Language Switcher */}
      <button
        onClick={toggleLanguage}
        className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white rounded-lg shadow hover:shadow-md transition`}
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{language === 'en' ? 'العربية' : 'English'}</span>
      </button>

      <div className={`max-w-md w-full space-y-6 sm:space-y-8 p-6 sm:p-8 bg-white rounded-xl shadow-lg`}>
        <div className="text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
            <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">
            {t('nav.faceRecognition')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">{t('auth.signInToAccount')}</p>
        </div>

        {error && (
          <div className={`bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-lg flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-sm`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.username')}
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder={t('auth.enterUsername')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.password')}
            </label>
            <div className="mt-1 relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder={t('auth.enterPassword')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 text-base"
          >
            {loading ? t('auth.signingIn') : t('auth.login')}
          </button>
        </form>

        <p className="text-center text-sm sm:text-base text-gray-600">
          {t('auth.dontHaveAccount')}{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
