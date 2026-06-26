/* 백원콜 — 보호자 실시간 추적 페이지 로직
   ─────────────────────────────────────────────
   · URL의 ?t=토큰 으로 한 번의 운행 채널(bw-trip-<토큰>)에 접속합니다.
   · 어르신 휴대폰이 약 4초마다 보내는 위치를 받아 지도에 표시하고,
     남은 거리 / 도착 예상시간을 계산해 "곧 도착" · "도착" 알림을 울립니다.
   · 위치는 메모리 브로드캐스트로만 흐르며 어디에도 저장되지 않습니다.
*/
(function () {
  "use strict";

  var B = window.BWRT;
  var L = window.L;

  // ── 토큰 파싱 ─────────────────────────────────
  var params = new URLSearchParams(location.search);
  var token = (params.get("t") || "").trim();

  // ── DOM ──────────────────────────────────────
  var overlay = document.getElementById("overlay");
  var ovEmoji = document.getElementById("ov_emoji");
  var ovTitle = document.getElementById("ov_title");
  var ovMsg = document.getElementById("ov_msg");
  var connDot = document.getElementById("conn_dot");
  var connText = document.getElementById("conn_text");
  var statusBig = document.getElementById("status_big");
  var mDist = document.getElementById("m_dist");
  var mEta = document.getElementById("m_eta");
  var destLine = document.getElementById("dest_line");
  var btnSound = document.getElementById("btn_sound");
  var btnDest = document.getElementById("btn_dest");
  var btnKakao = document.getElementById("btn_kakao");
  var btnNaver = document.getElementById("btn_naver");
  var btnTmap = document.getElementById("btn_tmap");
  var btnCall = document.getElementById("btn_call");
  var toastEl = document.getElementById("toast");

  // ── 상태 ─────────────────────────────────────
  var rider = null;          // {lat,lng,acc,spd,hdg,ts}
  var dest = null;           // {lat,lng,name}
  var riderName = "어르신";
  var riderTel = "";
  var lastTs = 0;
  var follow = true;         // 지도 자동 따라가기
  var pickMode = false;      // 목적지 선택 모드
  var soundOn = false;
  var nearAlerted = false, arriveAlerted = false;
  var audioCtx = null;
  var toastTimer = null;

  if (!token) {
    showOverlay("🔗", "링크가 올바르지 않습니다", "어르신이 보내주신 링크를 다시 한 번 눌러 주세요.");
    return;
  }
  if (!window.supabase || !L) {
    showOverlay("📡", "잠시 연결이 어렵습니다", "인터넷 상태를 확인하고 새로고침 해주세요.");
    return;
  }

  // ── 지도 ─────────────────────────────────────
  var map = L.map("map", { zoomControl: true, attributionControl: true })
    .setView([36.5, 127.8], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
  map.on("dragstart", function () { follow = false; });
  map.on("click", function (e) {
    if (!pickMode) return;
    setDest(e.latlng.lat, e.latlng.lng, "보호자 지정 목적지", true);
    setPickMode(false);
  });

  var riderMarker = null, destMarker = null, trail = null;
  var trailPts = [];

  function riderIcon() {
    return L.divIcon({
      className: "bw-rider",
      html: '<div class="ring"></div><div class="pin">🚕</div>',
      iconSize: [44, 44], iconAnchor: [22, 22],
    });
  }
  function destIcon() {
    return L.divIcon({ className: "bw-dest", html: "🏁", iconSize: [28, 28], iconAnchor: [6, 26] });
  }

  // ── Supabase 실시간 채널 ──────────────────────
  var sb = window.supabase.createClient(B.SUPABASE_URL, B.SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  var ch = sb.channel(B.channelName(token), { config: { broadcast: { self: false } } });

  // 연결 지연 감지: 일정 시간 안에 채널이 붙지 않으면(백엔드가 잠자거나 인터넷이
  // 불안정한 경우) 무한 "연결 중…" 대신 보호자가 무엇을 하면 되는지 안내한다.
  var connectedOnce = false;
  var slowTimer = setTimeout(function () {
    if (connectedOnce) return;
    showOverlay("📡", "연결이 조금 늦어지고 있어요",
      "자동으로 계속 다시 연결하고 있어요. 이 화면이 한참 그대로면 어르신께 ‘위치 공유’를 다시 한 번 눌러 달라고 하시거나, 이 페이지를 새로고침 해 주세요.");
    setConn("연결을 다시 시도하는 중…", true);
  }, 15000);

  ch.on("broadcast", { event: "state" }, function (m) { onState(m.payload); });
  ch.on("broadcast", { event: "status" }, function (m) { onStatus(m.payload); });
  ch.subscribe(function (status) {
    if (status === "SUBSCRIBED") {
      connectedOnce = true;
      clearTimeout(slowTimer);
      setConn("연결됨 · 어르신 위치를 기다리는 중", false);
      ovTitle.textContent = "연결되었습니다";
      ovMsg.innerHTML = "어르신이 위치 공유를 시작하면<br />이 화면에 실시간으로 나타납니다.";
      // 이미 운행 중인 어르신에게 현재 위치를 즉시 보내달라고 요청
      try { ch.send({ type: "broadcast", event: "hello", payload: { ts: Date.now() } }); } catch (e) {}
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      setConn("연결 오류 — 자동으로 다시 시도합니다", true);
    } else if (status === "CLOSED") {
      setConn("연결이 닫혔습니다", true);
    }
  });

  // ── 수신 처리 ─────────────────────────────────
  function onState(p) {
    if (!p || !isNum(p.lat) || !isNum(p.lng)) return;
    lastTs = Date.now();
    rider = { lat: p.lat, lng: p.lng, acc: p.acc, spd: p.spd, hdg: p.hdg, ts: p.ts };
    if (p.name) riderName = String(p.name);
    if (p.tel) { riderTel = String(p.tel); showCall(); }
    if (p.status) setStatus(p.status);

    // 어르신(또는 다른 보호자)이 정한 목적지를 반영(되돌려 보내지 않음)
    if (isNum(p.destLat) && isNum(p.destLng)) {
      if (!dest || dest.lat !== p.destLat || dest.lng !== p.destLng) {
        setDest(p.destLat, p.destLng, p.destName || "목적지", false);
      }
    }

    hideOverlay();
    updateMarker();
    recompute();
  }

  function onStatus(p) {
    if (!p || !p.status) return;
    setStatus(p.status);
  }

  function setStatus(s) {
    if (s === "riding") {
      if (!statusBig.classList.contains("arrived")) {
        statusBig.textContent = "🚕 이동 중입니다";
        statusBig.className = "status-big";
      }
    } else if (s === "arrived") {
      statusBig.textContent = "🏁 목적지에 도착했어요";
      statusBig.className = "status-big arrived";
    } else if (s === "ended") {
      statusBig.textContent = "운행이 종료되었습니다";
      statusBig.className = "status-big ended";
      setConn("운행 종료", true);
    }
  }

  // ── 지도 갱신 ─────────────────────────────────
  function updateMarker() {
    if (!rider) return;
    var ll = [rider.lat, rider.lng];
    if (!riderMarker) {
      riderMarker = L.marker(ll, { icon: riderIcon(), zIndexOffset: 1000 }).addTo(map);
      riderMarker.on("click", function () { follow = true; map.panTo(ll); });
      map.setView(ll, 16);
    } else {
      riderMarker.setLatLng(ll);
    }
    trailPts.push(ll);
    if (trailPts.length > 600) trailPts.shift();
    if (!trail) trail = L.polyline(trailPts, { color: "#f59e0b", weight: 5, opacity: 0.7 }).addTo(map);
    else trail.setLatLngs(trailPts);
    if (follow) map.panTo(ll, { animate: true, duration: 0.5 });
  }

  // ── 목적지 ───────────────────────────────────
  function setDest(lat, lng, name, doBroadcast) {
    var changed = !dest || dest.lat !== lat || dest.lng !== lng;
    dest = { lat: lat, lng: lng, name: name || "목적지" };
    if (!destMarker) destMarker = L.marker([lat, lng], { icon: destIcon() }).addTo(map);
    else destMarker.setLatLng([lat, lng]);
    destLine.innerHTML = "목적지: <b>" + escapeHtml(dest.name) + "</b>";
    if (changed) { nearAlerted = false; arriveAlerted = false; }
    if (doBroadcast) {
      try {
        ch.send({ type: "broadcast", event: "dest",
          payload: { destLat: lat, destLng: lng, destName: dest.name } });
      } catch (e) {}
      toast("목적지를 정했어요. 어르신 화면에도 표시됩니다.");
    }
    if (changed && rider) {
      try { map.fitBounds(L.latLngBounds([[rider.lat, rider.lng], [lat, lng]]).pad(0.35)); } catch (e) {}
    }
    recompute();
  }

  function setPickMode(on) {
    pickMode = on;
    btnDest.classList.toggle("on", on);
    btnDest.textContent = on ? "📍 지도를 눌러 목적지 선택" : "📍 목적지 정하기";
    if (on) toast("지도에서 목적지 위치를 눌러 주세요");
  }

  // ── 거리·예상시간·알림 ───────────────────────
  function recompute() {
    if (!rider) return;
    if (dest) {
      var d = B.distM(rider.lat, rider.lng, dest.lat, dest.lng) * B.ROAD_FACTOR;
      mDist.textContent = B.distText(d);
      var spd = (rider.spd && rider.spd > 0.5) ? rider.spd : B.DEFAULT_SPEED_MPS;
      var eta = d / spd;
      mEta.textContent = B.durText(eta);

      if (d <= B.ARRIVE_RADIUS) {
        if (!arriveAlerted) { arriveAlerted = true; fireArrive(); }
      } else if (eta <= B.NEAR_SECONDS) {
        if (!nearAlerted) { nearAlerted = true; fireNear(); }
      }
    } else {
      mDist.textContent = "—";
      mEta.textContent = "—";
    }
    updateNavLinks();
  }

  function fireNear() {
    notify("곧 도착합니다", riderName + " 어르신이 약 5분 후 목적지에 도착합니다.");
  }
  function fireArrive() {
    notify("목적지 도착", riderName + " 어르신이 목적지에 도착했습니다.");
    setStatus("arrived");
  }

  // ── 알림(소리·진동·음성·푸시) ────────────────
  function notify(title, body) {
    toast(title + " — " + body);
    try { if (navigator.vibrate) navigator.vibrate([220, 120, 220]); } catch (e) {}
    if (soundOn) { beep(); say(title + ". " + body); }
    try {
      if (window.Notification && Notification.permission === "granted") {
        new Notification(title, { body: body, tag: "bw-alert", lang: "ko-KR" });
      }
    } catch (e) {}
  }

  function beep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var t = audioCtx.currentTime;
      [0, 0.5].forEach(function (off) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine"; o.frequency.value = 880;
        o.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.25, t + off + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.4);
        o.start(t + off); o.stop(t + off + 0.42);
      });
    } catch (e) {}
  }

  function say(text) {
    try {
      if (!window.speechSynthesis) return;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR"; u.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ── 외부 지도 앱 딥링크 ──────────────────────
  function updateNavLinks() {
    if (!rider) return;
    var rlat = rider.lat, rlng = rider.lng;
    if (dest) {
      btnKakao.href = "https://map.kakao.com/link/from/백원택시," + rlat + "," + rlng +
        "/to/" + encodeURIComponent(dest.name) + "," + dest.lat + "," + dest.lng;
      btnNaver.href = "nmap://route/car?slat=" + rlat + "&slng=" + rlng +
        "&sname=" + encodeURIComponent("백원택시") +
        "&dlat=" + dest.lat + "&dlng=" + dest.lng +
        "&dname=" + encodeURIComponent(dest.name) + "&appname=kr.baekwoncall.app";
      btnTmap.href = "tmap://route?goalname=" + encodeURIComponent(dest.name) +
        "&goalx=" + dest.lng + "&goaly=" + dest.lat;
    } else {
      btnKakao.href = "https://map.kakao.com/link/map/백원택시," + rlat + "," + rlng;
      btnNaver.href = "nmap://place?lat=" + rlat + "&lng=" + rlng +
        "&name=" + encodeURIComponent("백원택시 위치") + "&appname=kr.baekwoncall.app";
      btnTmap.href = "tmap://viewmap?x=" + rlng + "&y=" + rlat;
    }
  }

  function showCall() {
    if (!riderTel) return;
    btnCall.style.display = "";
    btnCall.href = "tel:" + riderTel;
  }

  // ── 버튼 동작 ────────────────────────────────
  btnSound.addEventListener("click", function () {
    soundOn = true;
    btnSound.classList.add("on");
    btnSound.textContent = "🔔 알림·소리 켜짐";
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      beep();
    } catch (e) {}
    try {
      if (window.Notification && Notification.permission === "default") Notification.requestPermission();
    } catch (e) {}
    say("알림이 켜졌습니다");
    toast("알림·소리를 켰습니다. 도착 5분 전에 울려드려요.");
  });

  btnDest.addEventListener("click", function () { setPickMode(!pickMode); });

  // ── 신호 상태 표시(끊김 감지) ────────────────
  setInterval(function () {
    if (!lastTs) return;
    var age = Date.now() - lastTs;
    if (age > B.STALE_MS) setConn("신호 끊김 — 다시 연결 중…", true);
    else setConn("실시간 연결됨 · " + Math.max(0, Math.round(age / 1000)) + "초 전 갱신", false);
  }, 2000);

  // ── 작은 도우미 ──────────────────────────────
  function setConn(text, stale) {
    connText.textContent = text;
    connDot.className = "dot " + (stale ? "stale" : "live");
  }
  function showOverlay(emoji, title, msg) {
    ovEmoji.textContent = emoji;
    ovTitle.textContent = title;
    ovMsg.innerHTML = escapeHtml(msg);
    overlay.classList.remove("hide");
  }
  function hideOverlay() { overlay.classList.add("hide"); }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3200);
  }
  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 페이지를 떠날 때 채널 정리
  window.addEventListener("beforeunload", function () {
    try { sb.removeChannel(ch); } catch (e) {}
  });
})();
