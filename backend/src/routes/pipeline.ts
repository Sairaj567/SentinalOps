// =============================================================================
// SentinelOps - Pipeline Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

interface PipelineResult {
  buildNumber: string;
  gitCommit: string;
  timestamp: string;
  status: 'success' | 'failed' | 'unstable';
  scans: {
    secrets?: any;
    sast?: any;
    dependencies?: any;
    containers?: any;
    dast?: any;
  };
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// In-memory storage (replace with database in production)
const pipelineResults: PipelineResult[] = [];

// GET /api/pipeline/results - Get all pipeline results
router.get('/results', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const results = pipelineResults
      .slice()
      .reverse()
      .slice(skip, skip + Number(limit));

    res.json({
      success: true,
      data: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: pipelineResults.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching pipeline results:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
});

// POST /api/pipeline/results - Receive results from Jenkins
router.post('/results', async (req: Request, res: Response) => {
  try {
    const result: PipelineResult = {
      ...req.body,
      timestamp: req.body.timestamp || new Date().toISOString(),
      summary: calculateSummary(req.body.scans),
    };

    pipelineResults.push(result);

    // Keep only last 100 results
    if (pipelineResults.length > 100) {
      pipelineResults.shift();
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('pipeline-result', result);
    }

    logger.info(`Pipeline result received: Build #${result.buildNumber}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error saving pipeline result:', error);
    res.status(500).json({ success: false, message: 'Failed to save result' });
  }
});

// GET /api/pipeline/stats - Get pipeline statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const last30Days = pipelineResults.filter(r => {
      const date = new Date(r.timestamp);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return date >= thirtyDaysAgo;
    });

    const stats = {
      totalBuilds: last30Days.length,
      successRate: last30Days.filter(r => r.status === 'success').length / last30Days.length * 100 || 0,
      averageIssues: last30Days.reduce((sum, r) => sum + r.summary.totalIssues, 0) / last30Days.length || 0,
      criticalTrend: last30Days.map(r => ({
        date: r.timestamp.split('T')[0],
        critical: r.summary.critical,
      })),
      byStatus: {
        success: last30Days.filter(r => r.status === 'success').length,
        failed: last30Days.filter(r => r.status === 'failed').length,
        unstable: last30Days.filter(r => r.status === 'unstable').length,
      },
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching pipeline stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// GET /api/pipeline/latest - Get latest pipeline result
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const latest = pipelineResults[pipelineResults.length - 1];
    
    if (!latest) {
      return res.status(404).json({ success: false, message: 'No pipeline results found' });
    }

    res.json({ success: true, data: latest });
  } catch (error) {
    logger.error('Error fetching latest pipeline result:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch result' });
  }
});

function calculateSummary(scans: any): PipelineResult['summary'] {
  let critical = 0, high = 0, medium = 0, low = 0;

  // This is a simplified calculation - enhance based on actual scan output format
  if (scans) {
    // Parse Trivy results
    if (Array.isArray(scans.containers)) {
      for (const containerReport of scans.containers) {
        // Count vulnerabilities by severity
      }
    }
  }

  return {
    totalIssues: critical + high + medium + low,
    critical,
    high,
    medium,
    low,
  };
}

export default router;
