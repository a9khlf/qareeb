(function () {
  "use strict";
  var SB = window.QAREEB_SUPABASE, KEY = "qareeb-admin-session";
  var $ = function (id) { return document.getElementById(id); };
  var state = { tab: "home", rooms: [], centers: [], requests: [], suggestions: [], staff: [], notes: {}, team: [], owners: [], activity: [], links: [], linkEvents: [] };
  var session = null, access = null;
  var ROLES = {
    owner:      { label: "Owner",            note: "Everything, including staff and their access." },
    manager:    { label: "Manager",          note: "Rooms, language centers and student requests." },
    data_entry: { label: "Data entry",       note: "Adds and edits rooms and photos. Cannot delete or see student contacts." },
    sales:      { label: "Sales or support", note: "Sees and works on student requests. Cannot edit rooms." },
    viewer:     { label: "Viewer",           note: "Can look at everything except student contacts. Cannot change anything." }
  };
  var PRESETS = {
    owner:      { rooms_edit: 1, rooms_delete: 1, centers_edit: 1, leads_view: 1, leads_edit: 1, site_edit: 1 },
    manager:    { rooms_edit: 1, rooms_delete: 1, centers_edit: 1, leads_view: 1, leads_edit: 1, site_edit: 1 },
    data_entry: { rooms_edit: 1, rooms_delete: 0, centers_edit: 0, leads_view: 0, leads_edit: 0, site_edit: 0 },
    sales:      { rooms_edit: 0, rooms_delete: 0, centers_edit: 0, leads_view: 1, leads_edit: 1, site_edit: 0 },
    viewer:     { rooms_edit: 0, rooms_delete: 0, centers_edit: 0, leads_view: 0, leads_edit: 0, site_edit: 0 }
  };
  var SWITCHES = [
    ["rooms_edit",   "Add and edit rooms, photos and status"],
    ["rooms_delete", "Delete rooms"],
    ["centers_edit", "Add and edit language centers"],
    ["leads_view",   "See student requests, names and phone numbers"],
    ["leads_edit",   "Work on and delete student requests (needs the switch above)"],
    ["site_edit",    "Edit the website wording and the WhatsApp number"]
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
    $("loginBox").hidden = true; $("panel").hidden = false; document.body.classList.add("inapp");
    var nm = access.name || access.email;
    $("uName").textContent = nm; $("uRole").textContent = ROLES[access.role] ? ROLES[access.role].label : access.role;
    $("uAvatar").textContent = (nm.trim().charAt(0) || "Q").toUpperCase();
    var tabs = { requests: can("leads_view"), suggest: can("centers_edit"), staff: can("staff_manage"), owners: can("rooms_edit") || can("leads_view"), history: can("staff_manage"), site: can("site_edit") };
    document.querySelectorAll(".tab").forEach(function (b) { b.hidden = tabs[b.dataset.tab] === false; });
    document.querySelectorAll(".navgroup").forEach(function (g) { g.hidden = !g.querySelector(".tab:not([hidden])"); });
    loadAll();
  }
  // side drawer (always open on a computer, slides in on a phone)
  function openDrawer(on) { $("drawer").classList.toggle("open", on); $("scrim").hidden = !on; }
  $("menuBtn2").onclick = function () { openDrawer(true); };
  $("drawerClose").onclick = function () { openDrawer(false); };
  $("scrim").onclick = function () { openDrawer(false); };
  $("refreshBtn").onclick = function () { loadAll().then(function () { msg("Updated."); }); };
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
      can("staff_manage") ? api("/rest/v1/activity_log?select=*&order=at.desc&limit=300").catch(none) : none(),
      can("site_edit") ? api("/rest/v1/site_settings?select=*&id=eq.1").catch(none) : none(),
      api("/rest/v1/share_links?select=*&order=created_at").catch(none),
      can("leads_view") ? api("/rest/v1/link_events?select=slug,event,at&at=gte." + encodeURIComponent(new Date(Date.now() - 30 * 864e5).toISOString()) + "&order=at.desc&limit=10000").catch(none) : none()
    ]).then(function (r) { state.links = r[10] || []; state.linkEvents = r[11] || []; state.site = (r[9] && r[9][0]) || null; state.rooms = r[0] || []; state.centers = r[1] || []; state.requests = r[2] || []; state.suggestions = r[3] || []; state.staff = r[4] || []; state.team = r[6] || []; state.owners = r[7] || []; state.activity = r[8] || []; groupNotes(r[5] || []); render(); })
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
    var TITLES = { home: "Overview", search: "Search results", share: "Student page (share)", site: "Edit website", rooms: "Rooms", requests: "Leads", owners: "Owners", centers: "Language centers", suggest: "Center suggestions", staff: "Team", history: "Audit log" };
    $("pageTitle").textContent = TITLES[state.tab] || "";
    $("addBtn").hidden = state.tab === "home" || state.tab === "search" || state.tab === "share" || state.tab === "site" || state.tab === "history" || state.tab === "requests" || state.tab === "suggest" ||
      ((state.tab === "rooms" || state.tab === "owners") && !can("rooms_edit")) || (state.tab === "centers" && !can("centers_edit"));
    if (state.tab === "home") renderHome(); else if (state.tab === "search") renderSearch(); else if (state.tab === "share") renderShare(); else if (state.tab === "site") renderSite(); else if (state.tab === "rooms") renderRooms(); else if (state.tab === "requests") renderRequests(); else if (state.tab === "suggest") renderSuggestions(); else if (state.tab === "staff") renderStaff();
    else if (state.tab === "owners") renderOwners(); else if (state.tab === "history") renderHistory(); else renderCenters();
  }
  function ownerName(id) { var o = state.owners.filter(function (x) { return x.id === id; })[0]; return o ? o.name : ""; }
  function when(t) { return new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

  // ------------------------------------------------------------ student site (links to share)
  var shareLang = "";   // "" = student's own language, "en", "ar"
  var shareRef = true;  // add my personal code, so leads from my links are credited to me
  function siteBase() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
  function siteLink(extra) {
    var q = [];
    if (extra) q.push(extra);
    if (shareRef && access && access.ref_code) q.push("ref=" + encodeURIComponent(access.ref_code));
    if (shareLang) q.push("lang=" + shareLang);
    return siteBase() + (q.length ? "?" + q.join("&") : "");
  }
  function shareText(url, l) {
    return (l === undefined ? shareLang : l) === "ar"
      ? "تبحث عن سكن قريب من معهدك في كوالالمبور؟ اعثر على أقرب الغرف هنا: " + url
      : "Looking for a room near your language center in Kuala Lumpur? Find the closest rooms here: " + url;
  }
  function waShare(url) { return "https://wa.me/?text=" + encodeURIComponent(shareText(url)); }
  function qrSvg(url) {
    if (typeof window.qrcode !== "function") return "";
    var q = window.qrcode(0, "M"); q.addData(url); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  }
  var shareQr = "general";   // which link the QR code shows: "general", "mine" or "link:<slug>"
  function linkUrl(slug, l) { return siteBase() + "s/" + slug + (l ? "/" + l : ""); }
  function generalUrl(l) { return siteBase() + (l ? "?lang=" + l : ""); }
  function mineUrl(l) { return siteBase() + "?ref=" + encodeURIComponent(access.ref_code) + (l ? "&lang=" + l : ""); }
  function waShareLang(url, l) { return "https://wa.me/?text=" + encodeURIComponent(shareText(url, l)); }
  function linkGroup(title, sub, mk) {
    var variants = [["Start", ""], ["English", "en"], ["العربية", "ar"]];
    return '<div class="lgroup"><div class="lg-head"><b>' + esc(title) + "</b><small>" + esc(sub) + '</small></div><div class="lg-btns">' + variants.map(function (v) {
      var u = mk(v[1]);
      return '<span class="lg-v"><button class="lgbtn" type="button" data-act="copyurl" data-url="' + esc(u) + '" title="Copy this link">' + (v[1] === "ar" ? '<span dir="rtl">' + v[0] + "</span>" : v[0]) + ' <i>copy</i></button>' +
        '<a class="lgic" target="_blank" rel="noopener" href="' + esc(u) + '" title="Open">open</a><a class="lgic wa" target="_blank" rel="noopener" href="' + esc(waShareLang(u, v[1])) + '" title="Send on WhatsApp">WhatsApp</a></span>';
    }).join("") + "</div></div>";
  }
  function linkCounts() {
    var c = {}, since = Date.now() - 30 * 864e5;
    state.linkEvents.forEach(function (e) { var x = c[e.slug] = c[e.slug] || { open: 0, look: 0, ask: 0 }; x[e.event]++; });
    state.requests.forEach(function (r) { if (r.link_slug && new Date(r.created_at) >= since) { var x = c[r.link_slug] = c[r.link_slug] || { open: 0, look: 0, ask: 0 }; x.ask++; } });
    return c;
  }
  function renderShare() {
    var manage = can("site_edit"), counts = linkCounts(), seeCounts = can("leads_view");
    var active = state.links.filter(function (k) { return k.active; });
    var qrUrl = shareQr === "mine" && access.ref_code ? mineUrl("") : shareQr.indexOf("link:") === 0 ? linkUrl(shareQr.slice(5), "") : generalUrl("");
    var svg = qrSvg(qrUrl);
    var qopt = function (v, label) { return '<option value="' + esc(v) + '"' + (shareQr === v ? " selected" : "") + ">" + esc(label) + "</option>"; };
    var centersList = state.centers.filter(function (c) { return c.grp === "center"; });
    var lopt = function (v, label) { return '<option value="' + v + '"' + (shareLang === v ? " selected" : "") + ">" + label + "</option>"; };
    var agentOpts = '<option value="">Nobody</option>' + state.team.map(function (p) { return '<option value="' + esc(p.email) + '">' + esc(p.name || p.email) + "</option>"; }).join("");

    var html = '<div class="sharecard"><h2>Copy a link and send it</h2><p class="help">The first button of each row opens the start of the website and the student picks their own language. The language buttons open it already in that language. <b>Open</b> shows you the page, <b>WhatsApp</b> opens WhatsApp with the link ready to send.</p>' +
      linkGroup("Qareeb website", "General link", generalUrl) +
      (access.ref_code ? linkGroup("My personal link", "Leads from it are credited to you", mineUrl) : "") +
      active.map(function (k) { return linkGroup(k.name, "/s/" + k.slug + (k.agent_email ? " · " + personName(k.agent_email) : "") + (k.whatsapp ? " · own WhatsApp" : ""), function (l) { return linkUrl(k.slug, l); }); }).join("") + "</div>";

    html += '<div class="sharecard"><h2>Links and who opened them (last 30 days)</h2><p class="help">Each person, agent or group can have its own link. You then see how many students opened it, looked at rooms and asked.</p>' +
      (state.links.length ? '<div style="overflow-x:auto"><table class="lt"><thead><tr><th>Link</th><th>Address</th><th>Agent</th><th>Opened</th><th>Looked at rooms</th><th>Asked</th><th></th></tr></thead><tbody>' + state.links.map(function (k) {
        var c = counts[k.slug] || { open: 0, look: 0, ask: 0 };
        return '<tr class="' + (k.active ? "" : "off") + '" data-id="' + k.id + '"><td><b>' + esc(k.name) + "</b>" + (k.active ? "" : ' <span class="chip off">Switched off</span>') + (k.whatsapp ? '<br><small>WhatsApp ' + esc(k.whatsapp) + "</small>" : "") + "</td><td>/s/" + esc(k.slug) + "</td><td>" + esc(k.agent_email ? personName(k.agent_email) : "—") + "</td>" +
          "<td>" + (seeCounts ? c.open : "–") + "</td><td>" + (seeCounts ? c.look : "–") + "</td><td>" + (seeCounts ? c.ask : "–") + "</td>" +
          "<td>" + (manage ? '<button class="btn sec sm" type="button" data-act="lkedit">Edit</button> <button class="btn sec sm" type="button" data-act="lkoff">' + (k.active ? "Switch off" : "Switch on") + "</button>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="meta2">No links yet.' + (manage ? " Create the first one below." : "") + "</p>") +
      (manage ? '<form id="linkForm" class="linkform"><h3>Create a link</h3>' +
        '<div class="row2" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' +
        '<div class="fld"><label for="lk-n">Name of the link</label><input id="lk-n" name="name" required maxlength="80" placeholder="e.g. Sara, Britannia WhatsApp group"></div>' +
        '<div class="fld"><label for="lk-s">Address ending</label><input id="lk-s" name="slug" required maxlength="30" pattern="[a-z0-9][a-z0-9\\-]{1,29}" placeholder="e.g. sara"><p class="help">Letters, numbers and dashes. The link will be /s/<b id="lk-pv">name</b></p></div>' +
        '<div class="fld"><label for="lk-a">Agent (optional)</label><select id="lk-a" name="agent">' + agentOpts + '</select><p class="help">Leads from this link are credited and assigned to them.</p></div>' +
        '<div class="fld"><label for="lk-w">WhatsApp for this link (optional)</label><input id="lk-w" name="whatsapp" inputmode="numeric" maxlength="20" placeholder="e.g. 60123456789"><p class="help">If empty, the website’s main number is used.</p></div></div>' +
        '<button class="btn sm" type="submit" id="lk-save">Create the link</button></form>' : "") + "</div>";

    html += '<div class="sharecard"><h2>QR code</h2><p class="help">Print it on a poster or show it on a screen. Scanning it with a phone camera opens the link.</p>' +
      '<div class="fld" style="max-width:340px"><label for="qrPick">Link</label><select id="qrPick">' + qopt("general", "Qareeb website (general)") + (access.ref_code ? qopt("mine", "My personal link") : "") + active.map(function (k) { return qopt("link:" + k.slug, k.name + " (/s/" + k.slug + ")"); }).join("") + "</select></div>" +
      (svg ? '<div class="qrbox"><div class="qr" id="qrBox">' + svg + '</div><div><button class="btn sec sm" type="button" data-act="qrdl">Download QR code</button><p class="help" style="margin-top:8px;word-break:break-all">' + esc(qrUrl) + "</p></div></div>" : '<p class="help">The QR code could not load (no internet connection to the code library).</p>') + "</div>";

    html += '<div class="sharecard"><h2>Links for one language center</h2><p class="help">Opens the website already set to that center, so the student sees the closest rooms straight away. Use it in a center’s WhatsApp group.</p>' +
      '<div class="fld" style="max-width:320px;margin:12px 0 0"><label for="shareLang">Language the links open in</label><select id="shareLang">' + lopt("", "The student’s own choice") + lopt("en", "English") + lopt("ar", "العربية (Arabic)") + "</select></div>" +
      (access.ref_code ? '<label class="chk" style="margin:4px 0 8px"><input type="checkbox" id="shareRef"' + (shareRef ? " checked" : "") + "> Credit leads to me (adds my personal code)</label>" : "") +
      (centersList.length ? centersList.map(function (c) {
        var u = siteLink("center=" + encodeURIComponent(c.id));
        return '<div class="centerlink"><span>' + esc(c.name_en) + '</span><button class="btn sec sm" type="button" data-act="copyurl" data-url="' + esc(u) + '">Copy link</button><a class="btn wa sm" target="_blank" rel="noopener" href="' + esc(waShare(u)) + '">WhatsApp</a></div>';
      }).join("") : '<p class="meta2">No language centers yet.</p>') + "</div>";
    $("list").innerHTML = html;
  }
  function slugify(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30); }
  function saveLink(form) {
    var wa = String(form.elements.whatsapp.value || "").replace(/[\s+\-()]/g, ""), slug = form.elements.slug.value.trim().toLowerCase();
    if (wa && !/^\d{8,15}$/.test(wa)) { msg("The WhatsApp number must be digits only with the country code, for example 60123456789.", true); return; }
    if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(slug)) { msg("The address needs 2 to 30 letters, numbers or dashes.", true); return; }
    if (/^[0-9a-f]{6}$/.test(slug)) { msg("Six letters or digits from 0-9 and a-f are kept for personal codes. Please add another letter or a dash.", true); return; }
    $("lk-save").disabled = true;
    api("/rest/v1/share_links", { method: "POST", body: { name: form.elements.name.value.trim(), slug: slug, agent_email: form.elements.agent.value || null, whatsapp: wa || null }, write: true })
      .then(function () { msg("Link created: /s/" + slug); return loadAll(); })
      .catch(function (er) { msg(/duplicate|unique|already/i.test(er.message) ? "That address is already used. Please pick another." : er.message, true); $("lk-save").disabled = false; });
  }
  function openLinkForm(k) {
    var agentOpts = '<option value="">Nobody</option>' + state.team.map(function (p) { return '<option value="' + esc(p.email) + '"' + (p.email === k.agent_email ? " selected" : "") + ">" + esc(p.name || p.email) + "</option>"; }).join("");
    $("dform").innerHTML = '<form id="lkf"><h2>Edit link</h2><p class="help" style="margin-bottom:12px">Address: /s/' + esc(k.slug) + " (it cannot be changed, so links you already shared keep working)</p>" +
      '<div class="fld"><label for="e-n">Name of the link</label><input id="e-n" name="name" required maxlength="80" value="' + esc(k.name) + '"></div>' +
      '<div class="fld"><label for="e-a">Agent (optional)</label><select id="e-a" name="agent">' + agentOpts + "</select></div>" +
      '<div class="fld"><label for="e-w">WhatsApp for this link (optional)</label><input id="e-w" name="whatsapp" inputmode="numeric" maxlength="20" value="' + esc(k.whatsapp || "") + '"><p class="help">Empty = use the website’s main number.</p></div>' +
      '<div class="foot2"><button type="button" class="btn sec" id="cancelBtn">Cancel</button><button type="submit" class="btn" id="saveBtn">Save</button></div></form>';
    dlg.showModal(); $("cancelBtn").onclick = closeDlg;
    $("lkf").onsubmit = function (e) {
      e.preventDefault(); var f = $("lkf"), wa = String(f.whatsapp.value || "").replace(/[\s+\-()]/g, "");
      if (wa && !/^\d{8,15}$/.test(wa)) { msg("The WhatsApp number must be digits only with the country code, for example 60123456789.", true); return; }
      $("saveBtn").disabled = true;
      api("/rest/v1/share_links?id=eq." + k.id, { method: "PATCH", body: { name: f.name.value.trim(), agent_email: f.agent.value || null, whatsapp: wa || null }, write: true })
        .then(function () { closeDlg(); msg("Saved."); return loadAll(); }).catch(function (er) { msg(er.message, true); $("saveBtn").disabled = false; });
    };
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

  // ------------------------------------------------------------ edit website (wording + WhatsApp number)
  function renderSite() {
    var ST = window.QAREEB_SITETEXT || { groups: [], en: {}, ar: {} }, cur = (state.site && state.site.data) || {};
    var field = function (f) {
      var one = function (l, dir) {
        var val = (cur[l] && cur[l][f.k]) || "", ph = esc(ST[l][f.k] || "");
        return '<div><small class="help">' + (l === "en" ? "English" : "العربية") + "</small>" +
          (f.long ? '<textarea name="' + l + "." + f.k + '" maxlength="400" placeholder="' + ph + '"' + (dir ? ' dir="rtl"' : "") + ' style="min-height:76px;width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font:inherit;background:#fff;color:var(--ink)">' + esc(val) + "</textarea>"
                  : '<input name="' + l + "." + f.k + '" maxlength="400" placeholder="' + ph + '"' + (dir ? ' dir="rtl"' : "") + ' value="' + esc(val) + '">') + "</div>";
      };
      return '<div class="fld"><span>' + esc(f.label) + '</span><div class="row2" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">' + one("en", false) + one("ar", true) + "</div></div>";
    };
    var wa = cur.whatsapp || "";
    $("list").innerHTML = '<form id="siteForm">' +
      '<div class="sharecard"><h2>WhatsApp number</h2><p class="help">Every WhatsApp button on the student website uses this number: Contact, Ask on WhatsApp and the video-tour request.</p>' +
      '<div class="fld" style="max-width:340px;margin:12px 0 0"><label for="s-wa">Number with country code, digits only</label><input id="s-wa" name="whatsapp" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="e.g. 60123456789" value="' + esc(wa) + '">' +
      '<p class="help">Malaysia starts with 60, with no 0 and no + sign. Example: 012-345 6789 becomes 60123456789.' + (wa ? "" : " <b>No number saved yet, so the website still uses a placeholder number.</b>") + "</p></div></div>" +
      '<p class="help" style="margin:0 0 10px">Left box: English. Right box: Arabic. The grey text is the original wording. <b>Leave a box empty to keep the original.</b></p>' +
      ST.groups.map(function (g) { return '<div class="sharecard"><h2>' + esc(g.title) + "</h2>" + g.fields.map(field).join("") + "</div>"; }).join("") +
      '<div class="foot2" style="position:static;justify-content:flex-start;gap:12px;align-items:center"><button class="btn" id="siteSave" type="submit">Save changes</button><a class="btn sec" href="./" target="_blank" rel="noopener">View the student site</a>' +
      '<span class="help">Students see changes the next time they open or refresh the site.</span></div></form>';
  }
  function saveSite(form) {
    var ST = window.QAREEB_SITETEXT, data = { en: {}, ar: {} };
    var wa = String(form.elements.whatsapp.value || "").replace(/[\s+\-()]/g, "");
    if (wa && !/^\d{8,15}$/.test(wa)) { msg("The WhatsApp number must be digits only with the country code, for example 60123456789.", true); return; }
    if (wa) data.whatsapp = wa;
    ["en", "ar"].forEach(function (l) {
      Object.keys(ST[l]).forEach(function (k) { var el = form.elements[l + "." + k]; if (el && el.value.trim()) data[l][k] = el.value.trim().slice(0, 400); });
    });
    $("siteSave").disabled = true;
    api("/rest/v1/site_settings?id=eq.1", { method: "PATCH", body: { data: data }, write: true })
      .then(function () { msg("Saved. The student website now shows these changes."); return loadAll(); })
      .catch(function (er) { msg(er.message, true); $("siteSave").disabled = false; });
  }

  // ------------------------------------------------------------ overview (Today / Numbers / Team)
  var homeView = "today";
  function waitDays(t) { return Math.max(0, Math.floor((Date.now() - new Date(t)) / 86400000)); }
  function renderHome() {
    var views = [["today", "Today"], ["numbers", "Numbers"]];
    if (can("leads_view")) views.push(["team", "Team"]);
    if (!views.some(function (v) { return v[0] === homeView; })) homeView = "today";
    $("list").innerHTML = '<p class="subtext">Pick a tab. Every number opens the records behind it.</p>' +
      '<div class="subtabs" role="tablist">' + views.map(function (v) { return '<button type="button" class="subtab' + (homeView === v[0] ? " on" : "") + '" data-act="hview" data-v="' + v[0] + '">' + v[1] + "</button>"; }).join("") + "</div>" +
      (homeView === "numbers" ? homeNumbers() : homeView === "team" ? homeTeam() : homeToday());
  }
  function doBlock(title, count, go, rows) {
    if (!rows.length) return "";
    return '<div class="item" style="display:block"><div class="dohead"><h3>' + esc(title) + '<span class="n">' + count + '</span></h3><button type="button" data-go="' + go + '">See all</button></div>' + rows.join("") + "</div>";
  }
  function doRow(go, q, left, right) { return '<button type="button" class="doitem" data-go="' + go + '"' + (q ? ' data-q="' + esc(q) + '"' : "") + "><span>" + esc(left) + "</span><small>" + esc(right) + "</small></button>"; }
  function homeToday() {
    var now = new Date(), hour = 3600 * 1000, out = "";
    var live = state.rooms.filter(function (r) { return r.published; });
    var holds = state.rooms.filter(function (r) { return r.status === "reserved" && r.reserved_until && new Date(r.reserved_until) - now < 24 * hour; });
    var tile = function (n, label, go, hot) { return '<button type="button" class="tile' + (hot && n ? " hot" : "") + '" data-go="' + go + '"><b>' + n + "</b><span>" + label + "</span></button>"; };
    var tiles = "";
    if (can("leads_view")) {
      var mine = state.requests.filter(function (r) { return r.assigned_to === access.email && r.status !== "rented" && r.status !== "lost"; }).length;
      tiles += tile(state.requests.filter(function (r) { return r.status === "new"; }).length, "New leads", "requests:new", true) + tile(state.requests.filter(isDue).length, "Follow-ups due", "requests:due", true) + tile(mine, "Open leads assigned to me", "requests:mine", false);
    }
    tiles += tile(state.rooms.filter(function (r) { return r.status === "available" && r.published; }).length, "Rooms available now", "rooms", false) + tile(holds.length, "Holds ending within 24 hours", "rooms", true);
    out += '<div class="tiles">' + tiles + "</div>";
    if (can("leads_view")) {
      var news = state.requests.filter(function (r) { return r.status === "new"; });
      out += doBlock("Leads waiting for a first reply", news.length, "requests:new", news.slice(0, 5).map(function (r) { var room = roomOf(r); return doRow("requests:new", r.name, r.name + (room ? " · " + room.title_en : ""), "Waiting " + waitDays(r.created_at) + " day" + (waitDays(r.created_at) === 1 ? "" : "s")); }));
      var due = state.requests.filter(isDue);
      out += doBlock("Follow-ups due", due.length, "requests:due", due.slice(0, 5).map(function (r) { var room = roomOf(r); return doRow("requests:due", r.name, r.name + (room ? " · " + room.title_en : ""), "Due " + r.follow_up); }));
    }
    out += doBlock("Holds ending soon", holds.length, "rooms", holds.slice(0, 5).map(function (r) { return doRow("rooms", "", r.title_en, new Date(r.reserved_until) < now ? "Hold expired" : "Ends " + when(r.reserved_until)); }));
    var todo = [];
    var unver = live.filter(function (r) { return !(r.v_video && r.v_owner); }).length;
    if (unver) todo.push(["rooms", unver + " visible room" + (unver === 1 ? " is" : "s are") + " not verified yet."]);
    var nophoto = live.filter(function (r) { return !(r.photos && r.photos.length); }).length;
    if (nophoto) todo.push(["rooms", nophoto + " visible room" + (nophoto === 1 ? " has" : "s have") + " no photos."]);
    if (can("rooms_edit") || can("leads_view")) { var noowner = state.rooms.filter(function (r) { return !r.owner_id; }).length; if (noowner) todo.push(["owners", noowner + " room" + (noowner === 1 ? " has" : "s have") + " no owner linked."]); }
    if (!live.length && state.rooms.length) todo.push(["rooms", "No room is visible to students yet. Students see an empty page."]);
    out += '<div class="item" style="display:block"><h3>Set-up checklist</h3>' + (todo.length ? todo.map(function (t) { return '<div class="todo"><span>' + esc(t[1]) + '</span><button type="button" class="btn sec sm" data-go="' + t[0] + '">Open</button></div>'; }).join("") : '<p class="meta2" style="margin:6px 0 0">Everything is set up.</p>') + "</div>";
    return out;
  }
  function homeNumbers() {
    var now = new Date(), hour = 3600 * 1000, out = "";
    var rc = { available: 0, reserved: 0, taken: 0, hidden: 0 };
    state.rooms.forEach(function (r) { if (!r.published) rc.hidden++; else rc[r.status] = (rc[r.status] || 0) + 1; });
    var tile = function (n, label, go) { return '<button type="button" class="tile" data-go="' + go + '"><b>' + n + "</b><span>" + label + "</span></button>"; };
    out += '<div class="tiles">' + tile(rc.available, "Rooms available", "rooms") + tile(rc.reserved, "Rooms held", "rooms") + tile(rc.taken, "Rooms rented", "rooms") + tile(rc.hidden, "Rooms hidden", "rooms") + "</div>";
    if (!can("leads_view")) return out;
    if (!state.requests.length) return out + '<p class="meta2">No leads yet. Numbers appear here as students ask about rooms.</p>';
    var counts = {}; state.requests.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
    var max = Math.max.apply(null, STATUSES.map(function (s) { return counts[s[0]] || 0; }).concat([1]));
    out += '<div class="item" style="display:block"><h3>Leads by status</h3>' + STATUSES.map(function (s) {
      var n = counts[s[0]] || 0; return '<div class="bar-row"><span>' + s[1] + '</span><i style="width:' + Math.max(2, Math.round(n / max * 100)) + '%"></i><b>' + n + "</b></div>";
    }).join("") + "</div>";
    var bySrc = {}, byLink = {}, noSrc = 0;
    state.requests.forEach(function (r) {
      if (r.link_slug) { var l = byLink[r.link_slug] = byLink[r.link_slug] || { n: 0, rented: 0 }; l.n++; if (r.status === "rented") l.rented++; }
      else if (r.referred_by) { var s = bySrc[r.referred_by] = bySrc[r.referred_by] || { n: 0, rented: 0 }; s.n++; if (r.status === "rented") s.rented++; }
      else noSrc++;
    });
    var srcRow = function (label, o) { return '<div class="count-row"><span>' + esc(label) + "</span><span><b>" + o.n + "</b> lead" + (o.n === 1 ? "" : "s") + (o.rented ? " · " + o.rented + " rented" : "") + "</span></div>"; };
    out += '<div class="item" style="display:block"><h3>Where leads come from</h3>' +
      Object.keys(byLink).sort(function (a, b) { return byLink[b].n - byLink[a].n; }).map(function (k) { var lk = state.links.filter(function (x) { return x.slug === k; })[0]; return srcRow("Link: " + (lk ? lk.name : "/s/" + k), byLink[k]); }).join("") +
      Object.keys(bySrc).sort(function (a, b) { return bySrc[b].n - bySrc[a].n; }).map(function (k) { return srcRow(personName(k) + "’s personal link", bySrc[k]); }).join("") +
      '<div class="count-row"><span>Website (no link)</span><span><b>' + noSrc + "</b> lead" + (noSrc === 1 ? "" : "s") + "</span></div></div>";
    var days = [];
    for (var d = 6; d >= 0; d--) { var dt = new Date(now - d * 24 * hour), key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); days.push({ key: key, label: dt.toLocaleDateString([], { weekday: "short" }), n: 0 }); }
    state.requests.forEach(function (r) { var c = new Date(r.created_at), key = c.getFullYear() + "-" + String(c.getMonth() + 1).padStart(2, "0") + "-" + String(c.getDate()).padStart(2, "0"); days.forEach(function (x) { if (x.key === key) x.n++; }); });
    var dmax = Math.max.apply(null, days.map(function (x) { return x.n; }).concat([1]));
    out += '<div class="item" style="display:block"><h3>Requests, last 7 days</h3><div class="spark">' + days.map(function (x) { return '<div><i style="height:' + Math.max(3, Math.round(x.n / dmax * 60)) + 'px"></i><b>' + x.n + "</b><span>" + x.label + "</span></div>"; }).join("") + "</div></div>";
    return out;
  }
  function homeTeam() {
    var rows = state.team.map(function (p) {
      var mine = state.requests.filter(function (r) { return r.assigned_to === p.email; });
      var credited = state.requests.filter(function (r) { return r.referred_by === p.email; }).length;
      return { name: p.name || p.email, rented: mine.filter(function (r) { return r.status === "rented"; }).length, open: mine.filter(function (r) { return r.status !== "rented" && r.status !== "lost"; }).length, credited: credited, due: mine.filter(isDue).length };
    }).sort(function (a, b) { return b.rented - a.rented || b.credited - a.credited || b.open - a.open; });
    if (!rows.length) return '<p class="meta2">No team members yet.</p>';
    return '<div class="item" style="display:block"><h3>Team leaderboard</h3><p class="help" style="margin-bottom:6px">Ranked by rooms rented, then leads brought in through the person’s own link.</p>' + rows.map(function (r, i) {
      return '<div class="rank"><span class="pos">' + (i + 1) + "</span><span><b>" + esc(r.name) + "</b><small>" + r.credited + " from own link · " + r.open + " open · " + r.due + " follow-up" + (r.due === 1 ? "" : "s") + " due</small></span><b>" + r.rented + " rented</b></div>";
    }).join("") + "</div>";
  }

  // ------------------------------------------------------------ global search (top bar)
  var gq = "";
  function renderSearch() {
    var q = gq.toLowerCase(), out = "", has = function () { for (var i = 0; i < arguments.length; i++) if (String(arguments[i] || "").toLowerCase().indexOf(q) >= 0) return true; return false; };
    var sec = function (title, rows) { return rows.length ? '<div class="item" style="display:block"><h3>' + esc(title) + " (" + rows.length + ")</h3>" + rows.slice(0, 8).join("") + "</div>" : ""; };
    if (can("leads_view")) out += sec("Leads", state.requests.filter(function (r) { var rm = roomOf(r); return has(r.name, r.whatsapp, rm && rm.title_en); }).map(function (r) { var rm = roomOf(r); return doRow("requests", r.name, r.name + " · " + r.whatsapp, (rm ? rm.title_en + " · " : "") + statusLabel(r.status)); }));
    out += sec("Rooms", state.rooms.filter(function (r) { return has(r.title_en, r.title_ar, r.area); }).map(function (r) { return doRow("rooms", "", r.title_en, "RM " + r.price + " · " + r.area); }));
    if (state.owners.length) out += sec("Owners", state.owners.filter(function (o) { return has(o.name, o.phone); }).map(function (o) { return doRow("owners", "", o.name, o.phone || ""); }));
    out += sec("Language centers", state.centers.filter(function (c) { return has(c.name_en, c.name_ar); }).map(function (c) { return doRow("centers", "", c.name_en, c.grp === "center" ? "Center" : "Area"); }));
    if (can("staff_manage")) out += sec("Team", state.staff.filter(function (s) { return has(s.name, s.email); }).map(function (s) { return doRow("staff", "", s.name || s.email, s.email); }));
    $("list").innerHTML = out || '<p class="meta2">Nothing found for “' + esc(gq) + "”.</p>";
  }
  $("gsearch").oninput = function () {
    gq = this.value.trim();
    if (gq.length < 2) { if (state.tab === "search") { state.tab = "home"; render(); } return; }
    state.tab = "search"; render();
  };

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
  var ENT = { listings: "Room", centers: "Language center", owners: "Owner", staff: "Staff", site_settings: "Website", share_links: "Link" };
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
  function openWork(email) { return state.requests.filter(function (r) { return r.assigned_to === email && r.status !== "rented" && r.status !== "lost"; }).length; }
  function linkCount(email) { return state.links.filter(function (k) { return k.agent_email === email && k.active; }).length; }
  function renderStaff() {
    var current = state.staff.filter(function (s) { return !s.left_at; }), left = state.staff.filter(function (s) { return s.left_at; });
    var frozenN = current.filter(function (s) { return !s.active; }).length;
    var intro = '<p class="meta2" style="margin:0 0 12px"><b>' + (current.length - frozenN) + " active" + (frozenN ? ", " + frozenN + " frozen" : "") + '.</b> Add a person with their email, a role and a password, then give them those details. <b>Freeze</b> stops someone signing in and deletes nothing. <b>Remove</b> hands their open leads and links to a colleague and keeps their history. Someone who left can be brought back.</p>';
    var card = function (s) {
      var on = SWITCHES.filter(function (x) { return s.role === "owner" || s[x[0]]; }).map(function (x) { return '<span class="chip">' + esc(x[1].replace(/ \(.*\)$/, "")) + "</span>"; }).join("") || '<span class="meta2">Can look only</span>';
      var me = access && s.email === access.email, o = openWork(s.email), lk = linkCount(s.email);
      return '<div class="item" data-id="' + esc(s.email) + '"><div class="main"><h3>' + esc(s.name || s.email) + (me ? ' <span class="chip">You</span>' : "") + '</h3><div class="meta2">' + esc(s.email) + " · " + esc(ROLES[s.role] ? ROLES[s.role].label : s.role) + (state.requests.length || lk ? " · " + o + " open lead" + (o === 1 ? "" : "s") + (lk ? " · " + lk + " link" + (lk === 1 ? "" : "s") : "") : "") + "</div>" +
        '<div style="margin-top:6px"><span class="chip ' + (s.active ? "ok" : "off") + '">' + (s.active ? "Active" : "Frozen") + "</span>" + on + "</div>" +
        '<div class="acts"><button class="btn sm" data-act="edits" type="button">Role and access</button>' +
        (me ? "" : '<button class="btn sec sm" data-act="actives" type="button">' + (s.active ? "Freeze" : "Unfreeze") + "</button>" + '<button class="btn danger sm" data-act="dels" type="button">Remove…</button>') + "</div></div></div>";
    };
    var leftHtml = left.length ? '<h3 style="margin:22px 0 4px">Left the team (' + left.length + ')</h3><p class="help" style="margin-bottom:8px">Kept for history: their past lead credit, notes and changes remain. Bring someone back if they return.</p>' + left.map(function (s) {
      return '<div class="item" data-id="' + esc(s.email) + '"><div class="main"><h3>' + esc(s.name || s.email) + '</h3><div class="meta2">' + esc(s.email) + " · " + esc(ROLES[s.role] ? ROLES[s.role].label : s.role) + " · left " + esc(new Date(s.left_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })) + '</div><div class="acts"><button class="btn sm" data-act="restores" type="button">Bring back</button></div></div></div>';
    }).join("") : "";
    $("list").innerHTML = intro + current.map(card).join("") + leftHtml;
  }
  function openRemoveForm(s) {
    var o = openWork(s.email), lk = linkCount(s.email);
    var mates = state.staff.filter(function (x) { return x.active && !x.left_at && x.email !== s.email; });
    var need = o > 0 || lk > 0;
    $("dform").innerHTML = '<form id="rmf"><h2>Remove ' + esc(s.name || s.email) + "?</h2>" +
      '<p>They will no longer be able to sign in, and they move to <b>Left the team</b>. Nothing is deleted: their past lead credit, notes and history stay, and you can bring them back later.</p>' +
      '<p><b>' + o + "</b> open lead" + (o === 1 ? "" : "s") + " and <b>" + lk + "</b> active link" + (lk === 1 ? "" : "s") + " will be handed over.</p>" +
      '<div class="fld"><label for="rm-to">Hand over to</label><select id="rm-to" name="to"' + (need ? " required" : "") + '><option value="">' + (need ? "Choose a colleague…" : "No handover needed") + "</option>" + mates.map(function (m) { return '<option value="' + esc(m.email) + '">' + esc(m.name || m.email) + "</option>"; }).join("") + "</select></div>" +
      '<div class="foot2"><button type="button" class="btn sec" id="cancelBtn">Cancel</button><button type="submit" class="btn danger" id="saveBtn">Remove from the team</button></div></form>';
    dlg.showModal(); $("cancelBtn").onclick = closeDlg;
    $("rmf").onsubmit = function (e) {
      e.preventDefault(); $("saveBtn").disabled = true;
      api("/rest/v1/rpc/remove_staff", { method: "POST", body: { p_email: s.email, p_to: $("rm-to").value || null } })
        .then(function (res) { closeDlg(); msg("Removed. " + (res && res.leads ? res.leads + " lead" + (res.leads === 1 ? "" : "s") + " handed over" : "No leads to hand over") + (res && res.links ? ", " + res.links + " link" + (res.links === 1 ? "" : "s") + " reassigned" : "") + "."); return loadAll(); })
        .catch(function (er) { msg(er.message, true); $("saveBtn").disabled = false; });
    };
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
    var p = state.team.filter(function (t) { return t.email === email; })[0] || state.staff.filter(function (t) { return t.email === email; })[0];
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
      (r.referred_by && !r.link_slug ? '<span class="chip ok">From ' + esc(personName(r.referred_by)) + "’s link</span>" : "") +
      (r.link_slug ? '<span class="chip ok">Link: ' + esc((state.links.filter(function (k) { return k.slug === r.link_slug; })[0] || { name: "/s/" + r.link_slug }).name) + "</span>" : "") +
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
      if (gp[0] === "requests") { lf.mine = gp[1] === "mine"; lf.status = gp[1] === "new" ? "new" : "all"; lf.due = gp[1] === "due"; lf.q = g.dataset.q || ""; }
      $("gsearch").value = ""; render(); window.scrollTo(0, 0); return;
    }
    var b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
    var item = b.closest(".item"), id = item ? item.dataset.id : "", act = b.dataset.act;
    if (act === "lkoff") {
      var kk = state.links.filter(function (x) { return String(x.id) === (b.closest("tr") ? b.closest("tr").dataset.id : ""); })[0];
      if (kk) api("/rest/v1/share_links?id=eq." + kk.id, { method: "PATCH", body: { active: !kk.active }, write: true }).then(function () { msg(kk.active ? "Switched off. The link no longer counts visits or credits anyone." : "Switched on."); return loadAll(); }).catch(function (er) { msg(er.message, true); });
    }
    else if (act === "lkedit") { var k2 = state.links.filter(function (x) { return String(x.id) === (b.closest("tr") ? b.closest("tr").dataset.id : ""); })[0]; if (k2) openLinkForm(k2); }
    else if (act === "hview") { homeView = b.dataset.v; render(); }
    else if (act === "copyurl") copyText(b.dataset.url);
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
    else if (act === "actives") { var st = state.staff.filter(function (x) { return x.email === id; })[0]; patchStaff(st.email, { active: !st.active }, st.active ? "Frozen. They can no longer sign in, and nothing was deleted." : "Unfrozen. They can sign in again."); }
    else if (act === "dels") { var rm = state.staff.filter(function (x) { return x.email === id; })[0]; if (rm) openRemoveForm(rm); }
    else if (act === "restores") { patchStaff(id, { active: true, left_at: null }, "Welcome back. They can sign in again with their old password, or you can set a new one in Edit access."); }
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
  $("list").onsubmit = function (e) {
    if (e.target.id === "siteForm") { e.preventDefault(); saveSite(e.target); }
    if (e.target.id === "linkForm") { e.preventDefault(); saveLink(e.target); }
  };
  $("list").oninput = function (e) {
    if (e.target.id === "leadSearch") { lf.q = e.target.value; renderLeadCards(); }
    if (e.target.id === "lk-n") { var sl = $("lk-s"); if (sl && !sl.dataset.touched) { sl.value = slugify(e.target.value); $("lk-pv").textContent = sl.value || "name"; } }
    if (e.target.id === "lk-s") { e.target.dataset.touched = "1"; e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""); $("lk-pv").textContent = e.target.value || "name"; }
  };
  $("list").onchange = function (e) {
    var act = e.target.dataset.act, lid = e.target.closest(".item") ? e.target.closest(".item").dataset.id : "";
    if (e.target.id === "qrPick") { shareQr = e.target.value; renderShare(); return; }
    if (e.target.id === "shareLang") { shareLang = e.target.value; renderShare(); return; }
    if (e.target.id === "shareRef") { shareRef = e.target.checked; renderShare(); return; }
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

  document.querySelectorAll(".tab").forEach(function (b) { b.onclick = function () { state.tab = b.dataset.tab; $("gsearch").value = ""; openDrawer(false); render(); window.scrollTo(0, 0); }; });
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
      var already = state.staff.filter(function (x) { return x.email === email; })[0];
      if (isNew && already) { msg(already.left_at ? "That person left the team. Use Bring back in the Left the team list." : "That email is already on the team.", true); return; }
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
