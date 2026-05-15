import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ImageModal from '../components/ImageModal';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { clustersAPI, personsAPI } from '../services/api';
import { Grid, Play, Users, RefreshCw, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Clusters = () => {
  const [clusters, setClusters] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clustering, setClustering] = useState(false);
  const [clusteringResult, setClusteringResult] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [currentClusterFaces, setCurrentClusterFaces] = useState([]);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const canRunClustering = user?.role === 'admin' || user?.role === 'analyst';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clustersRes, personsRes] = await Promise.all([
        clustersAPI.list(0, 100),
        personsAPI.list(0, 100),
      ]);
      setClusters(clustersRes.data);
      setPersons(personsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunClustering = async () => {
    setClustering(true);
    setClusteringResult(null);

    try {
      const res = await clustersAPI.runClustering();
      setClusteringResult(res.data);
      fetchData();
    } catch (error) {
      console.error('Error running clustering:', error);
      setClusteringResult({
        message: error.response?.data?.detail || t('errors.unknownError')
      });
    } finally {
      setClustering(false);
    }
  };

  const handleAssignPerson = async (clusterId, personId) => {
    try {
      await clustersAPI.update(clusterId, { person_id: personId });
      fetchData();
    } catch (error) {
      console.error('Error assigning person:', error);
    }
  };

  const getFaceImageUrl = (path) => {
    if (!path) return null;
    const filename = path.split('/').pop().split('\\').pop();
    return `/uploads/faces/${filename}`;
  };

  const openFaceModal = (cluster, faceIndex) => {
    setCurrentClusterFaces(cluster.faces || []);
    setModalImage({ clusterId: cluster.id, index: faceIndex });
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0`}>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('clusters.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">
              {t('clusters.subtitle')}
            </p>
          </div>
          {canRunClustering && (
            <button
              onClick={handleRunClustering}
              disabled={clustering}
              className={`flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm sm:text-base`}
            >
              {clustering ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>{clustering ? t('clusters.clustering') : t('clusters.runClustering')}</span>
            </button>
          )}
        </div>

        {/* Clustering Result */}
        {clusteringResult && (
          <div className={`p-3 sm:p-4 rounded-lg ${
            clusteringResult.clusters_created !== undefined
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}>
            <p className="font-medium text-sm sm:text-base">{clusteringResult.message}</p>
            {clusteringResult.clusters_created !== undefined && (
              <p className="text-xs sm:text-sm mt-1">
                {t('clusters.facesProcessed', {
                  total: clusteringResult.total_faces,
                  clusters: clusteringResult.clusters_created,
                  noise: clusteringResult.noise_faces
                })}
              </p>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : clusters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t('clusters.noClusters')}</p>
            {canRunClustering && (
              <button
                onClick={handleRunClustering}
                className="mt-4 text-blue-600 hover:underline"
              >
                {t('clusters.runFaceClustering')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {clusters.map((cluster) => (
              <div
                key={cluster.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {/* Cluster Header */}
                <div className="p-3 sm:p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {cluster.person_name || cluster.name || `Cluster #${cluster.id}`}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {cluster.face_count} {t('common.faces')}
                      </p>
                    </div>
                    {cluster.representative_face_path && (
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                        <img
                          src={getFaceImageUrl(cluster.representative_face_path)}
                          alt="Representative"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Assign Person */}
                <div className="p-3 sm:p-4 bg-gray-50">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    {t('clusters.assignToPerson')}
                  </label>
                  <select
                    value={cluster.person_id || ''}
                    onChange={(e) => handleAssignPerson(cluster.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('clusters.selectPerson')}</option>
                    {persons.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name || `Person #${person.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* View Details Button */}
                <div className="p-3 sm:p-4 border-t">
                  <button
                    onClick={() => setSelectedCluster(
                      selectedCluster?.id === cluster.id ? null : cluster
                    )}
                    className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm font-medium"
                  >
                    {selectedCluster?.id === cluster.id ? t('clusters.hideFaces') : t('clusters.viewFaces')}
                  </button>
                </div>

                {/* Expanded Faces */}
                {selectedCluster?.id === cluster.id && cluster.faces && (
                  <div className="p-3 sm:p-4 border-t bg-gray-50">
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      {cluster.faces.slice(0, 8).map((face, index) => (
                        <div
                          key={face.id}
                          className="aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                          onClick={() => openFaceModal(cluster, index)}
                        >
                          <img
                            src={getFaceImageUrl(face.face_image_path)}
                            alt={`Face ${face.id}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    {cluster.faces.length > 8 && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
                        {t('clusters.moreFaces', { count: cluster.faces.length - 8 })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Full-size Face Modal */}
        <ImageModal
          isOpen={!!modalImage}
          onClose={() => setModalImage(null)}
          imageSrc={modalImage ? getFaceImageUrl(currentClusterFaces[modalImage.index]?.face_image_path) : ''}
          alt="Face"
          images={currentClusterFaces}
          currentIndex={modalImage?.index || 0}
          onNavigate={(index) => setModalImage({ ...modalImage, index })}
        />
      </div>
    </Layout>
  );
};

export default Clusters;
