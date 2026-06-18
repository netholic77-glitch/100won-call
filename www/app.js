/* 백원콜 — 100원·행복택시 호출 도우미
   - 100% 기기 내부 동작. 외부 서버 전송 없음. 저장은 localStorage.
   - 전화: tel: / 문자: sms: / 위치: navigator.geolocation
   - 음성 안내: Web Speech API (speechSynthesis, ko-KR)
*/
(function () {
  "use strict";

  var LS = {
    taxiNum: "bw_taxi_num",
    taxiLabel: "bw_taxi_label",
    province: "bw_province",
    region: "bw_region",
    gName: "bw_guardian_name",
    gNum: "bw_guardian_num",
    places: "bw_places",
    voice: "bw_voice",
    checkedAt: "bw_taxi_checked_at",
    pickup: "bw_pickup",
    trip: "bw_trip",
  };

  var REMIND_DAYS = 30;

  var $ = function (id) { return document.getElementById(id); };
  function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function onlyDigits(s) { return (s || "").replace(/[^0-9+]/g, ""); }

  var REGIONS = null;
  var voiceOn = get(LS.voice) !== "off";

  /* ── 음성 안내 ── */
  function speak(text) {
    if (!voiceOn) return;
    sayNow(text, 0.95, 1);
  }
  // 음성 토글과 무관하게 항상 또박또박 읽음(위치 안내용). repeat회 반복.
  // 일부 안드로이드/WebView는 보이스가 늦게 로드돼 첫 호출이 무음이 되므로 미리 로드.
  var _ttsVoices = [];
  function loadTtsVoices() {
    try { _ttsVoices = window.speechSynthesis.getVoices() || []; } catch (e) { _ttsVoices = []; }
  }
  if ("speechSynthesis" in window) {
    loadTtsVoices();
    try { window.speechSynthesis.addEventListener("voiceschanged", loadTtsVoices); } catch (e) {}
  }
  function pickKoVoice() {
    for (var i = 0; i < _ttsVoices.length; i++) {
      var lang = (_ttsVoices[i].lang || "").replace("_", "-");
      if (/ko-?KR/i.test(lang) || /^ko$/i.test(lang)) return _ttsVoices[i];
    }
    return null;
  }
  function sayNow(text, rate, repeat) {
    if (!("speechSynthesis" in window)) return;
    try {
      // cancel()을 무조건 호출하면 일부 크롬/안드로이드에서 새 음성이 무음이 되는
      // 알려진 버그가 있어, 실제로 재생 중일 때만 취소한다.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      var v = pickKoVoice();
      for (var i = 0; i < (repeat || 1); i++) {
        var u = new SpeechSynthesisUtterance(text);
        u.lang = "ko-KR";
        if (v) u.voice = v;          // 한국어 보이스 명시(있으면) → 무음 방지
        u.rate = rate || 0.95;
        u.volume = 1;                // 최대 음량(스피커폰으로 기사님께 전달되도록)
        u.pitch = 1;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
  }

  /* ── 토스트 ── */
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ── 저장(설정) 화면으로 확실하게 데려가기 + 잠깐 강조 ──
     위 버튼을 눌렀는데 아직 저장한 정보가 없을 때 호출.
     sticky 헤더에 가리지 않도록 헤더 높이만큼 보정해 스크롤하고,
     해당 카드를 노랗게 깜빡 강조한 뒤 입력칸에 커서를 둔다. */
  function scrollToSave(sectionId, inputId) {
    var el = document.getElementById(sectionId);
    if (!el) return;
    var header = document.querySelector(".app-header");
    var off = (header ? header.offsetHeight : 0) + 12;
    var y = el.getBoundingClientRect().top + window.pageYOffset - off;
    if (y < 0) y = 0;
    try { window.scrollTo({ top: y, behavior: "smooth" }); }
    catch (e) { window.scrollTo(0, y); }
    el.classList.remove("flash-target");
    void el.offsetWidth;            // 리플로우 강제 → 연속 클릭에도 애니메이션 재시작
    el.classList.add("flash-target");
    setTimeout(function () { el.classList.remove("flash-target"); }, 1800);
    if (inputId) {
      setTimeout(function () {
        var inp = document.getElementById(inputId);
        if (!inp) return;
        try { inp.focus({ preventScroll: true }); } catch (e2) { inp.focus(); }
      }, 520);
    }
  }

  /* ── 인트로 ── */
  $("btn_start").addEventListener("click", function () {
    $("intro").classList.add("hide");
    setTimeout(function () { $("intro").style.display = "none"; }, 400);
    speak("백원콜입니다. 택시 부르기 버튼을 누르세요.");
  });

  /* ── 음성 토글 ── */
  function renderVoiceBtn() {
    var b = $("btn_voice");
    b.setAttribute("aria-pressed", voiceOn ? "true" : "false");
    b.textContent = voiceOn ? "🔊 음성" : "🔇 음성";
  }
  $("btn_voice").addEventListener("click", function () {
    voiceOn = !voiceOn;
    set(LS.voice, voiceOn ? "on" : "off");
    renderVoiceBtn();
    if (voiceOn) speak("음성 안내를 켰습니다.");
  });

  /* ── 택시 부르기 ── */
  function renderTaxiState() {
    var num = get(LS.taxiNum);
    var label = get(LS.taxiLabel);
    var btn = $("btn_call_taxi");
    var sub = $("call_taxi_sub");
    var saved = $("saved_taxi");
    if (num) {
      btn.classList.add("ready"); btn.classList.remove("notready");
      btn.setAttribute("href", "tel:" + num);
      sub.textContent = (label ? label + " · " : "") + formatNum(num);
      saved.hidden = false;
      saved.innerHTML = "저장됨: <b>" + escapeHtml(label || "내 택시") + "</b> " + formatNum(num);
    } else {
      btn.classList.add("notready"); btn.classList.remove("ready");
      btn.setAttribute("href", "#setup");
      sub.textContent = "먼저 우리 동네 택시 번호를 저장하세요";
      saved.hidden = true;
    }
  }
  function formatNum(n) {
    return (n || "").replace(/(\d{2,4})(\d{3,4})(\d{4})$/, "$1-$2-$3");
  }
  function escapeHtml(s) {
    return (s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* 택시 부르기: 화면 전환·스크롤 없이 곧바로 전화 연결.
     번호가 없을 때만 설정 화면으로 안내한다. */
  $("btn_call_taxi").addEventListener("click", function (e) {
    e.preventDefault();
    var num = get(LS.taxiNum);
    if (!num) {
      toast("먼저 아래에서 택시 번호를 저장하세요.");
      speak("먼저 우리 동네 택시 번호를 저장하세요.");
      document.getElementById("setup").scrollIntoView({ behavior: "smooth" });
      return;
    }
    // 다른 화면 거치지 않고 곧바로 전화 다이얼러 열기
    window.location.href = "tel:" + num;
  });

  /* ── 지역 선택 ── */
  function fillProvinces() {
    var sel = $("province_select");
    Object.keys(REGIONS.provinces).forEach(function (p) {
      var o = document.createElement("option");
      o.value = p; o.textContent = p;
      sel.appendChild(o);
    });
    var saved = get(LS.province);
    if (saved && REGIONS.provinces[saved]) {
      sel.value = saved;
      fillRegions(saved);
    }
  }
  function fillRegions(prov) {
    var sel = $("region_select");
    sel.innerHTML = '<option value="">선택하세요</option>';
    if (!prov || !REGIONS.provinces[prov]) {
      sel.innerHTML = '<option value="">위에서 먼저 선택</option>';
      return;
    }
    REGIONS.provinces[prov].forEach(function (r) {
      var o = document.createElement("option");
      o.value = r.name; o.textContent = r.name;
      sel.appendChild(o);
    });
    var savedR = get(LS.region);
    if (savedR) {
      sel.value = savedR;
      showRegionNote(prov, savedR);
    }
  }
  function showRegionNote(prov, name) {
    var note = $("region_note");
    var list = REGIONS.provinces[prov] || [];
    var r = null;
    for (var i = 0; i < list.length; i++) if (list[i].name === name) { r = list[i]; break; }
    if (!r) { note.hidden = true; return; }
    note.hidden = false;
    if (r.hasProgram) {
      note.className = "region-note yes";
      note.innerHTML = "✅ <b>" + escapeHtml(name) + "</b> — " + escapeHtml(r.note) +
        "<br>정확한 콜센터 번호는 읍·면사무소 또는 시·군청 교통과에 문의해 아래 ③에 저장하세요.";
    } else {
      note.className = "region-note no";
      note.innerHTML = "🚫 <b>" + escapeHtml(name) + "</b> — 이 지역은 100원·행복택시 운영 정보가 <b>없습니다</b>." +
        "<br>" + escapeHtml(r.note) +
        "<br>대신 일반 콜택시 번호를 아래 ③에 저장해 사용하실 수 있어요.";
    }
  }
  $("province_select").addEventListener("change", function () {
    set(LS.province, this.value);
    set(LS.region, "");
    fillRegions(this.value);
    $("region_note").hidden = true;
  });
  $("region_select").addEventListener("change", function () {
    set(LS.region, this.value);
    showRegionNote($("province_select").value, this.value);
  });

  /* ── 택시 번호 저장 ── */
  $("btn_save_taxi").addEventListener("click", function () {
    var num = onlyDigits($("taxi_number").value);
    if (num.length < 3) { toast("전화번호를 바르게 입력하세요."); return; }
    set(LS.taxiNum, num);
    set(LS.taxiLabel, $("taxi_label").value.trim());
    set(LS.checkedAt, String(Date.now()));
    renderTaxiState();
    hideReminder();
    toast("택시 번호를 저장했어요.");
    speak("택시 번호를 저장했습니다.");
  });

  /* ── 보호자 ── */
  function renderGuardian() {
    var name = get(LS.gName), num = get(LS.gNum);
    var saved = $("saved_guardian");
    var callBtn = $("btn_call_guardian");
    if (num) {
      callBtn.setAttribute("href", "tel:" + num);
      saved.hidden = false;
      saved.innerHTML = "저장됨: <b>" + escapeHtml(name || "보호자") + "</b> " + formatNum(num);
    } else {
      callBtn.setAttribute("href", "#guardian");
      saved.hidden = true;
    }
  }
  $("btn_save_guardian").addEventListener("click", function () {
    var num = onlyDigits($("guardian_number").value);
    if (num.length < 3) { toast("보호자 전화번호를 바르게 입력하세요."); return; }
    set(LS.gNum, num);
    set(LS.gName, $("guardian_name").value.trim());
    renderGuardian();
    toast("보호자를 저장했어요.");
    speak("보호자를 저장했습니다.");
  });
  $("btn_call_guardian").addEventListener("click", function (e) {
    if (!get(LS.gNum)) {
      e.preventDefault();
      toast("먼저 보호자 번호를 저장하세요.");
      speak("먼저 보호자 번호를 저장하세요.");
      scrollToSave("guardian", "guardian_name");
      return;
    }
    speak("보호자에게 전화를 겁니다.");
  });

  /* (보호자에게 1회 위치문자 보내기 기능은 '위치 공유'(실시간)로 대체됨) */
  function sendSms(num, body) {
    var sep = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent) ? "&" : "?";
    window.location.href = "sms:" + num + sep + "body=" + encodeURIComponent(body);
  }

  /* ── 자주 가는 곳 ── */
  function getPlaces() {
    try { return JSON.parse(get(LS.places) || "[]"); } catch (e) { return []; }
  }
  function savePlaces(arr) { set(LS.places, JSON.stringify(arr)); }
  function renderPlaces() {
    var ul = $("place_list");
    var arr = getPlaces();
    ul.innerHTML = "";
    if (!arr.length) {
      ul.innerHTML = '<li class="place-empty">아직 저장한 곳이 없어요. 위에 적고 ＋추가를 누르세요.</li>';
      return;
    }
    arr.forEach(function (txt, i) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.className = "place-text"; span.textContent = txt;
      var read = document.createElement("button");
      read.className = "read"; read.textContent = "🔊 읽기";
      read.addEventListener("click", function () { speak("목적지, " + txt); });
      var del = document.createElement("button");
      del.className = "del"; del.textContent = "🗑";
      del.addEventListener("click", function () {
        var a = getPlaces(); a.splice(i, 1); savePlaces(a); renderPlaces();
        toast("삭제했어요.");
      });
      li.appendChild(span); li.appendChild(read); li.appendChild(del);
      ul.appendChild(li);
    });
  }
  $("btn_add_place").addEventListener("click", function () {
    var v = $("place_input").value.trim();
    if (!v) { toast("갈 곳을 적어주세요."); return; }
    var arr = getPlaces(); arr.push(v); savePlaces(arr);
    $("place_input").value = "";
    renderPlaces();
    toast("추가했어요.");
  });
  $("place_input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("btn_add_place").click();
  });

  /* ── 한 달 주기 번호 재확인 알림 ── */
  function hideReminder() { $("reminder").hidden = true; }
  function checkReminder() {
    var num = get(LS.taxiNum);
    if (!num) { hideReminder(); return; }
    var at = parseInt(get(LS.checkedAt) || "0", 10);
    if (!at) { set(LS.checkedAt, String(Date.now())); hideReminder(); return; }
    var days = Math.floor((Date.now() - at) / 86400000);
    if (days < REMIND_DAYS) { hideReminder(); return; }
    var label = get(LS.taxiLabel) || "택시";
    $("reminder_text").innerHTML =
      "📅 <b>" + escapeHtml(label) + "</b> 번호를 저장한 지 한 달이 넘었어요.<br>" +
      "택시 콜센터 번호는 해마다 바뀔 수 있어요. 지금 번호가 맞는지 확인해 주세요.";
    $("reminder").hidden = false;
    speak("택시 번호를 저장한 지 한 달이 넘었습니다. 번호가 맞는지 확인해 주세요.");
  }
  $("btn_reminder_ok").addEventListener("click", function () {
    set(LS.checkedAt, String(Date.now()));
    hideReminder();
    toast("확인했어요. 한 달 뒤 다시 알려드릴게요.");
  });
  $("btn_reminder_fix").addEventListener("click", function () {
    hideReminder();
    document.getElementById("setup").scrollIntoView({ behavior: "smooth" });
    $("taxi_number").focus();
  });

  /* ── 내 위치 알리기 (현재 GPS) ──
     누를 때마다 휴대폰 GPS로 "지금 위치"를 잡는다.
     · 기사 휴대폰: 지도 링크를 문자로 전송 → 기사가 눌러서 위치 확인
     · 유선 안내양: 지도를 열어 주소를 보고 직접 말씀 (문자는 유선엔 안 감) */
  var GEO = { last: null };
  function geoMapLink() {
    if (!GEO.last) return "";
    return "https://map.kakao.com/link/map/내위치," + GEO.last.lat + "," + GEO.last.lng;
  }
  function openGeoLocate() {
    if (!navigator.geolocation) { toast("이 기기는 위치 기능을 쓸 수 없어요."); return; }
    GEO.last = null;
    $("loc_addr").textContent = "📡 위치 확인 중…";
    $("loc_overlay").hidden = false;
    document.body.classList.add("loc-open");
    speak("내 위치를 확인하고 있습니다.");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        GEO.last = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        $("loc_addr").textContent = "✅ 지금 내 위치를 찾았어요";
        speak("위치를 찾았습니다. 택시에 문자로 보내거나, 지도를 보고 말씀하세요.");
      },
      function () {
        $("loc_addr").textContent = "위치 확인 실패 — 하늘이 보이는 곳에서 다시 눌러 주세요.";
        speak("위치 확인에 실패했습니다. 다시 시도해 주세요.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }
  function closeLocOverlay() {
    var ov = $("loc_overlay");
    if (ov) ov.hidden = true;
    document.body.classList.remove("loc-open");
  }
  $("btn_my_loc").addEventListener("click", openGeoLocate);
  $("loc_sms").addEventListener("click", function () {
    if (!GEO.last) { toast("위치를 아직 못 찾았어요. 잠시만요."); return; }
    var tnum = get(LS.taxiNum);
    if (!tnum) { toast("먼저 택시 번호를 저장하세요."); closeLocOverlay(); scrollToSave("setup", "taxi_number"); return; }
    var body = "[백원콜] 손님 현재 위치입니다.\n지도: " + geoMapLink();
    toast("택시에 보낼 문자가 열렸어요. ‘보내기’만 누르세요.");
    sendSms(tnum, body);
  });
  $("loc_map").addEventListener("click", function () {
    var link = geoMapLink();
    if (!link) { toast("위치를 아직 못 찾았어요."); return; }
    try { window.open(link, "_blank"); } catch (e) { window.location.href = link; }
  });
  $("loc_close").addEventListener("click", closeLocOverlay);

  /* ══════════════════════════════════════════════
     실시간 위치 공유 (어르신 → 보호자)
     · 어르신 휴대폰 GPS를 약 4초마다 브로드캐스트.
     · 보호자는 문자로 받은 링크(track.html)에서 실시간으로 봄.
     · 위치는 메모리 중계(Supabase Broadcast)로만 흐르고 저장 안 됨.
     ══════════════════════════════════════════════ */
  var BWRT = window.BWRT;
  var RIDE = {
    active: false, token: null, sb: null, ch: null, watchId: null,
    last: null, dest: null, status: "riding",
    nearAlerted: false, arriveAlerted: false, startedAt: 0, _lastSent: 0,
  };

  function rtReady() { return !!(window.supabase && BWRT); }

  function ensureSupabase() {
    if (RIDE.sb) return RIDE.sb;
    try {
      RIDE.sb = window.supabase.createClient(BWRT.SUPABASE_URL, BWRT.SUPABASE_ANON, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 5 } },
      });
    } catch (e) { RIDE.sb = null; }
    return RIDE.sb;
  }

  function updateRideStatusText(t) { var el = $("ride_status"); if (el) el.textContent = t; }

  function renderRide() {
    var startBtn = $("btn_ride_start");
    var on = $("ride_on");
    if (!startBtn) return;
    var label = startBtn.querySelector(".bigbtn-label");
    if (RIDE.active) {
      startBtn.classList.add("on");
      if (label) label.innerHTML = "공유 중";
      if (on) on.hidden = false;
    } else {
      startBtn.classList.remove("on");
      if (label) label.innerHTML = "위치<br>공유";
      if (on) on.hidden = true;
    }
  }

  function persistTrip() {
    try {
      set(LS.trip, JSON.stringify({ token: RIDE.token, startedAt: RIDE.startedAt, dest: RIDE.dest }));
    } catch (e) {}
  }
  function clearTrip() { try { localStorage.removeItem(LS.trip); } catch (e) {} }

  function ensureNotifyPermission() {
    try {
      if (window.Notification && Notification.permission === "default") Notification.requestPermission();
    } catch (e) {}
  }

  function sendState(force) {
    if (!RIDE.ch || !RIDE.last) return;
    var now = Date.now();
    if (!force && RIDE._lastSent && (now - RIDE._lastSent) < BWRT.SEND_INTERVAL_MS) return;
    RIDE._lastSent = now;
    var l = RIDE.last;
    var p = { lat: l.lat, lng: l.lng, acc: l.acc, spd: l.spd, hdg: l.hdg, ts: now, status: RIDE.status };
    if (RIDE.dest) { p.destLat = RIDE.dest.lat; p.destLng = RIDE.dest.lng; p.destName = RIDE.dest.name; }
    try { RIDE.ch.send({ type: "broadcast", event: "state", payload: p }); } catch (e) {}
  }

  function broadcastStatus(s) {
    if (!RIDE.ch) return;
    try { RIDE.ch.send({ type: "broadcast", event: "status", payload: { status: s, ts: Date.now() } }); } catch (e) {}
  }

  function notifyRide(title, body) {
    toast(title + " — " + body);
    try { if (navigator.vibrate) navigator.vibrate([220, 120, 220]); } catch (e) {}
    sayNow(title + ". " + body, 0.95, 1);
    try {
      if (window.Notification && Notification.permission === "granted") {
        new Notification(title, { body: body, lang: "ko-KR", tag: "bw-ride" });
      }
    } catch (e) {}
  }

  function checkArrival() {
    if (!RIDE.dest || !RIDE.last) return;
    var d = BWRT.distM(RIDE.last.lat, RIDE.last.lng, RIDE.dest.lat, RIDE.dest.lng) * BWRT.ROAD_FACTOR;
    var spd = (RIDE.last.spd && RIDE.last.spd > 0.5) ? RIDE.last.spd : BWRT.DEFAULT_SPEED_MPS;
    var eta = d / spd;
    if (d <= BWRT.ARRIVE_RADIUS) {
      if (!RIDE.arriveAlerted) {
        RIDE.arriveAlerted = true;
        RIDE.status = "arrived";
        broadcastStatus("arrived");
        sendState(true);
        notifyRide("목적지 도착", "목적지에 도착했어요.");
        updateRideStatusText("🏁 목적지에 도착했어요.");
      }
    } else if (eta <= BWRT.NEAR_SECONDS) {
      if (!RIDE.nearAlerted) {
        RIDE.nearAlerted = true;
        notifyRide("곧 도착", "약 5분 후 목적지에 도착합니다.");
        updateRideStatusText("⏰ 약 5분 후 목적지 도착 예정");
      }
    }
  }

  function onRidePos(pos) {
    var c = pos.coords;
    RIDE.last = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, spd: c.speed, hdg: c.heading };
    sendState();
    checkArrival();
  }
  function onRideGeoErr() {
    updateRideStatusText("⚠️ 위치를 확인하지 못했어요. 하늘이 보이는 곳에서 다시 시도해 주세요.");
  }

  function onGuardianDest(p) {
    if (!p || typeof p.destLat !== "number" || typeof p.destLng !== "number") return;
    RIDE.dest = { lat: p.destLat, lng: p.destLng, name: p.destName || "목적지" };
    RIDE.nearAlerted = false; RIDE.arriveAlerted = false;
    persistTrip();
    sendState(true);
    checkArrival();
    updateRideStatusText("📍 보호자가 목적지를 정했어요. 도착 5분 전에 알려드릴게요.");
    toast("보호자가 목적지를 정했어요.");
  }

  function rideShareLink() {
    if (!RIDE.token) return;
    var url = BWRT.trackUrl(RIDE.token);
    var msg = "[백원콜] 지금 택시로 이동 중입니다.\n아래 링크에서 제 위치를 실시간으로 보실 수 있어요.\n" + url;
    // 보호자 번호가 저장돼 있으면 곧바로 문자앱을 열어 한 번에 보냅니다(공유 시트 생략).
    var gnum = get(LS.gNum);
    if (gnum) {
      sendSms(gnum, msg);
      toast("보호자에게 보낼 문자가 열렸어요. '보내기'만 누르세요.");
      return;
    }
    if (navigator.share) {
      navigator.share({ title: "백원콜 실시간 위치", text: msg, url: url }).catch(function () {});
      return;
    }
    try {
      navigator.clipboard.writeText(url);
      toast("보기 링크를 복사했어요. 보호자에게 붙여넣어 보내세요.");
    } catch (e) {
      toast("보기 링크: " + url);
    }
  }

  function rideStart(share) {
    if (RIDE.active) { rideShareLink(); return; }
    if (!navigator.geolocation) { toast("이 기기는 위치 기능을 쓸 수 없어요."); return; }
    if (!rtReady()) { toast("실시간 공유를 시작할 수 없어요. 인터넷을 확인해 주세요."); return; }
    var sb = ensureSupabase();
    if (!sb) { toast("실시간 공유 연결에 실패했어요. 잠시 후 다시 시도하세요."); return; }

    RIDE.token = RIDE.token || BWRT.genToken();
    RIDE.status = "riding";
    RIDE.startedAt = RIDE.startedAt || Date.now();
    RIDE._lastSent = 0;

    RIDE.ch = sb.channel(BWRT.channelName(RIDE.token), { config: { broadcast: { self: false } } });
    RIDE.ch.on("broadcast", { event: "hello" }, function () { sendState(true); });
    RIDE.ch.on("broadcast", { event: "dest" }, function (m) { onGuardianDest(m.payload); });
    RIDE.ch.subscribe(function (status) {
      if (status === "SUBSCRIBED") sendState(true);
    });

    RIDE.watchId = navigator.geolocation.watchPosition(onRidePos, onRideGeoErr, {
      enableHighAccuracy: true, timeout: 20000, maximumAge: 2000,
    });

    RIDE.active = true;
    persistTrip();
    ensureNotifyPermission();
    renderRide();
    toast("위치 공유를 시작했어요.");
    speak("위치 공유를 시작했습니다. 보호자에게 링크를 보내세요.");
    if (share !== false) rideShareLink();
  }

  function rideStop(byUser) {
    if (RIDE.watchId != null) {
      try { navigator.geolocation.clearWatch(RIDE.watchId); } catch (e) {}
      RIDE.watchId = null;
    }
    RIDE.status = "ended";
    broadcastStatus("ended");
    var ch = RIDE.ch, sb = RIDE.sb;
    setTimeout(function () { if (ch && sb) { try { sb.removeChannel(ch); } catch (e) {} } }, 700);
    RIDE.active = false;
    RIDE.ch = null;
    RIDE.token = null;
    RIDE.dest = null;
    RIDE.startedAt = 0;
    RIDE.nearAlerted = false; RIDE.arriveAlerted = false;
    clearTrip();
    renderRide();
    if (byUser) { toast("위치 공유를 껐어요."); speak("위치 공유를 껐습니다."); }
  }

  function resumeTripIfAny() {
    var raw = get(LS.trip);
    if (!raw) return;
    var t;
    try { t = JSON.parse(raw); } catch (e) { clearTrip(); return; }
    if (!t || !t.token) { clearTrip(); return; }
    if (!t.startedAt || (Date.now() - t.startedAt) > 3 * 3600 * 1000) { clearTrip(); return; }
    if (!rtReady()) return;
    RIDE.token = t.token;
    RIDE.startedAt = t.startedAt;
    if (t.dest) RIDE.dest = t.dest;
    rideStart(false); // 같은 토큰으로 재구독·재추적(자동 공유는 안 함)
    toast("이전 위치 공유를 이어서 켰어요. 끄려면 ‘공유 끄기’를 누르세요.");
  }

  if ($("btn_ride_start")) {
    $("btn_ride_start").addEventListener("click", function () { rideStart(true); });
    $("btn_ride_share").addEventListener("click", function () { rideShareLink(); });
    $("btn_ride_stop").addEventListener("click", function () { rideStop(true); });
  }

  /* ── 초기 로드 ── */
  function restoreInputs() {
    $("taxi_number").value = formatNum(get(LS.taxiNum));
    $("taxi_label").value = get(LS.taxiLabel);
    $("guardian_name").value = get(LS.gName);
    $("guardian_number").value = formatNum(get(LS.gNum));
  }

  // 단일 파일(핸드폰용) 버전에서는 데이터가 window.__REGIONS__ 로 주입됨.
  if (window.__REGIONS__) {
    REGIONS = window.__REGIONS__;
    fillProvinces();
  } else {
    fetch("data/regions.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        REGIONS = data;
        fillProvinces();
      })
      .catch(function () {
        $("region_note").hidden = false;
        $("region_note").className = "region-note no";
        $("region_note").textContent = "지역 목록을 불러오지 못했습니다. 번호는 직접 입력해 저장하세요.";
      });
  }

  renderVoiceBtn();
  renderTaxiState();
  renderGuardian();
  renderPlaces();
  restoreInputs();
  checkReminder();
  renderRide();
  resumeTripIfAny();

  /* 서비스워커 등록 (오프라인) */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
