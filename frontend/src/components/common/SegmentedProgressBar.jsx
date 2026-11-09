import React from 'react';

export default function SegmentedProgressBar({
  current = 0,
  max = 100,
  segments = 5,
  label = '',
  color = '#C4832A',
  showValues = true,
}) {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="w-full select-none">
      {(label || showValues) && (
        <div className="flex justify-between items-center text-xs font-mono mb-1 text-field-dark/80">
          <span className="font-medium">{label}</span>
          {showValues && (
            <span className="text-[11px] text-field-dark/60">
              {current.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')} ({Math.round(percent)}%)
            </span>
          )}
        </div>
      )}

      <div
        className="h-2 w-full bg-border-subtle/40 dark:bg-border-subtle/20 rounded-sm overflow-hidden flex"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>

      {segments > 1 && (
        <div className="flex justify-between text-[9px] font-mono text-field-dark/50 mt-1">
          {Array.from({ length: segments + 1 }).map((_, idx) => (
            <span key={idx}>
              {Math.round((idx / segments) * max)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
