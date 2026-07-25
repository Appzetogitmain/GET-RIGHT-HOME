import React, { useState, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import { GripVertical, Eye, EyeOff, Save, LayoutTemplate } from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';
import { api } from '../../../services/apiService';

const AdminHomePageLayout = () => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchLayout();
    }, []);

    const fetchLayout = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/homepage-layout');
            if (response.data.success) {
                setSections(response.data.sections);
            }
        } catch (error) {
            toast.error('Failed to load home page layout');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await api.put('/admin/homepage-layout', { sections });
            if (response.data.success) {
                toast.success('Layout updated successfully');
            }
        } catch (error) {
            toast.error('Failed to update layout');
        } finally {
            setSaving(false);
        }
    };

    const toggleVisibility = (id) => {
        setSections(sections.map(section => 
            section.id === id ? { ...section, isVisible: !section.isVisible } : section
        ));
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-[60vh]">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutTemplate className="w-6 h-6 text-indigo-600" />
                        Home Page Layout Manager
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Drag and drop sections to reorder them on the user app homepage. You can also hide specific sections.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Layout'}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dynamic Sections</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visibility</span>
                </div>
                
                <Reorder.Group axis="y" values={sections} onReorder={setSections} className="divide-y divide-gray-100">
                    {sections.map((section) => (
                        <Reorder.Item 
                            key={section.id} 
                            value={section} 
                            className="bg-white px-4 py-4 flex items-center justify-between group cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                <span className={`font-medium ${section.isVisible ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                                    {section.name}
                                </span>
                            </div>
                            
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleVisibility(section.id);
                                }}
                                className={`p-2 rounded-lg transition-colors ${section.isVisible ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={section.isVisible ? 'Hide Section' : 'Show Section'}
                            >
                                {section.isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-sm">
                <div className="flex-shrink-0 mt-0.5">ℹ️</div>
                <div>
                    <strong>Note about Fixed Sections:</strong>
                    <p className="mt-1 opacity-90">The Header, Hero Banner, Main Search, and Quick Actions (Get Started With...) are permanently fixed at the top of the homepage and cannot be reordered or hidden.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminHomePageLayout;
