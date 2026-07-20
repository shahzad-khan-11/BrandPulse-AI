import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import { SplashScreen, WelcomeScreen } from './components/SplashAndWelcome';
import { getUserAvatarUrl } from './utils/avatar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Brands from './pages/Brands';
import Mentions from './pages/Mentions';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';

declare global {
  interface Window {
    isSettingsDirty?: boolean;
    handleSettingsTabSwitchInterception?: (newTab: string) => void;
  }
}

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [hasGreeted, setHasGreeted] = useState<boolean>(false);
  
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'reset' | 'verify'>(() => {
    const path = window.location.pathname;
    if (path.includes('reset-password')) return 'reset';
    if (path.includes('verify-email')) return 'verify';
    return 'login';
  });

  // Track authenticated user to play Welcome Screen and Voice Intro
  useEffect(() => {
    if (user && !hasGreeted) {
      setShowWelcome(true);
      
      // Play voice greeting
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const firstName = user.name ? user.name.split(' ')[0] : 'Specialist';
        const utterance = new SpeechSynthesisUtterance(
          `Welcome back, ${firstName}. BrandPulse system initialized and fully operational.`
        );
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }

      const timer = setTimeout(() => {
        setShowWelcome(false);
        setHasGreeted(true);
      }, 3000); // 3 seconds welcome animation

      return () => clearTimeout(timer);
    }
  }, [user, hasGreeted]);

  // Reset greeting status upon logout
  useEffect(() => {
    if (!user) {
      setHasGreeted(false);
      setShowWelcome(false);
    }
  }, [user]);

  const handleActiveTabChange = (newTab: string) => {
    if (window.isSettingsDirty && window.handleSettingsTabSwitchInterception) {
      window.handleSettingsTabSwitchInterception(newTab);
    } else {
      setActiveTab(newTab);
    }
  };

  // 1. Cinematic Splash Screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Auth state initialization loading screen
  if (loading) {
    return (
      <div className="min-h-screen app-root flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Authenticating Command Center...</p>
      </div>
    );
  }

  // 3. Unauthenticated state rendering the Auth Views
  if (!user) {
    if (authView === 'register') {
      return <Register onLoginClick={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'reset') {
      return <ResetPassword onBackToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'verify') {
      return <VerifyEmail onBackToLogin={() => setAuthView('login')} />;
    }
    return (
      <Login 
        onRegisterClick={() => setAuthView('register')} 
        onForgotClick={() => setAuthView('forgot')} 
      />
    );
  }

  // 4. Welcome Screen Animation & Voice greeting
  if (showWelcome) {
    return <WelcomeScreen userName={user.name} userRole={user.role} profileImage={getUserAvatarUrl(user)} />;
  }

  // 5. Main Authenticated App Layout
  return (
    <Layout activeTab={activeTab} setActiveTab={handleActiveTabChange}>
      {activeTab === 'dashboard' && <Dashboard setActiveTab={handleActiveTabChange} />}
      {activeTab === 'brands' && <Brands />}
      {activeTab === 'mentions' && <Mentions />}
      {activeTab === 'analytics' && <Analytics />}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'admin' && user.role === 'admin' && <AdminPanel />}
      {activeTab === 'profile-view' && <Profile initialSubTab="view" setActiveTab={handleActiveTabChange} />}
      {activeTab === 'profile-edit' && <Profile initialSubTab="edit" setActiveTab={handleActiveTabChange} />}
      {activeTab === 'profile-password' && <Profile initialSubTab="password" setActiveTab={handleActiveTabChange} />}
      {activeTab === 'profile-settings' && <Profile initialSubTab="settings" setActiveTab={handleActiveTabChange} />}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
