// ============================================================
// QAREEB - edit this file to change settings, campuses and rooms
// ============================================================

window.QAREEB_CONFIG = {
  // Your WhatsApp number: country code + number, no "+" or spaces
  whatsapp: "60123456789",
};

// English language centers students can choose as their destination.
// Coordinates are APPROXIMATE (area level only) - put the exact address
// of each center on Google Maps, then copy its lat/lng here before launch.
//
// group "center" = a specific language center.
// group "area"   = for students whose center is not on the list: they pick
//                  the part of KL where their center is.
// To ADD a center: copy one line, give it a new id, name and lat/lng.
window.CAMPUSES = [
  { id: "excel", group: "center", name: { en: "Excel Language Centre (KL)", ar: "إكسل لانجويج سنتر (كوالالمبور)" }, lat: 3.157, lng: 101.712 },
  { id: "britannia", group: "center", name: { en: "Britannia Language Centre (Genesis Tower)", ar: "بريتانيا لانجويج سنتر (جينيسيس تاور)" }, lat: 3.1483, lng: 101.71073 },
  { id: "ems", group: "center", name: { en: "EMS Language Centre (Megan Avenue 2)", ar: "إي إم إس لانجويج سنتر (ميغان أفينيو 2)" }, lat: 3.16258, lng: 101.71221 },
  { id: "cambright", group: "center", name: { en: "Cambright (Wisma MCA, Jalan Ampang)", ar: "كامبرايت (ويسما إم سي إيه، جالان أمبانغ)" }, lat: 3.15976, lng: 101.71675 },
  { id: "stratford", group: "center", name: { en: "Stratford International Language Centre", ar: "ستراتفورد الدولي لتعليم اللغة" }, lat: 3.1575, lng: 101.7145 },
  { id: "els", group: "center", name: { en: "ELS Language Centres (Wisma HB, Megan Avenue 2)", ar: "إي إل إس (ويسما إتش بي، ميغان أفينيو 2)" }, lat: 3.16258, lng: 101.71221 },
  { id: "elc", group: "center", name: { en: "English Language Company (Jalan Raja Chulan)", ar: "إنجلش لانجويج كومباني (جالان راجا تشولان)" }, lat: 3.1505, lng: 101.709 },
  { id: "apu", group: "center", name: { en: "APU English Language Centre (Bukit Jalil)", ar: "مركز اللغة الإنجليزية APU (بوكيت جليل)" }, lat: 3.0555, lng: 101.7005 },
  { id: "british-council", group: "center", name: { en: "British Council (Jalan Ampang)", ar: "المجلس الثقافي البريطاني (جالان أمبانغ)" }, lat: 3.15964, lng: 101.70879 },
  { id: "language-house", group: "center", name: { en: "The Language House (Megan Avenue 1)", ar: "ذا لانجويج هاوس (ميغان أفينيو 1)" }, lat: 3.1624, lng: 101.71721 },
  { id: "prince", group: "center", name: { en: "Prince Language Centre (Megan Avenue 1)", ar: "برينس لانجويج سنتر (ميغان أفينيو 1)" }, lat: 3.1624, lng: 101.71721 },
  { id: "elec", group: "center", name: { en: "ELEC Language Center (Megan Avenue 2)", ar: "إيليك لانجويج سنتر (ميغان أفينيو 2)" }, lat: 3.16258, lng: 101.71221 },
  { id: "interlink", group: "center", name: { en: "Inter-Link Language Centre (Megan Avenue 2)", ar: "إنتر لينك لانجويج سنتر (ميغان أفينيو 2)" }, lat: 3.16258, lng: 101.71221 },
  { id: "bright", group: "center", name: { en: "Bright Language Center (Megan Avenue 2)", ar: "برايت لانجويج سنتر (ميغان أفينيو 2)" }, lat: 3.16258, lng: 101.71221 },
  { id: "vision", group: "center", name: { en: "Vision International Academy (Megan Avenue 2)", ar: "فيجن إنترناشيونال أكاديمي (ميغان أفينيو 2)" }, lat: 3.16258, lng: 101.71221 },
  { id: "megan-1", group: "area", name: { en: "Megan Avenue 1 (Jalan Tun Razak)", ar: "ميغان أفينيو 1 (جالان تون رزاق)" }, lat: 3.1624, lng: 101.71721 },
  { id: "megan-2", group: "area", name: { en: "Megan Avenue 2 (Jalan Yap Kwan Seng)", ar: "ميغان أفينيو 2 (جالان ياب كوان سينغ)" }, lat: 3.16258, lng: 101.71221 },
  { id: "a-klcc", group: "area", name: { en: "KLCC area", ar: "منطقة KLCC" }, lat: 3.1579, lng: 101.7116 },
  { id: "a-bb", group: "area", name: { en: "Bukit Bintang area", ar: "منطقة بوكيت بينتانج" }, lat: 3.1466, lng: 101.7108 },
  { id: "a-ampang", group: "area", name: { en: "Ampang area", ar: "منطقة أمبانغ" }, lat: 3.1597, lng: 101.7585 },
  { id: "a-cheras", group: "area", name: { en: "Cheras area", ar: "منطقة تشيراس" }, lat: 3.09, lng: 101.74 },
  { id: "a-bangsar", group: "area", name: { en: "Bangsar area", ar: "منطقة بانغسار" }, lat: 3.129, lng: 101.678 },
  { id: "a-jalil", group: "area", name: { en: "Bukit Jalil area", ar: "منطقة بوكيت جليل" }, lat: 3.056, lng: 101.7 },
];

// Status: "available" | "reserved" | "taken"
// photos: list of image URLs. Sample rooms use colour placeholders (c1,c2).
// video: optional link to an .mp4 file or leave "".
window.LISTINGS = [
  {
    id: 1, type: "studio", area: "Ampang", price: 1300, status: "available",
    lat: 3.1608, lng: 101.7570, beds: 1, furnished: true, bills: false,
    title: { en: "Modern studio near Ampang Point", ar: "ستوديو حديث قرب أمبانغ بوينت" },
    desc:  { en: "Fully furnished studio with air-conditioning, WiFi and a small kitchen. Quiet building with 24-hour security.",
             ar: "ستوديو مفروش بالكامل مع تكييف وواي فاي ومطبخ صغير. مبنى هادئ مع حراسة على مدار الساعة." },
    photos: [], colors: ["#1f6f78", "#5aa9a8"], video: ""
  },
  {
    id: 2, type: "room", area: "Ampang", price: 650, status: "available",
    lat: 3.1545, lng: 101.7498, beds: 1, furnished: true, bills: true,
    title: { en: "Private room, bills included", ar: "غرفة خاصة والفواتير مشمولة" },
    desc:  { en: "Master room in a shared apartment with 2 other students. Water, electricity and WiFi are included in the price.",
             ar: "غرفة رئيسية في شقة مشتركة مع طالبين آخرين. الماء والكهرباء والواي فاي مشمولة في السعر." },
    photos: [], colors: ["#b0793a", "#e3b873"], video: ""
  },
  {
    id: 3, type: "apartment", area: "Kuala Lumpur", price: 2400, status: "reserved",
    lat: 3.1520, lng: 101.7080, beds: 2, furnished: true, bills: false,
    title: { en: "2-bedroom apartment near KLCC", ar: "شقة غرفتين قرب KLCC" },
    desc:  { en: "Spacious apartment with pool and gym access. Good for 2 to 4 friends sharing.",
             ar: "شقة واسعة مع مسبح وصالة رياضية. مناسبة لمجموعة من ٢ إلى ٤ أصدقاء." },
    photos: [], colors: ["#2f5d8a", "#7fa7cc"], video: ""
  },
  {
    id: 4, type: "room", area: "Kuala Lumpur", price: 550, status: "available",
    lat: 3.1465, lng: 101.7108, beds: 1, furnished: true, bills: false,
    title: { en: "Budget room near Bukit Bintang", ar: "غرفة اقتصادية قرب بوكيت بينتانج" },
    desc:  { en: "Single room, shared bathroom, close to the monorail and many restaurants. Cheapest option in the area.",
             ar: "غرفة مفردة وحمام مشترك، قريبة من المونوريل والمطاعم. أرخص خيار في المنطقة." },
    photos: [], colors: ["#4f7a68", "#9cc2b0"], video: ""
  },
  {
    id: 5, type: "studio", area: "Kuala Lumpur", price: 1500, status: "taken",
    lat: 3.1610, lng: 101.7240, beds: 1, furnished: true, bills: false,
    title: { en: "Studio on Jalan Ampang", ar: "ستوديو في شارع أمبانغ" },
    desc:  { en: "Bright studio with balcony, close to the LRT.", ar: "ستوديو مشرق مع شرفة، قريب من محطة القطار." },
    photos: [], colors: ["#8a6a5a", "#c9ab99"], video: ""
  },
  {
    id: 6, type: "apartment", area: "Ampang", price: 1900, status: "available",
    lat: 3.1650, lng: 101.7640, beds: 2, furnished: false, bills: false,
    title: { en: "Unfurnished 2-bed in Ampang", ar: "شقة غرفتين غير مفروشة في أمبانغ" },
    desc:  { en: "Large unfurnished apartment, good price for long-term stays.", ar: "شقة كبيرة غير مفروشة بسعر جيد للإقامة الطويلة." },
    photos: [], colors: ["#3d6b7a", "#8fb8c4"], video: ""
  },
];

// TRUST & FIT info per listing (SAMPLE VALUES - replace with real, checked facts).
// video  = you did a live video tour with the owner
// owner  = you checked the owner's ID / ownership proof
// visited= someone from your team visited in person
// mosque / halal = walking minutes to nearest mosque / halal food
// arabic = owner or other tenants speak Arabic
// RULE: only set a flag to true when you really did the check. Trust is the product.
window.TRUST = {
  1: { video: true,  owner: true,  visited: true,  mosque: 6,  halal: 4,  arabic: true  },
  2: { video: true,  owner: true,  visited: false, mosque: 9,  halal: 5,  arabic: false },
  3: { video: false, owner: true,  visited: false, mosque: 12, halal: 7,  arabic: false },
  4: { video: true,  owner: false, visited: false, mosque: 5,  halal: 3,  arabic: true  },
  5: { video: false, owner: false, visited: false, mosque: 8,  halal: 6,  arabic: false },
  6: { video: false, owner: false, visited: false, mosque: 15, halal: 10, arabic: false },
};
// Minimum stay in months (language students often stay only 1 to 6 months,
// so rooms that accept short stays are very valuable to them). SAMPLE VALUES.
window.MINSTAY = { 1: 1, 2: 3, 3: 6, 4: 1, 5: 3, 6: 12 };
window.LISTINGS.forEach(function (l) {
  l.minStay = window.MINSTAY[l.id] || 12;
  l.trust = window.TRUST[l.id] || { video: false, owner: false, visited: false, mosque: null, halal: null, arabic: false };
});
