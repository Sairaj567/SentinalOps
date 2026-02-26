#!/bin/bash
# =============================================================================
# SentinelOps - Sentinel Server Setup Script for OCI
# =============================================================================
# This script sets up the Sentinel SOC server on Oracle Linux
# Run as root or with sudo
# =============================================================================

set -e

echo "
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🛡️  SentinelOps - Sentinel Server Setup (OCI)                  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"

# =============================================================================
# System Update
# =============================================================================
echo "[1/8] Updating system packages..."
dnf update -y
dnf install -y curl wget git vim unzip

# =============================================================================
# Install Docker
# =============================================================================
echo "[2/8] Installing Docker..."
dnf install -y dnf-utils
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

# Add opc user to docker group
usermod -aG docker opc || true

# =============================================================================
# Install Wazuh (All-in-One)
# =============================================================================
echo "[3/8] Installing Wazuh Manager..."

# Download and run Wazuh installation assistant
curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh
chmod +x wazuh-install.sh
./wazuh-install.sh -a -i

# Extract Wazuh admin password
WAZUH_PASSWORD=$(tar -O -xvf wazuh-install-files.tar wazuh-install-files/wazuh-passwords.txt 2>/dev/null | grep -A 1 "indexer_username: 'admin'" | grep password | cut -d "'" -f 2)
echo "Wazuh Admin Password: ${WAZUH_PASSWORD}" > /root/wazuh-credentials.txt

echo "✅ Wazuh installed successfully"
echo "   Dashboard: https://$(hostname -I | awk '{print $1}')"
echo "   Username: admin"
echo "   Password: ${WAZUH_PASSWORD}"

# =============================================================================
# Install Suricata IDS
# =============================================================================
echo "[4/8] Installing Suricata IDS..."

dnf install -y epel-release
dnf install -y suricata

# Configure Suricata
INTERFACE=$(ip route | grep default | awk '{print $5}')
sed -i "s/interface: eth0/interface: ${INTERFACE}/" /etc/suricata/suricata.yaml

# Update Suricata rules
suricata-update

# Enable JSON logging for Wazuh integration
cat >> /etc/suricata/suricata.yaml << 'EOF'

# EVE JSON output for Wazuh
outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: /var/log/suricata/eve.json
      types:
        - alert
        - http
        - dns
        - tls
        - files
        - ssh
        - flow
EOF

systemctl enable suricata
systemctl start suricata

echo "✅ Suricata IDS installed and configured"

# =============================================================================
# Install Falco (Runtime Security)
# =============================================================================
echo "[5/8] Installing Falco..."

# Add Falco repository
rpm --import https://falco.org/repo/falcosecurity-packages.asc
curl -s -o /etc/yum.repos.d/falcosecurity.repo https://falco.org/repo/falcosecurity-rpm.repo

dnf install -y falco

# Configure Falco for JSON output
cat > /etc/falco/falco.yaml << 'EOF'
json_output: true
json_include_output_property: true
log_stderr: true
log_syslog: true
log_level: info

file_output:
  enabled: true
  keep_alive: false
  filename: /var/log/falco/events.json
EOF

systemctl enable falco
systemctl start falco

echo "✅ Falco installed and configured"

# =============================================================================
# Install Grafana
# =============================================================================
echo "[6/8] Installing Grafana..."

cat > /etc/yum.repos.d/grafana.repo << 'EOF'
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF

dnf install -y grafana

# Configure Grafana
sed -i 's/;http_port = 3000/http_port = 3000/' /etc/grafana/grafana.ini
sed -i 's/;domain = localhost/domain = 0.0.0.0/' /etc/grafana/grafana.ini

systemctl enable grafana-server
systemctl start grafana-server

echo "✅ Grafana installed (default: admin/admin)"

# =============================================================================
# Configure Firewall
# =============================================================================
echo "[7/8] Configuring firewall..."

# Enable firewalld if not running
systemctl enable firewalld
systemctl start firewalld

# Open required ports
firewall-cmd --permanent --add-port=22/tcp      # SSH
firewall-cmd --permanent --add-port=443/tcp     # Wazuh Dashboard
firewall-cmd --permanent --add-port=9200/tcp    # Elasticsearch
firewall-cmd --permanent --add-port=5601/tcp    # Kibana (if installed separately)
firewall-cmd --permanent --add-port=3000/tcp    # Grafana
firewall-cmd --permanent --add-port=1514/tcp    # Wazuh agent communication
firewall-cmd --permanent --add-port=1515/tcp    # Wazuh agent enrollment
firewall-cmd --permanent --add-port=55000/tcp   # Wazuh API
firewall-cmd --permanent --add-port=514/tcp     # Syslog
firewall-cmd --permanent --add-port=514/udp     # Syslog UDP

firewall-cmd --reload

echo "✅ Firewall configured"

# =============================================================================
# Create Wazuh Agent Registration Script
# =============================================================================
echo "[8/8] Creating agent registration helper..."

SENTINEL_IP=$(hostname -I | awk '{print $1}')

cat > /root/register-agent.sh << EOF
#!/bin/bash
# Register a new Wazuh agent
# Usage: ./register-agent.sh <agent_name> <agent_ip>

AGENT_NAME=\$1
AGENT_IP=\$2

if [ -z "\$AGENT_NAME" ] || [ -z "\$AGENT_IP" ]; then
    echo "Usage: ./register-agent.sh <agent_name> <agent_ip>"
    exit 1
fi

/var/ossec/bin/manage_agents -a \$AGENT_IP -n \$AGENT_NAME

echo "Agent registered. Install Wazuh agent on the target machine with:"
echo "  WAZUH_MANAGER='${SENTINEL_IP}' rpm -ivh wazuh-agent.rpm"
EOF

chmod +x /root/register-agent.sh

# =============================================================================
# Summary
# =============================================================================
echo "
╔═══════════════════════════════════════════════════════════════════╗
║  ✅ Sentinel Server Setup Complete!                               ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Installed Components:                                            ║
║  ├── Wazuh Manager (SIEM)                                         ║
║  ├── Wazuh Indexer (Elasticsearch)                                ║
║  ├── Wazuh Dashboard                                              ║
║  ├── Suricata IDS                                                 ║
║  ├── Falco (Runtime Security)                                     ║
║  └── Grafana                                                      ║
║                                                                   ║
║  Access URLs:                                                     ║
║  ├── Wazuh Dashboard: https://${SENTINEL_IP}                      ║
║  ├── Grafana:         http://${SENTINEL_IP}:3000                  ║
║  └── Wazuh API:       https://${SENTINEL_IP}:55000                ║
║                                                                   ║
║  Credentials saved to: /root/wazuh-credentials.txt                ║
║                                                                   ║
║  To register agents: /root/register-agent.sh <name> <ip>          ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"
