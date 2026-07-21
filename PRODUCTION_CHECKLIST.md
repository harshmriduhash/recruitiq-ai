# Production Readiness Checklist

## Infrastructure
- [ ] Backup restore drill completed successfully
- [ ] Point-in-time recovery verified
- [ ] Storage bucket size caps documented
- [ ] Rate limits configured per plan (Free: 20 req/min, paid: 100 req/min)

## Observability
- [ ] Error tracking firing on deliberately-triggered test error
- [ ] AI pipeline cost/latency logged per run
- [ ] Cost-per-customer dashboard queryable
- [ ] Alert routing configured (email + Slack)

## Security
- [ ] Password HIBP check enabled
- [ ] All secrets in encrypted env vars, none in source
- [ ] Prompt-injection sanitization tested against known attack strings
- [ ] Resume file MIME + magic-byte validation confirmed
- [ ] ClamAV / hosted AV scan integrated
- [ ] RLS policies audited on every table (spot-check with a cross-org query attempt)
- [ ] Auth rate limits stricter than API (brute-force protection)

## Legal
- [ ] Privacy policy reviewed by counsel
- [ ] Terms of service reviewed by counsel
- [ ] Data Processing Addendum available for enterprise
- [ ] Sub-processor list published (Lovable Cloud, Lovable AI Gateway, Stripe)
