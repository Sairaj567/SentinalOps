#!/bin/bash
# =============================================================================
# SentinelOps - Victim Server Setup Script
# =============================================================================
# This script installs and configures:
# - Docker & Docker Compose
# - DVWA (Damn Vulnerable Web Application)
# - OWASP Juice Shop
# - Wazuh Agent
# =============================================================================

set -e

# Logging
exec > >(tee /var/log/victim-setup.log) 2>&1
echo "=== SentinelOps Victim Server Setup Started ==="
echo "Timestamp: $(date)"

# =============================================================================
# SYSTEM UPDATE
# =============================================================================
echo ">>> Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget gnupg apt-transport-https

# =============================================================================
# INSTALL DOCKER
# =============================================================================
echo ">>> Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# =============================================================================
# CREATE DOCKER COMPOSE FOR VULNERABLE APPS
# =============================================================================
echo ">>> Setting up vulnerable applications..."
mkdir -p /opt/sentinelops/vulnerable-apps
cat > /opt/sentinelops/vulnerable-apps/docker-compose.yml <<'EOF'
version: '3.8'

services:
  # DVWA - Damn Vulnerable Web Application
  dvwa:
    image: vulnerables/web-dvwa
    container_name: dvwa
    ports:
      - "8080:80"
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=dvwa
    networks:
      - vulnerable-net
    labels:
      - "sentinelops.app=dvwa"
      - "sentinelops.risk=high"

  # OWASP Juice Shop
  juice-shop:
    image: bkimminich/juice-shop
    container_name: juice-shop
    ports:
      - "3000:3000"
    restart: unless-stopped
    networks:
      - vulnerable-net
    labels:
      - "sentinelops.app=juice-shop"
      - "sentinelops.risk=high"

  # WebGoat - Another vulnerable app
  webgoat:
    image: webgoat/webgoat
    container_name: webgoat
    ports:
      - "8081:8080"
      - "9090:9090"
    restart: unless-stopped
    networks:
      - vulnerable-net
    labels:
      - "sentinelops.app=webgoat"
      - "sentinelops.risk=high"

  # Mutillidae II
  mutillidae:
    image: citizenstig/nowasp
    container_name: mutillidae
    ports:
      - "8082:80"
    restart: unless-stopped
    networks:
      - vulnerable-net
    labels:
      - "sentinelops.app=mutillidae"
      - "sentinelops.risk=high"

networks:
  vulnerable-net:
    driver: bridge
    name: sentinelops-vulnerable
EOF

# Start vulnerable applications
cd /opt/sentinelops/vulnerable-apps
docker-compose up -d

# =============================================================================
# INSTALL WAZUH AGENT
# =============================================================================
echo ">>> Installing Wazuh Agent..."

# Add Wazuh repository
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list

apt-get update
WAZUH_MANAGER="SENTINEL_IP_PLACEHOLDER" apt-get install -y wazuh-agent

# Note: Update SENTINEL_IP_PLACEHOLDER with actual Sentinel server IP after deployment
# Can be done via Ansible or manually:
# sed -i 's/SENTINEL_IP_PLACEHOLDER/ACTUAL_IP/' /var/ossec/etc/ossec.conf

# Enable and start Wazuh agent (will start after manager IP is configured)
systemctl daemon-reload
systemctl enable wazuh-agent

# =============================================================================
# INSTALL FALCO (Container Runtime Security)
# =============================================================================
echo ">>> Installing Falco..."
curl -fsSL https://falco.org/repo/falcosecurity-packages.asc | gpg --dearmor -o /usr/share/keyrings/falco-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/falco-archive-keyring.gpg] https://download.falco.org/packages/deb stable main" | tee /etc/apt/sources.list.d/falcosecurity.list
apt-get update
apt-get install -y falco

systemctl enable falco
systemctl start falco

# =============================================================================
# CREATE INTENTIONALLY VULNERABLE NODE.JS APP
# =============================================================================
echo ">>> Creating vulnerable Node.js application..."
mkdir -p /opt/sentinelops/node-app
cat > /opt/sentinelops/node-app/package.json <<'EOF'
{
  "name": "sentinelops-vulnerable-app",
  "version": "1.0.0",
  "description": "Intentionally vulnerable app for security testing",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql": "^2.18.1",
    "body-parser": "^1.20.2"
  }
}
EOF

cat > /opt/sentinelops/node-app/server.js <<'EOF'
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Intentionally vulnerable endpoints for testing

// SQL Injection vulnerable endpoint
app.get('/user', (req, res) => {
  const userId = req.query.id;
  // VULNERABLE: Direct string concatenation (DO NOT USE IN PRODUCTION)
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  res.json({ message: 'Vulnerable endpoint', query: query });
});

// Command Injection vulnerable endpoint
app.get('/ping', (req, res) => {
  const host = req.query.host;
  // VULNERABLE: Command injection (DO NOT USE IN PRODUCTION)
  const { exec } = require('child_process');
  exec(`ping -c 1 ${host}`, (error, stdout, stderr) => {
    res.send(`<pre>${stdout}</pre>`);
  });
});

// XSS vulnerable endpoint
app.get('/search', (req, res) => {
  const query = req.query.q;
  // VULNERABLE: Reflected XSS (DO NOT USE IN PRODUCTION)
  res.send(`<h1>Search results for: ${query}</h1>`);
});

// Path Traversal vulnerable endpoint
app.get('/file', (req, res) => {
  const filename = req.query.name;
  const fs = require('fs');
  // VULNERABLE: Path traversal (DO NOT USE IN PRODUCTION)
  const filepath = `/opt/sentinelops/files/${filename}`;
  fs.readFile(filepath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).send('File not found');
    } else {
      res.send(data);
    }
  });
});

// Sensitive data exposure
app.get('/debug', (req, res) => {
  // VULNERABLE: Exposes sensitive information
  res.json({
    env: process.env,
    cwd: process.cwd(),
    memory: process.memoryUsage()
  });
});

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vulnerable app running on port ${PORT}`);
  console.log('WARNING: This app is intentionally vulnerable for security testing!');
});
EOF

cat > /opt/sentinelops/node-app/Dockerfile <<'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
EOF

# Build and run the vulnerable Node app
cd /opt/sentinelops/node-app
docker build -t sentinelops-vulnerable-node .
docker run -d --name vulnerable-node -p 4000:4000 --network sentinelops-vulnerable sentinelops-vulnerable-node

# =============================================================================
# CONFIGURE FIREWALL
# =============================================================================
echo ">>> Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Juice Shop
ufw allow 4000/tcp  # Node App
ufw allow 8080/tcp  # DVWA
ufw allow 8081/tcp  # WebGoat
ufw allow 8082/tcp  # Mutillidae
ufw --force enable

# =============================================================================
# CREATE STATUS FILE
# =============================================================================
cat > /opt/sentinelops/status.json <<EOF
{
  "server": "victim",
  "status": "active",
  "vulnerable_apps": {
    "dvwa": "http://localhost:8080",
    "juice_shop": "http://localhost:3000",
    "webgoat": "http://localhost:8081",
    "mutillidae": "http://localhost:8082",
    "node_app": "http://localhost:4000"
  },
  "security_agents": {
    "wazuh": "pending_configuration",
    "falco": "installed"
  },
  "setup_date": "$(date -Iseconds)"
}
EOF

# =============================================================================
# SETUP COMPLETE
# =============================================================================
echo "=== SentinelOps Victim Server Setup Complete ==="
echo "Timestamp: $(date)"
echo ""
echo "Vulnerable applications running:"
echo "  - DVWA: http://localhost:8080"
echo "  - Juice Shop: http://localhost:3000"
echo "  - WebGoat: http://localhost:8081"
echo "  - Mutillidae: http://localhost:8082"
echo "  - Vulnerable Node App: http://localhost:4000"
echo ""
echo "Security agents installed:"
echo "  - Wazuh Agent (needs manager IP configuration)"
echo "  - Falco (runtime security)"
echo ""
echo "Check /var/log/victim-setup.log for details"
