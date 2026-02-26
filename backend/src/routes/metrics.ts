// =============================================================================
// SentinelOps - Metrics Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { Alert } from '../models/Alert';
import { Vulnerability } from '../models/Vulnerability';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/metrics/dashboard - Get dashboard metrics
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalAlerts,
      alerts24h,
      alertsBySeverity,
      totalVulns,
      vulns24h,
      vulnsBySeverity,
      alertsTrend,
    ] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ timestamp: { $gte: last24h } }),
      Alert.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Vulnerability.countDocuments({ status: { $ne: 'fixed' } }),
      Vulnerability.countDocuments({ detectedAt: { $gte: last24h } }),
      Vulnerability.aggregate([
        { $match: { status: { $ne: 'fixed' } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $match: { timestamp: { $gte: last7d } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              severity: '$severity',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        alerts: {
          total: totalAlerts,
          last24h: alerts24h,
          bySeverity: Object.fromEntries(alertsBySeverity.map(i => [i._id, i.count])),
        },
        vulnerabilities: {
          total: totalVulns,
          last24h: vulns24h,
          bySeverity: Object.fromEntries(vulnsBySeverity.map(i => [i._id, i.count])),
        },
        trend: alertsTrend,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch metrics' });
  }
});

// GET /api/metrics/security-score - Calculate overall security score
router.get('/security-score', async (req: Request, res: Response) => {
  try {
    const [
      criticalAlerts,
      highAlerts,
      criticalVulns,
      highVulns,
      unresolvedAlerts,
    ] = await Promise.all([
      Alert.countDocuments({ severity: 'critical', status: 'new' }),
      Alert.countDocuments({ severity: 'high', status: 'new' }),
      Vulnerability.countDocuments({ severity: 'critical', status: 'open' }),
      Vulnerability.countDocuments({ severity: 'high', status: 'open' }),
      Alert.countDocuments({ status: { $in: ['new', 'investigating'] } }),
    ]);

    // Calculate security score (100 = perfect, 0 = critical)
    let score = 100;
    score -= criticalAlerts * 15;
    score -= highAlerts * 5;
    score -= criticalVulns * 10;
    score -= highVulns * 3;
    score -= Math.min(unresolvedAlerts * 0.5, 20);

    score = Math.max(0, Math.min(100, score));

    let status: string;
    if (score >= 80) status = 'good';
    else if (score >= 60) status = 'moderate';
    else if (score >= 40) status = 'concerning';
    else status = 'critical';

    res.json({
      success: true,
      data: {
        score: Math.round(score),
        status,
        factors: {
          criticalAlerts,
          highAlerts,
          criticalVulns,
          highVulns,
          unresolvedAlerts,
        },
        recommendations: generateRecommendations(score, {
          criticalAlerts,
          highAlerts,
          criticalVulns,
          highVulns,
        }),
      },
    });
  } catch (error) {
    logger.error('Error calculating security score:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate score' });
  }
});

// GET /api/metrics/realtime - Get real-time metrics for dashboard
router.get('/realtime', async (req: Request, res: Response) => {
  try {
    const lastMinute = new Date(Date.now() - 60 * 1000);
    
    const [recentAlerts, recentThreats] = await Promise.all([
      Alert.find({ timestamp: { $gte: lastMinute } })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
      Alert.countDocuments({ 
        timestamp: { $gte: lastMinute },
        severity: { $in: ['critical', 'high'] },
      }),
    ]);

    res.json({
      success: true,
      data: {
        alertsPerMinute: recentAlerts.length,
        highPriorityThreats: recentThreats,
        recentAlerts,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching realtime metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch metrics' });
  }
});

function generateRecommendations(score: number, factors: any): string[] {
  const recommendations: string[] = [];

  if (factors.criticalAlerts > 0) {
    recommendations.push(`Investigate ${factors.criticalAlerts} critical alert(s) immediately`);
  }
  if (factors.criticalVulns > 0) {
    recommendations.push(`Patch ${factors.criticalVulns} critical vulnerability(ies) urgently`);
  }
  if (factors.highAlerts > 5) {
    recommendations.push('Review high-severity alerts and assign to team members');
  }
  if (factors.highVulns > 10) {
    recommendations.push('Schedule vulnerability remediation sprint');
  }
  if (score < 60) {
    recommendations.push('Consider implementing additional security controls');
  }

  if (recommendations.length === 0) {
    recommendations.push('Security posture is healthy. Continue monitoring.');
  }

  return recommendations;
}

export default router;
