# Mal. UAE SME Lending Prototype

A clickable, browser-based prototype of **Mal**, a UAE SME lending platform. Three products (Smart Invoice + Term Extension, Healthcare Receivables, Anchor SCF) across **six personas**:

- **Buyer SME**. Limit reveal, 5-plan repayment picker, term extension flow
- **Supplier SME**. Instant invoice financing inbox
- **Healthcare Provider. Ops**. Claims advance + reconciliation
- **Healthcare Provider. Coder**. Predictive rejection scoring + fix queue
- **Anchor. AP**. Daily dynamic-discount auction admin
- **Anchor. Supplier**. Live auction bidding with countdown clock

EN + AR (RTL), light + dark, mobile + desktop.

> **Demo data only.** All "verifications", OTPs, bureau pulls, document checks and money movements are animated stubs. Nothing real moves.

---

## Run locally

```bash
cd mal-sme-lending
npx serve . -l 3000
# or
python3 -m http.server 3000
```

Open `http://localhost:3000`. The app loads React + Babel + Supabase from CDN. No build step.

## Persistence (Supabase, optional)

The prototype upserts session state into Supabase so reloads don't wipe progress. Uses an anonymous demo session (UUID in `localStorage`).

To wire up a fresh Supabase project, run [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL editor. The shared project URL + anon key are already embedded in `mal/supabase-client.js` (anon keys are safe to ship).

If the network is unreachable, persistence falls back to in-memory; the app still works.

State slices persisted:
- `__persona`, `__lang`. Last picked persona + language
- `buyerOnboarding`. Onboarding form fields
- `buyerLimit`, `buyerPlans`, `termExtensions`. Buyer commitments
- `supplierAccepts`. Accepted invoice offers
- `anchorBids`. Auction bids
- `hcCoderFixes`. Claim coding fixes

## Project layout

```
mal-sme-lending/
├── index.html              # Entry. Landing → picker → app
├── mal/
│   ├── tokens.css          # Design tokens (colors, type, motion)
│   ├── i18n.js             # EN/AR strings
│   ├── icons.jsx           # 40 SVG icons
│   ├── ui.jsx              # Button, Card, Pill, Avatar, Tabs, Sparkline, Ring
│   ├── ios-frame.jsx       # iOS device mock for design surface
│   ├── landing-and-system.jsx  # Marketing page + design system page
│   ├── prototype-shell.jsx     # Persona router (MalPrototype, PersonaApp)
│   ├── persona-picker.jsx      # The "Who are you today?" picker
│   ├── screens-onboarding.jsx  # Buyer + Supplier 11/8-step onboarding
│   ├── screens-buyer.jsx       # Buyer home / invoice / plan / collections
│   ├── screens-buyer-extend.jsx # Term extension product (8 screens)
│   ├── screens-others.jsx      # Supplier app, HC Ops, HC Coder, Anchor AP/Sup
│   ├── supabase-client.js  # Supabase JS client init
│   └── session-store.js    # MalSession.saveSlice / loadState
├── supabase-schema.sql     # Run once in Supabase SQL editor
├── vercel.json             # Static deploy config
└── package.json
```

## Deployment

Pushed to `https://github.com/dewashish/mal-sme-lending`. Connect the repo on [vercel.com/new](https://vercel.com/new). It auto-detects a static site (no build command). Each push to `main` deploys.

## Provenance

Built from the Claude-Design handoff bundle for *Mal. SME Lending* (May 2026). The strategy doc that informed the screens is `SME_Lending_Head_of_Product_Strategy.docx`. The prototype runs the design files **verbatim** under a custom entry shell. See `index.html`.
