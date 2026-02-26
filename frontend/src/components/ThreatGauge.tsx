// =============================================================================
// SentinelOps - Threat Gauge Component
// =============================================================================

import React from 'react';

interface ThreatGaugeProps {
  score: number;
  status: string;
}

export default function ThreatGauge({ score, status }: ThreatGaugeProps) {
  const getColor = () => {
    if (score >= 80) return '#ef4444'; // red
    if (score >= 60) return '#f97316'; // orange
    if (score >= 40) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'critical':
        return 'CRITICAL';
      case 'concerning':
        return 'CONCERNING';
      case 'moderate':
        return 'MODERATE';
      case 'good':
        return 'GOOD';
      default:
        return 'UNKNOWN';
    }
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="#374151"
            strokeWidth="10"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke={getColor()}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{score}</span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>
      <span
        className="mt-4 px-3 py-1 text-xs font-bold rounded-full"
        style={{ backgroundColor: `${getColor()}20`, color: getColor() }}
      >
        {getStatusLabel()}
      </span>
    </div>
  );
}
