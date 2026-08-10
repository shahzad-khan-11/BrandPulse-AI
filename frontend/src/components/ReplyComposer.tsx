import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  RotateCcw, 
  AlertTriangle, 
  ShieldAlert, 
  Globe, 
  Volume2, 
  X,
  History
} from 'lucide-react';

interface Suggestion {
  style: string;
  text: string;
}

interface ResponseRecord {
  _id: string;
  mention: string;
  content: string;
  aiGeneratedResponse?: string;
  finalResponse?: string;
  status: 'DRAFT' | 'GENERATED' | 'EDITED' | 'APPROVED' | 'DISPATCHING' | 'SENT' | 'SIMULATED' | 'FAILED';
  mode?: 'LIVE' | 'DEMO';
  isDemo?: boolean;
  sentAt?: string;
  error?: string;
  createdAt: string;
}

interface ReplyComposerProps {
  mentionId: string;
  brandId: string;
  platform: string;
  author: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  emotion?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  classification?: string;
  language?: string;
  locationStr?: string;
  onClose: () => void;
  onResponseUpdated?: () => void;
}

const ReplyComposer: React.FC<ReplyComposerProps> = ({
  mentionId,
  platform,
  author,
  content,
  priority = 'low',
  classification = 'GENUINE',
  language: initialLanguage = 'Auto Detect',
  onClose,
  onResponseUpdated
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage || 'Auto Detect');
  const [selectedTone, setSelectedTone] = useState<string>('Professional');
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);
  const [aiGeneratedText, setAiGeneratedText] = useState<string>('');
  const [editableText, setEditableText] = useState<string>('');
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);

  const [confirmDispatchOpen, setConfirmDispatchOpen] = useState<boolean>(false);
  const [isPlatformConnected, setIsPlatformConnected] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<ResponseRecord[]>([]);
  const [historyStats, setHistoryStats] = useState<{ generatedCount: number; selectedCount: number; dispatchedCount: number }>({
    generatedCount: 0,
    selectedCount: 0,
    dispatchedCount: 0
  });

  const [spamConfirmed, setSpamConfirmed] = useState<boolean>(false);

  const isSpamOrFake = classification === 'SPAM' || classification === 'POTENTIALLY_FAKE';
  const isCritical = priority === 'critical';

  // Fetch 4 AI suggestions
  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    setGenError(null);
    try {
      const res = await api.post(`/mentions/${mentionId}/generate-replies`, {
        tone: selectedTone,
        language: selectedLanguage
      });
      if (res.data.success && Array.isArray(res.data.data.suggestions)) {
        setSuggestions(res.data.data.suggestions);
      } else {
        setGenError('Unable to generate suggestions right now.');
      }
    } catch (err) {
      console.error('Failed to generate replies:', err);
      setGenError('Unable to generate suggestions right now.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Fetch response history
  const fetchHistory = async () => {
    try {
      const res = await api.get(`/mentions/${mentionId}/responses`);
      if (res.data.success) {
        setHistoryList(res.data.data);
        if (res.data.stats) {
          setHistoryStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load response history:', err);
    }
  };

  useEffect(() => {
    if (!isSpamOrFake || spamConfirmed) {
      fetchSuggestions();
    }
    fetchHistory();
  }, [mentionId, spamConfirmed]);

  const handleToneOrLangChange = (newLang: string, newTone: string) => {
    setSelectedLanguage(newLang);
    setSelectedTone(newTone);
    fetchSuggestions();
  };

  // Select a suggestion
  const handleSelectSuggestion = async (index: number) => {
    const sug = suggestions[index];
    if (!sug) return;
    setSelectedSuggestionIndex(index);
    setAiGeneratedText(sug.text);
    setEditableText(sug.text);

    try {
      const res = await api.post(`/mentions/${mentionId}/select-reply`, {
        selectedReply: sug.text
      });
      if (res.data.success && res.data.data) {
        setActiveResponseId(res.data.data._id);
        setResponseStatus(res.data.data.status);
        fetchHistory();
        if (onResponseUpdated) onResponseUpdated();
      }
    } catch (err) {
      console.error('Select reply failed:', err);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!editableText) return;
    try {
      const res = await api.post(`/mentions/${mentionId}/save-reply`, {
        content: editableText,
        aiGeneratedResponse: aiGeneratedText,
        responseId: activeResponseId
      });
      if (res.data.success) {
        setActiveResponseId(res.data.data._id);
        setResponseStatus('DRAFT');
        fetchHistory();
        if (onResponseUpdated) onResponseUpdated();
      }
    } catch (err) {
      console.error('Save draft failed:', err);
    }
  };

  // Approve Reply
  const handleApprove = async () => {
    if (!editableText) return;
    try {
      const res = await api.post(`/mentions/${mentionId}/approve-reply`, {
        content: editableText,
        aiGeneratedResponse: aiGeneratedText,
        responseId: activeResponseId
      });
      if (res.data.success) {
        setActiveResponseId(res.data.data._id);
        setResponseStatus('APPROVED');
        fetchHistory();
        if (onResponseUpdated) onResponseUpdated();
      }
    } catch (err) {
      console.error('Approve reply failed:', err);
    }
  };

  // Dispatch Reply
  const handleDispatch = async () => {
    if (!editableText) return;
    try {
      const res = await api.post(`/mentions/${mentionId}/dispatch`, {
        content: editableText,
        aiGeneratedResponse: aiGeneratedText,
        responseId: activeResponseId,
        isPlatformConnected
      });
      if (res.data.success) {
        setActiveResponseId(res.data.data._id);
        setResponseStatus(res.data.data.status);
        setConfirmDispatchOpen(false);
        fetchHistory();
        if (onResponseUpdated) onResponseUpdated();
      }
    } catch (err) {
      console.error('Dispatch reply failed:', err);
    }
  };

  // Copy text
  const handleCopy = () => {
    if (!editableText) return;
    navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportNotes, setReportNotes] = useState('');
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const [restrictModalOpen, setRestrictModalOpen] = useState(false);
  const [restrictFeedback, setRestrictFeedback] = useState<string | null>(null);

  const handleReportSubmit = async () => {
    try {
      const res = await api.post(`/mentions/${mentionId}/report`, {
        reason: reportReason,
        notes: reportNotes,
      });
      if (res.data.success) {
        setReportFeedback(res.data.message || 'Report case submitted successfully.');
        setTimeout(() => {
          setReportFeedback(null);
          setReportModalOpen(false);
        }, 3000);
      }
    } catch (err: any) {
      setReportFeedback(err.response?.data?.message || 'Report submission failed.');
    }
  };

  const handleRestrictSubmit = async () => {
    try {
      const res = await api.post(`/mentions/${mentionId}/restrict`, {
        actionType: 'RESTRICT_CONTENT',
        isPlatformConnected,
      });
      if (res.data.success) {
        setRestrictFeedback(res.data.message || 'Content restricted successfully.');
        setTimeout(() => {
          setRestrictFeedback(null);
          setRestrictModalOpen(false);
        }, 3000);
      }
    } catch (err: any) {
      setRestrictFeedback(err.response?.data?.message || 'Restriction failed.');
    }
  };

  return (
    <div className="mt-4 p-5 rounded-2xl bg-slate-950 border border-indigo-500/40 text-slate-200 space-y-5 animate-slide-up shadow-2xl relative">
      
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center pb-3 border-b border-slate-800 gap-2">
        <div>
          <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">
            REPLY COMPOSER & CONTENT ACTIONS
          </span>
          <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-2 mt-0.5">
            <span>Replying to @{author}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wider font-bold border border-slate-700">
              {platform}
            </span>
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {/* Report Button */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
          >
            Report
          </button>

          {/* Restrict Button */}
          <button
            onClick={() => setRestrictModalOpen(true)}
            className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
          >
            Restrict
          </button>

          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* REPORT MODAL OVERLAY */}
      {reportModalOpen && (
        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 space-y-3 animate-fade-in">
          <h5 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Report Content Case
          </h5>
          {reportFeedback ? (
            <p className="text-xs text-emerald-400 font-bold">{reportFeedback}</p>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Reason:</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="Spam">Spam</option>
                  <option value="Fake Review">Fake Review</option>
                  <option value="Fake News">Fake News</option>
                  <option value="Harassment">Harassment</option>
                  <option value="Misleading Content">Misleading Content</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Optional Notes:</label>
                <input
                  type="text"
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Provide additional details..."
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  className="px-3.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Submit Report
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* RESTRICT MODAL OVERLAY */}
      {restrictModalOpen && (
        <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/40 space-y-3 animate-fade-in">
          <h5 className="font-bold text-xs text-rose-400 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" /> Restrict Content
          </h5>
          {restrictFeedback ? (
            <p className="text-xs text-emerald-400 font-bold">{restrictFeedback}</p>
          ) : (
            <>
              <p className="text-xs text-slate-300">Are you sure you want to restrict this content?</p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setRestrictModalOpen(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestrictSubmit}
                  className="px-3.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs"
                >
                  Confirm Restrict
                </button>
              </div>
            </>
          )}
        </div>
      )}


      {/* Original Message Preview */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Original Message:</span>
        <p className="italic">"{content}"</p>
      </div>

      {/* Warning for Spam / Fake Mentions */}
      {isSpamOrFake && !spamConfirmed && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Potential spam/fake content detected.</span>
          </div>
          <p className="text-xxs text-amber-200/80">
            This mention was flagged as <strong>{classification}</strong>. Automated replies are paused until reviewed.
          </p>
          <button
            onClick={() => setSpamConfirmed(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md"
          >
            Review Before Reply
          </button>
        </div>
      )}

      {/* Main Composer Content (When not blocked by unconfirmed spam) */}
      {(!isSpamOrFake || spamConfirmed) && (
        <>
          {/* Controls Bar: Language & Tone */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="text-xxs font-bold text-slate-400 uppercase">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => handleToneOrLangChange(e.target.value, selectedTone)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Auto Detect">Auto Detect</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Hinglish">Hinglish</option>
                <option value="Regional">Regional Language</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span className="text-xxs font-bold text-slate-400 uppercase">Tone:</span>
              <select
                value={selectedTone}
                onChange={(e) => handleToneOrLangChange(selectedLanguage, e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Professional">Professional</option>
                <option value="Friendly">Friendly</option>
                <option value="Apologetic">Apologetic</option>
                <option value="Helpful">Helpful</option>
                <option value="Short">Short</option>
                <option value="Detailed">Detailed</option>
              </select>
            </div>
          </div>

          {/* AI SUGGESTED RESPONSES (4 SUGGESTIONS) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                AI SUGGESTED RESPONSES (4 Options)
              </span>
              <button
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="text-xxs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className={`h-3 w-3 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>

            {loadingSuggestions ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                <span>Generating 4 tailored AI suggestions...</span>
              </div>
            ) : genError ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-bold">
                {genError}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2 text-xs ${
                      selectedSuggestionIndex === idx
                        ? 'bg-indigo-950/40 border-indigo-500 text-slate-100 ring-1 ring-indigo-500'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                        {sug.style || `Option ${idx + 1}`}
                      </span>
                      {selectedSuggestionIndex === idx && (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed text-xs">"{sug.text}"</p>
                    <button
                      onClick={() => handleSelectSuggestion(idx)}
                      className={`w-full py-1.5 rounded-lg text-xxs font-bold transition-all ${
                        selectedSuggestionIndex === idx
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {selectedSuggestionIndex === idx ? 'Selected Reply ✓' : 'Use This Reply'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EDITABLE RESPONSE EDITOR */}
          {editableText && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
                  Selected Response Editor
                </span>
                {responseStatus && (
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    responseStatus === 'SENT' || responseStatus === 'SIMULATED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                    responseStatus === 'APPROVED' ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' :
                    responseStatus === 'FAILED' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                    'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    STATUS: {responseStatus}
                  </span>
                )}
              </div>

              <textarea
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
                placeholder="Edit your reply before sending..."
              />

              {/* CRITICAL PRIORITY REQUIREMENT */}
              {isCritical && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider text-rose-400">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    <span>CRITICAL RESPONSE REQUIRED</span>
                  </div>
                  <p className="text-xxs text-rose-200/80">
                    Workflow: Review → Select Reply → Edit → Approve → Dispatch. Automatic dispatch is restricted for critical mentions.
                  </p>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleSaveDraft}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all"
                  >
                    Save Draft
                  </button>

                  <button
                    onClick={handleApprove}
                    className="px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-xs font-bold transition-all"
                  >
                    Approve
                  </button>
                </div>

                <button
                  onClick={() => setConfirmDispatchOpen(true)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Dispatch Reply</span>
                </button>
              </div>
            </div>
          )}

          {/* Confirm Dispatch Modal Overlay */}
          {confirmDispatchOpen && (
            <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/50 space-y-3 animate-fade-in">
              <h5 className="font-bold text-xs text-slate-100">Send this reply to @{author}?</h5>
              <p className="text-xxs text-slate-300">"{editableText}"</p>
              
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1.5 text-xxs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPlatformConnected}
                    onChange={(e) => setIsPlatformConnected(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                  />
                  <span>Simulate Real Platform API Connected</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmDispatchOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatch}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-500 shadow-md"
                >
                  Confirm & Dispatch
                </button>
              </div>
            </div>
          )}

          {/* RESPONSE HISTORY SECTION */}
          {historyList.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-indigo-400" />
                  Response History ({historyStats.dispatchedCount} Dispatched · {historyList.length} Records)
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {historyList.map((rec) => (
                  <div key={rec._id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex justify-between items-center gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          rec.status === 'SENT' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                          rec.status === 'SIMULATED' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                          rec.status === 'APPROVED' ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' :
                          rec.status === 'FAILED' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {rec.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs truncate max-w-sm">"{rec.content}"</p>
                    </div>

                    <button
                      onClick={() => {
                        setEditableText(rec.content);
                        setActiveResponseId(rec._id);
                        setResponseStatus(rec.status);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xxs font-bold shrink-0"
                    >
                      View / Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}

    </div>
  );
};

export default ReplyComposer;
