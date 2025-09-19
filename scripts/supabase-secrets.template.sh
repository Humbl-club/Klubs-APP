#!/usr/bin/env bash
# Usage: source this after editing values, then run each line or `bash` it if logged in.

# Required
supabase functions secrets set STRIPE_SECRET_KEY=sk_live_***
supabase functions secrets set ALLOWED_ORIGINS="https://your-app.example,https://preview.example,http://localhost:3000,http://localhost:5000"
supabase functions secrets set EXPORT_BUCKET=exports
supabase functions secrets set STRIPE_CONNECT_WEBHOOK_SECRET=whsec_***

# Optional (export emails)
# supabase functions secrets set RESEND_API_KEY=re_***
# supabase functions secrets set RESEND_FROM="Club <noreply@your-domain>"

