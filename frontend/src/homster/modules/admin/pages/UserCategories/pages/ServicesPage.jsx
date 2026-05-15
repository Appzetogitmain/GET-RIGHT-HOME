import React, { useState, useEffect, useMemo } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch, FiFilter } from "react-icons/fi";
import { toast } from "react-hot-toast";
import CardShell from "../components/CardShell";
import Modal from "../components/Modal";
import { ensureIds, saveCatalog } from "../utils";
import { serviceService, categoryService } from "../../../../../services/catalogService";
import { z } from "zod";

// Schema for Service Entity
const serviceSchema = z.object({
  title: z.string().min(2, "Title is required"),
  basePrice: z.number().min(0, "Price must be non-negative"),
  gstPercentage: z.number().min(0).max(100).default(18),
  discountPrice: z.number().optional(),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().optional()
});

const ServicesPage = ({ catalog, setCatalog, selectedCity }) => {
  const [fetching, setFetching] = useState(false);
  const [categories, setCategories] = useState(catalog.categories || []);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Fetch data on mount or city change
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const params = { status: 'active' };
        if (selectedCity) params.cityId = selectedCity;

        const [categoriesRes] = await Promise.all([
          categoryService.getAll(params)
        ]);

        if (categoriesRes.success) {
          const mappedCategories = categoriesRes.categories.map(cat => ({
            id: (cat.id || cat._id?.$oid || cat._id)?.toString() || "",
            title: cat.title,
            slug: cat.slug
          }));
          setCategories(mappedCategories);
          setCatalog(prev => ({ ...prev, categories: mappedCategories }));
        }

      } catch (error) {
        console.error('Failed to fetch catalog data:', error);
        toast.error("Failed to load categories");
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [selectedCity, setCatalog]);

  // Fetch Services when Category Filter changes
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const params = {};
        if (selectedCategoryFilter !== "all") {
          params.categoryId = selectedCategoryFilter;
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
  }, [selectedCategoryFilter]);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    basePrice: "",
    gstPercentage: 18,
    discountPrice: "",
    categoryId: "",
    description: ""
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: "",
      basePrice: "",
      gstPercentage: 18,
      discountPrice: "",
      categoryId: selectedCategoryFilter !== "all" ? selectedCategoryFilter : "",
      description: ""
    });
    setIsModalOpen(false);
  };

  const handleEdit = (service) => {
    setEditingId(service.id || service._id);
    setForm({
      title: service.title,
      basePrice: service.basePrice || service.price || 0,
      gstPercentage: service.gstPercentage || 18,
      discountPrice: service.discountPrice || "",
      categoryId: service.categoryId?._id || service.categoryId || "",
      description: service.description || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const data = {
      title: form.title,
      basePrice: Number(form.basePrice),
      gstPercentage: Number(form.gstPercentage),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
      categoryId: form.categoryId,
      description: form.description
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
          setServices(prev => prev.map(s => (s.id === editingId || s._id === editingId ? { ...s, ...result.data } : s)));
          resetForm();
        }
      } else {
        const response = await serviceService.create(result.data);
        if (response.success) {
          toast.success("Service created");
          setServices(prev => [response.service || response.data, ...prev]);
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
      toast.success("Service deleted");
      setServices(prev => prev.filter(s => (s.id !== id && s._id !== id)));
    } catch (error) {
      console.error("Delete service error:", error);
      toast.error("Failed to delete service");
    }
  };

  const displayedServices = useMemo(() => {
    let filtered = services;
    
    // Filter by category if not "all"
    if (selectedCategoryFilter !== "all") {
      filtered = filtered.filter(s => {
        const sCatId = (s.categoryId?._id || s.categoryId)?.toString();
        return sCatId === selectedCategoryFilter;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.title.toLowerCase().includes(lower));
    }

    return filtered;
  }, [services, searchTerm, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manage Services</h1>
          <p className="text-sm text-gray-500 font-medium">Create and organize services by category</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          <FiPlus className="w-5 h-5" />
          Add New Service
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1 space-y-4">
          <CardShell icon={FiFilter} title="Filter by Category">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategoryFilter("all")}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  selectedCategoryFilter === "all" 
                    ? "bg-blue-50 text-blue-700 border border-blue-100" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                All Categories
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    selectedCategoryFilter === cat.id 
                      ? "bg-blue-50 text-blue-700 border border-blue-100" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
          </CardShell>
        </div>

        {/* Services Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search services by title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {loadingServices ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 font-bold">Loading services...</p>
            </div>
          ) : displayedServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
              <FiPackage className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-lg font-black text-gray-400">No Services Found</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                {selectedCategoryFilter === 'all' 
                  ? "Start by adding a service to any category." 
                  : `No services have been added to the ${categories.find(c => c.id === selectedCategoryFilter)?.title} category yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedServices.map(service => {
                const cat = categories.find(c => String(c.id) === String(service.categoryId?._id || service.categoryId));
                return (
                  <div key={service.id || service._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block">
                          {cat?.title || "Uncategorized"}
                        </span>
                        <h3 className="font-black text-gray-900 text-lg leading-tight">{service.title}</h3>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(service)} className="p-2 bg-gray-50 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                          <FiEdit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(service.id || service._id)} className="p-2 bg-gray-50 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Starting Price</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-gray-900">₹{service.discountPrice || service.basePrice || service.price}</span>
                          {(service.discountPrice && service.discountPrice < service.basePrice) && (
                            <span className="text-xs text-gray-400 line-through font-bold">₹{service.basePrice}</span>
                          )}
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

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingId ? "Edit Service" : "Add Service"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Select Category</label>
            <select
              value={form.categoryId}
              onChange={e => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm font-bold"
              required
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Service Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Full House Painting"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Base Price (₹)</label>
              <input
                type="number"
                value={form.basePrice}
                onChange={e => setForm({ ...form, basePrice: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
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
