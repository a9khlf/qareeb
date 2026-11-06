(function () {
  "use strict";
  var CFG = window.QAREEB_CONFIG, CAMPUSES = window.CAMPUSES, LISTINGS = window.LISTINGS;

  var T = {
    en: {
      logoAr: "قريب", heroTitle: "Find a room close to your language center",
      heroSub: "Photos, videos, availability and walking time. All in one link.",
      fCampus: "My language center", fArea: "Area", fType: "Type", fPrice: "Max price (RM/month)", fSort: "Sort by", fStay: "Stay length", stayAny: "Any length", stay1: "1 month", stay3: "Up to 3 months", stay6: "Up to 6 months", minStay: "Minimum stay", mo: "mo", gCenters: "Language centers", gAreas: "My center is not listed: choose area",
      all: "All", any: "Any", room: "Room", studio: "Studio", apartment: "Apartment",
      sNear: "Closest first", sCheap: "Cheapest first", onlyAvail: "Show available only",
      vList: "List", vMap: "Map", empty: "No rooms match your search. Try changing the filters.",
      ownerTitle: "Have a room to rent?", ownerText: "List it on Qareeb and reach students looking near their campus.",
      ownerBtn: "Contact us on WhatsApp", foot: "Student housing in Kuala Lumpur and Ampang",
      available: "Available", reserved: "Reserved", taken: "Taken",
      perMonth: "/month", walk: "min walk", ride: "min by car", away: "away",
      furnished: "Furnished", unfurnished: "Unfurnished", bills: "Bills included", noBills: "Bills not included",
      beds: "bedroom(s)", results: "rooms", request: "I want this room", notAvail: "Not available now",
      fromCampus: "From your language center", directions: "Open walking route in Google Maps", video: "Watch video",
      msg: "Hello Qareeb, I am interested in this accommodation: ",
      verified: "Verified", onlyVerified: "Verified only", trustTitle: "Trust and lifestyle",
      vVideo: "Live video tour done", vOwner: "Owner identity checked", vVisit: "Visited by Qareeb team",
      notYet: "Not yet checked", mosque: "Nearest mosque", halalFood: "Halal food", arabicHost: "Arabic-speaking owner or tenants",
      yes: "Yes", unknown: "Not confirmed", safeTitle: "Stay safe: never pay before you see",
      safe1: "Ask for a live video call or visit the place first.",
      safe2: "Do not pay a deposit because someone says \"hurry, others want it\".",
      safe3: "Never pay 6 months or more upfront. Get a written tenancy agreement.",
      safe4: "Pay to the owner's verified account, not a personal name you don't know.",
      safe5: "Scammed? Call the National Scam Response Centre: 997"
    },
    ar: {
      logoAr: "Qareeb", heroTitle: "اعثر على سكن قريب من مركز اللغة",
      heroSub: "صور وفيديو والتوفر ووقت المشي. كل شيء في رابط واحد.",
      fCampus: "مركز اللغة الخاص بي", fArea: "المنطقة", fType: "النوع", fPrice: "أقصى سعر (رينغيت/شهر)", fSort: "ترتيب حسب", fStay: "مدة الإقامة", stayAny: "أي مدة", stay1: "شهر واحد", stay3: "حتى ٣ أشهر", stay6: "حتى ٦ أشهر", minStay: "الحد الأدنى للإقامة", mo: "شهر", gCenters: "مراكز اللغة", gAreas: "مركزي غير موجود: اختر المنطقة",
      all: "الكل", any: "أي", room: "غرفة", studio: "ستوديو", apartment: "شقة",
      sNear: "الأقرب أولاً", sCheap: "الأرخص أولاً", onlyAvail: "إظهار المتاح فقط",
      vList: "قائمة", vMap: "خريطة", empty: "لا توجد نتائج. جرّب تغيير الفلاتر.",
      ownerTitle: "عندك غرفة للإيجار؟", ownerText: "أضفها في قريب لتصل إلى الطلاب الباحثين قرب جامعاتهم.",
      ownerBtn: "تواصل معنا عبر واتساب", foot: "سكن الطلاب في كوالالمبور وأمبانغ",
      available: "متاح", reserved: "محجوز", taken: "تم التأجير",
      perMonth: "/شهر", walk: "دقيقة مشياً", ride: "دقيقة بالسيارة", away: "",
      furnished: "مفروش", unfurnished: "غير مفروش", bills: "الفواتير مشمولة", noBills: "الفواتير غير مشمولة",
      beds: "غرفة نوم", results: "نتيجة", request: "أريد هذه الغرفة", notAvail: "غير متاح حالياً",
      fromCampus: "من مركز اللغة", directions: "افتح طريق المشي في خرائط جوجل", video: "شاهد الفيديو",
      msg: "مرحباً قريب، أنا مهتم بهذا السكن: ",
      verified: "موثّق", onlyVerified: "الموثّق فقط", trustTitle: "الثقة ونمط الحياة",
      vVideo: "تمت جولة فيديو مباشرة", vOwner: "تم التحقق من هوية المالك", vVisit: "زاره فريق قريب",
      notYet: "لم يتم بعد", mosque: "أقرب مسجد", halalFood: "طعام حلال", arabicHost: "المالك أو السكان يتحدثون العربية",
      yes: "نعم", unknown: "غير مؤكد", safeTitle: "حافظ على أمانك: لا تدفع قبل أن ترى",
      safe1: "اطلب مكالمة فيديو مباشرة أو زر المكان أولاً.",
      safe2: "لا تدفع عربوناً لأن أحدهم يقول \"استعجل، غيرك يريدها\".",
      safe3: "لا تدفع ٦ أشهر أو أكثر مقدماً. احصل على عقد إيجار مكتوب.",
      safe4: "ادفع لحساب المالك الموثّق وليس لاسم شخصي لا تعرفه.",
      safe5: "تعرضت للاحتيال؟ اتصل بمركز الاستجابة الوطني للاحتيال: 997"
    }
  };

  var lang = "en", view = "list", campus = CAMPUSES[0], map, markers = [], dmap;
  try { lang = localStorage.getItem("qareeb-lang") || "en"; } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k) { return T[lang][k] || k; };
  var pick = function (o) { return o[lang] || o.en; };

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
    return tr.walk <= 30 ? "🚶 " + tr.walk + " " + t("walk") + " · " + km : "🚗 ~" + tr.ride + " " + t("ride") + " · " + km;
  }

  function isVerified(l) { return l.trust.video && l.trust.owner; }
  function row(ok, label) { return '<li style="margin:4px 0">' + (ok ? "✅ " : "⬜ ") + label + (ok ? "" : ' <small style="color:var(--muted)">(' + t("notYet") + ")</small>") + "</li>"; }
  function trustHtml(l) {
    var x = l.trust;
    return '<div class="dist trust"><b>' + t("trustTitle") + '</b><ul style="list-style:none;padding:0;margin:8px 0 0">' +
      row(x.video, t("vVideo")) + row(x.owner, t("vOwner")) + row(x.visited, t("vVisit")) +
      '<li style="margin:4px 0">🕌 ' + t("mosque") + ": " + (x.mosque == null ? t("unknown") : "<b>" + x.mosque + " " + t("walk") + "</b>") + "</li>" +
      '<li style="margin:4px 0">🍽️ ' + t("halalFood") + ": " + (x.halal == null ? t("unknown") : "<b>" + x.halal + " " + t("walk") + "</b>") + "</li>" +
      '<li style="margin:4px 0">🗣️ ' + t("arabicHost") + ": " + (x.arabic ? "<b>" + t("yes") + "</b>" : t("unknown")) + "</li></ul></div>";
  }
  function safeHtml() {
    return '<div class="dist safe"><b>🛡️' + t("safeTitle") + '</b><ul style="margin:8px 0 0;padding-inline-start:20px"><li>' +
      [t("safe1"), t("safe2"), t("safe3"), t("safe4")].join("</li><li>") + '</li></ul><p style="margin:8px 0 0"><b>' + t("safe5") + "</b></p></div>";
  }

  function campusOptions() {
    function opt(c) { return '<option value="' + c.id + '"' + (c.id === campus.id ? " selected" : "") + ">" + pick(c.name) + "</option>"; }
    function grp(g, label) { return '<optgroup label="' + label + '">' + CAMPUSES.filter(function (c) { return c.group === g; }).map(opt).join("") + "</optgroup>"; }
    return grp("center", t("gCenters")) + grp("area", t("gAreas"));
  }

  function art(l, big) {
    return "background-image:linear-gradient(135deg," + l.colors[0] + "," + l.colors[1] + ")";
  }
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
    $("count").textContent = list.length + " " + t("results");
    $("empty").hidden = list.length > 0;
    g.innerHTML = list.map(function (x) {
      var l = x.l;
      return '<article class="card ' + (l.status === "taken" ? "dim" : "") + '" data-id="' + l.id + '">' +
        '<div class="ph" style="' + photoStyle(l) + '"><span class="badge ' + l.status + '">' + t(l.status) + "</span>" + (l.photos.length ? "" : "🏠") + "</div>" +
        '<div class="body"><h3>' + pick(l.title) + '</h3><div class="meta">' + t(l.type) + " · " + l.area + '</div>' +
        '<span class="walk">' + tripText(x.tr) + '</span>' +
        (isVerified(l) ? '<span class="walk gold">✔ ' + t("verified") + "</span>" : "") +
        '<div class="meta" style="margin-top:6px">⏱ ' + l.minStay + " " + t("mo") + " · 🕌 " + (l.trust.mosque == null ? "–" : l.trust.mosque + " " + t("walk")) + (l.trust.arabic ? " · 🗣️ AR" : "") + "</div>" +
        '<div class="price">RM ' + l.price + " <small>" + t("perMonth") + "</small></div></div></article>";
    }).join("");
    if (map) renderMarkers(list);
  }

  function renderMarkers(list) {
    markers.forEach(function (m) { map.removeLayer(m); }); markers = [];
    var cm = L.marker([campus.lat, campus.lng]).addTo(map).bindPopup("🎓 " + pick(campus.name)); markers.push(cm);
    list.forEach(function (x) {
      var m = L.circleMarker([x.l.lat, x.l.lng], { radius: 10, color: "#fff", weight: 2, fillColor: x.l.status === "available" ? "#0f5c70" : "#8a5a00", fillOpacity: 1 }).addTo(map);
      m.bindTooltip("RM " + x.l.price); m.on("click", function () { openDetail(x.l.id); }); markers.push(m);
    });
    var pts = list.map(function (x) { return [x.l.lat, x.l.lng]; }).concat([[campus.lat, campus.lng]]);
    map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
  }

  function waLink(text) { return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(text); }

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
      '<div class="price">RM ' + l.price + " <small>" + t("perMonth") + "</small></div>" +
      '<div class="tags"><span class="tag">' + t(l.type) + '</span><span class="tag">' + l.area + '</span><span class="tag">' + l.beds + " " + t("beds") + '</span><span class="tag">⏱ ' + t("minStay") + ": " + l.minStay + " " + t("mo") + '</span><span class="tag">' + t(l.furnished ? "furnished" : "unfurnished") + '</span><span class="tag">' + t(l.bills ? "bills" : "noBills") + "</span></div>" +
      "<p>" + pick(l.desc) + "</p>" +
      '<div class="dist">' + t("fromCampus") + ': <select id="dCampus">' + opts + '</select><div style="margin-top:8px" id="dTrip"><b>' + tripText(tr) + "</b></div>" +
      '<a href="' + gm + '" target="_blank" rel="noopener" style="font-size:14px">' + t("directions") + "</a></div>" +
      trustHtml(l) + '<div id="dmap" class="dmap"></div>' + safeHtml() +
      '<a class="btn wa ' + (ok ? "" : "off") + '" target="_blank" rel="noopener" href="' + waLink(t("msg") + pick(l.title) + " (#" + l.id + ", RM " + l.price + ")") + '">' + (ok ? "💬 " + t("request") : t("notAvail")) + "</a></div>";
    $("modal").hidden = false; document.body.style.overflow = "hidden";
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
    $("campus").innerHTML = campusOptions();
    $("ownerBtn").href = waLink(lang === "ar" ? "مرحباً قريب، عندي سكن أريد إضافته." : "Hello Qareeb, I have accommodation I would like to list.");
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

  $("langBtn").onclick = function () { lang = lang === "ar" ? "en" : "ar"; try { localStorage.setItem("qareeb-lang", lang); } catch (e) {} applyLang(); };
  $("campus").onchange = function () { campus = CAMPUSES.filter(function (c) { return c.id === $("campus").value; })[0]; render(); };
  ["area", "type", "price", "stay", "sort", "onlyAvail", "onlyVerified"].forEach(function (id) { $(id).onchange = render; });
  document.querySelectorAll(".vbtn").forEach(function (b) { b.onclick = function () { setView(b.dataset.view); }; });
  $("grid").onclick = function (e) { var c = e.target.closest(".card"); if (c) openDetail(+c.dataset.id); };
  $("close").onclick = closeDetail;
  $("modal").onclick = function (e) { if (e.target === $("modal")) closeDetail(); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDetail(); });

  applyLang();
})();
