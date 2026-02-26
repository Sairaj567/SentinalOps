#!/bin/bash
# =============================================================================
# SentinelOps - Sentinel Server Setup Script
# =============================================================================
# This script installs and configures:
# - Wazuh Manager
# - Elasticsearch
# - Kibana
# - Grafana
# - Suricata
# =============================================================================

set -e

# Logging
exec > >(tee /var/log/sentinel-setup.log) 2>&1
echo "=== SentinelOps Sentinel Server Setup Started ==="
echo "Timestamp: $(date)"

# =============================================================================
# SYSTEM UPDATE
# =============================================================================
echo ">>> Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget gnupg apt-transport-https software-properties-common

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
# INSTALL WAZUH (All-in-One)
# =============================================================================
echo ">>> Installing Wazuh..."
curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh
chmod +x wazuh-install.sh

# Run Wazuh installation (this includes Wazuh Manager, Indexer, and Dashboard)
./wazuh-install.sh -a -i

# Store the generated password
echo ">>> Wazuh installation complete. Check /var/log/wazuh-install.log for credentials."

# =============================================================================
# INSTALL SURICATA
# =============================================================================
echo ">>> Installing Suricata..."
add-apt-repository ppa:oisf/suricata-stable -y
apt-get update
apt-get install -y suricata

# Configure Suricata
cat > /etc/suricata/suricata.yaml.local <<EOF
# SentinelOps Suricata Configuration
vars:
  address-groups:
    HOME_NET: "[10.0.0.0/16]"
    EXTERNAL_NET: "!\$HOME_NET"

# Outputs
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

# Rules
default-rule-path: /var/lib/suricata/rules
rule-files:
  - suricata.rules

# Enable all protocol analyzers
app-layer:
  protocols:
    http:
      enabled: yes
    tls:
      enabled: yes
    ssh:
      enabled: yes
    dns:
      enabled: yes
EOF

# Update Suricata rules
suricata-update

# Enable and start Suricata
systemctl enable suricata
systemctl start suricata

# =============================================================================
# INSTALL GRAFANA
# =============================================================================
echo ">>> Installing Grafana..."
wget -q -O /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key
echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list
apt-get update
apt-get install -y grafana

# Configure Grafana
cat > /etc/grafana/grafana.ini <<EOF
[server]
http_port = 3000
domain = localhost

[security]
admin_user = admin
admin_password = SentinelOps2024!

[auth.anonymous]
enabled = false

[dashboards]
default_home_dashboard_path = /var/lib/grafana/dashboards/sentinelops.json
EOF

systemctl enable grafana-server
systemctl start grafana-server

# =============================================================================
# CREATE SENTINELOPS DIRECTORY STRUCTURE
# =============================================================================
echo ">>> Creating SentinelOps directories..."
mkdir -p /opt/sentinelops/{logs,configs,scripts,dashboards}
mkdir -p /var/log/sentinelops

# Create a status file
cat > /opt/sentinelops/status.json <<EOF
{
  "server": "sentinel",
  "status": "active",
  "services": {
    "wazuh": "installed",
    "suricata": "installed",
    "grafana": "installed"
  },
  "setup_date": "$(date -Iseconds)"
}
EOF

# =============================================================================
# CONFIGURE FIREWALL
# =============================================================================
echo ">>> Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 443/tcp   # HTTPS
ufw allow 1514/tcp  # Wazuh agent
ufw allow 1515/tcp  # Wazuh agent
ufw allow 55000/tcp # Wazuh API
ufw allow 9200/tcp  # Elasticsearch
ufw allow 5601/tcp  # Kibana/Wazuh Dashboard
ufw allow 3000/tcp  # Grafana
ufw --force enable

# =============================================================================
# SETUP COMPLETE
# =============================================================================
echo "=== SentinelOps Sentinel Server Setup Complete ==="
echo "Timestamp: $(date)"
echo ""
echo "Services installed:"
echo "  - Wazuh Manager (port 1514/1515)"
echo "  - Wazuh Dashboard (port 5601)"
echo "  - Wazuh API (port 55000)"
echo "  - Suricata IDS"
echo "  - Grafana (port 3000)"
echo ""
echo "Check /var/log/sentinel-setup.log for details"
echo "Wazuh credentials: Check /var/log/wazuh-install.log"
