// =============================================================================
// SentinelOps - StatCard Component (Enhanced with Animations)
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'purple';
}

const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
  red: { bg: 'bg-red-500/10', text: 'text-red-400', glow: 'shadow-red-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', glow: 'shadow-green-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
};

function useCountUp(target: number, duration = 1000): number {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    let raf: number;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + diff * eased));

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    prevTarget.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return count;
}

export default function StatCard({ title, value, change, changeLabel, icon: Icon, color }: StatCardProps) {
  const animatedValue = useCountUp(value);
  const colors = colorMap[color] || colorMap.cyan;

  return (
    <div className={`stat-card-border bg-gray-800 p-5 hover:bg-gray-750 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${colors.glow} group`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <div className={`p-2.5 rounded-xl ${colors.bg} transition-transform group-hover:scale-110`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
      </div>

      <p className="text-3xl font-bold text-white tracking-tight">
        {animatedValue.toLocaleString()}
      </p>

      {change !== undefined && (
        <div className="flex items-center space-x-1.5 mt-2">
          {change > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-gray-500" />
          )}
          <span className={`text-xs font-medium ${change > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
            {change > 0 ? '+' : ''}{change}
          </span>
          {changeLabel && (
            <span className="text-xs text-gray-500">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
