// =============================================================================
// SentinelOps - WebSocket React Hook
// =============================================================================
// Auto-connects on mount, invalidates React Query caches on real-time events.
// Usage: useWebSocket() in a top-level component (e.g., Layout)
// =============================================================================

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '../services/websocket';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || connectedRef.current) return;

    wsService.connect();
    connectedRef.current = true;

    // ── Alert events ────────────────────────────────
    const unsubNewAlert = wsService.subscribe('alert:new', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['recent-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['notification-alerts'] });

      toast(`🚨 New Alert: ${data?.rule?.name || 'Security alert detected'}`, {
        icon: '⚠️',
        duration: 5000,
      });
    });

    const unsubAlertUpdated = wsService.subscribe('alert:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['recent-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    });

    // ── Threat events ───────────────────────────────
    const unsubThreat = wsService.subscribe('threat:detected', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['threats'] });
      queryClient.invalidateQueries({ queryKey: ['threat-stats'] });

      if (data?.classification === 'attack' || data?.classification === 'high_risk') {
        toast.error(`🛡️ High-risk threat from ${data?.sourceIp || 'unknown'}`, {
          duration: 8000,
        });
      }
    });

    // ── Pipeline events ─────────────────────────────
    const unsubPipeline = wsService.subscribe('pipeline:completed', () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-results'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      toast.success('Pipeline scan completed');
    });

    // ── Agent events ────────────────────────────────
    const unsubAgent = wsService.subscribe('agent:status', () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent-stats'] });
    });

    return () => {
      unsubNewAlert();
      unsubAlertUpdated();
      unsubThreat();
      unsubPipeline();
      unsubAgent();
      wsService.disconnect();
      connectedRef.current = false;
    };
  }, [isAuthenticated, queryClient]);
}
