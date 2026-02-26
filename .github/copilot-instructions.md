# SentinelOps — Copilot Instructions

## Architecture Overview

SentinelOps is a 3-service security monitoring platform: a **Node.js/Express backend** (`:4000`), a **React dashboard** (`:3000`), and a **Python/Flask ML engine** (`:5000`), all backed by **MongoDB 7** and **Redis 7**. The backend proxies ML predictions via `axios` calls to `ML_ENGINE_URL`. Real-time events flow from backend → frontend over **Socket.IO** (alerts, threats, pipeline results, agent status). OCI infrastructure is provisioned via Jenkins pipelines and configured with Ansible.

```
Frontend (React :3000) ⟷ Backend (Express :4000) ⟷ ML Engine (Flask :5000)
                                    ↕                        ↕
                              MongoDB :27017            scikit-learn
                              Redis :6379               IsolationForest
```

## Development Workflow

```powershell
# 1. Start databases (MongoDB + Redis + Mongo Express UI at :8081)
docker-compose -f docker-compose.dev.yml up -d

# 2. Run services (each in a separate terminal)
cd backend  && npm run dev      # ts-node-dev with hot reload
cd frontend && npm start        # react-scripts dev server
cd ml-engine && python app.py   # Flask dev server

# Or use the bootstrap script:
.\scripts\start-dev.ps1
```

- **Backend build**: `npm run build` (tsc → `dist/`), run prod with `npm start`
- **Backend tests**: `npm test` (Jest + ts-jest, `--coverage`)
- **Frontend build**: `npm run build` (react-scripts, served via nginx in Docker)
- **Lint both**: `npm run lint` / `npm run lint:fix`

## Backend Conventions (TypeScript + Express)

- **Route pattern**: Each route file in `backend/src/routes/` exports a `Router()`. Routes are mounted at `/api/<resource>` in [server.ts](backend/src/server.ts). All routes except `/api/auth` are protected by `authMiddleware`.
- **Auth**: JWT Bearer tokens. Middleware in [auth.ts](backend/src/middleware/auth.ts) extends `Request` as `AuthRequest` with `req.user` (`userId`, `email`, `role`). Use `requireRole(['admin'])` for RBAC.
- **User roles**: `admin | analyst | viewer` — defined in `IUser` interface.
- **Models**: Mongoose schemas in `backend/src/models/` with exported TypeScript interfaces (`IAlert`, `IUser`, `IVulnerability`). Schemas use `enum` for constrained fields (severity: `low|medium|high|critical`).
- **Error handling**: Throw `ApiError(statusCode, message)` from [errorHandler.ts](backend/src/middleware/errorHandler.ts). The global error handler logs with Winston and strips stack traces in production.
- **API response shape**: Always `{ success: boolean, data?: T, message?: string, pagination?: { page, limit, total, pages } }`.
- **Logging**: Use the `logger` singleton from `backend/src/utils/logger.ts` (Winston). Writes to console + `logs/error.log` + `logs/combined.log`.
- **WebSocket events**: Emit via helpers in [handler.ts](backend/src/websocket/handler.ts): `emitAlert(io, alert)`, `emitThreat(io, threat)`, `emitPipelineUpdate(io, result)`. Access `io` in routes via `req.app.get('io')`.
- **tsconfig**: Strict mode enabled with `noUnusedLocals`, `noImplicitReturns`. Target ES2020, CommonJS modules.

## Frontend Conventions (React + TypeScript)

- **State management**: Zustand stores in `frontend/src/stores/`. Auth state is persisted to localStorage under key `sentinelops-auth`. Access token from any module via `useAuthStore.getState().token`.
- **Data fetching**: `@tanstack/react-query` with `api` axios instance from [api.ts](frontend/src/services/api.ts). Query keys follow `['resource-name']` pattern. Auto-refetch intervals set per query (30s for dashboard metrics).
- **Routing**: React Router v6 with nested layout. `ProtectedRoute` guards authenticated pages. All page routes are children of `Layout` which provides sidebar + top bar.
- **Styling**: Tailwind CSS with a dark theme (`bg-gray-900` base, `bg-gray-800` cards, `border-gray-700` borders, `text-cyan-*` accents). Use `clsx` for conditional classes.
- **Icons**: `lucide-react` exclusively — import individual icons like `{ Shield, AlertTriangle }`.
- **Charts**: `recharts` library — `LineChart`, `AreaChart`, `PieChart` with `ResponsiveContainer`.
- **Notifications**: `react-hot-toast` — dark-themed toasts positioned top-right. Critical/high severity alerts use `toast.error()`.
- **WebSocket**: Singleton `wsService` class in [websocket.ts](frontend/src/services/websocket.ts). Connect via hooks in [hooks/index.ts](frontend/src/hooks/index.ts): `useAlertNotifications()`, `useWebSocketEvent<T>(event, callback)`.
- **Component pattern**: Functional components with TypeScript interfaces for props. Reusable UI components in `components/`, page-level components in `pages/`.

## ML Engine Conventions (Python + Flask)

- **Endpoint pattern**: `POST /predict` accepts `{ alerts: [...], logs: [...] }`, returns `{ threat_score, classification, confidence }`. Classification levels: `normal → suspicious → high_risk → attack`.
- **Model**: scikit-learn `IsolationForest` with `StandardScaler`. Falls back to rule-based scoring when model is untrained.
- **Feature engineering**: 11 features extracted in `extract_features()` — alert counts, IP diversity, severity scores, suspicious command patterns, time-of-day.
- **Health check**: `GET /health` and `GET /status` for model readiness.

## Infrastructure & DevSecOps

- **Jenkins pipelines**: `devsecops/Jenkinsfile` runs Secret Scan (Gitleaks) → SAST (Semgrep) → Dependency Check (OWASP) → Container Scan (Trivy) → DAST. `infrastructure/jenkins/Jenkinsfile.infrastructure` deploys OCI VMs.
- **OCI setup scripts**: `infrastructure/scripts/oci-setup-{sentinel,victim,attacker}.sh` — Oracle Linux provisioning for the 3-VM lab architecture.
- **Ansible**: Playbooks in `ansible/playbooks/` for Wazuh manager/agent setup. Inventory in `ansible/inventory/hosts`.
- **Docker**: Each service has its own `Dockerfile`. Production compose uses healthchecks and named volumes. Dev compose credentials: `admin/admin123`.

## Key Integration Points

- Backend → ML Engine: `backend/src/routes/threats.ts` calls `ML_ENGINE_URL/predict` via axios
- Jenkins → Backend: Pipeline posts scan results to `POST /api/pipeline/results`
- Wazuh/Suricata/Falco → Backend: Alert sources defined in `Alert.source` enum: `wazuh | suricata | falco | custom | pipeline`
- Vulnerability sources: `trivy | semgrep | dependency-check | gitleaks | manual` with scan types: `container | sast | dependency | secret | dast`
