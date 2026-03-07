# Mixture-of-Experts (MOE) Code Review

## The Concept

**Mixture of Experts (MOE)** is a machine learning architecture where multiple specialized models ("experts") each handle different parts of a problem, and a gating mechanism selects which expert(s) to use. DJ.ai adapts this concept for **code review**: multiple AI models review the same code, each focusing on different concerns, then findings are merged.

### Why MOE for Code Review?

Single-model review has blind spots. Each AI model has different training data, reasoning patterns, and areas of strength:

| Model | Typical Strengths |
|-------|-------------------|
| **Claude Sonnet** | Architecture, patterns, readability |
| **Claude Opus** | Deep logic, security, edge cases |
| **GPT Codex** | Syntax precision, API usage, framework conventions |
| **Gemini** | Documentation, web standards, performance |

Using all of them in parallel — each reviewing different concerns — catches bugs that any single reviewer would miss.

## DJ.ai's MOE Review Process

### Structure

Each review round runs **multiple agents in parallel**, each focused on a different concern:

```
Round 1 (Parallel):
├── Agent A (Sonnet): Backend review — security, DI, error handling
├── Agent B (Opus): Frontend review — React patterns, state management
├── Agent C (Codex): TypeScript correctness — types, null safety
├── Agent D (Sonnet): Accessibility — ARIA, keyboard, focus management
└── Agent E (Gemini): Performance — memory leaks, async patterns
```

### Multiple Rounds with Model Rotation

Different models catch different things. Rotating models across rounds ensures diversity:

```
Round 1: Sonnet → Backend, Opus → Frontend
Round 2: Codex → Backend, Gemini → Frontend
Round 3: Opus → Full stack integration review
Round 4: Sonnet → Fix verification
Round 5: Gemini → Final sweep
```

### Real Results

DJ.ai's onboarding wizard and design system features went through 5 review rounds with model rotation, finding **35 bugs** across categories:

| Category | Count | Example |
|----------|-------|---------|
| Accessibility | 8 | Missing aria-labels on icon buttons |
| Security | 5 | Token exposure in error messages |
| Memory leaks | 4 | Unreleased Blob URLs in TTS |
| Race conditions | 4 | Concurrent play requests |
| TypeScript | 6 | Missing null checks |
| CSS | 4 | Hardcoded values instead of tokens |
| Logic errors | 4 | Off-by-one in playlist navigation |

### Implementing MOE Review

```typescript
// Conceptual: launch parallel review agents
const reviewPromises = [
  launchReview({ model: 'sonnet', focus: 'backend', files: backendFiles }),
  launchReview({ model: 'opus', focus: 'frontend', files: frontendFiles }),
  launchReview({ model: 'codex', focus: 'types', files: allTsFiles }),
  launchReview({ model: 'sonnet', focus: 'a11y', files: componentFiles }),
  launchReview({ model: 'gemini', focus: 'perf', files: serviceFiles }),
];

const findings = await Promise.all(reviewPromises);
const merged = deduplicateFindings(findings.flat());
```

### Key Practices

1. **Fix findings between rounds** — Don't accumulate; fix and re-review
2. **Rotate models** — Same model reviewing twice finds fewer new issues
3. **Scope each agent** — "Review security in oauth-proxy/" beats "review everything"
4. **Deduplicate** — Multiple agents may flag the same issue

## DJ.ai Connection

DJ.ai uses MOE review for every feature branch before merge. The `CONTRIBUTING.md` and copilot instructions specify this practice. Review agents post findings as PR comments, fixes are made, and verification rounds confirm the fixes. This process caught critical issues like memory leaks in TTS services and race conditions in playback that traditional single-pass review would have missed.

## Key Takeaways

- Multiple AI models catch more bugs than any single model
- Parallelize review agents by concern (security, a11y, performance, types)
- Rotate models between rounds for maximum coverage
- Fix findings between rounds rather than batching all fixes at the end

## Further Reading

- [Wikipedia: Mixture of Experts](https://en.wikipedia.org/wiki/Mixture_of_experts)
- [Google Research: Switch Transformers](https://arxiv.org/abs/2101.03961)
- [GitHub: AI-Assisted Code Review](https://github.blog/ai-and-ml/github-copilot/how-to-use-github-copilot-in-your-ide-tips-tricks-and-best-practices/)
