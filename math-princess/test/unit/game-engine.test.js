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

eq(Engine.statTierIndex(0), 0, '스탯 0은 티어 0');
eq(Engine.statTierIndex(19), 0, '스탯 19는 아직 티어 0');
eq(Engine.statTierIndex(20), 1, '스탯 20부터 티어 1');
eq(Engine.statTierIndex(80), 4, '스탯 80부터 티어 4(최고)');

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

{
  // 은행: 세션 도중이 아니라 세션이 끝날 때 한 번에 매력치를 반영(finishBanquetOutcome)
  const state = Engine.makeInitialState();
  state.wardrobe.equipped = Engine.PRINCE_MIN_TIER;
  const session = Engine.startBanquetSession();
  for (let i = 0; i < Engine.BANQUET_PASS_COUNT; i++) {
    Engine.applyCorrect(state, session, { rewardGold: 0 });
  }
  const outcome = Engine.finishBanquetOutcome(state, session);
  eq(outcome.result, 'met-prince', '입장 조건(옷차림)을 갖추고 통과 기준을 채우면 왕자님을 만남');

  const princeState = state.npcs.find((n) => n.id === 'prince');
  ok(princeState.affection > 0, '왕자님과 만나면 호감도가 오름');
}

{
  // 옷차림 미달이면 통과해도 왕자님을 만나지 못함
  const state = Engine.makeInitialState();
  state.wardrobe.equipped = 0;
  const session = Engine.startBanquetSession();
  for (let i = 0; i < Engine.BANQUET_PASS_COUNT; i++) {
    Engine.applyCorrect(state, session, { rewardGold: 0 });
  }
  const outcome = Engine.finishBanquetOutcome(state, session);
  eq(outcome.result, 'success-underdressed', '통과해도 옷차림이 부족하면 왕자님을 만나지 못함');
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
  ok(Engine.buyOutfit(state, 1), '골드가 충분하면 옷 구매 성공');
  eq(state.wardrobe.equipped, 1, '옷을 사면 바로 갈아입음');
  ok(state.wardrobe.owned[1], '산 옷은 소유 목록에 표시됨');
  ok(!Engine.buyOutfit(state, 1), '이미 산 옷은 다시 살 수 없음');

  ok(Engine.equipOutfit(state, 0), '이미 소유한(0번) 옷은 다시 갈아입을 수 있음');
  eq(state.wardrobe.equipped, 0, '갈아입으면 착장이 바뀜');
  ok(!Engine.equipOutfit(state, 3), '소유하지 않은 옷은 입을 수 없음');
}

/* ---------------- 연회 입장 게이트 ---------------- */

{
  const state = Engine.makeInitialState();
  state.wardrobe.equipped = 0;
  state.gold = 1000;
  const blocked = Engine.tryStartBanquet(state);
  eq(blocked.ok, false, '옷차림이 부족하면 연회에 입장할 수 없음');
  eq(blocked.reason, 'outfit', '입장 실패 이유는 outfit');
  eq(state.gold, 1000, '입장 실패 시 골드는 차감되지 않음');

  state.wardrobe.equipped = Engine.BANQUET_MIN_TIER;
  state.gold = 0;
  const noGold = Engine.tryStartBanquet(state);
  eq(noGold.ok, false, '골드가 부족하면 연회에 입장할 수 없음');
  eq(noGold.reason, 'gold', '입장 실패 이유는 gold');

  state.gold = Engine.BANQUET_ENTRY_FEE;
  const ok1 = Engine.tryStartBanquet(state);
  eq(ok1.ok, true, '옷차림과 골드를 모두 갖추면 입장 성공');
  eq(state.gold, 0, '입장하면 입장료가 차감됨');
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
  state.stats.intelligence = 60;
  const session = Engine.startCompetitionSession(state);
  eq(session.type, 'competition', '경시대회 세션 타입');
  eq(session.count, Engine.QUESTIONS_PER_COMPETITION, '경시대회 문제 수');
  ok(session.level >= 1, '경시대회는 현재 해금된 수학 레벨로 출제되어야 함');

  const beforeGold = state.gold;
  for (let i = 0; i < session.count; i++) {
    const problem = Engine.generateNextProblem(state, session);
    Engine.applyCorrect(state, session, problem);
  }
  eq(state.gold, beforeGold, '문제를 푸는 도중에는 골드가 바로 반영되지 않아야 함(세션 종료 시 한 번에 지급)');
  const outcome = Engine.finishCompetitionOutcome(state, session);
  ok(outcome.perfect, '전부 맞혔으면 만점 처리되어야 함');
  ok(state.gold > beforeGold, '경시대회를 마치면 그제서야 상금이 한 번에 지급되어야 함');
  eq(outcome.goldEarned, state.gold - beforeGold, 'outcome.goldEarned이 실제로 늘어난 골드와 일치해야 함');
}

summary('game-engine.js');
