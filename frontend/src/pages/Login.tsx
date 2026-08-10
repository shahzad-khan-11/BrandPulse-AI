/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Activity, Sparkles, Lock, Mail, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onRegisterClick: () => void;
  onForgotClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onRegisterClick, onForgotClick }) => {
  const { updateUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // OTP Step state
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);

  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Countdown timer effect for OTP resend
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });

      if (res.data.success && res.data.requiresOtp) {
        setStep('otp');
        setInfoMsg(res.data.message || `A 6-digit verification code was sent to ${email}.`);
        setCountdown(45);
        setCanResend(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', { email, otp });

      if (res.data.success && res.data.accessToken) {
        localStorage.setItem('token', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        updateUser(res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP code. Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await api.post('/auth/resend-otp', { email });
      if (res.data.success) {
        setInfoMsg(res.data.message || 'A new 6-digit OTP code has been sent.');
        setCountdown(45);
        setCanResend(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070f] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Main card wrapper */}
      <div className="w-full max-w-md bg-slate-900/30 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-scale-up">
        
        {/* Brand Header */}
        <div className="text-center mb-8 relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center mx-auto text-2xl font-black shadow-xl shadow-indigo-500/30 border border-indigo-400/20 animate-float-medium">
            <Activity className="h-6 w-6 text-white animate-pulse" />
          </div>
          <h2 className="text-2.5xl font-black tracking-tight mt-5 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            {step === 'credentials' ? 'Welcome to BrandPulse AI' : 'Verify Login'}
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-2.5 font-bold flex items-center gap-1.5 justify-center">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            AI-Powered Brand Intelligence & Security
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold animate-shake flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* STEP 1: CREDENTIALS FORM */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-6 relative">
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

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Password</label>
                <button
                  type="button"
                  onClick={onForgotClick}
                  className="text-[10px] text-indigo-400 font-extrabold hover:text-indigo-350 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-150 outline-none placeholder-slate-600 transition-all duration-300 group-hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  placeholder="••••••••"
                />
                <Lock className="h-4.5 w-4.5 text-slate-500 absolute left-4 top-3.5 group-hover:text-indigo-400 transition-colors duration-300" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded-lg bg-slate-950/60 border border-slate-800 text-indigo-600 focus:ring-1 focus:ring-indigo-500/30"
                />
                <span className="font-semibold text-xxs uppercase tracking-wider">Remember this session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white font-extrabold text-xs tracking-widest uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Validating Credentials...</span>
                </>
              ) : (
                <span>Sign In to BrandPulse</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION FORM */}
        {step === 'otp' && (
          <form onSubmit={handleOtpVerify} className="space-y-6 relative animate-fade-in">
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 text-center">
                Enter 6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full text-center tracking-[12px] text-2xl font-mono py-3 rounded-xl bg-slate-950/80 border border-indigo-500/50 text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="000000"
                />
                <KeyRound className="h-4.5 w-4.5 text-indigo-400 absolute left-4 top-4" />
              </div>
            </div>

            <div className="flex items-center justify-end text-xs text-slate-400">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend || loading}
                className={`text-xxs font-extrabold transition-colors ${
                  canResend ? 'text-indigo-400 hover:text-indigo-350' : 'text-slate-600'
                }`}
              >
                {canResend ? 'Resend OTP' : `Resend in ${countdown}s`}
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white font-extrabold text-xs tracking-widest uppercase shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 mt-8 relative font-bold uppercase tracking-wider text-[10px]">
          New to the platform?{' '}
          <button onClick={onRegisterClick} className="text-indigo-400 font-extrabold hover:text-indigo-350 transition-colors">
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
