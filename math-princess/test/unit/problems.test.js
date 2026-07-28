// problems.js(수학 문제 생성 엔진) 순수 로직 유닛 테스트. 브라우저/Playwright
// 없이 Node만으로 즉시 실행 가능하다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

const P = require(path.join(__dirname, '..', '..', 'problems.js'));

console.log('problems.js unit tests');

// 레벨 1~10 전부 다량 생성해서 구조/정답판정/보상공식이 항상 일관되는지 확인
for (const level of P.LEVELS.map((l) => l.id)) {
  const SAMPLES = 40;
  for (let i = 0; i < SAMPLES; i++) {
    const problem = P.generateProblem(level);
    eq(problem.level, level, `레벨 ${level} 문제의 level 필드`);
    ok(typeof problem.question === 'string' && problem.question.length > 0, `레벨 ${level} 문제에 question이 있어야 함`);
    ok(problem.answer !== undefined && problem.answer !== null, `레벨 ${level} 문제에 answer가 있어야 함`);
    eq(problem.rewardGold, 8 + level * 4, `레벨 ${level} rewardGold 공식(8+level*4)`);
    // 정답을 그대로 넣으면 항상 정답 처리되어야 한다(채점 로직 자기일관성)
    ok(P.checkAnswer(problem, problem.answer), `레벨 ${level} 문제는 자신의 answer로 채점하면 정답이어야 함: "${problem.question}" -> "${problem.answer}"`);
    // 명백히 틀린 입력은 항상 오답 처리되어야 한다
    ok(!P.checkAnswer(problem, '__definitely_wrong__'), `레벨 ${level} 문제는 무의미한 입력에 오답 처리해야 함`);
    if (problem.type === 'choice') {
      ok(Array.isArray(problem.choices) && problem.choices.includes(problem.answer), `레벨 ${level} 선택형 문제는 choices 안에 answer를 포함해야 함`);
    }
  }
}

// 레벨 해금 임계값(script.js의 지능 요구치와 반드시 일치해야 함)
const EXPECTED_THRESHOLDS = { 1: 0, 2: 8, 3: 18, 4: 28, 5: 38, 6: 48, 7: 58, 8: 68, 9: 78, 10: 88 };
Object.entries(EXPECTED_THRESHOLDS).forEach(([levelId, threshold]) => {
  const id = Number(levelId);
  ok(P.isLevelUnlocked(id, threshold), `레벨 ${id}은 지능 ${threshold}에서 해금되어야 함`);
  if (threshold > 0) {
    ok(!P.isLevelUnlocked(id, threshold - 1), `레벨 ${id}은 지능 ${threshold - 1}에서는 아직 잠겨 있어야 함`);
  }
});

// 분수/약수 헬퍼
eq(P.fractionToString(4, 8), '1/2', 'fractionToString은 기약분수로 약분해야 함');
eq(P.fractionToString(6, 3), '2', '정수로 나눠떨어지면 분모 없이 표시해야 함');
eq(P.gcd(12, 18), 6, 'gcd(12,18)');
eq(P.parseFractionValue('3/4'), 0.75, 'parseFractionValue는 분수 문자열을 값으로 변환해야 함');
eq(P.parseFractionValue('abc'), null, 'parseFractionValue는 숫자가 아닌 입력에 null을 반환해야 함');

summary('problems.js');
