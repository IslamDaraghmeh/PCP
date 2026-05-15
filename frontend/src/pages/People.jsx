import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ImageModal from '../components/ImageModal';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { personsAPI } from '../services/api';
import { Users, Plus, Edit, Trash2, User, X, ChevronDown, ChevronUp } from 'lucide-react';

const People = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [expandedPersons, setExpandedPersons] = useState({});
  const [personFaces, setPersonFaces] = useState({});
  const [loadingFaces, setLoadingFaces] = useState({});
  const [modalImage, setModalImage] = useState(null);
  const [currentPersonFaces, setCurrentPersonFaces] = useState([]);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const res = await personsAPI.list(0, 100);
      setPersons(res.data);
    } catch (error) {
      console.error('Error fetching persons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonFaces = async (personId) => {
    if (personFaces[personId]) return;

    setLoadingFaces(prev => ({ ...prev, [personId]: true }));
    try {
      const res = await personsAPI.get(personId);
      setPersonFaces(prev => ({ ...prev, [personId]: res.data.faces || [] }));
    } catch (error) {
      console.error('Error fetching person faces:', error);
      setPersonFaces(prev => ({ ...prev, [personId]: [] }));
    } finally {
      setLoadingFaces(prev => ({ ...prev, [personId]: false }));
    }
  };

  const toggleExpandPerson = async (personId) => {
    const isExpanded = expandedPersons[personId];
    setExpandedPersons(prev => ({ ...prev, [personId]: !isExpanded }));

    if (!isExpanded) {
      await fetchPersonFaces(personId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPerson) {
        await personsAPI.update(editingPerson.id, formData);
      } else {
        await personsAPI.create(formData);
      }
      fetchPersons();
      closeModal();
    } catch (error) {
      console.error('Error saving person:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('people.deleteConfirm'))) return;

    try {
      await personsAPI.delete(id);
      setPersons(persons.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error deleting person:', error);
    }
  };

  const openModal = (person = null) => {
    if (person) {
      setEditingPerson(person);
      setFormData({ name: person.name || '', description: person.description || '' });
    } else {
      setEditingPerson(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPerson(null);
    setFormData({ name: '', description: '' });
  };

  const getFaceImageUrl = (path) => {
    if (!path) return null;
    const filename = path.split('/').pop().split('\\').pop();
    return `/uploads/faces/${filename}`;
  };

  const openFaceModal = (personId, faceIndex) => {
    const faces = personFaces[personId] || [];
    setCurrentPersonFaces(faces);
    setModalImage({ personId, index: faceIndex });
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0`}>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('people.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('people.subtitle')}</p>
          </div>
          <button
            onClick={() => openModal()}
            className={`flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base`}
          >
            <Plus className="w-5 h-5" />
            <span>{t('people.addPerson')}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : persons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t('people.noPersons')}</p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-blue-600 hover:underline"
            >
              {t('people.addFirstPerson')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {persons.map((person) => (
              <div
                key={person.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 sm:space-x-4 flex-1 min-w-0`}>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base sm:text-lg truncate">
                          {person.name || `Person #${person.id}`}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {person.face_count || 0} {t('common.faces')}
                        </p>
                      </div>
                    </div>
                    <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-1 sm:space-x-2 flex-shrink-0`}>
                      <button
                        onClick={() => openModal(person)}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(person.id)}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {person.description && (
                    <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 line-clamp-2">{person.description}</p>
                  )}
                  <p className="mt-3 sm:mt-4 text-xs text-gray-400">
                    {t('common.added')}: {new Date(person.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* View Faces Button */}
                {(person.face_count || 0) > 0 && (
                  <div className="border-t">
                    <button
                      onClick={() => toggleExpandPerson(person.id)}
                      className={`w-full py-3 px-4 sm:px-6 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-blue-600 hover:bg-blue-50 transition text-sm font-medium`}
                    >
                      {expandedPersons[person.id] ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>{t('people.hideFaces')}</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>{t('people.viewFaces')}</span>
                        </>
                      )}
                    </button>

                    {/* Expanded Faces Grid */}
                    {expandedPersons[person.id] && (
                      <div className="p-3 sm:p-4 border-t bg-gray-50">
                        {loadingFaces[person.id] ? (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (personFaces[person.id]?.length || 0) === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">{t('people.noFaces')}</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                              {personFaces[person.id]?.slice(0, 8).map((face, index) => (
                                <div
                                  key={face.id}
                                  className="aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                                  onClick={() => openFaceModal(person.id, index)}
                                >
                                  <img
                                    src={getFaceImageUrl(face.face_image_path)}
                                    alt={`Face ${face.id}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ddd" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".35em" fill="%23999" font-size="12">No Face</text></svg>';
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            {(personFaces[person.id]?.length || 0) > 8 && (
                              <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
                                {t('people.moreFaces', { count: personFaces[person.id].length - 8 })}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Person Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg p-5 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">
                  {editingPerson ? t('people.editPerson') : t('people.addPerson')}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('people.name')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder={t('people.enterName')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('people.description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder={t('people.enterDescription')}
                  />
                </div>

                <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-3 pt-2`}>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
                  >
                    {editingPerson ? t('common.update') : t('common.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Full-size Face Modal */}
        <ImageModal
          isOpen={!!modalImage}
          onClose={() => setModalImage(null)}
          imageSrc={modalImage ? getFaceImageUrl(currentPersonFaces[modalImage.index]?.face_image_path) : ''}
          alt="Face"
          images={currentPersonFaces}
          currentIndex={modalImage?.index || 0}
          onNavigate={(index) => setModalImage({ ...modalImage, index })}
        />
      </div>
    </Layout>
  );
};

export default People;
