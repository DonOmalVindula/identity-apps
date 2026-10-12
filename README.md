# Runtime evidence for wso2/identity-apps#10720

- `monaco-cdn.mjs`: Playwright run (login, conditional-auth script editor, Branding > Text > JSON, Logs, Policy Administration, sub-organization Console) that aborts requests per `BLOCK=cdn|nonorigin|none` and classifies every request.
- `worker-probe.mjs`: starts each deployed worker file with `new Worker()` from a Console page and reports the first message or error.
- `run-summaries.json`: editor results and request summaries of the two runs behind the screenshots.
- `worker-probe.out`, `unit-test.out`: raw outputs.

Run: `BASE=https://localhost:9443 APP_ID=<app id> ORG_ID=<org id> BLOCK=nonorigin node monaco-cdn.mjs` (needs `playwright`).
