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

    // Only surface this once someone is actually looking at something —
    // a property, hotel, builder project, or profile — not on the home/buy/
    // rent/search browse feeds, matching where a "chat with an expert"
    // prompt is actually useful instead of just competing for attention on
    // every screen.
    const isDetailPage = /^\/(property|hotel|handpicked|project|builder|broker)\//.test(location.pathname);

    if (!isLoggedIn || !isDetailPage || location.pathname.startsWith('/support/chat')) return null;

    return (
        <button
            type="button"
            onClick={() => { setHasUnread(false); navigate('/support/chat'); }}
            // z-[60] + bottom-44 keep this clear of every page's own sticky
            // bottom bar (property/hotel/builder pages all render their own
            // full-width contact bar, some over 100px tall and some at
            // z-[9999], which used to sit right on top of this button at its
            // old bottom-24/z-40 and hide it completely — so despite being
            // "always on" in the code, it only ever showed up in practice on
            // pages with no bottom bar, like Home).
            className="fixed bottom-44 right-4 md:bottom-8 md:right-8 z-[60] w-14 h-14 rounded-full bg-surface text-white shadow-xl shadow-black/20 flex items-center justify-center active:scale-95 hover:scale-105 transition-transform"
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
