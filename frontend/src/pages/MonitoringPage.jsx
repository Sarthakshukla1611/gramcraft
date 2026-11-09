import React, { useState } from 'react';
import {
  Kanban,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  DollarSign,
  Plus,
  Upload,
} from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import StatusChip from '../components/common/StatusChip';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { fireCelebrationConfetti } from '../components/common/Confetti';

export default function MonitoringPage() {
  const queryClient = useQueryClient();
  const activeBlock = useGramStore((state) => state.activeBlock);
  const addToast = useGramStore((state) => state.addToast);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'timeline'
  const [sectorFilter, setSectorFilter] = useState('all');

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['monitoring-projects', activeBlock, sectorFilter],
    queryFn: async () => {
      let url = '/projects';
      const params = new URLSearchParams();
      if (activeBlock && activeBlock !== 'All') params.append('block', activeBlock);
      if (sectorFilter !== 'all') params.append('sector', sectorFilter);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await api.get(url);
      return res.data?.data || [];
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/projects/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.changeRequest) {
        addToast(data.message, 'info');
      } else {
        fireCelebrationConfetti();
        addToast(data.message || 'Project status updated successfully.', 'success');
      }
      queryClient.invalidateQueries(['monitoring-projects']);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to update project status', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  const columns = [
    { key: 'planned', name: 'Planned', color: 'border-border-subtle' },
    { key: 'approved', name: 'Approved', color: 'border-teal-gram' },
    { key: 'in_progress', name: 'In Progress', color: 'border-turmeric' },
    { key: 'completed', name: 'Completed', color: 'border-softgreen' },
    { key: 'delayed', name: 'Delayed', color: 'border-clay' },
  ];

  // Overdue check
  const now = new Date();
  const overdueProjects = projects.filter(
    (p) => new Date(p.dueDate) < now && p.status !== 'completed'
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-field-dark tracking-tight">
              Project Monitoring & Execution
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-sm bg-turmeric/20 text-turmeric font-semibold">
              {projects.length} Total Schemes
            </span>
          </div>
          <p className="text-xs font-mono text-field-dark/60 mt-1">
            Track works across Gram Panchayats. Completed projects trigger reviewed score updates.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
          {/* Sector filter */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="p-1.5 bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm text-field-dark cursor-pointer"
          >
            <option value="all">All Sectors</option>
            <option value="water">Water</option>
            <option value="sanitation">Sanitation</option>
            <option value="education">Education</option>
            <option value="roads">Roads</option>
            <option value="electricity">Electricity</option>
            <option value="healthcare">Healthcare</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-border-subtle rounded-sm overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 ${
                viewMode === 'kanban' ? 'bg-turmeric text-white font-bold' : 'bg-paper-base dark:bg-field-panel text-field-dark'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 ${
                viewMode === 'timeline' ? 'bg-turmeric text-white font-bold' : 'bg-paper-base dark:bg-field-panel text-field-dark'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Overdue alert banner if any */}
      {overdueProjects.length > 0 && (
        <div className="p-3 border border-clay/50 rounded-sm bg-clay-light/20 flex items-center justify-between text-xs font-mono text-field-dark">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-clay shrink-0" />
            <span>
              <strong>{overdueProjects.length} Schemes Overdue:</strong> Target completion dates have lapsed. Please review field status with Gram Panchayat Officers.
            </span>
          </div>
          <span className="text-[10px] text-clay font-bold">Action Required</span>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto min-h-[500px]">
          {columns.map((col) => {
            const colProjects = projects.filter((p) => p.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-paper-base/60 dark:bg-field-panel/40 border border-border-subtle rounded-sm flex flex-col min-w-[200px]"
              >
                {/* Column Header */}
                <div className={`p-3 border-b-2 ${col.color} bg-paper-muted/30 flex items-center justify-between text-xs font-mono`}>
                  <span className="font-bold text-field-dark uppercase">{col.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-border-subtle/50 font-bold">
                    {colProjects.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[70vh]">
                  {colProjects.map((p) => (
                    <div
                      key={p._id}
                      className="p-3 bg-paper-base dark:bg-field-dark/50 border border-border-subtle rounded-sm shadow-2xs space-y-2 hover:border-turmeric/60 transition-colors text-xs"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-sans font-semibold text-field-dark leading-snug">
                          {p.title}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-field-dark/60">
                        {p.villageId?.name} ({p.villageId?.block})
                      </div>

                      <div className="pt-1 flex justify-between items-center text-[10px] font-mono border-t border-border-subtle/40">
                        <span>₹{(p.budget / 100000).toFixed(1)}L</span>
                        <span className="text-field-dark/50">Due: {new Date(p.dueDate).toLocaleDateString('en-IN')}</span>
                      </div>

                      {/* Status Transition Selector */}
                      <div className="pt-1 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-field-dark/40">Move to:</span>
                        <select
                          value={p.status}
                          onChange={(e) => updateStatusMutation.mutate({ id: p._id, status: e.target.value })}
                          className="bg-paper-muted dark:bg-field-panel text-field-dark border border-border-subtle rounded-xs px-1 py-0.5 cursor-pointer"
                        >
                          <option value="planned">Planned</option>
                          <option value="approved">Approved</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="delayed">Delayed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TIMELINE VIEW */
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-4 divide-y divide-border-subtle/30 font-mono text-xs">
          {projects.map((p) => (
            <div key={p._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-semibold text-field-dark">{p.title}</span>
                  <StatusChip status={p.status} />
                </div>
                <div className="text-[11px] text-field-dark/60">
                  {p.villageId?.name} • Sector: {p.sector.toUpperCase()} • Assignee: {p.assignee}
                </div>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="font-bold text-field-dark">₹{p.budget?.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-field-dark/50">
                    {new Date(p.startDate).toLocaleDateString('en-IN')} → {new Date(p.dueDate).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
