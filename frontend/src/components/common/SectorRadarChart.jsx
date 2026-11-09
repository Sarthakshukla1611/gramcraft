import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useGramStore } from '../../store/useGramStore';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function SectorRadarChart({ sectors = {}, height = 260 }) {
  const theme = useGramStore((state) => state.theme);
  const isDark = theme === 'dark';

  const labels = ['Sanitation', 'Water', 'Education', 'Roads', 'Electricity', 'Healthcare'];
  const values = [
    typeof sectors.sanitation === 'object' ? sectors.sanitation?.score || 0 : sectors.sanitation || 0,
    typeof sectors.water === 'object' ? sectors.water?.score || 0 : sectors.water || 0,
    typeof sectors.education === 'object' ? sectors.education?.score || 0 : sectors.education || 0,
    typeof sectors.roads === 'object' ? sectors.roads?.score || 0 : sectors.roads || 0,
    typeof sectors.electricity === 'object' ? sectors.electricity?.score || 0 : sectors.electricity || 0,
    typeof sectors.healthcare === 'object' ? sectors.healthcare?.score || 0 : sectors.healthcare || 0,
  ];

  const data = {
    labels,
    datasets: [
      {
        label: 'Sector Performance',
        data: values,
        backgroundColor: isDark ? 'rgba(221, 160, 70, 0.25)' : 'rgba(196, 131, 42, 0.2)', // Turmeric fill
        borderColor: isDark ? '#DDA046' : '#C4832A', // Turmeric line
        borderWidth: 2,
        pointBackgroundColor: isDark ? '#DDA046' : '#C4832A',
        pointBorderColor: isDark ? '#162922' : '#F6F1E4',
        pointHoverBackgroundColor: '#FFFFFF',
        pointHoverBorderColor: '#C4832A',
        pointRadius: 4,
      },
      {
        label: 'Balanced Baseline (50)',
        data: [50, 50, 50, 50, 50, 50],
        borderColor: isDark ? 'rgba(73, 130, 142, 0.5)' : 'rgba(46, 90, 99, 0.4)', // Teal guideline
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
          display: false,
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(22, 41, 34, 0.1)',
        },
        angleLines: {
          color: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(22, 41, 34, 0.12)',
        },
        pointLabels: {
          color: isDark ? '#F6F1E4' : '#162922',
          font: {
            family: '"IBM Plex Sans", sans-serif',
            size: 11,
            weight: '500',
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.raw}%`,
        },
      },
    },
  };

  return (
    <div style={{ height }} className="relative flex items-center justify-center p-2">
      <Radar data={data} options={options} />
    </div>
  );
}
