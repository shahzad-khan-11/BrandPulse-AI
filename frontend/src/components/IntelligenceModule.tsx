/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Building, 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  Hash, 
  CheckCircle, 
  ShieldAlert, 
  MessageSquare, 
  Send, 
  Copy, 
  RotateCcw, 
  X
} from 'lucide-react';

interface Brand {
  _id: string;
  name: string;
}

interface Mention {
  _id: string;
  source: string;
  content: string;
  author: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  priorityReason?: string;
  aiClassification?: 'GENUINE' | 'POTENTIALLY_FAKE' | 'SPAM';
  aiConfidence?: number;
  aiReason?: string;
  userClassification?: 'GENUINE' | 'POTENTIALLY_FAKE' | 'SPAM' | 'UNSET';
  userClassificationReason?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  hashtags?: string[];
}

interface ResponseRecord {
  _id: string;
  mention: any;
  content: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'FAILED';
  createdAt: string;
  error?: string;
}

const IntelligenceModule: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'comparison' | 'topics' | 'hashtags' | 'priority' | 'spam' | 'replies'>('comparison');

  // Notification Toast
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);

  const showToast = (success: boolean, message: string) => {
    setToast({ success, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Location Comparison State
  const [compType, setCompType] = useState<'city' | 'state'>('city');
  const [locA, setLocA] = useState('Delhi');
  const [locB, setLocB] = useState('Patna');
  const [compData, setCompData] = useState<any>(null);
  const [compLoading, setCompLoading] = useState(false);

  // Trending Hashtags State
  const [hashtags, setHashtags] = useState<any[]>([]);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);

  // Trending Topics State
  const [topics, setTopics] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Priority Mentions State
  const [priorityMentions, setPriorityMentions] = useState<Mention[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [priorityLoading, setPriorityLoading] = useState(false);

  // Spam / Fake Mentions State
  const [spamMentions, setSpamMentions] = useState<Mention[]>([]);
  const [spamFilter, setSpamFilter] = useState<string>('');
  const [spamLoading, setSpamLoading] = useState(false);

  // Reply Generator & Response Management State
  const [selectedMentionForReply, setSelectedMentionForReply] = useState<Mention | null>(null);
  const [replyTone, setReplyTone] = useState<string>('professional');
  const [generatedReplyText, setGeneratedReplyText] = useState<string>('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [responsesList, setResponsesList] = useState<ResponseRecord[]>([]);

  // Load brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await api.get('/brands');
        if (res.data.success && res.data.data.length > 0) {
          setBrands(res.data.data);
          setSelectedBrandId(res.data.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load brands:', err);
      }
    };
    fetchBrands();
  }, []);

  // Fetch Location Comparison
  const fetchComparison = async () => {
    if (!selectedBrandId || !locA || !locB) return;
    setCompLoading(true);
    try {
      const res = await api.get(`/analytics/location-comparison?brandId=${selectedBrandId}&type=${compType}&locA=${encodeURIComponent(locA)}&locB=${encodeURIComponent(locB)}`);
      if (res.data.success) {
        setCompData(res.data.data);
      }
    } catch (err) {
      console.error('Comparison fetch failed:', err);
      showToast(false, 'Failed to compare locations.');
    } finally {
      setCompLoading(false);
    }
  };

  // Fetch Hashtags
  const fetchHashtags = async () => {
    if (!selectedBrandId) return;
    setHashtagsLoading(true);
    try {
      const res = await api.get(`/analytics/trending-hashtags?brandId=${selectedBrandId}`);
      if (res.data.success) {
        setHashtags(res.data.data);
      }
    } catch (err) {
      console.error('Hashtags fetch failed:', err);
    } finally {
      setHashtagsLoading(false);
    }
  };

  // Fetch Topics
  const fetchTopics = async () => {
    if (!selectedBrandId) return;
    setTopicsLoading(true);
    try {
      const res = await api.get(`/analytics/trending-topics?brandId=${selectedBrandId}`);
      if (res.data.success) {
        setTopics(res.data.data);
      }
    } catch (err) {
      console.error('Topics fetch failed:', err);
    } finally {
      setTopicsLoading(false);
    }
  };

  // Fetch Priority Mentions
  const fetchPriorityMentions = async () => {
    if (!selectedBrandId) return;
    setPriorityLoading(true);
    try {
      let query = `/mentions/priority?brandId=${selectedBrandId}`;
      if (priorityFilter) query += `&priority=${priorityFilter}`;
      const res = await api.get(query);
      if (res.data.success) {
        setPriorityMentions(res.data.data);
      }
    } catch (err) {
      console.error('Priority mentions fetch failed:', err);
    } finally {
      setPriorityLoading(false);
    }
  };

  // Fetch Spam / Fake Mentions
  const fetchSpamMentions = async () => {
    if (!selectedBrandId) return;
    setSpamLoading(true);
    try {
      let query = `/mentions/spam-fake?brandId=${selectedBrandId}`;
      if (spamFilter) query += `&classification=${spamFilter}`;
      const res = await api.get(query);
      if (res.data.success) {
        setSpamMentions(res.data.data);
      }
    } catch (err) {
      console.error('Spam mentions fetch failed:', err);
    } finally {
      setSpamLoading(false);
    }
  };

  // Fetch Responses List
  const fetchResponses = async () => {
    if (!selectedBrandId) return;
    try {
      const res = await api.get(`/responses?brandId=${selectedBrandId}`);
      if (res.data.success) {
        setResponsesList(res.data.data);
      }
    } catch (err) {
      console.error('Responses fetch failed:', err);
    }
  };

  // Tab switch effect
  useEffect(() => {
    if (!selectedBrandId) return;
    if (activeTab === 'comparison') fetchComparison();
    if (activeTab === 'hashtags') fetchHashtags();
    if (activeTab === 'topics') fetchTopics();
    if (activeTab === 'priority') fetchPriorityMentions();
    if (activeTab === 'spam') fetchSpamMentions();
    if (activeTab === 'replies') fetchResponses();
  }, [selectedBrandId, activeTab, priorityFilter, spamFilter]);

  // Handle Manual Classification Update
  const handleUpdateClassification = async (mentionId: string, userClassification: string) => {
    try {
      const res = await api.post(`/mentions/${mentionId}/classification`, {
        userClassification,
        userClassificationReason: `Manually marked as ${userClassification} by brand admin.`
      });
      if (res.data.success) {
        showToast(true, `Classification updated to ${userClassification}!`);
        fetchSpamMentions();
        fetchPriorityMentions();
      }
    } catch (err) {
      console.error('Classification update failed:', err);
      showToast(false, 'Failed to update classification.');
    }
  };

  // Handle Generate Reply
  const handleGenerateReply = async (mention: Mention) => {
    setSelectedMentionForReply(mention);
    setGeneratingReply(true);
    try {
      const res = await api.post(`/mentions/${mention._id}/generate-reply`, { tone: replyTone });
      if (res.data.success) {
        setGeneratedReplyText(res.data.data.reply);
      }
    } catch (err) {
      console.error('Generate reply failed:', err);
      showToast(false, 'Failed to generate AI reply.');
    } finally {
      setGeneratingReply(false);
    }
  };

  // Handle Save / Dispatch Reply
  const handleSendReply = async (status: 'DRAFT' | 'APPROVED' | 'SENT') => {
    if (!selectedMentionForReply || !generatedReplyText) return;
    try {
      const res = await api.post(`/mentions/${selectedMentionForReply._id}/send-reply`, {
        content: generatedReplyText,
        status,
      });
      if (res.data.success) {
        showToast(res.data.data.status !== 'FAILED', res.data.message);
        setSelectedMentionForReply(null);
        setGeneratedReplyText('');
        fetchResponses();
      }
    } catch (err: any) {
      console.error('Send reply failed:', err);
      showToast(false, err.response?.data?.message || 'Failed to dispatch reply.');
    }
  };

  // Handle Copy text
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    showToast(true, `Reply text copied to clipboard! (${id})`);
  };

  // Handle Retry Response
  const handleRetryResponse = async (responseId: string) => {
    try {
      const res = await api.post(`/responses/${responseId}/retry`);
      showToast(false, res.data.message);
      fetchResponses();
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Platform integration not configured.');
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all ${
          toast.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <div>
            <h2 className="text-base font-extrabold text-slate-100">Brand Intelligence Suite</h2>
            <p className="text-xxs text-slate-400 font-semibold">City/State Comparisons · Priority Ratings · Spam Detection · AI Reply Dispatch</p>
          </div>
        </div>

        {/* Brand Selector */}
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-indigo-400" />
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 outline-none cursor-pointer"
          >
            {brands.map((b) => (
              <option key={b._id} value={b._id} className="bg-slate-900 text-slate-100">
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'comparison' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          Location Comparison
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'topics' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Trending Topics
        </button>
        <button
          onClick={() => setActiveTab('hashtags')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'hashtags' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
          }`}
        >
          <Hash className="h-3.5 w-3.5" />
          Hashtag Trends
        </button>
        <button
          onClick={() => setActiveTab('priority')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'priority' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Priority System
        </button>
        <button
          onClick={() => setActiveTab('spam')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'spam' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Spam / Fake Detection
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'replies' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Reply Management
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          1 & 2. LOCATION COMPARISON TAB (City vs City / State vs State)
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 bg-slate-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => { setCompType('city'); setLocA('Delhi'); setLocB('Patna'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${compType === 'city' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  City vs City
                </button>
                <button
                  onClick={() => { setCompType('state'); setLocA('Bihar'); setLocB('Maharashtra'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${compType === 'state' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  State vs State
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={locA}
                  onChange={(e) => setLocA(e.target.value)}
                  placeholder={compType === 'city' ? 'City A (e.g. Patna)' : 'State A (e.g. Bihar)'}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 outline-none w-36"
                />
                <span className="text-xs font-black text-indigo-400">VS</span>
                <input
                  type="text"
                  value={locB}
                  onChange={(e) => setLocB(e.target.value)}
                  placeholder={compType === 'city' ? 'City B (e.g. Delhi)' : 'State B (e.g. Maharashtra)'}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 outline-none w-36"
                />
              </div>

              <button
                onClick={fetchComparison}
                disabled={compLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
              >
                {compLoading ? 'Comparing...' : 'Run Comparison'}
              </button>
            </div>
          </div>

          {compData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Location A Box */}
              <div className="glass-panel p-6 bg-slate-900/40 border-l-4 border-l-indigo-500 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <MapPin className="h-4.5 w-4.5 text-indigo-400" />
                    {compData.locA.location}
                  </h3>
                  <span className="text-xxs font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Total: {compData.locA.totalMentions}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Positive</span>
                    <strong className="text-emerald-400 text-sm">{compData.locA.positiveMentions}</strong>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Neutral</span>
                    <strong className="text-slate-300 text-sm">{compData.locA.neutralMentions}</strong>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Negative</span>
                    <strong className="text-rose-400 text-sm">{compData.locA.negativeMentions}</strong>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-350 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p><strong>Sentiment Score:</strong> <span className={compData.locA.sentimentScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{compData.locA.sentimentScore}</span></p>
                  <p><strong>Threat Count:</strong> {compData.locA.threatCount}</p>
                  <p><strong>Spam / Fake Count:</strong> {compData.locA.spamFakeCount}</p>
                </div>
              </div>

              {/* Location B Box */}
              <div className="glass-panel p-6 bg-slate-900/40 border-l-4 border-l-purple-500 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <MapPin className="h-4.5 w-4.5 text-purple-400" />
                    {compData.locB.location}
                  </h3>
                  <span className="text-xxs font-black uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Total: {compData.locB.totalMentions}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Positive</span>
                    <strong className="text-emerald-400 text-sm">{compData.locB.positiveMentions}</strong>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Neutral</span>
                    <strong className="text-slate-300 text-sm">{compData.locB.neutralMentions}</strong>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Negative</span>
                    <strong className="text-rose-400 text-sm">{compData.locB.negativeMentions}</strong>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-350 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p><strong>Sentiment Score:</strong> <span className={compData.locB.sentimentScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{compData.locB.sentimentScore}</span></p>
                  <p><strong>Threat Count:</strong> {compData.locB.threatCount}</p>
                  <p><strong>Spam / Fake Count:</strong> {compData.locB.spamFakeCount}</p>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. TRENDING HASHTAGS TAB
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'hashtags' && (
        <div className="glass-panel p-6 bg-slate-900/40 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <Hash className="h-4.5 w-4.5 text-indigo-400" />
            Trending Hashtags (Extracted Content Signals)
          </h3>

          {hashtagsLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading hashtag analytics...</div>
          ) : hashtags.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No hashtag trends recorded for this brand.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {hashtags.map((item, idx) => (
                <div key={idx} className="glass-panel p-4 bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-indigo-400 block">{item.hashtag}</span>
                    <span className="text-[10px] text-slate-400">Mentions: {item.count}</span>
                  </div>
                  <span className="text-xxs font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {item.trendDirection}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. TRENDING TOPICS TAB
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'topics' && (
        <div className="glass-panel p-6 bg-slate-900/40 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
            Trending Topics (Gemini Semantic Analysis + Aggregation)
          </h3>

          {topicsLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading topic analytics...</div>
          ) : topics.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No trending topics detected for this brand.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((t, idx) => (
                <div key={idx} className="glass-panel p-4 bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-bold text-slate-200">{t.topic}</h4>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                      t.priority === 'critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Mentions: <strong className="text-indigo-400">{t.count}</strong></span>
                    <span>Sentiment: <strong className="uppercase text-slate-300">{t.sentiment}</strong></span>
                    <span>Location: <strong>{t.location}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. PRIORITY SYSTEM TAB
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'priority' && (
        <div className="space-y-6">
          <div className="glass-panel p-4 bg-slate-900/40 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">Filter Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 outline-none"
            >
              <option value="">All Critical & High</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>

          <div className="space-y-4">
            {priorityLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading priority mentions...</div>
            ) : priorityMentions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No priority classified mentions found for this filter.</p>
            ) : (
              priorityMentions.map((m) => (
                <div key={m._id} className="glass-panel p-5 bg-slate-900/40 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${
                      m.priority === 'critical' 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {m.priority} Priority
                    </span>
                    <span className="text-xxs text-slate-400">{new Date(m.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium">{m.content}</p>
                  {m.priorityReason && (
                    <div className="p-2.5 rounded bg-slate-950 text-xxs text-slate-400 border border-slate-800">
                      <strong>Classification Reason:</strong> {m.priorityReason}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleGenerateReply(m)}
                      className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xxs transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate AI Reply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          7 & 8. SPAM / FAKE DETECTION & MANUAL CLASSIFICATION TAB
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'spam' && (
        <div className="space-y-6">
          <div className="glass-panel p-4 bg-slate-900/40 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">Filter Classification:</span>
            <select
              value={spamFilter}
              onChange={(e) => setSpamFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 outline-none"
            >
              <option value="">All Spam & Potentially Fake</option>
              <option value="SPAM">Spam Only</option>
              <option value="POTENTIALLY_FAKE">Potentially Fake Only</option>
              <option value="GENUINE">Genuine Only</option>
            </select>
          </div>

          <div className="space-y-4">
            {spamLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading spam / fake mentions...</div>
            ) : spamMentions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No suspicious or spam mentions recorded.</p>
            ) : (
              spamMentions.map((m) => (
                <div key={m._id} className="glass-panel p-5 bg-slate-900/40 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xxs font-black uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        AI: {m.aiClassification || 'GENUINE'} ({( (m.aiConfidence || 0.9) * 100 ).toFixed(0)}%)
                      </span>
                      {m.userClassification && m.userClassification !== 'UNSET' && (
                        <span className="text-xxs font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Manual: {m.userClassification}
                        </span>
                      )}
                    </div>
                    <span className="text-xxs text-slate-400">{m.author}</span>
                  </div>

                  <p className="text-xs text-slate-200">{m.content}</p>
                  <p className="text-xxs text-slate-400 italic">AI Reason: {m.aiReason || 'Analyzed by BrandPulse AI'}</p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xxs text-slate-400 font-bold uppercase">Manual Override:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateClassification(m._id, 'GENUINE')}
                        className="px-2.5 py-1 rounded bg-slate-950 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xxs font-bold transition-all"
                      >
                        Mark Genuine
                      </button>
                      <button
                        onClick={() => handleUpdateClassification(m._id, 'POTENTIALLY_FAKE')}
                        className="px-2.5 py-1 rounded bg-slate-950 hover:bg-amber-600/20 text-amber-400 border border-amber-500/30 text-xxs font-bold transition-all"
                      >
                        Mark Fake
                      </button>
                      <button
                        onClick={() => handleUpdateClassification(m._id, 'SPAM')}
                        className="px-2.5 py-1 rounded bg-slate-950 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xxs font-bold transition-all"
                      >
                        Mark Spam
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          9, 10 & 11. REPLY GENERATOR & RESPONSE MANAGEMENT TAB
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'replies' && (
        <div className="space-y-6">
          
          {/* Modal / Generator Overlay if active */}
          {selectedMentionForReply && (
            <div className="glass-panel p-6 bg-slate-900/90 border-indigo-500/40 border space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  AI Reply Generator
                </h3>
                <button onClick={() => setSelectedMentionForReply(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 rounded bg-slate-950 text-xs text-slate-300 border border-slate-800">
                <strong>Original Review:</strong> "{selectedMentionForReply.content}"
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300">Tone:</span>
                <select
                  value={replyTone}
                  onChange={(e) => setReplyTone(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 outline-none"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly / Casual</option>
                  <option value="apologetic">Apologetic</option>
                </select>
                <button
                  onClick={() => handleGenerateReply(selectedMentionForReply)}
                  disabled={generatingReply}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {generatingReply ? 'Generating...' : 'Regenerate'}
                </button>
              </div>

              <textarea
                value={generatedReplyText}
                onChange={(e) => setGeneratedReplyText(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleCopyText(generatedReplyText, 'generator')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Reply
                </button>
                <button
                  onClick={() => handleSendReply('DRAFT')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSendReply('SENT')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Reply
                </button>
              </div>
            </div>
          )}

          {/* Response Management Records */}
          <div className="glass-panel p-6 bg-slate-900/40 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-indigo-400" />
              Response Management Records (Drafts, Sent, Failed)
            </h3>

            {responsesList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No response records found for this brand.</p>
            ) : (
              <div className="space-y-3">
                {responsesList.map((resItem) => (
                  <div key={resItem._id} className="glass-panel p-4 bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        resItem.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        resItem.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {resItem.status}
                      </span>
                      <span className="text-xxs text-slate-400">{new Date(resItem.createdAt).toLocaleString()}</span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium">{resItem.content}</p>

                    {resItem.error && (
                      <p className="text-xxs text-rose-400 italic bg-rose-500/5 p-2 rounded border border-rose-500/20">
                        {resItem.error}
                      </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleCopyText(resItem.content, resItem._id)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xxs font-bold flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      {resItem.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryResponse(resItem._id)}
                          className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xxs font-bold flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retry Send
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default IntelligenceModule;
