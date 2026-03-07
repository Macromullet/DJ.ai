#!/usr/bin/env node
// Test Failure Reporter — agent-friendly output with source context
// Usage: node scripts/test-failures.mjs

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const summaryPath = join(rootDir, 'test-results', 'summary.json');
if (!existsSync(summaryPath)) {
  console.log('No test results found. Run tests first: npm run test:all');
  process.exit(0);
}

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

if (summary.overall === 'PASS') {
  console.log('✅ All tests passed!');
  const suites = Object.entries(summary.suites || {});
  for (const [name, s] of suites) {
    console.log(`  ${name}: ${s.passed}/${s.total} passed (${s.durationMs}ms)`);
  }
  process.exit(0);
}

const failures = summary.failures || [];
console.log(`## ${failures.length} Test Failure${failures.length !== 1 ? 's' : ''}\n`);

for (const failure of failures) {
  console.log(`### FAIL: [${failure.suite}] ${failure.test}`);
  if (failure.file) console.log(`File: ${failure.file}`);
  
  // Extract source file and line from error/stack
  const errorLines = (failure.error || '').split('\n');
  console.log(`Error: ${errorLines[0]}`);
  
  if (failure.stack) {
    // Try to extract the first meaningful stack line
    const stackLines = failure.stack.split('\n').filter(l => l.trim().startsWith('at '));
    if (stackLines.length > 0) {
      console.log(`Stack: ${stackLines[0].trim()}`);
    }
  }

  // Try to show source context
  if (failure.sourceFile) {
    const sourcePath = join(rootDir, failure.sourceFile);
    if (existsSync(sourcePath)) {
      const lines = readFileSync(sourcePath, 'utf8').split('\n');
      const line = failure.sourceLine || 0;
      if (line > 0) {
        const start = Math.max(0, line - 3);
        const end = Math.min(lines.length, line + 2);
        console.log('Context:');
        for (let i = start; i < end; i++) {
          const marker = i === line - 1 ? '>' : ' ';
          console.log(`  ${String(i + 1).padStart(4)} ${marker}| ${lines[i]}`);
        }
      }
    }
  }

  if (failure.screenshot) {
    console.log(`Screenshot: ${failure.screenshot}`);
  }
  if (failure.trace) {
    console.log(`Trace: ${failure.trace}`);
  }
  console.log('');
}

process.exit(1);
