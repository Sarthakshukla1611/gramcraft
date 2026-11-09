import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No Records Found',
  description = 'No matching information found for the selected filters or parameters.',
  action = null,
  icon: Icon = Inbox,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border-subtle rounded-sm bg-paper-base/30 dark:bg-field-panel/20 select-none">
      <div className="p-3 bg-paper-muted dark:bg-field-dark/40 rounded-full mb-3 text-turmeric">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="font-serif text-sm font-semibold text-field-dark mb-1">{title}</h3>
      <p className="text-xs text-field-dark/60 max-w-xs mb-4 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}
