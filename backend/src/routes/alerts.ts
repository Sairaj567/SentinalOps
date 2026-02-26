// =============================================================================
// SentinelOps - Alerts Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { Alert, IAlert } from '../models/Alert';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/alerts - Get all alerts with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      status,
      source,
      startDate,
      endDate,
      search,
    } = req.query;

    const query: any = {};

    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (source) query.source = source;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { 'rule.name': { $regex: search, $options: 'i' } },
        { sourceIp: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Alert.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

// GET /api/alerts/stats - Get alert statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalAlerts,
      bySeverity,
      byStatus,
      bySource,
      recentTrend,
    ] = await Promise.all([
      Alert.countDocuments(),
      Alert.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total: totalAlerts,
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        bySource: bySource.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        trend: recentTrend,
      },
    });
  } catch (error) {
    logger.error('Error fetching alert stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// GET /api/alerts/:id - Get single alert
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const alert = await Alert.findOne({ alertId: req.params.id });
    
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error('Error fetching alert:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch alert' });
  }
});

// POST /api/alerts - Create new alert (from Wazuh/Suricata webhooks)
router.post('/', async (req: Request, res: Response) => {
  try {
    const alertData = {
      ...req.body,
      alertId: req.body.alertId || `ALERT-${uuidv4()}`,
      timestamp: req.body.timestamp || new Date(),
    };

    const alert = new Alert(alertData);
    await alert.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('new-alert', alert);
    }

    logger.info(`New alert created: ${alert.alertId}`);
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    logger.error('Error creating alert:', error);
    res.status(500).json({ success: false, message: 'Failed to create alert' });
  }
});

// PATCH /api/alerts/:id - Update alert status
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { status, assignedTo, notes } = req.body;
    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = req.body.resolvedBy;
      }
    }
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (notes) {
      updateData.$push = { notes };
    }

    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.id },
      updateData,
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('alert-updated', alert);
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error('Error updating alert:', error);
    res.status(500).json({ success: false, message: 'Failed to update alert' });
  }
});

// POST /api/alerts/bulk - Bulk import alerts
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { alerts } = req.body;
    
    const alertsWithIds = alerts.map((alert: any) => ({
      ...alert,
      alertId: alert.alertId || `ALERT-${uuidv4()}`,
      timestamp: alert.timestamp || new Date(),
    }));

    const result = await Alert.insertMany(alertsWithIds, { ordered: false });
    
    logger.info(`Bulk imported ${result.length} alerts`);
    res.status(201).json({ success: true, imported: result.length });
  } catch (error: any) {
    logger.error('Error bulk importing alerts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to import alerts',
      imported: error.insertedDocs?.length || 0,
    });
  }
});

export default router;
