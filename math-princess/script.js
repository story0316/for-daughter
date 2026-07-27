(() => {
  'use strict';

  const P = window.MathPrincessProblems;
  const E = window.MathPrincessEndings;

  const STAT_KEYS = ['intelligence', 'focus', 'stamina', 'charm', 'creativity', 'stress', 'luck'];
  const STAT_LABELS = {
    intelligence: '지능',
    focus: '집중력',
    stamina: '체력',
    charm: '매력',
    creativity: '창의력',
    stress: '스트레스',
    luck: '행운',
  };

  // 스트레스는 낮을수록 좋은 지표라 "성장 능력치" 레벨/색 시스템에서 제외한다.
  const GROWTH_STAT_KEYS = ['intelligence', 'focus', 'stamina', 'charm', 'creativity', 'luck'];
  const STAT_TIER_THRESHOLDS = [0, 20, 40, 60, 80];
  const STAT_TIER_COLORS = ['#8a93b8', '#6fa8ff', '#b48fff', '#ff8fb3', '#ffd873'];

  function statTierIndex(value) {
    let idx = 0;
    STAT_TIER_THRESHOLDS.forEach((min, i) => {
      if (value >= min) idx = i;
    });
    return idx;
  }

  function snapshotGrowthTiers(stats) {
    const snap = {};
    GROWTH_STAT_KEYS.forEach((k) => {
      snap[k] = statTierIndex(stats[k]);
    });
    return snap;
  }

  const TOTAL_TURNS = Number(new URLSearchParams(location.search).get('turns')) || 24;
  const QUESTIONS_PER_STUDY = 4;
  const QUESTIONS_PER_JOB = 3;
  const SAVE_KEY = 'math-princess-save-v1';

  const EVENTS = [
    { emoji: '😄', title: '즐거운 시간', desc: '친구와 수다를 떨며 즐거운 시간을 보냈어요.', apply: (s) => { s.stats.charm += 3; } },
    { emoji: '😤', title: '라이벌의 도발', desc: '라이벌이 시험 자랑을 해서 오기가 생겼어요!', apply: (s) => { s.stats.intelligence += 2; s.stats.stress += 3; } },
    { emoji: '🍀', title: '행운의 동전', desc: '길에서 동전을 주웠어요!', apply: (s) => { s.gold += 20; s.stats.luck += 1; } },
    { emoji: '🤒', title: '감기몸살', desc: '감기에 걸려서 며칠 앓아누웠어요.', apply: (s) => { s.stats.stamina -= 10; } },
    { emoji: '💌', title: '선생님의 칭찬', desc: '선생님이 칭찬해주셔서 기분이 좋아요.', apply: (s) => { s.stats.charm += 2; s.stats.stress -= 5; } },
    { emoji: '🏆', title: '장학금 획득!', desc: '열심히 공부한 결과 장학금을 받았어요!', apply: (s) => { s.gold += 100; }, requirement: (s) => s.stats.intelligence >= 50 },
  ];

  // "대화"는 턴을 소모하지 않는 가벼운 상호작용이라 한 달에 한 번만 가능하다.
  const TALK_LINES = [
    '오늘 하루도 애썼다고 꼭 안아줬어요.',
    '요즘 어떤 게 제일 재밌냐고 물어봤어요.',
    '같이 창밖을 보며 시답잖은 농담을 주고받았어요.',
    '"엄마는 항상 네 편이야" 라고 말해줬어요.',
    '오늘 있었던 일을 조잘조잘 들어줬어요.',
  ];

  const ITEMS = [
    { id: 'sharp', emoji: '✏️', name: '샤프', cost: 1500, desc: '문제 정답 시 골드 +10%', goldBonus: 0.1 },
    { id: 'tablet', emoji: '📱', name: '태블릿', cost: 5000, desc: '공부 정답 시 지능 +1 추가 획득', intBonus: 1 },
    { id: 'laptop', emoji: '💻', name: '노트북', cost: 12000, desc: '콤보 보상 배율 +0.2', comboBonus: 0.2 },
    { id: 'aiTutor', emoji: '🤖', name: 'AI 학습기', cost: 30000, desc: '문제 정답 시 골드 +25%, 지능 +2 추가', goldBonus: 0.25, intBonus: 2 },
    { id: 'apartment', emoji: '🏢', name: '아파트로 이사', cost: 8000, desc: '휴식 효과 +50%', restBonus: 0.5 },
    { id: 'house', emoji: '🏡', name: '단독주택으로 이사', cost: 25000, desc: '휴식 효과 추가 +50% (총 100%)', restBonus: 0.5 },
  ];

  // 품위(교양) 점수: 매력·창의력·지능을 섞어 계산한다. 이 점수가 오를수록
  // 입는 옷이 화려해지고, 만날 수 있는 사람의 폭도 넓어진다.
  function graceScore(stats) {
    return stats.charm * 0.4 + stats.creativity * 0.3 + stats.intelligence * 0.3;
  }

  const OUTFIT_TIERS = [
    { min: 0, emoji: '👕', name: '평범한 옷', wardrobeDesc: '처음부터 입고 있는 편안한 옷' },
    { min: 25, emoji: '👚', name: '단정한 옷', wardrobeDesc: '품위 25 이상에서 해금' },
    { min: 50, emoji: '👗', name: '예쁜 드레스', wardrobeDesc: '품위 50 이상에서 해금' },
    { min: 75, emoji: '👑', name: '공주 드레스', wardrobeDesc: '품위 75 이상에서 해금' },
  ];

  function currentOutfit(stats) {
    const grace = graceScore(stats);
    let tier = OUTFIT_TIERS[0];
    let tierIndex = 0;
    OUTFIT_TIERS.forEach((t, i) => {
      if (grace >= t.min) {
        tier = t;
        tierIndex = i;
      }
    });
    return Object.assign({ tierIndex }, tier);
  }

  const NPC_DEFS = [
    {
      id: 'friend',
      emoji: '😊',
      name: '친구',
      desc: '함께 있으면 마음이 편안해지는 단짝',
      unlock: () => true,
      apply: (s) => { s.stats.charm += 6; },
      lines: ['같이 떡볶이를 먹으며 수다를 떨었어요.', '친구가 요즘 고민을 털어놓았어요.', '같이 만화책을 보며 깔깔 웃었어요.'],
    },
    {
      id: 'rival',
      emoji: '😏',
      name: '라이벌',
      desc: '괜히 신경 쓰이지만 자꾸 실력이 느는 상대',
      unlock: () => true,
      apply: (s) => { s.stats.intelligence += 3; s.stats.stress += 3; },
      lines: ['라이벌이 이번 시험 점수를 자랑했어요. 오기가 생겨요!', '라이벌과 문제풀이 대결을 했어요.', '라이벌이 은근히 신경 쓰이는 하루였어요.'],
    },
    {
      id: 'teacher',
      emoji: '👩‍🏫',
      name: '선생님',
      desc: '어려운 문제도 척척 알려주는 든든한 선생님',
      unlock: () => true,
      apply: (s) => { s.stats.intelligence += 2; s.stats.stress -= 5; },
      lines: ['선생님이 어려운 문제 풀이법을 알려주셨어요.', '선생님과 진로 상담을 했어요.', '선생님이 숙제를 칭찬해주셨어요.'],
    },
    {
      id: 'noble',
      emoji: '💃',
      name: '사교계 친구',
      desc: '무도회와 다과회에서 만난 사교계 친구',
      unlock: (stats) => graceScore(stats) >= 35,
      unlockHint: (stats) => `품위 35 필요 (현재 ${Math.round(graceScore(stats))})`,
      apply: (s) => { s.stats.charm += 4; s.stats.creativity += 3; },
      lines: ['함께 무도회 예절을 배웠어요.', '다과회에서 우아하게 차를 마셨어요.', '사교계 소문 이야기로 즐거운 시간을 보냈어요.'],
    },
    {
      id: 'prince',
      emoji: '🤴',
      name: '왕자님',
      desc: '무도회에서 우연히 마주친 왕자님',
      unlock: (stats) => graceScore(stats) >= 45,
      unlockHint: (stats) => `품위 45 필요 (현재 ${Math.round(graceScore(stats))})`,
      apply: (s) => { s.stats.charm += 5; s.stats.luck += 2; },
      lines: ['왕자님과 정원을 산책했어요.', '왕자님이 춤을 신청했어요.', '왕자님과 함께 별을 보며 이야기를 나눴어요.'],
    },
    {
      id: 'sage',
      emoji: '🧙',
      name: '왕실 스승',
      desc: '왕실 도서관을 관리하는 현자',
      unlock: (stats) => stats.intelligence >= 55,
      unlockHint: (stats) => `지능 55 필요 (현재 ${Math.round(stats.intelligence)})`,
      apply: (s) => { s.stats.intelligence += 4; s.stats.creativity += 2; },
      lines: ['왕실 서고에서 귀한 책을 함께 읽었어요.', '현자에게서 아무도 모르는 문제 풀이를 배웠어요.', '현자가 재능을 칭찬해주셨어요.'],
    },
  ];

  const el = {
    screens: {
      start: document.getElementById('screen-start'),
      main: document.getElementById('screen-main'),
      schedule: document.getElementById('screen-schedule'),
      status: document.getElementById('screen-status'),
      shop: document.getElementById('screen-shop'),
      npcSelect: document.getElementById('screen-npc-select'),
      levelSelect: document.getElementById('screen-level-select'),
      quiz: document.getElementById('screen-quiz'),
      sessionSummary: document.getElementById('screen-session-summary'),
      event: document.getElementById('screen-event'),
      ending: document.getElementById('screen-ending'),
    },
    totalTurnsLabel: document.getElementById('total-turns-label'),
    btnNewGame: document.getElementById('btn-new-game'),
    btnContinue: document.getElementById('btn-continue'),

    turnLabel: document.getElementById('turn-label'),
    goldLabel: document.getElementById('gold-label'),
    characterPortrait: document.getElementById('character-portrait'),
    outfitBadge: document.getElementById('outfit-badge'),
    mainMenuGrid: document.getElementById('main-menu-grid'),
    scheduleBanner: document.getElementById('schedule-banner'),
    scheduleBannerText: document.getElementById('schedule-banner-text'),

    btnScheduleBack: document.getElementById('btn-schedule-back'),
    scheduleList: document.getElementById('schedule-list'),

    btnStatusBack: document.getElementById('btn-status-back'),
    statusPortrait: document.getElementById('status-portrait'),
    statusOutfitBadge: document.getElementById('status-outfit-badge'),
    statusStatPanel: document.getElementById('status-stat-panel'),
    statusNpcList: document.getElementById('status-npc-list'),
    statusItemList: document.getElementById('status-item-list'),

    btnShopBack: document.getElementById('btn-shop-back'),
    shopList: document.getElementById('shop-list'),
    shopGoldLabel: document.getElementById('shop-gold-label'),
    shopTabBtns: document.querySelectorAll('.shop-tab-btn'),
    wardrobeList: document.getElementById('wardrobe-list'),

    levelToast: document.getElementById('level-toast'),

    btnNpcBack: document.getElementById('btn-npc-back'),
    npcList: document.getElementById('npc-list'),

    btnLevelBack: document.getElementById('btn-level-back'),
    levelList: document.getElementById('level-list'),

    quizSessionLabel: document.getElementById('quiz-session-label'),
    quizProgress: document.getElementById('quiz-progress'),
    quizCombo: document.getElementById('quiz-combo'),
    quizLevelBadge: document.getElementById('quiz-level-badge'),
    quizQuestion: document.getElementById('quiz-question'),
    quizChoices: document.getElementById('quiz-choices'),
    quizInputWrap: document.getElementById('quiz-input-wrap'),
    quizInput: document.getElementById('quiz-input'),
    btnQuizSubmit: document.getElementById('btn-quiz-submit'),
    quizKeypad: document.getElementById('quiz-keypad'),
    quizFeedback: document.getElementById('quiz-feedback'),

    summaryEmoji: document.getElementById('summary-emoji'),
    summaryTitle: document.getElementById('summary-title'),
    summaryDesc: document.getElementById('summary-desc'),
    summaryGold: document.getElementById('summary-gold'),
    summaryCombo: document.getElementById('summary-combo'),
    btnSummaryConfirm: document.getElementById('btn-summary-confirm'),

    eventEmoji: document.getElementById('event-emoji'),
    eventTitle: document.getElementById('event-title'),
    eventDesc: document.getElementById('event-desc'),
    btnEventConfirm: document.getElementById('btn-event-confirm'),

    endingEmoji: document.getElementById('ending-emoji'),
    endingTitle: document.getElementById('ending-title'),
    endingDesc: document.getElementById('ending-desc'),
    endingNpcLine: document.getElementById('ending-npc-line'),
    endingOutfitBadge: document.getElementById('ending-outfit-badge'),
    endingCharacterPortrait: document.getElementById('ending-character-portrait'),
    endingStatPanel: document.getElementById('ending-stat-panel'),
    endingTotalCorrect: document.getElementById('ending-total-correct'),
    endingBestCombo: document.getElementById('ending-best-combo'),
    endingGold: document.getElementById('ending-gold'),
    endingItems: document.getElementById('ending-items'),
    btnEndingRestart: document.getElementById('btn-ending-restart'),
    btnEndingHome: document.getElementById('btn-ending-home'),
  };

  el.totalTurnsLabel.textContent = TOTAL_TURNS;

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randChoice(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function makeInitialState() {
    return {
      turn: 1,
      gold: 0,
      stats: {
        intelligence: 20,
        focus: 20,
        stamina: 50,
        charm: 20,
        creativity: 20,
        stress: 10,
        luck: randInt(10, 30),
      },
      totalCorrect: 0,
      combo: 0,
      bestCombo: 0,
      items: {},
      npcs: NPC_DEFS.map((n) => ({ id: n.id, affection: randInt(10, 20) })),
      wardrobe: { unlockedMax: 0, equipped: 0 },
      scheduledActivity: null,
      talkedThisTurn: false,
    };
  }

  let state = makeInitialState();
  let session = null;
  // 진짜로 게임을 시작(새 게임/이어하기)한 뒤부터만 페이지 백그라운드/종료 시
  // 안전망 저장을 하도록 막는 플래그. 시작 화면에 머무른 채로 앱이 닫혀도
  // 미시작 상태로 기존 저장 데이터를 덮어쓰지 않게 해준다.
  let gameStarted = false;

  function clampStats() {
    STAT_KEYS.forEach((k) => {
      state.stats[k] = Math.max(0, Math.min(100, state.stats[k]));
    });
    state.gold = Math.max(0, state.gold);
    (state.npcs || []).forEach((n) => {
      n.affection = Math.max(0, Math.min(100, n.affection));
    });
  }

  function itemBonusSum(key) {
    return ITEMS.filter((i) => state.items[i.id]).reduce((sum, i) => sum + (i[key] || 0), 0);
  }

  function showScreen(name) {
    Object.values(el.screens).forEach((s) => s.classList.remove('active'));
    el.screens[name].classList.add('active');
  }

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      // 저장 공간이 꽉 찼거나(사파리 시크릿 모드 등) localStorage를 쓸 수 없는 경우에도
      // 게임 자체가 멈추지 않도록 조용히 실패시킨다.
      return false;
    }
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      // no-op
    }
  }

  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const loaded = JSON.parse(raw);
      if (!loaded || typeof loaded.turn !== 'number') return false;
      loaded.items = loaded.items || {};
      loaded.npcs = loaded.npcs || NPC_DEFS.map((n) => ({ id: n.id, affection: randInt(10, 20) }));
      loaded.wardrobe = loaded.wardrobe || { unlockedMax: 0, equipped: 0 };
      if (typeof loaded.scheduledActivity === 'undefined') loaded.scheduledActivity = null;
      if (typeof loaded.talkedThisTurn === 'undefined') loaded.talkedThisTurn = false;
      state = loaded;
      return true;
    } catch (e) {
      return false;
    }
  }

  function comboMultiplier(combo) {
    if (combo >= 20) return 3.0;
    if (combo >= 10) return 2.2;
    if (combo >= 5) return 1.6;
    if (combo >= 2) return 1.2;
    return 1.0;
  }

  function yearMonthLabel(turn) {
    const year = Math.floor((turn - 1) / 12) + 1;
    const month = ((turn - 1) % 12) + 1;
    return `${year}년차 ${month}월 · 턴 ${turn}/${TOTAL_TURNS}`;
  }

  function renderStatPanel(container, stats) {
    container.innerHTML = '';
    STAT_KEYS.forEach((key) => {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const value = Math.round(stats[key]);
      const isGrowth = key !== 'stress';
      const tier = isGrowth ? statTierIndex(value) : 0;
      const fillColor = isGrowth ? STAT_TIER_COLORS[tier] : '';
      const fillStyle = `width:${value}%${fillColor ? `;background:${fillColor}` : ''}`;
      row.innerHTML = `
        <span class="stat-row-label">${STAT_LABELS[key]}</span>
        <span class="stat-row-track"><span class="stat-row-fill${key === 'stress' ? ' stress-fill' : ''}" style="${fillStyle}"></span></span>
        <span class="stat-row-value">${value}${isGrowth ? ` <span class="stat-row-tier">Lv${tier + 1}</span>` : ''}</span>
      `;
      container.appendChild(row);
    });
  }

  // 단계별로 그려둔 일러스트(assets/portraits/tierN.png)가 있으면 그것을 쓰고,
  // 아직 없는 단계는 자동 생성 SVG 초상화로 대신 보여준다.
  function renderPortraitInto(container, tierIndex, uid) {
    container.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'portrait-img';
    img.alt = '캐릭터 초상화';
    img.src = `assets/portraits/tier${tierIndex}.png`;
    img.onerror = () => {
      container.innerHTML = MathPrincessPortrait.buildPortraitSVG(tierIndex, { uid });
    };
    container.appendChild(img);
  }

  // 인물 그림(assets/npcs/{id}.png)이 있으면 그것을, 없으면 이모지를 보여준다.
  function npcAvatarHTML(def, sizeClass) {
    return `
      <span class="npc-avatar ${sizeClass || ''}">
        <img src="assets/npcs/${def.id}.png" alt="${def.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <span class="npc-avatar-fallback">${def.emoji}</span>
      </span>
    `;
  }

  function renderMain() {
    el.turnLabel.textContent = yearMonthLabel(state.turn);
    el.goldLabel.textContent = `💰 ${state.gold}G`;
    updateWardrobeUnlocks();
    const equippedTier = OUTFIT_TIERS[state.wardrobe.equipped];
    renderPortraitInto(el.characterPortrait, state.wardrobe.equipped, 'main');
    el.outfitBadge.textContent = `${equippedTier.emoji} ${equippedTier.name}`;
    updateScheduleBanner();
  }

  /* ---------------- 활동: 공부 / 알바 ---------------- */

  function openLevelSelect() {
    el.levelList.innerHTML = '';
    P.LEVELS.forEach((level) => {
      const unlocked = P.isLevelUnlocked(level.id, state.stats.intelligence);
      const card = document.createElement('button');
      card.className = `level-card${unlocked ? '' : ' locked'}`;
      card.innerHTML = `
        <span class="level-badge-num">${level.id}</span>
        <span class="level-info">
          <span class="level-title">${level.name}</span>
          <span class="level-desc">${unlocked ? level.desc : `지능 ${level.unlockIntelligence} 필요 (현재 ${Math.round(state.stats.intelligence)})`}</span>
        </span>
        <span class="level-lock-icon">${unlocked ? '›' : '🔒'}</span>
      `;
      if (unlocked) {
        card.addEventListener('click', () => startStudySession(level.id));
      }
      el.levelList.appendChild(card);
    });
    showScreen('levelSelect');
  }

  el.btnLevelBack.addEventListener('click', () => showScreen('main'));

  function startStudySession(levelId) {
    session = {
      type: 'study',
      level: levelId,
      count: QUESTIONS_PER_STUDY,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startJobSession() {
    session = {
      type: 'job',
      level: 1,
      count: QUESTIONS_PER_JOB,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function nextQuizQuestion() {
    if (session.index >= session.count) {
      finishSession();
      return;
    }
    session.answered = false;
    const problem = P.generateProblem(session.level);
    session.currentProblem = problem;

    el.quizSessionLabel.textContent = session.type === 'study' ? '📖 공부 중' : '💼 알바 중';
    el.quizProgress.textContent = `${session.index + 1} / ${session.count}`;
    el.quizCombo.textContent = `🔥 콤보 ${state.combo}`;
    el.quizLevelBadge.textContent = `Lv.${problem.level}`;
    el.quizQuestion.textContent = problem.question;
    el.quizFeedback.textContent = '';

    if (problem.type === 'choice') {
      el.quizChoices.style.display = 'grid';
      el.quizInputWrap.classList.remove('active');
      el.quizChoices.innerHTML = '';
      problem.choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice;
        btn.addEventListener('click', () => submitAnswer(choice, btn));
        el.quizChoices.appendChild(btn);
      });
    } else {
      el.quizChoices.style.display = 'none';
      el.quizChoices.innerHTML = '';
      el.quizInputWrap.classList.add('active');
      el.quizInput.value = '';
      el.quizInput.disabled = false;
      el.btnQuizSubmit.disabled = false;
    }
  }

  el.btnQuizSubmit.addEventListener('click', () => {
    if (!session || session.answered) return;
    const raw = el.quizInput.value.trim();
    if (raw === '') {
      return;
    }
    submitAnswer(raw, null);
  });

  el.quizInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.btnQuizSubmit.click();
  });

  el.quizKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.keypad-btn');
    if (!btn || !session || session.answered) return;
    if (btn.dataset.key === 'erase') {
      el.quizInput.value = el.quizInput.value.slice(0, -1);
    } else if (el.quizInput.value.length < 8) {
      el.quizInput.value += btn.dataset.key;
    }
  });

  function submitAnswer(rawAnswer, btnEl) {
    if (!session || session.answered) return;
    session.answered = true;
    const problem = session.currentProblem;
    const correct = P.checkAnswer(problem, rawAnswer);

    if (problem.type === 'choice') {
      [...el.quizChoices.children].forEach((b) => (b.disabled = true));
      if (btnEl) btnEl.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) {
        [...el.quizChoices.children].forEach((b) => {
          if (b.textContent === problem.answer) b.classList.add('correct');
        });
      }
    } else {
      el.quizInput.disabled = true;
      el.btnQuizSubmit.disabled = true;
    }

    if (correct) {
      const beforeTiers = snapshotGrowthTiers(state.stats);
      applyCorrect(problem);
      announceStatLevelUps(beforeTiers);
      el.quizFeedback.textContent = `정답이에요! 🎉 ${problem.explanation}`;
    } else {
      applyWrong(problem);
      el.quizFeedback.textContent = `아쉬워요! 정답: ${problem.answer}\n${problem.explanation}`;
    }
    el.quizCombo.textContent = `🔥 콤보 ${state.combo}`;
    saveGame();

    setTimeout(() => {
      session.index++;
      nextQuizQuestion();
    }, 1100);
  }

  function applyCorrect(problem) {
    state.combo++;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    session.sessionBestCombo = Math.max(session.sessionBestCombo, state.combo);

    const multiplier = comboMultiplier(state.combo) + itemBonusSum('comboBonus');
    const jobBonus = session.type === 'job' ? 1.5 : 1;
    const goldMultiplier = 1 + itemBonusSum('goldBonus');
    const goldGain = Math.round(problem.rewardGold * multiplier * jobBonus * goldMultiplier);
    state.gold += goldGain;
    session.goldEarned += goldGain;

    if (session.type === 'study') {
      state.stats.intelligence += problem.level + itemBonusSum('intBonus');
    } else {
      state.stats.stamina -= 2;
    }
    state.totalCorrect++;
    session.correctCount++;
    clampStats();
  }

  function applyWrong(problem) {
    state.combo = 0;
    if (session.type === 'study') {
      state.stats.stress += 6;
      state.stats.stamina -= 4;
    } else {
      state.stats.stamina -= 3;
    }
    clampStats();
  }

  function finishSession() {
    el.summaryEmoji.textContent = session.correctCount === session.count ? '🌟' : '✅';
    el.summaryTitle.textContent = session.type === 'study' ? '공부를 마쳤어요!' : '알바를 마쳤어요!';
    el.summaryDesc.textContent = `${session.count}문제 중 ${session.correctCount}개를 맞혔어요`;
    el.summaryGold.textContent = session.goldEarned;
    el.summaryCombo.textContent = session.sessionBestCombo;
    showScreen('sessionSummary');
  }

  el.btnSummaryConfirm.addEventListener('click', () => {
    session = null;
    advanceTurn();
  });

  /* ---------------- 활동: 운동 / 휴식 / 친구 만나기 ---------------- */

  function doExercise() {
    const beforeTiers = snapshotGrowthTiers(state.stats);
    state.stats.stamina += 8;
    state.stats.focus += 4;
    state.stats.stress += 3;
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();
    maybeTriggerEvent(0.25);
  }

  function doRest() {
    const beforeTiers = snapshotGrowthTiers(state.stats);
    const restMultiplier = 1 + itemBonusSum('restBonus');
    state.stats.stress -= 12 * restMultiplier;
    state.stats.stamina += 10 * restMultiplier;
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();
    maybeTriggerEvent(0.15);
  }

  function maybeTriggerEvent(chance) {
    if (Math.random() > chance) {
      advanceTurn();
      return;
    }
    const pool = EVENTS.filter((ev) => !ev.requirement || ev.requirement(state));
    const event = randChoice(pool);
    const beforeTiers = snapshotGrowthTiers(state.stats);
    event.apply(state);
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();

    el.eventEmoji.textContent = event.emoji;
    el.eventTitle.textContent = event.title;
    el.eventDesc.textContent = event.desc;
    showScreen('event');
  }

  el.btnEventConfirm.addEventListener('click', () => {
    advanceTurn();
  });

  /* ---------------- 친구 만나기: 상대 선택 ---------------- */

  function openNpcSelect() {
    el.npcList.innerHTML = '';
    NPC_DEFS.forEach((def) => {
      const unlocked = def.unlock(state.stats);
      const npcState = state.npcs.find((n) => n.id === def.id);
      const card = document.createElement('button');
      card.className = `level-card npc-card${unlocked ? '' : ' locked'}`;
      card.innerHTML = `
        ${unlocked ? npcAvatarHTML(def, 'npc-avatar-md') : '<span class="level-badge-num">🔒</span>'}
        <span class="level-info">
          <span class="level-title">${def.name}</span>
          <span class="level-desc">${unlocked ? def.desc : def.unlockHint(state.stats)}</span>
          ${unlocked ? `<span class="npc-affection-track"><span class="npc-affection-fill" style="width:${npcState.affection}%"></span></span>` : ''}
        </span>
        <span class="level-lock-icon">${unlocked ? '›' : '🔒'}</span>
      `;
      if (unlocked) {
        card.addEventListener('click', () => meetNpc(def.id));
      }
      el.npcList.appendChild(card);
    });
    showScreen('npcSelect');
  }

  el.btnNpcBack.addEventListener('click', () => showScreen('main'));

  function meetNpc(npcId) {
    const def = NPC_DEFS.find((n) => n.id === npcId);
    const npcState = state.npcs.find((n) => n.id === npcId);
    const beforeTiers = snapshotGrowthTiers(state.stats);
    def.apply(state);
    npcState.affection += randInt(8, 14);
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();

    el.eventEmoji.innerHTML = npcAvatarHTML(def, 'npc-avatar-lg');
    el.eventTitle.textContent = `${def.name}과(와)의 시간`;
    el.eventDesc.textContent = `${randChoice(def.lines)} (애정도 ${Math.round(npcState.affection)})`;
    showScreen('event');
  }

  /* ---------------- 상점 ---------------- */

  function switchShopTab(tab) {
    el.shopTabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const isWardrobe = tab === 'wardrobe';
    el.shopList.style.display = isWardrobe ? 'none' : 'flex';
    el.wardrobeList.style.display = isWardrobe ? 'grid' : 'none';
    if (isWardrobe) renderWardrobeList();
    else renderShopList();
  }

  function openShop(tab) {
    switchShopTab(tab || 'items');
    el.shopGoldLabel.textContent = `💰 ${state.gold}G`;
    showScreen('shop');
  }

  function renderShopList() {
    el.shopList.innerHTML = '';
    ITEMS.forEach((item) => {
      const owned = !!state.items[item.id];
      const canAfford = state.gold >= item.cost;
      const card = document.createElement('div');
      card.className = `level-card shop-item${owned ? ' owned' : ''}`;
      card.innerHTML = `
        <span class="level-badge-num">${item.emoji}</span>
        <span class="level-info">
          <span class="level-title">${item.name}</span>
          <span class="level-desc">${item.desc}</span>
          <span class="shop-cost">${owned ? '보유 중' : `💰 ${item.cost}G`}</span>
        </span>
        <button class="shop-buy-btn" ${owned || !canAfford ? 'disabled' : ''}>${owned ? '완료' : canAfford ? '구매' : '골드 부족'}</button>
      `;
      if (!owned && canAfford) {
        card.querySelector('.shop-buy-btn').addEventListener('click', () => buyItem(item.id));
      }
      el.shopList.appendChild(card);
    });
  }

  function buyItem(itemId) {
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item || state.items[itemId] || state.gold < item.cost) return;
    state.gold -= item.cost;
    state.items[itemId] = true;
    el.shopGoldLabel.textContent = `💰 ${state.gold}G`;
    saveGame();
    renderShopList();
  }

  el.btnShopBack.addEventListener('click', () => {
    renderMain();
    showScreen('main');
  });

  el.shopTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchShopTab(btn.dataset.tab));
  });

  /* ---------------- 옷장 ---------------- */

  function renderWardrobeList() {
    el.wardrobeList.innerHTML = '';
    OUTFIT_TIERS.forEach((tier, tierIndex) => {
      const unlocked = tierIndex <= state.wardrobe.unlockedMax;
      const equipped = tierIndex === state.wardrobe.equipped;
      const card = document.createElement('button');
      card.className = `wardrobe-card${unlocked ? '' : ' locked'}${equipped ? ' equipped' : ''}`;
      card.innerHTML = `
        ${equipped ? '<span class="wardrobe-card-badge">착용 중</span>' : ''}
        <img src="assets/wardrobe/tier${tierIndex}.png" alt="${tier.name}" />
        <span class="wardrobe-card-label">${tier.emoji} ${tier.name}</span>
      `;
      if (unlocked) {
        card.addEventListener('click', () => equipOutfit(tierIndex));
      } else {
        card.querySelector('.wardrobe-card-label').textContent = tier.wardrobeDesc;
      }
      el.wardrobeList.appendChild(card);
    });
  }

  function equipOutfit(tierIndex) {
    if (tierIndex > state.wardrobe.unlockedMax) return;
    state.wardrobe.equipped = tierIndex;
    saveGame();
    renderWardrobeList();
    renderMain();
  }

  // 품위가 새 단계에 닿으면 그 옷을 영구 해금하고 자동으로 갈아입힌다.
  // (옷장에서는 이후 이미 해금한 옷들 중 원하는 것으로 자유롭게 갈아입을 수 있다)
  function updateWardrobeUnlocks() {
    const tierIndex = currentOutfit(state.stats).tierIndex;
    if (tierIndex > state.wardrobe.unlockedMax) {
      state.wardrobe.unlockedMax = tierIndex;
      state.wardrobe.equipped = tierIndex;
      const tier = OUTFIT_TIERS[tierIndex];
      showLevelToast(`✨ 새 옷 해금: ${tier.name}!`);
      saveGame();
    }
  }

  /* ---------------- 레벨업 토스트 ---------------- */

  let toastTimeoutId = null;

  function showLevelToast(message) {
    clearTimeout(toastTimeoutId);
    el.levelToast.textContent = message;
    el.levelToast.classList.add('show');
    toastTimeoutId = setTimeout(() => {
      el.levelToast.classList.remove('show');
    }, 2200);
  }

  function announceStatLevelUps(beforeTiers) {
    const leveledUp = [];
    GROWTH_STAT_KEYS.forEach((k) => {
      const afterTier = statTierIndex(state.stats[k]);
      if (afterTier > beforeTiers[k]) {
        leveledUp.push(`${STAT_LABELS[k]} Lv.${afterTier + 1}`);
      }
    });
    if (leveledUp.length) {
      showLevelToast(`🎉 ${leveledUp.join(' · ')} 달성!`);
    }
  }

  /* ---------------- 메인 메뉴 (스케줄 / 실행 / 쇼핑 / 옷갈아입기 / 대화 / 상태) ---------------- */

  const ACTIVITY_DEFS = {
    study: { emoji: '📖', name: '공부' },
    job: { emoji: '💼', name: '알바' },
    exercise: { emoji: '🏃', name: '운동' },
    rest: { emoji: '🛌', name: '휴식' },
    friend: { emoji: '🎡', name: '친구 만나기' },
  };

  function runActivity(activity) {
    if (activity === 'study') openLevelSelect();
    else if (activity === 'job') startJobSession();
    else if (activity === 'exercise') doExercise();
    else if (activity === 'rest') doRest();
    else if (activity === 'friend') openNpcSelect();
  }

  function updateScheduleBanner() {
    if (state.scheduledActivity && ACTIVITY_DEFS[state.scheduledActivity]) {
      const def = ACTIVITY_DEFS[state.scheduledActivity];
      el.scheduleBannerText.textContent = `${def.emoji} ${def.name}`;
      el.scheduleBanner.style.display = 'block';
    } else {
      el.scheduleBanner.style.display = 'none';
    }
  }

  function openSchedule() {
    showScreen('schedule');
  }

  el.scheduleList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-activity]');
    if (!btn) return;
    state.scheduledActivity = btn.dataset.activity;
    saveGame();
    updateScheduleBanner();
    showScreen('main');
  });

  el.btnScheduleBack.addEventListener('click', () => showScreen('main'));

  function executeSchedule() {
    if (!state.scheduledActivity) {
      openSchedule();
      return;
    }
    runActivity(state.scheduledActivity);
  }

  function talkToDaughter() {
    if (state.talkedThisTurn) {
      showLevelToast('💬 오늘은 이미 충분히 대화했어요');
      return;
    }
    state.talkedThisTurn = true;
    const line = randChoice(TALK_LINES);
    const beforeTiers = snapshotGrowthTiers(state.stats);
    state.stats.charm += 1;
    state.stats.stress = Math.max(0, state.stats.stress - 1);
    clampStats();
    announceStatLevelUps(beforeTiers);
    showLevelToast(`💬 ${line}`);
    saveGame();
  }

  function openStatusScreen() {
    renderStatusScreen();
    showScreen('status');
  }

  function renderStatusScreen() {
    const outfit = OUTFIT_TIERS[state.wardrobe.equipped];
    renderPortraitInto(el.statusPortrait, state.wardrobe.equipped, 'status');
    el.statusOutfitBadge.textContent = `${outfit.emoji} ${outfit.name}`;
    renderStatPanel(el.statusStatPanel, state.stats);

    el.statusNpcList.innerHTML = '';
    NPC_DEFS.forEach((def) => {
      const unlocked = def.unlock(state.stats);
      const npcState = state.npcs.find((n) => n.id === def.id);
      const row = document.createElement('div');
      row.className = 'status-npc-row';
      if (unlocked) {
        row.innerHTML = `
          ${npcAvatarHTML(def, 'npc-avatar-sm')}
          <span class="status-npc-row-name">${def.name}</span>
          <span class="npc-affection-track"><span class="npc-affection-fill" style="width:${npcState.affection}%"></span></span>
          <span class="status-npc-row-value">${Math.round(npcState.affection)}</span>
        `;
      } else {
        row.innerHTML = `
          <span class="status-npc-row-name">🔒 ???</span>
          <span class="status-npc-row-value">-</span>
        `;
      }
      el.statusNpcList.appendChild(row);
    });

    const ownedItems = ITEMS.filter((i) => state.items[i.id]);
    el.statusItemList.innerHTML = '';
    if (ownedItems.length === 0) {
      el.statusItemList.innerHTML = '<div class="status-empty">아직 산 장비가 없어요</div>';
    } else {
      ownedItems.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'status-item-row';
        row.innerHTML = `<span class="status-item-row-name">${item.emoji} ${item.name}</span><span class="status-npc-row-value">✔️</span>`;
        el.statusItemList.appendChild(row);
      });
    }
  }

  el.btnStatusBack.addEventListener('click', () => showScreen('main'));

  el.mainMenuGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.main-menu-btn');
    if (!btn) return;
    const menu = btn.dataset.menu;
    if (menu === 'schedule') openSchedule();
    else if (menu === 'execute') executeSchedule();
    else if (menu === 'shop') openShop('items');
    else if (menu === 'wardrobe') openShop('wardrobe');
    else if (menu === 'talk') talkToDaughter();
    else if (menu === 'status') openStatusScreen();
  });

  /* ---------------- 턴 진행 / 엔딩 ---------------- */

  function advanceTurn() {
    state.turn++;
    state.scheduledActivity = null;
    state.talkedThisTurn = false;
    if (state.turn > TOTAL_TURNS) {
      showEnding();
      return;
    }
    saveGame();
    showScreen('main');
    renderMain();
  }

  function showEnding() {
    gameStarted = false;
    clearSave();
    const ending = E.computeEnding(state.stats, state.npcs);
    el.endingEmoji.textContent = ending.emoji;
    el.endingTitle.textContent = ending.title;
    el.endingDesc.textContent = ending.desc;

    const closestNpc = state.npcs.reduce((best, n) => (n.affection > best.affection ? n : best), state.npcs[0]);
    if (closestNpc && closestNpc.affection >= 30) {
      const def = NPC_DEFS.find((n) => n.id === closestNpc.id);
      el.endingNpcLine.textContent = `${def.emoji} 가장 가까운 사이: ${def.name} (애정도 ${Math.round(closestNpc.affection)})`;
    } else {
      el.endingNpcLine.textContent = '';
    }

    const finalOutfit = currentOutfit(state.stats);
    renderPortraitInto(el.endingCharacterPortrait, finalOutfit.tierIndex, 'ending');
    el.endingOutfitBadge.textContent = `${finalOutfit.emoji} ${finalOutfit.name}`;

    renderStatPanel(el.endingStatPanel, state.stats);
    el.endingTotalCorrect.textContent = state.totalCorrect;
    el.endingBestCombo.textContent = state.bestCombo;
    el.endingGold.textContent = state.gold;
    el.endingItems.textContent = Object.values(state.items).filter(Boolean).length;
    showScreen('ending');
  }

  el.btnEndingRestart.addEventListener('click', () => {
    state = makeInitialState();
    clearSave();
    saveGame();
    gameStarted = true;
    showScreen('main');
    renderMain();
  });

  /* ---------------- 시작 화면 ---------------- */

  el.btnNewGame.addEventListener('click', () => {
    state = makeInitialState();
    clearSave();
    saveGame();
    gameStarted = true;
    showScreen('main');
    renderMain();
  });

  el.btnContinue.addEventListener('click', () => {
    if (loadGame()) {
      gameStarted = true;
      showScreen('main');
      renderMain();
    }
  });

  if (loadGame()) {
    el.btnContinue.style.display = 'block';
  }

  // 안전망: 앱이 백그라운드로 가거나 탭/창이 닫히는 순간에도 현재 진행 상태를
  // 즉시 저장해서, 명시적으로 "확인" 버튼을 누르기 전에 앱이 종료되어도
  // 진행이 사라지지 않도록 한다.
  function flushSaveIfStarted() {
    if (gameStarted) saveGame();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSaveIfStarted();
  });
  window.addEventListener('pagehide', flushSaveIfStarted);
})();
