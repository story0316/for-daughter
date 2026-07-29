// question-engine.js(질문 엔진) 유닛 테스트. "다음에 어떤 문제를 낼지"만
// 검증한다 — 보상(골드/스탯) 계산은 reward-engine.test.js가 담당한다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

const BASE = path.join(__dirname, '..', '..');
const P = require(path.join(BASE, 'problems.js'));
const SUBJ = require(path.join(BASE, 'subjects.js'));
const { createQuestionEngine } = require(path.join(BASE, 'question-engine.js'));

const Question = createQuestionEngine({ P, SUBJ });

console.log('question-engine.js unit tests');

eq(Question.subjectName('math'), '수학', '수학 과목 이름');
eq(Question.subjectName('english'), '영어', '영어 과목 이름');
eq(Question.subjectName('science'), '과학', '과학 과목 이름');

// SUBJECTS[key].maxLevel은 실제 LEVELS 테이블 길이와 반드시 일치해야 한다.
// (영어를 8단계로 확장했을 때 이 maxLevel을 4로 갱신하지 않아, 공부/알바
// 세션이 실제로는 절대 영어 레벨 5~8을 출제하지 않는 회귀가 있었다.)
eq(Question.SUBJECTS.math.maxLevel, P.LEVELS.length, '수학 maxLevel은 실제 LEVELS 개수와 같아야 함');
eq(Question.SUBJECTS.english.maxLevel, SUBJ.ENGLISH_LEVELS.length, '영어 maxLevel은 실제 ENGLISH_LEVELS 개수와 같아야 함');
eq(Question.SUBJECTS.science.maxLevel, SUBJ.SCIENCE_LEVELS.length, '과학 maxLevel은 실제 SCIENCE_LEVELS 개수와 같아야 함');
{
  // maxLevel이 실제보다 작으면 지능이 아무리 높아도 그 이상 레벨은 절대
  // 뽑히지 않으므로, 실제로 상위 레벨까지 해금/출제되는지 직접 확인한다.
  const unlocked = Question.unlockedLevelsFor(100, 'english');
  ok(unlocked.includes(8), '지능이 충분하면 영어 레벨 8(고2)까지 해금되어야 함');
}

{
  const unlocked = Question.unlockedLevelsFor(0, 'math');
  ok(unlocked.includes(1), '지능 0에서도 레벨 1은 해금되어야 함');
  eq(Question.typicalStudyLevel(0), 1, '지능 0에서 대표 레벨은 1');
}
{
  const unlockedLow = Question.unlockedLevelsFor(10, 'math').length;
  const unlockedHigh = Question.unlockedLevelsFor(90, 'math').length;
  ok(unlockedHigh >= unlockedLow, '지능이 높을수록 해금된 레벨 수가 같거나 많아야 함');
}

{
  const { subject, level } = Question.pickRandomSubjectAndLevel(50);
  ok(Question.SUBJECT_KEYS.includes(subject), '무작위로 고른 과목은 유효한 과목이어야 함');
  ok(Number.isInteger(level) && level >= 1, '무작위로 고른 레벨은 1 이상 정수여야 함');
}
{
  const { subject, level } = Question.pickRandomSubjectLevel1();
  ok(Question.SUBJECT_KEYS.includes(subject), '알바용 무작위 과목도 유효해야 함');
  eq(level, 1, '알바는 항상 레벨 1');
}

{
  // 셔플 가방은 세션이 아니라 모듈 전체에서 공유되어야 한다 — 실제 플레이에서는
  // "연회 참석"/"창의력 올림피아드"/"기도와 선행"을 매번 새 세션(빈
  // askedQuestions)으로 시작하므로, 세션 안에서만 반복을 막는 예전 방식이라면
  // 여러 주에 걸쳐 같은 문제가 금방 다시 나올 수 있었다. 매번 새 세션 객체로
  // 문제를 하나씩만 뽑아도(=매주 새로 시작하는 활동처럼) 은행 전체를 한 바퀴
  // 돌기 전에는 같은 문제가 나오지 않아야 한다. 이 파일에서 이 세 함수를 맨
  // 처음 호출하는 지점이어야(가방이 비어있는 새 상태에서 검증) 하므로 반드시
  // 다른 generate*Question 호출보다 먼저 실행한다.
  [
    { name: '예절', bank: Question.ETIQUETTE_QUESTIONS, generate: Question.generateEtiquetteQuestion },
    { name: '창의력', bank: Question.CREATIVITY_PUZZLE_BANK, generate: Question.generateCreativityQuestion },
    { name: '기도와 선행', bank: Question.FAITH_QUESTIONS, generate: Question.generateFaithQuestion },
  ].forEach(({ name, bank, generate }) => {
    const seen = new Set();
    for (let i = 0; i < bank.length; i++) {
      const freshSession = { askedQuestions: [] }; // 매번 새 세션(=매주 새로 시작하는 활동)
      const q = generate(freshSession);
      ok(!seen.has(q.question), `${name}: 세션이 바뀌어도(가방이 모듈 전체에서 공유되어야) 은행을 한 바퀴 돌기 전엔 같은 문제를 반복하면 안 됨`);
      seen.add(q.question);
    }
    eq(seen.size, bank.length, `${name}: 매번 새 세션으로 은행 크기만큼 뽑아도 전부 서로 다른 문제여야 함`);
  });
}

{
  // 문제 은행을 다 소진하기 전까지는 같은 문제를 다시 내지 않아야 함
  const session = { askedQuestions: [] };
  const seen = new Set();
  for (let i = 0; i < Question.ETIQUETTE_QUESTIONS.length; i++) {
    const q = Question.generateEtiquetteQuestion(session);
    ok(!seen.has(q.question), '문제 은행이 남아있는 동안은 같은 예절 문제를 반복하지 않아야 함');
    seen.add(q.question);
  }
  eq(seen.size, Question.ETIQUETTE_QUESTIONS.length, '문제 은행 전체를 한 바퀴 돌면 모든 문제가 한 번씩 나와야 함');
  // 다 소진한 뒤에는 은행에서 다시 뽑되(반복 허용) 여전히 유효한 문제여야 함
  const again = Question.generateEtiquetteQuestion(session);
  ok(Question.ETIQUETTE_QUESTIONS.some((q) => q.question === again.question), '은행을 다 쓰면 다시 은행에서 뽑아야 함');
}

{
  // 예절 문제 은행 전체에 "도움 받기" 버튼이 보여줄 힌트가 있어야 하고,
  // 생성된 문제 객체에도 그 힌트가 그대로 전달되어야 한다.
  Question.ETIQUETTE_QUESTIONS.forEach((q) => {
    ok(typeof q.hint === 'string' && q.hint.length > 5, `예절 문제에는 힌트가 있어야 함: "${q.question}"`);
    ok(!q.hint.includes(q.answer), `예절 문제 힌트는 정답을 그대로 담고 있으면 안 됨: "${q.question}"`);
  });
  const session = { askedQuestions: [] };
  const generated = Question.generateEtiquetteQuestion(session);
  ok(typeof generated.hint === 'string' && generated.hint.length > 5, 'generateEtiquetteQuestion이 돌려주는 문제 객체에도 hint가 포함되어야 함');
}

{
  // 창의력 올림피아드 문제 은행: 예절 문제 은행과 같은 규칙(반복 방지,
  // 힌트 스포일러 방지)을 그대로 따라야 한다.
  const session = { askedQuestions: [] };
  const seen = new Set();
  for (let i = 0; i < Question.CREATIVITY_PUZZLE_BANK.length; i++) {
    const q = Question.generateCreativityQuestion(session);
    ok(!seen.has(q.question), '문제 은행이 남아있는 동안은 같은 창의력 문제를 반복하지 않아야 함');
    ok(q.choices.includes(q.answer), '창의력 문제 보기 안에 정답이 포함되어야 함');
    seen.add(q.question);
  }
  eq(seen.size, Question.CREATIVITY_PUZZLE_BANK.length, '창의력 문제 은행 전체를 한 바퀴 돌면 모든 문제가 한 번씩 나와야 함');
  Question.CREATIVITY_PUZZLE_BANK.forEach((q) => {
    ok(typeof q.hint === 'string' && q.hint.length > 5, `창의력 문제에는 힌트가 있어야 함: "${q.question}"`);
    ok(!q.hint.includes(q.answer), `창의력 문제 힌트는 정답을 그대로 담고 있으면 안 됨: "${q.question}"`);
  });
}

{
  // 기도와 선행 문제 은행도 마찬가지로 반복 방지/힌트 스포일러 방지 규칙을 따라야 한다.
  const session = { askedQuestions: [] };
  const seen = new Set();
  for (let i = 0; i < Question.FAITH_QUESTIONS.length; i++) {
    const q = Question.generateFaithQuestion(session);
    ok(!seen.has(q.question), '문제 은행이 남아있는 동안은 같은 기도와 선행 문제를 반복하지 않아야 함');
    ok(q.choices.includes(q.answer), '기도와 선행 문제 보기 안에 정답이 포함되어야 함');
    seen.add(q.question);
  }
  eq(seen.size, Question.FAITH_QUESTIONS.length, '기도와 선행 문제 은행 전체를 한 바퀴 돌면 모든 문제가 한 번씩 나와야 함');
  Question.FAITH_QUESTIONS.forEach((q) => {
    ok(typeof q.hint === 'string' && q.hint.length > 5, `기도와 선행 문제에는 힌트가 있어야 함: "${q.question}"`);
    ok(!q.hint.includes(q.answer), `기도와 선행 문제 힌트는 정답을 그대로 담고 있으면 안 됨: "${q.question}"`);
  });
}

{
  const scenario = { quiz: { bank: [
    { question: 'Q1', choices: ['a', 'b'], answer: 'a', explanation: 'e1' },
    { question: 'Q2', choices: ['a', 'b'], answer: 'b', explanation: 'e2' },
  ] } };
  const session = { scenario, askedQuestions: [] };
  const q1 = Question.generateScenarioQuestion(session);
  const q2 = Question.generateScenarioQuestion(session);
  ok(q1.question !== q2.question, '시나리오 문제 은행이 남아있으면 같은 문제를 반복하지 않아야 함');
  ok(q1.choices.length === 2 && q1.choices.includes(q1.answer), '보기 안에 정답이 포함되어야 함');
}

{
  // session.hint가 true면 오답 보기 하나가 지워져야 함(호감도 기반 힌트)
  const scenario = { quiz: { bank: [
    { question: 'HQ', choices: ['a', 'b', 'c', 'd'], answer: 'a', explanation: 'e' },
  ] } };
  const noHintSession = { scenario, askedQuestions: [], hint: false };
  const withHintSession = { scenario, askedQuestions: [], hint: true };
  const noHintQ = Question.generateScenarioQuestion(noHintSession);
  const withHintQ = Question.generateScenarioQuestion(withHintSession);
  eq(noHintQ.choices.length, 4, '힌트가 없으면 보기 4개 그대로여야 함');
  eq(withHintQ.choices.length, 3, '힌트가 있으면 오답 하나가 지워져 보기 3개여야 함');
  ok(withHintQ.choices.includes(withHintQ.answer), '힌트로 보기를 지워도 정답은 항상 남아있어야 함');
}

{
  // generateNextProblem: 세션 유형에 따라 올바른 생성 경로로 분기해야 함
  const banquetSession = { type: 'banquet', askedQuestions: [] };
  const banquetQ = Question.generateNextProblem(50, banquetSession);
  ok(Question.ETIQUETTE_QUESTIONS.some((q) => q.question === banquetQ.question), '연회 세션은 예절 문제 은행에서 나와야 함');

  const studySession = { type: 'study' };
  const studyQ = Question.generateNextProblem(50, studySession);
  ok(Question.SUBJECT_KEYS.includes(studySession.currentSubject), '공부 세션은 currentSubject를 채워야 함');
  ok(studyQ && typeof studyQ.question === 'string', '공부 세션은 유효한 문제를 내야 함');

  const jobSession = { type: 'job' };
  Question.generateNextProblem(50, jobSession);
  ok(Question.SUBJECT_KEYS.includes(jobSession.currentSubject), '알바 세션도 currentSubject를 채워야 함');

  const creativitySession = { type: 'creativity', askedQuestions: [] };
  const creativityQ = Question.generateNextProblem(50, creativitySession);
  ok(Question.CREATIVITY_PUZZLE_BANK.some((q) => q.question === creativityQ.question), '창의력 올림피아드 세션은 창의력 문제 은행에서 나와야 함');

  const faithSession = { type: 'faith', askedQuestions: [] };
  const faithQ = Question.generateNextProblem(50, faithSession);
  ok(Question.FAITH_QUESTIONS.some((q) => q.question === faithQ.question), '기도와 선행 세션은 기도와 선행 문제 은행에서 나와야 함');
}

{
  // session.fixedSubject가 있으면(공부 세션) 여러 문제를 내도 과목이 바뀌지 않아야 함(연계성)
  const session = { type: 'study', fixedSubject: 'science' };
  for (let i = 0; i < 10; i++) {
    Question.generateNextProblem(80, session);
    eq(session.currentSubject, 'science', '고정 과목 세션은 매 문제마다 같은 과목이어야 함');
  }
}
{
  // fixedSubject가 없으면(예: 보너스 미니게임) 기존처럼 매번 무작위 과목이어야 함 —
  // 여러 번 뽑았을 때 과목이 최소 한 번은 바뀌는지로 "고정되지 않았다"를 확인한다.
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    const session = { type: 'exercise-bonus' };
    Question.generateNextProblem(80, session);
    seen.add(session.currentSubject);
  }
  ok(seen.size > 1, 'fixedSubject가 없는 세션은 여러 번 시도하면 과목이 섞여 나와야 함');
}

{
  // weightedChoice([쉬움...어려움])는 뒤쪽(어려운 쪽)일수록 더 자주 뽑혀야
  // 한다(가중치 1,2,3,...로 선형 증가) — pickLevelForSubject가 최근 해금된
  // 3개 레벨 중 가장 어려운 레벨을 우대하는 데 쓰는 로직이다.
  const counts = { easy: 0, mid: 0, hard: 0 };
  const TRIALS = 6000;
  for (let i = 0; i < TRIALS; i++) {
    const picked = Question.weightedChoice(['easy', 'mid', 'hard']);
    counts[picked]++;
  }
  ok(counts.hard > counts.mid, `가중치가 가장 큰 항목(hard)이 중간(mid)보다 더 자주 뽑혀야 함: ${JSON.stringify(counts)}`);
  ok(counts.mid > counts.easy, `중간(mid)이 가장 가중치가 낮은 항목(easy)보다 더 자주 뽑혀야 함: ${JSON.stringify(counts)}`);
  // 대략 1:2:3 비율(전체 6칸 중 1/2/3칸)에 가까운지 느슨하게 확인
  const hardRatio = counts.hard / TRIALS;
  ok(hardRatio > 0.4 && hardRatio < 0.6, `hard 비율은 대략 절반(3/6) 근처여야 함: ${hardRatio}`);

  // 항목이 하나뿐이면 항상 그 하나를 돌려줘야 함(빈 배열이 되지 않게 하는 경계값)
  eq(Question.weightedChoice(['only']), 'only', '항목이 하나면 그 하나를 그대로 돌려줘야 함');
}

{
  // pickLevelForSubject: 지능이 충분히 올라 최근 해금 밴드가 3개 꽉 찼을
  // 때, 가장 최근에 해금된(가장 어려운) 레벨이 가장 쉬운 레벨보다 더 자주
  // 나와야 한다(예전에는 3개가 완전히 균등해서 이 성질이 없었다).
  const intelligence = 58; // 영어/과학 레벨 6,7이 막 해금된 지점 근처(밴드가 [5,6,7] 정도)
  const band = Question.unlockedLevelsFor(intelligence, 'english').slice(-3);
  eq(band.length, 3, '테스트 조건: 최근 해금 밴드가 3개여야 함');
  const [easiest, , hardest] = band;
  const counts = {};
  band.forEach((lv) => { counts[lv] = 0; });
  const TRIALS = 6000;
  for (let i = 0; i < TRIALS; i++) {
    counts[Question.pickLevelForSubject(intelligence, 'english')]++;
  }
  ok(counts[hardest] > counts[easiest], `최근 해금 밴드 중 가장 어려운 레벨(${hardest})이 가장 쉬운 레벨(${easiest})보다 자주 나와야 함: ${JSON.stringify(counts)}`);
}

summary('question-engine.js');
