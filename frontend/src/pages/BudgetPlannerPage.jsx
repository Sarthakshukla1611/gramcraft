import React, { useState } from 'react';
import {
  Calculator,
  Lock,
  Unlock,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  FileCheck,
  Split,
  Info,
} from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import StatusChip from '../components/common/StatusChip';
import SegmentedProgressBar from '../components/common/SegmentedProgressBar';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { fireCelebrationConfetti } from '../components/common/Confetti';
import { useTranslation } from 'react-i18next';

export default function BudgetPlannerPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const activeBlock = useGramStore((state) => state.activeBlock);
  const addToast = useGramStore((state) => state.addToast);
  const blockName = activeBlock === 'All' ? 'Ichhawar' : activeBlock;

  const [totalBudget, setTotalBudget] = useState(5000000); // 50 Lakhs
  const [scenarioName, setScenarioName] = useState('FY2026-Q4 High Priority Gap Elimination');
  const [lockedAllocations, setLockedAllocations] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [optimizationMeta, setOptimizationMeta] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Optimize Mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/budget/optimize', {
        blockId: blockName,
        total: Number(totalBudget),
        lockedAllocations,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setAllocations(data.data.allocations || []);
        setOptimizationMeta(data.data);
        addToast(`Greedy marginal optimization complete! ${data.data.allocations.length} allocations generated.`, 'success');
      }
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to run optimization', 'error');
    },
  });

  // Apply Plan Mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      // First save plan
      const saveRes = await api.post('/budget/plans', {
        blockId: blockName,
        total: totalBudget,
        scenarioName,
        allocations,
      });
      const planId = saveRes.data?.data?._id;
      // Then apply it
      const applyRes = await api.post(`/budget/plans/${planId}/apply`);
      return applyRes.data;
    },
    onSuccess: (data) => {
      fireCelebrationConfetti();
      addToast(data.message || 'Budget plan applied! Project schemes initialized.', 'success');
      queryClient.invalidateQueries(['budget-plans']);
      queryClient.invalidateQueries(['monitoring-projects']);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to apply plan', 'error');
    },
  });

  const toggleLock = (villageId, sector, currentAmount) => {
    const isLocked = lockedAllocations.some((l) => l.villageId === villageId && l.sector === sector);
    if (isLocked) {
      setLockedAllocations(lockedAllocations.filter((l) => !(l.villageId === villageId && l.sector === sector)));
      setAllocations(
        allocations.map((a) => (a.villageId === villageId && a.sector === sector ? { ...a, locked: false } : a))
      );
    } else {
      setLockedAllocations([...lockedAllocations, { villageId, sector, amount: currentAmount }]);
      setAllocations(
        allocations.map((a) => (a.villageId === villageId && a.sector === sector ? { ...a, locked: true } : a))
      );
    }
  };

  const handleAmountChange = (villageId, sector, newAmount) => {
    setAllocations(
      allocations.map((a) =>
        a.villageId === villageId && a.sector === sector ? { ...a, amount: Number(newAmount) } : a
      )
    );
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const remainingBudget = totalBudget - totalAllocated;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-field-dark tracking-tight">
              AI Budget Planner & Allocator
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-sm bg-turmeric/20 text-turmeric font-semibold">
              Diminishing Returns Engine
            </span>
          </div>
          <p className="text-xs font-mono text-field-dark/60 mt-1">
            Target Unit: {blockName} Block • Algorithmic Need-Weighted Allocation
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsComparing(!isComparing)}
            className="px-3 py-1.5 text-xs font-mono rounded-sm border border-border-subtle hover:bg-paper-muted text-field-dark transition-colors flex items-center gap-1.5"
          >
            <Split className="w-3.5 h-3.5 text-turmeric" />
            <span>{isComparing ? 'Close Comparison' : 'Compare Plans'}</span>
          </button>

          <button
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending || allocations.length === 0}
            className="px-3.5 py-1.5 text-xs font-mono rounded-sm bg-turmeric text-white font-semibold hover:bg-turmeric-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Apply Plan to Works</span>
          </button>
        </div>
      </div>

      {/* Assumptions Alert Notice */}
      <div className="p-3 border border-turmeric/40 rounded-sm bg-turmeric-light/20 flex items-start gap-2.5 text-xs text-field-dark font-mono">
        <Info className="w-4 h-4 text-turmeric shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-turmeric">Calibration Notice:</strong> Impact estimates are engineering
          assumptions based on marginal elasticity curves (&alpha;=0.55). They must be continuously calibrated with real
          GramCraft field monitoring outcome data.
        </div>
      </div>

      {/* Budget Setup Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4">
        <div>
          <label className="text-[11px] font-mono text-field-dark/70 uppercase">Total Block Budget (INR)</label>
          <div className="relative mt-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-field-dark/50">₹</span>
            <input
              type="number"
              step="50000"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value))}
              className="w-full pl-6 pr-2 py-1.5 text-sm font-mono font-bold bg-paper-muted/30 border border-border-subtle rounded-sm text-field-dark focus:outline-none focus:border-turmeric"
            />
          </div>
          <div className="text-[10px] font-mono text-field-dark/50 mt-1">
            ₹{(totalBudget / 100000).toFixed(2)} Lakhs
          </div>
        </div>

        <div>
          <label className="text-[11px] font-mono text-field-dark/70 uppercase">Scenario Name</label>
          <input
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            className="w-full mt-1 px-2.5 py-1.5 text-xs font-sans bg-paper-muted/30 border border-border-subtle rounded-sm text-field-dark focus:outline-none focus:border-turmeric"
          />
          <div className="text-[10px] font-mono text-field-dark/50 mt-1">
            {lockedAllocations.length} items locked
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => optimizeMutation.mutate()}
            disabled={optimizeMutation.isPending}
            className="w-full py-2 text-xs font-mono font-bold rounded-sm bg-field-dark text-paper-base dark:bg-turmeric dark:text-white hover:brightness-110 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-turmeric dark:text-white" />
            <span>{optimizeMutation.isPending ? 'Optimizing Allocations...' : 'Generate AI Allocation'}</span>
          </button>
        </div>
      </div>

      {/* Allocation Summary KPI Bar */}
      {optimizationMeta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 text-xs font-mono">
          <div>
            <div className="text-field-dark/60 text-[10px] uppercase">Allocated</div>
            <div className="text-base font-bold text-field-dark mt-0.5">
              ₹{(totalAllocated / 100000).toFixed(1)}L ({Math.round((totalAllocated / totalBudget) * 100)}%)
            </div>
          </div>
          <div>
            <div className="text-field-dark/60 text-[10px] uppercase">Remaining</div>
            <div className={`text-base font-bold mt-0.5 ${remainingBudget < 0 ? 'text-clay' : 'text-softgreen'}`}>
              ₹{(remainingBudget / 100000).toFixed(1)}L
            </div>
          </div>
          <div>
            <div className="text-field-dark/60 text-[10px] uppercase">Projected Total Gain</div>
            <div className="text-base font-bold text-turmeric mt-0.5">
              +{optimizationMeta.total_projected_score_gain} pts
            </div>
          </div>
          <div>
            <div className="text-field-dark/60 text-[10px] uppercase">Score Efficiency</div>
            <div className="text-base font-bold text-teal-gram mt-0.5">
              {optimizationMeta.expected_gain_per_lakh} pts / Lakh
            </div>
          </div>
        </div>
      )}

      {/* Allocations Table */}
      <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3">
          <h3 className="font-serif text-sm font-bold text-field-dark">
            Proposed Allocation Lines ({allocations.length})
          </h3>
          <span className="text-[11px] font-mono text-field-dark/60">
            Click lock to preserve an amount during re-optimization
          </span>
        </div>

        {allocations.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-field-dark/60">
            Click "Generate AI Allocation" above to compute optimal distributions across {blockName} villages.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] text-field-dark/60 uppercase">
                  <th className="py-2 px-2">Village</th>
                  <th className="py-2 px-2">Sector</th>
                  <th className="py-2 px-2">Current Score</th>
                  <th className="py-2 px-2">Projected Score</th>
                  <th className="py-2 px-2">Allocation (INR)</th>
                  <th className="py-2 px-2 text-center">Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30">
                {allocations.map((a, idx) => (
                  <tr key={idx} className="hover:bg-paper-muted/30 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-field-dark">{a.villageName}</td>
                    <td className="py-2.5 px-2 capitalize">{a.sector}</td>
                    <td className="py-2.5 px-2 text-field-dark/70">{a.currentScore}%</td>
                    <td className="py-2.5 px-2 font-bold text-softgreen">
                      {a.projectedScore}% <span className="text-[10px] text-turmeric">(+{a.expectedGain})</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1">
                        <span>₹</span>
                        <input
                          type="number"
                          step="10000"
                          value={a.amount}
                          onChange={(e) => handleAmountChange(a.villageId, a.sector, e.target.value)}
                          className="w-28 px-1.5 py-0.5 text-xs bg-paper-base dark:bg-field-dark/40 border border-border-subtle rounded-sm font-mono text-field-dark"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => toggleLock(a.villageId, a.sector, a.amount)}
                        className={`p-1 rounded-sm ${
                          a.locked ? 'text-turmeric bg-turmeric-light/30' : 'text-field-dark/40 hover:text-field-dark'
                        }`}
                        title={a.locked ? 'Unlock amount' : 'Lock amount'}
                      >
                        {a.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
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
