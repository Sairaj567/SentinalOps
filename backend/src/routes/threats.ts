// =============================================================================
// SentinelOps - Threats Routes (AI Threat Detection)
// =============================================================================

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import axios from 'axios';
import { Threat } from '../models/Threat';

const router = Router();

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:5000';

// GET /api/threats - Get all threat scores
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      classification,
      minScore,
    } = req.query;

    const filter: any = {};
    if (classification) filter.classification = classification;
    if (minScore) filter.threatScore = { $gte: Number(minScore) };

    const skip = (Number(page) - 1) * Number(limit);
    const [results, total] = await Promise.all([
      Threat.find(filter).sort({ timestamp: -1 }).skip(skip).limit(Number(limit)).lean(),
      Threat.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
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
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, count24h, byClassification, avgResult, topThreats] = await Promise.all([
      Threat.countDocuments(),
      Threat.countDocuments({ timestamp: { $gte: last24h } }),
      Threat.aggregate([
        { $group: { _id: '$classification', count: { $sum: 1 } } },
      ]),
      Threat.aggregate([
        { $group: { _id: null, avg: { $avg: '$threatScore' } } },
      ]),
      Threat.find()
        .sort({ threatScore: -1 })
        .limit(10)
        .select('sourceIp threatScore classification')
        .lean(),
    ]);

    const classificationMap: Record<string, number> = {};
    byClassification.forEach((item: any) => {
      classificationMap[item._id] = item.count;
    });

    const stats = {
      total,
      last24h: count24h,
      byClassification: {
        normal: classificationMap['normal'] || 0,
        suspicious: classificationMap['suspicious'] || 0,
        high_risk: classificationMap['high_risk'] || 0,
        attack: classificationMap['attack'] || 0,
      },
      averageScore: avgResult[0]?.avg || 0,
      topThreats: topThreats.map((t: any) => ({
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

    // Store threat scores in MongoDB
    for (const prediction of predictions) {
      const threat = new Threat({
        threatId: `THREAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        sourceIp: prediction.source_ip,
        threatScore: prediction.threat_score,
        classification: classifyThreat(prediction.threat_score),
        confidence: prediction.confidence,
        features: prediction.features,
        relatedAlerts: prediction.related_alerts || [],
      });

      await threat.save();

      // Emit real-time event for high-risk threats
      if (threat.classification === 'high_risk' || threat.classification === 'attack') {
        const io = req.app.get('io');
        if (io) {
          io.emit('high-threat', threat);
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

function classifyThreat(score: number): 'normal' | 'suspicious' | 'high_risk' | 'attack' {
  if (score >= 80) return 'attack';
  if (score >= 60) return 'high_risk';
  if (score >= 40) return 'suspicious';
  return 'normal';
}

export default router;

