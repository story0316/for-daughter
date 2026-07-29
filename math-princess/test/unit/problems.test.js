// problems.js(수학 문제 생성 엔진) 순수 로직 유닛 테스트. 브라우저/Playwright
// 없이 Node만으로 즉시 실행 가능하다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

const P = require(path.join(__dirname, '..', '..', 'problems.js'));

console.log('problems.js unit tests');

// 레벨 1~9 전부 다량 생성해서 구조/정답판정/보상공식이 항상 일관되는지 확인
for (const level of P.LEVELS.map((l) => l.id)) {
  const SAMPLES = 40;
  for (let i = 0; i < SAMPLES; i++) {
    const problem = P.generateProblem(level);
    eq(problem.level, level, `레벨 ${level} 문제의 level 필드`);
    ok(typeof problem.question === 'string' && problem.question.length > 0, `레벨 ${level} 문제에 question이 있어야 함`);
    ok(problem.answer !== undefined && problem.answer !== null, `레벨 ${level} 문제에 answer가 있어야 함`);
    eq(problem.rewardGold, 8 + level * 4, `레벨 ${level} rewardGold 공식(8+level*4)`);
    // "도움 받기" 버튼이 보여줄 풀이 힌트(예시 포함)가 모든 문제에 있어야 함
    ok(typeof problem.hint === 'string' && problem.hint.length > 10, `레벨 ${level} 문제에는 풀이 힌트(hint)가 있어야 함: "${problem.question}"`);
    // 정답을 그대로 넣으면 항상 정답 처리되어야 한다(채점 로직 자기일관성)
    ok(P.checkAnswer(problem, problem.answer), `레벨 ${level} 문제는 자신의 answer로 채점하면 정답이어야 함: "${problem.question}" -> "${problem.answer}"`);
    // 명백히 틀린 입력은 항상 오답 처리되어야 한다
    ok(!P.checkAnswer(problem, '__definitely_wrong__'), `레벨 ${level} 문제는 무의미한 입력에 오답 처리해야 함`);
    if (problem.type === 'choice') {
      ok(Array.isArray(problem.choices) && problem.choices.includes(problem.answer), `레벨 ${level} 선택형 문제는 choices 안에 answer를 포함해야 함`);
    }
  }
}

// 숫자 키패드에 +(더하기) 버튼이 생기면서, 답 앞에 +를 붙여 입력해도(예: "+5")
// -를 붙였을 때와 마찬가지로 정상적으로 채점되어야 한다.
{
  const posInt = { type: 'input', answer: '5' };
  ok(P.checkAnswer(posInt, '+5'), '정수 답 앞에 +를 붙여도 정답 처리되어야 함');
  const negInt = { type: 'input', answer: '-3' };
  ok(P.checkAnswer(negInt, '-3'), '음수 답은 여전히 정답 처리되어야 함(회귀 확인)');
  const decimal = { type: 'input', answer: '2.5' };
  ok(P.checkAnswer(decimal, '+2.5'), '소수 답 앞에 +를 붙여도 정답 처리되어야 함');
  const fraction = { type: 'input', answer: '3/4' };
  ok(P.checkAnswer(fraction, '+3/4'), '분수 답 앞에 +를 붙여도 정답 처리되어야 함');
}

// 레벨 해금 임계값(script.js의 지능 요구치와 반드시 일치해야 함)
const EXPECTED_THRESHOLDS = { 1: 0, 2: 8, 3: 18, 4: 28, 5: 38, 6: 48, 7: 58, 8: 68, 9: 78 };
eq(P.LEVELS.length, 9, '수학 레벨은 총 9단계여야 함(미적분 제외)');
ok(!P.LEVELS.some((l) => /미분|적분/.test(l.name) || /미분|적분/.test(l.desc)), '미분/적분 레벨은 더 이상 존재하면 안 됨');
Object.entries(EXPECTED_THRESHOLDS).forEach(([levelId, threshold]) => {
  const id = Number(levelId);
  ok(P.isLevelUnlocked(id, threshold), `레벨 ${id}은 지능 ${threshold}에서 해금되어야 함`);
  if (threshold > 0) {
    ok(!P.isLevelUnlocked(id, threshold - 1), `레벨 ${id}은 지능 ${threshold - 1}에서는 아직 잠겨 있어야 함`);
  }
});

// 초등학생 기준 중학교 이상 범위(레벨 3~9)에서는 문제를 낼 때마다 "개념
// 설명"(problem.concept)이 함께 붙어야 하고, 초등 범위(레벨 1~2)에는 없어야
// 한다. 개념 설명은 그 레벨의 모든 문제의 정답을 미리 알려주면 안 된다.
{
  const ADVANCED_LEVELS = [3, 4, 5, 6, 7, 8, 9];
  const ELEMENTARY_LEVELS = [1, 2];
  ADVANCED_LEVELS.forEach((level) => {
    const levelDef = P.LEVELS.find((l) => l.id === level);
    ok(typeof levelDef.concept === 'string' && levelDef.concept.length > 10, `레벨 ${level}(중학교 이상)은 LEVELS에 concept 설명이 있어야 함`);
    for (let i = 0; i < 10; i++) {
      const problem = P.generateProblem(level);
      eq(problem.concept, levelDef.concept, `레벨 ${level} 문제에는 그 레벨의 개념 설명이 그대로 붙어야 함`);
    }
  });
  ELEMENTARY_LEVELS.forEach((level) => {
    const levelDef = P.LEVELS.find((l) => l.id === level);
    ok(!levelDef.concept, `레벨 ${level}(초등 범위)은 개념 설명이 없어야 함`);
    for (let i = 0; i < 10; i++) {
      const problem = P.generateProblem(level);
      ok(!problem.concept, `레벨 ${level}(초등) 문제에는 concept 필드가 없어야 함`);
    }
  });
}

// 분수/약수 헬퍼
eq(P.fractionToString(4, 8), '1/2', 'fractionToString은 기약분수로 약분해야 함');
eq(P.fractionToString(6, 3), '2', '정수로 나눠떨어지면 분모 없이 표시해야 함');
eq(P.gcd(12, 18), 6, 'gcd(12,18)');
eq(P.parseFractionValue('3/4'), 0.75, 'parseFractionValue는 분수 문자열을 값으로 변환해야 함');
eq(P.parseFractionValue('abc'), null, 'parseFractionValue는 숫자가 아닌 입력에 null을 반환해야 함');

summary('problems.js');
