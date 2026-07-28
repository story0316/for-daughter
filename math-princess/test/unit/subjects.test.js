// subjects.js(영어/과학 문제 생성 엔진) 유닛 테스트.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

const P = require(path.join(__dirname, '..', '..', 'problems.js'));
const SUBJ = require(path.join(__dirname, '..', '..', 'subjects.js'));

console.log('subjects.js unit tests');

const SUBJECTS = [
  { name: '영어', levels: SUBJ.ENGLISH_LEVELS, isUnlocked: SUBJ.isEnglishLevelUnlocked, generate: SUBJ.generateEnglishProblem },
  { name: '과학', levels: SUBJ.SCIENCE_LEVELS, isUnlocked: SUBJ.isScienceLevelUnlocked, generate: SUBJ.generateScienceProblem },
];

SUBJECTS.forEach(({ name, levels, isUnlocked, generate }) => {
  eq(levels.length, 4, `${name}은 초4~중1 총 4레벨이어야 함`);

  levels.forEach((level) => {
    const SAMPLES = 30;
    for (let i = 0; i < SAMPLES; i++) {
      const problem = generate(level.id);
      eq(problem.level, level.id, `${name} 레벨 ${level.id} 문제의 level 필드`);
      eq(problem.type, 'choice', `${name} 문제는 전부 선택형이어야 함`);
      eq(problem.rewardGold, 8 + level.id * 4, `${name} 레벨 ${level.id} rewardGold 공식(수학과 동일해야 함)`);
      ok(Array.isArray(problem.choices) && problem.choices.length === 4, `${name} 레벨 ${level.id} 선택지는 4개여야 함`);
      ok(problem.choices.includes(problem.answer), `${name} 레벨 ${level.id} choices 안에 answer 포함`);
      // 채점은 problems.js의 checkAnswer를 그대로 재사용한다고 문서화되어 있으므로 그대로 검증
      ok(P.checkAnswer(problem, problem.answer), `${name} 레벨 ${level.id} 문제는 problems.js checkAnswer로도 정답 처리되어야 함`);
      ok(!P.checkAnswer(problem, '__definitely_wrong__'), `${name} 레벨 ${level.id} 무의미한 입력은 오답 처리`);
      ok(typeof problem.hint === 'string' && problem.hint.length > 5, `${name} 레벨 ${level.id} 문제에는 풀이 힌트(hint)가 있어야 함: "${problem.question}"`);
      ok(!problem.hint.includes(problem.answer), `${name} 레벨 ${level.id} 힌트는 정답(${problem.answer})을 그대로 담고 있으면 안 됨(스포일러 방지): "${problem.hint}"`);
    }
  });

  // 해금 임계값이 수학의 앞 4단계(0/8/18/28)와 반드시 같아야 한다(README/주석에 명시된 설계 의도)
  const EXPECTED = [0, 8, 18, 28];
  levels.forEach((level, idx) => {
    eq(level.unlockIntelligence, EXPECTED[idx], `${name} 레벨 ${level.id} 해금 지능치는 수학 레벨 ${idx + 1}과 같아야 함`);
    ok(isUnlocked(level.id, EXPECTED[idx]), `${name} 레벨 ${level.id}은 지능 ${EXPECTED[idx]}에서 해금`);
    if (EXPECTED[idx] > 0) {
      ok(!isUnlocked(level.id, EXPECTED[idx] - 1), `${name} 레벨 ${level.id}은 지능 ${EXPECTED[idx] - 1}에서는 잠김`);
    }
  });
});

summary('subjects.js');
