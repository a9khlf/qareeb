(function () {
  "use strict";
  var SB = window.QAREEB_SUPABASE, KEY = "qareeb-admin-session";
  var $ = function (id) { return document.getElementById(id); };
  var state = { tab: "rooms", rooms: [], centers: [], requests: [], suggestions: [] };
  var session = null;
  try { session = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function msg(text, isErr) {
    var m = $("msg"); m.textContent = text; m.className = "msg" + (isErr ? " err" : ""); m.style.display = text ? "block" : "none";
    if (text && !isErr) setTimeout(function () { if (m.textContent === text) m.style.display = "none"; }, 3500);
  }

  // ------------------------------------------------------------ auth
  function saveSession(s) { session = s; try { s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY); } catch (e) {} }
  function authCall(grant, body) {
    return fetch(SB.url + "/auth/v1/token?grant_type=" + grant, { method: "POST", headers: { apikey: SB.key, "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error_description || j.msg || "Login failed");
        return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in - 30) * 1000, email: (j.user && j.user.email) || "" };
      }); });
  }
  function token() {
    if (!session) return Promise.reject(new Error("Not signed in"));
    if (Date.now() < session.expires_at) return Promise.resolve(session.access_token);
    return authCall("refresh_token", { refresh_token: session.refresh_token }).then(function (s) { s.email = session.email; saveSession(s); return s.access_token; })
      .catch(function (e) { logout(); throw e; });
  }
  function api(path, opts) {
    opts = opts || {};
    return token().then(function (tk) {
      var h = { apikey: SB.key, Authorization: "Bearer " + tk, "Content-Type": "application/json" };
      if (opts.write) h.Prefer = "return=representation";
      return fetch(SB.url + path, { method: opts.method || "GET", headers: h, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.message || ("Error " + r.status)); });
      if (r.status === 204) return null;
      return r.json().catch(function () { return null; });
    }).then(function (data) {
      if (opts.write && opts.method !== "POST" && Array.isArray(data) && data.length === 0) throw new Error("Nothing was changed. Your account may not have permission.");
      return data;
    });
  }
  function logout() { saveSession(null); location.reload(); }

  function showPanel() {
    $("loginBox").hidden = true; $("panel").hidden = false; $("logout").hidden = false; $("who").textContent = session.email;
    loadAll();
  }

  $("loginForm").onsubmit = function (e) {
    e.preventDefault(); msg("");
    authCall("password", { email: $("email").value.trim(), password: $("pw").value }).then(function (s) {
      saveSession(s);
      return api("/rest/v1/rpc/is_admin", { method: "POST", body: {} });
    }).then(function (ok) {
      if (ok !== true) { saveSession(null); throw new Error("This account is not an administrator."); }
      $("pw").value = ""; showPanel();
    }).catch(function (err) { msg(err.message, true); });
  };
  $("logout").onclick = logout;

  // ------------------------------------------------------------ data
  function loadAll() {
    msg("");
    return Promise.all([
      api("/rest/v1/listings?select=*&order=id.desc"),
      api("/rest/v1/centers?select=*&order=sort"),
      api("/rest/v1/requests?select=*&order=created_at.desc&limit=500"),
      api("/rest/v1/center_requests?select=*&order=created_at.desc&limit=500").catch(function () { return []; })
    ]).then(function (r) { state.rooms = r[0] || []; state.centers = r[1] || []; state.requests = r[2] || []; state.suggestions = r[3] || []; render(); })
      .catch(function (e) { msg("Could not load data: " + e.message, true); });
  }

  // ------------------------------------------------------------ list views
  function thumbStyle(l) {
    if (l.photos && l.photos.length) return "background-image:url('" + esc(String(l.photos[0]).replace(/'/g, "%27")) + "')";
    var c = l.colors && l.colors.length > 1 ? l.colors : ["#1f6f78", "#5aa9a8"];
    return "background-image:linear-gradient(135deg," + esc(c[0]) + "," + esc(c[1]) + ")";
  }
  function chips(l) {
    var out = "";
    out += '<span class="chip ' + (l.published ? "ok" : "off") + '">' + (l.published ? "Visible" : "Hidden") + "</span>";
    if (l.v_video && l.v_owner) out += '<span class="chip ok">Verified</span>';
    else out += '<span class="chip">Not verified</span>';
    if (l.v_visited) out += '<span class="chip ok">Visited</span>';
    if (l.status === "reserved" && l.reserved_until) {
      var expired = new Date(l.reserved_until) < new Date();
      out += '<span class="chip ' + (expired ? "off" : "ok") + '">' + (expired ? "Hold expired" : "Held until " + esc(new Date(l.reserved_until).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))) + "</span>";
    }
    out += '<span class="chip">' + esc(l.gender) + "</span>";
    return out;
  }
  function render() {
    document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === state.tab); });
    $("addBtn").textContent = state.tab === "centers" ? "+ Add center" : "+ Add room";
    $("addBtn").hidden = state.tab === "requests" || state.tab === "suggest";
    if (state.tab === "rooms") renderRooms(); else if (state.tab === "requests") renderRequests(); else if (state.tab === "suggest") renderSuggestions(); else renderCenters();
  }
  function renderRooms() {
    if (!state.rooms.length) { $("list").innerHTML = '<p class="meta2">No rooms yet. Click "Add room" to create the first one.</p>'; return; }
    $("list").innerHTML = state.rooms.map(function (l) {
      var asked = state.requests.filter(function (r) { return r.listing_id === l.id; }).length;
      return '<div class="item" data-id="' + l.id + '"><div class="thumb" style="' + thumbStyle(l) + '">' + ((l.photos && l.photos.length) ? "" : "🏠") + "</div>" +
        '<div class="main"><h3>' + esc(l.title_en) + '</h3><div class="meta2">RM ' + esc(l.price) + " per month · " + esc(l.area) + " · " + esc(l.type) + " · min. " + esc(l.min_stay) + " mo · " + asked + " request" + (asked === 1 ? "" : "s") + "</div>" +
        "<div style=\"margin-top:6px\">" + chips(l) + "</div>" +
        '<div class="acts"><select data-act="status" aria-label="Status"><option value="available"' + (l.status === "available" ? " selected" : "") + '>Available</option><option value="reserved"' + (l.status === "reserved" ? " selected" : "") + '>Reserved</option><option value="taken"' + (l.status === "taken" ? " selected" : "") + '>Rented</option></select>' +
        '<button class="btn sec sm" data-act="toggle" type="button">' + (l.published ? "Hide" : "Show") + '</button>' +
        '<button class="btn sm" data-act="edit" type="button">Edit</button>' +
        '<button class="btn danger sm" data-act="del" type="button">Delete</button></div></div></div>';
    }).join("");
  }
  function centerName(id) { var c = state.centers.filter(function (x) { return x.id === id; })[0]; return c ? c.name_en : (id || "–"); }
  function renderRequests() {
    if (!state.requests.length) { $("list").innerHTML = '<p class="meta2">No requests yet. A row appears each time a student taps "I want this room".</p>'; return; }
    var counts = {};
    state.requests.forEach(function (r) { counts[r.listing_id] = (counts[r.listing_id] || 0) + 1; });
    var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5).map(function (id) {
      var room = state.rooms.filter(function (x) { return String(x.id) === id; })[0];
      return '<div class="count-row"><span>' + esc(room ? room.title_en : "Deleted room") + "</span><b>" + counts[id] + "</b></div>";
    }).join("");
    $("list").innerHTML = '<div class="item" style="display:block"><h3>Most requested rooms</h3>' + top + "</div>" +
      state.requests.map(function (r) {
        var room = state.rooms.filter(function (x) { return x.id === r.listing_id; })[0];
        return '<div class="item" data-id="' + r.id + '"><div class="main"><h3>' + esc(room ? room.title_en : "Deleted room") + '</h3><div class="meta2">' +
          esc(new Date(r.created_at).toLocaleString()) + " · language center: " + esc(centerName(r.center)) + " · " + (r.kind === "reserve" ? "<b>RESERVATION</b> · " : "") + (r.kind === "tour" ? "<b>VIDEO TOUR</b> · " : "") + esc(r.name) + " (" + esc(r.whatsapp) + ')</div></div>' +
          '<button class="btn danger sm" data-act="delreq" type="button">Delete</button></div>';
      }).join("");
  }
  function slug(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "center"; }
  function renderSuggestions() {
    if (!state.suggestions.length) { $("list").innerHTML = '<p class="meta2">No suggestions yet. When a student looks for a language center that is not on your list and picks a place or drops a pin, it appears here, so you can add it with one click.</p>'; return; }
    var g = {};
    state.suggestions.forEach(function (s) {
      var k = s.name.trim().toLowerCase();
      if (!g[k]) g[k] = { name: s.name.trim(), ids: [], n: 0, lat: s.lat, lng: s.lng, last: s.created_at };
      g[k].ids.push(s.id); g[k].n++;
    });
    var arr = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.n - a.n; });
    $("list").innerHTML = arr.map(function (x) {
      return '<div class="item" data-id="' + x.ids[0] + '" data-ids="' + x.ids.join(",") + '" data-name="' + esc(x.name) + '" data-lat="' + esc(x.lat) + '" data-lng="' + esc(x.lng) + '"><div class="main"><h3>' + esc(x.name) + '</h3><div class="meta2">Asked ' + x.n + " time" + (x.n === 1 ? "" : "s") + " · position " + esc(x.lat) + ", " + esc(x.lng) + " · last " + esc(new Date(x.last).toLocaleDateString()) + "</div></div>" +
        '<div class="acts" style="margin:0"><button class="btn sm" data-act="addsug" type="button">Add as center</button><button class="btn sec sm" data-act="delsug" type="button">Dismiss</button></div></div>';
    }).join("");
  }
  function renderCenters() {
    $("list").innerHTML = state.centers.map(function (c) {
      return '<div class="item" data-id="' + esc(c.id) + '">' + (c.logo_url ? '<img class="clogo" src="' + esc(c.logo_url) + '" alt="">' : "") + '<div class="main"><h3>' + esc(c.name_en) + '</h3><div class="meta2">' + esc(c.name_ar) + " · " + (c.grp === "center" ? "Language center" : "Area") + " · " + esc(c.lat) + ", " + esc(c.lng) + '</div></div>' +
        '<div class="acts" style="margin:0"><button class="btn sm" data-act="editc" type="button">Edit</button><button class="btn danger sm" data-act="delc" type="button">Delete</button></div></div>';
    }).join("");
  }

  // ------------------------------------------------------------ list actions
  $("list").onclick = function (e) {
    var b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
    var item = b.closest(".item"), id = item.dataset.id, act = b.dataset.act;
    if (act === "edit") openRoomForm(state.rooms.filter(function (x) { return String(x.id) === id; })[0]);
    else if (act === "toggle") { var r = state.rooms.filter(function (x) { return String(x.id) === id; })[0]; patchRoom(r.id, { published: !r.published }, r.published ? "Room hidden from the website." : "Room is now visible."); }
    else if (act === "del") deleteRoom(state.rooms.filter(function (x) { return String(x.id) === id; })[0]);
    else if (act === "delreq") { if (confirm("Delete this request?")) api("/rest/v1/requests?id=eq." + encodeURIComponent(id), { method: "DELETE", write: true }).then(function () { msg("Request deleted."); loadAll(); }).catch(function (er) { msg(er.message, true); }); }
    else if (act === "addsug") openCenterForm(null, { id: slug(item.dataset.name), name_en: item.dataset.name, lat: item.dataset.lat, lng: item.dataset.lng });
    else if (act === "delsug") {
      var ids = String(item.dataset.ids).split(",").filter(function (x) { return /^\d+$/.test(x); });
      if (ids.length) api("/rest/v1/center_requests?id=in.(" + ids.join(",") + ")", { method: "DELETE", write: true }).then(function () { msg("Dismissed."); loadAll(); }).catch(function (er) { msg(er.message, true); });
    }
    else if (act === "editc") openCenterForm(state.centers.filter(function (x) { return x.id === id; })[0]);
    else if (act === "delc") { var c = state.centers.filter(function (x) { return x.id === id; })[0]; if (confirm('Delete "' + c.name_en + '"? Students will no longer be able to pick it.')) api("/rest/v1/centers?id=eq." + encodeURIComponent(id), { method: "DELETE", write: true }).then(function () { msg("Deleted."); loadAll(); }).catch(function (er) { msg(er.message, true); }); }
  };
  $("list").onchange = function (e) {
    if (e.target.dataset.act === "status") { var id = e.target.closest(".item").dataset.id; patchRoom(+id, e.target.value === "reserved" ? { status: "reserved" } : { status: e.target.value, reserved_until: null }, "Status updated."); }
  };
  function patchRoom(id, body, ok) {
    return api("/rest/v1/listings?id=eq." + id, { method: "PATCH", body: body, write: true }).then(function () { msg(ok); return loadAll(); }).catch(function (er) { msg(er.message, true); loadAll(); });
  }
  function storagePath(url) {
    var m = String(url).match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/); return m ? { bucket: m[1], path: m[2] } : null;
  }
  function deleteFile(url) {
    var p = storagePath(url); if (!p) return Promise.resolve();
    return token().then(function (tk) { return fetch(SB.url + "/storage/v1/object/" + p.bucket + "/" + p.path, { method: "DELETE", headers: { apikey: SB.key, Authorization: "Bearer " + tk } }); }).catch(function () {});
  }
  function deleteRoom(r) {
    if (!confirm('Delete "' + r.title_en + '" permanently? This cannot be undone.\n\nTip: use "Hide" or set the status to Rented if you only want to take it off the website for now.')) return;
    api("/rest/v1/listings?id=eq." + r.id, { method: "DELETE", write: true }).then(function () {
      return Promise.all((r.photos || []).concat(r.video ? [r.video] : []).map(deleteFile));
    }).then(function () { msg("Room deleted."); loadAll(); }).catch(function (er) { msg(er.message, true); });
  }

  document.querySelectorAll(".tab").forEach(function (b) { b.onclick = function () { state.tab = b.dataset.tab; render(); }; });
  $("addBtn").onclick = function () { if (state.tab === "centers") openCenterForm(null); else openRoomForm(null); };

  // ------------------------------------------------------------ forms
  var dlg = $("dlg");
  function closeDlg() { dlg.close(); }
  function parseCoords(s) {
    var m = String(s).trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/); if (!m) return null;
    return { lat: +m[1], lng: +m[2] };
  }
  function outsideMalaysia(c) { return c.lat < 0.8 || c.lat > 7.5 || c.lng < 99 || c.lng > 120; }
  function sel(name, opts, val) { return '<select name="' + name + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>"; }
  function chk(name, label, val) { return '<label class="chk"><input type="checkbox" name="' + name + '"' + (val ? " checked" : "") + "> " + label + "</label>"; }
  function num(v) { return v === "" || v == null ? null : Number(v); }

  function amenityChecks(selected) {
    return (window.QAREEB_AMENITIES || []).map(function (a) {
      return '<label class="chk"><input type="checkbox" name="amen" value="' + a.key + '"' + (selected.indexOf(a.key) >= 0 ? " checked" : "") + "> " + a.icon + " " + a.en + "</label>";
    }).join("");
  }

  // ---- nearby stations from free map data (OpenStreetMap). Tries two servers; if both are busy you type it yourself. ----
  var MIRRORS = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"];
  function overpass(q) {
    var i = 0;
    function next() {
      if (i >= MIRRORS.length) return Promise.reject(new Error("The map service is busy right now. Please type the details yourself, or try again in a minute."));
      var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 9000);
      return fetch(MIRRORS[i++], { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal })
        .then(function (r) { clearTimeout(to); if (!r.ok) throw new Error("bad"); return r.json(); })
        .catch(function () { clearTimeout(to); return next(); });
    }
    return next();
  }
  function walkMin(a, b, c, d) {
    var R = 6371, rad = Math.PI / 180, dLat = (c - a) * rad, dLng = (d - b) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.3 * 1000 / 80);
  }
  function stationType(tags) {
    if (tags.monorail === "yes" || tags.station === "monorail") return "Monorail";
    if (tags.light_rail === "yes" || tags.station === "light_rail") return "LRT";
    if (tags.subway === "yes" || tags.station === "subway") return "MRT";
    if (tags.train === "yes") return "KTM";
    return "Other";
  }
  function findTransit() {
    var co = parseCoords($("f-co").value), help = $("transitHelp");
    if (!co) { help.textContent = "Fill in the coordinates first (Location section)."; return; }
    help.textContent = "Searching the map...";
    var q = "[out:json][timeout:25];(node(around:1500," + co.lat + "," + co.lng + ')["railway"="station"];node(around:700,' + co.lat + "," + co.lng + ')["highway"="bus_stop"];);out body 120;';
    overpass(q).then(function (j) {
      var st = null, bus = null;
      j.elements.forEach(function (e) {
        var m = walkMin(co.lat, co.lng, e.lat, e.lon);
        if (e.tags.railway === "station") { if (!st || m < st.m) st = { m: m, name: e.tags.name || "", type: stationType(e.tags) }; }
        else if (e.tags.highway === "bus_stop") { if (bus == null || m < bus) bus = m; }
      });
      var out = [];
      if (st) { $("f-sn").value = st.name; $("f-sm").value = st.m; document.querySelector('#rf select[name="station_type"]').value = st.type; out.push("Nearest station: " + (st.name || "unnamed") + " (" + st.type + "), about " + st.m + " min walk"); }
      else out.push("No station found within about 1.5 km");
      if (bus != null) { $("f-bm").value = bus; out.push("nearest bus stop about " + bus + " min walk"); }
      help.textContent = out.join("; ") + ". Please check it, then save.";
    }).catch(function (e) { help.textContent = e.message; });
  }

  var photoList = [];
  function drawThumbs() {
    $("thumbs").innerHTML = photoList.map(function (u, i) {
      return '<div class="t" style="background-image:url(\'' + esc(String(u).replace(/'/g, "%27")) + '\')">' + (i === 0 ? "<i>Cover</i>" : '<i data-cover="' + i + '" style="cursor:pointer">Make cover</i>') + '<button type="button" data-rm="' + i + '" aria-label="Remove photo">✕</button></div>';
    }).join("") || '<span class="help">No photos yet.</span>';
  }

  function openRoomForm(r) {
    var isNew = !r; r = r || { type: "room", area: "", price: "", status: "available", beds: 1, min_stay: 1, gender: "mixed", furnished: true, bills: false, title_en: "", title_ar: "", desc_en: "", desc_ar: "", photos: [], video: "", v_video: false, v_owner: false, v_visited: false, mosque_min: "", halal_min: "", arabic: false, published: true, colors: ["#1f6f78", "#5aa9a8"] };
    photoList = (r.photos || []).slice();
    var areas = Array.from(new Set(state.rooms.map(function (x) { return x.area; }))).map(function (a) { return '<option value="' + esc(a) + '">'; }).join("");
    $("dform").innerHTML = '<form id="rf"><h2>' + (isNew ? "Add a room" : "Edit room") + "</h2>" +
      '<fieldset><legend>Basics</legend><div class="row2">' +
      '<div class="fld"><span>Type</span>' + sel("type", [["room", "Room"], ["studio", "Studio"], ["apartment", "Apartment"]], r.type) + "</div>" +
      '<div class="fld"><label for="f-area">Area</label><input id="f-area" name="area" list="areas" required maxlength="60" value="' + esc(r.area) + '" placeholder="e.g. Ampang"><datalist id="areas">' + areas + "</datalist></div>" +
      '<div class="fld"><label for="f-price">Price (RM per month)</label><input id="f-price" name="price" type="number" min="1" step="1" required value="' + esc(r.price) + '"></div>' +
      '<div class="fld"><span>Status</span>' + sel("status", [["available", "Available"], ["reserved", "Reserved"], ["taken", "Rented"]], r.status) + "</div>" +
      '<div class="fld"><label for="f-beds">Bedrooms</label><input id="f-beds" name="beds" type="number" min="0" max="20" required value="' + esc(r.beds) + '"></div>' +
      '<div class="fld"><label for="f-min">Minimum stay (months)</label><input id="f-min" name="min_stay" type="number" min="1" max="60" required value="' + esc(r.min_stay) + '"></div>' +
      '<div class="fld"><span>Who lives here</span>' + sel("gender", [["mixed", "Mixed"], ["women", "Women only"], ["men", "Men only"], ["family", "Families"]], r.gender) + "</div></div>" +
      chk("furnished", "Furnished", r.furnished) + chk("bills", "Bills included in the price", r.bills) + "</fieldset>" +
      '<fieldset><legend>Text</legend>' +
      '<div class="fld"><label for="f-te">Title (English)</label><input id="f-te" name="title_en" required maxlength="120" value="' + esc(r.title_en) + '"></div>' +
      '<div class="fld"><label for="f-ta">Title (Arabic)</label><input id="f-ta" name="title_ar" dir="rtl" required maxlength="120" value="' + esc(r.title_ar) + '"></div>' +
      '<div class="fld"><label for="f-de">Description (English)</label><textarea id="f-de" name="desc_en" maxlength="1500">' + esc(r.desc_en) + "</textarea></div>" +
      '<div class="fld"><label for="f-da">Description (Arabic)</label><textarea id="f-da" name="desc_ar" dir="rtl" maxlength="1500">' + esc(r.desc_ar) + "</textarea></div></fieldset>" +
      '<fieldset><legend>Location</legend><div class="fld"><label for="f-co">Coordinates</label><input id="f-co" name="coords" required value="' + (r.lat != null ? esc(r.lat + ", " + r.lng) : "") + '" placeholder="3.1570, 101.7120">' +
      '<p class="help">In Google Maps, right-click the building and click the numbers at the top of the menu to copy them. Paste them here.</p></div></fieldset>' +
      '<fieldset><legend>Photos and video</legend><div id="thumbs" class="thumbs"></div>' +
      '<div class="fld"><label for="f-ph">Add photos</label><input id="f-ph" type="file" accept="image/*" multiple><p class="help">Photos are resized automatically. The first photo is the cover.</p></div>' +
      '<div class="fld"><label for="f-vu">Video link</label><input id="f-vu" name="video" type="url" value="' + esc(r.video) + '" placeholder="https://..."><p class="help">Or upload an MP4 / WebM file (up to 50 MB):</p><input id="f-vf" type="file" accept="video/mp4,video/webm"></div></fieldset>' +
      '<fieldset><legend>Move-in costs (shown to students)</legend><div class="row2">' +
      '<div class="fld"><label for="f-dm">Security deposit (months of rent)</label><input id="f-dm" name="deposit_months" type="number" min="0" max="12" step="0.5" value="' + esc(r.deposit_months == null ? "" : r.deposit_months) + '" placeholder="e.g. 2"></div>' +
      '<div class="fld"><label for="f-am">Rent paid in advance (months)</label><input id="f-am" name="advance_months" type="number" min="0" max="12" step="0.5" value="' + esc(r.advance_months == null ? "" : r.advance_months) + '" placeholder="e.g. 1"></div>' +
      '<div class="fld"><label for="f-ud">Utility deposit (RM)</label><input id="f-ud" name="utility_deposit" type="number" min="0" max="5000" step="10" value="' + esc(r.utility_deposit == null ? "" : r.utility_deposit) + '" placeholder="e.g. 150"></div></div>' +
      '<p class="help">Leave the security deposit empty if you do not want a cost box on this room.</p>' + chk("agreement_provided", "A written tenancy agreement is provided", r.agreement_provided) + "</fieldset>" +
      '<fieldset><legend>Getting around and advantages</legend>' +
      '<div class="row2"><div class="fld"><label for="f-sn">Nearest station (name)</label><input id="f-sn" name="station_name" maxlength="80" value="' + esc(r.station_name || "") + '" placeholder="e.g. Ampang Park"></div>' +
      '<div class="fld"><span>Station type</span>' + sel("station_type", [["", "-"], ["MRT", "MRT"], ["LRT", "LRT"], ["Monorail", "Monorail"], ["KTM", "KTM"], ["BRT", "BRT"], ["Other", "Other"]], r.station_type || "") + "</div>" +
      '<div class="fld"><label for="f-sm">Walking minutes to station</label><input id="f-sm" name="station_min" type="number" min="0" max="120" value="' + esc(r.station_min == null ? "" : r.station_min) + '"></div>' +
      '<div class="fld"><label for="f-bm">Walking minutes to nearest bus stop</label><input id="f-bm" name="bus_min" type="number" min="0" max="120" value="' + esc(r.bus_min == null ? "" : r.bus_min) + '"></div></div>' +
      '<button type="button" class="btn sec sm" id="findTransit">Find nearby stations automatically</button><p class="help" id="transitHelp">Uses free map data and the coordinates above. Always check the result before saving.</p>' +
      '<div style="margin-top:12px"><span style="font-size:13px;font-weight:600">Advantages (tick what applies)</span><div class="row2" style="margin-top:6px">' + amenityChecks(r.amenities || []) + "</div></div></fieldset>" +
      '<fieldset><legend>Verification (tick only what you really checked)</legend>' +
      chk("v_video", "Live video tour completed", r.v_video) + chk("v_owner", "Owner identity checked", r.v_owner) + chk("v_visited", "Visited in person by the Qareeb team", r.v_visited) +
      '<div class="row2"><div class="fld"><label for="f-mo">Walking minutes to nearest mosque</label><input id="f-mo" name="mosque_min" type="number" min="0" max="120" value="' + esc(r.mosque_min == null ? "" : r.mosque_min) + '"></div>' +
      '<div class="fld"><label for="f-ha">Walking minutes to halal food</label><input id="f-ha" name="halal_min" type="number" min="0" max="120" value="' + esc(r.halal_min == null ? "" : r.halal_min) + '"></div></div>' +
      chk("arabic", "Arabic-speaking owner or tenants", r.arabic) + "</fieldset>" +
      chk("published", "Visible on the website", r.published) +
      '<div class="foot2"><button type="button" class="btn sec" id="cancelBtn">Cancel</button><button type="submit" class="btn" id="saveBtn">Save</button></div></form>';
    drawThumbs();
    dlg.showModal();
    $("cancelBtn").onclick = closeDlg;
    $("thumbs").onclick = function (e) {
      var rm = e.target.getAttribute("data-rm"), cv = e.target.getAttribute("data-cover");
      if (rm != null) { photoList.splice(+rm, 1); drawThumbs(); }
      else if (cv != null) { var u = photoList.splice(+cv, 1)[0]; photoList.unshift(u); drawThumbs(); }
    };
    $("f-ph").onchange = function () { uploadPhotos(this); };
    $("f-vf").onchange = function () { uploadVideo(this); };
    $("findTransit").onclick = findTransit;
    $("rf").onsubmit = function (e) { e.preventDefault(); saveRoom(r, isNew); };
  }

  function shrink(file, max) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(u); b ? res(b) : rej(new Error("Could not process the image")); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error("That file is not a valid image")); };
      img.src = u;
    });
  }
  function shrinkPng(file, max) {   // keeps transparency, so logos keep their shape
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(u); b ? res(b) : rej(new Error("Could not process the image")); }, "image/png");
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error("That file is not a valid image")); };
      img.src = u;
    });
  }
  function upload(bucket, blob, ext, type) {
    var path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return token().then(function (tk) {
      return fetch(SB.url + "/storage/v1/object/" + bucket + "/" + path, { method: "POST", headers: { apikey: SB.key, Authorization: "Bearer " + tk, "Content-Type": type, "x-upsert": "false" }, body: blob });
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.message || "Upload failed (" + r.status + ")"); });
      return SB.url + "/storage/v1/object/public/" + bucket + "/" + path;
    });
  }
  function uploadPhotos(input) {
    var files = Array.from(input.files || []); if (!files.length) return;
    $("saveBtn").disabled = true; msg("Uploading " + files.length + " photo(s)...");
    files.reduce(function (p, f) {
      return p.then(function () { return shrink(f, 1600).then(function (b) { return upload("room-photos", b, "jpg", "image/jpeg"); }).then(function (u) { photoList.push(u); drawThumbs(); }); });
    }, Promise.resolve()).then(function () { msg("Photos uploaded. Click Save to keep them."); })
      .catch(function (e) { msg(e.message, true); }).then(function () { $("saveBtn").disabled = false; input.value = ""; });
  }
  function uploadVideo(input) {
    var f = input.files && input.files[0]; if (!f) return;
    if (f.size > 52428800) { msg("That video is larger than 50 MB. Please compress it or paste a link instead.", true); input.value = ""; return; }
    $("saveBtn").disabled = true; msg("Uploading video...");
    upload("room-videos", f, f.type === "video/webm" ? "webm" : "mp4", f.type).then(function (u) { $("f-vu").value = u; msg("Video uploaded. Click Save to keep it."); })
      .catch(function (e) { msg(e.message, true); }).then(function () { $("saveBtn").disabled = false; input.value = ""; });
  }

  function saveRoom(old, isNew) {
    var f = $("rf"), d = new FormData(f), co = parseCoords(d.get("coords"));
    if (!co) { msg("Coordinates look wrong. Use the format: 3.1570, 101.7120", true); return; }
    if (outsideMalaysia(co) && !confirm("These coordinates are outside Malaysia. Save anyway?")) return;
    var body = {
      type: d.get("type"), area: d.get("area").trim(), price: Number(d.get("price")), status: d.get("status"), beds: Number(d.get("beds")),
      min_stay: Number(d.get("min_stay")), gender: d.get("gender"), furnished: f.furnished.checked, bills: f.bills.checked,
      title_en: d.get("title_en").trim(), title_ar: d.get("title_ar").trim(), desc_en: d.get("desc_en").trim(), desc_ar: d.get("desc_ar").trim(),
      lat: co.lat, lng: co.lng, photos: photoList, video: (d.get("video") || "").trim(),
      v_video: f.v_video.checked, v_owner: f.v_owner.checked, v_visited: f.v_visited.checked,
      mosque_min: num(d.get("mosque_min")), halal_min: num(d.get("halal_min")), arabic: f.arabic.checked, published: f.published.checked,
      reserved_until: d.get("status") === "reserved" ? (old.reserved_until || null) : null,
      deposit_months: num(d.get("deposit_months")), advance_months: num(d.get("advance_months")), utility_deposit: num(d.get("utility_deposit")), agreement_provided: f.agreement_provided.checked,
      station_name: (d.get("station_name") || "").trim() || null, station_type: d.get("station_type") || null,
      station_min: num(d.get("station_min")), bus_min: num(d.get("bus_min")), amenities: d.getAll("amen")
    };
    var req = isNew ? api("/rest/v1/listings", { method: "POST", body: body, write: true }) : api("/rest/v1/listings?id=eq." + old.id, { method: "PATCH", body: body, write: true });
    $("saveBtn").disabled = true;
    req.then(function () {
      var removed = (old.photos || []).filter(function (u) { return photoList.indexOf(u) < 0; });
      return Promise.all(removed.map(deleteFile));
    }).then(function () { closeDlg(); msg(isNew ? "Room added." : "Room saved."); return loadAll(); })
      .catch(function (e) { msg(e.message, true); $("saveBtn").disabled = false; });
  }

  function openCenterForm(c, prefill) {
    var isNew = !c; c = c || Object.assign({ id: "", grp: "center", name_en: "", name_ar: "", lat: "", lng: "", sort: 50 }, prefill || {});
    $("dform").innerHTML = '<form id="cf"><h2>' + (isNew ? "Add a language center or area" : "Edit") + "</h2>" +
      '<div class="fld"><label for="c-id">Short ID (letters, numbers, dashes)</label><input id="c-id" name="id" required pattern="[a-z0-9-]+" maxlength="40" value="' + esc(c.id) + '"' + (isNew ? "" : " readonly") + ' placeholder="e.g. my-center"></div>' +
      '<div class="fld"><span>Kind</span>' + sel("grp", [["center", "Language center"], ["area", "Area (for centers not listed)"]], c.grp) + "</div>" +
      '<div class="fld"><label for="c-en">Name (English)</label><input id="c-en" name="name_en" required maxlength="120" value="' + esc(c.name_en) + '"></div>' +
      '<div class="fld"><label for="c-ar">Name (Arabic)</label><input id="c-ar" name="name_ar" dir="rtl" required maxlength="120" value="' + esc(c.name_ar) + '"></div>' +
      '<div class="fld"><label for="c-co">Coordinates</label><input id="c-co" name="coords" required value="' + (c.lat !== "" ? esc(c.lat + ", " + c.lng) : "") + '" placeholder="3.1570, 101.7120"><p class="help">Use the exact address of the center in Google Maps for accurate walking times.</p></div>' +
      '<div class="fld"><span>Logo (optional)</span><div id="logoPrev" style="min-height:40px">' + (c.logo_url ? '<img class="clogo" src="' + esc(c.logo_url) + '" alt="">' : '<span class="help">No logo yet. A badge with the initials is shown instead.</span>') + "</div>" +
      '<input id="c-logo" type="file" accept="image/png,image/jpeg,image/webp"><input type="hidden" name="logo_url" value="' + esc(c.logo_url || "") + '">' +
      '<p class="help">Only upload a logo the center has given you permission to use. It is resized automatically.</p>' +
      '<button type="button" class="btn sec sm" id="logoRemove" style="justify-self:start">Remove logo</button></div>' +
      '<div class="fld"><label for="c-so">Order in the list (small numbers first)</label><input id="c-so" name="sort" type="number" required value="' + esc(c.sort) + '"></div>' +
      '<div class="foot2"><button type="button" class="btn sec" id="cancelBtn">Cancel</button><button type="submit" class="btn" id="saveBtn">Save</button></div></form>';
    dlg.showModal();
    $("cancelBtn").onclick = closeDlg;
    var logoField = document.querySelector('#cf input[name="logo_url"]');
    $("c-logo").onchange = function () {
      var f = this.files && this.files[0], input = this; if (!f) return;
      $("saveBtn").disabled = true; msg("Uploading logo...");
      shrinkPng(f, 256).then(function (b) { return upload("center-logos", b, "png", "image/png"); }).then(function (u) {
        logoField.value = u; $("logoPrev").innerHTML = '<img class="clogo" src="' + esc(u) + '" alt="">'; msg("Logo uploaded. Click Save to keep it.");
      }).catch(function (er) { msg(er.message, true); }).then(function () { $("saveBtn").disabled = false; input.value = ""; });
    };
    $("logoRemove").onclick = function () { logoField.value = ""; $("logoPrev").innerHTML = '<span class="help">No logo. A badge with the initials will be shown.</span>'; };
    $("cf").onsubmit = function (e) {
      e.preventDefault();
      var d = new FormData($("cf")), co = parseCoords(d.get("coords"));
      if (!co) { msg("Coordinates look wrong. Use the format: 3.1570, 101.7120", true); return; }
      if (outsideMalaysia(co) && !confirm("These coordinates are outside Malaysia. Save anyway?")) return;
      var body = { id: d.get("id"), grp: d.get("grp"), name_en: d.get("name_en").trim(), name_ar: d.get("name_ar").trim(), lat: co.lat, lng: co.lng, sort: Number(d.get("sort")), logo_url: d.get("logo_url") || null };
      var req = isNew ? api("/rest/v1/centers", { method: "POST", body: body, write: true }) : api("/rest/v1/centers?id=eq." + encodeURIComponent(c.id), { method: "PATCH", body: body, write: true });
      $("saveBtn").disabled = true;
      req.then(function () { closeDlg(); msg("Saved."); return loadAll(); }).catch(function (er) { msg(er.message, true); $("saveBtn").disabled = false; });
    };
  }

  // ------------------------------------------------------------ start
  if (!SB || !SB.url) { msg("Supabase is not configured (config.js).", true); }
  else if (session) {
    api("/rest/v1/rpc/is_admin", { method: "POST", body: {} }).then(function (ok) { if (ok === true) showPanel(); else saveSession(null); }).catch(function () { saveSession(null); });
  }
})();
