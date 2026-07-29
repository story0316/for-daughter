// subjects.js(영어/과학 문제 생성 엔진) 유닛 테스트.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

const P = require(path.join(__dirname, '..', '..', 'problems.js'));
const SUBJ = require(path.join(__dirname, '..', '..', 'subjects.js'));

console.log('subjects.js unit tests');

// "공부"/"알바"처럼 askedQuestions 없이(2번째 인자 생략) 호출하는 일반 플레이는
// 레벨별 셔플 가방에서 뽑으므로, 그 레벨의 은행을 한 바퀴 다 돌기 전에는
// 같은 문제가 반복되면 안 된다(순수 무작위 추첨이면 가끔 반복될 수 있지만,
// 셔플 가방은 그러지 않아야 하는 게 이번에 올린 "출제 방식 고도화"의 핵심).
// 이 파일에서 각 레벨의 generate()를 처음 호출하는 지점이어야 가방이
// 비어있는 상태(=은행 전체가 새로 섞여 채워지는 시점)에서 검증할 수 있으므로
// 반드시 다른 generate() 호출보다 먼저 실행한다.
[
  { name: '영어', levels: SUBJ.ENGLISH_LEVELS, bank: SUBJ.ENGLISH_BANK, generate: SUBJ.generateEnglishProblem },
  { name: '과학', levels: SUBJ.SCIENCE_LEVELS, bank: SUBJ.SCIENCE_BANK, generate: SUBJ.generateScienceProblem },
].forEach(({ name, levels, bank, generate }) => {
  levels.forEach((level) => {
    const bankSize = bank[level.id].length;
    const seen = [];
    for (let i = 0; i < bankSize; i++) {
      const problem = generate(level.id);
      ok(!seen.includes(problem.question), `${name} 레벨 ${level.id}: 셔플 가방은 은행(${bankSize}개)을 한 바퀴 돌기 전엔 같은 문제를 반복하면 안 됨`);
      seen.push(problem.question);
    }
    eq(seen.length, bankSize, `${name} 레벨 ${level.id}: 은행 크기만큼 뽑으면 전부 서로 다른 문제여야 함`);
  });
});

// askedQuestions를 명시적으로(빈 배열이라도) 넘기면, 셔플 가방이 아니라
// 기존의 "걸러내고 무작위 추첨" 방식을 그대로 써야 한다(기초 과목 인증
// 시험이 이 계약에 의존한다 — session.askedQuestions는 항상 []로 시작함).
{
  const problem = SUBJ.generateEnglishProblem(1, []);
  ok(problem && typeof problem.question === 'string', '영어: askedQuestions=[]를 넘겨도 정상적으로 문제를 돌려줘야 함');
  const sciProblem = SUBJ.generateScienceProblem(1, []);
  ok(sciProblem && typeof sciProblem.question === 'string', '과학: askedQuestions=[]를 넘겨도 정상적으로 문제를 돌려줘야 함');
}

// 영어는 수학처럼 고등학교 2학년 수준까지 8단계로, 과학도 고등학교 1학년
// (통합과학) 수준까지 7단계로 확장했다(둘 다 금메달 인증까지 도전 가능).
const SUBJECTS = [
  {
    name: '영어', levels: SUBJ.ENGLISH_LEVELS, isUnlocked: SUBJ.isEnglishLevelUnlocked, generate: SUBJ.generateEnglishProblem,
    expectedThresholds: [0, 8, 18, 28, 38, 48, 58, 68],
  },
  {
    name: '과학', levels: SUBJ.SCIENCE_LEVELS, isUnlocked: SUBJ.isScienceLevelUnlocked, generate: SUBJ.generateScienceProblem,
    expectedThresholds: [0, 8, 18, 28, 38, 48, 58],
  },
];

SUBJECTS.forEach(({ name, levels, isUnlocked, generate, expectedThresholds }) => {
  eq(levels.length, expectedThresholds.length, `${name}은 총 ${expectedThresholds.length}레벨이어야 함`);

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

  // 해금 임계값이 수학과 같은 지능 기준이어야 한다(README/주석에 명시된 설계 의도)
  levels.forEach((level, idx) => {
    const threshold = expectedThresholds[idx];
    eq(level.unlockIntelligence, threshold, `${name} 레벨 ${level.id} 해금 지능치는 수학 레벨 ${idx + 1}과 같아야 함`);
    ok(isUnlocked(level.id, threshold), `${name} 레벨 ${level.id}은 지능 ${threshold}에서 해금`);
    if (threshold > 0) {
      ok(!isUnlocked(level.id, threshold - 1), `${name} 레벨 ${level.id}은 지능 ${threshold - 1}에서는 잠김`);
    }
  });
});

// 초등학생 기준 중학교 이상 범위(영어 레벨 4~8, 과학 레벨 4~7)에서는
// problems.js와 마찬가지로 문제를 낼 때마다 concept(개념 설명)이 붙어야
// 하고, 초등 범위(레벨 1~3)에는 없어야 한다.
[
  { name: '영어', levels: SUBJ.ENGLISH_LEVELS, generate: SUBJ.generateEnglishProblem, advancedIds: [4, 5, 6, 7, 8] },
  { name: '과학', levels: SUBJ.SCIENCE_LEVELS, generate: SUBJ.generateScienceProblem, advancedIds: [4, 5, 6, 7] },
].forEach(({ name, levels, generate, advancedIds }) => {
  levels.forEach((level) => {
    const isAdvanced = advancedIds.includes(level.id);
    if (isAdvanced) {
      ok(typeof level.concept === 'string' && level.concept.length > 10, `${name} 레벨 ${level.id}(중학교 이상)은 concept 설명이 있어야 함`);
    } else {
      ok(!level.concept, `${name} 레벨 ${level.id}(초등 범위)은 concept 설명이 없어야 함`);
    }
    for (let i = 0; i < 10; i++) {
      const problem = generate(level.id);
      if (isAdvanced) {
        eq(problem.concept, level.concept, `${name} 레벨 ${level.id} 문제에는 그 레벨의 개념 설명이 그대로 붙어야 함`);
      } else {
        ok(!problem.concept, `${name} 레벨 ${level.id}(초등) 문제에는 concept 필드가 없어야 함`);
      }
    }
  });
});

// 영어 인증(동/은/금메달) 시험 전용 "단어 - 뜻 짝지어 맞추기" 문제.
// MEDAL_TIERS의 requiredLevel(1/4/7)에 대해서만 존재한다.
{
  const CERT_LEVELS = [1, 4, 7];
  CERT_LEVELS.forEach((level) => {
    const SAMPLES = 30;
    const seenWords = new Set();
    for (let i = 0; i < SAMPLES; i++) {
      const problem = SUBJ.generateEnglishVocabMatchProblem(level);
      eq(problem.level, level, `영어 인증 레벨 ${level} 문제의 level 필드`);
      eq(problem.type, 'choice', `영어 인증 문제는 선택형(단어-뜻 짝짓기)이어야 함`);
      ok(/의 뜻으로 알맞은 것은\?$/.test(problem.question), `영어 인증 레벨 ${level} 문제는 단어-뜻 짝짓기 형식이어야 함: "${problem.question}"`);
      ok(Array.isArray(problem.choices) && problem.choices.length === 4, `영어 인증 레벨 ${level} 선택지는 4개여야 함`);
      ok(problem.choices.includes(problem.answer), `영어 인증 레벨 ${level} choices 안에 answer 포함`);
      ok(new Set(problem.choices).size === 4, `영어 인증 레벨 ${level} 선택지에 중복된 뜻이 없어야 함`);
      ok(P.checkAnswer(problem, problem.answer), `영어 인증 레벨 ${level} 문제는 problems.js checkAnswer로도 정답 처리되어야 함`);
      const word = problem.question.match(/^'(.+)'/)[1];
      seenWords.add(word);
    }
    ok(seenWords.size > 1, `영어 인증 레벨 ${level}은 여러 단어 중에서 무작위로 뽑혀야 함`);
  });

  // askedQuestions를 주면 이미 나온 단어는 한 회차 안에서 반복되지 않아야 한다
  // (은행 크기가 문제 수보다 크므로 항상 피할 수 있음).
  for (let trial = 0; trial < 20; trial++) {
    const asked = [];
    for (let i = 0; i < 5; i++) {
      const problem = SUBJ.generateEnglishVocabMatchProblem(1, asked);
      ok(!asked.includes(problem.question), '영어 인증 시험 한 회차 안에서는 같은 단어가 반복되면 안 됨');
      asked.push(problem.question);
    }
  }
}

// 음악(MUSIC_BANK): "학교 수업" 전용 과목으로, 영어/과학처럼 지능으로
// 해금되는 게 아니라 신분(평민/하위 귀족/상위 귀족)에 따라 학년 단계
// 3개(초등/중학/고등)로만 나뉜다. 그래서 unlockIntelligence나 8단계
// 해금 임계값 검증 없이, 내용 품질(4지선다·정답 포함·힌트 스포일러
// 없음·중복 없음)만 확인한다.
{
  eq(SUBJ.MUSIC_LEVELS.length, 3, '음악은 초등/중학/고등 3단계여야 함');
  SUBJ.MUSIC_LEVELS.forEach((level, idx) => {
    if (idx === 0) {
      ok(!level.concept, '음악 레벨 1(초등)은 concept 설명이 없어야 함');
    } else {
      ok(typeof level.concept === 'string' && level.concept.length > 10, `음악 레벨 ${level.id}(중학교 이상)은 concept 설명이 있어야 함`);
    }
  });

  [1, 2, 3].forEach((level) => {
    const bank = SUBJ.MUSIC_BANK[level];
    const questions = bank.map((q) => q.question);
    const dupes = questions.filter((q, i) => questions.indexOf(q) !== i);
    eq(dupes.length, 0, `음악 레벨 ${level} 문제 은행에 중복 질문이 없어야 함`);

    const seen = [];
    for (let i = 0; i < bank.length; i++) {
      const problem = SUBJ.generateMusicProblem(level);
      eq(problem.level, level, `음악 레벨 ${level} 문제의 level 필드`);
      eq(problem.type, 'choice', '음악 문제는 전부 선택형이어야 함');
      ok(Array.isArray(problem.choices) && problem.choices.length === 4, `음악 레벨 ${level} 선택지는 4개여야 함`);
      ok(problem.choices.includes(problem.answer), `음악 레벨 ${level} choices 안에 answer 포함`);
      ok(P.checkAnswer(problem, problem.answer), `음악 레벨 ${level} 문제는 problems.js checkAnswer로도 정답 처리되어야 함`);
      ok(typeof problem.hint === 'string' && problem.hint.length > 5, `음악 레벨 ${level} 문제에는 풀이 힌트가 있어야 함: "${problem.question}"`);
      ok(!problem.hint.includes(problem.answer), `음악 레벨 ${level} 힌트는 정답(${problem.answer})을 그대로 담고 있으면 안 됨(스포일러 방지): "${problem.hint}"`);
      ok(!seen.includes(problem.question), `음악 레벨 ${level}: 셔플 가방은 은행(${bank.length}개)을 한 바퀴 돌기 전엔 같은 문제를 반복하면 안 됨`);
      seen.push(problem.question);
    }
  });

  // askedQuestions를 명시적으로 넘기면 셔플 가방이 아니라 걸러내고 뽑는 방식이어야 함
  const problem = SUBJ.generateMusicProblem(1, []);
  ok(problem && typeof problem.question === 'string', '음악: askedQuestions=[]를 넘겨도 정상적으로 문제를 돌려줘야 함');
}

summary('subjects.js');
