# MVP Launch Checklist

Minimum bar for opening to beta users. Ships after Turn 5.

## Product
- [ ] User can sign up, verify email (optional), and land on onboarding
- [ ] User can paste/upload a JD, see requirements extracted, and confirm
- [ ] User can upload a resume, see a match score with per-requirement evidence
- [ ] User can view all their jobs, candidates, and past evaluations
- [ ] User can invite a teammate and assign a role
- [ ] User can upgrade to a paid plan and see billing status

## Trust
- [ ] Every score has a source-cited evidence breakdown
- [ ] Low-evidence scores are flagged, not presented as false-precision numbers
- [ ] Plain-language summary on every match
- [ ] Bias-mitigation controls documented on `/security`

## Reliability
- [ ] Pipeline failures surface a helpful error, not a generic 500
- [ ] Failed pipeline stages retry (max 3) with backoff
- [ ] Landing page loads under 3s on cold mobile Chrome
- [ ] Auth flows work across email/password + Google OAuth

## Compliance
- [ ] Privacy policy + ToS linked in footer
- [ ] Account deletion + 14-day soft-delete works end-to-end
- [ ] Audit log records candidate view/edit/delete
- [ ] Data retention policy on `/security` matches actual behavior
