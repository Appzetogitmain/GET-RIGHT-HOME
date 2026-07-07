import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiImage } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Modal from './Modal'; 
import { serviceService } from '../../../../../services/catalogService';
import { z } from 'zod';
import { loadCatalog } from '../utils';

// Local asset utility helper
const toAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Validating matching fields
const serviceSchema = z.object({
  title: z.string().min(2, "Service title is required"),
  subheading: z.string().optional(),
  basePrice: z.number().min(0, "Price must be non-negative"),
  gstPercentage: z.number().min(0).max(100).default(18),
  discountPrice: z.number().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional()
});

const SubCategoryServicesModal = ({ isOpen, onClose, subCategory }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    title: '',
    subheading: '',
    basePrice: '',
    gstPercentage: 18,
    discountPrice: '',
    imageUrl: '',
    description: ''
  });

  const catalog = loadCatalog();
  const parentCategory = catalog.categories.find(c => c.id === subCategory?.categoryId);
  const isEstimateBased = parentCategory?.isEstimateBased;

  useEffect(() => {
    if (isOpen && subCategory) {
      loadServices();
    } else {
      setServices([]);
      resetForm();
    }
  }, [isOpen, subCategory]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await serviceService.getAll({ subCategoryId: subCategory.id });
      if (response.success) {
        setServices(response.services || []);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      subheading: '',
      basePrice: '',
      gstPercentage: 18,
      discountPrice: '',
      imageUrl: '',
      description: ''
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await serviceService.uploadImage(file);
      if (res.success) {
        setForm(prev => ({ ...prev, imageUrl: res.imageUrl }));
        toast.success("Service image uploaded successfully!");
      } else {
        toast.error(res.message || "Failed to upload image");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      title: form.title.trim(),
      subheading: form.subheading.trim(),
      basePrice: Number(form.basePrice),
      gstPercentage: Number(form.gstPercentage),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
      imageUrl: form.imageUrl,
      description: form.description.trim()
    };

    const result = serviceSchema.safeParse(data);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...result.data,
        subCategoryId: subCategory.id,
        categoryId: subCategory.categoryId
      };

      if (editingId) {
        const response = await serviceService.update(editingId, payload);
        if (response.success) {
          toast.success('Service updated successfully');
          loadServices();
          resetForm();
        }
      } else {
        const response = await serviceService.create(payload);
        if (response.success) {
          toast.success('Service created successfully');
          loadServices();
          resetForm();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await serviceService.delete(id);
      toast.success('Service deleted');
      loadServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleEdit = (service) => {
    setEditingId(service.id || service._id);
    setForm({
      title: service.title,
      subheading: service.subheading || '',
      basePrice: service.basePrice || service.price || 0,
      gstPercentage: service.gstPercentage || 18,
      discountPrice: service.discountPrice || '',
      imageUrl: service.imageUrl || service.icon || '',
      description: service.description || ''
    });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Services for ${subCategory?.title}`} size="xl">
      <div className="space-y-6">
        {/* Form Container */}
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
          <h3 className="text-sm font-black text-gray-700 mb-3 uppercase tracking-wider">
            {editingId ? 'Edit Premium Service' : 'Add New Premium Service'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Service Title */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Service Heading / Title</label>
                <input 
                  value={form.title} 
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
                  placeholder="e.g. Foam Blast AC Service" 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  required
                />
              </div>

              {/* Subheading */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Service Subheading (optional)</label>
                <input 
                  value={form.subheading} 
                  onChange={e => setForm(p => ({ ...p, subheading: e.target.value }))} 
                  placeholder="e.g. FREE GAS CHECK" 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                />
              </div>
            </div>

            {!isEstimateBased && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Base Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Base Price / Starts At (₹)</label>
                  <input 
                    type="number" 
                    value={form.basePrice} 
                    onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))} 
                    placeholder="0" 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                    required={!isEstimateBased}
                    min="0"
                  />
                </div>

                {/* Discounted Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Discounted Price (₹) - Optional</label>
                  <input 
                    type="number" 
                    value={form.discountPrice} 
                    onChange={e => setForm(p => ({ ...p, discountPrice: e.target.value }))} 
                    placeholder="Leave empty" 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
              <textarea 
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
                placeholder="Detailed description of premium service..." 
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 h-16 resize-none font-medium" 
              />
            </div>

            {/* File Upload Row */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <FiImage className="text-gray-400 w-5 h-5" />
                  )}
                </div>
                <label className="cursor-pointer px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm">
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  {uploadingImage ? "Uploading..." : "Upload Image"}
                </label>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-2">
                {editingId && (
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={saving || uploadingImage} 
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Services Table List */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Image</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Title</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Subheading</th>
                {!subCategory?.isEstimateBased && <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Price</th>}
                <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm font-bold text-gray-400">Loading services...</td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm font-bold text-gray-400">No services have been added to this sub-category yet.</td>
                </tr>
              ) : (
                services.map(service => (
                  <tr key={service.id || service._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center">
                        {(service.imageUrl || service.icon) ? (
                          <img src={service.imageUrl || service.icon} alt={service.title} className="w-full h-full object-cover" />
                        ) : (
                          <FiImage className="text-gray-300 w-4 h-4" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-gray-900">{service.title}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{service.subheading || '—'}</td>
                    {!subCategory?.isEstimateBased && <td className="px-4 py-3 text-sm font-bold text-emerald-600">₹{service.discountPrice || service.basePrice || service.price}</td>}
                    <td className="px-4 py-3 text-right flex justify-end gap-1.5 pt-4">
                      <button onClick={() => handleEdit(service)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(service.id || service._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export default SubCategoryServicesModal;
