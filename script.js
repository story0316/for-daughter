(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VB_W = 540;
  const VB_H = 960;
  const HORIZON_Y = 260;

  /* =========================================================
     아이콘 라이브러리 (숨은 그림들) - 원점(0,0) 기준 상대 좌표
     ========================================================= */
  const ICONS = {
    bunny: (c) => `
      <ellipse cx="0" cy="9" rx="15" ry="11" fill="${c.body}"/>
      <ellipse cx="-8" cy="-13" rx="4.2" ry="15" fill="${c.body}" transform="rotate(-14 -8 -13)"/>
      <ellipse cx="8" cy="-13" rx="4.2" ry="15" fill="${c.body}" transform="rotate(14 8 -13)"/>
      <ellipse cx="-8" cy="-11" rx="2" ry="9.5" fill="${c.accent}" transform="rotate(-14 -8 -13)"/>
      <ellipse cx="8" cy="-11" rx="2" ry="9.5" fill="${c.accent}" transform="rotate(14 8 -13)"/>
      <circle cx="-4.5" cy="6" r="1.4" fill="#4a3327"/>
      <circle cx="4.5" cy="6" r="1.4" fill="#4a3327"/>
      <ellipse cx="0" cy="10" rx="2" ry="1.4" fill="${c.accent}"/>
      <circle cx="13" cy="14" r="3.4" fill="${c.body}"/>`,
    cat: (c) => `
      <ellipse cx="0" cy="10" rx="16" ry="10" fill="${c.body}"/>
      <path d="M -18 6 Q -22 -10 -8 -4 Z" fill="${c.body}"/>
      <path d="M -13 6 Q -14 -3 -7 -1 Z" fill="${c.accent}"/>
      <path d="M -8 -6 L -4 -14 L -1 -5 Z" fill="${c.body}"/>
      <path d="M 3 -6 L 6 -15 L 9 -6 Z" fill="${c.body}"/>
      <circle cx="-5" cy="2" r="1.3" fill="#3a2a20"/>
      <circle cx="4" cy="1" r="1.3" fill="#3a2a20"/>
      <path d="M 12 12 Q 22 8 20 -2" stroke="${c.body}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    squirrel: (c) => `
      <ellipse cx="-2" cy="8" rx="11" ry="9" fill="${c.body}"/>
      <path d="M 6 4 Q 26 -6 20 18 Q 14 26 4 18 Z" fill="${c.body}"/>
      <path d="M 8 6 Q 22 0 18 16 Q 13 21 7 15 Z" fill="${c.accent}"/>
      <path d="M -10 0 L -14 -9 L -6 -4 Z" fill="${c.body}"/>
      <circle cx="-8" cy="4" r="1.2" fill="#3a2a20"/>
      <ellipse cx="-14" cy="9" rx="2.4" ry="1.8" fill="${c.accent}"/>`,
    bird: (c) => `
      <ellipse cx="0" cy="4" rx="12" ry="9" fill="${c.body}"/>
      <circle cx="10" cy="-4" r="6.5" fill="${c.body}"/>
      <path d="M 15 -4 L 21 -1.5 L 15 1 Z" fill="${c.accent}"/>
      <circle cx="12" cy="-6" r="1.1" fill="#2c2c2c"/>
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
      <path d="M0 20 Q 4 30 -2 36 Q 6 40 0 46" stroke="#d8d8d8" stroke-width="1.4" fill="none"/>`
  };

  function iconMarkup(name, colors) {
    const fn = ICONS[name];
    return fn ? fn(colors) : "";
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

  const BLOSSOM_OFFSETS = [
    { dx: -34, dy: -78, r: 27 }, { dx: 0, dy: -96, r: 32 }, { dx: 34, dy: -78, r: 27 },
    { dx: -18, dy: -56, r: 23 }, { dx: 18, dy: -56, r: 23 }, { dx: 0, dy: -68, r: 22 },
    { dx: -30, dy: -40, r: 18 }, { dx: 30, dy: -40, r: 18 }
  ];

  /* =========================================================
     5개 판 - 숨은 그림 목록 (viewBox 800x500 좌표)
     ========================================================= */
  const LEVELS = [
    {
      title: "1판. 벚꽃길 입구",
      objects: [
        { id: "bunny1", icon: "bunny", x: 95, y: 830, scale: 1.05, rotate: -6, colors: { body: "#fffaf3", accent: "#f6b9cf" } },
        { id: "bird1", icon: "bird", x: 470, y: 360, scale: 1.05, rotate: 6, colors: { body: "#a9795a", accent: "#e8a23a" } },
        { id: "balloon1", icon: "heart", x: 75, y: 280, scale: 0.85, rotate: 8, colors: { body: "#ff8fae", accent: "#ffd2de" } }
      ]
    },
    {
      title: "2판. 분홍빛 오솔길",
      objects: [
        { id: "butterfly1", icon: "butterfly", x: 270, y: 700, scale: 0.9, rotate: -4, colors: { body: "#ffb0d6", accent: "#ff86b8" } },
        { id: "cat1", icon: "cat", x: 430, y: 810, scale: 1.0, rotate: 4, colors: { body: "#7a5c46", accent: "#f6dcc0" } },
        { id: "acorn1", icon: "acorn", x: 145, y: 880, scale: 1.05, rotate: 0, colors: { body: "#8a5a3a", accent: "#5c3c22" } }
      ]
    },
    {
      title: "3판. 노을 지는 벚꽃길",
      objects: [
        { id: "squirrel1", icon: "squirrel", x: 55, y: 360, scale: 0.85, rotate: -10, colors: { body: "#a9714a", accent: "#7a4d30" } },
        { id: "mushroom1", icon: "mushroom", x: 400, y: 850, scale: 0.95, rotate: 0, colors: { body: "#e85b4f", accent: "#fff0e0" } },
        { id: "star1", icon: "star", x: 270, y: 100, scale: 0.9, rotate: 12, colors: { body: "#ffe28a", accent: "#fff6cf" } }
      ]
    },
    {
      title: "4판. 저녁 벚꽃길",
      objects: [
        { id: "bunny2", icon: "bunny", x: 470, y: 870, scale: 1.0, rotate: 10, colors: { body: "#e9d8ec", accent: "#c99fd6" } },
        { id: "bird2", icon: "bird", x: 65, y: 330, scale: 0.95, rotate: -8, colors: { body: "#6f5a8a", accent: "#f2c26a" } },
        { id: "kite1", icon: "kite", x: 450, y: 100, scale: 0.85, rotate: -18, colors: { body: "#ffd35e", accent: "#ff8f6b" } }
      ]
    },
    {
      title: "5판. 벚꽃 축제의 밤",
      objects: [
        { id: "cat2", icon: "cat", x: 80, y: 810, scale: 1.0, rotate: -4, colors: { body: "#3a3040", accent: "#f0d8e8" } },
        { id: "butterfly2", icon: "butterfly", x: 400, y: 760, scale: 0.9, rotate: 6, colors: { body: "#ffd6f0", accent: "#ff9fdc" } },
        { id: "heart2", icon: "heart", x: 270, y: 740, scale: 0.9, rotate: -6, colors: { body: "#ff7fb0", accent: "#ffd2e6" } },
        { id: "star2", icon: "star", x: 310, y: 90, scale: 0.85, rotate: -10, colors: { body: "#fff2b0", accent: "#ffffff" } }
      ]
    }
  ];

  /* =========================================================
     게임 상태
     ========================================================= */
  const state = {
    levelIndex: 0,
    found: new Set(),
    hintsLeft: 3,
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
    levelTitle: document.getElementById("level-title"),
    foundCounter: document.getElementById("found-counter"),
    scene: document.getElementById("scene"),
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

  /* ---------- 배경 그리기 ---------- */
  function buildTree(spot, palette) {
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
    BLOSSOM_OFFSETS.forEach((o, i) => {
      const color = palette.blossom[i % palette.blossom.length];
      g.appendChild(svgEl("circle", {
        cx: o.dx, cy: o.dy - 30, r: o.r, fill: color, opacity: "0.95"
      }));
    });
    return g;
  }

  function buildBush(spot, palette) {
    const g = svgEl("g", { transform: `translate(${spot.x} ${spot.y}) scale(${spot.scale})` });
    const offsets = [
      { dx: -20, dy: 0, r: 20 }, { dx: 0, dy: -8, r: 24 }, { dx: 20, dy: 0, r: 20 },
      { dx: -10, dy: 6, r: 16 }, { dx: 10, dy: 6, r: 16 }
    ];
    offsets.forEach((o, i) => {
      g.appendChild(svgEl("circle", {
        cx: o.dx, cy: o.dy, r: o.r, fill: palette.bush[i % palette.bush.length], opacity: "0.95"
      }));
    });
    return g;
  }

  function renderScene(levelIdx) {
    const palette = PALETTES[levelIdx];
    const scene = el.scene;
    scene.innerHTML = "";

    const defs = svgEl("defs", {});
    const skyGrad = svgEl("linearGradient", { id: "skyGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
    skyGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": palette.sky[0] }));
    skyGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": palette.sky[1] }));
    defs.appendChild(skyGrad);

    const groundGrad = svgEl("linearGradient", { id: "groundGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
    groundGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": palette.grass[0] }));
    groundGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": palette.grass[1] }));
    defs.appendChild(groundGrad);

    // 뷰박스 밖으로 배경 요소가 삐져나가지 않도록(레터박스 여백 노출 방지) 클립 처리
    const clipPath = svgEl("clipPath", { id: "sceneClip" });
    clipPath.appendChild(svgEl("rect", { x: 0, y: 0, width: VB_W, height: VB_H }));
    defs.appendChild(clipPath);
    scene.appendChild(defs);

    const layer = svgEl("g", { "clip-path": "url(#sceneClip)" });
    scene.appendChild(layer);

    // 하늘
    layer.appendChild(svgEl("rect", { x: 0, y: 0, width: VB_W, height: VB_H, fill: "url(#skyGrad)" }));

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
    layer.appendChild(svgEl("rect", { x: 0, y: HORIZON_Y, width: VB_W, height: VB_H - HORIZON_Y, fill: "url(#groundGrad)" }));

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
      LANTERN_SPOTS.forEach((spot) => {
        const lantern = svgEl("g", {});
        lantern.appendChild(svgEl("line", { x1: spot.x, y1: spot.y - 40, x2: spot.x, y2: spot.y, stroke: "#8a7060", "stroke-width": "1.5" }));
        lantern.appendChild(svgEl("ellipse", { cx: spot.x, cy: spot.y + 10, rx: 10, ry: 13, fill: "#ffd98a" }));
        lantern.appendChild(svgEl("ellipse", { cx: spot.x, cy: spot.y + 10, rx: 14, ry: 18, fill: "#ffe9b0", opacity: "0.35" }));
        layer.appendChild(lantern);
      });
    }

    // 수풀 (먼저 - 배경)
    BUSH_SPOTS.forEach((spot) => layer.appendChild(buildBush(spot, palette)));

    // 나무
    TREE_SPOTS.forEach((spot) => layer.appendChild(buildTree(spot, palette)));

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

    // 숨은 그림들 (맨 위, 주변과 어우러지도록 배치)
    const level = LEVELS[levelIdx];
    level.objects.forEach((obj) => {
      const g = svgEl("g", {
        class: "hidden-obj",
        id: `obj-${obj.id}`,
        transform: `translate(${obj.x} ${obj.y}) rotate(${obj.rotate}) scale(${obj.scale})`,
        "data-id": obj.id
      });
      g.innerHTML = iconMarkup(obj.icon, obj.colors);
      layer.appendChild(g);
    });
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
    el.foundCounter.textContent = `0 / ${level.objects.length}`;
    renderDots();
    renderScene(idx);
    startPetals();
    showScreen("game");
    showToast("숨은 그림을 찾아보세요! 🔍");
  }

  /* ---------- 터치 좌표 변환 ---------- */
  function getSvgPoint(evt) {
    const rect = el.scene.getBoundingClientRect();
    const clientX = evt.clientX;
    const clientY = evt.clientY;

    // preserveAspectRatio="xMidYMid meet" 이므로 스케일/오프셋 계산
    const scale = Math.min(rect.width / VB_W, rect.height / VB_H);
    const offsetX = (rect.width - VB_W * scale) / 2;
    const offsetY = (rect.height - VB_H * scale) / 2;

    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;
    return { x, y };
  }

  const HIT_RADIUS = 42;

  function handleTap(evt) {
    if (state.busy) return;
    const pt = getSvgPoint(evt);
    const level = LEVELS[state.levelIndex];

    let hit = null;
    let bestDist = Infinity;
    level.objects.forEach((obj) => {
      if (state.found.has(obj.id)) return;
      const dx = pt.x - obj.x;
      const dy = pt.y - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= HIT_RADIUS && dist < bestDist) {
        bestDist = dist;
        hit = obj;
      }
    });

    if (hit) {
      markFound(hit, pt);
    } else {
      spawnMissRipple(pt);
    }
  }

  function markFound(obj, pt) {
    state.found.add(obj.id);
    const node = document.getElementById(`obj-${obj.id}`);
    if (node) {
      node.classList.add("found");
      const ring = svgEl("circle", {
        cx: obj.x, cy: obj.y, r: 6, fill: "none", stroke: "#ffe28a", "stroke-width": "3", opacity: "0.9"
      });
      ring.style.transition = "r 0.5s ease, opacity 0.5s ease";
      el.scene.appendChild(ring);
      requestAnimationFrame(() => {
        ring.setAttribute("r", "50");
        ring.style.opacity = "0";
      });
      setTimeout(() => ring.remove(), 550);
    }

    el.foundCounter.textContent = `${state.found.size} / ${LEVELS[state.levelIndex].objects.length}`;
    showToast("찾았다! ✨");

    if (state.found.size === LEVELS[state.levelIndex].objects.length) {
      state.busy = true;
      setTimeout(onLevelClear, 500);
    }
  }

  function spawnMissRipple(pt) {
    const ring = svgEl("circle", {
      cx: pt.x, cy: pt.y, r: 4, fill: "none", stroke: "#ffffff", "stroke-width": "2.5", opacity: "0.75"
    });
    ring.style.transition = "r 0.4s ease, opacity 0.4s ease";
    el.scene.appendChild(ring);
    requestAnimationFrame(() => {
      ring.setAttribute("r", "22");
      ring.style.opacity = "0";
    });
    setTimeout(() => ring.remove(), 420);
  }

  /* ---------- 힌트 ---------- */
  function useHint() {
    if (state.hintsLeft <= 0 || state.busy) return;
    const level = LEVELS[state.levelIndex];
    const remaining = level.objects.filter((o) => !state.found.has(o.id));
    if (remaining.length === 0) return;

    state.hintsLeft -= 1;
    el.hintCount.textContent = state.hintsLeft;
    if (state.hintsLeft <= 0) el.btnHint.disabled = true;

    remaining.forEach((obj) => {
      const ring = svgEl("circle", {
        cx: obj.x, cy: obj.y, r: 34, fill: "none", stroke: "#ffe28a", "stroke-width": "3",
        "stroke-dasharray": "6 6", opacity: "0"
      });
      ring.style.transition = "opacity 0.3s ease";
      el.scene.appendChild(ring);
      requestAnimationFrame(() => { ring.style.opacity = "1"; });
      setTimeout(() => { ring.style.opacity = "0"; }, 1500);
      setTimeout(() => ring.remove(), 1900);
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

  function restartGame() {
    state.hintsLeft = 3;
    state.totalElapsed = 0;
    el.hintCount.textContent = state.hintsLeft;
    el.btnHint.disabled = false;
    startLevel(0);
  }

  /* ---------- 이벤트 바인딩 ---------- */
  el.btnStart.addEventListener("click", () => startLevel(0));
  el.btnNext.addEventListener("click", onNextPressed);
  el.btnRestart.addEventListener("click", restartGame);
  el.btnHint.addEventListener("click", useHint);
  el.scene.addEventListener("pointerdown", handleTap);

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
