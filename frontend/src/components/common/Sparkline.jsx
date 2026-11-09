import React from 'react';

export default function Sparkline({ data = [], width = 80, height = 24, strokeColor = '#C4832A' }) {
  if (!data || data.length < 2) {
    return <span className="text-[10px] text-field-dark/40 font-mono">--</span>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 4) + 2;
      const y = height - ((d - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const isImproving = data[data.length - 1] >= data[0];
  const finalColor = strokeColor || (isImproving ? '#7BAE7F' : '#9E3A34');

  return (
    <div className="inline-flex items-center gap-1 select-none" title={`Trend: ${data[0]} -> ${data[data.length - 1]}`}>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={finalColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* End dot */}
        {data.length > 0 && (
          <circle
            cx={(width - 2)}
            cy={(height - ((data[data.length - 1] - min) / range) * (height - 6) - 3)}
            r="2"
            fill={finalColor}
          />
        )}
      </svg>
      <span className={`text-[10px] font-mono font-medium ${isImproving ? 'text-softgreen' : 'text-clay'}`}>
        {isImproving ? '↑' : '↓'}
      </span>
    </div>
  );
}
