import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sliders, Sparkles, TrendingUp, Info } from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import ScoreRing from '../components/common/ScoreRing';
import SegmentedProgressBar from '../components/common/SegmentedProgressBar';

export default function ScenarioSimulatorPage() {
  const [searchParams] = useSearchParams();
  const initialVillageId = searchParams.get('villageId');
  const activeBlock = useGramStore((state) => state.activeBlock);

  // Fetch villages for dropdown
  const { data: villages = [] } = useQuery({
    queryKey: ['simulator-villages', activeBlock],
    queryFn: async () => {
      const url = activeBlock && activeBlock !== 'All' ? `/villages?block=${activeBlock}` : '/villages';
      const res = await api.get(url);
      return res.data?.data || [];
    },
  });

  const [selectedVillageId, setSelectedVillageId] = useState(initialVillageId || '');
  const [selectedSector, setSelectedSector] = useState('water');
  const [investmentAmount, setInvestmentAmount] = useState(250000); // 2.5 Lakhs

  const currentVillage = villages.find((v) => v._id === selectedVillageId) || villages[0];

  // Fetch simulation from API
  const { data: simResult } = useQuery({
    queryKey: ['simulate-query', currentVillage?._id, selectedSector, investmentAmount],
    queryFn: async () => {
      if (!currentVillage) return null;
      const res = await api.post('/budget/simulate', {
        villageId: currentVillage._id,
        sector: selectedSector,
        investmentAmount: Number(investmentAmount),
      });
      return res.data?.data || null;
    },
    enabled: Boolean(currentVillage),
  });

  const currentScore = currentVillage ? currentVillage.sectors?.[selectedSector]?.score || 50 : 50;
  const projectedScore = simResult?.projected_score || currentScore;
  const scoreGain = simResult?.gain || 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto select-none">
      <div className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-field-dark tracking-tight">
            Scenario Investment Simulator
          </h1>
          <span className="font-mono text-xs px-2 py-0.5 rounded-sm bg-turmeric/20 text-turmeric font-semibold">
            Elasticity α = 0.55
          </span>
        </div>
        <p className="text-xs font-mono text-field-dark/60 mt-1">
          Explore marginal gain projections before committing fiscal schemes.
        </p>
      </div>

      {/* Simulator Inputs Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5">
        <div>
          <label className="text-xs font-mono text-field-dark/70 uppercase">Target Village</label>
          <select
            value={currentVillage?._id || ''}
            onChange={(e) => setSelectedVillageId(e.target.value)}
            className="w-full mt-1.5 p-2 text-xs font-sans bg-paper-muted/30 border border-border-subtle rounded-sm text-field-dark"
          >
            {villages.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} ({v.block} Block)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-mono text-field-dark/70 uppercase">Infrastructure Sector</label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full mt-1.5 p-2 text-xs font-sans bg-paper-muted/30 border border-border-subtle rounded-sm text-field-dark"
          >
            <option value="sanitation">Sanitation & Drainage</option>
            <option value="water">Clean Tap Water</option>
            <option value="education">School Facilities</option>
            <option value="roads">Road Connectivity</option>
            <option value="electricity">Feeder & Power</option>
            <option value="healthcare">Health Wellness Sub-Center</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-field-dark/70 uppercase">Proposed Investment</span>
            <span className="font-bold text-turmeric">₹{(investmentAmount / 100000).toFixed(2)} Lakhs</span>
          </div>
          <input
            type="range"
            min="25000"
            max="1500000"
            step="25000"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(Number(e.target.value))}
            className="w-full mt-3 accent-turmeric cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-field-dark/50 mt-1">
            <span>₹25k</span>
            <span>₹7.5L</span>
            <span>₹15L</span>
          </div>
        </div>
      </div>

      {/* Projection Before & After Comparison */}
      <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-6 space-y-6">
        <h3 className="font-serif text-base font-bold text-field-dark border-b border-border-subtle pb-2">
          Projected Impact: {currentVillage?.name} ({selectedSector.toUpperCase()})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          {/* Current Score */}
          <div className="text-center p-4 border border-border-subtle/60 rounded-sm bg-paper-muted/20">
            <div className="text-[10px] font-mono text-field-dark/60 uppercase">Current Baseline</div>
            <div className="text-3xl font-serif font-bold text-field-dark mt-1">{currentScore}%</div>
            <div className="text-[10px] font-mono text-field-dark/50 mt-1">Verified Field Status</div>
          </div>

          {/* Gain Arrow */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-turmeric/20 text-turmeric font-mono text-xs font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>+{scoreGain} Points Gain</span>
            </div>
            <div className="text-[10px] font-mono text-field-dark/50">
              For ₹{(investmentAmount).toLocaleString('en-IN')} outlay
            </div>
          </div>

          {/* Projected Score */}
          <div className="text-center p-4 border border-turmeric/60 rounded-sm bg-turmeric-light/20">
            <div className="text-[10px] font-mono text-turmeric uppercase font-semibold">Simulated Outcome</div>
            <div className="text-3xl font-serif font-bold text-turmeric mt-1">{projectedScore}%</div>
            <div className="text-[10px] font-mono text-field-dark/60 mt-1">Post-Scheme Projection</div>
          </div>
        </div>

        {/* Progress bar visual comparison */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-mono">
            <span>Progress toward 100% Saturation</span>
            <span className="font-bold text-field-dark">{projectedScore}%</span>
          </div>
          <div className="h-4 w-full bg-border-subtle/30 rounded-sm overflow-hidden flex">
            <div className="h-full bg-field-dark dark:bg-paper-base" style={{ width: `${currentScore}%` }} />
            <div className="h-full bg-turmeric animate-pulse" style={{ width: `${scoreGain}%` }} />
          </div>
          <div className="flex gap-4 text-[10px] font-mono text-field-dark/60 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-field-dark dark:bg-paper-base inline-block rounded-xs" /> Baseline ({currentScore}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-turmeric inline-block rounded-xs" /> Simulated Gain (+{scoreGain}%)
            </span>
          </div>
        </div>

        {/* Calibration disclaimer */}
        <div className="p-3 border border-border-subtle/60 rounded-sm bg-paper-muted/30 text-[11px] font-mono text-field-dark/60 flex items-start gap-2">
          <Info className="w-4 h-4 text-turmeric shrink-0 mt-0.5" />
          <span>
            {simResult?.assumptions || 'Assumes diminishing marginal returns response curve.'}
          </span>
        </div>
      </div>
    </div>
  );
}
