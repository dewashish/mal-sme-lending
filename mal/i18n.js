// Bilingual strings for the Mal SME prototype.
// English + Arabic. Loaded as plain JS so any view can read window.MAL_I18N.
window.MAL_I18N = {
  en: {
    appName: "Mal",
    tagline: "Capital that moves at the speed of trade.",
    products: {
      p1: { short: "Smart Invoice", full: "Smart Invoice. B2B Pay & Get Paid" },
      p2: { short: "Claims Engine", full: "Healthcare Receivables Engine" },
      p3: { short: "Anchor SCF", full: "Anchor-Led Supply Chain Finance" },
    },
    nav: { home: "Home", invoices: "Invoices", limit: "Limit", claims: "Claims", suppliers: "Suppliers", auction: "Auction", history: "History", settings: "Settings", help: "Help" },
    common: {
      continue: "Continue",
      back: "Back",
      next: "Next",
      cancel: "Cancel",
      confirm: "Confirm",
      approve: "Approve",
      reject: "Reject",
      submit: "Submit",
      save: "Save",
      review: "Review",
      financed: "Financed",
      pending: "Pending",
      paid: "Paid",
      overdue: "Overdue",
      due: "Due",
      open: "Open",
      payEarly: "Pay early",
      getPaid: "Get paid now",
      learnMore: "Learn more",
      seeAll: "See all",
      copy: "Copy",
      download: "Download",
      currency: "AED",
    },
  },
  ar: {
    appName: "مال",
    tagline: "رأس مال يتحرّك بسرعة التجارة.",
    products: {
      p1: { short: "الفاتورة الذكية", full: "الفاتورة الذكية، ادفع واستلم" },
      p2: { short: "محرّك المطالبات", full: "محرّك مطالبات التأمين الصحي" },
      p3: { short: "تمويل الموردين", full: "تمويل سلسلة التوريد بقيادة الشركات الكبرى" },
    },
    nav: { home: "الرئيسية", invoices: "الفواتير", limit: "الحد الائتماني", claims: "المطالبات", suppliers: "الموردون", auction: "المزاد", history: "السجل", settings: "الإعدادات", help: "المساعدة" },
    common: {
      continue: "متابعة",
      back: "رجوع",
      next: "التالي",
      cancel: "إلغاء",
      confirm: "تأكيد",
      approve: "موافقة",
      reject: "رفض",
      submit: "إرسال",
      save: "حفظ",
      review: "مراجعة",
      financed: "مموّل",
      pending: "قيد المعالجة",
      paid: "مدفوع",
      overdue: "متأخّر",
      due: "مستحق",
      open: "مفتوح",
      payEarly: "ادفع مبكراً",
      getPaid: "اقبض الآن",
      learnMore: "اعرف المزيد",
      seeAll: "عرض الكل",
      copy: "نسخ",
      download: "تنزيل",
      currency: "د.إ",
    },
  },
};

window.MAL_T = function (lang, path) {
  const dict = window.MAL_I18N[lang || 'en'];
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), dict);
};

// Currency formatter. Uses AR/EN-Arabic formatting based on lang
window.MAL_FMT = function (n, lang, opts) {
  opts = opts || {};
  const locale = lang === 'ar' ? 'ar-AE' : 'en-AE';
  const fmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: opts.dp ?? 0,
    maximumFractionDigits: opts.dp ?? 0,
  });
  const sym = lang === 'ar' ? 'د.إ' : 'AED';
  if (opts.compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000) return sym + ' ' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (Math.abs(n) >= 1_000)     return sym + ' ' + (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return sym + ' ' + fmt.format(n);
};
