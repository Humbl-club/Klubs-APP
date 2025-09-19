Capacitor iOS — Runbook
=======================

This app ships as a Capacitor iOS shell that loads the built web PWA and exposes native capabilities (camera, push, etc.).

Prerequisites
- Xcode 15+
- Node 18+/20+
- iOS Simulator (iOS 17+)

Environment
- Set Vite env before building (e.g., in `.env.production`):
  - `VITE_SUPABASE_URL=https://<your-project>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=...`
  - Optional: `VITE_STRIPE_PUBLIC_KEY=...`

Build & Open in Xcode
1) Install deps: `npm ci`
2) Build web bundle: `npm run build`
3) Sync iOS: `npx cap sync ios`
4) Open Xcode: `npx cap open ios` (or `npm run ios:open`)
5) In Xcode, select a Team (Signing) and Run on a simulator.

Live Reload (Dev)
1) Start the dev server: `npm run dev:frontend`
2) In another terminal: `npm run ios:dev` (Capacitor live reload)
   - The CLI will inject the dev server URL into the iOS run.

Notes
- If you change env or config, re-run build + sync.
- For QR/camera: allow camera permission when prompted.
- For payments: ensure required Edge Functions and secrets are deployed in Supabase.

