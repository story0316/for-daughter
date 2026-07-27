/*
 * 캐릭터 초상화 SVG 생성기 (순수 로직 + 마크업, DOM 조작 없음)
 * 이모지 대신 품위 단계(outfit tier)별로 직접 그린 SVG 일러스트를 반환한다.
 * tier: 0=평범한 옷, 1=단정한 옷, 2=예쁜 드레스, 3=공주 드레스
 */
(function (root) {
  'use strict';

  const TIER_THEMES = [
    {
      // 0: 평범한 옷
      hair: ['#8b6b4a', '#6e5238'],
      skin: ['#ffe3c4', '#ffd2a6'],
      dress: ['#8fb3c9', '#6f97ad'],
      collar: '#eef3f5',
      accessory: 'none',
      dressRuffle: false,
      sparkle: false,
    },
    {
      // 1: 단정한 옷
      hair: ['#8b6b4a', '#6e5238'],
      skin: ['#ffe3c4', '#ffd2a6'],
      dress: ['#b79bdb', '#9678c4'],
      collar: '#ffffff',
      accessory: 'bow',
      accessoryColor: '#ff8fb3',
      dressRuffle: false,
      sparkle: false,
    },
    {
      // 2: 예쁜 드레스
      hair: ['#9c6b47', '#7a4f2f'],
      skin: ['#ffe6c9', '#ffd6ac'],
      dress: ['#ff9ec4', '#ff6fa0'],
      collar: '#fff0f6',
      accessory: 'flower',
      accessoryColor: '#ffd873',
      dressRuffle: true,
      sparkle: false,
    },
    {
      // 3: 공주 드레스
      hair: ['#a9773f', '#835a2c'],
      skin: ['#ffe9cf', '#ffdab2'],
      dress: ['#fff3d6', '#ffd873'],
      collar: '#fffaf0',
      accessory: 'tiara',
      accessoryColor: '#ffd873',
      dressRuffle: true,
      sparkle: true,
    },
  ];

  function buildAccessory(theme, uid) {
    if (theme.accessory === 'bow') {
      return `
        <g transform="translate(146,58) rotate(18)">
          <path d="M0,0 L-16,-10 L-16,10 Z" fill="${theme.accessoryColor}" />
          <path d="M0,0 L16,-10 L16,10 Z" fill="${theme.accessoryColor}" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" opacity="0.85" />
        </g>`;
    }
    if (theme.accessory === 'flower') {
      return `
        <g transform="translate(148,62)">
          <circle cx="-7" cy="-4" r="6" fill="${theme.accessoryColor}" />
          <circle cx="7" cy="-4" r="6" fill="${theme.accessoryColor}" />
          <circle cx="0" cy="4" r="6" fill="${theme.accessoryColor}" />
          <circle cx="-7" cy="9" r="6" fill="${theme.accessoryColor}" />
          <circle cx="7" cy="9" r="6" fill="${theme.accessoryColor}" />
          <circle cx="0" cy="2.5" r="5" fill="#fff6d8" />
        </g>`;
    }
    if (theme.accessory === 'tiara') {
      return `
        <g>
          <path d="M62,52 Q100,10 138,52 L128,58 Q100,28 72,58 Z" fill="url(#gold-${uid})" stroke="#c98a1f" stroke-width="1.5" />
          <circle cx="100" cy="30" r="7" fill="#ff9ec4" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="80" cy="42" r="4" fill="#8fd4ff" />
          <circle cx="120" cy="42" r="4" fill="#8fd4ff" />
        </g>`;
    }
    return '';
  }

  function buildSparkles(uid) {
    const stars = [
      { x: 26, y: 46, s: 9 },
      { x: 176, y: 40, s: 7 },
      { x: 20, y: 150, s: 6 },
      { x: 180, y: 140, s: 8 },
      { x: 30, y: 100, s: 5 },
    ];
    return stars
      .map(
        (st) => `
      <path transform="translate(${st.x},${st.y}) scale(${st.s / 10})"
        d="M0,-10 L2.2,-2.2 L10,0 L2.2,2.2 L0,10 L-2.2,2.2 L-10,0 L-2.2,-2.2 Z"
        fill="url(#sparkle-${uid})" opacity="0.9" />`
      )
      .join('');
  }

  function buildPortraitSVG(tier, options) {
    const theme = TIER_THEMES[Math.max(0, Math.min(3, tier))];
    const uid = (options && options.uid) || `t${tier}`;

    return `
<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="캐릭터 초상화">
  <defs>
    <linearGradient id="skin-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.skin[0]}" />
      <stop offset="100%" stop-color="${theme.skin[1]}" />
    </linearGradient>
    <linearGradient id="hair-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.hair[0]}" />
      <stop offset="100%" stop-color="${theme.hair[1]}" />
    </linearGradient>
    <linearGradient id="dress-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.dress[0]}" />
      <stop offset="100%" stop-color="${theme.dress[1]}" />
    </linearGradient>
    <linearGradient id="gold-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff3c4" />
      <stop offset="50%" stop-color="#ffd873" />
      <stop offset="100%" stop-color="#e0a834" />
    </linearGradient>
    <radialGradient id="sparkle-${uid}">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#ffd873" />
    </radialGradient>
  </defs>

  ${theme.sparkle ? buildSparkles(uid) : ''}

  <!-- 뒷머리 -->
  <path d="M38,95 Q34,25 100,22 Q166,25 162,95 L162,175 Q100,198 38,175 Z" fill="url(#hair-${uid})" />

  <!-- 드레스/어깨 -->
  <path d="M42,150 Q100,132 158,150 L172,214 Q100,232 28,214 Z" fill="url(#dress-${uid})" />
  ${theme.dressRuffle ? `<path d="M42,150 Q100,140 158,150 L163,168 Q100,156 37,168 Z" fill="#ffffff" opacity="0.35" />` : ''}
  <path d="M78,152 Q100,164 122,152 L122,138 Q100,148 78,138 Z" fill="${theme.collar}" />

  <!-- 목 -->
  <rect x="88" y="118" width="24" height="26" rx="10" fill="url(#skin-${uid})" />

  <!-- 얼굴 -->
  <circle cx="100" cy="92" r="54" fill="url(#skin-${uid})" />

  <!-- 볼터치 -->
  <ellipse cx="72" cy="102" rx="9" ry="6" fill="#ff9ec4" opacity="0.45" />
  <ellipse cx="128" cy="102" rx="9" ry="6" fill="#ff9ec4" opacity="0.45" />

  <!-- 옆머리 -->
  <path d="M46,60 Q28,110 40,178 Q52,172 56,140 Q56,90 66,62 Z" fill="url(#hair-${uid})" />
  <path d="M154,60 Q172,110 160,178 Q148,172 144,140 Q144,90 134,62 Z" fill="url(#hair-${uid})" />

  <!-- 앞머리 -->
  <path d="M44,80 Q48,28 100,26 Q152,28 156,80 Q142,54 122,52 Q110,50 100,54 Q90,50 78,52 Q58,54 44,80 Z" fill="url(#hair-${uid})" />

  <!-- 눈썹 -->
  <path d="M72,80 Q80,75 89,79" stroke="${theme.hair[1]}" stroke-width="2.5" fill="none" stroke-linecap="round" />
  <path d="M111,79 Q120,75 128,80" stroke="${theme.hair[1]}" stroke-width="2.5" fill="none" stroke-linecap="round" />

  <!-- 눈 -->
  <g>
    <path d="M69,91 Q80,81 91,91 Q80,101 69,91 Z" fill="#ffffff" />
    <circle cx="80" cy="91.5" r="6.4" fill="#7a5330" />
    <circle cx="80" cy="91.5" r="3.1" fill="#26170c" />
    <circle cx="82.4" cy="88.5" r="2" fill="#ffffff" />
    <circle cx="77.5" cy="94" r="1" fill="#ffffff" opacity="0.85" />
    <path d="M69,91 Q80,80.5 91,91" stroke="#3a2a20" stroke-width="1.6" fill="none" stroke-linecap="round" />
  </g>
  <g>
    <path d="M109,91 Q120,81 131,91 Q120,101 109,91 Z" fill="#ffffff" />
    <circle cx="120" cy="91.5" r="6.4" fill="#7a5330" />
    <circle cx="120" cy="91.5" r="3.1" fill="#26170c" />
    <circle cx="122.4" cy="88.5" r="2" fill="#ffffff" />
    <circle cx="117.5" cy="94" r="1" fill="#ffffff" opacity="0.85" />
    <path d="M109,91 Q120,80.5 131,91" stroke="#3a2a20" stroke-width="1.6" fill="none" stroke-linecap="round" />
  </g>

  <!-- 입 -->
  <path d="M91,113 Q100,119 109,113" stroke="#c96a6a" stroke-width="2.6" fill="none" stroke-linecap="round" />

  ${buildAccessory(theme, uid)}
</svg>`;
  }

  const api = { buildPortraitSVG, TIER_THEMES };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessPortrait = api;
  }
})(typeof window !== 'undefined' ? window : null);
