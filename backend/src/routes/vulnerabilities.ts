// =============================================================================
// SentinelOps - Vulnerabilities Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { Vulnerability } from '../models/Vulnerability';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/vulnerabilities
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      status,
      source,
      scanType,
      projectName,
    } = req.query;

    const query: any = {};

    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (source) query.source = source;
    if (scanType) query.scanType = scanType;
    if (projectName) query.projectName = projectName;

    const skip = (Number(page) - 1) * Number(limit);

    const [vulnerabilities, total] = await Promise.all([
      Vulnerability.find(query)
        .sort({ detectedAt: -1, severity: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Vulnerability.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: vulnerabilities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching vulnerabilities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vulnerabilities' });
  }
});

// GET /api/vulnerabilities/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      total,
      bySeverity,
      byStatus,
      bySource,
      byScanType,
      topCVEs,
    ] = await Promise.all([
      Vulnerability.countDocuments(),
      Vulnerability.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Vulnerability.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Vulnerability.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Vulnerability.aggregate([
        { $group: { _id: '$scanType', count: { $sum: 1 } } },
      ]),
      Vulnerability.aggregate([
        { $match: { cveId: { $exists: true, $ne: null } } },
        { $group: { _id: '$cveId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        bySeverity: Object.fromEntries(bySeverity.map(i => [i._id, i.count])),
        byStatus: Object.fromEntries(byStatus.map(i => [i._id, i.count])),
        bySource: Object.fromEntries(bySource.map(i => [i._id, i.count])),
        byScanType: Object.fromEntries(byScanType.map(i => [i._id, i.count])),
        topCVEs,
      },
    });
  } catch (error) {
    logger.error('Error fetching vulnerability stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// POST /api/vulnerabilities - Create from scan results
router.post('/', async (req: Request, res: Response) => {
  try {
    const vulnData = {
      ...req.body,
      vulnId: req.body.vulnId || `VULN-${uuidv4()}`,
      detectedAt: req.body.detectedAt || new Date(),
    };

    const vulnerability = new Vulnerability(vulnData);
    await vulnerability.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('new-vulnerability', vulnerability);
    }

    res.status(201).json({ success: true, data: vulnerability });
  } catch (error) {
    logger.error('Error creating vulnerability:', error);
    res.status(500).json({ success: false, message: 'Failed to create vulnerability' });
  }
});

// PATCH /api/vulnerabilities/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { status, assignedTo, dueDate } = req.body;
    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'fixed') {
        updateData.fixedAt = new Date();
      }
    }
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (dueDate) updateData.dueDate = new Date(dueDate);

    const vulnerability = await Vulnerability.findOneAndUpdate(
      { vulnId: req.params.id },
      updateData,
      { new: true }
    );

    if (!vulnerability) {
      return res.status(404).json({ success: false, message: 'Vulnerability not found' });
    }

    res.json({ success: true, data: vulnerability });
  } catch (error) {
    logger.error('Error updating vulnerability:', error);
    res.status(500).json({ success: false, message: 'Failed to update vulnerability' });
  }
});

// POST /api/vulnerabilities/import/trivy - Import Trivy scan results
router.post('/import/trivy', async (req: Request, res: Response) => {
  try {
    const { results, projectName, pipelineBuild } = req.body;
    const vulnerabilities: any[] = [];

    for (const result of results) {
      if (result.Vulnerabilities) {
        for (const vuln of result.Vulnerabilities) {
          vulnerabilities.push({
            vulnId: `VULN-${uuidv4()}`,
            cveId: vuln.VulnerabilityID,
            title: vuln.Title || vuln.VulnerabilityID,
            description: vuln.Description || 'No description available',
            severity: vuln.Severity?.toLowerCase() || 'medium',
            cvssScore: vuln.CVSS?.nvd?.V3Score,
            source: 'trivy',
            scanType: 'container',
            affectedComponent: {
              name: vuln.PkgName,
              version: vuln.InstalledVersion,
              type: result.Type || 'unknown',
              path: result.Target,
            },
            fixedVersion: vuln.FixedVersion,
            references: vuln.References || [],
            projectName,
            pipelineBuild,
            status: 'open',
            detectedAt: new Date(),
          });
        }
      }
    }

    if (vulnerabilities.length > 0) {
      await Vulnerability.insertMany(vulnerabilities, { ordered: false });
    }

    res.status(201).json({
      success: true,
      imported: vulnerabilities.length,
    });
  } catch (error) {
    logger.error('Error importing Trivy results:', error);
    res.status(500).json({ success: false, message: 'Failed to import scan results' });
  }
});

// POST /api/vulnerabilities/import/semgrep - Import Semgrep scan results
router.post('/import/semgrep', async (req: Request, res: Response) => {
  try {
    const { results, projectName, pipelineBuild } = req.body;
    const vulnerabilities: any[] = [];

    for (const result of results) {
      vulnerabilities.push({
        vulnId: `VULN-${uuidv4()}`,
        title: result.check_id,
        description: result.extra?.message || 'Security issue detected',
        severity: mapSemgrepSeverity(result.extra?.severity),
        source: 'semgrep',
        scanType: 'sast',
        affectedComponent: {
          name: result.path,
          version: 'N/A',
          type: 'source-code',
          path: `${result.path}:${result.start?.line}`,
        },
        remediation: result.extra?.fix,
        references: result.extra?.metadata?.references || [],
        projectName,
        pipelineBuild,
        status: 'open',
        detectedAt: new Date(),
        metadata: {
          line: result.start?.line,
          column: result.start?.col,
          code: result.extra?.lines,
        },
      });
    }

    if (vulnerabilities.length > 0) {
      await Vulnerability.insertMany(vulnerabilities, { ordered: false });
    }

    res.status(201).json({
      success: true,
      imported: vulnerabilities.length,
    });
  } catch (error) {
    logger.error('Error importing Semgrep results:', error);
    res.status(500).json({ success: false, message: 'Failed to import scan results' });
  }
});

function mapSemgrepSeverity(severity: string): string {
  const mapping: Record<string, string> = {
    'ERROR': 'critical',
    'WARNING': 'high',
    'INFO': 'medium',
  };
  return mapping[severity] || 'low';
}

export default router;
