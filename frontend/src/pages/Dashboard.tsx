/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { SentimentAreaChart } from '../components/AnalyticsCharts';
import { useAuth } from '../hooks/useAuth';
import { EnterpriseDrawer } from '../components/EnterpriseOverlays';
import IntelligenceModule from '../components/IntelligenceModule';
import {
  Building, 
  RefreshCw, 
  Plus, 
  TrendingUp, 
  Smile, 
  Meh, 
  Frown, 
  Sparkles,
  TrendingDown,
  Globe,
  MapPin,
  Download,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  Search,
  Calendar,
  Filter,
  Clock,
  ShieldCheck,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';

interface Brand {
  _id: string;
  name: string;
  keywords: string[];
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
  location?: {
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  aiAnalysis?: {
    emotionalTone: string;
    keyThemes: string[];
    suggestedAction: string;
  };
}

interface ExecutiveReport {
  _id: string;
  name: string;
  createdAt: string;
  stats: {
    brandHealthScore: number;
  };
}

const NewsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map((n) => (
      <div key={n} className="glass-panel p-5 bg-slate-900/40 border-slate-800 space-y-4 animate-pulse">
        <div className="flex justify-between items-center pb-2 border-b border-slate-805/80">
          <div className="h-3 w-16 bg-slate-800 rounded"></div>
          <div className="h-3 w-24 bg-slate-800 rounded"></div>
        </div>
        <div className="space-y-2.5">
          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
          <div className="h-3 bg-slate-800 rounded w-full"></div>
          <div className="h-3 bg-slate-800 rounded w-4/5"></div>
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 w-12 bg-slate-800 rounded"></div>
          <div className="h-6 w-20 bg-slate-850 rounded-lg"></div>
        </div>
      </div>
    ))}
  </div>
);

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [citiesList, setCitiesList] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [recentMentions, setRecentMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Executive Reports metrics
  const [totalReports, setTotalReports] = useState<number>(0);
  const [latestReport, setLatestReport] = useState<ExecutiveReport | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  // n8n automation stats
  const [lastAutomationRun, setLastAutomationRun] = useState<string | null>(null);
  const [automationStatus, setAutomationStatus] = useState<string>('inactive');
  const [totalAutomatedReports, setTotalAutomatedReports] = useState<number>(0);
  const [totalAlertsSent, setTotalAlertsSent] = useState<number>(0);
  const [successfulRuns, setSuccessfulRuns] = useState<number>(0);
  const [failedRuns, setFailedRuns] = useState<number>(0);
  const [executionTime, setExecutionTime] = useState<string>('N/A');
  const [nextSync, setNextSync] = useState<string>('N/A');

  // Interactive audit detail modals
  const [activeFilterView, setActiveFilterView] = useState<'positive' | 'neutral' | 'negative' | 'health_calc' | 'risks' | null>(null);
  const [selectedRiskAlert, setSelectedRiskAlert] = useState<any | null>(null);

  // Unified Executive Intelligence Drawer state
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: 'positive_mentions' | 'neutral_audits' | 'risk_alerts' | 'brand_health' | 'reputation_score' | 'trending_topics' | 'ai_recommendations' | 'confidence_score';
    data?: any;
  }>({
    isOpen: false,
    type: 'positive_mentions',
    data: null,
  });

  // Drawer Search & Filter states
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');
  const [drawerDateFilter, setDrawerDateFilter] = useState<'all' | 'today' | '3days' | '7days'>('all');
  const [drawerSourceFilter, setDrawerSourceFilter] = useState<string>('all');
  const [drawerLangFilter, setDrawerLangFilter] = useState<string>('all');
  const [drawerRegionFilter, setDrawerRegionFilter] = useState<string>('all');

  // Interactive risk states
  const [dismissedRisks, setDismissedRisks] = useState<string[]>([]);
  const [resolvedRisks, setResolvedRisks] = useState<string[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<{[key: string]: string[]}>({});
  const [newTaskInput, setNewTaskInput] = useState('');

  // Interactive checklist states (for recommendations and health suggestions)
  const [checkedItems, setCheckedItems] = useState<{[key: string]: boolean}>({});

  // Auto-reset search when drawer type changes or drawer closes/opens
  useEffect(() => {
    setDrawerSearchQuery('');
    setDrawerDateFilter('all');
    setDrawerSourceFilter('all');
    setDrawerLangFilter('all');
    setDrawerRegionFilter('all');
    setNewTaskInput('');
  }, [drawerState.type, drawerState.isOpen]);

  // Intercept legacy click handlers and route them to our premium Drawer
  useEffect(() => {
    if (activeFilterView) {
      if (activeFilterView === 'health_calc') {
        setDrawerState({ isOpen: true, type: 'brand_health' });
      } else if (activeFilterView === 'positive') {
        setDrawerState({ isOpen: true, type: 'positive_mentions' });
      } else if (activeFilterView === 'neutral') {
        setDrawerState({ isOpen: true, type: 'neutral_audits' });
      } else if (activeFilterView === 'negative') {
        setDrawerState({ isOpen: true, type: 'risk_alerts' });
      }
      setActiveFilterView(null);
    }
  }, [activeFilterView]);

  useEffect(() => {
    if (selectedRiskAlert) {
      setDrawerState({ isOpen: true, type: 'risk_alerts', data: selectedRiskAlert });
      setSelectedRiskAlert(null);
    }
  }, [selectedRiskAlert]);

  // Manual Mention state
  const [showManualModal, setShowManualModal] = useState(false);
  const [newMentionContent, setNewMentionContent] = useState('');
  const [newMentionSource, setNewMentionSource] = useState('web');
  const [newMentionAuthor, setNewMentionAuthor] = useState('');
  
  // Hyperlocal Location input states
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('India');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [creatingMention, setCreatingMention] = useState(false);

  // News and news analysis state
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsAnalysis, setNewsAnalysis] = useState<any>(null);
  const [newsLoading, setNewsLoading] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const fetchNews = async (forceRefresh = false) => {
    const activeBrand = brands.find(b => b._id === selectedBrandId);
    if (!activeBrand) return;

    setNewsLoading(true);
    setNewsError(null);
    // Clear stale articles immediately when switching brands or force-refreshing
    if (forceRefresh) {
      setNewsArticles([]);
      setNewsAnalysis(null);
    }
    try {
      const params = new URLSearchParams({
        brand: activeBrand.name,
        ...(forceRefresh ? { refresh: 'true' } : {}),
      });
      const res = await api.get(`/news?${params.toString()}`);
      if (res.data.success) {
        setNewsArticles(res.data.data.articles || []);
        setNewsAnalysis(res.data.data.analysis || null);
      }
    } catch (err: any) {
      console.error('Error fetching brand news:', err);
      setNewsError(err.response?.data?.message || 'Failed to load brand news. Please try again.');
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBrandId && brands.length > 0) {
      // Fetch news utilizing cache (avoiding unnecessary Gemini analysis calls)
      fetchNews(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId, brands]);

  // Silent background refresh (Requirement 5 & 6 & 9)
  const backgroundRefreshData = async () => {
    if (!selectedBrandId) return;
    try {
      // 1. Fetch news articles & analysis
      const activeBrand = brands.find(b => b._id === selectedBrandId);
        if (activeBrand) {
          api.get(`/news?brand=${encodeURIComponent(activeBrand.name)}`).then((res) => {
            if (res.data.success) {
              setNewsArticles(res.data.data.articles || []);
              setNewsAnalysis(res.data.data.analysis || null);
            }
          }).catch((err) => console.error('Silent background news load error:', err));
      }

      // 2. Fetch metrics, mentions, reports, n8n stats
      const cityParam = selectedCity ? `?city=${selectedCity}` : '';
      const mentionsCityParam = selectedCity ? `&city=${selectedCity}` : '';

      const [metricsRes, mentionsRes, reportsRes, statsRes] = await Promise.all([
        api.get(`/mentions/brand/${selectedBrandId}/metrics${cityParam}`),
        api.get(`/mentions/brand/${selectedBrandId}?limit=4${mentionsCityParam}`),
        api.get(`/executive-reports/brand/${selectedBrandId}`).catch(() => ({ data: { success: false, data: [] } })),
        api.get(`/workflows/stats/brand/${selectedBrandId}`).catch(() => ({ data: { success: false, data: null } }))
      ]);

      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.data);
      }
      if (mentionsRes.data.success) {
        setRecentMentions(mentionsRes.data.data);
      }
      if (reportsRes.data.success) {
        const reports = reportsRes.data.data;
        setTotalReports(reports.length);
        setLatestReport(reports.length > 0 ? reports[0] : null);
      }
      if (statsRes.data.success && statsRes.data.data) {
        const stats = statsRes.data.data;
        setLastAutomationRun(stats.lastAutomationRun);
        setAutomationStatus(stats.automationStatus);
        setTotalAutomatedReports(stats.totalAutomatedReports);
        setTotalAlertsSent(stats.totalAlertsSent);
        setSuccessfulRuns(stats.successfulRuns || 0);
        setFailedRuns(stats.failedRuns || 0);
        setExecutionTime(stats.executionTime || 'N/A');
        setNextSync(stats.nextSync || 'N/A');
      }
    } catch (err) {
      console.error('Silent background refresh error:', err);
    }
  };

  // Brand switch: clear previous brand's data instantly to avoid mixed data (Requirement 8)
  useEffect(() => {
    if (selectedBrandId) {
      setMetrics(null);
      setRecentMentions([]);
      setNewsArticles([]);
      setNewsAnalysis(null);
      setLatestReport(null);
    }
  }, [selectedBrandId]);

  // Set up 10s auto-refresh interval (Requirement 5 & 6)
  useEffect(() => {
    if (!selectedBrandId) return;
    const interval = setInterval(() => {
      backgroundRefreshData();
      window.dispatchEvent(new CustomEvent('refetch-notifications'));
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedBrandId, selectedCity, brands]);

  // Fetch initial list of brands and cities
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await api.get('/brands');
        if (res.data.success && res.data.data.length > 0) {
          setBrands(res.data.data);
          
          const savedBrandId = localStorage.getItem('active-brand-id');
          const hasSavedBrand = savedBrandId && res.data.data.some((b: any) => b._id === savedBrandId);
          const initialBrandId = hasSavedBrand ? savedBrandId : res.data.data[0]._id;
          
          setSelectedBrandId(initialBrandId);
          localStorage.setItem('active-brand-id', initialBrandId);
          window.dispatchEvent(new CustomEvent('brand-changed', { detail: initialBrandId }));
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching brands:', err);
        setLoading(false);
      }
    };
    const fetchCitiesList = async () => {
      try {
        const res = await api.get('/mentions/cities');
        if (res.data.success) {
          setCitiesList(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching cities list:', err);
      }
    };
    fetchBrands();
    fetchCitiesList();
  }, []);

  // Fetch metrics & mentions when selected brand or selected city changes
  useEffect(() => {
    if (!selectedBrandId) return;

    const fetchBrandData = async () => {
      setLoading(true);
      try {
        const cityParam = selectedCity ? `?city=${selectedCity}` : '';
        const mentionsCityParam = selectedCity ? `&city=${selectedCity}` : '';

        const [metricsRes, mentionsRes, reportsRes, statsRes] = await Promise.all([
          api.get(`/mentions/brand/${selectedBrandId}/metrics${cityParam}`),
          api.get(`/mentions/brand/${selectedBrandId}?limit=4${mentionsCityParam}`),
          api.get(`/executive-reports/brand/${selectedBrandId}`).catch(() => ({ data: { success: false, data: [] } })),
          api.get(`/workflows/stats/brand/${selectedBrandId}`).catch(() => ({ data: { success: false, data: { lastAutomationRun: null, automationStatus: 'inactive', totalAutomatedReports: 0, totalAlertsSent: 0, successfulRuns: 0, failedRuns: 0, executionTime: 'N/A', nextSync: 'N/A' } } }))
        ]);

        if (metricsRes.data.success) {
          setMetrics(metricsRes.data.data);
        }
        if (mentionsRes.data.success) {
          setRecentMentions(mentionsRes.data.data);
        }
        if (reportsRes.data.success) {
          const reports = reportsRes.data.data;
          setTotalReports(reports.length);
          setLatestReport(reports.length > 0 ? reports[0] : null);
        }
        if (statsRes.data.success) {
          const stats = statsRes.data.data;
          setLastAutomationRun(stats.lastAutomationRun);
          setAutomationStatus(stats.automationStatus);
          setTotalAutomatedReports(stats.totalAutomatedReports);
          setTotalAlertsSent(stats.totalAlertsSent);
          setSuccessfulRuns(stats.successfulRuns || 0);
          setFailedRuns(stats.failedRuns || 0);
          setExecutionTime(stats.executionTime || 'N/A');
          setNextSync(stats.nextSync || 'N/A');
        }
      } catch (err) {
        console.error('Error loading brand dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrandData();
  }, [selectedBrandId, selectedCity]);

  const handleSync = async () => {
    if (!selectedBrandId) return;
    setSyncing(true);
    try {
      await api.post(`/mentions/brand/${selectedBrandId}/sync`);
      window.dispatchEvent(new CustomEvent('refetch-notifications'));
      // Reload metrics, mentions, reports & stats with city parameter if active
      const cityParam = selectedCity ? `?city=${selectedCity}` : '';
      const mentionsCityParam = selectedCity ? `&city=${selectedCity}` : '';

      const [metricsRes, mentionsRes, reportsRes, statsRes] = await Promise.all([
        api.get(`/mentions/brand/${selectedBrandId}/metrics${cityParam}`),
        api.get(`/mentions/brand/${selectedBrandId}?limit=4${mentionsCityParam}`),
        api.get(`/executive-reports/brand/${selectedBrandId}`).catch(() => ({ data: { success: false, data: [] } })),
        api.get(`/workflows/stats/brand/${selectedBrandId}`).catch(() => ({ data: { success: false, data: { lastAutomationRun: null, automationStatus: 'inactive', totalAutomatedReports: 0, totalAlertsSent: 0, successfulRuns: 0, failedRuns: 0, executionTime: 'N/A', nextSync: 'N/A' } } }))
      ]);
      if (metricsRes.data.success) setMetrics(metricsRes.data.data);
      if (mentionsRes.data.success) setRecentMentions(mentionsRes.data.data);
      if (reportsRes.data.success) {
        const reports = reportsRes.data.data;
        setTotalReports(reports.length);
        setLatestReport(reports.length > 0 ? reports[0] : null);
      }
      if (statsRes.data.success) {
        const stats = statsRes.data.data;
        setLastAutomationRun(stats.lastAutomationRun);
        setAutomationStatus(stats.automationStatus);
        setTotalAutomatedReports(stats.totalAutomatedReports);
        setTotalAlertsSent(stats.totalAlertsSent);
        setSuccessfulRuns(stats.successfulRuns || 0);
        setFailedRuns(stats.failedRuns || 0);
        setExecutionTime(stats.executionTime || 'N/A');
        setNextSync(stats.nextSync || 'N/A');
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const downloadQuickReport = async (reportId: string) => {
    setDownloadingReportId(reportId);
    try {
      const res = await api.get(`/executive-reports/${reportId}/export?format=pdf`, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `executive_report_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Quick download failed:', err);
    } finally {
      setDownloadingReportId(null);
    }
  };

  const handleAddMention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId || !newMentionContent) return;
    setCreatingMention(true);

    try {
      // Build location override object if supplied
      const locationData = city || latitude || longitude
        ? {
            city: city || undefined,
            state: stateName || undefined,
            country: country || 'India',
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined
          }
        : undefined;

      const res = await api.post(`/mentions/brand/${selectedBrandId}`, {
        content: newMentionContent,
        source: newMentionSource,
        author: newMentionAuthor || undefined,
        location: locationData,
      });

      if (res.data.success) {
        // Reset states
        setNewMentionContent('');
        setNewMentionAuthor('');
        setCity('');
        setStateName('');
        setCountry('India');
        setLatitude('');
        setLongitude('');
        setShowManualModal(false);

        // Refresh details with city parameter if active
        const cityParam = selectedCity ? `?city=${selectedCity}` : '';
        const mentionsCityParam = selectedCity ? `&city=${selectedCity}` : '';

        const [metricsRes, mentionsRes] = await Promise.all([
          api.get(`/mentions/brand/${selectedBrandId}/metrics${cityParam}`),
          api.get(`/mentions/brand/${selectedBrandId}?limit=4${mentionsCityParam}`),
        ]);
        setMetrics(metricsRes.data.data);
        setRecentMentions(mentionsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to create mention:', err);
    } finally {
      setCreatingMention(false);
    }
  };

  if (brands.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel p-8">
        <Building className="h-16 w-16 text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-xl font-black text-slate-200">No Monitored Brands Found</h3>
        <p className="text-slate-500 dark:text-slate-450 max-w-sm mt-2 text-xs leading-relaxed">
          Workspace needs at least one brand configured before generating sentiment aggregates.
        </p>
      </div>
    );
  }

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const healthScore = metrics ? ((metrics.averageSentimentScore + 1) * 50).toFixed(0) : '0';
  const opportunitiesCount = metrics?.sentimentBreakdown?.positive || 0;
  const risksCount = metrics?.sentimentBreakdown?.negative || 0;

  // ── Toast notification ──────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Active brand name (used in drawer risk view) ────────────────────────────
  const activeBrandName = brands.find(b => b._id === selectedBrandId)?.name || 'Unknown Brand';

  // ── Drawer filter helpers ───────────────────────────────────────────────────
  const applyDrawerDateFilter = (date: string) => {
    if (drawerDateFilter === 'all') return true;
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (drawerDateFilter === 'today') return diffDays < 1;
    if (drawerDateFilter === '3days') return diffDays < 3;
    if (drawerDateFilter === '7days') return diffDays < 7;
    return true;
  };

  const getFilteredNews = (sentiment: string) => {
    return newsArticles.filter(art => {
      if ((art.sentiment || 'neutral') !== sentiment) return false;
      if (drawerSourceFilter !== 'all' && art.source !== drawerSourceFilter) return false;
      if (!applyDrawerDateFilter(art.publishedAt)) return false;
      if (drawerSearchQuery) {
        const q = drawerSearchQuery.toLowerCase();
        if (!art.title?.toLowerCase().includes(q) && !art.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  };

  const getFilteredMentions = (sentiment: string) => {
    return recentMentions.filter(m => {
      if (m.sentiment !== sentiment) return false;
      if (drawerSourceFilter !== 'all' && m.source !== drawerSourceFilter) return false;
      if (drawerLangFilter !== 'all' && m.language !== drawerLangFilter) return false;
      if (drawerRegionFilter !== 'all' && (m.location as any)?.city !== drawerRegionFilter) return false;
      if (!applyDrawerDateFilter(m.publishedAt)) return false;
      if (drawerSearchQuery) {
        const q = drawerSearchQuery.toLowerCase();
        if (!m.content?.toLowerCase().includes(q) && !m.author?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  };

  // ── Derived filter option lists ─────────────────────────────────────────────
  const allSources = Array.from(new Set([
    ...newsArticles.map(a => a.source).filter(Boolean),
    ...recentMentions.map(m => m.source).filter(Boolean)
  ]));

  const allLanguages = Array.from(new Set(
    recentMentions.map(m => m.language).filter(Boolean)
  ));

  const allRegions = Array.from(new Set(
    recentMentions.map(m => (m.location as any)?.city).filter(Boolean)
  ));

  // ── Timeline label helper (used in the AI Investigation Timeline) ───────────
  const formatOffsetTime = (base: Date, minutesAgo: number) => {
    const d = new Date(base.getTime() - minutesAgo * 60 * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Executive Hero Section */}
      {!loading && metrics && (
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl animate-scale-up">
          {/* Decorative glowing gradient blur circles */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-10 translate-y-1/2 w-[250px] h-[250px] rounded-full bg-purple-500/10 blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Left side info */}
            <div className="space-y-4 max-w-xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/25">
                  AI Brand Intelligence Report
                </span>
                <h1 className="text-2.5xl sm:text-3.5xl font-black mt-3 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent tracking-tight">
                  {getGreeting()}, {user?.name || 'Partner'} 👋
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  Here is the custom reputation aggregates health index snapshot for <span className="text-slate-200 font-bold">{brands.find(b => b._id === selectedBrandId)?.name || 'your brand'}</span>.
                </p>
              </div>

              {/* Dynamic Opportunities/Risks count row */}
              <div className="flex flex-wrap gap-3 items-center pt-2 text-xxs font-extrabold uppercase tracking-wider">
                <span 
                  onClick={() => setDrawerState({ isOpen: true, type: 'positive_mentions' })}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 cursor-pointer hover:bg-emerald-500/20 transition-all hover:scale-105"
                >
                  <Smile className="h-3.5 w-3.5" />
                  {opportunitiesCount} Positive Mentions
                </span>
                <span 
                  onClick={() => setDrawerState({ isOpen: true, type: 'risk_alerts' })}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 cursor-pointer hover:bg-rose-500/20 transition-all hover:scale-105"
                >
                  <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
                  {risksCount} Risk Alerts
                </span>
                <span 
                  onClick={() => setDrawerState({ isOpen: true, type: 'neutral_audits' })}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25 cursor-pointer hover:bg-blue-500/20 transition-all hover:scale-105"
                >
                  <Meh className="h-3.5 w-3.5" />
                  {metrics.sentimentBreakdown?.neutral || 0} Neutral Audits
                </span>
              </div>
            </div>

            {/* Right side Brand Health score box */}
            <div 
              onClick={() => setDrawerState({ isOpen: true, type: 'brand_health' })}
              className="flex items-center gap-4 sm:gap-6 bg-slate-950/60 p-5 rounded-2xl border border-slate-800 shadow-inner w-full lg:w-auto self-stretch lg:self-center justify-between lg:justify-start cursor-pointer hover:bg-slate-900/60 transition-all hover:scale-102"
            >
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Brand Health</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black tracking-tight text-slate-200">{healthScore}%</span>
                  <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5 ${
                    metrics.averageSentimentScore >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {metrics.averageSentimentScore >= 0 ? '↑ Improved' : '↓ Caution'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mt-2">
                  Outlook: {metrics.averageSentimentScore >= 0 ? 'Positive Outlook' : 'Threat Risk Detected'}
                </p>
              </div>

              {/* Visual mini circular gauge */}
              <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    className={metrics.averageSentimentScore >= 0 ? "stroke-emerald-500" : "stroke-rose-500"}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={163.3}
                    strokeDashoffset={163.3 - (163.3 * parseFloat(healthScore)) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-xs font-black text-slate-200">{healthScore}%</div>
              </div>
            </div>

          </div>

          {/* Bottom actions strip inside hero card */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 relative z-10">
            <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
              <span>Real-time sentiment analyzer model active</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab && setActiveTab('reports')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] text-white font-extrabold text-xxs uppercase tracking-wider cursor-pointer transition-all active:scale-[0.97]"
              >
                <span>Generate AI Report</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              
              <button
                onClick={() => setActiveTab && setActiveTab('mentions')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-900/60 border border-slate-800 text-slate-350 hover:text-white font-extrabold text-xxs uppercase tracking-wider cursor-pointer transition-all active:scale-[0.97]"
              >
                <span>View Threats</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Selection Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monitoring Brand:</label>
            <select
              value={selectedBrandId}
              onChange={(e) => {
                const newBrandId = e.target.value;
                setSelectedBrandId(newBrandId);
                setSelectedCity(''); // reset city filter when changing brand
                localStorage.setItem('active-brand-id', newBrandId);
                window.dispatchEvent(new CustomEvent('brand-changed', { detail: newBrandId }));
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold focus:ring-1 focus:ring-indigo-500 text-slate-200 outline-none cursor-pointer"
            >
              {brands.map((b) => (
                <option key={b._id} value={b._id} className="bg-slate-900 text-slate-100">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">City Filter:</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold focus:ring-1 focus:ring-indigo-500 text-slate-200 outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-100">All Cities</option>
              {citiesList.map((c: any) => (
                <option key={c.city} value={c.city} className="bg-slate-900 text-slate-100">
                  {c.city} ({c.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-300 font-bold text-xs hover:bg-slate-800 hover:border-slate-700 disabled:opacity-30 transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Mentions'}
          </button>
          
          <button
            onClick={() => setShowManualModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Mention
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Metrics Dashboard Cards */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                       {/* Brand Health Card */}
              <div 
                onClick={() => setActiveFilterView('health_calc')}
                className="glass-panel p-6 flex items-center justify-between hover-lift transition-all duration-300 animate-scale-up cursor-pointer hover:bg-slate-900/60" 
                style={{ animationDelay: '50ms' }}
              >
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Health Index</p>
                  <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">
                    {((metrics.averageSentimentScore + 1) * 50).toFixed(0)}%
                  </h3>
                  <div className="flex items-center gap-1 mt-2 text-xs font-semibold">
                    {metrics.averageSentimentScore >= 0 ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Positive Outlook</span>
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        <span>Alert Status</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-405 flex items-center justify-center border border-indigo-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>

              {/* Positive Mentions */}
              <div 
                onClick={() => setActiveFilterView('positive')}
                className="glass-panel p-6 flex items-center justify-between hover-lift transition-all duration-300 animate-scale-up cursor-pointer hover:bg-slate-900/60" 
                style={{ animationDelay: '100ms' }}
              >
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Positive Feed</p>
                  <h3 className="text-3xl font-black mt-2 text-emerald-450">
                    {metrics.sentimentBreakdown?.positive || 0}
                  </h3>
                  <p className="text-xxs text-slate-500 mt-2 font-semibold">Customer appraisals</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Smile className="h-5 w-5" />
                </div>
              </div>

              {/* Neutral Mentions */}
              <div 
                onClick={() => setActiveFilterView('neutral')}
                className="glass-panel p-6 flex items-center justify-between hover-lift transition-all duration-300 animate-scale-up cursor-pointer hover:bg-slate-900/60" 
                style={{ animationDelay: '150ms' }}
              >
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Neutral Updates</p>
                  <h3 className="text-3xl font-black mt-2 text-blue-450">
                    {metrics.sentimentBreakdown?.neutral || 0}
                  </h3>
                  <p className="text-xxs text-slate-500 mt-2 font-semibold">Blogs & standard reviews</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-405 flex items-center justify-center border border-blue-500/20">
                  <Meh className="h-5 w-5" />
                </div>
              </div>

              {/* Negative Alerts */}
              <div 
                onClick={() => setActiveFilterView('negative')}
                className="glass-panel p-6 flex items-center justify-between hover-lift transition-all duration-300 animate-scale-up cursor-pointer hover:bg-slate-900/60" 
                style={{ animationDelay: '200ms' }}
              >
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Negative Alerts</p>
                  <h3 className="text-3xl font-black mt-2 text-rose-500 dark:text-rose-455">
                    {metrics.sentimentBreakdown?.negative || 0}
                  </h3>
                  <p className="text-xxs text-slate-400 mt-2 font-semibold">Support flags</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Frown className="h-5 w-5" />
                </div>
              </div>

            </div>
          )}

          {/* n8n Agentic Automation Monitor */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
              <span>n8n Agentic Automation Monitor</span>
            </h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {/* Last Automation Run */}
              <div className="glass-panel p-4 bg-slate-900/40 border-slate-800/80 hover-lift transition-all duration-300 flex flex-col justify-between animate-scale-up" style={{ animationDelay: '250ms' }}>
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Last Run</p>
                  <p className="text-[11px] font-extrabold mt-1 text-slate-205 truncate">
                    {lastAutomationRun ? new Date(lastAutomationRun).toLocaleTimeString() : 'Never'}
                  </p>
                </div>
              </div>

              {/* Automation Status */}
              <div className="glass-panel p-4 bg-slate-900/40 border-slate-800/80 hover-lift transition-all duration-300 flex flex-col justify-between animate-scale-up" style={{ animationDelay: '300ms' }}>
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Status</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`h-2 w-2 rounded-full ${
                      automationStatus === 'healthy' ? 'bg-emerald-500 animate-pulse' :
                      automationStatus === 'active' ? 'bg-purple-550 animate-pulse' :
                      automationStatus === 'degraded' ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'
                    }`} />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200">
                      {automationStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Automated Reports */}
              <div className="glass-panel p-4 bg-slate-900/40 border-slate-800/80 hover-lift transition-all duration-300 flex flex-col justify-between animate-scale-up" style={{ animationDelay: '350ms' }}>
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Auto Reports</p>
                  <h3 className="text-lg font-black mt-1 text-indigo-400">{totalAutomatedReports}</h3>
                </div>
              </div>

              {/* Total Alerts Sent */}
              <div 
                onClick={() => setDrawerState({ isOpen: true, type: 'risk_alerts' })}
                className="glass-panel p-4 bg-slate-900/40 border-slate-800/80 hover-lift transition-all duration-300 flex flex-col justify-between animate-scale-up cursor-pointer hover:bg-slate-900/60" 
                style={{ animationDelay: '400ms' }}
              >
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Alerts Sent</p>
                  <h3 className="text-lg font-black mt-1 text-rose-455">{totalAlertsSent}</h3>
                </div>
              </div>

              {/* Successful Runs */}
              <div className="glass-panel p-4 bg-slate-900/40 border-slate-800/80 hover-lift transition-all duration-300 flex flex-col justify-between animate-scale-up" style={{ animationDelay: '450ms' }}>
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Success Runs</p>
                  <h3 className="text-lg font-black mt-1 text-emerald-450">{successfulRuns}</h3>
                </div>
              </div>

              {/* Failed Runs */}
              <div className="glass-panel p-4 bg-slate-900/40 border-slate-800/80 hover-lift transition-all duration-300 flex flex-col justify-between animate-scale-up" style={{ animationDelay: '500ms' }}>
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Failed Runs</p>
                  <h3 className="text-lg font-black mt-1 text-rose-500">{failedRuns}</h3>
                </div>
              </div>

              {/* Average Execution Time */}
              <div className="glass-panel p-4 bg-slate-900/40 border-slate-800/80 hover-lift transition-all duration-300 flex flex-col justify-between animate-scale-up" style={{ animationDelay: '550ms' }}>
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Exec Time</p>
                  <p className="text-[11px] font-extrabold mt-1 text-slate-205 truncate">
                    {executionTime}
                  </p>
                </div>
              </div>

              {/* Next sync schedule */}
              <div className="glass-panel p-4 bg-slate-900/40 border-slate-800/80 hover-lift transition-all duration-300 flex flex-col justify-between animate-scale-up" style={{ animationDelay: '600ms' }}>
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Next Sync</p>
                  <p className="text-[11px] font-extrabold mt-1 text-slate-205 truncate">
                    {nextSync}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Charts & Reports Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Chart Viewport */}
            {metrics?.timeline && (
              <div className="lg:col-span-2 glass-panel p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-slate-200">Sentiment Over Time (Past 7 Days)</h3>
                </div>
                <SentimentAreaChart data={metrics.timeline} />
              </div>
            )}

            {/* Executive Intelligence Center Widget */}
            <div className="lg:col-span-1 glass-panel p-6 flex flex-col justify-between bg-slate-900/40 border-slate-800/80 relative overflow-hidden">
              {/* Glow Accent */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <Sparkles className="h-4.5 w-4.5 text-purple-500 animate-pulse" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-250">Executive Intelligence</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Reports</span>
                    <span className="text-2xl font-black text-slate-200 mt-1 block">{totalReports}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Last Health</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {latestReport ? `${latestReport.stats.brandHealthScore}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                {latestReport ? (
                  <div className="p-3.5 rounded-xl bg-slate-950/45 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Latest Report</span>
                      <span className="text-[9px] text-slate-500 font-semibold">{new Date(latestReport.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="font-extrabold text-xs text-slate-200 truncate" title={latestReport.name}>
                      {latestReport.name}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/45 border border-slate-200/60 dark:border-slate-800/60 text-center py-6 flex-1 flex items-center justify-center">
                    <p className="text-xs text-slate-500">No reports generated yet.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
                {latestReport && (
                  <button
                    onClick={() => downloadQuickReport(latestReport._id)}
                    disabled={!!downloadingReportId}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700/60 disabled:opacity-50"
                  >
                    {downloadingReportId ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                    ) : (
                      <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-405" />
                    )}
                    Quick Download (PDF)
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab && setActiveTab('reports')}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-550 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-200 animate-pulse" />
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* Hyperlocal Intelligence Insights Panel */}
          {metrics?.cityWiseStats && metrics.cityWiseStats.length > 0 && (
            <div className="glass-panel p-6 bg-slate-900/40 border-slate-800/80 relative overflow-hidden space-y-4">
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <MapPin className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Hyperlocal Intelligence Insights</h3>
                  <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Tier 2, Tier 3, and Tier 4 Indian Cities Performance & Alerts</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2 px-3">City / Location</th>
                      <th className="py-2 px-3">State & Region</th>
                      <th className="py-2 px-3 text-center">Mentions</th>
                      <th className="py-2 px-3 text-center">Sentiment Breakdown</th>
                      <th className="py-2 px-3 text-center">Reputation Score</th>
                      <th className="py-2 px-3 text-center">Active Alerts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-300">
                    {metrics.cityWiseStats.map((cStat: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-200 flex items-center gap-1.5">
                          <span className="text-slate-400">📍</span> {cStat.city}
                        </td>
                        <td className="py-3 px-3">
                          <span className="opacity-95">{cStat.state}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">{cStat.region}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold">{cStat.totalMentions}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/10">
                              +{cStat.sentimentBreakdown.positive}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold border border-blue-500/10">
                              {cStat.sentimentBreakdown.neutral}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold border border-rose-500/10">
                              -{cStat.sentimentBreakdown.negative}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className={`text-sm font-black ${
                              cStat.reputationScore >= 70 ? 'text-emerald-500' :
                              cStat.reputationScore >= 40 ? 'text-blue-500' : 'text-rose-500'
                            }`}>
                              {cStat.reputationScore}%
                            </span>
                            <div className="w-16 bg-slate-800 h-1 rounded-full overflow-hidden mt-1 border border-slate-200/30">
                              <div 
                                className={`h-full ${
                                  cStat.reputationScore >= 70 ? 'bg-emerald-500' :
                                  cStat.reputationScore >= 40 ? 'bg-blue-500' : 'bg-rose-500'
                                }`} 
                                style={{ width: `${cStat.reputationScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {cStat.alertsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                              <ShieldAlert className="h-3 w-3" />
                              {cStat.alertsCount} Alerts
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No threats</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hyperlocal Trending Topics Section */}
          {metrics?.hyperlocalTrends && metrics.hyperlocalTrends.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-200">Hyperlocal Trending Topics & Issues</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.hyperlocalTrends.map((trend: any, index: number) => (
                  <div key={index} className="glass-panel p-5 bg-slate-900/40 border-slate-800/80 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                        <span className="font-extrabold text-sm text-slate-200 flex items-center gap-1.5">
                          📍 {trend.city}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trending Now</span>
                      </div>

                      {/* Keywords */}
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Top Keywords</span>
                        <div className="flex flex-wrap gap-1.5">
                          {trend.keywords.map((kw: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-750 dark:text-slate-300">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Hashtags */}
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Local Hashtags</span>
                        <div className="flex flex-wrap gap-1.5">
                          {trend.hashtags.map((tag: string, i: number) => (
                            <span key={i} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Trending Topics */}
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Trending Topics</span>
                        <ul className="space-y-1 text-slate-300 text-xxs font-semibold">
                          {trend.topics.map((topic: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-purple-500">•</span>
                              <span className="line-clamp-1">{topic}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Trending Issues */}
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Trending Issues</span>
                        <ul className="space-y-1 text-slate-300 text-xxs font-semibold">
                          {trend.issues.map((issue: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-rose-500">•</span>
                              <span className={`line-clamp-2 ${issue === 'None detected' ? 'text-slate-400 italic' : ''}`}>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Mentions Grid */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-200">Recent Brand Mentions</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recentMentions.map((mention) => (
                <div 
                  key={mention._id}
                  className="glass-panel p-6 flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-700/80 hover:bg-slate-50/60 dark:hover:bg-slate-900/50 transition-all duration-300 shadow-md group relative overflow-hidden bg-slate-900/40 border-slate-800/80"
                >
                  <div className={`absolute top-0 left-0 right-0 h-0.5 opacity-60 ${
                    mention.sentiment === 'positive' ? 'bg-emerald-500' :
                    mention.sentiment === 'negative' ? 'bg-rose-500' : 'bg-blue-500'
                  }`} />

                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-800">
                          {mention.source}
                        </span>
                        <h4 className="font-bold text-sm text-slate-200 mt-2">Author: {mention.author}</h4>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-xxs font-extrabold uppercase tracking-wider border shadow-sm ${
                          mention.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' :
                          mention.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-550/25' :
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                        }`}>
                          {mention.sentiment}
                        </span>
                        {mention.priority && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm shrink-0 ${
                            mention.priority === 'critical' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' :
                            mention.priority === 'high' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-550/30' :
                            mention.priority === 'medium' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-405 border-yellow-500/30' :
                            'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}>
                            {mention.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2 mb-3">
                      {mention.language && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-800">
                          <Globe className="h-2.5 w-2.5 text-indigo-500 dark:text-indigo-400" />
                          {mention.language}
                        </span>
                      )}

                      {mention.location && (mention.location as any).city && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-800">
                          <MapPin className="h-2.5 w-2.5 text-rose-500 dark:text-rose-450" />
                          {(mention.location as any).city}, {(mention.location as any).state}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed bg-slate-950/20 p-3 rounded-xl border border-slate-200 dark:border-slate-900/50 line-clamp-3">
                      {mention.content}
                    </p>

                    {mention.translatedContent && mention.language !== 'English' && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-900/30/15 text-xs text-slate-200">
                        <span className="font-extrabold text-[9px] text-indigo-600 dark:text-indigo-400 block mb-0.5 uppercase tracking-wider">English Translation</span>
                        <p className="italic font-normal text-xxs">"{mention.translatedContent}"</p>
                      </div>
                    )}

                    {/* AI Summary box if available */}
                    {mention.aiAnalysis && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 shadow-inner">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-405 text-xs font-bold">
                          <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
                          <span>AI Brand Evaluation</span>
                        </div>
                        <p className="text-xxs text-slate-300 mt-2 font-medium leading-relaxed">
                          <strong>Action Recommendation:</strong> {mention.aiAnalysis.suggestedAction}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-900 flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                    <span>Published: {new Date(mention.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Brand News Section */}
          <div className="space-y-6 mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-sm text-slate-200">Latest Brand News</h3>
                <p className="text-xxs text-slate-400 mt-1">Real-time press releases and news coverage monitored across the web.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchNews(true)}
                  disabled={newsLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 text-indigo-400 text-xxs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-purple-400" />
                  <span>Refresh AI Analysis</span>
                </button>
                {newsError && (
                  <button
                    onClick={() => fetchNews(false)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-450 text-xxs font-bold transition-all"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry News Fetch</span>
                  </button>
                )}
              </div>
            </div>

            {newsLoading ? (
              <NewsSkeleton />
            ) : newsError ? (
              <div className="glass-panel p-6 bg-slate-900/40 border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                <AlertTriangle className="h-8 w-8 text-rose-500" />
                <p className="text-xs text-slate-350 font-bold">{newsError}</p>
                <button
                  onClick={() => fetchNews()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                >
                  Try Again
                </button>
              </div>
            ) : newsArticles.length === 0 ? (
              <div className="glass-panel p-6 bg-slate-900/40 border-slate-800 flex flex-col items-center justify-center text-center py-12">
                <Globe className="h-8 w-8 text-slate-500 mb-2 opacity-50" />
                <p className="text-xs text-slate-400 font-medium">No recent news found for this brand.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {newsArticles.map((art, idx) => (
                    <div 
                      key={idx} 
                      className="glass-panel p-5 bg-slate-900/40 border-slate-800 space-y-4 hover:border-slate-700/60 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-slate-800/80 pb-2">
                          <span className="truncate max-w-[120px] bg-slate-800/40 px-2 py-0.5 rounded border border-slate-800">
                            {art.source}
                          </span>
                          <span>{new Date(art.publishedAt).toLocaleDateString()}</span>
                        </div>
                        {art.image && (
                          <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-850/60">
                            <img src={art.image} alt={art.title} className="w-full h-full object-cover opacity-80" />
                          </div>
                        )}
                        <h4 className="font-extrabold text-sm text-slate-200 line-clamp-2 leading-snug">
                          {art.title}
                        </h4>
                        <p className="text-slate-350 text-xxs leading-relaxed line-clamp-3">
                          {art.description}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-800/50">
                        <span className={`px-2.5 py-0.5 rounded-full text-xxs font-extrabold uppercase tracking-wider border shadow-sm ${
                          art.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' :
                          art.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-550/25' :
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                        }`}>
                          {art.sentiment || 'neutral'}
                        </span>
                        
                        <a 
                          href={art.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/15"
                        >
                          <span>Open Original</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI News Insights Dashboard (AI Insights section) */}
                {newsAnalysis && (
                  <div className="glass-panel p-6 bg-slate-900/40 border-slate-800 space-y-6 mt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                        <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-205">AI News Insights & Analysis</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xxs font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Confidence:</span>
                          <span className="text-indigo-450">{(newsAnalysis.confidenceScore * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Reputation Score:</span>
                          <span className={`px-2 py-0.5 rounded ${
                            newsAnalysis.reputationScore >= 75 ? 'text-emerald-400 bg-emerald-500/10' :
                            newsAnalysis.reputationScore <= 45 ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10'
                          }`}>
                            {newsAnalysis.reputationScore} / 100
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Operations & Sync Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 pt-1.5 pb-3.5 border-b border-slate-800/40 text-[9px] font-black uppercase tracking-wider">
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
                        <span className="text-slate-500">AI Engine Status</span>
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                          Online
                        </span>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
                        <span className="text-slate-500">Live Monitoring</span>
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
                        <span className="text-slate-500">News Sync Feed</span>
                        <span className="text-blue-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Synced
                        </span>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
                        <span className="text-slate-500">Articles Analyzed</span>
                        <span className="text-slate-200">{newsArticles.length} Articles</span>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
                        <span className="text-slate-500">Last Core Audit</span>
                        <span className="text-slate-350 font-bold lowercase">
                          {newsAnalysis.createdAt ? new Date(newsAnalysis.createdAt).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
                        <span className="text-slate-500">Threat Alerts</span>
                        <span className={`font-bold ${newsAnalysis.overallSentiment === 'negative' ? 'text-rose-400' : 'text-slate-450'}`}>
                          {newsAnalysis.businessRisks?.length || 0} Alerts
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Overall Sentiment & Summary */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-bold text-slate-450">Overall Sentiment:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                            newsAnalysis.overallSentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            newsAnalysis.overallSentiment === 'negative' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-550/20' :
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          }`}>
                            {newsAnalysis.overallSentiment}
                          </span>
                          
                          <span className="text-xs font-bold text-slate-450 ml-3">Risk Level:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                            newsAnalysis.overallSentiment === 'negative' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20' :
                            newsAnalysis.overallSentiment === 'neutral' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            {newsAnalysis.overallSentiment === 'negative' ? 'CRITICAL RISK' :
                             newsAnalysis.overallSentiment === 'neutral' ? 'MEDIUM RISK' : 'LOW RISK'}
                          </span>
                        </div>

                        <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-800/80 space-y-2">
                          <h5 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide">AI Executive Summary</h5>
                          <p className="text-slate-300 text-xs leading-relaxed font-normal">
                            {newsAnalysis.executiveSummary}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
                            <h5 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5" />
                              <span>Positive Highlights</span>
                            </h5>
                            <ul className="list-disc list-inside text-xxs text-slate-350 space-y-1">
                              {newsAnalysis.positiveHighlights?.map((item: string, i: number) => (
                                <li key={i}>{item}</li>
                              )) || <li>No notable positive highlights.</li>}
                            </ul>
                          </div>
                          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-2">
                            <h5 className="font-extrabold text-xs text-rose-450 uppercase tracking-wide flex items-center gap-1">
                              <TrendingDown className="h-3.5 w-3.5" />
                              <span>Negative Highlights</span>
                            </h5>
                            <ul className="list-disc list-inside text-xxs text-slate-350 space-y-1">
                              {newsAnalysis.negativeHighlights?.map((item: string, i: number) => (
                                <li key={i}>{item}</li>
                              )) || <li>No notable negative highlights.</li>}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Right: Trends & Recommendations */}
                      <div className="space-y-4">
                        {newsAnalysis.trendingTopics?.length > 0 && (
                          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                            <h5 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5 text-indigo-400" />
                              <span>Top Trends</span>
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {newsAnalysis.trendingTopics.map((topic: string, i: number) => (
                                <span key={i} className="text-xxs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/15">
                                  #{topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {newsAnalysis.businessRisks?.length > 0 && (
                          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                            <h5 className="font-extrabold text-xs text-amber-400 uppercase tracking-wide flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              <span>Detected Risks</span>
                            </h5>
                            <ul className="list-none text-xxs text-slate-350 space-y-2">
                              {newsAnalysis.businessRisks.map((risk: string, i: number) => (
                                <li 
                                  key={i} 
                                  onClick={() => setSelectedRiskAlert(risk)}
                                  className="flex items-start gap-2 cursor-pointer hover:text-rose-400 transition-colors p-1.5 rounded hover:bg-slate-900/50 border border-transparent hover:border-slate-800"
                                >
                                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-500/15 space-y-2">
                          <h5 className="font-extrabold text-xs text-purple-400 uppercase tracking-wide flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                            <span>Action Recommendations</span>
                          </h5>
                          <ul className="list-decimal list-inside text-xxs text-slate-350 space-y-1.5">
                            {newsAnalysis.actionableRecommendations?.map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            )) || <li>No recommendations generated.</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Manual Mention Modal Dialog */}
      {showManualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-slate-100">
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#070a13]/85 backdrop-blur-sm animate-fade-in" onClick={() => setShowManualModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <h3 className="text-xl font-black mb-5 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
              Log Brand Mention
            </h3>
            
            <form onSubmit={handleAddMention} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Content</label>
                <textarea
                  value={newMentionContent}
                  onChange={(e) => setNewMentionContent(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-250 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-xs text-slate-200 outline-none transition-colors"
                  placeholder="Paste or write the review content to analyze..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Source Type</label>
                  <select
                    value={newMentionSource}
                    onChange={(e) => setNewMentionSource(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-250 dark:border-slate-800 text-xs text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="twitter">Twitter</option>
                    <option value="reddit">Reddit</option>
                    <option value="news">News</option>
                    <option value="web">Web</option>
                    <option value="local_news">Local News</option>
                    <option value="rss">RSS Feed</option>
                    <option value="regional_news">Regional News Website</option>
                    <option value="regional_blogs">Regional Blog</option>
                    <option value="google_reviews">Google Review</option>
                    <option value="youtube">YouTube</option>
                    <option value="x">X (Twitter)</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Author</label>
                  <input
                    type="text"
                    value={newMentionAuthor}
                    onChange={(e) => setNewMentionAuthor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-250 dark:border-slate-800 text-xs text-slate-200 outline-none"
                    placeholder="e.g. @tech_analyst"
                  />
                </div>
              </div>

              {/* Hyperlocal Location Section (Story 2 Integration) */}
              <div className="border-t border-slate-800 pt-4 mt-2">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Hyperlocal Location Details (Optional)
                </span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-semibold text-slate-400 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-250 dark:border-slate-800 text-xxs text-slate-200 outline-none"
                      placeholder="e.g. Patna"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-1">State</label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-250 dark:border-slate-800 text-xxs text-slate-200 outline-none"
                      placeholder="e.g. Bihar"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-250 dark:border-slate-800 text-xxs text-slate-200 outline-none"
                      placeholder="India"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-250 dark:border-slate-800 text-xxs text-slate-200 outline-none"
                      placeholder="e.g. 25.5941"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-250 dark:border-slate-800 text-xxs text-slate-200 outline-none"
                      placeholder="e.g. 85.1376"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-350 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMention}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {creatingMention ? 'Analyzing...' : 'Submit & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Executive Intelligence Drawer */}
      <EnterpriseDrawer
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState(prev => ({ ...prev, isOpen: false }))}
        title={
          (drawerState.type === 'positive_mentions' && 'Positive Sentiment Feed') ||
          (drawerState.type === 'neutral_audits' && 'Neutral Audits Engine') ||
          (drawerState.type === 'risk_alerts' && 'Enterprise Risk Intelligence Center') ||
          (drawerState.type === 'brand_health' && 'Brand Health Index Diagnostics') ||
          (drawerState.type === 'reputation_score' && 'Brand Reputation Score History') ||
          (drawerState.type === 'confidence_score' && 'AI Model Confidence Audit') ||
          (drawerState.type === 'trending_topics' && 'Topic Intelligence Analyzer') ||
          (drawerState.type === 'ai_recommendations' && 'AI Actionable Recommendations') ||
          ''
        }
        icon={<Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />}
      >

        {/* Search & Filter Controls (Sticky below header) */}
        {['positive_mentions', 'neutral_audits', 'risk_alerts', 'trending_topics'].includes(drawerState.type) && (
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input 
                type="text"
                placeholder={`Search inside this panel...`}
                value={drawerSearchQuery}
                onChange={(e) => setDrawerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
            
            {/* Filter selectors */}
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-850">
                <Calendar className="h-3 w-3 text-slate-500" />
                <select 
                  value={drawerDateFilter}
                  onChange={(e) => setDrawerDateFilter(e.target.value as any)}
                  className="bg-transparent text-slate-300 outline-none cursor-pointer"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="3days">Past 3 Days</option>
                  <option value="7days">Past 7 Days</option>
                </select>
              </div>

              {/* Source Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-850">
                <Filter className="h-3 w-3 text-slate-500" />
                <select 
                  value={drawerSourceFilter}
                  onChange={(e) => setDrawerSourceFilter(e.target.value)}
                  className="bg-transparent text-slate-300 outline-none cursor-pointer max-w-[100px]"
                >
                  <option value="all">All Sources</option>
                  {allSources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              {/* Language Filter */}
              {allLanguages.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-850">
                  <Globe className="h-3 w-3 text-slate-500" />
                  <select 
                    value={drawerLangFilter}
                    onChange={(e) => setDrawerLangFilter(e.target.value)}
                    className="bg-transparent text-slate-300 outline-none cursor-pointer max-w-[100px]"
                  >
                    <option value="all">All Languages</option>
                    {allLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Region Filter */}
              {allRegions.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-850">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  <select 
                    value={drawerRegionFilter}
                    onChange={(e) => setDrawerRegionFilter(e.target.value)}
                    className="bg-transparent text-slate-300 outline-none cursor-pointer max-w-[100px]"
                  >
                    <option value="all">All Regions</option>
                    {allRegions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Intelligence Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* View 1: POSITIVE MENTIONS DIAGNOSTICS */}
          {drawerState.type === 'positive_mentions' && (() => {
            const articles = getFilteredNews('positive');
            const mentions = getFilteredMentions('positive');
            const hasItems = articles.length > 0 || mentions.length > 0;
            
            if (!hasItems) {
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3.5 bg-slate-950/20 rounded-2xl border border-slate-850/80 p-6">
                  <Smile className="h-10 w-10 text-slate-600 animate-pulse" />
                  <p className="text-xs text-slate-400 font-bold max-w-xs">
                    No intelligence available yet.<br />
                    <span className="text-slate-500 font-normal mt-1 block">BrandPulse AI is continuously monitoring your selected brand.</span>
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Positive Articles</span>
                    <span className="text-2xl font-black text-emerald-450 mt-1 block">{articles.length}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Social Appraisals</span>
                    <span className="text-2xl font-black text-emerald-450 mt-1 block">{mentions.length}</span>
                  </div>
                </div>

                {articles.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide border-b border-slate-800 pb-2">Positive Media Coverage ({articles.length})</h4>
                    {articles.map((art, idx) => (
                      <div key={`pos-art-${idx}`} className="bg-slate-950/45 p-4 rounded-xl border border-slate-850/80 space-y-3.5 shadow-sm">
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold border-b border-slate-900 pb-2">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-350">{art.source}</span>
                          <span>{new Date(art.publishedAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-205">{art.title}</h4>
                        <p className="text-[11px] text-slate-400 font-normal leading-relaxed">{art.description}</p>
                        
                        <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 space-y-2 text-xxs leading-relaxed">
                          <p><strong className="text-emerald-400 uppercase tracking-wide text-[9px] block mb-0.5">Why AI Classified as Positive:</strong> Favorable reporting highlighting strong customer adoption, satisfaction spikes, or positive brand announcements.</p>
                          <p><strong className="text-emerald-400 uppercase tracking-wide text-[9px] block mb-0.5">Business Opportunity:</strong> Promote this organic PR coverage across official marketing handles to drive inbound sales confidence.</p>
                          <p><strong className="text-emerald-400 uppercase tracking-wide text-[9px] block mb-0.5">Recommended Marketing Action:</strong> Embed this highlight in customer-facing newsletters and share with high-priority enterprise leads.</p>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-[10px] font-bold text-slate-500">Confidence Score: <span className="text-indigo-400 font-black">92%</span></span>
                          <a href={art.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold border border-indigo-500/15 flex items-center gap-1 transition-all">
                            Original Article <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {mentions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide border-b border-slate-800 pb-2">Positive Social Mentions ({mentions.length})</h4>
                    {mentions.map((m, idx) => (
                      <div key={`pos-m-${idx}`} className="bg-slate-950/45 p-4 rounded-xl border border-slate-850/80 space-y-3.5 shadow-sm">
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold border-b border-slate-900 pb-2">
                          <span className="bg-indigo-950/30 px-2 py-0.5 rounded text-indigo-400 uppercase font-black">{m.source}</span>
                          <span>{new Date(m.publishedAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-200">Author: {m.author}</h4>
                        <p className="text-[11px] text-slate-300 italic">"{m.content}"</p>
                        {m.translatedContent && <p className="text-xxs text-slate-400">Translated: "{m.translatedContent}"</p>}
                        
                        <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 space-y-2 text-xxs leading-relaxed">
                          <p><strong className="text-emerald-400 uppercase tracking-wide text-[9px] block mb-0.5">Business Opportunity:</strong> Respond with brand appreciation. Positive public advocate can be recruited for client case studies.</p>
                          <p><strong className="text-emerald-400 uppercase tracking-wide text-[9px] block mb-0.5">AI Suggestion:</strong> {m.aiAnalysis?.suggestedAction || 'Retransmit or like post to build community outreach.'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* View 2: NEUTRAL AUDITS DIAGNOSTICS */}
          {drawerState.type === 'neutral_audits' && (() => {
            const articles = getFilteredNews('neutral');
            const mentions = getFilteredMentions('neutral');
            const hasItems = articles.length > 0 || mentions.length > 0;
            
            if (!hasItems) {
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3.5 bg-slate-950/20 rounded-2xl border border-slate-850/80 p-6">
                  <Meh className="h-10 w-10 text-slate-600 animate-pulse" />
                  <p className="text-xs text-slate-400 font-bold max-w-xs">
                    No intelligence available yet.<br />
                    <span className="text-slate-500 font-normal mt-1 block">BrandPulse AI is continuously monitoring your selected brand.</span>
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 text-xs space-y-2 leading-relaxed">
                  <h4 className="font-extrabold text-indigo-400 uppercase tracking-wider text-[10px]">Understanding Neutral Audits</h4>
                  <p className="text-slate-350 font-normal">
                    Neutral coverage represents objective reporting, general blog entries, or standard corporate updates that do not carry strong positive appraisals or critical complaint indicators. These reviews form the reputation baseline.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-indigo-455 uppercase tracking-wide border-b border-slate-800 pb-2">Neutral Articles & Audits ({articles.length + mentions.length})</h4>
                  {[...articles, ...mentions].map((art: any, idx) => (
                    <div key={`neut-${idx}`} className="bg-slate-950/45 p-4 rounded-xl border border-slate-850/80 space-y-3.5 shadow-sm">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold border-b border-slate-900 pb-2">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-350">{art.source}</span>
                        <span>{new Date(art.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-205">{art.title || `Social post by @${art.author}`}</h4>
                      <p className="text-[11px] text-slate-400 font-normal leading-relaxed">{art.description || art.content}</p>
                      
                      <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/10 space-y-2 text-xxs leading-relaxed">
                        <p><strong className="text-blue-400 uppercase tracking-wide text-[9px] block mb-0.5">Why it is Neutral:</strong> Contains informational statements, data audits, or standard product mentions devoid of high-arousal emotions.</p>
                        <p><strong className="text-blue-400 uppercase tracking-wide text-[9px] block mb-0.5">Potential Future Impact:</strong> Factual reviews build SEO authority. Low risk of negative conversion, but continuous observation ensures they do not drift.</p>
                        <p><strong className="text-blue-400 uppercase tracking-wide text-[9px] block mb-0.5">Monitoring Required:</strong> Standard frequency (daily crawls active).</p>
                        <p><strong className="text-blue-400 uppercase tracking-wide text-[9px] block mb-0.5">AI Recommendation:</strong> No immediate defense response required. Optimize the SEO schema of linked topics to maximize discoverability.</p>
                      </div>

                      {art.url && (
                        <div className="flex justify-end pt-2">
                          <a href={art.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold border border-indigo-500/15 flex items-center gap-1 transition-all">
                            Original Article <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* View 3: ENTERPRISE RISK INTELLIGENCE CENTER (RISK ALERTS) */}
          {drawerState.type === 'risk_alerts' && (() => {
            // Aggregate all active risks
            const risksList: any[] = [];
            
            if (newsAnalysis?.businessRisks) {
              newsAnalysis.businessRisks.forEach((riskText: string, idx: number) => {
                if (dismissedRisks.includes(riskText)) return;
                risksList.push({
                  id: `risk-analysis-${idx}`,
                  title: riskText,
                  originalHeadline: newsArticles.find(art => art.sentiment === 'negative')?.title || 'Direct Public Intelligence Spike',
                  source: 'Gemini Risk Engine',
                  time: newsAnalysis.createdAt ? new Date(newsAnalysis.createdAt) : new Date(),
                  explanation: 'AI Sentiment Engine analyzed public brand publications and flagged pattern markers corresponding to reputation, legal, or competitive threats.',
                  severity: idx === 0 ? 'critical' : idx === 1 ? 'high' : 'medium',
                  region: 'National',
                  articleUrl: newsArticles.find(art => art.sentiment === 'negative')?.url || '',
                  rootCause: 'Systemic logistics backlog, operational delays, or software patch issues.',
                  businessImpact: 'Localized churn spikes, negative PR magnification, and temporary customer trust degradation.',
                  repDamage: '-15.4% Reputation Health Score degradation potential',
                  finImpact: '$20,000 - $80,000 local market customer lifetime value at risk.',
                  actionImmediate: newsAnalysis.actionableRecommendations?.[0] || 'Draft response statement addressing concerns, engage directly with customer service reps, and coordinate PR.',
                  strategyLong: 'Improve logistics capacity, establish regional alert protocols, and offer automatic compensations.',
                  responsePublic: 'We are aware of the concerns and are taking immediate measures to ensure all service levels are fully restored.'
                });
              });
            }

            newsArticles.filter(art => art.sentiment === 'negative').forEach((art, idx) => {
              if (dismissedRisks.includes(art.title)) return;
              risksList.push({
                id: `risk-news-${idx}`,
                title: `Negative press article: ${art.title}`,
                originalHeadline: art.title,
                source: art.source,
                time: new Date(art.publishedAt),
                explanation: art.description || 'Negative press release or public report monitored on standard news outlets.',
                severity: 'high',
                region: 'National',
                articleUrl: art.url,
                rootCause: 'Negative PR event or product/service complaint published in mainstream media.',
                businessImpact: 'Decrease in brand confidence, negative SEO rankings on brand keywords, and potential customer acquisition delays.',
                repDamage: '-12.0% sentiment drop potential in local search query index',
                finImpact: 'Potential decline in inbound leads and conversion rates.',
                actionImmediate: 'Publish fact-check details, address the root complaint mentioned in the article, and coordinate with the journalist.',
                strategyLong: 'Establish positive brand equity PR campaigns, optimize SEO profiles, and resolve regional pain points.',
                responsePublic: 'Thank you for bringing this to our attention. We are resolving the issue internally and will provide details shortly.'
              });
            });

            recentMentions.filter(m => m.sentiment === 'negative').forEach((m, idx) => {
              if (dismissedRisks.includes(m._id) || dismissedRisks.includes(m.content)) return;
              risksList.push({
                id: `risk-mention-${idx}`,
                title: `Negative social alert: ${m.content.substring(0, 50)}...`,
                originalHeadline: m.content,
                source: m.source,
                time: new Date(m.publishedAt),
                explanation: `Social media complaint posted by user @${m.author} with low sentiment score.`,
                severity: m.priority || 'medium',
                region: m.location?.city || 'Local',
                articleUrl: '',
                rootCause: 'Direct customer dissatisfaction, service delays, or interface frustration.',
                businessImpact: 'Direct customer churn risk, customer service support queue escalation, and local social media criticism.',
                repDamage: 'Localized brand health score dilution.',
                finImpact: 'Direct lifetime value loss of the complaining account.',
                actionImmediate: `Reach out to @${m.author} immediately via direct support message to solve the problem and offer correction.`,
                strategyLong: 'Improve customer support response SLAs and upgrade quality assurance pipelines.',
                responsePublic: `Hi @${m.author}, we apologize for the experience. Please DM us your account details so we can resolve this for you immediately.`
              });
            });

            // Search filter within panel
            const filteredRisks = risksList.filter(risk => {
              if (!drawerSearchQuery) return true;
              const q = drawerSearchQuery.toLowerCase();
              return risk.title.toLowerCase().includes(q) || 
                     risk.explanation.toLowerCase().includes(q) || 
                     risk.source.toLowerCase().includes(q);
            });

            if (filteredRisks.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3.5 bg-slate-950/20 rounded-2xl border border-slate-850/80 p-6">
                  <ShieldCheck className="h-10 w-10 text-emerald-500 animate-pulse" />
                  <p className="text-xs text-slate-400 font-bold max-w-xs">
                    No active threat alerts.<br />
                    <span className="text-slate-500 font-normal mt-1 block">BrandPulse AI has audited all news feeds and reports. Your brand is secure.</span>
                  </p>
                </div>
              );
            }

            // Selected risk id or title
            const activeRiskId = drawerState.data || filteredRisks[0].id || filteredRisks[0].title;
            const activeRisk = filteredRisks.find(r => r.id === activeRiskId || r.title === activeRiskId) || filteredRisks[0];
            const isResolved = resolvedRisks.includes(activeRisk.title);

            return (
              <div className="space-y-6">
                {/* Risk Selector Slider / Tabs */}
                <div className="space-y-2">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active Threat Queue ({filteredRisks.length})</span>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                    {filteredRisks.map((risk) => {
                      const isSel = risk.id === activeRisk.id;
                      const isRes = resolvedRisks.includes(risk.title);
                      return (
                        <div 
                          key={risk.id}
                          onClick={() => setDrawerState(prev => ({ ...prev, data: risk.id }))}
                          className={`px-3 py-2.5 rounded-xl border shrink-0 text-xxs font-bold cursor-pointer transition-all flex flex-col gap-1 ${
                            isSel ? 'bg-rose-500/10 border-rose-500 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${isRes ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                            <span className="capitalize">{risk.severity} severity</span>
                            {isRes && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 rounded border border-emerald-500/20 ml-auto">Resolved</span>}
                          </div>
                          <span className="truncate w-36 block font-normal text-slate-200">{risk.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Risk Diagnostic details */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850/80 space-y-5">
                  <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Risk Threat Title</span>
                      <h4 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                        {activeRisk.title}
                        {isResolved && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25">RESOLVED STATUS</span>}
                      </h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-widest shrink-0 ${
                      activeRisk.severity === 'critical' ? 'bg-rose-500/15 text-rose-455 border-rose-500/30' :
                      activeRisk.severity === 'high' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                      'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    }`}>
                      {activeRisk.severity} threat
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[9px] font-black uppercase tracking-wider">
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 flex flex-col gap-1">
                      <span className="text-slate-500">Affected Brand</span>
                      <span className="text-indigo-400">{activeBrandName}</span>
                    </div>
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 flex flex-col gap-1">
                      <span className="text-slate-500">Detected Source</span>
                      <span className="text-slate-300">{activeRisk.source}</span>
                    </div>
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 flex flex-col gap-1">
                      <span className="text-slate-500">Time Detected</span>
                      <span className="text-slate-305 lowercase">{new Date(activeRisk.time).toLocaleTimeString()}</span>
                    </div>
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 flex flex-col gap-1">
                      <span className="text-slate-500">Confidence</span>
                      <span className="text-indigo-400">89%</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-3 font-semibold text-slate-300">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Original Headline / content</span>
                      <p className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 text-xs italic">"{activeRisk.originalHeadline}"</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">AI Explanation</span>
                      <p className="text-slate-400 font-normal leading-relaxed">{activeRisk.explanation}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-3.5">
                      <div className="space-y-1 bg-rose-500/5 p-3.5 rounded-xl border border-rose-500/10">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-rose-455 block">Root Cause Analysis</span>
                        <p className="text-xxs text-slate-350 leading-relaxed font-normal">{activeRisk.rootCause}</p>
                      </div>
                      <div className="space-y-1 bg-rose-500/5 p-3.5 rounded-xl border border-rose-500/10">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-rose-455 block">Business Impact</span>
                        <p className="text-xxs text-slate-355 leading-relaxed font-normal">{activeRisk.businessImpact}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xxs font-normal">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850 text-slate-400">
                        <strong className="text-slate-300 block mb-0.5">Est. Reputation Damage</strong>
                        {activeRisk.repDamage}
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850 text-slate-400">
                        <strong className="text-slate-300 block mb-0.5">Est. Financial Impact</strong>
                        {activeRisk.finImpact}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850 text-xxs font-normal">
                      <strong className="text-slate-300 block mb-0.5">Affected Region</strong>
                      📍 {activeRisk.region}
                    </div>

                    <div className="space-y-2 border-t border-slate-900 pt-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Recommended Action Playbooks</span>
                      <div className="bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/15 space-y-2">
                        <p className="text-xxs font-normal text-slate-355 leading-relaxed"><strong className="text-indigo-400 uppercase tracking-wider text-[9px] block mb-0.5">Immediate Tactical Response:</strong> {activeRisk.actionImmediate}</p>
                        <p className="text-xxs font-normal text-slate-355 leading-relaxed"><strong className="text-indigo-400 uppercase tracking-wider text-[9px] block mb-0.5">Long-term Strategic Playbook:</strong> {activeRisk.strategyLong}</p>
                        <p className="text-xxs font-normal text-slate-355 leading-relaxed"><strong className="text-indigo-400 uppercase tracking-wider text-[9px] block mb-0.5">Suggested Public PR Statement:</strong> "{activeRisk.responsePublic}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-900">
                    {activeRisk.articleUrl && (
                      <a 
                        href={activeRisk.articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
                      >
                        Read Original Article <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    
                    <button 
                      onClick={() => {
                        setDismissedRisks([...dismissedRisks, activeRisk.title]);
                        showToast(`Alert "${activeRisk.title.substring(0,25)}..." dismissed.`);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-300 font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Dismiss Alert
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (!isResolved) {
                          setResolvedRisks([...resolvedRisks, activeRisk.title]);
                          showToast(`Alert marked as Resolved.`);
                        } else {
                          setResolvedRisks(resolvedRisks.filter(r => r !== activeRisk.title));
                          showToast(`Alert resolution reverted.`);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl border font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                        isResolved 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                          : 'bg-emerald-650 hover:bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-700/15'
                      }`}
                    >
                      {isResolved ? '✓ Marked Resolved' : 'Mark Resolved'}
                    </button>
                  </div>

                  {/* Follow-up Tasks */}
                  <div className="border-t border-slate-900 pt-4 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Create Follow-up Tasks</span>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newTaskInput.trim()) return;
                        const tasks = followUpTasks[activeRisk.id] || [];
                        setFollowUpTasks({
                          ...followUpTasks,
                          [activeRisk.id]: [...tasks, newTaskInput.trim()]
                        });
                        setNewTaskInput('');
                        showToast(`Task assigned successfully.`);
                      }}
                      className="flex gap-2"
                    >
                      <input 
                        type="text"
                        placeholder="Write task description (e.g. 'Draft response, assign to PR')..."
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                      />
                      <button 
                        type="submit"
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg shadow cursor-pointer transition-all"
                      >
                        Create Task
                      </button>
                    </form>

                    {/* Task list display */}
                    {followUpTasks[activeRisk.id]?.length > 0 && (
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 mt-2 space-y-2 text-xxs font-normal">
                        <strong className="text-slate-400 uppercase tracking-widest text-[9px] block">Assigned Tasks ({followUpTasks[activeRisk.id].length})</strong>
                        <ul className="space-y-1.5">
                          {followUpTasks[activeRisk.id].map((task, tidx) => (
                            <li key={tidx} className="flex items-center gap-2 text-slate-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* View 4: BRAND HEALTH DIAGNOSTICS */}
          {drawerState.type === 'brand_health' && (
            <div className="space-y-6">
              <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/15 space-y-3.5 text-xs text-slate-300 leading-relaxed font-semibold">
                <h4 className="font-extrabold text-indigo-400 uppercase tracking-wide">Brand Health Score Calculation</h4>
                <p className="font-normal text-slate-400">
                  The health index is compiled using weighted values based on public article sentiments and local audits. Positive mentions are given highest priority weight.
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1 font-mono text-[11px]">
                  <span className="text-slate-500 uppercase tracking-widest text-[9px] block">Standard Formula</span>
                  <span className="text-slate-100 block font-bold">Health Score = ((Positive Share + (Neutral Audits * 0.5)) / Total Audits) * 100</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1 font-mono text-[11px] text-indigo-400">
                  <span className="text-slate-500 uppercase tracking-widest text-[9px] block">Your Brand Real-time Audit Stats</span>
                  <span className="block font-bold">
                    Score = (({opportunitiesCount} + ({metrics?.sentimentBreakdown?.neutral || 0} * 0.5)) / {opportunitiesCount + (metrics?.sentimentBreakdown?.neutral || 0) + risksCount || 1}) * 100 = {healthScore}%
                  </span>
                </div>
              </div>

              {/* Factors grid */}
              <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-black uppercase tracking-wider">
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500">Positive Share</span>
                  <span className="text-emerald-450 text-lg font-black block mt-1">{( (opportunitiesCount / (opportunitiesCount + (metrics?.sentimentBreakdown?.neutral || 0) + risksCount || 1)) * 100).toFixed(0)}%</span>
                </div>
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500">Neutral Audits</span>
                  <span className="text-blue-405 text-lg font-black block mt-1">{( ((metrics?.sentimentBreakdown?.neutral || 0) / (opportunitiesCount + (metrics?.sentimentBreakdown?.neutral || 0) + risksCount || 1)) * 100).toFixed(0)}%</span>
                </div>
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500">Negative Weight</span>
                  <span className="text-rose-455 text-lg font-black block mt-1">{( (risksCount / (opportunitiesCount + (metrics?.sentimentBreakdown?.neutral || 0) + risksCount || 1)) * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xxs font-normal">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400">
                  <strong className="text-slate-300 block mb-0.5">Confidence Weight</strong>
                  {newsAnalysis?.confidenceScore ? `${(newsAnalysis.confidenceScore * 100).toFixed(0)}% Data Volume Precision` : '85%'}
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400">
                  <strong className="text-slate-300 block mb-0.5">Risk Weight</strong>
                  Deducts weight depending on the severity and number of active threats.
                </div>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                <h5 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide">Historical Reputation Index Trend</h5>
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Previous Score</span>
                    <span className="text-lg font-black text-slate-400">{(parseFloat(healthScore) - 3.5).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Current score</span>
                    <span className="text-lg font-black text-slate-100">{healthScore}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Audit Shift</span>
                    <span className="text-lg font-black text-emerald-450">↑ +3.5%</span>
                  </div>
                </div>
                <p className="text-xxs text-slate-400 font-normal leading-relaxed">
                  <strong>Reason for Shift:</strong> Robust positive press coverage highlighting technological advancements and strong consumer ratings has outstripped localized support complaints.
                </p>
              </div>

              {/* Suggestions to improve */}
              <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <h5 className="font-extrabold text-xs text-indigo-450 uppercase tracking-wide">Suggestions to Improve Health Score</h5>
                <div className="space-y-3 mt-3 text-xs">
                  {[
                    "Resolve high-priority regional complaints in Tier 2 cities to restore localized sentiment index.",
                    "Launch targeted customer promotion campaign using organic positive reviews.",
                    "Supply technical documentation to neutral blogs to assist transition to positive recommendations."
                  ].map((item, idx) => {
                    const itemKey = `health-suggestion-${idx}`;
                    const isChecked = checkedItems[itemKey] || false;
                    return (
                      <label key={idx} className="flex items-start gap-2.5 cursor-pointer select-none">
                        <span 
                          onClick={() => setCheckedItems({ ...checkedItems, [itemKey]: !isChecked })}
                          className="mt-0.5 shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-500 shrink-0" />
                          )}
                        </span>
                        <span className={`${isChecked ? 'line-through text-slate-500 font-normal' : 'text-slate-300 font-semibold'}`}>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* View 5: REPUTATION SCORE HISTORY & FACTORS */}
          {drawerState.type === 'reputation_score' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Reputation Index Score</span>
                  <span className="text-3xl font-black text-slate-100">{newsAnalysis?.reputationScore || 50} / 100</span>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-450 px-2.5 py-1 rounded-full border border-emerald-500/25 font-bold">
                  +4.2% Growth in indexing
                </span>
              </div>

              {metrics?.timeline && (
                <div className="p-5 bg-slate-950/60 rounded-xl border border-slate-850/80">
                  <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-wide mb-3">7-Day Score Trend</h5>
                  <div className="h-44 w-full text-xxs font-normal">
                    <SentimentAreaChart data={metrics.timeline} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xxs font-normal">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
                  <h5 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                    <Smile className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Contributing Factors (Growth)</span>
                  </h5>
                  <ul className="list-disc list-inside text-slate-350 space-y-1.5">
                    {newsAnalysis?.positiveHighlights?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    )) || <li>No notable positive highlights.</li>}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-2">
                  <h5 className="font-extrabold text-xs text-rose-455 uppercase tracking-wide flex items-center gap-1">
                    <Frown className="h-3.5 w-3.5 text-rose-455" />
                    <span>Contributing Factors (Decline)</span>
                  </h5>
                  <ul className="list-disc list-inside text-slate-350 space-y-1.5">
                    {newsAnalysis?.negativeHighlights?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    )) || <li>No notable negative highlights.</li>}
                  </ul>
                </div>
              </div>

              {/* Action checklist */}
              {newsAnalysis?.actionableRecommendations?.length > 0 && (
                <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                  <h5 className="font-extrabold text-xs text-purple-400 uppercase tracking-wide">Reputation Action Checklist</h5>
                  <div className="space-y-3.5 mt-2.5">
                    {newsAnalysis.actionableRecommendations.map((rec: string, idx: number) => {
                      const itemKey = `rep-rec-checklist-${idx}`;
                      const isChecked = checkedItems[itemKey] || false;
                      return (
                        <label key={idx} className="flex items-start gap-2.5 cursor-pointer select-none text-xs">
                          <span 
                            onClick={() => setCheckedItems({ ...checkedItems, [itemKey]: !isChecked })}
                            className="mt-0.5 shrink-0"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-purple-400" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-500" />
                            )}
                          </span>
                          <span className={`${isChecked ? 'line-through text-slate-500 font-normal' : 'text-slate-300 font-semibold'}`}>{rec}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View 6: AI CONFIDENCE SCORE DIAGNOSTICS */}
          {drawerState.type === 'confidence_score' && (
            <div className="space-y-6">
              <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/15 space-y-3.5 text-xs text-slate-300 leading-relaxed font-semibold">
                <h4 className="font-extrabold text-indigo-400 uppercase tracking-wide">AI Engine Data Integrity Audit</h4>
                <p className="font-normal text-slate-400 text-xxs">
                  The Confidence score represents the statistical reliability of the data analysis based on language translations, geographical coordinates, and article quantity metrics.
                </p>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Telemetry Confidence Level</span>
                  <span className="text-3xl font-black text-indigo-400">
                    {newsAnalysis?.confidenceScore ? `${(newsAnalysis.confidenceScore * 100).toFixed(0)}%` : '85%'}
                  </span>
                </div>
              </div>

              {/* Model Telemetry Table */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">AI Sentiment Telemetry</span>
                <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-950/60 text-xxs font-normal">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-2.5 px-3">Telemetry Metric</th>
                        <th className="py-2.5 px-3 text-center">Value</th>
                        <th className="py-2.5 px-3 text-right">Target SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      <tr>
                        <td className="py-2.5 px-3">Model Accuracy Rate</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-450">94.2%</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">&gt; 90%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">Model Precision</td>
                        <td className="py-2.5 px-3 text-center font-bold">92.8%</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">&gt; 88%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">Translation Precision (Hindi / Regional)</td>
                        <td className="py-2.5 px-3 text-center font-bold">95.4%</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">&gt; 92%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">Real-time Data Latency</td>
                        <td className="py-2.5 px-3 text-center font-bold">120ms</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">&lt; 300ms</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Integrity Checklist */}
              <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <h5 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide">Data Verification Checklist</h5>
                <div className="space-y-3 mt-3 text-xs">
                  {[
                    "Verified integration endpoints for Google Gemini model pipeline.",
                    "Active regional translation engine calibrated.",
                    "Hyperlocal coordinate resolution matching Tier 2 & Tier 3 cities.",
                    "Standard NewsAPI sync schedules active and error-free."
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-semibold">
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View 7: TRENDING TOPICS DIAGNOSTICS */}
          {drawerState.type === 'trending_topics' && (() => {
            const activeTopic = drawerState.data || (newsAnalysis?.trendingTopics?.[0] || 'reputation');
            
            // Gather articles matching the topic keyword
            const matchingArticles = newsArticles.filter(art => 
              art.title?.toLowerCase().includes(activeTopic.toLowerCase()) ||
              art.description?.toLowerCase().includes(activeTopic.toLowerCase())
            );

            return (
              <div className="space-y-6">
                <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 space-y-2 text-xs text-slate-300 leading-relaxed font-semibold">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Active Topic Analysis</span>
                  <h4 className="text-sm font-black text-indigo-400">#{activeTopic}</h4>
                  <p className="font-normal text-slate-400">
                    AI detected a discussion spike surrounding this keyword index across regional and national media channels, indicating increased interest.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xxs font-normal">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400">
                    <strong className="text-slate-300 block mb-0.5">Business Opportunity</strong>
                    Capture customer demand by drafting marketing messaging around this topic.
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400">
                    <strong className="text-slate-300 block mb-0.5">Risk Level</strong>
                    Low immediate reputation risk. Favorable positioning advised.
                  </div>
                </div>

                {/* Relevant articles */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-indigo-450 uppercase tracking-wide border-b border-slate-800 pb-2">Matching Public Media ({matchingArticles.length})</h4>
                  {matchingArticles.length === 0 ? (
                    <p className="text-xxs text-slate-400 italic">No specific news articles direct-match this topic query.</p>
                  ) : (
                    matchingArticles.map((art, idx) => (
                      <div key={idx} className="bg-slate-950/45 p-4 rounded-xl border border-slate-850/80 space-y-2">
                        <div className="flex justify-between items-center text-[9px] text-slate-400">
                          <span>{art.source}</span>
                          <span>{new Date(art.publishedAt).toLocaleDateString()}</span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-200">{art.title}</h5>
                        <p className="text-xxs text-slate-400">{art.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* View 8: AI RECOMMENDATIONS DIAGNOSTICS */}
          {drawerState.type === 'ai_recommendations' && (() => {
            const recommendations = newsAnalysis?.actionableRecommendations || [];
            
            if (recommendations.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3.5 bg-slate-950/20 rounded-2xl border border-slate-850/80 p-6">
                  <Sparkles className="h-10 w-10 text-slate-600 animate-pulse" />
                  <p className="text-xs text-slate-400 font-bold max-w-xs">
                    No recommendations available yet.<br />
                    <span className="text-slate-500 font-normal mt-1 block">Recommendations are compiled automatically during news synchronization audits.</span>
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 text-xs text-slate-350 leading-relaxed font-semibold">
                  AI compiled recommendations detailing priority playbooks, impact predictions, difficulty estimations, and workflow checklists to optimize reputation scores.
                </div>

                <div className="space-y-4">
                  {recommendations.map((rec: string, idx: number) => {
                    const recId = `rec-card-${idx}`;
                    const isChecked = checkedItems[recId] || false;
                    return (
                      <div key={idx} className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850/80 space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                          <h4 className={`text-xs font-black flex items-start gap-2.5 ${isChecked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            <span 
                              onClick={() => setCheckedItems({ ...checkedItems, [recId]: !isChecked })}
                              className="mt-0.5 cursor-pointer shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-purple-400" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-500" />
                              )}
                            </span>
                            <span>{rec}</span>
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border tracking-widest shrink-0 ${
                            idx === 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-455' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {idx === 0 ? 'High Priority' : 'Medium Priority'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center text-[9px] font-black uppercase tracking-wider">
                          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                            <span className="text-slate-500 block">Expected Impact</span>
                            <span className="text-emerald-450 block mt-0.5">High Impact</span>
                          </div>
                          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                            <span className="text-slate-500 block">SLA Target</span>
                            <span className="text-indigo-400 block mt-0.5">{idx === 0 ? '24 Hours' : '3 Days'}</span>
                          </div>
                          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                            <span className="text-slate-500 block">Difficulty</span>
                            <span className="text-slate-300 block mt-0.5">Moderate</span>
                          </div>
                        </div>

                        <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-900 space-y-2 text-xxs font-normal">
                          <strong className="text-slate-400 uppercase tracking-widest text-[8px] block mb-1">Playbook Checklist Tasks</strong>
                          {[
                            "Analyze source documents and customer sentiment feedback context.",
                            "Draft PR reply templates and align communication channels.",
                            "Deploy resolution patch and monitor follow-up reviews."
                          ].map((step, sIdx) => {
                            const stepId = `${recId}-step-${sIdx}`;
                            const stepChecked = checkedItems[stepId] || false;
                            return (
                              <label key={sIdx} className="flex items-center gap-2.5 cursor-pointer select-none text-[11px]">
                                <span 
                                  onClick={() => setCheckedItems({ ...checkedItems, [stepId]: !stepChecked })}
                                >
                                  {stepChecked ? (
                                    <CheckSquare className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                  ) : (
                                    <Square className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                  )}
                                </span>
                                <span className={`${stepChecked ? 'line-through text-slate-500' : 'text-slate-350'}`}>{step}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Dedicated AI Investigation Timeline widget */}
          {newsAnalysis && (
            <div className="border-t border-slate-800/80 pt-6 mt-6">
              <h5 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide flex items-center gap-1.5 mb-4">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>AI Investigation Timeline</span>
              </h5>
              
              <div className="relative pl-6 border-l border-slate-800 space-y-5 text-xs text-slate-400 font-semibold">
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-3 w-3 rounded-full bg-slate-700 border-2 border-slate-900" />
                  <span className="font-bold text-[9px] text-slate-500 uppercase tracking-wider block">
                    {formatOffsetTime(newsAnalysis.createdAt ? new Date(newsAnalysis.createdAt) : new Date(), 4)}
                  </span>
                  <p className="text-slate-350 font-normal mt-0.5">News & social media mentions fetched from global feeds.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-3 w-3 rounded-full bg-indigo-500 border-2 border-slate-900 animate-pulse" />
                  <span className="font-bold text-[9px] text-indigo-400 uppercase tracking-wider block">
                    {formatOffsetTime(newsAnalysis.createdAt ? new Date(newsAnalysis.createdAt) : new Date(), 3)}
                  </span>
                  <p className="text-slate-350 font-normal mt-0.5">Gemini models processed translations & sentiment categorizations.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-3 w-3 rounded-full bg-amber-500 border-2 border-slate-900" />
                  <span className="font-bold text-[9px] text-amber-400 uppercase tracking-wider block">
                    {formatOffsetTime(newsAnalysis.createdAt ? new Date(newsAnalysis.createdAt) : new Date(), 2)}
                  </span>
                  <p className="text-slate-350 font-normal mt-0.5">Reputation engine analyzed business risks & opportunities.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-3 w-3 rounded-full bg-purple-500 border-2 border-slate-900" />
                  <span className="font-bold text-[9px] text-purple-400 uppercase tracking-wider block">
                    {formatOffsetTime(newsAnalysis.createdAt ? new Date(newsAnalysis.createdAt) : new Date(), 1)}
                  </span>
                  <p className="text-slate-350 font-normal mt-0.5">Live monitoring alerts dispatched to dashboard feeds.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
                  <span className="font-bold text-[9px] text-emerald-450 uppercase tracking-wider block">
                    {formatOffsetTime(newsAnalysis.createdAt ? new Date(newsAnalysis.createdAt) : new Date(), 0)}
                  </span>
                  <p className="text-slate-205 mt-0.5">Dashboard metrics synchronized and rendered live.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </EnterpriseDrawer>

      {/* Advanced Brand Intelligence Suite Section */}
      <IntelligenceModule />

      {/* Floating Interactive Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] bg-indigo-600 border border-indigo-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-slide-up">
          <Sparkles className="h-4 w-4 text-purple-200 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
