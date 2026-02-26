// =============================================================================
// SentinelOps - Frontend TypeScript Types
// =============================================================================
// Shared types used across pages, services, and components.
// =============================================================================

// ─── Alert ─────────────────────────────────────────────────────────────────────
export interface Alert {
  _id: string;
  alertId: string;
  timestamp: string;
  source: 'wazuh' | 'suricata' | 'falco' | 'pipeline' | string;
  sourceIp: string;
  destIp?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  rule: {
    id: string;
    name: string;
    description?: string;
  };
  message: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  tags: string[];
  metadata?: Record<string, any>;
  aiThreatScore?: number;
  aiClassification?: string;
}

// ─── Vulnerability ────────────────────────────────────────────────────────────
export interface Vulnerability {
  _id: string;
  vulnId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cveId?: string;
  source: string;
  status: 'open' | 'in_progress' | 'fixed' | 'wont_fix';
  affectedComponent: {
    name: string;
    version: string;
    type: string;
  };
  fixedVersion?: string;
  description: string;
  detectedAt: string;
}

// ─── Threat Score ─────────────────────────────────────────────────────────────
export interface ThreatScore {
  _id: string;
  threatId: string;
  timestamp: string;
  sourceIp: string;
  threatScore: number;
  classification: 'normal' | 'suspicious' | 'high_risk' | 'attack';
  confidence: number;
  features: Record<string, any>;
  relatedAlerts: string[];
  modelVersion?: string;
}

// ─── Agent ────────────────────────────────────────────────────────────────────
export interface Agent {
  id: string;
  name: string;
  ip: string;
  os: string;
  version: string;
  status: 'active' | 'disconnected' | 'pending' | 'never_connected';
  lastKeepAlive: string;
  group: string[];
}

// ─── Pipeline Result ──────────────────────────────────────────────────────────
export interface PipelineResult {
  _id: string;
  pipelineId: string;
  buildNumber: number;
  status: 'success' | 'failure' | 'running' | 'pending';
  branch: string;
  commit: {
    sha: string;
    message: string;
    author: string;
  };
  startedAt: string;
  completedAt?: string;
  duration?: number;
  issues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  stages: {
    name: string;
    status: string;
    duration?: number;
  }[];
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
export interface DashboardMetrics {
  alerts: {
    total: number;
    last24h: number;
    bySeverity: Record<string, number>;
  };
  vulnerabilities: {
    total: number;
    last24h: number;
    bySeverity: Record<string, number>;
  };
  trend: Array<{ _id: { date: string; severity: string }; count: number }>;
  timestamp: string;
}

export interface SecurityScore {
  score: number;
  status: 'good' | 'moderate' | 'concerning' | 'critical';
  factors: {
    criticalAlerts: number;
    highAlerts: number;
    criticalVulns: number;
    highVulns: number;
    unresolvedAlerts: number;
  };
  recommendations: string[];
}

// ─── User & Auth ──────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
