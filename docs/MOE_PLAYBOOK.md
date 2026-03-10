# Mixture-of-Experts (MOE) Code Review Playbook

A practical guide for using multiple AI models in parallel to achieve production-quality code reviews. This playbook is based on real-world experience running **15+ MOE review rounds** on DJ.ai, fixing **100+ bugs** including RCE vulnerabilities, TOCTOU races, SSRF bypasses, architectural dead code, and infrastructure misconfigurations.

## Why MOE Works

Single-model reviews have blind spots. Every model has biases — things it over-reports (style nits) and things it misses (subtle races, architectural gaps). By running 3+ models in parallel with different focus areas, you get:

- **Convergent findings** — when 2+ models flag the same issue independently, it's almost certainly real
- **Complementary coverage** — what Opus misses in infrastructure, Gemini catches; what Gemini misses in security, Codex catches
- **False positive filtering** — if only one model flags something and others don't, it warrants skepticism
- **Faster convergence** — parallel execution means 3 reviews in the time of 1

---

## The Core Pattern

### Step 1: Define Your Expert Roles

Split your codebase into 3 concern areas. Each review agent gets one area and one model. The exact split depends on your project — here's what worked for DJ.ai:

| Role | Focus | What to look for |
|------|-------|-----------------|
| **Backend Expert** | Server-side code, APIs, data layer | Thread safety, auth bypass, input validation, resource leaks, error handling |
| **Frontend Expert** | UI code, state management, rendering | Stale closures, race conditions, memory leaks, XSS, accessibility |
| **Security Expert** | Cross-cutting security concerns | SSRF, RCE, CORS misconfiguration, secret exposure, CSP gaps |

Other useful role splits we used:
- **Infrastructure Expert** — Bicep/Terraform, CI/CD workflows, deployment scripts
- **Dead Code Expert** — Unused files, unreachable code, stale dependencies
- **TTS/Media Expert** — Audio handling, blob URLs, playback races (domain-specific)

### Step 2: Assign Models to Roles

Use at least 3 different models. Here are the ones we found most effective:

| Model | Strengths | Watch out for |
|-------|-----------|---------------|
| **Claude Opus 4.6** | Deep architectural analysis, security reasoning, catches subtle races | Can over-flag theoretical issues |
| **Gemini 3 Pro** | Excellent at infrastructure, practical fixes, catches real bugs | Occasionally creates repro tests that are themselves buggy |
| **GPT-5.x Codex** | Strong on patterns, dead code detection, cross-file analysis | Can time out on very large reviews |
| **Claude Sonnet 4** | Fast, good security focus, low false positive rate | Less deep than Opus on architectural issues |
| **Claude Opus 4.5** | Thorough, excellent at frontend state bugs | Slower than other options |

**The key insight: rotate models between roles every round.** A model that reviewed backend in R1 should review frontend in R2. This prevents blind spots from compounding.

### Step 3: Write Your Review Prompts

The prompt is everything. Vague prompts get vague results. Here's the template that consistently produced high-signal findings:

---

## Prompt Templates

### Backend Security Review

```
Review the backend code in [path] for security vulnerabilities and correctness issues.

Focus areas:
- Authentication and authorization bypass
- Input validation (OAuth codes, redirect URIs, device tokens)
- Thread safety (concurrent dictionary access, TOCTOU races)
- Resource management (HttpClient lifetime, IDisposable, memory leaks)
- Error handling (information leakage in error responses, swallowed exceptions)
- Rate limiting bypass vectors
- Secret exposure (connection strings in outputs, logs, or ARM metadata)

Context:
- This is a .NET 8 isolated Azure Functions project
- It handles OAuth token exchange only (not API proxying)
- State is stored in Redis with in-memory fallback
- Secrets come from Azure Key Vault via Managed Identity

For each finding, provide:
1. Severity (CRITICAL / HIGH / MEDIUM / LOW)
2. File path and line numbers
3. The specific vulnerability or bug
4. A concrete exploit scenario or failure mode
5. A suggested fix

Do NOT report: style issues, naming conventions, missing comments, or theoretical issues that require physical access.
```

### Frontend Review

```
Review the frontend code in [path] for bugs, security issues, and correctness problems.

Focus areas:
- React state management (stale closures in callbacks, refs vs state)
- Memory leaks (event listeners not cleaned up, blob URLs not revoked, timers not cleared)
- Race conditions (concurrent async operations, component unmount during fetch)
- XSS vectors (dangerouslySetInnerHTML, eval, URL injection)
- Electron-specific security (IPC exposure, context isolation bypass, CSP gaps)
- OAuth flow correctness (callback handling, token storage, rehydration)

Context:
- React 18 + TypeScript + Vite in an Electron shell
- IPC bridge via contextBridge (preload.cjs)
- API keys stored in main process only (renderer gets 'configured' placeholder)
- Multiple async TTS providers with playback queueing

For each finding, provide:
1. Severity (CRITICAL / HIGH / MEDIUM / LOW)
2. File path and line numbers
3. The specific bug or vulnerability
4. Steps to reproduce or trigger the issue
5. A suggested fix

Do NOT report: CSS issues, missing aria labels, TypeScript style preferences, or test coverage gaps.
```

### Infrastructure / DevOps Review

```
Review the infrastructure and deployment code for security, cost, and correctness issues.

Files to review:
- infra/*.bicep (Azure infrastructure as code)
- .github/workflows/*.yml (CI/CD pipelines)
- scripts/*.ps1 (deployment and setup scripts)

Focus areas:
- Dead or orphaned infrastructure modules
- Overly permissive RBAC roles or network access
- Cost optimization (SKU sizing, instance caps, unused resources)
- CI/CD security (permissions blocks, secret handling, OIDC configuration)
- Deployment correctness (artifact packaging, environment targeting)
- Documentation drift (docs that don't match actual infrastructure)

Context:
- Azure Flex Consumption Functions with VNet + private endpoints
- Three environments: dev, staging, prod (resource groups: rg-djai-{env})
- OIDC federation for GitHub Actions (no stored secrets)
- Bicep modules: function-app, storage, redis, key-vault, network-isolation

For each finding, provide:
1. Severity (CRITICAL / HIGH / MEDIUM / LOW)  
2. File path and line numbers
3. The specific issue
4. Impact (security risk, cost waste, deployment failure)
5. A suggested fix

Do NOT report: formatting, comment style, or Bicep linting warnings already suppressed.
```

### Dead Code / Cleanup Review

```
Audit the entire codebase for dead code, unused dependencies, and stale artifacts.

Check for:
- Files that are never imported or referenced
- npm packages in package.json that aren't used in any source file
- .NET packages in .csproj that aren't referenced
- Dead exports (functions/types exported but never imported elsewhere)
- Commented-out code blocks
- Configuration for removed features
- Documentation referencing deleted features
- Stale git branches with no recent activity

Context:
[Brief description of recent removals or refactors]

For each finding, provide:
1. The dead artifact (file, package, export, config entry)
2. Evidence it's dead (no imports, no references, no callers)
3. Confidence level (CERTAIN / LIKELY / UNCERTAIN)
4. Suggested action (delete, update reference, investigate)
```

---

## The Review-Fix-Verify Loop

This is the workflow that consistently produced results:

### Round Structure

```
┌─────────────────────────────────────────────────┐
│  1. LAUNCH — 3 agents in parallel, different     │
│     models, different focus areas                │
│                                                   │
│  2. TRIAGE — Consolidate findings, deduplicate,  │
│     classify severity, identify false positives  │
│                                                   │
│  3. FIX — Fix all real findings (parallel agents │
│     for independent fixes)                       │
│                                                   │
│  4. VERIFY — Run full test suite, type check,    │
│     build. No regressions allowed.               │
│                                                   │
│  5. COMMIT — Single commit per round on a        │
│     feature branch                               │
│                                                   │
│  6. ROTATE — Swap model assignments and repeat   │
│     until a round comes back clean               │
└─────────────────────────────────────────────────┘
```

### Convergence Criteria

**Stop when:** A full round returns zero CRITICAL or HIGH findings across all 3 agents.

In our experience:
- **R1-R2**: High bug density. Expect 10-20 findings per round.
- **R3-R4**: Diminishing returns. Expect 3-8 findings per round.
- **R5+**: Convergence. Expect 0-2 findings. Most are MEDIUM/LOW.
- **R11**: We hit full convergence — 2/3 agents returned CLEAN, 1 found a single timing issue.

### Model Rotation Schedule

Rotate every round to prevent blind spots from compounding:

| Round | Security | Frontend | Backend |
|-------|----------|----------|---------|
| R1 | Gemini Pro | Opus 4.6 | Codex 5.3 |
| R2 | Opus 4.6 | Codex 5.3 | Gemini Pro |
| R3 | Codex 5.3 | Gemini Pro | Opus 4.6 |
| R4 | Gemini Pro | Opus 4.6 | Codex 5.3 |
| R5 | Opus 4.5 | Codex 5.3 | Gemini Pro |
| ... | (introduce new models as available) | | |

After R4-R5, we started introducing fresh models (Sonnet 4, Opus 4.5, GPT-5.1/5.2 Codex) to get genuinely new perspectives. **New models often find things that rotated veterans miss.**

---

## Prompt Engineering Tips

### What makes prompts effective

1. **Specify the tech stack** — Models review differently when they know it's "Electron + React" vs generic "JavaScript app"
2. **Exclude noise explicitly** — "Do NOT report style issues" prevents 50% of low-value findings
3. **Require exploit scenarios** — "Concrete exploit scenario" forces the model to prove the bug is real, not theoretical
4. **Provide architectural context** — "OAuth-only middle tier, not an API proxy" prevents misguided findings about missing API endpoints
5. **Scope tightly** — Point at specific directories, not "review everything." Large scope = shallow review.

### What to avoid

- **"Review this code"** — Too vague. You'll get style nits and obvious stuff.
- **"Find all bugs"** — Models will manufacture findings to fill the request.
- **"Focus on everything"** — Contradictory. Pick 3-5 specific concerns.
- **Skipping context** — Without knowing Redis is the state store, a model can't find Redis-specific race conditions.

### Handling false positives

We saw consistent false positive patterns:

| False Positive Pattern | Example | How to verify |
|----------------------|---------|---------------|
| **Threading concerns in single-threaded runtime** | "IPC handlers have race condition" in Node.js | Node.js event loop is single-threaded; IPC handlers execute sequentially |
| **Defense-in-depth already handled** | "URL not validated before use" when an allowlist check happens 3 lines earlier | Trace the full call chain before accepting |
| **Theoretical with no practical path** | "Attacker could inject headers via URL fragments" when URL is already parsed and validated | Ask: what's the actual attack path? |

**Rule of thumb:** If only 1 of 3 models flags it, investigate before fixing. If 2+ flag it independently, it's almost certainly real.

---

## Tracking Findings

Use a structured format to track findings across rounds. We used a SQL table:

```sql
CREATE TABLE review_findings (
  id TEXT PRIMARY KEY,           -- e.g., 'gemini-r6-2'
  round TEXT NOT NULL,           -- e.g., 'R6'
  model TEXT NOT NULL,           -- e.g., 'gemini-3-pro'
  severity TEXT NOT NULL,        -- CRITICAL, HIGH, MEDIUM, LOW
  area TEXT NOT NULL,            -- backend, frontend, security, infra
  file_path TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending'  -- pending, resolved, false_positive, wont_fix
);
```

This lets you:
- Query findings by round, severity, or area
- Track resolution rates
- Identify which models find what (calibrate future assignments)
- Prove convergence ("R11: 0 HIGH findings across all agents")

---

## Real Results: DJ.ai Case Study

### By the Numbers

| Metric | Value |
|--------|-------|
| Total review rounds | 15 |
| Total findings | 100+ |
| Critical/High bugs fixed | 40+ |
| Models used | 7 (Opus 4.5, Opus 4.6, Sonnet 4, Gemini 3 Pro, Codex 5.1/5.2/5.3) |
| False positive rate | ~15% |
| Rounds to convergence (code) | 11 |
| Rounds to convergence (infra) | 2 |

### Highest-Impact Findings

| Finding | Severity | Model | Round | Description |
|---------|----------|-------|-------|-------------|
| RCE in Electron | CRITICAL | Opus 4.6 | R1 | User input interpolated into `executeJavaScript()` |
| OAuth callback broken | CRITICAL | Codex 5.3 | R2 | State GUID used as provider name — flow never completed |
| TOCTOU on state tokens | HIGH | Opus 4.6 | R2 | Two threads could validate same OAuth state token |
| SSRF via redirect URI | HIGH | Gemini Pro | R3 | `localhost.attacker.com` bypassed prefix-match validation |
| safeStorage decrypt oracle | HIGH | Codex 5.3 | R6 | XSS could exfiltrate all API keys via IPC |
| CORS wildcard | HIGH | Opus 4.6 | R15 | `*.azurestaticapps.net` allowed any Azure Static Web App |
| Rate-limit bypass | HIGH | Opus 4.5 | R10 | Sweep removed rate history outside lock — concurrent bypass |
| Dead infra modules | MEDIUM | Gemini Pro | R15 | 3 Bicep modules orphaned after consolidation |

### What Each Model Was Best At

| Model | Sweet Spot | Example Finds |
|-------|-----------|---------------|
| **Opus 4.6** | Deep security reasoning, architectural flaws | RCE, TOCTOU, CORS wildcard, stale closures |
| **Gemini 3 Pro** | Infrastructure, practical bugs, cost issues | Dead Bicep modules, Redis SKU waste, DoS vectors |
| **Codex 5.3** | Cross-file analysis, dead code, integration bugs | OAuth callback broken, decrypt oracle, stale branches |
| **Sonnet 4** | Fast security scan, low false positive rate | CSP gaps, temp file permissions |
| **Opus 4.5** | Thorough frontend state analysis | Race conditions in React, sweep timing bugs |

---

## Quick-Start Checklist

For your first MOE review:

- [ ] Pick 3 models (e.g., Opus 4.6, Gemini Pro, Codex 5.3)
- [ ] Define 3 focus areas matching your architecture
- [ ] Write scoped prompts with tech stack context and explicit exclusions
- [ ] Launch all 3 agents in parallel
- [ ] Triage: deduplicate, verify convergent findings, investigate solo findings
- [ ] Fix all CRITICAL/HIGH findings
- [ ] Run full test suite — zero regressions
- [ ] Commit fixes on a feature branch
- [ ] Rotate model assignments
- [ ] Repeat until a round comes back clean (zero CRITICAL/HIGH)
- [ ] Squash merge to main

---

## Advanced Patterns

### Domain-Specific Experts

For specialized codebases, add a 4th agent with domain expertise:

```
Review the TTS (text-to-speech) audio pipeline for correctness issues.

Focus on:
- Audio blob lifecycle (creation → playback → revocation)
- Concurrent playback races (new request while old is playing)
- Request ID guards (stale audio from cancelled requests)
- AudioContext state management (suspended → running → closed)
- Memory leaks from unreleased object URLs
```

### Post-Refactor Validation Reviews

After a major refactor (we removed YouTube + AudioVisualizer = 3,400 lines deleted), run a targeted cleanup review:

```
We just removed [feature]. Audit for any remaining references:
- Imports of deleted files
- Configuration for the removed feature
- Documentation mentioning it
- Test fixtures or mocks that reference it
- Dead code that only existed to support it
```

### Infrastructure-Only MOE

When reviewing IaC/deployment changes, swap the standard roles:

| Role | Focus |
|------|-------|
| **Cost Expert** | SKU sizing, instance caps, unused resources, conditional tiers |
| **Security Expert** | Network isolation, RBAC least-privilege, public access, secret handling |
| **Correctness Expert** | Dead modules, doc drift, deployment script bugs, CI/CD gaps |

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Do This Instead |
|-------------|--------------|-----------------|
| Same model for all 3 roles | No diversity = shared blind spots | Use 3 different models minimum |
| Never rotating models | Blind spots compound across rounds | Rotate every round |
| Fixing findings without tests | You'll regress | Run full suite after every fix round |
| Accepting all findings uncritically | ~15% are false positives | Triage and verify before fixing |
| Stopping after R1 | R1 catches the obvious stuff; R2-R3 catch the subtle stuff | Continue until convergence |
| Huge review scope | "Review the whole app" = shallow analysis | Scope to specific directories or concerns |
| Ignoring MEDIUM findings | They accumulate into real problems | Fix all MEDIUMs before release |

---

## Summary

The MOE pattern works because it treats AI models like a real review team: diverse perspectives, structured process, and iterative refinement. The key principles are:

1. **Parallelize** — 3 agents, 3 models, 3 focus areas, launched simultaneously
2. **Rotate** — swap model assignments every round to prevent compounding blind spots
3. **Scope tightly** — specific directories, specific concerns, explicit exclusions
4. **Require evidence** — exploit scenarios, not theoretical hand-waving
5. **Triage honestly** — not every finding is real; verify before fixing
6. **Verify mechanically** — full test suite after every fix round, no exceptions
7. **Iterate to convergence** — keep going until a round comes back clean
