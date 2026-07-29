import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Building2, Search, Filter, MoreVertical, MapPin,
    CheckCircle, XCircle, Clock, Star, ShieldAlert, Trash2, Edit, Eye, Loader2,
    ChevronLeft, ChevronRight, Download, Plus, Sparkles, ExternalLink
} from 'lucide-react';

import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const ProjectStatusBadge = ({ status }) => {
    const styles = {
        approved: 'bg-green-100 text-green-700 border-green-200 font-bold',
        pending: 'bg-amber-100 text-amber-700 border-amber-200 font-bold',
        rejected: 'bg-red-100 text-red-700 border-red-200 font-bold',
        suspended: 'bg-gray-100 text-gray-700 border-gray-200 font-bold',
        draft: 'bg-gray-100 text-gray-500 border-gray-200 font-bold',
    };

    const icons = {
        approved: <CheckCircle size={10} className="mr-1" />,
        pending: <Clock size={10} className="mr-1" />,
        rejected: <XCircle size={10} className="mr-1" />,
        suspended: <ShieldAlert size={10} className="mr-1" />,
        draft: <Clock size={10} className="mr-1" />,
    };

    return (
        <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${styles[status] || styles.pending}`}>
            {icons[status] || icons.pending}
            {status}
        </span>
    );
};

const AdminProjects = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalProjects, setTotalProjects] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        type: '',
        builder: ''
    });

    const [builders, setBuilders] = useState([]);

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    useEffect(() => {
        const fetchBuilders = async () => {
            try {
                const res = await adminService.getBuilders();
                if (res.success) {
                    setBuilders(res.builders || []);
                }
            } catch (err) {
                console.error("Failed to fetch builders:", err);
            }
        };
        fetchBuilders();
    }, []);

    const fetchProjects = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status,
                type: currentFilters.type || undefined,
                builder: currentFilters.builder || undefined
            };
            const data = await adminService.getProjects(params);
            const hotelsData = await adminService.getHotels(params);
            
            let combinedProjects = [];
            if (data.success && Array.isArray(data.projects)) {
                combinedProjects = [...data.projects];
            }
            
            if (hotelsData.success && Array.isArray(hotelsData.hotels)) {
                const projectHotels = hotelsData.hotels.filter(p => {
                    const catName = String(p.propertyCategory || p.dynamicCategory?.name || p.dynamicCategory?.displayName || '').toLowerCase();
                    const typeName = String(p.propertyType || '').toLowerCase();
                    const creatorRole = String(p.partnerId?.role || p.userId?.role || p.userId?.userType || '').toLowerCase();

                    const isProj = p.isProject === true || 
                                   p.listingType === 'project' || 
                                   creatorRole === 'builder' ||
                                   catName.includes('project') ||
                                   typeName.includes('project') ||
                                   Boolean(p.builderProjectDetails) || 
                                   Boolean(p.dynamicData?.builderName) || 
                                   Boolean(p.dynamicData?.builderProjectDetails) || 
                                   (Array.isArray(p.dynamicData?.towers) && p.dynamicData.towers.length > 0);
                    return isProj;
                });
                
                // Merge without duplicates
                projectHotels.forEach(ph => {
                    if (!combinedProjects.some(cp => cp._id === ph._id)) {
                        combinedProjects.push(ph);
                    }
                });
            }

            setProjects(combinedProjects);
            setTotalProjects(combinedProjects.length);
            setTotalPages(Math.ceil(combinedProjects.length / limit));
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching projects:', error);
                toast.error('Failed to load projects');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProjects(currentPage, filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchProjects]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleAction = (action, project) => {
        setActiveDropdown(null);
        if (action === 'approve' || action === 'reject') {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            setModalConfig({
                isOpen: true,
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} Project?`,
                message: `Are you sure you want to ${action} "${project.propertyName}"?`,
                type: action === 'approve' ? 'success' : 'warning',
                confirmText: action.charAt(0).toUpperCase() + action.slice(1),
                onConfirm: async () => {
                    try {
                        const res = await adminService.updateHotelStatus(project._id, newStatus); // Uses same endpoint for now, or we can make a new one updateProjectStatus
                        if (res.success) {
                            toast.success(`Project ${action}ed successfully`);
                            fetchProjects(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to update status');
                    }
                }
            });
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete Project?',
                message: `Are you sure you want to delete "${project.propertyName}"? This action cannot be undone.`,
                type: 'danger',
                confirmText: 'Delete Project',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deleteProject(project._id);
                        if (res.success) {
                            toast.success('Project deleted successfully');
                            fetchProjects(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to delete project');
                    }
                }
            });
        }
    };

    const handleExportCSV = () => {
        if (projects.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Project Name', 'Type', 'Builder', 'Status', 'City', 'RERA Number'];
        const csvContent = [
            headers.join(','),
            ...projects.map(p => {
                const creator = p.userId;
                return [
                    p._id,
                    `"${p.propertyName}"`,
                    `"${p.propertyType}"`,
                    `"${creator?.name || ''}"`,
                    p.status,
                    `"${p.address?.city || ''}"`,
                    `"${p.reraNumber || 'N/A'}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `projects-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 relative" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Projects Management ({totalProjects})</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Manage builder projects, approvals, and quality control.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                    {/* Assuming we will add an Add Project page later */}
                    <Link
                        to={`${basePath}/projects/add`}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
                    >
                        <Plus size={14} /> Add Project
                    </Link>
                </div>

            </div>

            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search projects by name or city..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Types</option>
                        <option value="flat/apartment">Flat/Apartment</option>
                        <option value="villa">Villa</option>
                        <option value="plot">Plot</option>
                        <option value="commercial">Commercial</option>
                    </select>
                    <select
                        value={filters.builder}
                        onChange={(e) => handleFilterChange('builder', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Builders</option>
                        {builders.map(b => (
                            <option key={b._id} value={b._id}>
                                {b.builderProfile?.companyName || b.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Project Name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Builder</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 uppercase tracking-tight font-bold">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {projects.length > 0 ? (
                                        projects.map((project, index) => (
                                            <motion.tr
                                                key={project._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50/50 transition-colors group relative"
                                            >
                                                 <td className="p-4">
                                                    <Link to={`${basePath}/projects/${project._id}`} className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${
                                                            project.isAddedByAdmin
                                                                ? 'bg-purple-700 border-purple-500 text-white'
                                                                : 'bg-black border-white text-white'
                                                        }`}>
                                                            {project.isAddedByAdmin ? <Sparkles size={16} /> : <Building2 size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{project.propertyName || 'Untitled'}</p>
                                                                {(project.featuredDetails?.isFeatured || project.isFeatured) && (
                                                                    <span className="flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide">
                                                                        <Sparkles size={7} className="fill-purple-500" /> Handpicked
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">
                                                                <MapPin size={10} className="mr-1" />
                                                                {project.address?.city || 'No Address'}, {project.address?.state || ''}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-[10px] text-gray-700 font-bold uppercase">
                                                        {project.propertyType || 'N/A'}
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    {(() => {
                                                        if (project.isAddedByAdmin) {
                                                            return (
                                                                <>
                                                                    <p className="text-[10px] text-gray-700 font-bold uppercase mb-0.5">ADMIN</p>
                                                                    <p className="text-[10px] text-gray-500 font-medium normal-case tracking-tight">System Admin</p>
                                                                </>
                                                            );
                                                        }
                                                        const creator = project.userId;
                                                        return (
                                                            <>
                                                                <p className="text-[10px] text-gray-700 font-bold uppercase mb-0.5">{creator?.name || 'Unknown Builder'}</p>
                                                                <p className="text-[10px] text-gray-500 font-medium normal-case tracking-tight">{creator?.email || 'No Email'}</p>
                                                            </>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4">
                                                    <ProjectStatusBadge status={project.status} />
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === project._id ? null : project._id); }}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === project._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`${basePath}/projects/${project._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700">
                                                                <Eye size={14} /> View Details
                                                            </Link>
                                                            <a
                                                                href={`/project/${project._id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 px-4 py-2 hover:bg-purple-50 text-[10px] font-bold uppercase text-purple-700"
                                                            >
                                                                <ExternalLink size={14} /> Preview
                                                            </a>
                                                            {project.isAddedByAdmin && (
                                                                <button onClick={() => navigate(`${basePath}/projects/add`, { state: { existingProject: project } })} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700">
                                                                    <Edit size={14} /> Edit Project
                                                                </button>
                                                            )}
                                                            {project.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handleAction('approve', project)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-[10px] font-bold uppercase text-green-700">
                                                                        <CheckCircle size={14} /> Approve
                                                                    </button>
                                                                    <button onClick={() => handleAction('reject', project)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                        <XCircle size={14} /> Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                            <button onClick={() => handleAction('delete', project)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                <Trash2 size={14} /> Delete Project
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Building2 size={32} className="text-gray-300" />
                                                    <p className="text-xs font-bold uppercase">No projects found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProjects;
