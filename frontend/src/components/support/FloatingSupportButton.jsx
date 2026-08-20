import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import supportService from '../../services/supportService';

/**
 * Always-reachable entry point into the support chat — a small floating
 * action button (bottom-right, above the mobile bottom nav) rather than a
 * cramped popup panel, since a real back-and-forth conversation deserves a
 * full page, not a widget squeezed into a corner.
 */
const FloatingSupportButton = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [hasUnread, setHasUnread] = useState(false);

    const isLoggedIn = !!(localStorage.getItem('userData') || localStorage.getItem('user'));

    useEffect(() => {
        if (!isLoggedIn) return;
        let cancelled = false;
        supportService.getMyConversation()
            .then((res) => {
                if (!cancelled && res?.success) {
                    setHasUnread((res.conversation?.unreadByUser || 0) > 0);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    useEffect(() => {
        const handleIncoming = (e) => {
            if (e.detail?.senderType === 'admin') setHasUnread(true);
        };
        window.addEventListener('supportMessageReceived', handleIncoming);
        return () => window.removeEventListener('supportMessageReceived', handleIncoming);
    }, []);

    if (!isLoggedIn || location.pathname.startsWith('/support/chat')) return null;

    return (
        <button
            type="button"
            onClick={() => { setHasUnread(false); navigate('/support/chat'); }}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-surface text-white shadow-xl shadow-black/20 flex items-center justify-center active:scale-95 hover:scale-105 transition-transform"
            aria-label="Chat with support"
        >
            <MessageCircle size={24} className="fill-white/10" />
            {hasUnread && (
                <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
            )}
        </button>
    );
};

export default FloatingSupportButton;
