# 🛡️ SentinelOps — AI-Powered DevSecOps Security & Threat Monitoring Platform

> **"Mini CrowdStrike + Snyk + Splunk combined."**

A comprehensive cybersecurity lab and monitoring platform that combines SIEM, IDS, vulnerability scanning, CI/CD security, and AI-powered threat detection — all deployed on **Oracle Cloud Infrastructure (OCI)** using **Jenkins pipelines**.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SentinelOps Architecture (OCI)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│    │  Sentinel SOC   │    │  Victim Server  │    │    Attacker     │       │
│    │    (OCI VM)     │    │    (OCI VM)     │    │    (OCI VM)     │       │
│    ├─────────────────┤    ├─────────────────┤    ├─────────────────┤       │
│    │ • Wazuh Manager │    │ • DVWA          │    │ • Nmap          │       │
│    │ • Elasticsearch │    │ • Juice Shop    │    │ • SQLMap        │       │
│    │ • Suricata IDS  │    │ • WebGoat       │    │ • Nikto         │       │
│    │ • Falco         │    │ • Mutillidae    │    │ • Hydra         │       │
│    │ • Grafana       │    │ • Wazuh Agent   │    │ • Nuclei        │       │
│    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘       │
│             │                      │                      │                 │
│             └──────────────────────┴──────────────────────┘                 │
│                            OCI VCN (10.0.0.0/16)                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                    SentinelOps Backend Stack                     │     │
│    ├─────────────────────────────────────────────────────────────────┤     │
│    │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │     │
│    │  │  React    │  │  Node.js  │  │  Python   │  │  MongoDB  │    │     │
│    │  │ Dashboard │──│  Express  │──│ ML Engine │──│  Database │    │     │
│    │  │  :3000    │  │   :4000   │  │   :5000   │  │  :27017   │    │     │
│    │  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
SentinelOps/
├── 📂 infrastructure/
│   ├── 📂 jenkins/
│   │   ├── Jenkinsfile.infrastructure    # OCI infrastructure deployment pipeline
│   │   └── oci-credentials-setup.md      # Jenkins credentials setup guide
│   ├── 📂 oci/
│   │   ├── config.example                # OCI CLI configuration template
│   │   └── variables.env.example         # Environment variables template
│   └── 📂 scripts/
│       ├── oci-setup-sentinel.sh         # Sentinel server setup (Oracle Linux)
│       ├── oci-setup-victim.sh           # Victim server setup
│       └── oci-setup-attacker.sh         # Attacker machine setup
│
├── 📂 devsecops/
│   ├── Jenkinsfile                       # Security pipeline (SAST, DAST, etc.)
│   ├── semgrep-rules.yaml                # Custom SAST rules
│   └── .gitleaks.toml                    # Secret scanning config
│
├── 📂 backend/
│   ├── 📂 src/
│   │   ├── server.ts                     # Express API server
│   │   ├── 📂 routes/                    # API endpoints
│   │   ├── 📂 models/                    # MongoDB schemas
│   │   ├── 📂 middleware/                # Auth & error handling
│   │   └── 📂 websocket/                 # Real-time events
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── App.tsx                       # React application
│   │   ├── 📂 pages/                     # Dashboard, Alerts, etc.
│   │   ├── 📂 components/                # UI components
│   │   ├── 📂 services/                  # API & WebSocket
│   │   └── 📂 stores/                    # Zustand state
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── 📂 ml-engine/
│   ├── app.py                            # Flask API with ML model
│   ├── requirements.txt
│   └── Dockerfile
│
├── 📂 ansible/
│   ├── 📂 playbooks/                     # Wazuh setup playbooks
│   ├── 📂 inventory/                     # Server inventory
│   └── 📂 templates/                     # Configuration templates
│
├── docker-compose.yml                    # Production deployment
├── docker-compose.dev.yml                # Development environment
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **OCI Account** with appropriate permissions
- **Jenkins** with OCI CLI plugin installed
- **Docker** & Docker Compose
- **Node.js 18+** and **Python 3.11+**

### 1. Deploy Infrastructure (OCI + Jenkins)

1. **Set up Jenkins Credentials** (see [oci-credentials-setup.md](infrastructure/jenkins/oci-credentials-setup.md)):
   - `oci-tenancy-ocid`
   - `oci-user-ocid`
   - `oci-fingerprint`
   - `oci-private-key`
   - `oci-compartment-ocid`
   - `sentinelops-ssh-public-key`

2. **Create Jenkins Pipeline**:
   - Create new Pipeline job
   - Point to `infrastructure/jenkins/Jenkinsfile.infrastructure`
   - Run with parameters:
     - `ACTION`: deploy
     - `ENVIRONMENT`: dev

3. **Access Your Infrastructure**:
   - Sentinel Dashboard: `https://<sentinel-ip>:443`
   - Grafana: `http://<sentinel-ip>:3000`
   - Vulnerable Apps: `http://<victim-ip>:8080`

### 2. Run Local Development Stack

```powershell
# Clone repository
git clone https://github.com/yourusername/SentinelOps.git
cd SentinelOps

# Start development databases
docker-compose -f docker-compose.dev.yml up -d

# Backend API
cd backend
npm install
npm run dev

# Frontend Dashboard (new terminal)
cd frontend
npm install
npm start

# ML Engine (new terminal)
cd ml-engine
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

### 3. Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend Dashboard | http://localhost:3000 | Demo login available |
| Backend API | http://localhost:4000 | - |
| ML Engine | http://localhost:5000 | - |
| MongoDB UI | http://localhost:8081 | admin/admin123 |

---

## 🛡️ Security Features

### Phase 1: OCI Cyber Lab
- **Sentinel Server**: Wazuh Manager, Elasticsearch, Suricata, Falco, Grafana
- **Victim Server**: DVWA, Juice Shop, WebGoat, Mutillidae
- **Attacker Machine**: Nmap, SQLMap, Nikto, Hydra, Nuclei

### Phase 2: DevSecOps Pipeline
- **Secret Scanning**: Gitleaks
- **SAST**: Semgrep with custom rules
- **Dependency Check**: OWASP Dependency Check
- **Container Security**: Trivy
- **DAST**: OWASP ZAP

### Phase 3: SIEM & Log Management
- Wazuh for centralized log collection
- Elasticsearch for log storage & search
- Custom dashboards in Grafana

### Phase 4: IDS & Runtime Security
- Suricata network IDS
- Falco runtime threat detection

### Phase 5: Attack Simulation
- Automated attack scripts
- MITRE ATT&CK coverage
- Red team exercises

### Phase 6: AI Threat Detection
- Isolation Forest anomaly detection
- Real-time threat scoring
- Classification: Normal → Suspicious → High Risk → Attack

### Phase 7: Security Dashboard
- Real-time monitoring
- Alert management
- Vulnerability tracking
- Pipeline results
- Agent status

---

## 🔧 Configuration

### OCI Variables

```bash
# infrastructure/oci/variables.env
OCI_REGION=us-ashburn-1
OCI_COMPARTMENT_OCID=ocid1.compartment.oc1..xxxxx
SENTINEL_SHAPE=VM.Standard.E4.Flex
SENTINEL_OCPUS=2
SENTINEL_MEMORY_GB=16
```

### Backend Environment

```bash
# backend/.env
MONGODB_URI=mongodb://localhost:27017/sentinelops
JWT_SECRET=your-secret-key
WAZUH_API_URL=https://sentinel-server:55000
ML_ENGINE_URL=http://localhost:5000
```

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts | Get security alerts |
| GET | /api/vulnerabilities | Get vulnerabilities |
| GET | /api/threats | Get AI threat predictions |
| GET | /api/metrics/dashboard | Get dashboard metrics |
| GET | /api/agents | Get Wazuh agents |
| POST | /api/pipeline/results | Submit pipeline results |

---

## 🤖 ML Threat Detection

The ML engine uses Isolation Forest to detect anomalies:

```python
# Threat Score Classification
0-39:  Normal     (Green)
40-59: Suspicious (Yellow)  
60-79: High Risk  (Orange)
80-100: Attack    (Red)
```

**Features extracted**:
- Alert count & severity
- Unique source/destination IPs
- Port diversity
- Failed login attempts
- Suspicious command patterns
- Time-based features

---

## 🐳 Docker Deployment

### Production

```bash
# Full stack deployment
docker-compose up -d

# Check services
docker-compose ps

# View logs
docker-compose logs -f backend
```

### Development

```bash
# Start databases only
docker-compose -f docker-compose.dev.yml up -d
```

---

## 📈 Roadmap

- [x] OCI Infrastructure with Jenkins
- [x] DevSecOps Pipeline
- [x] Backend API
- [x] React Dashboard
- [x] ML Threat Detection
- [ ] Kubernetes deployment
- [ ] Additional ML models
- [ ] SOAR integration
- [ ] Compliance reporting

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**SentinelOps** - AI-Powered DevSecOps Security Platform

Built with ❤️ for cybersecurity professionals and DevSecOps engineers.
