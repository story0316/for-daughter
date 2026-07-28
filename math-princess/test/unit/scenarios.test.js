// scenarios.js(시나리오 콘텐츠 자료구조) 유닛 테스트. 콘텐츠를 추가/수정할
// 때 스키마를 깨뜨리지 않았는지, 게임에 실제로 연결하는 script.js가 기대하는
// 필드가 다 채워져 있는지 여기서 바로 잡아낸다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

const SC = require(path.join(__dirname, '..', '..', 'scenarios.js'));

console.log('scenarios.js unit tests');

ok(Array.isArray(SC.SCENARIOS) && SC.SCENARIOS.length > 0, 'SCENARIOS 배열이 비어있지 않아야 함');

// id 중복 금지
{
  const ids = SC.SCENARIOS.map((s) => s.id);
  const unique = new Set(ids);
  eq(unique.size, ids.length, 'SCENARIOS에 중복된 id가 없어야 함');
}

// 모든 시나리오가 자체 스키마 검증(validateScenario)을 통과해야 한다
SC.SCENARIOS.forEach((s) => {
  const result = SC.validateScenario(s);
  ok(result.ok, `시나리오 "${s.id}"가 validateScenario를 통과해야 함: ${result.errors.join(', ')}`);
});

// 'ready' 상태인 시나리오는 script.js의 runScenario()가 기대하는 실제 콘텐츠
// 필드(quiz/narrative/branching, outcomes, assets)까지 채워져 있어야 한다
SC.SCENARIOS.filter((s) => s.status === 'ready').forEach((s) => {
  ok(!!s.outcomes && !!s.outcomes.success, `ready 시나리오 "${s.id}"는 outcomes.success가 있어야 함`);
  ok(!!s.outcomes.success.narrative, `ready 시나리오 "${s.id}"는 outcomes.success.narrative가 있어야 함`);

  if (s.type === 'quiz') {
    ok(!!s.quiz, `퀴즈형 시나리오 "${s.id}"는 quiz 필드가 있어야 함`);
    ok(!!s.outcomes.fail, `퀴즈형 시나리오 "${s.id}"는 outcomes.fail(실패 결과)도 있어야 함`);
    ok(s.quiz.bank.length >= s.quiz.questionsPerSession, `"${s.id}"의 문제은행은 세션당 문제 수 이상이어야 함`);
    ok(s.quiz.passCount <= s.quiz.questionsPerSession, `"${s.id}"의 통과 기준은 세션 문제 수 이하여야 함`);
    s.quiz.bank.forEach((q, i) => {
      ok(Array.isArray(q.choices) && q.choices.includes(q.answer), `"${s.id}" 문제은행 ${i}번은 choices 안에 answer를 포함해야 함`);
    });
  } else if (s.type === 'narrative') {
    ok(!!s.narrative && Array.isArray(s.narrative.lines) && s.narrative.lines.length > 0, `내러티브 시나리오 "${s.id}"는 narrative.lines가 있어야 함`);
  } else if (s.type === 'branching') {
    ok(!!s.branching && Array.isArray(s.branching.options) && s.branching.options.length >= 2, `분기형 시나리오 "${s.id}"는 branching.options가 2개 이상이어야 함`);
  }

  // bespoke가 아닌 이상 npcId가 있어야 script.js의 findActiveScenario가 찾을 수 있다
  if (!s.bespoke) {
    ok(!!s.npcId, `bespoke가 아닌 ready 시나리오 "${s.id}"는 npcId가 있어야 script.js에서 연결됨`);
  }
});

// tier는 0~5(OUTFIT_TIERS 인덱스) 범위를 벗어나면 안 된다
SC.SCENARIOS.forEach((s) => {
  ok(SC.VALID_TIERS.includes(s.tier), `시나리오 "${s.id}"의 tier(${s.tier})는 유효 범위여야 함`);
});

summary('scenarios.js');
