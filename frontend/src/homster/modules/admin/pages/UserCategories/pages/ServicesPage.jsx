import React, { useState, useEffect, useMemo } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch, FiFilter, FiImage, FiLayers, FiChevronRight } from "react-icons/fi";
import { toast } from "react-hot-toast";
import CardShell from "../components/CardShell";
import Modal from "../components/Modal";
import { ensureIds, saveCatalog, toAssetUrl } from "../utils";
import { serviceService, categoryService, subCategoryService } from "../../../../../services/catalogService";
import { z } from "zod";

// Zod schema matching the updated database model
const serviceSchema = z.object({
  title: z.string().min(2, "Service title is required"),
  subheading: z.string().optional(),
  basePrice: z.number().min(0, "Price must be non-negative"),
  gstPercentage: z.number().min(0).max(100).default(18),
  discountPrice: z.number().optional(),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().min(1, "Sub-category is required"),
  imageUrl: z.string().optional(),
  description: z.string().optional()
});

const ServicesPage = ({ catalog, setCatalog, selectedCity }) => {
  const [fetching, setFetching] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState("all");

  // Fetch parent categories and subcategories
  const fetchCatalogData = async () => {
    try {
      setFetching(true);
      const params = { status: 'active' };
      if (selectedCity) params.cityId = selectedCity;

      const [categoriesRes, subCategoriesRes] = await Promise.all([
        categoryService.getAll(params),
        subCategoryService.getAll(params)
      ]);

      let mappedCategories = [];
      if (categoriesRes.success) {
        mappedCategories = categoriesRes.categories.map(cat => ({
          id: (cat.id || cat._id?.$oid || cat._id)?.toString() || "",
          title: cat.title,
          slug: cat.slug
        }));
        setCategories(mappedCategories);
      }

      let mappedSubCategories = [];
      if (subCategoriesRes.success) {
        mappedSubCategories = subCategoriesRes.subCategories.map(sc => ({
          id: (sc.id || sc._id?.$oid || sc._id)?.toString() || "",
          title: sc.title,
          slug: sc.slug,
          categoryId: (sc.categoryId?._id || sc.categoryId)?.toString() || "",
          categoryTitle: sc.categoryId?.title || "Uncategorized"
        }));
        setSubCategories(mappedSubCategories);
      }

      setCatalog(prev => {
        const next = { 
          ...prev, 
          categories: mappedCategories, 
          subCategories: mappedSubCategories 
        };
        saveCatalog(next);
        return next;
      });

    } catch (error) {
      console.error('Failed to fetch catalog data:', error);
      toast.error("Failed to load categories/sub-categories");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, [selectedCity]);

  // Fetch Services when Filter changes
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const params = {};
        if (selectedSubCategoryFilter !== "all") {
          params.subCategoryId = selectedSubCategoryFilter;
        }
        
        const response = await serviceService.getAll(params);
        if (response.success) {
          setServices(response.services || []);
        } else {
          setServices([]);
        }
      } catch (error) {
        console.error("Failed to fetch services:", error);
        toast.error("Failed to load services");
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, [selectedSubCategoryFilter]);

  // Form & Image Upload State
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subheading: "",
    basePrice: "",
    gstPercentage: 18,
    discountPrice: "",
    categoryId: "",
    subCategoryId: "",
    imageUrl: "",
    description: ""
  });
  const [saving, setSaving] = useState(false);

  // Group sub-categories by category for the filter panel
  const groupedSubCategories = useMemo(() => {
    const groups = {};
    subCategories.forEach(sc => {
      const catTitle = sc.categoryTitle || "Uncategorized";
      if (!groups[catTitle]) groups[catTitle] = [];
      groups[catTitle].push(sc);
    });
    return groups;
  }, [subCategories]);

  // Sub-categories filtered by selected Parent Category in form
  const formFilteredSubCategories = useMemo(() => {
    if (!form.categoryId) return [];
    return subCategories.filter(sc => String(sc.categoryId) === String(form.categoryId));
  }, [form.categoryId, subCategories]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: "",
      subheading: "",
      basePrice: "",
      gstPercentage: 18,
      discountPrice: "",
      categoryId: "",
      subCategoryId: selectedSubCategoryFilter !== "all" ? selectedSubCategoryFilter : "",
      imageUrl: "",
      description: ""
    });
    setIsModalOpen(false);
  };

  const handleEdit = (service) => {
    const parentCatId = service.categoryId?._id || service.categoryId || "";
    const subCatId = service.subCategoryId?._id || service.subCategoryId || "";
    
    setEditingId(service.id || service._id);
    setForm({
      title: service.title,
      subheading: service.subheading || "",
      basePrice: service.basePrice || service.price || 0,
      gstPercentage: service.gstPercentage || 18,
      discountPrice: service.discountPrice || "",
      categoryId: parentCatId?.toString() || "",
      subCategoryId: subCatId?.toString() || "",
      imageUrl: service.imageUrl || service.icon || "",
      description: service.description || ""
    });
    setIsModalOpen(true);
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

  const handleSave = async (e) => {
    e.preventDefault();
    
    const data = {
      title: form.title.trim(),
      subheading: form.subheading.trim(),
      basePrice: Number(form.basePrice),
      gstPercentage: Number(form.gstPercentage),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
      categoryId: form.categoryId,
      subCategoryId: form.subCategoryId,
      imageUrl: form.imageUrl,
      description: form.description?.trim()
    };

    const result = serviceSchema.safeParse(data);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        const response = await serviceService.update(editingId, result.data);
        if (response.success) {
          toast.success("Service updated");
          // Refresh catalog services list
          const updatedSvc = response.service || response.data;
          setServices(prev => prev.map(s => (s.id === editingId || s._id === editingId ? { ...s, ...updatedSvc } : s)));
          resetForm();
        }
      } else {
        const response = await serviceService.create(result.data);
        if (response.success) {
          toast.success("Service created successfully");
          const newSvc = response.service || response.data;
          setServices(prev => [newSvc, ...prev]);
          resetForm();
        }
      }
    } catch (error) {
      console.error("Save service error:", error);
      toast.error(error.response?.data?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await serviceService.delete(id);
      toast.success("Service deleted successfully");
      setServices(prev => prev.filter(s => (s.id !== id && s._id !== id)));
    } catch (error) {
      console.error("Delete service error:", error);
      toast.error("Failed to delete service");
    }
  };

  const displayedServices = useMemo(() => {
    let filtered = services;
    
    // Filter by subcategory if not "all"
    if (selectedSubCategoryFilter !== "all") {
      filtered = filtered.filter(s => {
        const sSubCatId = (s.subCategoryId?._id || s.subCategoryId)?.toString();
        return sSubCatId === selectedSubCategoryFilter;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(lower) || 
        (s.subheading && s.subheading.toLowerCase().includes(lower))
      );
    }

    return filtered;
  }, [services, searchTerm, selectedSubCategoryFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manage Services</h1>
          <p className="text-sm text-gray-500 font-medium">Create and organize premium services under sub-categories</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          <FiPlus className="w-5 h-5 stroke-[3]" />
          Add New Service
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sub-category Filter Left Panel */}
        <div className="lg:col-span-1 space-y-4">
          <CardShell icon={FiFilter} title="Filter by Sub-category">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedSubCategoryFilter("all")}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  selectedSubCategoryFilter === "all" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "text-gray-600 hover:bg-gray-50 border-transparent"
                }`}
              >
                All Sub-categories
              </button>

              {Object.keys(groupedSubCategories).map(catTitle => (
                <div key={catTitle} className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-1 bg-gray-50 rounded-lg">
                    {catTitle}
                  </div>
                  {groupedSubCategories[catTitle].map(sc => (
                    <button
                      key={sc.id}
                      onClick={() => setSelectedSubCategoryFilter(sc.id)}
                      className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                        selectedSubCategoryFilter === sc.id 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm" 
                          : "text-gray-600 hover:bg-gray-50 border-transparent"
                      }`}
                    >
                      <span className="truncate">{sc.title}</span>
                      <FiChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedSubCategoryFilter === sc.id ? "rotate-90 text-emerald-600" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </CardShell>
        </div>

        {/* Services Listing Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 stroke-[3]" />
            <input
              type="text"
              placeholder="Search services by title or subheading..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          {loadingServices ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-500 font-bold">Loading services...</p>
            </div>
          ) : displayedServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
              <FiPackage className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-lg font-black text-gray-400">No Services Found</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1">
                {selectedSubCategoryFilter === 'all' 
                  ? "Start by adding a service to any sub-category." 
                  : "No services have been added to this sub-category yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedServices.map(service => {
                const subCat = subCategories.find(sc => String(sc.id) === String(service.subCategoryId?._id || service.subCategoryId));
                return (
                  <div key={service.id || service._id} className="bg-white p-5 rounded-2.5xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative flex gap-4">
                    {/* Service Preview Image */}
                    <div className="h-24 w-24 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {(service.imageUrl || service.icon) ? (
                        <img 
                          src={toAssetUrl(service.imageUrl || service.icon)} 
                          alt={service.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <FiImage className="text-gray-300 w-8 h-8" />
                      )}
                    </div>

                    {/* Service Info details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest mb-1 inline-block">
                            {subCat?.title || "Unknown Sub-cat"}
                          </span>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleEdit(service)} className="p-1.5 bg-gray-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                              <FiEdit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(service.id || service._id)} className="p-1.5 bg-gray-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <h3 className="font-black text-gray-900 text-base leading-tight mt-0.5 truncate">{service.title}</h3>
                        {service.subheading && (
                          <p className="text-[11px] text-gray-400 font-bold uppercase mt-0.5 truncate">{service.subheading}</p>
                        )}
                        {service.description && (
                          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed font-medium">{service.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Starts at</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-emerald-600">₹{service.discountPrice || service.basePrice || service.price}</span>
                            {(service.discountPrice && service.discountPrice < service.basePrice) && (
                              <span className="text-[10px] text-gray-400 line-through font-bold">₹{service.basePrice}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingId ? "Edit Premium Service" : "Add Premium Service"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Parent Category */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Select Parent Category</label>
              <select
                value={form.categoryId}
                onChange={e => setForm({ ...form, categoryId: e.target.value, subCategoryId: "" })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-sm font-bold"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.title}</option>
                ))}
              </select>
            </div>

            {/* Sub-category selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Select Sub-category</label>
              <select
                value={form.subCategoryId}
                onChange={e => setForm({ ...form, subCategoryId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-sm font-bold disabled:opacity-60"
                disabled={!form.categoryId}
                required
              >
                <option value="">Select Sub-category</option>
                {formFilteredSubCategories.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Heading / Service Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Service Heading / Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Foam Blast AC Service"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Subheading */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Service Subheading (optional)</label>
            <input
              value={form.subheading}
              onChange={e => setForm({ ...form, subheading: e.target.value })}
              placeholder="e.g. FREE GAS CHECK or 2 options"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Base Price / Starts At (₹)</label>
              <input
                type="number"
                value={form.basePrice}
                onChange={e => setForm({ ...form, basePrice: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Discounted Price (₹) - Optional</label>
              <input
                type="number"
                value={form.discountPrice}
                onChange={e => setForm({ ...form, discountPrice: e.target.value })}
                placeholder="Leave empty"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed description of premium service package contents..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
            />
          </div>

          {/* Service Image URL Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Service Image</label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.imageUrl ? (
                  <img src={toAssetUrl(form.imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <FiImage className="text-gray-400 w-6 h-6" />
                )}
              </div>
              <label className="cursor-pointer px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs shadow-sm">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                {uploadingImage ? "Uploading..." : "Upload Service Image"}
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Service"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ServicesPage;
