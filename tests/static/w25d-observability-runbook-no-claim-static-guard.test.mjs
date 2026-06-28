import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readText(...segments) {
  const target = repoPath(...segments);
  assert.equal(existsSync(target), true, `${segments.join('/')} should exist`);
  assert.equal(statSync(target).isFile(), true, `${segments.join('/')} should be a file`);
  return readFileSync(target, 'utf8');
}

function readW25Docs() {
  return {
    w25b: readText('docs', 'roadmap', 'w25b-configuration-readiness-docs.md'),
    w25c: readText('docs', 'roadmap', 'w25c-observability-runbook-docs.md'),
  };
}

function assertIncludesCaseInsensitive(source, phrase, message = undefined) {
  assert.match(source, new RegExp(escapeRegExp(phrase), 'iu'), message ?? `expected phrase: ${phrase}`);
}

function escapeRegExp(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function markdownLineContexts(source) {
  const lines = source.split(/\r?\n/u);
  return lines.map((line, index) => {
    const previous = lines.slice(Math.max(0, index - 60), index).join('\n');
    const next = lines.slice(index + 1, Math.min(lines.length, index + 6)).join('\n');
    return {
      lineNumber: index + 1,
      line,
      context: `${previous}\n${line}\n${next}`.toLowerCase(),
    };
  });
}

const requiredBoundaryLanguage = Object.freeze([
  'explicit gates',
  'not production-ready',
  'ready-to-attempt',
  'ready-to-run',
  'provider acknowledgement',
  'acknowledgement-only',
  'business success',
  'business-success-not-claimed',
  'unsafe public output',
  'failed-safe-unsafe-public-output-blocked',
  'fake/inert observability summary',
  'fake-inert-observability-summary',
  'restore-replay-planning-not-implemented',
  'incident-recovery-docs-only',
]);

const runbookStructureVocabulary = Object.freeze([
  'symptom',
  'safe public status',
  'likely boundary',
  'claim-safe explanation',
  'operator-safe next step',
  'forbidden evidence',
  'escalation boundary',
]);

const forbiddenReadinessClaimPhrases = Object.freeze([
  'production-ready',
  'production ready',
  'ready for production',
  'deployment-ready',
  'deployment ready',
  'runtime-ready',
  'runtime ready',
  'provider-ready',
  'provider ready',
  'credential-loading-ready',
  'credential loading ready',
  'storage-ready',
  'storage ready',
  'OCA-ready',
  'LifeOS-ready',
  'sidecar-ready',
  'real-provider success',
  'real provider success',
  'real smoke passed',
  'production deployment validated',
]);

const unsafePublicEvidenceTerms = Object.freeze([
  'raw provider payload',
  'raw callback payload',
  'raw runtime payload',
  'raw tool output',
  'stdout',
  'stderr',
  'stack trace',
  'local path',
  'real endpoint',
  'token',
  'secret',
  'config dump',
  'SDK handle',
  'client handle',
  'connector internals',
  'command output',
]);

const safeBoundaryContextPattern = /\b(?:not|no|non-claim|non-production|does not|must not|without|avoid|blocked|below pass|separate|redacted|forbidden evidence|must be synthetic|must be redacted|future|unsafe material|not-claimed|not claimed|do not|exclude|public examples must not include|examples must avoid|does not implement|does not prove|does not show|does not include|must not expose|not evidence|outside|absent|missing|failed-safe|does not implement, authorize, or claim)\b/iu;

function assertTermsOnlyInSafeBoundaryContexts(source, terms, label) {
  const contexts = markdownLineContexts(source);

  for (const term of terms) {
    const termPattern = new RegExp(escapeRegExp(term), 'iu');
    for (const { lineNumber, line, context } of contexts) {
      if (!termPattern.test(line)) {
        continue;
      }

      if (term === 'production-ready' && /\bnot production-ready\b/iu.test(line)) {
        continue;
      }

      assert.match(
        context,
        safeBoundaryContextPattern,
        `${label} line ${lineNumber} uses ${term} outside an explicit safe non-claim or forbidden-evidence boundary`,
      );
    }
  }
}

function unsafeEvidencePatternForPublicExample(term) {
  if (term === 'token' || term === 'secret') {
    return new RegExp(`(?:^|[^A-Za-z0-9-])${escapeRegExp(term)}(?:$|[^A-Za-z0-9-])`, 'iu');
  }

  return new RegExp(escapeRegExp(term), 'iu');
}

function assertNoUnsafeEvidenceInPublicExample(block) {
  for (const term of unsafePublicEvidenceTerms) {
    assert.doesNotMatch(
      block,
      unsafeEvidencePatternForPublicExample(term),
      `public example must not contain unsafe evidence term: ${term}`,
    );
  }
}

function fencedCodeBlocks(source) {
  const blocks = [];
  const fencePattern = /^~~~[^\n]*\n([\s\S]*?)\n~~~/gmu;
  let match;
  while ((match = fencePattern.exec(source)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

test('W25D reads only W25B and W25C documentation leaves', () => {
  const { w25b, w25c } = readW25Docs();

  assertIncludesCaseInsensitive(w25b, '# W25B Configuration and Readiness Docs Leaf');
  assertIncludesCaseInsensitive(w25c, '# W25C Observability Runbook Docs Leaf');
});

test('W25C preserves the exact allowed adapter readiness claim under gates', () => {
  const { w25c } = readW25Docs();

  assert.match(
    w25c,
    /adapter-ready-for-real-system-integration under explicit gates/u,
    'W25C must preserve the exact allowed claim under explicit gates',
  );
});

test('W25B and W25C preserve the required production non-claim', () => {
  const { w25b, w25c } = readW25Docs();

  assert.match(w25b, /\bnot production-ready\b/u, 'W25B must preserve not production-ready');
  assert.match(w25c, /\bnot production-ready\b/u, 'W25C must preserve not production-ready');
});

test('W25 docs preserve required claim-safe boundary language', () => {
  const { w25b, w25c } = readW25Docs();
  const combined = `${w25b}\n${w25c}`;

  for (const phrase of requiredBoundaryLanguage) {
    assertIncludesCaseInsensitive(combined, phrase);
  }

  assert.match(combined, /ready-to-attempt[^\n.]*not pass|ready-to-attempt-not-pass/iu);
  assert.match(combined, /ready-to-run[^\n.]*not pass|ready-to-run-not-pass/iu);
  assert.match(combined, /provider acknowledgement[^\n.]*business success/iu);
  assert.match(combined, /business success[^\n.]*missing|business-success-not-claimed/iu);
  assert.match(combined, /restore or replay planning not implemented|restore-replay-planning-not-implemented/iu);
  assert.match(combined, /incident(?: or |-)recovery[^\n]*documentation[^\n]*without runtime behavior|incident-recovery-docs-only/iu);
});

test('W25C preserves reusable runbook structure vocabulary', () => {
  const { w25c } = readW25Docs();

  for (const phrase of runbookStructureVocabulary) {
    assertIncludesCaseInsensitive(w25c, phrase);
  }
});

test('W25 docs do not turn forbidden readiness phrases into positive claims', () => {
  const { w25b, w25c } = readW25Docs();

  assertTermsOnlyInSafeBoundaryContexts(w25b, forbiddenReadinessClaimPhrases, 'W25B');
  assertTermsOnlyInSafeBoundaryContexts(w25c, forbiddenReadinessClaimPhrases, 'W25C');
});

test('W25 docs mention unsafe evidence terms only as blocked or forbidden public evidence', () => {
  const { w25b, w25c } = readW25Docs();

  assertTermsOnlyInSafeBoundaryContexts(w25b, unsafePublicEvidenceTerms, 'W25B');
  assertTermsOnlyInSafeBoundaryContexts(w25c, unsafePublicEvidenceTerms, 'W25C');
});

test('W25 public examples stay synthetic, redacted, and free of real-looking endpoints', () => {
  const { w25b, w25c } = readW25Docs();
  const combined = `${w25b}\n${w25c}`;
  const exampleBlocks = fencedCodeBlocks(combined);

  assert.ok(exampleBlocks.length >= 1, 'W25 docs should contain bounded public examples to guard');

  for (const block of exampleBlocks) {
    assert.doesNotMatch(block, /https?:\/\//iu, 'public example must not contain HTTP endpoints');
    assert.doesNotMatch(block, /wss?:\/\//iu, 'public example must not contain WebSocket endpoints');
    assert.doesNotMatch(block, /\blocalhost\b|\b127\.0\.0\.1\b/iu, 'public example must not contain local endpoints');
    assert.doesNotMatch(block, /\bapi\.|\.com\/|\.ru\/|\.io\//iu, 'public example must not contain real-looking endpoint examples');
    assertNoUnsafeEvidenceInPublicExample(block);
    assert.match(block, /redacted|synthetic|example|not-claimed|not-production-ready/iu, 'public example must stay synthetic or redacted');
  }
});

test('W25 docs do not contain real-looking endpoint examples anywhere', () => {
  const { w25b, w25c } = readW25Docs();
  const combined = `${w25b}\n${w25c}`;

  assert.doesNotMatch(combined, /https?:\/\//iu, 'W25 docs must not contain HTTP endpoint examples');
  assert.doesNotMatch(combined, /wss?:\/\//iu, 'W25 docs must not contain WebSocket endpoint examples');
  assert.doesNotMatch(combined, /\blocalhost\b|\b127\.0\.0\.1\b/iu, 'W25 docs must not contain localhost endpoint examples');
  assert.doesNotMatch(combined, /\bapi\.|\.com\/|\.ru\/|\.io\//iu, 'W25 docs must not contain real-looking endpoint examples');
});
