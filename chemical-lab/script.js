(function () {
  'use strict';

  var SAVE_KEY = 'chemical-lab-save-v2';
  var SIZE = 4;
  var GAP_PX = 8;

  var ELEMENTS = [
    { id: 'H', name: '수소', atomicNumber: 1, mass: 1.0, category: 'nonmetal', desc: '우주에서 가장 많고 가장 가벼운 원소예요.' },
    { id: 'C', name: '탄소', atomicNumber: 6, mass: 12.0, category: 'nonmetal', desc: '생명체를 이루는 기본 원소예요.' },
    { id: 'N', name: '질소', atomicNumber: 7, mass: 14.0, category: 'nonmetal', desc: '공기의 78%를 차지해요.' },
    { id: 'O', name: '산소', atomicNumber: 8, mass: 16.0, category: 'nonmetal', desc: '우리가 숨 쉬는 데 꼭 필요해요.' },
    { id: 'Na', name: '나트륨', atomicNumber: 11, mass: 23.0, category: 'alkali', desc: '물과 만나면 격렬하게 반응해요.' },
    { id: 'Mg', name: '마그네슘', atomicNumber: 12, mass: 24.3, category: 'alkaline-earth', desc: '불꽃놀이에서 밝은 빛을 내요.' },
    { id: 'Cl', name: '염소', atomicNumber: 17, mass: 35.5, category: 'halogen', desc: '소독약에서 나는 매운 냄새의 주인공이에요.' },
    { id: 'Ca', name: '칼슘', atomicNumber: 20, mass: 40.1, category: 'alkaline-earth', desc: '뼈와 이를 튼튼하게 만들어줘요.' }
  ];

  var HAZARDS = {
    flammable: { emoji: '🔥', label: '가연성' },
    toxic: { emoji: '☠️', label: '독성' },
    corrosive: { emoji: '🧪', label: '부식성' },
    environment: { emoji: '🌱', label: '환경 주의' }
  };

  // thermalType: normal(녹는점~끓는점) / sublimes(승화) / decomposes(분해) / unstable(불안정 중간체)
  var COMPOUNDS = [
    { id: 'H2', name: '수소 기체', formula: { H: 2 }, display: 'H₂', recipe: ['H', 'H'], desc: '가장 가벼운 기체예요. 로켓 연료로도 쓰여요.', thermalType: 'normal', meltingPoint: -259.2, boilingPoint: -252.9, hazards: ['flammable'] },
    { id: 'O2', name: '산소 기체', formula: { O: 2 }, display: 'O₂', recipe: ['O', 'O'], desc: '우리가 숨 쉬는 공기 속 기체예요.', thermalType: 'normal', meltingPoint: -218.3, boilingPoint: -183.0, hazards: [] },
    { id: 'H2O', name: '물', formula: { H: 2, O: 1 }, display: 'H₂O', recipe: ['H2', 'O'], desc: '생명에 꼭 필요한 액체예요.', thermalType: 'normal', meltingPoint: 0, boilingPoint: 100, hazards: [] },
    { id: 'NaCl', name: '소금', formula: { Na: 1, Cl: 1 }, display: 'NaCl', recipe: ['Na', 'Cl'], desc: '음식에 넣어 먹는 짠맛의 정체예요.', thermalType: 'normal', meltingPoint: 801, boilingPoint: 1465, hazards: [] },
    { id: 'Cl2', name: '염소 기체', formula: { Cl: 2 }, display: 'Cl₂', recipe: ['Cl', 'Cl'], desc: '수영장 소독에 사용돼요.', thermalType: 'normal', meltingPoint: -101.5, boilingPoint: -34.0, hazards: ['toxic', 'environment'] },
    { id: 'HCl', name: '염화수소', formula: { H: 1, Cl: 1 }, display: 'HCl', recipe: ['H', 'Cl'], desc: '물에 녹으면 위산의 주성분이 돼요.', thermalType: 'normal', meltingPoint: -114.2, boilingPoint: -85.1, hazards: ['corrosive'] },
    { id: 'CO2', name: '이산화탄소', formula: { C: 1, O: 2 }, display: 'CO₂', recipe: ['C', 'O2'], desc: '우리가 숨을 내쉴 때 나오는 기체예요. 드라이아이스는 액체 없이 바로 기체가 돼요.', thermalType: 'sublimes', meltingPoint: -78.5, boilingPoint: -78.5, hazards: [] },
    { id: 'NH2', name: '아미노기', formula: { N: 1, H: 2 }, display: 'NH₂', recipe: ['N', 'H2'], desc: '암모니아가 되기 전 중간 조각이에요.', thermalType: 'unstable', meltingPoint: null, boilingPoint: null, hazards: [] },
    { id: 'NH3', name: '암모니아', formula: { N: 1, H: 3 }, display: 'NH₃', recipe: ['NH2', 'H'], desc: '톡 쏘는 냄새가 나는 기체예요. 비료의 재료예요.', thermalType: 'normal', meltingPoint: -77.7, boilingPoint: -33.3, hazards: ['corrosive', 'toxic'] },
    { id: 'CH2', name: '메틸렌', formula: { C: 1, H: 2 }, display: 'CH₂', recipe: ['C', 'H2'], desc: '메탄이 되기 전 중간 조각이에요.', thermalType: 'unstable', meltingPoint: null, boilingPoint: null, hazards: [] },
    { id: 'CH4', name: '메탄', formula: { C: 1, H: 4 }, display: 'CH₄', recipe: ['CH2', 'H2'], desc: '천연가스의 주성분이에요.', thermalType: 'normal', meltingPoint: -182.5, boilingPoint: -161.5, hazards: ['flammable'] },
    { id: 'CaO', name: '산화칼슘', formula: { Ca: 1, O: 1 }, display: 'CaO', recipe: ['Ca', 'O'], desc: '생석회라고도 불러요.', thermalType: 'normal', meltingPoint: 2613, boilingPoint: 2850, hazards: ['corrosive'] },
    { id: 'CaCl2', name: '염화칼슘', formula: { Ca: 1, Cl: 2 }, display: 'CaCl₂', recipe: ['Ca', 'Cl2'], desc: '겨울철 제설제로 사용돼요.', thermalType: 'normal', meltingPoint: 772, boilingPoint: 1935, hazards: [] },
    { id: 'CaCO3', name: '탄산칼슘', formula: { Ca: 1, C: 1, O: 3 }, display: 'CaCO₃', recipe: ['CaO', 'CO2'], desc: '석회석과 조개껍데기의 주성분이에요.', thermalType: 'decomposes', meltingPoint: 1339, boilingPoint: null, hazards: [] },
    { id: 'MgO', name: '산화마그네슘', formula: { Mg: 1, O: 1 }, display: 'MgO', recipe: ['Mg', 'O'], desc: '제산제와 내화벽돌에 사용돼요.', thermalType: 'normal', meltingPoint: 2852, boilingPoint: 3600, hazards: [] },
    { id: 'MgCl2', name: '염화마그네슘', formula: { Mg: 1, Cl: 2 }, display: 'MgCl₂', recipe: ['Mg', 'Cl2'], desc: '간수의 주성분이에요.', thermalType: 'normal', meltingPoint: 714, boilingPoint: 1412, hazards: [] },
    { id: 'MgOH2', name: '수산화마그네슘', formula: { Mg: 1, O: 2, H: 2 }, display: 'Mg(OH)₂', recipe: ['MgO', 'H2O'], desc: '제산제(마그밀)의 주성분이에요.', thermalType: 'decomposes', meltingPoint: 350, boilingPoint: null, hazards: [] },
    { id: 'OH', name: '수산화기', formula: { O: 1, H: 1 }, display: 'OH', recipe: ['H', 'O'], desc: '다양한 화합물을 만드는 중간 조각이에요.', thermalType: 'unstable', meltingPoint: null, boilingPoint: null, hazards: [] },
    { id: 'NaOH', name: '수산화나트륨', formula: { Na: 1, O: 1, H: 1 }, display: 'NaOH', recipe: ['Na', 'OH'], desc: '비누를 만들 때 사용되는 강한 염기예요.', thermalType: 'normal', meltingPoint: 318, boilingPoint: 1388, hazards: ['corrosive'] },
    { id: 'CH3COOH', name: '아세트산', formula: { C: 2, H: 4, O: 2 }, display: 'CH₃COOH', recipe: ['CH4', 'CO2'], desc: '식초의 신맛을 내는 성분이에요.', thermalType: 'normal', meltingPoint: 16.6, boilingPoint: 118.1, hazards: ['corrosive'] },
    { id: 'C2H6', name: '에탄', formula: { C: 2, H: 6 }, display: 'C₂H₆', recipe: ['CH4', 'CH2'], desc: '천연가스에 섞여 있는 기체예요.', thermalType: 'normal', meltingPoint: -182.8, boilingPoint: -88.5, hazards: ['flammable'] },
    { id: 'N2', name: '질소 기체', formula: { N: 2 }, display: 'N₂', recipe: ['N', 'N'], desc: '공기의 대부분을 차지하는 기체예요.', thermalType: 'normal', meltingPoint: -210.0, boilingPoint: -195.8, hazards: [] }
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
      'screen-round-summary': document.getElementById('screen-round-summary'),
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
    scoreValue: document.getElementById('score-value'),
    discoveredBadgeValue: document.getElementById('discovered-badge-value'),
    totalCountValue: document.getElementById('total-count-value'),
    comboChip: document.getElementById('combo-chip'),
    comboValue: document.getElementById('combo-value'),
    badgeStrip: document.getElementById('badge-strip'),
    nextTargetStrip: document.getElementById('next-target-strip'),
    boardGrid: document.getElementById('board-grid'),
    boardBg: document.getElementById('board-bg'),
    boardLayer: document.getElementById('board-layer'),
    statusToast: document.getElementById('status-toast'),
    summaryDesc: document.getElementById('summary-desc'),
    summaryDiscoveries: document.getElementById('summary-discoveries'),
    summaryScore: document.getElementById('summary-score'),
    summaryCombo: document.getElementById('summary-combo'),
    btnNextRound: document.getElementById('btn-next-round'),
    btnSummaryDex: document.getElementById('btn-summary-dex'),
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
    detailSymbol: document.getElementById('detail-symbol'),
    detailName: document.getElementById('detail-name'),
    detailRecipe: document.getElementById('detail-recipe'),
    detailThermal: document.getElementById('detail-thermal'),
    detailHazards: document.getElementById('detail-hazards'),
    detailFacts: document.getElementById('detail-facts'),
    detailDesc: document.getElementById('detail-desc')
  };

  var MAIN_SCREENS = ['screen-start', 'screen-game', 'screen-dex'];
  var OVERLAY_SCREENS = ['screen-confirm-reset', 'screen-round-summary', 'screen-complete'];

  var state = null;
  var lastMainScreen = 'screen-start';
  var dexReturnScreen = 'screen-start';
  var dexTab = 'element';
  var dexSort = { key: 'display', dir: 1 };
  var toastTimer = null;
  var comboToastTimer = null;
  var popupAutoCloseTimer = null;
  var cellSize = 80;
  var tileEls = new Map();
  var popupQueue = [];
  var popupActive = false;
  var pendingCompleteCelebration = false;
  var inputLocked = false;

  function showMain(id) {
    MAIN_SCREENS.forEach(function (s) {
      el.screens[s].classList.toggle('active', s === id);
    });
    OVERLAY_SCREENS.forEach(function (s) { el.screens[s].classList.remove('active'); });
    lastMainScreen = id;
  }
  function showOverlay(id) { el.screens[id].classList.add('active'); }
  function hideOverlay(id) { el.screens[id].classList.remove('active'); }

  function newState() {
    return {
      board: new Array(SIZE * SIZE).fill(null),
      nextUid: 1,
      score: 0,
      roundScore: 0,
      roundDiscoveries: 0,
      roundBestCombo: 0,
      discoveredElements: [],
      discoveredCompounds: [],
      claimedMilestones: [],
      completeCelebrationShown: false
    };
  }

  function hasSave() { return localStorage.getItem(SAVE_KEY) !== null; }

  function saveGame() {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function loadGame() {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      var s = newState();
      Object.keys(s).forEach(function (k) {
        if (data[k] !== undefined) s[k] = data[k];
      });
      return s;
    } catch (e) {
      return null;
    }
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

  var COMPOUND_LIST_FOR_LOOKUP = COMPOUNDS;
  function combineLookup(idA, idB) {
    var fa = getFormula(idA), fb = getFormula(idB);
    if (!fa || !fb) return null;
    var sum = sumFormula(fa, fb);
    for (var i = 0; i < COMPOUND_LIST_FOR_LOOKUP.length; i++) {
      if (sameFormula(COMPOUND_LIST_FOR_LOOKUP[i].formula, sum)) return COMPOUND_LIST_FOR_LOOKUP[i].id;
    }
    return null;
  }

  function compoundWeight(c) {
    var w = 0;
    Object.keys(c.formula).forEach(function (sym) {
      w += (ELEMENTS_BY_ID[sym] ? ELEMENTS_BY_ID[sym].mass : 0) * c.formula[sym];
    });
    return w;
  }

  function firstDiscoveryScore(compoundId) {
    var c = COMPOUNDS_BY_ID[compoundId];
    return Math.round(compoundWeight(c)) * 10;
  }

  var REPEAT_MERGE_SCORE = 5;

  // ---------- 보드 엔진 ----------
  function nextUid() { var u = state.nextUid; state.nextUid += 1; return u; }

  function unlockedElementPool() {
    return ELEMENTS.filter(function (e) { return state.discoveredElements.indexOf(e.id) !== -1; }).map(function (e) { return e.id; });
  }

  function emptyCellIndexes() {
    var arr = [];
    state.board.forEach(function (t, i) { if (!t) arr.push(i); });
    return arr;
  }

  function spawnRandomTile() {
    var empties = emptyCellIndexes();
    if (empties.length === 0) return null;
    var pool = unlockedElementPool();
    if (pool.length === 0) return null;
    var idx = empties[Math.floor(Math.random() * empties.length)];
    var speciesId = pool[Math.floor(Math.random() * pool.length)];
    var tile = { uid: nextUid(), speciesId: speciesId };
    state.board[idx] = tile;
    return { idx: idx, tile: tile };
  }

  function getLineCoords(dir, index) {
    var coords = [];
    for (var i = 0; i < SIZE; i++) {
      if (dir === 'left') coords.push({ row: index, col: i });
      else if (dir === 'right') coords.push({ row: index, col: SIZE - 1 - i });
      else if (dir === 'up') coords.push({ row: i, col: index });
      else if (dir === 'down') coords.push({ row: SIZE - 1 - i, col: index });
    }
    return coords;
  }

  function processLine(tiles) {
    var result = [];
    var lineMerges = [];
    var i = 0;
    while (i < tiles.length) {
      var cur = tiles[i];
      var next = tiles[i + 1];
      var matched = next ? combineLookup(cur.speciesId, next.speciesId) : null;
      if (matched) {
        var uid = nextUid();
        result.push({ uid: uid, speciesId: matched });
        lineMerges.push({ speciesId: matched, ingredientIds: [cur.speciesId, next.speciesId], uid: uid });
        i += 2;
      } else {
        result.push(cur);
        i += 1;
      }
    }
    while (result.length < SIZE) result.push(null);
    return { result: result, lineMerges: lineMerges };
  }

  function computeMove(dir) {
    var newBoard = state.board.slice();
    var merges = [];
    var changed = false;
    for (var idx = 0; idx < SIZE; idx++) {
      var coords = getLineCoords(dir, idx);
      var originalPadded = coords.map(function (c) { return state.board[c.row * SIZE + c.col]; });
      var tiles = originalPadded.filter(Boolean);
      var out = processLine(tiles);
      out.lineMerges.forEach(function (m) { merges.push(m); });
      coords.forEach(function (c, i) {
        newBoard[c.row * SIZE + c.col] = out.result[i] || null;
        var o = originalPadded[i];
        var n = out.result[i];
        var oKey = o ? o.uid : null;
        var nKey = n ? n.uid : null;
        var oSpecies = o ? o.speciesId : null;
        var nSpecies = n ? n.speciesId : null;
        if (oKey !== nKey || oSpecies !== nSpecies) changed = true;
      });
    }
    return { newBoard: newBoard, merges: merges, changed: changed };
  }

  function anyMergePossible() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var tile = state.board[r * SIZE + c];
        if (!tile) continue;
        if (c + 1 < SIZE) {
          var right = state.board[r * SIZE + c + 1];
          if (right && combineLookup(tile.speciesId, right.speciesId)) return true;
        }
        if (r + 1 < SIZE) {
          var down = state.board[(r + 1) * SIZE + c];
          if (down && combineLookup(tile.speciesId, down.speciesId)) return true;
        }
      }
    }
    return false;
  }

  function boardFull() { return state.board.every(function (t) { return t !== null; }); }

  // ---------- 렌더링 ----------
  function computeCellSize() {
    var rect = el.boardLayer.getBoundingClientRect();
    if (rect.width > 0) {
      cellSize = (rect.width - GAP_PX * (SIZE - 1)) / SIZE;
      el.boardLayer.style.setProperty('--cell-size', cellSize + 'px');
    }
  }

  function renderBoardBg() {
    var html = '';
    for (var i = 0; i < SIZE * SIZE; i++) html += '<div class="board-cell"></div>';
    el.boardBg.innerHTML = html;
  }

  function tileInnerHtml(kind, id) {
    if (kind === 'el') {
      var e = ELEMENTS_BY_ID[id];
      return '<span class="tile-symbol">' + e.id + '</span><span class="tile-name">' + e.name + '</span>';
    }
    var c = COMPOUNDS_BY_ID[id];
    return '<span class="tile-symbol">' + c.display + '</span><span class="tile-name">' + c.name + '</span>';
  }

  function tileCategoryClass(kind, id) {
    if (kind === 'el') return 'cat-' + ELEMENTS_BY_ID[id].category;
    return 'cat-compound';
  }

  function speciesKind(id) { return ELEMENTS_BY_ID[id] ? 'el' : 'cp'; }

  function createTileEl(tile) {
    var kind = speciesKind(tile.speciesId);
    var div = document.createElement('div');
    div.className = 'board-tile';
    div.dataset.uid = tile.uid;
    div.dataset.id = tile.speciesId;
    var inner = document.createElement('div');
    inner.className = 'tile-inner ' + tileCategoryClass(kind, tile.speciesId);
    inner.innerHTML = tileInnerHtml(kind, tile.speciesId);
    div.appendChild(inner);
    div.addEventListener('click', function () {
      showDetail(speciesKind(tile.speciesId), tile.speciesId, {});
    });
    return div;
  }

  function popTileEl(tileEl) {
    var inner = tileEl.querySelector('.tile-inner');
    if (inner) inner.classList.add('pop');
  }

  function positionTile(elNode, row, col) {
    var x = col * (cellSize + GAP_PX);
    var y = row * (cellSize + GAP_PX);
    elNode.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }

  function renderBoardFull() {
    computeCellSize();
    tileEls.forEach(function (elNode) { elNode.remove(); });
    tileEls.clear();
    state.board.forEach(function (tile, i) {
      if (!tile) return;
      var row = Math.floor(i / SIZE), col = i % SIZE;
      var tileEl = createTileEl(tile);
      el.boardLayer.appendChild(tileEl);
      positionTile(tileEl, row, col);
      tileEls.set(tile.uid, tileEl);
    });
  }

  function applyBoardUpdate(newBoard) {
    var newUids = {};
    newBoard.forEach(function (t) { if (t) newUids[t.uid] = true; });
    tileEls.forEach(function (elNode, uid) {
      if (!newUids[uid]) { elNode.remove(); tileEls.delete(uid); }
    });
    newBoard.forEach(function (tile, i) {
      if (!tile) return;
      var row = Math.floor(i / SIZE), col = i % SIZE;
      var tileEl = tileEls.get(tile.uid);
      if (!tileEl) {
        tileEl = createTileEl(tile);
        el.boardLayer.appendChild(tileEl);
        positionTile(tileEl, row, col);
        popTileEl(tileEl);
      } else {
        positionTile(tileEl, row, col);
      }
    });
    state.board = newBoard;
  }

  function spawnTileWithAnimation() {
    var spawned = spawnRandomTile();
    if (!spawned) return;
    var row = Math.floor(spawned.idx / SIZE), col = spawned.idx % SIZE;
    var tileEl = createTileEl(spawned.tile);
    el.boardLayer.appendChild(tileEl);
    positionTile(tileEl, row, col);
    popTileEl(tileEl);
    tileEls.set(spawned.tile.uid, tileEl);
  }

  function renderHud() {
    el.scoreValue.textContent = state.score;
    var total = state.discoveredElements.length + state.discoveredCompounds.length;
    el.discoveredBadgeValue.textContent = total;
    el.totalCountValue.textContent = TOTAL_COUNT;
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
        if (claimed) {
          showToast('🏅 ' + m.title + ' 달성!');
        } else {
          showToast('🔒 ' + m.title + ' (화합물 ' + m.countRequired + '종 발견 시 해금)');
        }
      });
    });
  }

  function getRecommendedTargets(limit) {
    var candidates = [];
    COMPOUNDS.forEach(function (c) {
      if (isUnlocked(c.id)) return;
      var a = c.recipe[0], b = c.recipe[1];
      if (isUnlocked(a) && isUnlocked(b)) candidates.push(c);
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
    var html = targets.map(function (c) {
      return '<div class="target-chip">🎯 ' + c.name + ' (' + c.display + ')</div>';
    }).join('');
    el.nextTargetStrip.innerHTML = html || '<div class="target-chip">🔬 새 원소를 더 모아보세요</div>';
  }

  // ---------- 토스트 / 팝업 ----------
  function showToast(text) {
    if (toastTimer) clearTimeout(toastTimer);
    el.statusToast.textContent = text;
    el.statusToast.classList.add('show');
    toastTimer = setTimeout(function () { el.statusToast.classList.remove('show'); }, 1800);
  }

  function showCombo(count) {
    el.comboValue.textContent = count;
    el.comboChip.style.display = '';
    el.comboChip.classList.remove('combo-chip');
    void el.comboChip.offsetWidth;
    el.comboChip.classList.add('combo-chip');
    clearTimeout(comboToastTimer);
    comboToastTimer = setTimeout(function () { el.comboChip.style.display = 'none'; }, 1600);
  }

  function shakeBoard() {
    el.boardGrid.classList.remove('shake');
    void el.boardGrid.offsetWidth;
    el.boardGrid.classList.add('shake');
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
      el.detailThermal.innerHTML = '<p class="thermal-caption">🔥 ' + c.meltingPoint + '°C 근처에서 녹지 않고 분해돼요.</p>' +
        '<span class="thermal-state-chip">실온에서: ' + thermalStateAt25(c) + '</span>';
      return;
    }
    if (c.thermalType === 'sublimes') {
      el.detailThermal.style.display = '';
      el.detailThermal.innerHTML = '<p class="thermal-caption">❄️ ' + c.meltingPoint + '°C에서 액체를 거치지 않고 고체 ↔ 기체로 승화해요.</p>' +
        '<span class="thermal-state-chip">실온에서: ' + thermalStateAt25(c) + '</span>';
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
    if (kind === 'el') {
      var e = ELEMENTS_BY_ID[id];
      el.detailSymbol.textContent = e.id;
      el.detailName.textContent = e.name;
      el.detailRecipe.style.display = 'none';
      el.detailThermal.style.display = 'none';
      el.detailHazards.style.display = 'none';
      el.detailFacts.innerHTML =
        '<div class="detail-fact"><span class="detail-fact-num">' + e.atomicNumber + '</span><span class="detail-fact-label">원자번호</span></div>' +
        '<div class="detail-fact"><span class="detail-fact-num">' + e.mass.toFixed(1) + '</span><span class="detail-fact-label">원자량</span></div>';
      el.detailDesc.textContent = e.desc;
    } else {
      var c = COMPOUNDS_BY_ID[id];
      var ingredientNames = c.recipe.map(function (rid) {
        var ie = ELEMENTS_BY_ID[rid] || COMPOUNDS_BY_ID[rid];
        return ie.name + '(' + (ELEMENTS_BY_ID[rid] ? ie.id : ie.display) + ')';
      });
      el.detailSymbol.textContent = c.display;
      el.detailName.textContent = c.name;
      el.detailRecipe.style.display = '';
      el.detailRecipe.textContent = ingredientNames[0] + ' + ' + ingredientNames[1] + ' = ' + c.name;
      renderThermal(c);
      renderHazards(c);
      var elementCount = Object.keys(c.formula).length;
      var atomCount = Object.keys(c.formula).reduce(function (sum, k) { return sum + c.formula[k]; }, 0);
      el.detailFacts.innerHTML =
        '<div class="detail-fact"><span class="detail-fact-num">' + elementCount + '</span><span class="detail-fact-label">구성 원소 수</span></div>' +
        '<div class="detail-fact"><span class="detail-fact-num">' + atomCount + '</span><span class="detail-fact-label">총 원자 수</span></div>' +
        '<div class="detail-fact"><span class="detail-fact-num">' + firstDiscoveryScore(c.id) + '</span><span class="detail-fact-label">발견 점수</span></div>';
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
    }, 2100);
  }

  function afterPopupsResolved() {
    inputLocked = false;
    if (pendingCompleteCelebration) {
      pendingCompleteCelebration = false;
      state.completeCelebrationShown = true;
      saveGame();
      showOverlay('screen-complete');
      return;
    }
    checkRoundEnd();
  }

  // ---------- 마일스톤 ----------
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

  // ---------- 이동 처리 ----------
  function handleMove(dir) {
    if (inputLocked) return;
    var moveResult = computeMove(dir);
    if (!moveResult.changed) { shakeBoard(); return; }
    inputLocked = true;
    applyBoardUpdate(moveResult.newBoard);

    setTimeout(function () {
      spawnTileWithAnimation();

      var moveScore = 0;
      var comboCount = moveResult.merges.length;
      moveResult.merges.forEach(function (m) {
        if (state.discoveredCompounds.indexOf(m.speciesId) === -1) {
          state.discoveredCompounds.push(m.speciesId);
          state.roundDiscoveries += 1;
          var gained = firstDiscoveryScore(m.speciesId);
          moveScore += gained;
          queueDiscoveryPopup(m.speciesId);
          if (state.discoveredCompounds.length >= COMPOUNDS.length && !state.completeCelebrationShown) {
            pendingCompleteCelebration = true;
          }
        } else {
          moveScore += REPEAT_MERGE_SCORE;
        }
      });
      if (comboCount >= 2) {
        moveScore += (comboCount - 1) * 20;
        showCombo(comboCount);
        if (comboCount > state.roundBestCombo) state.roundBestCombo = comboCount;
      }
      state.score += moveScore;
      state.roundScore += moveScore;

      checkMilestones();
      renderHud();
      saveGame();

      if (popupQueue.length > 0 || popupActive) {
        processPopupQueue();
      } else {
        inputLocked = false;
        checkRoundEnd();
      }
    }, 160);
  }

  function checkRoundEnd() {
    if (boardFull() && !anyMergePossible()) {
      el.summaryDiscoveries.textContent = state.roundDiscoveries;
      el.summaryScore.textContent = state.roundScore;
      el.summaryCombo.textContent = state.roundBestCombo;
      saveGame();
      showOverlay('screen-round-summary');
    }
  }

  // ---------- 라운드/게임 시작 ----------
  function startRound() {
    state.board = new Array(SIZE * SIZE).fill(null);
    state.roundScore = 0;
    state.roundDiscoveries = 0;
    state.roundBestCombo = 0;
    tileEls.forEach(function (n) { n.remove(); });
    tileEls.clear();
    showMain('screen-game');
    computeCellSize();
    spawnTileWithAnimation();
    spawnTileWithAnimation();
    saveGame();
    renderHud();
  }

  function startGame() {
    state = newState();
    START_ELEMENTS.forEach(function (eid) { state.discoveredElements.push(eid); });
    startRound();
  }

  function continueGame() {
    var loaded = loadGame();
    state = loaded || newState();
    showMain('screen-game');
    renderHud();
    renderBoardFull();
  }

  function refreshStartScreen() {
    if (hasSave()) {
      var loaded = loadGame();
      var total = loaded.discoveredElements.length + loaded.discoveredCompounds.length;
      el.saveDesc.textContent = '점수 ' + loaded.score + '점 · 발견 ' + total + ' / ' + TOTAL_COUNT + ' 진행 중';
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
        var unlocked = discoveredEls.indexOf(e.id) !== -1;
        if (unlocked) {
          html += '<div class="dex-tile cat-' + e.category + '" data-kind="el" data-id="' + e.id + '">' +
            '<span class="tile-symbol">' + e.id + '</span><span class="tile-name">' + e.name + '</span></div>';
        } else {
          html += '<div class="dex-tile locked"><span class="tile-symbol">?</span><span class="tile-name">???</span></div>';
        }
      });
    } else {
      COMPOUNDS.forEach(function (c) {
        var unlocked = discoveredCps.indexOf(c.id) !== -1;
        if (unlocked) {
          html += '<div class="dex-tile cat-compound" data-kind="cp" data-id="' + c.id + '">' +
            '<span class="tile-symbol">' + c.display + '</span><span class="tile-name">' + c.name + '</span></div>';
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
      return {
        id: c.id,
        display: unlocked ? c.display : '?',
        name: unlocked ? c.name : '???',
        state: unlocked ? (thermalStateAt25(c) || '-') : '???',
        score: unlocked ? firstDiscoveryScore(c.id) : 0,
        unlocked: unlocked
      };
    });
    rows.sort(function (a, b) {
      var av = a[dexSort.key], bv = b[dexSort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dexSort.dir;
      return String(av).localeCompare(String(bv), 'ko') * dexSort.dir;
    });
    el.dexTableBody.innerHTML = rows.map(function (r) {
      return '<tr class="' + (r.unlocked ? '' : 'locked-row') + '"' + (r.unlocked ? ' data-id="' + r.id + '"' : '') + '>' +
        '<td>' + r.display + '</td><td>' + r.name + '</td><td>' + r.state + '</td><td>' + r.score + '</td></tr>';
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

  // ---------- 입력 처리 ----------
  var touchStartX = 0, touchStartY = 0, touchActive = false;
  var SWIPE_THRESHOLD = 24;

  function bindSwipe() {
    el.boardGrid.addEventListener('touchstart', function (ev) {
      if (ev.touches.length !== 1) return;
      touchStartX = ev.touches[0].clientX;
      touchStartY = ev.touches[0].clientY;
      touchActive = true;
    }, { passive: true });

    el.boardGrid.addEventListener('touchend', function (ev) {
      if (!touchActive) return;
      touchActive = false;
      var dx = ev.changedTouches[0].clientX - touchStartX;
      var dy = ev.changedTouches[0].clientY - touchStartY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? 'right' : 'left');
      else handleMove(dy > 0 ? 'down' : 'up');
    }, { passive: true });
  }

  function bindKeyboard() {
    window.addEventListener('keydown', function (ev) {
      if (!el.screens['screen-game'].classList.contains('active')) return;
      var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      var dir = map[ev.key];
      if (!dir) return;
      ev.preventDefault();
      handleMove(dir);
    });
  }

  function bindDpad() {
    document.querySelectorAll('.dpad-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { handleMove(btn.getAttribute('data-dir')); });
    });
  }

  function bindEvents() {
    el.btnStart.addEventListener('click', function () {
      if (hasSave()) showOverlay('screen-confirm-reset'); else startGame();
    });
    el.btnContinue.addEventListener('click', continueGame);
    el.btnDexPreview.addEventListener('click', openDex);

    el.btnConfirmReset.addEventListener('click', function () { hideOverlay('screen-confirm-reset'); startGame(); });
    el.btnCancelReset.addEventListener('click', function () { hideOverlay('screen-confirm-reset'); });

    el.btnGameHome.addEventListener('click', function () {
      saveGame();
      refreshStartScreen();
      showMain('screen-start');
    });
    el.btnOpenDex.addEventListener('click', openDex);

    el.btnNextRound.addEventListener('click', startRound);
    el.btnSummaryDex.addEventListener('click', function () { hideOverlay('screen-round-summary'); openDex(); });

    el.btnCompleteContinue.addEventListener('click', function () { hideOverlay('screen-complete'); startRound(); });
    el.btnCompleteDex.addEventListener('click', function () { hideOverlay('screen-complete'); openDex(); });

    el.btnDexBack.addEventListener('click', function () { showMain(dexReturnScreen); });

    el.dexTabs.forEach(function (t) {
      t.addEventListener('click', function () { dexTab = t.getAttribute('data-tab'); renderDex(); });
    });

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
    el.detailModal.addEventListener('click', function (ev) {
      if (ev.target === el.detailModal) el.btnDetailClose.click();
    });

    bindSwipe();
    bindKeyboard();
    bindDpad();

    window.addEventListener('resize', function () {
      if (el.screens['screen-game'].classList.contains('active')) {
        computeCellSize();
        state.board.forEach(function (tile, i) {
          if (!tile) return;
          var tileEl = tileEls.get(tile.uid);
          if (tileEl) positionTile(tileEl, Math.floor(i / SIZE), i % SIZE);
        });
      }
    });
  }

  function init() {
    renderBoardBg();
    bindEvents();
    refreshStartScreen();
    showMain('screen-start');
  }

  init();
})();
