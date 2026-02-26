// =============================================================================
// SentinelOps - Stat Card Component
// =============================================================================

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'purple';
}

const colorClasses = {
  red: 'bg-red-500/20 text-red-500',
  orange: 'bg-orange-500/20 text-orange-500',
  yellow: 'bg-yellow-500/20 text-yellow-500',
  green: 'bg-green-500/20 text-green-500',
  cyan: 'bg-cyan-500/20 text-cyan-500',
  purple: 'bg-purple-500/20 text-purple-500',
};

export default function StatCard({ title, value, change, changeLabel, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm ${change > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{change}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p>
        {changeLabel && (
          <p className="text-xs text-gray-500 mt-1">{changeLabel}</p>
        )}
      </div>
    </div>
  );
}
