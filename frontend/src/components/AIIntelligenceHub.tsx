/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Sparkles,
  ShieldAlert,
  Flame,
  Activity,
  Zap,
  MapPin,
  MessageSquare,
  BarChart3,
} from 'lucide-react';

interface AIIntelligenceHubProps {
  brandId: string;
  onNavigateMentions?: (filter?: string) => void;
  onOpenReplyComposer?: (mention: any) => void;
}

const AIIntelligenceHub: React.FC<AIIntelligenceHubProps> = ({
  brandId,
  onNavigateMentions,
  onOpenReplyComposer,
}) => {
  const [actionPlan, setActionPlan] = useState<any[]>([]);
  const [reputationRisk, setReputationRisk] = useState<any>(null);
  const [viralIssues, setViralIssues] = useState<any[]>([]);
  const [locationIntel, setLocationIntel] = useState<any[]>([]);
  const [priorityQueue, setPriorityQueue] = useState<any[]>([]);
  const [customerVoice, setCustomerVoice] = useState<any>(null);
  const [cityMatrix, setCityMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active modal / detail filter view states
  const [selectedCityDetail, setSelectedCityDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!brandId) return;
    fetchIntelligenceData();
  }, [brandId]);

  const fetchIntelligenceData = async () => {
    setLoading(true);
    try {
      const [
        planRes,
        riskRes,
        viralRes,
        locRes,
        prioRes,
        voiceRes,
        driverRes,
        langRes,
        matrixRes,
      ] = await Promise.allSettled([
        api.get(`/analytics/action-plan?brandId=${brandId}`),
        api.get(`/analytics/reputation-risk?brandId=${brandId}`),
        api.get(`/analytics/viral-issues?brandId=${brandId}`),
        api.get(`/analytics/location-intelligence?brandId=${brandId}`),
        api.get(`/analytics/priority-queue?brandId=${brandId}`),
        api.get(`/analytics/customer-voice?brandId=${brandId}`),
        api.get(`/analytics/drivers?brandId=${brandId}`),
        api.get(`/analytics/language-intelligence?brandId=${brandId}`),
        api.get(`/analytics/city-platform-matrix?brandId=${brandId}`),
      ]);

      if (planRes.status === 'fulfilled') setActionPlan(planRes.value.data.data || []);
      if (riskRes.status === 'fulfilled') setReputationRisk(riskRes.value.data.data || null);
      if (viralRes.status === 'fulfilled') setViralIssues(viralRes.value.data.data || []);
      if (locRes.status === 'fulfilled') setLocationIntel(locRes.value.data.data || []);
      if (prioRes.status === 'fulfilled') setPriorityQueue(prioRes.value.data.data || []);
      if (voiceRes.status === 'fulfilled') setCustomerVoice(voiceRes.value.data.data || null);
      if (driverRes.status === 'fulfilled') setDrivers(driverRes.value.data.data || null);
      if (langRes.status === 'fulfilled') setLangIntel(langRes.value.data.data || []);
      if (matrixRes.status === 'fulfilled') setCityMatrix(matrixRes.value.data.data || []);
    } catch (err) {
      console.error('Failed to load AI intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center glass-panel animate-pulse">
        <Sparkles className="h-8 w-8 text-indigo-400 mx-auto animate-spin mb-3" />
        <h4 className="font-bold text-sm text-slate-300">Synthesizing AI Decision Intelligence...</h4>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* TOP ROW: REPUTATION RISK RADAR & VIRAL ISSUE DETECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* REPUTATION RISK RADAR */}
        {reputationRisk && (
          <div className="glass-panel p-6 border-slate-800 bg-slate-900/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">
                  Reputation Risk Radar
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                reputationRisk.level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                reputationRisk.level === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {reputationRisk.level} RISK
              </span>
            </div>

            <div className="flex items-center gap-6 my-4">
              <div className="text-4xl font-black tracking-tight text-white flex items-baseline gap-1">
                <span>{reputationRisk.riskScore}</span>
                <span className="text-xs text-slate-500 font-bold">/100</span>
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    style={{ width: `${reputationRisk.riskScore}%` }}
                    className={`h-full transition-all duration-500 ${
                      reputationRisk.riskScore > 75 ? 'bg-rose-500' :
                      reputationRisk.riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-xxs text-slate-400 font-bold truncate">
                  Top Risk Driver: <span className="text-slate-200">{reputationRisk.topDriver}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="text-[9px] font-bold uppercase text-slate-500">Negative Ratio</p>
                <p className="text-xs font-black text-rose-400 mt-0.5">{reputationRisk.breakdown?.negativeRatio}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="text-[9px] font-bold uppercase text-slate-500">Critical Ratio</p>
                <p className="text-xs font-black text-amber-400 mt-0.5">{reputationRisk.breakdown?.criticalRatio}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="text-[9px] font-bold uppercase text-slate-500">Spam/Fake</p>
                <p className="text-xs font-black text-purple-400 mt-0.5">{reputationRisk.breakdown?.fakeRatio}</p>
              </div>
            </div>
          </div>
        )}

        {/* VIRAL ISSUE DETECTOR */}
        <div className="glass-panel p-6 border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-400 animate-bounce" />
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">
                Viral Issue Detector
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Rapid Growth Monitor
            </span>
          </div>

          {viralIssues.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-bold">
              No viral negative spikes detected in the active dataset.
            </div>
          ) : (
            <div className="space-y-3">
              {viralIssues.map((v) => (
                <div key={v.id} className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-rose-300">{v.hashtag}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-400">
                        {v.growth}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      {v.mentionsCount} Mentions • {v.negativePercent} • Top City: <strong className="text-slate-200">{v.topCity}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => onNavigateMentions && onNavigateMentions(v.hashtag)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xxs uppercase tracking-wider transition-all"
                  >
                    View Issue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* AI ACTION PLAN */}
      <div className="glass-panel p-6 border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-400" />
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">
              AI Action Plan (Data-Driven Recommendations)
            </h3>
          </div>
          <span className="text-xxs font-bold text-slate-500 uppercase tracking-widest">
            {actionPlan.length} Recommended Actions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actionPlan.map((act) => (
            <div key={act.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    act.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    act.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {act.priority}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">ID: {act.id}</span>
                </div>

                <h4 className="font-extrabold text-xs text-slate-200">{act.title}</h4>
                <p className="text-xxs text-slate-400 mt-1 leading-relaxed">{act.reason}</p>
                
                <div className="mt-2.5 p-2 rounded-xl bg-slate-900 border border-slate-850 text-xxs text-slate-300 italic">
                  "{act.evidence}"
                </div>
              </div>

              <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-2">
                <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider">
                  Action: {act.recommendedAction.substring(0, 35)}...
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateMentions && onNavigateMentions()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xxs font-bold transition-all"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INDIA LOCATION INTELLIGENCE & CITY MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INDIA LOCATION INTELLIGENCE */}
        <div className="lg:col-span-2 glass-panel p-6 border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">
                India Location Intelligence (Brand Impact by City)
              </h3>
            </div>
            <span className="text-xxs font-bold text-slate-500 uppercase tracking-widest">
              Click City to Drill Down
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {locationIntel.map((loc) => (
              <div
                key={loc.city}
                onClick={() => setSelectedCityDetail(loc)}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:scale-102"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-black text-xs text-white">{loc.city}</h4>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">{loc.state}</span>
                </div>

                <div className="space-y-1.5 text-xxs font-bold">
                  <div className="flex justify-between text-emerald-400">
                    <span>Health Index:</span>
                    <span>{loc.healthScore}%</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Reputation Risk:</span>
                    <span>{loc.riskScore}%</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-850 text-[9px] text-slate-400 font-bold flex justify-between">
                  <span>{loc.total} Mentions</span>
                  <span className="text-indigo-400">Inspect →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PLATFORM X CITY MATRIX */}
        <div className="glass-panel p-6 border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">
                City × Platform Matrix
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xxs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                  <th className="py-2 px-1">City</th>
                  <th className="py-2 px-1">Twitter</th>
                  <th className="py-2 px-1">Insta</th>
                  <th className="py-2 px-1">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono">
                {cityMatrix.map((row) => (
                  <tr key={row.city} className="hover:bg-slate-950/40">
                    <td className="py-2 px-1 font-sans font-bold text-slate-200">{row.city}</td>
                    <td className={`py-2 px-1 font-black ${row.twitter >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{row.twitter}%</td>
                    <td className={`py-2 px-1 font-black ${row.instagram >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{row.instagram}%</td>
                    <td className={`py-2 px-1 font-black ${row.google_reviews >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{row.google_reviews}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SMART PRIORITY QUEUE & CUSTOMER VOICE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SMART PRIORITY QUEUE */}
        <div className="glass-panel p-6 border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-rose-400 animate-pulse" />
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">
                Top Actions Required (Smart Priority Queue)
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {priorityQueue.map((m, idx) => (
              <div key={m._id} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500">#{idx + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      m.priority === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {m.priority || 'high'}
                    </span>
                    <span className="text-xxs font-bold text-slate-400">@{m.author}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium truncate">{m.content}</p>
                </div>

                <button
                  onClick={() => onOpenReplyComposer && onOpenReplyComposer(m)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xxs uppercase tracking-wider transition-all"
                >
                  Reply
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CUSTOMER VOICE HIGHLIGHTS */}
        {customerVoice && (
          <div className="glass-panel p-6 border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-400" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-200">
                  Customer Voice (Representative Mentions)
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {customerVoice.mostPositive && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Most Positive Review</span>
                  <p className="text-xs text-slate-200 italic">"{customerVoice.mostPositive.content}"</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">— @{customerVoice.mostPositive.author}</p>
                </div>
              )}

              {customerVoice.mostNegative && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">Most Critical Feedback</span>
                  <p className="text-xs text-slate-200 italic">"{customerVoice.mostNegative.content}"</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">— @{customerVoice.mostNegative.author}</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* CITY DETAIL DRILL DOWN MODAL */}
      {selectedCityDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-black text-white">{selectedCityDetail.city} Intelligence Breakdown</h3>
              <button onClick={() => setSelectedCityDetail(null)} className="text-slate-400 hover:text-white font-black text-sm">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500">Health Index</p>
                <p className="text-base font-black text-emerald-400">{selectedCityDetail.healthScore}%</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500">Reputation Risk</p>
                <p className="text-base font-black text-rose-400">{selectedCityDetail.riskScore}%</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-extrabold text-slate-300 mb-2">Trending Regional Hashtags:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCityDetail.uniqueHashtags?.map((h: string) => (
                  <span key={h} className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xxs font-mono font-bold">
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedCityDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-extrabold hover:bg-slate-700 transition-all"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AIIntelligenceHub;
