import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Ban, Hourglass, ShieldAlert, Sparkles } from 'lucide-react';

export default function StatusChip({ status = 'planned', size = 'sm' }) {
  const normStatus = status?.toLowerCase() || 'planned';

  const configs = {
    planned: {
      label: 'Planned',
      icon: Clock,
      className: 'bg-paper-muted text-field-dark border-border-subtle',
      iconClass: 'text-field-dark/70',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-teal-light/50 text-teal-gram border-teal-gram/30 dark:bg-teal-light/20 dark:text-teal-gram',
      iconClass: 'text-teal-gram',
    },
    in_progress: {
      label: 'In Progress',
      icon: Hourglass,
      className: 'bg-turmeric-light/60 text-turmeric-hover border-turmeric/40 dark:bg-turmeric-light/20 dark:text-turmeric',
      iconClass: 'text-turmeric',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      className: 'bg-softgreen-light/70 text-field-dark border-softgreen/40 dark:bg-softgreen-light/20 dark:text-softgreen',
      iconClass: 'text-softgreen',
    },
    delayed: {
      label: 'Delayed',
      icon: AlertCircle,
      className: 'bg-clay-light/60 text-clay border-clay/40 dark:bg-clay-light/20 dark:text-clay',
      iconClass: 'text-clay',
    },
    critical: {
      label: 'Critical Gap',
      icon: ShieldAlert,
      className: 'bg-clay-light text-clay border-clay/50 dark:bg-clay-light/30',
      iconClass: 'text-clay',
    },
    priority: {
      label: 'Priority Scheme',
      icon: AlertCircle,
      className: 'bg-turmeric-light text-turmeric-hover border-turmeric/50 dark:bg-turmeric-light/30',
      iconClass: 'text-turmeric',
    },
    watch: {
      label: 'Watchlist',
      icon: Clock,
      className: 'bg-teal-light text-teal-gram border-teal-gram/40 dark:bg-teal-light/30',
      iconClass: 'text-teal-gram',
    },
    healthy: {
      label: 'Healthy Standard',
      icon: Sparkles,
      className: 'bg-softgreen-light text-field-dark border-softgreen/50 dark:bg-softgreen-light/30 dark:text-softgreen',
      iconClass: 'text-softgreen',
    },
  };

  const config = configs[normStatus] || configs.planned;
  const Icon = config.icon;

  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border font-mono font-medium select-none ${config.className} ${sizeClasses}`}
      role="status"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
