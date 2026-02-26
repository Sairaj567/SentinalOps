// =============================================================================
// SentinelOps - Threats Routes (AI Threat Detection)
// =============================================================================

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:5000';

interface ThreatScore {
  id: string;
  timestamp: Date;
  sourceIp: string;
  threatScore: number;
  classification: 'normal' | 'suspicious' | 'high_risk' | 'attack';
  confidence: number;
  features: Record<string, number>;
  relatedAlerts: string[];
}

// In-memory storage for threat scores
const threatScores: ThreatScore[] = [];

// GET /api/threats - Get all threat scores
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      classification,
      minScore,
    } = req.query;

    let filtered = [...threatScores];

    if (classification) {
      filtered = filtered.filter(t => t.classification === classification);
    }
    if (minScore) {
      filtered = filtered.filter(t => t.threatScore >= Number(minScore));
    }

    const skip = (Number(page) - 1) * Number(limit);
    const results = filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(skip, skip + Number(limit));

    res.json({
      success: true,
      data: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filtered.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching threat scores:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch threat scores' });
  }
});

// GET /api/threats/stats - Get threat statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const last24h = threatScores.filter(t => 
      now.getTime() - t.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const stats = {
      total: threatScores.length,
      last24h: last24h.length,
      byClassification: {
        normal: threatScores.filter(t => t.classification === 'normal').length,
        suspicious: threatScores.filter(t => t.classification === 'suspicious').length,
        high_risk: threatScores.filter(t => t.classification === 'high_risk').length,
        attack: threatScores.filter(t => t.classification === 'attack').length,
      },
      averageScore: threatScores.reduce((sum, t) => sum + t.threatScore, 0) / threatScores.length || 0,
      topThreats: threatScores
        .sort((a, b) => b.threatScore - a.threatScore)
        .slice(0, 10)
        .map(t => ({
          sourceIp: t.sourceIp,
          score: t.threatScore,
          classification: t.classification,
        })),
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching threat stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// POST /api/threats/analyze - Analyze data with ML engine
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { alerts, logs } = req.body;

    // Send to ML engine for analysis
    const response = await axios.post(`${ML_ENGINE_URL}/predict`, {
      alerts,
      logs,
    });

    const predictions = response.data;

    // Store threat scores
    for (const prediction of predictions) {
      const threatScore: ThreatScore = {
        id: `THREAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        sourceIp: prediction.source_ip,
        threatScore: prediction.threat_score,
        classification: classifyThreat(prediction.threat_score),
        confidence: prediction.confidence,
        features: prediction.features,
        relatedAlerts: prediction.related_alerts || [],
      };

      threatScores.push(threatScore);

      // Keep only last 1000 scores
      if (threatScores.length > 1000) {
        threatScores.shift();
      }

      // Emit real-time event for high-risk threats
      if (threatScore.classification === 'high_risk' || threatScore.classification === 'attack') {
        const io = req.app.get('io');
        if (io) {
          io.emit('high-threat', threatScore);
        }
      }
    }

    res.json({ success: true, data: predictions });
  } catch (error) {
    logger.error('Error analyzing threats:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze threats' });
  }
});

// POST /api/threats/train - Trigger model retraining
router.post('/train', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${ML_ENGINE_URL}/train`, req.body);
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error('Error triggering model training:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger training' });
  }
});

// GET /api/threats/model/status - Get ML model status
router.get('/model/status', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${ML_ENGINE_URL}/status`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error('Error fetching model status:', error);
    res.status(500).json({ success: false, message: 'ML engine not available' });
  }
});

function classifyThreat(score: number): ThreatScore['classification'] {
  if (score >= 80) return 'attack';
  if (score >= 60) return 'high_risk';
  if (score >= 40) return 'suspicious';
  return 'normal';
}

export default router;
