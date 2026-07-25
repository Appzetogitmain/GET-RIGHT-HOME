import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiPlayCircle, FiVideo, FiLink } from 'react-icons/fi';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';


const WorkerTrainingSettings = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    youtubeUrl: '',
    gifUrl: '' // Using gifUrl to store the uploaded video/image URL for consistency with Thoughtful Curations logic
  });
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/admin/platform-settings');
      if (data.success && data.settings) {
        setVideos(data.settings.trainingVideos || []);
      }
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newVideos) => {
    try {
      setLoading(true);
      const { data } = await api.put('/admin/platform-settings', {
        trainingVideos: newVideos
      });
      if (data.success) {
        setVideos(data.settings.trainingVideos || []);
        toast.success('Training videos updated successfully');
        setIsModalOpen(false);
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      return toast.error('Please enter a title');
    }
    if (!formData.youtubeUrl && !formData.gifUrl) {
      return toast.error('Please provide either a YouTube URL or upload a file');
    }
    
    let updated = [...videos];
    if (editingIndex !== null) {
      updated[editingIndex] = formData;
    } else {
      updated.push(formData);
    }
    
    saveSettings(updated);
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this training video?')) {
      const updated = videos.filter((_, i) => i !== index);
      saveSettings(updated);
    }
  };

  const openModal = (index = null) => {
    if (index !== null) {
      setFormData(videos[index]);
      setEditingIndex(index);
    } else {
      setFormData({
        title: '',
        youtubeUrl: '',
        gifUrl: ''
      });
      setEditingIndex(null);
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('type', file.type.startsWith('video/') ? 'video' : 'image');

    try {
      setUploading(true);
      const { data } = await api.post('/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.success) {
        setFormData(prev => ({ ...prev, gifUrl: data.url }));
        toast.success('File uploaded successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading && videos.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FiPlayCircle className="text-blue-600" /> Worker Training
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manage training videos for workers (YouTube links or direct uploads)</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <FiPlus /> Add Video
        </button>
      </div>

      <div className="p-6">
        {videos.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
            No training videos added yet. Click "Add Video" to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video, idx) => {
              const ytId = getYouTubeId(video.youtubeUrl);
              return (
              <div key={idx} className="bg-white rounded-xl border overflow-hidden shadow-sm flex flex-col group relative">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/90 rounded-lg p-1">
                  <button onClick={() => openModal(idx)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md">
                    <FiEdit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(idx)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                    <FiTrash2 size={14} />
                  </button>
                </div>
                
                <div className="aspect-video bg-gray-100 relative border-b">
                  {ytId ? (
                    <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} className="w-full h-full object-cover" alt="YouTube Thumbnail" />
                  ) : video.youtubeUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white flex-col gap-2">
                       <FiLink className="w-8 h-8 opacity-50" />
                       <span className="text-xs font-medium">YouTube Video</span>
                    </div>
                  ) : video.gifUrl ? (
                    video.gifUrl.match(/\.(mp4|webm)$/i) ? (
                      <video src={video.gifUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={video.gifUrl} className="w-full h-full object-cover" alt="Preview" />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <FiVideo size={24} />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight">{video.title}</h3>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">{editingIndex !== null ? 'Edit Video' : 'Add Video'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-800">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Video Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. How to use the app"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">YouTube Link (Optional)</label>
                <input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  placeholder="https://youtube.com/..."
                />
              </div>
              
              <div className="text-center text-sm text-gray-400 font-bold">OR</div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Media (Video/Image)</label>
                {formData.gifUrl ? (
                  <div className="mb-2 p-2 bg-gray-50 rounded-xl border flex items-center justify-between">
                    <span className="text-xs text-green-600 font-semibold truncate max-w-[200px]">{formData.gifUrl}</span>
                    <button type="button" onClick={() => setFormData({...formData, gifUrl: ''})} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="training-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="training-upload"
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-600"
                    >
                      <FiVideo />
                      {uploading ? 'Uploading...' : 'Click to Upload Media'}
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerTrainingSettings;
