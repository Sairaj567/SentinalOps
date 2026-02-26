// =============================================================================
// SentinelOps - AI Threats Page
// =============================================================================

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, Brain, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

export default function Threats() {
  const { data, isLoading } = useQuery({
    queryKey: ['threats'],
    queryFn: () => api.get('/threats').then(res => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['threat-stats'],
    queryFn: () => api.get('/threats/stats').then(res => res.data.data),
  });

  const { data: modelStatus } = useQuery({
    queryKey: ['model-status'],
    queryFn: () => api.get('/threats/model/status').then(res => res.data.data),
  });

  const threats = data?.data || [];

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'attack':
        return 'bg-red-500/20 text-red-400 border-red-500';
      case 'high_risk':
        return 'bg-orange-500/20 text-orange-400 border-orange-500';
      case 'suspicious':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      default:
        return 'bg-green-500/20 text-green-400 border-green-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Zap className="w-7 h-7 text-yellow-500" />
            <span>AI Threat Detection</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Machine learning-powered anomaly detection
          </p>
        </div>
      </div>

      {/* Model Status */}
      <div className="bg-gradient-to-r from-purple-900/50 to-cyan-900/50 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Isolation Forest Model</h3>
              <p className="text-gray-400 text-sm">
                {modelStatus?.trained ? 'Trained and active' : 'Using rule-based fallback'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Model Version</p>
            <p className="text-white font-mono">{modelStatus?.version || '1.0.0'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Attacks Detected</p>
          <p className="text-3xl font-bold text-red-500 mt-2">
            {stats?.byClassification?.attack || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">High Risk</p>
          <p className="text-3xl font-bold text-orange-500 mt-2">
            {stats?.byClassification?.high_risk || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Suspicious</p>
          <p className="text-3xl font-bold text-yellow-500 mt-2">
            {stats?.byClassification?.suspicious || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Avg Threat Score</p>
          <p className="text-3xl font-bold text-white mt-2">
            {(stats?.averageScore || 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Threats List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Detected Threats</h3>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : threats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Zap className="w-12 h-12 mb-4" />
            <p>No threats detected</p>
            <p className="text-sm">The AI engine is monitoring for anomalies</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {threats.map((threat: any) => (
              <div key={threat.id} className="p-6 hover:bg-gray-900/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      threat.classification === 'attack' ? 'bg-red-500/20' :
                      threat.classification === 'high_risk' ? 'bg-orange-500/20' :
                      threat.classification === 'suspicious' ? 'bg-yellow-500/20' :
                      'bg-green-500/20'
                    }`}>
                      <span className={`text-2xl font-bold ${
                        threat.classification === 'attack' ? 'text-red-500' :
                        threat.classification === 'high_risk' ? 'text-orange-500' :
                        threat.classification === 'suspicious' ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {threat.threatScore}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{threat.sourceIp}</p>
                      <p className="text-gray-400 text-sm">
                        Confidence: {(threat.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-2 text-sm font-medium rounded-full border ${getClassificationColor(threat.classification)}`}>
                      {threat.classification.replace('_', ' ')}
                    </span>
                    <div className="text-gray-400 text-sm">
                      {new Date(threat.timestamp).toLocaleString()}
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
