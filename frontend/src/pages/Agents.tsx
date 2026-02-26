// =============================================================================
// SentinelOps - Agents Page
// =============================================================================

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Server, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Agents() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents').then(res => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['agent-stats'],
    queryFn: () => api.get('/agents/stats/summary').then(res => res.data.data),
  });

  const agents = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Server className="w-7 h-7 text-cyan-500" />
            <span>Security Agents</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Wazuh agents deployed across your infrastructure
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Agents</p>
          <p className="text-3xl font-bold text-white mt-2">{stats?.total || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-3xl font-bold text-green-500 mt-2">{stats?.active || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Disconnected</p>
          <p className="text-3xl font-bold text-red-500 mt-2">{stats?.disconnected || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Pending</p>
          <p className="text-3xl font-bold text-yellow-500 mt-2">{stats?.pending || 0}</p>
        </div>
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <Server className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No agents registered</p>
          <p className="text-gray-500 text-sm mt-2">
            Deploy Wazuh agents on your servers to start monitoring
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent: any) => (
            <div
              key={agent.id}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${
                    agent.status === 'active' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {agent.status === 'active' ? (
                      <Wifi className="w-6 h-6 text-green-500" />
                    ) : (
                      <WifiOff className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{agent.name}</h3>
                    <p className="text-gray-400 text-sm">ID: {agent.id}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  agent.status === 'active' 
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {agent.status}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IP Address</span>
                  <span className="text-white font-mono">{agent.ip}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">OS</span>
                  <span className="text-white">{agent.os?.name} {agent.os?.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Agent Version</span>
                  <span className="text-white">{agent.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Seen</span>
                  <span className="text-white">
                    {new Date(agent.lastKeepAlive).toLocaleString()}
                  </span>
                </div>
              </div>

              {agent.group && agent.group.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {agent.group.map((g: string) => (
                    <span
                      key={g}
                      className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
