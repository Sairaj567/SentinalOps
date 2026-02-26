// =============================================================================
// SentinelOps - Dashboard Page
// =============================================================================

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, AlertTriangle, Bug, Activity, 
  TrendingUp, Server, Zap, Clock 
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { api } from '../services/api';
import StatCard from '../components/StatCard';
import ThreatGauge from '../components/ThreatGauge';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api.get('/metrics/dashboard').then(res => res.data.data),
    refetchInterval: 30000,
  });

  const { data: securityScore } = useQuery({
    queryKey: ['security-score'],
    queryFn: () => api.get('/metrics/security-score').then(res => res.data.data),
    refetchInterval: 60000,
  });

  const { data: threatStats } = useQuery({
    queryKey: ['threat-stats'],
    queryFn: () => api.get('/threats/stats').then(res => res.data.data),
  });

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const severityData = metrics?.alerts?.bySeverity ? [
    { name: 'Critical', value: metrics.alerts.bySeverity.critical || 0 },
    { name: 'High', value: metrics.alerts.bySeverity.high || 0 },
    { name: 'Medium', value: metrics.alerts.bySeverity.medium || 0 },
    { name: 'Low', value: metrics.alerts.bySeverity.low || 0 },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
          <p className="text-gray-400">Real-time security monitoring and threat detection</p>
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Security Score */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Security Score</h3>
          <ThreatGauge score={securityScore?.score || 0} status={securityScore?.status || 'unknown'} />
          <div className="mt-4 space-y-2">
            {securityScore?.recommendations?.slice(0, 2).map((rec: string, idx: number) => (
              <p key={idx} className="text-xs text-gray-400">• {rec}</p>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Alerts"
            value={metrics?.alerts?.total || 0}
            change={metrics?.alerts?.last24h || 0}
            changeLabel="Last 24h"
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            title="Open Vulnerabilities"
            value={metrics?.vulnerabilities?.total || 0}
            change={metrics?.vulnerabilities?.last24h || 0}
            changeLabel="New today"
            icon={Bug}
            color="orange"
          />
          <StatCard
            title="Active Threats"
            value={threatStats?.byClassification?.attack || 0}
            change={threatStats?.byClassification?.high_risk || 0}
            changeLabel="High risk"
            icon={Zap}
            color="yellow"
          />
          <StatCard
            title="Active Agents"
            value={3}
            change={2}
            changeLabel="Online"
            icon={Server}
            color="green"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Trend */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Alert Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="_id.date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Alert Severity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {severityData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm text-gray-400">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
            <a href="/alerts" className="text-cyan-400 text-sm hover:underline">
              View all →
            </a>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    i === 1 ? 'bg-red-500' : i === 2 ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm text-white">
                      {i === 1 ? 'Multiple failed SSH login attempts' :
                       i === 2 ? 'Suspicious process detected' :
                       i === 3 ? 'Port scan detected from external IP' :
                       i === 4 ? 'Unusual outbound traffic' :
                       'File integrity change detected'}
                    </p>
                    <p className="text-xs text-gray-500">
                      10.0.1.{100 + i} • {i * 5} minutes ago
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  i === 1 ? 'bg-red-500/20 text-red-400' :
                  i === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {i === 1 ? 'Critical' : i === 2 ? 'High' : 'Medium'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Threats */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">AI Threat Detection</h3>
            <a href="/threats" className="text-cyan-400 text-sm hover:underline">
              View all →
            </a>
          </div>
          <div className="space-y-3">
            {threatStats?.topThreats?.slice(0, 5).map((threat: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Shield className={`w-5 h-5 ${
                    threat.classification === 'attack' ? 'text-red-500' :
                    threat.classification === 'high_risk' ? 'text-orange-500' :
                    threat.classification === 'suspicious' ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                  <div>
                    <p className="text-sm text-white">{threat.sourceIp}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {threat.classification.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{threat.score}</p>
                  <p className="text-xs text-gray-500">Threat Score</p>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-8">No threat data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
