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
  // 과학은 레벨이 4단계(중1)까지밖에 없어서, 은메달을 딴 뒤 금메달(레벨7)에는
  // 지능이 아무리 높아도 영원히 응시할 수 없어야 한다(콘텐츠 자체가 없으므로).
  const state = Engine.makeInitialState();
  state.stats.intelligence = 90;
  state.certifications.science = 'silver';
  eq(Engine.nextMedalTier(state, 'science').id, 'gold', '은메달을 딴 뒤 다음 목표는 금메달이어야 함');
  ok(!Engine.certExamEligible(state, 'science'), '과학은 레벨7 콘텐츠가 없어서 지능이 높아도 금메달에 응시할 수 없어야 함');
  // 반면 수학/영어는 레벨7 콘텐츠가 있으므로 지능만 충분하면 응시 가능해야 함
  state.certifications.math = 'silver';
  state.certifications.english = 'silver';
  ok(Engine.certExamEligible(state, 'math'), '수학은 지능이 충분하면 금메달에 응시할 수 있어야 함');
  ok(Engine.certExamEligible(state, 'english'), '영어는 지능이 충분하면 금메달에 응시할 수 있어야 함');
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
  // 과학은 은메달을 딴 뒤 금메달 콘텐츠가 아예 없어서(레벨7 없음) 영원히
  // 응시할 수 없는데, "곧 준비되면 도전 가능"처럼 오해를 주는 문구 대신
  // "여기가 한계"라는 걸 UI가 구분할 수 있어야 한다.
  const state = Engine.makeInitialState();
  state.stats.intelligence = 100;
  state.certifications.science = 'silver';
  const nextTier = Engine.nextMedalTier(state, 'science');
  ok(!Engine.certTierContentExists('science', nextTier), '과학은 금메달 레벨(7) 콘텐츠 자체가 없어야 함');

  // 반대로 수학처럼 콘텐츠는 있지만 아직 지능이 부족해서 응시 못 하는
  // 경우는(예: 막 은메달을 딴 직후) certTierContentExists가 true여야 한다.
  const state2 = Engine.makeInitialState();
  state2.stats.intelligence = 30;
  state2.certifications.math = 'silver';
  const mathNextTier = Engine.nextMedalTier(state2, 'math');
  ok(Engine.certTierContentExists('math', mathNextTier), '수학은 금메달 레벨(7) 콘텐츠가 실제로 존재해야 함');
  ok(!Engine.certExamEligible(state2, 'math'), '콘텐츠는 있어도 지능이 아직 부족하면 응시는 불가능해야 함');
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

summary('game-engine.js');
