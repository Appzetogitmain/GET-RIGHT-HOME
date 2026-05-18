import React, { useEffect, useState, useMemo } from "react";
import { FiGrid, FiPlus, FiEdit2, FiTrash2, FiImage } from "react-icons/fi";
import { toast } from "react-hot-toast";
import CardShell from "../components/CardShell";
import Modal from "../components/Modal";
import SubCategoryServicesModal from "../components/SubCategoryServicesModal";
import { saveCatalog, slugify, toAssetUrl } from "../utils";
import { subCategoryService, categoryService, publicCatalogService } from "../../../../../services/catalogService";
import { z } from "zod";

// Zod schema for SubCategory Form supporting bannerUrl
const subCategorySchema = z.object({
  title: z.string().min(2, "Sub-category title must be at least 2 characters"),
  categoryId: z.string().min(1, "Select a category"),
  iconUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  badge: z.string().optional(),
});

const SubCategoriesPage = ({ catalog, setCatalog, selectedCity }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Connect to catalog state
  const subCategories = catalog.subCategories || []; 
  const categories = catalog.categories || [];

  const [editingId, setEditingId] = useState(null);

  // UI State
  const [uploadingSubCategoryIcon, setUploadingSubCategoryIcon] = useState(false);
  const [uploadingSubCategoryBanner, setUploadingSubCategoryBanner] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    iconUrl: "",
    bannerUrl: "",
    badge: "",
    categoryId: "",
    cityIds: [],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Services Modal State
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [selectedSubCategoryForServices, setSelectedSubCategoryForServices] = useState(null);

  // Filter subCategories — no category filter, show all
  const filteredSubCategories = subCategories;

  // Helper to extract string ID from various formats
  const getStrId = (item) => {
    if (!item) return null;
    if (typeof item === 'string') return item.trim();
    if (item.$oid) return item.$oid.trim();
    if (item._id) return typeof item._id === 'object' && item._id.$oid ? item._id.$oid.trim() : item._id.toString().trim();
    if (item.id) return item.id.toString().trim();
    return String(item).trim();
  };

  // Fetch data function
  const refreshData = async () => {
    try {
      setFetching(true);

      // Sub-categories: use admin endpoint (no auth required for GET)
      // Categories: use public endpoint (no auth required) to populate dropdown
      const [subCategoriesRes, categoriesRes] = await Promise.all([
        subCategoryService.getAll({}),
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/public/categories`)
          .then(r => r.json())
          .catch(() => ({ success: false, categories: [] }))
      ]);

      let mappedSubCategories = [];
      let mappedCategories = [];

      if (subCategoriesRes.success) {
        mappedSubCategories = subCategoriesRes.subCategories.map((svc) => ({
          id: getStrId(svc.id || svc._id),
          title: svc.title,
          slug: svc.slug,
          categoryId: getStrId(svc.categoryId),
          categoryTitle: svc.categoryId?.title || "Unknown",
          iconUrl: svc.imageUrl || svc.iconUrl || "",
          bannerUrl: svc.bannerUrl || "",
          badge: svc.badge || "",
          isActive: svc.isActive !== false,
          cityIds: (svc.cityIds || []).map(id => getStrId(id)).filter(Boolean),
        }));
      } else {
        console.error('Sub-categories fetch failed:', subCategoriesRes);
      }

      if (categoriesRes.success) {
        mappedCategories = (categoriesRes.categories || []).map(cat => ({
          id: getStrId(cat.id || cat._id) || "",
          title: cat.title,
          slug: cat.slug
        }));
      } else {
        console.error('Categories fetch failed:', categoriesRes);
        // Fallback: try admin endpoint
        try {
          const adminCatRes = await categoryService.getAll({});
          if (adminCatRes.success) {
            mappedCategories = (adminCatRes.categories || []).map(cat => ({
              id: getStrId(cat.id || cat._id) || "",
              title: cat.title,
              slug: cat.slug
            }));
          }
        } catch (e) {
          console.error('Admin categories fallback also failed:', e);
        }
      }

      setCatalog(prev => {
        const next = { ...prev, subCategories: mappedSubCategories, categories: mappedCategories };
        saveCatalog(next);
        return next;
      });

    } catch (error) {
      console.error('Failed to fetch catalog data:', error);
      toast.error(`Failed to load data: ${error.message}`);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedCity]);

  // Reset form cityIds when editingId is cleared or selectedCity changes
  useEffect(() => {
    if (!editingId) {
      setForm(prev => ({
        ...prev,
        cityIds: selectedCity ? [selectedCity] : [],
      }));
    }
  }, [editingId, selectedCity]);

  // Populate form when a specific sub-category is selected for editing
  useEffect(() => {
    if (!editingId) return;
    const subCat = subCategories.find((s) => s.id === editingId);
    if (!subCat) return;
    setForm({
      title: subCat.title || "",
      iconUrl: subCat.iconUrl || "",
      bannerUrl: subCat.bannerUrl || "",
      badge: subCat.badge || "",
      categoryId: subCat.categoryId || "",
      cityIds: subCat.cityIds || [],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const reset = () => {
    setEditingId(null);
    setForm({
      title: "",
      iconUrl: "",
      bannerUrl: "",
      badge: "",
      categoryId: "",
      cityIds: selectedCity ? [selectedCity] : [],
    });
    setIsModalOpen(false);
  };

  const openServicesModal = (subCat) => {
    setSelectedSubCategoryForServices(subCat);
    setIsServicesModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingSubCategoryIcon(true);
      const response = await subCategoryService.uploadImage(file);
      if (response.success) {
        setForm((prev) => ({ ...prev, iconUrl: response.imageUrl }));
        toast.success("Icon uploaded!");
      } else {
        toast.error("Upload failed");
      }
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploadingSubCategoryIcon(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingSubCategoryBanner(true);
      const response = await subCategoryService.uploadImage(file, 'banners');
      if (response.success) {
        setForm((prev) => ({ ...prev, bannerUrl: response.imageUrl }));
        toast.success("Banner image uploaded successfully!");
      } else {
        toast.error("Upload failed");
      }
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploadingSubCategoryBanner(false);
    }
  };

  const upsert = async () => {
    if (loading) return;

    const validationResult = subCategorySchema.safeParse({
      title: form.title.trim(),
      categoryId: form.categoryId,
      iconUrl: form.iconUrl.trim(),
      bannerUrl: form.bannerUrl.trim(),
      badge: form.badge.trim(),
    });

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    try {
      setLoading(true);
      const subCatData = { 
        ...validationResult.data, 
        cityIds: form.cityIds, 
        imageUrl: form.iconUrl, 
        bannerUrl: form.bannerUrl 
      };

      if (editingId) {
        await subCategoryService.update(editingId, subCatData);
      } else {
        await subCategoryService.create(subCatData);
      }

      await refreshData();
      toast.success(editingId ? "Sub-category updated" : "Sub-category created");
      reset();
    } catch (error) {
      toast.error(error.message || 'Failed to save sub-category.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this sub-category?")) return;

    try {
      setLoading(true);
      await subCategoryService.delete(id);
      await refreshData();
      toast.success("Sub-category deleted");
    } catch (error) {
      toast.error(error.message || 'Failed to delete sub-category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <CardShell icon={FiGrid}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">{filteredSubCategories.length} sub-categories in catalog</div>
          <button
            onClick={() => { reset(); setIsModalOpen(true); }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Sub-category</span>
          </button>
        </div>


        {fetching ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : filteredSubCategories.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No sub-categories found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Icon</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Badge</th>
                  <th className="text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredSubCategories.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 text-sm font-semibold text-gray-600">{idx + 1}</td>
                    <td className="py-4 px-4">
                      {s.iconUrl ? (
                        <img src={toAssetUrl(s.iconUrl)} alt={s.title} className="h-10 w-10 object-contain rounded-md border border-gray-200" />
                      ) : (
                        <div className="h-10 w-10 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center"><FiImage className="text-gray-400" /></div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{s.title}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs text-gray-400">{s.slug || '—'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold border border-emerald-100">
                        {s.categoryTitle}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {s.badge ? (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100 uppercase">{s.badge}</span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        s.isActive !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-500'
                      }`}>
                        {s.isActive !== false ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openServicesModal(s)}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200"
                        >
                          Services
                        </button>
                        <button onClick={() => { setEditingId(s.id); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><FiEdit2 className="w-4 h-4" /></button>
                        <button onClick={() => remove(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><FiTrash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardShell>

      <Modal isOpen={isModalOpen} onClose={reset} title={editingId ? "Edit Sub-category" : "Add New Sub-category"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Sub-category Name</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Parent Category</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.title}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Sub-category Icon Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Sub-category Icon</label>
              <div className="flex flex-col gap-2">
                <div className="h-16 w-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                  {form.iconUrl ? <img src={toAssetUrl(form.iconUrl)} alt="Preview" className="w-full h-full object-contain" /> : <FiImage className="text-gray-400 w-6 h-6" />}
                </div>
                <label className="cursor-pointer px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-bold text-xs text-center shadow-sm">
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  {uploadingSubCategoryIcon ? "Uploading..." : "Upload Icon"}
                </label>
              </div>
            </div>

            {/* Sub-category Banner Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Banner Image (optional)</label>
              <div className="flex flex-col gap-2">
                <div className="h-16 w-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                  {form.bannerUrl ? <img src={toAssetUrl(form.bannerUrl)} alt="Banner Preview" className="w-full h-full object-cover" /> : <FiImage className="text-gray-400 w-6 h-6" />}
                </div>
                <label className="cursor-pointer px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-bold text-xs text-center shadow-sm">
                  <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                  {uploadingSubCategoryBanner ? "Uploading..." : "Upload Banner"}
                </label>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
            <button type="button" onClick={reset} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="button" onClick={upsert} disabled={loading || uploadingSubCategoryIcon || uploadingSubCategoryBanner} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-sm disabled:opacity-50">
              {loading ? "Saving..." : "Save Sub-category"}
            </button>
          </div>
        </div>
      </Modal>

      {selectedSubCategoryForServices && (
        <SubCategoryServicesModal
          isOpen={isServicesModalOpen}
          onClose={() => setIsServicesModalOpen(false)}
          subCategory={selectedSubCategoryForServices}
        />
      )}
    </div>
  );
};

export default SubCategoriesPage;
