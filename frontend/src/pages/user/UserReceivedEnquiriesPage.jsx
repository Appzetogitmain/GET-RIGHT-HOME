import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquare, Users } from 'lucide-react';
import { enquiryService } from '../../services/apiService';
import toast from 'react-hot-toast';
import EnquiryCard from '../../components/enquiries/EnquiryCard';
import TabSwitcher from '../../components/enquiries/TabSwitcher';

const PAGE_SIZE = 10;
const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

const CardSkeleton = () => (
    <div className="bg-white border border-[#E0E0E0] rounded p-4 animate-pulse space-y-3">
        <div className="flex justify-between"><div className="h-5 w-40 bg-slate-200 rounded" /><div className="h-4 w-16 bg-slate-100 rounded" /></div>
        <div className="h-4 w-56 bg-slate-100 rounded" />
        <div className="h-5 w-full bg-slate-200 rounded" />
        <div className="flex justify-between items-center">
            <div className="space-y-2"><div className="h-3 w-24 bg-slate-100 rounded" /><div className="h-3 w-14 bg-slate-100 rounded" /></div>
            <div className="flex gap-3">{[0, 1, 2].map(i => <div key={i} className="w-11 h-11 rounded-full bg-slate-200" />)}</div>
        </div>
    </div>
);

const EmptyState = ({ respondents }) => (
    <div className="bg-white border border-[#E0E0E0] rounded p-10 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            {respondents ? <Users size={24} /> : <MessageSquare size={24} />}
        </div>
        <h4 className="font-bold text-slate-800">No responses yet</h4>
        <p className="text-sm text-slate-400 mt-1 max-w-[260px] mx-auto">
            When buyers or tenants enquire about your properties, they will appear here.
        </p>
    </div>
);

const UserReceivedEnquiriesPage = () => {
    const navigate = useNavigate();

    const [tab, setTab] = useState('responses'); // 'responses' | 'respondents'
    const [loading, setLoading] = useState(true);
    const [responses, setResponses] = useState([]);
    const [respondents, setRespondents] = useState([]);
    const [visible, setVisible] = useState({ responses: PAGE_SIZE, respondents: PAGE_SIZE });

    const scrollByTab = useRef({ responses: 0, respondents: 0 });
    const sentinelRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await enquiryService.getReceived();
                if (res.success) {
                    setResponses(res.allEnquiries || res.enquiries || []);
                    setRespondents(res.respondents || []);
                }
            } catch (err) {
                console.error('Load received enquiries error:', err);
                toast.error('Failed to load enquiries data');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Newest first, one card per enquiry.
    const sortedResponses = useMemo(() => [...responses].sort(byNewest), [responses]);

    // One card per unique respondent, showing their latest enquiry.
    const respondentCards = useMemo(() => respondents
        .map((r) => {
            const latest = (r.enquiries || []).reduce(
                (a, b) => (!a || new Date(b.createdAt) > new Date(a.createdAt) ? b : a), null
            );
            return latest ? { key: r.respondentId, latest, count: r.totalEnquiries || r.enquiries.length } : null;
        })
        .filter(Boolean)
        .sort((a, b) => byNewest(a.latest, b.latest)), [respondents]);

    const counts = { responses: sortedResponses.length, respondents: respondentCards.length };
    const list = tab === 'responses' ? sortedResponses : respondentCards;
    const shown = list.slice(0, visible[tab]);
    const hasMore = shown.length < list.length;

    const switchTab = (next) => {
        if (next === tab) return;
        scrollByTab.current[tab] = window.scrollY;
        setTab(next);
    };

    // Restore the saved scroll position of the tab we just switched to.
    useEffect(() => {
        window.scrollTo(0, scrollByTab.current[tab] || 0);
    }, [tab]);

    const loadMore = useCallback(() => {
        setVisible((v) => ({ ...v, [tab]: v[tab] + PAGE_SIZE }));
    }, [tab]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasMore) return undefined;
        const io = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) loadMore();
        }, { rootMargin: '200px' });
        io.observe(el);
        return () => io.disconnect();
    }, [hasMore, loadMore, shown.length]);

    const openDetail = (enquiry) => navigate(`/my-enquiries/${enquiry._id}`);

    return (
        <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8 text-slate-800">
            <div className="sticky top-0 z-30 bg-white shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft size={17} className="text-slate-700" />
                    </button>
                    <h1 className="text-base font-black text-slate-900">Enquiry Dashboard</h1>
                </div>
                <TabSwitcher
                    active={tab}
                    onChange={switchTab}
                    tabs={[
                        { key: 'responses', label: 'All Responses', count: counts.responses },
                        { key: 'respondents', label: 'All Respondents', count: counts.respondents },
                    ]}
                />
            </div>

            <div className="px-3 py-3 w-full md:max-w-[480px] md:mx-auto space-y-3">
                {loading ? (
                    [0, 1, 2].map((i) => <CardSkeleton key={i} />)
                ) : list.length === 0 ? (
                    <EmptyState respondents={tab === 'respondents'} />
                ) : (
                    <>
                        {tab === 'responses'
                            ? shown.map((item) => (
                                <EnquiryCard key={item._id} item={item} onViewDetail={() => openDetail(item)} />
                            ))
                            : shown.map((r) => (
                                <EnquiryCard
                                    key={r.key}
                                    item={r.latest}
                                    enquiryCount={r.count}
                                    onViewDetail={() => openDetail(r.latest)}
                                />
                            ))}
                        {hasMore && (
                            <div ref={sentinelRef} className="flex justify-center py-4">
                                <button onClick={loadMore} className="flex items-center gap-2 text-sm font-medium text-[#1A73E8]">
                                    <Loader2 size={14} className="animate-spin" /> Load more
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UserReceivedEnquiriesPage;
