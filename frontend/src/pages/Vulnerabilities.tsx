// =============================================================================
// SentinelOps - Vulnerabilities Page
// =============================================================================

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bug, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export default function Vulnerabilities() {
  const { data, isLoading } = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: () => api.get('/vulnerabilities').then(res => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['vulnerability-stats'],
    queryFn: () => api.get('/vulnerabilities/stats').then(res => res.data.data),
  });

  const vulnerabilities = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Bug className="w-7 h-7 text-red-500" />
            <span>Vulnerabilities</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Security vulnerabilities from pipeline scans
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['critical', 'high', 'medium', 'low', 'total'].map((key) => (
          <div key={key} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-gray-400 text-sm capitalize">{key}</p>
            <p className={`text-2xl font-bold mt-1 ${
              key === 'critical' ? 'text-red-500' :
              key === 'high' ? 'text-orange-500' :
              key === 'medium' ? 'text-yellow-500' :
              key === 'low' ? 'text-green-500' : 'text-white'
            }`}>
              {stats?.bySeverity?.[key] || stats?.[key] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Vulnerabilities List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : vulnerabilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Bug className="w-12 h-12 mb-4" />
            <p>No vulnerabilities found</p>
            <p className="text-sm">Run a pipeline scan to detect vulnerabilities</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {vulnerabilities.map((vuln: any) => (
              <div key={vuln.vulnId} className="p-6 hover:bg-gray-900/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        vuln.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        vuln.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        vuln.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {vuln.severity}
                      </span>
                      {vuln.cveId && (
                        <a
                          href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline flex items-center space-x-1"
                        >
                          <span>{vuln.cveId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className="text-gray-500 text-sm">{vuln.source}</span>
                    </div>
                    <h3 className="text-white font-medium mt-2">{vuln.title}</h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">{vuln.description}</p>
                    <div className="flex items-center space-x-4 mt-3 text-sm">
                      <span className="text-gray-500">
                        Package: <span className="text-gray-300">{vuln.affectedComponent?.name}</span>
                      </span>
                      <span className="text-gray-500">
                        Version: <span className="text-gray-300">{vuln.affectedComponent?.version}</span>
                      </span>
                      {vuln.fixedVersion && (
                        <span className="text-gray-500">
                          Fixed in: <span className="text-green-400">{vuln.fixedVersion}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    vuln.status === 'open' ? 'bg-red-500/20 text-red-400' :
                    vuln.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                    vuln.status === 'fixed' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {vuln.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
