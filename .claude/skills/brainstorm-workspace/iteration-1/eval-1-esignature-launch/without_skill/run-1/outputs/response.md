Short answer: no, don't add drawn-signature e-signing before launch. Your mate's instinct is understandable but slightly off target — and there's a cheap middle ground that gets you nearly all the legal weight for about a day of work instead of a new integration.

First, the legal picture (usual caveat: I'm not a lawyer, and for anything serious get proper advice). In the UK, a contract for driveway work doesn't need a signature at all — it needs offer, acceptance, consideration, and intention to be bound. Click-to-accept ("clickwrap") is well established as valid acceptance, and a typed name counts as a "simple electronic signature" under UK law, same legal category as most of what DocuSign produces for consumer work. A squiggle drawn with a thumb on a phone isn't meaningfully stronger than a button click. What actually wins disputes is the **evidence trail**: who accepted, when, what exact document they saw, and whether they acted on it afterwards.

And your plan is already unusually strong on exactly that:

- The `snapshot` frozen at send time means you can prove precisely what the customer saw — line items, totals, T&Cs, the lot — even if settings change later.
- `quote_events` logs viewed/accepted with timestamps and IP/user-agent metadata.
- `accepted_total` is locked server-side at accept time.
- Best of all: on the card path, the customer **pays a deposit** at the moment of acceptance. A Stripe payment tied to the quote is far better evidence of a binding agreement than any signature. Nobody pays a £1,500 deposit by card and then successfully argues they never agreed to the job.

The genuinely thin spot is the **bank transfer and cash accept paths** — there the "acceptance" really is just a button click with no money attached, and that's where your mate has half a point.

So here's what I'd actually do before launch, all cheap:

1. **Typed-name acceptance.** On the accept confirmation step, require the customer to type their full name plus a checkbox: "I accept this quote and the terms & conditions." Store it (e.g. `accepted_by_name` on the quote, or in the `quote_events` meta you already have). That typed name *is* a legally recognised e-signature in the UK — you get the thing your mate wants without a signature-pad canvas or a third-party e-sign service.
2. **Put the T&Cs in the acceptance path.** You already have T&C upload/paste in settings — make sure they're visible (or one tap away) right at the accept step and referenced in the checkbox wording, and that the snapshot records which version was shown. Terms nobody could see are worth little; terms shown at the point of acceptance are worth a lot. Honestly, having decent written T&Cs matters more legally than the signature mechanism.
3. **Send an acceptance receipt email.** On accept, email both the customer and the trader a confirmation: quote number, accepted total, payment method, timestamp, name given, link to the quote. A contemporaneous receipt in the customer's own inbox is superb evidence and doubles as good UX.

That's roughly a day of work folded into Phases 4–5: one form field, one checkbox, a small schema addition, and an email you were nearly sending anyway. No DocuSign fees, no extra friction on a mobile page where friction kills acceptance rates — remember, the public quote page converting well *is* the product.

Full "advanced" e-signing (drawn signatures, certificate-based audit trails) only really earns its keep for high-value commercial contracts or if customers start disputing jobs — and it's already parked in your Out of Scope list, sensibly. If it ever becomes a real ask from users, it slots in later as its own phase without schema upheaval.

So: launch with the button, but make it a *well-evidenced* button — typed name, T&Cs at the point of acceptance, and a receipt email. That answers your mate's concern properly, rather than adding signature theatre.
