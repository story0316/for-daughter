(function () {
  'use strict';

  var SAVE_KEY = 'chemical-lab-save-v3';

  var CATEGORY_COLOR = {
    nonmetal: '#7fa8e8',
    alkali: '#b98af0',
    halogen: '#5fd68a',
    'alkaline-earth': '#f0b25f'
  };

  // valence = "손(hand)" 개수. 몇 개의 다른 원자와 이어질 수 있는지를 나타낸다.
  var ELEMENTS = [
    { id: 'H', name: '수소', atomicNumber: 1, mass: 1.0, category: 'nonmetal', valence: 1, desc: '우주에서 가장 많고 가장 가벼운 원소예요. 손이 1개라 딱 하나랑만 손을 잡을 수 있어요.' },
    { id: 'C', name: '탄소', atomicNumber: 6, mass: 12.0, category: 'nonmetal', valence: 4, desc: '생명체를 이루는 기본 원소예요. 손이 4개라 여러 원자와 한꺼번에 손을 잡을 수 있어요.' },
    { id: 'N', name: '질소', atomicNumber: 7, mass: 14.0, category: 'nonmetal', valence: 3, desc: '공기의 78%를 차지해요. 손이 3개예요.' },
    { id: 'O', name: '산소', atomicNumber: 8, mass: 16.0, category: 'nonmetal', valence: 2, desc: '우리가 숨 쉬는 데 꼭 필요해요. 손이 2개예요.' },
    { id: 'Na', name: '나트륨', atomicNumber: 11, mass: 23.0, category: 'alkali', valence: 1, charge: 1, desc: '전자 하나를 잘 내줘서 항상 +1로 변해요. 물과 만나면 격렬하게 반응해요.' },
    { id: 'Mg', name: '마그네슘', atomicNumber: 12, mass: 24.3, category: 'alkaline-earth', valence: 2, charge: 2, desc: '전자 두 개를 내줘서 +2로 변해요. 불꽃놀이에서 밝은 빛을 내요.' },
    { id: 'Cl', name: '염소', atomicNumber: 17, mass: 35.5, category: 'halogen', valence: 1, charge: -1, desc: '전자 하나를 받아서 -1로 변해요. 소독약 냄새의 주인공이에요.' },
    { id: 'Ca', name: '칼슘', atomicNumber: 20, mass: 40.1, category: 'alkaline-earth', valence: 2, charge: 2, desc: '전자 두 개를 내줘서 +2로 변해요. 뼈와 이를 튼튼하게 만들어줘요.' }
  ];

  var HAZARDS = {
    flammable: { emoji: '🔥', label: '가연성' },
    toxic: { emoji: '☠️', label: '독성' },
    corrosive: { emoji: '🧪', label: '부식성' },
    environment: { emoji: '🌱', label: '환경 주의' }
  };

  // structure.atoms: 트리 형태. parent가 없으면 뿌리 원자.
  // bondType: single/double/triple(공유결합) 또는 ionic(이온결합, +/- 로 표시).
  var COMPOUNDS = [
    { id: 'H2', name: '수소 기체', formula: { H: 2 }, display: 'H₂', recipe: ['H', 'H'], desc: '가장 가벼운 기체예요. 로켓 연료로도 쓰여요.', thermalType: 'normal', meltingPoint: -259.2, boilingPoint: -252.9, hazards: ['flammable'],
      structure: { atoms: [{ sym: 'H' }, { sym: 'H', parent: 0, bondType: 'single' }] } },
    { id: 'O2', name: '산소 기체', formula: { O: 2 }, display: 'O₂', recipe: ['O', 'O'], desc: '우리가 숨 쉬는 공기 속 기체예요. 원자 두 개가 손을 두 번씩 맞잡아요(이중결합).', thermalType: 'normal', meltingPoint: -218.3, boilingPoint: -183.0, hazards: [],
      structure: { atoms: [{ sym: 'O' }, { sym: 'O', parent: 0, bondType: 'double' }] } },
    { id: 'H2O', name: '물', formula: { H: 2, O: 1 }, display: 'H₂O', recipe: ['H2', 'O'], desc: '생명에 꼭 필요한 액체예요. 산소의 손 2개가 수소 두 개와 각각 손을 잡아요.', thermalType: 'normal', meltingPoint: 0, boilingPoint: 100, hazards: [],
      structure: { atoms: [{ sym: 'O' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }] } },
    { id: 'NaCl', name: '소금', formula: { Na: 1, Cl: 1 }, display: 'NaCl', recipe: ['Na', 'Cl'], desc: '나트륨의 +1과 염소의 -1이 서로 끌어당겨 딱 붙어요. 음식에 넣어 먹는 짠맛의 정체예요.', thermalType: 'normal', meltingPoint: 801, boilingPoint: 1465, hazards: [],
      structure: { atoms: [{ sym: 'Na', charge: 1 }, { sym: 'Cl', parent: 0, bondType: 'ionic', charge: -1 }] } },
    { id: 'Cl2', name: '염소 기체', formula: { Cl: 2 }, display: 'Cl₂', recipe: ['Cl', 'Cl'], desc: '수영장 소독에 사용돼요.', thermalType: 'normal', meltingPoint: -101.5, boilingPoint: -34.0, hazards: ['toxic', 'environment'],
      structure: { atoms: [{ sym: 'Cl' }, { sym: 'Cl', parent: 0, bondType: 'single' }] } },
    { id: 'HCl', name: '염화수소', formula: { H: 1, Cl: 1 }, display: 'HCl', recipe: ['H', 'Cl'], desc: '물에 녹으면 위산의 주성분이 돼요.', thermalType: 'normal', meltingPoint: -114.2, boilingPoint: -85.1, hazards: ['corrosive'],
      structure: { atoms: [{ sym: 'Cl' }, { sym: 'H', parent: 0, bondType: 'single' }] } },
    { id: 'CO2', name: '이산화탄소', formula: { C: 1, O: 2 }, display: 'CO₂', recipe: ['C', 'O2'], desc: '우리가 숨을 내쉴 때 나오는 기체예요. 탄소의 손 4개가 산소 두 개와 이중결합씩 맺어요.', thermalType: 'sublimes', meltingPoint: -78.5, boilingPoint: -78.5, hazards: [],
      structure: { atoms: [{ sym: 'C' }, { sym: 'O', parent: 0, bondType: 'double' }, { sym: 'O', parent: 0, bondType: 'double' }] } },
    { id: 'NH2', name: '아미노기', formula: { N: 1, H: 2 }, display: 'NH₂', recipe: ['N', 'H2'], desc: '질소의 손 3개 중 2개만 쓴 상태라 손이 하나 남아 불안정해요. 암모니아가 되기 전 중간 조각이에요.', thermalType: 'unstable', meltingPoint: null, boilingPoint: null, hazards: [],
      structure: { atoms: [{ sym: 'N' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }] } },
    { id: 'NH3', name: '암모니아', formula: { N: 1, H: 3 }, display: 'NH₃', recipe: ['NH2', 'H'], desc: '질소의 손 3개가 수소 세 개와 모두 손을 잡아 안정돼요. 톡 쏘는 냄새가 나는 비료 재료예요.', thermalType: 'normal', meltingPoint: -77.7, boilingPoint: -33.3, hazards: ['corrosive', 'toxic'],
      structure: { atoms: [{ sym: 'N' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }] } },
    { id: 'CH2', name: '메틸렌', formula: { C: 1, H: 2 }, display: 'CH₂', recipe: ['C', 'H2'], desc: '탄소의 손 4개 중 2개만 써서 손이 2개 남은 불안정한 조각이에요.', thermalType: 'unstable', meltingPoint: null, boilingPoint: null, hazards: [],
      structure: { atoms: [{ sym: 'C' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }] } },
    { id: 'CH4', name: '메탄', formula: { C: 1, H: 4 }, display: 'CH₄', recipe: ['CH2', 'H2'], desc: '탄소의 손 4개가 수소 네 개와 모두 손을 잡아요. 천연가스의 주성분이에요.', thermalType: 'normal', meltingPoint: -182.5, boilingPoint: -161.5, hazards: ['flammable'],
      structure: { atoms: [{ sym: 'C' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }] } },
    { id: 'CaO', name: '산화칼슘', formula: { Ca: 1, O: 1 }, display: 'CaO', recipe: ['Ca', 'O'], desc: '칼슘의 +2와 산소의 -2가 서로 끌어당겨요. 생석회라고도 불러요.', thermalType: 'normal', meltingPoint: 2613, boilingPoint: 2850, hazards: ['corrosive'],
      structure: { atoms: [{ sym: 'Ca', charge: 2 }, { sym: 'O', parent: 0, bondType: 'ionic', charge: -2 }] } },
    { id: 'CaCl2', name: '염화칼슘', formula: { Ca: 1, Cl: 2 }, display: 'CaCl₂', recipe: ['Ca', 'Cl2'], desc: '칼슘의 +2를 염소 두 개의 -1씩이 나눠서 딱 맞춰요(+2 = -1 + -1). 겨울철 제설제로 사용돼요.', thermalType: 'normal', meltingPoint: 772, boilingPoint: 1935, hazards: [],
      structure: { atoms: [{ sym: 'Ca', charge: 2 }, { sym: 'Cl', parent: 0, bondType: 'ionic', charge: -1 }, { sym: 'Cl', parent: 0, bondType: 'ionic', charge: -1 }] } },
    { id: 'CaCO3', name: '탄산칼슘', formula: { Ca: 1, C: 1, O: 3 }, display: 'CaCO₃', recipe: ['CaO', 'CO2'], desc: '칼슘 이온과 탄산 이온(CO₃)이 짝을 이뤄요. 석회석과 조개껍데기의 주성분이에요.', thermalType: 'decomposes', meltingPoint: 1339, boilingPoint: null, hazards: [],
      structure: { atoms: [{ sym: 'Ca', charge: 2 }, { sym: 'O', parent: 0, bondType: 'ionic', charge: -2 }, { sym: 'C', parent: 1, bondType: 'single' }, { sym: 'O', parent: 2, bondType: 'double' }, { sym: 'O', parent: 2, bondType: 'single' }] } },
    { id: 'MgO', name: '산화마그네슘', formula: { Mg: 1, O: 1 }, display: 'MgO', recipe: ['Mg', 'O'], desc: '마그네슘의 +2와 산소의 -2가 서로 끌어당겨요. 제산제와 내화벽돌에 사용돼요.', thermalType: 'normal', meltingPoint: 2852, boilingPoint: 3600, hazards: [],
      structure: { atoms: [{ sym: 'Mg', charge: 2 }, { sym: 'O', parent: 0, bondType: 'ionic', charge: -2 }] } },
    { id: 'MgCl2', name: '염화마그네슘', formula: { Mg: 1, Cl: 2 }, display: 'MgCl₂', recipe: ['Mg', 'Cl2'], desc: '마그네슘의 +2를 염소 두 개의 -1씩이 나눠서 딱 맞춰요. 간수의 주성분이에요.', thermalType: 'normal', meltingPoint: 714, boilingPoint: 1412, hazards: [],
      structure: { atoms: [{ sym: 'Mg', charge: 2 }, { sym: 'Cl', parent: 0, bondType: 'ionic', charge: -1 }, { sym: 'Cl', parent: 0, bondType: 'ionic', charge: -1 }] } },
    { id: 'MgOH2', name: '수산화마그네슘', formula: { Mg: 1, O: 2, H: 2 }, display: 'Mg(OH)₂', recipe: ['MgO', 'H2O'], desc: '마그네슘의 +2를 수산화기(OH) 두 개의 -1씩이 나눠서 맞춰요. 제산제(마그밀)의 주성분이에요.', thermalType: 'decomposes', meltingPoint: 350, boilingPoint: null, hazards: [],
      structure: { atoms: [{ sym: 'Mg', charge: 2 }, { sym: 'O', parent: 0, bondType: 'ionic', charge: -1 }, { sym: 'H', parent: 1, bondType: 'single' }, { sym: 'O', parent: 0, bondType: 'ionic', charge: -1 }, { sym: 'H', parent: 3, bondType: 'single' }] } },
    { id: 'OH', name: '수산화기', formula: { O: 1, H: 1 }, display: 'OH', recipe: ['H', 'O'], desc: '산소가 전자 하나를 더 받아서 -1이 된 불안정한 조각이에요. 다양한 화합물을 만드는 재료가 돼요.', thermalType: 'unstable', meltingPoint: null, boilingPoint: null, hazards: [],
      structure: { atoms: [{ sym: 'O', charge: -1 }, { sym: 'H', parent: 0, bondType: 'single' }] } },
    { id: 'NaOH', name: '수산화나트륨', formula: { Na: 1, O: 1, H: 1 }, display: 'NaOH', recipe: ['Na', 'OH'], desc: '나트륨의 +1과 수산화기의 -1이 서로 끌어당겨요. 비누를 만들 때 사용되는 강한 염기예요.', thermalType: 'normal', meltingPoint: 318, boilingPoint: 1388, hazards: ['corrosive'],
      structure: { atoms: [{ sym: 'Na', charge: 1 }, { sym: 'O', parent: 0, bondType: 'ionic', charge: -1 }, { sym: 'H', parent: 1, bondType: 'single' }] } },
    { id: 'CH3COOH', name: '아세트산', formula: { C: 2, H: 4, O: 2 }, display: 'CH₃COOH', recipe: ['CH4', 'CO2'], desc: '탄소 두 개가 사슬처럼 이어진 화합물이에요. 식초의 신맛을 내는 성분이에요.', thermalType: 'normal', meltingPoint: 16.6, boilingPoint: 118.1, hazards: ['corrosive'],
      structure: { atoms: [{ sym: 'C' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'C', parent: 0, bondType: 'single' }, { sym: 'O', parent: 4, bondType: 'double' }, { sym: 'O', parent: 4, bondType: 'single' }, { sym: 'H', parent: 6, bondType: 'single' }] } },
    { id: 'C2H6', name: '에탄', formula: { C: 2, H: 6 }, display: 'C₂H₆', recipe: ['CH4', 'CH2'], desc: '탄소 두 개가 손을 맞잡고 나머지 손엔 수소가 붙어요. 천연가스에 섞여 있는 기체예요.', thermalType: 'normal', meltingPoint: -182.8, boilingPoint: -88.5, hazards: ['flammable'],
      structure: { atoms: [{ sym: 'C' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'H', parent: 0, bondType: 'single' }, { sym: 'C', parent: 0, bondType: 'single' }, { sym: 'H', parent: 4, bondType: 'single' }, { sym: 'H', parent: 4, bondType: 'single' }, { sym: 'H', parent: 4, bondType: 'single' }] } },
    { id: 'N2', name: '질소 기체', formula: { N: 2 }, display: 'N₂', recipe: ['N', 'N'], desc: '공기의 대부분을 차지하는 기체예요. 손 3개를 모두 걸어 삼중결합을 만들어요.', thermalType: 'normal', meltingPoint: -210.0, boilingPoint: -195.8, hazards: [],
      structure: { atoms: [{ sym: 'N' }, { sym: 'N', parent: 0, bondType: 'triple' }] } }
  ];

  var MILESTONES = [
    { id: 'm1', countRequired: 3, unlockElements: ['Na', 'Cl'], title: '짭짤한 발견', badgeEmoji: '🧂' },
    { id: 'm2', countRequired: 7, unlockElements: ['C', 'N'], title: '공기 속 비밀', badgeEmoji: '💨' },
    { id: 'm3', countRequired: 12, unlockElements: ['Ca'], title: '튼튼한 뼈의 재료', badgeEmoji: '🦴' },
    { id: 'm4', countRequired: 16, unlockElements: ['Mg'], title: '반짝이는 불꽃', badgeEmoji: '✨' },
    { id: 'm5', countRequired: 22, unlockElements: [], title: '화학식 마스터', badgeEmoji: '👑' }
  ];

  var START_ELEMENTS = ['H', 'O'];
  var TOTAL_COUNT = ELEMENTS.length + COMPOUNDS.length;

  var ELEMENTS_BY_ID = {};
  ELEMENTS.forEach(function (e) { ELEMENTS_BY_ID[e.id] = e; });
  var COMPOUNDS_BY_ID = {};
  COMPOUNDS.forEach(function (c) { COMPOUNDS_BY_ID[c.id] = c; });

  var el = {
    screens: {
      'screen-start': document.getElementById('screen-start'),
      'screen-confirm-reset': document.getElementById('screen-confirm-reset'),
      'screen-game': document.getElementById('screen-game'),
      'screen-complete': document.getElementById('screen-complete'),
      'screen-dex': document.getElementById('screen-dex')
    },
    saveInfo: document.getElementById('save-info'),
    saveDesc: document.getElementById('save-desc'),
    btnContinue: document.getElementById('btn-continue'),
    btnStart: document.getElementById('btn-start'),
    btnDexPreview: document.getElementById('btn-dex-preview'),
    btnConfirmReset: document.getElementById('btn-confirm-reset'),
    btnCancelReset: document.getElementById('btn-cancel-reset'),
    btnGameHome: document.getElementById('btn-game-home'),
    btnOpenDex: document.getElementById('btn-open-dex'),
    badgeStrip: document.getElementById('badge-strip'),
    nextTargetStrip: document.getElementById('next-target-strip'),
    wbSlotA: document.getElementById('wb-slot-a'),
    wbSlotB: document.getElementById('wb-slot-b'),
    btnCombine: document.getElementById('btn-combine'),
    combineFlash: document.getElementById('combine-flash'),
    shelfCount: document.getElementById('shelf-count'),
    shelfTotal: document.getElementById('shelf-total'),
    shelfBottles: document.getElementById('shelf-bottles'),
    inventoryGrid: document.getElementById('inventory-grid'),
    statusToast: document.getElementById('status-toast'),
    btnCompleteContinue: document.getElementById('btn-complete-continue'),
    btnCompleteDex: document.getElementById('btn-complete-dex'),
    btnDexBack: document.getElementById('btn-dex-back'),
    dexTabs: document.querySelectorAll('.dex-tab'),
    dexGrid: document.getElementById('dex-grid'),
    dexTableWrap: document.getElementById('dex-table-wrap'),
    dexTable: document.getElementById('dex-table'),
    dexTableBody: document.getElementById('dex-table-body'),
    detailModal: document.getElementById('detail-modal'),
    btnDetailClose: document.getElementById('btn-detail-close'),
    detailNewBadge: document.getElementById('detail-new-badge'),
    detailDiagram: document.getElementById('detail-diagram'),
    detailName: document.getElementById('detail-name'),
    detailRecipe: document.getElementById('detail-recipe'),
    detailThermal: document.getElementById('detail-thermal'),
    detailHazards: document.getElementById('detail-hazards'),
    detailFacts: document.getElementById('detail-facts'),
    detailDesc: document.getElementById('detail-desc')
  };

  var MAIN_SCREENS = ['screen-start', 'screen-game', 'screen-dex'];
  var OVERLAY_SCREENS = ['screen-confirm-reset', 'screen-complete'];

  var state = null;
  var lastMainScreen = 'screen-start';
  var dexReturnScreen = 'screen-start';
  var dexTab = 'element';
  var dexSort = { key: 'display', dir: 1 };
  var toastTimer = null;
  var popupQueue = [];
  var popupActive = false;
  var popupAutoCloseTimer = null;
  var pendingCompleteCelebration = false;
  var combineAnimating = false;

  function showMain(id) {
    MAIN_SCREENS.forEach(function (s) { el.screens[s].classList.toggle('active', s === id); });
    OVERLAY_SCREENS.forEach(function (s) { el.screens[s].classList.remove('active'); });
    lastMainScreen = id;
  }
  function showOverlay(id) { el.screens[id].classList.add('active'); }
  function hideOverlay(id) { el.screens[id].classList.remove('active'); }

  function newState() {
    return {
      discoveredElements: [],
      discoveredCompounds: [],
      claimedMilestones: [],
      completeCelebrationShown: false,
      wbA: null,
      wbB: null
    };
  }

  function hasSave() { return localStorage.getItem(SAVE_KEY) !== null; }
  function saveGame() { if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function loadGame() {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      var s = newState();
      Object.keys(s).forEach(function (k) { if (data[k] !== undefined) s[k] = data[k]; });
      return s;
    } catch (e) { return null; }
  }

  function isUnlocked(id) {
    if (ELEMENTS_BY_ID[id]) return state.discoveredElements.indexOf(id) !== -1;
    if (COMPOUNDS_BY_ID[id]) return state.discoveredCompounds.indexOf(id) !== -1;
    return false;
  }

  function getFormula(id) {
    if (ELEMENTS_BY_ID[id]) { var f = {}; f[id] = 1; return f; }
    var c = COMPOUNDS_BY_ID[id];
    return c ? c.formula : null;
  }

  function sameFormula(a, b) {
    var keysA = Object.keys(a), keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (var i = 0; i < keysA.length; i++) if (a[keysA[i]] !== b[keysA[i]]) return false;
    return true;
  }

  function sumFormula(a, b) {
    var sum = {};
    Object.keys(a).forEach(function (k) { sum[k] = (sum[k] || 0) + a[k]; });
    Object.keys(b).forEach(function (k) { sum[k] = (sum[k] || 0) + b[k]; });
    return sum;
  }

  function combineLookup(idA, idB) {
    var fa = getFormula(idA), fb = getFormula(idB);
    if (!fa || !fb) return null;
    var sum = sumFormula(fa, fb);
    for (var i = 0; i < COMPOUNDS.length; i++) {
      if (sameFormula(COMPOUNDS[i].formula, sum)) return COMPOUNDS[i].id;
    }
    return null;
  }

  function speciesKind(id) { return ELEMENTS_BY_ID[id] ? 'el' : 'cp'; }

  // ---------- 원자/분자 SVG 다이어그램 ----------
  function elementColor(sym) {
    return CATEGORY_COLOR[ELEMENTS_BY_ID[sym].category] || '#999';
  }

  function chargeLabel(charge) {
    if (!charge) return '';
    return (charge > 0 ? '+' : '−') + (Math.abs(charge) > 1 ? Math.abs(charge) : '');
  }

  // 유리구슬처럼 보이도록 그림자 + 하이라이트를 곁들인 3D풍 구체
  function sphereMarkup(cx, cy, r, color) {
    return '<ellipse cx="' + (cx + 1) + '" cy="' + (cy + r * 0.12) + '" rx="' + (r * 0.95) + '" ry="' + (r * 0.85) + '" fill="rgba(0,0,0,0.16)"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '" stroke="#fff" stroke-width="1.4"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#atom-shine)"/>';
  }

  function renderAtomSVG(sym, size) {
    size = size || 64;
    var e = ELEMENTS_BY_ID[sym];
    var val = e.valence;
    var nubs = '';
    for (var i = 0; i < val; i++) {
      var angle = (Math.PI * 2 * i / val) - Math.PI / 2;
      var x1 = 50 + Math.cos(angle) * 21, y1 = 50 + Math.sin(angle) * 21;
      var x2 = 50 + Math.cos(angle) * 34, y2 = 50 + Math.sin(angle) * 34;
      nubs += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#b4b4b8" stroke-width="4" stroke-linecap="round"/>';
      nubs += '<circle cx="' + x2 + '" cy="' + y2 + '" r="4" fill="#8f8f96"/>';
    }
    var chargeText = '';
    if (e.charge) {
      var col = e.charge > 0 ? '#c9432f' : '#2f6fc9';
      chargeText = '<text x="72" y="30" text-anchor="middle" font-size="13" font-weight="900" fill="' + col + '">' + chargeLabel(e.charge) + '</text>';
    }
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '">' + nubs +
      sphereMarkup(50, 50, 20, elementColor(sym)) +
      '<text x="50" y="55" text-anchor="middle" font-size="17" font-weight="800" fill="#1c1f38">' + sym + '</text>' +
      chargeText + '</svg>';
  }

  function layoutStructure(structure) {
    var atoms = structure.atoms;
    var children = atoms.map(function () { return []; });
    atoms.forEach(function (a, i) { if (a.parent != null) children[a.parent].push(i); });
    var pos = new Array(atoms.length);
    function place(i, x, y, angleIn, depth) {
      pos[i] = { x: x, y: y };
      var kids = children[i];
      if (!kids.length) return;
      var spread = Math.min(2.6, 0.9 + kids.length * 0.55);
      var start = angleIn - spread / 2;
      var r = Math.max(13, 25 - depth * 3);
      kids.forEach(function (childIdx, k) {
        var angle = kids.length === 1 ? angleIn : start + spread * k / (kids.length - 1);
        var cx = x + Math.cos(angle) * r, cy = y + Math.sin(angle) * r;
        place(childIdx, cx, cy, angle, depth + 1);
      });
    }
    place(0, 50, 50, -Math.PI / 2, 0);
    return pos;
  }

  function renderStructureSVG(compound, size) {
    size = size || 96;
    var structure = compound.structure;
    var pos = layoutStructure(structure);
    var lines = '';
    structure.atoms.forEach(function (a, i) {
      if (a.parent == null) return;
      var p = pos[a.parent], c = pos[i];
      var bt = a.bondType || 'single';
      if (bt === 'ionic') {
        lines += '<line x1="' + p.x + '" y1="' + p.y + '" x2="' + c.x + '" y2="' + c.y + '" stroke="#c98a3f" stroke-width="2.4" stroke-dasharray="3,3"/>';
      } else {
        var count = bt === 'triple' ? 3 : (bt === 'double' ? 2 : 1);
        var dx = (c.y - p.y), dy = -(c.x - p.x);
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        for (var n = 0; n < count; n++) {
          var offset = (n - (count - 1) / 2) * 3.4;
          var ox = dx / len * offset, oy = dy / len * offset;
          lines += '<line x1="' + (p.x + ox) + '" y1="' + (p.y + oy) + '" x2="' + (c.x + ox) + '" y2="' + (c.y + oy) + '" stroke="#6b6b6b" stroke-width="2.2" stroke-linecap="round"/>';
        }
      }
    });
    var atomsSvg = '';
    structure.atoms.forEach(function (a, i) {
      var p = pos[i];
      var r = i === 0 ? 15 : 12;
      atomsSvg += sphereMarkup(p.x, p.y, r, elementColor(a.sym));
      atomsSvg += '<text x="' + p.x + '" y="' + (p.y + 4) + '" text-anchor="middle" font-size="' + (i === 0 ? 12 : 10) + '" font-weight="800" fill="#1c1f38">' + a.sym + '</text>';
      if (a.charge) {
        var col = a.charge > 0 ? '#c9432f' : '#2f6fc9';
        atomsSvg += '<text x="' + (p.x + r * 0.8) + '" y="' + (p.y - r * 0.6) + '" text-anchor="middle" font-size="9" font-weight="900" fill="' + col + '">' + chargeLabel(a.charge) + '</text>';
      }
    });
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '">' + lines + atomsSvg + '</svg>';
  }

  function diagramFor(kind, id, size) {
    if (kind === 'el') return renderAtomSVG(id, size);
    return renderStructureSVG(COMPOUNDS_BY_ID[id], size);
  }

  // ---------- 도감/실험대 타일 ----------
  function tileHtml(kind, id) {
    var name = kind === 'el' ? ELEMENTS_BY_ID[id].name : COMPOUNDS_BY_ID[id].name;
    return diagramFor(kind, id, 46) + '<span class="tile-name">' + name + '</span>';
  }

  function renderInventory() {
    var html = '';
    ELEMENTS.forEach(function (e) {
      if (state.discoveredElements.indexOf(e.id) === -1) return;
      var sel = (state.wbA === e.id || state.wbB === e.id) ? ' selected' : '';
      html += '<div class="dex-tile' + sel + '" data-kind="el" data-id="' + e.id + '">' + tileHtml('el', e.id) + '</div>';
    });
    COMPOUNDS.forEach(function (c) {
      if (state.discoveredCompounds.indexOf(c.id) === -1) return;
      var sel = (state.wbA === c.id || state.wbB === c.id) ? ' selected' : '';
      html += '<div class="dex-tile' + sel + '" data-kind="cp" data-id="' + c.id + '">' + tileHtml('cp', c.id) + '</div>';
    });
    el.inventoryGrid.innerHTML = html;
    el.inventoryGrid.querySelectorAll('.dex-tile').forEach(function (n) {
      n.addEventListener('click', function () { onInventoryTap(n.getAttribute('data-kind'), n.getAttribute('data-id')); });
    });
  }

  function renderWorkbench() {
    renderSlot(el.wbSlotA, state.wbA);
    renderSlot(el.wbSlotB, state.wbB);
    el.btnCombine.disabled = !(state.wbA && state.wbB);
  }

  function renderSlot(slotEl, speciesId) {
    if (!speciesId) {
      slotEl.classList.remove('filled');
      slotEl.innerHTML = '<span class="wb-empty">+</span>';
      return;
    }
    slotEl.classList.add('filled');
    slotEl.innerHTML = diagramFor(speciesKind(speciesId), speciesId, 56);
  }

  function onInventoryTap(kind, id) {
    if (!state.wbA) { state.wbA = id; }
    else if (!state.wbB) { state.wbB = id; }
    else { return; }
    renderWorkbench();
    renderInventory();
  }

  el.wbSlotA.addEventListener('click', function () { if (state.wbA) { state.wbA = null; renderWorkbench(); renderInventory(); } });
  el.wbSlotB.addEventListener('click', function () { if (state.wbB) { state.wbB = null; renderWorkbench(); renderInventory(); } });

  function shakeWorkbench() {
    [el.wbSlotA, el.wbSlotB].forEach(function (n) {
      n.classList.remove('shake');
      void n.offsetWidth;
      n.classList.add('shake');
    });
  }

  // 두 슬롯이 가운데로 미끄러져 만나 "딱" 맞물리는 퍼즐 스냅 연출.
  function playSnapAnimation(onDone) {
    combineAnimating = true;
    // 이전 애니메이션 잔여 클래스를 지우고 강제로 리플로우시켜 매번 처음부터 재생되게 한다.
    el.wbSlotA.classList.remove('combine-a');
    el.wbSlotB.classList.remove('combine-b');
    void el.wbSlotA.offsetWidth;
    el.wbSlotA.classList.add('combine-a');
    el.wbSlotB.classList.add('combine-b');
    setTimeout(function () {
      el.combineFlash.classList.remove('burst');
      void el.combineFlash.offsetWidth;
      el.combineFlash.classList.add('burst');
    }, 300);
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      el.wbSlotA.removeEventListener('animationend', finish);
      el.wbSlotA.classList.remove('combine-a');
      el.wbSlotB.classList.remove('combine-b');
      combineAnimating = false;
      onDone();
    }
    el.wbSlotA.addEventListener('animationend', finish, { once: true });
    // 화면 전환(도감 등)으로 애니메이션이 중간에 취소되면 animationend가 발생하지 않으므로,
    // 안전망으로 애니메이션 시간보다 넉넉한 지연 뒤 강제로 완료 처리한다.
    setTimeout(finish, 900);
  }

  function attemptCombine() {
    if (combineAnimating) return;
    if (!state.wbA || !state.wbB) return;
    var match = combineLookup(state.wbA, state.wbB);
    if (!match) {
      shakeWorkbench();
      showToast('음... 반응이 없어요');
      return;
    }
    el.btnCombine.disabled = true;
    playSnapAnimation(function () {
      state.wbA = null;
      state.wbB = null;
      var isNew = state.discoveredCompounds.indexOf(match) === -1;
      if (isNew) {
        state.discoveredCompounds.push(match);
        checkMilestones();
        saveGame();
        renderHud();
        renderInventory();
        renderWorkbench();
        queueDiscoveryPopup(match);
        if (state.discoveredCompounds.length >= COMPOUNDS.length && !state.completeCelebrationShown) {
          pendingCompleteCelebration = true;
        }
      } else {
        showToast('이미 만든 화합물이에요: ' + COMPOUNDS_BY_ID[match].name);
        saveGame();
        renderWorkbench();
        renderInventory();
      }
    });
  }

  // ---------- 연구실 진열장 ----------
  function renderShelf() {
    var total = state.discoveredElements.length + state.discoveredCompounds.length;
    el.shelfCount.textContent = total;
    el.shelfTotal.textContent = TOTAL_COUNT;
    var html = '';
    state.discoveredCompounds.forEach(function (id) {
      var c = COMPOUNDS_BY_ID[id];
      html += '<div class="shelf-bottle" style="background:' + elementColor(Object.keys(c.formula)[0]) + '" title="' + c.name + '"></div>';
    });
    el.shelfBottles.innerHTML = html;
  }

  // ---------- HUD ----------
  function renderHud() {
    renderShelf();
    renderBadgeStrip();
    renderNextTargets();
  }

  function renderBadgeStrip() {
    var html = '';
    MILESTONES.forEach(function (m) {
      var claimed = state.claimedMilestones.indexOf(m.id) !== -1;
      html += '<div class="milestone-badge ' + (claimed ? 'claimed' : 'locked') + '" data-mid="' + m.id + '">' + m.badgeEmoji + '</div>';
    });
    el.badgeStrip.innerHTML = html;
    el.badgeStrip.querySelectorAll('.milestone-badge').forEach(function (node) {
      node.addEventListener('click', function () {
        var m = MILESTONES.filter(function (x) { return x.id === node.getAttribute('data-mid'); })[0];
        if (!m) return;
        var claimed = state.claimedMilestones.indexOf(m.id) !== -1;
        showToast(claimed ? ('🏅 ' + m.title + ' 달성!') : ('🔒 ' + m.title + ' (화합물 ' + m.countRequired + '종 발견 시 해금)'));
      });
    });
  }

  function getRecommendedTargets(limit) {
    var candidates = [];
    COMPOUNDS.forEach(function (c) {
      if (isUnlocked(c.id)) return;
      if (isUnlocked(c.recipe[0]) && isUnlocked(c.recipe[1])) candidates.push(c);
    });
    candidates.sort(function (x, y) {
      var xEl = ELEMENTS_BY_ID[x.recipe[0]] && ELEMENTS_BY_ID[x.recipe[1]] ? 0 : 1;
      var yEl = ELEMENTS_BY_ID[y.recipe[0]] && ELEMENTS_BY_ID[y.recipe[1]] ? 0 : 1;
      return xEl - yEl;
    });
    return candidates.slice(0, limit);
  }

  function renderNextTargets() {
    if (state.discoveredCompounds.length >= COMPOUNDS.length) {
      el.nextTargetStrip.innerHTML = '<div class="target-chip all-done">🎉 모든 화합물 발견 완료!</div>';
      return;
    }
    var targets = getRecommendedTargets(3);
    var html = targets.map(function (c) { return '<div class="target-chip">🎯 ' + c.name + ' (' + c.display + ')</div>'; }).join('');
    el.nextTargetStrip.innerHTML = html || '<div class="target-chip">🔬 새 원소를 더 모아보세요</div>';
  }

  function checkMilestones() {
    var count = state.discoveredCompounds.length;
    MILESTONES.forEach(function (m) {
      if (state.claimedMilestones.indexOf(m.id) !== -1) return;
      if (count >= m.countRequired) {
        state.claimedMilestones.push(m.id);
        m.unlockElements.forEach(function (eid) {
          if (state.discoveredElements.indexOf(eid) === -1) state.discoveredElements.push(eid);
        });
        var names = m.unlockElements.map(function (eid) { return ELEMENTS_BY_ID[eid].name; }).join(', ');
        showToast(m.badgeEmoji + ' 마일스톤 달성: ' + m.title + (names ? ' → ' + names + ' 해금!' : '!'));
      }
    });
  }

  // ---------- 토스트 ----------
  function showToast(text) {
    if (toastTimer) clearTimeout(toastTimer);
    el.statusToast.textContent = text;
    el.statusToast.classList.add('show');
    toastTimer = setTimeout(function () { el.statusToast.classList.remove('show'); }, 1800);
  }

  // ---------- 상세 정보 / 발견 카드 ----------
  function thermalStateAt25(c) {
    if (c.thermalType === 'unstable') return null;
    if (c.thermalType === 'sublimes') return 25 > c.meltingPoint ? '기체' : '고체';
    if (c.thermalType === 'decomposes') return '고체';
    if (25 < c.meltingPoint) return '고체';
    if (25 < c.boilingPoint) return '액체';
    return '기체';
  }

  function renderThermal(c) {
    if (c.thermalType === 'unstable') {
      el.detailThermal.style.display = '';
      el.detailThermal.innerHTML = '<p class="thermal-caption">🌀 불안정한 중간 물질이라 실온 성질이 정의되지 않아요. 다른 화합물을 만드는 재료로만 써요!</p>';
      return;
    }
    if (c.thermalType === 'decomposes') {
      el.detailThermal.style.display = '';
      el.detailThermal.innerHTML = '<p class="thermal-caption">🔥 ' + c.meltingPoint + '°C 근처에서 녹지 않고 분해돼요.</p><span class="thermal-state-chip">실온에서: ' + thermalStateAt25(c) + '</span>';
      return;
    }
    if (c.thermalType === 'sublimes') {
      el.detailThermal.style.display = '';
      el.detailThermal.innerHTML = '<p class="thermal-caption">❄️ ' + c.meltingPoint + '°C에서 액체를 거치지 않고 고체 ↔ 기체로 승화해요.</p><span class="thermal-state-chip">실온에서: ' + thermalStateAt25(c) + '</span>';
      return;
    }
    var lo = -270, hi = 200;
    var mp = Math.max(lo, Math.min(hi, c.meltingPoint));
    var bp = Math.max(lo, Math.min(hi, c.boilingPoint));
    var mpPct = ((mp - lo) / (hi - lo)) * 100;
    var bpPct = ((bp - lo) / (hi - lo)) * 100;
    el.detailThermal.style.display = '';
    el.detailThermal.innerHTML =
      '<p class="thermal-caption">녹는점 ' + c.meltingPoint + '°C · 끓는점 ' + c.boilingPoint + '°C</p>' +
      '<div class="thermal-bar" style="--mp-pct:' + mpPct + '%;--bp-pct:' + bpPct + '%"></div>' +
      '<div class="thermal-labels"><span>' + lo + '°C</span><span>' + hi + '°C</span></div>' +
      '<span class="thermal-state-chip">실온(25°C)에서: ' + thermalStateAt25(c) + '</span>';
  }

  function renderHazards(c) {
    if (!c.hazards || c.hazards.length === 0) { el.detailHazards.style.display = 'none'; el.detailHazards.innerHTML = ''; return; }
    el.detailHazards.style.display = '';
    el.detailHazards.innerHTML = c.hazards.map(function (h) {
      var hz = HAZARDS[h];
      return '<div class="hazard-badge">' + hz.emoji + '<span class="hazard-label">' + hz.label + '</span></div>';
    }).join('');
  }

  function showDetail(kind, id, opts) {
    opts = opts || {};
    el.detailNewBadge.style.display = opts.isNew ? '' : 'none';
    el.detailDiagram.innerHTML = diagramFor(kind, id, 128);
    if (kind === 'el') {
      var e = ELEMENTS_BY_ID[id];
      el.detailName.textContent = e.name;
      el.detailRecipe.style.display = 'none';
      el.detailThermal.style.display = 'none';
      el.detailHazards.style.display = 'none';
      var factsHtml =
        '<div class="detail-fact"><span class="detail-fact-num">' + e.atomicNumber + '</span><span class="detail-fact-label">원자번호</span></div>' +
        '<div class="detail-fact"><span class="detail-fact-num">' + e.mass.toFixed(1) + '</span><span class="detail-fact-label">원자량</span></div>' +
        '<div class="detail-fact"><span class="detail-fact-num">' + e.valence + '</span><span class="detail-fact-label">손(원자가) 개수</span></div>';
      el.detailFacts.innerHTML = factsHtml;
      el.detailDesc.textContent = e.desc;
    } else {
      var c = COMPOUNDS_BY_ID[id];
      var ingredientNames = c.recipe.map(function (rid) {
        var ie = ELEMENTS_BY_ID[rid] || COMPOUNDS_BY_ID[rid];
        return ie.name + '(' + (ELEMENTS_BY_ID[rid] ? ie.id : ie.display) + ')';
      });
      el.detailName.textContent = c.name;
      el.detailRecipe.style.display = '';
      el.detailRecipe.textContent = ingredientNames[0] + ' + ' + ingredientNames[1] + ' = ' + c.name;
      renderThermal(c);
      renderHazards(c);
      var elementCount = Object.keys(c.formula).length;
      var atomCount = Object.keys(c.formula).reduce(function (sum, k) { return sum + c.formula[k]; }, 0);
      el.detailFacts.innerHTML =
        '<div class="detail-fact"><span class="detail-fact-num">' + elementCount + '</span><span class="detail-fact-label">구성 원소 수</span></div>' +
        '<div class="detail-fact"><span class="detail-fact-num">' + atomCount + '</span><span class="detail-fact-label">총 원자 수</span></div>';
      el.detailDesc.textContent = c.desc;
    }
    el.detailModal.classList.add('show');
  }

  function closeDetailModal() { el.detailModal.classList.remove('show'); }

  function queueDiscoveryPopup(compoundId) {
    popupQueue.push(compoundId);
    processPopupQueue();
  }

  function processPopupQueue() {
    if (popupActive) return;
    if (popupQueue.length === 0) { afterPopupsResolved(); return; }
    popupActive = true;
    var compoundId = popupQueue.shift();
    showDetail('cp', compoundId, { isNew: true });
    popupAutoCloseTimer = setTimeout(function () {
      closeDetailModal();
      popupActive = false;
      setTimeout(processPopupQueue, 150);
    }, 2400);
  }

  function afterPopupsResolved() {
    if (pendingCompleteCelebration) {
      pendingCompleteCelebration = false;
      state.completeCelebrationShown = true;
      saveGame();
      showOverlay('screen-complete');
    }
  }

  // ---------- 게임 시작/재개 ----------
  function startGame() {
    state = newState();
    START_ELEMENTS.forEach(function (eid) { state.discoveredElements.push(eid); });
    saveGame();
    showMain('screen-game');
    renderHud();
    renderInventory();
    renderWorkbench();
  }

  function continueGame() {
    var loaded = loadGame();
    state = loaded || newState();
    showMain('screen-game');
    renderHud();
    renderInventory();
    renderWorkbench();
  }

  function refreshStartScreen() {
    if (hasSave()) {
      var loaded = loadGame();
      var total = loaded.discoveredElements.length + loaded.discoveredCompounds.length;
      el.saveDesc.textContent = '발견 ' + total + ' / ' + TOTAL_COUNT + ' 진행 중';
      el.saveInfo.style.display = '';
      el.btnContinue.style.display = '';
    } else {
      el.saveInfo.style.display = 'none';
      el.btnContinue.style.display = 'none';
    }
  }

  // ---------- 도감 ----------
  function renderDex() {
    el.dexTabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === dexTab); });
    el.dexGrid.style.display = dexTab === 'history' ? 'none' : '';
    el.dexTableWrap.style.display = dexTab === 'history' ? '' : 'none';
    if (dexTab === 'history') { renderDexTable(); return; }

    var html = '';
    var discoveredEls = state ? state.discoveredElements : [];
    var discoveredCps = state ? state.discoveredCompounds : [];

    if (dexTab === 'element') {
      ELEMENTS.forEach(function (e) {
        if (discoveredEls.indexOf(e.id) !== -1) {
          html += '<div class="dex-tile" data-kind="el" data-id="' + e.id + '">' + tileHtml('el', e.id) + '</div>';
        } else {
          html += '<div class="dex-tile locked"><span class="tile-symbol">?</span><span class="tile-name">???</span></div>';
        }
      });
    } else {
      COMPOUNDS.forEach(function (c) {
        if (discoveredCps.indexOf(c.id) !== -1) {
          html += '<div class="dex-tile" data-kind="cp" data-id="' + c.id + '">' + tileHtml('cp', c.id) + '</div>';
        } else {
          html += '<div class="dex-tile locked"><span class="tile-symbol">?</span><span class="tile-name">???</span></div>';
        }
      });
    }
    el.dexGrid.innerHTML = html;
    el.dexGrid.querySelectorAll('.dex-tile:not(.locked)').forEach(function (n) {
      n.addEventListener('click', function () { showDetail(n.getAttribute('data-kind'), n.getAttribute('data-id'), {}); });
    });
  }

  function renderDexTable() {
    var discoveredCps = state ? state.discoveredCompounds : [];
    var rows = COMPOUNDS.map(function (c) {
      var unlocked = discoveredCps.indexOf(c.id) !== -1;
      return { id: c.id, display: unlocked ? c.display : '?', name: unlocked ? c.name : '???', state: unlocked ? (thermalStateAt25(c) || '-') : '???', unlocked: unlocked };
    });
    rows.sort(function (a, b) {
      var av = a[dexSort.key], bv = b[dexSort.key];
      return String(av).localeCompare(String(bv), 'ko') * dexSort.dir;
    });
    el.dexTableBody.innerHTML = rows.map(function (r) {
      return '<tr class="' + (r.unlocked ? '' : 'locked-row') + '"' + (r.unlocked ? ' data-id="' + r.id + '"' : '') + '>' +
        '<td>' + r.display + '</td><td>' + r.name + '</td><td>' + r.state + '</td></tr>';
    }).join('');
    el.dexTableBody.querySelectorAll('tr[data-id]').forEach(function (row) {
      row.addEventListener('click', function () { showDetail('cp', row.getAttribute('data-id'), {}); });
    });
  }

  function openDex() {
    if (lastMainScreen !== 'screen-dex') dexReturnScreen = lastMainScreen;
    renderDex();
    showMain('screen-dex');
  }

  // ---------- 이벤트 바인딩 ----------
  function bindEvents() {
    el.btnStart.addEventListener('click', function () { if (hasSave()) showOverlay('screen-confirm-reset'); else startGame(); });
    el.btnContinue.addEventListener('click', continueGame);
    el.btnDexPreview.addEventListener('click', openDex);

    el.btnConfirmReset.addEventListener('click', function () { hideOverlay('screen-confirm-reset'); startGame(); });
    el.btnCancelReset.addEventListener('click', function () { hideOverlay('screen-confirm-reset'); });

    el.btnGameHome.addEventListener('click', function () { saveGame(); refreshStartScreen(); showMain('screen-start'); });
    el.btnOpenDex.addEventListener('click', openDex);

    el.btnCombine.addEventListener('click', attemptCombine);

    el.btnCompleteContinue.addEventListener('click', function () { hideOverlay('screen-complete'); showMain('screen-game'); });
    el.btnCompleteDex.addEventListener('click', function () { hideOverlay('screen-complete'); openDex(); });

    el.btnDexBack.addEventListener('click', function () { showMain(dexReturnScreen); });

    el.dexTabs.forEach(function (t) { t.addEventListener('click', function () { dexTab = t.getAttribute('data-tab'); renderDex(); }); });

    el.dexTable.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (dexSort.key === key) dexSort.dir *= -1; else { dexSort.key = key; dexSort.dir = 1; }
        renderDexTable();
      });
    });

    el.btnDetailClose.addEventListener('click', function () {
      closeDetailModal();
      if (popupActive) {
        clearTimeout(popupAutoCloseTimer);
        popupActive = false;
        setTimeout(processPopupQueue, 100);
      }
    });
    el.detailModal.addEventListener('click', function (ev) { if (ev.target === el.detailModal) el.btnDetailClose.click(); });
  }

  function init() {
    bindEvents();
    refreshStartScreen();
    showMain('screen-start');
  }

  init();
})();
