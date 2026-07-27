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
      // 이미 스케줄 메뉴의 "연회 참석" 활동으로 별도 구현되어 있는 항목이라,
      // "친구 만나기"의 범용 시나리오 엔진(findActiveScenario)이 이 항목을
      // 중복으로 실행하지 않도록 표시만 해둔다. 실제 게임 로직은
      // script.js의 startBanquetSession()/ETIQUETTE_QUESTIONS를 그대로 쓴다.
      bespoke: true,
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

    // 다른 AI가 이전 프롬프트 형식에 맞춰 채워온 시나리오 7편. 원본에서는
    // quiz.bank[].answer가 choices 배열의 인덱스(숫자)였는데, 이 게임의 정답
    // 판정 로직(P.checkAnswer)은 choices 중 하나와 정확히 같은 문자열을
    // 기대하므로 인덱스를 실제 정답 문자열로 변환해서 담았다.
    {
      id: 'first-royal-etiquette',
      arc: '사교 예절',
      tier: 0,
      type: 'quiz',
      npcId: 'teacher',
      title: '왕실 예절의 첫걸음',
      entryEmoji: '👑',
      status: 'ready',
      unlock: {},
      quiz: {
        questionsPerSession: 3,
        passCount: 2,
        bank: [
          {
            question: '왕실 연회에서 높은 분을 만났을 때 올바른 인사법은 무엇일까요?',
            choices: ['손을 크게 흔들며 인사한다', '허리를 살짝 숙이고 드레스 자락을 잡아 커트시를 한다', '고개를 돌리고 모른 척한다', '큰 소리로 이름을 부른다'],
            answer: '허리를 살짝 숙이고 드레스 자락을 잡아 커트시를 한다',
            explanation: '공주님다운 품위 있는 인사는 드레스 자락을 살짝 잡고 무릎을 굽히는 커트시랍니다.',
          },
          {
            question: '식사 중 음식을 씹을 때 지켜야 할 예절은 무엇일까요?',
            choices: ['입을 다물고 소리가 나지 않게 씹는다', '입을 벌리고 소리를 내며 씹는다', '음식을 입에 물고 계속 말한다', '음식을 숟가락으로 두드리며 먹는다'],
            answer: '입을 다물고 소리가 나지 않게 씹는다',
            explanation: '음식은 입을 다물고 조용히 씹는 것이 고운 식사 예절이에요.',
          },
          {
            question: '차를 마실 때 티컵을 바르게 잡는 방법은 무엇일까요?',
            choices: ['손잡이에 손가락을 다 넣고 꽉 쥔다', '손잡이를 손가락 끝으로 가볍게 집는다', '양손으로 컵 전체를 감싸 쥔다', '티스푼을 컵에 넣은 채로 마신다'],
            answer: '손잡이를 손가락 끝으로 가볍게 집는다',
            explanation: '찻잔 손잡이는 손가락 끝으로 살포시 집어 올려 마시는 것이 우아합니다.',
          },
        ],
      },
      outcomes: {
        success: {
          statEffects: { intelligence: 5, focus: 5, stress: -2 },
          npcEffects: { teacher: [5, 10] },
          narrative: { emoji: '👏', title: '훌륭한 예절 수업!', desc: '선생님께서 미소를 지으며 고개를 끄덕이셨습니다. 기본 예절을 멋지게 익혔네요!' },
        },
        fail: {
          statEffects: { stress: 5 },
          narrative: { emoji: '😅', title: '조금 더 연습해봐요', desc: '선생님께서 차근차근 다시 설명해주셨습니다. 다음엔 더 잘할 수 있을 거예요.' },
        },
      },
      assets: {
        images: [
          {
            key: 'bg-classroom',
            path: 'assets/scenarios/first-royal-etiquette/bg-classroom.png',
            purpose: '예절 수업 배경',
            generationPrompt: 'Children’s storybook illustration, Princess Maker style, warm painterly lighting, soft pastel palette, gentle and wholesome, no text in image, a cozy royal etiquette classroom with elegant wooden desks and sunlight streaming through arched windows.',
          },
        ],
      },
    },
    {
      id: 'lost-kitten-in-garden',
      arc: '우정',
      tier: 0,
      type: 'branching',
      npcId: 'friend',
      title: '정원의 길 잃은 아기 고양이',
      entryEmoji: '🐱',
      status: 'ready',
      unlock: {},
      branching: {
        prompt: '정원을 산책하던 중 나무 위에서 울고 있는 아기 고양이를 발견했습니다. 친구가 걱정스러운 눈빛으로 바라보고 있네요.',
        options: [
          {
            label: '나무에 직접 올라가 아기 고양이를 구해준다',
            statEffects: { stamina: 8, stress: 3, charm: 2 },
            npcEffects: { friend: [5, 8] },
            resultLine: '조심스럽게 나무를 타올라 아기 고양이를 품에 안고 내려왔습니다! 옷은 조금 더러워졌지만 마음은 따뜻해졌어요.',
          },
          {
            label: '친구와 함께 따뜻한 우유를 가져와 유인한다',
            statEffects: { creativity: 5, focus: 5 },
            npcEffects: { friend: [10, 15] },
            resultLine: '친구와 아이디어를 모아 우유 그릇을 놓아주자 아기 고양이가 스스로 살금살금 내려왔습니다. 기발한 협동이었어요!',
          },
        ],
      },
      outcomes: {
        success: {
          statEffects: { charm: 5, luck: 3 },
          npcEffects: { friend: [5, 10] },
          narrative: { emoji: '✨', title: '새로운 작은 친구', desc: '고양이는 무사히 엄마 품으로 돌아갔습니다. 친구와의 우정도 한층 더 깊어졌어요.' },
        },
      },
      assets: {
        images: [
          {
            key: 'garden-kitten',
            path: 'assets/scenarios/lost-kitten-in-garden/garden-kitten.png',
            purpose: '정원 이벤트 장면',
            generationPrompt: 'Children’s storybook illustration, Princess Maker style, warm painterly lighting, soft pastel palette, gentle and wholesome, no text in image, a young girl and her friend looking up at a cute little kitten perched on a blooming garden tree branch.',
          },
        ],
      },
    },
    {
      id: 'baking-cookies-with-rival',
      arc: '사교 예절',
      tier: 1,
      type: 'branching',
      npcId: 'rival',
      title: '쿠키 만들기 대결',
      entryEmoji: '🍪',
      status: 'ready',
      unlock: { minGrace: 20 },
      branching: {
        prompt: '왕실 요리 교실에서 라이벌과 쿠키 만들기 대결을 하게 되었습니다. 라이벌이 자신만만한 표정으로 차례를 기다리고 있네요.',
        options: [
          {
            label: '정통 왕실 레시피대로 신중하게 반죽을 만든다',
            statEffects: { focus: 10, intelligence: 5 },
            npcEffects: { rival: [2, 5] },
            resultLine: '완벽한 비율로 만들어진 정갈하고 맛있는 왕실 쿠키가 완성되었습니다!',
          },
          {
            label: '예쁜 꽃 모양 장식을 추가해 창의적으로 쿠키를 꾸민다',
            statEffects: { creativity: 12, charm: 5 },
            npcEffects: { rival: [5, 10] },
            resultLine: '알록달록 예쁜 모양의 쿠키가 완성되었습니다. 라이벌도 내심 감탄한 표정이에요!',
          },
        ],
      },
      outcomes: {
        success: {
          statEffects: { charm: 5, stress: -5 },
          npcEffects: { rival: [5, 10] },
          narrative: { emoji: '🧁', title: '훈훈한 디저트 시간', desc: '서로 만든 쿠키를 나누어 먹으며 즐거운 시간을 보냈습니다. 라이벌과 조금 더 가까워진 것 같아요.' },
        },
      },
      assets: {
        images: [
          {
            key: 'baking-scene',
            path: 'assets/scenarios/baking-cookies-with-rival/baking-scene.png',
            purpose: '쿠키 만들기 장면',
            generationPrompt: 'Children’s storybook illustration, Princess Maker style, warm painterly lighting, soft pastel palette, gentle and wholesome, no text in image, two young girls in cute aprons baking colorful flower-shaped cookies in a warm royal kitchen.',
          },
        ],
      },
    },
    {
      id: 'noble-tea-party-invitation',
      arc: '사교 예절',
      tier: 1,
      type: 'narrative',
      npcId: 'noble',
      title: '사교계의 초대장',
      entryEmoji: '💌',
      status: 'ready',
      unlock: { minGrace: 35 },
      narrative: {
        lines: [
          '정원에 향기로운 장미가 가득 피어난 날, 우아한 사교계 친구로부터 다과회 초대장이 도착했습니다.',
          '분홍색 리본으로 묶인 향수 냄새 나는 편지지에는 따뜻한 안부 인사가 적혀 있네요.',
          '친구들과 다과를 나누며 즐거운 사교 예절을 익히는 귀한 시간이 되었습니다.',
        ],
      },
      outcomes: {
        success: {
          statEffects: { charm: 8, intelligence: 4, stress: -8 },
          npcEffects: { noble: [10, 15] },
          narrative: { emoji: '☕', title: '즐거운 다과회', desc: '아름다운 정원에서 향긋한 차를 마시며 품격 있는 대화를 나누었습니다.' },
        },
      },
      assets: {
        images: [
          {
            key: 'tea-party',
            path: 'assets/scenarios/noble-tea-party-invitation/tea-party.png',
            purpose: '다과회 전경',
            generationPrompt: 'Children’s storybook illustration, Princess Maker style, warm painterly lighting, soft pastel palette, gentle and wholesome, no text in image, an elegant tea party in a rose garden with dainty teacups, cake stands, and young noble girls chatting happily.',
          },
        ],
      },
    },
    {
      id: 'prince-and-stray-dog',
      arc: '우정',
      tier: 2,
      type: 'branching',
      npcId: 'prince',
      title: '왕자님과의 산책길',
      entryEmoji: '🐕',
      status: 'ready',
      unlock: { minGrace: 60, minAffection: { npcId: 'prince', value: 20 } },
      branching: {
        prompt: '왕성 호숫가를 산책하던 중 왕자님과 마주쳤습니다. 왕자님이 다리에 상처를 입은 강아지를 보살피고 계시네요.',
        options: [
          {
            label: '손수건을 꺼내 강아지의 상처를 정성껏 감싸준다',
            statEffects: { charm: 10, focus: 5, stress: -3 },
            npcEffects: { prince: [12, 18] },
            resultLine: '상처를 꼼꼼하게 치료해주자 왕자님이 감탄하며 고마운 미소를 보냈습니다.',
          },
          {
            label: '왕자님에게 다정한 말로 위로와 용기를 북돋아 준다',
            statEffects: { charm: 8, intelligence: 6 },
            npcEffects: { prince: [10, 15] },
            resultLine: '따뜻한 한마디에 왕자님의 마음이 한결 가벼워진 듯 환하게 웃었습니다.',
          },
        ],
      },
      outcomes: {
        success: {
          statEffects: { charm: 5, luck: 5 },
          npcEffects: { prince: [8, 12] },
          narrative: { emoji: '💖', title: '따뜻했던 호숫가 산책', desc: '강아지는 안전하게 보호소로 보내졌고, 왕자님과 더 깊은 신뢰를 쌓게 되었습니다.' },
        },
      },
      assets: {
        images: [
          {
            key: 'lakeside-stroll',
            path: 'assets/scenarios/prince-and-stray-dog/lakeside-stroll.png',
            purpose: '호숫가에서의 치료 장면',
            generationPrompt: 'Children’s storybook illustration, Princess Maker style, warm painterly lighting, soft pastel palette, gentle and wholesome, no text in image, a young girl and a young prince caring for a small puppy by a serene lakeside filled with blooming flowers.',
          },
        ],
      },
    },
    {
      id: 'royal-history-quiz',
      arc: '왕실 생활',
      tier: 2,
      type: 'quiz',
      npcId: 'sage',
      title: '왕실 스승님의 지혜 시험',
      entryEmoji: '📜',
      status: 'ready',
      unlock: { minGrace: 70, minStat: { key: 'intelligence', value: 50 } },
      quiz: {
        questionsPerSession: 3,
        passCount: 2,
        bank: [
          {
            question: '왕국을 평화롭게 다스리기 위해 가장 중요한 마음가짐은 무엇일까요?',
            choices: ['백성을 사랑하는 따뜻한 마음과 공정함', '무조건 강한 힘으로 명령하기', '혼자만 좋은 음식을 먹기', '어려운 일은 모두 모른 척하기'],
            answer: '백성을 사랑하는 따뜻한 마음과 공정함',
            explanation: '진정한 공주는 백성들의 마음을 헤아리고 늘 공정하게 판단해야 한답니다.',
          },
          {
            question: '다른 나라의 사신이 방문했을 때 보여주어야 할 올바른 태도는 무엇일까요?',
            choices: ['화려한 옷만 자랑한다', '자국의 문화와 예의를 정중하게 갖추어 환영한다', '질문을 해도 대답하지 않는다', '사신의 말을 비웃는다'],
            answer: '자국의 문화와 예의를 정중하게 갖추어 환영한다',
            explanation: '타국의 손님을 정성껏 대접하고 존중하는 것이 왕실의 품격입니다.',
          },
          {
            question: '어려움에 처한 백성을 보았을 때 올바른 행동은 무엇일까요?',
            choices: ['도울 수 있는 방법을 찾아 적극적으로 지원한다', '나와 관계없으니 지나친다', '혼을 내서 쫓아낸다', '나중에 생각하겠다고 잊어버린다'],
            answer: '도울 수 있는 방법을 찾아 적극적으로 지원한다',
            explanation: '곤경에 처한 이를 외면하지 않고 돕는 용기가 참된 공주의 자질입니다.',
          },
        ],
      },
      outcomes: {
        success: {
          statEffects: { intelligence: 15, focus: 10, stress: -5 },
          npcEffects: { sage: [15, 20] },
          narrative: { emoji: '🦉', title: '스승님의 칭찬', desc: '왕실 스승님께서 흡족한 미소를 지으며 깊은 지혜를 갖추었다고 인정해주셨습니다.' },
        },
        fail: {
          statEffects: { stress: 8 },
          narrative: { emoji: '📚', title: '배움의 길은 끝이 없는 법', desc: '스승님께서 도서관에서 더 많은 책을 읽어보라고 따뜻하게 권유하셨습니다.' },
        },
      },
      assets: {
        images: [
          {
            key: 'royal-library',
            path: 'assets/scenarios/royal-history-quiz/royal-library.png',
            purpose: '왕실 서재 공부 장면',
            generationPrompt: 'Children’s storybook illustration, Princess Maker style, warm painterly lighting, soft pastel palette, gentle and wholesome, no text in image, a grand royal library filled with ancient books, an old wise scholar mentor guiding a young girl wearing a cute dress.',
          },
        ],
      },
    },
    {
      id: 'grand-ball-debut',
      arc: '왕실 생활',
      tier: 3,
      type: 'branching',
      npcId: 'prince',
      title: '왕실 무도회의 주인공',
      entryEmoji: '💃',
      status: 'ready',
      unlock: { minGrace: 100, minStat: { key: 'charm', value: 80 } },
      branching: {
        prompt: '화려한 왕실 대무도회가 열렸습니다. 눈부신 드레스를 입은 당신에게 왕자님이 손을 내밀며 댄스를 청합니다.',
        options: [
          {
            label: '우아하고 완벽한 발걸음으로 궁정 왈츠를 춘다',
            statEffects: { charm: 15, focus: 10, stress: 5 },
            npcEffects: { prince: [15, 25] },
            resultLine: '음악에 맞춰 완벽한 무대를 선보이자 연회장의 모든 사람이 박수갈채를 보냈습니다!',
          },
          {
            label: '기분 좋은 미소와 함께 자연스럽고 즐겁게 춤을 춘다',
            statEffects: { charm: 12, creativity: 10, stress: -10 },
            npcEffects: { prince: [20, 25] },
            resultLine: '당신의 밝고 진심 어린 미소가 연회장 전체를 따뜻하고 화기애애하게 만들었습니다!',
          },
        ],
      },
      outcomes: {
        success: {
          statEffects: { charm: 10, luck: 10 },
          npcEffects: { prince: [10, 15], noble: [10, 15] },
          narrative: { emoji: '✨', title: '가장 빛나는 별', desc: '오늘 밤 당신은 무도회에서 가장 빛나는 진짜 공주님처럼 모두의 존경을 받았습니다.' },
        },
      },
      assets: {
        images: [
          {
            key: 'grand-ballroom',
            path: 'assets/scenarios/grand-ball-debut/grand-ballroom.png',
            purpose: '대무도회 장면',
            generationPrompt: 'Children’s storybook illustration, Princess Maker style, warm painterly lighting, soft pastel palette, gentle and wholesome, no text in image, a magnificent grand royal ballroom with sparkling chandeliers, a young princess in a beautiful gown dancing with a prince under romantic warm lights.',
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
