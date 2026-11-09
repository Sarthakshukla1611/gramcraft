import React, { useState } from 'react';
import {
  Shield,
  Users,
  Sliders,
  Activity,
  Award,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import StatusChip from '../components/common/StatusChip';
import SkeletonLoader from '../components/common/SkeletonLoader';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const addToast = useGramStore((state) => state.addToast);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'users' | 'audit'

  // Settings State
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      return res.data?.data || null;
    },
  });

  // Users State
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data?.data || [];
    },
    enabled: activeTab === 'users',
  });

  // Audit Logs State
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => {
      const res = await api.get('/admin/audit?limit=40');
      return res.data || { data: [] };
    },
    enabled: activeTab === 'audit',
  });

  // Form states for settings
  const [criticalThreshold, setCriticalThreshold] = useState(35);
  const [priorityThreshold, setPriorityThreshold] = useState(50);
  const [watchThreshold, setWatchThreshold] = useState(65);
  const [approvalJumpThreshold, setApprovalJumpThreshold] = useState(10);
  const [publicScoreboard, setPublicScoreboard] = useState(true);

  // Sync state when settings load
  React.useEffect(() => {
    if (settingsData) {
      setCriticalThreshold(settingsData.thresholds?.critical || 35);
      setPriorityThreshold(settingsData.thresholds?.priority || 50);
      setWatchThreshold(settingsData.thresholds?.watch || 65);
      setApprovalJumpThreshold(settingsData.gamificationValues?.approvalJumpThreshold || 10);
      setPublicScoreboard(settingsData.publicScoreboardEnabled ?? true);
    }
  }, [settingsData]);

  // Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        thresholds: {
          critical: Number(criticalThreshold),
          priority: Number(priorityThreshold),
          watch: Number(watchThreshold),
          modelVillage: 80,
        },
        gamificationValues: {
          approvalJumpThreshold: Number(approvalJumpThreshold),
        },
        publicScoreboardEnabled: Boolean(publicScoreboard),
      };
      const res = await api.put('/admin/settings', payload);
      return res.data;
    },
    onSuccess: () => {
      addToast('System planning thresholds updated and recorded to audit log.', 'success');
      queryClient.invalidateQueries(['admin-settings']);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to update settings', 'error');
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto select-none">
      {/* Header */}
      <div className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-turmeric" />
          <h1 className="font-serif text-2xl font-bold text-field-dark tracking-tight">
            System Administration Console
          </h1>
        </div>
        <p className="text-xs font-mono text-field-dark/60 mt-1">
          Configure sector weights, verification thresholds, manage scoped accounts, and review security logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle flex gap-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'settings' ? 'border-turmeric text-turmeric font-bold' : 'border-transparent text-field-dark/60'
          }`}
        >
          Thresholds & Weights
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'users' ? 'border-turmeric text-turmeric font-bold' : 'border-transparent text-field-dark/60'
          }`}
        >
          User Accounts & Scopes
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'audit' ? 'border-turmeric text-turmeric font-bold' : 'border-transparent text-field-dark/60'
          }`}
        >
          Security Audit Logs
        </button>
      </div>

      {/* TAB 1: THRESHOLDS & WEIGHTS */}
      {activeTab === 'settings' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-6 space-y-6">
          <div>
            <h3 className="font-serif text-base font-bold text-field-dark">Intervention Baseline Thresholds</h3>
            <p className="text-xs font-mono text-field-dark/60">
              Rules triggering automatic AI recommendations and warning badges across districts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 border border-border-subtle rounded-sm bg-paper-muted/20 space-y-1">
              <label className="text-[11px] font-mono uppercase text-clay font-bold">Critical Deficit Threshold</label>
              <input
                type="number"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                className="w-full p-2 text-sm font-mono font-bold border border-border-subtle rounded-sm bg-transparent text-field-dark"
              />
              <span className="text-[10px] font-mono text-field-dark/50">Scores below this trigger urgent mission</span>
            </div>

            <div className="p-3 border border-border-subtle rounded-sm bg-paper-muted/20 space-y-1">
              <label className="text-[11px] font-mono uppercase text-turmeric font-bold">Priority Scheme Threshold</label>
              <input
                type="number"
                value={priorityThreshold}
                onChange={(e) => setPriorityThreshold(Number(e.target.value))}
                className="w-full p-2 text-sm font-mono font-bold border border-border-subtle rounded-sm bg-transparent text-field-dark"
              />
              <span className="text-[10px] font-mono text-field-dark/50">Baseline standard (default 50%)</span>
            </div>

            <div className="p-3 border border-border-subtle rounded-sm bg-paper-muted/20 space-y-1">
              <label className="text-[11px] font-mono uppercase text-teal-gram font-bold">Watchlist Threshold</label>
              <input
                type="number"
                value={watchThreshold}
                onChange={(e) => setWatchThreshold(Number(e.target.value))}
                className="w-full p-2 text-sm font-mono font-bold border border-border-subtle rounded-sm bg-transparent text-field-dark"
              />
              <span className="text-[10px] font-mono text-field-dark/50">Maintenance standard (default 65%)</span>
            </div>
          </div>

          <div className="p-4 border border-border-subtle rounded-sm bg-paper-muted/20 space-y-3">
            <h4 className="font-serif text-sm font-bold text-field-dark">Integrity & Governance Rules</h4>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div>
                <div className="font-medium text-field-dark">Approval Jump Threshold</div>
                <div className="text-[11px] text-field-dark/60">
                  Field score increases exceeding this value require formal change request signoff.
                </div>
              </div>
              <input
                type="number"
                value={approvalJumpThreshold}
                onChange={(e) => setApprovalJumpThreshold(Number(e.target.value))}
                className="w-20 p-1.5 text-xs font-mono font-bold border border-border-subtle rounded-sm bg-transparent text-field-dark"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-border-subtle/40 text-xs font-mono">
              <div>
                <div className="font-medium text-field-dark">Public Scoreboard Access</div>
                <div className="text-[11px] text-field-dark/60">
                  Allow unauthenticated citizens to inspect public scoreboards.
                </div>
              </div>
              <input
                type="checkbox"
                checked={publicScoreboard}
                onChange={(e) => setPublicScoreboard(e.target.checked)}
                className="w-4 h-4 accent-turmeric cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => updateSettingsMutation.mutate()}
              disabled={updateSettingsMutation.isPending}
              className="px-4 py-2 text-xs font-mono font-bold rounded-sm bg-turmeric text-white hover:bg-turmeric-hover transition-colors"
            >
              Save Configuration Changes
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-field-dark">Authorized User Accounts</h3>
              <p className="text-[11px] text-field-dark/60">RBAC roles and district/block geographic boundary scopes.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] text-field-dark/60 uppercase">
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2">Email</th>
                  <th className="py-2 px-2">Role</th>
                  <th className="py-2 px-2">Geographic Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-paper-muted/30">
                    <td className="py-2.5 px-2 font-medium text-field-dark">{u.name}</td>
                    <td className="py-2.5 px-2 text-field-dark/70">{u.email}</td>
                    <td className="py-2.5 px-2 font-bold uppercase text-turmeric">{u.role}</td>
                    <td className="py-2.5 px-2 text-field-dark/60">
                      {u.scope?.district || 'All Districts'} • {u.scope?.block || 'All Blocks'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4 font-mono text-xs">
          <div className="border-b border-border-subtle pb-2">
            <h3 className="font-serif text-base font-bold text-field-dark">Tamper-Evident Audit Records</h3>
            <p className="text-[11px] text-field-dark/60">Chronological ledger of data mutations and admin actions.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] text-field-dark/60 uppercase">
                  <th className="py-2 px-2">Timestamp</th>
                  <th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Entity</th>
                  <th className="py-2 px-2">Actor</th>
                  <th className="py-2 px-2">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30">
                {auditData.data?.map((log) => (
                  <tr key={log._id} className="hover:bg-paper-muted/30">
                    <td className="py-2 px-2 text-field-dark/50">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 font-bold text-field-dark">{log.action}</td>
                    <td className="py-2 px-2 text-field-dark/70">{log.entity}</td>
                    <td className="py-2 px-2">
                      {log.actor?.name} <span className="text-[10px] text-field-dark/50">({log.actor?.role})</span>
                    </td>
                    <td className="py-2 px-2 text-field-dark/40">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
