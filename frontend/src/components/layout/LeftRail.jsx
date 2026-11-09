import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Calculator,
  Sliders,
  CheckSquare,
  Database,
  Trophy,
  Shield,
  Search,
  Moon,
  Sun,
  Globe,
  LogOut,
  LogIn,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useGramStore } from '../../store/useGramStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { useTranslation } from 'react-i18next';

export default function LeftRail() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const theme = useGramStore((state) => state.theme);
  const toggleTheme = useGramStore((state) => state.toggleTheme);
  const user = useGramStore((state) => state.user);
  const logout = useGramStore((state) => state.logout);
  const selectedVillageId = useGramStore((state) => state.selectedVillageId);
  const setSelectedVillage = useGramStore((state) => state.setSelectedVillage);
  const activeBlock = useGramStore((state) => state.activeBlock);
  const setActiveBlock = useGramStore((state) => state.setActiveBlock);
  const setCommandPaletteOpen = useGramStore((state) => state.setCommandPaletteOpen);

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch villages list
  const { data: villages = [] } = useQuery({
    queryKey: ['villages-rail', activeBlock],
    queryFn: async () => {
      const url = activeBlock && activeBlock !== 'All' ? `/villages?block=${activeBlock}` : '/villages';
      const res = await api.get(url);
      return res.data?.data || [];
    },
  });

  const filteredVillages = villages.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('nav.map'), path: '/map', icon: MapPin },
    { name: t('nav.budgetPlanner'), path: '/budget', icon: Calculator },
    { name: t('nav.scenarioSimulator'), path: '/simulator', icon: Sliders },
    { name: t('nav.monitoring'), path: '/monitoring', icon: CheckSquare },
    { name: t('nav.dataHub'), path: '/data-hub', icon: Database },
    { name: t('nav.leaderboard'), path: '/leaderboard', icon: Trophy },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: t('nav.admin'), path: '/admin', icon: Shield });
  }

  const handleLanguageToggle = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('gramcraft_lang', nextLang);
  };

  const getTierColor = (score) => {
    if (score >= 80) return 'text-softgreen bg-softgreen-light/40 border-softgreen/30';
    if (score >= 65) return 'text-softgreen bg-softgreen-light/30 border-softgreen/20';
    if (score >= 50) return 'text-teal-gram bg-teal-light/40 border-teal-gram/30';
    if (score >= 35) return 'text-turmeric bg-turmeric-light/40 border-turmeric/30';
    return 'text-clay bg-clay-light/40 border-clay/30';
  };

  return (
    <aside className="w-72 bg-paper-base dark:bg-field-panel border-r border-border-subtle flex flex-col h-screen select-none shrink-0 transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-field-dark flex items-center justify-center text-turmeric font-serif font-bold text-lg shadow-inner">
            G
          </div>
          <div>
            <h1 className="font-serif text-base font-bold text-field-dark tracking-tight leading-none">
              GramCraft
            </h1>
            <p className="text-[10px] font-mono text-field-dark/60 mt-0.5 tracking-wider">
              SEHORE DISTRICT, MP
            </p>
          </div>
        </div>

        {/* Global Action Chips */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleLanguageToggle}
            className="p-1.5 rounded-sm hover:bg-paper-muted text-field-dark/70 hover:text-field-dark text-xs font-mono border border-border-subtle/50"
            title="Toggle English / Hindi"
            aria-label="Toggle Language"
          >
            {i18n.language === 'en' ? 'HI' : 'EN'}
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-sm hover:bg-paper-muted text-field-dark/70 hover:text-field-dark border border-border-subtle/50"
            title="Toggle Light / Dark Mode"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-2 space-y-0.5 border-b border-border-subtle text-xs" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-turmeric text-white shadow-sm'
                    : 'text-field-dark/80 hover:bg-paper-muted/60 dark:hover:bg-field-dark/30 hover:text-field-dark'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Village Directory Section (Concept: The Planning Room village browser) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-border-subtle/70 bg-paper-muted/20">
          <div className="flex items-center justify-between text-xs font-mono font-medium text-field-dark/70 mb-2">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Panchayats ({filteredVillages.length})
            </span>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="text-[10px] text-turmeric hover:underline font-mono"
            >
              Ctrl+K
            </button>
          </div>

          {/* Quick Block Filter Tabs */}
          <div className="flex gap-1 mb-2">
            {['All', 'Ichhawar', 'Ashta', 'Sehore'].map((b) => (
              <button
                key={b}
                onClick={() => setActiveBlock(b)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded-sm border transition-colors ${
                  activeBlock === b
                    ? 'bg-field-dark text-paper-base border-field-dark dark:bg-turmeric dark:text-white'
                    : 'border-border-subtle text-field-dark/70 hover:bg-paper-muted/40'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-field-dark/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 30 villages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 text-xs bg-paper-base dark:bg-field-dark/40 border border-border-subtle rounded-sm text-field-dark placeholder:text-field-dark/40 focus:outline-none focus:border-turmeric"
            />
          </div>
        </div>

        {/* Scrollable Village List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/30" role="list" aria-label="Villages list">
          {filteredVillages.map((village) => {
            const isSelected = selectedVillageId === village._id;
            return (
              <div
                key={village._id}
                role="listitem"
                onClick={() => {
                  setSelectedVillage(village);
                  navigate(`/village/${village._id}`);
                }}
                className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                  isSelected
                    ? 'bg-paper-muted dark:bg-field-dark/60 border-l-4 border-turmeric pl-2'
                    : 'hover:bg-paper-muted/40 dark:hover:bg-field-dark/20'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="font-medium text-field-dark truncate">{village.name}</div>
                  <div className="text-[10px] font-mono text-field-dark/60 truncate flex items-center gap-1.5">
                    <span>{village.block}</span>
                    <span>•</span>
                    <span>{village.population?.toLocaleString('en-IN')} pop</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${getTierColor(
                      village.overallScore
                    )}`}
                  >
                    {village.overallScore}%
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-field-dark/30" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-border-subtle bg-paper-muted/30 flex items-center justify-between">
        {user ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-sm bg-turmeric/20 border border-turmeric/40 flex items-center justify-center text-xs font-serif font-bold text-turmeric shrink-0">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-field-dark truncate">{user.name}</div>
                <div className="text-[10px] font-mono uppercase text-field-dark/60 tracking-wider truncate">
                  {user.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 text-field-dark/60 hover:text-clay rounded-sm hover:bg-paper-muted"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-mono font-medium rounded-sm bg-turmeric text-white hover:bg-turmeric-hover transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In (Demo Roles)</span>
          </button>
        )}
      </div>
    </aside>
  );
}
