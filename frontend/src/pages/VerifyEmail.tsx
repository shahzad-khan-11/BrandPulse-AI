/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Activity, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

interface VerifyEmailProps {
  onBackToLogin: () => void;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ onBackToLogin }) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMsg('Verification token is missing in URL.');
        return;
      }

      try {
        const res = await api.post('/auth/verify-email', { token });
        if (res.data.success) {
          setStatus('success');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.response?.data?.message || 'Verification token is invalid or has expired.');
      }
    };

    verifyToken();
  }, []);

  return (
    <div className="min-h-screen bg-[#05070f] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Floating AI Particles */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-24 h-24 border border-indigo-500/10 rounded-full animate-float-slow" />
        <div className="absolute bottom-20 left-1/3 w-32 h-32 border border-purple-500/10 rounded-full animate-float-medium" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900/30 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center animate-scale-up">
        {/* Glow corner highlights */}
        <div className="absolute -top-12 -left-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-8 relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center mx-auto text-2xl font-black shadow-xl shadow-indigo-500/30 border border-indigo-400/20 animate-float-medium">
            <Activity className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h2 className="text-2.5xl font-black tracking-tight mt-5 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Verify Email
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-2.5 font-bold flex items-center gap-1.5 justify-center">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Email Verification Hub
          </p>
        </div>

        {status === 'verifying' && (
          <div className="space-y-6 relative py-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Verifying Email Address...</h3>
            <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden relative border border-slate-900 shadow-inner">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-1/2 absolute rounded-full animate-pulse shadow-[0_0_10px_#6366f1]" />
            </div>
            <p className="text-xxs uppercase tracking-wider text-slate-500 font-semibold">Communicating with secure validation engines...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 relative animate-scale-up">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-lg font-black text-emerald-400">Email Verified!</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Your email address has been verified successfully. You can now access all dashboard integrations.
            </p>
            <button
              onClick={onBackToLogin}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white font-extrabold text-xs tracking-widest uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.97] cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 relative animate-scale-up">
            <div className="h-14 w-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="h-7 w-7 text-rose-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-rose-455">Verification Failed</h3>
            <p className="text-xs text-rose-300 leading-relaxed font-semibold bg-rose-500/5 p-3.5 border border-rose-550/20 rounded-xl">{errorMsg}</p>
            <button
              onClick={onBackToLogin}
              className="w-full py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 font-extrabold text-xs tracking-widest uppercase transition-all active:scale-[0.97] cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
