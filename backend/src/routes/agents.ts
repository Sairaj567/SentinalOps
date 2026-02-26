// =============================================================================
// SentinelOps - Agents Routes (Wazuh Agents Management)
// =============================================================================

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

const WAZUH_API_URL = process.env.WAZUH_API_URL || 'https://localhost:55000';
const WAZUH_USER = process.env.WAZUH_USER || 'wazuh';
const WAZUH_PASSWORD = process.env.WAZUH_PASSWORD || 'wazuh';

// GET /api/agents - Get all registered agents
router.get('/', async (req: Request, res: Response) => {
  try {
    // Try to fetch from Wazuh API
    try {
      const token = await getWazuhToken();
      const response = await axios.get(`${WAZUH_API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      });
      
      res.json({
        success: true,
        source: 'wazuh',
        data: response.data.data.affected_items,
      });
    } catch (wazuhError) {
      // Return mock data if Wazuh is not available
      logger.warn('Wazuh API not available, returning mock data');
      res.json({
        success: true,
        source: 'mock',
        data: getMockAgents(),
      });
    }
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id - Get single agent details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    try {
      const token = await getWazuhToken();
      const response = await axios.get(`${WAZUH_API_URL}/agents/${req.params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      });
      
      res.json({ success: true, data: response.data.data.affected_items[0] });
    } catch (wazuhError) {
      const mockAgent = getMockAgents().find(a => a.id === req.params.id);
      if (mockAgent) {
        res.json({ success: true, source: 'mock', data: mockAgent });
      } else {
        res.status(404).json({ success: false, message: 'Agent not found' });
      }
    }
  } catch (error) {
    logger.error('Error fetching agent:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agent' });
  }
});

// GET /api/agents/stats - Get agent statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    try {
      const token = await getWazuhToken();
      const response = await axios.get(`${WAZUH_API_URL}/agents/summary/status`, {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      });
      
      res.json({ success: true, data: response.data.data });
    } catch (wazuhError) {
      res.json({
        success: true,
        source: 'mock',
        data: {
          total: 3,
          active: 2,
          disconnected: 1,
          never_connected: 0,
          pending: 0,
        },
      });
    }
  } catch (error) {
    logger.error('Error fetching agent stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// POST /api/agents/:id/restart - Restart agent
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const token = await getWazuhToken();
    const response = await axios.put(
      `${WAZUH_API_URL}/agents/${req.params.id}/restart`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      }
    );
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error('Error restarting agent:', error);
    res.status(500).json({ success: false, message: 'Failed to restart agent' });
  }
});

async function getWazuhToken(): Promise<string> {
  const response = await axios.post(
    `${WAZUH_API_URL}/security/user/authenticate`,
    {},
    {
      auth: { username: WAZUH_USER, password: WAZUH_PASSWORD },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    }
  );
  return response.data.data.token;
}

function getMockAgents() {
  return [
    {
      id: '001',
      name: 'victim-server',
      ip: '10.0.1.100',
      status: 'active',
      os: {
        name: 'Ubuntu',
        version: '22.04',
        platform: 'ubuntu',
      },
      version: '4.7.0',
      lastKeepAlive: new Date().toISOString(),
      group: ['default', 'vulnerable-apps'],
    },
    {
      id: '002',
      name: 'jenkins-server',
      ip: '10.0.1.101',
      status: 'active',
      os: {
        name: 'Ubuntu',
        version: '22.04',
        platform: 'ubuntu',
      },
      version: '4.7.0',
      lastKeepAlive: new Date().toISOString(),
      group: ['default', 'cicd'],
    },
    {
      id: '003',
      name: 'docker-host',
      ip: '10.0.1.102',
      status: 'disconnected',
      os: {
        name: 'Ubuntu',
        version: '22.04',
        platform: 'ubuntu',
      },
      version: '4.7.0',
      lastKeepAlive: new Date(Date.now() - 3600000).toISOString(),
      group: ['default', 'containers'],
    },
  ];
}

export default router;
