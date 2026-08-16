(function () {
  'use strict';

  var SAVE_KEY = 'chemical-lab-save-v1';

  var ELEMENTS = [
    { id: 'H', name: '수소', atomicNumber: 1, mass: '1.0', category: 'nonmetal', desc: '우주에서 가장 많고 가장 가벼운 원소예요.' },
    { id: 'C', name: '탄소', atomicNumber: 6, mass: '12.0', category: 'nonmetal', desc: '생명체를 이루는 기본 원소예요.' },
    { id: 'N', name: '질소', atomicNumber: 7, mass: '14.0', category: 'nonmetal', desc: '공기의 78%를 차지해요.' },
    { id: 'O', name: '산소', atomicNumber: 8, mass: '16.0', category: 'nonmetal', desc: '우리가 숨 쉬는 데 꼭 필요해요.' },
    { id: 'Na', name: '나트륨', atomicNumber: 11, mass: '23.0', category: 'alkali', desc: '물과 만나면 격렬하게 반응해요.' },
    { id: 'Mg', name: '마그네슘', atomicNumber: 12, mass: '24.3', category: 'alkaline-earth', desc: '불꽃놀이에서 밝은 빛을 내요.' },
    { id: 'Cl', name: '염소', atomicNumber: 17, mass: '35.5', category: 'halogen', desc: '소독약에서 나는 매운 냄새의 주인공이에요.' },
    { id: 'Ca', name: '칼슘', atomicNumber: 20, mass: '40.1', category: 'alkaline-earth', desc: '뼈와 이를 튼튼하게 만들어줘요.' }
  ];

  var COMPOUNDS = [
    { id: 'H2', name: '수소 기체', formula: { H: 2 }, display: 'H₂', recipe: ['H', 'H'], desc: '가장 가벼운 기체예요. 로켓 연료로도 쓰여요.' },
    { id: 'O2', name: '산소 기체', formula: { O: 2 }, display: 'O₂', recipe: ['O', 'O'], desc: '우리가 숨 쉬는 공기 속 기체예요.' },
    { id: 'H2O', name: '물', formula: { H: 2, O: 1 }, display: 'H₂O', recipe: ['H2', 'O'], desc: '생명에 꼭 필요한 액체예요.' },
    { id: 'NaCl', name: '소금', formula: { Na: 1, Cl: 1 }, display: 'NaCl', recipe: ['Na', 'Cl'], desc: '음식에 넣어 먹는 짠맛의 정체예요.' },
    { id: 'Cl2', name: '염소 기체', formula: { Cl: 2 }, display: 'Cl₂', recipe: ['Cl', 'Cl'], desc: '수영장 소독에 사용돼요.' },
    { id: 'HCl', name: '염화수소', formula: { H: 1, Cl: 1 }, display: 'HCl', recipe: ['H', 'Cl'], desc: '물에 녹으면 위산의 주성분이 돼요.' },
    { id: 'CO2', name: '이산화탄소', formula: { C: 1, O: 2 }, display: 'CO₂', recipe: ['C', 'O2'], desc: '우리가 숨을 내쉴 때 나오는 기체예요.' },
    { id: 'NH2', name: '아미노기', formula: { N: 1, H: 2 }, display: 'NH₂', recipe: ['N', 'H2'], desc: '암모니아가 되기 전 중간 조각이에요.' },
    { id: 'NH3', name: '암모니아', formula: { N: 1, H: 3 }, display: 'NH₃', recipe: ['NH2', 'H'], desc: '톡 쏘는 냄새가 나는 기체예요. 비료의 재료예요.' },
    { id: 'CH2', name: '메틸렌', formula: { C: 1, H: 2 }, display: 'CH₂', recipe: ['C', 'H2'], desc: '메탄이 되기 전 중간 조각이에요.' },
    { id: 'CH4', name: '메탄', formula: { C: 1, H: 4 }, display: 'CH₄', recipe: ['CH2', 'H2'], desc: '천연가스의 주성분이에요.' },
    { id: 'CaO', name: '산화칼슘', formula: { Ca: 1, O: 1 }, display: 'CaO', recipe: ['Ca', 'O'], desc: '생석회라고도 불러요.' },
    { id: 'CaCl2', name: '염화칼슘', formula: { Ca: 1, Cl: 2 }, display: 'CaCl₂', recipe: ['Ca', 'Cl2'], desc: '겨울철 제설제로 사용돼요.' },
    { id: 'CaCO3', name: '탄산칼슘', formula: { Ca: 1, C: 1, O: 3 }, display: 'CaCO₃', recipe: ['CaO', 'CO2'], desc: '석회석과 조개껍데기의 주성분이에요.' },
    { id: 'MgO', name: '산화마그네슘', formula: { Mg: 1, O: 1 }, display: 'MgO', recipe: ['Mg', 'O'], desc: '제산제와 내화벽돌에 사용돼요.' },
    { id: 'MgCl2', name: '염화마그네슘', formula: { Mg: 1, Cl: 2 }, display: 'MgCl₂', recipe: ['Mg', 'Cl2'], desc: '간수의 주성분이에요.' },
    { id: 'MgOH2', name: '수산화마그네슘', formula: { Mg: 1, O: 2, H: 2 }, display: 'Mg(OH)₂', recipe: ['MgO', 'H2O'], desc: '제산제(마그밀)의 주성분이에요.' },
    { id: 'OH', name: '수산화기', formula: { O: 1, H: 1 }, display: 'OH', recipe: ['H', 'O'], desc: '다양한 화합물을 만드는 중간 조각이에요.' },
    { id: 'NaOH', name: '수산화나트륨', formula: { Na: 1, O: 1, H: 1 }, display: 'NaOH', recipe: ['Na', 'OH'], desc: '비누를 만들 때 사용되는 강한 염기예요.' },
    { id: 'CH3COOH', name: '아세트산', formula: { C: 2, H: 4, O: 2 }, display: 'CH₃COOH', recipe: ['CH4', 'CO2'], desc: '식초의 신맛을 내는 성분이에요.' },
    { id: 'C2H6', name: '에탄', formula: { C: 2, H: 6 }, display: 'C₂H₆', recipe: ['CH4', 'CH2'], desc: '천연가스에 섞여 있는 기체예요.' },
    { id: 'N2', name: '질소 기체', formula: { N: 2 }, display: 'N₂', recipe: ['N', 'N'], desc: '공기의 대부분을 차지하는 기체예요.' }
  ];

  var STAGES = [
    { id: 1, title: '1단계 · 물 만들기', unlock: ['H', 'O'], target: 'H2O', bonus: ['H2', 'O2'] },
    { id: 2, title: '2단계 · 소금 만들기', unlock: ['Na', 'Cl'], target: 'NaCl', bonus: ['Cl2', 'HCl'] },
    { id: 3, title: '3단계 · 공기 속 기체', unlock: ['C', 'N'], target: 'CO2', bonus: ['NH3', 'CH4'] },
    { id: 4, title: '4단계 · 칼슘 화합물', unlock: ['Ca'], target: 'CaO', bonus: ['CaCl2', 'CaCO3'] },
    { id: 5, title: '5단계 · 마그네슘 화합물', unlock: ['Mg'], target: 'MgO', bonus: ['MgCl2', 'MgOH2'] },
    { id: 6, title: '6단계 · 최종 합성', unlock: [], target: 'NaOH', bonus: ['CH3COOH', 'C2H6'] }
  ];

  var TOTAL_COUNT = ELEMENTS.length + COMPOUNDS.length;
  var MAX_HINTS = 5;

  var ELEMENTS_BY_ID = {};
  ELEMENTS.forEach(function (e) { ELEMENTS_BY_ID[e.id] = e; });
  var COMPOUNDS_BY_ID = {};
  COMPOUNDS.forEach(function (c) { COMPOUNDS_BY_ID[c.id] = c; });
  var TARGET_IDS = {};
  STAGES.forEach(function (s) { TARGET_IDS[s.target] = true; });

  var el = {
    screens: {
      'screen-start': document.getElementById('screen-start'),
      'screen-confirm-reset': document.getElementById('screen-confirm-reset'),
      'screen-game': document.getElementById('screen-game'),
      'screen-stageclear': document.getElementById('screen-stageclear'),
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
    stageTitle: document.getElementById('stage-title'),
    goalMain: document.getElementById('goal-main'),
    goalMainCheck: document.getElementById('goal-main-check'),
    goalMainLabel: document.getElementById('goal-main-label'),
    goalBonus1: document.getElementById('goal-bonus-1'),
    goalBonus1Check: document.getElementById('goal-bonus-1-check'),
    goalBonus1Label: document.getElementById('goal-bonus-1-label'),
    goalBonus2: document.getElementById('goal-bonus-2'),
    goalBonus2Check: document.getElementById('goal-bonus-2-check'),
    goalBonus2Label: document.getElementById('goal-bonus-2-label'),
    btnHint: document.getElementById('btn-hint'),
    hintCount: document.getElementById('hint-count'),
    discoveredBadge: document.getElementById('discovered-badge'),
    tileGrid: document.getElementById('tile-grid'),
    combineToast: document.getElementById('combine-toast'),
    stageclearTitle: document.getElementById('stageclear-title'),
    stageclearDesc: document.getElementById('stageclear-desc'),
    stageclearBonus: document.getElementById('stageclear-bonus'),
    btnNextStage: document.getElementById('btn-next-stage'),
    btnViewDex: document.getElementById('btn-view-dex'),
    btnCompleteHome: document.getElementById('btn-complete-home'),
    btnDexBack: document.getElementById('btn-dex-back'),
    dexTabs: document.querySelectorAll('.dex-tab'),
    dexGrid: document.getElementById('dex-grid'),
    detailModal: document.getElementById('detail-modal'),
    btnDetailClose: document.getElementById('btn-detail-close'),
    detailSymbol: document.getElementById('detail-symbol'),
    detailName: document.getElementById('detail-name'),
    detailFormula: document.getElementById('detail-formula'),
    detailFacts: document.getElementById('detail-facts'),
    detailDesc: document.getElementById('detail-desc')
  };

  var MAIN_SCREENS = ['screen-start', 'screen-game', 'screen-dex'];
  var OVERLAY_SCREENS = ['screen-confirm-reset', 'screen-stageclear', 'screen-complete'];

  var state = null;
  var lastMainScreen = 'screen-start';
  var dexReturnScreen = 'screen-start';
  var dexTab = 'element';
  var toastTimer = null;

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
      stageIndex: 0,
      discoveredElements: [],
      discoveredCompounds: [],
      hintsLeft: MAX_HINTS,
      selectedId: null
    };
  }

  function hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  function saveGame() {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      stageIndex: state.stageIndex,
      discoveredElements: state.discoveredElements,
      discoveredCompounds: state.discoveredCompounds,
      hintsLeft: state.hintsLeft
    }));
  }

  function loadGame() {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      var s = newState();
      s.stageIndex = data.stageIndex || 0;
      s.discoveredElements = data.discoveredElements || [];
      s.discoveredCompounds = data.discoveredCompounds || [];
      s.hintsLeft = typeof data.hintsLeft === 'number' ? data.hintsLeft : MAX_HINTS;
      return s;
    } catch (e) {
      return null;
    }
  }

  function currentStage() { return STAGES[state.stageIndex]; }

  function isDiscovered(id) {
    if (ELEMENTS_BY_ID[id]) return state.discoveredElements.indexOf(id) !== -1;
    if (COMPOUNDS_BY_ID[id]) return state.discoveredCompounds.indexOf(id) !== -1;
    return false;
  }

  function unlockElements(ids) {
    ids.forEach(function (id) {
      if (state.discoveredElements.indexOf(id) === -1) state.discoveredElements.push(id);
    });
  }

  function discoverCompound(id) {
    if (state.discoveredCompounds.indexOf(id) === -1) state.discoveredCompounds.push(id);
  }

  function getFormula(id) {
    if (ELEMENTS_BY_ID[id]) {
      var f = {};
      f[id] = 1;
      return f;
    }
    var c = COMPOUNDS_BY_ID[id];
    return c ? c.formula : null;
  }

  function sameFormula(a, b) {
    var keysA = Object.keys(a), keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (var i = 0; i < keysA.length; i++) {
      if (a[keysA[i]] !== b[keysA[i]]) return false;
    }
    return true;
  }

  function sumFormula(a, b) {
    var sum = {};
    Object.keys(a).forEach(function (k) { sum[k] = (sum[k] || 0) + a[k]; });
    Object.keys(b).forEach(function (k) { sum[k] = (sum[k] || 0) + b[k]; });
    return sum;
  }

  function findCompoundByFormula(formula) {
    for (var i = 0; i < COMPOUNDS.length; i++) {
      if (sameFormula(COMPOUNDS[i].formula, formula)) return COMPOUNDS[i];
    }
    return null;
  }

  function showToast(text, isMiss) {
    if (toastTimer) clearTimeout(toastTimer);
    el.combineToast.textContent = text;
    el.combineToast.classList.toggle('miss', !!isMiss);
    el.combineToast.classList.add('show');
    toastTimer = setTimeout(function () {
      el.combineToast.classList.remove('show');
    }, 1800);
  }

  function shakeTiles(ids) {
    ids.forEach(function (id) {
      var node = el.tileGrid.querySelector('[data-id="' + cssEscape(id) + '"]');
      if (!node) return;
      node.classList.remove('shake');
      void node.offsetWidth;
      node.classList.add('shake');
    });
  }

  function cssEscape(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function attemptCombine(idA, idB) {
    var fa = getFormula(idA), fb = getFormula(idB);
    if (!fa || !fb) return;
    var sum = sumFormula(fa, fb);
    var match = findCompoundByFormula(sum);

    if (!match) {
      showToast('그 조합으로는 아무것도 만들 수 없어요', true);
      shakeTiles([idA, idB]);
      return;
    }

    if (isDiscovered(match.id)) {
      showToast('이미 만든 화합물이에요: ' + match.name);
      return;
    }

    discoverCompound(match.id);
    saveGame();
    showToast('🎉 발견! ' + match.name + ' (' + match.display + ')');
    renderGame(match.id);

    var stage = currentStage();
    if (match.id === stage.target) {
      setTimeout(function () { openStageClear(stage); }, 1000);
    }
  }

  function onTileTap(id) {
    if (state.selectedId === null) {
      state.selectedId = id;
      renderSelection();
      return;
    }
    var a = state.selectedId;
    state.selectedId = null;
    renderSelection();
    attemptCombine(a, id);
  }

  function renderSelection() {
    var nodes = el.tileGrid.querySelectorAll('.tile');
    nodes.forEach(function (n) {
      n.classList.toggle('selected', n.getAttribute('data-id') === state.selectedId);
    });
  }

  function tileHtml(kind, id, isNew) {
    if (kind === 'el') {
      var e = ELEMENTS_BY_ID[id];
      return '<div class="tile cat-' + e.category + (isNew ? ' new-discovery' : '') + '" data-id="' + id + '" data-kind="el">' +
        '<span class="tile-num">' + e.atomicNumber + '</span>' +
        '<span class="tile-symbol">' + e.id + '</span>' +
        '<span class="tile-name">' + e.name + '</span></div>';
    }
    var c = COMPOUNDS_BY_ID[id];
    var catClass = TARGET_IDS[c.id] ? 'cat-compound-target' : 'cat-compound';
    return '<div class="tile ' + catClass + (isNew ? ' new-discovery' : '') + '" data-id="' + id + '" data-kind="cp">' +
      '<span class="tile-symbol">' + c.display + '</span>' +
      '<span class="tile-name">' + c.name + '</span></div>';
  }

  function renderGame(newlyDiscoveredId) {
    var stage = currentStage();
    el.stageTitle.textContent = stage.title;

    var target = COMPOUNDS_BY_ID[stage.target];
    var bonus1 = COMPOUNDS_BY_ID[stage.bonus[0]];
    var bonus2 = COMPOUNDS_BY_ID[stage.bonus[1]];

    el.goalMainLabel.textContent = '목표: ' + target.name + ' (' + target.display + ')';
    var mainDone = isDiscovered(target.id);
    el.goalMain.classList.toggle('done', mainDone);
    el.goalMainCheck.textContent = mainDone ? '☑' : '☐';

    el.goalBonus1Label.textContent = '추가: ' + bonus1.name + ' (' + bonus1.display + ')';
    var b1Done = isDiscovered(bonus1.id);
    el.goalBonus1.classList.toggle('done', b1Done);
    el.goalBonus1Check.textContent = b1Done ? '☑' : '☐';

    el.goalBonus2Label.textContent = '추가: ' + bonus2.name + ' (' + bonus2.display + ')';
    var b2Done = isDiscovered(bonus2.id);
    el.goalBonus2.classList.toggle('done', b2Done);
    el.goalBonus2Check.textContent = b2Done ? '☑' : '☐';

    el.hintCount.textContent = state.hintsLeft;
    el.btnHint.disabled = state.hintsLeft <= 0;

    var total = state.discoveredElements.length + state.discoveredCompounds.length;
    el.discoveredBadge.textContent = '발견 ' + total + ' / ' + TOTAL_COUNT;

    var html = '';
    ELEMENTS.forEach(function (e) {
      if (state.discoveredElements.indexOf(e.id) !== -1) {
        html += tileHtml('el', e.id, e.id === newlyDiscoveredId);
      }
    });
    COMPOUNDS.forEach(function (c) {
      if (state.discoveredCompounds.indexOf(c.id) !== -1) {
        html += tileHtml('cp', c.id, c.id === newlyDiscoveredId);
      }
    });
    el.tileGrid.innerHTML = html;

    var nodes = el.tileGrid.querySelectorAll('.tile');
    nodes.forEach(function (n) {
      n.addEventListener('click', function () { onTileTap(n.getAttribute('data-id')); });
    });
  }

  function openStageClear(stage) {
    var target = COMPOUNDS_BY_ID[stage.target];
    el.stageclearTitle.textContent = stage.title.split(' · ')[0] + ' 클리어!';
    el.stageclearDesc.textContent = target.name + '(' + target.display + ')을 합성했어요!';
    var bonusDone = isDiscovered(stage.bonus[0]) && isDiscovered(stage.bonus[1]);
    el.stageclearBonus.style.display = bonusDone ? '' : 'none';
    showOverlay('screen-stageclear');
  }

  function goNextStage() {
    hideOverlay('screen-stageclear');
    if (state.stageIndex >= STAGES.length - 1) {
      saveGame();
      showOverlay('screen-complete');
      return;
    }
    state.stageIndex += 1;
    unlockElements(currentStage().unlock);
    saveGame();
    renderGame();
  }

  function useHint() {
    if (state.hintsLeft <= 0) return;
    var stage = currentStage();
    var found = findHintRecipe(stage.target);
    if (!found) {
      showToast('힌트를 찾을 수 없어요');
      return;
    }
    state.hintsLeft -= 1;
    saveGame();
    el.hintCount.textContent = state.hintsLeft;
    el.btnHint.disabled = state.hintsLeft <= 0;

    var nameA = (ELEMENTS_BY_ID[found.a] || COMPOUNDS_BY_ID[found.a]).name;
    var nameB = (ELEMENTS_BY_ID[found.b] || COMPOUNDS_BY_ID[found.b]).name;
    var targetName = (ELEMENTS_BY_ID[found.targetId] || COMPOUNDS_BY_ID[found.targetId]).name;
    showToast('힌트: ' + nameA + ' + ' + nameB + ' → ' + targetName);

    [found.a, found.b].forEach(function (id) {
      var node = el.tileGrid.querySelector('[data-id="' + cssEscape(id) + '"]');
      if (node) {
        node.classList.add('selected');
        setTimeout(function () { node.classList.remove('selected'); }, 2200);
      }
    });
  }

  function findHintRecipe(compoundId) {
    var c = COMPOUNDS_BY_ID[compoundId];
    if (!c) return null;
    var a = c.recipe[0], b = c.recipe[1];
    var aReady = isDiscovered(a), bReady = isDiscovered(b);
    if (aReady && bReady) return { targetId: compoundId, a: a, b: b };
    if (!aReady && COMPOUNDS_BY_ID[a]) {
      var sub = findHintRecipe(a);
      if (sub) return sub;
    }
    if (!bReady && COMPOUNDS_BY_ID[b]) {
      var sub2 = findHintRecipe(b);
      if (sub2) return sub2;
    }
    return null;
  }

  function startGame() {
    state = newState();
    unlockElements(STAGES[0].unlock);
    saveGame();
    showMain('screen-game');
    renderGame();
  }

  function continueGame() {
    var loaded = loadGame();
    state = loaded || newState();
    showMain('screen-game');
    renderGame();
  }

  function refreshStartScreen() {
    if (hasSave()) {
      var loaded = loadGame();
      var total = loaded.discoveredElements.length + loaded.discoveredCompounds.length;
      var stageTitle = STAGES[loaded.stageIndex] ? STAGES[loaded.stageIndex].title : STAGES[0].title;
      el.saveDesc.textContent = stageTitle + ' 진행 중 (발견 ' + total + ' / ' + TOTAL_COUNT + ')';
      el.saveInfo.style.display = '';
      el.btnContinue.style.display = '';
    } else {
      el.saveInfo.style.display = 'none';
      el.btnContinue.style.display = 'none';
    }
  }

  function renderDex() {
    el.dexTabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === dexTab);
    });

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
      n.addEventListener('click', function () {
        showDetail(n.getAttribute('data-kind'), n.getAttribute('data-id'));
      });
    });
  }

  function showDetail(kind, id) {
    if (kind === 'el') {
      var e = ELEMENTS_BY_ID[id];
      el.detailSymbol.textContent = e.id;
      el.detailName.textContent = e.name;
      el.detailFormula.textContent = '원소';
      el.detailFacts.innerHTML =
        '<div class="detail-fact"><span class="detail-fact-num">' + e.atomicNumber + '</span><span class="detail-fact-label">원자번호</span></div>' +
        '<div class="detail-fact"><span class="detail-fact-num">' + e.mass + '</span><span class="detail-fact-label">원자량</span></div>';
      el.detailDesc.textContent = e.desc;
    } else {
      var c = COMPOUNDS_BY_ID[id];
      var elementCount = Object.keys(c.formula).length;
      var atomCount = Object.keys(c.formula).reduce(function (sum, k) { return sum + c.formula[k]; }, 0);
      el.detailSymbol.textContent = c.display;
      el.detailName.textContent = c.name;
      el.detailFormula.textContent = c.id;
      el.detailFacts.innerHTML =
        '<div class="detail-fact"><span class="detail-fact-num">' + elementCount + '</span><span class="detail-fact-label">구성 원소 수</span></div>' +
        '<div class="detail-fact"><span class="detail-fact-num">' + atomCount + '</span><span class="detail-fact-label">총 원자 수</span></div>';
      el.detailDesc.textContent = c.desc;
    }
    el.detailModal.classList.add('show');
  }

  function openDex() {
    if (lastMainScreen !== 'screen-dex') dexReturnScreen = lastMainScreen;
    renderDex();
    showMain('screen-dex');
  }

  function bindEvents() {
    el.btnStart.addEventListener('click', function () {
      if (hasSave()) {
        showOverlay('screen-confirm-reset');
      } else {
        startGame();
      }
    });
    el.btnContinue.addEventListener('click', continueGame);
    el.btnDexPreview.addEventListener('click', openDex);

    el.btnConfirmReset.addEventListener('click', function () {
      hideOverlay('screen-confirm-reset');
      startGame();
    });
    el.btnCancelReset.addEventListener('click', function () {
      hideOverlay('screen-confirm-reset');
    });

    el.btnGameHome.addEventListener('click', function () {
      saveGame();
      refreshStartScreen();
      showMain('screen-start');
    });
    el.btnOpenDex.addEventListener('click', openDex);
    el.btnHint.addEventListener('click', useHint);

    el.btnNextStage.addEventListener('click', goNextStage);
    el.btnViewDex.addEventListener('click', function () {
      hideOverlay('screen-complete');
      openDex();
    });
    el.btnCompleteHome.addEventListener('click', function () {
      hideOverlay('screen-complete');
      refreshStartScreen();
      showMain('screen-start');
    });

    el.btnDexBack.addEventListener('click', function () {
      showMain(dexReturnScreen);
    });

    el.dexTabs.forEach(function (t) {
      t.addEventListener('click', function () {
        dexTab = t.getAttribute('data-tab');
        renderDex();
      });
    });

    el.btnDetailClose.addEventListener('click', function () {
      el.detailModal.classList.remove('show');
    });
    el.detailModal.addEventListener('click', function (ev) {
      if (ev.target === el.detailModal) el.detailModal.classList.remove('show');
    });
  }

  function init() {
    bindEvents();
    refreshStartScreen();
    showMain('screen-start');
  }

  init();
})();
