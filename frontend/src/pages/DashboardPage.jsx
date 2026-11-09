import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Award,
  DollarSign,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  Activity,
  FileText,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import ScoreRing from '../components/common/ScoreRing';
import StatusChip from '../components/common/StatusChip';
import SegmentedProgressBar from '../components/common/SegmentedProgressBar';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { useTranslation } from 'react-i18next';

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeBlock = useGramStore((state) => state.activeBlock);
  const setActiveBlock = useGramStore((state) => state.setActiveBlock);
  const setSelectedVillage = useGramStore((state) => state.setSelectedVillage);

  const blockParam = activeBlock === 'All' ? 'Ichhawar' : activeBlock;

  // Fetch block insights
  const { data: insightsData, isLoading } = useQuery({
    queryKey: ['dashboard-insights', blockParam],
    queryFn: async () => {
      const res = await api.get(`/blocks/${blockParam}/insights`);
      return res.data?.data || null;
    },
  });

  if (isLoading || !insightsData) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  const {
    block,
    villageCount,
    averageScore,
    tierCounts = {},
    sectorAverages = {},
    biggestGaps = [],
    budget = {},
    projects = {},
    activeMissionsCount,
    leaderboardPreview = [],
    recentActivity = [],
  } = insightsData;

  const totalTierSum = Object.values(tierCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-field-dark tracking-tight">
              Command Dashboard
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-sm bg-turmeric/20 text-turmeric font-semibold">
              FY 2026-Q3
            </span>
          </div>
          <p className="text-xs font-mono text-field-dark/60 mt-1">
            Sehore District • Active Planning Unit: {block} Block ({villageCount} Gram Panchayats)
          </p>
        </div>

        {/* Block Selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-1 text-xs font-mono">
          <span className="text-field-dark/50 px-1 text-[11px]">Block:</span>
          {['Ichhawar', 'Ashta', 'Sehore'].map((b) => (
            <button
              key={b}
              onClick={() => setActiveBlock(b)}
              className={`px-2 py-1 rounded-sm transition-colors ${
                block === b
                  ? 'bg-turmeric text-white font-semibold'
                  : 'text-field-dark/70 hover:bg-paper-muted'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Composite Score Card */}
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-field-dark/60">Average Composite Score</div>
            <div className="text-3xl font-serif font-bold text-field-dark mt-1">{averageScore}%</div>
            <div className="text-[11px] font-mono text-softgreen flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+3.8 pts since last quarter</span>
            </div>
          </div>
          <div className="w-14 h-14">
            <ScoreRing score={averageScore} size={56} strokeWidth={6} showIcon={false} />
          </div>
        </div>

        {/* Budget Utilization Card */}
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-field-dark/60">Funds Allocated vs Spent</div>
            <div className="text-xl font-serif font-bold text-field-dark mt-1 font-mono">
              ₹{(budget.spent / 100000).toFixed(1)}L / ₹{(budget.allocated / 100000).toFixed(1)}L
            </div>
          </div>
          <div className="mt-3">
            <SegmentedProgressBar
              current={budget.spent}
              max={budget.allocated || 1}
              segments={1}
              showValues={false}
              color="#C4832A"
            />
            <div className="flex justify-between items-center text-[10px] font-mono text-field-dark/60 mt-1">
              <span>Utilization: {budget.utilizationPercent}%</span>
              <span>{projects.total} schemes active</span>
            </div>
          </div>
        </div>

        {/* Critical Interventions Card */}
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-field-dark/60">Critical Deficit Gaps</div>
            <div className="text-3xl font-serif font-bold text-clay mt-1">
              {tierCounts['Seedling'] || 0}
            </div>
            <div className="text-[11px] font-mono text-field-dark/60 mt-1">
              Villages currently below 35% baseline
            </div>
          </div>
          <button
            onClick={() => navigate('/budget')}
            className="text-[11px] font-mono text-turmeric hover:underline flex items-center gap-1 mt-2"
          >
            Open Budget Allocator →
          </button>
        </div>

        {/* Active Missions Card */}
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-field-dark/60">Active Gamified Missions</div>
            <div className="text-3xl font-serif font-bold text-teal-gram mt-1">
              {activeMissionsCount}
            </div>
            <div className="text-[11px] font-mono text-field-dark/60 mt-1">
              Milestone challenges awaiting field verification
            </div>
          </div>
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-[11px] font-mono text-turmeric hover:underline flex items-center gap-1 mt-2"
          >
            View Leaderboard & Sprints →
          </button>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide): Sector averages & Biggest gaps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sector Radar / Progress Bars */}
          <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
              <div>
                <h3 className="font-serif text-sm font-bold text-field-dark">Sector Performance Benchmark</h3>
                <p className="text-[11px] font-mono text-field-dark/60">Average score across all {villageCount} villages</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-paper-muted border border-border-subtle">
                Baseline: 50%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(sectorAverages).map(([sector, avg]) => (
                <div key={sector} className="p-3 border border-border-subtle/60 rounded-sm bg-paper-muted/20">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold uppercase font-mono text-field-dark">
                      {sector}
                    </span>
                    <span className="text-xs font-mono font-bold text-field-dark">{avg}%</span>
                  </div>
                  <div className="h-2 w-full bg-border-subtle/40 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${
                        avg < 35
                          ? 'bg-clay'
                          : avg < 50
                          ? 'bg-turmeric'
                          : avg < 65
                          ? 'bg-teal-gram'
                          : 'bg-softgreen'
                      }`}
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Biggest Gaps / Urgent Interventions Table */}
          <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-clay" />
                <h3 className="font-serif text-sm font-bold text-field-dark">Biggest Development Gaps</h3>
              </div>
              <span className="text-[11px] font-mono text-field-dark/60">Target: 70% Standard</span>
            </div>

            <div className="divide-y divide-border-subtle/40">
              {biggestGaps.slice(0, 3).map((gap, idx) => (
                <div key={gap.sector} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-clay-light text-clay font-mono font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-medium text-field-dark capitalize">{gap.sector} Deficit</span>
                      <div className="text-[10px] font-mono text-field-dark/60">
                        Current average: {gap.averageScore}% • Gap to 70%: -{gap.gapToTarget} pts
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/budget?focus=${gap.sector}`)}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-sm border border-turmeric text-turmeric hover:bg-turmeric/10"
                  >
                    Allocate Funds
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Village Tiers Breakdown & Top Villages */}
        <div className="space-y-6">
          {/* Villages by Tier */}
          <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4">
            <h3 className="font-serif text-sm font-bold text-field-dark border-b border-border-subtle pb-2 mb-3">
              Villages by Development Tier
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              {[
                { name: 'Model Village (80+)', key: 'Model Village', color: 'bg-softgreen' },
                { name: 'Thriving (65-79)', key: 'Thriving', color: 'bg-softgreen/80' },
                { name: 'Growing (50-64)', key: 'Growing', color: 'bg-teal-gram' },
                { name: 'Sprout (35-49)', key: 'Sprout', color: 'bg-turmeric' },
                { name: 'Seedling (< 35)', key: 'Seedling', color: 'bg-clay' },
              ].map((tier) => {
                const count = tierCounts[tier.key] || 0;
                const pct = Math.round((count / totalTierSum) * 100);
                return (
                  <div key={tier.key}>
                    <div className="flex justify-between items-center mb-1 text-[11px]">
                      <span className="text-field-dark">{tier.name}</span>
                      <span className="font-semibold text-field-dark">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-border-subtle/40 rounded-sm overflow-hidden">
                      <div className={`h-full ${tier.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 High Performing Panchayats */}
          <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-3">
              <h3 className="font-serif text-sm font-bold text-field-dark">Top Panchayats</h3>
              <button
                onClick={() => navigate('/leaderboard')}
                className="text-[10px] font-mono text-turmeric hover:underline"
              >
                Full Roster →
              </button>
            </div>

            <div className="divide-y divide-border-subtle/30">
              {leaderboardPreview.map((v, idx) => (
                <div
                  key={v.id}
                  onClick={() => {
                    navigate(`/village/${v.id}`);
                  }}
                  className="py-2 flex items-center justify-between cursor-pointer hover:bg-paper-muted/40 px-1 rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-field-dark/50">#{idx + 1}</span>
                    <span className="text-xs font-medium text-field-dark">{v.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-turmeric">{v.overallScore}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Audit / Planning Activity */}
          <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4">
            <h3 className="font-serif text-sm font-bold text-field-dark border-b border-border-subtle pb-2 mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-turmeric" />
              <span>Audit Trail Activity</span>
            </h3>

            <div className="space-y-2 text-[11px] font-mono">
              {recentActivity.length === 0 ? (
                <div className="text-field-dark/50 py-2">No recent audit logs recorded.</div>
              ) : (
                recentActivity.slice(0, 4).map((log) => (
                  <div key={log._id} className="border-b border-border-subtle/30 pb-1.5">
                    <div className="flex justify-between items-center text-field-dark">
                      <span className="font-semibold">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-field-dark/50">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[10px] text-field-dark/60 mt-0.5 truncate">
                      Actor: {log.actor?.name} ({log.actor?.role})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
