import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Sliders,
  Award,
  Users,
  Home,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Sparkles,
  Droplet,
  ShieldCheck,
  BookOpen,
  Navigation,
  Zap,
  HeartPulse,
} from 'lucide-react';
import { useGramStore } from '../../store/useGramStore';
import ScoreRing from '../common/ScoreRing';
import StatusChip from '../common/StatusChip';
import { fireCelebrationConfetti } from '../common/Confetti';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useTranslation } from 'react-i18next';

export default function RightRail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedVillage = useGramStore((state) => state.selectedVillage);
  const addToast = useGramStore((state) => state.addToast);

  const villageId = selectedVillage?._id || selectedVillage?.id;

  // Fetch live village insights (score, recommendations, missions)
  const { data: insightsData } = useQuery({
    queryKey: ['village-insights-rail', villageId],
    queryFn: async () => {
      if (!villageId) return null;
      const res = await api.get(`/villages/${villageId}/insights`);
      return res.data?.data || null;
    },
    enabled: Boolean(villageId),
  });

  // Fetch village missions
  const { data: missions = [] } = useQuery({
    queryKey: ['village-missions-rail', villageId],
    queryFn: async () => {
      if (!villageId) return [];
      const res = await api.get(`/game/missions?villageId=${villageId}`);
      return res.data?.data || [];
    },
    enabled: Boolean(villageId),
  });

  // Mission claim mutation
  const claimMutation = useMutation({
    mutationFn: async (missionId) => {
      const res = await api.post(`/game/missions/${missionId}/claim`);
      return res.data;
    },
    onSuccess: (data) => {
      fireCelebrationConfetti();
      addToast(data.message || 'Mission milestone claimed! +XP awarded.', 'success');
      queryClient.invalidateQueries(['village-missions-rail']);
      queryClient.invalidateQueries(['villages-rail']);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to claim mission', 'error');
    },
  });

  if (!selectedVillage) {
    return (
      <aside className="w-80 bg-paper-base dark:bg-field-panel border-l border-border-subtle p-6 flex flex-col items-center justify-center text-center select-none shrink-0 transition-colors duration-200">
        <div className="w-12 h-12 rounded-full border border-dashed border-border-subtle flex items-center justify-center text-turmeric/60 mb-3">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-sm font-semibold text-field-dark">Select a Gram Panchayat</h3>
        <p className="text-xs text-field-dark/60 mt-1 max-w-[200px] leading-relaxed">
          Click any village on the map, directory list, or leaderboard to inspect its live scorecard and missions.
        </p>
      </aside>
    );
  }

  const sectors = selectedVillage.sectors || {};
  const sectorList = [
    { key: 'sanitation', name: 'Sanitation', icon: ShieldCheck, score: sectors.sanitation?.score || 50 },
    { key: 'water', name: 'Water', icon: Droplet, score: sectors.water?.score || 50 },
    { key: 'education', name: 'Education', icon: BookOpen, score: sectors.education?.score || 50 },
    { key: 'roads', name: 'Roads', icon: Navigation, score: sectors.roads?.score || 50 },
    { key: 'electricity', name: 'Electricity', icon: Zap, score: sectors.electricity?.score || 50 },
    { key: 'healthcare', name: 'Healthcare', icon: HeartPulse, score: sectors.healthcare?.score || 50 },
  ];

  return (
    <aside className="w-80 bg-paper-base dark:bg-field-panel border-l border-border-subtle flex flex-col h-screen select-none shrink-0 transition-colors duration-200">
      {/* Header Profile Title */}
      <div className="p-4 border-b border-border-subtle flex items-start justify-between bg-paper-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base font-bold text-field-dark tracking-tight">
              {selectedVillage.name}
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-turmeric/20 text-turmeric font-semibold">
              {selectedVillage.code}
            </span>
          </div>
          <p className="text-xs text-field-dark/60 font-mono mt-0.5">
            {selectedVillage.block} Block • {selectedVillage.district}
          </p>
        </div>

        <button
          onClick={() => navigate(`/village/${villageId}`)}
          className="p-1 text-field-dark/60 hover:text-turmeric rounded-sm"
          title="Open Full Village Dossier"
          aria-label="Open Full Village Dossier"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Score Ring Section */}
        <div className="bg-paper-base dark:bg-field-dark/30 border border-border-subtle rounded-sm p-3.5 flex flex-col items-center">
          <ScoreRing score={selectedVillage.overallScore} size={110} strokeWidth={9} />
          <div className="w-full mt-3 pt-3 border-t border-border-subtle/50 flex justify-around text-center text-xs">
            <div>
              <div className="text-[10px] font-mono text-field-dark/60 uppercase">Population</div>
              <div className="font-semibold text-field-dark font-mono mt-0.5">
                {selectedVillage.population?.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="border-r border-border-subtle/50" />
            <div>
              <div className="text-[10px] font-mono text-field-dark/60 uppercase">Planner XP</div>
              <div className="font-semibold text-turmeric font-mono mt-0.5">
                {selectedVillage.xp || 100} XP
              </div>
            </div>
          </div>
        </div>

        {/* Sectors Mini Breakdown */}
        <div className="bg-paper-base dark:bg-field-dark/30 border border-border-subtle rounded-sm p-3">
          <div className="flex items-center justify-between text-xs font-mono font-medium text-field-dark/80 mb-2.5">
            <span>Core Sectors</span>
            <span className="text-[10px] text-turmeric hover:underline cursor-pointer" onClick={() => navigate(`/village/${villageId}?tab=sectors`)}>
              Edit Scores →
            </span>
          </div>

          <div className="space-y-2">
            {sectorList.map((sec) => {
              const Icon = sec.icon;
              return (
                <div key={sec.key} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="flex items-center gap-1.5 text-field-dark font-medium text-[11px]">
                      <Icon className="w-3.5 h-3.5 text-field-dark/60" />
                      {sec.name}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-field-dark">
                      {sec.score}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-border-subtle/40 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${
                        sec.score < 35
                          ? 'bg-clay'
                          : sec.score < 50
                          ? 'bg-turmeric'
                          : sec.score < 65
                          ? 'bg-teal-gram'
                          : 'bg-softgreen'
                      }`}
                      style={{ width: `${sec.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Missions Card */}
        <div className="bg-paper-base dark:bg-field-dark/30 border border-border-subtle rounded-sm p-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-field-dark/80 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-turmeric" />
            <span>Active Missions</span>
          </div>

          {missions.length === 0 ? (
            <div className="text-[11px] text-field-dark/60 font-mono py-2">
              All missions currently up-to-date!
            </div>
          ) : (
            <div className="space-y-2">
              {missions.slice(0, 3).map((m) => (
                <div
                  key={m._id}
                  className="p-2 border border-border-subtle/50 rounded-sm bg-paper-muted/30 dark:bg-field-panel/40 text-xs"
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-medium text-field-dark leading-tight">{m.title}</span>
                    <span className="text-[10px] font-mono px-1 rounded-sm bg-turmeric/20 text-turmeric shrink-0">
                      +{m.rewardXp} XP
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-field-dark/60">
                      Goal: {m.milestone}% in {m.sector}
                    </span>
                    {m.status === 'completed' ? (
                      <button
                        onClick={() => claimMutation.mutate(m._id)}
                        disabled={claimMutation.isPending}
                        className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-softgreen text-field-dark rounded-sm hover:brightness-105 shadow-sm transition-all animate-pulse"
                      >
                        Claim Reward
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-field-dark/50">
                        {m.status === 'claimed' ? 'Claimed ✓' : 'In Progress'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-1.5 pt-1">
          <button
            onClick={() => navigate(`/simulator?villageId=${villageId}`)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-mono font-medium rounded-sm border border-border-subtle bg-paper-base dark:bg-field-dark/40 text-field-dark hover:bg-paper-muted transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-turmeric" />
            <span>Simulate Investment</span>
          </button>

          <a
            href={`/api/reports/village/${villageId}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-mono font-medium rounded-sm border border-turmeric bg-turmeric/10 text-field-dark hover:bg-turmeric/20 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-turmeric" />
            <span>Download Official PDF Dossier</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
