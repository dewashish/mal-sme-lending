/* eslint-disable */
// Mal · product catalogue — shared by Prototype and Financial Modeling sections.
//
// Sourced from the strategy doc: 3 core products (P1, P2, P3), Path-2 buyer
// extension, FLDG distribution model, plus Appendix A.2 wider catalogue (A1–A17).
// Grouped into the 6 commercial verticals used in pitch conversations.
//
// status: 'live' | 'in-progress'   (only the Smart Invoice flagship is live)

window.MAL_PRODUCT_CATALOGUE = [
  {
    id: 'invoice-finance',
    name: 'Invoice Finance',
    blurb: 'Cash against invoices — supplier advance, buyer flexibility.',
    color: 'lilac',
    products: [
      {
        id: 'p1-smart-invoice',
        code: 'P1',
        title: 'Smart Invoice + Term Extension',
        short: 'Smart Invoice',
        status: 'live',
        blurb: 'B2B "Pay & Get Paid": supplier gets 90% advance; buyer chooses Pay-30 / BNPL 60–180d / 6-mo Term Extension. The flagship.',
        // financial-side product key (which workbook drives this)
        finKey: 'p1',
        // prototype-side entries
        protoEntries: [
          { id: 'demo',     label: 'Side-by-side demo' },
          { id: 'buyer',    label: 'Buyer SME · standalone' },
          { id: 'supplier', label: 'Supplier SME · standalone' },
        ],
        defaultEntry: 'demo',
      },
      {
        id: 'a6-tokenised-invoice',
        code: 'A6',
        title: 'Tokenised SME Invoice Marketplace',
        short: 'Tokenised Invoices',
        status: 'in-progress',
        blurb: 'Fractionalised invoice notes traded on a regulated marketplace. Family offices and HNW capital fund the book directly.',
      },
      {
        id: 'a8-govt-receivables',
        code: 'A8',
        title: 'Government Receivables Discount Program',
        short: 'Govt Receivables',
        status: 'in-progress',
        blurb: 'Discount program for invoices owed by federal / emirate-level entities. Ultra-low credit risk; thin margin, high volume.',
      },
      {
        id: 'a16-education-receivables',
        code: 'A16',
        title: 'Education Sector Receivables Finance',
        short: 'Education Receivables',
        status: 'in-progress',
        blurb: 'Advances to schools/universities against tuition receivables, batched per term. Highly seasonal cash-flow product.',
      },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Insurance',
    blurb: 'Claim advances and premium financing for the medical chain.',
    color: 'coral',
    products: [
      {
        id: 'p2-healthcare-receivables',
        code: 'P2',
        title: 'Healthcare Insurance Receivables Engine',
        short: 'Healthcare Receivables',
        status: 'in-progress',
        blurb: 'Same-day claim advance for clinics and hospitals against insurer receivables, with predictive adjudication. Multi-payer.',
        finKey: 'p2',
        protoEntries: [
          { id: 'hcops',   label: 'Provider Ops console' },
          { id: 'hccoder', label: 'Coding desk' },
        ],
        defaultEntry: 'hcops',
      },
      {
        id: 'a3-premium-financing',
        code: 'A3',
        title: 'Insurance Premium Financing for SME Group Medical',
        short: 'Premium Financing',
        status: 'in-progress',
        blurb: 'Spreads SME group-medical insurance premiums across 10–12 monthly instalments instead of upfront. Insurer keeps full year-1 commission.',
      },
    ],
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain & Trade',
    blurb: 'Anchor-led reverse factoring and trade-finance lines.',
    color: 'ink',
    products: [
      {
        id: 'p3-anchor-scf',
        code: 'P3',
        title: 'Anchor-Led Supply Chain Finance',
        short: 'Anchor SCF',
        status: 'in-progress',
        blurb: 'Reverse factoring with daily dynamic-discount auctions, tied to large UAE anchors (Aldar, Majid Al Futtaim, AD Ports, IHC, e&).',
        finKey: 'p3',
        protoEntries: [
          { id: 'anchorAP',  label: 'Anchor AP console' },
          { id: 'anchorSup', label: 'Anchor Supplier app' },
        ],
        defaultEntry: 'anchorAP',
      },
      {
        id: 'p4-edb-fldg',
        code: 'P4',
        title: 'EDB-Guaranteed Distribution + FLDG',
        short: 'EDB / FLDG',
        status: 'in-progress',
        blurb: 'Pathway B: partner-bank co-lending with First Loss Default Guarantee. Capital-light; Mal services, partner balance-sheets.',
        finKey: 'p4',
      },
      {
        id: 'a1-dmcc-gold',
        code: 'A1',
        title: 'DMCC Gold & Commodity Murabaha Trade Line',
        short: 'DMCC Gold Murabaha',
        status: 'in-progress',
        blurb: 'Sharia-compliant Murabaha trade line backed by DMCC-vaulted gold and commodities. Targets jewellers and bullion traders.',
      },
      {
        id: 'a5-uae-africa-reexport',
        code: 'A5',
        title: 'UAE-Africa Re-Export Murabaha',
        short: 'UAE–Africa Re-Export',
        status: 'in-progress',
        blurb: 'Murabaha financing for re-export trade from UAE free zones into African markets. Tenor matched to shipping + receivables cycle.',
      },
      {
        id: 'a2-edb-co-lend',
        code: 'A2',
        title: 'EDB-Guaranteed Sharia Term Lending Co-Lend',
        short: 'EDB Co-Lend (Sharia)',
        status: 'in-progress',
        blurb: 'Sharia-compliant term lending co-originated with Emirates Development Bank under their guarantee scheme. Lower OpEx, regulator-friendly.',
      },
    ],
  },
  {
    id: 'working-capital',
    name: 'Working Capital & Compliance',
    blurb: 'Payroll, licensing, and tax — short-tenor cash bridges.',
    color: 'peach',
    products: [
      {
        id: 'a4-wps-payroll',
        code: 'A4',
        title: 'WPS-Linked SME Payroll Stretch',
        short: 'WPS Payroll Stretch',
        status: 'in-progress',
        blurb: 'Bridges SME monthly payroll obligations via the Wage Protection System. Repayment auto-debited from next month\'s collection account.',
      },
      {
        id: 'a17-ewa-payroll',
        code: 'A17',
        title: 'EWA Plus SME Payroll Bridge (Sharia)',
        short: 'EWA Payroll (Sharia)',
        status: 'in-progress',
        blurb: 'Earned Wage Access layered with employer-side SME bridge. Sharia-compliant structure; revenue split between employer fee and Wakala return.',
      },
      {
        id: 'a13-licence-finance',
        code: 'A13',
        title: 'Trade Licence & Visa Renewal Finance',
        short: 'Licence / Visa Finance',
        status: 'in-progress',
        blurb: 'Short-tenor advance for SME trade-licence renewal, visa quotas, Tasheel and Tawjeeh fees. Highly recurring; strong retention loop.',
      },
      {
        id: 'a14-tax-vat-finance',
        code: 'A14',
        title: 'Corporate Tax & VAT Instalment Financing',
        short: 'Tax / VAT Instalment',
        status: 'in-progress',
        blurb: 'Spreads UAE 9% corporate-tax and quarterly VAT obligations across instalments. Lockstep with the FTA filing calendar.',
      },
    ],
  },
  {
    id: 'embedded',
    name: 'Embedded & Platform',
    blurb: 'Lending embedded inside the SME\'s existing software / payments stack.',
    color: 'sky',
    products: [
      {
        id: 'a9-saas-rbf',
        code: 'A9',
        title: 'Subscription / SaaS RBF for B2B Tech',
        short: 'SaaS RBF',
        status: 'in-progress',
        blurb: 'Revenue-based financing for B2B SaaS SMEs against MRR and contract pipeline. Repayment is a fixed % of monthly revenue.',
      },
      {
        id: 'a10-embedded-accounting',
        code: 'A10',
        title: 'Embedded Accounting-Platform Lending',
        short: 'Embedded Accounting',
        status: 'in-progress',
        blurb: 'Credit decisioning and disbursement embedded inside Zoho / QuickBooks / Xero — SMEs apply without leaving their books.',
      },
      {
        id: 'a11-pos-mca',
        code: 'A11',
        title: 'POS-Receivables Merchant Cash Advance',
        short: 'POS MCA',
        status: 'in-progress',
        blurb: 'MCA repaid as a daily slice of card-acquirer settlements. Targets F&B, retail, and clinics with high card-payment share.',
      },
      {
        id: 'a12-marketplace-seller',
        code: 'A12',
        title: 'Marketplace Seller Financing',
        short: 'Marketplace Sellers',
        status: 'in-progress',
        blurb: 'Working-capital lines for noon, Amazon.ae, talabat, and Careem sellers — repayment swept from marketplace payout cycle.',
      },
    ],
  },
  {
    id: 'specialised',
    name: 'Specialised',
    blurb: 'Niche / asset-backed verticals with distinct underwriting.',
    color: 'sage',
    products: [
      {
        id: 'a7-franchise-finance',
        code: 'A7',
        title: 'Franchise & Acquisition Finance',
        short: 'Franchise Finance',
        status: 'in-progress',
        blurb: 'Term loans for franchisees opening new outlets and SME acquisition financing. Larger ticket; longer tenor; harder credit.',
      },
      {
        id: 'a15-esg-solar',
        code: 'A15',
        title: 'ESG & Solar Equipment Finance',
        short: 'ESG / Solar',
        status: 'in-progress',
        blurb: 'Equipment-secured term lending for SME solar-rooftop installs and energy-efficiency CapEx. UAE Net-Zero 2050 aligned.',
      },
    ],
  },
];

// Helpers
window.MAL_PRODUCT_FLAT = window.MAL_PRODUCT_CATALOGUE.flatMap((g) =>
  g.products.map((p) => ({ ...p, categoryId: g.id, categoryName: g.name, categoryColor: g.color }))
);
window.MAL_PRODUCT_BY_ID = Object.fromEntries(window.MAL_PRODUCT_FLAT.map((p) => [p.id, p]));
window.MAL_PRODUCT_BY_FINKEY = Object.fromEntries(
  window.MAL_PRODUCT_FLAT.filter((p) => p.finKey).map((p) => [p.finKey, p])
);
