import React from 'react';

export default function SkeletonLoader({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="h-4 bg-border-subtle/50 rounded-sm w-1/4" />
          <div className="h-4 bg-border-subtle/30 rounded-sm flex-1" />
          <div className="h-4 bg-border-subtle/40 rounded-sm w-1/6" />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
