# ClearContract — Project Requirements & Build Plan

**ClearContract** is a quoting and invoicing app for tradespeople, modelled on the Jobnix demo. Create professional quotes in minutes (manually or from templates), send them by email, let customers view/accept/pay a deposit online, convert accepted quotes to invoices, and automate follow-ups.

**Stack:** Next.js (App Router) · PocketBase · Stripe · shadcn/ui · Tailwind CSS

---

## 1. Product Overview

### 1.1 Target user
Independent contractors and small trade businesses (driveways, landscaping, plumbing, etc.) who currently quote via text message or paper and want to look professional, get paid faster, and stop chasing customers manually.

### 1.2 Core value loop
1. Contractor creates a quote (manually or from a saved template).
2. Quote is sent to the customer via email as a branded web link.
3. Customer views it on their phone → status auto-updates to **Viewed**.
4. Customer can **Accept** — paying the deposit by card (Stripe), bank transfer, check, or committing to cash (optionally at a cash discount) — or **Decline** / **Request Changes**.
5. If no response, automated follow-up reminders go out after N days.
6. Accepted quote converts to an invoice with one click; remaining balance is collected.
7. Dashboard shows totals, pending value, acceptance rate, and revenue.

### 1.3 Feature inventory (observed in the demo)

**Dashboard**
- Time-based greeting ("Let's get after it James" — configurable in settings)
- KPI cards: Total Quotes, Pending (with count viewed), Accepted %, Revenue
- Quick actions: Create New Quote, Add Customer
- Recent Quotes table: quote #, customer, title, amount, status badge (Accepted / Sent / Viewed), date — rows link to quote detail

**Quote builder** (`New Quote`)
- Two entry modes: blank or **Start from Template**. *(AI Generate Quote and Voice AI Generate Quote from the original app are deferred — see Out of Scope.)*
- Customer picker: searchable combobox with recent customers + inline "Add new customer" (name, email, phone, address)
- Quote details: title, description (multiline), valid-until date (with quick presets: Today / +7 / +14 / +30 days), optional estimated start date
- Line items: description, type toggle **Fixed** (qty × unit price) or **Hourly** (hours × rate), per-line total, "show breakdown" checkbox (controls whether customer sees qty/price detail), add/remove items, running subtotal
- Stock images strip: business's default photos, tap to toggle inclusion on the quote; plus ad-hoc **Add photos** upload
- Summary: subtotal → **Add Sales Tax** toggle (editable rate, defaults from settings) → **Request deposit** toggle (Fixed $ or Percent %, shows computed deposit and remaining) → **Cash discount** toggle (Fixed $ or Percent %, defaults from settings; shows the discounted "pay cash" total the customer will see) → Quote Total
- **Automated Follow-ups** panel: enable toggle, "send reminder after" (e.g. 7 days), delivered via email *(the original app also offers SMS — deferred)*
- Send options: via Email
- Header actions: back, **Save Draft**, **Save as Template**, **Preview** (desktop/mobile toggle), **Send Quote** (confirmation modal shows active payment methods before sending)

**Customer-facing quote page** (public link, mobile-first)
- Branded header: logo, business name, quote badge, valid-until
- Title, customer contact block, photos gallery, description as bullet list
- Line items (respecting per-line breakdown visibility), subtotal, sales tax, total, **Deposit Required**
- Accept options (only enabled methods shown): **Accept & Pay $X Deposit** (green, Stripe Checkout), **Accept — pay by bank transfer**, **Accept — pay by check**, **Accept — pay cash** (shows discounted total when a cash discount is set, e.g. "Pay cash and save $450 — total $10,350"); plus **Decline Quote** and **Request Changes**
- Bank Transfer details block (if enabled): name, routing number, account number (covers ACH or Zelle); check note (if enabled): "Make checks payable to {company name}"; cash note (if enabled): "Cash accepted on the day"
- Contact footer with contractor details

**Quote detail page** (internal, e.g. `TF-0167`)
- Status banner (Sent on date / Accepted on date)
- Line items table, summary with sales tax, total, deposit, remaining balance
- Customer card with link to profile; Details card (quote number, created, valid until, sent, tax rate)
- Description, photos, follow-ups status card (enabled, schedule, delivery channels)
- Actions: **Send as Invoice**, **Add Extras** (modal to append extra line items post-acceptance, fixed/hourly, recalculates totals), **Edit**, **Duplicate**, **PDF**, **Save as Template**

**Invoices**
- Generated from a quote ("Send as Invoice"); invoice preview mirrors quote layout with **Billed to**, Invoice Total, Deposit Required/Paid, **Balance Due**, payment due date, **Pay** button (activates once sent)
- Invoice list page

**Customers**
- List, profile page (contact details, quote/invoice history), add/edit

**Templates**
- Saved quote structures with name, base title, line items, validity period, tax setting, total preview; edit/delete; used from quote builder

**Settings**
- **Account:** profile (name, email, phone), business details (company name, address, logo), security (change password, sign out), danger zone (delete account)
- **Billing:** Stripe Connect status (connect/disconnect, card payments enabled), option to pass Stripe's processing fee (2.9% + 30¢) to the customer, Bank Transfer details (name, routing number, account number, show-on-quotes/invoices toggles), Check payments (accept-check toggle, payable-to name defaults to company name), Cash payments (accept-cash toggle + default cash discount, fixed $ or %), Subscription card (Professional Plan $29.99/mo, trial, feature list)
- **Quoting:** brand colour picker, Terms & Conditions (upload PDF **or** paste text; PDF shown as downloadable link, text inlined on quotes), Stock Images manager (default photos with captions, reorder, delete, upload, reset to default), Quote Templates manager
- **Notifications:** Email Follow-ups toggle, editable email template with placeholders (`{{customerName}}`, `{{businessName}}`, `{{quoteTotal}}`, `{{quoteUrl}}`), payment email alert toggle, Preferences (time-based greeting toggle). *(SMS follow-ups/alerts deferred — Twilio costs extra.)*
- **Help & Support:** restartable product tour, contact link. *(The original app's Integrations tab with Xero/QuickBooks accounting sync is deferred — see Out of Scope.)*

---

## 2. Architecture

### 2.1 High-level

```
┌────────────────────────────────────────────────────────────┐
│  Next.js (App Router)                                      │
│  ├─ (app)/…        Authenticated dashboard UI (shadcn/ui)  │
│  ├─ /q/[token]     Public quote page (SSR, no auth)        │
│  ├─ /i/[token]     Public invoice page (SSR, no auth)      │
│  └─ /api/…         Thin route handlers where needed        │
│         │ PocketBase JS SDK (REST + realtime)              │
└─────────┼──────────────────────────────────────────────────┘
          ▼
┌────────────────────────────────────────────────────────────┐
│  PocketBase (single binary + SQLite)                       │
│  ├─ Collections + API rules (authorization)                │
│  ├─ Auth (email/password), file storage (logos, photos,   │
│  │   T&C PDFs)                                             │
│  └─ pb_hooks (JS) — custom server logic:                   │
│      • POST /send-quote  (email dispatch, status)          │
│      • POST /stripe/webhook  (payment events)              │
│      • Public quote/invoice fetch + action endpoints       │
│      • Cron: follow-up reminders, expiry marking           │
│      • PDF generation                                      │
└─────────┬──────────────────────────────────────────────────┘
          ▼
   Stripe (Connect + Checkout + Billing) · Resend (email)
```

### 2.2 Key decisions and rationale

**PocketBase does the heavy lifting; Next.js stays mostly a client.** PocketBase gives you auth, CRUD with per-collection authorization rules, file storage, and realtime subscriptions out of the box. Business logic that must not run in the browser (sending quotes, Stripe webhooks, follow-up cron, computing server-trusted totals) lives in `pb_hooks/*.pb.js` — PocketBase's embedded JS hooks (goja runtime). This keeps you to two deployable pieces: the Next.js app and the PocketBase binary.

**Public quote pages are token-based, not auth-based.** Each quote gets a long random `public_token`. The public page at `/q/[token]` is server-rendered by Next.js, which fetches the quote through a custom PocketBase endpoint (`GET /api/clearcontract/public/quote/{token}`) using a hook — never by exposing the quotes collection publicly. The hook also records the first "viewed" event and flips status. Customer actions (accept, decline, request changes) go through similar token-scoped hook endpoints.

**Two separate Stripe integrations:**
1. **Stripe Connect (Express accounts)** — the contractor connects their own Stripe account; customer deposit/balance payments are Checkout Sessions created **on the connected account** (destination or direct charges — use *direct charges on the connected account* so the contractor is merchant of record and their fee pass-through setting maps cleanly to an application fee of 0 or a surcharge line).
2. **Stripe Billing** — the platform subscription ($29.99/mo Professional Plan, 30-day trial). Since you're building this for yourself, mark this **optional / Phase 10** — build the settings UI stub and skip real billing until you have users.

**Money is always integers (cents).** All amounts stored as integer cents; format at the edges. Sales tax, deposits, and totals are recomputed server-side in hooks before send/payment — never trust client-computed totals for anything Stripe touches.

**Line items are JSON fields on the quote record, not a separate collection.** A quote is edited and saved atomically; separate line-item records add join complexity and partial-save states for no benefit at this scale. Same for `extras` and `selected stock images`. (Templates copy the same JSON shape.)

**Quote numbering** (`TF-0167`) is a per-user sequential counter stored on the user's settings record, incremented in a hook on first send (drafts can live without a number, or assign at creation — assign at creation is simpler and matches the demo).

**One responsive web app — no native builds, no separate mobile site.** Both audiences are on phones: the customer opens the quote link on a phone (public pages are mobile-first), and the contractor is often quoting from a van or on-site (the dashboard and quote builder must be fully usable at a ~360px viewport, not just "not broken"). Every screen ships responsive in the phase that builds it — mobile is a per-phase acceptance criterion (§5.7, §7.5), never a later polish pass. Native apps remain out of scope (§9); the responsive web app *is* the mobile app.

**Snapshotting.** When a quote is sent, freeze everything the customer sees: customer name/address, business details, T&Cs reference, brand colour, tax rate, line items. Store a `snapshot` JSON on the quote so later settings edits don't mutate already-sent documents. Invoices snapshot from the quote at conversion time.

### 2.3 Repo & deployment layout

```
clearcontract/
├─ web/                      # Next.js app
│  ├─ app/
│  │  ├─ (auth)/login, register
│  │  ├─ (app)/dashboard, quotes, quotes/new, quotes/[id],
│  │  │        invoices, invoices/[id], customers,
│  │  │        customers/[id], templates, settings/*
│  │  ├─ q/[token]/          # public quote
│  │  ├─ i/[token]/          # public invoice
│  │  └─ api/                # only if needed
│  ├─ components/ (ui/ = shadcn, feature components)
│  ├─ lib/ (pb.ts client, money.ts, validators/ zod schemas)
│  └─ …
├─ pb/                       # PocketBase
│  ├─ pb_hooks/
│  │  ├─ quotes.pb.js        # send, numbering, totals validation
│  │  ├─ public.pb.js        # public token endpoints + actions
│  │  ├─ stripe.pb.js        # connect onboarding, checkout, webhook
│  │  ├─ followups.pb.js     # cron jobs
│  │  └─ pdf.pb.js           # PDF endpoint
│  ├─ pb_migrations/         # schema as code
│  └─ pocketbase             # binary
└─ deploy/                   # server config as code (no Docker)
   ├─ setup.sh               # one-time provisioning: node, caddy, pinned
   │                         #   PocketBase download, systemd units, backup cron
   ├─ deploy.sh              # repeat deploys: git pull, npm ci + build,
   │                         #   restart services (PB auto-applies pb_migrations/)
   ├─ pocketbase.service     # systemd unit
   ├─ clearcontract-web.service  # systemd unit
   ├─ Caddyfile              # HTTPS reverse proxy
   └─ deploy.md              # node/PB versions, restore procedure
```

**Deployment: a single small VPS (e.g. Hetzner) running both PocketBase and Next.js natively — no Docker.** PocketBase is a static binary and Next.js runs under node; both are managed by systemd, with Caddy in front for HTTPS (required for Stripe webhooks and public quote links). The `deploy/` directory is the reproducibility story a compose file would have provided: `setup.sh` rebuilds a fresh server, `deploy.sh` ships a release. Keep the scripts dumb (`set -euo pipefail`, a straight transcription of the manual steps) — no rollbacks or health checks; if push-to-deploy is ever wanted, a GitHub Action can SSH in and run the same `deploy.sh`. Local dev is docker-free too: run the PocketBase binary + `next dev` directly (integration tests and CI already use the raw pinned binary, section 7.2/7.4). Nightly backup of `pb_data/` (PocketBase has built-in backups — enable them).

---

## 3. Data Model (PocketBase collections)

Conventions: all money fields are **integer cents**; `user` relations point to the built-in `users` auth collection; every collection has PocketBase's automatic `id`, `created`, `updated`. API rules shown as `list/view/create/update/delete`.

### 3.1 `users` (auth collection — extended)
| Field | Type | Notes |
|---|---|---|
| name | text | Contractor's name (greeting uses first name) |
| phone | text | |
| avatar | file | optional |

Rules: standard PocketBase auth; users can only view/update themselves.

### 3.2 `business_settings` (1:1 with user)
| Field | Type | Notes |
|---|---|---|
| user | relation(users), unique | owner |
| company_name | text | e.g. "James Driveways" |
| business_address | text | |
| logo | file (image) | shown on quotes/invoices |
| brand_color | text | hex, default `#4881A0`-ish |
| quote_prefix | text | default `TF` (or user initials) |
| next_quote_number | number | sequential counter |
| next_invoice_number | number | sequential counter |
| default_tax_rate | number | percent, decimals allowed (e.g. 8.25); default 0 |
| collects_sales_tax | bool | controls whether the sales-tax toggle defaults on |
| terms_pdf | file (pdf) | optional |
| terms_text | text (long) | optional; if both, PDF wins as link + text inlined |
| greeting_enabled | bool | time-based greeting on dashboard |
| currency | text | default `USD` |

Rules: `user = @request.auth.id` on all five.

### 3.3 `payment_settings` (1:1 with user)
| Field | Type | Notes |
|---|---|---|
| user | relation, unique | |
| stripe_account_id | text | Connect account (`acct_…`) |
| stripe_charges_enabled | bool | mirrored from Stripe account webhook |
| pass_fees_to_customer | bool | adds 2.9% + 30¢ surcharge to deposit checkout |
| bank_transfer_enabled | bool | |
| check_enabled | bool | show "pay by check" accept option |
| check_payable_to | text | optional; defaults to company name when blank |
| cash_enabled | bool | show "pay cash" accept option |
| cash_discount_type | select: fixed / percent | default for new quotes |
| cash_discount_value | number | cents if fixed; percent if percent |
| bank_name | text | account holder name |
| bank_routing_number | text | |
| bank_account_number | text | |
| show_bank_on_quotes | bool | |
| show_bank_on_invoices | bool | |
| subscription_status | select: none/trialing/active/past_due/canceled | Phase 10 |
| stripe_customer_id | text | for platform subscription (Phase 10) |

Rules: owner-only, but **never expose `stripe_account_id` through public endpoints** — public hooks return only derived flags (`can_pay_online: true`).

### 3.4 `notification_settings` (1:1 with user)
| Field | Type | Notes |
|---|---|---|
| user | relation, unique | |
| email_followups_enabled | bool | global default |
| sms_followups_enabled | bool | reserved for later — always false in v1 |
| default_followup_days | number | default 7 |
| email_template | text | with `{{placeholders}}` |
| sms_template | text | reserved for later |
| payment_email_alerts | bool | notify contractor on payment |
| payment_sms_alerts | bool | reserved for later |

### 3.5 `customers`
| Field | Type | Notes |
|---|---|---|
| user | relation | owner |
| name | text, required | |
| email | email | |
| phone | text | |
| address | text | |
| notes | text | |

Rules: owner-only on all. Index on `(user, name)`.

### 3.6 `quotes`
| Field | Type | Notes |
|---|---|---|
| user | relation | owner |
| customer | relation(customers) | |
| quote_number | text | e.g. `TF-0167`, assigned at creation |
| title | text | e.g. "Driveway Installation" |
| description | text (long) | rendered as bullets if newline-separated |
| status | select: draft / sent / viewed / accepted / declined / changes_requested / invoiced / expired | |
| valid_until | date | |
| estimated_start | date | optional |
| line_items | json | `[{id, description, type: "fixed"|"hourly", qty, unit_price, hours, rate, show_breakdown, total}]` |
| extras | json | same item shape; appended post-send via Add Extras |
| selected_stock_images | json | array of stock_image ids included |
| photos | file (multiple images) | ad-hoc uploads for this quote |
| tax_enabled | bool | |
| tax_rate | number | percent, decimals allowed (e.g. 8.25) |
| deposit_enabled | bool | |
| deposit_type | select: fixed / percent | |
| deposit_value | number | cents if fixed; percent×1 if percent |
| subtotal | number (cents) | server-recomputed |
| tax_amount | number (cents) | |
| total | number (cents) | |
| deposit_amount | number (cents) | |
| check_enabled | bool | copied from settings, per-quote override |
| cash_enabled | bool | copied from settings, per-quote override |
| cash_discount_type | select: fixed / percent | |
| cash_discount_value | number | |
| cash_discount_amount | number (cents) | server-computed preview |
| accepted_payment_method | select: card / bank_transfer / check / cash | set at accept time |
| accepted_total | number (cents) | total after cash discount if cash chosen; else = total |
| followup_enabled | bool | |
| followup_days | number | |
| followup_channels | json | v1 always `["email"]`; shape kept for future SMS |
| followup_sent_at | date | set by cron; null = not yet sent |
| send_via | json | v1 always `["email"]`; shape kept for future SMS |
| public_token | text, unique | 32+ chars, generated on create |
| sent_at | date | |
| viewed_at | date | first view |
| responded_at | date | accept/decline/changes timestamp |
| customer_message | text | message left with Request Changes |
| snapshot | json | frozen business/customer/T&C details at send time |
| template_source | relation(templates) | optional provenance |

Rules: owner-only for all CRUD. `update` rule additionally blocks editing money fields once `status != "draft"` except via hooks (enforce in an `onRecordUpdateRequest` hook rather than rules — rules can't easily diff fields).

### 3.7 `invoices`
| Field | Type | Notes |
|---|---|---|
| user, customer | relations | |
| quote | relation(quotes) | source quote |
| invoice_number | text | `INV-0042` |
| status | select: draft / sent / viewed / partially_paid / paid / overdue / void | |
| due_date | date | |
| line_items, extras | json | copied from quote at conversion |
| tax_enabled, tax_rate | as quote | |
| subtotal, tax_amount, total | number (cents) | |
| deposit_paid | number (cents) | from quote's payments |
| cash_discount_amount | number (cents) | carried from quote if accepted as cash |
| payment_method | select: card / bank_transfer / check / cash | from quote's acceptance |
| balance_due | number (cents) | total − payments received |
| public_token | text, unique | |
| sent_at, viewed_at, paid_at | date | |
| snapshot | json | |

### 3.8 `payments`
| Field | Type | Notes |
|---|---|---|
| user | relation | |
| quote | relation, optional | |
| invoice | relation, optional | |
| kind | select: deposit / balance | |
| method | select: card / bank_transfer / check / cash | card rows come from Stripe webhook; others from mark-paid |
| amount | number (cents) | |
| fee_surcharge | number (cents) | if fees passed to customer |
| stripe_checkout_session | text | |
| stripe_payment_intent | text | |
| status | select: pending / succeeded / failed / refunded | |
| paid_at | date | |

Created/updated **only by hooks** (webhook + "mark as paid" endpoint). Rules: list/view owner-only; create/update/delete `null` (hook-only via superuser context).

### 3.9 `templates`
| Field | Type | Notes |
|---|---|---|
| user | relation | |
| name | text | e.g. "Driveway Install Overlay" |
| title, description | text | prefill |
| line_items | json | |
| validity_days | number | e.g. 14 |
| tax_enabled, tax_rate | | |
| deposit_enabled, deposit_type, deposit_value | | |
| total_preview | number (cents) | denormalised for the settings list |

### 3.10 `stock_images`
| Field | Type | Notes |
|---|---|---|
| user | relation | |
| image | file (image) | |
| caption | text | e.g. "Work" |
| sort_order | number | |
| is_default_selected | bool | pre-ticked on new quotes |

### 3.11 `quote_events` (activity log)
| Field | Type | Notes |
|---|---|---|
| user | relation | |
| quote / invoice | relation, optional | |
| type | select: created / sent / viewed / accepted / declined / changes_requested / followup_sent / payment_received / invoiced / expired | |
| meta | json | ip/user-agent hash for views, message text, amounts |

Hook-created; owner read-only. Powers the detail-page timeline and keeps `viewed` idempotent (only first view flips status).

### 3.12 Status machines

```
QUOTE:   draft ─send→ sent ─first public view→ viewed
         {sent|viewed} ─accept→ accepted ─convert→ invoiced
         {sent|viewed} ─decline→ declined
         {sent|viewed} ─request changes→ changes_requested ─edit+resend→ sent
         {sent|viewed} ─valid_until passes→ expired (cron)

INVOICE: draft ─send→ sent ─view→ viewed
         deposit already paid at creation → partially_paid
         payment covers balance → paid          due_date passes → overdue
```

---

## 4. API Surface (custom PocketBase hooks)

Everything else is plain PocketBase CRUD through the SDK. Custom routes (all under `/api/clearcontract/…`):

**Authenticated (require valid PB auth token, verify record ownership):**
- `POST /quotes/{id}/send` — recompute totals server-side, build snapshot, assign sent_at, dispatch email (Resend) with public URL, set status `sent`, log event. Re-send allowed from `changes_requested`.
- `POST /quotes/{id}/duplicate` — clone as new draft with next number.
- `POST /quotes/{id}/extras` — validate + append extras, recompute totals (allowed post-send).
- `POST /quotes/{id}/convert-to-invoice` — create invoice, copy items + deposit paid, status `invoiced`.
- `POST /invoices/{id}/send` — as quote send.
- `POST /quotes/{id}/mark-paid` and `POST /invoices/{id}/mark-paid` — body: `{kind, method: "bank_transfer" | "check" | "cash", amount}`; records a `payments` row and updates balance/status.
- `GET  /quotes/{id}/pdf` and `/invoices/{id}/pdf` — render PDF (see 5.5).
- `POST /stripe/connect/onboard` — create/refresh Connect Express account link, return onboarding URL.
- `POST /stripe/connect/dashboard` — Express dashboard login link.

**Public (token-scoped, rate-limited, no auth):**
- `GET  /public/quote/{token}` — sanitized quote payload (snapshot data only; no Stripe ids, no contractor-private fields); side-effect: first call from a non-owner logs `viewed`.
- `POST /public/quote/{token}/accept` — body: `{method: "card" | "bank_transfer" | "check" | "cash"}` (only server-enabled methods allowed). `card`: returns a Checkout Session URL; acceptance recorded on `checkout.session.completed`. `bank_transfer` / `check` / `cash`: quote marked `accepted` immediately with `accepted_payment_method` set; for cash, the discount is applied server-side and `accepted_total` locked in; contractor notified, then marks money received via mark-paid.
- `POST /public/quote/{token}/decline`
- `POST /public/quote/{token}/request-changes` — body: `{message}`
- `GET  /public/invoice/{token}` / `POST /public/invoice/{token}/pay`
- `POST /stripe/webhook` — signature-verified; handles `checkout.session.completed`, `account.updated`, (Phase 10: subscription events). Idempotent by event id.

**Cron (pb_hooks `cronAdd`):**
- Every 15 min: follow-ups — quotes where `status IN (sent, viewed)`, `followup_enabled`, `followup_sent_at IS NULL`, `sent_at <= now − followup_days` → send templated follow-up email, set `followup_sent_at`, log event.
- Daily: mark `expired` quotes past `valid_until`; mark invoices `overdue` past `due_date`.

---

## 5. Key Implementation Notes

### 5.1 Money & totals
- Single `lib/money.ts`: `cents ↔ display`, `lineTotal(item)`, `computeQuoteTotals(quote)` returning `{subtotal, taxAmount, total, depositAmount, remaining}`. Share the exact same logic in a hook-side copy (or duplicate carefully with tests) — the hook's result is authoritative and overwrites client values on save/send.
- Fee pass-through: `surcharge = ceil(deposit × 0.029) + 30`; add as a separate Checkout line item labelled "Card processing fee" so the contractor nets the full deposit.
- Cash discount: computed on the pre-tax subtotal (`fixed` cents or `percent` of subtotal), then sales tax applied to the discounted amount — tax is due on what's actually charged. Deposit recomputes against the discounted total when type is percent; fixed deposits are left as-is but capped at the discounted total. `accepted_total` is frozen at accept time so later settings edits can't change an agreed price. (Cash-discounting is fine as long as the income is invoiced and reported as normal — the invoice shows the discount as a line, keeping records clean.)

### 5.2 Public quote page
- `app/q/[token]/page.tsx`, server component, `fetch(PB_URL + /public/quote/{token}, { cache: 'no-store' })`.
- Render from `snapshot`, not live settings. Respect `show_breakdown` per line (hide qty/price, show only description + total when off).
- Accept flow: customer picks a payment method (only enabled ones render). Card → POST accept `{method:"card"}` → redirect to Stripe Checkout → back to `/q/[token]?paid=1` (final state from webhook). Bank transfer / check / cash → POST accept → instant confirmation screen with next steps (bank details, "make checks payable to {name}", or "pay cash on the day — total $X after discount").
- Give it real mobile care — this page *is* the product to the end customer. Brand colour applied via CSS variable from snapshot.

### 5.3 Stripe Connect flow
1. Settings → Billing → "Connect Stripe" → hook creates Express account (`US`, `card_payments` + `transfers`), returns Account Link URL.
2. `account.updated` webhook mirrors `charges_enabled` into `payment_settings`.
3. Deposit checkout: create Session **on the connected account** (`Stripe-Account` header), `payment_intent_data.description = quote_number`, metadata `{quote_id, kind: "deposit"}`.
4. Webhook `checkout.session.completed` → create `payments` row, set quote `accepted` (+ `responded_at`), notify contractor per notification settings, log event.
5. Use Stripe CLI (`stripe listen --forward-to`) in dev; store `whsec_…` per environment.

### 5.4 Email
- Resend (simple API, good deliverability) with a React Email or plain HTML template: logo, greeting, total, big "View Quote" button → public URL. Set up a sending domain (SPF/DKIM) early so quotes don't land in spam.
- Placeholder resolver shared by follow-ups and initial send: `{{customerName}} {{businessName}} {{quoteTotal}} {{quoteUrl}}`.
- When SMS is added later (Twilio), it plugs into the same dispatch + placeholder layer; the channel fields in the schema already accommodate it.

### 5.5 PDF generation
Options, simplest first: (a) print stylesheet on the public page + browser "Save as PDF" (zero code), (b) a small Node sidecar with Playwright rendering `/q/[token]?pdf=1`, (c) pdf-lib in hooks (painful for rich layout). Recommend (a) for MVP, (b) when you want the PDF button to hand back a file.

### 5.6 Auth & security checklist
- PocketBase email/password auth; SDK auth store in cookies for SSR (`pb.authStore.loadFromCookie` pattern) or keep the dashboard fully client-rendered behind a guard — simpler and fine for a solo tool.
- Every collection rule scoped `user = @request.auth.id`; verify again in hooks.
- Public endpoints: rate-limit by IP (PocketBase has built-in rate limit settings), constant-time token compare, 404 for unknown tokens.
- Sanitize public payload explicitly (allow-list fields) — never `JSON.stringify(record)`.
- File uploads: restrict MIME + size (logo/photos ≤ 5MB images, T&C ≤ 10MB pdf); PocketBase thumbs (`?thumb=600x0`) for gallery performance.
- Webhook endpoint verifies Stripe signature; all webhook handlers idempotent.

### 5.7 UI build notes (shadcn/ui)
- Components you'll lean on: `Card`, `Table`, `Badge` (status colours: accepted=green, sent=blue, viewed=amber, declined=red, draft=gray), `Combobox` (customer picker), `Dialog` (add customer, add extras, send confirm), `Calendar`+`Popover` (date pickers with quick-preset footer), `Tabs`/`ToggleGroup` (Fixed/Hourly, Fixed $/Percent %, Desktop/Mobile preview), `Switch`, `Sheet` (mobile nav), `Sonner` toasts, `Skeleton` loaders.
- Dark sidebar layout: navy sidebar (Dashboard, Quotes, Invoices, Customers, Templates, Settings) + light content area; orange primary accent for CTAs (Send Quote), blue secondary.
- **Responsive rules (apply to every screen as it's built):** sidebar collapses to a `Sheet` drawer with a hamburger below `lg`; data tables (recent quotes, lists) collapse to stacked card rows below `md` (or horizontal-scroll within the card as a stopgap — never page-level horizontal scroll); quote builder goes single-column on mobile with a sticky bottom bar for totals + Save/Send; dialogs full-screen on small viewports; touch targets ≥ 44px; date pickers and comboboxes verified usable with touch keyboards. Sanity-check each new screen at 360px width before calling it done.
- Quote builder is one long form — use `react-hook-form` + `zod` with `useFieldArray` for line items; autosave draft (debounced PATCH) so nothing is lost.
- Preview: render the same `QuoteView` component used by the public page inside a `Dialog` with desktop/mobile width toggle — one source of truth for the customer-facing layout.

---

## 6. Build Plan (phased)

Each phase ends with something usable. Rough solo-effort estimates assume part-time evenings/weekends. Every phase includes its own tests (the relevant rows of section 7) — estimates below include writing them; budget roughly a quarter of each phase for tests and you won't pay it back with interest in debugging later. Every phase also ships its screens responsive per §5.7's responsive rules — mobile support is built in as you go, never retrofitted as a later phase.

**Phase 0 — Foundations (2–3 days)**
Repo scaffold, Next.js + Tailwind + shadcn init, PocketBase running locally with migrations checked in (binary run directly — no Docker), `.env` handling, `lib/pb.ts`, money utils + unit tests. Testing scaffolding from day one: Vitest (+ fast-check, Testing Library), the PocketBase test-instance bootstrap for integration tests, Playwright with one smoke spec, and the GitHub Actions pipeline (section 7.4). Deploy the empty shell to the VPS once via `deploy/setup.sh` + `deploy/deploy.sh` (section 2.3) so CI/hosting problems surface early.

**Phase 1 — Auth & Settings core (2–3 days)**
Register/login/logout, route guard, settings layout with Account tab (profile, business details, logo upload, security). Create `business_settings` on first login (hook `onRecordAfterCreateSuccess` on users).

**Phase 2 — Customers (1–2 days)**
CRUD list + profile page, add/edit dialog, search. The customer combobox component you'll reuse in the builder.

**Phase 3 — Quote builder & quote CRUD (5–7 days) — the heart**
New Quote form: customer picker with inline create, details, line items (fixed/hourly, breakdown toggle), date pickers with presets, sales tax, deposit fixed/percent, live totals, photos upload, save draft + autosave, quotes list page, quote detail page (read-only view, edit, duplicate, delete). No sending yet.

**Phase 4 — Public quote page & sending (3–4 days)**
Public token endpoint + sanitized payload + snapshot on send, `/q/[token]` page (mobile-first, brand colour, breakdown visibility), send flow with confirm modal, Resend email, viewed tracking, decline / request-changes actions, status badges + events timeline. **Milestone: you can quote a real job end-to-end (minus payment).**

**Phase 5 — Stripe Connect payments (3–4 days)**
Billing settings tab (connect flow, bank transfer details, check + cash toggles + default cash discount, fee pass-through), accept flow with method selection (card via Checkout, bank transfer, check, cash with server-applied discount), webhook processing, payments records with method, mark-as-paid for bank transfer/check/cash, remaining-balance display, contractor payment notifications.

**Phase 6 — Invoices (3–4 days)**
Convert-to-invoice, invoice numbering, invoice list/detail, public invoice page with Pay Balance, mark-as-paid for bank transfer/check/cash, overdue cron.

**Phase 7 — Templates & stock images (2–3 days)**
Save-as-template (from builder and detail page), template manager in settings, Start-from-Template in builder; stock images manager (upload, caption, order, defaults) + selection strip in builder; Add Extras modal on accepted quotes.

**Phase 8 — Follow-ups & notifications (1–2 days)**
Notification settings tab (email follow-up toggle, editable email template with placeholders, payment alert toggle), follow-up cron, quote expiry cron, follow-up status card on quote detail.

**Phase 9 — Dashboard & polish (2–3 days)**
KPI queries (total, pending value, acceptance %, revenue from payments), recent quotes, quick actions, time-based greeting, empty states, PDF (print stylesheet), brand colour + T&C settings (Quoting tab), product tour (driver.js) — optional.

**Phase 10 — Platform subscription (optional, 2–3 days)**
Stripe Billing: $29.99/mo product, 30-day trial, customer portal, gate app on `subscription_status`. Skip while it's just you.

**Total to a genuinely usable product (through Phase 8): ~4–6 weeks part-time.**

---

## 7. Testing Strategy

Three layers, set up in Phase 0 and grown with every phase. The pyramid: many fast unit tests on the money/state logic, a focused set of integration tests against a real PocketBase instance for hooks and security rules, and a handful of Playwright end-to-end journeys for the flows that make or lose you money.

### 7.1 Unit tests — Vitest

**Where:** `web/` (and shared logic used by hooks). Run with `vitest`, watch mode in dev, `--coverage` in CI (v8 provider).

**Structure tip that makes everything testable:** keep business logic out of components and out of `pb_hooks` files. Pure functions live in a shared spot (`web/lib/` plus a `shared/` folder the hooks copy or import at build time): `money.ts` (`computeQuoteTotals`, `cashDiscount`, `feeSurcharge`), `placeholders.ts` (template resolver), `status.ts` (allowed transitions), `validators/` (zod schemas). Hooks and components then become thin shells around tested functions.

**What to cover:**
- `computeQuoteTotals` — property-based tests (fast-check) with random line-item mixes: totals always ≥ 0, subtotal = Σ line totals, sales-tax rounding to the cent, percent deposit ≤ total, cash discount + tax interaction, fixed deposit capped at discounted total.
- Status machine — every allowed and every forbidden transition as a table test.
- Placeholder resolver — all placeholders, missing values, no template injection (`{{constructor}}` etc. resolves to empty, not code).
- Zod schemas — reject negative amounts, absurd tax rates, empty line items on send.
- Component tests (React Testing Library, only where logic lives in the component): line-item row fixed↔hourly switching recalculates, deposit fixed/percent toggle, summary math display.

### 7.2 Integration tests — Vitest + real PocketBase

**Approach:** a global setup script downloads/boots the actual PocketBase binary with a throwaway `pb_data` dir, applies `pb_migrations/`, loads `pb_hooks/`, and creates a superuser + seed fixtures via the admin API. Tests hit real HTTP (`fetch`) against `127.0.0.1:8090`. Teardown deletes the data dir. This tests the same artifact you deploy — rules, hooks, and cron logic included — with no mocking of PocketBase itself.

**What to cover:**
- **Authorization rules:** user A cannot list/view/update user B's customers, quotes, invoices, payments; unauthenticated CRUD is rejected on every collection.
- **Custom endpoints:** send-quote recomputes totals (client sends tampered totals → server values win), builds snapshot, flips status; duplicate; add-extras post-send; convert-to-invoice copies items + deposit; mark-paid creates a payments row and updates balance.
- **Public endpoints:** valid token returns sanitized payload (assert the *absence* of `stripe_account_id`, tokens of other records, bank details when toggled off); wrong token → 404; first view flips `viewed` once (idempotent); accept with a disabled method → 4xx; accept `cash` locks `accepted_total`; rate limit → 429.
- **Stripe:** run against Stripe test mode. Webhook handler tested by POSTing recorded fixture events (checkout.session.completed, account.updated) signed with the test `whsec` — assert payment row created exactly once even when the same event is delivered twice.
- **Email:** stub the Resend call behind a `MAILER=console|resend` env switch; integration tests assert the console/capture output contains the public URL and resolved placeholders.
- **Cron:** expose the follow-up/expiry job bodies as callable functions (the cron just invokes them) so tests can run them directly against seeded quotes with backdated `sent_at`.

### 7.3 End-to-end tests — Playwright

**Setup:** `playwright.config.ts` with two `webServer` entries (PocketBase test instance + `next dev/start`); seeded test user via global setup; trace + video on first retry; runs headless in CI, Chromium primary with a mobile (iPhone-viewport) project. The mobile project runs the public quote page specs (customers open quotes on phones) **plus the quote-builder journey (spec 2) and dashboard/list navigation** — the contractor quotes from a phone on-site, so the internal app gets mobile coverage too, not just the public pages.

**The journeys (keep it to ~8–10 specs):**
1. Register → onboard business settings → logout → login.
2. Create customer → build a quote (fixed + hourly items, sales tax, percent deposit, cash discount) → totals shown match expected → save draft → autosave survives reload.
3. Send quote (email captured via console mailer) → dashboard shows **Sent**.
4. Open public link in a fresh browser context (not the owner) → status flips to **Viewed** → line-item breakdown visibility respected.
5. Public accept via **card**: Stripe test Checkout with `4242 4242 4242 4242` → redirected back → quote **Accepted**, payment row visible, contractor dashboard revenue updates. (Automating real test-mode Checkout is reliable; keep one spec that does it and stub payment in others.)
6. Public accept via **cash**: discounted total displayed and locked → contractor marks cash received → balance updates. (Check accept shares this path — one assertion that the check option renders and records `accepted_payment_method = check` is enough.)
7. Decline and request-changes paths → statuses + customer message recorded → edit + resend.
8. Convert accepted quote → invoice → public invoice page shows balance due → mark paid → **Paid**.
9. Template round-trip: save-as-template → new quote from template → values prefilled.
10. Settings: upload logo + set brand colour → public page reflects both (snapshot: old sent quote unchanged).

### 7.4 CI pipeline (GitHub Actions)

On every push/PR: lint + typecheck → unit tests with coverage gate (~80% on `lib/`/`shared/`, don't chase UI coverage) → integration tests (job downloads the pinned PocketBase version, caches it) → Playwright (build Next.js, boot both servers, run specs; upload trace/videos on failure). Keep the whole pipeline under ~10 minutes or you'll stop running it.

### 7.5 Acceptance criteria per milestone (spot checks)

- **Totals:** fixed + hourly mix, sales tax on/off, percent + fixed deposits — hook-computed totals match UI to the cent; property-test `computeQuoteTotals` with random items.
- **State machine:** cannot send without customer email/phone matching chosen channels; cannot edit money fields after send except Add Extras; viewed only fires once and not for the owner; expired quotes can't be accepted.
- **Public security:** wrong token → 404; payload contains no `stripe_account_id`, bank numbers only when `show_bank_on_quotes`; rate limit returns 429.
- **Payments:** Stripe test cards succeed/fail paths; duplicate webhook delivery creates one payment row; fee pass-through nets contractor exactly the deposit; accept with a disabled method is rejected server-side; cash discount math (fixed + percent, with sales tax, with percent and fixed deposits) locks `accepted_total` correctly and later settings changes don't alter it.
- **Follow-ups:** cron sends once, respects channel toggles, skips accepted/declined quotes.
- **Snapshot:** change logo/T&Cs after sending → sent quote unchanged.
- **Responsive:** every screen shipped in the phase works at 360px — no page-level horizontal scroll, all actions reachable, nav usable; public quote/invoice pages remain the mobile-first gold standard.

---

## 8. Environment Variables

```
# web/.env.local
NEXT_PUBLIC_PB_URL=
NEXT_PUBLIC_APP_URL=

# pb (env for hooks)
APP_URL=                      # for building public links
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
```

---

## 9. Out of Scope (v1)

AI quote generation (text and voice — deferred; the `POST /ai/generate-quote` hook + builder buttons slot back in as a standalone phase later without schema changes), SMS sending and follow-ups (deferred — Twilio costs; schema channel fields already accommodate it, so adding it later is a dispatch-layer change only), Xero/QuickBooks accounting sync (deferred — significant OAuth + sync scope; add as its own phase if ever needed), multi-user teams/roles, multi-currency, quote e-signatures, customer accounts/logins, native mobile apps, offline mode, partial payments schedules beyond deposit+balance.
