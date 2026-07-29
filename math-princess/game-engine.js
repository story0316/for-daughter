/*
 * 게임 로직 엔진 (순수 로직, DOM 의존 없음)
 *
 * script.js에서 "상태(state)가 어떻게 바뀌는지"에 해당하는 부분을 전부 이
 * 파일로 옮겼다. 이 파일은 브라우저의 window/document를 전혀 건드리지
 * 않으므로 problems.js/scenarios.js/endings.js처럼 Node에서 바로
 * require해서 테스트하거나(test/unit/game-engine.test.js), 48개월 밸런스
 * 시뮬레이션(test/balance/simulate.js)에서 실제 게임과 똑같은 코드로
 * 재사용할 수 있다.
 *
 * script.js(UI 레이어)는 이 엔진의 함수를 호출해 state를 바꾸고, 함수가
 * 돌려주는 결과 객체를 가지고 화면에 무엇을 보여줄지 결정한다. 즉 "무슨
 * 일이 일어났는지"는 여기서 정하고, "그걸 어떻게 보여줄지"는 script.js가
 * 정한다.
 *
 * 내부적으로는 두 개의 더 작은 순수 엔진을 조합해서 쓴다:
 *   - question-engine.js: 다음에 어떤 문제를 낼지(과목/레벨 선택, 문제 생성)
 *   - reward-engine.js:   정답/오답에 얼마를 줄지(골드/스탯 공식, 호감도 증가량)
 * 밸런스 수치(보상 배율, 증감량)만 조정하고 싶을 때는 reward-engine.js만
 * 보면 되고, 새 과목/문제 유형을 추가할 때는 question-engine.js만 보면 된다.
 * 세션 흐름·NPC/시나리오·상점/옷장·턴 진행처럼 여러 값을 조합해 "무슨 일이
 * 일어났는지"를 결정하는 오케스트레이션은 이 파일(game-engine.js)의 몫이다.
 *
 * createEngine({ P, SUBJ, SC, E })로 문제/시나리오/엔딩 모듈을 주입받아
 * 만든다(브라우저에서는 window.MathPrincess*, Node 테스트에서는
 * require한 모듈을 그대로 넘기면 된다).
 */
(function (root) {
  'use strict';

  const QuestionEngineModule = (typeof module !== 'undefined' && module.exports)
    ? require('./question-engine.js')
    : root.MathPrincessQuestionEngine;
  const RewardEngineModule = (typeof module !== 'undefined' && module.exports)
    ? require('./reward-engine.js')
    : root.MathPrincessRewardEngine;

  function createEngine(deps) {
    const P = deps.P;
    const SUBJ = deps.SUBJ;
    const SC = deps.SC;
    const E = deps.E;

    /* ---------------- 상수 ---------------- */

    const STAT_KEYS = ['intelligence', 'focus', 'stamina', 'charm', 'creativity', 'stress', 'luck'];
    const STAT_LABELS = {
      intelligence: '지능', focus: '집중력', stamina: '체력', charm: '매력',
      creativity: '창의력', stress: '스트레스', luck: '행운',
    };
    const GROWTH_STAT_KEYS = ['intelligence', 'focus', 'stamina', 'charm', 'creativity', 'luck'];
    // Lv1~10, 10점 단위(0~90)로 승급하며 100에서 Lv10이 된다. Lv5(50 이상)를
    // 모든 성장 능력치에서 동시에 달성하면 평민→귀족 신분 상승 이벤트가 열린다.
    const STAT_TIER_THRESHOLDS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    const STAT_TIER_COLORS = [
      '#8a93b8', '#7d9ecf', '#6fa8ff', '#8f9dff', '#b48fff',
      '#d68fd0', '#ff8fb3', '#ffab8f', '#ffd873', '#fff6c9',
    ];
    const NOBLE_PROMOTION_TIER = 5; // STAT_TIER_THRESHOLDS[5]=50: 이 값에 도달하면 "Lv5를 다 채움"(Lv6 문턱)

    const WEEKS_PER_MONTH = 4;
    const QUESTIONS_PER_STUDY = 4;
    const QUESTIONS_PER_JOB = 3;
    const QUESTIONS_PER_BANQUET = 3;
    const QUESTIONS_PER_COMPETITION = 5;
    const QUESTIONS_PER_CREATIVITY = 5;
    const QUESTIONS_PER_FAITH = 3;
    const BANQUET_PASS_COUNT = 3;
    const COMPETITION_MIN_INTELLIGENCE = 50;
    const CREATIVITY_MIN_CREATIVITY = 20;
    const SAVE_KEY = 'math-princess-save-v1';

    // 공부/알바/경시대회는 문제 수를 도전자가 직접 고를 수 있다(SESSION_LENGTH_MIN
    // ~ SESSION_LENGTH_MAX). 각 활동의 기본값(QUESTIONS_PER_*)을 그대로 고르면
    // 보상 배율이 1.0(기존 밸런스 그대로)이고, 문제 수를 더 많이 고를수록 문제당
    // 보상이 최대 SESSION_LENGTH_MAX_BONUS(=1.5배)까지 커진다 — 대신 문제 수가
    // 늘어난 만큼 체력/스트레스 비용도 그대로 늘어나므로, 짧게 여러 번보다 길게
    // 한 번 도전하는 쪽이 더 효율적이 되도록(체감 보상 증가) 만든 장치다. 반대로
    // 기본값보다 적게 고르면 그만큼 효율이 조금 떨어진다.
    const SESSION_LENGTH_MIN = 3;
    const SESSION_LENGTH_MAX = 15;
    const SESSION_LENGTH_MAX_BONUS = 0.5;
    const SESSION_LENGTH_MIN_PENALTY = 0.2;

    function clampSessionLength(count) {
      const n = Math.round(count);
      return Math.max(SESSION_LENGTH_MIN, Math.min(SESSION_LENGTH_MAX, Number.isFinite(n) ? n : SESSION_LENGTH_MIN));
    }

    // count가 defaultCount와 같으면 1.0, SESSION_LENGTH_MAX까지 늘어나면
    // 1+SESSION_LENGTH_MAX_BONUS, SESSION_LENGTH_MIN까지 줄어들면
    // 1-SESSION_LENGTH_MIN_PENALTY가 되도록 선형 보간한다.
    function sessionLengthMultiplier(count, defaultCount) {
      const n = clampSessionLength(count);
      if (n >= defaultCount) {
        if (SESSION_LENGTH_MAX === defaultCount) return 1;
        return 1 + SESSION_LENGTH_MAX_BONUS * (n - defaultCount) / (SESSION_LENGTH_MAX - defaultCount);
      }
      if (defaultCount === SESSION_LENGTH_MIN) return 1;
      return 1 - SESSION_LENGTH_MIN_PENALTY * (defaultCount - n) / (defaultCount - SESSION_LENGTH_MIN);
    }

    const EVENTS = [
      { emoji: '😄', title: '즐거운 시간', desc: '친구와 수다를 떨며 즐거운 시간을 보냈어요.', apply: (s) => { s.stats.charm += 3; } },
      { emoji: '😤', title: '라이벌의 도발', desc: '라이벌이 시험 자랑을 해서 오기가 생겼어요!', apply: (s) => { s.stats.intelligence += 2; s.stats.stress += 3; } },
      { emoji: '🍀', title: '행운의 동전', desc: '길에서 동전을 주웠어요!', apply: (s) => { s.gold += 20; s.stats.luck += 1; } },
      { emoji: '🤒', title: '감기몸살', desc: '감기에 걸려서 며칠 앓아누웠어요.', apply: (s) => { s.stats.stamina -= 10; } },
      { emoji: '💌', title: '선생님의 칭찬', desc: '선생님이 칭찬해주셔서 기분이 좋아요.', apply: (s) => { s.stats.charm += 2; s.stats.stress -= 5; } },
      { emoji: '🏆', title: '장학금 획득!', desc: '열심히 공부한 결과 장학금을 받았어요!', apply: (s) => { s.gold += 100; }, requirement: (s) => s.stats.intelligence >= 50 },
    ];

    const TALK_LINES = [
      '오늘 하루도 애썼다고 꼭 안아줬어요.',
      '요즘 어떤 게 제일 재밌냐고 물어봤어요.',
      '같이 창밖을 보며 시답잖은 농담을 주고받았어요.',
      '"엄마는 항상 네 편이야" 라고 말해줬어요.',
      '오늘 있었던 일을 조잘조잘 들어줬어요.',
    ];

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

    // 매주 문제를 풀어 돈을 버는 "알바"(ACTIVITY_DEFS.job)와는 별개로, 스탯
    // 요건을 만족하면 지원할 수 있는 정식 직업. 한 번 취업하면 스케줄과
    // 무관하게 매턴 자동으로 급여가 들어오고, 왕자님과의 관계에도 영향을
    // 준다(급여가 높은 직업일수록 왕자님과 마주칠 기회 자체도 늘어난다).
    const CAREER_DEFS = [
      {
        id: 'tutor', emoji: '📖', name: '동네 과외 선생님',
        desc: '이웃 아이에게 공부를 가르쳐주는 시간제 과외예요. 매달 급여를 받아요.',
        requirement: { intelligence: 30 }, monthlyGold: 60, princeAffectionBonus: 0, princeEncounterChance: 0,
      },
      {
        id: 'librarian', emoji: '📚', name: '왕실 도서관 사서',
        desc: '왕실 서고에서 책을 정리하는 정식 자리예요. 급여도 넉넉하고, 왕자님이 자주 들르는 곳이라 우연히 마주칠 일도 생겨요.',
        requirement: { intelligence: 55, focus: 40 }, monthlyGold: 130, princeAffectionBonus: 1, princeEncounterChance: 0.12,
      },
      {
        id: 'scribe', emoji: '🖋️', name: '왕실 서기관',
        desc: '왕실 문서를 관리하는 정식 관직이에요. 급여가 가장 많고, 궁에 드나들 일이 많아 왕자님과 마주칠 확률도 확실히 높아져요.',
        requirement: { intelligence: 75, charm: 50 }, monthlyGold: 220, princeAffectionBonus: 3, princeEncounterChance: 0.22,
      },
    ];

    // 기초 과목(수학/영어/과학) 등급 인증. 수학/영어/과학은 전부 같은 지능
    // 임계값(0/8/18/28/38/48/58/68)을 공유하도록 설계되어 있어서, 그 임계값에
    // 대응하는 과목별 레벨을 그대로 인증 등급의 시험 범위로 재사용한다.
    // 동메달=레벨1(초4), 은메달=레벨4(초5~중1), 금메달=레벨7(중2~고1).
    // 지능이 그 레벨에 도달했다고 자동으로 메달이 붙지는 않고, 실제로 그
    // 레벨의 문제를 풀어 시험을 통과해야만(state.certifications에) 영구히 기록된다.
    const MEDAL_TIERS = [
      { id: 'bronze', name: '동메달', emoji: '🥉', requiredLevel: 1, questionCount: 5, passCount: 4 },
      { id: 'silver', name: '은메달', emoji: '🥈', requiredLevel: 4, questionCount: 5, passCount: 4 },
      { id: 'gold', name: '금메달', emoji: '🥇', requiredLevel: 7, questionCount: 5, passCount: 4 },
    ];
    const CERT_SUBJECT_KEYS = ['math', 'english', 'science'];

    // 사교모임 3단계. 등급이 높을수록 입장 조건(옷차림·품위)이 까다롭고,
    // 가장 높은 등급(고급 사교 모임)에서만 왕자님을 만나는 특별 이벤트가
    // 열린다(그 아래 등급은 예절 연습·매력 획득용). 최고 등급은 품위 점수뿐
    // 아니라 영어 인증(은메달 이상)도 요구해서, "교양"과 "실력" 둘 다
    // 갖춰야 들어갈 수 있게 했다.
    const BANQUET_TIERS = [
      {
        id: 'tea-party', emoji: '🫖', name: '작은 다과회',
        desc: '가볍게 예절을 익히는 다과회예요.',
        entryFee: 100, minOutfitTier: 0, minGraceScore: 0, requiredEnglishMedal: null,
      },
      {
        id: 'social', emoji: '💃', name: '사교 모임',
        desc: '또래 귀족 자제들이 모이는 정식 사교 모임이에요.',
        entryFee: 200, minOutfitTier: 1, minGraceScore: 35, requiredEnglishMedal: null,
      },
      {
        id: 'grand-social', emoji: '👑', name: '고급 사교 모임',
        desc: '왕실 인사들도 참석하는 고급 사교 모임이에요. 영어로 대화할 일이 많아 영어 인증(은메달 이상)이 있어야 초대받을 수 있고, 왕자님도 이 모임에서만 만날 수 있어요.',
        entryFee: 400, minOutfitTier: 2, minGraceScore: 70, requiredEnglishMedal: 'silver',
      },
    ];
    const PRINCE_MIN_TIER = 2;
    const STRESS_OVERFLOW_THRESHOLD = 70;
    const NPC_HINT_AFFECTION = 50;
    const NPC_LENIENT_AFFECTION = 80;

    const AFFECTION_TIERS = [
      { min: 0, name: '낯선 사이' },
      { min: 20, name: '아는 사이' },
      { min: 40, name: '친근한 사이' },
      { min: 60, name: '가까운 사이' },
      { min: 80, name: '각별한 사이' },
    ];
    const AFFECTION_DECAY_GRACE_TURNS = 3;
    const AFFECTION_DECAY_AMOUNT = 1;

    // 품위(min)만으로 살 수 있는 옷은 tier 2(예쁜 드레스)까지다. tier 3부터는
    // "공주 드레스"라는 이름 그대로, 아무리 품위가 높아도 평민 신분으로는
    // 살 수 없고 왕실 작위(귀족 신분, state.nobleTitle)를 받아야만 구매할 수
    // 있다(requiresNoble). 왕자님을 만나는 데 필요한 최소 등급(PRINCE_MIN_TIER
    // = tier 2)은 이 요건보다 낮아 왕자님 루트 자체에는 영향이 없다.
    const OUTFIT_TIERS = [
      { min: 0, cost: 0, emoji: '👕', name: '평범한 옷', wardrobeDesc: '처음부터 입고 있는 편안한 옷' },
      { min: 25, cost: 400, emoji: '👚', name: '단정한 옷', wardrobeDesc: '품위 25 이상에서 구매 가능' },
      { min: 50, cost: 900, emoji: '👗', name: '예쁜 드레스', wardrobeDesc: '품위 50 이상에서 구매 가능' },
      { min: 75, cost: 1800, emoji: '👑', name: '공주 드레스', requiresNoble: true, wardrobeDesc: '품위 75 이상 + 귀족 신분 필요(평민은 살 수 없는 옷)' },
      { min: 90, cost: 3200, emoji: '💐', name: '무도회 드레스', requiresNoble: true, wardrobeDesc: '품위 90 이상 + 귀족 신분 필요(평민은 살 수 없는 옷)' },
      { min: 100, cost: 6000, emoji: '✨', name: '대관식 드레스', requiresNoble: true, wardrobeDesc: '품위 100(만점) + 귀족 신분에서만 구매 가능한 전설의 옷' },
    ];

    const NPC_DEFS = [
      { id: 'friend', emoji: '😊', name: '친구', desc: '함께 있으면 마음이 편안해지는 단짝', unlock: () => true, apply: (s) => { s.stats.charm += 6; }, lines: ['같이 떡볶이를 먹으며 수다를 떨었어요.', '친구가 요즘 고민을 털어놓았어요.', '같이 만화책을 보며 깔깔 웃었어요.'] },
      { id: 'rival', emoji: '😏', name: '라이벌', desc: '괜히 신경 쓰이지만 자꾸 실력이 느는 상대', unlock: () => true, apply: (s) => { s.stats.intelligence += 3; s.stats.stress += 3; }, lines: ['라이벌이 이번 시험 점수를 자랑했어요. 오기가 생겨요!', '라이벌과 문제풀이 대결을 했어요.', '라이벌이 은근히 신경 쓰이는 하루였어요.'] },
      { id: 'teacher', emoji: '👩‍🏫', name: '선생님', desc: '어려운 문제도 척척 알려주는 든든한 선생님', unlock: () => true, apply: (s) => { s.stats.intelligence += 2; s.stats.stress -= 5; }, lines: ['선생님이 어려운 문제 풀이법을 알려주셨어요.', '선생님과 진로 상담을 했어요.', '선생님이 숙제를 칭찬해주셨어요.'] },
      { id: 'noble', emoji: '💃', name: '사교계 친구', desc: '무도회와 다과회에서 만난 사교계 친구', unlock: (stats) => graceScore(stats) >= 35, unlockHint: (stats) => `품위 35 필요 (현재 ${Math.round(graceScore(stats))})`, apply: (s) => { s.stats.charm += 4; s.stats.creativity += 3; }, lines: ['함께 무도회 예절을 배웠어요.', '다과회에서 우아하게 차를 마셨어요.', '사교계 소문 이야기로 즐거운 시간을 보냈어요.'] },
      { id: 'prince', emoji: '🤴', name: '왕자님', desc: '무도회에서 우연히 마주친 왕자님', unlock: (stats) => graceScore(stats) >= 55, unlockHint: (stats) => `품위 55 필요 (현재 ${Math.round(graceScore(stats))})`, apply: (s) => { s.stats.charm += 5; s.stats.luck += 2; }, lines: ['왕자님과 정원을 산책했어요.', '왕자님이 춤을 신청했어요.', '왕자님과 함께 별을 보며 이야기를 나눴어요.'] },
      { id: 'sage', emoji: '🧙', name: '왕실 스승', desc: '왕실 도서관을 관리하는 현자', unlock: (stats) => stats.intelligence >= 55, unlockHint: (stats) => `지능 55 필요 (현재 ${Math.round(stats.intelligence)})`, apply: (s) => { s.stats.intelligence += 4; s.stats.creativity += 2; }, lines: ['왕실 서고에서 귀한 책을 함께 읽었어요.', '현자에게서 아무도 모르는 문제 풀이를 배웠어요.', '현자가 재능을 칭찬해주셨어요.'] },
    ];

    const ACTIVITY_DEFS = {
      study: { emoji: '📖', name: '공부' },
      job: { emoji: '💼', name: '알바' },
      exercise: { emoji: '🏃', name: '운동' },
      rest: { emoji: '🛌', name: '휴식' },
      laundry: { emoji: '🧺', name: '빨래하기' },
      garden: { emoji: '🌾', name: '텃밭 가꾸기' },
      friend: { emoji: '🎡', name: '친구 만나기' },
      banquet: { emoji: '💃', name: '연회 참석' },
      competition: { emoji: '🏆', name: '왕국 수학경시대회' },
      creativity: { emoji: '🎨', name: '창의력 올림피아드' },
      faith: { emoji: '🙏', name: '기도와 선행' },
    };

    const ASSUMED_CORRECT_RATE = 0.75;
    const EXPECTED_COMBO_MULTIPLIER = 1.3;
    const DELTA_STAT_KEYS = ['gold', 'intelligence', 'focus', 'stamina', 'charm', 'creativity', 'stress', 'luck'];
    const DELTA_STAT_LABELS = { gold: '골드', intelligence: '지능', focus: '집중력', stamina: '체력', charm: '매력', creativity: '창의력', stress: '스트레스', luck: '행운' };

    const Question = QuestionEngineModule.createQuestionEngine({ P, SUBJ });
    const Reward = RewardEngineModule.createRewardEngine({ ITEMS });

    /* ---------------- 기본 헬퍼 ---------------- */

    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function randChoice(arr) { return arr[randInt(0, arr.length - 1)]; }
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function statTierIndex(value) {
      let idx = 0;
      STAT_TIER_THRESHOLDS.forEach((min, i) => { if (value >= min) idx = i; });
      return idx;
    }
    function snapshotGrowthTiers(stats) {
      const snap = {};
      GROWTH_STAT_KEYS.forEach((k) => { snap[k] = statTierIndex(stats[k]); });
      return snap;
    }
    // 스탯 레벨업(성장 애니메이션)을 UI가 보여주고 싶을 때 쓴다. before/after
    // 스냅샷을 비교해 새로 레벨업한 스탯 이름 배열을 돌려준다.
    function leveledUpStats(beforeTiers, stats) {
      const leveled = [];
      GROWTH_STAT_KEYS.forEach((k) => {
        const afterTier = statTierIndex(stats[k]);
        if (afterTier > beforeTiers[k]) leveled.push({ key: k, label: STAT_LABELS[k], tier: afterTier + 1 });
      });
      return leveled;
    }

    function graceScore(stats) {
      return stats.charm * 0.4 + stats.creativity * 0.3 + stats.intelligence * 0.3;
    }

    // 성장 능력치(지능/집중력/체력/매력/창의력/행운) 여섯 개 모두 Lv5를 다
    // 채워(값 50 도달, STAT_TIER_THRESHOLDS[5]=50에서 Lv6로 넘어가는 문턱)
    // 있고 아직 귀족으로 승급하지 않았으면 왕실 작위 수여 이벤트를 열 수
    // 있다. 실제 승급(작위 저장)은 grantNobleTitle이 한다.
    function noblePromotionEligible(state) {
      if (state.nobleTitle) return false;
      return GROWTH_STAT_KEYS.every((k) => state.stats[k] >= STAT_TIER_THRESHOLDS[NOBLE_PROMOTION_TIER]);
    }

    function grantNobleTitle(state, title) {
      const trimmed = (title || '').trim();
      if (!trimmed) return false;
      if (state.nobleTitle) return false;
      state.nobleTitle = trimmed.slice(0, 20);
      return true;
    }

    function affectionTierName(value) {
      let name = AFFECTION_TIERS[0].name;
      AFFECTION_TIERS.forEach((t) => { if (value >= t.min) name = t.name; });
      return name;
    }

    function currentOutfit(stats) {
      const grace = graceScore(stats);
      let tier = OUTFIT_TIERS[0];
      let tierIndex = 0;
      OUTFIT_TIERS.forEach((t, i) => { if (grace >= t.min) { tier = t; tierIndex = i; } });
      return Object.assign({ tierIndex }, tier);
    }

    function itemBonusSum(state, key) {
      return Reward.itemBonusSum(state.items, key);
    }

    // 보상 엔진이 돌려준 { gold?, intelligence?, ... } 형태의 변화량을 state에 그대로 더한다.
    function applyDelta(state, delta) {
      Object.keys(delta).forEach((k) => {
        if (k === 'gold') state.gold += delta.gold;
        else state.stats[k] += delta[k];
      });
    }

    function clampStats(state) {
      STAT_KEYS.forEach((k) => { state.stats[k] = Math.max(0, Math.min(100, state.stats[k])); });
      state.gold = Math.max(0, state.gold);
      (state.npcs || []).forEach((n) => { n.affection = Math.max(0, Math.min(100, n.affection)); });
    }

    /* ---------------- 상태 생성/저장 형식 이관 ---------------- */

    function makeInitialState(characterName) {
      return {
        turn: 1,
        gold: 0,
        characterName: (characterName && characterName.trim()) || '우리 딸',
        stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: randInt(10, 30) },
        totalCorrect: 0,
        combo: 0,
        bestCombo: 0,
        items: {},
        npcs: NPC_DEFS.map((n) => ({ id: n.id, affection: randInt(10, 20), lastMetTurn: 0 })),
        wardrobe: { equipped: 0, owned: OUTFIT_TIERS.map((_, i) => i === 0), notifiedGraceTier: 0 },
        weekPlan: new Array(WEEKS_PER_MONTH).fill(null),
        weekPlanCount: new Array(WEEKS_PER_MONTH).fill(null),
        weekPlanBanquetTier: new Array(WEEKS_PER_MONTH).fill(null),
        weekIndex: 0,
        talkedThisTurn: false,
        completedScenarios: [],
        career: null,
        certifications: { math: null, english: null, science: null },
        nobleTitle: null,
      };
    }

    // localStorage에서 읽은 JSON을 최신 상태 형식으로 이관한다(옛 필드 →
    // 새 필드). 유효한 저장 데이터가 아니면 null을 돌려준다. 실제
    // localStorage 읽기/쓰기 자체는 이 함수를 호출하는 쪽(script.js)의 몫이다.
    function migrateLoadedState(loaded) {
      if (!loaded || typeof loaded.turn !== 'number') return null;
      loaded.items = loaded.items || {};
      loaded.npcs = loaded.npcs || NPC_DEFS.map((n) => ({ id: n.id, affection: randInt(10, 20), lastMetTurn: 0 }));
      loaded.npcs.forEach((n) => { if (typeof n.lastMetTurn !== 'number') n.lastMetTurn = 0; });
      loaded.wardrobe = loaded.wardrobe || { equipped: 0 };
      if (!Array.isArray(loaded.wardrobe.owned)) {
        const grandfatheredMax = typeof loaded.wardrobe.unlockedMax === 'number' ? loaded.wardrobe.unlockedMax : 0;
        loaded.wardrobe.owned = OUTFIT_TIERS.map((_, i) => i <= grandfatheredMax);
      }
      delete loaded.wardrobe.unlockedMax;
      if (typeof loaded.wardrobe.notifiedGraceTier !== 'number') loaded.wardrobe.notifiedGraceTier = 0;
      if (typeof loaded.characterName !== 'string' || !loaded.characterName.trim()) loaded.characterName = '우리 딸';
      if (!Array.isArray(loaded.weekPlan) || loaded.weekPlan.length !== WEEKS_PER_MONTH) {
        loaded.weekPlan = new Array(WEEKS_PER_MONTH).fill(null);
        if (loaded.scheduledActivity) loaded.weekPlan[0] = loaded.scheduledActivity;
      }
      if (!Array.isArray(loaded.weekPlanCount) || loaded.weekPlanCount.length !== WEEKS_PER_MONTH) {
        loaded.weekPlanCount = new Array(WEEKS_PER_MONTH).fill(null);
      }
      if (!Array.isArray(loaded.weekPlanBanquetTier) || loaded.weekPlanBanquetTier.length !== WEEKS_PER_MONTH) {
        loaded.weekPlanBanquetTier = new Array(WEEKS_PER_MONTH).fill(null);
      }
      if (typeof loaded.weekIndex !== 'number' || loaded.weekIndex < 0 || loaded.weekIndex >= WEEKS_PER_MONTH) loaded.weekIndex = 0;
      delete loaded.scheduledActivity;
      if (typeof loaded.talkedThisTurn === 'undefined') loaded.talkedThisTurn = false;
      if (!Array.isArray(loaded.completedScenarios)) loaded.completedScenarios = [];
      if (typeof loaded.career === 'undefined') loaded.career = null;
      if (loaded.career !== null && !CAREER_DEFS.some((c) => c.id === loaded.career)) loaded.career = null;
      if (!loaded.certifications || typeof loaded.certifications !== 'object' || Array.isArray(loaded.certifications)) {
        loaded.certifications = { math: null, english: null, science: null };
      }
      CERT_SUBJECT_KEYS.forEach((key) => {
        const value = loaded.certifications[key];
        if (value !== null && !MEDAL_TIERS.some((t) => t.id === value)) loaded.certifications[key] = null;
      });
      if (typeof loaded.nobleTitle !== 'string' && loaded.nobleTitle !== null) loaded.nobleTitle = null;
      return loaded;
    }

    /* ---------------- 과목/문제 (질문 엔진에 위임) ---------------- */

    function unlockedLevelsFor(state, subjectKey) { return Question.unlockedLevelsFor(state.stats.intelligence, subjectKey); }
    function pickRandomSubjectAndLevel(state) { return Question.pickRandomSubjectAndLevel(state.stats.intelligence); }
    function pickRandomSubjectLevel1() { return Question.pickRandomSubjectLevel1(); }
    function subjectName(key) { return Question.subjectName(key); }
    function generateEtiquetteQuestion(session) { return Question.generateEtiquetteQuestion(session); }
    function generateScenarioQuestion(session) { return Question.generateScenarioQuestion(session); }
    function generateNextProblem(state, session) { return Question.generateNextProblem(state.stats.intelligence, session); }
    function typicalStudyLevel(state) { return Question.typicalStudyLevel(state.stats.intelligence); }

    // 왕국 수학경시대회에서 쓸 난이도 사다리를 만든다. 덧셈뺄셈(레벨 1)부터
    // 시작해 현재 해금된 최고 레벨까지 count개 문제에 걸쳐 고르게 올라간다.
    function competitionLevelRamp(maxLevel, count) {
      const levels = [];
      for (let i = 0; i < count; i++) {
        const raw = count === 1 ? maxLevel : 1 + (i * (maxLevel - 1)) / (count - 1);
        levels.push(Math.max(1, Math.min(maxLevel, Math.round(raw))));
      }
      return levels;
    }

    /* ---------------- 세션(문제 풀이) 생성 ---------------- */

    function makeSession(type, extra) {
      return Object.assign({
        type,
        index: 0,
        correctCount: 0,
        sessionBestCombo: 0,
        goldEarned: 0,
        answered: false,
        currentProblem: null,
        currentSubject: null,
      }, extra);
    }

    // 이번 공부 세션 내내 한 과목만 다루도록(연계성) 세션 시작 시 과목을 하나 고정해둔다.
    // count를 생략하면 기본 문제 수(QUESTIONS_PER_STUDY)를 쓴다.
    function startStudySession(count) {
      const n = clampSessionLength(count != null ? count : QUESTIONS_PER_STUDY);
      return makeSession('study', {
        count: n,
        rewardMultiplier: sessionLengthMultiplier(n, QUESTIONS_PER_STUDY),
        fixedSubject: randChoice(Question.SUBJECT_KEYS),
      });
    }
    function startJobSession(count) {
      const n = clampSessionLength(count != null ? count : QUESTIONS_PER_JOB);
      return makeSession('job', { count: n, rewardMultiplier: sessionLengthMultiplier(n, QUESTIONS_PER_JOB) });
    }
    function startBanquetSession(tierId) { return makeSession('banquet', { level: 1, count: QUESTIONS_PER_BANQUET, askedQuestions: [], tierId }); }
    function startExerciseSession() { return makeSession('exercise-bonus', { count: 1 }); }
    function startRestSession() { return makeSession('rest-bonus', { count: 1 }); }
    function startLaundrySession() { return makeSession('laundry-bonus', { count: 1 }); }
    function startGardenSession() { return makeSession('garden-bonus', { count: 1 }); }
    // 덧셈뺄셈(레벨 1)부터 시작해 현재 해금된 최고 레벨까지 점점 어려워지는
    // 수학 문제로만 출제한다(다른 과목과 안 섞임 — "수학" 경시대회이므로).
    // count를 생략하면 기본 문제 수(QUESTIONS_PER_COMPETITION)를 쓴다.
    function startCompetitionSession(state, count) {
      const n = clampSessionLength(count != null ? count : QUESTIONS_PER_COMPETITION);
      const levels = competitionLevelRamp(typicalStudyLevel(state), n);
      return makeSession('competition', { levels, count: n, rewardMultiplier: sessionLengthMultiplier(n, QUESTIONS_PER_COMPETITION) });
    }
    // 창의력 올림피아드: 레벨이 없는 고정 문제 은행(패턴/유추/공간지각/
    // 창의적 사고)에서 뽑는다. 공부/알바/경시대회처럼 문제 수를 직접 고를 수 있다.
    function startCreativitySession(count) {
      const n = clampSessionLength(count != null ? count : QUESTIONS_PER_CREATIVITY);
      return makeSession('creativity', { count: n, askedQuestions: [], rewardMultiplier: sessionLengthMultiplier(n, QUESTIONS_PER_CREATIVITY) });
    }
    // 기도와 선행: 성경 퀴즈/어른 공경/친구 배려/기도 문제로 행운을 올린다.
    // 문제 수를 고르는 활동이 아니라(연회처럼) 항상 고정된 수만큼 진행한다.
    function startFaithSession() {
      return makeSession('faith', { count: QUESTIONS_PER_FAITH, askedQuestions: [] });
    }
    // 관련 인물과 친할수록(NPC_HINT_AFFECTION 이상) 문제에 힌트가 붙고,
    // 아주 친하면(NPC_LENIENT_AFFECTION 이상) 통과 기준이 1개 낮아진다.
    function startScenarioQuizSession(state, scenario) {
      const npcState = state.npcs.find((n) => n.id === scenario.npcId);
      const affection = npcState ? npcState.affection : 0;
      const hint = affection >= NPC_HINT_AFFECTION;
      const passCount = affection >= NPC_LENIENT_AFFECTION ? Math.max(1, scenario.quiz.passCount - 1) : scenario.quiz.passCount;
      return makeSession('scenario-quiz', { scenario, count: scenario.quiz.questionsPerSession, askedQuestions: [], hint, passCount });
    }

    /* ---------------- 정답/오답 반영 (보상 엔진에 위임) ---------------- */

    function applyCorrect(state, session, problem) {
      state.combo++;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      session.sessionBestCombo = Math.max(session.sessionBestCombo, state.combo);

      const reward = Reward.correctAnswerReward(session.type, problem, state.combo, state.items, session.rewardMultiplier);
      if (typeof reward.gold === 'number') session.goldEarned += reward.gold;
      applyDelta(state, reward);

      state.totalCorrect++;
      session.correctCount++;
      clampStats(state);
    }

    function applyWrong(state, session) {
      state.combo = 0;
      applyDelta(state, Reward.wrongAnswerPenalty(session.type));
      clampStats(state);
    }

    /* ---------------- 세션 종료 처리 ---------------- */
    // 각 finish* 함수는 state(및 필요하면 session)를 직접 바꾸고, UI가 화면에
    // 표시할 수 있는 순수 데이터(outcome)를 돌려준다.

    function finishStudyOrJobOutcome(session) {
      return {
        perfect: session.correctCount === session.count,
        title: session.type === 'study' ? '공부를 마쳤어요!' : '알바를 마쳤어요!',
        correctCount: session.correctCount,
        count: session.count,
        goldEarned: session.goldEarned,
        bestCombo: session.sessionBestCombo,
      };
    }

    // 연회 결과에 따라 왕자님을 만날 수 있는 특별한 이벤트로 이어진다.
    // 왕자님은 최고 등급(고급 사교 모임)에서만 만날 수 있다 - 그 아래
    // 등급은 예절 연습/매력 획득이 목적이라 옷차림이 아무리 좋아도 만날 수 없다.
    function finishBanquetOutcome(state, session) {
      const tier = BANQUET_TIERS.find((t) => t.id === session.tierId) || BANQUET_TIERS[0];
      const isTopTier = tier.id === BANQUET_TIERS[BANQUET_TIERS.length - 1].id;
      const success = session.correctCount >= BANQUET_PASS_COUNT;
      const dressedForPrince = state.wardrobe.equipped >= PRINCE_MIN_TIER;
      if (success && dressedForPrince && isTopTier) {
        const princeState = state.npcs.find((n) => n.id === 'prince');
        princeState.affection += Reward.affectionGain([10, 16], state.items) + careerPrinceBonus(state);
        princeState.lastMetTurn = state.turn;
        clampStats(state);
        return { result: 'met-prince', tier, correctCount: session.correctCount, count: session.count, princeAffection: princeState.affection };
      }
      clampStats(state);
      if (success && isTopTier && !dressedForPrince) {
        return { result: 'success-underdressed', tier, correctCount: session.correctCount, count: session.count, requiredTierName: OUTFIT_TIERS[PRINCE_MIN_TIER].name };
      }
      if (success && !isTopTier) {
        return { result: 'success-lower-tier', tier, correctCount: session.correctCount, count: session.count };
      }
      return { result: 'incomplete', tier, correctCount: session.correctCount, count: session.count };
    }

    function finishExerciseBonusOutcome(state, session) {
      const bonus = session.correctCount > 0;
      applyDelta(state, Reward.exerciseBonusReward(bonus));
      clampStats(state);
      return { bonus };
    }

    function finishRestBonusOutcome(state, session) {
      const bonus = session.correctCount > 0;
      applyDelta(state, Reward.restBonusReward(bonus, state.items));
      clampStats(state);
      return { bonus };
    }

    function finishLaundryBonusOutcome(state, session) {
      const bonus = session.correctCount > 0;
      applyDelta(state, Reward.laundryBonusReward(bonus));
      clampStats(state);
      return { bonus };
    }

    function finishGardenBonusOutcome(state, session) {
      const bonus = session.correctCount > 0;
      applyDelta(state, Reward.gardenBonusReward(bonus));
      clampStats(state);
      return { bonus };
    }

    // 문제마다 상금은 applyCorrect가 이미 즉시 반영했으므로(session.goldEarned에
    // 누적됨), 여기서는 만점 보너스만 추가로 얹는다.
    function finishCompetitionOutcome(state, session) {
      const perfect = session.correctCount === session.count;
      let bonusGold = 0;
      if (perfect) {
        const topLevel = session.levels[session.levels.length - 1];
        const bonus = Reward.competitionPerfectBonus(topLevel, session.rewardMultiplier);
        bonusGold = bonus.gold;
        applyDelta(state, bonus);
      }
      clampStats(state);
      return { correctCount: session.correctCount, count: session.count, goldEarned: session.goldEarned + bonusGold, perfect };
    }

    // 창의력 올림피아드도 왕국 수학경시대회와 같은 방식으로, 문제당 보상은
    // applyCorrect가 이미 반영했으므로 만점 보너스만 여기서 얹는다.
    function finishCreativityOutcome(state, session) {
      const perfect = session.correctCount === session.count;
      let bonusGold = 0;
      if (perfect) {
        const bonus = Reward.creativityPerfectBonus(session.rewardMultiplier);
        bonusGold = bonus.gold;
        applyDelta(state, bonus);
      }
      clampStats(state);
      return { correctCount: session.correctCount, count: session.count, goldEarned: session.goldEarned + bonusGold, perfect };
    }

    // 기도와 선행은 만점 보너스 없이(공부/알바처럼) 문제마다 이미 반영된
    // 행운/스트레스 변화를 그대로 요약해 보여준다.
    function finishFaithOutcome(session) {
      return {
        perfect: session.correctCount === session.count,
        correctCount: session.correctCount,
        count: session.count,
        bestCombo: session.sessionBestCombo,
      };
    }

    // chance 확률로 무작위 이벤트를 골라 효과를 적용하고 이벤트 정보를 돌려준다.
    // 이벤트가 안 뜨면 null(=UI는 바로 다음 단계로 진행하면 됨).
    function rollRandomEvent(state, chance) {
      if (Math.random() > chance) return null;
      const pool = EVENTS.filter((ev) => !ev.requirement || ev.requirement(state));
      const event = randChoice(pool);
      event.apply(state);
      clampStats(state);
      return { emoji: event.emoji, title: event.title, desc: event.desc };
    }

    // 스트레스가 STRESS_OVERFLOW_THRESHOLD를 넘으면, 넘은 정도에 비례해 최대
    // 60% 확률로 몸살이 나 이번 주 계획했던 활동 대신 앓아눕는다(체력 소모,
    // 스트레스는 다소 풀림). 이벤트가 안 뜨면 null(=UI는 원래 활동을 진행).
    // 휴식 없이 스탯만 밀어붙이는 플레이에 실질적인 리스크를 부여하기 위함.
    function checkStressOverflow(state) {
      if (state.stats.stress < STRESS_OVERFLOW_THRESHOLD) return null;
      const chance = Math.min(0.6, ((state.stats.stress - STRESS_OVERFLOW_THRESHOLD) / 30) * 0.6);
      if (Math.random() > chance) return null;
      state.stats.stamina = Math.max(0, state.stats.stamina - 15);
      state.stats.stress = Math.max(0, state.stats.stress - 20);
      clampStats(state);
      return { emoji: '🤒', title: '몸살이 났어요', desc: '무리하다가 몸살이 나서 계획했던 활동 대신 하루 앓아누웠어요. 체력이 줄었지만 마음은 한결 가벼워졌어요.' };
    }

    /* ---------------- 인물/시나리오 ---------------- */

    function scenarioUnlocked(scenario, state) {
      const u = scenario.unlock || {};
      if (typeof u.minGrace === 'number' && graceScore(state.stats) < u.minGrace) return false;
      if (u.minStat && state.stats[u.minStat.key] < u.minStat.value) return false;
      if (u.minAffection) {
        const npcState = state.npcs.find((n) => n.id === u.minAffection.npcId);
        if (!npcState || npcState.affection < u.minAffection.value) return false;
      }
      return true;
    }

    function findActiveScenario(state, npcId) {
      if (!SC) return null;
      return (
        SC.SCENARIOS.find(
          (s) => s.npcId === npcId && s.status === 'ready' && !s.bespoke &&
            !state.completedScenarios.includes(s.id) && scenarioUnlocked(s, state)
        ) || null
      );
    }

    function applyStatNpcEffects(state, statEffects, npcEffects) {
      if (statEffects) {
        Object.keys(statEffects).forEach((k) => { state.stats[k] += statEffects[k]; });
      }
      if (npcEffects) {
        Object.keys(npcEffects).forEach((npcId) => {
          const npcState = state.npcs.find((n) => n.id === npcId);
          if (!npcState) return;
          const bonus = npcId === 'prince' ? careerPrinceBonus(state) : 0;
          npcState.affection += Reward.affectionGain(npcEffects[npcId], state.items) + bonus;
          npcState.lastMetTurn = state.turn;
        });
      }
    }

    // npcId를 만나려는 시도의 결과를 판정한다. 왕자님은 옷차림 조건이 있어
    // 막힐 수 있고(blocked), 진행 중인 특별 시나리오가 있으면 그걸 우선
    // 알려주고(scenario), 둘 다 아니면 평범한 만남 효과를 적용한다(met).
    function meetNpcAttempt(state, npcId) {
      if (npcId === 'prince' && state.wardrobe.equipped < PRINCE_MIN_TIER) {
        return { kind: 'blocked-outfit', requiredTierName: OUTFIT_TIERS[PRINCE_MIN_TIER].name };
      }
      const activeScenario = findActiveScenario(state, npcId);
      if (activeScenario) return { kind: 'scenario', scenario: activeScenario };

      const def = NPC_DEFS.find((n) => n.id === npcId);
      const npcState = state.npcs.find((n) => n.id === npcId);
      def.apply(state);
      npcState.affection += Reward.affectionGain([8, 14], state.items) + (npcId === 'prince' ? careerPrinceBonus(state) : 0);
      npcState.lastMetTurn = state.turn;
      clampStats(state);
      return { kind: 'met', npcDef: def, npcState, line: randChoice(def.lines) };
    }

    // 시나리오 성공/실패 결과(outcome)를 state에 반영하고 완료 처리한다.
    function resolveScenarioOutcome(state, scenario, outcome, resultLine) {
      applyStatNpcEffects(state, outcome.statEffects, outcome.npcEffects);
      const mainNpcState = state.npcs.find((n) => n.id === scenario.npcId);
      if (mainNpcState) mainNpcState.lastMetTurn = state.turn;
      clampStats(state);
      if (!state.completedScenarios.includes(scenario.id)) state.completedScenarios.push(scenario.id);
      return { title: outcome.narrative.title, desc: resultLine ? `${resultLine} ${outcome.narrative.desc}` : outcome.narrative.desc };
    }

    function resolveBranchingOption(state, scenario, option) {
      applyStatNpcEffects(state, option.statEffects, option.npcEffects);
      return resolveScenarioOutcome(state, scenario, scenario.outcomes.success, option.resultLine);
    }

    function resolveNarrativeScenario(state, scenario) {
      const line = randChoice(scenario.narrative.lines);
      return resolveScenarioOutcome(state, scenario, scenario.outcomes.success, line);
    }

    function finishScenarioQuizOutcome(state, session) {
      const scenario = session.scenario;
      const passCount = session.passCount || scenario.quiz.passCount;
      const pass = session.correctCount >= passCount;
      const outcome = pass ? scenario.outcomes.success : scenario.outcomes.fail;
      return resolveScenarioOutcome(state, scenario, outcome);
    }

    /* ---------------- 상점/옷장 ---------------- */

    function buyItem(state, itemId) {
      const item = ITEMS.find((i) => i.id === itemId);
      if (!item || state.items[itemId] || state.gold < item.cost) return false;
      state.gold -= item.cost;
      state.items[itemId] = true;
      return true;
    }

    function equipOutfit(state, tierIndex) {
      if (!state.wardrobe.owned[tierIndex]) return false;
      state.wardrobe.equipped = tierIndex;
      return true;
    }

    // 그 옷을 "살 수 있는" 요건(품위, 그리고 tier 3 이상은 귀족 신분까지)을
    // 갖췄는지 확인한다. 골드/이미 소유 여부는 별개(buyOutfit이 따로 확인).
    function outfitRequirementMet(state, tierIndex) {
      const tier = OUTFIT_TIERS[tierIndex];
      if (graceScore(state.stats) < tier.min) return false;
      if (tier.requiresNoble && !state.nobleTitle) return false;
      return true;
    }

    function buyOutfit(state, tierIndex) {
      const tier = OUTFIT_TIERS[tierIndex];
      if (state.wardrobe.owned[tierIndex] || state.gold < tier.cost) return false;
      if (!outfitRequirementMet(state, tierIndex)) return false;
      state.gold -= tier.cost;
      state.wardrobe.owned[tierIndex] = true;
      state.wardrobe.equipped = tierIndex;
      return true;
    }

    // 품위(+ 필요하면 귀족 신분까지)가 새 단계에 닿으면 알림 대상 tier를
    // 갱신하고 그 tier를 돌려준다(UI가 토스트를 띄울 수 있도록). 이미
    // 알림을 준 단계면 null.
    function checkWardrobeGraceNotification(state) {
      let tierIndex = 0;
      OUTFIT_TIERS.forEach((tier, i) => { if (outfitRequirementMet(state, i)) tierIndex = i; });
      if (tierIndex > state.wardrobe.notifiedGraceTier) {
        state.wardrobe.notifiedGraceTier = tierIndex;
        return OUTFIT_TIERS[tierIndex];
      }
      return null;
    }

    /* ---------------- 직업(정식 취업) ---------------- */

    function careerRequirementMet(stats, career) {
      return Object.keys(career.requirement).every((key) => stats[key] >= career.requirement[key]);
    }

    function unlockedCareers(state) {
      return CAREER_DEFS.filter((c) => careerRequirementMet(state.stats, c));
    }

    // 직업에 지원한다. 요건을 만족 못 하면 false. 이미 요건을 만족한 다른
    // 직업으로 갈아타는 것도 언제든 가능하다(이직).
    function applyForCareer(state, careerId) {
      const career = CAREER_DEFS.find((c) => c.id === careerId);
      if (!career || !careerRequirementMet(state.stats, career)) return false;
      state.career = careerId;
      return true;
    }

    function resignCareer(state) {
      state.career = null;
    }

    function careerPrinceBonus(state) {
      if (!state.career) return 0;
      const career = CAREER_DEFS.find((c) => c.id === state.career);
      return career ? career.princeAffectionBonus : 0;
    }

    /* ---------------- 기초 과목 등급 인증(동/은/금메달) ---------------- */

    function medalTierIndex(medalId) {
      return MEDAL_TIERS.findIndex((t) => t.id === medalId);
    }

    // 이 과목에서 다음으로 도전할 수 있는(아직 못 딴) 등급을 돌려준다.
    // 이미 금메달까지 다 땄으면 null.
    function nextMedalTier(state, subjectKey) {
      const currentIdx = medalTierIndex(state.certifications[subjectKey]);
      return MEDAL_TIERS[currentIdx + 1] || null;
    }

    // 다음 등급 시험에 응시할 수 있으려면, 그 등급이 요구하는 레벨이 지금
    // 지능으로 이미 해금되어 있어야 한다(과학처럼 레벨 자체가 부족한 과목은
    // 애초에 해당 등급이 영원히 해금되지 않을 수 있다).
    function certExamEligible(state, subjectKey) {
      const tier = nextMedalTier(state, subjectKey);
      if (!tier) return false;
      const subject = Question.SUBJECTS[subjectKey];
      return subject.isLevelUnlocked(tier.requiredLevel, state.stats.intelligence);
    }

    // 과학처럼 그 과목 자체에 해당 레벨 콘텐츠가 아예 없는 경우(지능이
    // 아무리 높아도 영원히 해금될 수 없음)를 가려낸다. isLevelUnlocked를
    // 무한대 지능으로 호출해서 "언젠가는 해금 가능"인지 "애초에 그런 레벨이
    // 없음"인지 구분한다. UI가 "곧 도전 가능"과 "이 과목은 여기까지가
    // 한계"를 다른 문구로 보여줄 수 있게 해준다.
    function certTierContentExists(subjectKey, tier) {
      return Question.SUBJECTS[subjectKey].isLevelUnlocked(tier.requiredLevel, Infinity);
    }

    function startCertExamSession(state, subjectKey) {
      const tier = nextMedalTier(state, subjectKey);
      return makeSession('cert-exam', { subject: subjectKey, tier, count: tier.questionCount, askedQuestions: [] });
    }

    function finishCertExamOutcome(state, session) {
      const pass = session.correctCount >= session.tier.passCount;
      let goldEarned = 0;
      if (pass) {
        const bonus = Reward.certExamReward(medalTierIndex(session.tier.id));
        goldEarned = bonus.gold;
        applyDelta(state, bonus);
        // 이미 더 높은 등급을 갖고 있다면 낮은 등급으로 덮어쓰지 않는다
        // (재시험 삼아 낮은 등급을 다시 봐도 등급이 깎이지 않도록).
        if (medalTierIndex(state.certifications[session.subject]) < medalTierIndex(session.tier.id)) {
          state.certifications[session.subject] = session.tier.id;
        }
      }
      clampStats(state);
      return { pass, subject: session.subject, tier: session.tier, correctCount: session.correctCount, count: session.count, goldEarned };
    }

    /* ---------------- 스케줄/활동 게이트 ---------------- */

    function currentWeekActivity(state) {
      return state.weekPlan[state.weekIndex] || null;
    }

    // 사교모임(연회) 입장 시도: 옷차림/골드 조건을 확인하고, 통과하면 입장료를
    // 즉시 차감한다(state 변경). ok=false면 이유(reason)를 함께 돌려준다.
    function banquetTierRequirementMet(state, tier) {
      if (state.wardrobe.equipped < tier.minOutfitTier) return false;
      if (graceScore(state.stats) < tier.minGraceScore) return false;
      if (tier.requiredEnglishMedal && medalTierIndex(state.certifications.english) < medalTierIndex(tier.requiredEnglishMedal)) return false;
      return true;
    }

    function tryStartBanquet(state, tierId) {
      const tier = BANQUET_TIERS.find((t) => t.id === tierId);
      if (state.wardrobe.equipped < tier.minOutfitTier) {
        return { ok: false, reason: 'outfit', requiredTierName: OUTFIT_TIERS[tier.minOutfitTier].name };
      }
      if (graceScore(state.stats) < tier.minGraceScore) {
        return { ok: false, reason: 'grace', requiredGrace: tier.minGraceScore };
      }
      if (tier.requiredEnglishMedal && medalTierIndex(state.certifications.english) < medalTierIndex(tier.requiredEnglishMedal)) {
        const requiredMedal = MEDAL_TIERS.find((m) => m.id === tier.requiredEnglishMedal);
        return { ok: false, reason: 'english-cert', requiredMedal };
      }
      if (state.gold < tier.entryFee) {
        return { ok: false, reason: 'gold', fee: tier.entryFee };
      }
      state.gold -= tier.entryFee;
      return { ok: true };
    }

    function competitionUnlocked(state) {
      return state.stats.intelligence >= COMPETITION_MIN_INTELLIGENCE;
    }

    function creativityOlympiadUnlocked(state) {
      return state.stats.creativity >= CREATIVITY_MIN_CREATIVITY;
    }

    function talkToDaughter(state) {
      if (state.talkedThisTurn) return { alreadyTalked: true };
      state.talkedThisTurn = true;
      const line = randChoice(TALK_LINES);
      state.stats.charm += 1;
      state.stats.stress = Math.max(0, state.stats.stress - 1);
      clampStats(state);
      return { alreadyTalked: false, line };
    }

    /* ---------------- 이번 달 계획 미리보기 ---------------- */

    // 활동 하나를 한 주 동안 했을 때 예상되는 스탯/골드 변화를 어림잡는다
    // (정답률 ASSUMED_CORRECT_RATE 가정, 대략적인 예상치). 실제 보상 계산은
    // reward-engine.js가 담당하므로, 여기서 밸런스 수치를 바꿔도 이 미리보기가
    // 자동으로 맞아떨어지지는 않는다는 점에 유의(순수 예상치 근사이기 때문).
    function estimateActivityDelta(state, activityId, count, banquetTierId) {
      const d = { gold: 0, intelligence: 0, focus: 0, stamina: 0, charm: 0, creativity: 0, stress: 0, luck: 0 };
      const level = typicalStudyLevel(state);
      const rewardGold = 8 + level * 4;
      const r = ASSUMED_CORRECT_RATE;
      if (activityId === 'study') {
        const n = clampSessionLength(count != null ? count : QUESTIONS_PER_STUDY);
        const lm = sessionLengthMultiplier(n, QUESTIONS_PER_STUDY);
        d.gold += Math.round(n * r * rewardGold * EXPECTED_COMBO_MULTIPLIER * (1 + itemBonusSum(state, 'goldBonus')) * lm);
        d.intelligence += n * r * (level + itemBonusSum(state, 'intBonus'));
        d.creativity += n * r * level * 0.2;
        d.stress += n * (1 - r) * 6;
        d.stamina += -n * (1 - r) * 4 - n * r * 2;
      } else if (activityId === 'job') {
        const n = clampSessionLength(count != null ? count : QUESTIONS_PER_JOB);
        const lm = sessionLengthMultiplier(n, QUESTIONS_PER_JOB);
        const level1Reward = 8 + 1 * 4;
        d.gold += Math.round(n * r * level1Reward * EXPECTED_COMBO_MULTIPLIER * 1.5 * (1 + itemBonusSum(state, 'goldBonus')) * lm);
        d.stamina += -n * r * 2 - n * (1 - r) * 3;
      } else if (activityId === 'exercise') {
        d.stamina += 8 + 2 * r;
        d.focus += 4 + 3 * r;
        d.stress += 3;
      } else if (activityId === 'rest') {
        const rm = 1 + itemBonusSum(state, 'restBonus');
        d.stress += -12 * rm - 5 * r;
        d.stamina += 10 * rm + 3 * r;
      } else if (activityId === 'laundry') {
        d.stress += 5 - 3 * r;
        d.stamina += -3;
        d.gold += 10 + 5 * r;
      } else if (activityId === 'garden') {
        d.stamina += -4;
        d.gold += 25 + 15 * r;
        d.luck += 1 + r;
      } else if (activityId === 'friend') {
        d.charm += 3; // 실제로는 만나는 인물마다 다르며, 만날 때 정해진다
      } else if (activityId === 'banquet') {
        const tier = BANQUET_TIERS.find((t) => t.id === banquetTierId) || BANQUET_TIERS[0];
        d.gold += -tier.entryFee;
        d.charm += QUESTIONS_PER_BANQUET * r * (4 + itemBonusSum(state, 'charmBonus'));
        d.stress += QUESTIONS_PER_BANQUET * (1 - r) * 2;
      } else if (activityId === 'competition') {
        const n = clampSessionLength(count != null ? count : QUESTIONS_PER_COMPETITION);
        const lm = sessionLengthMultiplier(n, QUESTIONS_PER_COMPETITION);
        const levels = competitionLevelRamp(typicalStudyLevel(state), n);
        let expectedGold = 0;
        levels.forEach((lvl) => { expectedGold += r * (10 + lvl * 3) * lm; });
        const perfectChance = Math.pow(r, n);
        expectedGold += perfectChance * (20 + levels[levels.length - 1] * 4) * lm;
        d.gold += Math.round(expectedGold);
        d.intelligence += n * r * 1.5;
        d.stress += n * (1 - r) * 3;
      } else if (activityId === 'creativity') {
        const n = clampSessionLength(count != null ? count : QUESTIONS_PER_CREATIVITY);
        const lm = sessionLengthMultiplier(n, QUESTIONS_PER_CREATIVITY);
        const perfectChance = Math.pow(r, n);
        d.gold += Math.round(n * r * 12 * lm + perfectChance * 30 * lm);
        d.creativity += n * r * 2 + perfectChance * 3;
        d.stress += n * (1 - r) * 3;
      } else if (activityId === 'faith') {
        d.luck += QUESTIONS_PER_FAITH * r;
        d.stress += -QUESTIONS_PER_FAITH * r;
      }
      return d;
    }

    // 아직 지나지 않은 주들의 계획을 기준으로 이번 달 예상 총 변화를 계산한다.
    function estimateRemainingWeeksDelta(state) {
      const total = { gold: 0, intelligence: 0, focus: 0, stamina: 0, charm: 0, creativity: 0, stress: 0, luck: 0 };
      let planned = 0;
      for (let i = state.weekIndex; i < WEEKS_PER_MONTH; i++) {
        const activity = state.weekPlan[i];
        if (!activity) continue;
        planned++;
        const d = estimateActivityDelta(state, activity, state.weekPlanCount[i], state.weekPlanBanquetTier[i]);
        DELTA_STAT_KEYS.forEach((k) => { total[k] += d[k]; });
      }
      return { total, planned };
    }

    /* ---------------- 턴/주 진행 ---------------- */

    function applyAffectionDecay(state) {
      state.npcs.forEach((npcState) => {
        const turnsSinceMet = state.turn - npcState.lastMetTurn;
        if (turnsSinceMet > AFFECTION_DECAY_GRACE_TURNS) {
          npcState.affection = Math.max(0, npcState.affection - AFFECTION_DECAY_AMOUNT);
        }
      });
    }

    // 매턴 자동으로 적용되는 효과(고용인 + 직업 급여/우연한 만남). 왕자님과
    // 우연히 마주쳤으면 { princeEncounter: true }를 돌려줘 UI가 알려줄 수 있게 한다.
    function applyServantEffects(state) {
      if (state.items.maid) state.stats.stress = Math.max(0, state.stats.stress - 2);
      if (state.items.gardener) { state.gold += 10; state.stats.luck += 1; }

      let princeEncounter = false;
      if (state.career) {
        const career = CAREER_DEFS.find((c) => c.id === state.career);
        if (career) {
          state.gold += career.monthlyGold;
          const princeState = state.npcs.find((n) => n.id === 'prince');
          if (career.princeEncounterChance && princeState && graceScore(state.stats) >= 55 && Math.random() < career.princeEncounterChance) {
            princeState.affection = Math.min(100, princeState.affection + randInt(3, 6));
            princeState.lastMetTurn = state.turn;
            princeEncounter = true;
          }
        }
      }
      return { princeEncounter };
    }

    // 달(턴)을 실제로 넘긴다. { ended: true }면 TOTAL_TURNS를 넘긴 것이라
    // UI가 엔딩 화면을 보여줘야 한다.
    function advanceTurn(state, totalTurns) {
      state.turn++;
      state.weekPlan = new Array(WEEKS_PER_MONTH).fill(null);
      state.weekPlanCount = new Array(WEEKS_PER_MONTH).fill(null);
      state.weekPlanBanquetTier = new Array(WEEKS_PER_MONTH).fill(null);
      state.weekIndex = 0;
      state.talkedThisTurn = false;
      const { princeEncounter } = applyServantEffects(state);
      applyAffectionDecay(state);
      clampStats(state);
      return { ended: state.turn > totalTurns, princeEncounter };
    }

    // 한 주의 활동을 마쳤을 때 호출한다. 남은 주가 있으면 주만 넘기고
    // { monthAdvanced: false }, 이번 달의 마지막 주였다면 advanceTurn을
    // 호출해 실제로 달을 넘긴다({ monthAdvanced: true, ended, princeEncounter }).
    function advanceWeekOrTurn(state, totalTurns) {
      if (state.weekIndex < WEEKS_PER_MONTH - 1) {
        state.weekIndex++;
        return { monthAdvanced: false, ended: false, princeEncounter: false };
      }
      const { ended, princeEncounter } = advanceTurn(state, totalTurns);
      return { monthAdvanced: true, ended, princeEncounter };
    }

    /* ---------------- 엔딩 ---------------- */

    function computeEndingSummary(state) {
      const ending = E.computeEnding(state.stats, state.npcs, { gold: state.gold });
      const closestNpc = state.npcs.reduce((best, n) => (n.affection > best.affection ? n : best), state.npcs[0]);
      const closestNpcDef = closestNpc && closestNpc.affection >= 30 ? NPC_DEFS.find((n) => n.id === closestNpc.id) : null;
      const finalOutfit = currentOutfit(state.stats);
      return {
        ending,
        closestNpc: closestNpcDef ? { def: closestNpcDef, affection: closestNpc.affection } : null,
        finalOutfit,
      };
    }

    return {
      // 상수
      SUBJECTS: Question.SUBJECTS, SUBJECT_KEYS: Question.SUBJECT_KEYS,
      STAT_KEYS, STAT_LABELS, GROWTH_STAT_KEYS, STAT_TIER_THRESHOLDS, STAT_TIER_COLORS,
      WEEKS_PER_MONTH, QUESTIONS_PER_STUDY, QUESTIONS_PER_JOB, QUESTIONS_PER_BANQUET, BANQUET_PASS_COUNT,
      QUESTIONS_PER_COMPETITION, COMPETITION_MIN_INTELLIGENCE,
      QUESTIONS_PER_CREATIVITY, CREATIVITY_MIN_CREATIVITY, QUESTIONS_PER_FAITH,
      SESSION_LENGTH_MIN, SESSION_LENGTH_MAX, sessionLengthMultiplier,
      SAVE_KEY, EVENTS, ETIQUETTE_QUESTIONS: Question.ETIQUETTE_QUESTIONS, TALK_LINES, ITEMS,
      CREATIVITY_PUZZLE_BANK: Question.CREATIVITY_PUZZLE_BANK, FAITH_QUESTIONS: Question.FAITH_QUESTIONS,
      BANQUET_TIERS, PRINCE_MIN_TIER,
      STRESS_OVERFLOW_THRESHOLD, NPC_HINT_AFFECTION, NPC_LENIENT_AFFECTION, CAREER_DEFS,
      MEDAL_TIERS, CERT_SUBJECT_KEYS,
      AFFECTION_TIERS, AFFECTION_DECAY_GRACE_TURNS, AFFECTION_DECAY_AMOUNT, OUTFIT_TIERS, NPC_DEFS, ACTIVITY_DEFS,
      MULTI_SUBJECT_TYPES: Question.MULTI_SUBJECT_TYPES, BONUS_QUIZ_TYPES: Reward.DEFERRED_REWARD_TYPES,
      ASSUMED_CORRECT_RATE, EXPECTED_COMBO_MULTIPLIER, DELTA_STAT_KEYS, DELTA_STAT_LABELS,
      // 기본 헬퍼
      randInt, randChoice, shuffle, statTierIndex, snapshotGrowthTiers, leveledUpStats,
      graceScore, affectionTierName, currentOutfit, comboMultiplier: Reward.comboMultiplier, itemBonusSum, clampStats,
      noblePromotionEligible, grantNobleTitle, NOBLE_PROMOTION_TIER,
      // 상태 생성/이관
      makeInitialState, migrateLoadedState,
      // 과목/문제(질문 엔진에 위임)
      unlockedLevelsFor, pickRandomSubjectAndLevel, pickRandomSubjectLevel1, subjectName,
      generateEtiquetteQuestion, generateScenarioQuestion, generateNextProblem,
      // 세션
      startStudySession, startJobSession, startBanquetSession, startExerciseSession, startRestSession,
      startLaundrySession, startGardenSession, startScenarioQuizSession, startCompetitionSession,
      startCreativitySession, startFaithSession,
      applyCorrect, applyWrong,
      finishStudyOrJobOutcome, finishBanquetOutcome, finishExerciseBonusOutcome, finishRestBonusOutcome,
      finishLaundryBonusOutcome, finishGardenBonusOutcome, finishCompetitionOutcome, rollRandomEvent, checkStressOverflow,
      finishCreativityOutcome, finishFaithOutcome,
      // 인물/시나리오
      scenarioUnlocked, findActiveScenario, applyStatNpcEffects, meetNpcAttempt,
      resolveScenarioOutcome, resolveBranchingOption, resolveNarrativeScenario, finishScenarioQuizOutcome,
      // 상점/옷장
      buyItem, equipOutfit, buyOutfit, checkWardrobeGraceNotification, outfitRequirementMet,
      // 직업
      careerRequirementMet, unlockedCareers, applyForCareer, resignCareer,
      // 기초 과목 등급 인증
      nextMedalTier, certExamEligible, certTierContentExists, startCertExamSession, finishCertExamOutcome,
      // 스케줄/활동
      currentWeekActivity, tryStartBanquet, banquetTierRequirementMet, competitionUnlocked, talkToDaughter,
      creativityOlympiadUnlocked,
      // 계획 미리보기
      typicalStudyLevel, estimateActivityDelta, estimateRemainingWeeksDelta,
      // 턴 진행
      applyAffectionDecay, applyServantEffects, advanceTurn, advanceWeekOrTurn,
      // 엔딩
      computeEndingSummary,
    };
  }

  const api = { createEngine };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessEngine = api;
  }
})(typeof window !== 'undefined' ? window : null);
