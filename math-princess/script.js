(() => {
  'use strict';

  const P = window.MathPrincessProblems;
  const E = window.MathPrincessEndings;
  const SC = window.MathPrincessScenarios;
  const SUBJ = window.MathPrincessSubjects;
  const Engine = window.MathPrincessEngine.createEngine({ P, SUBJ, SC, E });
  const Profiles = window.MathPrincessProfiles;

  const {
    STAT_KEYS, STAT_LABELS, OUTFIT_TIERS, PET_TIERS, NPC_DEFS, ITEMS, ACTIVITY_DEFS,
    WEEKS_PER_MONTH, PRINCE_MIN_TIER, DELTA_STAT_KEYS, DELTA_STAT_LABELS, CAREER_DEFS,
    MEDAL_TIERS, CERT_SUBJECT_KEYS, BANQUET_TIERS, NOBLE_RANKS,
  } = Engine;

  const TOTAL_TURNS = Number(new URLSearchParams(location.search).get('turns')) || 48;

  // 저장/엔딩 도감 키는 더 이상 고정 상수가 아니라 "지금 활성화된 프로필"
  // 기준으로 매번 계산한다. 프로필을 하나도 만들어본 적 없는 사용자는
  // Profiles.DEFAULT_PROFILE_ID 하나만 쓰게 되고, 그 키는 예전 고정 키
  // (math-princess-save-v1)와 동일해서 기존 저장 데이터를 그대로 이어간다.
  function activeSaveKey() {
    return Profiles.saveKeyFor(Profiles.getActiveProfileId() || Profiles.DEFAULT_PROFILE_ID);
  }
  function activeEndingsKey() {
    return Profiles.endingsKeyFor(Profiles.getActiveProfileId() || Profiles.DEFAULT_PROFILE_ID);
  }

  const el = {
    screens: {
      start: document.getElementById('screen-start'),
      main: document.getElementById('screen-main'),
      schedule: document.getElementById('screen-schedule'),
      weekPick: document.getElementById('screen-week-pick'),
      questionCountPick: document.getElementById('screen-question-count-pick'),
      banquetTierPick: document.getElementById('screen-banquet-tier-pick'),
      status: document.getElementById('screen-status'),
      shop: document.getElementById('screen-shop'),
      npcSelect: document.getElementById('screen-npc-select'),
      quiz: document.getElementById('screen-quiz'),
      sessionSummary: document.getElementById('screen-session-summary'),
      event: document.getElementById('screen-event'),
      noblePromotion: document.getElementById('screen-noble-promotion'),
      branching: document.getElementById('screen-branching'),
      ending: document.getElementById('screen-ending'),
      endingGallery: document.getElementById('screen-ending-gallery'),
      confirmNewGame: document.getElementById('screen-confirm-new-game'),
      profiles: document.getElementById('screen-profiles'),
      profileNew: document.getElementById('screen-profile-new'),
      profilePin: document.getElementById('screen-profile-pin'),
      curriculumMode: document.getElementById('screen-curriculum-mode'),
    },
    totalTurnsLabel: document.getElementById('total-turns-label'),
    totalYearsLabel: document.getElementById('total-years-label'),
    btnNewGame: document.getElementById('btn-new-game'),
    btnContinue: document.getElementById('btn-continue'),
    characterNameInput: document.getElementById('character-name-input'),
    btnConfirmNewGame: document.getElementById('btn-confirm-new-game'),
    btnCancelNewGame: document.getElementById('btn-cancel-new-game'),
    curriculumModeList: document.getElementById('curriculum-mode-list'),
    btnCurriculumModeBack: document.getElementById('btn-curriculum-mode-back'),

    btnProfileBar: document.getElementById('btn-profile-bar'),
    profileBarAvatar: document.getElementById('profile-bar-avatar'),
    profileBarName: document.getElementById('profile-bar-name'),
    profileList: document.getElementById('profile-list'),
    btnProfileAdd: document.getElementById('btn-profile-add'),
    btnProfileBack: document.getElementById('btn-profile-back'),
    profileNameInput: document.getElementById('profile-name-input'),
    profilePinInput: document.getElementById('profile-pin-input'),
    profileNewError: document.getElementById('profile-new-error'),
    btnProfileNewConfirm: document.getElementById('btn-profile-new-confirm'),
    btnProfileNewCancel: document.getElementById('btn-profile-new-cancel'),
    profilePinTitle: document.getElementById('profile-pin-title'),
    profilePinVerifyInput: document.getElementById('profile-pin-verify-input'),
    profilePinError: document.getElementById('profile-pin-error'),
    btnProfilePinConfirm: document.getElementById('btn-profile-pin-confirm'),
    btnProfilePinCancel: document.getElementById('btn-profile-pin-cancel'),

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
    petBadge: document.getElementById('pet-badge'),
    portraitExpRingFill: document.getElementById('portrait-exp-ring-fill'),
    portraitProgressLabel: document.getElementById('portrait-progress-label'),
    nobleTitleBadge: document.getElementById('noble-title-badge'),
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

    countPickTitle: document.getElementById('count-pick-title'),
    countPickValue: document.getElementById('count-pick-value'),
    countPickSlider: document.getElementById('count-pick-slider'),
    countPickMultiplier: document.getElementById('count-pick-multiplier'),
    btnCountPickBack: document.getElementById('btn-count-pick-back'),
    btnCountPickConfirm: document.getElementById('btn-count-pick-confirm'),

    btnBanquetTierPickBack: document.getElementById('btn-banquet-tier-pick-back'),
    banquetTierPickList: document.getElementById('banquet-tier-pick-list'),

    btnStatusBack: document.getElementById('btn-status-back'),
    statusPortrait: document.getElementById('status-portrait'),
    statusOutfitBadge: document.getElementById('status-outfit-badge'),
    statusPetBadge: document.getElementById('status-pet-badge'),
    statusCareerBadge: document.getElementById('status-career-badge'),
    statusStatPanel: document.getElementById('status-stat-panel'),
    statusGraceLine: document.getElementById('status-grace-line'),
    statusCertList: document.getElementById('status-cert-list'),
    statusNpcList: document.getElementById('status-npc-list'),
    statusItemList: document.getElementById('status-item-list'),
    statusUpcomingList: document.getElementById('status-upcoming-list'),

    btnShopBack: document.getElementById('btn-shop-back'),
    shopList: document.getElementById('shop-list'),
    shopGoldLabel: document.getElementById('shop-gold-label'),
    shopTabBtns: document.querySelectorAll('.shop-tab-btn'),
    wardrobeList: document.getElementById('wardrobe-list'),
    petList: document.getElementById('pet-list'),
    careerList: document.getElementById('career-list'),

    levelToast: document.getElementById('level-toast'),
    bgmPlayer: document.getElementById('bgm-player'),
    btnMuteToggle: document.getElementById('btn-mute-toggle'),

    btnNpcBack: document.getElementById('btn-npc-back'),
    npcList: document.getElementById('npc-list'),

    quizSessionLabel: document.getElementById('quiz-session-label'),
    quizProgress: document.getElementById('quiz-progress'),
    quizCombo: document.getElementById('quiz-combo'),
    quizLevelBadge: document.getElementById('quiz-level-badge'),
    quizConcept: document.getElementById('quiz-concept'),
    quizQuestion: document.getElementById('quiz-question'),
    btnQuizHint: document.getElementById('btn-quiz-hint'),
    quizHint: document.getElementById('quiz-hint'),
    quizChoices: document.getElementById('quiz-choices'),
    quizInputWrap: document.getElementById('quiz-input-wrap'),
    quizInput: document.getElementById('quiz-input'),
    btnQuizSubmit: document.getElementById('btn-quiz-submit'),
    quizKeypad: document.getElementById('quiz-keypad'),
    quizFeedback: document.getElementById('quiz-feedback'),
    btnQuizNext: document.getElementById('btn-quiz-next'),

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

    nobleTitleInput: document.getElementById('noble-title-input'),
    nobleTitleError: document.getElementById('noble-title-error'),
    btnNobleTitleConfirm: document.getElementById('btn-noble-title-confirm'),

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

  /* ---------------- 프로필(기기 내 계정) ---------------- */
  // 서버가 없는 정적 사이트라 "로그인"은 실제 인증이 아니라, 이 기기 안에서
  // 저장 데이터를 사람별로 나누는 프로필 선택이다. 자세한 설계는 profiles.js
  // 상단 주석 참고. 프로필이 1개(기본 프로필)뿐이면 화면에 아무것도 보여주지
  // 않고 예전과 동일하게 동작한다 — 프로필 바(bar)만 항상 보여줘서, 필요할
  // 때 두 번째 프로필을 만들 수 있다는 걸 알 수 있게 한다.

  let pendingPinProfileId = null; // PIN 입력 화면이 검증하려는 대상 프로필
  let pendingDeleteId = null; // 삭제 확인 중인 프로필(목록에서 카드 하나만 "정말 삭제?" 상태로 바뀜)

  function renderProfileBar() {
    const active = Profiles.getActiveProfile();
    if (!active) {
      el.btnProfileBar.style.display = 'none';
      return;
    }
    el.btnProfileBar.style.display = 'flex';
    el.profileBarAvatar.textContent = active.emoji;
    el.profileBarName.textContent = active.name;
  }

  function selectProfile(profile) {
    if (profile.pin) {
      pendingPinProfileId = profile.id;
      el.profilePinTitle.textContent = `${profile.emoji} ${profile.name}의 PIN을 입력하세요`;
      el.profilePinVerifyInput.value = '';
      el.profilePinError.textContent = '';
      showScreen('profilePin');
      el.profilePinVerifyInput.focus();
      return;
    }
    activateProfile(profile.id);
  }

  function activateProfile(profileId) {
    Profiles.setActiveProfileId(profileId);
    // 방금 고른 프로필의 저장 데이터 기준으로 이어하기 버튼 등을 다시 계산해야 한다.
    state = Engine.makeInitialState();
    gameStarted = false;
    renderProfileBar();
    updateContinueButtonVisibility();
    showScreen('start');
  }

  function renderProfileList() {
    const list = Profiles.listProfiles();
    const canDelete = list.length > 1;
    el.profileList.innerHTML = list.map((p) => {
      if (p.id === pendingDeleteId) {
        return `
          <div class="profile-card profile-card-confirm" data-id="${p.id}">
            <span class="profile-card-confirm-text">${p.emoji} ${p.name}을(를) 정말 삭제할까요?<br/>저장 데이터도 함께 사라져요.</span>
            <div class="profile-card-confirm-actions">
              <button class="btn btn-primary profile-card-delete-confirm" data-id="${p.id}">삭제</button>
              <button class="btn btn-secondary profile-card-delete-cancel" data-id="${p.id}">취소</button>
            </div>
          </div>`;
      }
      return `
        <div class="profile-card" data-id="${p.id}">
          <button class="profile-card-select" data-id="${p.id}">
            <span class="profile-card-avatar">${p.emoji}</span>
            <span class="profile-card-name">${p.name}</span>
            ${p.pin ? '<span class="profile-card-lock">🔒</span>' : ''}
          </button>
          ${canDelete ? `<button class="profile-card-delete" data-id="${p.id}" aria-label="프로필 삭제">✕</button>` : ''}
        </div>`;
    }).join('');
  }

  function openProfileScreen() {
    pendingDeleteId = null;
    renderProfileList();
    // 프로필이 1개뿐일 때(=기본 프로필 관리 화면으로 들어온 경우)만 시작
    // 화면으로 돌아갈 수 있는 뒤로가기 버튼을 보여준다. 앱을 막 켜서 아직
    // 아무 프로필도 안 골랐을 때는 뒤로 갈 시작 화면이 없으므로 숨긴다.
    el.btnProfileBack.style.display = Profiles.getActiveProfileId() ? 'block' : 'none';
    showScreen('profiles');
  }

  el.btnProfileBar.addEventListener('click', openProfileScreen);
  el.btnProfileBack.addEventListener('click', () => showScreen('start'));

  el.profileList.addEventListener('click', (e) => {
    const selectBtn = e.target.closest('.profile-card-select');
    if (selectBtn) {
      const profile = Profiles.getProfile(selectBtn.dataset.id);
      if (profile) selectProfile(profile);
      return;
    }
    const deleteBtn = e.target.closest('.profile-card-delete');
    if (deleteBtn) {
      pendingDeleteId = deleteBtn.dataset.id;
      renderProfileList();
      return;
    }
    const confirmBtn = e.target.closest('.profile-card-delete-confirm');
    if (confirmBtn) {
      Profiles.deleteProfile(confirmBtn.dataset.id);
      pendingDeleteId = null;
      renderProfileList();
      renderProfileBar();
      return;
    }
    const cancelBtn = e.target.closest('.profile-card-delete-cancel');
    if (cancelBtn) {
      pendingDeleteId = null;
      renderProfileList();
    }
  });

  el.btnProfileAdd.addEventListener('click', () => {
    el.profileNameInput.value = '';
    el.profilePinInput.value = '';
    el.profileNewError.textContent = '';
    showScreen('profileNew');
    el.profileNameInput.focus();
  });

  el.btnProfileNewCancel.addEventListener('click', openProfileScreen);

  el.btnProfileNewConfirm.addEventListener('click', () => {
    const pin = el.profilePinInput.value.trim();
    if (pin && !/^\d{4}$/.test(pin)) {
      el.profileNewError.textContent = 'PIN은 숫자 4자리로 입력하거나 비워두세요';
      return;
    }
    const profile = Profiles.createProfile(el.profileNameInput.value, pin || null);
    activateProfile(profile.id);
  });

  el.btnProfilePinCancel.addEventListener('click', () => {
    pendingPinProfileId = null;
    openProfileScreen();
  });

  function submitProfilePin() {
    if (!pendingPinProfileId) return;
    if (Profiles.verifyPin(pendingPinProfileId, el.profilePinVerifyInput.value.trim())) {
      const id = pendingPinProfileId;
      pendingPinProfileId = null;
      activateProfile(id);
      return;
    }
    el.profilePinError.textContent = 'PIN이 올바르지 않아요';
    el.profilePinVerifyInput.value = '';
    el.profilePinVerifyInput.focus();
  }

  el.btnProfilePinConfirm.addEventListener('click', submitProfilePin);
  el.profilePinVerifyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitProfilePin();
  });

  function saveGame() {
    try {
      localStorage.setItem(activeSaveKey(), JSON.stringify(state));
      return true;
    } catch (e) {
      // 저장 공간이 꽉 찼거나(사파리 시크릿 모드 등) localStorage를 쓸 수 없는 경우에도
      // 게임 자체가 멈추지 않도록 조용히 실패시킨다.
      return false;
    }
  }

  function clearSave() {
    try {
      localStorage.removeItem(activeSaveKey());
    } catch (e) {
      // no-op
    }
  }

  function loadGame() {
    let raw;
    try {
      raw = localStorage.getItem(activeSaveKey());
    } catch (e) {
      return false;
    }
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

  // 현재 state를 건드리지 않고, 이어할 수 있는 "유효한" 저장 데이터가 있는지만
  // 확인한다(이어하기 버튼 표시 여부, 새로 시작 시 확인창 표시 여부에 사용).
  // localStorage에 값이 있어도 손상된 JSON이거나 필수 필드가 없으면 false.
  function hasValidSave() {
    let raw;
    try {
      raw = localStorage.getItem(activeSaveKey());
    } catch (e) {
      return false;
    }
    if (!raw) return false;
    try {
      return !!Engine.migrateLoadedState(JSON.parse(raw));
    } catch (e) {
      return false;
    }
  }

  function updateContinueButtonVisibility() {
    el.btnContinue.style.display = hasValidSave() ? 'block' : 'none';
  }

  /* ---------------- 엔딩 도감(여러 판에 걸쳐 누적되는 별도 저장) ---------------- */

  function loadEndingCollection() {
    try {
      const arr = JSON.parse(localStorage.getItem(activeEndingsKey()) || '[]');
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
      localStorage.setItem(activeEndingsKey(), JSON.stringify(collected));
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
  // 아직 없는 단계는 자동 생성 SVG 초상화로 대신 보여준다. OUTFIT_TIERS의
  // hasArt가 false인 단계(현재는 없음, 향후 새 단계가 그림 없이 먼저
  // 추가되는 경우를 대비)는 아예 이미지 요청을 시도하지 않고 곧바로 SVG로
  // 그린다(불필요한 404 요청/콘솔 에러를 피하기 위함).
  function renderPortraitInto(container, tierIndex, uid) {
    container.innerHTML = '';
    if (!OUTFIT_TIERS[tierIndex].hasArt) {
      container.innerHTML = MathPrincessPortrait.buildPortraitSVG(tierIndex, { uid });
      return;
    }
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
  // emotion('happy'|'surprised')을 주면 그 표정 그림(assets/npcs/{id}-{emotion}.png)을
  // 먼저 시도하고, 그 그림이 없으면(아직 표정 그림이 없는 인물이면) 기본
  // 그림으로, 기본 그림마저 없으면 이모지로 순서대로 대체한다.
  function npcAvatarHTML(def, sizeClass, emotion) {
    if (!def.hasArt) {
      return `<span class="npc-avatar ${sizeClass || ''}"><span class="npc-avatar-fallback" style="display:flex">${def.emoji}</span></span>`;
    }
    const src = emotion ? `assets/npcs/${def.id}-${emotion}.png` : `assets/npcs/${def.id}.png`;
    return `
      <span class="npc-avatar ${sizeClass || ''}">
        <img src="${src}" alt="${def.name}" onerror="if(this.dataset.tried){this.style.display='none';this.nextElementSibling.style.display='flex';}else{this.dataset.tried='1';this.src='assets/npcs/${def.id}.png';}" />
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

  // 옷 단계(평범한 옷 → 대관식 드레스)와 같은 순서로, 능력치 막대와 톤을
  // 맞춘 회색→파랑→보라→핑크→금색 팔레트에 만점(품위 100) 전용 밝은 금색을
  // 하나 더한 6단계 색상표. 초상화 EXP 링이 지금 품위 단계에 맞는 색으로 보이게 한다.
  const PORTRAIT_RING_COLORS = ['#8a93b8', '#6fa8ff', '#b48fff', '#ff8fb3', '#ffd873', '#fff6c9'];
  const PORTRAIT_RING_CIRCUMFERENCE = 2 * Math.PI * 46;

  // 메인 화면 초상화 테두리에 "평민 → 공주" 여정을 경험치 링으로 보여준다.
  // 진행도는 옷을 실제로 갈아입었는지가 아니라 그 근거가 되는 품위 점수
  // 자체(0~100)를 기준으로 하여, 성장 그 자체를 보여주는 지표로 삼는다.
  function updatePortraitProgressRing() {
    const grace = Engine.graceScore(state.stats);
    const percent = Math.max(0, Math.min(100, grace));
    const outfit = Engine.currentOutfit(state.stats);
    const offset = PORTRAIT_RING_CIRCUMFERENCE * (1 - percent / 100);
    el.portraitExpRingFill.style.strokeDashoffset = String(offset);
    // 링은 "품위 진행률(0~100%)"만 나타내므로, 품위 100 이후 작위 세분화로
    // 더 늘어난 옷 등급(tier6 이상)이 있어도 색상표는 만점 색(마지막 인덱스)에서 멈춘다.
    el.portraitExpRingFill.style.stroke = PORTRAIT_RING_COLORS[Math.min(outfit.tierIndex, PORTRAIT_RING_COLORS.length - 1)];
    el.portraitProgressLabel.textContent = `평민 → 공주 ${Math.round(percent)}%`;
  }

  function renderMain() {
    playBgm('default');
    el.turnLabel.textContent = yearMonthLabel(state.turn);
    el.goldLabel.textContent = `💰 ${state.gold}G`;
    el.characterName.textContent = state.characterName;
    // 옷장/펫/작위 승급 알림이 같은 순간(같은 renderMain 호출)에 동시에 뜰
    // 수 있어서, 토스트가 하나뿐이라 나중 호출이 앞 호출을 덮어써버리지
    // 않도록 모아서 한 번에 보여준다(showLevelToast를 이 안에서 여러 번
    // 부르면 안 됨). 작위 승급을 먼저 확인해야, 그 승급으로 새로 열린
    // 옷장/펫 등급(예: 자작 예복)도 같은 호출에서 곧바로 알림에 반영된다.
    const newGraceNotices = [];
    const newRank = Engine.checkNobleRankPromotion(state);
    if (newRank) {
      newGraceNotices.push(`👑 ${newRank.name}(으)로 승격했어요!`);
    }
    const newlyPurchasable = Engine.checkWardrobeGraceNotification(state);
    if (newlyPurchasable) {
      newGraceNotices.push(`👗 ${newlyPurchasable.name} 구매 가능! 옷장에서 ${newlyPurchasable.cost}G에 살 수 있어요`);
    }
    const newlyPurchasablePet = Engine.checkPetGraceNotification(state);
    if (newlyPurchasablePet) {
      newGraceNotices.push(`🐾 ${newlyPurchasablePet.name} 데려오기 가능! 펫 탭에서 ${newlyPurchasablePet.cost}G에 데려올 수 있어요`);
    }
    if (newGraceNotices.length) {
      showLevelToast(newGraceNotices.join(' / '));
      saveGame();
    }
    const equippedTier = OUTFIT_TIERS[state.wardrobe.equipped];
    renderPortraitInto(el.characterPortrait, state.wardrobe.equipped, 'main');
    el.outfitBadge.textContent = `${equippedTier.emoji} ${equippedTier.name}`;
    if (state.pets.equipped !== null) {
      const equippedPetTier = PET_TIERS[state.pets.equipped];
      el.petBadge.textContent = `${equippedPetTier.emoji} ${equippedPetTier.name}`;
      el.petBadge.style.display = 'inline-block';
    } else {
      el.petBadge.style.display = 'none';
    }
    updatePortraitProgressRing();
    if (state.nobleTitle) {
      const currentRank = state.nobleRankIndex != null ? NOBLE_RANKS[state.nobleRankIndex] : null;
      el.nobleTitleBadge.textContent = currentRank ? `👑 ${currentRank.name}(${state.nobleTitle})` : `👑 ${state.nobleTitle}`;
      el.nobleTitleBadge.style.display = 'inline-block';
    } else {
      el.nobleTitleBadge.style.display = 'none';
    }
    const { total: projectedDeltas } = Engine.estimateRemainingWeeksDelta(state);
    renderStatPanel(el.mainStatPanel, state.stats, projectedDeltas);
    updateScheduleBanner();
  }

  // 성장 능력치 6개가 전부 Lv5를 다 채우면(값 50), 메인 화면으로 돌아가는
  // 대신 왕실 작위 수여 이벤트를 먼저 보여준다. 그 외의 경우엔 평소처럼
  // 메인 화면을 그린다. onArrived는 실제로 메인 화면에 도착했을 때만
  // 실행할 후속 작업(예: 왕자님과 우연히 마주치는 토스트)을 위한 콜백이다.
  function goToMainScreen(onArrived) {
    if (Engine.noblePromotionEligible(state)) {
      showNoblePromotionCeremony(() => {
        renderMain();
        showScreen('main');
        if (onArrived) onArrived();
      });
      return;
    }
    renderMain();
    showScreen('main');
    if (onArrived) onArrived();
  }

  // 작위 수여 확인 뒤 무엇을 할지는 상황에 따라 다르다(보통은 메인 화면으로,
  // 하지만 마지막 턴에 조건을 채운 경우엔 엔딩으로 이어져야 한다). 그래서
  // "메인으로 가기"를 하드코딩하지 않고 호출부가 넘겨준 콜백을 그대로 실행한다.
  let afterNoblePromotionConfirm = null;

  function showNoblePromotionCeremony(afterConfirm) {
    afterNoblePromotionConfirm = afterConfirm || (() => { renderMain(); showScreen('main'); });
    el.nobleTitleInput.value = '';
    el.nobleTitleError.textContent = '';
    showScreen('noblePromotion');
  }

  el.btnNobleTitleConfirm.addEventListener('click', () => {
    if (!Engine.grantNobleTitle(state, el.nobleTitleInput.value)) {
      el.nobleTitleError.textContent = '작위명을 입력해주세요';
      return;
    }
    saveGame();
    showLevelToast(`👑 ${NOBLE_RANKS[state.nobleRankIndex].name} ${state.nobleTitle} 작위를 받아 귀족이 되었어요!`);
    const next = afterNoblePromotionConfirm || (() => { renderMain(); showScreen('main'); });
    afterNoblePromotionConfirm = null;
    next();
  });

  // 게임이 끝나는 턴(마지막 달)에 마침 승급 조건도 함께 채웠다면, 엔딩으로
  // 곧장 넘어가기 전에 작위 수여 이벤트를 먼저 보여주고 그 다음 엔딩으로
  // 이어간다(그렇지 않으면 승급 기회가 영영 사라짐 — 엔딩 화면은 저장을
  // 지우고 처음부터 다시 시작하게 만들기 때문).
  function showEndingOrNoblePromotionFirst() {
    if (Engine.noblePromotionEligible(state)) {
      showNoblePromotionCeremony(() => showEnding());
      return;
    }
    showEnding();
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

  function startStudySession(count) {
    session = Engine.startStudySession(count);
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startJobSession(count) {
    session = Engine.startJobSession(count);
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startSchoolSession(count) {
    session = Engine.startSchoolSession(state, count);
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startBanquetSession(tierId) {
    session = Engine.startBanquetSession(tierId);
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startCompetitionSession(count) {
    session = Engine.startCompetitionSession(state, count);
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startCreativitySession(count) {
    session = Engine.startCreativitySession(count);
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startFaithSession() {
    session = Engine.startFaithSession();
    showScreen('quiz');
    nextQuizQuestion();
  }

  // 세션 내내 같은 선생님/왕실 학자가 도움을 주는 느낌을 주기 위해, 도움 캐릭터를
  // 세션 시작 시(첫 문제에서) 한 번만 무작위로 고르고 계속 재사용한다.
  const HINT_HELPER_NPC_IDS = ['teacher', 'sage'];

  function nextQuizQuestion() {
    if (!session.reviewRound && session.index >= session.count) {
      if (session.wrongQueue && session.wrongQueue.length && Engine.isReviewableSession(session)) {
        session.reviewRound = true;
        session.reviewQueue = session.wrongQueue;
        session.wrongQueue = [];
        session.reviewIndex = 0;
        session.reviewCorrectCount = 0;
        showLevelToast(`🔁 복습 시간이에요! 틀린 문제 ${session.reviewQueue.length}개를 다시 풀어볼까요?`);
      } else {
        finishSession();
        return;
      }
    }
    if (session.reviewRound && session.reviewIndex >= session.reviewQueue.length) {
      finishSession();
      return;
    }
    if (!session.helperNpc) {
      session.helperNpc = HINT_HELPER_NPC_IDS[Math.floor(Math.random() * HINT_HELPER_NPC_IDS.length)];
    }
    el.quizHint.style.display = 'none';
    el.quizHint.textContent = '';
    el.btnQuizNext.style.display = 'none';
    session.answered = false;
    let problem;
    if (session.reviewRound) {
      const item = session.reviewQueue[session.reviewIndex];
      session.currentSubject = item.subjectKey;
      problem = Object.assign({}, item.problem, { choices: Array.isArray(item.problem.choices) ? Engine.shuffle(item.problem.choices) : item.problem.choices });
    } else {
      problem = Engine.generateNextProblem(state, session);
    }
    session.currentProblem = problem;

    el.quizSessionLabel.textContent =
      session.type === 'study'
        ? `📖 공부 중 · ${Engine.subjectName(session.currentSubject)}`
        : session.type === 'job'
          ? `💼 알바 중 · ${Engine.subjectName(session.currentSubject)}`
          : session.type === 'school'
            ? `🏫 학교 수업 중 · ${Engine.schoolSubjectName(session.currentSubject)} (${(NPC_DEFS.find((n) => n.id === session.helperNpc) || {}).name || ''})`
            : session.type === 'banquet'
              ? `💃 ${(BANQUET_TIERS.find((t) => t.id === session.tierId) || BANQUET_TIERS[0]).name} 참석 중`
              : session.type === 'exercise-bonus'
                ? `🏃 운동 보너스 문제 · ${Engine.subjectName(session.currentSubject)}`
                : session.type === 'rest-bonus'
                  ? `🛌 휴식 보너스 문제 · ${Engine.subjectName(session.currentSubject)}`
                  : session.type === 'laundry-bonus'
                    ? `🧺 빨래 보너스 문제 · ${Engine.subjectName(session.currentSubject)}`
                    : session.type === 'garden-bonus'
                      ? `🌾 텃밭 보너스 문제 · ${Engine.subjectName(session.currentSubject)}`
                      : session.type === 'competition'
                        ? '🏆 왕국 수학경시대회'
                        : session.type === 'creativity'
                          ? '🎨 창의력 올림피아드'
                          : session.type === 'faith'
                            ? '🙏 기도와 선행'
                            : session.type === 'cert-exam'
                            ? `📜 ${Engine.subjectName(session.subject)} ${session.tier.name} 인증 시험`
                            : `${session.scenario.entryEmoji} ${session.scenario.title}`;
    if (session.reviewRound) {
      el.quizSessionLabel.textContent = `🔁 오답 복습 · ${el.quizSessionLabel.textContent}`;
      el.quizProgress.textContent = `복습 ${session.reviewIndex + 1} / ${session.reviewQueue.length}`;
    } else {
      el.quizProgress.textContent = `${session.index + 1} / ${session.count}`;
    }
    el.quizCombo.textContent = `🔥 콤보 ${state.combo}`;
    el.quizLevelBadge.textContent = session.type === 'banquet'
      ? '예절'
      : session.type === 'creativity'
        ? '창의력'
        : session.type === 'faith'
          ? '선행'
          : session.type === 'scenario-quiz'
            ? session.scenario.arc
            : `Lv.${problem.level}`;
    if (problem.concept) {
      const conceptHelper = NPC_DEFS.find((n) => n.id === session.helperNpc) || NPC_DEFS.find((n) => n.id === 'teacher');
      el.quizConcept.innerHTML = `${conceptHelper.emoji} <b>${conceptHelper.name}</b>: ${problem.concept}`;
      el.quizConcept.style.display = 'block';
    } else {
      el.quizConcept.textContent = '';
      el.quizConcept.style.display = 'none';
    }
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
    } else if (el.quizInput.value.length < 12) {
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
    if (session.reviewRound) {
      // 복습 라운드는 골드·능력치·콤보를 다시 주지 않는다(일부러 틀리고
      // 복습에서 다시 맞혀 보상을 두 번 받는 것을 막기 위함). 학습
      // 로그·숙달도만 정규 라운드와 똑같이 갱신된다.
      Engine.recordReviewAnswer(state, session, problem, correct);
      if (correct) {
        session.reviewCorrectCount++;
        el.quizFeedback.textContent = `정답이에요! 🎉 ${problem.explanation}`;
      } else {
        el.quizFeedback.textContent = `아쉬워요! 정답: ${problem.answer}\n${problem.explanation}`;
      }
    } else if (correct) {
      Engine.applyCorrect(state, session, problem);
      announceStatLevelUps(beforeTiers);
      el.quizFeedback.textContent = `정답이에요! 🎉 ${problem.explanation}`;
    } else {
      // 반복 오답 여부는 기록이 남기 전에 확인해야 한다(기록 후엔 방금 남긴
      // 자기 자신과 비교하게 되어 항상 true가 됨).
      const repeatMistake = Engine.isRepeatMistake(state, session, problem);
      Engine.applyWrong(state, session, problem);
      el.quizFeedback.textContent = repeatMistake
        ? `아쉬워요! 정답: ${problem.answer}\n${problem.explanation}\n\n🔁 이 문제, 예전에도 헷갈렸었죠? 아래 힌트를 같이 살펴봐요!`
        : `아쉬워요! 정답: ${problem.answer}\n${problem.explanation}`;
      if (repeatMistake) revealHint();
      // 오답 복습 라운드에 담을 수 있는 세션 유형이면, 나중에 세션이 끝난
      // 뒤 이 문제를 한 번 더 물어볼 수 있도록 큐에 쌓아둔다.
      if (Engine.isReviewableSession(session)) {
        if (!session.wrongQueue) session.wrongQueue = [];
        session.wrongQueue.push({ problem, subjectKey: session.currentSubject });
      }
    }
    el.quizCombo.textContent = `🔥 콤보 ${state.combo}`;
    saveGame();

    el.btnQuizNext.style.display = 'block';
  }

  el.btnQuizNext.addEventListener('click', () => {
    if (!session || !session.answered) return;
    if (session.reviewRound) session.reviewIndex++;
    else session.index++;
    nextQuizQuestion();
  });

  // 문제 유형별로 미리 준비해둔 힌트(problem.hint)가 있으면 그걸 보여주고,
  // 없으면(영어/과학/예절/시나리오처럼 아직 힌트를 안 써둔 문제) 정답을
  // 직접 알려주지 않으면서도 도움이 되는 일반적인 풀이 전략을 보여준다.
  const GENERIC_HINT_CHOICE = '확실히 답이 아닌 것 같은 보기부터 하나씩 지워보렴. 그리고 문제를 다시 한 번 천천히 읽어보면 힌트가 보일 거야!';
  const GENERIC_HINT_INPUT = '문제를 다시 한 번 천천히 읽고, 무엇을 구해야 하는지부터 확인해보렴. 아는 것부터 하나씩 정리해서 계산해보면 실마리가 보일 거야!';

  function revealHint() {
    if (!session || !session.currentProblem) return;
    const helper = NPC_DEFS.find((n) => n.id === session.helperNpc) || NPC_DEFS.find((n) => n.id === 'teacher');
    const problem = session.currentProblem;
    const hintText = problem.hint || (problem.type === 'choice' ? GENERIC_HINT_CHOICE : GENERIC_HINT_INPUT);
    el.quizHint.textContent = `${helper.emoji} ${helper.name}: "${hintText}"`;
    el.quizHint.style.display = 'block';
  }

  el.btnQuizHint.addEventListener('click', revealHint);

  // 오답 복습 라운드를 거친 세션이면 결과 화면 설명에 복습 성적을 덧붙인다.
  function reviewSummarySuffix(session) {
    if (!session.reviewQueue || !session.reviewQueue.length) return '';
    return ` · 🔁 복습 ${session.reviewCorrectCount}/${session.reviewQueue.length}문제 다시 맞힘`;
  }

  function finishSession() {
    if (session.type === 'banquet') { finishBanquetSession(); return; }
    if (session.type === 'scenario-quiz') { finishScenarioQuizSession(); return; }
    if (session.type === 'exercise-bonus') { finishExerciseBonusSession(); return; }
    if (session.type === 'rest-bonus') { finishRestBonusSession(); return; }
    if (session.type === 'laundry-bonus') { finishLaundryBonusSession(); return; }
    if (session.type === 'garden-bonus') { finishGardenBonusSession(); return; }
    if (session.type === 'competition') { finishCompetitionSession(); return; }
    if (session.type === 'creativity') { finishCreativitySession(); return; }
    if (session.type === 'faith') { finishFaithSession(); return; }
    if (session.type === 'cert-exam') { finishCertExamSession(); return; }

    const outcome = Engine.finishStudyOrJobOutcome(session);
    el.summaryEmoji.textContent = outcome.perfect ? '🌟' : '✅';
    el.summaryTitle.textContent = outcome.title;
    el.summaryDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혔어요${reviewSummarySuffix(session)}`;
    el.summaryGold.textContent = outcome.goldEarned;
    el.summaryCombo.textContent = outcome.bestCombo;
    updateSummaryConfirmLabel();
    showScreen('sessionSummary');
  }

  function finishBanquetSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const outcome = Engine.finishBanquetOutcome(state, session);
    announceStatLevelUps(beforeTiers);

    const prince = NPC_DEFS.find((n) => n.id === 'prince');
    if (outcome.result === 'met-prince') {
      el.eventEmoji.innerHTML = npcAvatarHTML(prince, 'npc-avatar-lg', 'surprised');
      el.eventTitle.textContent = '연회에서 왕자님을 만나다';
      el.eventDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혀 예절을 뽐냈어요! 왕자님이 다가와 말을 걸어주었어요. (애정도 ${Math.round(outcome.princeAffection)})`;
    } else if (outcome.result === 'success-underdressed') {
      el.eventEmoji.textContent = '💃';
      el.eventTitle.textContent = '연회를 마쳤어요';
      el.eventDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혀 예절을 뽐냈어요! 하지만 지금 입은 옷으로는 왕자님 눈에 띄지 못했어요. ${outcome.requiredTierName} 이상으로 갈아입어 보세요.`;
    } else if (outcome.result === 'success-lower-tier') {
      el.eventEmoji.textContent = '💃';
      el.eventTitle.textContent = '연회를 성공적으로 마쳤어요';
      el.eventDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혀 예절을 뽐냈어요! 왕자님은 고급 사교 모임에서만 만날 수 있어요.`;
    } else {
      el.eventEmoji.textContent = '💃';
      el.eventTitle.textContent = '연회를 마쳤어요';
      el.eventDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혔어요. 예절을 조금 더 익히면 다음엔 통과할 수 있을 거예요!`;
    }
    saveGame();
    showScreen('event');
  }

  function finishCompetitionSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const outcome = Engine.finishCompetitionOutcome(state, session);
    announceStatLevelUps(beforeTiers);
    el.summaryEmoji.textContent = outcome.perfect ? '🏆' : '🥈';
    el.summaryTitle.textContent = outcome.perfect ? '왕국 수학경시대회에서 만점을 받았어요!' : '왕국 수학경시대회를 마쳤어요';
    el.summaryDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혔어요${reviewSummarySuffix(session)}`;
    el.summaryGold.textContent = outcome.goldEarned;
    el.summaryCombo.textContent = session.sessionBestCombo;
    updateSummaryConfirmLabel();
    saveGame();
    showScreen('sessionSummary');
  }

  function finishCreativitySession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const outcome = Engine.finishCreativityOutcome(state, session);
    announceStatLevelUps(beforeTiers);
    el.summaryEmoji.textContent = outcome.perfect ? '🎨' : '✅';
    el.summaryTitle.textContent = outcome.perfect ? '창의력 올림피아드에서 만점을 받았어요!' : '창의력 올림피아드를 마쳤어요';
    el.summaryDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혔어요${reviewSummarySuffix(session)}`;
    el.summaryGold.textContent = outcome.goldEarned;
    el.summaryCombo.textContent = session.sessionBestCombo;
    updateSummaryConfirmLabel();
    saveGame();
    showScreen('sessionSummary');
  }

  function finishFaithSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const outcome = Engine.finishFaithOutcome(session);
    announceStatLevelUps(beforeTiers);
    el.summaryEmoji.textContent = outcome.perfect ? '🙏' : '✅';
    el.summaryTitle.textContent = outcome.perfect ? '기도와 선행으로 마음이 가득 채워졌어요!' : '기도와 선행 시간을 마쳤어요';
    el.summaryDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혔어요${reviewSummarySuffix(session)}`;
    el.summaryGold.textContent = session.goldEarned;
    el.summaryCombo.textContent = outcome.bestCombo;
    updateSummaryConfirmLabel();
    saveGame();
    showScreen('sessionSummary');
  }

  // 이번 주가 이번 달의 마지막 주(4주차)일 때만 실제로 달이 넘어가므로,
  // 그렇지 않을 때 "다음 달로"라고 표시하면 오해를 준다.
  function updateSummaryConfirmLabel() {
    const isLastWeek = state.weekIndex === WEEKS_PER_MONTH - 1;
    el.btnSummaryConfirm.textContent = isLastWeek ? '다음 달로' : '다음 주로';
  }

  el.btnSummaryConfirm.addEventListener('click', () => {
    const wasCertExam = session && session.type === 'cert-exam';
    session = null;
    if (wasCertExam) {
      // 인증 시험은 예약된 주간 활동이 아니라 상태 화면에서 바로 응시하는
      // 것이므로, 확인을 눌러도 주/달을 넘기지 않고 상태 화면으로 돌아간다.
      renderStatusScreen();
      showScreen('status');
      return;
    }
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

  el.btnNpcBack.addEventListener('click', () => goToMainScreen());

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
    el.eventEmoji.innerHTML = npcAvatarHTML(attempt.npcDef, 'npc-avatar-lg', 'happy');
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
    el.shopList.style.display = tab === 'items' ? 'flex' : 'none';
    el.wardrobeList.style.display = tab === 'wardrobe' ? 'grid' : 'none';
    el.petList.style.display = tab === 'pet' ? 'grid' : 'none';
    el.careerList.style.display = tab === 'career' ? 'flex' : 'none';
    if (tab === 'wardrobe') renderWardrobeList();
    else if (tab === 'pet') renderPetList();
    else if (tab === 'career') renderCareerList();
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
    goToMainScreen();
  });

  el.shopTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchShopTab(btn.dataset.tab));
  });

  /* ---------------- 옷장 ---------------- */

  function renderWardrobeList() {
    el.wardrobeList.innerHTML = '';
    OUTFIT_TIERS.forEach((tier, tierIndex) => {
      const owned = state.wardrobe.owned[tierIndex];
      const purchasable = !owned && Engine.outfitRequirementMet(state, tierIndex);
      const equipped = tierIndex === state.wardrobe.equipped;
      const canAfford = state.gold >= tier.cost;
      const nobleBadgeText = typeof tier.requiredNobleRankIndex === 'number'
        ? `👑 ${NOBLE_RANKS[tier.requiredNobleRankIndex].name} 이상`
        : '👑 귀족 전용';
      const card = document.createElement('div');
      card.className = `wardrobe-card${owned ? '' : purchasable ? ' purchasable' : ' locked'}${equipped ? ' equipped' : ''}${tier.requiresNoble ? ' noble-tier' : ''}`;
      card.innerHTML = `
        ${equipped ? '<span class="wardrobe-card-badge">착용 중</span>' : ''}
        ${tier.requiresNoble ? `<span class="wardrobe-card-noble-badge">${nobleBadgeText}</span>` : ''}
        <span class="wardrobe-card-img-wrap">
          ${tier.hasArt ? `<img src="assets/wardrobe/tier${tierIndex}.png" alt="${tier.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
          <span class="wardrobe-card-emoji-fallback" style="${tier.hasArt ? '' : 'display:flex'}">${tier.emoji}</span>
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

  /* ---------------- 애완동물 ---------------- */
  // 옷장 렌더링(renderWardrobeList/equipOutfit/buyOutfit)과 같은 구조를 그대로 따른다.

  function renderPetList() {
    el.petList.innerHTML = '';
    PET_TIERS.forEach((tier, tierIndex) => {
      const owned = state.pets.owned[tierIndex];
      const purchasable = !owned && Engine.petRequirementMet(state, tierIndex);
      const equipped = tierIndex === state.pets.equipped;
      const canAfford = state.gold >= tier.cost;
      const nobleBadgeText = typeof tier.requiredNobleRankIndex === 'number'
        ? `👑 ${NOBLE_RANKS[tier.requiredNobleRankIndex].name} 이상`
        : '👑 귀족 전용';
      const card = document.createElement('div');
      card.className = `wardrobe-card${owned ? '' : purchasable ? ' purchasable' : ' locked'}${equipped ? ' equipped' : ''}${tier.requiresNoble ? ' noble-tier' : ''}`;
      card.innerHTML = `
        ${equipped ? '<span class="wardrobe-card-badge">함께하는 중</span>' : ''}
        ${tier.requiresNoble ? `<span class="wardrobe-card-noble-badge">${nobleBadgeText}</span>` : ''}
        <span class="wardrobe-card-img-wrap">
          ${tier.hasArt ? `<img src="assets/pets/tier${tierIndex}.png" alt="${tier.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
          <span class="wardrobe-card-emoji-fallback" style="${tier.hasArt ? '' : 'display:flex'}">${tier.emoji}</span>
        </span>
        <span class="wardrobe-card-label">${tier.emoji} ${tier.name}</span>
        ${purchasable ? `<button class="wardrobe-buy-btn" ${canAfford ? '' : 'disabled'}>💰 ${tier.cost}G 데려오기</button>` : ''}
      `;
      if (owned) {
        card.addEventListener('click', () => equipPet(tierIndex));
      } else if (purchasable) {
        card.querySelector('.wardrobe-card-label').textContent = tier.name;
        if (canAfford) {
          card.querySelector('.wardrobe-buy-btn').addEventListener('click', () => buyPet(tierIndex));
        }
      } else {
        card.querySelector('.wardrobe-card-label').textContent = tier.petDesc;
      }
      el.petList.appendChild(card);
    });
  }

  function equipPet(tierIndex) {
    if (!Engine.equipPet(state, tierIndex)) return;
    saveGame();
    renderPetList();
    renderMain();
  }

  function buyPet(tierIndex) {
    if (!Engine.buyPet(state, tierIndex)) return;
    showLevelToast(`🐾 새 동물 친구가 생겼어요: ${PET_TIERS[tierIndex].name}!`);
    saveGame();
    renderPetList();
    renderMain();
  }

  /* ---------------- 직업(정식 취업) ---------------- */

  function renderCareerList() {
    el.careerList.innerHTML = '';
    CAREER_DEFS.forEach((career) => {
      const met = Engine.careerRequirementMet(state.stats, career);
      const employed = state.career === career.id;
      const reqText = Object.keys(career.requirement)
        .map((key) => `${STAT_LABELS[key]} ${career.requirement[key]} 이상(현재 ${Math.round(state.stats[key])})`)
        .join(' · ');
      const card = document.createElement('div');
      card.className = `level-card career-card${met ? '' : ' locked'}${employed ? ' employed' : ''}`;
      card.innerHTML = `
        <span class="level-badge-num">${career.emoji}</span>
        <span class="level-info">
          <span class="level-title">${career.name}${employed ? ' <span class="career-employed-badge">재직 중</span>' : ''}</span>
          <span class="level-desc">${career.desc}</span>
          <span class="shop-cost">요건: ${reqText} · 매달 💰${career.monthlyGold}G</span>
        </span>
        <button class="shop-buy-btn" ${!employed && !met ? 'disabled' : ''}>${employed ? '그만두기' : met ? '지원하기' : '요건 미달'}</button>
      `;
      if (employed) {
        card.querySelector('.shop-buy-btn').addEventListener('click', () => resignCareerUI(career.id));
      } else if (met) {
        card.querySelector('.shop-buy-btn').addEventListener('click', () => applyForCareerUI(career.id));
      }
      el.careerList.appendChild(card);
    });
  }

  function applyForCareerUI(careerId) {
    if (!Engine.applyForCareer(state, careerId)) return;
    const career = CAREER_DEFS.find((c) => c.id === careerId);
    showLevelToast(`💼 ${career.name}(으)로 취업했어요! 매달 ${career.monthlyGold}G가 들어와요`);
    saveGame();
    renderCareerList();
  }

  function resignCareerUI(careerId) {
    const career = CAREER_DEFS.find((c) => c.id === careerId);
    Engine.resignCareer(state);
    showLevelToast(`💼 ${career.name}을(를) 그만뒀어요`);
    saveGame();
    renderCareerList();
  }

  /* ---------------- 메인 메뉴 (스케줄 / 실행 / 쇼핑 / 옷갈아입기 / 대화 / 상태) ---------------- */

  function runActivity(activity) {
    const chosenCount = state.weekPlanCount[state.weekIndex];
    if (activity === 'study') startStudySession(chosenCount);
    else if (activity === 'job') startJobSession(chosenCount);
    else if (activity === 'school') startSchoolSession(chosenCount);
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
    else if (activity === 'banquet') tryStartBanquet(state.weekPlanBanquetTier[state.weekIndex] || BANQUET_TIERS[0].id);
    else if (activity === 'competition') {
      if (!Engine.competitionUnlocked(state)) {
        showLevelToast(`🏆 지능 ${Engine.COMPETITION_MIN_INTELLIGENCE} 이상이어야 왕국 수학경시대회에 도전할 수 있어요`);
        advanceWeekOrTurn();
        return;
      }
      startCompetitionSession(chosenCount);
    } else if (activity === 'creativity') {
      if (!Engine.creativityOlympiadUnlocked(state)) {
        showLevelToast(`🎨 창의력 ${Engine.CREATIVITY_MIN_CREATIVITY} 이상이어야 창의력 올림피아드에 도전할 수 있어요`);
        advanceWeekOrTurn();
        return;
      }
      startCreativitySession(chosenCount);
    } else if (activity === 'faith') {
      startFaithSession();
    }
  }

  // 사교모임(연회)은 등급별로 입장료·옷차림·품위·영어 인증 요건이 다르다.
  function tryStartBanquet(tierId) {
    const result = Engine.tryStartBanquet(state, tierId);
    if (!result.ok) {
      if (result.reason === 'outfit') {
        showLevelToast(`💃 ${result.requiredTierName} 이상을 입어야 연회에 입장할 수 있어요`);
      } else if (result.reason === 'grace') {
        showLevelToast(`💃 품위 ${result.requiredGrace} 이상이어야 입장할 수 있어요`);
      } else if (result.reason === 'english-cert') {
        showLevelToast(`📜 영어 ${result.requiredMedal.name} 이상 인증이 있어야 입장할 수 있어요`);
      } else {
        showLevelToast(`💰 연회 입장료 ${result.fee}G가 부족해요`);
      }
      advanceWeekOrTurn();
      return;
    }
    saveGame();
    startBanquetSession(tierId);
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
    const competitionBtn = el.weekPickList.querySelector('[data-activity="competition"]');
    if (competitionBtn) {
      const unlocked = Engine.competitionUnlocked(state);
      competitionBtn.classList.toggle('locked', !unlocked);
      competitionBtn.querySelector('.level-desc').textContent = unlocked
        ? '덧셈뺄셈부터 시작해 점점 어려워지는 문제에 도전해요(문제 수는 직접 선택). 어려워질수록 상금도 커져요'
        : `🔒 지능 ${Engine.COMPETITION_MIN_INTELLIGENCE} 이상 필요 (현재 ${Math.round(state.stats.intelligence)})`;
    }
    const creativityBtn = el.weekPickList.querySelector('[data-activity="creativity"]');
    if (creativityBtn) {
      const unlocked = Engine.creativityOlympiadUnlocked(state);
      creativityBtn.classList.toggle('locked', !unlocked);
      creativityBtn.querySelector('.level-desc').textContent = unlocked
        ? '패턴 찾기, 유추, 공간지각, 창의적 사고 퀴즈에 도전해요(문제 수는 직접 선택). 창의력이 올라요'
        : `🔒 창의력 ${Engine.CREATIVITY_MIN_CREATIVITY} 이상 필요 (현재 ${Math.round(state.stats.creativity)})`;
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

  // 공부/알바/학교 수업/왕국 수학경시대회는 문제 수를 도전자가 직접 고를 수 있다.
  const COUNTABLE_ACTIVITIES = ['study', 'job', 'school', 'competition', 'creativity'];

  function activityDefaultCount(activityId) {
    if (activityId === 'study') return Engine.QUESTIONS_PER_STUDY;
    if (activityId === 'job') return Engine.QUESTIONS_PER_JOB;
    if (activityId === 'school') return Engine.QUESTIONS_PER_SCHOOL;
    if (activityId === 'competition') return Engine.QUESTIONS_PER_COMPETITION;
    if (activityId === 'creativity') return Engine.QUESTIONS_PER_CREATIVITY;
    return null;
  }

  function renderWeekPlanScreen() {
    el.weekPlanList.innerHTML = '';
    for (let i = 0; i < WEEKS_PER_MONTH; i++) {
      const activityId = state.weekPlan[i];
      const def = activityId ? ACTIVITY_DEFS[activityId] : null;
      const done = i < state.weekIndex;
      const isCurrent = i === state.weekIndex;
      const countLabel = activityId && COUNTABLE_ACTIVITIES.includes(activityId)
        ? ` · 문제 ${state.weekPlanCount[i] != null ? state.weekPlanCount[i] : activityDefaultCount(activityId)}개`
        : activityId === 'banquet'
          ? ` · ${(BANQUET_TIERS.find((t) => t.id === state.weekPlanBanquetTier[i]) || BANQUET_TIERS[0]).name}`
          : '';
      const card = document.createElement('button');
      card.className = `level-card week-plan-card${done ? ' locked' : ''}${isCurrent ? ' current' : ''}`;
      card.innerHTML = `
        <span class="level-badge-num">${i + 1}주</span>
        <span class="level-info">
          <span class="level-title">${def ? `${def.emoji} ${def.name}` : '무엇을 할까요?'}</span>
          <span class="level-desc">${done ? '이미 지나간 주예요' : (isCurrent ? '이번 주 (다음 실행)' : '탭해서 계획하기') + countLabel}</span>
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
  let countPickActivity = null;

  function openWeekActivityPicker(weekIdx) {
    editingWeekIndex = weekIdx;
    el.weekPickTitle.textContent = `${weekIdx + 1}주차에 할 일을 골라주세요`;
    updateWeekPickListLocks();
    showScreen('weekPick');
  }

  function updateCountPickPreview() {
    const n = Number(el.countPickSlider.value);
    el.countPickValue.textContent = `${n}문제`;
    const lm = Engine.sessionLengthMultiplier(n, activityDefaultCount(countPickActivity));
    const pct = Math.round((lm - 1) * 100);
    el.countPickMultiplier.textContent = pct === 0
      ? '기본 보상'
      : pct > 0 ? `문제당 보상 +${pct}%` : `문제당 보상 ${pct}%`;
  }

  function openQuestionCountPicker(activityId) {
    countPickActivity = activityId;
    const def = ACTIVITY_DEFS[activityId];
    const existing = state.weekPlanCount[editingWeekIndex];
    const initial = existing != null ? existing : activityDefaultCount(activityId);
    el.countPickTitle.textContent = `${def.emoji} ${def.name} · 문제 수를 골라주세요`;
    el.countPickSlider.min = Engine.SESSION_LENGTH_MIN;
    el.countPickSlider.max = Engine.SESSION_LENGTH_MAX;
    el.countPickSlider.value = initial;
    updateCountPickPreview();
    showScreen('questionCountPick');
  }

  el.countPickSlider.addEventListener('input', updateCountPickPreview);

  el.btnCountPickConfirm.addEventListener('click', () => {
    state.weekPlan[editingWeekIndex] = countPickActivity;
    state.weekPlanCount[editingWeekIndex] = Number(el.countPickSlider.value);
    saveGame();
    showScreen('schedule');
    renderWeekPlanScreen();
  });

  el.btnCountPickBack.addEventListener('click', () => {
    showScreen('weekPick');
  });

  el.weekPickList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-activity]');
    if (!btn || btn.classList.contains('locked')) return;
    const activityId = btn.dataset.activity;
    if (COUNTABLE_ACTIVITIES.includes(activityId)) {
      openQuestionCountPicker(activityId);
      return;
    }
    if (activityId === 'banquet') {
      openBanquetTierPicker();
      return;
    }
    state.weekPlan[editingWeekIndex] = activityId;
    state.weekPlanCount[editingWeekIndex] = null;
    saveGame();
    showScreen('schedule');
    renderWeekPlanScreen();
  });

  // 연회는 등급(다과회/사교모임/고급 사교모임)을 골라야 하므로 별도 선택 화면을 둔다.
  function renderBanquetTierPickList() {
    el.banquetTierPickList.innerHTML = '';
    BANQUET_TIERS.forEach((tier) => {
      const met = Engine.banquetTierRequirementMet(state, tier);
      const reqParts = [`입장료 ${tier.entryFee}G`];
      if (tier.minOutfitTier > 0) reqParts.push(`${OUTFIT_TIERS[tier.minOutfitTier].name} 이상`);
      if (tier.minGraceScore > 0) reqParts.push(`품위 ${tier.minGraceScore} 이상(현재 ${Math.round(Engine.graceScore(state.stats))})`);
      if (tier.requiredEnglishMedal) {
        const medal = MEDAL_TIERS.find((m) => m.id === tier.requiredEnglishMedal);
        reqParts.push(`영어 ${medal.name} 이상`);
      }
      const card = document.createElement('button');
      card.className = `level-card${met ? '' : ' locked'}`;
      card.dataset.tier = tier.id;
      card.innerHTML = `
        <span class="level-badge-num">${tier.emoji}</span>
        <span class="level-info">
          <span class="level-title">${tier.name}</span>
          <span class="level-desc">${tier.desc}</span>
          <span class="shop-cost">${reqParts.join(' · ')}</span>
        </span>
        <span class="level-lock-icon">${met ? '›' : '🔒'}</span>
      `;
      if (met) {
        card.addEventListener('click', () => {
          state.weekPlan[editingWeekIndex] = 'banquet';
          state.weekPlanCount[editingWeekIndex] = null;
          state.weekPlanBanquetTier[editingWeekIndex] = tier.id;
          saveGame();
          showScreen('schedule');
          renderWeekPlanScreen();
        });
      }
      el.banquetTierPickList.appendChild(card);
    });
  }

  function openBanquetTierPicker() {
    renderBanquetTierPickList();
    showScreen('banquetTierPick');
  }

  el.btnBanquetTierPickBack.addEventListener('click', () => {
    showScreen('weekPick');
  });

  el.btnWeekPickBack.addEventListener('click', () => {
    showScreen('schedule');
    renderWeekPlanScreen();
  });

  el.btnScheduleBack.addEventListener('click', () => {
    // 계획을 바꿨을 수 있으니 게이지바의 예상치(반투명 바)도 다시 계산해서 보여준다
    goToMainScreen();
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

  // 품위(graceScore)는 매력·창의력·지능을 섞은 계산값이라 state.stats에
  // 직접 저장되는 숫자가 아니다 보니(포토상 초상화 링에는 %만 보임)
  // "역량" 탭에서 실제 몇 점인지, 다음 옷 단계까지 뭐가 더 필요한지(품위만
  // 부족한지, 귀족 신분도 필요한지)를 숫자로 바로 확인할 수 있게 보여준다.
  function renderGraceLine() {
    const grace = Math.round(Engine.graceScore(state.stats));
    const currentRank = state.nobleRankIndex != null ? NOBLE_RANKS[state.nobleRankIndex] : null;
    const rankText = currentRank ? `👑 ${currentRank.name}(${state.nobleTitle})` : '평민';
    let nextTierIndex = -1;
    for (let i = 0; i < OUTFIT_TIERS.length; i++) {
      if (!Engine.outfitRequirementMet(state, i)) { nextTierIndex = i; break; }
    }
    let detail;
    if (nextTierIndex === -1) {
      detail = '모든 옷 단계의 요건을 갖췄어요!';
    } else {
      const tier = OUTFIT_TIERS[nextTierIndex];
      const needs = [`품위 ${tier.min} 이상(현재 ${grace})`];
      if (typeof tier.requiredNobleRankIndex === 'number') {
        if (state.nobleRankIndex == null || state.nobleRankIndex < tier.requiredNobleRankIndex) {
          needs.push(`${NOBLE_RANKS[tier.requiredNobleRankIndex].name} 이상 신분`);
        }
      } else if (tier.requiresNoble && !state.nobleTitle) {
        needs.push('귀족 신분');
      }
      detail = `다음 단계 ${tier.emoji} ${tier.name}: ${needs.join(' · ')} 필요`;
    }
    const nextRank = Engine.nextNobleRank(state);
    const rankDetail = nextRank ? `<br>다음 작위 ${nextRank.name}: 6개 능력치 전부 ${nextRank.minAllStats} 이상 필요` : '';
    el.statusGraceLine.innerHTML = `🎀 품위 ${grace} · ${rankText}<br>${detail}${rankDetail}`;
  }

  function renderStatusScreen() {
    const outfit = OUTFIT_TIERS[state.wardrobe.equipped];
    renderPortraitInto(el.statusPortrait, state.wardrobe.equipped, 'status');
    el.statusOutfitBadge.textContent = `${outfit.emoji} ${outfit.name}`;
    if (state.pets.equipped !== null) {
      const petTier = PET_TIERS[state.pets.equipped];
      el.statusPetBadge.textContent = `${petTier.emoji} ${petTier.name}`;
      el.statusPetBadge.style.display = 'inline-block';
    } else {
      el.statusPetBadge.style.display = 'none';
    }
    const career = CAREER_DEFS.find((c) => c.id === state.career);
    if (career) {
      el.statusCareerBadge.textContent = `${career.emoji} ${career.name}`;
      el.statusCareerBadge.style.display = 'inline-block';
    } else {
      el.statusCareerBadge.style.display = 'none';
    }
    renderStatPanel(el.statusStatPanel, state.stats);
    renderGraceLine();
    renderCertificationSection();

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

  // 과목별(수학/영어/과학) 등급 인증 현황과, 다음 등급에 도전할 수 있으면
  // "시험 보기" 버튼을 보여준다. 지능만 높다고 자동으로 붙는 게 아니라
  // 실제로 그 레벨 시험을 봐서 통과해야 하는 성취형 배지다.
  function renderCertificationSection() {
    el.statusCertList.innerHTML = '';
    CERT_SUBJECT_KEYS.forEach((subjectKey) => {
      const subjectLabel = Engine.subjectName(subjectKey);
      const currentMedalId = state.certifications[subjectKey];
      const currentMedal = MEDAL_TIERS.find((t) => t.id === currentMedalId);
      const nextTier = Engine.nextMedalTier(state, subjectKey);
      const eligible = Engine.certExamEligible(state, subjectKey);
      const row = document.createElement('div');
      row.className = 'status-cert-row';
      const medalLabel = currentMedal ? `${currentMedal.emoji} ${currentMedal.name}` : '🔓 미인증';
      let actionHtml;
      if (!nextTier) {
        actionHtml = '<span class="status-cert-maxed">최고 등급 달성</span>';
      } else if (eligible) {
        actionHtml = `<button class="status-cert-btn" data-subject="${subjectKey}">${nextTier.emoji} ${nextTier.name} 시험 보기</button>`;
      } else if (!Engine.certTierContentExists(subjectKey, nextTier)) {
        // 과학처럼 그 과목 자체에 더 어려운 콘텐츠가 없어서, 지능이 아무리
        // 높아져도 다음 등급에는 영원히 도전할 수 없는 경우.
        actionHtml = `<span class="status-cert-maxed">이 과목은 ${currentMedal ? currentMedal.name : '여기'}까지가 최고 등급이에요</span>`;
      } else {
        actionHtml = `<span class="status-cert-locked">🔒 다음 등급(${nextTier.name})은 아직 준비가 더 필요해요</span>`;
      }
      row.innerHTML = `
        <span class="status-cert-row-name">${subjectLabel}</span>
        <span class="status-cert-row-medal">${medalLabel}</span>
        ${actionHtml}
      `;
      el.statusCertList.appendChild(row);
    });
  }

  el.statusCertList.addEventListener('click', (e) => {
    const btn = e.target.closest('.status-cert-btn');
    if (!btn) return;
    startCertExamUI(btn.dataset.subject);
  });

  function startCertExamUI(subjectKey) {
    session = Engine.startCertExamSession(state, subjectKey);
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishCertExamSession() {
    const beforeTiers = Engine.snapshotGrowthTiers(state.stats);
    const outcome = Engine.finishCertExamOutcome(state, session);
    announceStatLevelUps(beforeTiers);
    const subjectLabel = Engine.subjectName(outcome.subject);
    el.summaryEmoji.textContent = outcome.pass ? outcome.tier.emoji : '📖';
    el.summaryTitle.textContent = outcome.pass
      ? `${subjectLabel} ${outcome.tier.name} 인증에 성공했어요!`
      : `${subjectLabel} ${outcome.tier.name} 인증에는 아직이에요`;
    el.summaryDesc.textContent = `${outcome.count}문제 중 ${outcome.correctCount}개를 맞혔어요`;
    el.summaryGold.textContent = outcome.goldEarned;
    el.summaryCombo.textContent = session.sessionBestCombo;
    el.btnSummaryConfirm.textContent = '확인';
    saveGame();
    showScreen('sessionSummary');
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

  el.btnStatusBack.addEventListener('click', () => goToMainScreen());

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
    const { ended, princeEncounter } = Engine.advanceTurn(state, TOTAL_TURNS);
    if (ended) {
      showEndingOrNoblePromotionFirst();
      return;
    }
    saveGame();
    goToMainScreen(() => {
      if (princeEncounter) showLevelToast('🤴 궁에서 우연히 왕자님과 마주쳤어요! (호감도 상승)');
    });
  }

  // 한 주(週)의 활동을 마쳤을 때 호출한다. 이번 달(턴) 안에 남은 주가 있으면
  // 다음 주로 넘어가 메인 화면으로 돌아가고(다시 "실행"을 눌러 이어감),
  // 이번 달의 마지막 주였다면 실제로 달(턴)을 넘긴다.
  function advanceWeekOrTurn() {
    const { monthAdvanced, ended, princeEncounter } = Engine.advanceWeekOrTurn(state, TOTAL_TURNS);
    if (!monthAdvanced) {
      saveGame();
      goToMainScreen();
      return;
    }
    if (ended) {
      showEndingOrNoblePromotionFirst();
      return;
    }
    saveGame();
    goToMainScreen(() => {
      if (princeEncounter) showLevelToast('🤴 궁에서 우연히 왕자님과 마주쳤어요! (호감도 상승)');
    });
  }

  function showEnding() {
    gameStarted = false;
    clearSave();
    updateContinueButtonVisibility();
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
    const prevMode = state.curriculumMode;
    state = Engine.makeInitialState(prevName, prevMode);
    clearSave();
    saveGame();
    gameStarted = true;
    goToMainScreen();
  });

  el.btnEndingHome.addEventListener('click', () => showScreen('start'));

  /* ---------------- 시작 화면 ---------------- */

  function startNewGame(curriculumMode) {
    state = Engine.makeInitialState(el.characterNameInput.value, curriculumMode);
    clearSave();
    saveGame();
    gameStarted = true;
    goToMainScreen();
  }

  el.btnNewGame.addEventListener('click', () => {
    // 진행 중이던 (유효한) 저장 데이터가 있으면 실수로 지우지 않도록 먼저 확인을 받는다.
    if (hasValidSave()) {
      showScreen('confirmNewGame');
      return;
    }
    showScreen('curriculumMode');
  });

  el.btnConfirmNewGame.addEventListener('click', () => {
    showScreen('curriculumMode');
  });

  el.btnCancelNewGame.addEventListener('click', () => {
    showScreen('start');
  });

  el.curriculumModeList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    startNewGame(btn.dataset.mode);
  });

  el.btnCurriculumModeBack.addEventListener('click', () => {
    showScreen('start');
  });

  el.btnContinue.addEventListener('click', () => {
    if (loadGame()) {
      gameStarted = true;
      goToMainScreen();
    }
  });

  // 프로필이 2개 이상인데 이번 브라우저 세션에서 아직 아무도 고르지
  // 않았다면 시작 화면 대신 "누가 할까요?" 화면부터 보여준다. 프로필이
  // 1개(기본 프로필)뿐이면 자동으로 그 프로필이 활성화되고(needsProfilePicker
  // 내부에서 처리) 화면은 그대로 시작 화면부터 보여준다 — 기존 사용자는
  // 프로필 기능이 생겼다는 걸 눈치챌 필요조차 없다.
  if (Profiles.needsProfilePicker()) {
    openProfileScreen();
  } else {
    renderProfileBar();
    updateContinueButtonVisibility();
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
