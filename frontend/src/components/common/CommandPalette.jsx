import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, LayoutDashboard, Calculator, CheckSquare, Database, Trophy, Shield, X, Moon, Sun, Globe } from 'lucide-react';
import { useGramStore } from '../../store/useGramStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { useTranslation } from 'react-i18next';

export default function CommandPalette() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isOpen = useGramStore((state) => state.commandPaletteOpen);
  const setOpen = useGramStore((state) => state.setCommandPaletteOpen);
  const setSelectedVillage = useGramStore((state) => state.setSelectedVillage);
  const toggleTheme = useGramStore((state) => state.toggleTheme);
  const theme = useGramStore((state) => state.theme);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Fetch villages for quick search
  const { data: villagesData } = useQuery({
    queryKey: ['palette-villages'],
    queryFn: async () => {
      const res = await api.get('/villages?limit=60');
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  const villages = villagesData || [];

  // Static navigation commands
  const pages = [
    { title: 'Command Dashboard', path: '/', icon: LayoutDashboard, category: 'Pages' },
    { title: 'Map Explorer', path: '/map', icon: MapPin, category: 'Pages' },
    { title: 'Budget Planner', path: '/budget', icon: Calculator, category: 'Pages' },
    { title: 'Project Monitoring', path: '/monitoring', icon: CheckSquare, category: 'Pages' },
    { title: 'Data Hub', path: '/data-hub', icon: Database, category: 'Pages' },
    { title: 'Leaderboards & Sprints', path: '/leaderboard', icon: Trophy, category: 'Pages' },
    { title: 'Admin Console', path: '/admin', icon: Shield, category: 'Pages' },
  ];

  // Actions
  const actions = [
    {
      title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      action: () => toggleTheme(),
      icon: theme === 'dark' ? Sun : Moon,
      category: 'Preferences',
    },
    {
      title: i18n.language === 'en' ? 'Switch to Hindi (हिंदी)' : 'Switch to English',
      action: () => {
        const next = i18n.language === 'en' ? 'hi' : 'en';
        i18n.changeLanguage(next);
        localStorage.setItem('gramcraft_lang', next);
      },
      icon: Globe,
      category: 'Preferences',
    },
  ];

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      } else if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter items
  const filteredVillages = villages
    .filter((v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.code.toLowerCase().includes(query.toLowerCase()) ||
      v.block.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 6)
    .map((v) => ({
      title: `${v.name} (${v.code})`,
      subtitle: `${v.block} Block • Score: ${v.overallScore}% [${v.level}]`,
      village: v,
      category: 'Villages',
      icon: MapPin,
    }));

  const filteredPages = pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
  const filteredActions = actions.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()));

  const allItems = [...filteredVillages, ...filteredPages, ...filteredActions];

  const handleSelect = (item) => {
    if (item.village) {
      setSelectedVillage(item.village);
      navigate(`/village/${item.village._id}`);
    } else if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      item.action();
    }
    setOpen(false);
  };

  const handleKeyNavigation = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(allItems[selectedIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="GramCraft Command Palette"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-xl bg-paper-base dark:bg-field-panel border border-border-subtle rounded-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyNavigation}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border-subtle gap-3">
          <Search className="w-5 h-5 text-turmeric shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-field-dark placeholder:text-field-dark/50 focus:outline-none"
            placeholder="Type a village name, block, or command..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm border border-border-subtle text-field-dark/60 bg-paper-muted/50">
            ESC
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-field-dark/50 hover:text-field-dark p-1 rounded-sm"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-border-subtle/30">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-field-dark/60 font-mono">
              No matching villages or actions found for "{query}".
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-turmeric text-white'
                      : 'hover:bg-paper-muted/50 dark:hover:bg-field-dark/40 text-field-dark'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-turmeric'}`}
                      aria-hidden="true"
                    />
                    <div className="truncate">
                      <div className="text-xs font-medium truncate">{item.title}</div>
                      {item.subtitle && (
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-white/80' : 'text-field-dark/60 font-mono'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                      isSelected ? 'bg-white/20 text-white' : 'text-field-dark/40'
                    }`}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3 py-2 bg-paper-muted/30 dark:bg-field-dark/20 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-field-dark/60">
          <span>Navigate with ↑ ↓</span>
          <span>Select: Enter</span>
          <span>Open anytime: Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
