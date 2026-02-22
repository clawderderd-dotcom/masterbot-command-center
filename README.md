# MasterBot Command Center Dashboard

Local-first dashboard for creating and running tasks via the Clawdbot/OpenClaw Gateway.

## Requirements
- Node.js 22+
- Gateway running on the same host (default: `127.0.0.1:18789`)

## Install
```bash
cd /home/openclaw/clawd/masterbot-command-center
npm install
```

## Dev
Runs server + web (Vite) together.
```bash
cd /home/openclaw/clawd/masterbot-command-center
cp .env.example .env
npm run dev
```
- Web: http://127.0.0.1:5173
- Server: http://127.0.0.1:8787
- Dashboard WS: ws://127.0.0.1:8787/ws/dashboard

## Production build
```bash
cd /home/openclaw/clawd/masterbot-command-center
npm run build
npm start
```

## Safe remote access (SSH tunnel)
From your laptop:
```bash
ssh -L 5173:127.0.0.1:5173 -L 8787:127.0.0.1:8787 openclaw@<VPS_HOST>
```
Then open:
- http://127.0.0.1:5173

## Notes / Security
- Server binds to `127.0.0.1` by default.
- MCC will never intentionally display secrets; gateway frames/log text are redacted best-effort.
- If you ever see a secret in the UI, rotate it immediately.
