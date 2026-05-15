import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { imagesAPI, facesAPI, clustersAPI, personsAPI } from '../services/api';
import { Image, Users, Grid, Search, Upload, ArrowRight, ArrowLeft } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [stats, setStats] = useState({
    images: 0,
    faces: 0,
    clusters: 0,
    persons: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const [imagesRes, facesRes, clustersRes, personsRes] = await Promise.all([
        imagesAPI.list(0, 1000),
        facesAPI.list(0, 10000),
        clustersAPI.list(0, 1000),
        personsAPI.list(0, 1000),
      ]);

      setStats({
        images: imagesRes.data.length,
        faces: facesRes.data.length,
        clusters: clustersRes.data.length,
        persons: personsRes.data.length,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(t('dashboard.failedToLoadStats'));
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: t('dashboard.images'), value: stats.images, icon: Image, color: 'blue', link: '/gallery' },
    { label: t('dashboard.faces'), value: stats.faces, icon: Users, color: 'green', link: '/gallery' },
    { label: t('dashboard.clusters'), value: stats.clusters, icon: Grid, color: 'purple', link: '/clusters' },
    { label: t('dashboard.persons'), value: stats.persons, icon: Users, color: 'orange', link: '/people' },
  ];

  const quickActions = [
    { label: t('dashboard.uploadImages'), icon: Upload, link: '/upload', color: 'blue' },
    { label: t('dashboard.searchFace'), icon: Search, link: '/search', color: 'green' },
    { label: t('dashboard.viewClusters'), icon: Grid, link: '/clusters', color: 'purple' },
    { label: t('dashboard.managePeople'), icon: Users, link: '/people', color: 'orange' },
  ];

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600">{t('dashboard.welcome', { name: user?.full_name || user?.username })}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error}
            <button onClick={fetchStats} className={`${isRTL ? 'mr-4' : 'ml-4'} underline`}>{t('common.retry')}</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map(({ label, value, icon: Icon, color, link }) => (
            <Link
              key={label}
              to={link}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {loading ? '...' : value.toLocaleString()}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-${color}-100`}>
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map(({ label, icon: Icon, link, color }) => (
              <Link
                key={label}
                to={link}
                className={`flex items-center justify-between p-4 rounded-lg bg-${color}-50 hover:bg-${color}-100 transition`}
              >
                <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                  <span className="font-medium text-gray-700">{label}</span>
                </div>
                <ArrowIcon className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.systemInfo')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">{t('dashboard.faceModel')}</p>
              <p className="font-medium">Facenet512</p>
            </div>
            <div>
              <p className="text-gray-500">{t('dashboard.detector')}</p>
              <p className="font-medium">RetinaFace</p>
            </div>
            <div>
              <p className="text-gray-500">{t('dashboard.clustering')}</p>
              <p className="font-medium">DBSCAN</p>
            </div>
            <div>
              <p className="text-gray-500">{t('dashboard.vectorSearch')}</p>
              <p className="font-medium">FAISS</p>
            </div>
            <div>
              <p className="text-gray-500">{t('dashboard.embeddingDimension')}</p>
              <p className="font-medium">512</p>
            </div>
            <div>
              <p className="text-gray-500">{t('dashboard.similarityMetric')}</p>
              <p className="font-medium">Cosine</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
