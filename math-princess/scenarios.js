/*
 * 시나리오 계층(scenario layer) 자료구조 (순수 로직, DOM 의존 없음)
 *
 * 지금까지 게임 안의 이야기 콘텐츠(연회 퀴즈, 랜덤 이벤트, NPC와의 대사)는
 * script.js 여기저기에 흩어진 배열(EVENTS, NPC_DEFS.lines, ETIQUETTE_QUESTIONS)로
 * 따로따로 정의되어 있었다. 앞으로 콘텐츠를 더 풍부하게 늘려갈 때 같은 모양의
 * "시나리오" 한 편씩을 이 파일의 SCENARIOS 배열에 추가하기만 하면 되도록
 * 표준 형태(스키마)를 하나로 통일한 것이 이 파일이다.
 *
 * 아직 게임 로직(script.js)에 실제로 연결되어 있지는 않다. 다른 AI가 이
 * 스키마에 맞춰 시나리오 초안을 채워 넣으면, 그 다음 단계로 script.js에서
 * 이 SCENARIOS 배열을 읽어 스케줄 메뉴/랜덤 이벤트/NPC 이야기에 반영하면 된다.
 */
(function (root) {
  'use strict';

  // 게임에 이미 존재하는 값들과 반드시 일치해야 하는 상수 (다른 AI가 새 값을
  // 마음대로 지어내지 않도록 검증에 사용한다)
  const VALID_STAT_KEYS = ['intelligence', 'focus', 'stamina', 'charm', 'creativity', 'stress', 'luck'];
  const VALID_NPC_IDS = ['friend', 'rival', 'teacher', 'noble', 'prince', 'sage'];
  const VALID_TIERS = [0, 1, 2, 3, 4, 5]; // 품위(OUTFIT_TIERS) 단계: 0=평범한 옷 ~ 5=대관식 드레스(만점)
  const VALID_TYPES = ['quiz', 'narrative', 'branching'];
  // ready: 실제 콘텐츠(문제/대사/결과)까지 다 채워져 게임에 반영할 준비가 된 시나리오
  // coming-soon: 제목/테마/등장인물 정도만 정해진 예고편. 상태 화면에 "준비중" 잠금 카드로만 보여준다
  const VALID_STATUSES = ['ready', 'coming-soon'];

  /*
   * 시나리오 한 편의 표준 형태 (JSDoc 대신 예시 겸 설명):
   *
   * {
   *   id: 'kebab-case-id',        // 고유 id
   *   arc: '사교 예절',            // 테마 묶음 이름 (같은 arc끼리는 연작처럼 이어질 수 있음)
   *   tier: 0,                    // 0~5, 품위 단계(OUTFIT_TIERS)에 맞춰 언제 등장할지 (낮을수록 초반)
   *   type: 'quiz' | 'narrative' | 'branching',
   *   npcId: 'prince' | null,     // 관련 NPC (없으면 null)
   *   title: '연회 참석',          // 화면에 보일 제목
   *   entryEmoji: '💃',           // 이모지 폴백(이미지 로드 실패 시 대체용)
   *   status: 'ready' | 'coming-soon', // ready만 실제로 플레이 가능한 콘텐츠까지 채운다.
   *                                    // coming-soon은 id/arc/tier/type/npcId/title/entryEmoji/unlock까지만
   *                                    // 채우고 나머지(quiz/narrative/branching/outcomes/assets)는 생략해도 된다.
   *                                    // 상태 화면에 "준비중" 잠금 카드로만 보여주는 예고편 용도.
   *   unlock: {                   // 등장 조건. 전부 선택적 필드이며, 비어 있으면 항상 등장
   *     minGrace: 0,                          // 품위 점수(charm*0.4+creativity*0.3+intelligence*0.3) 최소값
   *     minStat: { key: 'intelligence', value: 50 },
   *     minAffection: { npcId: 'prince', value: 30 },
   *   },
   *   quiz: {                     // type === 'quiz'일 때만 채운다
   *     questionsPerSession: 3,
   *     passCount: 2,             // 이 개수 이상 맞히면 outcomes.success, 아니면 outcomes.fail
   *     bank: [
   *       { question: '...', choices: ['...', '...', '...', '...'], answer: '...', explanation: '...' },
   *     ],
   *   },
   *   narrative: {                // type === 'narrative'일 때만 채운다 (1회성 짧은 이벤트/대사)
   *     lines: ['오늘 있었던 일 대사 1', '대사 2', '대사 3'],
   *   },
   *   branching: {                // type === 'branching'일 때만 채운다 (선택지가 있는 대화)
   *     prompt: '왕자님이 춤을 청했다. 어떻게 할까?',
   *     options: [
   *       { label: '기쁘게 응한다', statEffects: { charm: 3 }, npcEffects: { prince: 6 }, resultLine: '...' },
   *       { label: '수줍게 사양한다', statEffects: { charm: 1 }, npcEffects: { prince: 2 }, resultLine: '...' },
   *     ],
   *   },
   *   outcomes: {                 // quiz는 success/fail 둘 다, narrative/branching은 success만 사용
   *     success: {
   *       statEffects: { charm: 4 },        // STAT_KEYS 중 일부만 넣으면 됨(더할 값, 음수 가능)
   *       npcEffects: { prince: [10, 16] }, // [최소,최대] 범위로 호감도 증가(랜덤)
   *       narrative: { emoji: '🤴', title: '연회에서 왕자님을 만나다', desc: '...' },
   *       unlockNpc: 'prince',              // 이 시나리오 성공으로 그 인물을 만날 자격이 새로 열릴 때만
   *     },
   *     fail: {
   *       statEffects: { stress: 2 },
   *       narrative: { emoji: '💃', title: '연회를 마쳤어요', desc: '...' },
   *     },
   *   },
   *   assets: {
   *     images: [
   *       {
   *         key: 'hero',                                   // 용도 구분 키(하나의 시나리오에 여러 장 가능)
   *         path: 'assets/scenarios/banquet-etiquette/hero.png', // 실제로 저장될 경로(권장 규칙: assets/scenarios/<id>/<key>.png)
   *         purpose: '연회 이벤트 성공 화면 배경',              // 어디에, 왜 쓰이는지
   *         generationPrompt: '...',                        // 이 이미지를 실제로 생성할 때 그대로 쓸 완성된 프롬프트
   *       },
   *     ],
   *   },
   * }
   */

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function validateScenario(s) {
    const errors = [];
    const req = (cond, msg) => { if (!cond) errors.push(msg); };

    req(typeof s === 'object' && s !== null, '시나리오는 객체여야 합니다.');
    if (typeof s !== 'object' || s === null) return { ok: false, errors };

    req(typeof s.id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id), 'id는 kebab-case 문자열이어야 합니다.');
    req(typeof s.arc === 'string' && s.arc.length > 0, 'arc(테마 묶음 이름)가 필요합니다.');
    req(VALID_TIERS.includes(s.tier), `tier는 ${VALID_TIERS.join('/')} 중 하나여야 합니다.`);
    req(VALID_TYPES.includes(s.type), `type은 ${VALID_TYPES.join('/')} 중 하나여야 합니다.`);
    req(s.npcId === null || VALID_NPC_IDS.includes(s.npcId), `npcId는 null이거나 ${VALID_NPC_IDS.join('/')} 중 하나여야 합니다.`);
    req(typeof s.title === 'string' && s.title.length > 0, 'title이 필요합니다.');
    req(typeof s.entryEmoji === 'string' && s.entryEmoji.length > 0, 'entryEmoji가 필요합니다.');
    req(VALID_STATUSES.includes(s.status), `status는 ${VALID_STATUSES.join('/')} 중 하나여야 합니다.`);
    req(isPlainObject(s.unlock), 'unlock 객체가 필요합니다(빈 객체 {} 가능).');

    // coming-soon은 예고편이라 위 기본 정보만 맞으면 되고, 실제 콘텐츠 필드는 검증하지 않는다.
    if (s.status === 'coming-soon') {
      return { ok: errors.length === 0, errors };
    }

    if (s.type === 'quiz') {
      req(isPlainObject(s.quiz), 'type이 quiz면 quiz 필드가 필요합니다.');
      if (isPlainObject(s.quiz)) {
        req(Number.isInteger(s.quiz.questionsPerSession) && s.quiz.questionsPerSession > 0, 'quiz.questionsPerSession은 양의 정수여야 합니다.');
        req(Number.isInteger(s.quiz.passCount) && s.quiz.passCount > 0 && s.quiz.passCount <= s.quiz.questionsPerSession, 'quiz.passCount는 1 이상 questionsPerSession 이하여야 합니다.');
        req(Array.isArray(s.quiz.bank) && s.quiz.bank.length >= s.quiz.questionsPerSession, 'quiz.bank는 최소 questionsPerSession개 이상의 문제를 담아야 합니다.');
        (s.quiz.bank || []).forEach((q, i) => {
          req(typeof q.question === 'string' && q.question.length > 0, `quiz.bank[${i}].question이 필요합니다.`);
          req(Array.isArray(q.choices) && q.choices.length === 4, `quiz.bank[${i}].choices는 4개여야 합니다.`);
          req(typeof q.answer === 'string' && (q.choices || []).includes(q.answer), `quiz.bank[${i}].answer는 choices 중 하나여야 합니다.`);
          req(typeof q.explanation === 'string' && q.explanation.length > 0, `quiz.bank[${i}].explanation이 필요합니다.`);
        });
      }
    } else if (s.type === 'narrative') {
      req(isPlainObject(s.narrative) && Array.isArray(s.narrative.lines) && s.narrative.lines.length > 0, 'type이 narrative면 narrative.lines(문자열 배열)가 필요합니다.');
    } else if (s.type === 'branching') {
      req(isPlainObject(s.branching), 'type이 branching이면 branching 필드가 필요합니다.');
      if (isPlainObject(s.branching)) {
        req(typeof s.branching.prompt === 'string' && s.branching.prompt.length > 0, 'branching.prompt가 필요합니다.');
        req(Array.isArray(s.branching.options) && s.branching.options.length >= 2, 'branching.options는 2개 이상이어야 합니다.');
        (s.branching.options || []).forEach((o, i) => {
          req(typeof o.label === 'string' && o.label.length > 0, `branching.options[${i}].label이 필요합니다.`);
          req(typeof o.resultLine === 'string' && o.resultLine.length > 0, `branching.options[${i}].resultLine이 필요합니다.`);
        });
      }
    }

    req(isPlainObject(s.outcomes) && isPlainObject(s.outcomes.success), 'outcomes.success가 필요합니다.');
    if (isPlainObject(s.outcomes) && isPlainObject(s.outcomes.success)) {
      const succ = s.outcomes.success;
      req(isPlainObject(succ.narrative) && succ.narrative.title && succ.narrative.desc, 'outcomes.success.narrative(emoji/title/desc)가 필요합니다.');
      if (succ.statEffects) {
        Object.keys(succ.statEffects).forEach((k) => req(VALID_STAT_KEYS.includes(k), `outcomes.success.statEffects의 "${k}"는 알 수 없는 능력치입니다.`));
      }
      if (succ.npcEffects) {
        Object.keys(succ.npcEffects).forEach((k) => req(VALID_NPC_IDS.includes(k), `outcomes.success.npcEffects의 "${k}"는 알 수 없는 인물입니다.`));
      }
      if (succ.unlockNpc) req(VALID_NPC_IDS.includes(succ.unlockNpc), 'outcomes.success.unlockNpc는 알 수 없는 인물입니다.');
    }
    if (s.type === 'quiz') {
      req(isPlainObject(s.outcomes) && isPlainObject(s.outcomes.fail), 'type이 quiz면 outcomes.fail도 필요합니다.');
    }

    req(isPlainObject(s.assets) && Array.isArray(s.assets.images), 'assets.images(배열)가 필요합니다(이미지가 없으면 빈 배열).');
    (s.assets && s.assets.images ? s.assets.images : []).forEach((img, i) => {
      req(typeof img.key === 'string' && img.key.length > 0, `assets.images[${i}].key가 필요합니다.`);
      req(typeof img.path === 'string' && img.path.startsWith('assets/'), `assets.images[${i}].path는 assets/ 아래 경로여야 합니다(새 이미지는 assets/scenarios/<id>/<key>.png 권장).`);
      req(typeof img.purpose === 'string' && img.purpose.length > 0, `assets.images[${i}].purpose가 필요합니다.`);
      req(typeof img.generationPrompt === 'string' && img.generationPrompt.length > 20, `assets.images[${i}].generationPrompt는 실제로 쓸 수 있을 만큼 구체적이어야 합니다.`);
    });

    return { ok: errors.length === 0, errors };
  }

  // 기존 "연회 참석 → 왕자님 만나기" 시나리오를 이 스키마로 옮겨 담은 예시.
  // 다른 AI가 새 시나리오를 채울 때 이 항목의 형태를 그대로 참고하면 된다.
  const SCENARIOS = [
    {
      id: 'banquet-etiquette',
      arc: '사교 예절',
      tier: 0,
      type: 'quiz',
      npcId: 'prince',
      title: '연회 참석',
      entryEmoji: '💃',
      status: 'ready',
      unlock: {},
      quiz: {
        questionsPerSession: 3,
        passCount: 2,
        bank: [
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
        ],
      },
      outcomes: {
        success: {
          statEffects: { charm: 4 },
          npcEffects: { prince: [10, 16] },
          narrative: { emoji: '🤴', title: '연회에서 왕자님을 만나다', desc: '예절을 뽐내 왕자님이 다가와 말을 걸어주었어요.' },
          unlockNpc: 'prince',
        },
        fail: {
          statEffects: { stress: 2 },
          narrative: { emoji: '💃', title: '연회를 마쳤어요', desc: '예절을 조금 더 익히면 왕자님을 만날 수 있을 거예요!' },
        },
      },
      assets: {
        images: [
          {
            key: 'prince-portrait',
            path: 'assets/npcs/prince.png',
            purpose: '왕자님 이벤트 장면에 쓰이는 초상화',
            generationPrompt: 'Children\'s storybook illustration, Princess Maker style, a kind young prince in formal royal attire, warm smile, soft painterly lighting, pastel palette, upper body portrait, no text.',
          },
        ],
      },
    },

    // 아래는 아직 내용이 채워지지 않은 "준비중" 시나리오 예고편이다. 상태 화면에
    // 잠금 카드로만 노출되고 실제로 플레이되지는 않는다. 다른 AI가 이 목록의
    // id를 그대로 이어받아 quiz/narrative/branching/outcomes/assets를 채우고
    // status를 'ready'로 바꾸면 그대로 게임에 반영할 수 있다.
    {
      id: 'rival-study-duel',
      arc: '라이벌',
      tier: 0,
      type: 'quiz',
      npcId: 'rival',
      title: '라이벌과의 특별 대결',
      entryEmoji: '⚔️',
      status: 'coming-soon',
      unlock: {},
    },
    {
      id: 'friend-birthday',
      arc: '우정',
      tier: 1,
      type: 'narrative',
      npcId: 'friend',
      title: '친구의 생일 파티',
      entryEmoji: '🎂',
      status: 'coming-soon',
      unlock: { minAffection: { npcId: 'friend', value: 40 } },
    },
    {
      id: 'tea-party-manners',
      arc: '사교 예절',
      tier: 1,
      type: 'quiz',
      npcId: 'noble',
      title: '다과회 초대',
      entryEmoji: '🍵',
      status: 'coming-soon',
      unlock: { minGrace: 35 },
    },
    {
      id: 'library-secret',
      arc: '왕실 생활',
      tier: 2,
      type: 'branching',
      npcId: 'sage',
      title: '왕실 서고의 비밀',
      entryEmoji: '📚',
      status: 'coming-soon',
      unlock: { minStat: { key: 'intelligence', value: 60 } },
    },
    {
      id: 'garden-walk-prince',
      arc: '왕실 생활',
      tier: 3,
      type: 'branching',
      npcId: 'prince',
      title: '정원 산책 초대',
      entryEmoji: '🌹',
      status: 'coming-soon',
      unlock: { minAffection: { npcId: 'prince', value: 50 } },
    },
    {
      id: 'coronation-ball',
      arc: '왕실 생활',
      tier: 5,
      type: 'narrative',
      npcId: 'prince',
      title: '대관식 무도회',
      entryEmoji: '👑',
      status: 'coming-soon',
      unlock: { minGrace: 100 },
    },
  ];

  const api = { VALID_STAT_KEYS, VALID_NPC_IDS, VALID_TIERS, VALID_TYPES, validateScenario, SCENARIOS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessScenarios = api;
  }
})(typeof window !== 'undefined' ? window : null);
