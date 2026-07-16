import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Video, Search, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { propertyVideoService } from '../../../services/apiService';

const AdminPropertyVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    youtubeUrl: '',
    visibility: ['home']
  });
  const [editingId, setEditingId] = useState(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await propertyVideoService.getAllAdmin();
      if (res.success) {
        setVideos(res.videos);
      }
    } catch (error) {
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleOpenModal = (video = null) => {
    if (video) {
      setEditingId(video._id);
      setFormData({
        title: video.title,
        youtubeUrl: video.youtubeUrl,
        visibility: video.visibility
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        youtubeUrl: '',
        visibility: ['home']
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.youtubeUrl || formData.visibility.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingId) {
        await propertyVideoService.update(editingId, formData);
        toast.success('Video updated successfully');
      } else {
        await propertyVideoService.create(formData);
        toast.success('Video added successfully');
      }
      setIsModalOpen(false);
      fetchVideos();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await propertyVideoService.delete(id);
        toast.success('Video deleted');
        fetchVideos();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const toggleVisibility = (page) => {
    setFormData(prev => {
      const isSelected = prev.visibility.includes(page);
      if (isSelected) {
        return { ...prev, visibility: prev.visibility.filter(v => v !== page) };
      } else {
        return { ...prev, visibility: [...prev.visibility, page] };
      }
    });
  };

  const extractYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-500" />
            Property Videos
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage videos shown on Home, Buy, Rent, and Plot pages</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Video
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No videos found. Add one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-600">Thumbnail</th>
                  <th className="p-4 font-semibold text-gray-600">Title</th>
                  <th className="p-4 font-semibold text-gray-600">Visibility</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map(video => {
                  const yId = extractYoutubeId(video.youtubeUrl);
                  return (
                    <tr key={video._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="w-24 h-14 bg-gray-200 rounded overflow-hidden">
                          {yId && (
                            <img src={`https://img.youtube.com/vi/${yId}/hqdefault.jpg`} onError={(e) => { e.target.src = `https://img.youtube.com/vi/${yId}/0.jpg`; }} alt="thumb" className="w-full h-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-900">{video.title}</td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {video.visibility.map(v => (
                            <span key={v} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md uppercase font-bold tracking-wider">
                              {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleOpenModal(video)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(video._id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Edit Video' : 'Add Video'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900"
                    placeholder="Enter video title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">YouTube URL</label>
                  <input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900"
                    placeholder="https://youtube.com/watch?v=..."
                    required
                  />
                  {formData.youtubeUrl && extractYoutubeId(formData.youtubeUrl) && (
                    <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-gray-100 relative">
                      <img src={`https://img.youtube.com/vi/${extractYoutubeId(formData.youtubeUrl)}/hqdefault.jpg`} onError={(e) => { e.target.src = `https://img.youtube.com/vi/${extractYoutubeId(formData.youtubeUrl)}/0.jpg`; }} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                         <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                         </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Visible On</label>
                  <div className="flex gap-3">
                    {['home', 'buy', 'rent', 'plot'].map(page => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => toggleVisibility(page)}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all ${
                          formData.visibility.includes(page)
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  {formData.visibility.length === 0 && (
                    <p className="text-red-500 text-xs mt-1">Select at least one page</p>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={formData.visibility.length === 0} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {editingId ? 'Update Video' : 'Save Video'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPropertyVideos;
