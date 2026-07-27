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

  const TOTAL_TURNS = Number(new URLSearchParams(location.search).get('turns')) || 24;
  const QUESTIONS_PER_STUDY = 4;
  const QUESTIONS_PER_JOB = 3;
  const SAVE_SLOT_COUNT = 10;
  const SAVE_KEY_PREFIX = 'math-princess-slot-';
  const STAGE_EMOJIS = ['🌱', '🧒', '👧', '👩'];

  const EVENTS = [
    { emoji: '😄', title: '즐거운 시간', desc: '친구와 수다를 떨며 즐거운 시간을 보냈어요.', apply: (s) => { s.stats.charm += 3; } },
    { emoji: '😤', title: '라이벌의 도발', desc: '라이벌이 시험 자랑을 해서 오기가 생겼어요!', apply: (s) => { s.stats.intelligence += 2; s.stats.stress += 3; } },
    { emoji: '🍀', title: '행운의 동전', desc: '길에서 동전을 주웠어요!', apply: (s) => { s.gold += 20; s.stats.luck += 1; } },
    { emoji: '🤒', title: '감기몸살', desc: '감기에 걸려서 며칠 앓아누웠어요.', apply: (s) => { s.stats.stamina -= 10; } },
    { emoji: '💌', title: '선생님의 칭찬', desc: '선생님이 칭찬해주셔서 기분이 좋아요.', apply: (s) => { s.stats.charm += 2; s.stats.stress -= 5; } },
    { emoji: '🏆', title: '장학금 획득!', desc: '열심히 공부한 결과 장학금을 받았어요!', apply: (s) => { s.gold += 100; }, requirement: (s) => s.stats.intelligence >= 50 },
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
    { min: 0, emoji: '👕', name: '평범한 옷' },
    { min: 25, emoji: '👚', name: '단정한 옷' },
    { min: 50, emoji: '👗', name: '예쁜 드레스' },
    { min: 75, emoji: '👑', name: '공주 드레스' },
  ];

  function currentOutfit(stats) {
    const grace = graceScore(stats);
    let tier = OUTFIT_TIERS[0];
    OUTFIT_TIERS.forEach((t) => {
      if (grace >= t.min) tier = t;
    });
    return tier;
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
      nameEntry: document.getElementById('screen-name-entry'),
      main: document.getElementById('screen-main'),
      shop: document.getElementById('screen-shop'),
      npcSelect: document.getElementById('screen-npc-select'),
      levelSelect: document.getElementById('screen-level-select'),
      quiz: document.getElementById('screen-quiz'),
      sessionSummary: document.getElementById('screen-session-summary'),
      event: document.getElementById('screen-event'),
      ending: document.getElementById('screen-ending'),
    },
    totalTurnsLabel: document.getElementById('total-turns-label'),
    slotList: document.getElementById('slot-list'),

    btnNameBack: document.getElementById('btn-name-back'),
    btnNameConfirm: document.getElementById('btn-name-confirm'),
    nameInput: document.getElementById('name-input'),

    turnLabel: document.getElementById('turn-label'),
    goldLabel: document.getElementById('gold-label'),
    characterEmoji: document.getElementById('character-emoji'),
    characterName: document.getElementById('character-name'),
    outfitBadge: document.getElementById('outfit-badge'),
    statPanel: document.getElementById('stat-panel'),
    activityGrid: document.getElementById('activity-grid'),

    btnSave: document.getElementById('btn-save'),
    btnOpenShop: document.getElementById('btn-open-shop'),
    btnShopBack: document.getElementById('btn-shop-back'),
    shopList: document.getElementById('shop-list'),
    shopGoldLabel: document.getElementById('shop-gold-label'),

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
      name: '',
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
    };
  }

  let state = makeInitialState();
  let session = null;
  let activeSlot = null;
  let pendingSlot = null;

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

  function slotKey(n) {
    return `${SAVE_KEY_PREFIX}${n}`;
  }

  function readSlot(n) {
    const raw = localStorage.getItem(slotKey(n));
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw);
      if (!saved || !saved.state || typeof saved.state.turn !== 'number') return null;
      return saved;
    } catch (e) {
      return null;
    }
  }

  function writeSlot(n) {
    const payload = {
      name: state.name,
      turn: state.turn,
      totalTurns: TOTAL_TURNS,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(slotKey(n), JSON.stringify(payload));
  }

  function deleteSlotSave(n) {
    localStorage.removeItem(slotKey(n));
  }

  function formatSavedAt(iso) {
    const d = new Date(iso);
    const pad = (v) => String(v).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function saveGame() {
    if (activeSlot == null) return;
    writeSlot(activeSlot);
  }

  function loadSlot(n) {
    const saved = readSlot(n);
    if (!saved) return;
    state = saved.state;
    state.items = state.items || {};
    state.npcs = state.npcs || NPC_DEFS.map((d) => ({ id: d.id, affection: randInt(10, 20) }));
    if (typeof state.name !== 'string' || !state.name) state.name = '이름없음';
    activeSlot = n;
    showScreen('main');
    renderMain();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderSlotList() {
    el.slotList.innerHTML = '';
    for (let n = 1; n <= SAVE_SLOT_COUNT; n++) {
      const saved = readSlot(n);
      if (saved) {
        const wrap = document.createElement('div');
        wrap.className = 'level-card slot-card';
        wrap.innerHTML = `
          <button class="slot-load-btn">
            <span class="level-badge-num">👑</span>
            <span class="level-info">
              <span class="level-title">${escapeHtml(saved.name || '이름없음')}</span>
              <span class="slot-meta">${yearMonthLabel(saved.turn, saved.totalTurns || TOTAL_TURNS)}</span>
              <span class="slot-meta">저장일 ${formatSavedAt(saved.savedAt)}</span>
            </span>
          </button>
          <button class="slot-delete-btn" aria-label="슬롯 삭제">✕</button>
        `;
        wrap.querySelector('.slot-load-btn').addEventListener('click', () => loadSlot(n));
        wrap.querySelector('.slot-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`"${saved.name || '이름없음'}"의 저장 데이터를 삭제할까요?`)) {
            deleteSlotSave(n);
            renderSlotList();
          }
        });
        el.slotList.appendChild(wrap);
      } else {
        const btn = document.createElement('button');
        btn.className = 'level-card slot-card empty';
        btn.innerHTML = `
          <span class="level-badge-num">＋</span>
          <span class="level-info">
            <span class="level-title">빈 슬롯</span>
            <span class="slot-meta">눌러서 새 이야기를 시작해요</span>
          </span>
        `;
        btn.addEventListener('click', () => openNameEntry(n));
        el.slotList.appendChild(btn);
      }
    }
  }

  function openNameEntry(slotNum) {
    pendingSlot = slotNum;
    el.nameInput.value = '';
    showScreen('nameEntry');
    setTimeout(() => el.nameInput.focus(), 50);
  }

  function comboMultiplier(combo) {
    if (combo >= 20) return 3.0;
    if (combo >= 10) return 2.2;
    if (combo >= 5) return 1.6;
    if (combo >= 2) return 1.2;
    return 1.0;
  }

  function yearMonthLabel(turn, total = TOTAL_TURNS) {
    const year = Math.floor((turn - 1) / 12) + 1;
    const month = ((turn - 1) % 12) + 1;
    return `${year}년차 ${month}월 · 턴 ${turn}/${total}`;
  }

  function renderStatPanel(container, stats) {
    container.innerHTML = '';
    STAT_KEYS.forEach((key) => {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const value = Math.round(stats[key]);
      row.innerHTML = `
        <span class="stat-row-label">${STAT_LABELS[key]}</span>
        <span class="stat-row-track"><span class="stat-row-fill${key === 'stress' ? ' stress-fill' : ''}" style="width:${value}%"></span></span>
        <span class="stat-row-value">${value}</span>
      `;
      container.appendChild(row);
    });
  }

  function renderMain() {
    el.turnLabel.textContent = yearMonthLabel(state.turn);
    el.goldLabel.textContent = `💰 ${state.gold}G`;
    const stageIdx = Math.min(3, Math.floor(((state.turn - 1) / TOTAL_TURNS) * 4));
    const outfit = currentOutfit(state.stats);
    // 품위가 최고 단계(공주 드레스)에 닿으면, 나이와 상관없이 공주의 모습으로 보여준다.
    el.characterEmoji.textContent = outfit.name === '공주 드레스' ? '👸' : STAGE_EMOJIS[stageIdx];
    el.characterName.textContent = state.name || '이름없음';
    el.outfitBadge.textContent = `${outfit.emoji} ${outfit.name}`;
    renderStatPanel(el.statPanel, state.stats);
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
      setTimeout(() => el.quizInput.focus(), 50);
    }
  }

  el.btnQuizSubmit.addEventListener('click', () => {
    if (!session || session.answered) return;
    const raw = el.quizInput.value.trim();
    if (raw === '') {
      el.quizInput.focus();
      return;
    }
    submitAnswer(raw, null);
  });

  el.quizInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.btnQuizSubmit.click();
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
      applyCorrect(problem);
      el.quizFeedback.textContent = `정답이에요! 🎉 ${problem.explanation}`;
    } else {
      applyWrong(problem);
      el.quizFeedback.textContent = `아쉬워요! 정답: ${problem.answer}\n${problem.explanation}`;
    }
    el.quizCombo.textContent = `🔥 콤보 ${state.combo}`;

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
    state.stats.stamina += 8;
    state.stats.focus += 4;
    state.stats.stress += 3;
    clampStats();
    maybeTriggerEvent(0.25);
  }

  function doRest() {
    const restMultiplier = 1 + itemBonusSum('restBonus');
    state.stats.stress -= 12 * restMultiplier;
    state.stats.stamina += 10 * restMultiplier;
    clampStats();
    maybeTriggerEvent(0.15);
  }

  function maybeTriggerEvent(chance) {
    if (Math.random() > chance) {
      advanceTurn();
      return;
    }
    const pool = EVENTS.filter((ev) => !ev.requirement || ev.requirement(state));
    const event = randChoice(pool);
    event.apply(state);
    clampStats();

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
        <span class="level-badge-num">${def.emoji}</span>
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
    def.apply(state);
    npcState.affection += randInt(8, 14);
    clampStats();

    el.eventEmoji.textContent = def.emoji;
    el.eventTitle.textContent = `${def.name}과(와)의 시간`;
    el.eventDesc.textContent = `${randChoice(def.lines)} (애정도 ${Math.round(npcState.affection)})`;
    showScreen('event');
  }

  /* ---------------- 상점 ---------------- */

  function openShop() {
    renderShopList();
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
    renderShopList();
  }

  el.btnOpenShop.addEventListener('click', openShop);
  el.btnShopBack.addEventListener('click', () => {
    renderMain();
    showScreen('main');
  });

  /* ---------------- 활동 버튼 ---------------- */

  el.activityGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.activity-btn');
    if (!btn) return;
    const activity = btn.dataset.activity;
    if (activity === 'study') openLevelSelect();
    else if (activity === 'job') startJobSession();
    else if (activity === 'exercise') doExercise();
    else if (activity === 'rest') doRest();
    else if (activity === 'friend') openNpcSelect();
  });

  /* ---------------- 턴 진행 / 엔딩 ---------------- */

  function advanceTurn() {
    state.turn++;
    if (state.turn > TOTAL_TURNS) {
      showEnding();
      return;
    }
    saveGame();
    showScreen('main');
    renderMain();
  }

  function showEnding() {
    state.turn = Math.min(state.turn, TOTAL_TURNS);
    saveGame();
    activeSlot = null;
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
    el.endingOutfitBadge.textContent = `${finalOutfit.name === '공주 드레스' ? '👸' : finalOutfit.emoji} ${finalOutfit.name}`;

    renderStatPanel(el.endingStatPanel, state.stats);
    el.endingTotalCorrect.textContent = state.totalCorrect;
    el.endingBestCombo.textContent = state.bestCombo;
    el.endingGold.textContent = state.gold;
    el.endingItems.textContent = Object.values(state.items).filter(Boolean).length;
    showScreen('ending');
  }

  el.btnEndingRestart.addEventListener('click', () => {
    renderSlotList();
    showScreen('start');
  });

  el.btnEndingHome.addEventListener('click', () => {
    renderSlotList();
    showScreen('start');
  });

  /* ---------------- 시작 화면 / 저장 슬롯 ---------------- */

  el.btnNameBack.addEventListener('click', () => {
    pendingSlot = null;
    showScreen('start');
  });

  el.btnNameConfirm.addEventListener('click', () => {
    if (pendingSlot == null) return;
    const name = el.nameInput.value.trim() || '우리 딸';
    state = makeInitialState();
    state.name = name;
    activeSlot = pendingSlot;
    pendingSlot = null;
    saveGame();
    showScreen('main');
    renderMain();
  });

  el.nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.btnNameConfirm.click();
  });

  el.btnSave.addEventListener('click', () => {
    saveGame();
    const original = el.btnSave.textContent;
    el.btnSave.textContent = '✅ 저장됨';
    el.btnSave.disabled = true;
    setTimeout(() => {
      el.btnSave.textContent = original;
      el.btnSave.disabled = false;
    }, 900);
  });

  renderSlotList();
})();
