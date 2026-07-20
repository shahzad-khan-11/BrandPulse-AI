/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  FileText,
  Bell,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  Building,
  Search,
  ChevronDown,
  User,
  Settings,
  RefreshCw,
  Bot,
  Activity,
  Sparkles,
  AlertOctagon,
  Trash2,
  Check,
  Shield
} from 'lucide-react';
import { getUserAvatarUrl, getInitials } from '../utils/avatar';
import { AIAssistantWidget, AIAssistantPanel } from './AIAssistant';

// Notification Helper functions
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'ai':
      return <Sparkles className="h-4.5 w-4.5 text-purple-400 shrink-0" />;
    case 'report':
      return <FileText className="h-4.5 w-4.5 text-blue-400 shrink-0" />;
    case 'monitoring':
      return <Activity className="h-4.5 w-4.5 text-emerald-400 shrink-0" />;
    case 'threat':
      return <AlertOctagon className="h-4.5 w-4.5 text-rose-500 shrink-0 animate-pulse" />;
    case 'sentiment':
      return <Megaphone className="h-4.5 w-4.5 text-amber-400 shrink-0" />;
    case 'workspace':
      return <Building className="h-4.5 w-4.5 text-indigo-400 shrink-0" />;
    case 'authentication':
      return <Shield className="h-4.5 w-4.5 text-cyan-400 shrink-0" />;
    default:
      return <Bell className="h-4.5 w-4.5 text-slate-400 shrink-0" />;
  }
};

const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifFilter, setNotifFilter] = useState('ALL');
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Global Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Filter and search logic for notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (notifFilter !== 'ALL' && notif.category !== notifFilter.toLowerCase()) {
      return false;
    }
    if (notifSearch.trim()) {
      const q = notifSearch.toLowerCase();
      const matchTitle = notif.title?.toLowerCase().includes(q);
      const matchMsg = notif.message?.toLowerCase().includes(q);
      const matchBrand = notif.metadata?.brandName?.toLowerCase().includes(q);
      const matchCategory = notif.category?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchBrand || matchCategory;
    }
    return true;
  });

  // AI Assistant states
  const [selectedBrandId, setSelectedBrandId] = useState<string>(() => {
    return localStorage.getItem('active-brand-id') || '';
  });
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchBrandsContext = async () => {
      try {
        const savedBrandId = localStorage.getItem('active-brand-id');
        if (savedBrandId) {
          setSelectedBrandId(savedBrandId);
          return;
        }
        const brandsRes = await api.get('/brands');
        const loadedBrands = brandsRes.data.data || [];
        if (loadedBrands.length > 0) {
          setSelectedBrandId(loadedBrands[0]._id);
          localStorage.setItem('active-brand-id', loadedBrands[0]._id);
        }
      } catch (err) {
        console.error('Failed to pre-fetch brand context:', err);
      }
    };
    fetchBrandsContext();
  }, []);

  useEffect(() => {
    const handleBrandChange = (e: any) => {
      if (e.detail) {
        setSelectedBrandId(e.detail);
      }
    };
    window.addEventListener('brand-changed', handleBrandChange);
    return () => {
      window.removeEventListener('brand-changed', handleBrandChange);
    };
  }, []);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Load and save collapsed sidebar state to localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const handleToggleCollapse = (e: CustomEvent<boolean>) => {
      setIsCollapsed(e.detail);
    };
    window.addEventListener('sync-sidebar-collapse' as any, handleToggleCollapse as any);
    return () => {
      window.removeEventListener('sync-sidebar-collapse' as any, handleToggleCollapse as any);
    };
  }, []);

  // Dropdown dismissals (click outside & ESC key)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close dropdowns when activeTab changes
  useEffect(() => {
    setShowProfileDropdown(false);
    setShowNotifications(false);
  }, [activeTab]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Listen for Ctrl+K / Cmd+K hotkey shortcut
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Dynamically index workspace brands, mentions, and reports on search open
  useEffect(() => {
    if (!isSearchOpen) return;

    const buildSearchIndex = async () => {
      setIsSearching(true);
      try {
        const index: any[] = [];

        // 1. Navigation items
        navItems.forEach(item => {
          index.push({
            title: `Go to ${item.name}`,
            subtitle: `Navigate directly to ${item.name} control panel`,
            type: 'nav',
            id: item.id,
            category: 'Navigation'
          });
        });

        // 2. Fetch Brands
        const brandsRes = await api.get('/brands');
        const loadedBrands = brandsRes.data.data || [];
        loadedBrands.forEach((b: any) => {
          index.push({
            title: b.name,
            subtitle: `Brand Workspace keywords: ${b.keywords.join(', ')}`,
            type: 'brand',
            id: b._id,
            category: 'Brands'
          });
        });

        // 3. Fetch Mentions & Reports for each brand
        await Promise.all(
          loadedBrands.map(async (b: any) => {
            // Mentions
            try {
              const mentionsRes = await api.get(`/mentions/brand/${b._id}?limit=40`);
              const mentionsList = mentionsRes.data.data || [];
              mentionsList.forEach((m: any) => {
                index.push({
                  title: `${m.author} on ${m.source}`,
                  subtitle: m.content,
                  type: 'mention',
                  brandId: b._id,
                  id: m._id,
                  category: 'Mentions'
                });
              });
            } catch (err) {
              console.error(`Failed to fetch mentions for brand ${b.name}`, err);
            }

            // Reports
            try {
              const execReportsRes = await api.get(`/executive-reports/brand/${b._id}`).catch(() => ({ data: { data: [] } }));
              const execReports = execReportsRes.data.data || [];
              execReports.forEach((r: any) => {
                index.push({
                  title: r.name,
                  subtitle: `AI Executive Report generated on ${new Date(r.createdAt).toLocaleDateString()}`,
                  type: 'report',
                  brandId: b._id,
                  id: r._id,
                  category: 'Reports'
                });
              });

              const manualReportsRes = await api.get(`/reports/brand/${b._id}`).catch(() => ({ data: { data: [] } }));
              const manualReports = manualReportsRes.data.data || [];
              manualReports.forEach((r: any) => {
                index.push({
                  title: r.name,
                  subtitle: `Manual Upload PDF Summary: ${r.summary}`,
                  type: 'report',
                  brandId: b._id,
                  id: r._id,
                  category: 'Reports'
                });
              });
            } catch (err) {
              console.error(`Failed to fetch reports for brand ${b.name}`, err);
            }
          })
        );

        setSearchIndex(index);
      } catch (err) {
        console.error('Failed to build search index', err);
      } finally {
        setIsSearching(false);
      }
    };

    buildSearchIndex();
  }, [isSearchOpen]);

  // Fetch user notifications (Unread count updates automatically, loaded newest first)
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30 seconds

    const handleRefetch = () => {
      fetchNotifications();
    };
    window.addEventListener('refetch-notifications', handleRefetch);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refetch-notifications', handleRefetch);
    };
  }, []);

  const markAllNotificationsAsRead = async () => {
    try {
      await api.put('/notifications/read');
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking single notification read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete('/notifications');
      fetchNotifications();
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'brands', name: 'Brands', icon: Building },
    { id: 'mentions', name: 'Mentions', icon: Megaphone },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'reports', name: 'Reports', icon: FileText },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', name: 'Admin Panel', icon: ShieldCheck });
  }

  // Helper for user professional role display
  const getProfessionalRole = (role: string | undefined) => {
    if (role === 'admin') return 'Brand Intelligence Manager';
    return 'Brand Intelligence Analyst';
  };

  const avatarUrl = getUserAvatarUrl(user);

  const filteredResults = searchQuery.trim() === "" 
    ? [] 
    : searchIndex.filter(item => {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q))
        );
      });

  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId);
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleResultClick = (item: any) => {
    // Add to recent searches
    const cleanQuery = searchQuery.trim();
    if (cleanQuery) {
      const updated = [cleanQuery, ...recentSearches.filter(s => s !== cleanQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recent-searches', JSON.stringify(updated));
    }

    if (item.type === 'nav') {
      setActiveTab(item.id);
    } else if (item.type === 'brand') {
      setActiveTab('brands');
    } else if (item.type === 'mention') {
      setActiveTab('mentions');
    } else if (item.type === 'report') {
      setActiveTab('reports');
    }
    
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="h-screen app-root text-slate-100 dark:text-slate-100 flex overflow-hidden font-sans transition-colors duration-300 relative">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/[0.03] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-purple-500/5 dark:bg-purple-600/[0.03] blur-[140px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <motion.aside 
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
        className="hidden md:flex flex-col shrink-0 theme-sidebar backdrop-blur-2xl relative z-30 overflow-hidden border-r"
      >
        {/* Sidebar Header Logo */}
        <div className={`py-4 flex items-center border-b border-slate-200/60 dark:border-slate-800/50 h-16 overflow-hidden relative ${
          isCollapsed ? 'justify-center px-0' : 'pl-5 pr-3.5 justify-between'
        }`}>
          {!isCollapsed ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all text-left focus:outline-none min-w-0"
                title="Navigate to Dashboard"
              >
                <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md border border-indigo-400/20">
                  B
                </div>
                <div className="flex flex-col truncate">
                  <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                    BrandPulse <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 py-0.5 rounded font-black tracking-widest uppercase">AI</span>
                  </h1>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest leading-none mt-1">Enterprise SaaS</p>
                </div>
              </button>
              
              {/* Desktop Circular Glass Collapse Toggle (◀) */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className="h-6 w-6 hidden md:flex items-center justify-center rounded-full bg-white/40 dark:bg-slate-950/40 border border-slate-200/20 dark:border-slate-800/40 backdrop-blur-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white shadow-sm hover:shadow-[0_0_10px_rgba(99,102,241,0.25)] transition-all cursor-pointer focus:outline-none shrink-0"
                title="Collapse Sidebar"
              >
                <motion.span
                  animate={{ rotate: 0 }}
                  className="text-[9px] font-black leading-none flex items-center justify-center animate-fade-in"
                >
                  ◀
                </motion.span>
              </motion.button>
            </>
          ) : (
            /* Collapsed State: Show centered expand arrow (▶) */
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="h-7 w-7 flex items-center justify-center rounded-full bg-white/40 dark:bg-slate-950/40 border border-slate-200/20 dark:border-slate-800/40 backdrop-blur-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white shadow-sm hover:shadow-[0_0_10px_rgba(99,102,241,0.25)] transition-all cursor-pointer focus:outline-none"
              title="Expand Sidebar"
            >
              <motion.span
                animate={{ rotate: 180 }}
                className="text-[9px] font-black leading-none flex items-center justify-center animate-fade-in"
              >
                ◀
              </motion.span>
            </motion.button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative flex items-center group">
                <button
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.name : undefined}
                  className={`w-full flex items-center rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 relative cursor-pointer pl-5 py-3 pr-4 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500/20'
                      : 'text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-white border border-transparent'
                  }`}
                >
                  {/* Active Indicator Strip */}
                  {isActive && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-indigo-400 rounded-r shadow-[0_0_10px_#6366f1]" />
                  )}
                  
                  <Icon className={`h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-400'}`} />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="truncate tracking-widest text-[10px] ml-3.5 block"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            );
          })}
        </nav>

        {/* AI Assistant Sidebar Widget */}
        {!isCollapsed ? (
          <AIAssistantWidget onOpen={() => setIsAssistantOpen(true)} />
        ) : (
          <div className="flex justify-center p-3 mt-auto mb-3 shrink-0">
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/10 to-slate-900 border border-indigo-900/35 hover:border-indigo-500/50 text-indigo-400 flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-105"
              title="Open AI Assistant"
            >
              <Bot className="h-5 w-5 animate-pulse" />
            </button>
          </div>
        )}

      </motion.aside>

      {/* Main Container Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-25">
        
        {/* Topbar Navigation */}
        <header className="sticky top-0 z-40 theme-navbar backdrop-blur-xl border-b px-8 h-16 flex items-center justify-between transition-colors duration-300 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.02)] shrink-0">
          
          {/* Topbar Left */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/65 transition-all text-slate-400 md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb Workspace Title */}
            <div className="hidden sm:block">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer">BrandPulse</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/8 px-2.5 py-1 rounded-lg border border-indigo-500/15 shadow-sm capitalize">
                  {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
                </span>
              </h2>
            </div>

            {/* Premium Global Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden lg:flex items-center justify-between w-64 pl-3.5 pr-2.5 py-2 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/30 text-xs text-slate-450 dark:text-slate-500 transition-all duration-300 shadow-inner group cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
                <span className="font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Search...</span>
              </div>
              <span className="text-[9px] font-black tracking-widest uppercase bg-slate-250 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 text-slate-500 dark:text-slate-450 shadow-sm leading-none flex items-center justify-center">
                ⌘K
              </span>
            </button>
          </div>

          {/* Topbar Right */}
          <div className="flex items-center gap-3">
            
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-slate-100/40 dark:bg-slate-900/30 hover:bg-slate-100/80 dark:hover:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-750 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4.5 w-4.5 text-amber-400 animate-pulse-slow" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-indigo-500" />
              )}
            </motion.button>

            {/* Notifications Panel */}
            <div className="relative" ref={notificationsRef}>
              <motion.button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl bg-slate-100/40 dark:bg-slate-900/30 hover:bg-slate-100/80 dark:hover:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-750 text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white transition-all relative shadow-sm cursor-pointer animate-fade-in"
              >
                <Bell className="h-4.5 w-4.5 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-[8px] font-black text-white border border-slate-950 dark:border-[#070a13] shadow-[0_2px_8px_rgba(225,29,72,0.5)]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-96 theme-dropdown backdrop-blur-2xl rounded-2xl z-[9999] overflow-hidden py-2"
                  >
                    <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-950/10 dark:bg-slate-950/20" style={{ borderColor: 'var(--color-border)' }}>
                      <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-indigo-400" /> Notifications Log
                      </h4>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllNotificationsAsRead}
                            className="text-[9px] uppercase tracking-widest text-indigo-400 hover:text-indigo-300 font-extrabold cursor-pointer"
                          >
                            Mark All Read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button 
                            onClick={clearAllNotifications}
                            className="text-[9px] uppercase tracking-widest text-rose-400 hover:text-rose-300 font-extrabold cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Search & Filter Row */}
                    <div className="px-4 py-2 space-y-2 border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-900/10">
                      <input
                        type="text"
                        placeholder="Search notifications..."
                        value={notifSearch}
                        onChange={(e) => setNotifSearch(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-200/60 dark:border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-xxs outline-none transition-colors text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                      />
                      
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                        {['ALL', 'AI', 'THREAT', 'REPORT', 'MONITORING'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setNotifFilter(cat)}
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                              notifFilter === cat
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-950/20 text-slate-450 border-slate-800/50 hover:bg-slate-800/20'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60 custom-scrollbar">
                      {filteredNotifications.length === 0 ? (
                        <div className="text-center py-12 space-y-3">
                          <Bell className="h-9 w-9 text-slate-650 mx-auto" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No matching notifications.</p>
                        </div>
                      ) : (
                        filteredNotifications.map((notif) => {
                          const priorityColor = 
                            notif.priority === 'HIGH' ? 'border-rose-500 bg-rose-500/10 text-rose-450' :
                            notif.priority === 'MEDIUM' ? 'border-amber-500 bg-amber-500/10 text-amber-400' :
                            notif.priority === 'LOW' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-405' :
                            'border-indigo-500 bg-indigo-500/10 text-indigo-400';
                          
                          return (
                            <div 
                              key={notif._id} 
                              onClick={() => setSelectedNotif(notif)}
                              className={`px-4 py-3.5 transition-colors flex items-start gap-3 relative group cursor-pointer hover:bg-slate-100/5 dark:hover:bg-slate-800/10 ${
                                notif.isRead ? 'opacity-65 hover:opacity-100 bg-transparent' : 'bg-slate-50 dark:bg-slate-950/20'
                              }`}
                            >
                              {/* Left Priority Accent Strip */}
                              <div className={`w-1 self-stretch rounded shrink-0 ${
                                notif.priority === 'HIGH' ? 'bg-rose-500' :
                                notif.priority === 'MEDIUM' ? 'bg-amber-500' :
                                notif.priority === 'LOW' ? 'bg-yellow-500' :
                                'bg-indigo-500'
                              }`} />

                              {/* Category Icon */}
                              <div className="mt-0.5 shrink-0">
                                {getCategoryIcon(notif.category)}
                              </div>

                              {/* Notification Text details */}
                              <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">{notif.title}</span>
                                  <span className={`text-[7px] font-black uppercase px-1 rounded border tracking-wide leading-none shrink-0 ${priorityColor}`}>
                                    {notif.priority}
                                  </span>
                                  {notif.category && (
                                    <span className="text-[7px] font-black uppercase px-1 rounded border border-slate-700/60 text-slate-400 tracking-wide leading-none shrink-0">
                                      {notif.category}
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold break-words">
                                  {notif.message}
                                </p>

                                {/* Optional Metadata Render */}
                                {(notif.metadata?.brandName || notif.metadata?.city) && (
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[9px] font-bold text-slate-500">
                                    {notif.metadata?.brandName && (
                                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        Brand: {notif.metadata.brandName}
                                      </span>
                                    )}
                                    {notif.metadata?.city && (
                                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-455 border border-rose-550/20">
                                        City: {notif.metadata.city}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[9px] text-slate-500 font-bold">{formatRelativeTime(notif.createdAt)}</span>
                                  
                                  {/* Optional Action URL Link */}
                                  {notif.actionUrl && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (notif.actionUrl.includes('mentions')) setActiveTab('mentions');
                                        else if (notif.actionUrl.includes('reports')) setActiveTab('reports');
                                        else if (notif.actionUrl.includes('analytics')) setActiveTab('analytics');
                                        else if (notif.actionUrl.includes('dashboard')) setActiveTab('dashboard');
                                        setShowNotifications(false);
                                      }}
                                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-550 text-white text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                      Action
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Hover controls right-side */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shrink-0 self-center">
                                {!notif.isRead && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); markNotificationAsRead(notif._id); }}
                                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                    title="Mark as read"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                                  className="p-1 rounded bg-rose-950/20 hover:bg-rose-900/30 text-rose-455 border border-rose-900/20 transition-all cursor-pointer"
                                  title="Delete notification"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <motion.button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2.5 p-1 pr-3 rounded-full bg-slate-100/30 dark:bg-slate-900/20 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 transition-all text-left shadow-sm active:scale-98 cursor-pointer text-slate-200 focus:outline-none"
              >
                <div 
                  className="relative rounded-full overflow-hidden border border-slate-300 dark:border-slate-750 shrink-0"
                  style={{ width: '30px', height: '30px' }}
                >
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={user?.name} 
                      className="w-full h-full object-cover object-center rounded-full block" 
                      style={{ transform: 'none', scale: 'none', zoom: 'none', maxWidth: 'none', maxHeight: 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs">
                      {getInitials(user?.name)}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white dark:border-[#05070f] animate-pulse z-10" />
                </div>
                <div className="hidden sm:block pr-1.5">
                  <p className="text-xxs font-black leading-none text-slate-800 dark:text-slate-200">{user?.name}</p>
                  <p className="text-[8px] text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-widest leading-none mt-1">{getProfessionalRole(user?.role)}</p>
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500 hidden sm:block mr-0.5" />
              </motion.button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-3 w-56 theme-dropdown backdrop-blur-2xl rounded-2xl z-[9999] overflow-hidden py-2 animate-scale-up">
                  <div className="px-4 py-3 border-b bg-slate-950/10 dark:bg-slate-950/20" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 truncate mt-0.5">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveTab('profile-view');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <User className="h-4.5 w-4.5 text-slate-400" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('profile-edit');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings className="h-4.5 w-4.5 text-slate-400" />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('profile-password');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings className="h-4.5 w-4.5 text-slate-400" style={{ transform: 'rotate(45deg)' }} />
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('profile-settings');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings className="h-4.5 w-4.5 text-slate-400" />
                      Account Settings
                    </button>
                  </div>

                  <div className="border-t pt-1 mt-1" style={{ borderColor: 'var(--color-border)' }}>
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-955/20 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4.5 w-4.5" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] flex md:hidden">
            <div className="fixed inset-0 bg-slate-950/80 dark:bg-[#05070f]/80 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 z-50 animate-scale-up text-slate-900 dark:text-slate-100">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3 pb-6 border-b border-slate-200 dark:border-slate-800 mb-6">
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-85 text-left focus:outline-none"
                >
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg">
                    B
                  </div>
                  <h1 className="font-extrabold text-md text-slate-900 dark:text-white leading-none">BrandPulse AI</h1>
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg border border-indigo-500/20'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </button>
                  );
                })}
              </nav>

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20 mt-6 border border-transparent cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          {/* Main Content Viewport */}
          <main className="flex-1 overflow-visible p-6 md:p-8 space-y-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="theme-footer border-t py-6 px-6 md:px-8 transition-colors duration-300 shrink-0 z-30 w-full" style={{ color: 'var(--color-text-muted)' }}>
            <div className="max-w-7xl mx-auto space-y-4">
              {/* Top row */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Left Column */}
                <div className="text-left space-y-1">
                  <span className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">BrandPulse AI</span>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">AI-Powered Regional Brand Intelligence Platform</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium italic">"Turning Regional Conversations into Business Intelligence"</p>
                </div>

                {/* Right Column */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] font-extrabold uppercase tracking-wider">
                  <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</a>
                  <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</a>
                  <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Documentation</a>
                  <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Support</a>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/30 flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">
                <span>&copy; 2026 BrandPulse AI • Version 1.0 • All Rights Reserved</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Search Command Palette Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[100000] flex items-start justify-center p-4 sm:p-10 select-none">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 theme-modal-overlay backdrop-blur-md"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-xl theme-modal rounded-3xl z-50 overflow-hidden mt-10 md:mt-20 flex flex-col max-h-[70vh] border"
            >
              {/* Glow accents */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              
              {/* Search input header */}
              <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3 relative z-10">
                <Search className={`h-5 w-5 text-slate-400 dark:text-slate-500 ${isSearching ? 'animate-spin text-indigo-500' : ''}`} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search brands, mentions, reports, or pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm font-semibold"
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Search results body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {isSearching ? (
                  /* Loading State */
                  <div className="text-center py-10 space-y-2">
                    <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin mx-auto" />
                    <p className="text-xxs uppercase tracking-wider text-slate-450">Indexing workspace resources...</p>
                  </div>
                ) : searchQuery.trim() === "" ? (
                  /* Recent / Suggested searches state */
                  <div className="space-y-4 p-2">
                    {recentSearches.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-left block">Recent Searches</span>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((term, i) => (
                            <button
                              key={i}
                              onClick={() => setSearchQuery(term)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 text-xxs text-slate-600 dark:text-slate-300 font-bold transition-all cursor-pointer"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-left block">Quick Navigation</span>
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                        {navItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleNavigation(item.id)}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-900/40 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/50 text-slate-600 dark:text-slate-300 text-left transition-all cursor-pointer"
                          >
                            <item.icon className="h-4 w-4 text-slate-400" />
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : filteredResults.length === 0 ? (
                  /* No Results State */
                  <div className="text-center py-10 space-y-2">
                    <Search className="h-8 w-8 text-slate-350 dark:text-slate-650 mx-auto" />
                    <p className="text-xxs uppercase tracking-wider text-slate-450">No matches found for "{searchQuery}"</p>
                  </div>
                ) : (
                  /* Search Results Lists categorized */
                  <div className="space-y-4">
                    {['Navigation', 'Brands', 'Mentions', 'Reports'].map((category) => {
                      const categoryItems = filteredResults.filter(item => item.category === category);
                      if (categoryItems.length === 0) return null;
                      return (
                        <div key={category} className="space-y-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2.5 block text-left">{category}</span>
                          <div className="space-y-1">
                            {categoryItems.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleResultClick(item)}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/40 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/50 text-slate-700 dark:text-slate-200 text-left transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {category === 'Navigation' && <LayoutDashboard className="h-4 w-4 text-slate-450 group-hover:text-indigo-500 transition-colors" />}
                                  {category === 'Brands' && <Building className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />}
                                  {category === 'Mentions' && <Megaphone className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />}
                                  {category === 'Reports' && <FileText className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />}
                                  
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</p>
                                    {item.subtitle && <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.subtitle}</p>}
                                  </div>
                                </div>
                                <span className="text-[8px] font-extrabold uppercase bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                                  Select
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Command Palette footer */}
              <div className="p-3 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-200/80 dark:border-slate-800/80 text-[9px] text-slate-500 dark:text-slate-500 font-extrabold uppercase tracking-widest flex justify-between shrink-0">
                <span>Use mouse or keyboard to navigate</span>
                <span>ESC to close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Assistant Sliding Panel Drawer */}
      <AIAssistantPanel
        brandId={selectedBrandId}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      {/* Notification Details Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-[#070a13]/85 backdrop-blur-sm" onClick={() => setSelectedNotif(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-[100000] text-slate-850 dark:text-slate-100 backdrop-blur-xl animate-slide-up max-h-[90vh] overflow-y-auto overflow-x-hidden">
            {/* Accent light decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-250 dark:border-slate-800/80 pb-3.5 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-indigo-400" />
                Notification Audit Details
              </h3>
              <button 
                onClick={() => setSelectedNotif(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
              <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-wider">
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-200/60 dark:border-slate-850 flex flex-col gap-1">
                  <span className="text-slate-500">Target Brand</span>
                  <span className="text-indigo-400">{selectedNotif.metadata?.brandName || 'System'}</span>
                </div>
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-200/60 dark:border-slate-850 flex flex-col gap-1">
                  <span className="text-slate-500">Alert Priority</span>
                  <span className={`px-2 py-0.5 rounded border self-start ${
                    selectedNotif.priority === 'HIGH' ? 'bg-rose-500/10 border-rose-500/20 text-rose-455' :
                    selectedNotif.priority === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  }`}>
                    {selectedNotif.priority}
                  </span>
                </div>
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-200/60 dark:border-slate-850 flex flex-col gap-1">
                  <span className="text-slate-500">Category</span>
                  <span className="text-blue-400">{selectedNotif.category || 'general'}</span>
                </div>
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-200/60 dark:border-slate-850 flex flex-col gap-1">
                  <span className="text-slate-500">Audit Time</span>
                  <span className="text-slate-205 lowercase">{new Date(selectedNotif.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Alert Title</span>
                <p className="bg-slate-950/20 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-850 text-xs font-bold text-slate-900 dark:text-slate-200">
                  {selectedNotif.title}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Alert Summary</span>
                <p className="bg-slate-950/20 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-850 text-xs font-normal text-slate-850 dark:text-slate-300 leading-relaxed">
                  {selectedNotif.message}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">AI Safety Recommendation</span>
                <p className="bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/15 text-xs font-normal text-slate-800 dark:text-slate-300 leading-relaxed">
                  {selectedNotif.category === 'threat' ? 'Immediate escalation requested. Monitor brand reputation indexes and identify local consumer complaints.' : 
                   selectedNotif.category === 'sentiment' ? 'Promote positive user reviews via digital campaigns to capitalize on trending customer interest.' :
                   selectedNotif.category === 'ai' ? 'Analyze highlighted trend aggregates to optimize future brand positioning strategies.' :
                   'Standard system status alert. No specific action recommended.'}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200/80 dark:border-slate-800/80 gap-3">
                <div className="flex items-center gap-2">
                  {!selectedNotif.isRead && (
                    <button
                      onClick={() => {
                        markNotificationAsRead(selectedNotif._id);
                        setSelectedNotif(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      deleteNotification(selectedNotif._id);
                      setSelectedNotif(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-950/20 hover:bg-rose-900/30 text-rose-455 border border-rose-900/20 font-bold text-xs transition-all cursor-pointer"
                  >
                    Delete Alert
                  </button>
                </div>

                {selectedNotif.actionUrl && (
                  <button
                    onClick={() => {
                      if (selectedNotif.actionUrl.includes('mentions')) setActiveTab('mentions');
                      else if (selectedNotif.actionUrl.includes('reports')) setActiveTab('reports');
                      else if (selectedNotif.actionUrl.includes('analytics')) setActiveTab('analytics');
                      else if (selectedNotif.actionUrl.includes('dashboard')) setActiveTab('dashboard');
                      setSelectedNotif(null);
                      setShowNotifications(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-800 font-bold text-xs transition-all cursor-pointer"
                  >
                    Open Page
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
