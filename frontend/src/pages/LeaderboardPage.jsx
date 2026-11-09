import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Award,
  Medal,
  Flame,
  Users,
  Timer,
  ArrowUpRight,
  TrendingUp,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import StatusChip from '../components/common/StatusChip';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { fireCelebrationConfetti } from '../components/common/Confetti';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeBlock = useGramStore((state) => state.activeBlock);
  const addToast = useGramStore((state) => state.addToast);
  const user = useGramStore((state) => state.user);

  const [scope, setScope] = useState('block'); // 'block' | 'district' | 'peer_groups'
  const [selectedSector, setSelectedSector] = useState('overall');
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);

  // Fetch leaderboard
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['game-leaderboard', activeBlock, selectedSector, scope],
    queryFn: async () => {
      let url = `/game/leaderboard?sector=${selectedSector}`;
      if (scope === 'block' && activeBlock !== 'All') {
        url += `&block=${activeBlock}`;
      }
      const res = await api.get(url);
      return res.data || null;
    },
  });

  // Fetch challenges
  const { data: challenges = [] } = useQuery({
    queryKey: ['game-challenges'],
    queryFn: async () => {
      const res = await api.get('/game/challenges');
      return res.data?.data || [];
    },
  });

  if (isLoading || !leaderboardData) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  const { leaderboard = [], peerGroups = {} } = leaderboardData;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-field-dark tracking-tight">
              Panchayat Honors & Sprints
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-sm bg-turmeric/20 text-turmeric font-semibold">
              Season 2026-Q3
            </span>
          </div>
          <p className="text-xs font-mono text-field-dark/60 mt-1">
            Fair peer rankings and time-bounded development sprints.
          </p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-1 text-xs font-mono">
          <button
            onClick={() => setScope('block')}
            className={`px-2.5 py-1 rounded-sm ${
              scope === 'block' ? 'bg-turmeric text-white font-bold' : 'text-field-dark/70 hover:bg-paper-muted'
            }`}
          >
            Block Rankings
          </button>
          <button
            onClick={() => setScope('district')}
            className={`px-2.5 py-1 rounded-sm ${
              scope === 'district' ? 'bg-turmeric text-white font-bold' : 'text-field-dark/70 hover:bg-paper-muted'
            }`}
          >
            District Roster
          </button>
          <button
            onClick={() => setScope('peer_groups')}
            className={`px-2.5 py-1 rounded-sm ${
              scope === 'peer_groups' ? 'bg-turmeric text-white font-bold' : 'text-field-dark/70 hover:bg-paper-muted'
            }`}
          >
            Fair Peer Groups
          </button>
        </div>
      </div>

      {/* Peer Sprints / Challenges Card */}
      <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-turmeric" />
            <h2 className="font-serif text-base font-bold text-field-dark">Active Panchayat Sprints</h2>
          </div>
          <span className="text-xs font-mono text-field-dark/60">Live Progress & Countdown</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((ch) => (
            <div key={ch._id} className="p-4 border border-border-subtle rounded-sm bg-paper-muted/20 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-serif text-sm font-bold text-field-dark">{ch.title}</h3>
                  <p className="text-xs text-field-dark/70 mt-0.5 leading-snug">{ch.description}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-turmeric/20 text-turmeric font-bold uppercase shrink-0">
                  {ch.sector}
                </span>
              </div>

              {/* Participants progress */}
              <div className="space-y-2 pt-1 font-mono text-xs">
                {ch.participants?.map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-field-dark">{p.name}</span>
                      <span className="font-bold text-turmeric">
                        {p.currentScore}% ({p.progress}% to goal)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-border-subtle/40 rounded-sm overflow-hidden">
                      <div className="h-full bg-turmeric transition-all duration-300" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-between items-center text-[10px] font-mono text-field-dark/50 border-t border-border-subtle/40">
                <span>Target: +{ch.target} pts improvement</span>
                <span>Ends: {new Date(ch.endDate).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-turmeric" />
            <h2 className="font-serif text-base font-bold text-field-dark">Official Composite Scoreboard</h2>
          </div>

          {/* Sector filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-field-dark/60 text-[11px]">Rank by:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-paper-muted dark:bg-field-dark/40 border border-border-subtle rounded-sm px-2 py-1 text-field-dark cursor-pointer font-mono"
            >
              <option value="overall">Composite Score</option>
              <option value="sanitation">Sanitation</option>
              <option value="water">Clean Water</option>
              <option value="education">Education</option>
              <option value="roads">Roads</option>
              <option value="electricity">Electricity</option>
              <option value="healthcare">Healthcare</option>
            </select>
          </div>
        </div>

        {scope === 'peer_groups' ? (
          /* FAIR PEER GROUPS VIEW */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            {/* Small Villages */}
            <div className="border border-border-subtle rounded-sm p-3 bg-paper-muted/20 space-y-2">
              <div className="font-bold border-b border-border-subtle pb-1 text-field-dark flex items-center justify-between">
                <span>Small (&lt; 1,500 Pop)</span>
                <span className="text-[10px] text-field-dark/60">{peerGroups.small?.length || 0}</span>
              </div>
              {peerGroups.small?.map((v, i) => (
                <div key={v.id} onClick={() => navigate(`/village/${v.id}`)} className="flex justify-between py-1 px-1 cursor-pointer hover:bg-paper-muted rounded-xs">
                  <span>#{i + 1} {v.name}</span>
                  <span className="font-bold text-turmeric">{v.score}%</span>
                </div>
              ))}
            </div>

            {/* Medium Villages */}
            <div className="border border-border-subtle rounded-sm p-3 bg-paper-muted/20 space-y-2">
              <div className="font-bold border-b border-border-subtle pb-1 text-field-dark flex items-center justify-between">
                <span>Medium (1,500 - 3,000)</span>
                <span className="text-[10px] text-field-dark/60">{peerGroups.medium?.length || 0}</span>
              </div>
              {peerGroups.medium?.map((v, i) => (
                <div key={v.id} onClick={() => navigate(`/village/${v.id}`)} className="flex justify-between py-1 px-1 cursor-pointer hover:bg-paper-muted rounded-xs">
                  <span>#{i + 1} {v.name}</span>
                  <span className="font-bold text-turmeric">{v.score}%</span>
                </div>
              ))}
            </div>

            {/* Large Villages */}
            <div className="border border-border-subtle rounded-sm p-3 bg-paper-muted/20 space-y-2">
              <div className="font-bold border-b border-border-subtle pb-1 text-field-dark flex items-center justify-between">
                <span>Large (&gt; 3,000 Pop)</span>
                <span className="text-[10px] text-field-dark/60">{peerGroups.large?.length || 0}</span>
              </div>
              {peerGroups.large?.map((v, i) => (
                <div key={v.id} onClick={() => navigate(`/village/${v.id}`)} className="flex justify-between py-1 px-1 cursor-pointer hover:bg-paper-muted rounded-xs">
                  <span>#{i + 1} {v.name}</span>
                  <span className="font-bold text-turmeric">{v.score}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* STANDARD TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] text-field-dark/60 uppercase">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Gram Panchayat</th>
                  <th className="py-2.5 px-3">Block</th>
                  <th className="py-2.5 px-3">Population</th>
                  <th className="py-2.5 px-3">Development Tier</th>
                  <th className="py-2.5 px-3">Planner XP</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30">
                {leaderboard.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/village/${v.id}`)}
                    className="hover:bg-paper-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-field-dark">
                      {v.rank === 1 ? '🥇' : v.rank === 2 ? '🥈' : v.rank === 3 ? '🥉' : `#${v.rank}`}
                    </td>
                    <td className="py-3 px-3 font-medium text-field-dark flex items-center gap-2">
                      <span>{v.name}</span>
                      <span className="text-[10px] text-field-dark/50">({v.code})</span>
                    </td>
                    <td className="py-3 px-3">{v.block}</td>
                    <td className="py-3 px-3">{v.population?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3">
                      <StatusChip status={v.level} size="sm" />
                    </td>
                    <td className="py-3 px-3 font-semibold text-turmeric">{v.xp || 100} XP</td>
                    <td className="py-3 px-3 text-right font-serif font-bold text-sm text-field-dark">
                      {v.score}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
