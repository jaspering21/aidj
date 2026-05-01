# AIDJ Agent Team - Project Commercialization

## Mission

Transform the AIDJ music agent from a proof-of-concept demo to a production-ready commercial product.

**Core Principle (karpathy-guidelines):**
- Think Before Coding: Don't assume, surface tradeoffs
- Simplicity First: Minimum viable code
- Surgical Changes: Only touch what's necessary
- Goal-Driven: Define verifiable success criteria

---

## Team Structure

### 1. Team Leader Agent
**Role:** Orchestrates the team, prioritizes tasks, ensures quality gates

**Responsibilities:**
- Analyze project state and create work queue
- Assign tasks to Development Agent
- Verify Testing Agent results
- Solicit Code Review Agent feedback
- Make go/no-go decisions for commercialization

**Quality Gates:**
1. All tests pass
2. No critical security issues
3. Code review approved
4. Performance benchmarks met
5. Documentation complete

---

### 2. Development Agent
**Role:** Implement features, fix bugs, improve code quality

**Task Categories:**

#### Phase 1: Foundation (Week 1)
- [ ] Error handling and edge cases
- [ ] Input validation on all API endpoints
- [ ] Type safety improvements
- [ ] Logging and monitoring setup
- [ ] Environment configuration

#### Phase 2: Reliability (Week 2)
- [ ] Retry logic for failed API calls
- [ ] Graceful degradation when services fail
- [ ] Session management improvements
- [ ] Caching strategy (weather, recommendations)
- [ ] Rate limiting

#### Phase 3: Security (Week 3)
- [ ] Secure cookie storage
- [ ] API key encryption at rest
- [ ] HTTPS enforcement
- [ ] Input sanitization
- [ ] CORS configuration

#### Phase 4: UX Polish (Week 4)
- [ ] Loading states and skeletons
- [ ] Error messages for users
- [ ] Offline handling
- [ ] Responsive design improvements
- [ ] Accessibility (ARIA labels, keyboard nav)

#### Phase 5: Commercial Features (Week 5+)
- [ ] User preferences storage
- [ ] Play history
- [ ] Favorites/liked songs
- [ ] Social sharing
- [ ] Analytics integration

---

### 3. Testing Agent
**Role:** Comprehensive verification of all changes**

**Testing Framework:**
```typescript
// Test categories
type TestCategory = 'unit' | 'integration' | 'e2e' | 'security' | 'performance'
```

**Test Coverage Requirements:**
- Unit tests: 80%+ coverage on utilities
- Integration tests: All API endpoints
- E2E tests: Critical user flows
- Security tests: Input validation, auth bypass attempts
- Performance tests: Load time < 2s, API response < 500ms

**Verification Commands:**
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific suite
npm test -- --grep "api"

# Performance test
npx playwright test performance.spec.ts
```

**Success Criteria:**
- 100% critical path tests passing
- 0 console errors in production mode
- 0 security vulnerabilities
- Load time < 2s on 3G connection

---

### 4. Code Review Agent
**Role:** Ensure code quality, maintainability, best practices

**Review Checklist:**

#### Code Quality
- [ ] No `any` types without justification
- [ ] No magic numbers (use constants)
- [ ] Functions < 50 lines
- [ ] No code duplication > 3 lines
- [ ] Clear variable/function naming

#### Security
- [ ] No secrets in code
- [ ] Input validation on all entry points
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection

#### Performance
- [ ] No unnecessary re-renders
- [ ] Proper memoization
- [ ] Lazy loading where appropriate
- [ ] Image optimization
- [ ] Bundle size < 200KB

#### Documentation
- [ ] JSDoc on all exported functions
- [ ] README updated for any API changes
- [ ] Environment variables documented
- [ ] Deployment guide complete

---

## Commercialization Roadmap

### Current State (Demo)
- ✅ Basic UI works
- ✅ Login flow works
- ✅ Playlist loads
- ⚠️ Some songs unavailable
- ⚠️ No error handling
- ⚠️ Basic security

### Target State (Production)
```
┌─────────────────────────────────────────┐
│  Production Readiness Checklist          │
├─────────────────────────────────────────┤
│  Security                                │
│  ├── [ ] HTTPS only                     │
│  ├── [ ] Secure credential storage       │
│  ├── [ ] Rate limiting                  │
│  └── [ ] Input validation               │
│                                          │
│  Reliability                             │
│  ├── [ ] Retry logic                    │
│  ├── [ ] Graceful degradation            │
│  ├── [ ] Session recovery               │
│  └── [ ] Offline support                │
│                                          │
│  Performance                             │
│  ├── [ ] < 2s load time                │
│  ├── [ ] < 500ms API response          │
│  └── [ ] 60fps UI                       │
│                                          │
│  Monitoring                              │
│  ├── [ ] Error tracking                 │
│  ├── [ ] Analytics                      │
│  ├── [ ] Health checks                  │
│  └── [ ] Logging                        │
│                                          │
│  Documentation                           │
│  ├── [ ] API docs                       │
│  ├── [ ] Deployment guide               │
│  ├── [ ] User guide                     │
│  └── [ ] Security policy                │
└─────────────────────────────────────────┘
```

---

## Team Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                         TEAM LEADER                             │
│  1. Analyze project state                                      │
│  2. Create prioritized task list                                │
│  3. Assign to Development Agent                                 │
│  4. Development Agent implements                                │
│  5. Testing Agent verifies                                      │
│  6. Code Review Agent reviews                                   │
│  7. Loop until all criteria met                                 │
│  8. If all gates pass → PRODUCTION                             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌───────────┐      ┌───────────┐      ┌───────────┐
    │   DEV     │      │   TEST    │      │   REVIEW  │
    │  Agent    │      │   Agent   │      │   Agent   │
    └───────────┘      └───────────┘      └───────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  Verification  │
                    │    Results      │
                    └─────────────────┘
```

---

## Commands Reference

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

### Testing
```bash
# Run all tests
npm test

# E2E tests
npx playwright test

# Performance tests
npx playwright test performance.spec.ts
```

### Code Review
```bash
# Check for secrets
git diff --staged | grep -i "password\|secret\|key"

# Check bundle size
npm run build && ls -la .next/static
```

---

## Quality Gates

| Gate | Criteria | Tool |
|------|----------|------|
| Security | 0 critical CVE | snyk, npm audit |
| Tests | 100% critical path | playwright |
| Types | 0 `any` types in routes | tsc |
| Bundle | < 200KB first load | lighthouse |
| Performance | < 2s load time | lighthouse |
| Coverage | > 80% utility coverage | jest --coverage |

---

## Communication Protocol

**Development Agent** reports:
- What was changed
- Why it was changed (linked to task)
- Verification evidence (test results)
- Any new risks identified

**Testing Agent** reports:
- Test results with evidence
- Any failures
- Performance metrics
- Security scan results

**Code Review Agent** reports:
- Issues found with severity
- Suggestions for improvement
- Approval/rejection with justification

**Team Leader** decides:
- Task priority
- Accept/reject changes
- When ready for production