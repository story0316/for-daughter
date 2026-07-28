(() => {
  'use strict';

  const P = window.MathPrincessProblems;
  const E = window.MathPrincessEndings;
  const SC = window.MathPrincessScenarios;
  const SUBJ = window.MathPrincessSubjects;

  // "공부"를 비롯한 여러 활동에서 수학뿐 아니라 영어·과학 문제도 섞여
  // 나오도록 하는 과목 레지스트리. 세 과목 모두 같은 지능 스탯으로
  // 해금되며(영어·과학은 초4~중1 범위인 1~4단계까지만), 정답 판정은
  // problems.js의 checkAnswer를 그대로 재사용한다(선택형 문제는 과목과
  // 무관하게 동일한 방식으로 채점되기 때문).
  const SUBJECTS = {
    math: { name: '수학', isLevelUnlocked: P.isLevelUnlocked, generateProblem: P.generateProblem, maxLevel: 10 },
    english: { name: '영어', isLevelUnlocked: SUBJ.isEnglishLevelUnlocked, generateProblem: SUBJ.generateEnglishProblem, maxLevel: 4 },
    science: { name: '과학', isLevelUnlocked: SUBJ.isScienceLevelUnlocked, generateProblem: SUBJ.generateScienceProblem, maxLevel: 4 },
  };
  const SUBJECT_KEYS = Object.keys(SUBJECTS);

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

  const TOTAL_TURNS = Number(new URLSearchParams(location.search).get('turns')) || 48;
  // 한 달(턴)은 생활 계획표처럼 4주로 나뉘어, 매주 서로 다른 활동을 배치할 수 있다.
  const WEEKS_PER_MONTH = 4;
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

  const QUESTIONS_PER_BANQUET = 3;
  const BANQUET_PASS_COUNT = 3; // 왕자님을 만나려면 3문제를 모두 맞혀야 한다(난이도 상향).

  // 연회에서 나오는 예절 문제 은행. 정답을 잘 맞히면 예절/매력이 오르고,
  // 충분히 잘 대답하면 왕자님을 만날 수 있는 특별한 계기가 된다.
  const ETIQUETTE_QUESTIONS = [
    {
      question: '연회장에 들어갈 때 가장 예의바른 행동은 무엇일까요?',
      choices: ['조용히 미소지으며 인사하기', '큰 소리로 부르기', '먼저 앉아서 기다리기', '음식부터 먹기'],
      answer: '조용히 미소지으며 인사하기',
      explanation: '들어갈 때는 밝게 미소지으며 조용히 인사하는 게 기본 예절이에요.',
    },
    {
      question: '식사할 때 나이프와 포크는 어떻게 사용해야 할까요?',
      choices: ['왼손 포크, 오른손 나이프로 조용히', '아무 손이나 편한 대로', '손으로 집어서 먹기', '포크로 소리 내며 먹기'],
      answer: '왼손 포크, 오른손 나이프로 조용히',
      explanation: '나이프와 포크는 소리 나지 않게, 왼손 포크·오른손 나이프로 사용해요.',
    },
    {
      question: '다른 사람이 이야기하고 있을 때 나는 어떻게 해야 할까요?',
      choices: ['끝까지 귀 기울여 듣는다', '말을 끊고 내 얘기를 한다', '휴대폰을 본다', '딴 곳을 본다'],
      answer: '끝까지 귀 기울여 듣는다',
      explanation: '상대방의 말이 끝날 때까지 귀 기울여 듣는 것이 대화의 기본 예절이에요.',
    },
    {
      question: '누군가를 처음 만나 인사할 때 가장 좋은 태도는?',
      choices: ['눈을 마주치고 미소지으며 인사한다', '고개를 푹 숙이고 아무 말 안 한다', '뒤돌아선다', '손을 흔들지 않고 지나간다'],
      answer: '눈을 마주치고 미소지으며 인사한다',
      explanation: '눈을 맞추고 밝게 미소지으며 인사하면 좋은 첫인상을 줄 수 있어요.',
    },
    {
      question: '차를 마시는 다과회에서 지켜야 할 예절은?',
      choices: ['조용히 한 모금씩 마신다', '소리 내며 후루룩 마신다', '단숨에 들이켠다', '차를 흘리며 마신다'],
      answer: '조용히 한 모금씩 마신다',
      explanation: '차는 소리 내지 않고 천천히, 한 모금씩 마시는 것이 예의랍니다.',
    },
    {
      question: '누군가 나에게 친절을 베풀었을 때 해야 할 말은?',
      choices: ['"고맙습니다"라고 인사한다', '아무 말도 하지 않는다', '그냥 지나간다', '표정을 찡그린다'],
      answer: '"고맙습니다"라고 인사한다',
      explanation: '고마운 마음은 꼭 말로 표현하는 게 좋은 예절이에요.',
    },
    {
      question: '약속 시간에 대한 예절로 알맞은 것은?',
      choices: ['약속 시간에 맞춰 도착한다', '많이 늦어도 상관없다', '아무 때나 간다', '못 갈 땐 말 안 해도 된다'],
      answer: '약속 시간에 맞춰 도착한다',
      explanation: '시간 약속을 지키는 것은 상대방을 존중하는 기본 예절이에요.',
    },
    {
      question: '실수로 다른 사람의 발을 밟았을 때는?',
      choices: ['바로 "미안합니다"라고 사과한다', '못 본 척한다', '웃고 넘어간다', '오히려 화를 낸다'],
      answer: '바로 "미안합니다"라고 사과한다',
      explanation: '실수했을 때는 바로 진심으로 사과하는 것이 예의예요.',
    },
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // "대화"는 턴을 소모하지 않는 가벼운 상호작용이라 한 달에 한 번만 가능하다.
  const TALK_LINES = [
    '오늘 하루도 애썼다고 꼭 안아줬어요.',
    '요즘 어떤 게 제일 재밌냐고 물어봤어요.',
    '같이 창밖을 보며 시답잖은 농담을 주고받았어요.',
    '"엄마는 항상 네 편이야" 라고 말해줬어요.',
    '오늘 있었던 일을 조잘조잘 들어줬어요.',
  ];

  // 가격은 48턴 동안 실제로 벌 수 있는 골드 범위(정답률 60~85% 기준
  // 대략 2,500~5,300G, 콤보를 놓치지 않는 이상적인 플레이로도 최대
  // 16,000~21,000G 정도)에 맞춰 책정했다. 예전 가격(1,500~60,000G)은
  // 실제로는 상위 몇 개 외엔 사실상 평생 살 수 없는 장식품이었다.
  const ITEMS = [
    { id: 'sharp', emoji: '✏️', name: '샤프', cost: 300, desc: '문제 정답 시 골드 +10%', goldBonus: 0.1 },
    { id: 'tablet', emoji: '📱', name: '태블릿', cost: 600, desc: '공부 정답 시 지능 +1 추가 획득', intBonus: 1 },
    { id: 'maid', emoji: '🧹', name: '하녀 고용', cost: 700, desc: '빨래를 대신 해줘요. 매턴 자동으로 스트레스 -2', servant: 'laundry' },
    { id: 'apartment', emoji: '🏢', name: '아파트로 이사', cost: 1000, desc: '휴식 효과 +50%', restBonus: 0.5 },
    { id: 'laptop', emoji: '💻', name: '노트북', cost: 1200, desc: '콤보 보상 배율 +0.2', comboBonus: 0.2 },
    { id: 'gardener', emoji: '🌾', name: '정원사 고용', cost: 1300, desc: '텃밭을 대신 가꿔줘요. 매턴 자동으로 골드 +10', servant: 'garden' },
    { id: 'tiara', emoji: '👑', name: '작은 티아라', cost: 1500, desc: '연회에서 정답 맞힐 때 매력 +1 추가 획득', charmBonus: 1 },
    { id: 'invitation', emoji: '✉️', name: '왕실 초대장', cost: 2000, desc: '인물을 만날 때 호감도 +2 추가 획득', affectionBonus: 2 },
    { id: 'house', emoji: '🏡', name: '단독주택으로 이사', cost: 2500, desc: '휴식 효과 추가 +50% (총 100%)', restBonus: 0.5 },
    { id: 'aiTutor', emoji: '🤖', name: 'AI 학습기', cost: 3500, desc: '문제 정답 시 골드 +25%, 지능 +2 추가', goldBonus: 0.25, intBonus: 2 },
    { id: 'orchestra', emoji: '🎻', name: '개인 오케스트라 레슨', cost: 4000, desc: '공부 정답 시 지능 +2 추가 획득', intBonus: 2 },
    { id: 'palace', emoji: '🏰', name: '별궁으로 이사', cost: 5000, desc: '휴식 효과 추가 +50% (총 150%)', restBonus: 0.5 },
  ];

  // 사교모임(연회) 입장료와, 연회·왕자님을 만나는 데 필요한 최소 옷 단계(OUTFIT_TIERS 인덱스).
  // 품위 점수로 해금만 해둔 옷이 아니라 "지금 입고 있는" 옷 기준으로 판정한다.
  const BANQUET_ENTRY_FEE = 150;
  const BANQUET_MIN_TIER = 1; // 단정한 옷 이상
  const PRINCE_MIN_TIER = 2; // 예쁜 드레스 이상

  // 품위(교양) 점수: 매력·창의력·지능을 섞어 계산한다. 이 점수가 오를수록
  // 입는 옷이 화려해지고, 만날 수 있는 사람의 폭도 넓어진다.
  function graceScore(stats) {
    return stats.charm * 0.4 + stats.creativity * 0.3 + stats.intelligence * 0.3;
  }

  // 인물 호감도를 삼국지 시리즈의 "친밀도"처럼 단계 이름으로 보여준다.
  const AFFECTION_TIERS = [
    { min: 0, name: '낯선 사이' },
    { min: 20, name: '아는 사이' },
    { min: 40, name: '친근한 사이' },
    { min: 60, name: '가까운 사이' },
    { min: 80, name: '각별한 사이' },
  ];

  function affectionTierName(value) {
    let name = AFFECTION_TIERS[0].name;
    AFFECTION_TIERS.forEach((t) => {
      if (value >= t.min) name = t.name;
    });
    return name;
  }

  // 한동안 만나지 않고 방치한 인물은 호감도가 서서히 식는다.
  // (삼국지 시리즈처럼, 자주 만나야 친밀도를 유지·상승시킬 수 있다)
  // 유예 2턴/감쇠 2는 인물 6명을 고르게 순환 방문(6턴 주기)해도 호감도가
  // 55점에서 멈춰 어떤 히든 엔딩(호감도 80 이상)도 열 수 없을 만큼 가혹했다.
  // 유예 3턴/감쇠 1로 완화하면 같은 6턴 순환에서도 87점까지 오르면서,
  // 오래 방치(10턴 이상)하면 여전히 뚜렷하게 식는 균형을 유지한다.
  const AFFECTION_DECAY_GRACE_TURNS = 3;
  const AFFECTION_DECAY_AMOUNT = 1;

  // min: 이 옷을 "살 수 있게" 되는 품위 점수 기준. 품위가 충분해도 옷은
  // 자동으로 생기지 않고, 옷장에서 cost만큼 골드를 내고 직접 사야 입을 수 있다.
  const OUTFIT_TIERS = [
    { min: 0, cost: 0, emoji: '👕', name: '평범한 옷', wardrobeDesc: '처음부터 입고 있는 편안한 옷' },
    { min: 25, cost: 400, emoji: '👚', name: '단정한 옷', wardrobeDesc: '품위 25 이상에서 구매 가능' },
    { min: 50, cost: 900, emoji: '👗', name: '예쁜 드레스', wardrobeDesc: '품위 50 이상에서 구매 가능' },
    { min: 75, cost: 1800, emoji: '👑', name: '공주 드레스', wardrobeDesc: '품위 75 이상에서 구매 가능' },
    { min: 90, cost: 3200, emoji: '💐', name: '무도회 드레스', wardrobeDesc: '품위 90 이상에서 구매 가능' },
    { min: 100, cost: 6000, emoji: '✨', name: '대관식 드레스', wardrobeDesc: '품위 100(만점)에서만 구매 가능한 전설의 옷' },
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
      unlock: (stats) => graceScore(stats) >= 55,
      unlockHint: (stats) => `품위 55 필요 (현재 ${Math.round(graceScore(stats))})`,
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
      weekPick: document.getElementById('screen-week-pick'),
      status: document.getElementById('screen-status'),
      shop: document.getElementById('screen-shop'),
      npcSelect: document.getElementById('screen-npc-select'),
      quiz: document.getElementById('screen-quiz'),
      sessionSummary: document.getElementById('screen-session-summary'),
      event: document.getElementById('screen-event'),
      branching: document.getElementById('screen-branching'),
      ending: document.getElementById('screen-ending'),
    },
    totalTurnsLabel: document.getElementById('total-turns-label'),
    totalYearsLabel: document.getElementById('total-years-label'),
    btnNewGame: document.getElementById('btn-new-game'),
    btnContinue: document.getElementById('btn-continue'),
    characterNameInput: document.getElementById('character-name-input'),

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

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randChoice(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function makeInitialState(characterName) {
    return {
      turn: 1,
      gold: 0,
      characterName: (characterName && characterName.trim()) || '우리 딸',
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
      npcs: NPC_DEFS.map((n) => ({ id: n.id, affection: randInt(10, 20), lastMetTurn: 0 })),
      wardrobe: { equipped: 0, owned: OUTFIT_TIERS.map((_, i) => i === 0), notifiedGraceTier: 0 },
      weekPlan: new Array(WEEKS_PER_MONTH).fill(null),
      weekIndex: 0,
      talkedThisTurn: false,
      completedScenarios: [],
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
      loaded.npcs = loaded.npcs || NPC_DEFS.map((n) => ({ id: n.id, affection: randInt(10, 20), lastMetTurn: 0 }));
      loaded.npcs.forEach((n) => {
        if (typeof n.lastMetTurn !== 'number') n.lastMetTurn = 0;
      });
      loaded.wardrobe = loaded.wardrobe || { equipped: 0 };
      if (!Array.isArray(loaded.wardrobe.owned)) {
        // 옛 저장 데이터(옷을 무료로 자동 해금하던 시절)의 unlockedMax까지는
        // 이미 입고 있었던 것으로 쳐서 그대로 소유한 것으로 이관해준다.
        const grandfatheredMax = typeof loaded.wardrobe.unlockedMax === 'number' ? loaded.wardrobe.unlockedMax : 0;
        loaded.wardrobe.owned = OUTFIT_TIERS.map((_, i) => i <= grandfatheredMax);
      }
      delete loaded.wardrobe.unlockedMax;
      if (typeof loaded.wardrobe.notifiedGraceTier !== 'number') loaded.wardrobe.notifiedGraceTier = 0;
      if (typeof loaded.characterName !== 'string' || !loaded.characterName.trim()) loaded.characterName = '우리 딸';
      if (!Array.isArray(loaded.weekPlan) || loaded.weekPlan.length !== WEEKS_PER_MONTH) {
        loaded.weekPlan = new Array(WEEKS_PER_MONTH).fill(null);
        // 옛 저장 데이터(주간 계획표 이전)에 골라둔 활동이 있었다면 1주차로 옮겨준다.
        if (loaded.scheduledActivity) loaded.weekPlan[0] = loaded.scheduledActivity;
      }
      if (typeof loaded.weekIndex !== 'number' || loaded.weekIndex < 0 || loaded.weekIndex >= WEEKS_PER_MONTH) loaded.weekIndex = 0;
      delete loaded.scheduledActivity;
      if (typeof loaded.talkedThisTurn === 'undefined') loaded.talkedThisTurn = false;
      if (!Array.isArray(loaded.completedScenarios)) loaded.completedScenarios = [];
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
    el.characterName.textContent = state.characterName;
    updateWardrobeUnlocks();
    const equippedTier = OUTFIT_TIERS[state.wardrobe.equipped];
    renderPortraitInto(el.characterPortrait, state.wardrobe.equipped, 'main');
    el.outfitBadge.textContent = `${equippedTier.emoji} ${equippedTier.name}`;
    renderStatPanel(el.mainStatPanel, state.stats);
    updateScheduleBanner();
  }

  /* ---------------- 활동: 공부 / 알바 ---------------- */

  // 현재 지능으로 어떤 과목의 어떤 레벨까지 풀 수 있는지 확인한다.
  function unlockedLevelsFor(subjectKey) {
    const subj = SUBJECTS[subjectKey];
    const ids = [];
    for (let i = 1; i <= subj.maxLevel; i++) {
      if (subj.isLevelUnlocked(i, state.stats.intelligence)) ids.push(i);
    }
    return ids;
  }

  // 어떤 과목·레벨을 공부할지 플레이어가 직접 고르지 않고, 수학/영어/과학
  // 중 하나를 무작위로 고른 뒤 그 과목에서 최근 해금된 상위 레벨들(최대
  // 3개) 중에서 다시 무작위로 골라준다(매 문제마다 다시 고르므로 한
  // 세션 안에서도 과목이 섞여 나온다). 항상 가장 쉬운 레벨만 골라
  // 콤보를 안전하게 farming하는 것을 막고, 세 과목을 고루 접하게 한다.
  function pickRandomSubjectAndLevel() {
    const subjectKey = randChoice(SUBJECT_KEYS);
    const unlocked = unlockedLevelsFor(subjectKey);
    const recentBand = unlocked.slice(-3);
    const level = randChoice(recentBand.length ? recentBand : [1]);
    return { subject: subjectKey, level };
  }

  // 알바는 항상 가장 쉬운(레벨 1) 문제만 나오되, 과목은 무작위로 섞인다.
  function pickRandomSubjectLevel1() {
    return { subject: randChoice(SUBJECT_KEYS), level: 1 };
  }

  function startStudySession() {
    session = {
      type: 'study',
      count: QUESTIONS_PER_STUDY,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
      currentSubject: null,
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startJobSession() {
    session = {
      type: 'job',
      count: QUESTIONS_PER_JOB,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
      currentSubject: null,
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function startBanquetSession() {
    session = {
      type: 'banquet',
      level: 1,
      count: QUESTIONS_PER_BANQUET,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
      askedQuestions: [],
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function generateEtiquetteQuestion(sess) {
    const remaining = ETIQUETTE_QUESTIONS.filter((q) => !sess.askedQuestions.includes(q.question));
    const pool = remaining.length ? remaining : ETIQUETTE_QUESTIONS;
    const picked = randChoice(pool);
    sess.askedQuestions.push(picked.question);
    return {
      type: 'choice',
      question: picked.question,
      choices: shuffle(picked.choices),
      answer: picked.answer,
      explanation: picked.explanation,
      rewardGold: 0,
      level: 0,
    };
  }

  // "공부/알바/운동 보너스/휴식 보너스"는 수학·영어·과학이 매 문제마다
  // 무작위로 섞여 나온다. 알바는 항상 가장 쉬운 레벨만, 나머지는 지능에
  // 맞는 레벨 범위에서 고른다.
  const MULTI_SUBJECT_TYPES = ['study', 'job', 'exercise-bonus', 'rest-bonus', 'laundry-bonus', 'garden-bonus'];
  // 정답/오답 즉시 보상 대신, 세션이 끝난 뒤 한 번에 보너스 효과를 적용하는 유형들.
  const BONUS_QUIZ_TYPES = ['exercise-bonus', 'rest-bonus', 'laundry-bonus', 'garden-bonus'];

  function nextQuizQuestion() {
    if (session.index >= session.count) {
      finishSession();
      return;
    }
    session.answered = false;
    let problem;
    if (session.type === 'banquet') {
      problem = generateEtiquetteQuestion(session);
    } else if (session.type === 'scenario-quiz') {
      problem = generateScenarioQuestion(session);
    } else if (MULTI_SUBJECT_TYPES.includes(session.type)) {
      const picked = session.type === 'job' ? pickRandomSubjectLevel1() : pickRandomSubjectAndLevel();
      session.currentSubject = picked.subject;
      problem = SUBJECTS[picked.subject].generateProblem(picked.level);
    } else {
      problem = P.generateProblem(session.level);
    }
    session.currentProblem = problem;

    el.quizSessionLabel.textContent =
      session.type === 'study'
        ? `📖 공부 중 · ${SUBJECTS[session.currentSubject].name}`
        : session.type === 'job'
          ? `💼 알바 중 · ${SUBJECTS[session.currentSubject].name}`
          : session.type === 'banquet'
            ? '💃 연회 참석 중'
            : session.type === 'exercise-bonus'
              ? `🏃 운동 보너스 문제 · ${SUBJECTS[session.currentSubject].name}`
              : session.type === 'rest-bonus'
                ? `🛌 휴식 보너스 문제 · ${SUBJECTS[session.currentSubject].name}`
                : session.type === 'laundry-bonus'
                  ? `🧺 빨래 보너스 문제 · ${SUBJECTS[session.currentSubject].name}`
                  : session.type === 'garden-bonus'
                    ? `🌾 텃밭 보너스 문제 · ${SUBJECTS[session.currentSubject].name}`
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

    if (session.type === 'banquet') {
      state.stats.charm += 4 + itemBonusSum('charmBonus');
    } else if (session.type === 'scenario-quiz') {
      // 시나리오 퀴즈는 문제마다 즉시 보상을 주지 않고, 세션이 끝난 뒤
      // scenario.outcomes.success/fail 효과를 한 번에 적용한다.
    } else if (BONUS_QUIZ_TYPES.includes(session.type)) {
      // 운동/휴식/빨래/텃밭 보너스 문제도 세션 종료 시(finishXBonusSession)
      // 한 번에 보너스 효과를 적용한다.
    } else {
      const multiplier = comboMultiplier(state.combo) + itemBonusSum('comboBonus');
      const jobBonus = session.type === 'job' ? 1.5 : 1;
      const goldMultiplier = 1 + itemBonusSum('goldBonus');
      const goldGain = Math.round(problem.rewardGold * multiplier * jobBonus * goldMultiplier);
      state.gold += goldGain;
      session.goldEarned += goldGain;

      if (session.type === 'study') {
        state.stats.intelligence += problem.level + itemBonusSum('intBonus');
        // 창의력은 이전까지 사교계 친구/왕실 스승을 만날 때만 소량 올랐는데,
        // 그 두 인물을 자주 못 만나면 품위(=매력*0.4+창의력*0.3+지능*0.3)가
        // 매력·지능만큼 오르지 못해 무도회/대관식 드레스 단계에 사실상
        // 도달할 수 없었다. 공부에도 소폭의 창의력 트리클을 더해 균형을 맞춘다.
        state.stats.creativity += problem.level * 0.2;
      } else {
        state.stats.stamina -= 2;
      }
    }
    state.totalCorrect++;
    session.correctCount++;
    clampStats();
  }

  function applyWrong(problem) {
    state.combo = 0;
    if (session.type === 'banquet') {
      state.stats.stress += 2;
    } else if (session.type === 'scenario-quiz') {
      // 시나리오 퀴즈는 outcomes.fail 효과가 세션 종료 시 한 번에 적용된다.
    } else if (BONUS_QUIZ_TYPES.includes(session.type)) {
      // 틀려도 페널티 없이 원래 보너스 활동 효과만 그대로 받는다.
    } else if (session.type === 'study') {
      state.stats.stress += 6;
      state.stats.stamina -= 4;
    } else {
      state.stats.stamina -= 3;
    }
    clampStats();
  }

  function finishSession() {
    if (session.type === 'banquet') {
      finishBanquetSession();
      return;
    }
    if (session.type === 'scenario-quiz') {
      finishScenarioQuizSession();
      return;
    }
    if (session.type === 'exercise-bonus') {
      finishExerciseBonusSession();
      return;
    }
    if (session.type === 'rest-bonus') {
      finishRestBonusSession();
      return;
    }
    if (session.type === 'laundry-bonus') {
      finishLaundryBonusSession();
      return;
    }
    if (session.type === 'garden-bonus') {
      finishGardenBonusSession();
      return;
    }
    el.summaryEmoji.textContent = session.correctCount === session.count ? '🌟' : '✅';
    el.summaryTitle.textContent = session.type === 'study' ? '공부를 마쳤어요!' : '알바를 마쳤어요!';
    el.summaryDesc.textContent = `${session.count}문제 중 ${session.correctCount}개를 맞혔어요`;
    el.summaryGold.textContent = session.goldEarned;
    el.summaryCombo.textContent = session.sessionBestCombo;
    showScreen('sessionSummary');
  }

  // 연회 결과에 따라 왕자님을 만날 수 있는 특별한 이벤트로 이어진다.
  // 예절 문제를 충분히 잘 맞히면(3문제 중 2개 이상) 품위 점수와 무관하게
  // 왕자님을 만나 애정도가 크게 오르고, 그렇지 않으면 다음 기회를 기약한다.
  function finishBanquetSession() {
    const success = session.correctCount >= BANQUET_PASS_COUNT;
    const prince = NPC_DEFS.find((n) => n.id === 'prince');
    const princeState = state.npcs.find((n) => n.id === 'prince');
    const beforeTiers = snapshotGrowthTiers(state.stats);
    const dressedForPrince = state.wardrobe.equipped >= PRINCE_MIN_TIER;

    if (success && dressedForPrince) {
      princeState.affection += randInt(10, 16) + itemBonusSum('affectionBonus');
      princeState.lastMetTurn = state.turn;
      clampStats();
      announceStatLevelUps(beforeTiers);
      el.eventEmoji.innerHTML = npcAvatarHTML(prince, 'npc-avatar-lg');
      el.eventTitle.textContent = '연회에서 왕자님을 만나다';
      el.eventDesc.textContent = `${session.count}문제 중 ${session.correctCount}개를 맞혀 예절을 뽐냈어요! 왕자님이 다가와 말을 걸어주었어요. (애정도 ${Math.round(princeState.affection)})`;
    } else if (success && !dressedForPrince) {
      clampStats();
      announceStatLevelUps(beforeTiers);
      el.eventEmoji.textContent = '💃';
      el.eventTitle.textContent = '연회를 마쳤어요';
      el.eventDesc.textContent = `${session.count}문제 중 ${session.correctCount}개를 맞혀 예절을 뽐냈어요! 하지만 지금 입은 옷으로는 왕자님 눈에 띄지 못했어요. ${OUTFIT_TIERS[PRINCE_MIN_TIER].name} 이상으로 갈아입어 보세요.`;
    } else {
      clampStats();
      announceStatLevelUps(beforeTiers);
      el.eventEmoji.textContent = '💃';
      el.eventTitle.textContent = '연회를 마쳤어요';
      el.eventDesc.textContent = `${session.count}문제 중 ${session.correctCount}개를 맞혔어요. 예절을 조금 더 익히면 왕자님을 만날 수 있을 거예요!`;
    }
    saveGame();
    showScreen('event');
  }

  el.btnSummaryConfirm.addEventListener('click', () => {
    session = null;
    advanceWeekOrTurn();
  });

  /* ---------------- 활동: 운동 / 휴식 / 친구 만나기 ---------------- */

  // 운동/휴식도 공부와 연계되도록, 시작 전에 보너스 문제 1개를 낸다.
  // 맞히면 추가 효과가 붙고, 틀려도 원래 효과는 그대로 받으니 부담은 없다.
  function doExercise() {
    session = {
      type: 'exercise-bonus',
      count: 1,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
      currentSubject: null,
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishExerciseBonusSession() {
    const bonus = session.correctCount > 0;
    const beforeTiers = snapshotGrowthTiers(state.stats);
    state.stats.stamina += 8;
    state.stats.focus += 4;
    state.stats.stress += 3;
    if (bonus) {
      state.stats.focus += 3;
      state.stats.stamina += 2;
    }
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();
    if (bonus) showLevelToast('💪 문제까지 맞혀서 운동 효과가 더 좋아졌어요!');
    maybeTriggerEvent(0.25);
  }

  function doRest() {
    session = {
      type: 'rest-bonus',
      count: 1,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
      currentSubject: null,
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishRestBonusSession() {
    const bonus = session.correctCount > 0;
    const beforeTiers = snapshotGrowthTiers(state.stats);
    const restMultiplier = 1 + itemBonusSum('restBonus');
    state.stats.stress -= 12 * restMultiplier;
    state.stats.stamina += 10 * restMultiplier;
    if (bonus) {
      state.stats.stress -= 5;
      state.stats.stamina += 3;
    }
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();
    if (bonus) showLevelToast('😴 문제까지 맞혀서 푹 쉬었어요!');
    maybeTriggerEvent(0.15);
  }

  // 빨래하기: 하녀를 고용하면 매턴 자동으로 처리되어 더 이상 스케줄할 필요가 없다.
  function doLaundry() {
    session = {
      type: 'laundry-bonus',
      count: 1,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
      currentSubject: null,
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishLaundryBonusSession() {
    const bonus = session.correctCount > 0;
    const beforeTiers = snapshotGrowthTiers(state.stats);
    state.stats.stress -= 6;
    state.stats.stamina -= 2;
    state.gold += 10;
    if (bonus) {
      state.stats.stress -= 3;
      state.gold += 5;
    }
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();
    if (bonus) showLevelToast('🧺 빨래하다 주머니에서 동전을 발견했어요!');
    advanceWeekOrTurn();
  }

  // 텃밭 가꾸기: 정원사를 고용하면 매턴 자동으로 처리되어 더 이상 스케줄할 필요가 없다.
  function doGarden() {
    session = {
      type: 'garden-bonus',
      count: 1,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
      currentSubject: null,
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishGardenBonusSession() {
    const bonus = session.correctCount > 0;
    const beforeTiers = snapshotGrowthTiers(state.stats);
    state.stats.stamina -= 4;
    state.gold += 25;
    if (bonus) {
      state.gold += 15;
    }
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();
    if (bonus) showLevelToast('🌾 튼실한 작물을 더 수확했어요!');
    advanceWeekOrTurn();
  }

  function maybeTriggerEvent(chance) {
    if (Math.random() > chance) {
      advanceWeekOrTurn();
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
    advanceWeekOrTurn();
  });

  /* ---------------- 친구 만나기: 상대 선택 ---------------- */

  function openNpcSelect() {
    el.npcList.innerHTML = '';
    NPC_DEFS.forEach((def) => {
      const unlocked = def.unlock(state.stats);
      const needsDressUp = unlocked && def.id === 'prince' && state.wardrobe.equipped < PRINCE_MIN_TIER;
      const npcState = state.npcs.find((n) => n.id === def.id);
      const activeScenario = unlocked ? findActiveScenario(def.id) : null;
      const card = document.createElement('button');
      card.className = `level-card npc-card${unlocked ? '' : ' locked'}`;
      card.innerHTML = `
        ${unlocked ? npcAvatarHTML(def, 'npc-avatar-md') : '<span class="level-badge-num">🔒</span>'}
        <span class="level-info">
          <span class="level-title">${def.name}</span>
          <span class="level-desc">${needsDressUp ? `👗 ${OUTFIT_TIERS[PRINCE_MIN_TIER].name} 이상을 입어야 만날 수 있어요` : unlocked ? (activeScenario ? `<span class="npc-scenario-hint">✨ ${activeScenario.title}</span>` : def.desc) : def.unlockHint(state.stats)}</span>
          ${unlocked ? `<span class="npc-affection-track"><span class="npc-affection-fill" style="width:${npcState.affection}%"></span></span><span class="npc-affection-label">${affectionTierName(npcState.affection)} · ${Math.round(npcState.affection)}</span>` : ''}
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
    if (npcId === 'prince' && state.wardrobe.equipped < PRINCE_MIN_TIER) {
      showLevelToast(`👑 ${OUTFIT_TIERS[PRINCE_MIN_TIER].name} 이상을 입어야 왕자님을 뵐 수 있어요`);
      return;
    }
    const activeScenario = findActiveScenario(npcId);
    if (activeScenario) {
      runScenario(activeScenario);
      return;
    }

    const def = NPC_DEFS.find((n) => n.id === npcId);
    const npcState = state.npcs.find((n) => n.id === npcId);
    const beforeTiers = snapshotGrowthTiers(state.stats);
    def.apply(state);
    npcState.affection += randInt(8, 14) + itemBonusSum('affectionBonus');
    npcState.lastMetTurn = state.turn;
    clampStats();
    announceStatLevelUps(beforeTiers);
    saveGame();

    el.eventEmoji.innerHTML = npcAvatarHTML(def, 'npc-avatar-lg');
    el.eventTitle.textContent = `${def.name}과(와)의 시간`;
    el.eventDesc.textContent = `${randChoice(def.lines)} (애정도 ${Math.round(npcState.affection)} · ${affectionTierName(npcState.affection)})`;
    showScreen('event');
  }

  /* ---------------- 시나리오 계층(scenarios.js) 실행 ---------------- */

  // scenarios.js에 정의된 unlock 조건(minGrace/minStat/minAffection)을 확인한다.
  function scenarioUnlocked(scenario, st) {
    const u = scenario.unlock || {};
    if (typeof u.minGrace === 'number' && graceScore(st.stats) < u.minGrace) return false;
    if (u.minStat && st.stats[u.minStat.key] < u.minStat.value) return false;
    if (u.minAffection) {
      const npcState = st.npcs.find((n) => n.id === u.minAffection.npcId);
      if (!npcState || npcState.affection < u.minAffection.value) return false;
    }
    return true;
  }

  // 해당 인물에게 아직 완료하지 않은, 조건을 만족한 "ready" 시나리오를 찾는다.
  // 있으면 "친구 만나기"에서 일반 대사 대신 이 특별한 이야기가 진행된다.
  function findActiveScenario(npcId) {
    if (!SC) return null;
    return (
      SC.SCENARIOS.find(
        (s) =>
          s.npcId === npcId &&
          s.status === 'ready' &&
          !s.bespoke &&
          !state.completedScenarios.includes(s.id) &&
          scenarioUnlocked(s, state)
      ) || null
    );
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

  function applyStatNpcEffects(statEffects, npcEffects) {
    if (statEffects) {
      Object.keys(statEffects).forEach((k) => {
        state.stats[k] += statEffects[k];
      });
    }
    if (npcEffects) {
      Object.keys(npcEffects).forEach((npcId) => {
        const npcState = state.npcs.find((n) => n.id === npcId);
        if (!npcState) return;
        const eff = npcEffects[npcId];
        const gain = Array.isArray(eff) ? randInt(eff[0], eff[1]) : eff;
        npcState.affection += gain + itemBonusSum('affectionBonus');
        npcState.lastMetTurn = state.turn;
      });
    }
  }

  function resolveScenarioOutcome(scenario, outcome, resultLine) {
    const beforeTiers = snapshotGrowthTiers(state.stats);
    applyStatNpcEffects(outcome.statEffects, outcome.npcEffects);
    const mainNpcState = state.npcs.find((n) => n.id === scenario.npcId);
    if (mainNpcState) mainNpcState.lastMetTurn = state.turn;
    clampStats();
    announceStatLevelUps(beforeTiers);
    if (!state.completedScenarios.includes(scenario.id)) {
      state.completedScenarios.push(scenario.id);
    }
    saveGame();

    el.eventEmoji.innerHTML = scenarioImageHTML(scenario, 'npc-avatar-lg');
    el.eventTitle.textContent = outcome.narrative.title;
    el.eventDesc.textContent = resultLine ? `${resultLine} ${outcome.narrative.desc}` : outcome.narrative.desc;
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
        applyStatNpcEffects(opt.statEffects, opt.npcEffects);
        resolveScenarioOutcome(scenario, scenario.outcomes.success, opt.resultLine);
      });
      el.branchingOptions.appendChild(btn);
    });
    showScreen('branching');
  }

  function resolveNarrativeScenario(scenario) {
    const line = randChoice(scenario.narrative.lines);
    resolveScenarioOutcome(scenario, scenario.outcomes.success, line);
  }

  function generateScenarioQuestion(sess) {
    const bank = sess.scenario.quiz.bank;
    const remaining = bank.filter((q) => !sess.askedQuestions.includes(q.question));
    const pool = remaining.length ? remaining : bank;
    const picked = randChoice(pool);
    sess.askedQuestions.push(picked.question);
    return {
      type: 'choice',
      question: picked.question,
      choices: shuffle(picked.choices),
      answer: picked.answer,
      explanation: picked.explanation,
      rewardGold: 0,
      level: 0,
    };
  }

  function startScenarioQuiz(scenario) {
    session = {
      type: 'scenario-quiz',
      scenario,
      count: scenario.quiz.questionsPerSession,
      index: 0,
      correctCount: 0,
      sessionBestCombo: 0,
      goldEarned: 0,
      answered: false,
      currentProblem: null,
      askedQuestions: [],
    };
    showScreen('quiz');
    nextQuizQuestion();
  }

  function finishScenarioQuizSession() {
    const scenario = session.scenario;
    const pass = session.correctCount >= scenario.quiz.passCount;
    const outcome = pass ? scenario.outcomes.success : scenario.outcomes.fail;
    resolveScenarioOutcome(scenario, outcome);
  }

  function runScenario(scenario) {
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
    const graceTier = currentOutfit(state.stats).tierIndex;
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
    if (!state.wardrobe.owned[tierIndex]) return;
    state.wardrobe.equipped = tierIndex;
    saveGame();
    renderWardrobeList();
    renderMain();
  }

  function buyOutfit(tierIndex) {
    const tier = OUTFIT_TIERS[tierIndex];
    if (state.wardrobe.owned[tierIndex] || state.gold < tier.cost) return;
    state.gold -= tier.cost;
    state.wardrobe.owned[tierIndex] = true;
    state.wardrobe.equipped = tierIndex;
    showLevelToast(`✨ 새 옷을 샀어요: ${tier.name}!`);
    saveGame();
    renderWardrobeList();
    renderMain();
  }

  // 품위가 새 단계에 닿으면 그 옷을 "구매할 수 있게" 알려준다(자동으로 사거나
  // 입혀주지는 않으며, 옷장에서 직접 돈을 내고 사야 실제로 입을 수 있다).
  function updateWardrobeUnlocks() {
    const tierIndex = currentOutfit(state.stats).tierIndex;
    if (tierIndex > state.wardrobe.notifiedGraceTier) {
      state.wardrobe.notifiedGraceTier = tierIndex;
      const tier = OUTFIT_TIERS[tierIndex];
      showLevelToast(`👗 ${tier.name} 구매 가능! 옷장에서 ${tier.cost}G에 살 수 있어요`);
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
    laundry: { emoji: '🧺', name: '빨래하기' },
    garden: { emoji: '🌾', name: '텃밭 가꾸기' },
    friend: { emoji: '🎡', name: '친구 만나기' },
    banquet: { emoji: '💃', name: '연회 참석' },
  };

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
    if (state.wardrobe.equipped < BANQUET_MIN_TIER) {
      showLevelToast(`💃 ${OUTFIT_TIERS[BANQUET_MIN_TIER].name} 이상을 입어야 연회에 입장할 수 있어요`);
      advanceWeekOrTurn();
      return;
    }
    if (state.gold < BANQUET_ENTRY_FEE) {
      showLevelToast(`💰 연회 입장료 ${BANQUET_ENTRY_FEE}G가 부족해요`);
      advanceWeekOrTurn();
      return;
    }
    state.gold -= BANQUET_ENTRY_FEE;
    saveGame();
    startBanquetSession();
  }

  function currentWeekActivity() {
    return state.weekPlan[state.weekIndex] || null;
  }

  // 메인 화면 배너: 이번 달 몇 주째인지, 이번 주에 무엇을 하기로 했는지 보여준다.
  function updateScheduleBanner() {
    const activity = currentWeekActivity();
    const weekLabel = `${state.weekIndex + 1}/${WEEKS_PER_MONTH}주`;
    if (activity && ACTIVITY_DEFS[activity]) {
      const def = ACTIVITY_DEFS[activity];
      el.scheduleBannerText.textContent = `🗓️ ${weekLabel} · 다음: ${def.emoji} ${def.name}`;
      el.scheduleBanner.style.display = 'block';
    } else {
      el.scheduleBannerText.textContent = `🗓️ ${weekLabel} · 이번 주 계획을 세워보세요`;
      el.scheduleBanner.style.display = 'block';
    }
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

  const ASSUMED_CORRECT_RATE = 0.75;
  const EXPECTED_COMBO_MULTIPLIER = 1.3;
  const DELTA_STAT_KEYS = ['gold', 'intelligence', 'focus', 'stamina', 'charm', 'creativity', 'stress', 'luck'];
  const DELTA_STAT_LABELS = { gold: '골드', intelligence: '지능', focus: '집중력', stamina: '체력', charm: '매력', creativity: '창의력', stress: '스트레스', luck: '행운' };

  // 지금 지능으로 도달한 가장 높은 수학 레벨을 "평균적으로 나올 문제 난이도"로 삼아
  // 보상을 어림잡는다(실제로는 매 문제 과목·레벨이 무작위라 정확한 값은 아니다).
  function typicalStudyLevel() {
    const unlocked = unlockedLevelsFor('math');
    return unlocked.length ? unlocked[unlocked.length - 1] : 1;
  }

  // 활동 하나를 한 주 동안 했을 때 예상되는 스탯/골드 변화를 어림잡아 계산한다.
  // 정답률 75%를 가정한 대략적인 예상치이며, 실제 결과는 문제 운·콤보에 따라 달라진다.
  function estimateActivityDelta(activityId) {
    const d = { gold: 0, intelligence: 0, focus: 0, stamina: 0, charm: 0, creativity: 0, stress: 0, luck: 0 };
    const level = typicalStudyLevel();
    const rewardGold = 8 + level * 4;
    const r = ASSUMED_CORRECT_RATE;
    if (activityId === 'study') {
      d.gold += Math.round(QUESTIONS_PER_STUDY * r * rewardGold * EXPECTED_COMBO_MULTIPLIER * (1 + itemBonusSum('goldBonus')));
      d.intelligence += QUESTIONS_PER_STUDY * r * (level + itemBonusSum('intBonus'));
      d.creativity += QUESTIONS_PER_STUDY * r * level * 0.2;
      d.stress += QUESTIONS_PER_STUDY * (1 - r) * 6;
      d.stamina += -QUESTIONS_PER_STUDY * (1 - r) * 4 - QUESTIONS_PER_STUDY * r * 2;
    } else if (activityId === 'job') {
      const level1Reward = 8 + 1 * 4;
      d.gold += Math.round(QUESTIONS_PER_JOB * r * level1Reward * EXPECTED_COMBO_MULTIPLIER * 1.5 * (1 + itemBonusSum('goldBonus')));
      d.stamina += -QUESTIONS_PER_JOB * r * 2 - QUESTIONS_PER_JOB * (1 - r) * 3;
    } else if (activityId === 'exercise') {
      d.stamina += 8 + 2 * r;
      d.focus += 4 + 3 * r;
      d.stress += 3;
    } else if (activityId === 'rest') {
      const rm = 1 + itemBonusSum('restBonus');
      d.stress += -12 * rm - 5 * r;
      d.stamina += 10 * rm + 3 * r;
    } else if (activityId === 'laundry') {
      d.stress += -6 - 3 * r;
      d.stamina += -2;
      d.gold += 10 + 5 * r;
    } else if (activityId === 'garden') {
      d.stamina += -4;
      d.gold += 25 + 15 * r;
    } else if (activityId === 'friend') {
      d.charm += 3; // 실제로는 만나는 인물마다 다르며, 만날 때 정해진다
    } else if (activityId === 'banquet') {
      d.gold += -BANQUET_ENTRY_FEE;
      d.charm += QUESTIONS_PER_BANQUET * r * (4 + itemBonusSum('charmBonus'));
      d.stress += QUESTIONS_PER_BANQUET * (1 - r) * 2;
    }
    return d;
  }

  function renderWeekPlanPreview() {
    const total = { gold: 0, intelligence: 0, focus: 0, stamina: 0, charm: 0, creativity: 0, stress: 0, luck: 0 };
    let planned = 0;
    for (let i = state.weekIndex; i < WEEKS_PER_MONTH; i++) {
      const activity = state.weekPlan[i];
      if (!activity) continue;
      planned++;
      const d = estimateActivityDelta(activity);
      DELTA_STAT_KEYS.forEach((k) => { total[k] += d[k]; });
    }
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
    updateScheduleBanner();
    showScreen('main');
  });

  function executeSchedule() {
    const activity = currentWeekActivity();
    if (!activity) {
      openSchedule();
      return;
    }
    runActivity(activity);
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
          <span class="npc-affection-wrap">
            <span class="npc-affection-track"><span class="npc-affection-fill" style="width:${npcState.affection}%"></span></span>
            <span class="npc-affection-label">${affectionTierName(npcState.affection)}</span>
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

  // 한동안 만나지 않은 인물은 호감도가 조금씩 식는다. 자주 만나야
  // 친밀도가 유지·상승한다는 것을 게이지로도 체감할 수 있게 해준다.
  function applyAffectionDecay() {
    state.npcs.forEach((npcState) => {
      const turnsSinceMet = state.turn - npcState.lastMetTurn;
      if (turnsSinceMet > AFFECTION_DECAY_GRACE_TURNS) {
        npcState.affection = Math.max(0, npcState.affection - AFFECTION_DECAY_AMOUNT);
      }
    });
  }

  // 하녀/정원사를 고용하면 그 뒤로는 직접 스케줄하지 않아도 매턴 자동으로
  // 집안일 효과를 받는다(하녀 고용에 든 돈이 결국 시간을 벌어주는 구조).
  function applyServantEffects() {
    if (state.items.maid) state.stats.stress = Math.max(0, state.stats.stress - 2);
    if (state.items.gardener) state.gold += 10;
  }

  function advanceTurn() {
    state.turn++;
    state.weekPlan = new Array(WEEKS_PER_MONTH).fill(null);
    state.weekIndex = 0;
    state.talkedThisTurn = false;
    applyServantEffects();
    applyAffectionDecay();
    if (state.turn > TOTAL_TURNS) {
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
    if (state.weekIndex < WEEKS_PER_MONTH - 1) {
      state.weekIndex++;
      saveGame();
      showScreen('main');
      renderMain();
    } else {
      advanceTurn();
    }
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
    const prevName = state.characterName;
    state = makeInitialState(prevName);
    clearSave();
    saveGame();
    gameStarted = true;
    showScreen('main');
    renderMain();
  });

  /* ---------------- 시작 화면 ---------------- */

  el.btnNewGame.addEventListener('click', () => {
    state = makeInitialState(el.characterNameInput.value);
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
