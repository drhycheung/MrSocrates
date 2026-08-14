# MrSocrates — repo conventions

## Deploying to GitHub Pages (IMPORTANT)

- Pushing to `main` **auto-triggers** the Pages build. Do NOT also run
  `gh api -X POST repos/drhycheung/MrSocrates/pages/builds` — a manual trigger
  cancels the in-progress automatic build and leaves **permanent** "cancelled"
  check-runs on the commit, which GitHub shows as "Some checks were not
  successful" even though the site deployed fine.
- To verify a deploy: `gh api repos/drhycheung/MrSocrates/commits/<sha>/check-runs`
  and confirm all three of `build`, `deploy`, `report-build-status` end in
  `success`. Old cancelled runs on past commits are immutable and will not be
  cleaned up; only a new commit shows a green check.
- Commit + push only when the user asks.

## Cache busting

- Bump `app.js?v=N` in `index.html` on every change to `app.js`.
- Bump `config.js?v=N` only when `config.js` changes.

## Testing locally (do this before pushing changes to app.js)

- Syntax check with JXA: `osascript -l JavaScript -e '... new Function(data.js) ...'`.
- Headless DOM test: copy `index.html` into a temp `_test.html`, inject
  `localStorage`/`window.fetch` stubs BEFORE `<script src="app.js...">`, append a
  harness script that asserts on the DOM, then run:
  `"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --headless=new --disable-gpu --no-sandbox --virtual-time-budget=15000 --dump-dom "http://localhost:8000/_test.html"`.
  Serve the app first with `python3 -m http.server 8000`. Delete `_test.html`
  afterwards. A bare-page harness WITHOUT the real index.html markup will fail
  because `app.js` expects the full DOM.

## Other

- Use the `gh` CLI (account `drhycheung`); it is the default for all GitHub ops.
- Commit messages: short, imperative, repo style.
- Docs in UK English. Keys: never commit or log secrets.
- `GETTING-API-KEYS.md` is the single source for provider instructions; the
  Settings `#key-help` collapsible links to it.
