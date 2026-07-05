(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VB_W = 540;
  const VB_H = 960;
  const HORIZON_Y = 260;
  const MAIN_VB = { x: 0, y: 0, w: VB_W, h: VB_H };
  const DIFF_VB = { x: 0, y: 140, w: 540, h: 520 };

  /* =========================================================
     아이콘 라이브러리 (카멜레온 모드에서 무작위로 골라 쓰는 그림들)
     원점(0,0) 기준 상대 좌표
     ========================================================= */
  const ICONS = {
    bunny: (c) => `
      <ellipse cx="0" cy="9" rx="15" ry="11" fill="${c.body}"/>
      <ellipse cx="-8" cy="-13" rx="4.2" ry="15" fill="${c.body}" transform="rotate(-14 -8 -13)"/>
      <ellipse cx="8" cy="-13" rx="4.2" ry="15" fill="${c.body}" transform="rotate(14 8 -13)"/>
      <ellipse cx="-8" cy="-11" rx="2" ry="9.5" fill="${c.accent}" transform="rotate(-14 -8 -13)"/>
      <ellipse cx="8" cy="-11" rx="2" ry="9.5" fill="${c.accent}" transform="rotate(14 8 -13)"/>
      <circle cx="-4.5" cy="6" r="1.4" fill="${c.eye}"/>
      <circle cx="4.5" cy="6" r="1.4" fill="${c.eye}"/>
      <ellipse cx="0" cy="10" rx="2" ry="1.4" fill="${c.accent}"/>
      <circle cx="13" cy="14" r="3.4" fill="${c.body}"/>`,
    cat: (c) => `
      <ellipse cx="0" cy="10" rx="16" ry="10" fill="${c.body}"/>
      <path d="M -18 6 Q -22 -10 -8 -4 Z" fill="${c.body}"/>
      <path d="M -13 6 Q -14 -3 -7 -1 Z" fill="${c.accent}"/>
      <path d="M -8 -6 L -4 -14 L -1 -5 Z" fill="${c.body}"/>
      <path d="M 3 -6 L 6 -15 L 9 -6 Z" fill="${c.body}"/>
      <circle cx="-5" cy="2" r="1.3" fill="${c.eye}"/>
      <circle cx="4" cy="1" r="1.3" fill="${c.eye}"/>
      <path d="M 12 12 Q 22 8 20 -2" stroke="${c.body}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    squirrel: (c) => `
      <ellipse cx="-2" cy="8" rx="11" ry="9" fill="${c.body}"/>
      <path d="M 6 4 Q 26 -6 20 18 Q 14 26 4 18 Z" fill="${c.body}"/>
      <path d="M 8 6 Q 22 0 18 16 Q 13 21 7 15 Z" fill="${c.accent}"/>
      <path d="M -10 0 L -14 -9 L -6 -4 Z" fill="${c.body}"/>
      <circle cx="-8" cy="4" r="1.2" fill="${c.eye}"/>
      <ellipse cx="-14" cy="9" rx="2.4" ry="1.8" fill="${c.accent}"/>`,
    bird: (c) => `
      <ellipse cx="0" cy="4" rx="12" ry="9" fill="${c.body}"/>
      <circle cx="10" cy="-4" r="6.5" fill="${c.body}"/>
      <path d="M 15 -4 L 21 -1.5 L 15 1 Z" fill="${c.accent}"/>
      <circle cx="12" cy="-6" r="1.1" fill="${c.eye}"/>
      <path d="M -10 4 Q -20 0 -12 -6 Q -6 -2 -10 4 Z" fill="${c.accent}"/>
      <path d="M -2 12 L -6 17 M 3 13 L 3 18" stroke="${c.accent}" stroke-width="1.6" stroke-linecap="round"/>`,
    butterfly: (c) => `
      <path d="M 0 0 Q -20 -22 -26 -4 Q -22 8 0 4 Z" fill="${c.body}"/>
      <path d="M 0 0 Q 20 -22 26 -4 Q 22 8 0 4 Z" fill="${c.body}"/>
      <path d="M 0 3 Q -14 12 -18 22 Q -10 20 0 10 Z" fill="${c.accent}"/>
      <path d="M 0 3 Q 14 12 18 22 Q 10 20 0 10 Z" fill="${c.accent}"/>
      <ellipse cx="0" cy="0" rx="2.2" ry="14" fill="#5a4636"/>
      <path d="M -1 -12 Q -6 -18 -9 -16 M 1 -12 Q 6 -18 9 -16" stroke="#5a4636" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    mushroom: (c) => `
      <path d="M -14 2 Q -16 -16 0 -16 Q 16 -16 14 2 Z" fill="${c.body}"/>
      <circle cx="-6" cy="-8" r="2.6" fill="${c.accent}"/>
      <circle cx="5" cy="-11" r="2" fill="${c.accent}"/>
      <circle cx="7" cy="-3" r="2.3" fill="${c.accent}"/>
      <rect x="-6" y="2" width="12" height="13" rx="5" fill="#fff3e0"/>`,
    heart: (c) => `
      <path d="M0 15 C -18 0 -16 -14 -4 -14 C 0 -14 0 -10 0 -10 C 0 -10 0 -14 4 -14 C 16 -14 18 0 0 15 Z" fill="${c.body}"/>
      <path d="M -8 -8 Q -10 -3 -6 0" stroke="${c.accent}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.7"/>
      <line x1="0" y1="15" x2="0" y2="34" stroke="#c9c9c9" stroke-width="1.2"/>`,
    star: (c) => `
      <path d="M0 -16 L4.7 -5 L17 -4.5 L7.5 3 L10.5 15 L0 8 L-10.5 15 L-7.5 3 L-17 -4.5 L-4.7 -5 Z" fill="${c.body}"/>
      <path d="M0 -16 L4.7 -5 L17 -4.5 L7.5 3 L10.5 15 L0 8 Z" fill="${c.accent}" opacity="0.5"/>`,
    acorn: (c) => `
      <ellipse cx="0" cy="8" rx="9" ry="11" fill="${c.body}"/>
      <path d="M -10 -2 Q 0 -16 10 -2 Q 0 4 -10 -2 Z" fill="${c.accent}"/>
      <rect x="-1.4" y="-16" width="2.8" height="6" fill="${c.accent}"/>`,
    kite: (c) => `
      <path d="M0 -20 L16 0 L0 20 L-16 0 Z" fill="${c.body}"/>
      <path d="M0 -20 L16 0 L0 0 Z" fill="${c.accent}" opacity="0.55"/>
      <path d="M0 20 Q 4 30 -2 36 Q 6 40 0 46" stroke="#d8d8d8" stroke-width="1.4" fill="none"/>`,
    dragonfly: (c) => `
      <ellipse cx="-14" cy="-5" rx="15" ry="4" fill="${c.accent}" opacity="0.75" transform="rotate(-14 -14 -5)"/>
      <ellipse cx="14" cy="-5" rx="15" ry="4" fill="${c.accent}" opacity="0.75" transform="rotate(14 14 -5)"/>
      <ellipse cx="-12" cy="4" rx="12" ry="3.2" fill="${c.accent}" opacity="0.65" transform="rotate(-8 -12 4)"/>
      <ellipse cx="12" cy="4" rx="12" ry="3.2" fill="${c.accent}" opacity="0.65" transform="rotate(8 12 4)"/>
      <ellipse cx="0" cy="-6" rx="3.4" ry="6" fill="${c.body}"/>
      <ellipse cx="0" cy="14" rx="2.2" ry="14" fill="${c.body}"/>
      <circle cx="-1.8" cy="-13" r="1.6" fill="${c.eye}"/>
      <circle cx="1.8" cy="-13" r="1.6" fill="${c.eye}"/>`,
    hedgehog: (c) => `
      <ellipse cx="0" cy="9" rx="15" ry="8" fill="${c.accent}"/>
      <path d="M -15 5 Q -13 -14 -3 -9 Q 3 -17 9 -8 Q 16 -13 14 3 Q 6 -3 0 1 Q -8 -3 -15 5 Z" fill="${c.body}"/>
      <path d="M 13 5 L 21 3 L 13 9 Z" fill="${c.eye}"/>
      <circle cx="8" cy="2" r="1.3" fill="${c.eye}"/>`,
    owl: (c) => `
      <ellipse cx="0" cy="7" rx="13" ry="15" fill="${c.body}"/>
      <path d="M -9 -12 L -13 -21 L -4 -14 Z" fill="${c.body}"/>
      <path d="M 9 -12 L 13 -21 L 4 -14 Z" fill="${c.body}"/>
      <path d="M -13 9 Q -19 15 -12 22 Z" fill="${c.body}"/>
      <path d="M 13 9 Q 19 15 12 22 Z" fill="${c.body}"/>
      <circle cx="0" cy="-1" r="10" fill="${c.accent}"/>
      <circle cx="-5" cy="-1" r="4.2" fill="#fff9ee"/>
      <circle cx="5" cy="-1" r="4.2" fill="#fff9ee"/>
      <circle cx="-5" cy="-1" r="2" fill="${c.eye}"/>
      <circle cx="5" cy="-1" r="2" fill="${c.eye}"/>
      <path d="M -2 6 L 2 6 L 0 10 Z" fill="#f0a03c"/>`,
    fox: (c) => `
      <ellipse cx="0" cy="11" rx="14" ry="9" fill="${c.body}"/>
      <path d="M 11 15 Q 26 11 24 -2 Q 21 5 12 9 Z" fill="${c.body}"/>
      <path d="M 22 -1 Q 25 4 20 6 Z" fill="${c.accent}"/>
      <path d="M -10 -3 L -14 -15 L -2 -7 Z" fill="${c.body}"/>
      <path d="M 10 -3 L 14 -15 L 2 -7 Z" fill="${c.body}"/>
      <path d="M -8 -9 Q 0 -15 8 -9 Q 6 1 0 3 Q -6 1 -8 -9 Z" fill="${c.body}"/>
      <path d="M -3 -1 Q 0 5 3 -1 Q 0 3 -3 -1 Z" fill="${c.accent}"/>
      <circle cx="-3.5" cy="-3" r="1.2" fill="${c.eye}"/>
      <circle cx="3.5" cy="-3" r="1.2" fill="${c.eye}"/>
      <circle cx="0" cy="1" r="1" fill="${c.eye}"/>`,
    firefly: (c) => `
      <circle cx="0" cy="5" r="11" fill="${c.accent}" opacity="0.3"/>
      <ellipse cx="-7" cy="-2" rx="7" ry="3" fill="${c.body}" opacity="0.6" transform="rotate(-22 -7 -2)"/>
      <ellipse cx="7" cy="-2" rx="7" ry="3" fill="${c.body}" opacity="0.6" transform="rotate(22 7 -2)"/>
      <ellipse cx="0" cy="-2" rx="4" ry="6.5" fill="${c.eye}"/>
      <ellipse cx="0" cy="9" rx="4.6" ry="6" fill="${c.accent}"/>`,
    dango: (c) => `
      <line x1="0" y1="-23" x2="0" y2="17" stroke="#c9a06a" stroke-width="2.4"/>
      <circle cx="0" cy="-15" r="7" fill="${c.body}"/>
      <circle cx="0" cy="-1" r="7" fill="#fff8ec"/>
      <circle cx="0" cy="13" r="7" fill="${c.accent}"/>`
  };

  const ICON_NAMES = Object.keys(ICONS);

  function iconMarkup(name, colors) {
    const fn = ICONS[name];
    return fn ? fn(colors) : "";
  }

  /* ---------- 색상 유틸 (카무플라주 + 무작위 색 생성 + 색조 회전) ---------- */
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    const clamp = (v) => Math.round(Math.max(0, Math.min(255, v)));
    return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
  }

  function mixHex(hex1, hex2, t) {
    if (!t) return hex1;
    const a = hexToRgb(hex1);
    const b = hexToRgb(hex2);
    return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
  }

  function hslToHex(h, s, l) {
    const hh = ((h % 360) + 360) % 360;
    const ss = s / 100;
    const ll = l / 100;
    const k = (n) => (n + hh / 30) % 12;
    const a = ss * Math.min(ll, 1 - ll);
    const f = (n) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex(255 * f(0), 255 * f(8), 255 * f(4));
  }

  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
        case gn: h = (bn - rn) / d + 2; break;
        default: h = (rn - gn) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function rotateHue(hex, deg) {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h + deg, s, l);
  }

  // 카멜레온 그림이 어떤 배경 요소 옆에 있는지에 따라 위장할 색을 고른다
  function blendTargetColor(occlude, palette) {
    switch (occlude) {
      case "blossom": return palette.blossom[0];
      case "bush": return palette.bush[0];
      case "trunk": return palette.trunk;
      case "sky": return palette.sky[1];
      default: return palette.blossom[0];
    }
  }

  function camouflageColors(obj, palette, diff) {
    const target = blendTargetColor(obj.occlude, palette);
    const t = diff.blendT;
    return {
      body: mixHex(obj.colors.body, target, t),
      accent: mixHex(obj.colors.accent, target, t * 0.8),
      eye: mixHex(obj.colors.eye || "#33261c", target, t * 0.5)
    };
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /* =========================================================
     레벨별 배경 색 팔레트
     ========================================================= */
  const PALETTES = [
    { sky: ["#ffe9f1", "#ffd2e3"], far: "#ffd9ea", blossom: ["#ffc7dd", "#ffb2cf", "#ff9fc2"],
      trunk: "#8a6248", trunk2: "#6e4c37", grass: ["#f7ecd8", "#eee0c4"], bush: ["#ffcfe1", "#ffbcd6"], night: false },
    { sky: ["#ffdcea", "#ffbcd6"], far: "#ffc7dd", blossom: ["#ffb6d4", "#ff9dc4", "#ff86b6"],
      trunk: "#7a5138", trunk2: "#5f4028", grass: ["#f2e4cd", "#e7d6b8"], bush: ["#ffbfd8", "#ffa8c9"], night: false },
    { sky: ["#ffe3cf", "#ffc7a8"], far: "#ffd3b8", blossom: ["#ffcdb8", "#ffb59c", "#ff9d82"],
      trunk: "#6b4732", trunk2: "#4f351f", grass: ["#f6ddb8", "#eecb9a"], bush: ["#ffc9ac", "#ffb08c"], night: false },
    { sky: ["#d8e0ff", "#b9c6f5"], far: "#c9d3ff", blossom: ["#f0c8ff", "#e3aef2", "#d494ea"],
      trunk: "#4a3527", trunk2: "#382718", grass: ["#e3ddf0", "#d3cae6"], bush: ["#e3b8f2", "#d29fe8"], night: false },
    { sky: ["#241a3d", "#3d2757"], far: "#4a3468", blossom: ["#ffcdf0", "#ffabe4", "#ff8fd8"],
      trunk: "#241a14", trunk2: "#150f0b", grass: ["#3a2c4d", "#2c2140"], bush: ["#ff9fd9", "#e37cc4"], night: true }
  ];

  /* =========================================================
     정적 배경 배치(나무/수풀) - 모든 레벨 공통 좌표, 색만 팔레트로 변경
     세로(portrait) 화면에 맞춰 벚꽃길이 위(멀리)에서 아래(가까이)로 이어지는 구도
     ========================================================= */
  const TREE_SPOTS = [
    { x: 45, y: 320, scale: 0.55 },
    { x: 28, y: 480, scale: 0.8 },
    { x: 8, y: 680, scale: 1.05 },
    { x: -8, y: 900, scale: 1.4 },
    { x: 495, y: 320, scale: 0.55 },
    { x: 512, y: 480, scale: 0.8 },
    { x: 532, y: 680, scale: 1.05 },
    { x: 548, y: 900, scale: 1.4 }
  ];

  const BUSH_SPOTS = [
    { x: 140, y: 580, scale: 0.85 },
    { x: 400, y: 580, scale: 0.85 },
    { x: 270, y: 700, scale: 0.9 },
    { x: 110, y: 840, scale: 1.05 },
    { x: 430, y: 840, scale: 1.05 }
  ];

  const LANTERN_SPOTS = [
    { x: 190, y: 360 }, { x: 350, y: 380 }, { x: 160, y: 520 }, { x: 380, y: 540 },
    { x: 130, y: 700 }, { x: 410, y: 720 }, { x: 100, y: 860 }, { x: 440, y: 860 }
  ];

  const SKY_POINTS = [
    { x: 130, y: 80 }, { x: 270, y: 60 }, { x: 410, y: 90 }, { x: 190, y: 150 }, { x: 360, y: 140 }
  ];

  const BLOSSOM_OFFSETS = [
    { dx: -34, dy: -78, r: 27 }, { dx: 0, dy: -96, r: 32 }, { dx: 34, dy: -78, r: 27 },
    { dx: -18, dy: -56, r: 23 }, { dx: 18, dy: -56, r: 23 }, { dx: 0, dy: -68, r: 22 },
    { dx: -30, dy: -40, r: 18 }, { dx: 30, dy: -40, r: 18 }
  ];

  // 카멜레온 그림 위에 겹쳐 일부를 가리는 꽃잎/잎사귀 위치 (난이도가 높을수록 더 많이 사용)
  const OCCLUDER_TEMPLATES = [
    { dx: -9, dy: -7, r: 12 },
    { dx: 9, dy: 5, r: 11 },
    { dx: -4, dy: 11, r: 9 }
  ];

  /* =========================================================
     5개 판 - 배경 요소 분포 템플릿
     (카멜레온 모드에서 몇 개를, 어떤 배경 요소 옆에 생성할지 결정하는 데만 쓰임 -
      실제 모양/색/정확한 위치는 매번 무작위로 생성됨)
     ========================================================= */
  const LEVELS = [
    { title: "1판. 벚꽃길 입구", objects: [{ occlude: "bush", scale: 1.05 }, { occlude: "blossom", scale: 1.05 }, { occlude: "blossom", scale: 0.85 }] },
    { title: "2판. 분홍빛 오솔길", objects: [{ occlude: "bush", scale: 0.9 }, { occlude: "bush", scale: 1.0 }, { occlude: "bush", scale: 1.05 }] },
    { title: "3판. 노을 지는 벚꽃길", objects: [{ occlude: "trunk", scale: 0.85 }, { occlude: "bush", scale: 0.95 }, { occlude: "sky", scale: 0.9 }] },
    { title: "4판. 저녁 벚꽃길", objects: [{ occlude: "bush", scale: 1.0 }, { occlude: "blossom", scale: 0.95 }, { occlude: "sky", scale: 0.85 }] },
    { title: "5판. 벚꽃 축제의 밤", objects: [{ occlude: "trunk", scale: 1.0 }, { occlude: "bush", scale: 0.9 }, { occlude: "bush", scale: 0.9 }, { occlude: "sky", scale: 0.85 }] }
  ];

  /* =========================================================
     난이도 설정 (1: 아주 쉬움 ~ 5: 매우 어려움)
     - hitRadius: (카멜레온 모드) 정답으로 인정하는 터치 반경
     - scaleMult: (카멜레온 모드) 그림 크기 배율
     - opacity: (카멜레온 모드) 그림 불투명도
     - extraRotate: (카멜레온 모드) 추가 회전 각도
     - blendT: (두 모드 공통) 색상을 주변 배경 색으로 섞는 비율 / 틀린그림 색 차이의 반대비율
     - occluders: (카멜레온 모드) 그림 위에 겹쳐서 가리는 장식 개수
     - hints: 게임 시작 시 주어지는 힌트 개수
     ========================================================= */
  const DIFFICULTY_LEVELS = [
    { id: 1, label: "아주 쉬움 · 색이 또렷하고 크게 보여요", hitRadius: 60, scaleMult: 1.35, opacity: 1.0, extraRotate: 0, blendT: 0, occluders: 0, hints: 5 },
    { id: 2, label: "쉬움 · 살짝 작아지고 색이 은은해져요", hitRadius: 50, scaleMult: 1.15, opacity: 0.97, extraRotate: 6, blendT: 0.15, occluders: 0, hints: 4 },
    { id: 3, label: "보통 · 배경과 색이 많이 비슷해져요", hitRadius: 40, scaleMult: 0.95, opacity: 0.92, extraRotate: 12, blendT: 0.35, occluders: 1, hints: 3 },
    { id: 4, label: "어려움 · 꽃잎에 반쯤 가려져 있어요", hitRadius: 30, scaleMult: 0.78, opacity: 0.88, extraRotate: 20, blendT: 0.52, occluders: 2, hints: 2 },
    { id: 5, label: "매우 어려움 · 윌리를 찾아라급! 완전히 숨었어요", hitRadius: 22, scaleMult: 0.62, opacity: 0.85, extraRotate: 30, blendT: 0.68, occluders: 3, hints: 1 }
  ];

  // 틀린그림찾기 모드에서 난이도별로 추가되는 차이 개수
  const DIFF_COUNT_BONUS = [0, 0, 1, 1, 2];

  const MODE_INFO = {
    chameleon: { label: "대상이 배경 색과 모양에 맞춰 매번 다르게 나타나요 🦎", startToast: "숨은 그림을 찾아보세요! 🔍" },
    diff: { label: "위·아래 그림을 비교해서 다른 부분을 찾아보세요 🔍", startToast: "다른 부분을 찾아보세요! 🔍" }
  };

  function currentDifficulty() {
    return DIFFICULTY_LEVELS[state.difficulty - 1];
  }

  /* =========================================================
     게임 상태
     ========================================================= */
  const state = {
    mode: "chameleon",
    levelIndex: 0,
    found: new Set(),
    currentTargets: [],
    difficulty: 1,
    hintsLeft: 5,
    startTime: 0,
    totalElapsed: 0,
    busy: false
  };

  const el = {
    screens: {
      start: document.getElementById("screen-start"),
      game: document.getElementById("screen-game"),
      levelclear: document.getElementById("screen-levelclear"),
      complete: document.getElementById("screen-complete")
    },
    btnStart: document.getElementById("btn-start"),
    btnNext: document.getElementById("btn-next"),
    btnRestart: document.getElementById("btn-restart"),
    btnHint: document.getElementById("btn-hint"),
    hintCount: document.getElementById("hint-count"),
    progressDots: document.getElementById("progress-dots"),
    levelTitle: document.getElementById("level-title-text"),
    diffBadge: document.getElementById("diff-badge"),
    modeButtons: document.getElementById("mode-buttons"),
    modeDesc: document.getElementById("mode-desc"),
    diffButtons: document.getElementById("difficulty-buttons"),
    diffDesc: document.getElementById("difficulty-desc"),
    foundCounter: document.getElementById("found-counter"),
    scene: document.getElementById("scene"),
    diffStage: document.getElementById("diff-stage"),
    sceneA: document.getElementById("sceneA"),
    sceneB: document.getElementById("sceneB"),
    petalLayer: document.getElementById("petal-layer"),
    toast: document.getElementById("toast"),
    levelClearTitle: document.getElementById("levelclear-title"),
    levelClearTime: document.getElementById("levelclear-time"),
    completeTime: document.getElementById("complete-time")
  };

  function showScreen(name) {
    Object.values(el.screens).forEach((s) => s.classList.remove("active"));
    el.screens[name].classList.add("active");
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  /* ---------- 배경 그리기 (카멜레온/틀린그림 두 모드가 공유) ---------- */
  function buildTree(spot, palette, opts) {
    opts = opts || {};
    const g = svgEl("g", { transform: `translate(${spot.x} ${spot.y}) scale(${spot.scale})` });
    const trunk = svgEl("path", {
      d: "M -6 40 Q -10 0 -3 -30 Q 0 -34 3 -30 Q 10 0 6 40 Z",
      fill: palette.trunk
    });
    const branch = svgEl("path", {
      d: "M -1 -18 Q -20 -34 -30 -30 M 2 -20 Q 18 -36 28 -30",
      stroke: palette.trunk2,
      "stroke-width": "3.5",
      fill: "none",
      "stroke-linecap": "round"
    });
    g.appendChild(trunk);
    g.appendChild(branch);
    if (!opts.bald) {
      let blossomColors = palette.blossom;
      if (opts.recolorDeg) blossomColors = blossomColors.map((c) => rotateHue(c, opts.recolorDeg));
      BLOSSOM_OFFSETS.forEach((o, i) => {
        g.appendChild(svgEl("circle", {
          cx: o.dx, cy: o.dy - 30, r: o.r, fill: blossomColors[i % blossomColors.length], opacity: "0.95"
        }));
      });
    }
    return g;
  }

  function buildBush(spot, palette, opts) {
    opts = opts || {};
    const scaleAdj = opts.resizeFactor || 1;
    const g = svgEl("g", { transform: `translate(${spot.x} ${spot.y}) scale(${spot.scale * scaleAdj})` });
    let colors = palette.bush;
    if (opts.recolorDeg) colors = colors.map((c) => rotateHue(c, opts.recolorDeg));
    const offsets = [
      { dx: -20, dy: 0, r: 20 }, { dx: 0, dy: -8, r: 24 }, { dx: 20, dy: 0, r: 20 },
      { dx: -10, dy: 6, r: 16 }, { dx: 10, dy: 6, r: 16 }
    ];
    offsets.forEach((o, i) => {
      g.appendChild(svgEl("circle", {
        cx: o.dx, cy: o.dy, r: o.r, fill: colors[i % colors.length], opacity: "0.95"
      }));
    });
    return g;
  }

  // 배경(하늘/언덕/길/등불/수풀/나무/떨어진 꽃잎)만 그리고, 그린 레이어(g)를 반환한다.
  // mutations가 있으면 특정 나무/수풀/등불에 변형(재색칠/크기변경/제거)을 적용한다 (틀린그림찾기용)
  function drawBackground(svgElement, palette, mutations, idPrefix) {
    mutations = mutations || {};
    svgElement.innerHTML = "";

    const defs = svgEl("defs", {});
    const skyGrad = svgEl("linearGradient", { id: `${idPrefix}-sky`, x1: "0", y1: "0", x2: "0", y2: "1" });
    skyGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": palette.sky[0] }));
    skyGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": palette.sky[1] }));
    defs.appendChild(skyGrad);

    const groundGrad = svgEl("linearGradient", { id: `${idPrefix}-ground`, x1: "0", y1: "0", x2: "0", y2: "1" });
    groundGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": palette.grass[0] }));
    groundGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": palette.grass[1] }));
    defs.appendChild(groundGrad);

    // 뷰박스 밖으로 배경 요소가 삐져나가지 않도록(레터박스 여백 노출 방지) 클립 처리
    const clipPath = svgEl("clipPath", { id: `${idPrefix}-clip` });
    clipPath.appendChild(svgEl("rect", { x: 0, y: 0, width: VB_W, height: VB_H }));
    defs.appendChild(clipPath);
    svgElement.appendChild(defs);

    const layer = svgEl("g", { "clip-path": `url(#${idPrefix}-clip)` });
    svgElement.appendChild(layer);

    // 하늘
    layer.appendChild(svgEl("rect", { x: 0, y: 0, width: VB_W, height: VB_H, fill: `url(#${idPrefix}-sky)` }));

    // 밤이면 별
    if (palette.night) {
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137) % VB_W;
        const sy = (i * 53) % 260;
        layer.appendChild(svgEl("circle", {
          cx: sx, cy: sy, r: (i % 3 === 0) ? 1.6 : 1, fill: "#fff", opacity: 0.4 + (i % 5) * 0.1
        }));
      }
    }

    // 먼 언덕
    layer.appendChild(svgEl("ellipse", { cx: VB_W / 2, cy: HORIZON_Y + 40, rx: 380, ry: 90, fill: palette.far, opacity: "0.6" }));

    // 잔디 바닥
    layer.appendChild(svgEl("rect", { x: 0, y: HORIZON_Y, width: VB_W, height: VB_H - HORIZON_Y, fill: `url(#${idPrefix}-ground)` }));

    // 길 (멀리서 가까이로 이어지는 벚꽃길)
    layer.appendChild(svgEl("path", {
      d: `M 245 ${HORIZON_Y} L 295 ${HORIZON_Y} L 440 ${VB_H} L 100 ${VB_H} Z`,
      fill: palette.night ? "#4a3a52" : "#f4ecd9",
      opacity: "0.9"
    }));
    // 길 경계선
    layer.appendChild(svgEl("path", {
      d: `M 245 ${HORIZON_Y} L 100 ${VB_H} M 295 ${HORIZON_Y} L 440 ${VB_H}`,
      stroke: palette.night ? "#6a5878" : "#e0d2ad",
      "stroke-width": "3",
      fill: "none"
    }));

    // 축제 밤이면 등불
    if (palette.night) {
      LANTERN_SPOTS.forEach((spot, idx) => {
        if (mutations.lanternRemove && mutations.lanternRemove[idx]) return;
        const lantern = svgEl("g", {});
        lantern.appendChild(svgEl("line", { x1: spot.x, y1: spot.y - 40, x2: spot.x, y2: spot.y, stroke: "#8a7060", "stroke-width": "1.5" }));
        lantern.appendChild(svgEl("ellipse", { cx: spot.x, cy: spot.y + 10, rx: 10, ry: 13, fill: "#ffd98a" }));
        lantern.appendChild(svgEl("ellipse", { cx: spot.x, cy: spot.y + 10, rx: 14, ry: 18, fill: "#ffe9b0", opacity: "0.35" }));
        layer.appendChild(lantern);
      });
    }

    // 수풀 (먼저 - 배경)
    BUSH_SPOTS.forEach((spot, idx) => {
      const opts = {};
      if (mutations.bushRecolor && mutations.bushRecolor[idx] !== undefined) opts.recolorDeg = mutations.bushRecolor[idx];
      if (mutations.bushResize && mutations.bushResize[idx] !== undefined) opts.resizeFactor = mutations.bushResize[idx];
      layer.appendChild(buildBush(spot, palette, opts));
    });

    // 나무
    TREE_SPOTS.forEach((spot, idx) => {
      const opts = {};
      if (mutations.treeRecolor && mutations.treeRecolor[idx] !== undefined) opts.recolorDeg = mutations.treeRecolor[idx];
      if (mutations.treeBald && mutations.treeBald[idx]) opts.bald = true;
      layer.appendChild(buildTree(spot, palette, opts));
    });

    // 바닥에 떨어진 꽃잎 몇 개 장식
    for (let i = 0; i < 14; i++) {
      const px = 40 + (i * 67) % (VB_W - 80);
      const py = HORIZON_Y + 40 + (i * 53) % (VB_H - HORIZON_Y - 80);
      layer.appendChild(svgEl("ellipse", {
        cx: px, cy: py, rx: 5, ry: 3.5,
        fill: palette.blossom[i % palette.blossom.length],
        opacity: "0.7",
        transform: `rotate(${(i * 47) % 360} ${px} ${py})`
      }));
    }

    return layer;
  }

  /* =========================================================
     카멜레온 모드: 매번 무작위로 생성되는 숨은 그림
     ========================================================= */
  function anchorPoolFor(occlude) {
    switch (occlude) {
      case "blossom": return TREE_SPOTS.map((s) => ({ x: s.x, y: s.y - 95 * s.scale, scale: s.scale }));
      case "trunk": return TREE_SPOTS.map((s) => ({ x: s.x, y: s.y + 8 * s.scale, scale: s.scale }));
      case "sky": return SKY_POINTS.map((p) => ({ x: p.x, y: p.y, scale: 1 }));
      case "bush":
      default: return BUSH_SPOTS.map((s) => ({ x: s.x, y: s.y, scale: s.scale }));
    }
  }

  function pickRandomAnchor(occlude) {
    const pool = anchorPoolFor(occlude);
    const base = pool[Math.floor(Math.random() * pool.length)];
    const jitterX = Math.random() * 36 - 18;
    const jitterY = Math.random() * 30 - 15;
    return {
      x: clamp(base.x + jitterX, 30, VB_W - 30),
      y: clamp(base.y + jitterY, 40, VB_H - 40),
      scale: base.scale
    };
  }

  function generateBlobShape() {
    const n = 4 + Math.floor(Math.random() * 2);
    const shapes = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 6 + Math.random() * 10;
      shapes.push({ dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist * 0.8 - 4, r: 9 + Math.random() * 8 });
    }
    return shapes;
  }

  function randomChameleonColors() {
    const hue = Math.floor(Math.random() * 360);
    const sat = 45 + Math.random() * 25;
    const light = 55 + Math.random() * 18;
    return {
      body: hslToHex(hue, sat, light),
      accent: hslToHex(hue + 35, Math.max(20, sat - 10), Math.min(88, light + 18)),
      eye: "#33261c"
    };
  }

  function generateChameleonTargets(levelIdx) {
    const template = LEVELS[levelIdx].objects;
    return template.map((tmpl, i) => {
      const anchor = pickRandomAnchor(tmpl.occlude);
      const useBlob = Math.random() < 0.35;
      const rotate = Math.round(Math.random() * 40 - 20);
      const scaleJitter = 0.88 + Math.random() * 0.34;
      const obj = {
        id: `t${i}`,
        x: anchor.x,
        y: anchor.y,
        occlude: tmpl.occlude,
        rotate,
        scale: (tmpl.scale || 1) * scaleJitter,
        colors: randomChameleonColors()
      };
      if (useBlob) obj.blob = generateBlobShape();
      else obj.icon = ICON_NAMES[Math.floor(Math.random() * ICON_NAMES.length)];
      return obj;
    });
  }

  function renderChameleonObjects(layer, palette, diff) {
    state.currentTargets.forEach((obj, i) => {
      const extra = diff.extraRotate * (i % 2 === 0 ? 1 : -1);
      const objScale = obj.scale * diff.scaleMult;
      const camo = camouflageColors(obj, palette, diff);
      const g = svgEl("g", {
        class: "hidden-obj",
        id: `obj-${obj.id}`,
        transform: `translate(${obj.x} ${obj.y}) rotate(${obj.rotate + extra}) scale(${objScale})`,
        opacity: diff.opacity,
        "data-id": obj.id
      });
      if (obj.blob) {
        g.innerHTML = obj.blob.map((c, idx) =>
          `<circle cx="${c.dx}" cy="${c.dy}" r="${c.r}" fill="${idx % 2 === 0 ? camo.body : camo.accent}"/>`
        ).join("");
      } else {
        g.innerHTML = iconMarkup(obj.icon, camo);
      }
      layer.appendChild(g);

      // 가림막: 난이도가 높을수록 꽃잎/잎사귀 색 원으로 일부를 덮어 더 찾기 어렵게 함
      const occluderColor = blendTargetColor(obj.occlude, palette);
      OCCLUDER_TEMPLATES.slice(0, diff.occluders).forEach((o) => {
        layer.appendChild(svgEl("circle", {
          cx: obj.x + o.dx * objScale,
          cy: obj.y + o.dy * objScale,
          r: o.r * objScale,
          fill: occluderColor,
          opacity: "0.92"
        }));
      });
    });
  }

  function renderChameleonScene(levelIdx) {
    const palette = PALETTES[levelIdx];
    const diff = currentDifficulty();
    const layer = drawBackground(el.scene, palette, {}, "main");
    state.currentTargets = generateChameleonTargets(levelIdx);
    renderChameleonObjects(layer, palette, diff);
  }

  /* =========================================================
     틀린그림찾기 모드: 같은 배경을 두 번 그리고 일부를 변형
     ========================================================= */
  // 틀린그림찾기 화면은 DIFF_VB로 잘라서 보여주므로, 잘려서 안 보이는 나무/수풀/등불은
  // 차이 후보에서 제외해야 한다 (안 그러면 화면에 보이지도 않는 정답이 생길 수 있음)
  function isWithinDiffView(y) {
    return y >= DIFF_VB.y + 20 && y <= DIFF_VB.y + DIFF_VB.h - 20;
  }

  function pickDifferenceMutations(levelIdx, diffTier, count) {
    const palette = PALETTES[levelIdx];
    const tNorm = diffTier.blendT / 0.68; // 0(쉬움, 뚜렷) ~ 1(어려움, 미묘)
    const hueShiftDeg = 110 - 75 * tNorm;
    const resizeBase = 1.7 - 0.55 * tNorm;

    const pool = [];
    BUSH_SPOTS.forEach((spot, idx) => {
      const recolorY = spot.y - 10 * spot.scale;
      if (isWithinDiffView(recolorY)) pool.push({ type: "bush-recolor", idx, x: spot.x, y: recolorY, r: 46 * spot.scale, hueShiftDeg });
      if (isWithinDiffView(spot.y)) pool.push({ type: "bush-resize", idx, x: spot.x, y: spot.y, r: 50 * spot.scale, resizeFactor: Math.random() < 0.5 ? resizeBase : 1 / resizeBase });
    });
    TREE_SPOTS.forEach((spot, idx) => {
      const canopyY = spot.y - 70 * spot.scale;
      if (isWithinDiffView(canopyY)) {
        pool.push({ type: "tree-recolor", idx, x: spot.x, y: canopyY, r: 55 * spot.scale, hueShiftDeg });
        pool.push({ type: "tree-bald", idx, x: spot.x, y: canopyY, r: 55 * spot.scale });
      }
    });
    if (palette.night) {
      LANTERN_SPOTS.forEach((spot, idx) => {
        if (isWithinDiffView(spot.y)) pool.push({ type: "lantern-remove", idx, x: spot.x, y: spot.y, r: 26 });
      });
    }

    shuffleArray(pool);
    const chosen = [];
    for (const cand of pool) {
      if (chosen.length >= count) break;
      const tooClose = chosen.some((c) => Math.hypot(c.x - cand.x, c.y - cand.y) < 90);
      const sameElement = chosen.some((c) => c.type.split("-")[0] === cand.type.split("-")[0] && c.idx === cand.idx);
      if (!tooClose && !sameElement) chosen.push(cand);
    }
    return chosen.map((c, i) => ({ id: `d${i}`, ...c }));
  }

  function renderDiffScene(levelIdx) {
    const palette = PALETTES[levelIdx];
    const diffTier = currentDifficulty();
    const baseCount = LEVELS[levelIdx].objects.length;
    const count = baseCount + DIFF_COUNT_BONUS[state.difficulty - 1];
    const chosen = pickDifferenceMutations(levelIdx, diffTier, count);
    state.currentTargets = chosen;

    const mutations = { bushRecolor: {}, bushResize: {}, treeRecolor: {}, treeBald: {}, lanternRemove: {} };
    chosen.forEach((c) => {
      if (c.type === "bush-recolor") mutations.bushRecolor[c.idx] = c.hueShiftDeg;
      if (c.type === "bush-resize") mutations.bushResize[c.idx] = c.resizeFactor;
      if (c.type === "tree-recolor") mutations.treeRecolor[c.idx] = c.hueShiftDeg;
      if (c.type === "tree-bald") mutations.treeBald[c.idx] = true;
      if (c.type === "lantern-remove") mutations.lanternRemove[c.idx] = true;
    });

    drawBackground(el.sceneA, palette, {}, "da");
    drawBackground(el.sceneB, palette, mutations, "db");
  }

  /* ---------- 꽃잎 흩날리기 ---------- */
  let petalTimer = null;
  function startPetals() {
    stopPetals();
    petalTimer = setInterval(() => {
      const p = document.createElement("div");
      p.className = "petal";
      const startX = Math.random() * 100;
      const duration = 6 + Math.random() * 5;
      const drift = (Math.random() * 80 - 40).toFixed(0) + "px";
      p.style.left = startX + "%";
      p.style.setProperty("--drift", drift);
      p.style.animationDuration = duration + "s";
      p.style.width = p.style.height = 8 + Math.random() * 8 + "px";
      el.petalLayer.appendChild(p);
      setTimeout(() => p.remove(), duration * 1000 + 200);
    }, 550);
  }
  function stopPetals() {
    if (petalTimer) clearInterval(petalTimer);
    petalTimer = null;
    el.petalLayer.innerHTML = "";
  }

  /* ---------- 진행 표시 점 ---------- */
  function renderDots() {
    el.progressDots.innerHTML = "";
    for (let i = 0; i < LEVELS.length; i++) {
      const d = document.createElement("div");
      d.className = "dot";
      if (i < state.levelIndex) d.classList.add("done");
      else if (i === state.levelIndex) d.classList.add("current");
      el.progressDots.appendChild(d);
    }
  }

  /* ---------- 토스트 메시지 ---------- */
  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1100);
  }

  /* ---------- 레벨 시작 ---------- */
  function startLevel(idx) {
    state.levelIndex = idx;
    state.found = new Set();
    state.busy = false;
    state.startTime = Date.now();

    const level = LEVELS[idx];
    el.levelTitle.textContent = level.title;
    el.diffBadge.textContent = `Lv.${state.difficulty}`;
    renderDots();

    if (state.mode === "chameleon") {
      el.scene.style.display = "";
      el.diffStage.style.display = "none";
      renderChameleonScene(idx);
    } else {
      el.scene.style.display = "none";
      el.diffStage.style.display = "flex";
      renderDiffScene(idx);
    }

    el.foundCounter.textContent = `0 / ${state.currentTargets.length}`;
    startPetals();
    showScreen("game");
    showToast(MODE_INFO[state.mode].startToast);
  }

  /* ---------- 터치 좌표 변환 ---------- */
  function getPointInSvg(svgElement, evt, vb) {
    const rect = svgElement.getBoundingClientRect();
    const scale = Math.min(rect.width / vb.w, rect.height / vb.h);
    const offsetX = (rect.width - vb.w * scale) / 2;
    const offsetY = (rect.height - vb.h * scale) / 2;
    const x = (evt.clientX - rect.left - offsetX) / scale + vb.x;
    const y = (evt.clientY - rect.top - offsetY) / scale + vb.y;
    return { x, y };
  }

  function handleTap(evt, svgElement, vb) {
    if (state.busy) return;
    const pt = getPointInSvg(svgElement, evt, vb);
    const fallbackRadius = currentDifficulty().hitRadius;

    let hit = null;
    let bestDist = Infinity;
    state.currentTargets.forEach((obj) => {
      if (state.found.has(obj.id)) return;
      const dx = pt.x - obj.x;
      const dy = pt.y - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = obj.r != null ? obj.r : fallbackRadius;
      if (dist <= r && dist < bestDist) {
        bestDist = dist;
        hit = obj;
      }
    });

    if (hit) {
      markFound(hit);
    } else {
      spawnMissMark(pt, svgElement);
    }
  }

  function drawFoundRing(svgElement, x, y) {
    const ring = svgEl("circle", {
      cx: x, cy: y, r: 14, fill: "none", stroke: "#5be08a", "stroke-width": "4", opacity: "0.95",
      class: "found-ring"
    });
    ring.style.transition = "r 0.5s ease";
    svgElement.appendChild(ring);
    requestAnimationFrame(() => ring.setAttribute("r", "40"));
  }

  function markFound(obj) {
    state.found.add(obj.id);

    if (state.mode === "chameleon") {
      const node = document.getElementById(`obj-${obj.id}`);
      if (node) node.classList.add("found");
      drawFoundRing(el.scene, obj.x, obj.y);
    } else {
      drawFoundRing(el.sceneA, obj.x, obj.y);
      drawFoundRing(el.sceneB, obj.x, obj.y);
    }

    el.foundCounter.textContent = `${state.found.size} / ${state.currentTargets.length}`;
    showToast("정답이에요! ⭕");

    if (state.found.size === state.currentTargets.length) {
      state.busy = true;
      setTimeout(onLevelClear, 500);
    }
  }

  function spawnMissMark(pt, svgElement) {
    // 오답 표시: X 표시가 나타났다가 서서히 사라짐
    const g = svgEl("g", {
      transform: `translate(${pt.x} ${pt.y})`,
      opacity: "0"
    });
    g.appendChild(svgEl("line", { x1: -16, y1: -16, x2: 16, y2: 16, stroke: "#ff4d4d", "stroke-width": "6", "stroke-linecap": "round" }));
    g.appendChild(svgEl("line", { x1: 16, y1: -16, x2: -16, y2: 16, stroke: "#ff4d4d", "stroke-width": "6", "stroke-linecap": "round" }));
    g.style.transition = "opacity 0.15s ease, transform 0.5s ease";
    svgElement.appendChild(g);
    requestAnimationFrame(() => { g.style.opacity = "1"; });
    setTimeout(() => {
      g.style.opacity = "0";
      g.setAttribute("transform", `translate(${pt.x} ${pt.y}) scale(0.6)`);
    }, 550);
    setTimeout(() => g.remove(), 750);
    showToast("아쉬워요! 다시 찾아보세요 ❌");
  }

  /* ---------- 힌트 ---------- */
  function drawHintRing(svgElement, x, y, r) {
    const ring = svgEl("circle", {
      cx: x, cy: y, r, fill: "none", stroke: "#ffe28a", "stroke-width": "3",
      "stroke-dasharray": "6 6", opacity: "0"
    });
    ring.style.transition = "opacity 0.3s ease";
    svgElement.appendChild(ring);
    requestAnimationFrame(() => { ring.style.opacity = "1"; });
    setTimeout(() => { ring.style.opacity = "0"; }, 1500);
    setTimeout(() => ring.remove(), 1900);
  }

  function useHint() {
    if (state.hintsLeft <= 0 || state.busy) return;
    const remaining = state.currentTargets.filter((o) => !state.found.has(o.id));
    if (remaining.length === 0) return;

    state.hintsLeft -= 1;
    el.hintCount.textContent = state.hintsLeft;
    if (state.hintsLeft <= 0) el.btnHint.disabled = true;

    remaining.forEach((obj) => {
      const r = obj.r || 34;
      if (state.mode === "chameleon") {
        drawHintRing(el.scene, obj.x, obj.y, r);
      } else {
        drawHintRing(el.sceneA, obj.x, obj.y, r);
        drawHintRing(el.sceneB, obj.x, obj.y, r);
      }
    });
    showToast("힌트! 동그라미 안을 살펴보세요 💡");
  }

  /* ---------- 레벨 클리어 / 게임 완료 ---------- */
  function onLevelClear() {
    stopPetals();
    const elapsed = Math.round((Date.now() - state.startTime) / 1000);
    state.totalElapsed += elapsed;

    const isLast = state.levelIndex === LEVELS.length - 1;
    el.levelClearTitle.textContent = `${state.levelIndex + 1}판 클리어! 🎊`;
    el.levelClearTime.textContent = `걸린 시간: ${elapsed}초`;
    el.btnNext.textContent = isLast ? "결과 보기" : "다음 판으로";
    showScreen("levelclear");
  }

  function onNextPressed() {
    const isLast = state.levelIndex === LEVELS.length - 1;
    if (isLast) {
      renderDots();
      const mins = Math.floor(state.totalElapsed / 60).toString().padStart(2, "0");
      const secs = (state.totalElapsed % 60).toString().padStart(2, "0");
      el.completeTime.textContent = `총 걸린 시간: ${mins}:${secs}`;
      showScreen("complete");
    } else {
      startLevel(state.levelIndex + 1);
    }
  }

  function beginNewGame() {
    const diff = currentDifficulty();
    state.hintsLeft = diff.hints;
    state.totalElapsed = 0;
    el.hintCount.textContent = state.hintsLeft;
    el.btnHint.disabled = false;
    startLevel(0);
  }

  /* ---------- 게임 모드 선택 ---------- */
  function updateModeUI() {
    el.modeButtons.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === state.mode);
    });
    el.modeDesc.textContent = MODE_INFO[state.mode].label;
  }

  el.modeButtons.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.mode;
      updateModeUI();
    });
  });
  updateModeUI();

  /* ---------- 난이도 선택 ---------- */
  function updateDifficultyUI() {
    const diff = currentDifficulty();
    el.diffButtons.querySelectorAll(".diff-btn").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.diff) === state.difficulty);
    });
    el.diffDesc.textContent = diff.label;
  }

  el.diffButtons.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.difficulty = Number(btn.dataset.diff);
      updateDifficultyUI();
    });
  });
  updateDifficultyUI();

  /* ---------- 이벤트 바인딩 ---------- */
  el.btnStart.addEventListener("click", beginNewGame);
  el.btnNext.addEventListener("click", onNextPressed);
  el.btnRestart.addEventListener("click", () => showScreen("start"));
  el.btnHint.addEventListener("click", useHint);
  el.scene.addEventListener("pointerdown", (e) => handleTap(e, el.scene, MAIN_VB));
  el.sceneA.addEventListener("pointerdown", (e) => handleTap(e, el.sceneA, DIFF_VB));
  el.sceneB.addEventListener("pointerdown", (e) => handleTap(e, el.sceneB, DIFF_VB));

  // 시작화면 장식 꽃잎
  (function decorateStart() {
    const layer = document.querySelector(".petals-deco");
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("div");
      p.className = "petal";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDuration = 6 + Math.random() * 6 + "s";
      p.style.animationDelay = Math.random() * 6 + "s";
      p.style.setProperty("--drift", (Math.random() * 80 - 40).toFixed(0) + "px");
      layer.appendChild(p);
    }
  })();
})();
