// game-engine.js(순수 게임 로직) 유닛 테스트. 세션/상태 흐름을 직접 다루는
// 대표적인 함수들이 기대한 대로 state를 바꾸고 결과를 돌려주는지 확인한다.
// 48개월 전체 흐름의 통계적 검증은 test/balance/simulate.js가 담당하고,
// 여기서는 개별 함수 단위의 정확한 동작을 확인한다.
const path = require('path');
const { ok, eq, approx, summary } = require('../helpers/assert');

const BASE = path.join(__dirname, '..', '..');
const P = require(path.join(BASE, 'problems.js'));
const SUBJ = require(path.join(BASE, 'subjects.js'));
const SC = require(path.join(BASE, 'scenarios.js'));
const E = require(path.join(BASE, 'endings.js'));
const { createEngine } = require(path.join(BASE, 'game-engine.js'));

const Engine = createEngine({ P, SUBJ, SC, E });

console.log('game-engine.js unit tests');

/* ---------------- 기본 헬퍼 ---------------- */

eq(Engine.comboMultiplier(0), 1.0, '콤보 0은 배율 1.0');
eq(Engine.comboMultiplier(1), 1.0, '콤보 1은 아직 배율 1.0');
eq(Engine.comboMultiplier(2), 1.2, '콤보 2부터 배율 1.2');
eq(Engine.comboMultiplier(5), 1.6, '콤보 5부터 배율 1.6');
eq(Engine.comboMultiplier(10), 2.2, '콤보 10부터 배율 2.2');
eq(Engine.comboMultiplier(20), 3.0, '콤보 20부터 배율 3.0');

eq(Engine.statTierIndex(0), 0, '스탯 0은 티어 0(Lv1)');
eq(Engine.statTierIndex(9), 0, '스탯 9는 아직 티어 0(Lv1)');
eq(Engine.statTierIndex(10), 1, '스탯 10부터 티어 1(Lv2)');
eq(Engine.statTierIndex(49), 4, '스탯 49는 아직 티어 4(Lv5)');
eq(Engine.statTierIndex(50), 5, '스탯 50부터 티어 5(Lv6)');
eq(Engine.statTierIndex(90), 9, '스탯 90부터 티어 9(Lv10, 최고)');
eq(Engine.statTierIndex(100), 9, '스탯 100(만점)도 티어 9(Lv10)');

/* ---------------- 평민 → 귀족 신분 상승(작위 수여) ---------------- */

{
  // 6개 성장 능력치가 전부 Lv5를 다 채워야(값 50) 승급 자격이 생긴다.
  const state = Engine.makeInitialState();
  ok(!Engine.noblePromotionEligible(state), '초기 상태(모든 능력치 50 미만)에서는 승급 자격이 없어야 함');

  ['intelligence', 'focus', 'stamina', 'charm', 'creativity'].forEach((k) => { state.stats[k] = 50; });
  ok(!Engine.noblePromotionEligible(state), '한 능력치(luck)만 50 미만이어도 승급 자격이 없어야 함');

  state.stats.luck = 50;
  ok(Engine.noblePromotionEligible(state), '성장 능력치 6개가 모두 50 이상이면 승급 자격이 생겨야 함');
}
{
  // 이미 작위를 받았으면 조건을 다시 만족해도 재승급 자격이 생기면 안 된다.
  const state = Engine.makeInitialState();
  ['intelligence', 'focus', 'stamina', 'charm', 'creativity', 'luck'].forEach((k) => { state.stats[k] = 90; });
  state.nobleTitle = '은빛 백작';
  ok(!Engine.noblePromotionEligible(state), '이미 작위를 받았으면 다시 승급 자격이 생기면 안 됨');
}
{
  const state = Engine.makeInitialState();
  ok(Engine.grantNobleTitle(state, '  은빛 백작  '), '유효한 작위명이면 승급이 성공해야 함');
  eq(state.nobleTitle, '은빛 백작', '작위명은 앞뒤 공백이 제거되어 저장되어야 함');
  ok(!Engine.grantNobleTitle(state, '다른 작위'), '이미 작위가 있으면 다시 승급할 수 없어야 함(중복 방지)');
  eq(state.nobleTitle, '은빛 백작', '중복 승급 시도는 기존 작위를 덮어쓰면 안 됨');
}
{
  const state = Engine.makeInitialState();
  ok(!Engine.grantNobleTitle(state, ''), '빈 문자열은 작위로 인정되면 안 됨');
  ok(!Engine.grantNobleTitle(state, '   '), '공백만 있는 문자열도 작위로 인정되면 안 됨');
  eq(state.nobleTitle, null, '유효하지 않은 시도 후에는 nobleTitle이 그대로 null이어야 함');

  const tooLong = '가'.repeat(30);
  Engine.grantNobleTitle(state, tooLong);
  eq(state.nobleTitle.length, 20, '작위명은 너무 길면 20자로 잘려야 함');
}

approx(Engine.graceScore({ charm: 100, creativity: 0, intelligence: 0 }), 40, 0.01, '품위 점수는 매력 가중치 0.4');
approx(Engine.graceScore({ charm: 0, creativity: 100, intelligence: 0 }), 30, 0.01, '품위 점수는 창의력 가중치 0.3');
approx(Engine.graceScore({ charm: 0, creativity: 0, intelligence: 100 }), 30, 0.01, '품위 점수는 지능 가중치 0.3');

{
  const outfit = Engine.currentOutfit({ charm: 0, creativity: 0, intelligence: 0 });
  eq(outfit.tierIndex, 0, '품위 0은 평범한 옷(티어 0)');
}
{
  const outfit = Engine.currentOutfit({ charm: 100, creativity: 100, intelligence: 100 });
  eq(outfit.tierIndex, Engine.OUTFIT_TIERS.length - 1, '품위 만점은 최고 등급 옷');
}

/* ---------------- 상태 생성/이관 ---------------- */

{
  const state = Engine.makeInitialState('테스트');
  eq(state.turn, 1, '초기 상태는 1턴부터 시작');
  eq(state.gold, 0, '초기 골드는 0');
  eq(state.characterName, '테스트', '이름을 지정하면 그대로 반영');
  eq(state.wardrobe.equipped, 0, '초기 착장은 0번(평범한 옷)');
  ok(state.wardrobe.owned[0] === true && state.wardrobe.owned.slice(1).every((o) => o === false), '초기에는 0번 옷만 소유');
  eq(state.npcs.length, Engine.NPC_DEFS.length, '모든 NPC에 대한 상태가 생성됨');
  eq(state.weekPlan.length, Engine.WEEKS_PER_MONTH, 'weekPlan은 한 달 주 수만큼');
}
{
  ok(Engine.NPC_DEFS.every((n) => n.hasArt), '모든 인물에 실제 일러스트가 있어야 함');
}
{
  const state = Engine.makeInitialState('  ');
  eq(state.characterName, '우리 딸', '빈 이름은 기본 이름으로 대체');
}
{
  // 예전 저장 형식(옷장에 owned 배열이 없던 시절)도 최신 형식으로 이관되어야 함
  const migrated = Engine.migrateLoadedState({ turn: 5, wardrobe: { equipped: 2, unlockedMax: 2 } });
  ok(Array.isArray(migrated.wardrobe.owned), 'owned 배열이 새로 생성되어야 함');
  eq(migrated.wardrobe.owned[2], true, 'unlockedMax까지는 소유한 것으로 이관');
  eq(migrated.wardrobe.owned[3], false, 'unlockedMax보다 높은 단계는 소유하지 않음');
  ok(!('unlockedMax' in migrated.wardrobe), '옛 필드는 삭제되어야 함');
  eq(Engine.migrateLoadedState(null), null, '유효하지 않은 저장 데이터는 null');
  eq(Engine.migrateLoadedState({}), null, 'turn이 없는 데이터는 null');
}
{
  // CAREER_DEFS에서 삭제/변경되어 더 이상 존재하지 않는 직업 id가 저장되어
  // 있으면(예: 밸런스 조정으로 직업 id가 바뀐 경우), 영원히 무직 취급도 못 받고
  // 월급도 없이 발이 묶이지 않도록 무직으로 되돌려야 한다.
  const migrated = Engine.migrateLoadedState({ turn: 1, career: 'no-such-career' });
  eq(migrated.career, null, '존재하지 않는 직업 id는 무직(null)으로 되돌려야 함');
  const validCareerId = Engine.CAREER_DEFS[0].id;
  const migratedValid = Engine.migrateLoadedState({ turn: 1, career: validCareerId });
  eq(migratedValid.career, validCareerId, '유효한 직업 id는 그대로 유지되어야 함');
}

/* ---------------- 세션: 정답/오답 반영 ---------------- */

{
  const state = Engine.makeInitialState();
  const session = Engine.startStudySession();
  eq(session.type, 'study', '공부 세션 타입');
  eq(session.count, Engine.QUESTIONS_PER_STUDY, '공부 세션 문제 수');
  ok(Engine.SUBJECT_KEYS.includes(session.fixedSubject), '공부 세션은 시작할 때 과목이 하나 고정되어야 함');

  const fixedSubject = session.fixedSubject;
  for (let i = 0; i < 10; i++) {
    Engine.generateNextProblem(state, session);
    eq(session.currentSubject, fixedSubject, '공부 세션은 문제마다 과목이 바뀌지 않고 고정 과목으로 통일되어야 함');
  }

  const beforeInt = state.stats.intelligence;
  const beforeGold = state.gold;
  Engine.applyCorrect(state, session, { level: 3, rewardGold: 10 });
  ok(state.combo === 1, '정답을 맞히면 콤보가 오름');
  ok(state.stats.intelligence > beforeInt, '공부 정답은 지능을 올림');
  ok(state.gold > beforeGold, '공부 정답은 골드를 줌');
  eq(session.correctCount, 1, '세션의 정답 카운트가 오름');

  Engine.applyWrong(state, session);
  eq(state.combo, 0, '오답을 맞히면 콤보가 초기화됨');
  eq(session.correctCount, 1, '오답은 정답 카운트를 늘리지 않음');
}

/* ---------------- 학습 로그(오답/약점 기록) ---------------- */

{
  const state = Engine.makeInitialState();
  Engine.CERT_SUBJECT_KEYS.forEach((key) => {
    ok(state.learningLog[key], `초기 상태에 ${key} 학습 로그가 있어야 함`);
    eq(JSON.stringify(state.learningLog[key].byLevel), '{}', `초기 상태의 ${key} byLevel은 비어있어야 함`);
    eq(state.learningLog[key].recentMistakes.length, 0, `초기 상태의 ${key} 최근 오답은 비어있어야 함`);
  });
}
{
  // "공부"(study)는 세션이 고정한 과목(session.currentSubject)으로 기록되어야 함
  const state = Engine.makeInitialState();
  const session = Engine.startStudySession();
  session.currentSubject = 'math';
  Engine.applyCorrect(state, session, { level: 3, question: 'Q1', rewardGold: 10 });
  Engine.applyCorrect(state, session, { level: 3, question: 'Q2', rewardGold: 10 });
  Engine.applyWrong(state, session, { level: 3, question: 'Q3 틀린 문제' });
  const mathLog = state.learningLog.math.byLevel[3];
  eq(mathLog.correct, 2, '공부 세션 정답이 그 레벨의 correct 카운트에 쌓여야 함');
  eq(mathLog.wrong, 1, '공부 세션 오답이 그 레벨의 wrong 카운트에 쌓여야 함');
  eq(state.learningLog.math.recentMistakes.length, 1, '오답 문제가 최근 오답 목록에 기록되어야 함');
  eq(state.learningLog.math.recentMistakes[0].question, 'Q3 틀린 문제', '최근 오답에 문제 텍스트가 그대로 기록되어야 함');
  eq(state.learningLog.english.recentMistakes.length, 0, '다른 과목(영어) 로그는 영향받지 않아야 함');
}
{
  // "알바"(job)도 session.currentSubject 기준으로 기록되어야 함
  const state = Engine.makeInitialState();
  const session = Engine.startJobSession();
  session.currentSubject = 'science';
  Engine.applyCorrect(state, session, { level: 1, question: 'JobQ' });
  eq(state.learningLog.science.byLevel[1].correct, 1, '알바 세션도 currentSubject 기준으로 기록되어야 함');
}

/* ---------------- 학교 수업 (수학/과학/음악, 신분에 따른 교사·학년) ---------------- */

// schoolTierForRank: 평민(null)은 초등, 남작~백작(0~2, 하위 귀족)은 중학교,
// 후작~대공(3~5, 상위 귀족)은 고등학교여야 함.
eq(Engine.schoolTierForRank(null), 'elementary', '평민은 초등학교 과정');
eq(Engine.schoolTierForRank(undefined), 'elementary', 'nobleRankIndex 미설정도 평민(초등학교) 취급');
[0, 1, 2].forEach((idx) => eq(Engine.schoolTierForRank(idx), 'middle', `nobleRankIndex ${idx}(하위 귀족)는 중학교 과정`));
[3, 4, 5].forEach((idx) => eq(Engine.schoolTierForRank(idx), 'high', `nobleRankIndex ${idx}(상위 귀족)는 고등학교 과정`));

{
  const state = Engine.makeInitialState();
  const session = Engine.startSchoolSession(state, 5);
  eq(session.type, 'school', '학교 수업 세션 타입');
  eq(session.count, 5, '학교 수업 세션 문제 수');
  ok(Engine.SCHOOL_SUBJECT_KEYS.includes(session.fixedSubject), '학교 수업 세션은 시작할 때 과목(수학/과학/음악)이 하나 고정되어야 함');
  eq(session.schoolTier, 'elementary', '평민 상태로 시작하면 초등학교 과정이어야 함');
  eq(session.helperNpc, 'teacher', '평민은 선생님이 가르쳐야 함');

  const fixedSubject = session.fixedSubject;
  const seenLevels = new Set();
  for (let i = 0; i < 20; i++) {
    const problem = Engine.generateNextProblem(state, session);
    eq(session.currentSubject, fixedSubject, '학교 수업은 문제마다 과목이 바뀌지 않고 고정 과목으로 통일되어야 함');
    seenLevels.add(problem.level);
  }
  const elementaryRanges = { math: [1, 2], science: [1, 2, 3], music: [1] };
  seenLevels.forEach((lv) => {
    ok(elementaryRanges[fixedSubject].includes(lv), `평민(초등학교) 학교 수업의 ${fixedSubject} 레벨은 ${elementaryRanges[fixedSubject].join(',')} 중 하나여야 함(실제: ${lv})`);
  });
}

{
  // 하위 귀족(남작, index 0)은 중학교 과정 + 왕궁 학자
  const state = Engine.makeInitialState();
  state.nobleTitle = '테스트 남작';
  state.nobleRankIndex = 0;
  const session = Engine.startSchoolSession(state, 6);
  eq(session.schoolTier, 'middle', '하위 귀족은 중학교 과정이어야 함');
  eq(session.helperNpc, 'royalScholar', '귀족(하위 포함)은 왕궁 학자가 가르쳐야 함');
  const middleRanges = { math: [3, 4, 5], science: [4, 5, 6], music: [2] };
  for (let i = 0; i < 20; i++) {
    const problem = Engine.generateNextProblem(state, session);
    ok(middleRanges[session.fixedSubject].includes(problem.level), `하위 귀족(중학교) 학교 수업의 ${session.fixedSubject} 레벨은 ${middleRanges[session.fixedSubject].join(',')} 중 하나여야 함(실제: ${problem.level})`);
  }
}

{
  // 상위 귀족(대공, index 5)은 고등학교 과정 + 왕궁 학자
  const state = Engine.makeInitialState();
  state.nobleTitle = '테스트 대공';
  state.nobleRankIndex = 5;
  const session = Engine.startSchoolSession(state, 6);
  eq(session.schoolTier, 'high', '상위 귀족은 고등학교 과정이어야 함');
  eq(session.helperNpc, 'royalScholar', '상위 귀족도 왕궁 학자가 가르쳐야 함');
  const highRanges = { math: [6, 7, 8, 9], science: [7], music: [3] };
  for (let i = 0; i < 20; i++) {
    const problem = Engine.generateNextProblem(state, session);
    ok(highRanges[session.fixedSubject].includes(problem.level), `상위 귀족(고등학교) 학교 수업의 ${session.fixedSubject} 레벨은 ${highRanges[session.fixedSubject].join(',')} 중 하나여야 함(실제: ${problem.level})`);
  }
}

{
  // 학교 수업의 보상/오답 페널티는 공부(study)와 같은 공식을 써야 한다.
  const state = Engine.makeInitialState();
  const session = Engine.startSchoolSession(state, 4);
  session.fixedSubject = 'math';
  session.currentSubject = 'math';
  const beforeInt = state.stats.intelligence;
  const beforeGold = state.gold;
  Engine.applyCorrect(state, session, { level: 3, rewardGold: 10, question: 'SchoolQ' });
  ok(state.stats.intelligence > beforeInt, '학교 수업 정답은 지능을 올려야 함(공부와 동일한 보상 공식)');
  ok(state.gold > beforeGold, '학교 수업 정답은 골드를 줘야 함');
  eq(state.learningLog.math.byLevel[3].correct, 1, '학교 수업(수학)도 learningLog.math에 기록되어야 함');

  Engine.applyWrong(state, session, { level: 3, question: 'SchoolWrongQ' });
  eq(state.learningLog.math.recentMistakes[0].question, 'SchoolWrongQ', '학교 수업 오답도 최근 오답 목록에 기록되어야 함');
}

{
  // 학교 수업(음악)은 learningLog에 없는 과목이라 조용히 무시되어야 함(에러 없이)
  const state = Engine.makeInitialState();
  const session = Engine.startSchoolSession(state, 4);
  session.fixedSubject = 'music';
  session.currentSubject = 'music';
  Engine.applyCorrect(state, session, { level: 1, rewardGold: 10, question: 'MusicQ' });
  eq(session.correctCount, 1, '음악 학교 수업도 정답 카운트는 정상적으로 올라야 함');
}

{
  const session = Engine.startSchoolSession(Engine.makeInitialState(), 4);
  const outcome = Engine.finishStudyOrJobOutcome(session);
  eq(outcome.title, '학교 수업을 마쳤어요!', '학교 수업 종료 문구');
}
{
  // 왕국 수학경시대회(competition)는 항상 수학으로 기록되어야 함
  const state = Engine.makeInitialState();
  const session = Engine.startCompetitionSession(state, 5);
  Engine.applyCorrect(state, session, { level: 2, question: 'CompQ' });
  eq(state.learningLog.math.byLevel[2].correct, 1, '경시대회는 항상 수학 학습 로그에 기록되어야 함');
}
{
  // 기초 과목 인증 시험(cert-exam)은 session.subject 기준으로 기록되어야 함
  const state = Engine.makeInitialState();
  const session = Engine.startCertExamSession(state, 'english');
  Engine.applyWrong(state, session, { level: 1, question: 'CertQ' });
  eq(state.learningLog.english.byLevel[1].wrong, 1, '인증 시험은 session.subject 기준으로 기록되어야 함');
}
{
  // 연회/창의력/기도와 선행처럼 과목·레벨 구조가 없는 활동은 기록되면 안 됨
  const state = Engine.makeInitialState();
  const banquetSession = Engine.startBanquetSession('tea-party');
  Engine.applyCorrect(state, banquetSession, { level: 0, question: 'EtiquetteQ' });
  const creativitySession = Engine.startCreativitySession(3);
  Engine.applyCorrect(state, creativitySession, { level: 0, question: 'CreativityQ' });
  const faithSession = Engine.startFaithSession();
  Engine.applyCorrect(state, faithSession, { level: 0, question: 'FaithQ' });
  Engine.CERT_SUBJECT_KEYS.forEach((key) => {
    eq(JSON.stringify(state.learningLog[key].byLevel), '{}', `연회/창의력/기도와 선행은 ${key} 학습 로그에 기록되면 안 됨`);
  });
}
{
  // 최근 오답 목록은 RECENT_MISTAKES_LIMIT개까지만, 최신순으로 유지되어야 함
  const state = Engine.makeInitialState();
  const session = Engine.startStudySession();
  session.currentSubject = 'math';
  for (let i = 0; i < Engine.RECENT_MISTAKES_LIMIT + 5; i++) {
    Engine.applyWrong(state, session, { level: 1, question: `mistake-${i}` });
  }
  eq(state.learningLog.math.recentMistakes.length, Engine.RECENT_MISTAKES_LIMIT, `최근 오답은 최대 ${Engine.RECENT_MISTAKES_LIMIT}개까지만 유지되어야 함`);
  eq(state.learningLog.math.recentMistakes[0].question, `mistake-${Engine.RECENT_MISTAKES_LIMIT + 4}`, '가장 최근 오답이 목록 맨 앞이어야 함');
}
{
  // 옛 저장 형식(learningLog 필드 자체가 없던 시절)도 최신 형식으로 이관되어야 함
  const migrated = Engine.migrateLoadedState({ turn: 5 });
  Engine.CERT_SUBJECT_KEYS.forEach((key) => {
    ok(migrated.learningLog[key], `learningLog가 없던 저장도 ${key} 로그가 새로 생성되어야 함`);
    ok(Array.isArray(migrated.learningLog[key].recentMistakes), `${key} recentMistakes는 배열이어야 함`);
  });

  // 일부만 손상된 경우(예: byLevel이 배열로 잘못 저장됨)도 정상화되어야 함
  const corrupted = Engine.migrateLoadedState({ turn: 5, learningLog: { math: { byLevel: [], recentMistakes: null } } });
  eq(JSON.stringify(corrupted.learningLog.math.byLevel), '{}', '손상된 byLevel은 빈 객체로 정상화되어야 함');
  eq(corrupted.learningLog.math.recentMistakes.length, 0, '손상된 recentMistakes는 빈 배열로 정상화되어야 함');
  ok(corrupted.learningLog.english, '일부 과목만 있던 저장도 나머지 과목 로그가 채워져야 함');
}

/* ---------------- 반복 오답 감지(isRepeatMistake) ---------------- */
// 같은 문제를 예전에도 틀렸는지 확인해, UI가 매번 같은 일반 힌트 대신
// "이 문제 전에도 틀렸었죠?" 같은 맞춤 피드백을 보여줄 수 있게 한다.

{
  const state = Engine.makeInitialState();
  const session = Engine.startStudySession();
  session.currentSubject = 'math';
  const problem = { level: 3, question: '3 + 4 = ?' };
  ok(!Engine.isRepeatMistake(state, session, problem), '한 번도 틀린 적 없는 문제는 반복 오답이 아니어야 함');

  Engine.applyWrong(state, session, problem);
  // 새 세션(다음 주 "공부")에서 같은 문제가 다시 나왔다고 가정
  const nextSession = Engine.startStudySession();
  nextSession.currentSubject = 'math';
  ok(Engine.isRepeatMistake(state, nextSession, problem), '전에 틀렸던 문제가 다시 나오면 반복 오답으로 감지되어야 함');
  ok(!Engine.isRepeatMistake(state, nextSession, { level: 3, question: '전혀 다른 문제' }), '다른 문제는 반복 오답이 아니어야 함');
}
{
  // applyWrong이 기록을 남기기 "전"에 확인해야 정확하다 — 기록 직후 같은
  // 세션에서 곧바로 확인하면 방금 자기 자신을 기록과 비교해 항상 true가
  // 되어버리는 순서 버그를 방지하기 위한 계약 테스트.
  const state = Engine.makeInitialState();
  const session = Engine.startStudySession();
  session.currentSubject = 'math';
  const problem = { level: 1, question: '처음 틀리는 문제' };
  const before = Engine.isRepeatMistake(state, session, problem);
  Engine.applyWrong(state, session, problem);
  ok(!before, 'applyWrong 호출 전에 확인하면 첫 오답은 반복이 아니어야 함');
}
{
  // 정답만 맞혔을 뿐 틀린 적 없는 문제는 반복 오답이 아니어야 함
  const state = Engine.makeInitialState();
  const session = Engine.startStudySession();
  session.currentSubject = 'math';
  const problem = { level: 2, question: '항상 맞히는 문제' };
  Engine.applyCorrect(state, session, problem);
  ok(!Engine.isRepeatMistake(state, session, problem), '틀린 적 없이 정답만 맞힌 문제는 반복 오답이 아니어야 함');
}
{
  // 연회/창의력/기도와 선행처럼 과목·레벨 구조가 없는 활동은 애초에 기록이
  // 안 되므로 반복 오답도 항상 false여야 함
  const state = Engine.makeInitialState();
  const banquetSession = Engine.startBanquetSession('tea-party');
  const problem = { level: 0, question: 'EtiquetteQ' };
  Engine.applyWrong(state, banquetSession, problem);
  ok(!Engine.isRepeatMistake(state, banquetSession, problem), '과목 구조가 없는 활동은 반복 오답 감지 대상이 아니어야 함');
}

{
  // 은행: 세션 도중이 아니라 세션이 끝날 때 한 번에 매력치를 반영(finishBanquetOutcome)
  // 왕자님은 최고 등급(고급 사교 모임)에서만 만날 수 있음
  const state = Engine.makeInitialState();
  state.wardrobe.equipped = Engine.PRINCE_MIN_TIER;
  const session = Engine.startBanquetSession('grand-social');
  for (let i = 0; i < Engine.BANQUET_PASS_COUNT; i++) {
    Engine.applyCorrect(state, session, { rewardGold: 0 });
  }
  const outcome = Engine.finishBanquetOutcome(state, session);
  eq(outcome.result, 'met-prince', '최고 등급에서 입장 조건(옷차림)을 갖추고 통과 기준을 채우면 왕자님을 만남');

  const princeState = state.npcs.find((n) => n.id === 'prince');
  ok(princeState.affection > 0, '왕자님과 만나면 호감도가 오름');
}

{
  // 옷차림 미달이면 최고 등급에서 통과해도 왕자님을 만나지 못함
  const state = Engine.makeInitialState();
  state.wardrobe.equipped = 0;
  const session = Engine.startBanquetSession('grand-social');
  for (let i = 0; i < Engine.BANQUET_PASS_COUNT; i++) {
    Engine.applyCorrect(state, session, { rewardGold: 0 });
  }
  const outcome = Engine.finishBanquetOutcome(state, session);
  eq(outcome.result, 'success-underdressed', '최고 등급에서 통과해도 옷차림이 부족하면 왕자님을 만나지 못함');
}

/* ---------------- 상점/옷장 ---------------- */

{
  const state = Engine.makeInitialState();
  state.gold = 1000;
  const item = Engine.ITEMS[0];
  ok(Engine.buyItem(state, item.id), '골드가 충분하면 구매 성공');
  eq(state.gold, 1000 - item.cost, '구매하면 골드가 차감됨');
  ok(!Engine.buyItem(state, item.id), '이미 산 아이템은 다시 살 수 없음');

  state.gold = 0;
  ok(!Engine.buyItem(state, Engine.ITEMS[1].id), '골드가 부족하면 구매 실패');
}

{
  const state = Engine.makeInitialState();
  state.gold = 10000;
  state.stats.charm = 40; // grace = 40*.4 = 16 + 기본 지능/창의력 몫 => tier1(25) 이상
  ok(Engine.buyOutfit(state, 1), '골드와 품위가 충분하면 옷 구매 성공');
  eq(state.wardrobe.equipped, 1, '옷을 사면 바로 갈아입음');
  ok(state.wardrobe.owned[1], '산 옷은 소유 목록에 표시됨');
  ok(!Engine.buyOutfit(state, 1), '이미 산 옷은 다시 살 수 없음');

  ok(Engine.equipOutfit(state, 0), '이미 소유한(0번) 옷은 다시 갈아입을 수 있음');
  eq(state.wardrobe.equipped, 0, '갈아입으면 착장이 바뀜');
  ok(!Engine.equipOutfit(state, 3), '소유하지 않은 옷은 입을 수 없음');
}
{
  // 품위는 충분해도 골드가 부족하면 여전히 구매할 수 없어야 함(회귀 확인)
  const state = Engine.makeInitialState();
  state.stats.charm = 40;
  state.gold = 0;
  ok(!Engine.buyOutfit(state, 1), '품위가 충분해도 골드가 부족하면 구매 실패');
}
{
  // 품위가 부족하면 골드가 아무리 많아도 구매할 수 없어야 함(engine 레벨에서도 강제)
  const state = Engine.makeInitialState();
  state.gold = 100000;
  ok(!Engine.outfitRequirementMet(state, 1), '기본 상태(품위 부족)에서는 tier1 요건을 만족하지 못해야 함');
  ok(!Engine.buyOutfit(state, 1), '품위가 부족하면 골드가 충분해도 구매할 수 없어야 함');
}

/* ---------------- 귀족 전용 옷(tier 3 이상) ---------------- */

{
  const state = Engine.makeInitialState();
  state.gold = 100000;
  state.stats.charm = 100;
  state.stats.creativity = 100;
  state.stats.intelligence = 100; // grace = 100(만점)
  ok(Engine.outfitRequirementMet(state, 2), '예쁜 드레스(tier2)는 귀족이 아니어도 품위만 충분하면 구매 가능해야 함');
  ok(!Engine.outfitRequirementMet(state, 3), '공주 드레스(tier3)는 품위가 만점이어도 귀족 신분이 없으면 구매 불가해야 함');
  ok(!Engine.buyOutfit(state, 3), '귀족이 아니면 골드/품위가 충분해도 tier3 구매가 막혀야 함');
  eq(state.wardrobe.owned[3], false, '구매가 막혔으면 소유 목록에 기록되면 안 됨');

  ok(Engine.grantNobleTitle(state, '은빛 백작'), '작위를 받으면');
  ok(Engine.outfitRequirementMet(state, 3), '귀족 신분을 얻으면 tier3 요건을 만족해야 함');
  ok(Engine.buyOutfit(state, 3), '귀족이 되면 공주 드레스를 구매할 수 있어야 함');
  eq(state.wardrobe.equipped, 3, '구매하면 바로 갈아입어야 함');
}
{
  // 왕자님을 만나는 데 필요한 최소 등급(PRINCE_MIN_TIER=2)은 귀족 전용
  // 등급보다 낮아야 한다 — 왕자님 루트 자체가 귀족 신분을 요구하면 안 됨.
  ok(Engine.PRINCE_MIN_TIER < 3, 'PRINCE_MIN_TIER는 귀족 전용 등급(tier3)보다 낮아야 함(왕자님 루트 영향 없음 보장)');
  ok(!Engine.OUTFIT_TIERS[Engine.PRINCE_MIN_TIER].requiresNoble, '왕자님을 만나는 데 필요한 등급 자체는 귀족 신분을 요구하면 안 됨');
}
{
  // 품위가 이미 tier3+ 기준을 넘었어도 귀족이 아니면 "구매 가능!" 알림이
  // 뜨면 안 되고, 귀족이 된 순간에야 그 등급 알림이 떠야 한다.
  const state = Engine.makeInitialState();
  state.stats.charm = 100;
  state.stats.creativity = 100;
  state.stats.intelligence = 100;
  const beforeNoble = Engine.checkWardrobeGraceNotification(state);
  eq(beforeNoble && beforeNoble.name, '예쁜 드레스', '귀족이 아니면 품위 만점이어도 귀족 전용이 아닌 마지막 등급(예쁜 드레스)까지만 알림 대상이어야 함');
  eq(Engine.checkWardrobeGraceNotification(state), null, '같은 등급은 두 번 알리지 않아야 함');

  Engine.grantNobleTitle(state, '루비 자작');
  const afterNoble = Engine.checkWardrobeGraceNotification(state);
  eq(afterNoble && afterNoble.name, '대관식 드레스', '귀족이 되는 순간, 품위가 이미 충족된 최고 등급까지 한 번에 알림이 떠야 함');
}

/* ---------------- 작위 세분화(NOBLE_RANKS) ---------------- */

{
  eq(Engine.NOBLE_RANKS.length, 6, '작위는 남작~대공 6단계여야 함');
  const names = Engine.NOBLE_RANKS.map((r) => r.name);
  eq(JSON.stringify(names), JSON.stringify(['남작', '자작', '백작', '후작', '공작', '대공']), '작위 이름 순서는 남작→자작→백작→후작→공작→대공이어야 함');
  const thresholds = Engine.NOBLE_RANKS.map((r) => r.minAllStats);
  eq(JSON.stringify(thresholds), JSON.stringify([50, 60, 70, 80, 90, 100]), '작위 문턱은 기존 Lv 문턱(50/60/70/80/90/100)과 같아야 함');
}
{
  const state = Engine.makeInitialState();
  eq(state.nobleRankIndex, null, '초기(평민) 상태의 nobleRankIndex는 null이어야 함');
  eq(Engine.nextNobleRank(state), null, '평민은 nextNobleRank도 null이어야 함(승급 이벤트를 먼저 거쳐야 함)');

  ok(Engine.grantNobleTitle(state, '은빛 백작'), '첫 승급(작위 수여)');
  eq(state.nobleRankIndex, 0, '첫 승급은 항상 남작(인덱스 0)에서 시작해야 함');
  eq(Engine.nextNobleRank(state).name, '자작', '남작 다음 목표는 자작이어야 함');

  eq(Engine.checkNobleRankPromotion(state), null, '아직 능력치가 자작 문턱(60)에 못 미치면 승급하면 안 됨');
  eq(state.nobleRankIndex, 0, '승급 실패 시 인덱스가 그대로여야 함');

  Engine.GROWTH_STAT_KEYS.forEach((k) => { state.stats[k] = 60; });
  const promoted = Engine.checkNobleRankPromotion(state);
  eq(promoted && promoted.name, '자작', '6개 성장 능력치가 전부 60에 도달하면 자작으로 승급해야 함');
  eq(state.nobleRankIndex, 1, '승급하면 인덱스가 1(자작)로 올라가야 함');
  eq(Engine.checkNobleRankPromotion(state), null, '이미 승급했으면 같은 문턱에서 다시 승급하면 안 됨');

  Engine.GROWTH_STAT_KEYS.forEach((k) => { state.stats[k] = 100; });
  ok(Engine.checkNobleRankPromotion(state), '능력치가 만점이면 한 단계씩 계속 승급할 수 있어야 함(1회 호출 = 1단계)');
  ok(Engine.checkNobleRankPromotion(state), '계속 호출하면 계속 승급해야 함');
  ok(Engine.checkNobleRankPromotion(state), '계속 호출하면 계속 승급해야 함');
  ok(Engine.checkNobleRankPromotion(state), '계속 호출하면 계속 승급해야 함');
  eq(state.nobleRankIndex, 5, '만점이면 결국 최고위(대공, 인덱스5)까지 승급해야 함');
  eq(Engine.checkNobleRankPromotion(state), null, '최고위에 도달하면 더 이상 승급할 곳이 없어야 함');
  eq(Engine.nextNobleRank(state), null, '최고위에서는 nextNobleRank도 null이어야 함');
}
{
  // 옛 저장 형식(작위 세분화 이전, nobleRankIndex 필드 자체가 없던 시절)도
  // 최신 형식으로 이관되어야 한다 — 이미 귀족이었다면 최소 남작으로,
  // 능력치가 이미 더 높은 문턱을 넘었다면 그 작위로 곧바로 승격시킨다.
  const highStats = { intelligence: 65, focus: 65, stamina: 65, charm: 65, creativity: 65, luck: 65, stress: 10 };
  const migrated = Engine.migrateLoadedState({ turn: 10, nobleTitle: '옛날 귀족', stats: highStats });
  eq(migrated.nobleRankIndex, 1, '능력치가 이미 자작 문턱(60)은 넘었지만 백작 문턱(70)엔 못 미치면 자작으로 이관되어야 함');

  const commoner = Engine.migrateLoadedState({ turn: 10, nobleTitle: null, stats: highStats });
  eq(commoner.nobleRankIndex, null, '평민이었다면 능력치가 아무리 높아도 nobleRankIndex는 null이어야 함');

  // 이미 유효한 nobleRankIndex가 있으면 그대로 유지되어야 함(불필요하게 재계산해 덮어쓰지 않음)
  const alreadySet = Engine.migrateLoadedState({ turn: 10, nobleTitle: '기존 귀족', nobleRankIndex: 0, stats: highStats });
  eq(alreadySet.nobleRankIndex, 0, '이미 유효한 nobleRankIndex는 능력치가 더 높아도 그대로 유지되어야 함(자동 재계산은 마이그레이션 1회성 보정용)');
}

/* ---------------- 작위 세분화에 따른 상위 예복(tier 6 이상) ---------------- */

{
  eq(Engine.OUTFIT_TIERS.length, 11, '옷은 기존 6단계 + 작위별 예복 5단계 = 총 11단계여야 함');
  ok(Engine.OUTFIT_TIERS.every((t) => t.hasArt), '모든 옷에 실제 일러스트가 있어야 함');
  const state = Engine.makeInitialState();
  state.gold = 1000000;
  state.stats.charm = 100;
  state.stats.creativity = 100;
  state.stats.intelligence = 100; // grace = 100(만점), tier6~10은 모두 품위 요건은 충족
  Engine.grantNobleTitle(state, '세분화 테스트'); // nobleRankIndex = 0(남작)

  ok(!Engine.outfitRequirementMet(state, 6), '남작은 자작 예복(tier6)을 살 수 없어야 함');
  ok(!Engine.buyOutfit(state, 6), '작위가 부족하면 골드/품위가 충분해도 tier6 구매가 막혀야 함');

  for (let rank = 1; rank <= 5; rank++) {
    const tierIndex = rank + 5; // rank1(자작)→tier6, rank5(대공)→tier10
    // charm/creativity/intelligence는 품위(grace) 계산에도 쓰이므로, 문턱값으로
    // 내리지 않고 max로만 올려서 품위 100을 계속 유지한 채 작위 문턱만 검증한다.
    Engine.GROWTH_STAT_KEYS.forEach((k) => { state.stats[k] = Math.max(state.stats[k], Engine.NOBLE_RANKS[rank].minAllStats); });
    const promoted = Engine.checkNobleRankPromotion(state);
    eq(promoted.name, Engine.NOBLE_RANKS[rank].name, `단계별로 ${Engine.NOBLE_RANKS[rank].name}까지 승급해야 함`);
    ok(Engine.outfitRequirementMet(state, tierIndex), `${Engine.NOBLE_RANKS[rank].name}이 되면 tier${tierIndex}(${Engine.OUTFIT_TIERS[tierIndex].name}) 요건을 만족해야 함`);
    ok(Engine.buyOutfit(state, tierIndex), `${Engine.NOBLE_RANKS[rank].name}이 되면 tier${tierIndex}를 구매할 수 있어야 함`);
    eq(state.wardrobe.equipped, tierIndex, '구매하면 바로 갈아입어야 함');
    if (tierIndex < 10) {
      ok(!Engine.outfitRequirementMet(state, tierIndex + 1), `아직 ${Engine.OUTFIT_TIERS[tierIndex + 1].name}(tier${tierIndex + 1})은 요건을 만족하면 안 됨`);
    }
  }
}

/* ---------------- 애완동물 ---------------- */
// 옷장(구매/장착/품위 요건/알림/귀족 게이트)과 거의 같은 테스트를 그대로
// 반복한다 — 애완동물이 옷장과 동일한 규칙으로 설계되었기 때문이다. 다른
// 점은 기본으로 소유/장착한 펫이 없다는 것뿐이다.

{
  const state = Engine.makeInitialState();
  eq(state.pets.equipped, null, '초기에는 장착한 펫이 없어야 함');
  ok(Engine.PET_TIERS.every((_, i) => state.pets.owned[i] === false), '초기에는 소유한 펫이 하나도 없어야 함(옷과 달리 기본 펫이 없음)');
  eq(state.pets.owned.length, Engine.PET_TIERS.length, 'owned 배열 길이는 PET_TIERS 개수와 같아야 함');
}
{
  // 옛 저장 형식(pets 필드 자체가 없던 시절)도 최신 형식으로 이관되어야 함
  const migrated = Engine.migrateLoadedState({ turn: 5 });
  ok(Array.isArray(migrated.pets.owned) && migrated.pets.owned.length === Engine.PET_TIERS.length, 'pets 필드가 없던 저장도 owned 배열이 새로 생성되어야 함');
  eq(migrated.pets.equipped, null, '옛 저장에는 장착한 펫이 없어야 함');

  // owned 배열이 손상돼(길이가 안 맞게) 저장된 경우도 정상화되어야 함
  const corrupted = Engine.migrateLoadedState({ turn: 5, pets: { owned: [true], equipped: 0 } });
  eq(corrupted.pets.owned.length, Engine.PET_TIERS.length, '길이가 안 맞는 owned 배열은 새로 초기화되어야 함');
  eq(corrupted.pets.equipped, null, 'owned가 초기화되면 equipped도 null로 되돌려야 함(소유하지 않은 걸 장착한 상태 방지)');

  // equipped가 실제로 소유하지 않은 tier를 가리키면 null로 되돌려야 함
  const owned = Engine.PET_TIERS.map(() => false);
  owned[1] = true;
  const dangling = Engine.migrateLoadedState({ turn: 5, pets: { owned, equipped: 3 } });
  eq(dangling.pets.equipped, null, '소유하지 않은 tier를 장착 중이라고 하면 null로 되돌려야 함');
  const valid = Engine.migrateLoadedState({ turn: 5, pets: { owned, equipped: 1 } });
  eq(valid.pets.equipped, 1, '실제로 소유한 tier를 장착 중이면 그대로 유지되어야 함');
}
{
  const state = Engine.makeInitialState();
  state.gold = 10000;
  state.stats.charm = 40; // grace = 16 + 기본 지능/창의력 몫 => tier0(0)~tier1(15) 요건은 충족
  ok(Engine.buyPet(state, 0), '골드와 품위가 충분하면 펫 구매 성공');
  eq(state.pets.equipped, 0, '펫을 사면 바로 함께하게 됨');
  ok(state.pets.owned[0], '산 펫은 소유 목록에 표시됨');
  ok(!Engine.buyPet(state, 0), '이미 데려온 펫은 다시 살 수 없음');

  ok(Engine.buyPet(state, 1), '두 번째 펫도 조건을 만족하면 살 수 있음');
  eq(state.pets.equipped, 1, '새 펫을 사면 그 펫으로 장착이 바뀜');
  ok(Engine.equipPet(state, 0), '이미 소유한 펫으로 다시 장착을 바꿀 수 있음');
  eq(state.pets.equipped, 0, '장착을 바꾸면 실제로 바뀜');
  ok(!Engine.equipPet(state, 3), '소유하지 않은 펫은 장착할 수 없음');
}
{
  // 품위는 충분해도 골드가 부족하면 여전히 구매할 수 없어야 함
  const state = Engine.makeInitialState();
  state.stats.charm = 40;
  state.gold = 0;
  ok(!Engine.buyPet(state, 0), '골드가 부족하면 구매 실패');
}
{
  // 품위가 부족하면 골드가 아무리 많아도 구매할 수 없어야 함(engine 레벨에서도 강제)
  const state = Engine.makeInitialState();
  state.gold = 100000;
  ok(!Engine.petRequirementMet(state, 3), '기본 상태(품위 부족)에서는 tier3(여우, 품위 50) 요건을 만족하지 못해야 함');
  ok(!Engine.buyPet(state, 3), '품위가 부족하면 골드가 충분해도 구매할 수 없어야 함');
}

/* ---------------- 귀족 전용 펫(tier 4 이상) ---------------- */

{
  const state = Engine.makeInitialState();
  state.gold = 100000;
  state.stats.charm = 100;
  state.stats.creativity = 100;
  state.stats.intelligence = 100; // grace = 100(만점)
  ok(Engine.petRequirementMet(state, 3), '여우(tier3)는 귀족이 아니어도 품위만 충분하면 데려올 수 있어야 함');
  ok(!Engine.petRequirementMet(state, 4), '공작새(tier4)는 품위가 만점이어도 귀족 신분이 없으면 데려올 수 없어야 함');
  ok(!Engine.buyPet(state, 4), '귀족이 아니면 골드/품위가 충분해도 tier4 구매가 막혀야 함');
  eq(state.pets.owned[4], false, '구매가 막혔으면 소유 목록에 기록되면 안 됨');

  ok(Engine.grantNobleTitle(state, '은빛 백작'), '작위를 받으면');
  ok(Engine.petRequirementMet(state, 4), '귀족 신분을 얻으면 tier4 요건을 만족해야 함');
  ok(Engine.buyPet(state, 4), '귀족이 되면 공작새를 데려올 수 있어야 함');
  eq(state.pets.equipped, 4, '구매하면 바로 함께하게 되어야 함');
}
{
  const state = Engine.makeInitialState();
  state.stats.charm = 100;
  state.stats.creativity = 100;
  state.stats.intelligence = 100;
  const beforeNoble = Engine.checkPetGraceNotification(state);
  eq(beforeNoble && beforeNoble.name, '여우', '귀족이 아니면 품위 만점이어도 귀족 전용이 아닌 마지막 등급(여우)까지만 알림 대상이어야 함');
  eq(Engine.checkPetGraceNotification(state), null, '같은 등급은 두 번 알리지 않아야 함');

  Engine.grantNobleTitle(state, '루비 자작');
  const afterNoble = Engine.checkPetGraceNotification(state);
  eq(afterNoble && afterNoble.name, '유니콘', '귀족이 되는 순간, 품위가 이미 충족된 최고 등급까지 한 번에 알림이 떠야 함');
}
{
  // 펫을 장착하고 있으면 매턴(applyServantEffects) 자동으로 스트레스가
  // 줄어들어야 한다(하녀/정원사와 같은 훅).
  const state = Engine.makeInitialState();
  state.stats.stress = 50;
  state.gold = 10000;
  ok(Engine.buyPet(state, 0), '강아지 구매');
  const stressBefore = state.stats.stress;
  Engine.applyServantEffects(state);
  ok(state.stats.stress < stressBefore, '펫을 장착 중이면 매턴 스트레스가 줄어야 함');

  const noPetState = Engine.makeInitialState();
  noPetState.stats.stress = 50;
  Engine.applyServantEffects(noPetState);
  eq(noPetState.stats.stress, 50, '펫이 없으면 스트레스가 그대로여야 함');
}
{
  eq(Engine.PET_TIERS.length, 8, '애완동물은 총 8단계(요정 고양이 포함)여야 함');
  const requiresNoble = Engine.PET_TIERS.map((t) => !!t.requiresNoble);
  eq(JSON.stringify(requiresNoble), JSON.stringify([false, false, false, false, true, true, true, true]), '상위 4단계(공작새/백마/유니콘/요정 고양이)만 귀족 신분을 요구해야 함');
  ok(Engine.PET_TIERS.every((t) => t.stressRelief > 0), '모든 펫은 스트레스 완화 효과가 있어야 함');
  ok(Engine.PET_TIERS.every((t) => t.hasArt), '모든 펫에 실제 일러스트가 있어야 함');
}
{
  // 요정 고양이(tier7)는 유니콘(tier6)보다도 희귀해야 한다 — 유니콘은
  // "귀족이기만 하면" 되지만, 요정 고양이는 최고위 작위(대공)까지 요구한다.
  const state = Engine.makeInitialState();
  state.gold = 1000000;
  state.stats.charm = 100;
  state.stats.creativity = 100;
  state.stats.intelligence = 100; // grace = 100(만점)
  Engine.grantNobleTitle(state, '희귀 펫 테스트'); // 남작(인덱스 0)
  ok(Engine.petRequirementMet(state, 6), '유니콘(tier6)은 남작이어도 살 수 있어야 함');
  ok(!Engine.petRequirementMet(state, 7), '요정 고양이(tier7)는 남작으로는 살 수 없어야 함');
  ok(!Engine.buyPet(state, 7), '작위가 부족하면 골드/품위가 충분해도 요정 고양이 구매가 막혀야 함');

  Engine.GROWTH_STAT_KEYS.forEach((k) => { state.stats[k] = Math.max(state.stats[k], 100); });
  for (let i = 0; i < 5; i++) Engine.checkNobleRankPromotion(state); // 남작 -> ... -> 대공
  eq(state.nobleRankIndex, 5, '테스트 준비: 대공까지 승급되어야 함');
  ok(Engine.petRequirementMet(state, 7), '대공이 되면 요정 고양이 요건을 만족해야 함');
  ok(Engine.buyPet(state, 7), '대공이 되면 요정 고양이를 데려올 수 있어야 함');
  eq(state.pets.equipped, 7, '구매하면 바로 함께하게 되어야 함');
}

/* ---------------- 연회 입장 게이트(사교모임 3단계) ---------------- */

{
  eq(Engine.BANQUET_TIERS.length, 3, '사교모임은 작은 다과회/사교 모임/고급 사교 모임 3단계여야 함');
  const [teaParty, social, grandSocial] = Engine.BANQUET_TIERS;
  eq(grandSocial.requiredEnglishMedal, 'silver', '고급 사교 모임은 영어 은메달 이상을 요구해야 함');
  eq(teaParty.requiredEnglishMedal, null, '작은 다과회는 영어 인증을 요구하지 않아야 함');
  eq(social.requiredEnglishMedal, null, '사교 모임은 영어 인증을 요구하지 않아야 함');
}
{
  // 가장 낮은 등급(작은 다과회)은 옷차림/품위 요건이 없어서 골드만 있으면 바로 입장 가능
  const state = Engine.makeInitialState();
  state.gold = 1000;
  const result = Engine.tryStartBanquet(state, 'tea-party');
  eq(result.ok, true, '작은 다과회는 초기 상태에서도 골드만 있으면 입장 가능해야 함');
  eq(state.gold, 1000 - Engine.BANQUET_TIERS[0].entryFee, '입장하면 그 등급의 입장료가 차감되어야 함');
}
{
  // 중간 등급(사교 모임)은 옷차림/품위 요건이 있어야 함
  const state = Engine.makeInitialState();
  state.gold = 1000;
  const blocked = Engine.tryStartBanquet(state, 'social');
  eq(blocked.ok, false, '옷차림/품위가 부족하면 사교 모임에 입장할 수 없어야 함');
  ok(blocked.reason === 'outfit' || blocked.reason === 'grace', '입장 실패 이유는 outfit 또는 grace여야 함');
  eq(state.gold, 1000, '입장 실패 시 골드는 차감되지 않아야 함');
}
{
  // 최고 등급(고급 사교 모임)은 옷차림/품위를 갖춰도 영어 인증(은메달)이 없으면 막혀야 함
  const state = Engine.makeInitialState();
  state.gold = 1000;
  state.wardrobe.equipped = 2;
  state.stats.charm = 90;
  state.stats.creativity = 90;
  state.stats.intelligence = 90;
  ok(Engine.graceScore(state.stats) >= 70, '테스트 세팅으로 품위 70 이상을 만들어야 함');
  const blockedByCert = Engine.tryStartBanquet(state, 'grand-social');
  eq(blockedByCert.ok, false, '옷차림/품위를 갖춰도 영어 인증이 없으면 고급 사교 모임에 입장할 수 없어야 함');
  eq(blockedByCert.reason, 'english-cert', '입장 실패 이유는 english-cert여야 함');
  eq(blockedByCert.requiredMedal.id, 'silver', '요구되는 인증은 은메달이어야 함');

  state.certifications.english = 'silver';
  const ok1 = Engine.tryStartBanquet(state, 'grand-social');
  eq(ok1.ok, true, '옷차림/품위/영어 인증을 모두 갖추면 고급 사교 모임에 입장할 수 있어야 함');
  eq(state.gold, 1000 - Engine.BANQUET_TIERS[2].entryFee, '입장하면 고급 사교 모임의 입장료가 차감되어야 함');
}
{
  // banquetTierRequirementMet은 tryStartBanquet과 같은 판정을 미리 보여줄 수 있어야 함(골드 소모 없이)
  const state = Engine.makeInitialState();
  const grandSocial = Engine.BANQUET_TIERS[2];
  ok(!Engine.banquetTierRequirementMet(state, grandSocial), '요건 미달이면 false여야 함');
  state.wardrobe.equipped = 2;
  state.stats.charm = 90; state.stats.creativity = 90; state.stats.intelligence = 90;
  state.certifications.english = 'gold';
  ok(Engine.banquetTierRequirementMet(state, grandSocial), '요건(옷차림/품위/영어 인증)을 모두 갖추면 true여야 함');
  eq(state.gold, 0, 'banquetTierRequirementMet은 상태를 바꾸면(골드 차감 등) 안 됨');
}
{
  // 왕자님은 최고 등급(고급 사교 모임)에서만 만날 수 있고, 그 아래 등급은
  // 예절 시험을 만점으로 통과해도 왕자님을 만날 수 없어야 한다.
  const state = Engine.makeInitialState();
  state.wardrobe.equipped = 2;
  const lowerTierSession = Engine.startBanquetSession('social');
  for (let i = 0; i < lowerTierSession.count; i++) Engine.applyCorrect(state, lowerTierSession, {});
  const lowerOutcome = Engine.finishBanquetOutcome(state, lowerTierSession);
  eq(lowerOutcome.result, 'success-lower-tier', '낮은 등급에서 만점을 받아도 왕자님을 만날 수 없어야 함(success-lower-tier)');

  const topTierSession = Engine.startBanquetSession('grand-social');
  for (let i = 0; i < topTierSession.count; i++) Engine.applyCorrect(state, topTierSession, {});
  const topOutcome = Engine.finishBanquetOutcome(state, topTierSession);
  eq(topOutcome.result, 'met-prince', '최고 등급에서 만점을 받고 옷차림도 갖췄으면 왕자님을 만나야 함');
}

{
  const state = Engine.makeInitialState();
  state.wardrobe.equipped = 0;
  const attempt = Engine.meetNpcAttempt(state, 'prince');
  eq(attempt.kind, 'blocked-outfit', '옷차림이 부족하면 왕자님을 만날 수 없음(blocked-outfit)');
}

/* ---------------- 턴/주 진행 ---------------- */

{
  const state = Engine.makeInitialState();
  state.weekIndex = 0;
  const r1 = Engine.advanceWeekOrTurn(state, 48);
  eq(r1.monthAdvanced, false, '한 달의 마지막 주가 아니면 달이 넘어가지 않음');
  eq(state.weekIndex, 1, 'weekIndex만 증가');
  eq(state.turn, 1, '아직 같은 턴');

  state.weekIndex = Engine.WEEKS_PER_MONTH - 1;
  const beforeTurn = state.turn;
  const r2 = Engine.advanceWeekOrTurn(state, 48);
  eq(r2.monthAdvanced, true, '마지막 주를 넘기면 달이 넘어감');
  eq(state.turn, beforeTurn + 1, '턴이 1 증가');
  eq(state.weekIndex, 0, '새 달에서는 weekIndex가 0으로 초기화');
  ok(state.weekPlan.every((a) => a === null), '새 달에서는 weekPlan이 전부 비워짐');
}

{
  const state = Engine.makeInitialState();
  state.turn = 48;
  const r = Engine.advanceTurn(state, 48);
  eq(r.ended, true, 'TOTAL_TURNS를 넘기면 ended=true');
}

{
  // 정원사 고용 중에 행운이 이미 최대치(100)에 가까우면, 달이 넘어갈 때
  // 자동으로 더해지는 행운이 100을 넘지 않도록 clampStats가 적용되어야 한다.
  const state = Engine.makeInitialState();
  state.items.gardener = true;
  state.stats.luck = 100;
  Engine.advanceTurn(state, 48);
  eq(state.stats.luck, 100, '행운은 advanceTurn 이후에도 100을 넘으면 안 됨');
}

/* ---------------- 이번 달 계획 미리보기 ---------------- */

{
  // 빨래하기를 직접 하면 스트레스가 쌓이고(+) 체력이 깎이는(-) 트레이드오프인데,
  // 미리보기(estimateActivityDelta)가 실제 보상 공식(reward-engine.js의
  // laundryBonusReward)과 부호가 어긋나면 스케줄 화면의 예상 변화가 정반대로
  // 표시된다.
  const state = Engine.makeInitialState();
  const d = Engine.estimateActivityDelta(state, 'laundry');
  ok(d.stress > 0, '빨래하기 미리보기의 스트레스 변화는 양수(쌓임)여야 함 - 실제 보상과 부호가 일치해야 함');
  ok(d.stamina < 0, '빨래하기 미리보기의 체력 변화는 음수(소모)여야 함');
}

{
  // 호감도 감소: 오래 안 만나면(유예 기간 초과) 감소, 최근에 만났으면 유지
  const state = Engine.makeInitialState();
  state.turn = 10;
  state.npcs[0].affection = 50;
  state.npcs[0].lastMetTurn = 0; // 오래전
  state.npcs[1].affection = 50;
  state.npcs[1].lastMetTurn = 9; // 최근
  Engine.applyAffectionDecay(state);
  ok(state.npcs[0].affection < 50, '오래 안 만난 인물은 호감도가 감소');
  eq(state.npcs[1].affection, 50, '최근에 만난 인물은 호감도가 유지');
}

/* ---------------- 시종 효과 ---------------- */

{
  const state = Engine.makeInitialState();
  state.items.gardener = true;
  const beforeGold = state.gold;
  const beforeLuck = state.stats.luck;
  Engine.applyServantEffects(state);
  eq(state.gold, beforeGold + 10, '정원사를 고용하면 매턴 골드 +10');
  eq(state.stats.luck, beforeLuck + 1, '정원사를 고용해도 직접 텃밭을 가꾸는 것과 비슷하게 매턴 행운 +1을 줘야 함');
}

/* ---------------- 스트레스 오버플로우 ---------------- */

{
  const state = Engine.makeInitialState();
  state.stats.stress = Engine.STRESS_OVERFLOW_THRESHOLD - 1;
  eq(Engine.checkStressOverflow(state), null, '임계값 미만이면 절대 오버플로우가 발생하지 않아야 함');
}
{
  let triggered = 0;
  let sample = null;
  for (let i = 0; i < 200; i++) {
    const state = Engine.makeInitialState();
    state.stats.stress = 100;
    const beforeStamina = state.stats.stamina;
    const result = Engine.checkStressOverflow(state);
    if (result) {
      triggered++;
      sample = sample || result;
      ok(state.stats.stamina < beforeStamina, '오버플로우가 발생하면 체력이 줄어야 함');
      ok(state.stats.stress < 100, '오버플로우가 발생하면 스트레스가 다소 풀려야 함');
    }
  }
  ok(triggered > 0, '스트레스가 최대치면 오버플로우가 발생할 수 있어야 함');
  ok(triggered < 200, '스트레스가 최대치여도 매번 발생하지는 않아야 함(확률적, 최대 60%)');
  ok(sample && sample.emoji && sample.title && sample.desc, '발생 시 emoji/title/desc를 담은 이벤트 정보를 돌려줘야 함');
}

/* ---------------- 시나리오 퀴즈: 호감도 기반 힌트/관대함 ---------------- */

{
  const scenario = {
    npcId: 'friend',
    quiz: { questionsPerSession: 3, passCount: 3, bank: [{ question: 'Q', choices: ['a', 'b'], answer: 'a', explanation: 'e' }] },
  };
  const state = Engine.makeInitialState();
  const friendState = state.npcs.find((n) => n.id === 'friend');

  friendState.affection = Engine.NPC_HINT_AFFECTION - 1;
  let session = Engine.startScenarioQuizSession(state, scenario);
  eq(session.hint, false, '호감도가 힌트 기준 미만이면 힌트가 없어야 함');
  eq(session.passCount, 3, '호감도가 관대함 기준 미만이면 통과 기준이 그대로여야 함');

  friendState.affection = Engine.NPC_HINT_AFFECTION;
  session = Engine.startScenarioQuizSession(state, scenario);
  eq(session.hint, true, '호감도가 힌트 기준 이상이면 힌트가 있어야 함');

  friendState.affection = Engine.NPC_LENIENT_AFFECTION;
  session = Engine.startScenarioQuizSession(state, scenario);
  eq(session.passCount, 2, '호감도가 관대함 기준 이상이면 통과 기준이 1 낮아져야 함');
}
{
  // finishScenarioQuizOutcome은 session.passCount(있으면)를 우선 써야 함
  const scenario = {
    id: 'test-scenario', npcId: 'friend',
    quiz: { questionsPerSession: 3, passCount: 3, bank: [] },
    outcomes: {
      success: { narrative: { title: '성공', desc: 'ok' } },
      fail: { narrative: { title: '실패', desc: 'fail' } },
    },
  };
  const state = Engine.makeInitialState();
  const session = { scenario, correctCount: 2, passCount: 2 };
  const result = Engine.finishScenarioQuizOutcome(state, session);
  eq(result.title, '성공', '완화된 통과 기준(passCount=2)을 만족하면 성공 처리되어야 함');
}

/* ---------------- 직업(정식 취업) ---------------- */

{
  const state = Engine.makeInitialState();
  eq(state.career, null, '초기 상태는 무직이어야 함');
  eq(Engine.unlockedCareers(state).length, 0, '초기 스탯으로는 지원 가능한 직업이 없어야 함');
  ok(!Engine.applyForCareer(state, 'tutor'), '요건 미달이면 지원에 실패해야 함');
  eq(state.career, null, '지원 실패 시 무직 상태가 유지되어야 함');
}
{
  const state = Engine.makeInitialState();
  state.stats.intelligence = 30;
  ok(Engine.unlockedCareers(state).some((c) => c.id === 'tutor'), '지능 30이면 과외 선생님 지원 가능해야 함');
  ok(Engine.applyForCareer(state, 'tutor'), '요건을 만족하면 지원에 성공해야 함');
  eq(state.career, 'tutor', '지원에 성공하면 그 직업으로 취업되어야 함');
  ok(!Engine.applyForCareer(state, 'scribe'), '더 높은 요건의 직업은 여전히 지원 실패해야 함');
  eq(state.career, 'tutor', '지원 실패해도 기존 직업은 유지되어야 함(이직 안 됨)');

  Engine.resignCareer(state);
  eq(state.career, null, 'resignCareer 호출 시 무직으로 돌아가야 함');
}
{
  // 매턴 급여가 자동으로 들어와야 함
  const state = Engine.makeInitialState();
  state.stats.intelligence = 30;
  Engine.applyForCareer(state, 'tutor');
  const beforeGold = state.gold;
  const result = Engine.applyServantEffects(state);
  ok(state.gold > beforeGold, '취업 중이면 매턴 급여가 자동으로 들어와야 함');
  eq(typeof result.princeEncounter, 'boolean', 'applyServantEffects는 princeEncounter 플래그를 돌려줘야 함');
}
{
  // 왕자님 관련 애정도 보너스: 서기관(scribe)이면 만날 때 애정도 보너스가 추가로 붙어야 함
  const state = Engine.makeInitialState();
  state.wardrobe.equipped = Engine.PRINCE_MIN_TIER;
  state.stats.intelligence = 75;
  state.stats.charm = 50;
  Engine.applyForCareer(state, 'scribe');

  const withCareerState = Engine.makeInitialState();
  withCareerState.wardrobe.equipped = Engine.PRINCE_MIN_TIER;
  withCareerState.stats.intelligence = 75;
  withCareerState.stats.charm = 50;
  Engine.applyForCareer(withCareerState, 'scribe');

  const withoutCareerState = Engine.makeInitialState();
  withoutCareerState.wardrobe.equipped = Engine.PRINCE_MIN_TIER;

  // 둘 다 동일한 애정도에서 시작하도록 맞춘 뒤 meetNpcAttempt 결과를 비교(랜덤 폭을 감안해 여러 번 평균)
  let withCareerSum = 0, withoutCareerSum = 0;
  const N = 40;
  for (let i = 0; i < N; i++) {
    const s1 = Engine.makeInitialState();
    s1.wardrobe.equipped = Engine.PRINCE_MIN_TIER;
    s1.stats.intelligence = 75; s1.stats.charm = 50;
    Engine.applyForCareer(s1, 'scribe');
    s1.npcs.find((n) => n.id === 'prince').affection = 0;
    Engine.meetNpcAttempt(s1, 'prince');
    withCareerSum += s1.npcs.find((n) => n.id === 'prince').affection;

    const s2 = Engine.makeInitialState();
    s2.wardrobe.equipped = Engine.PRINCE_MIN_TIER;
    s2.npcs.find((n) => n.id === 'prince').affection = 0;
    Engine.meetNpcAttempt(s2, 'prince');
    withoutCareerSum += s2.npcs.find((n) => n.id === 'prince').affection;
  }
  ok(withCareerSum / N > withoutCareerSum / N, '서기관으로 취업하면 왕자님을 만날 때 애정도 보너스가 더 붙어야 함');
}

/* ---------------- 기초 과목 등급 인증(동/은/금메달) ---------------- */

{
  const state = Engine.makeInitialState();
  eq(state.certifications.math, null, '초기 상태는 세 과목 모두 미인증이어야 함');
  eq(state.certifications.english, null, '초기 상태는 세 과목 모두 미인증이어야 함');
  eq(state.certifications.science, null, '초기 상태는 세 과목 모두 미인증이어야 함');
  eq(Engine.MEDAL_TIERS.length, 3, '메달 등급은 동/은/금 3단계여야 함');
  eq(Engine.CERT_SUBJECT_KEYS.length, 3, '인증 과목은 수학/영어/과학 3개여야 함');
}
{
  // 지능이 낮으면 동메달조차 시험 볼 수 없어야 하고, 지능이 오르면 응시할 수 있어야 함
  const state = Engine.makeInitialState();
  state.stats.intelligence = 0;
  ok(Engine.certExamEligible(state, 'math'), '지능 0이어도 동메달(레벨1)은 처음부터 응시 가능해야 함');
  eq(Engine.nextMedalTier(state, 'math').id, 'bronze', '아직 미인증이면 다음 등급은 동메달이어야 함');
}
{
  // 과학도 이제 고1 통합과학(레벨7)까지 콘텐츠가 있으므로, 은메달을 딴 뒤
  // 지능이 충분하면 수학/영어와 마찬가지로 금메달에 응시할 수 있어야 한다.
  const state = Engine.makeInitialState();
  state.stats.intelligence = 90;
  state.certifications.science = 'silver';
  state.certifications.math = 'silver';
  state.certifications.english = 'silver';
  eq(Engine.nextMedalTier(state, 'science').id, 'gold', '은메달을 딴 뒤 다음 목표는 금메달이어야 함');
  ok(Engine.certExamEligible(state, 'science'), '과학은 지능이 충분하면 금메달에 응시할 수 있어야 함(레벨7 콘텐츠 존재)');
  ok(Engine.certExamEligible(state, 'math'), '수학은 지능이 충분하면 금메달에 응시할 수 있어야 함');
  ok(Engine.certExamEligible(state, 'english'), '영어는 지능이 충분하면 금메달에 응시할 수 있어야 함');
}
{
  // certTierContentExists는 "콘텐츠 자체가 없는" 경우를 가려내는 일반
  // 메커니즘이다 — 세 과목 모두 금메달까지 콘텐츠가 있는 지금은 항상
  // true를 돌려줘야 한다(레벨이 부족해 영원히 막히는 과목이 없음을 보장).
  Engine.MEDAL_TIERS.forEach((tier) => {
    Engine.CERT_SUBJECT_KEYS.forEach((subjectKey) => {
      ok(Engine.certTierContentExists(subjectKey, tier), `${subjectKey}는 ${tier.name} 콘텐츠(레벨${tier.requiredLevel})가 존재해야 함`);
    });
  });
}
{
  // 이미 금메달(최고 등급)까지 딴 과목은 더 도전할 다음 등급이 없어야 함
  // (상태 화면 UI도 이 경우 "시험 보기" 버튼 대신 "최고 등급 달성"만 보여줌)
  const state = Engine.makeInitialState();
  state.stats.intelligence = 90;
  state.certifications.math = 'gold';
  eq(Engine.nextMedalTier(state, 'math'), null, '금메달까지 다 땄으면 다음 등급이 없어야 함');
  ok(!Engine.certExamEligible(state, 'math'), '다음 등급이 없으면 응시 대상 자체가 없어야 함');
}
{
  // 실패해도 이미 딴 등급이 깎이지 않아야 함(은메달 보유 중 금메달 도전에 실패)
  const state = Engine.makeInitialState();
  state.stats.intelligence = 90;
  state.certifications.math = 'silver';
  const session = Engine.startCertExamSession(state, 'math');
  eq(session.tier.id, 'gold', '은메달 보유 중이면 다음 목표는 금메달이어야 함');
  for (let i = 0; i < session.count; i++) {
    session.index = i;
    Engine.applyWrong(state, session);
  }
  const outcome = Engine.finishCertExamOutcome(state, session);
  ok(!outcome.pass, '전부 틀리면 통과하지 못해야 함');
  eq(state.certifications.math, 'silver', '금메달 도전에 실패해도 기존에 딴 은메달이 유지되어야 함');
}
{
  // 정상적으로 통과하면 메달이 기록되고 축하금이 지급되어야 함
  const state = Engine.makeInitialState();
  state.stats.intelligence = 60;
  const session = Engine.startCertExamSession(state, 'math');
  eq(session.type, 'cert-exam', '세션 타입은 cert-exam이어야 함');
  eq(session.count, session.tier.questionCount, '세션 문제 수는 그 등급의 questionCount와 같아야 함');
  const beforeGold = state.gold;
  for (let i = 0; i < session.count; i++) {
    session.index = i;
    const problem = Engine.generateNextProblem(state, session);
    eq(problem.level, session.tier.requiredLevel, '인증 시험 문제는 그 등급이 요구하는 레벨로만 나와야 함');
    Engine.applyCorrect(state, session, problem);
  }
  const outcome = Engine.finishCertExamOutcome(state, session);
  ok(outcome.pass, '전부 맞히면 통과해야 함');
  eq(state.certifications.math, 'bronze', '동메달을 통과하면 certifications에 기록되어야 함');
  ok(state.gold > beforeGold, '인증에 통과하면 축하금이 지급되어야 함');
}
{
  // migrateLoadedState: 옛 저장 데이터(certifications 필드 없음)와 손상된 값 모두 정상화되어야 함
  const migrated = Engine.migrateLoadedState({ turn: 1 });
  eq(migrated.certifications.math, null, 'certifications 필드가 없던 옛 저장 데이터는 전부 미인증으로 채워져야 함');

  const withGarbage = Engine.migrateLoadedState({ turn: 1, certifications: { math: 'platinum', english: 'gold', science: null } });
  eq(withGarbage.certifications.math, null, '존재하지 않는 등급 id는 미인증으로 되돌려야 함');
  eq(withGarbage.certifications.english, 'gold', '유효한 등급 id는 그대로 유지되어야 함');

  // 배열은 typeof가 'object'라서 이전엔 검증을 통과해버렸고, math/english/science를
  // 배열의 "이름 붙은 속성"으로 써버리면 JSON.stringify가 통째로 날려버려서
  // 다음에 저장할 때 인증 기록이 조용히 사라지는 문제가 있었다.
  const withArray = Engine.migrateLoadedState({ turn: 1, certifications: [] });
  ok(!Array.isArray(withArray.certifications), 'certifications가 배열로 저장돼 있었다면 객체로 정상화되어야 함');
  eq(withArray.certifications.math, null, '배열이었던 certifications을 정상화하면 미인증 상태여야 함');
  const roundTripped = JSON.parse(JSON.stringify(withArray.certifications));
  eq(roundTripped.math, null, '정상화된 certifications는 JSON 직렬화에도 필드가 살아남아야 함');
}
{
  // 콘텐츠는 있지만(certTierContentExists=true) 아직 지능이 부족해서 응시
  // 못 하는 경우(예: 막 은메달을 딴 직후)와, 콘텐츠 자체가 없어서 응시
  // 불가능한 경우는 구분되어야 한다 — "곧 준비되면 도전 가능"과 "여기가
  // 한계"는 UI에서 다른 문구를 보여줘야 하기 때문이다. 세 과목 모두
  // 금메달까지 콘텐츠가 있는 지금은 항상 전자(콘텐츠는 있음)에 해당한다.
  const state = Engine.makeInitialState();
  state.stats.intelligence = 30;
  state.certifications.math = 'silver';
  const mathNextTier = Engine.nextMedalTier(state, 'math');
  ok(Engine.certTierContentExists('math', mathNextTier), '수학은 금메달 레벨(7) 콘텐츠가 실제로 존재해야 함');
  ok(!Engine.certExamEligible(state, 'math'), '콘텐츠는 있어도 지능이 아직 부족하면 응시는 불가능해야 함');
}
{
  // 인증 시험 오답에는 실제 대가(체력/스트레스)가 있어야 한다 - 그렇지
  // 않으면 통과할 때까지 공짜로 무한 재도전할 수 있어 시험의 의미가 없다.
  const state = Engine.makeInitialState();
  state.stats.intelligence = 60;
  state.stats.stamina = 50;
  state.stats.stress = 10;
  const session = Engine.startCertExamSession(state, 'math');
  Engine.applyWrong(state, session);
  ok(state.stats.stamina < 50, '인증 시험 오답은 체력을 깎아야 함(무한 재도전 방지)');
  ok(state.stats.stress > 10, '인증 시험 오답은 스트레스도 쌓여야 함');

  const beforeGold = state.gold;
  const problem = Engine.generateNextProblem(state, session);
  Engine.applyCorrect(state, session, problem);
  eq(state.gold, beforeGold, '인증 시험은 정답을 맞혀도 문제당 골드가 바로 붙지 않아야 함(합격 보상은 시험 종료 시 한 번에)');
}
{
  // 영어/과학처럼 문제 은행이 작은 과목(레벨당 6개)은 5문제를 뽑을 때
  // 같은 시험 회차 안에서 문제가 반복되면, 방금 본 설명 때문에 사실상
  // 정답을 아는 채로 다시 풀게 되어 시험이 쉬워진다. 같은 세션 안에서는
  // 반복되지 않아야 한다(은행 크기 6 > 문제 수 5이므로 항상 피할 수 있음).
  const state = Engine.makeInitialState();
  state.stats.intelligence = 60;
  let anyRepeat = false;
  for (let trial = 0; trial < 30; trial++) {
    const session = Engine.startCertExamSession(state, 'english');
    const seen = new Set();
    for (let i = 0; i < session.count; i++) {
      session.index = i;
      const problem = Engine.generateNextProblem(state, session);
      if (seen.has(problem.question)) anyRepeat = true;
      seen.add(problem.question);
    }
  }
  ok(!anyRepeat, '영어 인증 시험 한 회차 안에서는 같은 문제가 반복되면 안 됨');
}

/* ---------------- 수학 경시대회 ---------------- */

{
  const state = Engine.makeInitialState();
  state.stats.intelligence = Engine.COMPETITION_MIN_INTELLIGENCE - 1;
  ok(!Engine.competitionUnlocked(state), '지능 요건 미달이면 경시대회에 도전할 수 없어야 함');
  state.stats.intelligence = Engine.COMPETITION_MIN_INTELLIGENCE;
  ok(Engine.competitionUnlocked(state), '지능 요건을 만족하면 도전 가능해야 함');
}
{
  const state = Engine.makeInitialState();
  state.stats.intelligence = 90;
  const session = Engine.startCompetitionSession(state);
  eq(session.type, 'competition', '경시대회 세션 타입');
  eq(session.count, Engine.QUESTIONS_PER_COMPETITION, '경시대회 문제 수');
  eq(session.levels.length, Engine.QUESTIONS_PER_COMPETITION, '문제 수만큼 난이도가 정해져 있어야 함');
  eq(session.levels[0], 1, '첫 문제는 항상 덧셈뺄셈(레벨 1)부터 시작해야 함');
  for (let i = 1; i < session.levels.length; i++) {
    ok(session.levels[i] >= session.levels[i - 1], '난이도는 뒤로 갈수록 낮아지지 않고 점점 올라가야 함');
  }

  const beforeGold = state.gold;
  for (let i = 0; i < session.count; i++) {
    session.index = i;
    const problem = Engine.generateNextProblem(state, session);
    eq(problem.level, session.levels[i], `${i}번째 문제는 미리 정해둔 난이도 사다리를 따라야 함`);
    const beforeThisGold = state.gold;
    Engine.applyCorrect(state, session, problem);
    ok(state.gold > beforeThisGold, '왕국 수학경시대회는 정답을 맞힐 때마다 바로 상금이 들어와야 함');
  }
  const goldAfterAllQuestions = state.gold;
  const outcome = Engine.finishCompetitionOutcome(state, session);
  ok(outcome.perfect, '전부 맞혔으면 만점 처리되어야 함');
  ok(state.gold > goldAfterAllQuestions, '만점이면 세션 종료 시 추가 보너스가 한 번 더 붙어야 함');
  eq(outcome.goldEarned, state.gold - beforeGold, 'outcome.goldEarned이 세션 전체(문제별 상금+만점 보너스)로 늘어난 골드와 일치해야 함');
}

/* ---------------- 창의력 올림피아드 ---------------- */

{
  const state = Engine.makeInitialState();
  state.stats.creativity = Engine.CREATIVITY_MIN_CREATIVITY - 1;
  ok(!Engine.creativityOlympiadUnlocked(state), '창의력 요건 미달이면 창의력 올림피아드에 도전할 수 없어야 함');
  state.stats.creativity = Engine.CREATIVITY_MIN_CREATIVITY;
  ok(Engine.creativityOlympiadUnlocked(state), '창의력 요건을 만족하면 도전 가능해야 함');
}
{
  const state = Engine.makeInitialState();
  state.stats.creativity = 50;
  const session = Engine.startCreativitySession();
  eq(session.type, 'creativity', '창의력 올림피아드 세션 타입');
  eq(session.count, Engine.QUESTIONS_PER_CREATIVITY, '창의력 올림피아드 기본 문제 수');

  const beforeGold = state.gold;
  const beforeCreativity = state.stats.creativity;
  for (let i = 0; i < session.count; i++) {
    session.index = i;
    const problem = Engine.generateNextProblem(state, session);
    const beforeThisGold = state.gold;
    Engine.applyCorrect(state, session, problem);
    ok(state.gold > beforeThisGold, '창의력 올림피아드는 정답을 맞힐 때마다 바로 상금이 들어와야 함');
  }
  ok(state.stats.creativity > beforeCreativity, '창의력 올림피아드 정답은 창의력을 올려야 함');
  const goldAfterAllQuestions = state.gold;
  const outcome = Engine.finishCreativityOutcome(state, session);
  ok(outcome.perfect, '전부 맞혔으면 만점 처리되어야 함');
  ok(state.gold > goldAfterAllQuestions, '만점이면 세션 종료 시 추가 보너스가 한 번 더 붙어야 함');
  eq(outcome.goldEarned, state.gold - beforeGold, 'outcome.goldEarned이 세션 전체(문제별 상금+만점 보너스)로 늘어난 골드와 일치해야 함');
}
{
  // 문제 수를 직접 고를 수 있어야 함(공부/알바/경시대회와 동일한 방식)
  const session = Engine.startCreativitySession(10);
  eq(session.count, 10, '문제 수를 직접 지정하면 그 값을 따라야 함');
}

/* ---------------- 기도와 선행 ---------------- */

{
  const state = Engine.makeInitialState();
  const session = Engine.startFaithSession();
  eq(session.type, 'faith', '기도와 선행 세션 타입');
  eq(session.count, Engine.QUESTIONS_PER_FAITH, '기도와 선행 문제 수는 항상 고정');

  const beforeLuck = state.stats.luck;
  const beforeStress = state.stats.stress;
  for (let i = 0; i < session.count; i++) {
    session.index = i;
    const problem = Engine.generateNextProblem(state, session);
    Engine.applyCorrect(state, session, problem);
  }
  ok(state.stats.luck > beforeLuck, '기도와 선행 정답은 행운을 올려야 함');
  ok(state.stats.stress < beforeStress, '기도와 선행 정답은 스트레스를 내려야 함(차분해지는 시간)');
  eq(state.gold, Engine.makeInitialState().gold, '기도와 선행은 골드를 주지 않는 활동이어야 함');

  const outcome = Engine.finishFaithOutcome(session);
  eq(outcome.correctCount, session.count, '전부 맞혔으면 correctCount가 count와 같아야 함');
  ok(outcome.perfect, '전부 맞혔으면 만점 처리되어야 함');
}
{
  // 틀려도 벌점이 없어야 한다(지식을 겨루는 활동이 아니라 마음가짐을 돌아보는 시간)
  const state = Engine.makeInitialState();
  const session = Engine.startFaithSession();
  const beforeStats = JSON.parse(JSON.stringify(state.stats));
  Engine.applyWrong(state, session);
  eq(state.stats.stamina, beforeStats.stamina, '기도와 선행은 오답이어도 체력이 깎이면 안 됨');
  eq(state.stats.stress, beforeStats.stress, '기도와 선행은 오답이어도 스트레스가 오르면 안 됨');
}

summary('game-engine.js');
