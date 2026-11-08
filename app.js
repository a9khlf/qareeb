(function () {
  "use strict";
  var CFG = window.QAREEB_CONFIG, SB = window.QAREEB_SUPABASE, CAMPUSES = window.CAMPUSES, AMEN = window.QAREEB_AMENITIES || [];
  // With Supabase configured, rooms come ONLY from the database (never show sample rooms on the live site).
  var LISTINGS = SB && SB.url ? [] : window.LISTINGS, loadFailed = false;
  var WALK_LIMIT = 20;   // minutes: "within walking distance"
  var OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  // ---------------------------------------------------------------
  // ALL VISIBLE TEXT LIVES HERE (English and Arabic)
  // ---------------------------------------------------------------
  var T = {
    en: {
      heroTitle: "Find a room within walking distance of your language center",
      heroSub: "Type your center, see the closest rooms first, and know what has been verified before you pay.",
      heroEyebrow: "Your guide to student housing in Kuala Lumpur",
      navRooms: "Rooms", navHow: "How it works", navContact: "Contact", menuLabel: "Menu",
      hiwTitle: "How Qareeb works",
      hiw1t: "Choose your language center", hiw1d: "Type its name, or drop a pin on the map. Every distance is measured from there.",
      hiw2t: "See the closest rooms first", hiw2d: "Rooms within walking distance come first, with the cost to move in and what has been verified.",
      hiw3t: "Reserve or ask", hiw3d: "Hold a verified room for 24 hours, or ask any question on WhatsApp.",
      hiw4t: "Move in", hiw4d: "We confirm everything on WhatsApp and send you the deposit details.",
      val1t: "Trust", val2t: "Fast", val3t: "Quality",
      fCampus: "My language center", campusPh: "Type your center, e.g. Britannia",
      fWalk: "Walking distance to my center", walkAny: "Any distance", walk10: "Up to 10 min", walk15: "Up to 15 min", walk20: "Up to 20 min", walk30: "Up to 30 min",
      fArea: "Area", fType: "Type of place", fWho: "Who lives here", fPrice: "Maximum price (RM per month)", fSort: "Sort by",
      fStay: "Minimum stay", stayAny: "Any", stay1: "1 month", stay3: "Up to 3 months", stay6: "Up to 6 months",
      all: "All", any: "Any", room: "Room", studio: "Studio", apartment: "Apartment",
      sNear: "Closest to my center", sCheap: "Lowest price",
      onlyAvail: "Available rooms only", onlyVerified: "Verified rooms only",
      vList: "List", vMap: "Map",
      resultOne: "room found", resultMany: "rooms found",
      empty: "No rooms match your search. Try changing the filters.",
      loadErr: "We could not load the rooms. Please check your internet connection and reload the page.",
      walkGroup: "Within walking distance (up to 20 minutes)", farGroup: "A short ride away",
      chooseCenter: "Choose your language center above to see walking times and the closest rooms.",
      sgCenters: "Language centers and areas", sgArea: "Area", sgCentersOnly: "Language centers", sgAreas: "Buildings and areas (if your center is not listed)", sgMap: "Places on the map", sgSearching: "Searching the map…",
      sgNone: "No match found. Try the street or building name, or drop a pin.",
      sgError: "Map search is not available right now. You can drop a pin instead.",
      pinOption: "📍 Can't find it? Drop a pin on the map", pinTitle: "Show us where your language center is",
      pinHelp: "Tap the map where your center is. We will show the closest rooms to that spot.", pinUse: "Use this location", pinned: "My pinned location",
      change: "Change", viewMap: "View on Google Maps",
      foot: "Student housing in Kuala Lumpur and Ampang.",
      footNote: "Always confirm the details with the owner before you pay.",
      available: "Available", reserved: "Reserved", taken: "Rented",
      walk: "min walk", ride: "min by car",
      perMonth: "per month",
      furnished: "Furnished", unfurnished: "Unfurnished", bills: "Bills included", noBills: "Bills not included",
      minStay: "Minimum stay", minStayShort: "Min. stay",
      g_mixed: "Mixed", g_women: "Women only", g_men: "Men only", g_family: "Families",
      request: "I want this room", cardWa: "Ask on WhatsApp", notAvail: "Not available at the moment",
      reqNote: "One tap: WhatsApp opens with a ready message about this room.",
      msg: "Hello, I am interested in this accommodation I found on Qareeb: ",
      reserve: "Reserve now", prevPhoto: "Previous photo", nextPhoto: "Next photo", costCard: "Move-in total", costTitle: "Cost to move in", costAdvance: "Rent paid in advance", costDeposit: "Security deposit", costUtil: "Utility deposit", costTotal: "Total to pay at move-in", agrYes: "Written tenancy agreement provided", agrNo: "Written agreement: not confirmed yet", costNote: "Ask for the deposit refund terms in writing before you pay.",
      tourBtn: "Request a live video tour", msgTour: "Hello, I would like a live video tour of this room I found on Qareeb: ", tourTimes: "The times that suit me: ",
      resTitle: "Reserve this room",
      resIntro: "We will hold this room for you for 24 hours. We confirm on WhatsApp and send the deposit details.",
      resName: "Your name", resPhone: "Your WhatsApp number (with country code)", resSend: "Confirm reservation",
      resNote: "Your name and number are used only to contact you about this reservation.",
      resNote2: "Reserving holds the room for 24 hours. You can also ask us anything on WhatsApp first.",
      resDone: "Room reserved for 24 hours",
      resDoneText: "Send us the WhatsApp message now so we can confirm your reservation and share the deposit details. If we do not hear from you, the room goes back on the list after 24 hours.",
      resOpen: "Open WhatsApp", resTaken: "Sorry, this room was just reserved by someone else.",
      resLimit: "You already have reservations on hold. Please contact us on WhatsApp.",
      resError: "We could not complete the reservation. Please try again or ask us on WhatsApp.",
      resBadPhone: "Please enter a valid WhatsApp number with the country code.",
      msgReserve: "Hello, I reserved this room on Qareeb and would like to confirm it and receive the deposit details: ",
      howTitle: "How reserving works",
      how1: "Qareeb has checked this room: live video tour and owner identity.",
      how2: "Reserving holds the room for you for 24 hours.",
      how3: "We confirm on WhatsApp and send the deposit details. Pay only to the details we send you, and keep the receipt.",
      fromCampus: "Distance from your language center", distNote: "Walking times are estimates.",
      directions: "View the walking route in Google Maps",
      getting: "Getting around", nearestStation: "Nearest station", nearestBus: "Nearest bus stop", amenTitle: "Advantages",
      trustTitle: "Verification and nearby essentials",
      vVideo: "Live video tour completed", vOwner: "Owner identity checked", vVisit: "Visited in person by the Qareeb team",
      notYet: "not yet", mosque: "Nearest mosque", halalFood: "Nearest halal food", arabicHost: "Arabic-speaking owner or tenants",
      arabicShort: "Arabic spoken", verified: "Verified",
      yes: "Yes", unknown: "Not confirmed",
      safeTitle: "Stay safe: never pay before you see the place",
      safe1: "Ask for a live video call, or visit the place before you pay.",
      safe2: "Do not pay a deposit because someone says \"hurry, others want it\".",
      safe3: "Do not pay 6 months or more in advance. Ask for a written tenancy agreement.",
      safe4: "Pay to the owner's verified account, not to a personal name you do not know.",
      safe5: "Scammed? Call Malaysia's National Scam Response Centre: 997"
    },
    ar: {
      heroTitle: "ابحث عن سكن على مسافة مشي من معهدك",
      heroSub: "اكتب اسم معهدك لتظهر لك أقرب الغرف أولاً، واعرف ما تم التحقق منه قبل أن تدفع.",
      heroEyebrow: "دليلك للسكن في كوالالمبور",
      navRooms: "الغرف", navHow: "كيف يعمل", navContact: "تواصل معنا", menuLabel: "القائمة",
      hiwTitle: "كيف يعمل قريب",
      hiw1t: "اختر معهد اللغة", hiw1d: "اكتب اسمه أو حدّد موقعه على الخريطة، وتُقاس كل المسافات منه.",
      hiw2t: "شاهد أقرب الغرف أولاً", hiw2d: "تظهر أولاً الغرف القريبة سيراً، مع تكلفة الانتقال وما تم التحقق منه.",
      hiw3t: "احجز أو اسأل", hiw3d: "احجز غرفة موثّقة لمدة ٢٤ ساعة، أو اسأل أي سؤال عبر واتساب.",
      hiw4t: "انتقل إلى سكنك", hiw4d: "نؤكد كل شيء عبر واتساب ونرسل لك تفاصيل العربون.",
      val1t: "الثقة", val2t: "السرعة", val3t: "الجودة",
      fCampus: "معهد اللغة الذي أدرس فيه", campusPh: "اكتب اسم معهدك، مثلاً: بريتانيا",
      fWalk: "مسافة المشي إلى معهدي", walkAny: "أي مسافة", walk10: "حتى ١٠ دقائق", walk15: "حتى ١٥ دقيقة", walk20: "حتى ٢٠ دقيقة", walk30: "حتى ٣٠ دقيقة",
      fArea: "المنطقة", fType: "نوع السكن", fWho: "من يسكن هنا", fPrice: "أعلى سعر (رينغيت ماليزي شهرياً)", fSort: "ترتيب النتائج",
      fStay: "الحد الأدنى للإقامة", stayAny: "أي مدة", stay1: "شهر واحد", stay3: "حتى ٣ أشهر", stay6: "حتى ٦ أشهر",
      all: "الكل", any: "أي سعر", room: "غرفة", studio: "استوديو", apartment: "شقة",
      sNear: "الأقرب إلى معهدي", sCheap: "الأقل سعراً",
      onlyAvail: "المتاح فقط", onlyVerified: "الموثّق فقط",
      vList: "قائمة", vMap: "خريطة",
      resultOne: "نتيجة", resultMany: "نتائج",
      empty: "لا توجد غرف مطابقة لبحثك. جرّب تغيير خيارات التصفية.",
      loadErr: "تعذّر تحميل الغرف. تحقق من اتصالك بالإنترنت ثم أعد تحميل الصفحة.",
      walkGroup: "على مسافة مشي (حتى ٢٠ دقيقة)", farGroup: "على بعد مشوار قصير",
      chooseCenter: "اختر معهد اللغة أعلاه لترى أوقات المشي وأقرب الغرف.",
      sgCenters: "معاهد اللغة والمناطق", sgArea: "منطقة", sgCentersOnly: "معاهد اللغة", sgAreas: "المباني والمناطق (إن لم يكن معهدك مدرجاً)", sgMap: "أماكن على الخريطة", sgSearching: "جارٍ البحث في الخريطة…",
      sgNone: "لا توجد نتيجة. جرّب اسم الشارع أو المبنى، أو حدّد الموقع على الخريطة.",
      sgError: "البحث في الخريطة غير متاح حالياً. يمكنك تحديد الموقع على الخريطة.",
      pinOption: "📍 لا تجده؟ حدّد الموقع على الخريطة", pinTitle: "أرِنا أين يقع معهد اللغة",
      pinHelp: "اضغط على الخريطة حيث يقع معهدك، وسنعرض لك أقرب الغرف إلى ذلك الموقع.", pinUse: "استخدم هذا الموقع", pinned: "الموقع الذي حددته",
      change: "تغيير", viewMap: "عرض في خرائط جوجل",
      foot: "سكن الطلاب في كوالالمبور وأمبانغ.",
      footNote: "تأكد دائماً من التفاصيل مع المالك قبل الدفع.",
      available: "متاح", reserved: "محجوز", taken: "تم تأجيره",
      walk: "دقيقة سيراً", ride: "دقيقة بالسيارة",
      perMonth: "شهرياً",
      furnished: "مفروش", unfurnished: "غير مفروش", bills: "الفواتير مشمولة", noBills: "الفواتير غير مشمولة",
      minStay: "الحد الأدنى للإقامة", minStayShort: "الحد الأدنى",
      g_mixed: "مختلط", g_women: "للنساء فقط", g_men: "للرجال فقط", g_family: "للعائلات",
      request: "أريد هذه الغرفة", cardWa: "اسأل عبر واتساب", notAvail: "غير متاحة حالياً",
      reqNote: "بنقرة واحدة: يفتح واتساب برسالة جاهزة عن هذه الغرفة.",
      msg: "مرحباً، أنا مهتم بهذا السكن الذي وجدته على موقع قريب: ",
      reserve: "احجز الآن", prevPhoto: "الصورة السابقة", nextPhoto: "الصورة التالية", costCard: "إجمالي الانتقال", costTitle: "التكلفة عند الانتقال", costAdvance: "إيجار مدفوع مقدماً", costDeposit: "وديعة التأمين", costUtil: "وديعة الخدمات (كهرباء وماء)", costTotal: "الإجمالي عند الانتقال", agrYes: "عقد إيجار مكتوب متوفر", agrNo: "العقد المكتوب: لم يتأكد بعد", costNote: "اطلب كتابةً شروط استرداد الوديعة قبل أن تدفع.",
      tourBtn: "اطلب جولة فيديو مباشرة", msgTour: "مرحباً، أرغب في جولة فيديو مباشرة لهذه الغرفة التي وجدتها على موقع قريب: ", tourTimes: "الأوقات المناسبة لي: ",
      resTitle: "احجز هذه الغرفة",
      resIntro: "سنحتفظ لك بالغرفة لمدة ٢٤ ساعة، ونؤكد الحجز عبر واتساب ونرسل لك تفاصيل العربون.",
      resName: "اسمك", resPhone: "رقم واتساب الخاص بك (مع رمز الدولة)", resSend: "تأكيد الحجز",
      resNote: "نستخدم اسمك ورقمك فقط للتواصل معك بخصوص هذا الحجز.",
      resNote2: "الحجز يحتفظ لك بالغرفة ٢٤ ساعة. ويمكنك أيضاً أن تسألنا عبر واتساب أولاً.",
      resDone: "تم حجز الغرفة لمدة ٢٤ ساعة",
      resDoneText: "أرسل لنا رسالة واتساب الآن لنؤكد حجزك ونرسل تفاصيل العربون. وإذا لم نسمع منك، تعود الغرفة إلى القائمة بعد ٢٤ ساعة.",
      resOpen: "افتح واتساب", resTaken: "عذراً، تم حجز هذه الغرفة للتو من شخص آخر.",
      resLimit: "لديك حجوزات قائمة بالفعل. يرجى التواصل معنا عبر واتساب.",
      resError: "تعذّر إكمال الحجز. حاول مرة أخرى أو اسألنا عبر واتساب.",
      resBadPhone: "أدخل رقم واتساب صحيحاً مع رمز الدولة.",
      msgReserve: "مرحباً، حجزت هذه الغرفة على موقع قريب وأرغب في تأكيد الحجز واستلام تفاصيل العربون: ",
      howTitle: "كيف يعمل الحجز",
      how1: "تحقق فريق قريب من هذه الغرفة: جولة فيديو مباشرة وهوية المالك.",
      how2: "الحجز يحتفظ لك بالغرفة لمدة ٢٤ ساعة.",
      how3: "نؤكد عبر واتساب ونرسل تفاصيل العربون. ادفع فقط إلى التفاصيل التي نرسلها لك، واحتفظ بالإيصال.",
      fromCampus: "المسافة من معهد اللغة", distNote: "أوقات المشي تقديرية.",
      directions: "عرض طريق المشي في خرائط جوجل",
      getting: "المواصلات", nearestStation: "أقرب محطة", nearestBus: "أقرب موقف حافلات", amenTitle: "المزايا",
      trustTitle: "التوثيق والخدمات القريبة",
      vVideo: "تمت جولة فيديو مباشرة", vOwner: "تم التحقق من هوية المالك", vVisit: "زيارة ميدانية من فريق قريب",
      notYet: "لم يتم بعد", mosque: "أقرب مسجد", halalFood: "أقرب طعام حلال", arabicHost: "المالك أو السكان يتحدثون العربية",
      arabicShort: "يتحدثون العربية", verified: "موثّق",
      yes: "نعم", unknown: "غير مؤكد",
      safeTitle: "للحفاظ على أمانك: لا تدفع قبل أن ترى السكن",
      safe1: "اطلب مكالمة فيديو مباشرة، أو زر السكن قبل الدفع.",
      safe2: "لا تدفع عربوناً بسبب عبارات مثل «بادر، فهناك من يريدها».",
      safe3: "لا تدفع إيجار ٦ أشهر أو أكثر مقدماً، واطلب عقد إيجار مكتوباً.",
      safe4: "ادفع إلى حساب المالك الموثّق، لا إلى اسم شخص لا تعرفه.",
      safe5: "هل تعرضت للاحتيال؟ اتصل بمركز الاستجابة الوطني للاحتيال في ماليزيا: 997"
    }
  };

  var lang = "en", view = "list", campus = null, map, markers = [], dmap, pinMap, pinMarker, pinLatLng;
  try { lang = localStorage.getItem("qareeb-lang") || "en"; } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k) { return T[lang][k] || k; };
  var pick = function (o) { return o[lang] || o.en; };

  // ---------------------------------------------------------------
  // small text helpers
  // ---------------------------------------------------------------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function plain(s) { return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }
  function safeUrl(u) { return /^https?:\/\//.test(u || "") ? esc(String(u).replace(/'/g, "%27")) : null; }

  function months(n) {
    if (lang === "ar") return n === 1 ? "شهر واحد" : n === 2 ? "شهران" : n <= 10 ? n + " أشهر" : n + " شهراً";
    return n === 1 ? "1 month" : n + " months";
  }
  function bedrooms(n) {
    if (lang === "ar") return n === 1 ? "غرفة نوم واحدة" : n === 2 ? "غرفتا نوم" : n + " غرف نوم";
    return n === 1 ? "1 bedroom" : n + " bedrooms";
  }
  // "5 min walk" / Arabic plural forms (دقيقة، دقيقتان، دقائق)
  function unit(n) { return n === 1 ? "دقيقة واحدة" : n === 2 ? "دقيقتان" : n <= 10 ? "دقائق" : "دقيقة"; }
  function numAr(n) { return n === 1 || n === 2 ? "" : n + " "; }
  function walkText(n) { return lang === "ar" ? numAr(n) + unit(n) + " سيراً" : n + " " + t("walk"); }
  function rideText(n) { return lang === "ar" ? numAr(n) + unit(n) + " بالسيارة" : n + " " + t("ride"); }
  function money(n) { return "RM " + Number(n).toLocaleString("en-US"); }

  // ---- distance: straight line x 1.3 to approximate real streets; walking ~80 m/min ----
  function distKm(a, b, c, d) {
    var R = 6371, rad = Math.PI / 180, dLat = (c - a) * rad, dLng = (d - b) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h)) * 1.3;
  }
  function trip(l, c) {
    var km = distKm(l.lat, l.lng, c.lat, c.lng), walk = Math.round(km * 1000 / 80);
    return { km: km, walk: walk, ride: Math.round(km * 2.5 + 3) };
  }
  function tripText(tr) {
    var km = "⁦" + tr.km.toFixed(1) + " km⁩";   // isolate, so "2.3 km" keeps its order inside Arabic text
    return tr.walk <= 30 ? "🚶 " + walkText(tr.walk) + " · " + km : "🚗 ~" + rideText(tr.ride) + " · " + km;
  }

  // ---------------------------------------------------------------
  // room blocks
  // ---------------------------------------------------------------
  function isVerified(l) { return l.trust.video && l.trust.owner; }
  function row(ok, label) { return '<li style="margin:4px 0">' + (ok ? "✅ " : "⬜ ") + label + (ok ? "" : ' <small style="color:var(--muted)">(' + t("notYet") + ")</small>") + "</li>"; }
  function trustHtml(l) {
    var x = l.trust;
    return '<div class="dist trust"><b>' + t("trustTitle") + '</b><ul style="list-style:none;padding:0;margin:8px 0 0">' +
      row(x.video, t("vVideo")) + row(x.owner, t("vOwner")) + row(x.visited, t("vVisit")) +
      '<li style="margin:4px 0">🕌 ' + t("mosque") + ": " + (x.mosque == null ? t("unknown") : "<b>" + walkText(x.mosque) + "</b>") + "</li>" +
      '<li style="margin:4px 0">🍽️ ' + t("halalFood") + ": " + (x.halal == null ? t("unknown") : "<b>" + walkText(x.halal) + "</b>") + "</li>" +
      '<li style="margin:4px 0">🗣️ ' + t("arabicHost") + ": " + (x.arabic ? "<b>" + t("yes") + "</b>" : t("unknown")) + "</li></ul></div>";
  }
  // Rooms Qareeb has verified can be reserved, so they get "how reserving works" instead of the generic warning.
  function canReserve(l) { return !!(SB && SB.url) && l.status === "available" && isVerified(l); }
  function safeHtml(l) {
    var v = l && isVerified(l), title = v ? t("howTitle") : t("safeTitle");
    var lines = v ? [t("how1"), t("how2"), t("how3")] : [t("safe1"), t("safe2"), t("safe3"), t("safe4")];
    return '<div class="dist safe"><b>🛡️ ' + title + '</b><ul style="margin:8px 0 0;padding-inline-start:20px"><li>' +
      lines.join("</li><li>") + '</li></ul><p style="margin:8px 0 0"><b>' + t("safe5") + "</b></p></div>";
  }
  function stationLabel(x) { return (x.name || "") + (x.type ? (x.name ? " (" : "") + x.type + (x.name ? ")" : "") : ""); }
  function transitLine(l) {
    var x = l.transit; if (!x || x.min == null) return "";
    return '<div class="fact">🚇 ' + walkText(x.min) + " · " + stationLabel(x) + "</div>";
  }
  function gettingHtml(l) {
    var x = l.transit || {}, items = [];
    if (x.min != null) items.push("🚇 " + t("nearestStation") + ": <b>" + stationLabel(x) + "</b> · " + walkText(x.min));
    if (x.bus != null) items.push("🚌 " + t("nearestBus") + ": <b>" + walkText(x.bus) + "</b>");
    return items.length ? '<div class="dist getting"><b>' + t("getting") + "</b><ul><li>" + items.join("</li><li>") + "</li></ul></div>" : "";
  }
  function amenHtml(l) {
    var keys = l.amenities || [];
    var chips = AMEN.filter(function (a) { return keys.indexOf(a.key) >= 0; }).map(function (a) { return '<span class="tag">' + a.icon + " " + (lang === "ar" ? a.ar : a.en) + "</span>"; }).join("");
    return chips ? '<div class="amen"><b>' + t("amenTitle") + '</b><div class="tags">' + chips + "</div></div>" : "";
  }

  function art(l) { return "background-image:linear-gradient(135deg," + l.colors[0] + "," + l.colors[1] + ")"; }
  function photoStyle(l) { return l.photos && l.photos.length ? "background-image:url('" + l.photos[0] + "')" : art(l); }

  // Area filter is built from the areas that actually have rooms
  function areaOptions() {
    var sel = $("area"), keep = sel.value, seen = {};
    LISTINGS.forEach(function (l) { seen[l.area] = true; });
    sel.innerHTML = '<option value="">' + t("all") + "</option>" + Object.keys(seen).sort().map(function (a) {
      return '<option value="' + a + '"' + (a === keep ? " selected" : "") + ">" + a + "</option>";
    }).join("");
  }

  function filtered() {
    var area = $("area").value, type = $("type").value, who = $("gender").value, max = +$("price").value || 1e9, only = $("onlyAvail").checked, ver = $("onlyVerified").checked, stay = +$("stay").value, wmax = campus ? +$("walkMax").value : 0;
    var out = LISTINGS.map(function (l) { return { l: l, tr: campus ? trip(l, campus) : null }; }).filter(function (x) {
      var l = x.l;
      return (!area || l.area === area) && (!type || l.type === type) && (!who || (l.gender || "mixed") === who) && l.price <= max && (!only || l.status === "available") && (!ver || isVerified(l)) && (!stay || l.minStay <= stay) && (!wmax || x.tr.walk <= wmax);
    });
    var s = $("sort").value;
    out.sort(function (a, b) { return s === "near" && campus ? a.tr.km - b.tr.km : a.l.price - b.l.price; });
    return out;
  }

  // ---- cost to move in ----
  function costParts(l) {
    var c = l.cost; if (!c) return null;
    var adv = Math.round(l.price * c.advance), dep = Math.round(l.price * c.deposit), util = c.util || 0;
    return { adv: adv, dep: dep, util: util, total: adv + dep + util, c: c };
  }
  function monthsDec(n) { return Number.isInteger(n) ? months(n) : (lang === "ar" ? n + " أشهر" : n + " months"); }
  function costLine(l) { var p = costParts(l); return p ? '<div class="fact">💳 ' + t("costCard") + ": <b>" + money(p.total) + "</b></div>" : ""; }
  function costHtml(l) {
    var p = costParts(l); if (!p) return "";
    function row(label, val, cls) { return '<div class="crow ' + (cls || "") + '"><span>' + label + "</span><b>" + money(val) + "</b></div>"; }
    return '<div class="dist cost"><b>' + t("costTitle") + "</b>" +
      (p.adv ? row(t("costAdvance") + " (" + monthsDec(p.c.advance) + ")", p.adv) : "") +
      row(t("costDeposit") + " (" + monthsDec(p.c.deposit) + ")", p.dep) +
      (p.util ? row(t("costUtil"), p.util) : "") +
      row(t("costTotal"), p.total, "total") +
      '<p class="small">' + (p.c.agreement ? "✅ " + t("agrYes") : "⬜ " + t("agrNo")) + "</p>" +
      '<p class="small">' + t("costNote") + "</p></div>";
  }

  // ---- picture slider: arrows, dots, swipe (scroll-snap) and keyboard arrows ----
  function slideCount(l) { return l.photos.length || 3; }
  function trackHtml(l) {
    if (l.photos.length) return '<div class="track">' + l.photos.map(function (p) { return '<div class="slide" style="background-image:url(\'' + p + '\')"></div>'; }).join("") + "</div>";
    return '<div class="track">' + [0, 1, 2].map(function (i) { return '<div class="slide" style="background-image:linear-gradient(' + (135 + i * 40) + "deg," + l.colors[0] + "," + l.colors[1] + ')">🏠</div>'; }).join("") + "</div>";
  }
  function navHtml(l) {
    var n = slideCount(l); if (n < 2) return "";
    var dots = ""; for (var i = 0; i < n; i++) dots += i === 0 ? '<i class="on"></i>' : "<i></i>";
    return '<button type="button" class="sl-btn prev" data-arrow="-1" aria-label="' + t("prevPhoto") + '"><span>‹</span></button><button type="button" class="sl-btn next" data-arrow="1" aria-label="' + t("nextPhoto") + '"><span>›</span></button><div class="sl-dots">' + dots + "</div>";
  }
  // dir: +1 = next picture, -1 = previous (Arabic pages scroll right-to-left, so the direction flips).
  // physical = true: dir is a screen direction (keyboard arrows): +1 = right
  function slideBy(el, dir, physical) {
    var box = el.closest(".ph, .slider"), tr = box && box.querySelector(".track");
    if (!tr) return;
    var rtl = document.documentElement.dir === "rtl";
    var px = physical ? dir : dir * (rtl ? -1 : 1);
    tr.scrollBy({ left: px * tr.clientWidth, behavior: "smooth" });
  }
  document.addEventListener("scroll", function (e) {   // keep the dots in step with the picture shown
    var tr = e.target; if (!tr || !tr.classList || !tr.classList.contains("track")) return;
    var box = tr.closest(".ph, .slider"), dots = box && box.querySelectorAll(".sl-dots i"); if (!dots || !dots.length) return;
    var idx = Math.round(Math.abs(tr.scrollLeft) / (tr.clientWidth || 1));
    dots.forEach(function (d, i) { d.classList.toggle("on", i === idx); });
  }, true);

  function card(x) {
    var l = x.l;
    var chips = (x.tr ? '<span class="walk ' + (x.tr.walk <= 15 ? "near" : "") + '">' + tripText(x.tr) + "</span>" : "") +
      (isVerified(l) ? '<span class="walk gold">✔ ' + t("verified") + "</span>" : "") +
      ((l.gender && l.gender !== "mixed") ? '<span class="walk who">' + t("g_" + l.gender) + "</span>" : "");
    var buttons = l.status !== "available" ? "" : canReserve(l)
      ? '<button type="button" class="btn wa" data-res="' + l.id + '">⚡ ' + t("reserve") + '</button><button type="button" class="btn alt" data-wa="' + l.id + '">💬 ' + t("cardWa") + "</button>"
      : '<button type="button" class="btn wa" data-wa="' + l.id + '">💬 ' + t("cardWa") + "</button>";
    return '<article class="card ' + (l.status === "taken" ? "dim" : "") + '" data-id="' + l.id + '" tabindex="0">' +
      '<div class="ph">' + trackHtml(l) + navHtml(l) + '<span class="badge ' + l.status + '">' + t(l.status) + "</span></div>" +
      '<div class="body"><h3>' + pick(l.title) + '</h3><div class="where">' + t(l.type) + " · " + l.area + "</div>" +
      (chips ? '<div class="chips">' + chips + "</div>" : "") +
      '<div class="stay">⏱ ' + t("minStayShort") + ": " + months(l.minStay) + "</div>" +
      '<div class="facts">' + transitLine(l) + costLine(l) + '<div class="fact">🕌 ' + (l.trust.mosque == null ? "–" : walkText(l.trust.mosque)) + (l.trust.arabic ? " · 🗣️ " + t("arabicShort") : "") + "</div></div>" +
      '<div class="buy"><div class="price">' + money(l.price) + " <small>" + t("perMonth") + "</small></div>" + buttons + "</div></div></article>";
  }

  function render() {
    var list = filtered(), g = $("grid"), html = "";
    $("count").textContent = list.length + " " + t(list.length === 1 ? "resultOne" : "resultMany");
    $("empty").textContent = loadFailed ? t("loadErr") : t("empty");
    $("empty").hidden = list.length > 0 && !loadFailed;
    if (!campus) html += '<p class="hint">' + t("chooseCenter") + "</p>";
    if (campus && $("sort").value === "near" && !+$("walkMax").value) {
      var near = list.filter(function (x) { return x.tr.walk <= WALK_LIMIT; }), far = list.filter(function (x) { return x.tr.walk > WALK_LIMIT; });
      if (near.length) html += '<h2 class="grp">' + t("walkGroup") + "</h2>" + near.map(card).join("");
      if (far.length) html += '<h2 class="grp">' + t("farGroup") + "</h2>" + far.map(card).join("");
    } else html += list.map(card).join("");
    g.innerHTML = html;
    if (map) renderMarkers(list);
  }

  function renderMarkers(list) {
    markers.forEach(function (m) { map.removeLayer(m); }); markers = [];
    var pts = [];
    if (campus) { markers.push(L.marker([campus.lat, campus.lng]).addTo(map).bindPopup("🎓 " + pick(campus.name))); pts.push([campus.lat, campus.lng]); }
    list.forEach(function (x) {
      var m = L.circleMarker([x.l.lat, x.l.lng], { radius: 10, color: "#fff", weight: 2, fillColor: x.l.status === "available" ? "#0f5c70" : "#8a5a00", fillOpacity: 1 }).addTo(map);
      m.bindTooltip(money(x.l.price)); m.on("click", function () { openDetail(x.l.id); }); markers.push(m); pts.push([x.l.lat, x.l.lng]);
    });
    if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 }); else map.setView([3.139, 101.687], 12);
  }

  function waLink(text) { return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(text); }

  // Direct request: records the interest and opens WhatsApp with a ready message.
  function askRoom(l) {
    sendRequest(l);
    window.open(waLink(t("msg") + plain(l.title.en) + " (#" + l.id + ", " + money(l.price) + (campus ? ", " + plain(pick(campus.name)) : "") + ")"), "_blank", "noopener");
  }
  // Live video tour: records the request and opens WhatsApp with a ready message (the student adds their times).
  function tourRoom(l) {
    sendRequest(l, "tour");
    window.open(waLink(t("msgTour") + plain(l.title.en) + " (#" + l.id + ", " + money(l.price) + (campus ? ", " + plain(pick(campus.name)) : "") + "). " + t("tourTimes")), "_blank", "noopener");
  }
  function roomById(id) { return LISTINGS.filter(function (x) { return x.id === id; })[0]; }

  // ---- Reserve now: holds a verified room for 24 hours (done safely inside the database) ----
  function reserveRoom(l, name, phone) {
    return fetch(SB.url + "/rest/v1/rpc/reserve_room", {
      method: "POST", headers: { apikey: SB.key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_listing_id: l.id, p_name: name, p_whatsapp: phone, p_center: campus ? campus.id : null })
    }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  function closeRes() { $("resModal").hidden = true; if ($("modal").hidden && $("pinModal").hidden) document.body.style.overflow = ""; }
  function openReserve(l) {
    $("resBody").innerHTML = "<h2>" + t("resTitle") + "</h2><p><b>" + pick(l.title) + "</b> · " + money(l.price) + " " + t("perMonth") + "</p><p>" + t("resIntro") + "</p>" +
      '<form id="resForm" class="req"><input id="resName" required maxlength="100" autocomplete="name" placeholder="' + t("resName") + '">' +
      '<input id="resPhone" required type="tel" inputmode="tel" minlength="6" maxlength="25" autocomplete="tel" placeholder="' + t("resPhone") + '">' +
      '<button class="btn wa" id="resSend" type="submit">⚡ ' + t("resSend") + '</button><p class="note">' + t("resNote") + '</p><p id="resMsg" class="note" role="alert"></p></form>';
    $("resModal").hidden = false; document.body.style.overflow = "hidden";
    $("resForm").onsubmit = function (e) {
      e.preventDefault();
      var name = $("resName").value.trim(), phone = $("resPhone").value.trim();
      if (!/^[0-9+\s-]{6,25}$/.test(phone)) { $("resMsg").textContent = t("resBadPhone"); return; }
      $("resSend").disabled = true; $("resMsg").textContent = "…";
      reserveRoom(l, name, phone).then(function (res) {
        if (res && res.ok) {
          l.status = "reserved"; render(); closeDetail();
          $("resBody").innerHTML = "<h2>✅ " + t("resDone") + "</h2><p>" + t("resDoneText") + '</p><div class="req"><button id="resWa" class="btn wa" type="button">💬 ' + t("resOpen") + "</button></div>";
          $("resWa").onclick = function () { window.open(waLink(t("msgReserve") + plain(l.title.en) + " (#" + l.id + ", " + money(l.price) + ") - " + name), "_blank", "noopener"); };
        } else {
          var why = res && res.reason;
          if (why === "taken" || why === "missing") { l.status = "reserved"; render(); }
          $("resMsg").textContent = t(why === "taken" || why === "missing" ? "resTaken" : why === "limit" ? "resLimit" : why === "invalid" ? "resBadPhone" : "resError");
          $("resSend").disabled = false;
        }
      }).catch(function () { $("resMsg").textContent = t("resError"); $("resSend").disabled = false; });
    };
  }

  function openDetail(id) {
    var l = LISTINGS.filter(function (x) { return x.id === id; })[0], tr = campus ? trip(l, campus) : null;
    var shots = (l.photos.length ? l.photos.map(function (p) { return '<img src="' + p + '" alt="">'; }) :
      [0, 1, 2].map(function (i) { return '<div style="background-image:linear-gradient(' + (135 + i * 40) + 'deg,' + l.colors[0] + ',' + l.colors[1] + ')">🏠</div>'; })).join("");
    var vid = l.video ? '<video controls preload="metadata" src="' + l.video + '" style="width:100%;margin-top:2px"></video>' : "";
    var ok = l.status === "available";
    var dist = campus
      ? '<div class="dist"><b>' + t("fromCampus") + ": " + pick(campus.name) + '</b><div style="margin-top:8px"><b>' + tripText(tr) + "</b></div>" +
        '<a href="https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=' + campus.lat + "," + campus.lng + "&destination=" + l.lat + "," + l.lng + '" target="_blank" rel="noopener" style="font-size:14px">' + t("directions") + '</a><div class="small">' + t("distNote") + "</div></div>"
      : '<div class="dist">' + t("chooseCenter") + "</div>";
    $("detail").innerHTML = '<div class="slider det"><div class="gallery track">' + shots + "</div>" + navHtml(l) + "</div>" + vid +
      '<div class="d"><span class="badge ' + l.status + '" style="position:static;border:1px solid var(--line)">' + t(l.status) + "</span>" +
      "<h2>" + pick(l.title) + "</h2>" +
      '<div class="price">' + money(l.price) + " <small>" + t("perMonth") + "</small></div>" +
      '<div class="tags"><span class="tag">' + t(l.type) + '</span><span class="tag">' + l.area + '</span><span class="tag">' + bedrooms(l.beds) +
      '</span><span class="tag stay-tag">⏱ ' + t("minStay") + ": " + months(l.minStay) + '</span><span class="tag">' + t(l.furnished ? "furnished" : "unfurnished") +
      '</span><span class="tag">' + t(l.bills ? "bills" : "noBills") + '</span><span class="tag">' + t("g_" + (l.gender || "mixed")) + "</span></div>" +
      "<p>" + pick(l.desc) + "</p>" + amenHtml(l) + dist + gettingHtml(l) + costHtml(l) +
      trustHtml(l) + '<div id="dmap" class="dmap"></div>' + safeHtml(l) +
      (ok ? '<div class="req">' + (canReserve(l)
          ? '<button id="resBtn" class="btn wa" type="button">⚡ ' + t("reserve") + '</button><button id="askBtn" class="btn alt" type="button">💬 ' + t("request") + "</button>"
          : '<button id="askBtn" class="btn wa" type="button">💬 ' + t("request") + "</button>") +
        '<button id="tourBtn" class="btn alt" type="button">🎥 ' + t("tourBtn") + '</button><p class="note">' + t(canReserve(l) ? "resNote2" : "reqNote") + "</p></div>"
        : '<span class="btn wa off">' + t("notAvail") + "</span>") + "</div>";
    $("modal").hidden = false; document.body.style.overflow = "hidden";
    if ($("askBtn")) $("askBtn").onclick = function () { askRoom(l); };
    if ($("resBtn")) $("resBtn").onclick = function () { openReserve(l); };
    if ($("tourBtn")) $("tourBtn").onclick = function () { tourRoom(l); };
    setTimeout(function () {
      if (dmap) dmap.remove();
      dmap = L.map("dmap", { scrollWheelZoom: false });
      L.tileLayer(OSM_TILES, { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(dmap);
      L.marker([l.lat, l.lng]).addTo(dmap);
      var pts = [[l.lat, l.lng]];
      if (campus) { L.marker([campus.lat, campus.lng]).addTo(dmap).bindTooltip("🎓"); L.polyline([[l.lat, l.lng], [campus.lat, campus.lng]], { color: "#0f5c70", dashArray: "6" }).addTo(dmap); pts.push([campus.lat, campus.lng]); }
      if (pts.length > 1) dmap.fitBounds(pts, { padding: [30, 30] }); else dmap.setView(pts[0], 15);
    }, 50);
  }
  function closeDetail() { $("modal").hidden = true; document.body.style.overflow = ""; if (dmap) { dmap.remove(); dmap = null; } }

  // ---------------------------------------------------------------
  // smart language-center search
  //   1) our own list (exact, instant)  2) free map search (streets, buildings, malls)
  //   3) drop a pin on the map when nothing matches
  // ---------------------------------------------------------------
  var sug = { local: [], geo: [], geoState: "idle", q: "", items: [] }, sugIdx = -1, geoTimer = null, geoCtl = null;
  var GENERIC = { language: 1, languages: 1, centre: 1, center: 1, centres: 1, centers: 1, international: 1, english: 1, academy: 1, school: 1, institute: 1, college: 1, the: 1, and: 1, kuala: 1, lumpur: 1, menara: 1, wisma: 1, bangunan: 1, plaza: 1, tower: 1, towers: 1, level: 1, floor: 1, jalan: 1, lorong: 1, block: 1, blok: 1, centre2: 1 };

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9؀-ۿ\s]/g, " ").replace(/\s+/g, " ").trim(); }
  function relevant(q, p) {
    var toks = norm(q).split(" ").filter(function (w) { return w.length >= 3 && !GENERIC[w]; });
    if (!toks.length) return true;
    var hay = norm([p.name, p.street, p.district, p.locality, p.city, p.suburb].join(" "));
    return toks.every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function localMatches(q) {
    var n = norm(q), toks = n ? n.split(" ") : [];
    return CAMPUSES.filter(function (c) {
      if (!toks.length) return c.group === "center";
      var hay = norm(plain(c.name.en) + " " + plain(c.name.ar));
      return toks.every(function (w) { return hay.indexOf(w) >= 0; });
    }).sort(function (a, b) {   // language centers first, then areas; each block in alphabetical order
      var ga = a.group === "area" ? 1 : 0, gb = b.group === "area" ? 1 : 0;
      return ga - gb || plain(pick(a.name)).localeCompare(plain(pick(b.name)), lang === "ar" ? "ar" : "en", { sensitivity: "base" });
    }).slice(0, 40);
  }
  // Center badge: the uploaded logo when there is one, otherwise a neutral badge with initials
  var GENERIC_INITIAL = { the: 1, language: 1, languages: 1, centre: 1, center: 1, centers: 1, centres: 1, international: 1, english: 1, academy: 1, of: 1, and: 1 };
  function initials(name) {
    var w = plain(name).replace(/\(.*?\)/g, "").split(/\s+/).filter(function (x) { return x && !GENERIC_INITIAL[x.toLowerCase()] && /^[A-Za-z0-9]/.test(x); });
    if (!w.length) return "?";
    return (w[1] ? w[0].charAt(0) + w[1].charAt(0) : w[0].slice(0, 2)).toUpperCase();
  }
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  var PIN_BADGE = '<span class="cbadge" style="background:#566468" aria-hidden="true">📍</span>';
  function centerBadge(c) {
    if (c.group !== "center") return PIN_BADGE;
    if (c.logo) return '<img class="clogo" src="' + c.logo + '" alt="" loading="lazy">';
    return '<span class="cbadge" style="background:hsl(' + hue(c.name.en) + ',45%,36%)" aria-hidden="true">' + esc(initials(c.name.en)) + "</span>";
  }
  function optLi(i, title, sub, badge) {
    var inner = title + (sub ? '<span class="sub">' + sub + "</span>" : "");
    return '<li role="option" id="sg' + i + '" data-i="' + i + '"' + (i === sugIdx ? ' class="on" aria-selected="true"' : "") + ">" + (badge ? '<span class="row">' + badge + "<span>" + inner + "</span></span>" : inner) + "</li>";
  }
  function renderSug() {
    var html = "", i = 0; sug.items = [];
    var lastGroup = "";
    sug.local.forEach(function (c) {
      if (c.group !== lastGroup) { lastGroup = c.group; html += '<li class="gh" role="presentation">' + t(c.group === "area" ? "sgAreas" : "sgCentersOnly") + "</li>"; }
      sug.items.push({ k: "local", c: c }); html += optLi(i++, pick(c.name), "", centerBadge(c));
    });
    if (sug.geoState === "loading") html += '<li class="note" role="presentation">' + t("sgSearching") + "</li>";
    if (sug.geo.length) html += '<li class="gh" role="presentation">' + t("sgMap") + "</li>";
    sug.geo.forEach(function (g) { sug.items.push({ k: "geo", g: g }); html += optLi(i++, g.name, g.sub, PIN_BADGE); });
    if (!sug.local.length && !sug.geo.length && sug.geoState !== "loading" && sug.q.trim().length >= 3) html += '<li class="note" role="presentation">' + (sug.geoState === "error" ? t("sgError") : t("sgNone")) + "</li>";
    sug.items.push({ k: "pin" }); html += optLi(i++, t("pinOption"), "");
    $("campusList").innerHTML = html; $("campusList").hidden = false; $("campusInput").setAttribute("aria-expanded", "true");
  }
  function closeSug() { $("campusList").hidden = true; $("campusInput").setAttribute("aria-expanded", "false"); sugIdx = -1; }

  function geoSearch(q) {
    if (geoCtl) geoCtl.abort();
    var ctl = geoCtl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 6000);
    sug.geoState = "loading"; renderSug();
    fetch("https://photon.komoot.io/api/?q=" + encodeURIComponent(q) + "&limit=8&lang=en&bbox=100.9,2.6,102.2,3.7", { signal: ctl.signal })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(to); if (ctl !== geoCtl) return;
        var seen = {};
        sug.geo = (j.features || []).filter(function (f) { return relevant(q, f.properties || {}); }).map(function (f) {
          var p = f.properties || {};
          return { name: esc(p.name || p.street || q), sub: esc([p.street && p.street !== p.name ? p.street : "", p.district || p.suburb || "", p.city || ""].filter(Boolean).join(", ")), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
        }).filter(function (g) { var k = g.name + "|" + g.sub; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 5);
        sug.geoState = sug.geo.length ? "ok" : "none"; renderSug();
      })
      .catch(function () { clearTimeout(to); if (ctl !== geoCtl) return; sug.geoState = "error"; renderSug(); });
  }

  function onSugInput() {
    var q = $("campusInput").value; sug.q = q; sug.local = localMatches(q); sug.geo = []; sug.geoState = "idle"; sugIdx = -1;
    clearTimeout(geoTimer);
    renderSug();
    if (q.trim().length >= 3 && !/[؀-ۿ]/.test(q)) geoTimer = setTimeout(function () { geoSearch(q.trim()); }, 500);
  }
  function chooseSug(i) {
    var it = sug.items[i]; if (!it) return;
    if (it.k === "local") setCampus(it.c);
    else if (it.k === "geo") setCampus({ id: "custom", group: "custom", name: { en: it.g.name, ar: it.g.name }, lat: it.g.lat, lng: it.g.lng }, "search", $("campusInput").value.trim());
    else openPin();
  }

  function storeCampus() {
    try {
      if (!campus) localStorage.removeItem("qareeb-center");
      else localStorage.setItem("qareeb-center", JSON.stringify(campus.group === "custom" ? { k: "custom", name: plain(campus.name.en), lat: campus.lat, lng: campus.lng } : { k: "list", id: campus.id }));
    } catch (e) {}
  }
  function restoreCampus() {
    try {
      var s = JSON.parse(localStorage.getItem("qareeb-center") || "null"); if (!s) return;
      if (s.k === "list") { var c = CAMPUSES.filter(function (x) { return x.id === s.id; })[0]; if (c) campus = c; }
      else if (s.k === "custom" && isFinite(s.lat) && isFinite(s.lng)) { var nm = esc(s.name || ""); campus = { id: "custom", group: "custom", name: { en: nm, ar: nm }, lat: +s.lat, lng: +s.lng }; }
    } catch (e) {}
  }
  // When a student picks a place that is not in our list, record what they were looking for,
  // so the owner can add that center. Only a name and a position are sent (no personal data).
  function logMissing(c, source, typed) {
    if (!SB || !SB.url || c.group !== "custom") return;
    var name = (typed || plain(c.name.en) || "").slice(0, 120);
    if (!name) return;
    fetch(SB.url + "/rest/v1/center_requests", {
      method: "POST", keepalive: true,
      headers: { apikey: SB.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ name: name, lat: c.lat, lng: c.lng, source: source })
    }).catch(function () {});
  }
  function setCampus(c, source, typed) { campus = c; storeCampus(); if (source) logMissing(c, source, typed); closeSug(); $("campusInput").value = ""; campusUI(); render(); }
  function campusUI() {
    var chosen = $("campusChosen");
    $("combo").hidden = !!campus; chosen.hidden = !campus; $("walkMax").disabled = !campus;
    if (campus) {
      chosen.innerHTML = '<span class="row">' + centerBadge(campus) + "<b>" + pick(campus.name) + '</b></span><a href="https://www.google.com/maps/search/?api=1&query=' + campus.lat + "," + campus.lng + '" target="_blank" rel="noopener">' + t("viewMap") + '</a><button type="button" class="linkbtn" id="campusChange">' + t("change") + "</button>";
      $("campusChange").onclick = function () { campus = null; storeCampus(); campusUI(); render(); $("campusInput").focus(); };
    }
  }

  // ---- drop a pin ----
  function openPin() {
    closeSug(); $("pinModal").hidden = false; document.body.style.overflow = "hidden"; pinLatLng = null; $("pinUse").disabled = true;
    setTimeout(function () {
      if (pinMap) { pinMap.remove(); pinMap = null; }
      pinMap = L.map("pinMap").setView([3.139, 101.687], 12); pinMarker = null;
      L.tileLayer(OSM_TILES, { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(pinMap);
      pinMap.on("click", function (e) { pinLatLng = e.latlng; if (pinMarker) pinMarker.setLatLng(e.latlng); else pinMarker = L.marker(e.latlng).addTo(pinMap); $("pinUse").disabled = false; });
    }, 60);
  }
  function closePin() { $("pinModal").hidden = true; document.body.style.overflow = ""; if (pinMap) { pinMap.remove(); pinMap = null; } }

  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    $("langBtn").textContent = lang === "ar" ? "English" : "العربية";
    $("close").setAttribute("aria-label", lang === "ar" ? "إغلاق" : "Close"); $("pinClose").setAttribute("aria-label", lang === "ar" ? "إغلاق" : "Close");
    closeSug(); campusUI(); areaOptions();
    $("navContact").href = waLink(lang === "ar" ? "مرحباً، لدي سؤال عن موقع قريب." : "Hello, I have a question about Qareeb.");
    $("menuBtn").setAttribute("aria-label", t("menuLabel"));
    render();
  }

  function setView(v) {
    view = v; $("grid").hidden = v === "map"; $("mapBox").hidden = v !== "map";
    document.querySelectorAll(".vbtn").forEach(function (b) { b.classList.toggle("on", b.dataset.view === v); });
    if (v === "map") {
      if (!map) { map = L.map("map"); L.tileLayer(OSM_TILES, { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map); }
      map.invalidateSize(); renderMarkers(filtered());
    }
  }

  // ---- Supabase (public "publishable" key only; Row Level Security protects the data) ----
  function sbGet(path) {
    return fetch(SB.url + "/rest/v1/" + path, { headers: { apikey: SB.key } }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  // One-tap request: no personal data is typed here. The student's real contact reaches you
  // through WhatsApp; this row just records that someone asked about this room.
  function sendRequest(l, kind) {
    if (!SB || !SB.url) return;
    fetch(SB.url + "/rest/v1/requests", {
      method: "POST", keepalive: true,
      headers: { apikey: SB.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ listing_id: l.id, name: "Quick request", whatsapp: "via WhatsApp", center: campus ? campus.id : null, kind: kind || "ask" })
    }).catch(function (e) { console.warn("Could not save request", e); });
  }
  var HEX = /^#[0-9a-fA-F]{6}$/;
  function mapListing(r) {
    var cols = (r.colors || []).filter(function (c) { return HEX.test(c); }); if (cols.length < 2) cols = ["#1f6f78", "#5aa9a8"];
    return {
      id: r.id, type: r.type, area: esc(r.area), price: r.price, status: (r.status === "reserved" && r.reserved_until && new Date(r.reserved_until) < new Date()) ? "available" : r.status, lat: r.lat, lng: r.lng, beds: r.beds,
      furnished: r.furnished, bills: r.bills, minStay: r.min_stay, gender: r.gender,
      title: { en: esc(r.title_en), ar: esc(r.title_ar || r.title_en) }, desc: { en: esc(r.desc_en), ar: esc(r.desc_ar || r.desc_en) },
      photos: (r.photos || []).map(safeUrl).filter(Boolean), video: safeUrl(r.video) || "", colors: cols,
      amenities: (r.amenities || []).filter(function (k) { return /^[a-z]+$/.test(k); }),
      cost: r.deposit_months == null ? null : { deposit: Number(r.deposit_months), advance: Number(r.advance_months || 0), util: Number(r.utility_deposit || 0), agreement: !!r.agreement_provided },
      transit: { name: esc(r.station_name || ""), type: esc(r.station_type || ""), min: r.station_min, bus: r.bus_min },
      trust: { video: r.v_video, owner: r.v_owner, visited: r.v_visited, mosque: r.mosque_min, halal: r.halal_min, arabic: r.arabic }
    };
  }
  function load() {
    if (!SB || !SB.url) return Promise.resolve();
    return Promise.all([sbGet("centers?select=*&order=sort"), sbGet("listings?select=*&order=id")]).then(function (res) {
      if (res[0].length) CAMPUSES = res[0].map(function (c) { return { id: c.id, group: c.grp, name: { en: esc(c.name_en), ar: esc(c.name_ar || c.name_en) }, lat: c.lat, lng: c.lng, logo: safeUrl(c.logo_url) || "" }; });
      LISTINGS = res[1].map(mapListing);
    }).catch(function (e) { console.warn("Could not load from Supabase", e); loadFailed = true; });
  }

  // ---------------------------------------------------------------
  // events
  // ---------------------------------------------------------------
  $("langBtn").onclick = function () { lang = lang === "ar" ? "en" : "ar"; try { localStorage.setItem("qareeb-lang", lang); } catch (e) {} applyLang(); };
  ["walkMax", "area", "type", "gender", "price", "stay", "sort", "onlyAvail", "onlyVerified"].forEach(function (id) { $(id).onchange = render; });
  document.querySelectorAll(".vbtn").forEach(function (b) { b.onclick = function () { setView(b.dataset.view); }; });
  $("grid").onclick = function (e) {
    var ar = e.target.closest("[data-arrow]");
    if (ar) { e.stopPropagation(); slideBy(ar, +ar.dataset.arrow); return; }
    var rs = e.target.closest("[data-res]");
    if (rs) { e.stopPropagation(); var rl = roomById(+rs.dataset.res); if (rl) openReserve(rl); return; }
    var w = e.target.closest("[data-wa]");
    if (w) { e.stopPropagation(); var l = roomById(+w.dataset.wa); if (l) askRoom(l); return; }
    var c = e.target.closest(".card"); if (c) openDetail(+c.dataset.id);
  };
  $("grid").onkeydown = function (e) {
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && e.target.closest(".card")) {   // keyboard arrows switch pictures
      e.preventDefault(); slideBy(e.target.closest(".card").querySelector(".ph"), e.key === "ArrowRight" ? 1 : -1, true); return;
    }
    if (e.target.closest("[data-wa],[data-res],[data-arrow]")) return;   // the buttons handle their own Enter/Space
    if (e.key === "Enter" || e.key === " ") { var c = e.target.closest(".card"); if (c) { e.preventDefault(); openDetail(+c.dataset.id); } }
  };
  $("close").onclick = closeDetail;
  $("resClose").onclick = closeRes;
  $("resModal").onclick = function (e) { if (e.target === $("resModal")) closeRes(); };
  $("modal").onclick = function (e) { if (e.target === $("modal")) closeDetail(); };
  $("pinClose").onclick = closePin;
  $("pinModal").onclick = function (e) { if (e.target === $("pinModal")) closePin(); };
  $("pinUse").onclick = function () {
    if (!pinLatLng) return;
    var typed = $("campusInput").value.trim(), en = typed ? esc(typed) : T.en.pinned, ar = typed ? esc(typed) : T.ar.pinned;
    closePin(); setCampus({ id: "custom", group: "custom", name: { en: en, ar: ar }, lat: pinLatLng.lat, lng: pinLatLng.lng }, "pin", typed);
  };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeRes(); closeDetail(); closePin(); closeSug(); closeMenu(); } });

  var inp = $("campusInput");
  inp.oninput = onSugInput;
  inp.onfocus = onSugInput;
  inp.onkeydown = function (e) {
    var n = sug.items.length;
    if (e.key === "ArrowDown") { e.preventDefault(); if ($("campusList").hidden) onSugInput(); sugIdx = (sugIdx + 1) % n; renderSug(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sugIdx = (sugIdx - 1 + n) % n; renderSug(); }
    else if (e.key === "Enter") { e.preventDefault(); chooseSug(sugIdx >= 0 ? sugIdx : 0); }
  };
  $("campusList").onmousedown = function (e) { var li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); chooseSug(+li.dataset.i); } };
  document.addEventListener("click", function (e) { if (!$("combo").contains(e.target)) closeSug(); });

  // ---- top menu bar: phone menu button, and the link for the section you are reading ----
  var menuBtn = $("menuBtn"), navEl = $("nav");
  function closeMenu() { navEl.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.onclick = function () { var open = navEl.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", open ? "true" : "false"); };
  navEl.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".top")) closeMenu(); });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) document.querySelectorAll(".nav a[href^=\"#\"]").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    ["rooms", "how"].forEach(function (id) { var el = $(id); if (el) io.observe(el); });
  }

  load().then(function () { restoreCampus(); applyLang(); });
})();
