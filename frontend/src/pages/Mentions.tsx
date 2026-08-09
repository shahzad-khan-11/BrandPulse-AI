/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Sparkles, Building, SlidersHorizontal, MapPin, Globe, Calendar, MessageSquare } from 'lucide-react';

interface Brand {
  _id: string;
  name: string;
}

interface Mention {
  _id: string;
  source: string;
  content: string;
  translatedContent?: string;
  author: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  publishedAt: string;
  language?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  priorityReason?: string;
  aiClassification?: 'GENUINE' | 'POTENTIALLY_FAKE' | 'SPAM';
  aiConfidence?: number;
  aiReason?: string;
  userClassification?: string;
  threatAnalysis?: {
    detectedThreats: string[];
    explanation: string;
  };
  location?: {
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    sourcePlatform: string;
  };
  aiAnalysis?: {
    keyThemes: string[];
    emotionalTone: string;
    suggestedAction: string;
    explanation: string;
    suggestedReplies?: {
      hindiReply?: string;
      englishReply?: string;
      friendlyReply?: string;
      professionalReply?: string;
    };
  };
}

const Mentions: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [source, setSource] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [priority, setPriority] = useState('');
  const [city, setCity] = useState('');
  const [citiesList, setCitiesList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal active analysis index
  const [openAnalysisId, setOpenAnalysisId] = useState<string | null>(null);

  // Load brands and cities on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [brandsRes, citiesRes] = await Promise.all([
          api.get('/brands'),
          api.get('/mentions/cities').catch(() => ({ data: { success: false, data: [] } }))
        ]);

        if (brandsRes.data.success && brandsRes.data.data.length > 0) {
          setBrands(brandsRes.data.data);
          setSelectedBrandId(brandsRes.data.data[0]._id);
        } else {
          setLoading(false);
        }

        if (citiesRes.data.success) {
          setCitiesList(citiesRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Load paginated mentions on filter trigger
  const fetchMentions = async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      let query = `?page=${page}&limit=6`;
      if (source) query += `&source=${source}`;
      if (sentiment) query += `&sentiment=${sentiment}`;
      if (priority) query += `&priority=${priority}`;
      if (city) query += `&city=${city}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await api.get(`/mentions/brand/${selectedBrandId}${query}`);
      if (res.data.success) {
        setMentions(res.data.data);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load mentions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchMentions();
  }, [selectedBrandId, source, sentiment, priority, search, city]);

  useEffect(() => {
    fetchMentions();
  }, [page]);

  if (brands.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-8">
        <Building className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-xl font-black text-slate-200">No Active Brand Found</h3>
        <p className="text-slate-500 dark:text-slate-450 max-w-sm mt-2 text-xs leading-relaxed">
          Setup a brand profile in the Brands tab first before scanning feed mentions.
        </p>
      </div>
    );
  }

  // Sentiment Badges Renderer
  const renderSentimentBadge = (sentiment: 'positive' | 'neutral' | 'negative') => {
    const base = "px-2.5 py-0.5 rounded-full text-xxs font-extrabold uppercase tracking-wider border shadow-sm";
    switch (sentiment) {
      case 'positive':
        return <span className={`${base} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`}>Positive</span>;
      case 'negative':
        return <span className={`${base} bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20`}>Negative</span>;
      case 'neutral':
      default:
        return <span className={`${base} bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`}>Neutral</span>;
    }
  };

  // Priority Badges Renderer (Story 3 Requirement)
  const renderPriorityBadge = (priorityVal: 'critical' | 'high' | 'medium' | 'low') => {
    const base = "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm shrink-0";
    switch (priorityVal) {
      case 'critical':
        return <span className={`${base} bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30`}>Critical</span>;
      case 'high':
        return <span className={`${base} bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-550/30`}>High</span>;
      case 'medium':
        return <span className={`${base} bg-yellow-500/15 text-yellow-600 dark:text-yellow-405 border-yellow-500/30`}>Medium</span>;
      case 'low':
      default:
        return <span className={`${base} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30`}>Low</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      
      {/* Filters bar */}
      <div className="glass-panel p-6 space-y-4 bg-slate-900/40 border-slate-800/80">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Building className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold focus:ring-1 focus:ring-indigo-500 text-slate-200 outline-none cursor-pointer"
            >
              {brands.map((b) => (
                <option key={b._id} value={b._id} className="bg-slate-900 text-slate-200">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search mentions content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-500 outline-none"
            />
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800/80 items-center">
          <div className="flex items-center gap-2 text-xxs font-bold text-slate-400 uppercase tracking-wider">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>Refine Search:</span>
          </div>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-200 outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-200">All Sources</option>
            <option value="twitter" className="bg-slate-900 text-slate-200">Twitter</option>
            <option value="reddit" className="bg-slate-900 text-slate-200">Reddit</option>
            <option value="news" className="bg-slate-900 text-slate-200">News</option>
            <option value="web" className="bg-slate-900 text-slate-200">Web</option>
            <option value="local_news" className="bg-slate-900 text-slate-200">Local News</option>
            <option value="rss" className="bg-slate-900 text-slate-200">RSS Feeds</option>
            <option value="regional_news" className="bg-slate-900 text-slate-200">Regional News</option>
            <option value="regional_blogs" className="bg-slate-900 text-slate-200">Regional Blogs</option>
            <option value="google_reviews" className="bg-slate-900 text-slate-200">Google Reviews</option>
            <option value="youtube" className="bg-slate-900 text-slate-200">YouTube</option>
            <option value="x" className="bg-slate-900 text-slate-200">X (Twitter)</option>
            <option value="custom" className="bg-slate-900 text-slate-200">Manual</option>
          </select>

          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-200 outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-200">All Sentiment</option>
            <option value="positive" className="bg-slate-900 text-slate-200">Positive</option>
            <option value="neutral" className="bg-slate-900 text-slate-200">Neutral</option>
            <option value="negative" className="bg-slate-900 text-slate-200">Negative</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-200 outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-200">All Priorities</option>
            <option value="critical" className="bg-slate-900 text-slate-200">Critical</option>
            <option value="high" className="bg-slate-900 text-slate-200">High</option>
            <option value="medium" className="bg-slate-900 text-slate-200">Medium</option>
            <option value="low" className="bg-slate-900 text-slate-200">Low</option>
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-200 outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-200">All Cities</option>
            {citiesList.map((c: any) => (
              <option key={c.city} value={c.city} className="bg-slate-900 text-slate-200">
                {c.city} ({c.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : mentions.length === 0 ? (
        <div className="text-center py-20 glass-panel p-8 bg-slate-900/40 border-slate-800/80">
          <MessageSquare className="h-12 w-12 text-slate-400 dark:text-slate-650 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">No mention feeds matching the specified filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mentions.map((mention, index) => (
              <div 
                key={mention._id}
                style={{ animationDelay: `${index * 75}ms` }}
                className="glass-panel p-6 flex flex-col justify-between hover-lift transition-all duration-300 animate-scale-up shadow-lg group relative overflow-hidden bg-slate-900/40 border-slate-800/80"
              >
                {/* Visual accent line inside card based on sentiment */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 opacity-60 ${
                  mention.sentiment === 'positive' ? 'bg-emerald-500' :
                  mention.sentiment === 'negative' ? 'bg-rose-500' : 'bg-blue-500'
                }`} />

                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
                        {mention.source}
                      </span>
                      <h4 className="font-bold text-sm text-slate-200 mt-2">By: {mention.author}</h4>
                    </div>
                    
                    {/* Sentiment & Priority Badges Stack */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {renderSentimentBadge(mention.sentiment)}
                      {mention.priority && renderPriorityBadge(mention.priority)}
                    </div>
                  </div>

                  {/* Badges row: Language & Location */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Language Badge */}
                    {mention.language && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-350 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 font-semibold">
                        <Globe className="h-3.5 w-3.5 text-indigo-400" />
                        {mention.language}
                      </span>
                    )}

                    {/* Hyperlocal Location Badge */}
                    {mention.location && mention.location.city && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-350 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 font-semibold" title={`${mention.location.city}, ${mention.location.state}`}>
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        {mention.location.city}, {mention.location.state}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed font-normal bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    {mention.content}
                  </p>

                  {mention.translatedContent && mention.language !== 'English' && (
                    <div className="mt-3 p-3 rounded-xl bg-indigo-950/25 border border-indigo-900/40 text-xs text-slate-300">
                      <span className="font-extrabold text-[10px] text-indigo-400 block mb-1 uppercase tracking-wider">English Translation</span>
                      <p className="italic font-normal">"{mention.translatedContent}"</p>
                    </div>
                  )}

                  {/* Premium AI Evaluation Box */}
                  {(mention.aiAnalysis || mention.priority) && (
                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <button
                        onClick={() => setOpenAnalysisId(openAnalysisId === mention._id ? null : mention._id)}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400 animate-pulse" />
                        {openAnalysisId === mention._id ? 'Collapse AI Evaluation' : 'Expand AI Brand Evaluation'}
                      </button>

                      {openAnalysisId === mention._id && (
                        <div className="mt-4 p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 text-xs space-y-5 animate-slide-up shadow-2xl text-slate-200">
                          
                          {/* SECTION 1: ORIGINAL MENTION */}
                          <div className="space-y-1.5 pb-3 border-b border-slate-800">
                            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">Original Mention Content</span>
                            <p className="text-slate-100 font-bold leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                              "{mention.content}"
                            </p>
                          </div>

                          {/* SECTION 2: COMPLETE AI ANALYSIS */}
                          <div className="space-y-3 pb-3 border-b border-slate-800">
                            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">AI Safety & Sentiment Analysis</span>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                <span className="text-slate-400 font-bold block uppercase text-[8px]">Sentiment</span>
                                <strong className="uppercase text-slate-200">{mention.sentiment}</strong>
                              </div>
                              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                <span className="text-slate-400 font-bold block uppercase text-[8px]">Emotion</span>
                                <strong className="capitalize text-slate-200">{mention.aiAnalysis?.emotionalTone || 'Neutral'}</strong>
                              </div>
                              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                <span className="text-slate-400 font-bold block uppercase text-[8px]">Priority Level</span>
                                <strong className="uppercase text-slate-200">{mention.priority || 'LOW'}</strong>
                              </div>
                              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                <span className="text-slate-400 font-bold block uppercase text-[8px]">Classification</span>
                                <strong className="uppercase text-slate-200">{mention.aiClassification || 'GENUINE'}</strong>
                              </div>
                            </div>

                            {mention.priorityReason && (
                              <div className="p-2.5 rounded-lg bg-slate-900 text-xxs text-slate-350 border border-slate-800">
                                <strong>Priority Reason:</strong> {mention.priorityReason}
                              </div>
                            )}

                            {mention.aiReason && (
                              <div className="p-2.5 rounded-lg bg-slate-900 text-xxs text-slate-350 border border-slate-800 italic">
                                <strong>Classification Reason:</strong> {mention.aiReason}
                              </div>
                            )}
                          </div>

                          {/* SECTION 3: AI RESPONSE GENERATOR & EDITOR */}
                          <div className="space-y-3">
                            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">AI Reply Studio</span>

                            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xxs text-slate-350 space-y-2">
                              <span className="font-extrabold text-indigo-400 uppercase tracking-wider block text-[9px]">Default Quick Response</span>
                              <p className="italic">"{mention.aiAnalysis?.suggestedReplies?.professionalReply || mention.aiAnalysis?.suggestedAction || 'Thank you for contacting our support team.'}"</p>
                            </div>

                            <p className="text-xxs text-slate-400 italic">
                              Need a customized reply? Use the <strong>Brand Intelligence Suite</strong> in the Dashboard to select custom language & tone options, edit responses, and dispatch replies safely.
                            </p>
                          </div>

                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-900 flex justify-between text-[10px] text-slate-500 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    Published: {new Date(mention.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-900/60 disabled:hover:border-slate-800 transition-all select-none font-bold text-xs"
              >
                Previous
              </button>
              <span className="text-xs font-mono font-bold text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-900/60 disabled:hover:border-slate-800 transition-all select-none font-bold text-xs"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Mentions;
