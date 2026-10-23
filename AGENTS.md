# AGENTS.md

## What this repo is

`dsh-our-free-model` — a plugin for DeepSeek Harness (dsh) that exposes free LLM
models (no login/API key), plus a standalone local service and a desktop shell.
Zero runtime dependencies, **no build step** for the plugin: plain ESM JavaScript
with JSDoc types. Node `^22.19.0 || >=24.0.0`.

Docs are mostly Simplified Chinese (`README.md`), English mirror in `README_EN.md`.
New user-facing text should follow the language of the file being edited.

## Layout

- `index.js` — host half: adapter registration, model catalog/probe loop, settings
  & usage API routes, forward listener, announcement feed, updater, hot reload.
- `client.js` — browser half: hand-written ModuleLoader bundle (settings UI,
  dashboards, all `ofm_*` CSS). Not compiled — edits take effect directly.
- `adapter/` — **the only place allowed to import `@deepseek-ai/*`** (audit gate).
  `src/` and `index.js` must not.
- `src/` — feature modules: wire-protocol codecs (`stream.js`, `messages.js`,
  `anthropic.js`), lanes (`upstream.js`, `kilo.js`, `eac.js`, `aggregate.js`,
  `providers/registry.json`), token saving (`token-saver/`), fallback chains
  (`combos.js`), security (`trust.js`), distribution (`feed.js`, `updater.js`,
  `reload.js`), local forward port (`forward.js`).
- `scripts/` — ~80 offline test suites plus build/release scripts.
- `locale/en.json`, `locale/zh.json` — message dictionaries.
- `feed/` — `announcements.json` + `manifest.json`; **pushing to main publishes**
  (announcements and the signed upgrade manifest).
- `packages/standalone/` — DSH-free local service (`npm run start:standalone`,
  data in `~/.our-free-model`, port 18900). `packages/desktop/` — Tauri shell.
  See `PACKAGING.md` and `packages/standalone/README.md`.
- `worker/` — optional Cloudflare Worker gateway for the EAC lane.
- `adapter` type surface only: `npm run typecheck` covers **`adapter/` only** —
  it does not type-check `src/` or `client.js`.

## Commands

```sh
npm install --ignore-scripts   # dev deps only (typescript, undici); no lockstep build
npm test                       # ALL offline suites + manifest --check (no network, no quota)
npm run test:contributor       # what fork PRs must pass (skips release-byte/revision suites)
npm run test:release           # manifest / release-e2e / catalog only (maintainers)
npm run typecheck              # tsc --noEmit over adapter/
node scripts/client-lint.mjs   # browser half: t() keys, CSS class coverage
node scripts/<name>-test.mjs   # run one suite; or: npm test -- --only <name>
node scripts/host-selftest.mjs # LIVE end-to-end — spends free-lane quota, manual only
npm run start:standalone       # run the standalone service from source
```

All suites except `host-selftest` and `scripts/probes/` are offline by design: the
test scaffold points upstream URLs at closed local ports. Do not add tests that
reach the network. Suites must take ports from the ephemeral range (fixed ports
have caused cross-suite hangs).

## Rules for edits

- **Adapter seam**: only `adapter/` imports `@deepseek-ai/*`; elsewhere use duck
  typing (the kernel never does `instanceof`). `npm run typecheck` and the catalog
  adapter-isolation check enforce this.
- **Plugin `inject` must list every `ctx.*` service touched.** Reading an
  undeclared service throws (≠ returning undefined). For optional services use
  `ctx.get(name)` (may be undefined before the other half loads) or
  `ctx.inject(deps, cb)` so the plugin waits on a fiber instead of deciding once
  at load time. Dashboard routes must register on their own fiber once `webServer`
  is ready, so the plugin also boots in compositions with no web server (dsh-tui).
- **`providerRetryPolicy()` must return a flat object** (`initialDelayMs`,
  `maxDelayMs`, `jitterRatio` at top level — never nested under `backoff:{}`);
  the kernel stores it as-is and the backoff scheduler reads top-level fields.
- **Response bodies are sniffed by shape, never by Content-Type** — the single
  judge is `sniffBody` in `src/http.js`; sniffed bytes are re-injected into the
  stream.
- **Failure classification** goes through `src/route/classify.js` /
  `classifyFailure`; user aborts must not become retryable `TRANSPORT`.
- **Token compression (`token-saver`) is fail-open** at every step and runs at
  the single choke point `payloadFor()`. Never let a cost-saving transform fail a
  request.
- **UI strings**: every literal `t('key')` in `client.js` must exist in **both**
  `locale/en.json` and `locale/zh.json`, and unused keys fail `client-lint`.
  Every emitted `ofm_*` class must be in the injected stylesheet. Respect
  `prefers-reduced-motion`.
- **Keys/secrets**: provider keys live only in the plugin's 0600 `settings.json`;
  APIs may echo `hasKey` / a `…abcd` fingerprint, never the key. No credentials in
  the repo (`worker/.env`, mint scripts are gitignored).
- **Line endings**: `.gitattributes` forces LF; the release manifest hashes
  LF-normalized bytes, so a CRLF working tree silently drifts the manifest.
- **Don't add entries to `cordis.patch.yml`** — packages referenced by
  `dsh.profile.bundles` auto-register their patch layer; double registration
  errors with `duplicate loader entry id: our-free-model`.
- **Manifest**: any change to a file listed in `package.json#files` makes
  `npm test`'s `manifest --check` fail. Regenerating `feed/manifest.json` needs
  the Ed25519 release private key (maintainer only, see `docs/RELEASING.md`);
  contributors run `npm run test:contributor` instead and must not fabricate
  signatures.
- **Announcement HTML** renders through the strict whitelist sanitizer — treat
  `feed/*.json` content as untrusted; never bypass to `innerHTML`.
- **Trust fence** on plugin HTTP routes: prefer the composition's `connection`
  service, read **per request** (not snapshotted at `apply`), else the structured
  loopback/same-origin fallback in `src/trust.js`.

## Read before touching sensitive areas

- `README.md` → 「实现结构」 (architecture decisions) and 「三个实际消耗过调试时间的内核行为」
  (kernel gotchas) — read these before changing `adapter/`, retry, or injection logic.
- `docs/RELEASING.md` — release/announcement pipeline (maintainers).
- `docs/contributor-ci-signing.md` — what PRs must pass vs. what maintainers sign.
- `docs/issue-12-recovery.md` — stream-recovery contract (time/size/context bounds).
- `PACKAGING.md` — standalone/desktop build rules; the DSH plugin itself never
  has a build step.
