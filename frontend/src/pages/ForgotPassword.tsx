/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import api from '../services/api';
import { Activity, Sparkles, Mail, ArrowLeft } from 'lucide-react';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setMessage('A password reset link has been dispatched to your email address.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="w-full max-w-md bg-slate-900/30 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-scale-up">
        {/* Glow corner highlights */}
        <div className="absolute -top-12 -left-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-8 relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center mx-auto text-2xl font-black shadow-xl shadow-indigo-500/30 border border-indigo-400/20 animate-float-medium">
            <Activity className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h2 className="text-2.5xl font-black tracking-tight mt-5 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Reset Password
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-2.5 font-bold flex items-center gap-1.5 justify-center">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Verification Link Dispatcher
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold animate-shake flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold animate-shake flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Email Address</label>
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-150 outline-none placeholder-slate-600 transition-all duration-300 group-hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="name@company.com"
              />
              <Mail className="h-4.5 w-4.5 text-slate-500 absolute left-4 top-3.5 group-hover:text-indigo-400 transition-colors duration-300" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white font-extrabold text-xs tracking-widest uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Sending link...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-8 relative font-bold uppercase tracking-wider text-[10px]">
          <button 
            onClick={onBackToLogin} 
            className="text-indigo-400 font-extrabold hover:text-indigo-350 transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
