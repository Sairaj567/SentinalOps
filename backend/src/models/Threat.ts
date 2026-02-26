// =============================================================================
// SentinelOps - Threat Model (MongoDB)
// =============================================================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IThreat extends Document {
  threatId: string;
  timestamp: Date;
  sourceIp: string;
  threatScore: number;
  classification: 'normal' | 'suspicious' | 'high_risk' | 'attack';
  confidence: number;
  features: Record<string, any>;
  relatedAlerts: string[];
  modelVersion: string;
}

const ThreatSchema = new Schema<IThreat>({
  threatId: {
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
  sourceIp: {
    type: String,
    required: true,
    index: true,
  },
  threatScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true,
  },
  classification: {
    type: String,
    required: true,
    enum: ['normal', 'suspicious', 'high_risk', 'attack'],
    index: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  features: {
    type: Schema.Types.Mixed,
    default: {},
  },
  relatedAlerts: [{
    type: String,
  }],
  modelVersion: {
    type: String,
    default: '1.0.0',
  },
}, {
  timestamps: true,
  collection: 'threats',
});

// Indexes for common queries
ThreatSchema.index({ timestamp: -1, classification: 1 });
ThreatSchema.index({ threatScore: -1 });

export const Threat = mongoose.model<IThreat>('Threat', ThreatSchema);
