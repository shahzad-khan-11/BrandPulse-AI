/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { EnterpriseModal } from '../components/EnterpriseOverlays';
import {
  FileText, 
  Download, 
  Trash2, 
  Plus, 
  Building, 
  Upload, 
  Sparkles, 
  Eye, 
  RefreshCw, 
  Calendar,
  SlidersHorizontal,
  Target,
  MapPin,
  CheckCircle,
  BookOpen
} from 'lucide-react';

interface Brand {
  _id: string;
  name: string;
}

// Manual Upload Report model
interface ManualReport {
  _id: string;
  name: string;
  summary: string;
  fileUrl: string;
  status: string;
  createdAt: string;
}

// Executive Intelligence Report models (Story 5)
interface ExecutiveReport {
  _id: string;
  name: string;
  status: string;
  filters: {
    startDate?: string;
    endDate?: string;
    language?: string;
    sentiment?: string;
    priority?: string;
    source?: string;
    country?: string;
    state?: string;
    city?: string;
  };
  stats: {
    totalMentions: number;
    brandHealthScore: number;
    sentimentDistribution: { positive: number; neutral: number; negative: number };
    threatDistribution: { critical: number; high: number; medium: number; low: number };
  };
  aiSummary: {
    brandHealthSummary: string;
    sentimentOverview: string;
    threatSummary: string;
    reputationRisk: string;
    topPositiveTopics: string[];
    topNegativeTopics: string[];
    mostActiveLocations: string[];
    languageDistributionText: string;
    sourceDistributionText: string;
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      reason: string;
      suggestedAction: string;
    }>;
  };
  createdAt: string;
}

const Reports: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  
  // Tab control
  const [activeSubTab, setActiveSubTab] = useState<'executive' | 'manual'>('executive');

  // Manual reports state
  const [manualReports, setManualReports] = useState<ManualReport[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualSummary, setManualSummary] = useState('');
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [submittingManual, setSubmittingManual] = useState(false);

  // Executive reports state
  const [execReports, setExecReports] = useState<ExecutiveReport[]>([]);
  const [showExecModal, setShowExecModal] = useState(false);
  const [execReportName, setExecReportName] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'custom'>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [generatingExec, setGeneratingExec] = useState(false);

  // Report View Details state
  const [selectedReport, setSelectedReport] = useState<ExecutiveReport | null>(null);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);

  const showToast = (success: boolean, message: string) => {
    setToast({ success, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial list of brands
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

  // Fetch reports when subtab or selected brand changes
  const fetchReportsData = async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      if (activeSubTab === 'manual') {
        const res = await api.get(`/reports/brand/${selectedBrandId}`);
        if (res.data.success) {
          setManualReports(res.data.data);
        }
      } else {
        const res = await api.get(`/executive-reports/brand/${selectedBrandId}`);
        if (res.data.success) {
          setExecReports(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [selectedBrandId, activeSubTab]);

  // Handle Manual Upload submission
  const handleCreateManualReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId || !manualName) return;
    setSubmittingManual(true);

    const formData = new FormData();
    formData.append('name', manualName);
    formData.append('summary', manualSummary);
    if (manualFile) {
      formData.append('file', manualFile);
    }

    try {
      const res = await api.post(`/reports/brand/${selectedBrandId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setManualName('');
        setManualSummary('');
        setManualFile(null);
        setShowManualModal(false);
        fetchReportsData();
        showToast(true, 'Manual report compiled successfully.');
      }
    } catch (err) {
      console.error('Failed to upload manual report:', err);
      showToast(false, 'Failed to upload report file.');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleAutoGenerateExecReport = async () => {
    if (!selectedBrandId) return;
    setGeneratingExec(true);
    showToast(true, 'Initializing AI Executive Report compilation...');

    const today = new Date();
    const end = today.toISOString();
    const start = new Date();
    start.setDate(today.getDate() - 7);
    const startDateStr = start.toISOString();
    const reportName = `Executive AI Report - ${today.toLocaleDateString()}`;

    try {
      const res = await api.post(`/executive-reports/brand/${selectedBrandId}/generate`, {
        name: reportName,
        startDate: startDateStr,
        endDate: end,
        language: '',
        sentiment: '',
        priority: '',
        source: '',
        country: '',
        state: '',
        city: ''
      });

      if (res.data.success) {
        window.dispatchEvent(new CustomEvent('refetch-notifications'));
        const newReport = res.data.data;
        // Fetch new list of reports
        const listRes = await api.get(`/executive-reports/brand/${selectedBrandId}`);
        if (listRes.data.success) {
          setExecReports(listRes.data.data);
        }
        // Automatically select and display the new report
        setSelectedReport(newReport);
        showToast(true, 'AI Report generated and displayed successfully.');
      }
    } catch (err: any) {
      console.error('Failed to auto-generate report:', err);
      const errMsg = err.response?.data?.message || 'AI Report compilation failed. Ensure brand mentions exist.';
      showToast(false, errMsg);
    } finally {
      setGeneratingExec(false);
    }
  };

  // Handle Executive AI Report Generation
  const handleGenerateExecReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId) return;
    setGeneratingExec(true);

    // Compute start & end dates based on configuration range
    let computedStart = startDate;
    let computedEnd = endDate;

    if (timeRange !== 'custom') {
      const today = new Date();
      computedEnd = today.toISOString();
      
      const start = new Date();
      if (timeRange === 'today') {
        start.setHours(0, 0, 0, 0);
      } else if (timeRange === '7days') {
        start.setDate(today.getDate() - 7);
      } else if (timeRange === '30days') {
        start.setDate(today.getDate() - 30);
      }
      computedStart = start.toISOString();
    }

    try {
      const res = await api.post(`/executive-reports/brand/${selectedBrandId}/generate`, {
        name: execReportName,
        startDate: computedStart,
        endDate: computedEnd,
        language: filterLanguage,
        sentiment: filterSentiment,
        priority: filterPriority,
        source: filterSource,
        country: filterCountry,
        state: filterState,
        city: filterCity
      });

      if (res.data.success) {
        window.dispatchEvent(new CustomEvent('refetch-notifications'));
        setExecReportName('');
        setStartDate('');
        setEndDate('');
        setFilterLanguage('');
        setFilterSentiment('');
        setFilterPriority('');
        setFilterSource('');
        setFilterCountry('');
        setFilterState('');
        setFilterCity('');
        setShowExecModal(false);
        fetchReportsData();
        showToast(true, 'Executive AI Report generated and stored.');
      }
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      const errMsg = err.response?.data?.message || 'AI Report compilation failed.';
      showToast(false, errMsg);
    } finally {
      setGeneratingExec(false);
    }
  };

  // Secure Axios-based blob download for reports (Story 5 Export requirement)
  const downloadExecReport = async (reportId: string, format: string) => {
    try {
      showToast(true, `Downloading report as ${format.toUpperCase()}...`);
      const res = await api.get(`/executive-reports/${reportId}/export?format=${format}`, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let extension = 'pdf';
      if (format === 'csv') extension = 'csv';
      if (format === 'json') extension = 'json';

      link.setAttribute('download', `executive_report_${reportId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
      showToast(false, 'Export action failed.');
    }
  };

  // Regenerate an existing report
  const regenerateExecReport = async (reportId: string) => {
    try {
      showToast(true, 'Regenerating report stats...');
      const res = await api.post(`/executive-reports/${reportId}/regenerate`);
      if (res.data.success) {
        fetchReportsData();
        showToast(true, 'Report successfully updated with fresh metrics!');
        if (selectedReport && selectedReport._id === reportId) {
          setSelectedReport(res.data.data);
        }
      }
    } catch (err) {
      console.error('Regeneration failed:', err);
      showToast(false, 'Failed to regenerate report data.');
    }
  };

  // Delete manual upload
  const deleteManualReport = async (id: string) => {
    if (!window.confirm('Delete this upload permanently?')) return;
    try {
      const res = await api.delete(`/reports/${id}`);
      if (res.data.success) {
        fetchReportsData();
        showToast(true, 'Report deleted successfully.');
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  // Delete executive report
  const deleteExecReport = async (id: string) => {
    if (!window.confirm('Delete this AI Executive report permanently?')) return;
    try {
      const res = await api.delete(`/executive-reports/${id}`);
      if (res.data.success) {
        fetchReportsData();
        showToast(true, 'Report deleted successfully.');
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  // View Report details modal
  const openReportView = async (report: ExecutiveReport) => {
    setSelectedReport(report);
  };

  // Helper to determine health color classes
  const getHealthColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/20 bg-rose-500/10';
  };

  const getPriorityBadge = (p: 'high' | 'medium' | 'low') => {
    const base = "px-2 py-0.5 rounded-full text-xxs font-extrabold uppercase tracking-wider border shadow-sm shrink-0";
    switch (p) {
      case 'high':
        return <span className={`${base} bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20`}>High</span>;
      case 'medium':
        return <span className={`${base} bg-amber-500/15 text-amber-605 dark:text-amber-405 border-amber-500/20`}>Medium</span>;
      case 'low':
      default:
        return <span className={`${base} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`}>Low</span>;
    }
  };

  if (brands.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-8">
        <Building className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-xl font-black text-slate-200">No Monitored Brands</h3>
        <p className="text-slate-500 max-w-sm mt-2 text-xs leading-relaxed">
          Configure a brand profile first to activate executive report compiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      
      {/* Toast alert banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all ${
          toast.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-emerald-950/40' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-450 shadow-rose-950/40'
        }`}>
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Page Header, Brand selector and tab toggles */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40">
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

        {/* Tab triggers */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800/80 text-xs font-semibold shadow-inner">
          <button 
            onClick={() => setActiveSubTab('executive')} 
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${activeSubTab === 'executive' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Executive Reports
          </button>
          <button 
            onClick={() => setActiveSubTab('manual')} 
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${activeSubTab === 'manual' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
          >
            <Upload className="h-3.5 w-3.5" />
            Manual Uploads
          </button>
        </div>

        {/* Generation actions */}
        <div>
          {activeSubTab === 'manual' ? (
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Upload PDF Report
            </button>
          ) : (
            <button
              onClick={handleAutoGenerateExecReport}
              disabled={generatingExec || brands.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-600 hover:shadow-indigo-500/20 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/15 transition-all flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {generatingExec ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Compiling AI Report...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-purple-200 animate-pulse" />
                  <span>Generate AI Report</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Reports feed display list */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : activeSubTab === 'manual' ? (
        /* MANUAL REPORTS UPLOAD LIST */
        manualReports.length === 0 ? (
          <div className="text-center py-20 glass-panel bg-slate-900/40 p-8">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">No manual document uploads registered for this brand.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manualReports.map((report, idx) => (
              <div 
                key={report._id}
                style={{ animationDelay: `${idx * 75}ms` }}
                className="glass-panel p-6 bg-slate-900/40 flex flex-col justify-between hover-lift transition-all duration-300 animate-scale-up border-slate-800 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500/30" />
                <div className="space-y-2">
                  <h4 className="font-extrabold text-sm text-slate-200 truncate">{report.name}</h4>
                  <p className="text-slate-400 text-xxs font-mono uppercase">
                    Uploaded: {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-slate-700 dark:text-slate-355 text-xs leading-relaxed line-clamp-3 bg-slate-950/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-900/50">
                    {report.summary || 'No overview summary provided.'}
                  </p>
                </div>
                
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-900">
                  {report.fileUrl && (
                    <a
                      href={`${api.defaults.baseURL?.replace('/api', '')}${report.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-200 text-center font-bold text-xxs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-indigo-500" />
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => deleteManualReport(report._id)}
                    className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-550/20 text-red-650 dark:text-red-405 font-bold text-xxs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* EXECUTIVE INTELLIGENCE REPORTS LIST (STORY 5 HISTORY) */
        execReports.length === 0 ? (
          <div className="text-center py-20 glass-panel bg-slate-900/40 p-8">
            <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-pulse" />
            <p className="text-slate-500 text-sm">No executive AI summaries generated yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {execReports.map((report, idx) => (
              <div 
                key={report._id}
                style={{ animationDelay: `${idx * 75}ms` }}
                className="glass-panel p-6 bg-slate-900/40 flex flex-col justify-between hover-lift transition-all duration-300 animate-scale-up border-slate-800 relative overflow-hidden"
              >
                {/* Sentiment health score indicator line */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                  report.stats.brandHealthScore >= 80 ? 'bg-emerald-500' :
                  report.stats.brandHealthScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`} />

                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-extrabold text-sm text-slate-200 leading-tight truncate flex-1" title={report.name}>
                      {report.name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 ${getHealthColorClass(report.stats.brandHealthScore)}`}>
                      {report.stats.brandHealthScore}% Health
                    </span>
                  </div>

                  <p className="text-slate-400 text-xxs font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Generated: {new Date(report.createdAt).toLocaleDateString()}
                  </p>

                  <p className="text-slate-350 text-xs leading-relaxed line-clamp-3 bg-slate-950/20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-900/60 font-semibold italic">
                    {report.aiSummary.brandHealthSummary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-900 flex flex-wrap gap-1.5 justify-between">
                  <div className="flex gap-1.5 flex-1">
                    <button
                      onClick={() => openReportView(report)}
                      className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-200 font-bold text-xxs transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5 text-indigo-500" />
                      View
                    </button>
                    
                    <button
                      onClick={() => regenerateExecReport(report._id)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-200 transition-colors"
                      title="Regenerate Report"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-purple-500" />
                    </button>
                  </div>

                  {/* Export Options dropdown style */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => downloadExecReport(report._id, 'pdf')}
                      className="px-2 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] uppercase tracking-wider border border-indigo-500/15"
                      title="Export PDF"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => downloadExecReport(report._id, 'csv')}
                      className="px-2 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-550/20 text-amber-605 dark:text-amber-400 font-extrabold text-[9px] uppercase tracking-wider border border-amber-500/15"
                      title="Export CSV"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => downloadExecReport(report._id, 'json')}
                      className="px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-extrabold text-[9px] uppercase tracking-wider border border-slate-200 dark:border-slate-700"
                      title="Export JSON"
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => deleteExecReport(report._id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-550/20 text-red-650 dark:text-red-405 transition-colors"
                      title="Delete Report"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* GENERATE EXECUTIVE REPORT FILTER DIALOG MODAL (STORY 5 DIALOG FILTERS) */}
      <EnterpriseModal
        isOpen={showExecModal}
        onClose={() => setShowExecModal(false)}
        title="Generate AI Executive Report"
        icon={<Sparkles className="h-4.5 w-4.5 text-purple-500" />}
        maxWidthClass="max-w-lg"
      >
        <div className="p-6 text-slate-100 text-xs font-semibold select-none">
          <form onSubmit={handleGenerateExecReport} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Report Title</label>
              <input
                type="text"
                value={execReportName}
                onChange={(e) => setExecReportName(e.target.value)}
                placeholder="e.g. Acme Q3 Brand Reputation Report"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            {/* Range Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Timeline Range</label>
                <select
                  value={timeRange}
                  onChange={(e: any) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none cursor-pointer focus:border-indigo-500"
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {timeRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950/85 text-slate-200 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950/85 text-slate-200 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Refinement Filters Grid (Story 5 Requirement) */}
            <div className="border-t border-slate-800 pt-4 space-y-4">
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Additional Report Filters
              </span>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Language</label>
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 outline-none"
                  >
                    <option value="">All</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Bhojpuri">Bhojpuri</option>
                    <option value="Maithili">Maithili</option>
                    <option value="Bengali">Bengali</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Sentiment</label>
                  <select
                    value={filterSentiment}
                    onChange={(e) => setFilterSentiment(e.target.value)}
                    className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 outline-none"
                  >
                    <option value="">All</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Priority</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 outline-none"
                  >
                    <option value="">All</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Source</label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 outline-none"
                  >
                    <option value="">All</option>
                    <option value="twitter">Twitter</option>
                    <option value="reddit">Reddit</option>
                    <option value="news">News</option>
                    <option value="web">Web</option>
                    <option value="custom">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Country</label>
                  <input
                    type="text"
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    placeholder="e.g. India"
                    className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">State</label>
                  <input
                    type="text"
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                    placeholder="e.g. Bihar"
                    className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 outline-none"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    placeholder="e.g. Patna"
                    className="w-full p-2 text-[10px] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons (Sticky footer style inside form wrapper) */}
            <div className="sticky bottom-0 bg-[#090d16] pt-4 pb-2 mt-4 border-t border-slate-800 flex justify-end gap-3 z-10">
              <button
                type="button"
                onClick={() => setShowExecModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-350 hover:bg-slate-200 transition-colors font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generatingExec}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {generatingExec ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Analyzing Feed...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                    Generate Summary
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </EnterpriseModal>

      {/* VIEW EXECUTIVE REPORT SPECIFIC SUMMARY MODAL (STORY 5 DETAILED VIEW) */}
      <EnterpriseModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? `Executive Brand Summary: ${selectedReport.name}` : 'Executive Brand Summary'}
        icon={<BookOpen className="h-4.5 w-4.5 text-indigo-500" />}
        maxWidthClass="max-w-3xl"
      >
        {selectedReport && (
          <div className="p-6 text-slate-100 text-xs font-semibold select-none space-y-6">
            {/* Split analytics grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Health Score</span>
                <div className={`h-16 w-16 rounded-full border-2 flex flex-col items-center justify-center font-black ${getHealthColorClass(selectedReport.stats.brandHealthScore)}`}>
                  <span className="text-lg">{selectedReport.stats.brandHealthScore}%</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Sentiment Split</span>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold pt-1.5">
                  <div className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    Positive: {selectedReport.stats.sentimentDistribution.positive}
                  </div>
                  <div className="text-blue-500 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                    Neutral: {selectedReport.stats.sentimentDistribution.neutral}
                  </div>
                  <div className="text-rose-500 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    Negative: {selectedReport.stats.sentimentDistribution.negative}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed texts */}
            <div className="space-y-4 border-t border-slate-800 pt-4">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">Brand Health Summary</span>
                <p className="text-slate-350 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedReport.aiSummary.brandHealthSummary}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">Sentiment Overview</span>
                <p className="text-slate-350 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedReport.aiSummary.sentimentOverview}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">Reputation Risk summary</span>
                  <p className="text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {selectedReport.aiSummary.reputationRisk}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">Threat Vectors Assessment</span>
                  <p className="text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {selectedReport.aiSummary.threatSummary}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Active Locations</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedReport.aiSummary.mostActiveLocations.map((l, idx) => (
                      <span key={idx} className="bg-slate-950 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500" />
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Top Positive Topics</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedReport.aiSummary.topPositiveTopics.map((t, idx) => (
                      <span key={idx} className="bg-slate-950 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Top Negative Topics</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedReport.aiSummary.topNegativeTopics.map((t, idx) => (
                      <span key={idx} className="bg-slate-950 px-2 py-0.5 rounded text-[10px] text-slate-650 dark:text-slate-400 font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations list */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <span className="text-[10px] font-black text-slate-200 uppercase tracking-wider block">Actionable AI Recommendations</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedReport.aiSummary.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-extrabold text-[11px] text-slate-200">{rec.title}</span>
                          {getPriorityBadge(rec.priority)}
                        </div>
                        <p className="text-slate-650 dark:text-slate-350 text-xxs font-semibold leading-relaxed">{rec.description}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 italic pt-1.5 border-t border-slate-100 dark:border-slate-900">
                          <strong>Reason:</strong> {rec.reason}
                        </p>
                      </div>
                      <div className="mt-3 text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        <span><strong>Action Plan:</strong> {rec.suggestedAction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Action buttons */}
            <div className="sticky bottom-0 bg-[#090d16] pt-4 pb-2 mt-6 border-t border-slate-800 flex justify-end gap-2 z-10">
              <button
                type="button"
                onClick={() => downloadExecReport(selectedReport._id, 'pdf')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-350 hover:bg-slate-200 transition-colors font-bold text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        )}
      </EnterpriseModal>

      {/* MANUAL UPLOAD MODAL */}
      <EnterpriseModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        title="Upload PDF Report File"
        icon={<Upload className="h-4.5 w-4.5 text-indigo-500" />}
        maxWidthClass="max-w-md"
      >
        <div className="p-6 text-slate-100 text-xs font-semibold select-none">
          <form onSubmit={handleCreateManualReport} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Report Name</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Acme Q3 Brand Report"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Executive Summary Overview</label>
              <textarea
                value={manualSummary}
                onChange={(e) => setManualSummary(e.target.value)}
                placeholder="Provide a high-level executive summary of this report..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select Document File (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => e.target.files && setManualFile(e.target.files[0])}
                className="w-full text-slate-500 text-xs cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-500/20"
              />
            </div>

            {/* Sticky Action buttons */}
            <div className="sticky bottom-0 bg-[#090d16] pt-4 pb-2 mt-4 border-t border-slate-800 flex justify-end gap-3 z-10">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-350 hover:bg-slate-200 transition-colors font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingManual}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all"
              >
                {submittingManual ? 'Uploading File...' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      </EnterpriseModal>

    </div>
  );
};

export default Reports;
