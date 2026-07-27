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
  const SAVE_KEY = 'math-princess-save-v1';
  const STAGE_EMOJIS = ['🌱', '🧒', '👧', '👩'];

  const EVENTS = [
    { emoji: '😄', title: '친구와 즐거운 시간', desc: '친구와 수다를 떨며 즐거운 시간을 보냈어요.', apply: (s) => { s.stats.charm += 3; } },
    { emoji: '😤', title: '라이벌의 도발', desc: '라이벌이 시험 자랑을 해서 오기가 생겼어요!', apply: (s) => { s.stats.intelligence += 2; s.stats.stress += 3; } },
    { emoji: '🍀', title: '행운의 동전', desc: '길에서 동전을 주웠어요!', apply: (s) => { s.gold += 20; s.stats.luck += 1; } },
    { emoji: '🤒', title: '감기몸살', desc: '감기에 걸려서 며칠 앓아누웠어요.', apply: (s) => { s.stats.stamina -= 10; } },
    { emoji: '💌', title: '선생님의 칭찬', desc: '선생님이 칭찬해주셔서 기분이 좋아요.', apply: (s) => { s.stats.charm += 2; s.stats.stress -= 5; } },
    { emoji: '🏆', title: '장학금 획득!', desc: '열심히 공부한 결과 장학금을 받았어요!', apply: (s) => { s.gold += 100; }, requirement: (s) => s.stats.intelligence >= 50 },
  ];

  const el = {
    screens: {
      start: document.getElementById('screen-start'),
      main: document.getElementById('screen-main'),
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
    characterEmoji: document.getElementById('character-emoji'),
    statPanel: document.getElementById('stat-panel'),
    activityGrid: document.getElementById('activity-grid'),

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
    endingStatPanel: document.getElementById('ending-stat-panel'),
    endingTotalCorrect: document.getElementById('ending-total-correct'),
    endingBestCombo: document.getElementById('ending-best-combo'),
    endingGold: document.getElementById('ending-gold'),
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
    };
  }

  let state = makeInitialState();
  let session = null;
  let pendingAfterEvent = null;

  function clampStats() {
    STAT_KEYS.forEach((k) => {
      state.stats[k] = Math.max(0, Math.min(100, state.stats[k]));
    });
    state.gold = Math.max(0, state.gold);
  }

  function showScreen(name) {
    Object.values(el.screens).forEach((s) => s.classList.remove('active'));
    el.screens[name].classList.add('active');
  }

  function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const loaded = JSON.parse(raw);
      if (!loaded || typeof loaded.turn !== 'number') return false;
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
    el.characterEmoji.textContent = STAGE_EMOJIS[stageIdx];
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

    const multiplier = comboMultiplier(state.combo);
    const jobBonus = session.type === 'job' ? 1.5 : 1;
    const goldGain = Math.round(problem.rewardGold * multiplier * jobBonus);
    state.gold += goldGain;
    session.goldEarned += goldGain;

    if (session.type === 'study') {
      state.stats.intelligence += problem.level;
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
    state.stats.stress -= 12;
    state.stats.stamina += 10;
    clampStats();
    maybeTriggerEvent(0.15);
  }

  function doFriend() {
    state.stats.charm += 6;
    clampStats();
    maybeTriggerEvent(1);
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

  /* ---------------- 활동 버튼 ---------------- */

  el.activityGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.activity-btn');
    if (!btn) return;
    const activity = btn.dataset.activity;
    if (activity === 'study') openLevelSelect();
    else if (activity === 'job') startJobSession();
    else if (activity === 'exercise') doExercise();
    else if (activity === 'rest') doRest();
    else if (activity === 'friend') doFriend();
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
    clearSave();
    const ending = E.computeEnding(state.stats);
    el.endingEmoji.textContent = ending.emoji;
    el.endingTitle.textContent = ending.title;
    el.endingDesc.textContent = ending.desc;
    renderStatPanel(el.endingStatPanel, state.stats);
    el.endingTotalCorrect.textContent = state.totalCorrect;
    el.endingBestCombo.textContent = state.bestCombo;
    el.endingGold.textContent = state.gold;
    showScreen('ending');
  }

  el.btnEndingRestart.addEventListener('click', () => {
    state = makeInitialState();
    clearSave();
    showScreen('main');
    renderMain();
  });

  /* ---------------- 시작 화면 ---------------- */

  el.btnNewGame.addEventListener('click', () => {
    state = makeInitialState();
    clearSave();
    saveGame();
    showScreen('main');
    renderMain();
  });

  el.btnContinue.addEventListener('click', () => {
    if (loadGame()) {
      showScreen('main');
      renderMain();
    }
  });

  if (loadGame()) {
    el.btnContinue.style.display = 'block';
  }
})();
