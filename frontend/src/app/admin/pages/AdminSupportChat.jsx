import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search, MessageSquare, CheckCircle2, RotateCcw, Send, Loader2, User as UserIcon
} from 'lucide-react';
import adminService from '../../../services/adminService';

const formatRelativeTime = (iso) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const formatTime = (iso) => {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const AdminSupportChat = () => {
    const [conversations, setConversations] = useState([]);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    const [activeUserId, setActiveUserId] = useState(null);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const scrollRef = useRef(null);
    const bottomRef = useRef(null);

    const loadConversations = useCallback(async () => {
        setConversationsLoading(true);
        try {
            const res = await adminService.getSupportConversations({
                limit: 50,
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(search.trim() && { search: search.trim() }),
            });
            if (res?.success) setConversations(res.conversations || []);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setConversationsLoading(false);
        }
    }, [statusFilter, search]);

    useEffect(() => {
        const timeout = setTimeout(loadConversations, search ? 350 : 0);
        return () => clearTimeout(timeout);
    }, [loadConversations, search]);

    const openConversation = async (userId) => {
        setActiveUserId(userId);
        setMessages([]);
        setMessagesLoading(true);
        try {
            const res = await adminService.getSupportMessages(userId, { limit: 30 });
            if (res?.success) {
                setActiveConversation(res.conversation);
                setMessages(res.messages || []);
                setNextCursor(res.nextCursor || null);
                // Optimistically zero the unread badge in the list without a
                // full reload — the server already zeroed it via this fetch.
                setConversations((prev) => prev.map((c) => (
                    c.userId?._id === userId ? { ...c, unreadByAdmin: 0 } : c
                )));
                window.dispatchEvent(new Event('supportConversationRead'));
            }
        } catch (err) {
            console.error('Failed to load conversation messages:', err);
        } finally {
            setMessagesLoading(false);
            requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }));
        }
    };

    const loadMoreMessages = async () => {
        if (!nextCursor || loadingMore || !activeUserId) return;
        setLoadingMore(true);
        const container = scrollRef.current;
        const prevHeight = container?.scrollHeight || 0;
        try {
            const res = await adminService.getSupportMessages(activeUserId, { limit: 30, cursor: nextCursor });
            if (res?.success) {
                setMessages((prev) => [...(res.messages || []), ...prev]);
                setNextCursor(res.nextCursor || null);
                requestAnimationFrame(() => {
                    if (container) container.scrollTop = container.scrollHeight - prevHeight;
                });
            }
        } catch (err) {
            console.error('Failed to load earlier messages:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sending || !activeUserId) return;
        setSending(true);
        setText('');
        try {
            const res = await adminService.sendSupportMessage(activeUserId, trimmed);
            if (res?.success) {
                setMessages((prev) => [...prev, res.message]);
                requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
                setConversations((prev) => {
                    const updated = prev.map((c) => (
                        c.userId?._id === activeUserId
                            ? { ...c, lastMessage: trimmed, lastMessageAt: res.message.createdAt, lastSenderType: 'admin' }
                            : c
                    ));
                    return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
                });
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setText(trimmed);
        } finally {
            setSending(false);
        }
    };

    const toggleStatus = async () => {
        if (!activeConversation || updatingStatus) return;
        const nextStatus = activeConversation.status === 'resolved' ? 'open' : 'resolved';
        setUpdatingStatus(true);
        try {
            const res = await adminService.updateSupportConversationStatus(activeUserId, nextStatus);
            if (res?.success) {
                setActiveConversation(res.conversation);
                setConversations((prev) => prev.map((c) => (
                    c.userId?._id === activeUserId ? { ...c, status: nextStatus } : c
                )));
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Live updates from SocketContext (see homster/context/SocketContext.jsx)
    useEffect(() => {
        const handleLive = (e) => {
            const data = e.detail;
            if (!data) return;

            // Refresh the list order/preview regardless of which thread is open.
            setConversations((prev) => {
                const exists = prev.some((c) => c.userId?._id === data.userId);
                if (!exists) {
                    // A brand-new conversation — cheapest correct thing is a
                    // full reload rather than reconstructing a populated row.
                    loadConversations();
                    return prev;
                }
                const updated = prev.map((c) => (
                    c.userId?._id === data.userId
                        ? {
                            ...c,
                            lastMessage: data.text,
                            lastMessageAt: data.createdAt,
                            lastSenderType: data.senderType,
                            unreadByAdmin: data.senderType === 'user' && data.userId !== activeUserId
                                ? (c.unreadByAdmin || 0) + 1
                                : c.unreadByAdmin,
                        }
                        : c
                ));
                return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
            });

            // Append live if this is the open thread and it wasn't this
            // admin's own just-sent message (that's already appended above).
            if (data.userId === activeUserId && data.senderType === 'user') {
                setMessages((prev) => [...prev, {
                    _id: data._id || `live-${Date.now()}`,
                    text: data.text,
                    senderType: 'user',
                    createdAt: data.createdAt || new Date().toISOString(),
                }]);
                requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
            }
        };
        window.addEventListener('adminSupportMessage', handleLive);
        return () => window.removeEventListener('adminSupportMessage', handleLive);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeUserId]);

    let lastDay = null;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
                    <MessageSquare size={24} className="text-orange-600" />
                    Support Chat
                </h1>
                <p className="text-sm text-gray-500 mt-1">Direct conversations between users and the support team.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-[calc(100vh-220px)] min-h-[520px]">
                {/* Conversation list */}
                <div className="border-r border-gray-100 flex flex-col min-h-0">
                    <div className="p-3 border-b border-gray-100 space-y-2 shrink-0">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or phone..."
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
                            />
                        </div>
                        <div className="flex gap-1.5">
                            {['all', 'open', 'resolved'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-colors ${statusFilter === s
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {conversationsLoading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 size={18} className="animate-spin text-gray-300" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center py-10 px-4">
                                <p className="text-xs text-gray-400 font-medium">No conversations found.</p>
                            </div>
                        ) : (
                            conversations.map((c) => {
                                const user = c.userId || {};
                                const isActive = activeUserId === user._id;
                                const hasUnread = (c.unreadByAdmin || 0) > 0;
                                return (
                                    <button
                                        key={c._id}
                                        onClick={() => openConversation(user._id)}
                                        className={`w-full text-left px-3.5 py-3 border-b border-gray-50 flex items-start gap-3 transition-colors ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm overflow-hidden">
                                            {user.profileImage ? (
                                                <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                (user.name || 'U').charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-[13px] truncate ${hasUnread ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                                                    {user.name || 'User'}
                                                </p>
                                                <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                                                    {formatRelativeTime(c.lastMessageAt)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <p className={`text-[11.5px] truncate ${hasUnread ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                                                    {c.lastSenderType === 'admin' ? 'You: ' : ''}{c.lastMessage || 'No messages yet'}
                                                </p>
                                                {hasUnread && (
                                                    <span className="shrink-0 h-[18px] min-w-[18px] px-1 rounded-full bg-orange-600 text-white text-[9px] font-black flex items-center justify-center">
                                                        {c.unreadByAdmin}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Active thread */}
                <div className="flex flex-col min-h-0">
                    {!activeUserId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                <MessageSquare size={22} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-700">Select a conversation</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                                Pick a user from the list to view and reply to their messages.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 overflow-hidden">
                                        <UserIcon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13.5px] font-black text-gray-900 truncate">
                                            {activeConversation?.userId?.name || 'User'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 font-semibold">
                                            {activeConversation?.userId?.phone || ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleStatus}
                                    disabled={updatingStatus}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${activeConversation?.status === 'resolved'
                                            ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
                                        }`}
                                >
                                    {activeConversation?.status === 'resolved' ? (
                                        <><RotateCcw size={13} /> Reopen</>
                                    ) : (
                                        <><CheckCircle2 size={13} /> Mark Resolved</>
                                    )}
                                </button>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 bg-gray-50/50">
                                {messagesLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 size={18} className="animate-spin text-gray-300" />
                                    </div>
                                ) : (
                                    <>
                                        {nextCursor && (
                                            <div className="text-center mb-3">
                                                <button
                                                    onClick={loadMoreMessages}
                                                    disabled={loadingMore}
                                                    className="text-[11px] font-bold text-gray-500 hover:underline disabled:opacity-50"
                                                >
                                                    {loadingMore ? 'Loading...' : 'Load earlier messages'}
                                                </button>
                                            </div>
                                        )}
                                        {messages.map((m) => {
                                            const isAdmin = m.senderType === 'admin';
                                            const dayLabel = new Date(m.createdAt).toDateString();
                                            const showDivider = dayLabel !== lastDay;
                                            lastDay = dayLabel;
                                            return (
                                                <React.Fragment key={m._id}>
                                                    {showDivider && (
                                                        <div className="flex justify-center my-3">
                                                            <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full">
                                                                {new Date(m.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-2`}>
                                                        <div
                                                            className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${isAdmin
                                                                    ? 'bg-gray-900 text-white rounded-br-md'
                                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                                                                }`}
                                                        >
                                                            <p className="break-words whitespace-pre-wrap">{m.text}</p>
                                                            <span className={`block mt-1 text-[10px] font-semibold ${isAdmin ? 'text-white/60' : 'text-gray-400'}`}>
                                                                {formatTime(m.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}
                                        <div ref={bottomRef} />
                                    </>
                                )}
                            </div>

                            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Type a reply..."
                                    maxLength={2000}
                                    className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!text.trim() || sending}
                                    className="w-9 h-9 shrink-0 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
                                >
                                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSupportChat;
