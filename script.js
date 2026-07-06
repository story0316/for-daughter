(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VB_W = 540;
  const VB_H = 960;
  const MAIN_VB = { x: 0, y: 0, w: VB_W, h: VB_H };
  const DIFF_VB = { x: 0, y: 0, w: 540, h: 520 };
  const ROUND_COUNT = 5;

  /* ---------- 색상 유틸 (카무플라주 + 무작위 색 생성 + 색조 회전) ---------- */
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    const clamp255 = (v) => Math.round(Math.max(0, Math.min(255, v)));
    return "#" + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("");
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

  function randomBrightColor() {
    const hue = Math.floor(Math.random() * 360);
    return hslToHex(hue, 55 + Math.random() * 25, 68 + Math.random() * 15);
  }

  /* =========================================================
     [카멜레온 모드] 밤하늘 별 찾기
     하늘에 반짝이는 작은 별을 잔뜩 뿌리고, 그중 5개만 모양이 다른
     "특별한 별"로 만들어 찾게 한다.
     ========================================================= */
  const NIGHT_PALETTES = [
    { title: "1판. 초저녁 밤하늘", sky: ["#22315c", "#374a82"], starColor: "#fff6d8", moon: { x: 430, y: 130, r: 42, color: "#fff7dd" } },
    { title: "2판. 깊은 밤하늘", sky: ["#141a3f", "#242f68" ], starColor: "#eaf0ff", moon: { x: 110, y: 110, r: 34, color: "#eef0ff" } },
    { title: "3판. 은하수 밤하늘", sky: ["#170f34", "#2c1f58"], starColor: "#ffeaff", moon: { x: 270, y: 90, r: 28, color: "#ffe9c4" }, milkyWay: true },
    { title: "4판. 보름달 밤하늘", sky: ["#0e1640", "#1e2e66"], starColor: "#fff2d0", moon: { x: 270, y: 150, r: 62, color: "#fff9e8" } },
    { title: "5판. 별똥별 쏟아지는 밤", sky: ["#0a0a26", "#1c1546"], starColor: "#ffffff", moon: { x: 450, y: 150, r: 26, color: "#ffe0f0" }, meteor: true }
  ];

  // 배경에 흩뿌리는 "평범한" 별 모양 (전부 같은 4방향 반짝임 모양)
  function normalStarPath(r) {
    return `M0 ${-r} Q ${r * 0.18} ${-r * 0.18} ${r} 0 Q ${r * 0.18} ${r * 0.18} 0 ${r} Q ${-r * 0.18} ${r * 0.18} ${-r} 0 Q ${-r * 0.18} ${-r * 0.18} 0 ${-r} Z`;
  }

  function drawNormalStars(layer, count, color) {
    for (let i = 0; i < count; i++) {
      const x = 20 + Math.random() * (VB_W - 40);
      const y = 20 + Math.random() * (VB_H - 40);
      const r = 1.6 + Math.random() * 2.6;
      const opacity = (0.35 + Math.random() * 0.65).toFixed(2);
      layer.appendChild(svgEl("path", { d: normalStarPath(r), transform: `translate(${x} ${y})`, fill: color, opacity }));
    }
  }

  // 특별한(모양이 다른) 별 후보 도형들 - 전부 원점(0,0) 기준
  const SPECIAL_STAR_SHAPES = {
    sparkle6: (c) => {
      let s = "";
      for (let i = 0; i < 3; i++) {
        s += `<path d="${normalStarPath(13)}" fill="${c.body}" transform="rotate(${i * 60})"/>`;
      }
      return s;
    },
    starOutline: (c) => `<path d="M0 -12 L3.5 -3.7 L12.5 -3.3 L5.5 2.2 L7.8 11 L0 5.8 L-7.8 11 L-5.5 2.2 L-12.5 -3.3 L-3.5 -3.7 Z" fill="${c.body}"/>`,
    heartTwinkle: (c) => `<path d="M0 9 C -11 0 -10 -8 -3 -8 C 0 -8 0 -6 0 -6 C 0 -6 0 -8 3 -8 C 10 -8 11 0 0 9 Z" fill="${c.body}"/>`,
    ringTwinkle: (c) => `<circle cx="0" cy="0" r="9" fill="none" stroke="${c.body}" stroke-width="3"/><circle cx="0" cy="0" r="3" fill="${c.body}"/>`,
    crossTwinkle: (c) => `<rect x="-2.2" y="-12" width="4.4" height="24" rx="2" fill="${c.body}"/><rect x="-12" y="-2.2" width="24" height="4.4" rx="2" fill="${c.body}"/>`,
    diamondTwinkle: (c) => `<rect x="-8" y="-8" width="16" height="16" rx="3" fill="${c.body}" transform="rotate(45)"/>`
  };
  const SPECIAL_SHAPE_NAMES = Object.keys(SPECIAL_STAR_SHAPES);

  // 특별한 별 주변에 붙이는 "미끼" 평범한 별 (난이도가 높을수록 더 촘촘하게)
  const NIGHT_CLUTTER_OFFSETS = [
    { dx: -16, dy: -10 }, { dx: 15, dy: 9 }, { dx: -8, dy: 14 }
  ];

  function generateNightTargets() {
    const shapes = shuffleArray(SPECIAL_SHAPE_NAMES.slice()).slice(0, 5);
    return shapes.map((shape, i) => ({
      id: `s${i}`,
      x: 45 + Math.random() * (VB_W - 90),
      y: 95 + Math.random() * (VB_H - 150),
      rotate: Math.round(Math.random() * 360),
      shape,
      color: randomBrightColor()
    }));
  }

  function renderNightScene(levelIdx) {
    const palette = NIGHT_PALETTES[levelIdx];
    const diff = currentDifficulty();
    const scene = el.scene;
    scene.innerHTML = "";

    const defs = svgEl("defs", {});
    const skyGrad = svgEl("linearGradient", { id: "night-sky", x1: "0", y1: "0", x2: "0", y2: "1" });
    skyGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": palette.sky[0] }));
    skyGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": palette.sky[1] }));
    defs.appendChild(skyGrad);
    const clipPath = svgEl("clipPath", { id: "night-clip" });
    clipPath.appendChild(svgEl("rect", { x: 0, y: 0, width: VB_W, height: VB_H }));
    defs.appendChild(clipPath);
    scene.appendChild(defs);

    const layer = svgEl("g", { "clip-path": "url(#night-clip)" });
    scene.appendChild(layer);

    layer.appendChild(svgEl("rect", { x: 0, y: 0, width: VB_W, height: VB_H, fill: "url(#night-sky)" }));

    if (palette.milkyWay) {
      const band = svgEl("g", { transform: `rotate(-18 ${VB_W / 2} ${VB_H / 2})`, opacity: "0.28" });
      for (let i = 0; i < 5; i++) {
        band.appendChild(svgEl("ellipse", { cx: VB_W / 2, cy: (i - 2) * 90 + VB_H / 2, rx: 480, ry: 60, fill: "#e7d9ff" }));
      }
      layer.appendChild(band);
    }

    // 달
    const moon = palette.moon;
    layer.appendChild(svgEl("circle", { cx: moon.x, cy: moon.y, r: moon.r, fill: moon.color, opacity: "0.95" }));
    layer.appendChild(svgEl("circle", { cx: moon.x + moon.r * 0.4, cy: moon.y - moon.r * 0.3, r: moon.r * 0.85, fill: palette.sky[0], opacity: "0.9" }));

    if (palette.meteor) {
      for (let i = 0; i < 3; i++) {
        const mx = 60 + i * 160 + Math.random() * 40;
        const my = 60 + i * 40;
        layer.appendChild(svgEl("line", {
          x1: mx, y1: my, x2: mx + 70, y2: my + 130, stroke: "#fff", "stroke-width": "2.2", opacity: "0.7", "stroke-linecap": "round"
        }));
      }
    }

    // 배경에 잔뜩 뿌려지는 평범한 별들
    drawNormalStars(layer, diff.starCount, palette.starColor);

    // 특별한(모양이 다른) 별 5개
    state.currentTargets = generateNightTargets();
    state.currentTargets.forEach((obj) => {
      const objScale = diff.scaleMult;
      const camo = { body: mixHex(obj.color, palette.starColor, diff.blendT) };
      const g = svgEl("g", {
        class: "hidden-obj",
        id: `obj-${obj.id}`,
        transform: `translate(${obj.x} ${obj.y}) rotate(${obj.rotate}) scale(${objScale})`,
        opacity: diff.opacity,
        "data-id": obj.id
      });
      g.innerHTML = SPECIAL_STAR_SHAPES[obj.shape](camo);
      layer.appendChild(g);

      // 난이도가 높을수록 특별한 별 주변에 평범한 별을 더 촘촘히 붙여서 위장한다
      NIGHT_CLUTTER_OFFSETS.slice(0, diff.occluders).forEach((o) => {
        const r = 2.2 + Math.random() * 1.6;
        layer.appendChild(svgEl("path", {
          d: normalStarPath(r),
          transform: `translate(${obj.x + o.dx} ${obj.y + o.dy})`,
          fill: palette.starColor,
          opacity: "0.85"
        }));
      });
    });
  }

  /* =========================================================
     [틀린그림찾기 모드] 시원한 여름 분수 광장
     같은 분수 광장을 두 번 그리고, 나무/수풀/구름/분수 물줄기 중
     일부를 살짝 바꿔서 다른 그림을 찾게 한다.
     ========================================================= */
  const SUMMER_PALETTES = [
    { title: "1판. 맑은 여름 아침", sky: ["#bfe8ff", "#eaf8ff"], grass: ["#8fd97a", "#6fc766"], water: ["#8fe0e6", "#48b8c8"],
      leaf: ["#6fcb6a", "#57b559"], bush: ["#7ad06e", "#5cb85f"], cloud: "#ffffff", sun: "#ffe27a", night: false },
    { title: "2판. 분수광장의 오후", sky: ["#8fd0ff", "#c9ecff"], grass: ["#7fce68", "#5fb85a"], water: ["#7fd8e2", "#3aa8ba"],
      leaf: ["#5fbf62", "#48a850"], bush: ["#6bc466", "#4fae52"], cloud: "#ffffff", sun: "#ffdb6b", night: false },
    { title: "3판. 한여름 뭉게구름", sky: ["#5fb6f2", "#a6dcff"], grass: ["#74c563", "#57ab52"], water: ["#6fd0da", "#2f96ac"],
      leaf: ["#52ab58", "#3c8f46"], bush: ["#5fb85e", "#469f4c"], cloud: "#ffffff", sun: "#ffd257", night: false },
    { title: "4판. 노을 지는 분수광장", sky: ["#ff9d6c", "#ffd28a"], grass: ["#8bb85a", "#6fa04e"], water: ["#7fc4cc", "#3690a0"],
      leaf: ["#7a9c4e", "#628843"], bush: ["#7fac54", "#649648"], cloud: "#ffe3c2", sun: "#ff8f5e", night: false },
    { title: "5판. 여름밤 분수 축제", sky: ["#0d1a3a", "#1e2f5c"], grass: ["#264a30", "#1c3a26"], water: ["#5bc0da", "#2680a0"],
      leaf: ["#2f5c3a", "#254a30"], bush: ["#33613e", "#274e32"], cloud: "#3a4a6a", sun: null, moon: "#fff3d0", night: true }
  ];

  const SUMMER_TREE_SPOTS = [
    { x: 55, y: 330, scale: 0.85 }, { x: 485, y: 330, scale: 0.85 },
    { x: 32, y: 450, scale: 1.05 }, { x: 508, y: 450, scale: 1.05 }
  ];
  const SUMMER_BUSH_SPOTS = [
    { x: 150, y: 490, scale: 0.8 }, { x: 390, y: 490, scale: 0.8 }
  ];
  const CLOUD_SPOTS = [
    { x: 110, y: 60, scale: 0.9 }, { x: 340, y: 45, scale: 0.75 }, { x: 230, y: 95, scale: 0.6 }
  ];
  const FOUNTAIN = { x: 270, y: 400 };
  const FOUNTAIN_JETS = [
    { dx: -40, baseHeight: 70 },
    { dx: 0, baseHeight: 95 },
    { dx: 40, baseHeight: 70 }
  ];
  const BASE_DIFF_COUNTS = [3, 3, 3, 3, 4];

  function buildSummerTree(spot, palette, opts) {
    opts = opts || {};
    const g = svgEl("g", { transform: `translate(${spot.x} ${spot.y}) scale(${spot.scale})` });
    g.appendChild(svgEl("path", { d: "M -5 34 Q -7 0 -2 -22 Q 0 -25 2 -22 Q 7 0 5 34 Z", fill: "#8a6a48" }));
    if (!opts.bald) {
      let leaf = palette.leaf;
      if (opts.recolorDeg) leaf = leaf.map((c) => rotateHue(c, opts.recolorDeg));
      g.appendChild(svgEl("circle", { cx: 0, cy: -46, r: 30, fill: leaf[0] }));
      g.appendChild(svgEl("circle", { cx: -16, cy: -32, r: 20, fill: leaf[1 % leaf.length] }));
      g.appendChild(svgEl("circle", { cx: 16, cy: -32, r: 20, fill: leaf[1 % leaf.length] }));
    }
    return g;
  }

  function buildSummerBush(spot, palette, opts) {
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
      g.appendChild(svgEl("circle", { cx: o.dx, cy: o.dy, r: o.r, fill: colors[i % colors.length] }));
    });
    return g;
  }

  function buildCloud(spot, color) {
    const g = svgEl("g", { transform: `translate(${spot.x} ${spot.y}) scale(${spot.scale})`, opacity: "0.92" });
    g.appendChild(svgEl("ellipse", { cx: -18, cy: 4, rx: 20, ry: 14, fill: color }));
    g.appendChild(svgEl("ellipse", { cx: 10, cy: 0, rx: 26, ry: 17, fill: color }));
    g.appendChild(svgEl("ellipse", { cx: 32, cy: 6, rx: 16, ry: 11, fill: color }));
    return g;
  }

  function buildFountain(waterGradId, jetMutation) {
    const g = svgEl("g", { transform: `translate(${FOUNTAIN.x} ${FOUNTAIN.y})` });
    g.appendChild(svgEl("ellipse", { cx: 0, cy: 40, rx: 100, ry: 24, fill: "#d8d2c4" }));
    g.appendChild(svgEl("ellipse", { cx: 0, cy: 38, rx: 88, ry: 20, fill: `url(#${waterGradId})` }));
    g.appendChild(svgEl("path", { d: "M -14 0 L 14 0 L 9 40 L -9 40 Z", fill: "#cfc9bb" }));

    FOUNTAIN_JETS.forEach((jet, idx) => {
      const factor = (jetMutation && jetMutation[idx] != null) ? jetMutation[idx] : 1;
      const h = jet.baseHeight * factor;
      const peakX = jet.dx * 0.7;
      const peakY = -h;
      g.appendChild(svgEl("path", {
        d: `M ${jet.dx * 0.25} 0 Q ${peakX} ${peakY * 0.6} ${peakX} ${peakY}`,
        stroke: "#eafcff", "stroke-width": "5", fill: "none", "stroke-linecap": "round", opacity: "0.9"
      }));
      g.appendChild(svgEl("circle", { cx: peakX, cy: peakY, r: 5, fill: "#eafcff", opacity: "0.95" }));
      g.appendChild(svgEl("circle", { cx: peakX + 6, cy: peakY + 8, r: 2.6, fill: "#eafcff", opacity: "0.8" }));
      g.appendChild(svgEl("circle", { cx: peakX - 7, cy: peakY + 12, r: 2.2, fill: "#eafcff", opacity: "0.7" }));
    });
    return g;
  }

  function drawSummerBackground(svgElement, palette, mutations, idPrefix) {
    mutations = mutations || {};
    svgElement.innerHTML = "";

    const defs = svgEl("defs", {});
    const skyGrad = svgEl("linearGradient", { id: `${idPrefix}-sky`, x1: "0", y1: "0", x2: "0", y2: "1" });
    skyGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": palette.sky[0] }));
    skyGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": palette.sky[1] }));
    defs.appendChild(skyGrad);
    const grassGrad = svgEl("linearGradient", { id: `${idPrefix}-grass`, x1: "0", y1: "0", x2: "0", y2: "1" });
    grassGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": palette.grass[0] }));
    grassGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": palette.grass[1] }));
    defs.appendChild(grassGrad);
    const waterGrad = svgEl("linearGradient", { id: `${idPrefix}-water`, x1: "0", y1: "0", x2: "0", y2: "1" });
    waterGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": palette.water[0] }));
    waterGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": palette.water[1] }));
    defs.appendChild(waterGrad);
    const clipPath = svgEl("clipPath", { id: `${idPrefix}-clip` });
    clipPath.appendChild(svgEl("rect", { x: 0, y: 0, width: DIFF_VB.w, height: DIFF_VB.h }));
    defs.appendChild(clipPath);
    svgElement.appendChild(defs);

    const layer = svgEl("g", { "clip-path": `url(#${idPrefix}-clip)` });
    svgElement.appendChild(layer);

    layer.appendChild(svgEl("rect", { x: 0, y: 0, width: DIFF_VB.w, height: 220, fill: `url(#${idPrefix}-sky)` }));

    if (palette.night) {
      drawNormalStars(layer, 60, "#fff");
      layer.appendChild(svgEl("circle", { cx: 460, cy: 60, r: 26, fill: palette.moon }));
    } else {
      layer.appendChild(svgEl("circle", { cx: 470, cy: 55, r: 34, fill: palette.sun, opacity: "0.95" }));
      layer.appendChild(svgEl("circle", { cx: 470, cy: 55, r: 48, fill: palette.sun, opacity: "0.25" }));
    }

    CLOUD_SPOTS.forEach((spot, idx) => {
      if (mutations.cloudRemove && mutations.cloudRemove[idx]) return;
      layer.appendChild(buildCloud(spot, palette.cloud));
    });

    layer.appendChild(svgEl("rect", { x: 0, y: 190, width: DIFF_VB.w, height: DIFF_VB.h - 190, fill: `url(#${idPrefix}-grass)` }));
    layer.appendChild(svgEl("ellipse", { cx: 270, cy: 435, rx: 175, ry: 55, fill: palette.night ? "#3a4258" : "#e7e0c8", opacity: "0.9" }));

    SUMMER_TREE_SPOTS.forEach((spot, idx) => {
      const opts = {};
      if (mutations.treeRecolor && mutations.treeRecolor[idx] !== undefined) opts.recolorDeg = mutations.treeRecolor[idx];
      if (mutations.treeBald && mutations.treeBald[idx]) opts.bald = true;
      layer.appendChild(buildSummerTree(spot, palette, opts));
    });

    SUMMER_BUSH_SPOTS.forEach((spot, idx) => {
      const opts = {};
      if (mutations.bushRecolor && mutations.bushRecolor[idx] !== undefined) opts.recolorDeg = mutations.bushRecolor[idx];
      if (mutations.bushResize && mutations.bushResize[idx] !== undefined) opts.resizeFactor = mutations.bushResize[idx];
      layer.appendChild(buildSummerBush(spot, palette, opts));
    });

    layer.appendChild(buildFountain(`${idPrefix}-water`, mutations.fountainJet));

    return layer;
  }

  function pickSummerDifferences(diffTier, count) {
    const tNorm = diffTier.blendT / 0.68; // 0(쉬움, 뚜렷) ~ 1(어려움, 미묘)
    const hueShiftDeg = 110 - 75 * tNorm;
    const resizeBase = 1.7 - 0.55 * tNorm;
    const jetFactor = 0.32 + 0.38 * tNorm; // 쉬움일수록 물줄기가 훨씬 짧아짐

    const pool = [];
    SUMMER_TREE_SPOTS.forEach((spot, idx) => {
      const y = spot.y - 46 * spot.scale;
      pool.push({ type: "tree-recolor", idx, x: spot.x, y, r: 42 * spot.scale, hueShiftDeg });
      pool.push({ type: "tree-bald", idx, x: spot.x, y, r: 42 * spot.scale });
    });
    SUMMER_BUSH_SPOTS.forEach((spot, idx) => {
      pool.push({ type: "bush-recolor", idx, x: spot.x, y: spot.y - 8 * spot.scale, r: 40 * spot.scale, hueShiftDeg });
      pool.push({ type: "bush-resize", idx, x: spot.x, y: spot.y, r: 42 * spot.scale, resizeFactor: Math.random() < 0.5 ? resizeBase : 1 / resizeBase });
    });
    CLOUD_SPOTS.forEach((spot, idx) => {
      pool.push({ type: "cloud-remove", idx, x: spot.x + 10, y: spot.y, r: 34 * spot.scale });
    });
    FOUNTAIN_JETS.forEach((jet, idx) => {
      pool.push({ type: "fountain-jet", idx, x: FOUNTAIN.x + jet.dx * 0.7, y: FOUNTAIN.y - jet.baseHeight * 0.7, r: 32, factor: jetFactor });
    });

    shuffleArray(pool);
    const chosen = [];
    for (const cand of pool) {
      if (chosen.length >= count) break;
      const tooClose = chosen.some((c) => Math.hypot(c.x - cand.x, c.y - cand.y) < 70);
      const sameElement = chosen.some((c) => c.type.split("-")[0] === cand.type.split("-")[0] && c.idx === cand.idx);
      if (!tooClose && !sameElement) chosen.push(cand);
    }
    return chosen.map((c, i) => ({ id: `d${i}`, ...c }));
  }

  function renderSummerDiffScene(levelIdx) {
    const palette = SUMMER_PALETTES[levelIdx];
    const diffTier = currentDifficulty();
    const count = BASE_DIFF_COUNTS[levelIdx] + DIFF_COUNT_BONUS[state.difficulty - 1];
    const chosen = pickSummerDifferences(diffTier, count);
    state.currentTargets = chosen;

    const mutations = { treeRecolor: {}, treeBald: {}, bushRecolor: {}, bushResize: {}, cloudRemove: {}, fountainJet: {} };
    chosen.forEach((c) => {
      if (c.type === "tree-recolor") mutations.treeRecolor[c.idx] = c.hueShiftDeg;
      if (c.type === "tree-bald") mutations.treeBald[c.idx] = true;
      if (c.type === "bush-recolor") mutations.bushRecolor[c.idx] = c.hueShiftDeg;
      if (c.type === "bush-resize") mutations.bushResize[c.idx] = c.resizeFactor;
      if (c.type === "cloud-remove") mutations.cloudRemove[c.idx] = true;
      if (c.type === "fountain-jet") mutations.fountainJet[c.idx] = c.factor;
    });

    drawSummerBackground(el.sceneA, palette, {}, "sa");
    drawSummerBackground(el.sceneB, palette, mutations, "sb");
  }

  /* =========================================================
     난이도 설정 (1: 아주 쉬움 ~ 5: 매우 어려움)
     - hitRadius: (카멜레온) 정답으로 인정하는 터치 반경
     - scaleMult: (카멜레온) 특별한 별의 크기 배율
     - opacity: (카멜레온) 특별한 별의 불투명도
     - blendT: (공통) 색을 배경/평범한 별 색으로 섞는 비율, 틀린그림 차이의 반대비율
     - occluders: (카멜레온) 특별한 별 주변에 붙는 미끼 별 개수
     - starCount: (카멜레온) 배경에 뿌려지는 평범한 별의 개수 (많을수록 찾기 어려움)
     - hints: 게임 시작 시 주어지는 힌트 개수
     ========================================================= */
  const DIFFICULTY_LEVELS = [
    { id: 1, label: "아주 쉬움 · 색이 또렷하고 크게 보여요", hitRadius: 60, scaleMult: 1.35, opacity: 1.0, blendT: 0, occluders: 0, starCount: 90, hints: 5 },
    { id: 2, label: "쉬움 · 살짝 작아지고 색이 은은해져요", hitRadius: 50, scaleMult: 1.15, opacity: 0.97, blendT: 0.15, occluders: 0, starCount: 130, hints: 4 },
    { id: 3, label: "보통 · 배경과 색이 많이 비슷해져요", hitRadius: 40, scaleMult: 0.95, opacity: 0.92, blendT: 0.35, occluders: 1, starCount: 170, hints: 3 },
    { id: 4, label: "어려움 · 작고 다른 별들 사이에 숨어요", hitRadius: 30, scaleMult: 0.78, opacity: 0.88, blendT: 0.52, occluders: 2, starCount: 210, hints: 2 },
    { id: 5, label: "매우 어려움 · 윌리를 찾아라급! 완전히 숨었어요", hitRadius: 22, scaleMult: 0.62, opacity: 0.85, blendT: 0.68, occluders: 3, starCount: 250, hints: 1 }
  ];

  // 틀린그림찾기 모드에서 난이도별로 추가되는 차이 개수
  const DIFF_COUNT_BONUS = [0, 0, 1, 1, 2];

  const MODE_INFO = {
    chameleon: { label: "밤하늘에 반짝이는 별 중, 모양이 다른 5개를 찾아보세요 ✨", startToast: "모양이 다른 별을 찾아보세요! ✨" },
    diff: { label: "시원한 여름 분수 광장, 두 그림에서 다른 부분을 찾아보세요 🏞️", startToast: "다른 부분을 찾아보세요! 🔍" }
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

  /* ---------- 반짝이는 장식 파티클 (시작화면 + 게임 중 배경 연출) ---------- */
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
      p.style.width = p.style.height = 6 + Math.random() * 7 + "px";
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
    for (let i = 0; i < ROUND_COUNT; i++) {
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

    el.diffBadge.textContent = `Lv.${state.difficulty}`;
    renderDots();

    if (state.mode === "chameleon") {
      el.levelTitle.textContent = NIGHT_PALETTES[idx].title;
      el.scene.style.display = "";
      el.diffStage.style.display = "none";
      renderNightScene(idx);
    } else {
      el.levelTitle.textContent = SUMMER_PALETTES[idx].title;
      el.scene.style.display = "none";
      el.diffStage.style.display = "flex";
      renderSummerDiffScene(idx);
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

    const isLast = state.levelIndex === ROUND_COUNT - 1;
    el.levelClearTitle.textContent = `${state.levelIndex + 1}판 클리어! 🎊`;
    el.levelClearTime.textContent = `걸린 시간: ${elapsed}초`;
    el.btnNext.textContent = isLast ? "결과 보기" : "다음 판으로";
    showScreen("levelclear");
  }

  function onNextPressed() {
    const isLast = state.levelIndex === ROUND_COUNT - 1;
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

  // 시작화면 장식 반짝임
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
