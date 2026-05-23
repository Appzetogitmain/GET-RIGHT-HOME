import React, { useState, useEffect, useMemo } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSettings, FiTag, FiList, FiCheck, FiSave, FiAlertCircle } from "react-icons/fi";
import { toast } from "react-hot-toast";
import CardShell from "../components/CardShell";
import Modal from "../components/Modal";
import { toAssetUrl } from "../utils";
import { homeContentService, categoryService, serviceService } from "../../../../../services/catalogService";

const MembershipPage = ({ selectedCity }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // VIP Settings States
  const [isVipEnabled, setIsVipEnabled] = useState(true);
  const [vipPrice, setVipPrice] = useState(199);
  const [vipOriginalPrice, setVipOriginalPrice] = useState(599);
  const [vipDurationText, setVipDurationText] = useState("6 months");
  const [vipDurationDays, setVipDurationDays] = useState(56);
  const [vipCards, setVipCards] = useState([]);

  // First Booking Card States
  const [isFirstBookingVisible, setIsFirstBookingVisible] = useState(true);
  const [firstBookingTitle, setFirstBookingTitle] = useState("HOME CLEANING OFFER");
  const [firstBookingDiscount, setFirstBookingDiscount] = useState("10% off*");
  const [firstBookingCaption, setFirstBookingCaption] = useState("on first booking");
  const [firstBookingCode, setFirstBookingCode] = useState("NEWCLEAN10");
  const [firstBookingImage, setFirstBookingImage] = useState("");
  const [uploadingBookingImage, setUploadingBookingImage] = useState(false);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardForm, setCardForm] = useState({
    targetCategoryId: "",
    discount: 15,
    discountType: "EXTRA", // "EXTRA" or "FLAT"
    caption: "",
    bullets: "", // Comma-separated or line-separated list
    bgType: "image", // "image" or "bullets"
    cardImage: "" // Custom Card image URL uploaded directly
  });

  // Fetch Categories & Home Content
  const loadData = async () => {
    try {
      setLoading(true);
      const params = { status: 'active' };
      if (selectedCity) params.cityId = selectedCity;

      const [categoriesRes, contentRes] = await Promise.all([
        categoryService.getAll(params),
        homeContentService.get({ cityId: selectedCity })
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.categories.map(cat => ({
          id: (cat.id || cat._id?.$oid || cat._id)?.toString() || "",
          title: cat.title,
          imageUrl: cat.imageUrl || cat.homeIconUrl || cat.icon,
          isDirectService: cat.isDirectService || false
        })));
      }

      if (contentRes.success && contentRes.homeContent) {
        const hc = contentRes.homeContent;
        setIsVipEnabled(hc.isVipEnabled !== false);
        setVipPrice(hc.vipPrice ?? 199);
        setVipOriginalPrice(hc.vipOriginalPrice ?? 599);
        setVipDurationText(hc.vipDurationText || "6 months");
        setVipDurationDays(hc.vipDurationDays ?? 56);
        setVipCards(hc.vipCards || []);

        setIsFirstBookingVisible(hc.isFirstBookingVisible !== false);
        setFirstBookingTitle(hc.firstBookingTitle || "HOME CLEANING OFFER");
        setFirstBookingDiscount(hc.firstBookingDiscount || "10% off*");
        setFirstBookingCaption(hc.firstBookingCaption || "on first booking");
        setFirstBookingCode(hc.firstBookingCode || "NEWCLEAN10");
        setFirstBookingImage(hc.firstBookingImage || "");
      }
    } catch (error) {
      console.error("Failed to load membership settings:", error);
      toast.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCity]);

  // Map category ID to Category Object for display
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat.id] = cat;
    });
    return map;
  }, [categories]);

  // Open modal to add a card
  const handleAddCard = () => {
    setEditingCardId(null);
    setCardForm({
      targetCategoryId: categories[0]?.id || "",
      discount: 15,
      discountType: "EXTRA",
      caption: "On Home Services",
      bullets: "",
      bgType: "image",
      cardImage: ""
    });
    setIsModalOpen(true);
  };

  // Open modal to edit a card
  const handleEditCard = (card) => {
    setEditingCardId(card.id || card._id || Math.random().toString());
    setCardForm({
      targetCategoryId: card.targetCategoryId || "",
      discount: card.discount || 15,
      discountType: card.discountType || "EXTRA",
      caption: card.caption || "",
      bullets: "",
      bgType: "image",
      cardImage: card.cardImage || ""
    });
    setIsModalOpen(true);
  };

  // Save Card to local array
  const handleSaveCard = (e) => {
    e.preventDefault();
    if (!cardForm.targetCategoryId) {
      toast.error("Please select a target category");
      return;
    }

    const bulletsArray = cardForm.bullets
      ? cardForm.bullets.split(",").map(b => b.trim()).filter(Boolean)
      : [];

    const newCard = {
      id: editingCardId || `card_${Date.now()}`,
      targetCategoryId: cardForm.targetCategoryId,
      discount: Number(cardForm.discount),
      discountType: cardForm.discountType,
      caption: cardForm.caption,
      bullets: bulletsArray,
      bgType: cardForm.bgType,
      cardImage: cardForm.cardImage
    };

    if (editingCardId) {
      setVipCards(prev => prev.map(c => (c.id === editingCardId || c._id === editingCardId) ? newCard : c));
      toast.success("Card updated locally");
    } else {
      setVipCards(prev => [...prev, newCard]);
      toast.success("Card added locally");
    }
    setIsModalOpen(false);
  };

  // Delete Card from local array
  const handleDeleteCard = (id) => {
    if (!window.confirm("Are you sure you want to delete this benefit card?")) return;
    setVipCards(prev => prev.filter(c => c.id !== id && c._id !== id));
    toast.success("Card removed locally");
  };

  // Save all VIP configurations to DB
  const handleSaveAllSettings = async () => {
    try {
      setSaving(true);
      const payload = {
        isVipEnabled,
        vipPrice: Number(vipPrice),
        vipOriginalPrice: Number(vipOriginalPrice),
        vipDurationText: `${vipDurationDays} Days`,
        vipDurationDays: Number(vipDurationDays),
        vipCards,
        isFirstBookingVisible,
        firstBookingTitle,
        firstBookingDiscount,
        firstBookingCaption,
        firstBookingCode,
        firstBookingImage
      };

      const res = await homeContentService.update(payload, { cityId: selectedCity });
      if (res.success) {
        toast.success("VIP Membership Settings saved successfully!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      toast.error("Failed to save VIP settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-gray-500 font-bold">Loading Membership Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manage VIP Membership</h1>
          <p className="text-sm text-gray-500 font-medium">Configure premium membership pricing, toggle status, and manage discount cards</p>
        </div>
        <button
          onClick={handleSaveAllSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
        >
          <FiSave className="w-5 h-5" />
          {saving ? "Saving Changes..." : "Save Settings"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Settings Controls Panel */}
        <div className="lg:col-span-1 space-y-4">
          <CardShell icon={FiSettings} title="Membership Plan Configurations">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-black uppercase text-gray-700">VIP Membership Status</span>
                <p className="text-[10px] text-gray-400 font-bold">Show/Hide membership section to users</p>
              </div>
              <button
                type="button"
                onClick={() => setIsVipEnabled(!isVipEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isVipEnabled ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${
                    isVipEnabled ? "left-6.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* VIP Price */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-600 mb-1">VIP Selling Price (₹)</label>
              <input
                type="number"
                value={vipPrice}
                onChange={e => setVipPrice(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                placeholder="199"
              />
            </div>

            {/* VIP Original Price */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-600 mb-1">VIP Original Price (₹)</label>
              <input
                type="number"
                value={vipOriginalPrice}
                onChange={e => setVipOriginalPrice(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                placeholder="599"
              />
            </div>

            {/* VIP Duration Days */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-600 mb-1">VIP Plan Duration (Days)</label>
              <input
                type="number"
                value={vipDurationDays}
                onChange={e => {
                  setVipDurationDays(e.target.value);
                  setVipDurationText(`${e.target.value} Days`);
                }}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                placeholder="56"
              />
            </div>
            
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2.5 text-amber-800">
              <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-[10px] font-bold leading-normal">
                Important: Make sure to click "Save Settings" at the top right to apply price changes or card lists to the users live catalog.
              </div>
            </div>
          </CardShell>

          {/* First Booking Card Configurations */}
          <CardShell icon={FiTag} title="First Booking Offer Card">
            {/* Show/Hide Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-black uppercase text-gray-700">Offer Card Status</span>
                <p className="text-[10px] text-gray-400 font-bold">Show/Hide offer card to users</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFirstBookingVisible(!isFirstBookingVisible)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isFirstBookingVisible ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${
                    isFirstBookingVisible ? "left-6.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Offer Tagline Title */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-600 mb-1">Offer Tagline / Title</label>
              <input
                type="text"
                value={firstBookingTitle}
                onChange={e => setFirstBookingTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                placeholder="HOME CLEANING OFFER"
              />
            </div>

            {/* Discount Text */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-600 mb-1">Discount Text</label>
              <input
                type="text"
                value={firstBookingDiscount}
                onChange={e => setFirstBookingDiscount(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                placeholder="10% off*"
              />
            </div>

            {/* Caption Text */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-600 mb-1">Caption Text</label>
              <input
                type="text"
                value={firstBookingCaption}
                onChange={e => setFirstBookingCaption(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                placeholder="on first booking"
              />
            </div>

            {/* Promo Coupon Code */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-600 mb-1">Promo Coupon Code</label>
              <input
                type="text"
                value={firstBookingCode}
                onChange={e => setFirstBookingCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                placeholder="NEWCLEAN10"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-600 mb-1">Upload Card Image (Optional)</label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingBookingImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingBookingImage(true);
                      try {
                        const response = await serviceService.uploadImage(file, 'booking-offers');
                        if (response.success && response.imageUrl) {
                          setFirstBookingImage(response.imageUrl);
                          toast.success("Offer image uploaded successfully!");
                        } else {
                          toast.error("Upload failed");
                        }
                      } catch (error) {
                        console.error('Offer image upload error:', error);
                        toast.error("Failed to upload image");
                      } finally {
                        setUploadingBookingImage(false);
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-emerald-50 file:text-emerald-700 cursor-pointer"
                />
                {uploadingBookingImage && (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600"></div>
                    <span>Uploading...</span>
                  </div>
                )}
                {firstBookingImage && !uploadingBookingImage && (
                  <div className="relative w-20 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={toAssetUrl(firstBookingImage)} alt="Offer Image Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFirstBookingImage("")}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardShell>
        </div>

        {/* Benefit Cards Listing Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FiTag className="text-emerald-600 stroke-[3]" />
              Benefit Discount Cards
            </h2>
            <button
              onClick={handleAddCard}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-wider transition-colors border border-emerald-100"
            >
              <FiPlus className="w-3.5 h-3.5 stroke-[3]" />
              Add Card
            </button>
          </div>

          {vipCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
              <FiTag className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-base font-black text-gray-400">No Benefit Cards Defined</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                Add discount cards linking user categories to member-only benefits.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vipCards.map((card, idx) => {
                const targetCat = categoryMap[card.targetCategoryId];
                return (
                  <div
                    key={card.id || card._id || idx}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Label */}
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black tracking-widest uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {card.discountType || "EXTRA"}
                        </span>
                        
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditCard(card)}
                            className="p-1.5 bg-gray-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            <FiEdit2 size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id || card._id)}
                            className="p-1.5 bg-gray-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                          >
                            <FiTrash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Title Discount info */}
                      <h3 className="text-lg font-black text-gray-900 leading-tight">
                        {card.discount}% DISCOUNT
                      </h3>
                      <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                        {card.caption || `On ${targetCat?.title || 'selected category'}`}
                      </p>

                      {/* Display based on bgType */}
                      {card.bgType === "bullets" || (card.bullets && card.bullets.length > 0) ? (
                        <ul className="mt-3 space-y-1 text-[11px] font-medium text-gray-500 pl-4 list-disc border-t border-gray-100 pt-2.5">
                          {(card.bullets || []).map((bullet, bIdx) => (
                            <li key={bIdx}>{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-3 flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                          {card.cardImage || targetCat?.imageUrl ? (
                            <img
                              src={toAssetUrl(card.cardImage || targetCat.imageUrl)}
                              alt={targetCat?.title}
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-gray-400 font-bold rounded-lg text-xs">
                              Img
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase text-gray-400 block tracking-wider">Linked Category</span>
                            <span className="text-xs font-bold text-gray-700 truncate block">{targetCat?.title || "Unknown Category"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Card Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCardId ? "Edit VIP Benefit Card" : "Add VIP Benefit Card"}
      >
        <form onSubmit={handleSaveCard} className="space-y-4">
          {/* Target Category Select */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Link Category</label>
            <select
              value={cardForm.targetCategoryId}
              onChange={e => setCardForm({ ...cardForm, targetCategoryId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-sm font-bold"
              required
            >
              <option value="">Select Target Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.title} {cat.isDirectService ? "(Direct Flow)" : ""}
                </option>
              ))}
            </select>
            
            {/* Premium Category Image and Name Preview */}
            {(() => {
              const selectedCat = categories.find(c => c.id === cardForm.targetCategoryId);
              if (!selectedCat) return null;
              return (
                <div className="mt-3 p-3 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-lg border border-neutral-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {selectedCat.imageUrl ? (
                      <img 
                        src={toAssetUrl(selectedCat.imageUrl)} 
                        alt={selectedCat.title} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-neutral-400">No Img</span>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">
                      Linked Category
                    </div>
                    <div className="text-sm font-black text-neutral-800 leading-tight">
                      {selectedCat.title} {selectedCat.isDirectService ? "(Direct Flow)" : ""}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Discount Percentage */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Discount %</label>
              <input
                type="number"
                value={cardForm.discount}
                onChange={e => setCardForm({ ...cardForm, discount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                min="1"
                max="100"
                required
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Discount Type</label>
              <select
                value={cardForm.discountType}
                onChange={e => setCardForm({ ...cardForm, discountType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-sm font-bold"
              >
                <option value="EXTRA">EXTRA</option>
                <option value="FLAT">FLAT</option>
              </select>
            </div>
          </div>

          {/* Caption text */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Caption / Description</label>
            <input
              type="text"
              value={cardForm.caption}
              onChange={e => setCardForm({ ...cardForm, caption: e.target.value })}
              placeholder="e.g. On NoBroker home services"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Card Image Upload Option */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Upload Card Image (Optional)</label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                disabled={uploadingImage}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadingImage(true);
                    try {
                      const response = await serviceService.uploadImage(file, 'vip-cards');
                      if (response.success && response.imageUrl) {
                        setCardForm(p => ({ ...p, cardImage: response.imageUrl }));
                        toast.success("Card image uploaded successfully");
                      } else {
                        toast.error("Upload failed");
                      }
                    } catch (error) {
                      console.error('Card image upload error:', error);
                      toast.error("Failed to upload image");
                    } finally {
                      setUploadingImage(false);
                    }
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
              {uploadingImage && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                  <span className="text-xs font-semibold">Uploading...</span>
                </div>
              )}
              {cardForm.cardImage && !uploadingImage && (
                <div className="relative w-20 h-24 rounded-lg overflow-hidden border border-gray-200">
                  <img src={toAssetUrl(cardForm.cardImage)} alt="Card Image Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCardForm(p => ({ ...p, cardImage: "" }))}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow transition-colors flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>



          {/* Modal Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
            >
              Add/Update Card
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MembershipPage;
