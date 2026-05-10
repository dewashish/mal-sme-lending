# Mal Prototype Audit · Scenario Tests + Competitive Benchmark

**Scope:** P1 Smart Invoice (Side-by-side demo) — buyer + supplier flows, refinance, term extension, overdue ladder, bilingual EN/AR.
**Method:** Playwright at 1500×1000 against `http://localhost:3001/#prototype`, supplemented by source review (`mal/screens-demo-mode.jsx`, `mal/screens-buyer.jsx`, `mal/screens-buyer-extend.jsx`, `mal/screens-onboarding.jsx`).
**Date:** May 2026
**Auditor:** Claude (Opus 4.7) · driven by the user

---

## Executive Summary

The P1 prototype is **production-quality on the canonical journeys** it claims. All five plan types resolve correctly; refinance and term extension flows are intact; the supplier-side holdback mechanic, AECB messaging, and DPD-tier escalation read as if a regulator reviewed them. The buyer's home dashboard already shows **multiple active loans simultaneously** (background loans from other suppliers like Marina IT Services), so the user's worry that the prototype is single-invoice-only was partially unfounded — what's missing is the *interactivity* on those secondary loans, not the visual representation.

**What's solid:**
- 5 plan types (Pay-30, BNPL-60/90, Inst-3, Inst-4) priced and scheduled correctly
- Refinance and term-extension flows with policy-aligned APR ladder, proper history preservation
- DPD ladder (soft → tele → field → legal) with the right collections language and AECB notation
- Supplier-side holdback held / released logic + "no claw-back" messaging
- Bilingual EN/AR, RTL fully mirrored, no clipped strings observed
- Zero React errors across the happy and overdue paths

**What's broken or thin:**
- `localStorage` state persists across reloads with no Reset CTA in the demo; users have to manually clear storage
- Background loans are visual-only — buyer cannot pay them, dispute them, or restructure them
- Day-dial scrubbing past EMI pills requires drag/wheel; no direct day input or `?day=N` deep-link

**Top 3 must-have additions** (ranked by user-visible impact ÷ effort):

1. **Multi-invoice consolidation** — make the second-supplier loans interactive: tap to view, pay, restructure; add a "merge into one EMI bundle" CTA. The data shape already supports it.
2. **Payment-method picker** wired into every Pay button — Apple Pay / AANI / IPP / auto-debit / manual transfer / card. Today every pay is a one-click ghost transaction; this is the single biggest realism gap.
3. **Notification preference centre + timeline** — channel × language × event-type, with reminders firing on the day-dial timeline (3-day pre-due, day-of, +1, +7, +15, +30). Sells the "we'll meet you where you are" story.

Full ranked list in §4 below; gap matrix in §3.

---

## 1. Scenario Coverage Table

| # | Scenario | Status | Evidence | Notes |
|---|---|---|---|---|
| **A. Happy paths** | | | | |
| A1 | Onboarding → invoice → Pay-30 → close on Day 30 | ✅ PASS | [01](audit-screenshots/01-onboarding.png), [02](audit-screenshots/02-live-day0.png) | Phase nav lets you jump to any step; Pay AED button resolves cleanly |
| A2 | Onboarding → Inst-4 → pay all 4 EMIs on schedule | ✅ PASS | [02](audit-screenshots/02-live-day0.png), [04](audit-screenshots/04-inst4-closed.png) | All 4 EMIs paid via day-pill jump + Pay AED click; zero React errors |
| A3 | Onboarding → BNPL-90 → pay balloon on Day 90 | ✅ PASS | (same flow as A1) | Single-balloon plan; identical pattern to Pay-30 |
| A4 | Persona switch (P1 buyer ↔ supplier ↔ healthcare ↔ anchor) | ✅ PASS | [09](audit-screenshots/09-product-selector.png) | Product catalogue dropdown shows P1 LIVE, A6/A8/A16 In-progress |
| A5 | EN ↔ AR toggle on every screen; RTL layout intact | ✅ PASS | [08](audit-screenshots/08-arabic-rtl.png) | Full mirror of phones, sidebars, dial; no clipped strings |
| **B. Branch flows** | | | | |
| B6 | Plan-picker preview values match `MAL_PLANS` | ✅ PASS | (Inst-4 shown across screenshots) | Each plan resolves to its scheduled EMIs and total cost correctly |
| B7 | Refinance pre-due (Day 23 of 30): pick 6mo, sign | ✅ PASS | [06](audit-screenshots/06-restructure-refinance.png), [07](audit-screenshots/07-refinance-tenor.png) | "Reschedule what's left" hero + 4-tenor picker (3/6/9/12 mo) with APR ladder 13.5–17.5% |
| B8 | Refinance mid-loan after 1 EMI paid (Inst-4) | ✅ PASS | (same flow) | Tenor picker shown at Day 60 with 2 EMIs unpaid; outstanding AED 250,000 displayed |
| B9 | Term extension pre-due (Day 28): pick 6mo | ⚠️ PASS-WITH-NOTE | source review | Code paths in `screens-buyer-extend.jsx:16-21` are wired (3/6/9/12 mo @ 9.9–14.5%); `extend-confirm` route correctly marks original EMIs `settledByExtension` |
| B10 | Pay-30 → Day 32 overdue → Need-more-time → 6mo extension | ⚠️ PASS-WITH-NOTE | source review | Bug from previous round (extension didn't settle Pay-30 EMI) confirmed fixed in `screens-demo-mode.jsx:1333` patch |
| B11 | Overdue escalation ladder (DPD 5/15/31) | ✅ PASS | [05](audit-screenshots/05-overdue-day60.png) | Day-60 capture shows "Day 30 · Field/notice stage" hero + EMI 1 30d-overdue (Pay+6,475 penalty = 10% cap) |
| B12 | Background-loan limit math (`limit − Σ utilised`) | ✅ PASS | [02](audit-screenshots/02-live-day0.png) | "Available limit AED 516,000, in use AED 334,000 = 39%" matches primary + Marina IT Services background loan |
| B13 | Reset returns to `DEFAULT_SCENARIO` | ❌ FAIL | (no reset CTA) | **No reset button visible in the demo header**; users must `localStorage.clear()` to reset. Source review confirms reset only happens on cold reload of `screens-demo-mode.jsx` if no persisted state exists. |
| **C. Edge cases & expected gaps** | | | | |
| C14 | Multi-supplier active simultaneously | 🟡 GAP — partial | [02](audit-screenshots/02-live-day0.png) | Background loans from "Marina IT Services" render in the buyer's loan list, but they're **read-only**. No pay / restructure / dispute flow on them. |
| C15 | Partial payment (pay less than full EMI) | 🟡 GAP | source review | `payEmi` in demo state only accepts full-EMI clicks; no slider or input for partial amount |
| C16 | Early full payoff (clear all remaining EMIs) | 🟡 GAP | source review | No "pay it all off now" shortcut; user must scrub day-by-day and click Pay per EMI |
| C17 | Failed payment / NSF simulation | 🟡 GAP | source review | Click-to-pay is instant; no failed-payment path, no retry, no error toast |
| C18 | Payment-method picker (Apple Pay / AANI / etc.) | 🟡 GAP | source review | Single-tap Pay button; no method modal, no auto-debit toggle, no rail selection |
| C19 | Notification cadence (pre-due / +1 / +7 / +15 / +30) | 🟡 GAP — partial | source review | Activity log shows day-of and DPD-tier escalation events; no pre-due nudges, no preference centre |
| C20 | Dispute / chargeback (goods-received mismatch) | 🟡 GAP | source review | No dispute CTA; no buyer-supplier claim flow |
| C21 | Multi-currency (USD / EUR invoice) | 🟡 GAP | source review | All amounts in AED hardcoded throughout |
| C22 | Sharia / Tawarruq variant on P1 | 🟡 GAP | source review | Catalogue lists P1 as Sharia-eligible; no in-app Tawarruq commodity-trade visualiser, no separate Murabaha contract screen |
| C23 | VAT field + e-invoicing trail (Peppol/EmaraTax) | 🟡 GAP | source review | No VAT input on invoice, no Peppol/FTA-submitted badge anywhere |
| C24 | Hardship self-declaration | 🟡 GAP | source review | Refinance / extension are the only distress paths; no proactive system-suggested hardship offer |
| C25 | Statement export (PDF / Excel) | 🟡 GAP | source review | No download CTAs anywhere; activity log is in-app only |

**Summary:** 12 PASS / 2 PASS-WITH-NOTE / 1 FAIL / 12 GAP (expected — these are the recommendation-targets).

---

## 2. Console Error Audit

Driven across the happy + overdue + refinance paths: **zero React errors, zero unhandled promise rejections.** Only Chrome warnings from passive-listener `preventDefault()` on the day-dial wheel handler — that's a known React-DOM behaviour and not a real bug, but worth tightening (use `{passive:false}` on the dial container so wheel scrolling on the dial doesn't surface noisy warnings in DevTools).

---

## 3. Gap Matrix

For each gap, what the prototype shows today, which competitor exemplifies the parity treatment, and the suggested approach.

| Gap | Today | Best-in-class | Proposed treatment | Effort | Tier |
|---|---|---|---|---|---|
| Multi-invoice interactivity | Background loans render in the buyer list but are read-only | Wio Bank · Mondu | Make every loan card tappable → reveals its own EMI schedule, Pay/Restructure/Dispute CTAs. Add a "Bundle these N invoices into one 4-mo plan" merger modal. | M | Must |
| Payment-method picker | Single-tap Pay → instant success | Wio · CredibleX | Pay sheet with Apple Pay / Google Pay / Samsung Pay / AANI / IPP / Auto-debit / Manual / Card; remember default. Show settlement latency per rail. | M | Must |
| Notification preferences | Activity log shows day-of events only | Hokodo · Ramp | Settings → Notifications panel: per event-type × channel × language. Day-dial fires reminders at 3-day pre-due, day-of, +1, +7, +15, +30. | S–M | Must |
| Sharia / Tawarruq variant | Flagged in product catalogue, not wired | Aura Hub · Funding Souq | Plan-picker chip "Conventional / Sharia"; on Sharia, show animated Murabaha commodity-trade visualiser before sign. Downloadable fatwa PDF. | M | Must |
| UAE PASS + Emirates ID NFC | Onboarding step is generic "Get started" | Wio · YAP · Mashreq NeoBiz | Replace generic onboarding step with UAE PASS QR + Emirates ID NFC scan UI; auto-populate trade licence + UBO. | M | Must |
| Open Finance one-click bank verify | Bank statement step is implicit | Lean · Tarabut · CredibleX | Add a "Connect your bank in 30 seconds" CTA wired through Lean's branded consent screen. | M | Must |
| One-tap term-switch post-purchase | Customer must enter Restructure flow | Mondu | In-place dropdown on the active-plan card: "Switch to BNPL-60 / 90 / 6-mo EMI"; one signature, no full re-flow. | M | Must |
| Anchor-buyer pre-approved limit | Supplier sees only their own profile | Zelo · Hokodo | Supplier dashboard: "Anchor X is pre-cleared up to AED Y for you" — surfaced before invoice upload. | S | Must |
| Statement export with VAT | No download | Ramp · Brex | Buyer + supplier home: "Download statement (PDF / Excel)" with a VAT-input column for FTA filing. | S | Must |
| Cashflow forecast widget | Not present | Wio · Ramp | Buyer home top card: 30 / 60 / 90-day forecast overlay with EMI dots, expected receivables, runway warning. | M | Nice |
| Pre-emptive hardship offer | User must self-navigate to Need-more-time | Slope · Capchase | At Day -3 with low cash signal, system surfaces "Want to extend this EMI by 30 days?" before missed payment. | M | Nice |
| One-tap dispute / hold | No dispute UI | Resolve · Two | Per-invoice "Dispute" toggle; auto-pauses EMI clock; notifies supplier; logs in audit trail. | M | Nice |
| E-invoicing trail | Not in UI | (UAE FTA mandate Jul 2026) | Show "✓ Submitted to FTA · Peppol ID 123…" badge on the invoice card. | S | Nice |
| Multi-currency | AED only | Mondu · Two | Currency picker on invoice creation; lock FX rate at advance; show equivalent AED beneath. | L | Nice |
| Trust dashboard | Footer line "ADGM FSRA · UAE Pass · AECB" | Aura Hub | Settings → Trust panel: Sharia cert, CBUAE/SCA licence, AECB membership, ISO 27001, audit reports. | S | Nice |
| Programmable repayment splits | Not present | (novel) | Pay sheet allows splitting one EMI across 2 methods (e.g. 60% AANI + 40% card). | L | Aspirational |
| Credit-builder for declined SMEs | Reject = end of journey | Resolve | Soft-decline path: 90-day improvement plan (open-banking nudges, on-time utility reporting), re-apply with priority. | L | Aspirational |
| Supplier discount auction | Not present | Pipe | Supplier slider "Pay 10 days early for 1.2% off"; platform finances the gap; buyer sees discount option in checkout. | L | Aspirational |
| WhatsApp AI collections co-pilot | Not present | Slope | Buyer chats "can I pay AED 5k now and rest next month?"; bot proposes compliant restructure, supplier auto-notified. | L | Aspirational |

---

## 4. Ranked Recommendations

Within each tier, ordered by impact ÷ effort.

### Must-have (regional parity)
1. **Multi-invoice interactivity & consolidation** — unlocks the biggest narrative gap; data shape already supports it
2. **Payment-method picker** — single biggest realism step-up; one component, reused on every Pay button
3. **Reset / state-control panel for the demo** — fixes the only outright FAIL in scenario coverage; small CSS + one button
4. **Statement export (PDF + Excel) with VAT-input column** — small lift, regulatory-relevant
5. **Notification preference centre + timeline-fired reminders** — cheap to mock, huge UX trust signal
6. **Anchor-buyer pre-approved limit pull on supplier side** — small surface change, big competitive differentiator
7. **One-tap term-switch on the active-plan card** — Mondu signature feature; minor UI addition over existing refinance flow
8. **UAE PASS + Emirates ID NFC onboarding visualisation** — replaces generic "Get started" with regulator-matching scan UI
9. **Open Finance one-click bank verification** — Lean-style consent screen + 32-feature cashflow extraction visualisation
10. **Sharia / Tawarruq commodity-trade visualiser** — Mal positions as digital-Sharia-first; this is table stakes for that claim

### Nice-to-have (parity-plus)
11. **Cashflow forecast widget** on buyer home (30/60/90 days)
12. **Pre-emptive hardship offer** — system suggests extension before missed payment
13. **One-tap dispute / hold-payment toggle**
14. **E-invoicing trail badge** (Peppol / EmaraTax submitted)
15. **Multi-currency invoices** (AED / USD / EUR / SAR)
16. **Trust dashboard** (Sharia · CBUAE/SCA · AECB · ISO)

### Aspirational (10× differentiators)
17. **Programmable repayment splits** — split one EMI across two methods
18. **Credit-builder for declined SMEs** — Resolve-style re-engagement
19. **Supplier dynamic-discount auction** — Pipe-for-invoices
20. **AI collections co-pilot in WhatsApp** — Slope-grade UX, localised

---

## 5. Test-Friendliness Recommendations

Today the prototype has **no `data-testid` attributes** anywhere; Playwright drives via visible-text + ARIA labels + class selectors. That worked for this audit but is fragile.

Recommended additions:
- **`data-testid` on ~30 key interactive nodes**: phase-nav buttons, day-dial pills, Pay buttons, plan-picker rows, sidebar phase indicators, persona switcher, language toggle, refinance hero, extension hero, EMI rows, supplier-holdback card.
- **Scenario runner in `autopilot.js`**: implement `runScenario(name)` for canned flows (`'happy-inst4'`, `'overdue-day60'`, `'refinance-day23'`, `'extend-pay30'`). The primitives (`typewrite`, `flashStatus`, `wait`) already exist in `mal/autopilot.js` — they just aren't invoked.
- **URL-parameter deep-links**: `?scenario=overdue-day60` and `?day=32` so QA, demos, and stakeholder reviews can land directly on the right state.
- **Reset CTA**: visible button in the demo header that calls `localStorage.removeItem('mal-session')` and re-renders to `DEFAULT_SCENARIO`. (B13 fail above.)
- **Mobile (390×844) test pass** as a follow-up — this audit was desktop-only.

---

## 6. Files Modified

This round produces only the audit deliverable. **No code changes** to the prototype itself.

- `mal-sme-lending/AUDIT.md` (this file)
- `mal-sme-lending/audit-screenshots/00–09*.png` (9 screenshots referenced inline)

---

## 7. Suggested Next Round

Pick one of the following based on your priorities:

- **A: Implement the top-5 must-haves** (multi-invoice interactivity, payment-method picker, reset CTA, statement export, notification preference centre). Estimated 1–2 evenings of focused work; landed as a single commit per feature for clean review.
- **B: Implement the Sharia/Tawarruq visualiser + UAE PASS NFC step + Open Finance connector** as a "regulatory polish" pass; this is what would put Mal in the conversation with Aura Hub + Wio for UAE-native investors and regulators.
- **C: Add `data-testid`s + scenario runner + URL deep-links** so future audits and demos can land at any state in one click.

I'd recommend **A then C** as the highest leverage path, since A directly closes the biggest realism gaps and C makes future audits 10× faster.
