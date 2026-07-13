# Decisions Log

Short records of project decisions: what was decided, what else was considered, and why. Newest at the bottom.

## 2026-07-04 — Deploy to VPS in Phase 0, then once per phase

Deploy the empty shell during Phase 0 (as the plan already said) and re-run `deploy.sh` at the end of each phase — not continuously during development. Rationale: surfaces systemd/Caddy/env problems while the app is trivial, keeps the deploy scripts honest, and gives a live URL for real-phone testing; day-to-day dev stays local.

## 2026-07-04 — Hosting: Oracle Cloud (PAYG) instead of Hetzner

- Instance: VM.Standard.A1.Flex, 2 OCPU / 12 GB, Ubuntu 24.04 **arm64**, Phoenix (phx), AD-2.
- Account converted to Pay As You Go: still $0 within Always Free limits, but avoids idle-instance reclamation and capacity errors.
- Public IP is a **Reserved** IP: `161.153.17.241` (swapped from the launch-time ephemeral IP before any DNS existed).
- Alternatives: Hetzner (~€4.5/mo) — boring and reliable, kept as the documented fallback if Oracle account risk ever materializes or real customer money flows.
- Conditions attached to this choice: offsite backups of `pb_data/` (see deferral below) and treating the server as disposable (`deploy/setup.sh` must fully rebuild it).
- Deployment notes: pin the **arm64** PocketBase binary in `setup.sh` (CI uses amd64); Oracle's Ubuntu images ship host-level iptables REJECT rules — `setup.sh` must open 80/443 on the host in addition to the VCN security-list rules.

## 2026-07-04 — Target market: US, not UK

The plan was rewritten for the US: VAT → optional **Sales Tax** toggle (default 0%, default-off; several states tax construction services, so tax fields were renamed, not removed), CIS reverse charge removed, pence → cents, £ → $, sort code → routing number (ACH/Zelle), Stripe fee pass-through 2.9% + 30¢, Stripe Connect country `US`, trader → contractor terminology.

## 2026-07-04 — Check added as a payment method

`check` joins card / bank_transfer / cash everywhere (accept flow, mark-paid, payments rows, invoices). Behaves exactly like bank transfer: instant acceptance, contractor marks paid later. `payment_settings` gains `check_enabled` + optional `check_payable_to` (defaults to company name). No check discount, no check-number tracking in v1.

## 2026-07-04 — Domain: owned umbrella domain `appassembly.net` (supersedes the free-subdomain plan)

First tried `clearcontract.jo3.org`, a free DNSExit subdomain — it got the Resend account flagged for investigation (free subdomains pattern-match spam infrastructure), which settled the debate: bought **appassembly.net** (Cloudflare, ~$12/yr) as an umbrella domain for all personal apps. Each app lives on its own subdomain and sends email from its own sending subdomain, keeping DKIM/DMARC reputation per-app.

- App: `clearcontract.appassembly.net` (A → 161.153.17.241); PocketBase: `pb.clearcontract.appassembly.net` (CNAME).
- Cloudflare records must stay **DNS only (gray cloud)** — the proxy breaks Caddy's cert issuance and buffers PocketBase's SSE realtime.
- Rejected: `deploy-studio.com` (hyphen, jargon); per-app domains (cost per experiment).
- Softened tripwire: move ClearContract to its own domain when paying strangers arrive — before that, snapshot URLs make migration costly, after real traction it's worth it.
- The jo3.org subdomain is retired; nothing references it.

## 2026-07-04 — PocketBase on its own hostname

Browsers talk to PocketBase directly (JS SDK) and Stripe webhooks land on PB hooks, so PB gets `pb.clearcontract.jo3.org` behind Caddy rather than path-routing `/api/*` on the app hostname (which would collide with Next.js's own `/api`). `NEXT_PUBLIC_PB_URL` points there.

## 2026-07-04 — Resend verified on `clearcontract.appassembly.net`; sending goes through PocketBase SMTP

DKIM (`resend._domainkey`), SPF + MX (`send.`) verified and confirmed resolving via public DNS; DMARC (`_dmarc`, `p=none`) still to add. Sending address: `quotes@clearcontract.appassembly.net`. Account was flagged by Resend's fraud screening while on the free subdomain; review form + support email submitted citing the purchased domain — pending. **Implementation note for Phase 4: send via PocketBase's built-in SMTP mailer (smtp.resend.com) rather than Resend's HTTP API** — makes the provider swappable credentials (Brevo/SMTP2GO/SES as fallbacks if the Resend review goes badly), and keeps the `MAILER=console` test strategy intact.

## 2026-07-04 — Backup cron deferred (with tripwire)

Offsite backup of `pb_data/` (PocketBase backup → B2/R2) deferred while all data is test fixtures. **Tripwire: must be in place before the first real quote is sent (Phase 4 milestone).** `setup.sh` carries a commented-out stub so it's a one-line enable. ~1 hour of work.

## 2026-07-05 — Phase 1 scope decisions

- **Open registration** — no invite gate while the product has no strangers; revisit if uninvited signups appear.
- **No email verification requirement until Phase 4** — needs working transactional email (Resend account review still pending), and retrofitting is cheap: flip the collection option + add the verify flow when email exists.
- **Hook creates `business_settings` only** — `payment_settings` (Phase 5) and `notification_settings` (Phase 8) get their collections, hook lines, and a trivial backfill in their own phases; considered creating all three now, rejected as scope creep into phases that may reshape those fields.
- Auth stays client-rendered behind a guard (plan §5.6's recommendation), not cookie-SSR.

## 2026-07-13 — Phase 2 scope decisions

- **Hard delete for customers, no guard yet** — quotes don't exist to orphan. Tripwire: Phase 3 must decide the delete-with-quotes behavior (likely block deletion while quotes reference the customer) before shipping the builder.
- **Profile page stays thin** — contact details + notes + edit/delete only; the quote history section arrives with Phase 3 data. Considered stubbing an empty "Quotes" card, rejected — invented content.
- **Search is server-side** — debounced PB filter (`name ~ q || email ~ q || phone ~ q` via `pb.filter()`), not load-all-and-filter-client-side. Same code size at sole-trader scale, and it's the pattern the quotes list will reuse.
- **`CustomerCombobox` built standalone now** — search/pick/inline-create in `components/customer-combobox.tsx` with Testing Library coverage (no host page exists yet for e2e; the quote builder e2e covers it in Phase 3). Server-side search, base-ui Combobox with client filtering disabled.
