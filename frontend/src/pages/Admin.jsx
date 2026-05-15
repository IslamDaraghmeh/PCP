import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Key,
  Shield,
  UserCheck,
  UserX,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'password', 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'investigator',
    is_active: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        usersAPI.list(0, 100),
        usersAPI.getStats()
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('errors.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'investigator',
      is_active: true
    });
    setModalMode('create');
    setSelectedUser(null);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      password: '',
      role: user.role,
      is_active: user.is_active
    });
    setModalMode('edit');
    setSelectedUser(user);
    setError('');
    setShowModal(true);
  };

  const openPasswordModal = (user) => {
    setFormData({ ...formData, password: '' });
    setModalMode('password');
    setSelectedUser(user);
    setError('');
    setShowModal(true);
  };

  const openDeleteModal = (user) => {
    setModalMode('delete');
    setSelectedUser(user);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        await usersAPI.create({
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name || null,
          password: formData.password,
          role: formData.role
        });
        setSuccess(t('admin.userCreated'));
      } else if (modalMode === 'edit') {
        await usersAPI.update(selectedUser.id, {
          email: formData.email,
          full_name: formData.full_name || null,
          role: formData.role,
          is_active: formData.is_active
        });
        setSuccess(t('admin.userUpdated'));
      } else if (modalMode === 'password') {
        await usersAPI.resetPassword(selectedUser.id, formData.password);
        setSuccess(t('admin.passwordReset'));
      } else if (modalMode === 'delete') {
        await usersAPI.delete(selectedUser.id);
        setSuccess(t('admin.userDeleted'));
      }

      closeModal();
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.detail || t('errors.unknownError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await usersAPI.toggleStatus(user.id);
      setSuccess(t('admin.statusToggled'));
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error toggling status:', error);
      setError(error.response?.data?.detail || t('errors.unknownError'));
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'analyst':
        return 'bg-blue-100 text-blue-800';
      case 'investigator':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return t('admin.roleAdmin');
      case 'analyst':
        return t('admin.roleAnalyst');
      case 'investigator':
        return t('admin.roleInvestigator');
      default:
        return role;
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('errors.unauthorized')}
            </h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0`}>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('admin.subtitle')}</p>
          </div>
          <button
            onClick={openCreateModal}
            className={`flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base`}
          >
            <UserPlus className="w-5 h-5" />
            <span>{t('admin.addUser')}</span>
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="p-3 sm:p-4 bg-green-50 text-green-800 rounded-lg flex items-center">
            <Check className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {success}
          </div>
        )}
        {error && !showModal && (
          <div className="p-3 sm:p-4 bg-red-50 text-red-800 rounded-lg flex items-center">
            <AlertTriangle className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">{t('admin.totalUsers')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">{t('admin.activeUsers')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">{t('admin.inactiveUsers')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.inactive}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">{t('admin.admins')}</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.by_role?.admin || 0}</p>
                </div>
                <Shield className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t('admin.noUsers')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={`px-4 sm:px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                      {t('admin.username')}
                    </th>
                    <th className={`px-4 sm:px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell`}>
                      {t('admin.email')}
                    </th>
                    <th className={`px-4 sm:px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                      {t('admin.role')}
                    </th>
                    <th className={`px-4 sm:px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                      {t('admin.status')}
                    </th>
                    <th className={`px-4 sm:px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                      {t('admin.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ${isRTL ? 'ml-3' : 'mr-3'}`}>
                            <span className="text-blue-600 font-medium text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            <div className="text-xs text-gray-500 sm:hidden">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        {user.full_name && (
                          <div className="text-xs text-gray-500">{user.full_name}</div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={user.id === currentUser?.id}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
                        >
                          {user.is_active ? t('admin.active') : t('admin.inactive')}
                        </button>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title={t('admin.editUser')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                            title={t('admin.resetPassword')}
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(user)}
                            disabled={user.id === currentUser?.id}
                            className={`p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition ${
                              user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={t('admin.deleteUser')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-xl shadow-xl max-w-md w-full ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {modalMode === 'create' && t('admin.addUser')}
                {modalMode === 'edit' && t('admin.editUser')}
                {modalMode === 'password' && t('admin.resetPassword')}
                {modalMode === 'delete' && t('admin.deleteUser')}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {modalMode === 'delete' ? (
                <div className="text-center py-4">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-700 mb-2">{t('admin.confirmDelete')}</p>
                  <p className="text-sm text-gray-500">{t('admin.confirmDeleteWarning')}</p>
                  <p className="mt-4 font-medium text-gray-900">{selectedUser?.username}</p>
                </div>
              ) : modalMode === 'password' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t('admin.enterNewPassword')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                </div>
              ) : (
                <>
                  {modalMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.username')}
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder={t('admin.enterUsername')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.email')}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t('admin.enterEmail')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.fullName')}
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder={t('admin.enterFullName')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {modalMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin.password')}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={t('admin.enterPassword')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.role')}
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={modalMode === 'edit' && selectedUser?.id === currentUser?.id}
                    >
                      <option value="investigator">{t('admin.roleInvestigator')}</option>
                      <option value="analyst">{t('admin.roleAnalyst')}</option>
                      <option value="admin">{t('admin.roleAdmin')}</option>
                    </select>
                  </div>

                  {modalMode === 'edit' && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${isRTL ? 'ml-2' : 'mr-2'}`}
                        disabled={selectedUser?.id === currentUser?.id}
                      />
                      <label htmlFor="is_active" className="text-sm text-gray-700">
                        {t('admin.active')}
                      </label>
                    </div>
                  )}
                </>
              )}

              <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-3 pt-4`}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${
                    modalMode === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {submitting ? t('common.loading') : (
                    modalMode === 'delete' ? t('common.delete') :
                    modalMode === 'create' ? t('common.create') :
                    t('common.save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Admin;
