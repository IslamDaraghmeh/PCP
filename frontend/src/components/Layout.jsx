import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Image,
  Users,
  Search,
  LogOut,
  User,
  Grid,
  Settings,
  Camera,
  Menu,
  X,
  Globe
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/upload', label: t('nav.upload'), icon: Upload },
    { path: '/camera', label: t('nav.camera'), icon: Camera },
    { path: '/gallery', label: t('nav.gallery'), icon: Image },
    { path: '/people', label: t('nav.people'), icon: Users },
    { path: '/clusters', label: t('nav.clusters'), icon: Grid },
    { path: '/search', label: t('nav.search'), icon: Search },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: t('nav.admin'), icon: Settings });
  }

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className={`min-h-screen bg-gray-100 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg sm:text-xl text-gray-900 hidden sm:block">
                  {t('nav.faceRecognition')}
                </span>
                <span className="font-bold text-lg text-gray-900 sm:hidden">
                  {t('nav.faceRec')}
                </span>
              </Link>
            </div>

            {/* Desktop user info */}
            <div className={`hidden sm:flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition`}
                title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              >
                <Globe className="w-4 h-4" />
                <span className="font-medium">{language === 'en' ? 'AR' : 'EN'}</span>
              </button>

              <span className="text-sm text-gray-600 truncate max-w-[150px]">
                {user?.full_name || user?.username}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
                title={t('nav.logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={toggleLanguage}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <Globe className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="bg-white border-b hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex ${isRTL ? 'space-x-reverse space-x-4 lg:space-x-reverse lg:space-x-8' : 'space-x-4 lg:space-x-8'} overflow-x-auto`}>
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                  location.pathname === path
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b shadow-lg">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 truncate">
                {user?.full_name || user?.username}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {user?.role}
              </span>
            </div>
          </div>
          <div className="py-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={handleNavClick}
                className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} px-4 py-3 text-base font-medium ${
                  location.pathname === path
                    ? `bg-blue-50 text-blue-600 ${isRTL ? 'border-r-4' : 'border-l-4'} border-blue-500`
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 w-full`}
            >
              <LogOut className="w-5 h-5" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
