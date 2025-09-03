# Production Readiness & Feature Status

This document summarizes where we are today, what remains to ship a reliable v1 for at least 10,000 users, and a concrete checklist to close the gaps. It covers Web (Vercel), iOS (SwiftUI), Supabase (DB, Functions), Observability, Security, and Scale.

## Overview
- Architecture: Multi-tenant events + organizations + payments + loyalty + messaging/social.
- Hosting: Web SPA on Vercel; Supabase for Auth/DB/Realtime/Storage/Edge‑Functions.
- Native iOS: SwiftUI app with Supabase + Stripe PaymentSheet, feature‑aligned visuals (glass UI), multi‑tab shell.

## Current Feature Coverage
- Events
  - [x] List/detail (web + iOS)
  - [x] Create event with Connect gating (web + iOS)
  - [x] Registration: free / loyalty points / paid (web + iOS)
  - [x] Registered badge + reminders (web + iOS)
  - [x] Unregister (capacity safe RPC) (web + iOS)
  - [x] Add to calendar (web Google + ICS download; iOS EventKit)
  - [x] ICS feed (org calendar) via tokenized function
- Organizations (Clubs)
  - [x] Free creation (Edge Function)
  - [x] Paid creation via Stripe Checkout + verify (Edge Functions)
  - [x] Stripe Connect onboarding/update/status sync (web + iOS)
  - [x] Org switcher (iOS)
  - [x] Purge org (super admin only)
- Payments
  - [x] Stripe Checkout (web); PaymentSheet (iOS)
  - [x] Webhook/verify flow for registration finalization (Edge Functions)
- Admin/Platform
  - [x] Trials/Grants admin; platform settings (web)
  - [x] Super admin overview (web)
  - [x] Purge organization (Edge Function + web UI)
- Messaging & Social
  - [x] Threads/overlays, social feed (web)
  - [ ] Native iOS messaging/social (phase 2)
- Wellness / Post‑Health Integration
  - [x] Web hooks/services stubs for steps/challenges
  - [ ] Native HealthKit integration for steps/challenges (phase 2)
- Data Lifecycle
  - [x] Export user data (Storage + signed URL; optional email)
  - [x] Delete account (best‑effort scrub + Auth delete)

## Edge Functions Inventory (Supabase)
- Payments + Connect
  - create-payment, verify-payment, create-mobile-payment-intent
  - stripe-connect, stripe-sync-status, stripe-connect-webhook
- Organization lifecycle
  - create-org-free, create-org-subscription, verify-org-subscription, grant-free-account, grant-super-admin
- Data lifecycle
  - export-user-data (with Storage + signed URL and optional Resend email)
  - delete-account (scrubs event_registrations, memberships, profiles, etc., then Auth delete)
  - purge-organization (admin‑only)
- Calendar
  - calendar-ics (ICS feed by token or Authorization)
  - create-calendar-feed-token (issues private tokens)

## Database & RPCs (Key)
- register_for_event (atomic, capacity‑safe registration)
- unregister_from_event (new; removes registration and decrements capacity)
- mark_event_attendance (QR attendance, existing)
- is_platform_admin / is_organization_admin (role guards)
- calendar_feed_tokens table for ICS sharing

## Gaps vs “Main App” (Web)
- [ ] iOS parity for Messaging/Social: implement native lists/threads/feed (web already has these)
- [ ] HealthKit step sync (web stubs exist, native app pending)
- [ ] ICS token management UI (revoke/rotate) in web Org Settings
- [ ] Full admin on iOS (basic admin screens exist; deeper functions on web only)

## Vercel: Deployment & Env
- Ensure production env variables are set in Vercel:
  - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  - VITE_STRIPE_PUBLIC_KEY
  - APP_URL
  - STRIPE_PRICE_BASIC_MONTHLY, STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_BASIC_YEARLY, STRIPE_PRICE_PRO_YEARLY
  - STRIPE_CONNECT_WEBHOOK_SECRET
  - ALLOWED_ORIGINS (include APP_URL and dev origins)

## Supabase: Project Setup
- Project env vars (Functions): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, ALLOWED_ORIGINS, EXPORT_BUCKET (exports), RESEND_* (optional)
- Apply migrations (1001_unregister_from_event, 1002_calendar_feed_tokens)
- Deploy functions (scripts/deploy-functions.sh)
- Verify DB + RPCs (scripts/check-supabase.ts) and Storage/Env (scripts/health-check.ts)

## iOS (Xcode)
- Secrets (local): swift‑ios‑app/Config/Secrets.xcconfig with SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_PUBLISHABLE_KEY
- Generate & open: `cd swift-ios-app && xcodegen generate && open GirlsClubiOS.xcodeproj`
- Signing & Capabilities: set Team; optional Apple Pay merchant; camera permission set; Health keys present

## Scale & Performance (10,000+ users)
- DB & RLS
  - [x] Use RPCs with SECURITY DEFINER for atomic writes (register/unregister)
  - [ ] Review hot path indexes: events(organization_id,start_time), event_registrations(user_id,event_id), organizations(slug), messages(thread_id,created_at)
  - [ ] Confirm RLS filters are tight for multi‑tenant isolation
- Functions & Webhooks
  - [ ] Add idempotency keys to payment/verify flows to prevent duplicate side‑effects
  - [ ] Add structured logging + correlation IDs in Edge Functions
  - [ ] Add simple retry/backoff for transient errors
- Caching & CDN
  - [ ] Cache read‑heavy public endpoints (e.g., calendar‑ics) behind Vercel Edge with short TTL
  - [ ] Use Storage signed URLs for media; rely on CDN
- Realtime & Messaging
  - [ ] Ensure Realtime channels are partitioned by org; consider presence throttling
- Rate limiting & Abuse
  - [ ] Add function‑level rate limits on payment, export, purge endpoints (soft guard)
  - [ ] Web UI: client‑side backoff on repeated failures
- Observability
  - [ ] Centralize logs (Edge Functions) and set alerts on 4xx/5xx spikes
  - [ ] Add Sentry (web + iOS) or similar for client error tracking
- CI/CD
  - [ ] Enforce type‑check + build in CI; include a smoke test (payments, org creation)
  - [ ] Add E2E test for register/unregister and Connect gating

## Security & Compliance
- [ ] Confirm CSP and Strict Transport in Vercel (vercel.json present; validate in prod)
- [ ] Secrets management: Only set secrets in Vercel/Supabase env; never commit
- [ ] Data export/delete: Document retention windows and SLOs; confirm cascading deletes as needed
- [ ] Audit access to purge‑organization (admin‑only + RPC guard)

## QA Plan (Minimal but High Impact)
- Org Creation
  - [ ] Free org via create-org-free → owner membership set → redirect to dashboard
  - [ ] Paid org via create‑org‑subscription → return to verify → owner membership + billing record
- Connect + Events
  - [ ] Connect onboarding; status shows charges_enabled/payouts_enabled
  - [ ] Create paid event (only after Connect) and register (web + iOS)
  - [ ] Unregister (upcoming only), capacity decrements
  - [ ] Add to Calendar (web + iOS) opens correctly
  - [ ] ICS feed link works in external calendar (token path)
- Data Lifecycle
  - [ ] Export user data (download + Storage entry; optional email)
  - [ ] Delete account (scrubs data + Auth delete); user can no longer log in
- Messaging/Social
  - [ ] Send message in test org; feed shows posts; check RLS constraints

## Suggestions That Fit the Product Logic
- Events & Community
  - Waitlist & auto‑promotion when capacity frees
  - Event reminders escalation (push + email + in‑app)
  - Event chat tied to registrations so only attendees can post
  - Attendee badges/loyalty boosts for attendance streaks
- Org‑Admin UX
  - ICS token management (revoke/rotate) and public landing calendar
  - Insights for orgs: top events, conversion funnels, membership growth
- Social & Wellness
  - Native iOS Messaging in phase 2 (Realtime + compact UI)
  - HealthKit step sync integrated with challenges + leaderboards
- Reliability
  - Idempotency keys + retries in payments/verify functions
  - Backpressure/rate limiting on expensive endpoints
  - Canary releases and feature flags per org

## Actionable TODO (Checklist)
- Environment
  - [ ] Vercel: set all envs (VITE_*, APP_URL, Stripe, ALLOWED_ORIGINS)
  - [ ] Supabase: set Functions envs (URL/Keys/Stripe/ALLOWED_ORIGINS/EXPORT_BUCKET/RESEND_*)
- Supabase
  - [ ] Apply migrations 1001 & 1002
  - [ ] Deploy functions (scripts/deploy-functions.sh)
  - [ ] Run `npm run supabase:check` and `npm run supabase:health`
- Web
  - [ ] Validate Connect gating, register/unregister, ICS link creation
  - [ ] Validate org onboarding (free + paid) and verify flow
  - [ ] Quick pass on messaging/social views under current RLS
- iOS
  - [ ] Fill Secrets.xcconfig
  - [ ] XcodeGen generate + open the project; set Signing Team
  - [ ] Run through flows (payments, calendar, ICS share, delete/export)
- Scale & Observability
  - [ ] Index review + add missing hot‑path indexes
  - [ ] Add Sentry (web + iOS) and function log aggregation
  - [ ] Add rate limiting + idempotency on critical functions

---

Use these helper commands to iterate quickly:
- Deploy all functions: `npm run supabase:deploy`
- DB/RPC check: `npm run supabase:check`
- Env/Storage health: `npm run supabase:health`
- CORS preflight (optional): `npm run supabase:cors`

This page reflects the current repo state and should be updated as items move from [ ] to [x].
