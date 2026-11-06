(function () {
  "use strict";
  var CFG = window.QAREEB_CONFIG, SB = window.QAREEB_SUPABASE, CAMPUSES = window.CAMPUSES;
  // With Supabase configured, rooms come ONLY from the database (never show sample rooms on the live site).
  var LISTINGS = SB && SB.url ? [] : window.LISTINGS, loadFailed = false;

  // ---------------------------------------------------------------
  // ALL VISIBLE TEXT LIVES HERE (English and Arabic)
  // ---------------------------------------------------------------
  var T = {
    en: {
      heroTitle: "Find a trusted room near your language center",
      heroSub: "Compare rooms, see what has been verified, and know your walking time before you pay.",
      fCampus: "My language center", fArea: "Area", fType: "Type of place", fPrice: "Maximum price (RM per month)", fSort: "Sort by",
      fStay: "Minimum stay", stayAny: "Any", stay1: "1 month", stay3: "Up to 3 months", stay6: "Up to 6 months",
      gCenters: "Language centers", gAreas: "My center is not listed: choose an area",
      all: "All", any: "Any", room: "Room", studio: "Studio", apartment: "Apartment",
      sNear: "Closest to my center", sCheap: "Lowest price",
      onlyAvail: "Available rooms only", onlyVerified: "Verified rooms only",
      vList: "List", vMap: "Map",
      resultOne: "room found", resultMany: "rooms found",
      empty: "No rooms match your search. Try changing the filters.",
      loadErr: "We could not load the rooms. Please check your internet connection and reload the page.",
      ownerTitle: "Own a room or apartment near a language center?",
      ownerText: "List it on Qareeb and reach students looking for a place in your area.",
      ownerBtn: "Contact us on WhatsApp",
      foot: "Student housing in Kuala Lumpur and Ampang.",
      footNote: "Always confirm the details with the owner before you pay.",
      available: "Available", reserved: "Reserved", taken: "Rented",
      perMonth: "per month", walk: "min walk", ride: "min by car",
      furnished: "Furnished", unfurnished: "Unfurnished", bills: "Bills included", noBills: "Bills not included",
      minStay: "Minimum stay", minStayShort: "Min. stay",
      g_mixed: "Mixed", g_women: "Women only", g_men: "Men only", g_family: "Families",
      request: "I want this room", notAvail: "Not available at the moment",
      reqNote: "One tap: WhatsApp opens with a ready message about this room.",
      msg: "Hello, I am interested in this accommodation I found on Qareeb: ",
      fromCampus: "Distance from your language center", distNote: "Walking times are estimates.",
      directions: "View the walking route in Google Maps",
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
      heroTitle: "ابحث عن سكن موثوق قريب من مركز اللغة",
      heroSub: "قارن بين الغرف، واعرف ما تم التحقق منه ووقت المشي إلى مركزك قبل أن تدفع.",
      fCampus: "مركز اللغة الذي أدرس فيه", fArea: "المنطقة", fType: "نوع السكن", fPrice: "أعلى سعر (رينغيت ماليزي شهرياً)", fSort: "ترتيب النتائج",
      fStay: "الحد الأدنى للإقامة", stayAny: "أي مدة", stay1: "شهر واحد", stay3: "حتى ٣ أشهر", stay6: "حتى ٦ أشهر",
      gCenters: "مراكز اللغة", gAreas: "مركزي غير مدرج: اختر المنطقة",
      all: "الكل", any: "أي سعر", room: "غرفة", studio: "استوديو", apartment: "شقة",
      sNear: "الأقرب إلى مركزي", sCheap: "الأقل سعراً",
      onlyAvail: "المتاح فقط", onlyVerified: "الموثّق فقط",
      vList: "قائمة", vMap: "خريطة",
      resultOne: "نتيجة", resultMany: "نتائج",
      empty: "لا توجد غرف مطابقة لبحثك. جرّب تغيير خيارات التصفية.",
      loadErr: "تعذّر تحميل الغرف. تحقق من اتصالك بالإنترنت ثم أعد تحميل الصفحة.",
      ownerTitle: "هل تملك غرفة أو شقة قريبة من مركز لغة؟",
      ownerText: "أضف سكنك في «قريب» لتصل إلى الطلاب الباحثين عن سكن في منطقتك.",
      ownerBtn: "تواصل معنا عبر واتساب",
      foot: "سكن الطلاب في كوالالمبور وأمبانغ.",
      footNote: "تأكد دائماً من التفاصيل مع المالك قبل الدفع.",
      available: "متاح", reserved: "محجوز", taken: "تم تأجيره",
      perMonth: "شهرياً", walk: "دقيقة سيراً", ride: "دقيقة بالسيارة",
      furnished: "مفروش", unfurnished: "غير مفروش", bills: "الفواتير مشمولة", noBills: "الفواتير غير مشمولة",
      minStay: "الحد الأدنى للإقامة", minStayShort: "الحد الأدنى",
      g_mixed: "مختلط", g_women: "للنساء فقط", g_men: "للرجال فقط", g_family: "للعائلات",
      request: "أريد هذه الغرفة", notAvail: "غير متاحة حالياً",
      reqNote: "بنقرة واحدة: يفتح واتساب برسالة جاهزة عن هذه الغرفة.",
      msg: "مرحباً، أنا مهتم بهذا السكن الذي وجدته على موقع قريب: ",
      fromCampus: "المسافة من مركز اللغة", distNote: "أوقات المشي تقديرية.",
      directions: "عرض طريق المشي في خرائط جوجل",
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

  var lang = "en", view = "list", campus = CAMPUSES[0], map, markers = [], dmap;
  try { lang = localStorage.getItem("qareeb-lang") || "en"; } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k) { return T[lang][k] || k; };
  var pick = function (o) { return o[lang] || o.en; };

  // "1 month", "3 months" / Arabic plural forms
  function months(n) {
    if (lang === "ar") return n === 1 ? "شهر واحد" : n === 2 ? "شهران" : n <= 10 ? n + " أشهر" : n + " شهراً";
    return n === 1 ? "1 month" : n + " months";
  }
  function bedrooms(n) {
    if (lang === "ar") return n === 1 ? "غرفة نوم واحدة" : n === 2 ? "غرفتا نوم" : n + " غرف نوم";
    return n === 1 ? "1 bedroom" : n + " bedrooms";
  }
  // "5 min walk" / Arabic plural forms (دقيقة، دقيقتان، دقائق)
  function mins(n) {
    if (lang !== "ar") return n + " ";
    return n === 1 ? "" : n === 2 ? "" : n + " ";
  }
  function unit(n, word) {
    if (lang !== "ar") return word;
    return n === 1 ? "دقيقة واحدة" : n === 2 ? "دقيقتان" : n <= 10 ? "دقائق" : "دقيقة";
  }
  function walkText(n) { return lang === "ar" ? mins(n) + unit(n) + " سيراً" : n + " " + t("walk"); }
  function rideText(n) { return lang === "ar" ? mins(n) + unit(n) + " بالسيارة" : n + " " + t("ride"); }
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
    var km = tr.km.toFixed(1) + " km";
    return tr.walk <= 30 ? "🚶 " + walkText(tr.walk) + " · " + km : "🚗 ~" + rideText(tr.ride) + " · " + km;
  }

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
  function safeHtml() {
    return '<div class="dist safe"><b>🛡️ ' + t("safeTitle") + '</b><ul style="margin:8px 0 0;padding-inline-start:20px"><li>' +
      [t("safe1"), t("safe2"), t("safe3"), t("safe4")].join("</li><li>") + '</li></ul><p style="margin:8px 0 0"><b>' + t("safe5") + "</b></p></div>";
  }

  function campusOptions() {
    function opt(c) { return '<option value="' + c.id + '"' + (c.id === campus.id ? " selected" : "") + ">" + pick(c.name) + "</option>"; }
    function grp(g, label) { return '<optgroup label="' + label + '">' + CAMPUSES.filter(function (c) { return c.group === g; }).map(opt).join("") + "</optgroup>"; }
    return grp("center", t("gCenters")) + grp("area", t("gAreas"));
  }

  // Area filter is built from the areas that actually have rooms
  function areaOptions() {
    var sel = $("area"), keep = sel.value, seen = {};
    LISTINGS.forEach(function (l) { seen[l.area] = true; });
    sel.innerHTML = '<option value="">' + t("all") + "</option>" + Object.keys(seen).sort().map(function (a) {
      return '<option value="' + a + '"' + (a === keep ? " selected" : "") + ">" + a + "</option>";
    }).join("");
  }

  function art(l) { return "background-image:linear-gradient(135deg," + l.colors[0] + "," + l.colors[1] + ")"; }
  function photoStyle(l) { return l.photos && l.photos.length ? "background-image:url('" + l.photos[0] + "')" : art(l); }

  function filtered() {
    var area = $("area").value, type = $("type").value, max = +$("price").value || 1e9, only = $("onlyAvail").checked, ver = $("onlyVerified").checked, stay = +$("stay").value;
    var out = LISTINGS.filter(function (l) {
      return (!area || l.area === area) && (!type || l.type === type) && l.price <= max && (!only || l.status === "available") && (!ver || isVerified(l)) && (!stay || l.minStay <= stay);
    }).map(function (l) { return { l: l, tr: trip(l, campus) }; });
    var s = $("sort").value;
    out.sort(function (a, b) { return s === "cheap" ? a.l.price - b.l.price : a.tr.km - b.tr.km; });
    return out;
  }

  function render() {
    var list = filtered(), g = $("grid");
    $("count").textContent = list.length + " " + t(list.length === 1 ? "resultOne" : "resultMany");
    $("empty").textContent = loadFailed ? t("loadErr") : t("empty");
    $("empty").hidden = list.length > 0 && !loadFailed;
    g.innerHTML = list.map(function (x) {
      var l = x.l;
      return '<article class="card ' + (l.status === "taken" ? "dim" : "") + '" data-id="' + l.id + '" tabindex="0" role="button">' +
        '<div class="ph" style="' + photoStyle(l) + '"><span class="badge ' + l.status + '">' + t(l.status) + "</span>" + (l.photos.length ? "" : "🏠") + "</div>" +
        '<div class="body"><h3>' + pick(l.title) + '</h3><div class="meta">' + t(l.type) + " · " + l.area + '</div>' +
        '<span class="walk">' + tripText(x.tr) + '</span>' +
        (isVerified(l) ? '<span class="walk gold">✔ ' + t("verified") + "</span>" : "") +
        '<div class="meta" style="margin-top:8px">⏱ ' + t("minStayShort") + ": " + months(l.minStay) + "</div>" +
        '<div class="meta">🕌 ' + (l.trust.mosque == null ? "–" : walkText(l.trust.mosque)) + (l.trust.arabic ? " · 🗣️ " + t("arabicShort") : "") + "</div>" +
        '<div class="price">' + money(l.price) + " <small>" + t("perMonth") + "</small></div></div></article>";
    }).join("");
    if (map) renderMarkers(list);
  }

  function renderMarkers(list) {
    markers.forEach(function (m) { map.removeLayer(m); }); markers = [];
    var cm = L.marker([campus.lat, campus.lng]).addTo(map).bindPopup("🎓 " + pick(campus.name)); markers.push(cm);
    list.forEach(function (x) {
      var m = L.circleMarker([x.l.lat, x.l.lng], { radius: 10, color: "#fff", weight: 2, fillColor: x.l.status === "available" ? "#0f5c70" : "#8a5a00", fillOpacity: 1 }).addTo(map);
      m.bindTooltip(money(x.l.price)); m.on("click", function () { openDetail(x.l.id); }); markers.push(m);
    });
    var pts = list.map(function (x) { return [x.l.lat, x.l.lng]; }).concat([[campus.lat, campus.lng]]);
    map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
  }

  function waLink(text) { return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(text); }
  function plain(s) { return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }

  function openDetail(id) {
    var l = LISTINGS.filter(function (x) { return x.id === id; })[0], tr = trip(l, campus);
    var shots = (l.photos.length ? l.photos.map(function (p) { return '<img src="' + p + '" alt="">'; }) :
      [0, 1, 2].map(function (i) { return '<div style="background-image:linear-gradient(' + (135 + i * 40) + 'deg,' + l.colors[0] + ',' + l.colors[1] + ')">🏠</div>'; })).join("");
    var vid = l.video ? '<video controls preload="metadata" src="' + l.video + '" style="width:100%;margin-top:2px"></video>' : "";
    var ok = l.status === "available";
    var gm = "https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=" + campus.lat + "," + campus.lng + "&destination=" + l.lat + "," + l.lng;
    var opts = campusOptions();
    $("detail").innerHTML = '<div class="gallery">' + shots + "</div>" + vid +
      '<div class="d"><span class="badge ' + l.status + '" style="position:static;border:1px solid var(--line)">' + t(l.status) + "</span>" +
      "<h2>" + pick(l.title) + "</h2>" +
      '<div class="price">' + money(l.price) + " <small>" + t("perMonth") + "</small></div>" +
      '<div class="tags"><span class="tag">' + t(l.type) + '</span><span class="tag">' + l.area + '</span><span class="tag">' + bedrooms(l.beds) +
      '</span><span class="tag">⏱ ' + t("minStay") + ": " + months(l.minStay) + '</span><span class="tag">' + t(l.furnished ? "furnished" : "unfurnished") +
      '</span><span class="tag">' + t(l.bills ? "bills" : "noBills") + '</span><span class="tag">' + t("g_" + (l.gender || "mixed")) + "</span></div>" +
      "<p>" + pick(l.desc) + "</p>" +
      '<div class="dist"><label for="dCampus">' + t("fromCampus") + '</label><select id="dCampus">' + opts + '</select><div style="margin-top:8px" id="dTrip"><b>' + tripText(tr) + "</b></div>" +
      '<a href="' + gm + '" target="_blank" rel="noopener" style="font-size:14px">' + t("directions") + '</a><div class="small">' + t("distNote") + "</div></div>" +
      trustHtml(l) + '<div id="dmap" class="dmap"></div>' + safeHtml() +
      (ok ? '<div class="req"><button id="askBtn" class="btn wa" type="button">💬 ' + t("request") + '</button><p class="note">' + t("reqNote") + "</p></div>"
        : '<span class="btn wa off">' + t("notAvail") + "</span>") + "</div>";
    $("modal").hidden = false; document.body.style.overflow = "hidden";
    if ($("askBtn")) $("askBtn").onclick = function () {
      sendRequest(l);   // counts the interest in the background
      window.open(waLink(t("msg") + plain(l.title.en) + " (#" + l.id + ", " + money(l.price) + ", " + plain(pick(campus.name)) + ")"), "_blank", "noopener");
    };
    $("dCampus").onchange = function () {
      campus = CAMPUSES.filter(function (c) { return c.id === this.value; }.bind(this))[0]; $("campus").value = campus.id; render(); openDetail(id);
    };
    setTimeout(function () {
      if (dmap) dmap.remove();
      dmap = L.map("dmap", { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(dmap);
      L.marker([l.lat, l.lng]).addTo(dmap); L.marker([campus.lat, campus.lng]).addTo(dmap).bindTooltip("🎓");
      L.polyline([[l.lat, l.lng], [campus.lat, campus.lng]], { color: "#0f5c70", dashArray: "6" }).addTo(dmap);
      dmap.fitBounds([[l.lat, l.lng], [campus.lat, campus.lng]], { padding: [30, 30] });
    }, 50);
  }
  function closeDetail() { $("modal").hidden = true; document.body.style.overflow = ""; if (dmap) { dmap.remove(); dmap = null; } }

  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $("langBtn").textContent = lang === "ar" ? "English" : "العربية";
    $("close").setAttribute("aria-label", lang === "ar" ? "إغلاق" : "Close");
    $("campus").innerHTML = campusOptions();
    areaOptions();
    $("ownerBtn").href = waLink(lang === "ar" ? "مرحباً، لدي سكن وأرغب في إضافته إلى موقع قريب." : "Hello, I have accommodation and would like to list it on Qareeb.");
    render();
  }

  function setView(v) {
    view = v; $("grid").hidden = v === "map"; $("mapBox").hidden = v !== "map";
    document.querySelectorAll(".vbtn").forEach(function (b) { b.classList.toggle("on", b.dataset.view === v); });
    if (v === "map") {
      if (!map) {
        map = L.map("map");
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
      }
      map.invalidateSize(); renderMarkers(filtered());
    }
  }

  // ---- Supabase (public "publishable" key only; Row Level Security protects the data) ----
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//.test(u || "") ? esc(String(u).replace(/'/g, "%27")) : null; }
  function sbGet(path) {
    return fetch(SB.url + "/rest/v1/" + path, { headers: { apikey: SB.key } }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  // One-tap request: no personal data is typed here. The student's real contact reaches you
  // through WhatsApp; this row just records that someone asked about this room.
  function sendRequest(l) {
    if (!SB || !SB.url) return;
    fetch(SB.url + "/rest/v1/requests", {
      method: "POST", keepalive: true,
      headers: { apikey: SB.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ listing_id: l.id, name: "Quick request", whatsapp: "via WhatsApp", center: campus.id })
    }).catch(function (e) { console.warn("Could not save request", e); });
  }
  var HEX = /^#[0-9a-fA-F]{6}$/;
  function mapListing(r) {
    var cols = (r.colors || []).filter(function (c) { return HEX.test(c); }); if (cols.length < 2) cols = ["#1f6f78", "#5aa9a8"];
    return {
      id: r.id, type: r.type, area: esc(r.area), price: r.price, status: r.status, lat: r.lat, lng: r.lng, beds: r.beds,
      furnished: r.furnished, bills: r.bills, minStay: r.min_stay, gender: r.gender,
      title: { en: esc(r.title_en), ar: esc(r.title_ar || r.title_en) }, desc: { en: esc(r.desc_en), ar: esc(r.desc_ar || r.desc_en) },
      photos: (r.photos || []).map(safeUrl).filter(Boolean), video: safeUrl(r.video) || "", colors: cols,
      trust: { video: r.v_video, owner: r.v_owner, visited: r.v_visited, mosque: r.mosque_min, halal: r.halal_min, arabic: r.arabic }
    };
  }
  function load() {
    if (!SB || !SB.url) return Promise.resolve();
    return Promise.all([sbGet("centers?select=*&order=sort"), sbGet("listings?select=*&order=id")]).then(function (res) {
      if (res[0].length) CAMPUSES = res[0].map(function (c) { return { id: c.id, group: c.grp, name: { en: esc(c.name_en), ar: esc(c.name_ar || c.name_en) }, lat: c.lat, lng: c.lng }; });
      campus = CAMPUSES[0];
      LISTINGS = res[1].map(mapListing);
    }).catch(function (e) { console.warn("Could not load from Supabase", e); loadFailed = true; });
  }

  $("langBtn").onclick = function () { lang = lang === "ar" ? "en" : "ar"; try { localStorage.setItem("qareeb-lang", lang); } catch (e) {} applyLang(); };
  $("campus").onchange = function () { campus = CAMPUSES.filter(function (c) { return c.id === $("campus").value; })[0]; render(); };
  ["area", "type", "price", "stay", "sort", "onlyAvail", "onlyVerified"].forEach(function (id) { $(id).onchange = render; });
  document.querySelectorAll(".vbtn").forEach(function (b) { b.onclick = function () { setView(b.dataset.view); }; });
  $("grid").onclick = function (e) { var c = e.target.closest(".card"); if (c) openDetail(+c.dataset.id); };
  $("grid").onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { var c = e.target.closest(".card"); if (c) { e.preventDefault(); openDetail(+c.dataset.id); } } };
  $("close").onclick = closeDetail;
  $("modal").onclick = function (e) { if (e.target === $("modal")) closeDetail(); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDetail(); });

  load().then(applyLang);
})();
