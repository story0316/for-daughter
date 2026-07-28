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
}

summary('question-engine.js');
