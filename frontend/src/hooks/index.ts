// =============================================================================
// SentinelOps - Custom Hooks
// =============================================================================

import { useEffect, useCallback, useState } from 'react';
import { wsService } from '../services/websocket';
import toast from 'react-hot-toast';

/**
 * Hook for real-time alert notifications
 */
export function useAlertNotifications() {
  useEffect(() => {
    wsService.connect();

    const unsubscribe = wsService.subscribe('alert:new', (alert: any) => {
      const severity = alert.severity || 'info';
      const message = alert.rule?.name || 'New security alert';
      
      if (severity === 'critical' || severity === 'high') {
        toast.error(`🚨 ${message}`, {
          duration: 6000,
        });
      } else {
        toast(message, {
          icon: '⚠️',
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
}

/**
 * Hook for real-time threat detection notifications
 */
export function useThreatNotifications() {
  useEffect(() => {
    const unsubscribe = wsService.subscribe('threat:detected', (threat: any) => {
      if (threat.classification === 'attack') {
        toast.error(`🔴 Attack detected from ${threat.sourceIp}`, {
          duration: 10000,
        });
      } else if (threat.classification === 'high_risk') {
        toast.error(`🟠 High risk activity from ${threat.sourceIp}`, {
          duration: 8000,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
}

/**
 * Hook for subscribing to WebSocket events
 */
export function useWebSocketEvent<T>(event: string, callback: (data: T) => void) {
  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.subscribe(event, callback);
    return () => unsubscribe();
  }, [event, callback]);
}

/**
 * Hook for debounced search
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for local storage state
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  return [storedValue, setValue];
}
