(function () {
  "use strict";
  var SB = window.QAREEB_SUPABASE, KEY = "qareeb-admin-session";
  var $ = function (id) { return document.getElementById(id); };
  var state = { tab: "home", rooms: [], centers: [], requests: [], suggestions: [], staff: [], notes: {}, team: [], owners: [], activity: [] };
  var session = null, access = null;
  var ROLES = {
    owner:      { label: "Owner",            note: "Everything, including staff and their access." },
    manager:    { label: "Manager",          note: "Rooms, language centers and student requests." },
    data_entry: { label: "Data entry",       note: "Adds and edits rooms and photos. Cannot delete or see student contacts." },
    sales:      { label: "Sales or support", note: "Sees and works on student requests. Cannot edit rooms." },
    viewer:     { label: "Viewer",           note: "Can look at everything except student contacts. Cannot change anything." }
  };
  var PRESETS = {
    owner:      { rooms_edit: 1, rooms_delete: 1, centers_edit: 1, leads_view: 1, leads_edit: 1 },
    manager:    { rooms_edit: 1, rooms_delete: 1, centers_edit: 1, leads_view: 1, leads_edit: 1 },
    data_entry: { rooms_edit: 1, rooms_delete: 0, centers_edit: 0, leads_view: 0, leads_edit: 0 },
    sales:      { rooms_edit: 0, rooms_delete: 0, centers_edit: 0, leads_view: 1, leads_edit: 1 },
    viewer:     { rooms_edit: 0, rooms_delete: 0, centers_edit: 0, leads_view: 0, leads_edit: 0 }
  };
  var SWITCHES = [
    ["rooms_edit",   "Add and edit rooms, photos and status"],
    ["rooms_delete", "Delete rooms"],
    ["centers_edit", "Add and edit language centers"],
    ["leads_view",   "See student requests, names and phone numbers"],
    ["leads_edit",   "Work on and delete student requests (needs the switch above)"]
  ];
  function can(p) { return !!(access && access[p]); }
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
    $("loginBox").hidden = true; $("panel").hidden = false; $("logout").hidden = false;
    $("who").textContent = (access.name || access.email) + " · " + (ROLES[access.role] ? ROLES[access.role].label : access.role);
    var tabs = { requests: can("leads_view"), suggest: can("centers_edit"), staff: can("staff_manage"), owners: can("rooms_edit") || can("leads_view"), history: can("staff_manage") };
    document.querySelectorAll(".tab").forEach(function (b) { b.hidden = tabs[b.dataset.tab] === false; });
    loadAll();
  }
  function checkAccess() {
    return api("/rest/v1/rpc/my_access", { method: "POST", body: {} }).then(function (a) {
      if (!a) throw new Error("This account has not been given access. Ask the owner to add your email in the Staff tab.");
      access = a;
    });
  }

  // Login box has four modes: sign in, first-time account, forgot password, set a new password (from the emailed link).
  var mode = "login", recoveryToken = null;
  var MODES = {
    login:  { h: "Staff sign-in",       p: "Use the email and password the owner gave you.",                                    btn: "Log in",             pw: true,  newpw: false },
    signup: { h: "Create your account", p: "Use the email the owner added for you. We will email you a link to confirm it.", btn: "Create account", pw: true,  newpw: true },
    forgot: { h: "Forgot password",     p: "Enter your email and we will send you a link to choose a new password.", btn: "Send the link",    pw: false, newpw: false },
    reset:  { h: "Choose a new password", p: "At least 8 characters.",                                             btn: "Save new password",  pw: true,  newpw: true }
  };
  function setMode(m) {
    mode = m; var c = MODES[m];
    $("loginH").textContent = c.h; $("loginP").textContent = c.p; $("loginBtn").textContent = c.btn;
    $("pwRow").hidden = !c.pw; $("emailRow").hidden = (m === "reset");
    $("email").required = (m !== "reset"); $("pw").required = c.pw;
    $("pw").autocomplete = c.newpw ? "new-password" : "current-password"; $("pw").minLength = c.newpw ? 8 : 0;
    $("pwLabel").textContent = m === "reset" ? "New password" : "Password";
    $("toSignup").hidden = true; $("toForgot").hidden = m !== "login"; $("toLogin").hidden = m === "login";
    msg("");
  }
  var REDIRECT = location.origin + location.pathname;
  function authPost(path, body) {
    return fetch(SB.url + path, { method: "POST", headers: { apikey: SB.key, "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error_description || j.msg || j.message || "Something went wrong"); return j; }); });
  }

  $("loginForm").onsubmit = function (e) {
    e.preventDefault(); msg("");
    var email = $("email").value.trim().toLowerCase(), pw = $("pw").value;
    if (mode === "login") {
      authCall("password", { email: email, password: pw }).then(function (s) {
        saveSession(s); return checkAccess();
      }).then(function () { $("pw").value = ""; showPanel(); })
        .catch(function (err) { saveSession(null); msg(err.message, true); });
    } else if (mode === "signup") {
      authPost("/auth/v1/signup?redirect_to=" + encodeURIComponent(REDIRECT), { email: email, password: pw }).then(function () {
        $("pw").value = ""; setMode("login");
        msg("Almost done. Open the email we just sent you, click the link to confirm, then log in here.");
      }).catch(function (err) { msg(err.message, true); });
    } else if (mode === "forgot") {
      authPost("/auth/v1/recover?redirect_to=" + encodeURIComponent(REDIRECT), { email: email }).then(function () {
        setMode("login"); msg("If that email has an account, a link to choose a new password is on its way.");
      }).catch(function (err) { msg(err.message, true); });
    } else if (mode === "reset") {
      fetch(SB.url + "/auth/v1/user", { method: "PUT", headers: { apikey: SB.key, Authorization: "Bearer " + recoveryToken, "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error_description || j.msg || j.message || "Could not save the password"); }); })
        .then(function () { recoveryToken = null; $("pw").value = ""; setMode("login"); msg("Password saved. You can log in now."); })
        .catch(function (err) { msg(err.message, true); });
    }
  };
  $("toSignup").onclick = function () { setMode("signup"); };
  $("toForgot").onclick = function () { setMode("forgot"); };
  $("toLogin").onclick = function () { setMode("login"); };
  $("logout").onclick = logout;

  // Links from the emails arrive as admin.html#access_token=...&type=recovery (or an error)
  (function readEmailLink() {
    if (!location.hash || location.hash.length < 2) return;
    var h = {}; location.hash.slice(1).split("&").forEach(function (p) { var i = p.indexOf("="); if (i > 0) h[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, " ")); });
    if (!h.access_token && !h.error_description) return;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (h.error_description) { setMode("login"); msg(h.error_description + ". Please ask for a new link.", true); return; }
    saveSession(null);
    if (h.type === "recovery") { recoveryToken = h.access_token; setMode("reset"); }
    else { setMode("login"); msg("Your email is confirmed. You can log in now."); }
  })();

  // ------------------------------------------------------------ data
  function loadAll() {
    msg("");
    var none = function () { return Promise.resolve([]); };
    return Promise.all([
      api("/rest/v1/listings?select=*&order=id.desc"),
      api("/rest/v1/centers?select=*&order=sort"),
      can("leads_view") ? api("/rest/v1/requests?select=*&order=created_at.desc&limit=500") : none(),
      can("centers_edit") ? api("/rest/v1/center_requests?select=*&order=created_at.desc&limit=500").catch(none) : none(),
      can("staff_manage") ? api("/rest/v1/staff?select=*&order=created_at") : none(),
      can("leads_view") ? api("/rest/v1/lead_notes?select=*&order=created_at&limit=3000").catch(none) : none(),
      can("leads_view") ? api("/rest/v1/rpc/staff_directory", { method: "POST", body: {} }).catch(none) : none(),
      (can("rooms_edit") || can("leads_view")) ? api("/rest/v1/owners?select=*&order=name").catch(none) : none(),
      can("staff_manage") ? api("/rest/v1/activity_log?select=*&order=at.desc&limit=300").catch(none) : none()
    ]).then(function (r) { state.rooms = r[0] || []; state.centers = r[1] || []; state.requests = r[2] || []; state.suggestions = r[3] || []; state.staff = r[4] || []; state.team = r[6] || []; state.owners = r[7] || []; state.activity = r[8] || []; groupNotes(r[5] || []); render(); })
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
    var newN = state.requests.filter(function (r) { return r.status === "new"; }).length, lt = document.querySelector('[data-tab=requests]');
    if (lt) lt.textContent = "Leads" + (newN ? " (" + newN + " new)" : "");
    $("addBtn").textContent = state.tab === "centers" ? "+ Add center" : state.tab === "staff" ? "+ Add staff member" : state.tab === "owners" ? "+ Add owner" : "+ Add room";
    var TITLES = { home: "Home", share: "Student site", rooms: "Rooms", requests: "Leads", owners: "Owners", centers: "Language centers", suggest: "Center suggestions", staff: "Staff", history: "History" };
    $("pageTitle").textContent = TITLES[state.tab] || "";
    $("addBtn").hidden = state.tab === "home" || state.tab === "share" || state.tab === "history" || state.tab === "requests" || state.tab === "suggest" ||
      ((state.tab === "rooms" || state.tab === "owners") && !can("rooms_edit")) || (state.tab === "centers" && !can("centers_edit"));
    if (state.tab === "home") renderHome(); else if (state.tab === "share") renderShare(); else if (state.tab === "rooms") renderRooms(); else if (state.tab === "requests") renderRequests(); else if (state.tab === "suggest") renderSuggestions(); else if (state.tab === "staff") renderStaff();
    else if (state.tab === "owners") renderOwners(); else if (state.tab === "history") renderHistory(); else renderCenters();
  }
  function ownerName(id) { var o = state.owners.filter(function (x) { return x.id === id; })[0]; return o ? o.name : ""; }
  function when(t) { return new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

  // ------------------------------------------------------------ student site (links to share)
  var shareLang = "";   // "" = student's own language, "en", "ar"
  function siteBase() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
  function siteLink(extra) {
    var q = [];
    if (extra) q.push(extra);
    if (shareLang) q.push("lang=" + shareLang);
    return siteBase() + (q.length ? "?" + q.join("&") : "");
  }
  function shareText(url) {
    return shareLang === "ar"
      ? "تبحث عن سكن قريب من معهدك في كوالالمبور؟ اعثر على أقرب الغرف هنا: " + url
      : "Looking for a room near your language center in Kuala Lumpur? Find the closest rooms here: " + url;
  }
  function waShare(url) { return "https://wa.me/?text=" + encodeURIComponent(shareText(url)); }
  function qrSvg(url) {
    if (typeof window.qrcode !== "function") return "";
    var q = window.qrcode(0, "M"); q.addData(url); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  }
  function renderShare() {
    var url = siteLink(), svg = qrSvg(url);
    var centersList = state.centers.filter(function (c) { return c.grp === "center"; });
    var opt = function (v, label) { return '<option value="' + v + '"' + (shareLang === v ? " selected" : "") + ">" + label + "</option>"; };
    $("list").innerHTML =
      '<div class="sharecard"><h2>Link for students</h2><p class="help">Send this to students, post it in your WhatsApp groups, or print the QR code on a poster. It opens the Qareeb website.</p>' +
      '<div class="fld" style="max-width:320px;margin:12px 0 0"><label for="shareLang">Language the link opens in</label><select id="shareLang">' + opt("", "The student’s own choice") + opt("en", "English") + opt("ar", "العربية (Arabic)") + "</select></div>" +
      '<div class="linkrow"><input id="shareUrl" readonly value="' + esc(url) + '" aria-label="Student link">' +
      '<button class="btn sm" type="button" data-act="copyurl" data-url="' + esc(url) + '">Copy link</button>' +
      '<a class="btn wa sm" target="_blank" rel="noopener" href="' + esc(waShare(url)) + '">Share on WhatsApp</a>' +
      '<a class="btn sec sm" target="_blank" rel="noopener" href="' + esc(url) + '">Open</a></div>' +
      (svg ? '<div class="qrbox"><div class="qr" id="qrBox">' + svg + '</div><div><button class="btn sec sm" type="button" data-act="qrdl">Download QR code</button><p class="help" style="margin-top:8px">Scanning it with a phone camera opens the same link.</p></div></div>' : '<p class="help">The QR code could not load (no internet connection to the code library).</p>') + "</div>" +
      '<div class="sharecard"><h2>Link for one language center</h2><p class="help">Opens the website already set to that center, so the student sees the closest rooms straight away. Use it in a center’s WhatsApp group.</p>' +
      (centersList.length ? centersList.map(function (c) {
        var u = siteLink("center=" + encodeURIComponent(c.id));
        return '<div class="centerlink"><span>' + esc(c.name_en) + '</span><button class="btn sec sm" type="button" data-act="copyurl" data-url="' + esc(u) + '">Copy link</button><a class="btn wa sm" target="_blank" rel="noopener" href="' + esc(waShare(u)) + '">WhatsApp</a></div>';
      }).join("") : '<p class="meta2">No language centers yet.</p>') + "</div>";
  }
  function copyText(text) {
    var done = function () { msg("Link copied."); };
    var fallback = function () {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { msg("Could not copy. Select the link and copy it by hand.", true); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  function downloadQr() {
    var svg = $("qrBox") && $("qrBox").querySelector("svg"); if (!svg) return;
    var xml = new XMLSerializer().serializeToString(svg), img = new Image();
    img.onload = function () {
      var size = 900, pad = 60, c = document.createElement("canvas"); c.width = c.height = size + pad * 2;
      var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(img, pad, pad, size, size);
      c.toBlob(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "qareeb-qr.png"; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  }

  // ------------------------------------------------------------ home (what needs attention)
  function renderHome() {
    var now = new Date(), blocks = [], hour = 3600 * 1000;
    var live = state.rooms.filter(function (r) { return r.published; });
    var holds = state.rooms.filter(function (r) { return r.status === "reserved" && r.reserved_until && new Date(r.reserved_until) - now < 24 * hour; });
    var tile = function (n, label, go, hot) { return '<button type="button" class="tile' + (hot && n ? " hot" : "") + '" data-go="' + go + '"><b>' + n + "</b><span>" + label + "</span></button>"; };
    var tiles = "";
    if (can("leads_view")) {
      var newN = state.requests.filter(function (r) { return r.status === "new"; }).length, dueN = state.requests.filter(isDue).length;
      tiles += tile(newN, "New leads", "requests:new", true) + tile(dueN, "Follow-ups due", "requests:due", true);
    }
    tiles += tile(state.rooms.filter(function (r) { return r.status === "available" && r.published; }).length, "Rooms available now", "rooms", false);
    tiles += tile(holds.length, "Holds ending within 24 hours", "rooms", true);
    var todo = [];
    if (can("leads_view")) {
      var old = state.requests.filter(function (r) { return r.status === "new" && now - new Date(r.created_at) > 24 * hour; }).length;
      if (old) todo.push(["requests:new", old + " lead" + (old === 1 ? " has" : "s have") + " been waiting more than a day without a reply."]);
      state.requests.filter(isDue).slice(0, 5).forEach(function (r) { var room = roomOf(r); todo.push(["requests:due", "Follow up with " + r.name + (room ? " about " + room.title_en : "") + " (was due " + r.follow_up + ")."]); });
    }
    holds.slice(0, 5).forEach(function (r) { todo.push(["rooms", (new Date(r.reserved_until) < now ? "Hold expired on " : "Hold ends soon for ") + r.title_en + ". Mark it Rented or Available."]); });
    var unver = live.filter(function (r) { return !(r.v_video && r.v_owner); }).length;
    if (unver) todo.push(["rooms", unver + " visible room" + (unver === 1 ? " is" : "s are") + " not verified yet."]);
    var nophoto = live.filter(function (r) { return !(r.photos && r.photos.length); }).length;
    if (nophoto) todo.push(["rooms", nophoto + " visible room" + (nophoto === 1 ? " has" : "s have") + " no photos."]);
    if (can("rooms_edit") || can("leads_view")) {
      var noowner = state.rooms.filter(function (r) { return !r.owner_id; }).length;
      if (noowner) todo.push(["owners", noowner + " room" + (noowner === 1 ? " has" : "s have") + " no owner linked."]);
    }
    var funnel = "";
    if (can("leads_view") && state.requests.length) {
      var counts = {}; state.requests.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
      var max = Math.max.apply(null, STATUSES.map(function (s) { return counts[s[0]] || 0; }).concat([1]));
      funnel = '<div class="item" style="display:block"><h3>Leads by status</h3>' + STATUSES.map(function (s) {
        var n = counts[s[0]] || 0; return '<div class="bar-row"><span>' + s[1] + '</span><i style="width:' + Math.max(2, Math.round(n / max * 100)) + '%"></i><b>' + n + "</b></div>";
      }).join("") + "</div>";
      var days = [];
      for (var d = 6; d >= 0; d--) { var dt = new Date(now - d * 24 * hour), key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); days.push({ key: key, label: dt.toLocaleDateString([], { weekday: "short" }), n: 0 }); }
      state.requests.forEach(function (r) { var c = new Date(r.created_at), key = c.getFullYear() + "-" + String(c.getMonth() + 1).padStart(2, "0") + "-" + String(c.getDate()).padStart(2, "0"); days.forEach(function (x) { if (x.key === key) x.n++; }); });
      var dmax = Math.max.apply(null, days.map(function (x) { return x.n; }).concat([1]));
      funnel += '<div class="item" style="display:block"><h3>Requests, last 7 days</h3><div class="spark">' + days.map(function (x) { return '<div><i style="height:' + Math.max(3, Math.round(x.n / dmax * 60)) + 'px"></i><b>' + x.n + "</b><span>" + x.label + "</span></div>"; }).join("") + "</div></div>";
    }
    $("list").innerHTML = '<div class="tiles">' + tiles + "</div>" +
      '<div class="item" style="display:block"><h3>Needs attention</h3>' + (todo.length ? todo.map(function (t) { return '<div class="todo"><span>' + esc(t[1]) + '</span><button type="button" class="btn sec sm" data-go="' + t[0] + '">Open</button></div>'; }).join("") : '<p class="meta2" style="margin:6px 0 0">Nothing needs attention right now.</p>') + "</div>" + funnel;
  }

  // ------------------------------------------------------------ owners directory
  function renderOwners() {
    var edit = can("rooms_edit");
    if (!state.owners.length) { $("list").innerHTML = '<p class="meta2">No owners yet.' + (edit ? ' Click "Add owner", then choose the owner when you add or edit a room.' : "") + "</p>"; return; }
    $("list").innerHTML = state.owners.map(function (o) {
      var rooms = state.rooms.filter(function (r) { return r.owner_id === o.id; });
      var digits = String(o.phone || "").replace(/\D/g, ""), phone = digits.length >= 8 ? '<a href="https://wa.me/' + digits + '" target="_blank" rel="noopener">' + esc(o.phone) + "</a>" : esc(o.phone || "no phone yet");
      return '<div class="item" data-id="' + o.id + '"><div class="main"><h3>' + esc(o.name) + '</h3><div class="meta2">' + phone + " · " + rooms.length + " room" + (rooms.length === 1 ? "" : "s") + (rooms.length ? ": " + rooms.map(function (r) { return esc(r.title_en); }).join(", ") : "") + "</div>" +
        '<div style="margin-top:6px"><span class="chip ' + (o.id_checked ? "ok" : "") + '">' + (o.id_checked ? "Identity checked" : "Identity not checked") + "</span></div>" +
        (o.notes ? '<p class="help" style="margin-top:6px;white-space:pre-wrap">' + esc(o.notes) + "</p>" : "") +
        (edit ? '<div class="acts"><button class="btn sm" data-act="edito" type="button">Edit</button>' + (can("rooms_delete") ? '<button class="btn danger sm" data-act="delo" type="button">Delete</button>' : "") + "</div>" : "") + "</div></div>";
    }).join("");
  }
  function openOwnerForm(o) {
    var isNew = !o; o = o || { name: "", phone: "", notes: "", id_checked: false };
    $("dform").innerHTML = '<form id="of"><h2>' + (isNew ? "Add an owner" : "Edit owner") + "</h2>" +
      '<div class="fld"><label for="o-n">Name</label><input id="o-n" name="name" required maxlength="100" value="' + esc(o.name) + '"></div>' +
      '<div class="fld"><label for="o-p">Phone or WhatsApp (with country code)</label><input id="o-p" name="phone" maxlength="40" value="' + esc(o.phone) + '" placeholder="+60 12 345 6789"></div>' +
      chk("id_checked", "Identity checked (ID or ownership document seen)", o.id_checked) +
      '<div class="fld"><label for="o-no">Private notes</label><textarea id="o-no" name="notes" maxlength="2000">' + esc(o.notes) + '</textarea><p class="help">Only staff see this. Never shown to students.</p></div>' +
      '<div class="foot2"><button type="button" class="btn sec" id="cancelBtn">Cancel</button><button type="submit" class="btn" id="saveBtn">Save</button></div></form>';
    dlg.showModal(); $("cancelBtn").onclick = closeDlg;
    $("of").onsubmit = function (e) {
      e.preventDefault(); var f = $("of"), body = { name: f.name.value.trim(), phone: f.phone.value.trim(), notes: f.notes.value.trim(), id_checked: f.id_checked.checked };
      $("saveBtn").disabled = true;
      (isNew ? api("/rest/v1/owners", { method: "POST", body: body, write: true }) : api("/rest/v1/owners?id=eq." + o.id, { method: "PATCH", body: body, write: true }))
        .then(function () { closeDlg(); msg("Saved."); return loadAll(); }).catch(function (er) { msg(er.message, true); $("saveBtn").disabled = false; });
    };
  }

  // ------------------------------------------------------------ history (owners only)
  var histFilter = "all";
  var ENT = { listings: "Room", centers: "Language center", owners: "Owner", staff: "Staff" };
  function renderHistory() {
    var chipB = function (v, label) { return '<button type="button" class="fchip' + (histFilter === v ? " on" : "") + '" data-act="hfilter" data-v="' + v + '">' + label + "</button>"; };
    var rows = state.activity.filter(function (a) { return histFilter === "all" || a.entity === histFilter; });
    $("list").innerHTML = '<div class="fbar">' + chipB("all", "Everything") + Object.keys(ENT).map(function (k) { return chipB(k, ENT[k] + "s"); }).join("") + "</div>" +
      '<p class="help" style="margin:0 0 10px">The latest 300 changes. Nobody can edit or delete this list.</p>' +
      (rows.length ? rows.map(function (a) {
        return '<div class="item"><div class="main"><div class="meta2">' + esc(when(a.at)) + " · " + esc(a.actor === "website" ? "website (a student)" : personName(a.actor)) + '</div><div><span class="chip ' + (a.action === "delete" ? "off" : a.action === "insert" ? "ok" : "") + '">' + esc(a.action === "insert" ? "added" : a.action === "delete" ? "deleted" : "changed") + "</span> <b>" + esc(ENT[a.entity] || a.entity) + "</b> " + esc(a.label) + "</div>" +
          (a.summary ? '<div class="meta2" style="margin-top:2px">' + esc(a.summary) + "</div>" : "") + "</div></div>";
      }).join("") : '<p class="meta2">Nothing recorded yet.</p>');
  }
  function renderStaff() {
    var intro = '<p class="meta2" style="margin:0 0 12px">Add a person with their email, a role and a password, then give them those details. They log in on this page with them. Use <b>Edit access</b> to change their role, their switches or their password, and <b>Switch off</b> to stop access at any time.</p>';
    $("list").innerHTML = intro + state.staff.map(function (s) {
      var on = SWITCHES.filter(function (x) { return s.role === "owner" || s[x[0]]; }).map(function (x) { return '<span class="chip">' + esc(x[1].replace(/ \(.*\)$/, "")) + "</span>"; }).join("") || '<span class="meta2">Can look only</span>';
      var me = access && s.email === access.email;
      return '<div class="item" data-id="' + esc(s.email) + '"><div class="main"><h3>' + esc(s.name || s.email) + (me ? ' <span class="chip">You</span>' : "") + '</h3><div class="meta2">' + esc(s.email) + " · " + esc(ROLES[s.role] ? ROLES[s.role].label : s.role) + '</div>' +
        '<div style="margin-top:6px"><span class="chip ' + (s.active ? "ok" : "off") + '">' + (s.active ? "Active" : "Switched off") + "</span>" + on + "</div>" +
        '<div class="acts"><button class="btn sm" data-act="edits" type="button">Edit access</button>' +
        '<button class="btn sec sm" data-act="actives" type="button">' + (s.active ? "Switch off" : "Switch on") + "</button>" +
        '<button class="btn danger sm" data-act="dels" type="button">Remove</button></div></div></div>';
    }).join("");
  }
  function renderRooms() {
    if (!state.rooms.length) { $("list").innerHTML = '<p class="meta2">No rooms yet. Click "Add room" to create the first one.</p>'; return; }
    $("list").innerHTML = state.rooms.map(function (l) {
      var asked = state.requests.filter(function (r) { return r.listing_id === l.id; }).length;
      var edit = can("rooms_edit"), acts = "";
      if (edit) acts += '<select data-act="status" aria-label="Status"><option value="available"' + (l.status === "available" ? " selected" : "") + '>Available</option><option value="reserved"' + (l.status === "reserved" ? " selected" : "") + '>Reserved</option><option value="taken"' + (l.status === "taken" ? " selected" : "") + '>Rented</option></select>' +
        '<button class="btn sec sm" data-act="toggle" type="button">' + (l.published ? "Hide" : "Show") + '</button>' +
        '<button class="btn sm" data-act="edit" type="button">Edit</button>';
      if (can("rooms_delete")) acts += '<button class="btn danger sm" data-act="del" type="button">Delete</button>';
      return '<div class="item" data-id="' + l.id + '"><div class="thumb" style="' + thumbStyle(l) + '">' + ((l.photos && l.photos.length) ? "" : "🏠") + "</div>" +
        '<div class="main"><h3>' + esc(l.title_en) + '</h3><div class="meta2">RM ' + esc(l.price) + " per month · " + esc(l.area) + " · " + esc(l.type) + " · min. " + esc(l.min_stay) + " mo" + (can("leads_view") ? " · " + asked + " request" + (asked === 1 ? "" : "s") : "") + " · " + esc(l.status) + (ownerName(l.owner_id) ? " · owner: " + esc(ownerName(l.owner_id)) : "") + "</div>" +
        "<div style=\"margin-top:6px\">" + chips(l) + "</div>" +
        (acts ? '<div class="acts">' + acts + "</div>" : "") + "</div></div>";
    }).join("");
  }
  function centerName(id) { var c = state.centers.filter(function (x) { return x.id === id; })[0]; return c ? c.name_en : (id || "–"); }
  // ------------------------------------------------------------ leads (student requests as a pipeline)
  var STATUSES = [["new", "New"], ["contacted", "Contacted"], ["viewing", "Viewing"], ["reserved", "Reserved"], ["rented", "Rented"], ["lost", "Lost"]];
  var lf = { status: "all", mine: false, due: false, q: "" }, openNotes = {};
  function statusLabel(s) { var x = STATUSES.filter(function (y) { return y[0] === s; })[0]; return x ? x[1] : s; }
  function todayStr() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function isDue(r) { return !!r.follow_up && r.follow_up <= todayStr() && r.status !== "rented" && r.status !== "lost"; }
  function roomOf(r) { return state.rooms.filter(function (x) { return x.id === r.listing_id; })[0]; }
  function personName(email) {
    if (!email) return "Nobody";
    var p = state.team.filter(function (t) { return t.email === email; })[0];
    return p && p.name ? p.name : email;
  }
  function leadMatches(r) {
    if (lf.status !== "all" && r.status !== lf.status) return false;
    if (lf.mine && r.assigned_to !== (access && access.email)) return false;
    if (lf.due && !isDue(r)) return false;
    if (lf.q) {
      var room = roomOf(r), hay = (r.name + " " + r.whatsapp + " " + (room ? room.title_en : "")).toLowerCase();
      if (hay.indexOf(lf.q.toLowerCase()) < 0) return false;
    }
    return true;
  }
  function phoneHtml(r) {
    var digits = String(r.whatsapp || "").replace(/\D/g, "");
    return digits.length >= 8 ? '<a href="https://wa.me/' + digits + '" target="_blank" rel="noopener">' + esc(r.whatsapp) + "</a>" : esc(r.whatsapp);
  }
  function leadCard(r) {
    var room = roomOf(r), edit = can("leads_edit"), notes = state.notes[r.id] || [], open = !!openNotes[r.id];
    var chipsH = '<span class="chip st-' + esc(r.status) + '">' + esc(statusLabel(r.status)) + "</span>" +
      (r.kind === "reserve" ? '<span class="chip off">RESERVATION</span>' : "") + (r.kind === "tour" ? '<span class="chip">VIDEO TOUR</span>' : "") +
      '<span class="chip">' + esc(personName(r.assigned_to)) + "</span>" +
      (r.follow_up ? '<span class="chip ' + (isDue(r) ? "off" : "") + '">' + (isDue(r) ? "Follow up due " : "Follow up ") + esc(r.follow_up) + "</span>" : "");
    var acts = "";
    if (edit) {
      acts += '<select data-act="lstatus" aria-label="Status">' + STATUSES.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === r.status ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select>" +
        '<select data-act="lassign" aria-label="Assigned to"><option value="">Nobody</option>' + state.team.map(function (t) { return '<option value="' + esc(t.email) + '"' + (t.email === r.assigned_to ? " selected" : "") + ">" + esc(t.name || t.email) + "</option>"; }).join("") + "</select>" +
        '<label class="meta2" style="display:flex;gap:6px;align-items:center">Follow up <input type="date" data-act="lfollow" value="' + esc(r.follow_up || "") + '" style="padding:5px 8px;border:1px solid var(--line);border-radius:8px"></label>';
    }
    acts += '<button class="btn sec sm" data-act="lnotes" type="button">Notes (' + notes.length + ")</button>";
    if (edit) acts += '<button class="btn danger sm" data-act="delreq" type="button">Delete</button>';
    var notesH = "";
    if (open) {
      notesH = '<div class="notes">' + (notes.map(function (n) {
        return '<div class="note' + (n.system ? " sys" : "") + '"><div class="meta2">' + esc(new Date(n.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) + " · " + esc(personName(n.author)) + "</div><div>" + esc(n.body) + "</div></div>";
      }).join("") || '<p class="help">No notes yet.</p>') +
        (edit ? '<div class="fld" style="margin:10px 0 0"><textarea data-note placeholder="Write a note, for example: called, will visit Saturday" maxlength="1000"></textarea></div><button class="btn sm" data-act="lnote" type="button" style="margin-top:8px">Add note</button>' : "") + "</div>";
    }
    return '<div class="item lead" data-id="' + r.id + '"><div class="main"><h3>' + esc(room ? room.title_en : "Deleted room") + '</h3><div class="meta2">' +
      esc(new Date(r.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) + " · " + esc(r.name) + " · " + phoneHtml(r) + " · language center: " + esc(centerName(r.center)) + (r.note ? " · “" + esc(r.note) + "”" : "") + "</div>" +
      '<div style="margin-top:6px">' + chipsH + '</div><div class="acts">' + acts + "</div>" + notesH + "</div></div>";
  }
  function renderLeadCards() {
    var rows = state.requests.filter(leadMatches);
    $("leadCards").innerHTML = rows.length ? rows.map(leadCard).join("") : '<p class="meta2">No leads match these filters.</p>';
  }
  function renderRequests() {
    if (!state.requests.length) { $("list").innerHTML = '<p class="meta2">No leads yet. One appears each time a student asks about a room, requests a video tour or reserves.</p>'; return; }
    var counts = {}, byRoom = {};
    state.requests.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; byRoom[r.listing_id] = (byRoom[r.listing_id] || 0) + 1; });
    var dueN = state.requests.filter(isDue).length, mineN = state.requests.filter(function (r) { return r.assigned_to === (access && access.email); }).length;
    var chipB = function (act, v, label, n, on) { return '<button type="button" class="fchip' + (on ? " on" : "") + '" data-act="' + act + '" data-v="' + v + '">' + label + (n != null ? " <b>" + n + "</b>" : "") + "</button>"; };
    var bar = '<div class="fbar">' + chipB("lfilter", "all", "All", state.requests.length, lf.status === "all") +
      STATUSES.map(function (s) { return chipB("lfilter", s[0], s[1], counts[s[0]] || 0, lf.status === s[0]); }).join("") + "</div>" +
      '<div class="fbar">' + chipB("lmine", "", "Assigned to me", mineN, lf.mine) + chipB("ldue", "", "Follow-ups due", dueN, lf.due) +
      '<input type="search" id="leadSearch" placeholder="Search name, number or room" value="' + esc(lf.q) + '" style="flex:1;min-width:180px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;font:inherit"></div>';
    var top = Object.keys(byRoom).sort(function (a, b) { return byRoom[b] - byRoom[a]; }).slice(0, 5).map(function (id) {
      var room = state.rooms.filter(function (x) { return String(x.id) === id; })[0];
      return '<div class="count-row"><span>' + esc(room ? room.title_en : "Deleted room") + "</span><b>" + byRoom[id] + "</b></div>";
    }).join("");
    $("list").innerHTML = bar + '<div id="leadCards"></div><div class="item" style="display:block;margin-top:14px"><h3>Most requested rooms</h3>' + top + "</div>";
    renderLeadCards();
  }
  function loadLeads() {
    return Promise.all([
      api("/rest/v1/requests?select=*&order=created_at.desc&limit=500"),
      api("/rest/v1/lead_notes?select=*&order=created_at&limit=3000").catch(function () { return []; })
    ]).then(function (r) { state.requests = r[0] || []; groupNotes(r[1] || []); render(); });
  }
  function groupNotes(rows) { state.notes = {}; rows.forEach(function (n) { (state.notes[n.request_id] = state.notes[n.request_id] || []).push(n); }); }
  function patchLead(id, body, ok) {
    return api("/rest/v1/requests?id=eq." + encodeURIComponent(id), { method: "PATCH", body: body, write: true })
      .then(function () { msg(ok); return loadLeads(); }).catch(function (er) { msg(er.message, true); loadLeads(); });
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
        (can("centers_edit") ? '<div class="acts" style="margin:0"><button class="btn sm" data-act="editc" type="button">Edit</button><button class="btn danger sm" data-act="delc" type="button">Delete</button></div>' : "") + "</div>";
    }).join("");
  }

  // ------------------------------------------------------------ list actions
  $("list").onclick = function (e) {
    var g = e.target.closest("[data-go]");
    if (g) {   // shortcuts on the Home page
      var gp = g.dataset.go.split(":");
      state.tab = gp[0];
      if (gp[0] === "requests") { lf.mine = false; lf.status = gp[1] === "new" ? "new" : "all"; lf.due = gp[1] === "due"; lf.q = ""; }
      render(); window.scrollTo(0, 0); return;
    }
    var b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
    var item = b.closest(".item"), id = item ? item.dataset.id : "", act = b.dataset.act;
    if (act === "copyurl") copyText(b.dataset.url);
    else if (act === "qrdl") downloadQr();
    else if (act === "hfilter") { histFilter = b.dataset.v; render(); }
    else if (act === "edito") openOwnerForm(state.owners.filter(function (x) { return String(x.id) === id; })[0]);
    else if (act === "delo") {
      var ow = state.owners.filter(function (x) { return String(x.id) === id; })[0];
      if (confirm('Delete owner "' + ow.name + '"? Their rooms stay, but will no longer be linked to an owner.')) api("/rest/v1/owners?id=eq." + encodeURIComponent(id), { method: "DELETE", write: true }).then(function () { msg("Deleted."); loadAll(); }).catch(function (er) { msg(er.message, true); });
    }
    else if (act === "lfilter") { lf.status = b.dataset.v; render(); }
    else if (act === "lmine") { lf.mine = !lf.mine; render(); }
    else if (act === "ldue") { lf.due = !lf.due; render(); }
    else if (act === "lnotes") { openNotes[id] = !openNotes[id]; renderLeadCards(); }
    else if (act === "lnote") {
      var ta = item.querySelector("textarea[data-note]"), text = ta ? ta.value.trim() : "";
      if (!text) { msg("Write something first.", true); return; }
      b.disabled = true;
      api("/rest/v1/lead_notes", { method: "POST", body: { request_id: +id, author: access.email, body: text }, write: true })
        .then(function () { msg("Note added."); return loadLeads(); }).catch(function (er) { msg(er.message, true); b.disabled = false; });
    }
    else if (act === "edits") openStaffForm(state.staff.filter(function (x) { return x.email === id; })[0]);
    else if (act === "actives") { var st = state.staff.filter(function (x) { return x.email === id; })[0]; patchStaff(st.email, { active: !st.active }, st.active ? "Switched off. They can no longer use the admin page." : "Switched on."); }
    else if (act === "dels") { if (confirm("Remove " + id + "? Their login is deleted and they lose all access.")) api("/rest/v1/staff?email=eq." + encodeURIComponent(id), { method: "DELETE", write: true }).then(function () { return staffFn("remove", id).catch(function () { msg("Access removed, but the login itself could not be deleted. It has no access.", true); }); }).then(function () { if (!$("msg").classList.contains("err")) msg("Removed."); loadAll(); }).catch(function (er) { msg(er.message, true); }); }
    else if (act === "edit") openRoomForm(state.rooms.filter(function (x) { return String(x.id) === id; })[0]);
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
  $("list").oninput = function (e) {
    if (e.target.id === "leadSearch") { lf.q = e.target.value; renderLeadCards(); }
  };
  $("list").onchange = function (e) {
    var act = e.target.dataset.act, lid = e.target.closest(".item") ? e.target.closest(".item").dataset.id : "";
    if (e.target.id === "shareLang") { shareLang = e.target.value; renderShare(); return; }
    if (act === "lstatus") patchLead(lid, { status: e.target.value }, "Status updated.");
    else if (act === "lassign") patchLead(lid, { assigned_to: e.target.value || null }, "Assigned.");
    else if (act === "lfollow") patchLead(lid, { follow_up: e.target.value || null }, e.target.value ? "Follow-up date saved." : "Follow-up date cleared.");
    else if (e.target.dataset.act === "status") { var id = e.target.closest(".item").dataset.id; patchRoom(+id, e.target.value === "reserved" ? { status: "reserved" } : { status: e.target.value, reserved_until: null }, "Status updated."); }
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
  $("addBtn").onclick = function () { if (state.tab === "centers") openCenterForm(null); else if (state.tab === "staff") openStaffForm(null); else if (state.tab === "owners") openOwnerForm(null); else openRoomForm(null); };
  // Creating / re-passwording / deleting a LOGIN needs a secret key, so a small server-side function does it (owners only).
  function staffFn(action, email, password) {
    return token().then(function (tk) {
      return fetch(SB.url + "/functions/v1/staff-admin", { method: "POST", headers: { apikey: SB.key, Authorization: "Bearer " + tk, "Content-Type": "application/json" }, body: JSON.stringify({ action: action, email: email, password: password || "" }) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || j.message || (r.status === 404 ? "The staff-login service is not set up yet." : "Error " + r.status));
        return j;
      });
    });
  }
  function suggestPassword() {
    var chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789", out = "", a = new Uint32Array(12);
    crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) out += chars[a[i] % chars.length];
    return out;
  }
  function patchStaff(email, body, ok) {
    return api("/rest/v1/staff?email=eq." + encodeURIComponent(email), { method: "PATCH", body: body, write: true }).then(function () { msg(ok); return loadAll(); }).catch(function (er) { msg(er.message, true); loadAll(); });
  }
  function openStaffForm(s) {
    var isNew = !s; s = s || Object.assign({ email: "", name: "", role: "viewer", active: true }, PRESETS.viewer);
    var roleOpts = Object.keys(ROLES).map(function (k) { return [k, ROLES[k].label]; });
    $("dform").innerHTML = '<form id="sf"><h2>' + (isNew ? "Add a staff member" : "Edit access") + "</h2>" +
      '<div class="fld"><label for="s-em">Email</label><input id="s-em" name="email" type="email" required maxlength="120" value="' + esc(s.email) + '"' + (isNew ? "" : " readonly") + ' placeholder="name@example.com"><p class="help">They must use this exact email when they create their account.</p></div>' +
      '<div class="fld"><label for="s-nm">Name</label><input id="s-nm" name="name" maxlength="80" value="' + esc(s.name) + '"></div>' +
      '<div class="fld"><label for="s-pw">' + (isNew ? "Password for them" : "Set a new password (leave empty to keep theirs)") + '</label>' +
      '<div style="display:flex;gap:8px"><input id="s-pw" name="pw" type="text" autocomplete="off" minlength="8" maxlength="72"' + (isNew ? " required" : "") + ' style="flex:1"><button type="button" class="btn sec sm" id="pwGen">Suggest one</button></div>' +
      '<p class="help">At least 8 characters. You will give it to them yourself. They log in on this page with their email and this password.</p></div>' +
      '<div class="fld"><span>Role</span>' + sel("role", roleOpts, s.role) + '<p class="help" id="roleNote"></p></div>' +
      '<fieldset><legend>What this person can do</legend>' + SWITCHES.map(function (x) { return chk(x[0], x[1], s[x[0]]); }).join("") +
      '<p class="help" id="swNote" style="margin-bottom:10px"></p></fieldset>' +
      '<div class="foot2"><button type="button" class="btn sec" id="cancelBtn">Cancel</button><button type="submit" class="btn" id="saveBtn">Save</button></div></form>';
    dlg.showModal();
    var f = $("sf");
    function note() {
      var r = f.role.value, owner = r === "owner";
      $("roleNote").textContent = ROLES[r].note;
      $("swNote").textContent = owner ? "Owners can always do everything, so these switches do not apply." : "Changing the role sets the switches to that role's usual choice. You can then adjust each one.";
      SWITCHES.forEach(function (x) { f[x[0]].disabled = owner; });
    }
    f.role.onchange = function () { var p = PRESETS[f.role.value]; SWITCHES.forEach(function (x) { f[x[0]].checked = !!p[x[0]]; }); note(); };
    SWITCHES.forEach(function (x) { f[x[0]].onchange = function () { if (x[0] === "leads_edit" && f.leads_edit.checked) f.leads_view.checked = true; if (x[0] === "leads_view" && !f.leads_view.checked) f.leads_edit.checked = false; }; });
    note();
    $("cancelBtn").onclick = closeDlg;
    $("pwGen").onclick = function () { f.pw.value = suggestPassword(); };
    function ready(email, pw) {   // shown once, so the owner can copy the details
      $("dform").innerHTML = '<h2>Account ready</h2><p>Give these details to the new staff member. Keep the password private.</p>' +
        '<div class="item" style="display:block"><div class="count-row"><span>Page</span><b>' + esc(location.origin + location.pathname) + '</b></div>' +
        '<div class="count-row"><span>Email</span><b>' + esc(email) + '</b></div><div class="count-row"><span>Password</span><b>' + esc(pw) + '</b></div></div>' +
        '<p class="help">You will not see the password again, but you can set a new one any time with Edit access.</p>' +
        '<div class="foot2"><button type="button" class="btn" id="doneBtn">Done</button></div>';
      $("doneBtn").onclick = closeDlg;
    }
    f.onsubmit = function (e) {
      e.preventDefault();
      var owner = f.role.value === "owner", p = PRESETS[f.role.value], pw = f.pw.value;
      var body = { name: f.name.value.trim(), role: f.role.value };
      SWITCHES.forEach(function (x) { body[x[0]] = owner ? !!p[x[0]] : f[x[0]].checked; });
      var email = isNew ? f.email.value.trim().toLowerCase() : s.email;
      if (isNew) { body.email = email; body.active = true; }
      if (isNew && state.staff.some(function (x) { return x.email === email; })) { msg("That email is already on the list.", true); return; }
      if (pw && pw.length < 8) { msg("The password needs at least 8 characters.", true); return; }
      $("saveBtn").disabled = true;
      var steps;
      if (isNew) {
        // create the login first, then give it access; if the login step fails nothing else happens
        steps = staffFn("create", email, pw).then(function () { return api("/rest/v1/staff", { method: "POST", body: body, write: true }); });
      } else {
        steps = api("/rest/v1/staff?email=eq." + encodeURIComponent(s.email), { method: "PATCH", body: body, write: true }).then(function () { return pw ? staffFn("set_password", email, pw) : null; });
      }
      steps.then(function () { loadAll(); if (isNew) ready(email, pw); else { closeDlg(); msg(pw ? "Saved, with the new password." : "Saved."); } })
        .catch(function (er) { msg(er.message, true); $("saveBtn").disabled = false; });
    };
  }

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
      '<div class="fld"><span>Who lives here</span>' + sel("gender", [["mixed", "Mixed"], ["women", "Women only"], ["men", "Men only"], ["family", "Families"]], r.gender) + "</div>" +
      '<div class="fld"><span>Owner (private, staff only)</span>' + sel("owner_id", [["", "No owner linked"]].concat(state.owners.map(function (o) { return [o.id, o.name]; })), r.owner_id == null ? "" : r.owner_id) + "</div></div>" +
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
      station_min: num(d.get("station_min")), bus_min: num(d.get("bus_min")), amenities: d.getAll("amen"),
      owner_id: num(d.get("owner_id"))
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
    checkAccess().then(showPanel).catch(function () { saveSession(null); });
  }
})();
