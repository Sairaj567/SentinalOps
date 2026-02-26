# 🛡️ SentinelOps

> **AI-Powered DevSecOps Security & Threat Monitoring Platform**

Think: Mini CrowdStrike + Snyk + Splunk combined.

![Architecture](docs/images/architecture-placeholder.png)

## 🎯 Project Overview

SentinelOps is a comprehensive security operations platform that combines:
- **DevSecOps Pipeline** - Automated security scanning in CI/CD
- **SIEM** - Security Information and Event Management
- **IDS** - Intrusion Detection System
- **AI Threat Detection** - Machine learning-based anomaly detection
- **Real-time Dashboard** - Unified security visibility

## 🗺️ Phase Roadmap

| Phase | Module | Status |
|-------|--------|--------|
| 1 | Infrastructure & Lab | 🔄 In Progress |
| 2 | DevSecOps Pipeline | ⏳ Pending |
| 3 | SIEM Setup | ⏳ Pending |
| 4 | IDS/Runtime Security | ⏳ Pending |
| 5 | Attack Simulation | ⏳ Pending |
| 6 | AI Threat Detection | ⏳ Pending |
| 7 | Dashboard | ⏳ Pending |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SENTINELOPS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Attacker   │───▶│    Victim    │───▶│   Sentinel   │       │
│  │    (Kali)    │    │   Server     │    │   Server     │       │
│  │  t3.medium   │    │  t3.medium   │    │  t3.large    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                             │                    │               │
│                             │    Logs/Alerts     │               │
│                             └────────────────────┘               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    SECURITY STACK                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │   │
│  │  │ Wazuh   │ │Suricata │ │ Falco   │ │ Trivy   │         │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AI/ML ENGINE                           │   │
│  │  Isolation Forest │ Anomaly Detection │ Threat Scoring    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    DASHBOARD (React)                      │   │
│  │  Overview │ Vulnerabilities │ Live Attacks │ AI Scores    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- AWS Account with credits
- Terraform installed
- Docker & Docker Compose
- Node.js 18+
- Python 3.9+

### 1. Deploy Infrastructure
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

### 2. Start Local Development
```bash
# Start backend services
cd backend
npm install
npm run dev

# Start frontend
cd ../frontend
npm install
npm start
```

### 3. Run Security Scans
```bash
cd scripts
./run-security-scan.sh
```

## 📁 Project Structure

```
SentinelOps/
├── infrastructure/          # AWS Infrastructure as Code
│   ├── terraform/          # Terraform configurations
│   └── ansible/            # Server configuration playbooks
├── backend/                # Node.js API server
├── frontend/               # React dashboard
├── ml-engine/              # AI threat detection
├── devsecops/              # CI/CD security pipeline
├── attack-lab/             # Attack simulation scripts
├── configs/                # Tool configurations
├── scripts/                # Utility scripts
└── docs/                   # Documentation
```

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| Infrastructure | AWS, Terraform, Ansible |
| Security Tools | Wazuh, Suricata, Falco, Trivy, Semgrep |
| Backend | Node.js, Express, MongoDB |
| Frontend | React, TailwindCSS |
| AI/ML | Python, Scikit-learn, Pandas |
| CI/CD | Jenkins, Docker |

## 📚 Documentation

- [Phase 1: Infrastructure Setup](docs/phase1-infrastructure.md)
- [Phase 2: DevSecOps Pipeline](docs/phase2-devsecops.md)
- [Phase 3: SIEM Setup](docs/phase3-siem.md)
- [Phase 4: IDS Configuration](docs/phase4-ids.md)
- [Phase 5: Attack Simulation](docs/phase5-attacks.md)
- [Phase 6: AI Threat Detection](docs/phase6-ai.md)
- [Phase 7: Dashboard](docs/phase7-dashboard.md)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

**Built with ❤️ for cybersecurity**
