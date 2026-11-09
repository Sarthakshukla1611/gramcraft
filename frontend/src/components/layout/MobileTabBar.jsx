import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, MapPin, Calculator, Trophy, Layers } from 'lucide-react';
import { useGramStore } from '../../store/useGramStore';

export default function MobileTabBar() {
  const location = useLocation();
  const selectedVillage = useGramStore((state) => state.selectedVillage);
  const setMobileSheetOpen = useGramStore((state) => state.setMobileSheetOpen);
  const mobileSheetOpen = useGramStore((state) => state.mobileSheetOpen);

  const tabs = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Map', path: '/map', icon: MapPin },
    { name: 'Budget', path: '/budget', icon: Calculator },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper-base dark:bg-field-panel border-t border-border-subtle flex items-center justify-around py-2 px-1 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-sm text-[10px] font-mono transition-colors ${
              isActive ? 'text-turmeric font-bold' : 'text-field-dark/70 hover:text-field-dark'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </NavLink>
        );
      })}

      {selectedVillage && (
        <button
          onClick={() => setMobileSheetOpen(!mobileSheetOpen)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-sm text-[10px] font-mono text-turmeric font-bold"
        >
          <div className="relative">
            <Layers className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-turmeric" />
          </div>
          <span>Scorecard</span>
        </button>
      )}
    </div>
  );
}
