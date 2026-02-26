#!/bin/bash
# =============================================================================
# SentinelOps - Victim Server Setup Script for OCI
# =============================================================================
# This script sets up the Victim server with vulnerable applications
# Run as root or with sudo
# =============================================================================

set -e

SENTINEL_IP=${1:-"10.0.1.10"}

echo "
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🎯 SentinelOps - Victim Server Setup (OCI)                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"

# =============================================================================
# System Update
# =============================================================================
echo "[1/6] Updating system packages..."
dnf update -y
dnf install -y curl wget git vim unzip nodejs npm python3 python3-pip

# =============================================================================
# Install Docker
# =============================================================================
echo "[2/6] Installing Docker..."
dnf install -y dnf-utils
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

usermod -aG docker opc || true

# Install Docker Compose standalone
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# =============================================================================
# Deploy Vulnerable Applications
# =============================================================================
echo "[3/6] Deploying vulnerable applications..."

mkdir -p /opt/vulnerable-apps
cd /opt/vulnerable-apps

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # DVWA - Damn Vulnerable Web Application
  dvwa:
    image: vulnerables/web-dvwa
    container_name: dvwa
    ports:
      - "8080:80"
    environment:
      - MYSQL_PASS=p@ssw0rd
    restart: unless-stopped

  # OWASP Juice Shop
  juice-shop:
    image: bkimminich/juice-shop
    container_name: juice-shop
    ports:
      - "3000:3000"
    restart: unless-stopped

  # WebGoat
  webgoat:
    image: webgoat/webgoat
    container_name: webgoat
    ports:
      - "8081:8080"
      - "9090:9090"
    environment:
      - WEBGOAT_HOST=0.0.0.0
    restart: unless-stopped

  # Mutillidae II
  mutillidae:
    image: citizenstig/nowasp
    container_name: mutillidae
    ports:
      - "8082:80"
    restart: unless-stopped

  # Vulnerable Node.js App (Custom)
  vuln-node:
    build:
      context: ./vuln-node
    container_name: vuln-node
    ports:
      - "8083:3000"
    restart: unless-stopped
EOF

# Create custom vulnerable Node.js application
mkdir -p vuln-node
cat > vuln-node/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
EOF

cat > vuln-node/package.json << 'EOF'
{
  "name": "vuln-node",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "ejs": "^3.1.9"
  }
}
EOF

cat > vuln-node/server.js << 'EOF'
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Vulnerable: SQL Injection
app.get('/user', (req, res) => {
  const userId = req.query.id;
  // VULNERABLE: Direct string concatenation
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  res.send(`Query executed: ${query}`);
});

// Vulnerable: XSS
app.get('/search', (req, res) => {
  const searchTerm = req.query.q;
  // VULNERABLE: No output encoding
  res.send(`<h1>Search Results for: ${searchTerm}</h1>`);
});

// Vulnerable: Command Injection
app.get('/ping', (req, res) => {
  const { exec } = require('child_process');
  const host = req.query.host;
  // VULNERABLE: Direct command execution
  exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
    res.send(`<pre>${stdout || stderr}</pre>`);
  });
});

// Vulnerable: Path Traversal
app.get('/file', (req, res) => {
  const fs = require('fs');
  const filename = req.query.name;
  // VULNERABLE: No path validation
  fs.readFile(`./files/${filename}`, 'utf8', (err, data) => {
    if (err) return res.status(404).send('File not found');
    res.send(data);
  });
});

// Vulnerable: SSRF
app.get('/fetch', (req, res) => {
  const http = require('http');
  const url = req.query.url;
  // VULNERABLE: No URL validation
  http.get(url, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => res.send(data));
  }).on('error', (err) => res.status(500).send(err.message));
});

app.get('/', (req, res) => {
  res.send(`
    <h1>Vulnerable Node.js Application</h1>
    <h2>Test Endpoints:</h2>
    <ul>
      <li><a href="/user?id=1">SQL Injection</a> - /user?id=1 OR 1=1</li>
      <li><a href="/search?q=test">XSS</a> - /search?q=&lt;script&gt;alert(1)&lt;/script&gt;</li>
      <li><a href="/ping?host=localhost">Command Injection</a> - /ping?host=localhost;cat /etc/passwd</li>
      <li><a href="/file?name=test.txt">Path Traversal</a> - /file?name=../../../etc/passwd</li>
      <li><a href="/fetch?url=http://localhost:3000">SSRF</a> - /fetch?url=http://169.254.169.254/</li>
    </ul>
  `);
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Vulnerable app running on port 3000');
});
EOF

mkdir -p vuln-node/files
echo "This is a test file" > vuln-node/files/test.txt

# Start containers
docker-compose up -d

echo "✅ Vulnerable applications deployed"

# =============================================================================
# Install Wazuh Agent
# =============================================================================
echo "[4/6] Installing Wazuh Agent..."

rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH
cat > /etc/yum.repos.d/wazuh.repo << 'EOF'
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=Wazuh repository
baseurl=https://packages.wazuh.com/4.x/yum/
protect=1
EOF

WAZUH_MANAGER="${SENTINEL_IP}" dnf install -y wazuh-agent

# Configure Wazuh agent
sed -i "s/MANAGER_IP/${SENTINEL_IP}/" /var/ossec/etc/ossec.conf

systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent

echo "✅ Wazuh Agent installed and connected to ${SENTINEL_IP}"

# =============================================================================
# Configure Firewall
# =============================================================================
echo "[5/6] Configuring firewall..."

systemctl enable firewalld
systemctl start firewalld

firewall-cmd --permanent --add-port=22/tcp
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=8080-8083/tcp
firewall-cmd --permanent --add-port=9090/tcp
firewall-cmd --reload

echo "✅ Firewall configured"

# =============================================================================
# Create Status Script
# =============================================================================
echo "[6/6] Creating status script..."

cat > /root/check-status.sh << 'EOF'
#!/bin/bash
echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Wazuh Agent Status ==="
systemctl status wazuh-agent --no-pager | head -10

echo ""
echo "=== Accessible URLs ==="
IP=$(hostname -I | awk '{print $1}')
echo "DVWA:        http://${IP}:8080"
echo "Juice Shop:  http://${IP}:3000"
echo "WebGoat:     http://${IP}:8081"
echo "Mutillidae:  http://${IP}:8082"
echo "Vuln Node:   http://${IP}:8083"
EOF

chmod +x /root/check-status.sh

# =============================================================================
# Summary
# =============================================================================
VICTIM_IP=$(hostname -I | awk '{print $1}')

echo "
╔═══════════════════════════════════════════════════════════════════╗
║  ✅ Victim Server Setup Complete!                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Vulnerable Applications:                                         ║
║  ├── DVWA:        http://${VICTIM_IP}:8080                        ║
║  ├── Juice Shop:  http://${VICTIM_IP}:3000                        ║
║  ├── WebGoat:     http://${VICTIM_IP}:8081                        ║
║  ├── Mutillidae:  http://${VICTIM_IP}:8082                        ║
║  └── Vuln Node:   http://${VICTIM_IP}:8083                        ║
║                                                                   ║
║  Wazuh Agent: Connected to ${SENTINEL_IP}                         ║
║                                                                   ║
║  Check status: /root/check-status.sh                              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"
