import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { UserPlus, AlertCircle, CheckCircle, Globe } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useTranslation();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordsNotMatch'));
      return;
    }

    setLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: 'investigator',
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8 sm:py-12 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Language Switcher */}
      <button
        onClick={toggleLanguage}
        className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white rounded-lg shadow hover:shadow-md transition`}
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{language === 'en' ? 'العربية' : 'English'}</span>
      </button>

      <div className="max-w-md w-full space-y-6 sm:space-y-8 p-5 sm:p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
            <UserPlus className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">
            {t('auth.createAccount')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">{t('auth.registerForSystem')}</p>
        </div>

        {error && (
          <div className={`bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-lg flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-sm`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={`bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 rounded-lg flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-sm`}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{t('auth.registrationSuccess')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.fullName')}
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="mt-1 w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.username')}
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="johndoe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.email')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.password')}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="********"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.confirmPassword')}
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 text-base"
          >
            {loading ? t('auth.creatingAccount') : t('auth.register')}
          </button>
        </form>

        <p className="text-center text-sm sm:text-base text-gray-600">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
