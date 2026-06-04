/* 백원콜 — 실시간 위치공유 공통 설정/도우미
   ─────────────────────────────────────────────
   · 아래 ANON 키는 "공개되어도 되는" 공개 키입니다(브라우저 노출 전제).
     이 프로젝트에는 테이블이 없고, 실시간 브로드캐스트(메모리 중계)만 사용합니다.
     위치는 DB에 저장되지 않으며 운행이 끝나면 아무 기록도 남지 않습니다.
   · 어르신 앱(index.html)과 보호자 페이지(track.html)가 함께 사용합니다.
*/
(function () {
  "use strict";

  var BWRT = {
    SUPABASE_URL: "https://siqlhoimzvklzzhrqayq.supabase.co",
    SUPABASE_ANON:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcWxob2ltenZrbHp6aHJxYXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODA1MzUsImV4cCI6MjA5NTk1NjUzNX0.BwvIE-FBUM_tfe1obuUtmIl7IzjWcYm_lEGNzJbk_b8",
    SITE_URL: "https://fabulous-haupia-84bc45.netlify.app",

    CHANNEL_PREFIX: "bw-trip-",
    ROAD_FACTOR: 1.3, // 직선거리 → 실제 도로거리 보정(농어촌 도로 굽이 감안)
    ARRIVE_RADIUS: 90, // m, 이 반경 안이면 "도착"으로 판정
    NEAR_SECONDS: 300, // 도착 예상 5분(=300초) 전 알림 기준
    SEND_INTERVAL_MS: 4000, // 위치 전송 주기(약 4초)
    DEFAULT_SPEED_MPS: 8.3, // 속도를 모를 때 가정값(약 30km/h)
    STALE_MS: 30000, // 이 시간 넘게 신호 없으면 "끊김" 표시

    // URL-safe 랜덤 토큰(약 22자) — 한 번의 운행을 식별
    genToken: function () {
      var a = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(a);
      var s = "";
      for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
      return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },
    channelName: function (token) {
      return this.CHANNEL_PREFIX + token;
    },
    trackUrl: function (token) {
      return this.SITE_URL + "/track.html?t=" + encodeURIComponent(token);
    },

    // 두 좌표 사이 거리(m) — 하버사인 공식
    distM: function (la1, ln1, la2, ln2) {
      var R = 6371000,
        toR = Math.PI / 180;
      var dLa = (la2 - la1) * toR,
        dLn = (ln2 - ln1) * toR;
      var a =
        Math.sin(dLa / 2) * Math.sin(dLa / 2) +
        Math.cos(la1 * toR) * Math.cos(la2 * toR) * Math.sin(dLn / 2) * Math.sin(dLn / 2);
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    },
    // 사람이 읽기 좋은 거리 문자열
    distText: function (m) {
      if (m == null || !isFinite(m)) return "—";
      if (m < 1000) return Math.round(m / 10) * 10 + " m";
      return (m / 1000).toFixed(m < 10000 ? 1 : 0) + " km";
    },
    // 초 → "약 N분"
    durText: function (s) {
      if (s == null || !isFinite(s)) return "—";
      var m = Math.round(s / 60);
      if (m <= 0) return "곧 도착";
      if (m < 60) return "약 " + m + "분";
      var h = Math.floor(m / 60);
      var mm = m % 60;
      return "약 " + h + "시간" + (mm ? " " + mm + "분" : "");
    },
  };

  window.BWRT = BWRT;
})();
