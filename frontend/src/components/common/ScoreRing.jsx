import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, TrendingUp, Award, Sprout } from 'lucide-react';

export default function ScoreRing({ score = 0, size = 120, strokeWidth = 10, showIcon = true, label = 'Score' }) {
  const [displayScore, setDisplayScore] = useState(0);

  // Smooth count-up animation
  useEffect(() => {
    let start = 0;
    const end = Math.min(100, Math.max(0, Math.round(score)));
    if (start === end) {
      setDisplayScore(end);
      return;
    }

    const duration = 600; // ms
    const stepTime = Math.max(10, Math.floor(duration / Math.max(1, end)));
    const timer = setInterval(() => {
      start += 1;
      setDisplayScore(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  // Determine tier color and icon (never color alone)
  let strokeColor = '#7BAE7F'; // softgreen
  let TierIcon = Award;
  let tierText = 'Model Village';

  if (score < 35) {
    strokeColor = '#9E3A34'; // clay
    TierIcon = AlertTriangle;
    tierText = 'Seedling';
  } else if (score < 50) {
    strokeColor = '#C4832A'; // turmeric
    TierIcon = Sprout;
    tierText = 'Sprout';
  } else if (score < 65) {
    strokeColor = '#2E5A63'; // teal
    TierIcon = TrendingUp;
    tierText = 'Growing';
  } else if (score < 80) {
    strokeColor = '#7BAE7F';
    TierIcon = ShieldCheck;
    tierText = 'Thriving';
  }

  return (
    <div className="flex flex-col items-center justify-center select-none" role="img" aria-label={`Score: ${score} out of 100, Tier: ${tierText}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-border-subtle/40 dark:text-border-subtle/20"
            strokeWidth={strokeWidth}
          />
          {/* Animated Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-serif text-3xl font-bold tracking-tight text-field-dark">
            {displayScore}
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-field-dark/60">
            / 100
          </span>
        </div>
      </div>

      {showIcon && (
        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-xs font-mono border border-border-subtle/40 bg-paper-base/60 dark:bg-field-panel/40">
          <TierIcon className="w-3.5 h-3.5" style={{ color: strokeColor }} aria-hidden="true" />
          <span className="font-semibold text-field-dark">{tierText}</span>
        </div>
      )}
    </div>
  );
}
