import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar, Tag, Trash2, CheckCircle2, Circle, Wallet, Wrench, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../../services/apiService';
import toast from 'react-hot-toast';

const TEAL = '#ea580c'; // app orange (--color-surface)
const YELLOW = '#D68F35';
const ORANGE = '#c2410c';

const NotificationsPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // First mark all as read
                await userService.markAllNotificationsRead();
                // Then fetch the latest list (which should now be entirely read, but we need the content)
                await fetchNotifications();
            } catch (err) {
                console.warn(err); // Non-blocking
                fetchNotifications();
            }
        };
        init();
    }, []);

    const fetchNotifications = async () => {
        try {
            // No strict need to set loading here if handled in init, but safe to keep
            const data = await userService.getNotifications(1, 100);
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setSelectedIds([]); // Clear selection when exiting
        }
        setIsSelectionMode(!isSelectionMode);
    };

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const selectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n._id));
        }
    };

    const deleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Delete ${selectedIds.length} notification(s)?`)) return;

        try {
            await userService.deleteNotifications(selectedIds);
            toast.success('Notifications deleted');
            // Remove from local state
            setNotifications(notifications.filter(n => !selectedIds.includes(n._id)));
            setSelectedIds([]);
            if (notifications.length - selectedIds.length === 0) {
                setIsSelectionMode(false);
            }
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    // `data` on the Notification model is Mixed, so an admin-supplied image can
    // travel there with no schema change.
    const notificationImage = (notif) =>
        notif?.image || notif?.imageUrl || notif?.data?.image || notif?.data?.imageUrl || '';

    const visual = (type = '') => {
        const t = String(type).toLowerCase();
        if (t.includes('booking') || t.includes('professional') || t.includes('estimate')) return { Icon: Calendar, color: TEAL };
        if (t.includes('offer') || t.includes('promo') || t.includes('coupon')) return { Icon: Tag, color: ORANGE };
        if (t.includes('wallet') || t.includes('payment') || t.includes('refund')) return { Icon: Wallet, color: YELLOW };
        if (t.includes('job') || t.includes('service') || t.includes('worker')) return { Icon: Wrench, color: TEAL };
        return { Icon: Info, color: TEAL };
    };

    const timeLabel = (d) => {
        const diff = (Date.now() - new Date(d).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Today / Yesterday / date headings.
    const groups = notifications.reduce((acc, n) => {
        const d = new Date(n.createdAt);
        const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
        const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
        const label = days <= 0 ? 'Today' : days === 1 ? 'Yesterday'
            : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        const g = acc.find((x) => x.label === label);
        if (g) g.items.push(n); else acc.push({ label, items: [n] });
        return acc;
    }, []);

    const openNotification = (notif) => {
        if (isSelectionMode) { toggleSelect(notif._id); return; }
        const link = notif.data?.pushData?.link || notif.pushData?.link || notif.data?.link || notif.link;
        const relatedId = notif.data?.relatedId || notif.relatedId;
        const relatedType = notif.data?.relatedType || notif.relatedType;
        if (link) navigate(link);
        else if (relatedId && (relatedType === 'booking' || notif.type === 'finding_professional' || notif.type === 'booking')) {
            navigate(`/user/booking/${relatedId}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7F8]">
            {/* Header */}
            <div className="sticky top-0 z-30 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${TEAL} 0%, #c2410c 100%)` }}>
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={() => navigate(-1)} aria-label="Back" className="rounded-full bg-white/15 p-2 transition hover:bg-white/25">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg font-extrabold leading-tight">Notifications</h1>
                            <p className="text-xs text-white/75">
                                {notifications.length} {notifications.length === 1 ? 'update' : 'updates'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <AnimatePresence>
                            {isSelectionMode && (
                                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="flex items-center gap-2">
                                    <button onClick={selectAll} className="rounded-full bg-white/15 p-2 hover:bg-white/25" title="Select all">
                                        {selectedIds.length === notifications.length ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                    </button>
                                    {selectedIds.length > 0 && (
                                        <button onClick={deleteSelected} className="rounded-full p-2 text-white shadow" style={{ backgroundColor: ORANGE }} title="Delete selected">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {notifications.length > 0 && (
                            <button
                                onClick={toggleSelectionMode}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${isSelectionMode ? 'bg-white text-[#ea580c]' : 'bg-white/15 text-white hover:bg-white/25'}`}
                            >
                                {isSelectionMode ? 'Cancel' : 'Select'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-2xl px-4 pb-24 pt-5">
                {loading ? (
                    <div className="space-y-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex animate-pulse gap-3 rounded-2xl bg-white p-4">
                                <div className="h-11 w-11 rounded-full bg-gray-100" />
                                <div className="flex-1 space-y-2 pt-1"><div className="h-3 w-1/2 rounded bg-gray-100" /><div className="h-3 w-5/6 rounded bg-gray-100" /></div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center pt-24 text-center">
                        <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}14`, color: TEAL }}>
                            <Bell size={34} />
                        </span>
                        <p className="text-base font-bold text-gray-800">You are all caught up</p>
                        <p className="mt-1 text-sm text-gray-500">Booking and offer updates will show up here.</p>
                    </div>
                ) : (
                    groups.map((g) => (
                        <section key={g.label} className="mb-5">
                            <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{g.label}</h2>
                            <div className="space-y-2.5">
                                <AnimatePresence>
                                    {g.items.map((notif) => {
                                        const image = notificationImage(notif);
                                        const { Icon, color } = visual(notif.type);
                                        const selected = isSelectionMode && selectedIds.includes(notif._id);
                                        return (
                                            <motion.div
                                                key={notif._id}
                                                layout
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                onClick={() => openNotification(notif)}
                                                className={`relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border p-3.5 transition hover:shadow-md ${selected ? 'border-[#ea580c] bg-[#ea580c]/5' : notif.isRead ? 'border-gray-100 bg-white' : 'border-[#ea580c]/20 bg-white shadow-sm'}`}
                                            >
                                                {!notif.isRead && <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: TEAL }} />}

                                                {isSelectionMode && (
                                                    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-[#ea580c] bg-[#ea580c]' : 'border-gray-300'}`}>
                                                        {selected && <CheckCircle2 size={12} className="text-white" />}
                                                    </span>
                                                )}

                                                {image ? (
                                                    <img src={image} alt="" className="h-11 w-11 shrink-0 rounded-full bg-gray-100 object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                ) : (
                                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1A`, color }}>
                                                        <Icon size={20} />
                                                    </span>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className={`text-sm leading-snug ${notif.isRead ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'}`}>{notif.title}</h3>
                                                        <span className="shrink-0 pt-0.5 text-[10px] font-medium text-gray-400">{timeLabel(notif.createdAt)}</span>
                                                    </div>
                                                    <p className="mt-1 text-[13px] leading-relaxed text-gray-500 line-clamp-3">{notif.body}</p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </section>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
