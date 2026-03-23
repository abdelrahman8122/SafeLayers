/**
 * SafeLayers — DevOps Infrastructure Tests
 * Tests: Docker, Kubernetes, nginx, CI/CD, backend security code
 * Group 8 · 25CSCI34H
 *
 * Run with: node devops/tests/infra.test.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
let failures = 0;
let total    = 0;

const pass = (msg) => console.log(`  ✅ PASS: ${msg}`);
const fail = (msg) => { console.log(`  ❌ FAIL: ${msg}`); failures++; };

const test = (name, fn) => {
  total++;
  try { fn(); pass(name); }
  catch (e) { fail(`${name} — ${e.message}`); }
};

const assert  = (cond, msg) => { if (!cond) throw new Error(msg || 'Assertion failed'); };
const readFile   = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const fileExists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ══════════════════════════════════════════════════════════
//  1. FILE STRUCTURE
// ══════════════════════════════════════════════════════════
console.log('\n📁  FILE STRUCTURE TESTS');
console.log('─'.repeat(50));

[
  'backend/src/server.js',
  'backend/src/middleware/auth.js',
  'backend/src/middleware/rateLimiter.js',
  'backend/src/middleware/validators.js',
  'backend/src/models/User.js',
  'backend/src/controllers/authController.js',
  'backend/src/controllers/transactionController.js',
  'frontend/nginx.conf',
  'docker-compose.yml',
  'backend/Dockerfile',
  'frontend/Dockerfile',
  'devops/kubernetes/backend-deployment.yml',
  'devops/kubernetes/infrastructure.yml',
  'devops/github/ci-cd.yml',
].forEach(f => test(`${f} exists`, () => assert(fileExists(f))));

// ══════════════════════════════════════════════════════════
//  2. DOCKER COMPOSE
// ══════════════════════════════════════════════════════════
console.log('\n🐳  DOCKER COMPOSE TESTS');
console.log('─'.repeat(50));

test('Defines frontend service', () => {
  assert(readFile('docker-compose.yml').includes('safelayers-frontend'));
});
test('Defines backend service', () => {
  assert(readFile('docker-compose.yml').includes('safelayers-backend'));
});
test('Defines MongoDB service', () => {
  const c = readFile('docker-compose.yml');
  assert(c.includes('mongo') || c.includes('safelayers-mongo'));
});
test('Uses isolated internal network', () => {
  const c = readFile('docker-compose.yml');
  assert(c.includes('networks') || c.includes('safelayers-net'));
});
test('Defines persistent volumes', () => {
  assert(readFile('docker-compose.yml').includes('volumes'));
});
test('Has health checks', () => {
  assert(readFile('docker-compose.yml').includes('healthcheck'));
});

// ══════════════════════════════════════════════════════════
//  3. DOCKERFILE SECURITY
// ══════════════════════════════════════════════════════════
console.log('\n🔒  DOCKERFILE SECURITY TESTS');
console.log('─'.repeat(50));

test('Backend Dockerfile runs as non-root user', () => {
  const c = readFile('backend/Dockerfile');
  assert(c.includes('USER ') || c.includes('adduser') || c.includes('useradd'));
});
test('Backend Dockerfile uses multi-stage build', () => {
  const c = readFile('backend/Dockerfile');
  assert(c.toLowerCase().includes('as builder'));
});
test('Frontend Dockerfile uses nginx', () => {
  assert(readFile('frontend/Dockerfile').includes('nginx'));
});
test('Frontend Dockerfile uses multi-stage build', () => {
  assert(readFile('frontend/Dockerfile').toLowerCase().includes('as builder'));
});
test('Backend Dockerfile has HEALTHCHECK', () => {
  assert(readFile('backend/Dockerfile').includes('HEALTHCHECK'));
});

// ══════════════════════════════════════════════════════════
//  4. NGINX SECURITY HEADERS
// ══════════════════════════════════════════════════════════
console.log('\n🌐  NGINX SECURITY CONFIG TESTS');
console.log('─'.repeat(50));

test('nginx.conf sets X-Frame-Options', () => {
  assert(readFile('frontend/nginx.conf').includes('X-Frame-Options'));
});
test('nginx.conf sets X-Content-Type-Options', () => {
  assert(readFile('frontend/nginx.conf').includes('X-Content-Type-Options'));
});
test('nginx.conf sets Content-Security-Policy', () => {
  assert(readFile('frontend/nginx.conf').includes('Content-Security-Policy'));
});
test('nginx.conf sets X-XSS-Protection', () => {
  assert(readFile('frontend/nginx.conf').includes('X-XSS-Protection'));
});
test('nginx.conf handles SPA routing (try_files)', () => {
  assert(readFile('frontend/nginx.conf').includes('try_files'));
});
test('nginx.conf proxies /api/ to backend', () => {
  const c = readFile('frontend/nginx.conf');
  assert(c.includes('proxy_pass') && c.includes('/api/'));
});
test('nginx.conf disables HTML caching', () => {
  const c = readFile('frontend/nginx.conf');
  assert(c.includes('no-cache') || c.includes('no-store'));
});

// ══════════════════════════════════════════════════════════
//  5. KUBERNETES SECURITY
// ══════════════════════════════════════════════════════════
console.log('\n☸️   KUBERNETES SECURITY TESTS');
console.log('─'.repeat(50));

test('Backend deployment sets resource limits', () => {
  const c = readFile('devops/kubernetes/backend-deployment.yml');
  assert(c.includes('limits') && c.includes('memory'));
});
test('Backend deployment runs as non-root', () => {
  const c = readFile('devops/kubernetes/backend-deployment.yml');
  assert(c.includes('runAsNonRoot') || c.includes('runAsUser'));
});
test('Backend deployment has liveness probe', () => {
  assert(readFile('devops/kubernetes/backend-deployment.yml').includes('livenessProbe'));
});
test('Backend deployment has readiness probe', () => {
  assert(readFile('devops/kubernetes/backend-deployment.yml').includes('readinessProbe'));
});
test('Infrastructure defines Zero Trust NetworkPolicy', () => {
  assert(readFile('devops/kubernetes/infrastructure.yml').includes('NetworkPolicy'));
});
test('Infrastructure enforces Istio mTLS STRICT mode', () => {
  const c = readFile('devops/kubernetes/infrastructure.yml');
  assert(c.includes('STRICT') || c.includes('mtls'));
});
test('Infrastructure uses Kubernetes Secrets (not hardcoded)', () => {
  const c = readFile('devops/kubernetes/infrastructure.yml');
  assert(c.includes('secretKeyRef') || c.includes('kind: Secret'));
});
test('Infrastructure has HorizontalPodAutoscaler', () => {
  assert(readFile('devops/kubernetes/infrastructure.yml').includes('HorizontalPodAutoscaler'));
});

// ══════════════════════════════════════════════════════════
//  6. CI/CD PIPELINE (updated — backend tests + Docker smoke)
// ══════════════════════════════════════════════════════════
console.log('\n🔄  CI/CD PIPELINE TESTS');
console.log('─'.repeat(50));

test('Pipeline runs backend tests (npm test)', () => {
  const c = readFile('devops/github/ci-cd.yml');
  assert(c.includes('npm test') || c.includes('jest'));
});
test('Pipeline runs frontend build', () => {
  const c = readFile('devops/github/ci-cd.yml');
  assert(c.includes('npm run build') || c.includes('vite build'));
});
test('Pipeline builds Docker images', () => {
  const c = readFile('devops/github/ci-cd.yml');
  assert(c.toLowerCase().includes('docker'));
});
test('Pipeline triggers on push to main or develop', () => {
  const c = readFile('devops/github/ci-cd.yml');
  assert(c.includes('push') && (c.includes('main') || c.includes('develop')));
});
test('Pipeline triggers on pull requests', () => {
  const c = readFile('devops/github/ci-cd.yml');
  assert(c.includes('pull_request'));
});
test('Pipeline has SAST security scan (npm audit or CodeQL)', () => {
  const c = readFile('devops/github/ci-cd.yml');
  assert(c.includes('CodeQL') || c.includes('npm audit') || c.includes('trivy'));
});

// ══════════════════════════════════════════════════════════
//  7. BACKEND SECURITY CODE REVIEW
// ══════════════════════════════════════════════════════════
console.log('\n🛡️   BACKEND SECURITY CODE TESTS');
console.log('─'.repeat(50));

test('server.js uses Helmet for security headers', () => {
  assert(readFile('backend/src/server.js').includes('helmet'));
});
test('server.js applies rate limiting middleware', () => {
  const c = readFile('backend/src/server.js');
  assert(c.includes('rateLimit') || c.includes('rateLimiter') || c.includes('rate-limit'));
});
test('server.js sanitizes NoSQL injection', () => {
  const c = readFile('backend/src/server.js');
  assert(c.includes('mongoSanitize') || c.includes('mongo-sanitize'));
});
test('server.js has XSS protection', () => {
  const c = readFile('backend/src/server.js');
  assert(c.toLowerCase().includes('xss'));
});
test('server.js restricts CORS to known origin', () => {
  assert(readFile('backend/src/server.js').includes('cors'));
});
test('User model hashes password with bcrypt pre-save', () => {
  const c = readFile('backend/src/models/User.js');
  assert(c.includes('bcrypt') && c.includes("pre(") && c.includes('save'));
});
test('User model excludes password from query results', () => {
  const c = readFile('backend/src/models/User.js');
  assert(c.includes("select: false") && c.includes('password'));
});
test('Auth middleware verifies JWT signature', () => {
  assert(readFile('backend/src/middleware/auth.js').includes('jwt.verify'));
});
test('Auth middleware implements RBAC (restrictTo)', () => {
  const c = readFile('backend/src/middleware/auth.js');
  assert(c.includes('role') && c.includes('restrictTo'));
});
test('Transaction controller uses ACID sessions', () => {
  const c = readFile('backend/src/controllers/transactionController.js');
  assert(c.includes('startSession') && c.includes('commitTransaction'));
});
test('Auth controller implements TOTP or OTP two-factor flow', () => {
  const c = readFile('backend/src/controllers/authController.js');
  assert(
    c.includes('totp') || c.includes('TOTP') ||
    c.includes('otp') || c.includes('OTP') ||
    c.includes('twoFactor') || c.includes('two_factor')
  );
});
test('Rate limiter has dedicated auth limiter', () => {
  const c = readFile('backend/src/middleware/rateLimiter.js');
  assert(c.includes('authLimiter') || c.includes('login'));
});

// ══════════════════════════════════════════════════════════
//  8. FRONTEND SECURITY CODE REVIEW
// ══════════════════════════════════════════════════════════
console.log('\n⚛️   FRONTEND SECURITY CODE TESTS');
console.log('─'.repeat(50));

test('api.js handles authentication (axios interceptor)', () => {
  const c = readFile('frontend/src/utils/api.js');
  assert(c.includes('interceptors'));
});
test('api.js uses withCredentials for cookie-based auth', () => {
  assert(readFile('frontend/src/utils/api.js').includes('withCredentials'));
});
test('LoginPage uses TOTP authenticator flow', () => {
  const loginPath = 'frontend/src/components/auth/LoginPage.jsx';
  if (fileExists(loginPath)) {
    const c = readFile(loginPath);
    assert(c.includes('totp') || c.includes('TOTP') || c.includes('authenticator') ||
           c.includes('setup') || c.includes('verify'));
  } else {
    assert(false, 'LoginPage.jsx not found');
  }
});
test('QR code library is in frontend package.json', () => {
  const pkg = JSON.parse(readFile('frontend/package.json'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert(deps['qrcode.react'] || deps['qrcode'], 'qrcode.react not found in dependencies');
});

// ══════════════════════════════════════════════════════════
//  RESULTS
// ══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log('📊  DEVOPS TEST RESULTS');
console.log('═'.repeat(50));
console.log(`  Total:   ${total}`);
console.log(`  Passed:  ${total - failures} ✅`);
console.log(`  Failed:  ${failures} ❌`);
console.log(`  Score:   ${Math.round(((total - failures) / total) * 100)}%`);
console.log('═'.repeat(50));

if (failures > 0) {
  console.log('\n⚠️  Some tests failed. Check output above.\n');
  process.exit(1);
} else {
  console.log('\n🎉 All DevOps tests passed!\n');
  process.exit(0);
}
