import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, ShieldCheck, CheckCheck } from 'lucide-react';
import supportService from '../../services/supportService';

const formatTime = (iso) => {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const formatDayLabel = (iso) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a, b) => a.toDateString() === b.toDateString();
    if (sameDay(date, today)) return 'Today';
    if (sameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

const SupportChatPage = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);
    const bottomRef = useRef(null);

    const loadInitial = useCallback(async () => {
        setLoading(true);
        try {
            const res = await supportService.getMessages({ limit: 30 });
            if (res?.success) {
                setMessages(res.messages || []);
                setNextCursor(res.nextCursor || null);
            }
        } catch (err) {
            console.error('Failed to load support messages:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    useEffect(() => {
        // Only auto-jump-to-bottom on the very first load — subsequent
        // message appends handle their own scroll below.
        if (!loading) {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        }
    }, [loading]);

    useEffect(() => {
        const handleIncoming = (e) => {
            const data = e.detail;
            if (!data || data.senderType !== 'admin') return;
            setMessages((prev) => {
                // Cheap de-dupe in case the REST send-response and the socket
                // echo both land (shouldn't normally, but harmless either way).
                if (prev.some((m) => m._id === data._id && data._id)) return prev;
                return [...prev, {
                    _id: data._id || `live-${Date.now()}`,
                    text: data.text,
                    senderType: 'admin',
                    createdAt: data.createdAt || new Date().toISOString(),
                }];
            });
            requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
        };
        window.addEventListener('supportMessageReceived', handleIncoming);
        return () => window.removeEventListener('supportMessageReceived', handleIncoming);
    }, []);

    const loadMore = async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        const container = scrollRef.current;
        const prevHeight = container?.scrollHeight || 0;
        try {
            const res = await supportService.getMessages({ limit: 30, cursor: nextCursor });
            if (res?.success) {
                setMessages((prev) => [...(res.messages || []), ...prev]);
                setNextCursor(res.nextCursor || null);
                // Keep the viewport anchored on what the user was reading
                // instead of jumping as older messages get prepended above it.
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        setSending(true);
        setText('');
        try {
            const res = await supportService.sendMessage(trimmed);
            if (res?.success) {
                setMessages((prev) => [...prev, res.message]);
                requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setText(trimmed);
        } finally {
            setSending(false);
        }
    };

    // Group consecutive messages under one day-divider, computed once per
    // message-list change rather than mutated during render.
    const messagesWithDividers = useMemo(() => {
        let lastDay = null;
        return messages.map((m) => {
            const dayLabel = formatDayLabel(m.createdAt);
            const showDivider = dayLabel !== lastDay;
            lastDay = dayLabel;
            return { ...m, dayLabel, showDivider };
        });
    }, [messages]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={18} className="text-gray-700" />
                    </button>
                    <div className="w-10 h-10 shrink-0 rounded-full bg-surface flex items-center justify-center text-white shadow-sm">
                        <ShieldCheck size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-black text-gray-900 tracking-tight truncate">GetRightHome Support</p>
                        <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Usually replies within a few hours
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 py-5">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 size={22} className="animate-spin text-gray-300" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-surface/10 flex items-center justify-center mb-3">
                                <ShieldCheck size={24} className="text-surface" />
                            </div>
                            <p className="text-sm font-bold text-gray-800">Need help with something?</p>
                            <p className="text-xs text-gray-400 font-medium mt-1 max-w-[260px]">
                                Send us a message and our support team will get back to you here.
                            </p>
                        </div>
                    ) : (
                        <>
                            {nextCursor && (
                                <div className="text-center mb-4">
                                    <button
                                        type="button"
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="text-xs font-bold text-surface hover:underline disabled:opacity-50"
                                    >
                                        {loadingMore ? 'Loading...' : 'Load earlier messages'}
                                    </button>
                                </div>
                            )}
                            <div className="space-y-1">
                                {messagesWithDividers.map((m) => {
                                    const isUser = m.senderType === 'user';
                                    return (
                                        <React.Fragment key={m._id}>
                                            {m.showDivider && (
                                                <div className="flex justify-center my-4">
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                                        {m.dayLabel}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
                                                <div
                                                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${isUser
                                                            ? 'bg-surface text-white rounded-br-md'
                                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                                                        }`}
                                                >
                                                    <p className="break-words whitespace-pre-wrap">{m.text}</p>
                                                    <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end text-white/70' : 'justify-start text-gray-400'}`}>
                                                        <span className="text-[10px] font-semibold">{formatTime(m.createdAt)}</span>
                                                        {isUser && <CheckCheck size={12} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Composer */}
            <form
                onSubmit={handleSubmit}
                className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 safe-area-bottom"
            >
                <div className="max-w-2xl mx-auto flex items-center gap-2">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type your message..."
                        maxLength={2000}
                        className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-surface/20 focus:border-surface transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!text.trim() || sending}
                        className="w-10 h-10 shrink-0 rounded-full bg-surface text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
                    >
                        {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SupportChatPage;
