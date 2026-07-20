/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  MapPin, 
  AlertTriangle, 
  ListTodo, 
  CheckCircle,
  Building,
  Target
} from 'lucide-react';

interface Brand {
  _id: string;
  name: string;
}

interface Recommendation {
  _id?: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  suggestedAction: string;
}

interface AIInsightData {
  _id: string;
  brand: string;
  brandHealthScore: number;
  brandHealthSummary: string;
  customerSatisfactionTrend: string;
  positiveVsNegativeTrend: string;
  emergingIssues: string[];
  mostDiscussedTopics: string[];
  mostAffectedLocations: string[];
  topComplaintCategories: string[];
  reputationRiskSummary: string;
  recommendations: Recommendation[];
  generatedAt: string;
}

const Analytics: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [insights, setInsights] = useState<AIInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);

  const showToast = (success: boolean, message: string) => {
    setToast({ success, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await api.get('/brands');
        if (res.data.success && res.data.data.length > 0) {
          setBrands(res.data.data);
          setSelectedBrandId(res.data.data[0]._id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load brands:', err);
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  // Fetch insights for the selected brand
  const fetchInsights = async (forceRefresh = false) => {
    if (!selectedBrandId) return;
    if (forceRefresh) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get(`/insights/brand/${selectedBrandId}${forceRefresh ? '?refresh=true' : ''}`);
      if (res.data.success) {
        setInsights(res.data.data);
        if (forceRefresh) {
          showToast(true, 'AI Insights regenerated and cached successfully!');
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
      showToast(false, 'Failed to retrieve AI insights metrics.');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchInsights(false);
  }, [selectedBrandId]);

  if (brands.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-8">
        <Building className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
        <h3 className="text-xl font-black text-slate-200">No Brands Configured</h3>
        <p className="text-slate-500 dark:text-slate-450 max-w-sm mt-2 text-xs leading-relaxed">
          Create a brand query template first before initiating AI Insights.
        </p>
      </div>
    );
  }

  // Helper to determine health color classes
  const getHealthColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/20 bg-rose-500/10';
  };

  const getPriorityBadge = (p: 'high' | 'medium' | 'low') => {
    const base = "px-2.5 py-0.5 rounded-full text-xxs font-extrabold uppercase tracking-wider border shadow-sm shrink-0";
    switch (p) {
      case 'high':
        return <span className={`${base} bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20`}>High</span>;
      case 'medium':
        return <span className={`${base} bg-amber-500/10 text-amber-605 dark:text-amber-400 border-amber-500/20`}>Medium</span>;
      case 'low':
      default:
        return <span className={`${base} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`}>Low</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all ${
          toast.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-450'
        }`}>
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Brand Selection & Refresh header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <Building className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold focus:ring-1 focus:ring-indigo-500 text-slate-200 outline-none cursor-pointer"
          >
            {brands.map((b) => (
              <option key={b._id} value={b._id} className="bg-slate-900 text-slate-100">
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => fetchInsights(true)}
          disabled={loading || regenerating}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-550 text-white font-bold text-xs shadow-md disabled:opacity-40 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerating...' : 'Regenerate AI Insights'}
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : insights ? (
        <div className="space-y-6">
          
          {/* Brand Health KPI Block */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Health Score Gauge */}
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-center bg-slate-900/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Overall Brand Health</span>
              <div className={`h-28 w-28 rounded-full border-4 flex flex-col items-center justify-center shadow-inner ${getHealthColorClass(insights.brandHealthScore)}`}>
                <span className="text-3xl font-black">{insights.brandHealthScore}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide">Score</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-semibold">
                {insights.brandHealthSummary}
              </p>
            </div>

            {/* Satisfaction and Sentiment Trends */}
            <div className="glass-panel p-6 bg-slate-900/40 space-y-4 md:col-span-2">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
                Sentiment & Satisfaction Analysis
              </h3>
              
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Customer Satisfaction Trend</span>
                  <p className="text-slate-350 mt-1 font-semibold">{insights.customerSatisfactionTrend}</p>
                </div>
                
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Positive vs Negative Volume</span>
                  <p className="text-slate-350 mt-1 font-semibold">{insights.positiveVsNegativeTrend}</p>
                </div>
              </div>
            </div>

          </div>

          {/* AI Metrics Details: Vectors, Locations, and Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Emerging Issues */}
            <div className="glass-panel p-6 bg-slate-900/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Emerging Issues</span>
              {insights.emergingIssues.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No significant emerging issues.</p>
              ) : (
                <ul className="space-y-3">
                  {insights.emergingIssues.map((issueStr, idx) => {
                    let issue = { title: issueStr, mentionCount: 1, priority: 'medium', summary: 'An emerging regional issue.' };
                    try {
                      if (issueStr.startsWith('{')) {
                        issue = JSON.parse(issueStr);
                      }
                    } catch (e) {
                      console.error('Failed to parse emerging issue object', e);
                    }
                    return (
                      <li key={idx} className="flex flex-col gap-1.5 text-slate-350 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="font-bold text-slate-200 truncate text-xxs uppercase tracking-wider">{issue.title}</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                            issue.priority === 'high' 
                              ? 'bg-rose-500/10 text-rose-405 border-rose-500/20' 
                              : issue.priority === 'medium'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {issue.priority}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Mentions: <strong className="text-indigo-400">{issue.mentionCount}</strong>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-semibold italic">{issue.summary}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Discussed Topics */}
            <div className="glass-panel p-6 bg-slate-900/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Top Discussed Keywords</span>
              <div className="flex flex-wrap gap-2">
                {insights.mostDiscussedTopics.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No discussed keywords registered.</p>
                ) : (
                  insights.mostDiscussedTopics.map((topic, idx) => (
                    <span key={idx} className="text-xxs font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {topic}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Affected Locations */}
            <div className="glass-panel p-6 bg-slate-900/40">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Affected Locations</span>
              {insights.mostAffectedLocations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No specific location hot-spots.</p>
              ) : (
                <ul className="space-y-2 text-xs font-semibold">
                  {insights.mostAffectedLocations.map((loc, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 animate-bounce-slow" />
                      <span>{loc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Complaint Categories & Risk summary */}
            <div className="glass-panel p-6 bg-slate-900/40 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Complaint Types</span>
                <div className="flex flex-wrap gap-1">
                  {insights.topComplaintCategories.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">None listed.</span>
                  ) : (
                    insights.topComplaintCategories.map((c, idx) => (
                      <span key={idx} className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-350">
                        {c}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Reputation Risk</span>
                <p className="text-[11px] text-slate-400 italic leading-relaxed">{insights.reputationRiskSummary}</p>
              </div>
            </div>

          </div>

          {/* Actionable recommendations and steps */}
          <div className="space-y-4 pt-4">
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ListTodo className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
              Smart Recommendations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.recommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  style={{ animationDelay: `${idx * 75}ms` }}
                  className="glass-panel p-6 bg-slate-900/40 relative overflow-hidden flex flex-col justify-between hover-lift transition-all duration-300 animate-scale-up border-slate-800"
                >
                  <div className="absolute -top-6 -right-6 h-16 w-16 bg-purple-500/5 rounded-full blur-lg" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="font-extrabold text-sm text-slate-200 leading-tight">{rec.title}</h4>
                      {getPriorityBadge(rec.priority)}
                    </div>
                    
                    <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                      {rec.description}
                    </p>
                    
                    <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xxs space-y-1.5 leading-relaxed font-semibold">
                      <p className="text-slate-400">
                        <strong className="text-slate-750 dark:text-slate-300 block uppercase tracking-wide text-[9px] mb-1">Observation Reason</strong>
                        {rec.reason}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xxs text-indigo-600 dark:text-indigo-400 font-bold">
                    <Target className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span><strong>Suggested Action:</strong> {rec.suggestedAction}</span>
                  </div>

                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-20 glass-panel bg-slate-900/40">
          <Sparkles className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-4 animate-pulse" />
          <p className="text-xs text-slate-400 font-bold">No AI insights generated yet.</p>
        </div>
      )}

    </div>
  );
};

export default Analytics;
export { Analytics };
