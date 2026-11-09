import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGramStore } from './store/useGramStore';
import './i18n';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import VillageProfilePage from './pages/VillageProfilePage';
import BudgetPlannerPage from './pages/BudgetPlannerPage';
import ScenarioSimulatorPage from './pages/ScenarioSimulatorPage';
import MonitoringPage from './pages/MonitoringPage';
import DataHubPage from './pages/DataHubPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  const theme = useGramStore((state) => state.theme);

  // Sync theme with document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Main App Layout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/village/:id" element={<VillageProfilePage />} />
            <Route path="/budget" element={<BudgetPlannerPage />} />
            <Route path="/simulator" element={<ScenarioSimulatorPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/data-hub" element={<DataHubPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
