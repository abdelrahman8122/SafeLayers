# SafeLayers — Multi-Layered Security Architecture for Banking Systems

**Course:** Computer System Security (25CSCI34H) — Dr. Ghada Elsayed
**Group 8**

| ID | Name | Role |
|----|------|------|
| 233126 | Mariam Ahmed | Frontend (React + Vite) |
| 235185 | Nouran Mostafa | Backend (Node.js + Express + MongoDB) |
| 235576 | Abdelrahman Almakhzangy | DevOps (Docker + Kubernetes + CI/CD) |

---

## Project Structure

```
safelayers/
├── frontend/              ← React + Vite app (Mariam)
│   ├── src/
│   │   ├── components/    ← All pages and UI components
│   │   ├── context/       ← AuthContext, ThemeContext
│   │   ├── utils/         ← Axios API with JWT interceptor
│   │   └── styles/        ← Global CSS with dark/light theme
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/               ← Node.js + Express API (Nouran)
│   ├── src/
│   │   ├── controllers/   ← Auth, Transaction, Account, Loan
│   │   ├── middleware/     ← JWT auth, RBAC, rate limiter, validators
│   │   ├── models/        ← User, Account, Transaction (Mongoose)
│   │   ├── routes/        ← API route definitions
│   │   └── config/        ← Database, Logger
│   └── Dockerfile
│
├── devops/                ← Infrastructure configs (Abdelrahman)
│   ├── kubernetes/        ← K8s deployments, Istio, NetworkPolicy
│   └── github/            ← CI/CD pipeline (SAST + DAST gates)
│
├── docker-compose.yml     ← Run everything locally with one command
└── README.md
```

---

## How to Run (Option 1 — Simple, Recommended)

**Requirements:** Node.js installed. That's it.

### Step 1 — Set up MongoDB Atlas (free, takes 3 minutes)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free account → Create a free cluster
3. Click **Connect** → **Drivers** → copy the connection string
4. It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`

### Step 2 — Configure backend
```bash
cd backend
cp .env.example .env
```
Open `.env` and paste your MongoDB connection string into `MONGODB_URI`.

### Step 3 — Install and run backend
```bash
cd backend
npm install
npm start
```
You should see: `SafeLayers API running on port 5000`

### Step 4 — Install and run frontend (new terminal window)
```bash
cd frontend
npm install
npm start
```
You should see: `Local: http://localhost:3000`

### Step 5 — Open in browser
```
http://localhost:3000
```

---

## How to Run (Option 2 — Docker, one command)

**Requirements:** Docker Desktop installed.

```bash
# Copy and edit the env file first
cp backend/.env.example backend/.env
# Edit MONGODB_URI in backend/.env

# Start everything
docker-compose up --build
```

Open: `http://localhost`

---

## Demo Credentials

| Field | Value |
|-------|-------|
| Account Number | `233-126-0001` (any formatted number works) |
| Password | Any (minimum 4 characters) |
| Authenticator app | Set up on first successful password login |
| Transaction PIN | `1234` |

---

## Security Features Implemented

### Layer 1 — Frontend (React)
| Feature | Implementation |
|---------|---------------|
| Password masking + toggle | CSS + React state |
| Password strength meter | Client-side scoring |
| Authenticator login flow | TOTP setup + verification |
| JWT token management | Axios interceptor with auto-refresh |
| Session timeout | 10-minute countdown, auto-logout |
| XSS prevention | Input sanitization + React JSX escaping |
| Security headers | Via nginx.conf (CSP, HSTS, X-Frame-Options) |

### Layer 2 — Backend (Node.js + Express)
| Feature | Package |
|---------|---------|
| JWT authentication | `jsonwebtoken` |
| Password hashing | `bcryptjs` (cost factor 12) |
| Security headers | `helmet` |
| Rate limiting | `express-rate-limit` (10 logins/15min, 10 transfers/hr) |
| Input validation | `express-validator` |
| NoSQL injection prevention | `express-mongo-sanitize` |
| XSS prevention | `xss-clean` |
| RBAC | Custom middleware (customer/teller/admin) |
| ACID transactions | MongoDB sessions |
| Audit logging | `winston` (immutable log files) |
| Account lockout | 5 failed attempts → 30 min lock |
| Token reuse detection | Refresh token rotation + revocation |

### Layer 3 — DevOps
| Feature | Technology |
|---------|-----------|
| Containerization | Docker (multi-stage builds, non-root user) |
| Orchestration | Kubernetes |
| Service mesh + mTLS | Istio (STRICT mode) |
| Zero Trust networking | Kubernetes NetworkPolicy |
| CI/CD pipeline | GitHub Actions |
| SAST | CodeQL + npm audit + Trivy |
| DAST | OWASP ZAP baseline scan |
| Secret management | Kubernetes Secrets (production) |
| Auto-scaling | HorizontalPodAutoscaler (2–10 replicas) |

---

## API Endpoints

```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Step 1: account + password
GET    /api/auth/csrf-token        Fetch CSRF token for write requests
POST   /api/auth/setup-totp/confirm Finish authenticator setup → get session
POST   /api/auth/verify-totp       Step 2: verify authenticator code → get session
POST   /api/auth/refresh           Refresh access token
POST   /api/auth/logout            Revoke refresh token
GET    /api/auth/me                Get current user
PATCH  /api/auth/change-password   Change password

GET    /api/accounts               Get all accounts
PATCH  /api/accounts/freeze        Freeze/unfreeze card

POST   /api/transactions/transfer  Transfer funds (ACID)
POST   /api/transactions/deposit   Deposit funds
POST   /api/transactions/withdraw  Withdraw funds (PIN required)
GET    /api/transactions/history   Transaction history

GET    /api/loans/calculate        Loan calculator (public)
GET    /api/loans                  Get active loan
POST   /api/loans/apply            Apply for a loan
```

---

*SafeLayers — Group 8 · 25CSCI34H · March 2026*
