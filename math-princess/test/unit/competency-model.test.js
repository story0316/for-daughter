// competency-model.js(역량/지식/상황판단 태깅 데이터) 유닛 테스트.
// 이 데이터는 게임 로직에 관여하지 않지만, 관리자 페이지가 신뢰할 수
// 있으려면 참조 무결성(존재하지 않는 id를 가리키지 않는지, 실제 게임
// 콘텐츠와 어긋나지 않는지)이 보장되어야 한다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

const CM = require(path.join(__dirname, '..', '..', 'competency-model.js'));
const P = require(path.join(__dirname, '..', '..', 'problems.js'));
const SUBJ = require(path.join(__dirname, '..', '..', 'subjects.js'));
const SC = require(path.join(__dirname, '..', '..', 'scenarios.js'));
const E = require(path.join(__dirname, '..', '..', 'endings.js'));
const Question = require(path.join(__dirname, '..', '..', 'question-engine.js'));
const Engine = require(path.join(__dirname, '..', '..', 'game-engine.js'));

console.log('competency-model.js unit tests');

const engine = Engine.createEngine({ P, SUBJ, SC, E });
const questionEngine = Question.createQuestionEngine({ P, SUBJ });

const competencyIds = new Set(CM.CORE_COMPETENCIES.map((c) => c.id));
eq(competencyIds.size, 6, '핵심역량은 2022 개정 교육과정 기준 6개여야 함');

function checkCompetencyIds(list, label) {
  (list || []).forEach((id) => {
    ok(competencyIds.has(id), `${label}가 참조하는 역량 id "${id}"는 CORE_COMPETENCIES에 존재해야 함`);
  });
}

// 상황판단(JUDGMENT_CATEGORIES) 태그는 각각 최소 하나 이상의 실제 핵심역량과
// 연결되어 있어야 한다(존재하지 않는 역량을 가리키면 안 됨).
CM.JUDGMENT_CATEGORIES.forEach((j) => {
  ok(Array.isArray(j.competencies) && j.competencies.length > 0, `상황판단 카테고리 "${j.id}"는 최소 하나의 역량과 연결되어야 함`);
  checkCompetencyIds(j.competencies, `상황판단 카테고리 "${j.id}"`);
});

// 연회 예절 문제(ETIQUETTE_QUESTIONS)의 category는 전부 JUDGMENT_CATEGORIES에
// 등록된 값이어야 한다(오타/누락 시 관리자 페이지에서 매칭이 깨짐).
const judgmentIds = new Set(CM.JUDGMENT_CATEGORIES.map((j) => j.id));
ok(questionEngine.ETIQUETTE_QUESTIONS.length >= 20, `연회 예절 문제는 예절뿐 아니라 폭넓은 상황판단을 다루도록 20개 이상이어야 함(현재 ${questionEngine.ETIQUETTE_QUESTIONS.length}개)`);
questionEngine.ETIQUETTE_QUESTIONS.forEach((q) => {
  ok(q.id, `연회 예절 문제에는 고유 id가 있어야 함: "${q.question}"`);
  ok(q.category && judgmentIds.has(q.category), `연회 예절 문제 "${q.id}"의 category("${q.category}")는 JUDGMENT_CATEGORIES에 등록되어 있어야 함`);
});
{
  const ids = questionEngine.ETIQUETTE_QUESTIONS.map((q) => q.id);
  eq(new Set(ids).size, ids.length, '연회 예절 문제 id는 중복이 없어야 함');
}
// 상황판단 축이 예절 하나에만 머무르지 않고 폭넓게 다뤄지는지(디지털 시민의식,
// 안전, 갈등해결 등도 실제로 포함되어 있는지) 확인한다.
['디지털시민의식', '안전', '갈등해결', '다양성존중', '정직과책임감'].forEach((cat) => {
  ok(questionEngine.ETIQUETTE_QUESTIONS.some((q) => q.category === cat), `연회 예절 문제 중 "${cat}" 범주가 최소 하나 이상 있어야 함(예절을 넘어선 상황판단 커버리지)`);
});

// 기도와 선행 문제(FAITH_QUESTIONS)도 category가 전부 JUDGMENT_CATEGORIES에
// 등록되어 있어야 하고, 성경퀴즈/어른공경/친구배려/기도 네 범주를 모두 다뤄야 한다.
ok(questionEngine.FAITH_QUESTIONS.length >= 15, `기도와 선행 문제는 네 범주를 고루 다루도록 15개 이상이어야 함(현재 ${questionEngine.FAITH_QUESTIONS.length}개)`);
questionEngine.FAITH_QUESTIONS.forEach((q) => {
  ok(q.id, `기도와 선행 문제에는 고유 id가 있어야 함: "${q.question}"`);
  ok(q.category && judgmentIds.has(q.category), `기도와 선행 문제 "${q.id}"의 category("${q.category}")는 JUDGMENT_CATEGORIES에 등록되어 있어야 함`);
});
{
  const ids = questionEngine.FAITH_QUESTIONS.map((q) => q.id);
  eq(new Set(ids).size, ids.length, '기도와 선행 문제 id는 중복이 없어야 함');
}
['성경퀴즈', '어른공경', '친구배려', '기도'].forEach((cat) => {
  ok(questionEngine.FAITH_QUESTIONS.some((q) => q.category === cat), `기도와 선행 문제 중 "${cat}" 범주가 최소 하나 이상 있어야 함`);
});

// 창의력 올림피아드 문제(CREATIVITY_PUZZLE_BANK)도 id 중복이 없어야 하고
// 패턴찾기/유추/공간지각/창의적사고 네 유형을 고루 다뤄야 한다.
ok(questionEngine.CREATIVITY_PUZZLE_BANK.length >= 12, `창의력 올림피아드 문제는 네 유형을 고루 다루도록 12개 이상이어야 함(현재 ${questionEngine.CREATIVITY_PUZZLE_BANK.length}개)`);
questionEngine.CREATIVITY_PUZZLE_BANK.forEach((q) => {
  ok(q.id, `창의력 문제에는 고유 id가 있어야 함: "${q.question}"`);
});
{
  const ids = questionEngine.CREATIVITY_PUZZLE_BANK.map((q) => q.id);
  eq(new Set(ids).size, ids.length, '창의력 문제 id는 중복이 없어야 함');
}
['패턴찾기', '유추', '공간지각', '창의적사고'].forEach((cat) => {
  ok(questionEngine.CREATIVITY_PUZZLE_BANK.some((q) => q.category === cat), `창의력 문제 중 "${cat}" 유형이 최소 하나 이상 있어야 함`);
});

// SUBJECT_COMPETENCY_TAGS는 실제 3과목(math/english/science)을 전부 담아야 한다.
Object.keys(engine.SUBJECTS).forEach((key) => {
  ok(CM.SUBJECT_COMPETENCY_TAGS[key], `과목 "${key}"에 대한 역량 태그가 있어야 함`);
  checkCompetencyIds(CM.SUBJECT_COMPETENCY_TAGS[key].competencies, `과목 "${key}"`);
});

// ACTIVITY_COMPETENCY_TAGS는 실제 스케줄 활동(ACTIVITY_DEFS)을 전부 담아야 한다.
Object.keys(engine.ACTIVITY_DEFS).forEach((key) => {
  ok(CM.ACTIVITY_COMPETENCY_TAGS[key], `활동 "${key}"에 대한 역량 태그가 있어야 함`);
  checkCompetencyIds(CM.ACTIVITY_COMPETENCY_TAGS[key].competencies, `활동 "${key}"`);
});

// SCENARIO_COMPETENCY_TAGS는 scenarios.js에 실제 존재하는 시나리오와
// 정확히 1:1로 대응해야 한다(누락도, 존재하지 않는 시나리오를 가리키는
// 유령 태그도 없어야 함).
const scenarioIds = SC.SCENARIOS.map((s) => s.id);
eq(new Set(scenarioIds).size, scenarioIds.length, 'scenarios.js의 시나리오 id는 중복이 없어야 함(전제 조건)');
scenarioIds.forEach((id) => {
  ok(CM.SCENARIO_COMPETENCY_TAGS[id], `시나리오 "${id}"에 대한 역량 태그가 있어야 함`);
  if (CM.SCENARIO_COMPETENCY_TAGS[id]) checkCompetencyIds(CM.SCENARIO_COMPETENCY_TAGS[id].competencies, `시나리오 "${id}"`);
});
Object.keys(CM.SCENARIO_COMPETENCY_TAGS).forEach((id) => {
  ok(scenarioIds.includes(id), `SCENARIO_COMPETENCY_TAGS의 "${id}"는 실제 scenarios.js에 존재하는 시나리오여야 함(유령 태그 금지)`);
});

// CERT_EXAM_COMPETENCY_TAGS도 유효한 역량만 참조해야 한다.
checkCompetencyIds(CM.CERT_EXAM_COMPETENCY_TAGS.competencies, '기초 과목 인증 시험');

// 헬퍼 함수 동작 확인
ok(CM.competencyById('self-management').name === '자기관리 역량', 'competencyById가 올바른 역량을 반환해야 함');
eq(CM.competencyById('no-such-id'), null, '존재하지 않는 id는 null을 반환해야 함');
ok(CM.judgmentCategoryById('인사예절').emoji === '🙇', 'judgmentCategoryById가 올바른 카테고리를 반환해야 함');
eq(CM.judgmentCategoryById('no-such-id'), null, '존재하지 않는 id는 null을 반환해야 함');

summary('competency-model.js');
