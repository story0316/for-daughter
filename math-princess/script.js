(() => {
  'use strict';

  const P = window.MathPrincessProblems;
  const E = window.MathPrincessEndings;
  const SC = window.MathPrincessScenarios;
  const SUBJ = window.MathPrincessSubjects;
  const Engine = window.MathPrincessEngine.createEngine({ P, SUBJ, SC, E });

  const {
    STAT_KEYS, STAT_LABELS, OUTFIT_TIERS, NPC_DEFS, ITEMS, ACTIVITY_DEFS,
    WEEKS_PER_MONTH, PRINCE_MIN_TIER, DELTA_STAT_KEYS, DELTA_STAT_LABELS,
  } = Engine;

  const TOTAL_TURNS = Number(new URLSearchParams(location.search).get('turns')) || 48;
  const SAVE_KEY = Engine.SAVE_KEY;

  const el = {
    screens: {
      start: document.getElementById('screen-start'),
      main: document.getElementById('screen-main'),
      schedule: document.getElementById('screen-schedule'),
      weekPick: document.getElementById('screen-week-pick'),
      status: document.getElementById('screen-status'),
      shop: document.getElementById('screen-shop'),
      npcSelect: document.getElementById('screen-npc-select'),
      quiz: document.getElementById('screen-quiz'),
      sessionSummary: document.getElementById('screen-session-summary'),
      event: document.getElementById('screen-event'),
      branching: document.getElementById('screen-branching'),
      ending: document.getElementById('screen-ending'),
      endingGallery: document.getElementById('screen-ending-gallery'),
    },
    totalTurnsLabel: document.getElementById('total-turns-label'),
    totalYearsLabel: document.getElementById('total-years-label'),
    btnNewGame: document.getElementById('btn-new-game'),
    btnContinue: document.getElementById('btn-continue'),
    characterNameInput: document.getElementById('character-name-input'),

    btnOpenEndingGallery: document.getElementById('btn-open-ending-gallery'),
    btnEndingGalleryBack: document.getElementById('btn-ending-gallery-back'),
    endingGallerySummary: document.getElementById('ending-gallery-summary'),
    endingGalleryList: document.getElementById('ending-gallery-list'),
    endingNewBadge: document.getElementById('ending-new-badge'),

    turnLabel: document.getElementById('turn-label'),
    goldLabel: document.getElementById('gold-label'),
    characterPortrait: document.getElementById('character-portrait'),
    characterName: document.getElementById('character-name'),
    outfitBadge: document.getElementById('outfit-badge'),
    mainMenuGrid: document.getElementById('main-menu-grid'),
    scheduleBanner: document.getElementById('schedule-banner'),
    scheduleBannerText: document.getElementById('schedule-banner-text'),
    mainStatPanel: document.getElementById('main-stat-panel'),

    btnScheduleBack: document.getElementById('btn-schedule-back'),
    weekPlanList: document.getElementById('week-plan-list'),
    weekPlanPreview: document.getElementById('week-plan-preview'),

    btnWeekPickBack: document.getElementById('btn-week-pick-back'),
    weekPickTitle: document.getElementById('week-pick-title'),
    weekPickList: document.getElementById('week-pick-list'),

    btnStatusBack: document.getElementById('btn-status-back'),
    statusPortrait: document.getElementById('status-portrait'),
    statusOutfitBadge: document.getElementById('status-outfit-badge'),
    statusStatPanel: document.getElementById('status-stat-panel'),
    statusNpcList: document.getElementById('status-npc-list'),
    statusItemList: document.getElementById('status-item-list'),
    statusUpcomingList: document.getElementById('status-upcoming-list'),

    btnShopBack: document.getElementById('btn-shop-back'),
    shopList: document.getElementById('shop-list'),
    shopGoldLabel: document.getElementById('shop-gold-label'),
    shopTabBtns: document.querySelectorAll('.shop-tab-btn'),
    wardrobeList: document.getElementById('wardrobe-list'),

    levelToast: document.getElementById('level-toast'),
    bgmPlayer: document.getElementById('bgm-player'),
    btnMuteToggle: document.getElementById('btn-mute-toggle'),

    btnNpcBack: document.getElementById('btn-npc-back'),
    npcList: document.getElementById('npc-list'),

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

    branchingEmoji: document.getElementById('branching-emoji'),
    branchingPrompt: document.getElementById('branching-prompt'),
    branchingOptions: document.getElementById('branching-options'),

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
  el.totalYearsLabel.textContent = Math.round(TOTAL_TURNS / 12);

  /* ---------------- 배경음악 ---------------- */

  // 시나리오별로 다른 배경음악을 쓰고 싶을 때만 여기에 매핑을 추가한다.
  // 매핑이 없는 시나리오/화면은 계속 'default' 트랙을 이어서 재생한다.
  const BGM_TRACKS = {
    default: 'assets/audio/bgm-default.mp3',
    'garden-walk-prince': 'assets/audio/bgm-garden-walk-prince.mp3',
    'friend-birthday': 'assets/audio/bgm-birthday.mp3',
    'coronation-ball': 'assets/audio/bgm-coronation.mp3',
    'noble-tea-party-invitation': 'assets/audio/bgm-tea-party.mp3',
    'tea-party-manners': 'assets/audio/bgm-tea-party.mp3',
  };
  const MUTE_KEY = 'math-princess-muted';
  let currentBgmKey = null;

  function isMuted() {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function playBgm(key) {
    const src = BGM_TRACKS[key] || BGM_TRACKS.default;
    if (currentBgmKey !== key) {
      currentBgmKey = key;
      el.bgmPlayer.src = src;
    }
    el.bgmPlayer.muted = isMuted();
    // 브라우저 자동재생 정책으로 play()가 거부될 수 있는데(사용자 조작
    // 전이라거나), 게임이 멈추지 않도록 조용히 무시한다.
    el.bgmPlayer.play().catch(() => {});
  }

  function updateMuteButton() {
    const muted = isMuted();
    el.btnMuteToggle.textContent = muted ? '🔇' : '🔊';
    el.bgmPlayer.muted = muted;
  }

  el.btnMuteToggle.addEventListener('click', () => {
    const nextMuted = !isMuted();
    try {
      localStorage.setItem(MUTE_KEY, nextMuted ? '1' : '0');
    } catch (e) {
      // no-op
    }
    updateMuteButton();
    if (!nextMuted) el.bgmPlayer.play().catch(() => {});
  });

  updateMuteButton();

  /* ---------------- 상태 저장/로드 ---------------- */

  let state = Engine.makeInitialState();
  let session = null;
  // 진짜로 게임을 시작(새 게임/이어하기)한 뒤부터만 페이지 백그라운드/종료 시
  // 안전망 저장을 하도록 막는 플래그. 시작 화면에 머무른 채로 앱이 닫혀도
  // 미시작 상태로 기존 저장 데이터를 덮어쓰지 않게 해준다.
  let gameStarted = false;

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
      const loaded = Engine.migrateLoadedState(JSON.parse(raw));
      if (!loaded) return false;
      state = loaded;
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------------- 엔딩 도감(여러 판에 걸쳐 누적되는 별도 저장) ---------------- */

  const ENDINGS_COLLECTION_KEY = 'math-princess-endings-v1';

  function loadEndingCollection() {
    try {
      const arr = JSON.parse(localStorage.getItem(ENDINGS_COLLECTION_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  // 이번에 도달한 엔딩을 도감에 기록한다. 이미 본 적 있으면 false, 처음 보는
  // 엔딩이면 true를 돌려줘서 화면에 "새로운 엔딩 발견!" 배지를 띄울 수 있게 한다.
  function recordEndingAchieved(endingId) {
    const collected = loadEndingCollection();
    if (collected.includes(endingId)) return false;
    collected.push(endingId);
    try {
      localStorage.setItem(ENDINGS_COLLECTION_KEY, JSON.stringify(collected));
    } catch (e) {
      // no-op
    }
    return true;
  }

  function renderEndingGallery() {
    const collected = loadEndingCollection();
    el.endingGallerySummary.textContent = `${collected.length} / ${E.ENDINGS.length} 엔딩 달성`;
    el.endingGalleryList.innerHTML = '';
    E.ENDINGS.forEach((ending) => {
      const achieved = collected.includes(ending.id);
      const card = document.createElement('div');
      card.className = `ending-gallery-card${achieved ? '' : ' locked'}`;
      card.innerHTML = achieved
        ? `<span class="ending-gallery-emoji">${ending.emoji}</span><span class="ending-gallery-title">${ending.title}</span>`
        : `<span class="ending-gallery-emoji">🔒</span><span class="ending-gallery-title">???</span>`;
      el.endingGalleryList.appendChild(card);
    });
  }

  el.btnOpenEndingGallery.addEventListener('click', () => {
    renderEndingGallery();
    showScreen('endingGallery');
  });

  el.btnEndingGalleryBack.addEventListener('click', () => showScreen('start'));

  /* ---------------- 공통 렌더 헬퍼 ---------------- */

  function yearMonthLabel(turn) {
    const year = Math.floor((turn - 1) / 12) + 1;
    const month = ((turn - 1) % 12) + 1;
    return `${year}년차 ${month}월 · 턴 ${turn}/${TOTAL_TURNS}`;
  }

  // 스탯 패널을 그린다. 이전에 이 컨테이너에 그렸던 값을 기억해두고(같은
  // 화면을 다시 그릴 때) 값이 달라진 스탯만 게이지바가 부드럽게 채워지는
  // 애니메이션과 "+N"/"-N" 팝업으로 강조해서, 방금 한 행동으로 무엇이
  // 얼마나 좋아졌는지(스트레스는 줄어드는 게 좋은 변화) 눈에 띄게 보여준다.
  const statPanelPrevValues = new WeakMap();

  // projectedDeltas를 주면(메인 화면에서 이번 달 남은 계획을 다 실행했을 때
  // 예상되는 변화, Engine.estimateRemainingWeeksDelta 결과) 게이지바 위에
  // "여기까지 오를 수 있어요"를 보여주는 반투명 예상 바를 함께 그린다.
  // 실제로 어디까지 갈지 미리 보여줘서 스케줄을 짤 동기부여가 되도록 하는 용도다.
  function renderStatPanel(container, stats, projectedDeltas) {
    const prev = statPanelPrevValues.get(container);
    const isFirstRender = !prev || container.children.length === 0;
    if (isFirstRender) container.innerHTML = '';

    STAT_KEYS.forEach((key) => {
      const value = Math.round(stats[key]);
      const isGrowth = key !== 'stress';
      const tier = isGrowth ? Engine.statTierIndex(value) : 0;
      const fillColor = isGrowth ? Engine.STAT_TIER_COLORS[tier] : '';
      const tierLabel = isGrowth ? ` <span class="stat-row-tier">Lv${tier + 1}</span>` : '';
      const projectedValue = projectedDeltas
        ? Math.max(value, Math.min(100, Math.round(value + (projectedDeltas[key] || 0))))
        : value;

      if (isFirstRender) {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.dataset.statKey = key;
        const fillStyle = `width:${value}%${fillColor ? `;background:${fillColor}` : ''}`;
        row.innerHTML = `
          <span class="stat-row-label">${STAT_LABELS[key]}</span>
          <span class="stat-row-track">
            <span class="stat-row-projected" style="width:${projectedValue}%"></span>
            <span class="stat-row-fill${key === 'stress' ? ' stress-fill' : ''}" style="${fillStyle}"></span>
          </span>
          <span class="stat-row-value">${value}${tierLabel}<span class="stat-row-delta"></span></span>
        `;
        container.appendChild(row);
        return;
      }

      const row = container.querySelector(`.stat-row[data-stat-key="${key}"]`);
      if (!row) return;
      const fillEl = row.querySelector('.stat-row-fill');
      fillEl.style.width = `${value}%`;
      if (fillColor) fillEl.style.background = fillColor;
      row.querySelector('.stat-row-projected').style.width = `${projectedValue}%`;
      row.querySelector('.stat-row-value').innerHTML = `${value}${tierLabel}<span class="stat-row-delta"></span>`;

      const delta = value - Math.round(prev[key]);
      if (delta !== 0) {
        const improved = key === 'stress' ? delta < 0 : delta > 0;
        fillEl.classList.remove('pulse');
        void fillEl.offsetWidth; // 리플로우를 강제해 pulse 애니메이션이 다시 재생되게 함
        fillEl.classList.add('pulse');
        const deltaEl = row.querySelector('.stat-row-delta');
        deltaEl.textContent = `${delta > 0 ? '+' : ''}${delta}`;
        deltaEl.className = `stat-row-delta show ${improved ? 'positive' : 'negative'}`;
      }
    });

    statPanelPrevValues.set(container, Object.assign({}, stats));
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

  // 시나리오 전용 일러스트(assets.images[0])가 있으면 그것을, 없으면 이모지를 보여준다.
  function scenarioImageHTML(scenario, sizeClass) {
    const img = scenario.assets && scenario.assets.images && scenario.assets.images[0];
    if (!img) {
      return `<span class="npc-avatar ${sizeClass || ''}"><span class="npc-avatar-fallback">${scenario.entryEmoji}</span></span>`;
    }
    return `
      <span class="npc-avatar ${sizeClass || ''}">
        <img src="${img.path}" alt="${scenario.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <span class="npc-avatar-fallback">${scenario.entryEmoji}</span>
      </span>
    `;
  }

  function renderMain() {
    playBgm('default');
    el.turnLabel.textContent = yearMonthLabel(state.turn);
    el.goldLabel.textContent = `💰 ${state.gold}G`;
    el.characterName.textContent = state.characterName;
    const newlyPurchasable = Engine.checkWardrobeGraceNotification(state);
    if (newlyPurchasable) {
      showLevelToast(`👗 ${newlyPurchasable.name} 구매 가능! 옷장에서 ${newlyPurchasable.cost}G에 살 수 있어요`);
      saveGame();
    }
    const equippedTier = OUTFIT_TIERS[state.wardrobe.equipped];
    renderPortraitInto(el.characterPortrait, state.wardrobe.equipped, 'main');
    el.outfitBadge.textContent = `${equippedTier.emoji} ${equippedTier.name}`;
    const { total: projectedDeltas } = Engine.estimateRemainingWeeksDelta(state);
    renderStatPanel(el.mainStatPanel, state.stats, projectedDeltas);
    updateScheduleBanner();
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
    const leveled = Engine.leveledUpStats(beforeTiers, state.stats);
    if (leveled.length) {
      showLevelToast(`🎉 ${leveled.map((l) => `${l.label} Lv.${l.tier}`).join(' · ')} 달성!`);
    }
  }

  /* ---------------- 활동: 공부 / 알바 / 연회 ---------------- */

  function startStudySession() {
    session = Engine.startStudySession();
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startJobSession() {
    session = Engine.startJobSession();
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startBanquetSession() {
    session = Engine.startBanquetSession();
    showScreen('quiz');
    nextQuizQuestion();
  }

  function nextQuizQuestion() {
    if (session.index >= session.count) {
      finishSession();
      return;
    }
    session.answered = false;
    const problem = Engine.generateNextProblem(state, session);
    session.currentProblem = problem;

    el.quizSessionLabel.textContent =
      session.type === 'study'
        ? `📖 공부 중 · ${Engine.subjectName(session.currentSubject)}`
        : session.type === 'job'
          ? `💼 알바 중 · ${Engine.subjectName(session.currentSubject)}`
          : session.type === 'banquet'
            ? '💃 연회 참석 중'
            : session.type === 'exercise-bonus'
              ? `🏃 운동 보너스 문제 · ${Engine.subjectName(session.currentSubject)}`
              : session.type === 'rest-bonus'
                ? `🛌 휴식 보너스 문제 · ${Engine.subjectName(session.currentSubject)}`
                : session.type === 'laundry-bonus'
                  ? `🧺 빨래 보너스 문제 · ${Engine.subjectName(session.currentSubject)}`
                  : session.type === 'garden-bonus'
                    ? `🌾 텃밭 보너스 문제 · ${Engine.subjectName(session.currentSubject)}`
                    : `${session.scenario.entryEmoji} ${session.scenario.title}`;
    el.quizProgress.textContent = `${session.index + 1} / ${session.count}`;
    el.quizCombo.textContent = `🔥 콤보 ${state.combo}`;
    el.quizLevelBadge.textContent = session.type === 'banquet' ? '예절' : session.type === 'scenario-quiz' ? session.scenario.arc : `Lv.${problem.level}`;
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

    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    if (correct) {
      Engine.applyCorrect(state, session, problem);
      announceStatLevelUps(beforeTiers);
      el.quizFeedback.textContent = `정답이에요! 🎉 ${problem.explanation}`;
    } else {
      Engine.applyWrong(state, session);
      el.quizFeedback.textContent = `아쉬워요! 정답: ${problem.answer}\n${problem.explanation}`;
    }
    el.quizCombo.textContent = `🔥 콤보 ${state.combo}`;
    saveGame();

    setTimeout(() => {
      session.index++;
      nextQuizQuestion();
    }, 1100);
  }

  function finishSession() {
    if (session.type === 'banquet') { finishBanquetSession(); return; }
    if (session.type === 'scenario-quiz') { finishScenarioQuizSession(); return; }
    if (session.type === 'exercise-bonus') { finishExerciseBonusSession(); return; }
    if (session.type === 'rest-bonus') { finishRestBonusSession(); return; }
    if (session.type === 'laundry-bonus') { finishLaundryBonusSession(); return; }
    if (session.type === 'garden-bonus') { finishGardenBonusSession(); return; }

    const outcome = Engine.finishStudyOrJobOutcome(session);
    el.summaryEmoji.textContent = outcome.perfect ? '🌟' : '✅';
    el.summaryTitle.textContent = outcome.title;
    el.summaryDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혔어요`;
    el.summaryGold.textContent = outcome.goldEarned;
    el.summaryCombo.textContent = outcome.bestCombo;
    showScreen('sessionSummary');
  }

  function finishBanquetSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const outcome = Engine.finishBanquetOutcome(state, session);
    announceStatLevelUps(beforeTiers);

    const prince = NPC_DEFS.find((n) => n.id === 'prince');
    if (outcome.result === 'met-prince') {
      el.eventEmoji.innerHTML = npcAvatarHTML(prince, 'npc-avatar-lg');
      el.eventTitle.textContent = '연회에서 왕자님을 만나다';
      el.eventDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혀 예절을 뽐냈어요! 왕자님이 다가와 말을 걸어주었어요. (애정도 ${Math.round(outcome.princeAffection)})`;
    } else if (outcome.result === 'success-underdressed') {
      el.eventEmoji.textContent = '💃';
      el.eventTitle.textContent = '연회를 마쳤어요';
      el.eventDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혀 예절을 뽐냈어요! 하지만 지금 입은 옷으로는 왕자님 눈에 띄지 못했어요. ${outcome.requiredTierName} 이상으로 갈아입어 보세요.`;
    } else {
      el.eventEmoji.textContent = '💃';
      el.eventTitle.textContent = '연회를 마쳤어요';
      el.eventDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혔어요. 예절을 조금 더 익히면 왕자님을 만날 수 있을 거예요!`;
    }
    saveGame();
    showScreen('event');
  }

  el.btnSummaryConfirm.addEventListener('click', () => {
    session = null;
    advanceWeekOrTurn();
  });

  /* ---------------- 활동: 운동 / 휴식 / 빨래 / 텃밭 ---------------- */

  function doExercise() {
    session = Engine.startExerciseSession();
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishExerciseBonusSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const { bonus } = Engine.finishExerciseBonusOutcome(state, session);
    announceStatLevelUps(beforeTiers);
    saveGame();
    if (bonus) showLevelToast('💪 문제까지 맞혀서 운동 효과가 더 좋아졌어요!');
    maybeTriggerEvent(0.25);
  }

  function doRest() {
    session = Engine.startRestSession();
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishRestBonusSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const { bonus } = Engine.finishRestBonusOutcome(state, session);
    announceStatLevelUps(beforeTiers);
    saveGame();
    if (bonus) showLevelToast('😴 문제까지 맞혀서 푹 쉬었어요!');
    maybeTriggerEvent(0.15);
  }

  // 빨래하기: 하녀를 고용하면 매턴 자동으로 처리되어 더 이상 스케줄할 필요가 없다.
  function doLaundry() {
    session = Engine.startLaundrySession();
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishLaundryBonusSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const { bonus } = Engine.finishLaundryBonusOutcome(state, session);
    announceStatLevelUps(beforeTiers);
    saveGame();
    if (bonus) showLevelToast('🧺 빨래하다 주머니에서 동전을 발견했어요!');
    advanceWeekOrTurn();
  }

  // 텃밭 가꾸기: 정원사를 고용하면 매턴 자동으로 처리되어 더 이상 스케줄할 필요가 없다.
  function doGarden() {
    session = Engine.startGardenSession();
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishGardenBonusSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const { bonus } = Engine.finishGardenBonusOutcome(state, session);
    announceStatLevelUps(beforeTiers);
    saveGame();
    if (bonus) showLevelToast('🌾 튼실한 작물을 더 수확했어요!');
    advanceWeekOrTurn();
  }

  function maybeTriggerEvent(chance) {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const event = Engine.rollRandomEvent(state, chance);
    if (!event) {
      advanceWeekOrTurn();
      return;
    }
    announceStatLevelUps(beforeTiers);
    saveGame();
    el.eventEmoji.textContent = event.emoji;
    el.eventTitle.textContent = event.title;
    el.eventDesc.textContent = event.desc;
    showScreen('event');
  }

  el.btnEventConfirm.addEventListener('click', () => {
    advanceWeekOrTurn();
  });

  /* ---------------- 친구 만나기: 상대 선택 ---------------- */

  function openNpcSelect() {
    el.npcList.innerHTML = '';
    NPC_DEFS.forEach((def) => {
      const unlocked = def.unlock(state.stats);
      const needsDressUp = unlocked && def.id === 'prince' && state.wardrobe.equipped < PRINCE_MIN_TIER;
      const npcState = state.npcs.find((n) => n.id === def.id);
      const activeScenario = unlocked ? Engine.findActiveScenario(state, def.id) : null;
      const card = document.createElement('button');
      card.className = `level-card npc-card${unlocked ? '' : ' locked'}`;
      card.innerHTML = `
        ${unlocked ? npcAvatarHTML(def, 'npc-avatar-md') : '<span class="level-badge-num">🔒</span>'}
        <span class="level-info">
          <span class="level-title">${def.name}</span>
          <span class="level-desc">${needsDressUp ? `👗 ${OUTFIT_TIERS[PRINCE_MIN_TIER].name} 이상을 입어야 만날 수 있어요` : unlocked ? (activeScenario ? `<span class="npc-scenario-hint">✨ ${activeScenario.title}</span>` : def.desc) : def.unlockHint(state.stats)}</span>
          ${unlocked ? `<span class="npc-affection-track"><span class="npc-affection-fill" style="width:${npcState.affection}%"></span></span><span class="npc-affection-label">${Engine.affectionTierName(npcState.affection)} · ${Math.round(npcState.affection)}</span>` : ''}
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
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const attempt = Engine.meetNpcAttempt(state, npcId);

    if (attempt.kind === 'blocked-outfit') {
      showLevelToast(`👑 ${attempt.requiredTierName} 이상을 입어야 왕자님을 뵐 수 있어요`);
      return;
    }
    if (attempt.kind === 'scenario') {
      runScenario(attempt.scenario);
      return;
    }

    announceStatLevelUps(beforeTiers);
    saveGame();
    el.eventEmoji.innerHTML = npcAvatarHTML(attempt.npcDef, 'npc-avatar-lg');
    el.eventTitle.textContent = `${attempt.npcDef.name}과(와)의 시간`;
    el.eventDesc.textContent = `${attempt.line} (애정도 ${Math.round(attempt.npcState.affection)} · ${Engine.affectionTierName(attempt.npcState.affection)})`;
    showScreen('event');
  }

  /* ---------------- 시나리오 계층(scenarios.js) 실행 ---------------- */

  function startScenarioQuiz(scenario) {
    session = Engine.startScenarioQuizSession(state, scenario);
    if (session.hint) showLevelToast('💡 친한 사이라 문제가 살짝 쉬워졌어요!');
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishScenarioQuizSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const result = Engine.finishScenarioQuizOutcome(state, session);
    announceStatLevelUps(beforeTiers);
    saveGame();
    el.eventEmoji.innerHTML = scenarioImageHTML(session.scenario, 'npc-avatar-lg');
    el.eventTitle.textContent = result.title;
    el.eventDesc.textContent = result.desc;
    showScreen('event');
  }

  function openBranchingScreen(scenario) {
    el.branchingEmoji.innerHTML = scenarioImageHTML(scenario, 'npc-avatar-lg');
    el.branchingPrompt.textContent = scenario.branching.prompt;
    el.branchingOptions.innerHTML = '';
    scenario.branching.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'branching-option-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
        const result = Engine.resolveBranchingOption(state, scenario, opt);
        announceStatLevelUps(beforeTiers);
        saveGame();
        el.eventEmoji.innerHTML = scenarioImageHTML(scenario, 'npc-avatar-lg');
        el.eventTitle.textContent = result.title;
        el.eventDesc.textContent = result.desc;
        showScreen('event');
      });
      el.branchingOptions.appendChild(btn);
    });
    showScreen('branching');
  }

  function resolveNarrativeScenario(scenario) {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const result = Engine.resolveNarrativeScenario(state, scenario);
    announceStatLevelUps(beforeTiers);
    saveGame();
    el.eventEmoji.innerHTML = scenarioImageHTML(scenario, 'npc-avatar-lg');
    el.eventTitle.textContent = result.title;
    el.eventDesc.textContent = result.desc;
    showScreen('event');
  }

  function runScenario(scenario) {
    if (BGM_TRACKS[scenario.id]) playBgm(scenario.id);
    if (scenario.type === 'quiz') startScenarioQuiz(scenario);
    else if (scenario.type === 'branching') openBranchingScreen(scenario);
    else resolveNarrativeScenario(scenario);
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
    if (!Engine.buyItem(state, itemId)) return;
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
    const graceTier = Engine.currentOutfit(state.stats).tierIndex;
    OUTFIT_TIERS.forEach((tier, tierIndex) => {
      const owned = state.wardrobe.owned[tierIndex];
      const purchasable = !owned && tierIndex <= graceTier;
      const equipped = tierIndex === state.wardrobe.equipped;
      const canAfford = state.gold >= tier.cost;
      const card = document.createElement('div');
      card.className = `wardrobe-card${owned ? '' : purchasable ? ' purchasable' : ' locked'}${equipped ? ' equipped' : ''}`;
      card.innerHTML = `
        ${equipped ? '<span class="wardrobe-card-badge">착용 중</span>' : ''}
        <span class="wardrobe-card-img-wrap">
          <img src="assets/wardrobe/tier${tierIndex}.png" alt="${tier.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <span class="wardrobe-card-emoji-fallback">${tier.emoji}</span>
        </span>
        <span class="wardrobe-card-label">${tier.emoji} ${tier.name}</span>
        ${purchasable ? `<button class="wardrobe-buy-btn" ${canAfford ? '' : 'disabled'}>💰 ${tier.cost}G 구매</button>` : ''}
      `;
      if (owned) {
        card.addEventListener('click', () => equipOutfit(tierIndex));
      } else if (purchasable) {
        card.querySelector('.wardrobe-card-label').textContent = tier.name;
        if (canAfford) {
          card.querySelector('.wardrobe-buy-btn').addEventListener('click', () => buyOutfit(tierIndex));
        }
      } else {
        card.querySelector('.wardrobe-card-label').textContent = tier.wardrobeDesc;
      }
      el.wardrobeList.appendChild(card);
    });
  }

  function equipOutfit(tierIndex) {
    if (!Engine.equipOutfit(state, tierIndex)) return;
    saveGame();
    renderWardrobeList();
    renderMain();
  }

  function buyOutfit(tierIndex) {
    if (!Engine.buyOutfit(state, tierIndex)) return;
    showLevelToast(`✨ 새 옷을 샀어요: ${OUTFIT_TIERS[tierIndex].name}!`);
    saveGame();
    renderWardrobeList();
    renderMain();
  }

  /* ---------------- 메인 메뉴 (스케줄 / 실행 / 쇼핑 / 옷갈아입기 / 대화 / 상태) ---------------- */

  function runActivity(activity) {
    if (activity === 'study') startStudySession();
    else if (activity === 'job') startJobSession();
    else if (activity === 'exercise') doExercise();
    else if (activity === 'rest') doRest();
    else if (activity === 'laundry') {
      if (state.items.maid) {
        showLevelToast('🧹 하녀가 이미 빨래를 도맡아 하고 있어요');
        advanceWeekOrTurn();
        return;
      }
      doLaundry();
    } else if (activity === 'garden') {
      if (state.items.gardener) {
        showLevelToast('🌾 정원사가 이미 텃밭을 돌보고 있어요');
        advanceWeekOrTurn();
        return;
      }
      doGarden();
    } else if (activity === 'friend') openNpcSelect();
    else if (activity === 'banquet') tryStartBanquet();
  }

  // 사교모임(연회)은 입장료를 내야 하고, 일정 옷 단계 이상을 입고 있어야 들어갈 수 있다.
  function tryStartBanquet() {
    const result = Engine.tryStartBanquet(state);
    if (!result.ok) {
      if (result.reason === 'outfit') {
        showLevelToast(`💃 ${result.requiredTierName} 이상을 입어야 연회에 입장할 수 있어요`);
      } else {
        showLevelToast(`💰 연회 입장료 ${result.fee}G가 부족해요`);
      }
      advanceWeekOrTurn();
      return;
    }
    saveGame();
    startBanquetSession();
  }

  function currentWeekActivity() {
    return Engine.currentWeekActivity(state);
  }

  // 메인 화면 배너: 이번 달 몇 주째인지, 이번 주에 무엇을 하기로 했는지 보여준다.
  function updateScheduleBanner() {
    const activity = currentWeekActivity();
    const weekLabel = `${state.weekIndex + 1}/${WEEKS_PER_MONTH}주`;
    if (activity && ACTIVITY_DEFS[activity]) {
      const def = ACTIVITY_DEFS[activity];
      el.scheduleBannerText.textContent = `🗓️ ${weekLabel} · 다음: ${def.emoji} ${def.name}`;
    } else {
      el.scheduleBannerText.textContent = `🗓️ ${weekLabel} · 이번 주 계획을 세워보세요`;
    }
    el.scheduleBanner.style.display = 'block';
  }

  // 하녀/정원사를 고용한 뒤에는 그 집안일을 더 이상 직접 스케줄할 필요가
  // 없다는 것을 잠금 카드 스타일로 보여준다(자동으로 처리되는 중).
  function updateWeekPickListLocks() {
    const laundryBtn = el.weekPickList.querySelector('[data-activity="laundry"]');
    const gardenBtn = el.weekPickList.querySelector('[data-activity="garden"]');
    if (laundryBtn) {
      laundryBtn.classList.toggle('locked', !!state.items.maid);
      laundryBtn.querySelector('.level-desc').textContent = state.items.maid
        ? '🧹 하녀가 대신 처리하고 있어요'
        : '문제를 풀며 빨래를 해요. 하녀를 고용하면 자동화돼요';
    }
    if (gardenBtn) {
      gardenBtn.classList.toggle('locked', !!state.items.gardener);
      gardenBtn.querySelector('.level-desc').textContent = state.items.gardener
        ? '🌾 정원사가 대신 돌보고 있어요'
        : '문제를 풀며 텃밭을 가꿔 골드를 벌어요. 정원사를 고용하면 자동화돼요';
    }
  }

  /* ---------------- 이번 달 생활 계획표 ---------------- */

  function renderWeekPlanPreview() {
    const { total, planned } = Engine.estimateRemainingWeeksDelta(state);
    el.weekPlanPreview.innerHTML = '';
    if (planned === 0) {
      el.weekPlanPreview.innerHTML = '<div class="status-empty">남은 주에 활동을 배치하면 예상 변화가 보여요</div>';
      return;
    }
    DELTA_STAT_KEYS.forEach((k) => {
      const v = total[k];
      if (Math.abs(v) < 0.05) return;
      const rounded = k === 'gold' ? Math.round(v) : Math.round(v * 10) / 10;
      const row = document.createElement('div');
      row.className = 'delta-row';
      const sign = rounded > 0 ? '+' : '';
      row.innerHTML = `<span class="delta-row-label">${DELTA_STAT_LABELS[k]}</span><span class="delta-row-value ${rounded >= 0 ? 'positive' : 'negative'}">${sign}${rounded}</span>`;
      el.weekPlanPreview.appendChild(row);
    });
  }

  function renderWeekPlanScreen() {
    el.weekPlanList.innerHTML = '';
    for (let i = 0; i < WEEKS_PER_MONTH; i++) {
      const activityId = state.weekPlan[i];
      const def = activityId ? ACTIVITY_DEFS[activityId] : null;
      const done = i < state.weekIndex;
      const isCurrent = i === state.weekIndex;
      const card = document.createElement('button');
      card.className = `level-card week-plan-card${done ? ' locked' : ''}${isCurrent ? ' current' : ''}`;
      card.innerHTML = `
        <span class="level-badge-num">${i + 1}주</span>
        <span class="level-info">
          <span class="level-title">${def ? `${def.emoji} ${def.name}` : '무엇을 할까요?'}</span>
          <span class="level-desc">${done ? '이미 지나간 주예요' : isCurrent ? '이번 주 (다음 실행)' : '탭해서 계획하기'}</span>
        </span>
        <span class="level-lock-icon">${done ? '✔️' : '›'}</span>
      `;
      if (!done) {
        card.addEventListener('click', () => openWeekActivityPicker(i));
      }
      el.weekPlanList.appendChild(card);
    }
    renderWeekPlanPreview();
  }

  function openSchedule() {
    renderWeekPlanScreen();
    showScreen('schedule');
  }

  let editingWeekIndex = 0;

  function openWeekActivityPicker(weekIdx) {
    editingWeekIndex = weekIdx;
    el.weekPickTitle.textContent = `${weekIdx + 1}주차에 할 일을 골라주세요`;
    updateWeekPickListLocks();
    showScreen('weekPick');
  }

  el.weekPickList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-activity]');
    if (!btn || btn.classList.contains('locked')) return;
    state.weekPlan[editingWeekIndex] = btn.dataset.activity;
    saveGame();
    showScreen('schedule');
    renderWeekPlanScreen();
  });

  el.btnWeekPickBack.addEventListener('click', () => {
    showScreen('schedule');
    renderWeekPlanScreen();
  });

  el.btnScheduleBack.addEventListener('click', () => {
    renderMain(); // 계획을 바꿨을 수 있으니 게이지바의 예상치(반투명 바)도 다시 계산해서 보여준다
    showScreen('main');
  });

  function executeSchedule() {
    const activity = currentWeekActivity();
    if (!activity) {
      openSchedule();
      return;
    }
    // 스트레스가 너무 쌓이면 계획했던 활동 대신 몸살이 나 앓아누울 수 있다.
    const overflow = Engine.checkStressOverflow(state);
    if (overflow) {
      saveGame();
      el.eventEmoji.textContent = overflow.emoji;
      el.eventTitle.textContent = overflow.title;
      el.eventDesc.textContent = overflow.desc;
      showScreen('event');
      return;
    }
    runActivity(activity);
  }

  function talkToDaughter() {
    const result = Engine.talkToDaughter(state);
    if (result.alreadyTalked) {
      showLevelToast('💬 오늘은 이미 충분히 대화했어요');
      return;
    }
    showLevelToast(`💬 ${result.line}`);
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
          <span class="npc-affection-wrap">
            <span class="npc-affection-track"><span class="npc-affection-fill" style="width:${npcState.affection}%"></span></span>
            <span class="npc-affection-label">${Engine.affectionTierName(npcState.affection)}</span>
          </span>
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

    renderUpcomingScenarios();
  }

  // 아직 완성되지 않은(준비중) 시나리오를 잠금 카드로 미리 보여준다.
  // 실제로 플레이할 수는 없고, 앞으로 어떤 이야기가 추가될지 살짝 엿보는 용도다.
  function renderUpcomingScenarios() {
    if (!el.statusUpcomingList) return;
    el.statusUpcomingList.innerHTML = '';
    const upcoming = (SC ? SC.SCENARIOS : []).filter((s) => s.status === 'coming-soon');
    if (upcoming.length === 0) {
      el.statusUpcomingList.innerHTML = '<div class="status-empty">곧 새로운 이야기가 추가될 예정이에요</div>';
      return;
    }
    upcoming
      .slice()
      .sort((a, b) => a.tier - b.tier)
      .forEach((s) => {
        const row = document.createElement('div');
        row.className = 'status-upcoming-row';
        row.innerHTML = `
          <span class="status-upcoming-emoji">${s.entryEmoji}</span>
          <span class="status-upcoming-info">
            <span class="status-upcoming-title">${s.title}</span>
            <span class="status-upcoming-arc">${s.arc}</span>
          </span>
          <span class="status-upcoming-badge">준비중</span>
        `;
        el.statusUpcomingList.appendChild(row);
      });
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
    const { ended } = Engine.advanceTurn(state, TOTAL_TURNS);
    if (ended) {
      showEnding();
      return;
    }
    saveGame();
    showScreen('main');
    renderMain();
  }

  // 한 주(週)의 활동을 마쳤을 때 호출한다. 이번 달(턴) 안에 남은 주가 있으면
  // 다음 주로 넘어가 메인 화면으로 돌아가고(다시 "실행"을 눌러 이어감),
  // 이번 달의 마지막 주였다면 실제로 달(턴)을 넘긴다.
  function advanceWeekOrTurn() {
    const { monthAdvanced, ended } = Engine.advanceWeekOrTurn(state, TOTAL_TURNS);
    if (!monthAdvanced) {
      saveGame();
      showScreen('main');
      renderMain();
      return;
    }
    if (ended) {
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
    const summary = Engine.computeEndingSummary(state);
    el.endingEmoji.textContent = summary.ending.emoji;
    el.endingTitle.textContent = summary.ending.title;
    el.endingDesc.textContent = summary.ending.desc;

    if (summary.closestNpc) {
      el.endingNpcLine.textContent = `${summary.closestNpc.def.emoji} 가장 가까운 사이: ${summary.closestNpc.def.name} (애정도 ${Math.round(summary.closestNpc.affection)})`;
    } else {
      el.endingNpcLine.textContent = '';
    }

    const isNewEnding = recordEndingAchieved(summary.ending.id);
    el.endingNewBadge.style.display = isNewEnding ? 'inline-block' : 'none';

    renderPortraitInto(el.endingCharacterPortrait, summary.finalOutfit.tierIndex, 'ending');
    el.endingOutfitBadge.textContent = `${summary.finalOutfit.emoji} ${summary.finalOutfit.name}`;

    renderStatPanel(el.endingStatPanel, state.stats);
    el.endingTotalCorrect.textContent = state.totalCorrect;
    el.endingBestCombo.textContent = state.bestCombo;
    el.endingGold.textContent = state.gold;
    el.endingItems.textContent = Object.values(state.items).filter(Boolean).length;
    showScreen('ending');
  }

  el.btnEndingRestart.addEventListener('click', () => {
    const prevName = state.characterName;
    state = Engine.makeInitialState(prevName);
    clearSave();
    saveGame();
    gameStarted = true;
    showScreen('main');
    renderMain();
  });

  el.btnEndingHome.addEventListener('click', () => showScreen('start'));

  /* ---------------- 시작 화면 ---------------- */

  el.btnNewGame.addEventListener('click', () => {
    state = Engine.makeInitialState(el.characterNameInput.value);
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
