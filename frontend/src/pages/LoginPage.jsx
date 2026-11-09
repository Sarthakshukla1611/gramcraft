import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Shield, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import api from '../api/client';
import { fireCelebrationConfetti } from '../components/common/Confetti';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useGramStore((state) => state.setAuth);
  const addToast = useGramStore((state) => state.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const demoAccounts = [
    { name: 'District Collector (Admin)', role: 'Admin', email: 'admin@gramcraft.gov.in', scope: 'Statewide' },
    { name: 'District Officer (Sehore)', role: 'District Officer', email: 'district@gramcraft.gov.in', scope: 'Sehore District' },
    { name: 'Block Planner (Ichhawar)', role: 'Block Planner', email: 'ichhawar.planner@gramcraft.gov.in', scope: 'Ichhawar Block' },
    { name: 'Panchayat Officer (Bijori)', role: 'Village Officer', email: 'bijori.officer@gramcraft.gov.in', scope: 'Bijori Village Only' },
    { name: 'Public Citizen (Viewer)', role: 'Viewer', email: 'viewer@gramcraft.gov.in', scope: 'Read-Only' },
  ];

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success && res.data?.data) {
        const { user, token } = res.data.data;
        setAuth(user, token);
        fireCelebrationConfetti();
        addToast(`Welcome back, ${user.name}! Role: ${user.role}`, 'success');
        navigate('/');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Invalid credentials. Please verify your email & password.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('GramCraft@2026');
    setTimeout(() => {
      setLoading(true);
      api
        .post('/auth/login', { email: demoEmail, password: 'GramCraft@2026' })
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            const { user, token } = res.data.data;
            setAuth(user, token);
            fireCelebrationConfetti();
            addToast(`Authenticated as ${user.name} (${user.role})`, 'success');
            navigate('/');
          }
        })
        .catch((err) => {
          setErrorMsg(err.response?.data?.error || 'Demo login failed');
        })
        .finally(() => setLoading(false));
    }, 50);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-paper-base dark:bg-field-dark select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-sm bg-field-dark mx-auto flex items-center justify-center text-turmeric font-serif font-bold text-2xl shadow-md">
            G
          </div>
          <h1 className="font-serif text-3xl font-bold text-field-dark tracking-tight">GramCraft</h1>
          <p className="text-xs font-mono text-field-dark/60">
            Rural Development Planning Platform • Government of India
          </p>
        </div>

        {/* Login Form Box */}
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-base font-bold text-field-dark border-b border-border-subtle pb-2">
            Sign In to Planning Room
          </h2>

          {errorMsg && (
            <div className="p-2.5 rounded-sm bg-clay-light/40 border border-clay text-clay text-xs font-mono">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-mono text-field-dark/70 uppercase">Email Address</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-field-dark/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="planner@gramcraft.gov.in"
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-sans bg-paper-muted/30 border border-border-subtle rounded-sm text-field-dark focus:outline-none focus:border-turmeric"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-field-dark/70 uppercase">Password</label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-field-dark/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-sans bg-paper-muted/30 border border-border-subtle rounded-sm text-field-dark focus:outline-none focus:border-turmeric"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-xs font-mono font-bold rounded-sm bg-turmeric text-white hover:bg-turmeric-hover transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Planning Room'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Forgot password note */}
          <div className="pt-2 text-center text-[10px] font-mono text-field-dark/50">
            Government NIC SSO Authentication • Demo password for all: <strong>GramCraft@2026</strong>
          </div>
        </div>

        {/* 1-Click Demo Accounts Picker */}
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-medium text-field-dark/80">
            <span>One-Click Role Logins</span>
            <span className="text-[10px] text-turmeric font-semibold">Demo Sandbox</span>
          </div>

          <div className="space-y-1.5">
            {demoAccounts.map((acc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => loginAsDemo(acc.email)}
                className="w-full p-2 rounded-sm border border-border-subtle hover:border-turmeric bg-paper-muted/20 hover:bg-paper-muted/60 transition-colors flex items-center justify-between text-left text-xs font-mono group"
              >
                <div>
                  <div className="font-semibold text-field-dark group-hover:text-turmeric">{acc.name}</div>
                  <div className="text-[10px] text-field-dark/50">Scope: {acc.scope}</div>
                </div>
                <span className="text-[10px] font-bold text-turmeric uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                  Login →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
