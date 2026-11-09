import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Sliders,
  Award,
  Users,
  Home,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  FolderOpen,
  History,
  Droplet,
  ShieldCheck,
  BookOpen,
  Navigation,
  Zap,
  HeartPulse,
  Upload,
} from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import ScoreRing from '../components/common/ScoreRing';
import SectorRadarChart from '../components/common/SectorRadarChart';
import StatusChip from '../components/common/StatusChip';
import SegmentedProgressBar from '../components/common/SegmentedProgressBar';
import SkeletonLoader from '../components/common/SkeletonLoader';
import EmptyState from '../components/common/EmptyState';
import { fireCelebrationConfetti } from '../components/common/Confetti';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend
);

export default function VillageProfilePage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addToast = useGramStore((state) => state.addToast);
  const user = useGramStore((state) => state.user);
  const theme = useGramStore((state) => state.theme);

  // Sector edit form state
  const [editSector, setEditSector] = useState(null);
  const [editScoreValue, setEditScoreValue] = useState(50);
  const [editNote, setEditNote] = useState('');
  const [changeRequestModalOpen, setChangeRequestModalOpen] = useState(false);

  // Fetch village details
  const { data: village, isLoading } = useQuery({
    queryKey: ['village-detail', id],
    queryFn: async () => {
      const res = await api.get(`/villages/${id}`);
      return res.data?.data || null;
    },
  });

  // Fetch insights (score, recommendations, forecast)
  const { data: insights } = useQuery({
    queryKey: ['village-insights-detail', id],
    queryFn: async () => {
      const res = await api.get(`/villages/${id}/insights`);
      return res.data?.data || null;
    },
    enabled: Boolean(id),
  });

  // Fetch historical snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ['village-snapshots', id],
    queryFn: async () => {
      const res = await api.get(`/villages/${id}/snapshots`);
      return res.data?.data || [];
    },
    enabled: Boolean(id),
  });

  // Fetch village projects
  const { data: projects = [] } = useQuery({
    queryKey: ['village-projects', id],
    queryFn: async () => {
      const res = await api.get(`/projects?villageId=${id}`);
      return res.data?.data || [];
    },
    enabled: Boolean(id),
  });

  // Fetch village badges
  const { data: badgesData } = useQuery({
    queryKey: ['village-badges', id],
    queryFn: async () => {
      const res = await api.get(`/game/badges?villageId=${id}`);
      return res.data?.data || { earned: [], catalog: [] };
    },
    enabled: Boolean(id),
  });

  // Fetch village missions
  const { data: missions = [] } = useQuery({
    queryKey: ['village-missions', id],
    queryFn: async () => {
      const res = await api.get(`/game/missions?villageId=${id}`);
      return res.data?.data || [];
    },
    enabled: Boolean(id),
  });

  // Update sector score mutation
  const updateSectorMutation = useMutation({
    mutationFn: async ({ sector, newScore, note }) => {
      const payload = {
        sectors: { [sector]: newScore },
        note,
      };
      const res = await api.put(`/villages/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.status === 'pending_approval') {
        addToast(data.message, 'info');
      } else {
        fireCelebrationConfetti();
        addToast('Sector score updated! +25 Planner XP awarded.', 'success');
      }
      setEditSector(null);
      queryClient.invalidateQueries(['village-detail', id]);
      queryClient.invalidateQueries(['village-insights-detail', id]);
      queryClient.invalidateQueries(['villages-rail']);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to update score', 'error');
    },
  });

  if (isLoading || !village) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  const tabs = [
    { key: 'overview', name: 'Overview' },
    { key: 'sectors', name: 'Sectors & Scores' },
    { key: 'trends', name: 'Trends & ML Forecast' },
    { key: 'projects', name: `Projects (${projects.length})` },
    { key: 'missions', name: 'Missions & Badges' },
    { key: 'evidence', name: 'Field Evidence' },
    { key: 'activity', name: 'Audit Log' },
  ];

  const sectors = village.sectors || {};
  const sectorConfigs = [
    { key: 'sanitation', name: 'Sanitation', icon: ShieldCheck, score: sectors.sanitation?.score || 50 },
    { key: 'water', name: 'Water Security', icon: Droplet, score: sectors.water?.score || 50 },
    { key: 'education', name: 'Education', icon: BookOpen, score: sectors.education?.score || 50 },
    { key: 'roads', name: 'Road Connectivity', icon: Navigation, score: sectors.roads?.score || 50 },
    { key: 'electricity', name: 'Electricity', icon: Zap, score: sectors.electricity?.score || 50 },
    { key: 'healthcare', name: 'Healthcare Access', icon: HeartPulse, score: sectors.healthcare?.score || 50 },
  ];

  // Prepare line chart data for trends & forecast
  const quarters = snapshots.map((s) => s.quarter);
  const trendScores = snapshots.map((s) => s.overallScore);

  const forecastData = insights?.forecast;
  if (forecastData && forecastData.next_quarter) {
    quarters.push(`${forecastData.next_quarter} (Forecast)`);
    trendScores.push(forecastData.projected_overall_score);
  }

  const chartData = {
    labels: quarters,
    datasets: [
      {
        label: 'Overall Composite Score',
        data: trendScores,
        borderColor: theme === 'dark' ? '#DDA046' : '#C4832A',
        backgroundColor: 'rgba(196, 131, 42, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: (ctx) => (ctx.dataIndex === quarters.length - 1 ? 6 : 4),
        pointBackgroundColor: (ctx) =>
          ctx.dataIndex === quarters.length - 1 ? '#7BAE7F' : '#C4832A',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
        ticks: { color: theme === 'dark' ? '#F6F1E4' : '#162922', font: { family: 'IBM Plex Mono' } },
      },
      x: {
        grid: { display: false },
        ticks: { color: theme === 'dark' ? '#F6F1E4' : '#162922', font: { family: 'IBM Plex Mono' } },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto select-none">
      {/* Village Banner Card */}
      <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-bold text-field-dark tracking-tight">
              {village.name}
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-sm bg-turmeric/20 text-turmeric font-semibold">
              {village.code}
            </span>
            <StatusChip status={village.level} size="sm" />
          </div>
          <p className="text-xs font-mono text-field-dark/60">
            Block: {village.block} • District: {village.district}, {village.state}
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-field-dark/80 pt-1">
            <span>Pop: {village.population?.toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>HH: {village.households?.toLocaleString('en-IN')}</span>
            <span>•</span>
            <span className="text-turmeric font-semibold">{village.xp || 100} Planner XP</span>
          </div>
        </div>

        {/* Quick Dossier Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => navigate(`/simulator?villageId=${village._id}`)}
            className="px-3 py-1.5 text-xs font-mono rounded-sm border border-border-subtle hover:bg-paper-muted text-field-dark transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-turmeric" />
            <span>Simulate</span>
          </button>
          <a
            href={`/api/reports/village/${village._id}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-mono rounded-sm bg-turmeric text-white hover:bg-turmeric-hover transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Dossier</span>
          </a>
        </div>
      </div>

      {/* Tabs Navigation Rail */}
      <div className="border-b border-border-subtle flex gap-1 overflow-x-auto text-xs font-mono">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSearchParams({ tab: tab.key })}
            className={`px-3.5 py-2.5 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-turmeric text-turmeric font-bold bg-paper-muted/30'
                : 'border-transparent text-field-dark/70 hover:text-field-dark hover:border-border-subtle'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Ring Card */}
            <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-6 flex flex-col items-center justify-center text-center">
              <ScoreRing score={village.overallScore} size={140} strokeWidth={11} />
              <div className="mt-4 text-xs font-mono text-field-dark/70 max-w-xs">
                Composite Village Development Score based on 6 core infrastructure sectors.
              </div>
            </div>

            {/* Sector Radar Chart */}
            <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 flex flex-col justify-between">
              <h3 className="font-serif text-sm font-bold text-field-dark mb-2">Sector Radar Balance</h3>
              <div className="h-64">
                <SectorRadarChart sectors={village.sectors} height={240} />
              </div>
            </div>

            {/* AI Rule-based Recommendations */}
            <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 space-y-3">
              <div className="flex items-center gap-1.5 font-serif text-sm font-bold text-field-dark border-b border-border-subtle pb-2">
                <Sparkles className="w-4 h-4 text-turmeric" />
                <span>AI Targeted Interventions</span>
              </div>

              {!insights?.recommendations?.length ? (
                <div className="text-xs font-mono text-field-dark/60 py-4">
                  No critical deficits detected. Village maintains healthy thresholds.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {insights.recommendations.slice(0, 3).map((rec) => (
                    <div
                      key={rec.sector}
                      className="p-2.5 rounded-sm border border-border-subtle/60 bg-paper-muted/20 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-field-dark capitalize">{rec.title}</span>
                        <StatusChip status={rec.level} size="sm" />
                      </div>
                      <p className="text-[11px] text-field-dark/80 mt-1 leading-snug">{rec.reason}</p>
                      <div className="mt-2 text-[10px] font-mono text-turmeric font-medium">
                        Action: {rec.action}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECTORS & SCORES */}
      {activeTab === 'sectors' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-field-dark">Core Development Sectors</h3>
              <p className="text-xs font-mono text-field-dark/60">
                Panchayat officers can update sector metrics. Jumps &gt; 10 points require review verification.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sectorConfigs.map((sec) => {
              const Icon = sec.icon;
              return (
                <div key={sec.key} className="p-4 border border-border-subtle/80 rounded-sm bg-paper-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-turmeric" />
                      <span className="font-semibold text-xs uppercase font-mono text-field-dark">{sec.name}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-field-dark">{sec.score}%</span>
                  </div>

                  <SegmentedProgressBar current={sec.score} max={100} segments={4} showValues={false} />

                  <div className="flex justify-between items-center pt-1 text-[11px] font-mono">
                    <span className="text-field-dark/60">
                      Updated: {new Date(village.sectors[sec.key]?.lastUpdated || Date.now()).toLocaleDateString('en-IN')}
                    </span>
                    <button
                      onClick={() => {
                        setEditSector(sec.key);
                        setEditScoreValue(sec.score);
                        setEditNote(`Verified field progress in ${sec.name}`);
                      }}
                      className="text-turmeric hover:underline font-semibold"
                    >
                      Update Score
                    </button>
                  </div>

                  {/* Inline update drawer for this sector */}
                  {editSector === sec.key && (
                    <div className="mt-3 p-3 border-t border-border-subtle bg-paper-base dark:bg-field-dark/40 rounded-sm space-y-2 animate-in fade-in">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span>New Value (0 - 100):</span>
                        <span className="font-bold text-turmeric">{editScoreValue}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editScoreValue}
                        onChange={(e) => setEditScoreValue(Number(e.target.value))}
                        className="w-full accent-turmeric cursor-pointer"
                      />
                      <input
                        type="text"
                        placeholder="Rationale / Inspection note..."
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-border-subtle rounded-sm bg-transparent text-field-dark"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditSector(null)}
                          className="px-2 py-1 text-[10px] font-mono rounded-sm border border-border-subtle text-field-dark/70"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() =>
                            updateSectorMutation.mutate({
                              sector: sec.key,
                              newScore: editScoreValue,
                              note: editNote,
                            })
                          }
                          disabled={updateSectorMutation.isPending}
                          className="px-3 py-1 text-[10px] font-mono rounded-sm bg-turmeric text-white font-semibold hover:bg-turmeric-hover"
                        >
                          Commit Verification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TRENDS & ML FORECAST */}
      {activeTab === 'trends' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-field-dark">Quarterly Score History & ML Forecast</h3>
              <p className="text-xs font-mono text-field-dark/60">
                Predictive trajectory powered by Ridge regression over {snapshots.length} historical snapshots.
              </p>
            </div>
            {forecastData && (
              <div className="text-right">
                <span className="text-[10px] font-mono text-field-dark/60 uppercase">Projected Next Quarter</span>
                <div className="font-mono text-base font-bold text-softgreen">
                  {forecastData.projected_overall_score}% ({forecastData.next_quarter})
                </div>
              </div>
            )}
          </div>

          <div className="h-80 w-full p-2">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* TAB 4: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-field-dark">Infrastructure Schemes ({projects.length})</h3>
              <p className="text-xs font-mono text-field-dark/60">Field works executed by Gram Panchayat and RES.</p>
            </div>
            <button
              onClick={() => navigate('/monitoring')}
              className="px-3 py-1.5 text-xs font-mono rounded-sm bg-turmeric text-white font-semibold"
            >
              Open Kanban Board →
            </button>
          </div>

          {projects.length === 0 ? (
            <EmptyState title="No active projects" description="No ongoing schemes recorded for this village." />
          ) : (
            <div className="divide-y divide-border-subtle/40">
              {projects.map((p) => (
                <div key={p._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-semibold text-field-dark">{p.title}</span>
                      <StatusChip status={p.status} />
                    </div>
                    <div className="text-[11px] text-field-dark/60">
                      Sector: {p.sector.toUpperCase()} • Assignee: {p.assignee} • Due: {new Date(p.dueDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>

                  <div className="text-right sm:self-auto self-start">
                    <div className="font-bold text-field-dark">
                      ₹{p.spent?.toLocaleString('en-IN')} / ₹{p.budget?.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-field-dark/60">
                      {Math.round(((p.spent || 0) / (p.budget || 1)) * 100)}% budget utilized
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MISSIONS & BADGES */}
      {activeTab === 'missions' && (
        <div className="space-y-6">
          {/* Badges Section */}
          <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4">
            <h3 className="font-serif text-base font-bold text-field-dark border-b border-border-subtle pb-2">
              Honors & Badges Catalog
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {badgesData.catalog?.map((b) => (
                <div
                  key={b.key}
                  className={`p-3 rounded-sm border text-xs flex flex-col justify-between ${
                    b.isEarned
                      ? b.atRisk
                        ? 'border-clay/60 bg-clay-light/20 text-field-dark'
                        : 'border-softgreen/60 bg-softgreen-light/20 text-field-dark'
                      : 'border-border-subtle/50 bg-paper-muted/30 text-field-dark/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold">{b.name}</span>
                    {b.isEarned ? (
                      b.atRisk ? (
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded-sm bg-clay text-white">
                          At Risk
                        </span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-softgreen" />
                      )
                    ) : (
                      <span className="text-[10px] font-mono">Locked</span>
                    )}
                  </div>
                  <p className="text-[11px] text-field-dark/70 mt-1 leading-snug">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: EVIDENCE */}
      {activeTab === 'evidence' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-field-dark">Field Verification Evidence</h3>
              <p className="text-xs font-mono text-field-dark/60">
                Geotagged site photos and engineering completion certificates.
              </p>
            </div>
            <label className="px-3 py-1.5 text-xs font-mono rounded-sm bg-turmeric text-white cursor-pointer hover:bg-turmeric-hover flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Proof</span>
              <input type="file" className="hidden" onChange={() => addToast('Evidence document staged for audit.', 'success')} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border border-border-subtle rounded-sm overflow-hidden p-2 text-xs font-mono bg-paper-muted/20">
              <div className="h-32 bg-border-subtle/30 rounded-sm flex items-center justify-center text-field-dark/40 font-mono">
                [JJM Water Tank Geo-Photo]
              </div>
              <div className="mt-2 font-bold text-field-dark">Water Feeder Verification</div>
              <div className="text-[10px] text-field-dark/60">Uploaded 12 days ago • Verified by RES</div>
            </div>
            <div className="border border-border-subtle rounded-sm overflow-hidden p-2 text-xs font-mono bg-paper-muted/20">
              <div className="h-32 bg-border-subtle/30 rounded-sm flex items-center justify-center text-field-dark/40 font-mono">
                [Smart Classroom Completion PDF]
              </div>
              <div className="mt-2 font-bold text-field-dark">Primary School DPR Certificate</div>
              <div className="text-[10px] text-field-dark/60">Uploaded 24 days ago • Certified</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ACTIVITY LOG */}
      {activeTab === 'activity' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4">
          <h3 className="font-serif text-base font-bold text-field-dark border-b border-border-subtle pb-2">
            Immutable Audit Trail
          </h3>
          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 border border-border-subtle rounded-sm bg-paper-muted/20">
              <div className="flex justify-between items-center text-field-dark">
                <span className="font-bold">SECTOR_UPDATE_VERIFIED</span>
                <span className="text-[10px] text-field-dark/50">2026-10-24 14:32</span>
              </div>
              <p className="text-[11px] text-field-dark/70 mt-1">
                Water sector score verified at 72% by District Planning Cell. +25 XP awarded.
              </p>
            </div>
            <div className="p-3 border border-border-subtle rounded-sm bg-paper-muted/20">
              <div className="flex justify-between items-center text-field-dark">
                <span className="font-bold">MISSION_MILESTONE_CLAIM</span>
                <span className="text-[10px] text-field-dark/50">2026-09-18 11:15</span>
              </div>
              <p className="text-[11px] text-field-dark/70 mt-1">
                Completed Har Ghar Jal Standard mission. +100 XP rewarded.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
