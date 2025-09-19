Supabase‑Only Quick Start
=========================

This repo is a Supabase‑first, mobile‑focused (Capacitor) PWA. There is no custom server‑side ORM or API; all data access flows through Supabase (DB, Auth, Storage, Realtime, Edge Functions).

Prerequisites
- Node 18+ (or 20+)
- Xcode 15+ for iOS simulator
- Optional: Supabase CLI for function deploys

Environment
Create a `.env.local` for local dev (Vite):

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
# Optional if using web Stripe checkout in dev
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

Install & Run (Web)
```
npm install
npm run dev:frontend   # Vite dev server
npm run build          # Production build
```

iOS (Capacitor)
```
npm install
npm run ios:open       # build → cap sync → open in Xcode
# In Xcode: select Signing Team, choose a simulator, Run

# Live reload development
npm run dev:frontend   # start Vite dev server
npm run ios:dev        # run iOS app with live reload
```

Supabase Functions (optional)
- Deploy all functions (requires Supabase CLI login):
```
npm run supabase:deploy
```

- Health checks:
```
npm run supabase:check    # DB/RPC sanity
npm run supabase:health   # storage/env checks
npm run supabase:cors     # function CORS preflight checks
```

Secrets to set in Supabase (Functions → Secrets)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Payments (if enabled): `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_WEBHOOK_SECRET`
- CORS: `ALLOWED_ORIGINS` (comma‑separated list incl. localhost + prod domains)
- Exports: `EXPORT_BUCKET=exports`

What’s in/what’s out
- IN: Supabase (Auth/DB/Storage/Realtime/Edge), Capacitor iOS shell
- OUT: Any server‑side ORM/tooling (legacy references removed)

Common Tasks
- Events: create/register/unregister; paid flows require Stripe keys + Connect onboarding
- Loyalty points: real‑time updates via subscriptions
- Calendar: enable ICS function + tokens (Org Admin → Calendar)
- Settings: mobile navigation (/settings/:section) with live persistence

Contributing
- Keep UI changes token‑driven (CSS variables) for consistent theming
- Add feature flags per org when introducing new sections
- Prefer RPC/Edge Functions for complex writes (atomicity + RLS)

