// =============================================================================
// SentinelOps - Database Seed Script
// =============================================================================
// Run: npx ts-node src/database/seed.ts
// Populates MongoDB with realistic demo data for first-run experience
// =============================================================================

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';
import { Alert } from '../models/Alert';
import { Vulnerability } from '../models/Vulnerability';
import { logger } from '../utils/logger';
import { connectDatabase, disconnectDatabase } from './connection';

// ─── Demo Users ────────────────────────────────────────────────────────────────
const users = [
  { email: 'admin@sentinelops.io', password: 'Admin@2025!', name: 'Admin User', role: 'admin' as const },
  { email: 'analyst@sentinelops.io', password: 'Analyst@2025!', name: 'Jane Analyst', role: 'analyst' as const },
  { email: 'viewer@sentinelops.io', password: 'Viewer@2025!', name: 'Bob Viewer', role: 'viewer' as const },
];

// ─── Demo Alerts ───────────────────────────────────────────────────────────────
const generateAlerts = (): any[] => {
  const templates = [
    { severity: 'critical' as const, source: 'wazuh', category: 'Authentication', rule: { id: 'W-5710', name: 'Multiple failed SSH login attempts', description: 'More than 8 failed SSH authentication attempts detected' }, message: 'Multiple failed SSH login attempts detected from 192.168.1.50 targeting root account' },
    { severity: 'critical' as const, source: 'suricata', category: 'Intrusion', rule: { id: 'S-2001', name: 'SQL injection attempt detected', description: 'Detected SQL injection payload in HTTP request' }, message: 'SQL injection attempt in POST /api/users?id=1 OR 1=1 from 10.0.2.55' },
    { severity: 'high' as const, source: 'falco', category: 'Runtime', rule: { id: 'F-1001', name: 'Suspicious process spawned in container', description: 'A shell was spawned inside a running container' }, message: 'Shell /bin/bash spawned in container sentinelops-backend by user root' },
    { severity: 'high' as const, source: 'wazuh', category: 'FileIntegrity', rule: { id: 'W-550', name: 'File integrity change detected', description: 'Critical system file was modified' }, message: '/etc/shadow was modified by an unknown process' },
    { severity: 'high' as const, source: 'suricata', category: 'Network', rule: { id: 'S-3050', name: 'Port scan detected from external IP', description: 'Sequential port scanning activity detected' }, message: 'Sequential port scan from 203.0.113.42 targeting ports 1-1024 on sentinel-server' },
    { severity: 'medium' as const, source: 'wazuh', category: 'Policy', rule: { id: 'W-2502', name: 'Firewall rule modified', description: 'iptables rules were changed' }, message: 'Firewall rule added: ACCEPT all from 0.0.0.0/0 to port 8080' },
    { severity: 'medium' as const, source: 'falco', category: 'Runtime', rule: { id: 'F-2010', name: 'Unusual outbound connection', description: 'Container made connection to uncommon external port' }, message: 'Container sentinelops-ml connected to 45.33.32.156:4444 (uncommon port)' },
    { severity: 'medium' as const, source: 'suricata', category: 'Network', rule: { id: 'S-4200', name: 'DNS query to known bad domain', description: 'DNS resolution request for a known malicious domain' }, message: 'DNS query for evil-c2-server.ru from 10.0.1.102' },
    { severity: 'low' as const, source: 'wazuh', category: 'Authentication', rule: { id: 'W-5501', name: 'Successful SSH login', description: 'Successful SSH authentication recorded' }, message: 'Successful SSH login for user deploy from 10.0.0.5' },
    { severity: 'low' as const, source: 'wazuh', category: 'System', rule: { id: 'W-1002', name: 'Service restarted', description: 'A monitored service was restarted' }, message: 'Service nginx restarted on sentinel-server' },
    { severity: 'critical' as const, source: 'pipeline', category: 'Supply Chain', rule: { id: 'P-9001', name: 'Malicious package detected', description: 'A known malicious npm package was found in dependencies' }, message: 'Dependency ua-parser-js@0.7.29 flagged as compromised (CVE-2021-44228)' },
    { severity: 'high' as const, source: 'suricata', category: 'Exfiltration', rule: { id: 'S-5500', name: 'Large data transfer to external IP', description: 'Unusually large outbound data transfer detected' }, message: '2.4 GB transferred to 104.21.55.23 over 15 minutes from 10.0.1.105' },
  ];

  const sourceIPs = ['10.0.1.101', '10.0.1.102', '10.0.1.103', '192.168.1.50', '203.0.113.42', '10.0.2.55', '172.16.0.8'];
  const destIPs = ['10.0.0.1', '10.0.0.2', '104.21.55.23', '45.33.32.156'];
  const statuses: Array<'new' | 'investigating' | 'resolved' | 'false_positive'> = ['new', 'new', 'new', 'investigating', 'investigating', 'resolved', 'false_positive'];

  const alerts: any[] = [];
  const now = Date.now();

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const hoursAgo = Math.floor(Math.random() * 168); // up to 7 days
    alerts.push({
      alertId: `ALERT-${uuidv4().slice(0, 8).toUpperCase()}`,
      timestamp: new Date(now - hoursAgo * 3600 * 1000),
      source: t.source,
      sourceIp: sourceIPs[Math.floor(Math.random() * sourceIPs.length)],
      destIp: destIPs[Math.floor(Math.random() * destIPs.length)],
      severity: t.severity,
      category: t.category,
      rule: t.rule,
      message: t.message,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      tags: [t.category.toLowerCase(), t.source],
      metadata: {},
    });
  }
  return alerts;
};

// ─── Demo Vulnerabilities ──────────────────────────────────────────────────────
const vulnerabilities = [
  { vulnId: 'VULN-001', title: 'Prototype Pollution in lodash', severity: 'critical', cveId: 'CVE-2020-8203', source: 'dependency-check', status: 'open', affectedComponent: { name: 'lodash', version: '4.17.15', type: 'npm' }, fixedVersion: '4.17.21', description: 'Prototype pollution vulnerability allowing property injection via merge, mergeWith, and defaultsDeep functions.' },
  { vulnId: 'VULN-002', title: 'Remote Code Execution in Log4j', severity: 'critical', cveId: 'CVE-2021-44228', source: 'trivy', status: 'open', affectedComponent: { name: 'log4j-core', version: '2.14.1', type: 'maven' }, fixedVersion: '2.17.1', description: 'Apache Log4j2 JNDI features allow remote code execution via crafted log messages.' },
  { vulnId: 'VULN-003', title: 'XSS via dangerouslySetInnerHTML', severity: 'high', source: 'semgrep', status: 'open', affectedComponent: { name: 'frontend', version: '1.0.0', type: 'source' }, description: 'User-controlled data passed to dangerouslySetInnerHTML without sanitization in AlertDetails component.' },
  { vulnId: 'VULN-004', title: 'Insecure Deserialization in express-session', severity: 'high', cveId: 'CVE-2023-26920', source: 'dependency-check', status: 'in_progress', affectedComponent: { name: 'express-session', version: '1.17.2', type: 'npm' }, fixedVersion: '1.17.3', description: 'Insecure deserialization in session handling allows session hijacking.' },
  { vulnId: 'VULN-005', title: 'Container running as root', severity: 'medium', source: 'trivy', status: 'open', affectedComponent: { name: 'sentinelops-backend', version: 'latest', type: 'docker' }, description: 'Docker container is running with root privileges. Use a non-root user for better security isolation.' },
  { vulnId: 'VULN-006', title: 'Missing CSRF token validation', severity: 'medium', source: 'semgrep', status: 'open', affectedComponent: { name: 'backend', version: '1.0.0', type: 'source' }, description: 'POST endpoints missing CSRF token validation. Implement csurf or similar middleware.' },
  { vulnId: 'VULN-007', title: 'Outdated OpenSSL in base image', severity: 'low', cveId: 'CVE-2023-5678', source: 'trivy', status: 'fixed', affectedComponent: { name: 'node:18-alpine', version: '3.17', type: 'docker' }, fixedVersion: '3.18', description: 'OpenSSL vulnerability in Alpine base image allows denial-of-service.' },
];

// ─── Seed Function ─────────────────────────────────────────────────────────────
async function seed() {
  try {
    await connectDatabase();
    logger.info('Starting database seed...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Alert.deleteMany({}),
      Vulnerability.deleteMany({}),
    ]);
    logger.info('Cleared existing data');

    // Seed users
    const hashedUsers = await Promise.all(
      users.map(async (u) => {
        const salt = await bcrypt.genSalt(12);
        const password = await bcrypt.hash(u.password, salt);
        return { ...u, password };
      })
    );
    await User.insertMany(hashedUsers);
    logger.info(`Seeded ${users.length} users`);

    // Seed alerts
    const alerts = generateAlerts();
    await Alert.insertMany(alerts);
    logger.info(`Seeded ${alerts.length} alerts`);

    // Seed vulnerabilities
    await Vulnerability.insertMany(
      vulnerabilities.map((v) => ({ ...v, detectedAt: new Date(Date.now() - Math.random() * 7 * 86400000) }))
    );
    logger.info(`Seeded ${vulnerabilities.length} vulnerabilities`);

    logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✅ Database seeded successfully!                            ║
║                                                               ║
║   Users:                                                      ║
║     admin@sentinelops.io    / Admin@2025!    (admin)           ║
║     analyst@sentinelops.io  / Analyst@2025!  (analyst)         ║
║     viewer@sentinelops.io   / Viewer@2025!   (viewer)          ║
║                                                               ║
║   Data created:                                               ║
║     ${alerts.length} alerts | ${vulnerabilities.length} vulnerabilities                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
