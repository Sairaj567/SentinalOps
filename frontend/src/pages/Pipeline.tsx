// =============================================================================
// SentinelOps - Pipeline Page
// =============================================================================

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function Pipeline() {
  const { data, isLoading } = useQuery({
    queryKey: ['pipeline-results'],
    queryFn: () => api.get('/pipeline/results').then(res => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['pipeline-stats'],
    queryFn: () => api.get('/pipeline/stats').then(res => res.data.data),
  });

  const results = data?.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'unstable':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <GitBranch className="w-7 h-7 text-purple-500" />
            <span>DevSecOps Pipeline</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Security scan results from CI/CD pipeline
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Builds (30d)</p>
          <p className="text-3xl font-bold text-white mt-2">{stats?.totalBuilds || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Success Rate</p>
          <p className="text-3xl font-bold text-green-500 mt-2">
            {(stats?.successRate || 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Avg Issues/Build</p>
          <p className="text-3xl font-bold text-yellow-500 mt-2">
            {(stats?.averageIssues || 0).toFixed(1)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Failed Builds</p>
          <p className="text-3xl font-bold text-red-500 mt-2">
            {stats?.byStatus?.failed || 0}
          </p>
        </div>
      </div>

      {/* Pipeline Results */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Recent Pipeline Runs</h3>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <GitBranch className="w-12 h-12 mb-4" />
            <p>No pipeline runs yet</p>
            <p className="text-sm">Push code to trigger the security pipeline</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {results.map((result: any, index: number) => (
              <div key={index} className="p-6 hover:bg-gray-900/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="text-white font-medium">
                        Build #{result.buildNumber}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Commit: {result.gitCommit}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-red-500 font-bold">{result.summary?.critical || 0}</p>
                      <p className="text-xs text-gray-500">Critical</p>
                    </div>
                    <div className="text-center">
                      <p className="text-orange-500 font-bold">{result.summary?.high || 0}</p>
                      <p className="text-xs text-gray-500">High</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-500 font-bold">{result.summary?.medium || 0}</p>
                      <p className="text-xs text-gray-500">Medium</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-500 font-bold">{result.summary?.low || 0}</p>
                      <p className="text-xs text-gray-500">Low</p>
                    </div>
                    <div className="text-gray-400 text-sm">
                      {new Date(result.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
