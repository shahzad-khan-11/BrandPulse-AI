/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Activity, Sparkles, User, Mail, Building, Lock, Eye, EyeOff } from 'lucide-react';

interface RegisterProps {
  onLoginClick: () => void;
}

const Register: React.FC<RegisterProps> = ({ onLoginClick }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, orgName);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Check password requirements.');
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
        <div className="absolute top-1/3 right-20 w-40 h-40 border border-indigo-500/10 rounded-full animate-float-slow" style={{ animationDelay: '2.5s' }} />
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900/30 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-scale-up">
        {/* Glow corner highlights */}
        <div className="absolute -top-12 -left-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6 relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center mx-auto text-2xl font-black shadow-xl shadow-indigo-500/30 border border-indigo-400/20 animate-float-medium">
            <Activity className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h2 className="text-2.5xl font-black tracking-tight mt-5 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-2.5 font-bold flex items-center gap-1.5 justify-center">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Set Up Your Brand Pulse Workspace
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold animate-shake flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Full Name</label>
            <div className="relative group">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-150 outline-none placeholder-slate-600 transition-all duration-300 group-hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="Alex Johnson"
              />
              <User className="h-4.5 w-4.5 text-slate-500 absolute left-4 top-3 group-hover:text-indigo-400 transition-colors duration-300" />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Email Address</label>
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-150 outline-none placeholder-slate-600 transition-all duration-300 group-hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="name@company.com"
              />
              <Mail className="h-4.5 w-4.5 text-slate-500 absolute left-4 top-3 group-hover:text-indigo-400 transition-colors duration-300" />
            </div>
          </div>

          {/* Organization Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Organization Name</label>
            <div className="relative group">
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-150 outline-none placeholder-slate-600 transition-all duration-300 group-hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="Acme Corporation"
              />
              <Building className="h-4.5 w-4.5 text-slate-500 absolute left-4 top-3 group-hover:text-indigo-400 transition-colors duration-300" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Password</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-150 outline-none placeholder-slate-600 transition-all duration-300 group-hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                placeholder="••••••••"
              />
              <Lock className="h-4.5 w-4.5 text-slate-500 absolute left-4 top-3 group-hover:text-indigo-400 transition-colors duration-300" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-slate-500 hover:text-indigo-400 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white font-extrabold text-xs tracking-widest uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Get Started Free</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6 relative font-bold uppercase tracking-wider text-[10px]">
          Already have an account?{' '}
          <button onClick={onLoginClick} className="text-indigo-400 font-extrabold hover:text-indigo-350 transition-colors">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
