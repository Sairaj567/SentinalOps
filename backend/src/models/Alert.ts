// =============================================================================
// SentinelOps - Alert Model
// =============================================================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  alertId: string;
  timestamp: Date;
  source: string;
  sourceIp: string;
  destIp?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  rule: {
    id: string;
    name: string;
    description: string;
  };
  message: string;
  rawLog?: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  aiThreatScore?: number;
  aiClassification?: string;
  tags: string[];
  metadata: Record<string, any>;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes: Array<{
    author: string;
    content: string;
    timestamp: Date;
  }>;
}

const AlertSchema = new Schema<IAlert>({
  alertId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  source: {
    type: String,
    required: true,
    enum: ['wazuh', 'suricata', 'falco', 'custom', 'pipeline'],
    index: true,
  },
  sourceIp: {
    type: String,
    required: true,
    index: true,
  },
  destIp: {
    type: String,
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
  },
  rule: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
  },
  message: {
    type: String,
    required: true,
  },
  rawLog: {
    type: String,
  },
  status: {
    type: String,
    required: true,
    enum: ['new', 'investigating', 'resolved', 'false_positive'],
    default: 'new',
    index: true,
  },
  assignedTo: {
    type: String,
  },
  aiThreatScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  aiClassification: {
    type: String,
  },
  tags: [{
    type: String,
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: String,
  },
  notes: [{
    author: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
  collection: 'alerts',
});

// Indexes for common queries
AlertSchema.index({ timestamp: -1, severity: 1 });
AlertSchema.index({ source: 1, status: 1 });
AlertSchema.index({ aiThreatScore: -1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
