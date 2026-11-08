// The website wording that staff can change from the staff area (Edit website).
// This file holds the ORIGINAL wording. Anything saved in the staff area replaces it on the live site.
// Both the student site (app.js) and the staff area (admin.js) read this file.
window.QAREEB_SITETEXT = {
  groups: [
    { title: "Top of the page", fields: [
      { k: "heroEyebrow", label: "Small line above the headline" },
      { k: "heroTitle", label: "Headline" },
      { k: "heroSub", label: "Text under the headline", long: true }
    ] },
    { title: "Three words under the search box", fields: [
      { k: "val1t", label: "First word" },
      { k: "val2t", label: "Second word" },
      { k: "val3t", label: "Third word" }
    ] },
    { title: "How it works", fields: [
      { k: "hiwTitle", label: "Section title" },
      { k: "hiw1t", label: "Step 1 title" }, { k: "hiw1d", label: "Step 1 text", long: true },
      { k: "hiw2t", label: "Step 2 title" }, { k: "hiw2d", label: "Step 2 text", long: true },
      { k: "hiw3t", label: "Step 3 title" }, { k: "hiw3d", label: "Step 3 text", long: true },
      { k: "hiw4t", label: "Step 4 title" }, { k: "hiw4d", label: "Step 4 text", long: true }
    ] },
    { title: "Bottom of the page", fields: [
      { k: "foot", label: "Footer line" },
      { k: "footNote", label: "Footer notice" }
    ] }
  ],
  en: {
    heroEyebrow: "Your guide to student housing in Kuala Lumpur",
    heroTitle: "Find a room within walking distance of your language center",
    heroSub: "Type your center, see the closest rooms first, and know what has been verified before you pay.",
    val1t: "Trust", val2t: "Fast", val3t: "Quality",
    hiwTitle: "How Qareeb works",
    hiw1t: "Choose your language center", hiw1d: "Type its name, or drop a pin on the map. Every distance is measured from there.",
    hiw2t: "See the closest rooms first", hiw2d: "Rooms within walking distance come first, with the cost to move in and what has been verified.",
    hiw3t: "Reserve or ask", hiw3d: "Hold a verified room for 24 hours, or ask any question on WhatsApp.",
    hiw4t: "Move in", hiw4d: "We confirm everything on WhatsApp and send you the deposit details.",
    foot: "Student housing in Kuala Lumpur and Ampang.",
    footNote: "Always confirm the details with the owner before you pay."
  },
  ar: {
    heroEyebrow: "دليلك للسكن في كوالالمبور",
    heroTitle: "ابحث عن سكن على مسافة مشي من معهدك",
    heroSub: "اكتب اسم معهدك لتظهر لك أقرب الغرف أولاً، واعرف ما تم التحقق منه قبل أن تدفع.",
    val1t: "الثقة", val2t: "السرعة", val3t: "الجودة",
    hiwTitle: "كيف يعمل قريب",
    hiw1t: "اختر معهد اللغة", hiw1d: "اكتب اسمه أو حدّد موقعه على الخريطة، وتُقاس كل المسافات منه.",
    hiw2t: "شاهد أقرب الغرف أولاً", hiw2d: "تظهر أولاً الغرف القريبة سيراً، مع تكلفة الانتقال وما تم التحقق منه.",
    hiw3t: "احجز أو اسأل", hiw3d: "احجز غرفة موثّقة لمدة ٢٤ ساعة، أو اسأل أي سؤال عبر واتساب.",
    hiw4t: "انتقل إلى سكنك", hiw4d: "نؤكد كل شيء عبر واتساب ونرسل لك تفاصيل العربون.",
    foot: "سكن الطلاب في كوالالمبور وأمبانغ.",
    footNote: "تأكد دائماً من التفاصيل مع المالك قبل الدفع."
  }
};
