import React, { useEffect, useState } from 'react';
import { Activity, Sparkles } from 'lucide-react';
import { getInitials } from '../utils/avatar';

interface SplashProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    "Initializing AI Intelligence...",
    "Connecting to Automation Engine...",
    "Loading Brand Analytics...",
    "Preparing Dashboard..."
  ];

  useEffect(() => {
    const duration = 2500; // 2.5 seconds cinematic loader
    const intervalTime = 16; // ~60fps
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 400); // short wait for fade-out feel
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onFinish]);

  // Update text based on progress
  useEffect(() => {
    if (progress < 25) {
      setMessageIndex(0);
    } else if (progress < 50) {
      setMessageIndex(1);
    } else if (progress < 75) {
      setMessageIndex(2);
    } else {
      setMessageIndex(3);
    }
  }, [progress]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05070f] text-white select-none overflow-hidden font-sans">
      {/* Cinematic animated background glows */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-600/5 blur-[90px] pointer-events-none animate-float-slow" />

      {/* Floating AI Particles */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-indigo-400 rounded-full animate-float-slow" />
        <div className="absolute top-2/3 left-1/3 w-3 h-3 bg-purple-400 rounded-full animate-float-medium" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-indigo-300 rounded-full animate-float-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-1/4 right-1/5 w-3 h-3 bg-purple-300 rounded-full animate-float-medium" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 right-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse-slow" />
      </div>

      {/* Main Container */}
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center animate-scale-up">
        {/* Glow behind logo */}
        <div className="absolute -inset-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full opacity-15 blur-[60px] animate-pulse-slow" />

        {/* Cinematic Logo Icon */}
        <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.3)] border border-indigo-400/20 mb-8 transform transition-transform duration-700 hover:scale-105">
          <Activity className="h-12 w-12 text-white animate-pulse" />
          
          {/* Animated radar rings */}
          <div className="absolute inset-0 rounded-3xl border-2 border-indigo-500/30 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
          <div className="absolute -inset-4 rounded-[2rem] border border-purple-500/20 animate-pulse-slow" />

          {/* Sparkle corner active tag */}
          <div className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 border border-[#05070f]"></span>
          </div>
        </div>

        {/* Logo Text */}
        <h1 className="text-4.5xl font-black tracking-tight mb-2 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-md">
          BrandPulse AI
        </h1>
        
        <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-400/90 font-black mb-12 flex items-center gap-2 justify-center">
          <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
          Enterprise Brand Intelligence
        </p>

        {/* Progress Bar Container */}
        <div className="w-64 h-1.5 bg-slate-950/80 border border-slate-900/60 rounded-full overflow-hidden mb-5 backdrop-blur-md relative shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-75 ease-out rounded-full shadow-[0_0_12px_#6366f1]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic status text */}
        <div className="h-6 flex items-center justify-center">
          <span className="text-[10px] font-mono tracking-[0.15em] text-slate-400 uppercase animate-fade-in transition-all duration-300">
            {messages[messageIndex]} {Math.min(100, Math.round(progress))}%
          </span>
        </div>
      </div>
    </div>
  );
};

interface WelcomeProps {
  userName: string;
  userRole?: string;
  profileImage?: string | null;
}

export const WelcomeScreen: React.FC<WelcomeProps> = ({ userName, userRole, profileImage }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05070f] text-white select-none overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-indigo-400 rounded-full animate-float-slow" />
        <div className="absolute bottom-1/3 right-1/3 w-3 h-3 bg-purple-400 rounded-full animate-float-medium" />
      </div>

      <div className="relative flex flex-col items-center max-w-sm px-6 text-center animate-scale-up">
        {/* Glowing avatar ring */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full border border-indigo-500/20 bg-indigo-500/5 blur-xl animate-pulse" />

        {/* Avatar Area */}
        <div className="relative mb-8 transform hover:scale-105 transition-transform duration-500 h-24 w-24 mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full opacity-30 animate-spin" style={{ animationDuration: '10s' }} />
          <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-indigo-500/40 shadow-2xl z-10">
            {profileImage ? (
              <img 
                src={profileImage} 
                alt={userName} 
                className="w-full h-full object-cover object-center rounded-full" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 flex items-center justify-center font-black text-3xl text-white">
                {getInitials(userName)}
              </div>
            )}
          </div>
          <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-[#05070f] animate-pulse z-20" />
        </div>

        {/* Welcome Text Stagger Animation */}
        <div className="space-y-2 mb-8">
          <p className="text-xxs uppercase tracking-[0.2em] text-slate-500 font-extrabold animate-slide-up" style={{ animationDelay: '100ms' }}>
            System Authorized
          </p>
          <h2 className="text-3xl font-black tracking-tight animate-slide-up" style={{ animationDelay: '200ms' }}>
            Welcome Back,
          </h2>
          <h3 className="text-2.5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-sm animate-slide-up" style={{ animationDelay: '300ms' }}>
            {userName} 👋
          </h3>
          <p className="text-[10px] uppercase tracking-[0.15em] text-indigo-400/80 font-bold pt-1 animate-slide-up" style={{ animationDelay: '400ms' }}>
            {userRole || 'Brand Intelligence Specialist'}
          </p>
        </div>

        {/* Status Waveform / Loader */}
        <div className="glass-panel px-6 py-4 border border-slate-800/80 bg-slate-900/20 backdrop-blur-xl rounded-2xl w-72 animate-slide-up shadow-2xl" style={{ animationDelay: '500ms' }}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 justify-center mb-1">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold">Today's AI systems are online.</span>
            </div>
            
            <div className="flex items-center gap-2 text-xxs text-slate-450 font-bold">
              <div className="animate-spin h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full" />
              <span>Loading your analytics...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
