/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  Building, 
  Phone, 
  Mail, 
  Camera, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Clock,
  User,
  Lock,
  Upload,
  RotateCw,
  ZoomIn,
  Bot,
  Bell,
  Eye,
  Shield,
  Download,
  AlertTriangle
} from 'lucide-react';
import { getUserAvatarUrl, getInitials } from '../utils/avatar';

interface ProfileProps {
  initialSubTab?: 'view' | 'edit' | 'password' | 'settings';
  setActiveTab?: (tab: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ initialSubTab = 'view', setActiveTab }) => {
  const { user, updateUser } = useAuth();
  const [subTab, setSubTab] = useState<'view' | 'edit' | 'password' | 'settings'>(initialSubTab);

  // Edit Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [company, setCompany] = useState(user?.company || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Image Editor Modal State
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.2);
  const [rotation, setRotation] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [tempPreviewUrl, setTempPreviewUrl] = useState('');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notifications State
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── SETTINGS TAB STATE ────────────────────────────────────────────
  const { theme, toggleTheme } = useAuth() as any;

  // The "saved" baseline loaded from backend
  const [savedSettings, setSavedSettings] = useState<Record<string, any> | null>(null);

  // Live form state (what the user is editing)
  const [settings, setSettings] = useState({
    workspaceName: '',
    timezone: 'UTC+05:30 (IST)',
    language: 'English (US)',
    region: 'India / South Asia',
    aiAssistantEnabled: true,
    autoAiInsights: true,
    autoExecReports: false,
    aiResponseLanguage: 'English',
    emailNotifications: true,
    riskAlertNotifications: true,
    weeklySummary: false,
    desktopNotifications: false,
    theme: 'dark',
    compactLayout: false,
    sidebarCollapsed: false,
    defaultPdfFormat: true,
    includeCharts: true,
    includeExecutiveSummary: true,
  });

  // Security info from backend
  const [security, setSecurity] = useState<{
    activeSessions: number;
    twoFactorEnabled: boolean;
    lastLogin: string | null;
    lastLoginDays: number | null;
    passwordLastChangedDays: number;
  } | null>(null);

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Danger zone modals
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerSubmitting, setDangerSubmitting] = useState(false);

  // Unsaved-changes leave confirmation
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingSubTab, setPendingSubTab] = useState<'view' | 'edit' | 'password' | 'settings' | string | null>(null);

  // Load settings from backend whenever we switch to the settings tab
  useEffect(() => {
    if (subTab === 'settings') {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  useEffect(() => {
    window.isSettingsDirty = isDirty;
    return () => {
      window.isSettingsDirty = false;
    };
  }, [isDirty]);

  useEffect(() => {
    window.handleSettingsTabSwitchInterception = (pendingTab: any) => {
      setPendingSubTab(pendingTab);
      setShowLeaveModal(true);
    };
    return () => {
      delete window.handleSettingsTabSwitchInterception;
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (window.isSettingsDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Do you want to save before leaving?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        const s = res.data.data.settings;
        const loaded = {
          workspaceName: s.workspaceName || user?.company || '',
          timezone: s.timezone || 'UTC+05:30 (IST)',
          language: s.language || 'English (US)',
          region: s.region || 'India / South Asia',
          aiAssistantEnabled: s.aiAssistantEnabled ?? true,
          autoAiInsights: s.autoAiInsights ?? true,
          autoExecReports: s.autoExecReports ?? false,
          aiResponseLanguage: s.aiResponseLanguage || 'English',
          emailNotifications: s.emailNotifications ?? true,
          riskAlertNotifications: s.riskAlertNotifications ?? true,
          weeklySummary: s.weeklySummary ?? false,
          desktopNotifications: s.desktopNotifications ?? false,
          theme: s.theme || 'dark',
          compactLayout: s.compactLayout ?? false,
          sidebarCollapsed: s.sidebarCollapsed ?? false,
          defaultPdfFormat: s.defaultPdfFormat ?? true,
          includeCharts: s.includeCharts ?? true,
          includeExecutiveSummary: s.includeExecutiveSummary ?? true,
        };
        setSettings(loaded);
        setSavedSettings(loaded);
        setSecurity(res.data.data.security);
        setIsDirty(false);
      }
    } catch {
      showToast(false, 'Failed to load settings. Please try again.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Detect dirty state on every settings change
  const updateSetting = (key: string, value: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      setIsDirty(savedSettings ? JSON.stringify(next) !== JSON.stringify(savedSettings) : true);
      
      // Apply instantly:
      if (key === 'compactLayout') {
        const root = window.document.documentElement;
        if (value) {
          root.classList.add('compact-layout');
          localStorage.setItem('compact-layout', 'true');
        } else {
          root.classList.remove('compact-layout');
          localStorage.setItem('compact-layout', 'false');
        }
      }
      if (key === 'sidebarCollapsed') {
        localStorage.setItem('sidebar-collapsed', String(value));
        window.dispatchEvent(new CustomEvent('sync-sidebar-collapse', { detail: value }));
      }
      
      return next;
    });
  };

  const handleSaveSettings = async () => {
    if (!settings.workspaceName.trim()) {
      showToast(false, 'Workspace name cannot be empty.');
      return false;
    }
    setSettingsSaving(true);
    try {
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        setSavedSettings({ ...settings });
        setIsDirty(false);
        showToast(true, '✓ Settings updated successfully.');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Failed to save settings.');
      return false;
    } finally {
      setSettingsSaving(false);
    }
  };

  // Intercept tab switching if dirty
  const handleTabSwitch = (tab: 'view' | 'edit' | 'password' | 'settings') => {
    if (isDirty && subTab === 'settings' && tab !== 'settings') {
      setPendingSubTab(tab);
      setShowLeaveModal(true);
    } else {
      setSubTab(tab);
    }
  };

  const handleLeaveDiscard = () => {
    if (savedSettings) {
      setSettings(savedSettings as any);
      if (savedSettings.theme !== theme) {
        toggleTheme();
      }
      const root = window.document.documentElement;
      if (savedSettings.compactLayout) {
        root.classList.add('compact-layout');
        localStorage.setItem('compact-layout', 'true');
      } else {
        root.classList.remove('compact-layout');
        localStorage.setItem('compact-layout', 'false');
      }
      localStorage.setItem('sidebar-collapsed', String(savedSettings.sidebarCollapsed ?? false));
      window.dispatchEvent(new CustomEvent('sync-sidebar-collapse', { detail: savedSettings.sidebarCollapsed ?? false }));
    }
    setIsDirty(false);
    setShowLeaveModal(false);
    if (pendingSubTab) {
      if (['view', 'edit', 'password', 'settings'].includes(pendingSubTab)) {
        setSubTab(pendingSubTab as any);
      } else if (setActiveTab) {
        setActiveTab(pendingSubTab);
      }
    }
    setPendingSubTab(null);
  };

  const handleLeaveSaveAndGo = async () => {
    const success = await handleSaveSettings();
    if (success) {
      setShowLeaveModal(false);
      if (pendingSubTab) {
        if (['view', 'edit', 'password', 'settings'].includes(pendingSubTab)) {
          setSubTab(pendingSubTab as any);
        } else if (setActiveTab) {
          setActiveTab(pendingSubTab);
        }
      }
      setPendingSubTab(null);
    }
  };

  const handleLeaveCancel = () => {
    setShowLeaveModal(false);
    setPendingSubTab(null);
  };

  const handleDeleteWorkspace = async () => {
    setDangerSubmitting(true);
    try {
      const res = await api.delete('/settings/delete-workspace', { data: { password: dangerPassword } });
      if (res.data.success) {
        setShowDeleteWorkspaceModal(false);
        setDangerPassword('');
        showToast(true, 'Workspace data deleted. All brands, mentions, and reports removed.');
      }
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Failed to delete workspace. Check your password.');
    } finally {
      setDangerSubmitting(false);
    }
  };

  const { logout } = useAuth() as any;
  const handleDeleteAccount = async () => {
    setDangerSubmitting(true);
    try {
      const res = await api.delete('/settings/delete-account', { data: { password: dangerPassword } });
      if (res.data.success) {
        setShowDeleteAccountModal(false);
        showToast(true, 'Account deleted. Logging out…');
        setTimeout(() => logout(), 1500);
      }
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Failed to delete account. Check your password.');
    } finally {
      setDangerSubmitting(false);
    }
  };

  const formatDaysAgo = (days: number | null | undefined): string => {
    if (days === null || days === undefined) return 'Unknown';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  };
  // ─── END SETTINGS STATE ────────────────────────────────────────────

  // Sync state if initialSubTab prop changes
  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Sync form inputs if user object loads/changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setPhoneNumber(user.phoneNumber || '');
      setCompany(user.company || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const showToast = (success: boolean, message: string) => {
    setToast({ success, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadTempFile(e.dataTransfer.files[0]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
  };

  const clampOffset = (x: number, y: number, currentZoom: number) => {
    const C = 176;
    if (!tempPreviewUrl) return { x, y };
    
    if (!imgRef.current) return { x, y };
    const imgWidth = imgRef.current.naturalWidth;
    const imgHeight = imgRef.current.naturalHeight;
    if (!imgWidth || !imgHeight) return { x, y };
    
    const isSwapped = (rotation / 90) % 2 !== 0;
    const imgRatio = isSwapped ? imgHeight / imgWidth : imgWidth / imgHeight;
    
    let w = C * currentZoom;
    let h = C * currentZoom;
    if (imgRatio > 1) {
      w = C * imgRatio * currentZoom;
    } else {
      h = (C / imgRatio) * currentZoom;
    }
    
    const maxX = w > C ? (w - C) / 2 : 0;
    const maxY = h > C ? (h - C) / 2 : 0;
    
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const nextX = e.clientX - dragStart.x;
    const nextY = e.clientY - dragStart.y;
    
    setPanOffset(clampOffset(nextX, nextY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - panOffset.x,
      y: e.touches[0].clientY - panOffset.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const nextX = e.touches[0].clientX - dragStart.x;
    const nextY = e.touches[0].clientY - dragStart.y;
    
    setPanOffset(clampOffset(nextX, nextY, zoom));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Sync panOffset clamping when zoom or rotation changes
  useEffect(() => {
    if (tempPreviewUrl) {
      setPanOffset(prev => clampOffset(prev.x, prev.y, zoom));
    }
  }, [rotation, zoom]);

  const loadTempFile = (selectedFile: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      showToast(false, 'Invalid format. Please select a JPG, PNG, or WEBP image file.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      showToast(false, 'Image file exceeds maximum limit of 5MB.');
      return;
    }
    
    const objectUrl = URL.createObjectURL(selectedFile);
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      const imgRatio = img.width / img.height;
      // Calculate containing fit zoom
      const fitZoom = Math.max(0.1, Math.min(1, imgRatio, 1 / imgRatio));
      
      setTempFile(selectedFile);
      setTempPreviewUrl(objectUrl);
      setZoom(fitZoom);
      setMinZoom(fitZoom);
      setRotation(0);
      
      // Portrait face centering heuristic: position the face (top 30% of image height) in the center of crop circle
      let initialY = 0;
      if (imgRatio < 1) {
        const C = 176;
        const h = C / imgRatio;
        initialY = 0.2 * h * fitZoom;
      }
      setPanOffset({ x: 0, y: initialY });
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadTempFile(e.target.files[0]);
    }
  };

  const handleSaveCroppedImage = () => {
    if (!tempFile) return;

    const img = new Image();
    img.src = tempPreviewUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 300;
      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      const scaleFactor = 300 / 176;
      const canvasOffsetX = panOffset.x * scaleFactor;
      const canvasOffsetY = panOffset.y * scaleFactor;
      ctx.translate(size / 2 + canvasOffsetX, size / 2 + canvasOffsetY);
      ctx.rotate((rotation * Math.PI) / 180);

      const imgRatio = img.width / img.height;
      let drawWidth = size * zoom;
      let drawHeight = size * zoom;

      if (imgRatio > 1) {
        drawWidth = size * zoom;
        drawHeight = (size / imgRatio) * zoom;
      } else {
        drawHeight = size * zoom;
        drawWidth = (size * imgRatio) * zoom;
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
          setFile(croppedFile);
          setPreviewUrl(URL.createObjectURL(croppedFile));

          if (user) {
            localStorage.removeItem(`avatar-removed-${user._id || user.id}`);
          }
          setZoom(1);
          setRotation(0);
          setPanOffset({ x: 0, y: 0 });
          setShowEditorModal(false);
          showToast(true, 'Avatar processed! Save profile settings to finalize.');
        }
      }, 'image/png');
    };
  };

  const handleRemovePhoto = () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to remove your profile photo?')) {
      localStorage.setItem(`avatar-removed-${user._id || user.id}`, 'true');
      setFile(null);
      setPreviewUrl('');
      
      // Force trigger state update in auth context
      updateUser({ ...user });
      showToast(true, 'Profile photo removed.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('username', username);
    formData.append('phoneNumber', phoneNumber);
    formData.append('company', company);
    formData.append('bio', bio);
    if (file) {
      formData.append('profileImage', file);
    }

    try {
      const res = await api.put('/users/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        updateUser(res.data.data);
        showToast(true, 'Profile details updated successfully!');
        setSubTab('view');
      }
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Failed to update profile details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(false, 'New passwords do not match.');
      return;
    }
    setSubmitting(true);

    try {
      const res = await api.put('/users/change-password', {
        oldPassword,
        newPassword,
      });

      if (res.data.success) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast(true, 'Password updated successfully!');
      }
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Password update failed. Verify current credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get dynamic profile image url
  const getProfileImageUrl = () => {
    if (previewUrl) return previewUrl;
    return getUserAvatarUrl(user);
  };

  const hasImage = !!previewUrl || !!getUserAvatarUrl(user);

  // Helper for professional role title
  const getProfessionalRole = (role: string | undefined) => {
    if (role === 'admin') return 'Brand Intelligence Manager';
    return 'Brand Intelligence Analyst';
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all ${
          toast.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-emerald-950/40' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-450 shadow-rose-950/40'
        }`}>
          {toast.success ? <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-rose-500 dark:text-rose-400" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Profile Banner Card */}
      <div className="glass-panel p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center relative overflow-hidden transition-all bg-slate-900/40 border-slate-800">
        <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
        
        {/* Avatar View Block */}
        <div className="flex flex-col items-center gap-2 relative">
          <div 
            onClick={() => {
              setTempFile(null);
              setTempPreviewUrl('');
              setZoom(1);
              setRotation(0);
              setPanOffset({ x: 0, y: 0 });
              setShowEditorModal(true);
            }}
            className="relative group h-24 w-24 rounded-full overflow-hidden cursor-pointer border-2 border-indigo-500 hover:border-indigo-400 shadow-lg"
            title="Edit Profile Photo"
          >
            {hasImage ? (
              <img 
                src={getProfileImageUrl()} 
                alt={user?.name} 
                className="w-full h-full object-cover object-center rounded-full block transition-opacity duration-200 group-hover:opacity-75" 
                style={{ transform: 'none', scale: 'none', zoom: 'none', maxWidth: 'none', maxHeight: 'none' }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-3xl shadow-lg transition-opacity duration-200 group-hover:opacity-75">
                {getInitials(user?.name)}
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="h-5 w-5" />
            </div>
          </div>

          <div className="flex gap-1.5 mt-2 select-none shrink-0">
            <button
              type="button"
              onClick={() => {
                setTempFile(null);
                setTempPreviewUrl('');
                setZoom(1);
                setRotation(0);
                setPanOffset({ x: 0, y: 0 });
                setShowEditorModal(true);
              }}
              className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-750 text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              📷 Change Photo
            </button>
            {hasImage && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/30 text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                🗑 Remove Photo
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-1 relative">
          <h2 className="text-2xl font-black tracking-tight text-white">{user?.name}</h2>
          <p className="text-xs font-bold text-slate-400">
            {user?.username ? `@${user.username}` : 'Username not set'}
          </p>
          {!user?.username && (
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Complete your profile from Edit Profile.
            </p>
          )}
          <span className="inline-block px-3 py-0.5 mt-2 rounded-full text-xxs font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {getProfessionalRole(user?.role)}
          </span>
        </div>

        {/* Custom Tab Toggles */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800/80 text-xs font-semibold relative flex-wrap justify-center gap-1 shadow-inner">
          <button 
            onClick={() => handleTabSwitch('view')} 
            className={`px-4 py-2 rounded-xl transition-all ${subTab === 'view' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => handleTabSwitch('edit')} 
            className={`px-4 py-2 rounded-xl transition-all ${subTab === 'edit' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
          >
            Edit Profile
          </button>
          <button 
            onClick={() => handleTabSwitch('password')} 
            className={`px-4 py-2 rounded-xl transition-all ${subTab === 'password' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
          >
            Password
          </button>
          <button 
            onClick={() => handleTabSwitch('settings')} 
            className={`px-4 py-2 rounded-xl transition-all ${subTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Dynamic Sub-tab Panel */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* OVERVIEW DETAILS */}
        {subTab === 'view' && (
          <div className="glass-panel p-6 md:p-8 space-y-6 bg-slate-900/40 border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 uppercase tracking-wider">My Profile Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Mail className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                  <p className="font-bold text-slate-200 mt-0.5">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Phone className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                  <p className="font-bold text-slate-200 mt-0.5">{user?.phoneNumber || 'Not configured'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Building className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company / Organization</p>
                  <p className="font-bold text-slate-200 mt-0.5">
                    {user?.company || user?.organization?.name || 'Not configured'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Calendar className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member Since</p>
                  <p className="font-bold text-slate-200 mt-0.5">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 col-span-1 md:col-span-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Clock className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Login Session</p>
                  <p className="font-bold text-slate-200 mt-0.5">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Active Session'}
                  </p>
                </div>
              </div>
            </div>

            {user?.bio && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">User Bio</p>
                <p className="text-slate-350 text-xs italic leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800">{user.bio}</p>
              </div>
            )}
          </div>
        )}

        {/* EDIT PROFILE */}
        {subTab === 'edit' && (
          <div className="glass-panel p-6 md:p-8 bg-slate-900/40 border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 mb-6 uppercase tracking-wider">Modify Profile Data</h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-5 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                      placeholder="Alex Johnson"
                    />
                    <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                      placeholder="alex_johnson"
                    />
                    <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Phone Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                      placeholder="+1 (555) 000-0000"
                    />
                    <Phone className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Company</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                      placeholder="Company name"
                    />
                    <Building className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">User Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  placeholder="Describe yourself..."
                  maxLength={500}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-600 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CHANGE PASSWORD */}
        {subTab === 'password' && (
          <div className="glass-panel p-6 md:p-8 bg-slate-900/40 border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 mb-6 uppercase tracking-wider">Security Settings</h3>
            
            <form onSubmit={handleChangePassword} className="space-y-5 text-xs font-semibold max-w-md">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Current Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                    placeholder="••••••••"
                  />
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                    placeholder="••••••••"
                  />
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                    placeholder="••••••••"
                  />
                  <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ACCOUNT SETTINGS */}
        {subTab === 'settings' && settingsLoading && (
          <div className="flex justify-center items-center py-20">
            <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        {subTab === 'settings' && !settingsLoading && (
          <div className="space-y-6">
            
            {/* Grid of settings categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* GENERAL */}
              <div className="glass-panel p-5 bg-slate-900/40 border-slate-800 space-y-4 hover:border-slate-700/60 transition-all duration-300">
                <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
                  <Building className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">General Settings</h3>
                </div>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Workspace Name</label>
                    <input 
                      type="text" 
                      value={settings.workspaceName}
                      onChange={(e) => updateSetting('workspaceName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Organization</label>
                    <input 
                      type="text" 
                      disabled
                      defaultValue={user?.company || 'BrandPulse Enterprise'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/30 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Time Zone</label>
                      <select 
                        value={settings.timezone}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="UTC+05:30 (IST)">UTC +05:30 (IST)</option>
                        <option value="UTC+00:00 (GMT)">UTC +00:00 (GMT)</option>
                        <option value="UTC-05:00 (EST)">UTC -05:00 (EST)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Language</label>
                      <select 
                        value={settings.language}
                        onChange={(e) => updateSetting('language', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="Hindi (IN)">Hindi (IN)</option>
                        <option value="Spanish (ES)">Spanish (ES)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Region</label>
                    <select 
                      value={settings.region}
                      onChange={(e) => updateSetting('region', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="India / South Asia">India / South Asia</option>
                      <option value="North America">North America</option>
                      <option value="Europe">Europe</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AI PREFERENCES */}
              <div className="glass-panel p-5 bg-slate-900/40 border-slate-800 space-y-4 hover:border-slate-700/60 transition-all duration-300">
                <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">AI Preferences</h3>
                </div>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Enable AI Workspace Assistant</p>
                      <p className="text-[10px] text-slate-500">Provide sidebar chat assistance</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.aiAssistantEnabled}
                      onChange={(e) => updateSetting('aiAssistantEnabled', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Auto AI Insights</p>
                      <p className="text-[10px] text-slate-500">Compute analytics stats automatically</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.autoAiInsights}
                      onChange={(e) => updateSetting('autoAiInsights', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Auto Executive Reports</p>
                      <p className="text-[10px] text-slate-500">Generate summaries with Gemini automatically</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.autoExecReports}
                      onChange={(e) => updateSetting('autoExecReports', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">AI Response Language</label>
                    <select 
                      value={settings.aiResponseLanguage}
                      onChange={(e) => updateSetting('aiResponseLanguage', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="English">English</option>
                      <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                      <option value="Bilingual (English + Hindi)">Bilingual (English + Hindi)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* NOTIFICATIONS */}
              <div className="glass-panel p-5 bg-slate-900/40 border-slate-800 space-y-4 hover:border-slate-700/60 transition-all duration-300">
                <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
                  <Bell className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">Notifications</h3>
                </div>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-0.5">
                    <div>
                      <p className="font-bold text-slate-200">Email Notifications</p>
                      <p className="text-[10px] text-slate-500">Receive alerts via email</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.emailNotifications}
                      onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <div>
                      <p className="font-bold text-slate-200">Risk Alert Notifications</p>
                      <p className="text-[10px] text-slate-500">Notify on critical sentiment shifts</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.riskAlertNotifications}
                      onChange={(e) => updateSetting('riskAlertNotifications', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <div>
                      <p className="font-bold text-slate-200">Weekly AI Summary</p>
                      <p className="text-[10px] text-slate-500">Receive weekly PDF analytics updates</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.weeklySummary}
                      onChange={(e) => updateSetting('weeklySummary', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <div>
                      <p className="font-bold text-slate-200">Desktop Notifications</p>
                      <p className="text-[10px] text-slate-500">Show push alerts inside web browser</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.desktopNotifications}
                      onChange={(e) => updateSetting('desktopNotifications', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                </div>
              </div>

              {/* APPEARANCE */}
              <div className="glass-panel p-5 bg-slate-900/40 border-slate-800 space-y-4 hover:border-slate-700/60 transition-all duration-300">
                <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
                  <Eye className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">Appearance</h3>
                </div>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Dark Mode (Default)</p>
                      <p className="text-[10px] text-slate-500">Use enterprise dark-theme variables</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.theme === 'dark'}
                      onChange={(e) => {
                        const isDark = e.target.checked;
                        const newTheme = isDark ? 'dark' : 'light';
                        updateSetting('theme', newTheme);
                        if (newTheme !== theme) {
                          toggleTheme();
                        }
                      }}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Compact Layout</p>
                      <p className="text-[10px] text-slate-500">Reduce margins for maximum density</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.compactLayout}
                      onChange={(e) => updateSetting('compactLayout', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Sidebar Collapse Preference</p>
                      <p className="text-[10px] text-slate-500">Keep sidebar collapsed on login</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.sidebarCollapsed}
                      onChange={(e) => updateSetting('sidebarCollapsed', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                </div>
              </div>

              {/* SECURITY */}
              <div className="glass-panel p-5 bg-slate-900/40 border-slate-800 space-y-4 hover:border-slate-700/60 transition-all duration-300">
                <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
                  <Shield className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">Security</h3>
                </div>
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <div>
                      <p className="font-bold text-slate-200">Active Sessions</p>
                      <p className="text-[10px] text-slate-500">{security?.activeSessions || 1} active session(s) (this browser)</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">Online</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <div>
                      <p className="font-bold text-slate-200">Two-Factor Authentication</p>
                      <p className="text-[10px] text-slate-500">{security?.twoFactorEnabled ? 'Enabled' : 'Add an extra layer of security'}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${security?.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-450 border border-slate-700'}`}>
                      {security?.twoFactorEnabled ? 'Enabled' : 'Coming Soon'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <div>
                      <p className="font-bold text-slate-200">Login History</p>
                      <p className="text-[10px] text-slate-500">Last login trace captured</p>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono font-bold">
                      {security?.lastLoginDays !== null && security?.lastLoginDays !== undefined ? formatDaysAgo(security?.lastLoginDays) : 'Today'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <div>
                      <p className="font-bold text-slate-200">Password Last Changed</p>
                      <p className="text-[10px] text-slate-500">Credential update interval check</p>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                      {security?.passwordLastChangedDays !== undefined ? formatDaysAgo(security.passwordLastChangedDays) : '30 Days Ago'}
                    </span>
                  </div>
                </div>
              </div>

              {/* EXPORTS */}
              <div className="glass-panel p-5 bg-slate-900/40 border-slate-800 space-y-4 hover:border-slate-700/60 transition-all duration-300">
                <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
                  <Download className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">Exports</h3>
                </div>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Default PDF Format</p>
                      <p className="text-[10px] text-slate-500">Use A4 premium grid layout</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.defaultPdfFormat}
                      onChange={(e) => updateSetting('defaultPdfFormat', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Auto Include Charts</p>
                      <p className="text-[10px] text-slate-500">Embed SVG charts inside PDF exports</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.includeCharts}
                      onChange={(e) => updateSetting('includeCharts', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="font-bold text-slate-200">Include Executive Summary</p>
                      <p className="text-[10px] text-slate-500">Append Gemini AI analyst summary block</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.includeExecutiveSummary}
                      onChange={(e) => updateSetting('includeExecutiveSummary', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer" 
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* DANGER ZONE */}
            <div className="glass-panel p-5 bg-slate-900/10 border border-rose-500/25 space-y-4 hover:border-rose-500/45 transition-all duration-300">
              <div className="flex items-center gap-2.5 border-b border-rose-500/20 pb-3">
                <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Danger Zone</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* Delete Workspace */}
                <div className="p-4 rounded-xl bg-rose-955/10 border border-rose-900/25 flex flex-col justify-between gap-3">
                  <div>
                    <p className="font-bold text-rose-200">Delete Workspace Data</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Permanently erase all monitored brands, mentions, and generated PDF reports.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowDeleteWorkspaceModal(true)}
                    className="w-fit px-4 py-1.5 rounded-lg bg-rose-955/10 hover:bg-rose-900/35 border border-rose-900/50 text-rose-450 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer animate-fade-in"
                  >
                    Delete Workspace
                  </button>
                </div>

                {/* Delete Account */}
                <div className="p-4 rounded-xl bg-rose-955/10 border border-rose-900/25 flex flex-col justify-between gap-3">
                  <div>
                    <p className="font-bold text-rose-200">Delete Account Profile</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Permanently delete your profile identity and credentials. This action is irreversible.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowDeleteAccountModal(true)}
                    className="w-fit px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider shadow-md hover:shadow-rose-600/25 transition-all cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>

              </div>
            </div>

            {/* Save Changes Button */}
            <div className="flex justify-end pt-4 border-t border-slate-800/80">
              <button
                type="button"
                disabled={!isDirty || settingsSaving}
                onClick={handleSaveSettings}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-850 disabled:to-slate-850 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/20 disabled:shadow-none hover:shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {settingsSaving && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {settingsSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* UNSAVED CHANGES CONFIRMATION DIALOG MODAL */}
            {showLeaveModal && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 text-slate-100 animate-fade-in select-none">
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#070a13]/85 backdrop-blur-sm" onClick={handleLeaveCancel} />
                <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 text-xs font-semibold animate-slide-up">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  <h3 className="text-base font-black mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    Unsaved Changes
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm font-normal">
                    You have unsaved changes. Do you want to save before leaving?
                  </p>
                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLeaveCancel}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 text-slate-700 dark:text-slate-350 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLeaveDiscard}
                      className="px-4 py-2 rounded-xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-900/35 text-rose-500 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleLeaveSaveAndGo}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DELETE WORKSPACE CONFIRMATION DIALOG MODAL */}
            {showDeleteWorkspaceModal && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 text-slate-100 animate-fade-in select-none">
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#070a13]/85 backdrop-blur-sm" onClick={() => { setShowDeleteWorkspaceModal(false); setDangerPassword(''); }} />
                <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 text-xs font-semibold animate-slide-up">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                  <h3 className="text-base font-black mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 text-rose-500">
                    Delete Workspace Data
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm font-normal">
                    This action is <span className="font-bold text-rose-500">irreversible</span>. All monitored brands, mentions, analytics, and reports in this workspace will be permanently deleted.
                  </p>
                  <div className="mb-6">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={dangerPassword}
                      onChange={(e) => setDangerPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-350 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-300 outline-none focus:border-rose-500 transition-colors"
                      placeholder="Enter password to confirm"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setShowDeleteWorkspaceModal(false); setDangerPassword(''); }}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 text-slate-700 dark:text-slate-350 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!dangerPassword || dangerSubmitting}
                      onClick={handleDeleteWorkspace}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:bg-rose-800 text-white font-bold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {dangerSubmitting && (
                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {dangerSubmitting ? 'Deleting...' : 'Delete Workspace'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DELETE ACCOUNT CONFIRMATION DIALOG MODAL */}
            {showDeleteAccountModal && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 text-slate-100 animate-fade-in select-none">
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#070a13]/85 backdrop-blur-sm" onClick={() => { setShowDeleteAccountModal(false); setDangerPassword(''); }} />
                <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 text-xs font-semibold animate-slide-up">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                  <h3 className="text-base font-black mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 text-rose-500">
                    Delete Account Profile
                  </h3>
                  <p className="text-slate-650 dark:text-slate-400 mb-4 text-sm font-normal">
                    This action is <span className="font-bold text-rose-500">irreversible</span>. It will permanently delete your profile identity and credentials.
                  </p>
                  <div className="mb-6">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={dangerPassword}
                      onChange={(e) => setDangerPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-350 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-300 outline-none focus:border-rose-500 transition-colors"
                      placeholder="Enter password to confirm"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setShowDeleteAccountModal(false); setDangerPassword(''); }}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 text-slate-700 dark:text-slate-350 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!dangerPassword || dangerSubmitting}
                      onClick={handleDeleteAccount}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:bg-rose-800 text-white font-bold text-xs shadow-lg shadow-rose-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {dangerSubmitting && (
                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {dangerSubmitting ? 'Deleting...' : 'Delete Account'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* PREMIUM PROFILE PHOTO DIALOG MODAL */}
      {showEditorModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 text-slate-100 animate-fade-in select-none">
          {/* Overlay click away */}
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#070a13]/85 backdrop-blur-sm" onClick={() => setShowEditorModal(false)} />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 text-xs font-semibold animate-slide-up max-h-[95vh] overflow-y-auto">
            {/* Corner highlight glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <h3 className="text-base font-black mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              Profile Avatar Editor
            </h3>

            {/* Drag & Drop Area / Image Crop Viewport */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors relative min-h-[220px] flex flex-col justify-center items-center ${
                dragOver 
                  ? 'border-indigo-500 bg-indigo-950/20' 
                  : 'border-slate-800 bg-slate-950/30'
              }`}
            >
              {tempPreviewUrl ? (
                /* Live circular crop preview area */
                <div 
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="relative h-44 w-44 rounded-full overflow-hidden border-4 border-indigo-600/40 shadow-inner flex items-center justify-center bg-black/20 select-none"
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                  <img
                    ref={imgRef}
                    src={tempPreviewUrl}
                    alt="Cropped Preview"
                    className="object-contain max-w-none origin-center pointer-events-none select-none"
                    draggable="false"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      width: '100%',
                      height: '100%',
                      transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                  />
                  {/* Grid crop indicators */}
                  <div className="absolute inset-0 border border-white/20 rounded-full pointer-events-none" />
                </div>
              ) : (
                /* Drag & Drop file empty fallback */
                <div className="space-y-3">
                  <Upload className="h-10 w-10 text-slate-500 mx-auto animate-bounce-slow" />
                  <p className="text-slate-350">
                    Drag and drop your picture here or click below to upload
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">JPG, PNG, or WEBP (Max 5MB)</p>
                </div>
              )}
            </div>

            {/* Image Selection Actions */}
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Camera className="h-4 w-4 text-indigo-400" />
                Choose Picture File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </div>

            {/* Slider zoom and Rotate Controls */}
            {tempPreviewUrl && (
              <div className="mt-6 space-y-4 border-t border-slate-800 pt-4 animate-fade-in">
                <div className="text-[10px] text-slate-500 font-bold text-center pb-1 uppercase tracking-wider">
                  Drag the image to adjust its position.
                </div>
                {/* Zoom range slider */}
                <div className="flex items-center gap-3">
                  <ZoomIn className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0 w-10">Zoom</span>
                  <input
                    type="range"
                    min={minZoom}
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 w-8 text-right">{zoom.toFixed(1)}x</span>
                </div>

                {/* Rotate degree controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4.5 w-4.5 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rotation</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all font-bold text-xxs"
                    >
                      +90° Rotate
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all font-bold text-xxs"
                    >
                      -90° Rotate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Dialog Actions */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-350 font-bold text-xs hover:bg-slate-800 hover:border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!tempFile}
                onClick={handleSaveCroppedImage}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                Save Photo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
export type { ProfileProps };
