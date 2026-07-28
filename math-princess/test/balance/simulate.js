// 48개월(턴) x 4주 생활 계획표 전체를 게임과 완전히 동일한 코드(game-engine.js)로
// 재현해, 여러 유형의 플레이어가 끝까지 플레이했을 때 경제/엔딩 도달 가능성이
// 여전히 정상 범위인지, NaN/범위 이탈 같은 실제 버그가 없는지 검증한다.
//
// game-engine.js는 DOM에 의존하지 않는 순수 로직이라 여기서 그대로
// require해서 쓴다 — script.js를 고쳐도 이 시뮬레이터를 손으로 다시
// 맞출 필요가 없다(실제 게임 공식과 항상 같은 코드를 실행하기 때문).
const path = require('path');
const { ok, summary } = require('../helpers/assert');

const BASE = path.join(__dirname, '..', '..');
const P = require(path.join(BASE, 'problems.js'));
const SUBJ = require(path.join(BASE, 'subjects.js'));
const SC = require(path.join(BASE, 'scenarios.js'));
const E = require(path.join(BASE, 'endings.js'));
const { createEngine } = require(path.join(BASE, 'game-engine.js'));

const Engine = createEngine({ P, SUBJ, SC, E });
const { STAT_KEYS, NPC_DEFS, ITEMS, OUTFIT_TIERS, WEEKS_PER_MONTH, PRINCE_MIN_TIER, BANQUET_MIN_TIER, BANQUET_ENTRY_FEE, QUESTIONS_PER_STUDY, QUESTIONS_PER_JOB, QUESTIONS_PER_BANQUET, BANQUET_PASS_COUNT } = Engine;
const TOTAL_TURNS = 48;

/* ---------------- 플레이어 정책이 쓰는 보조 함수 ---------------- */

// 실제 게임과 똑같이 세션 객체 하나를 문제 전체에 걸쳐 재사용하면서,
// 매 문제마다 assumed correct rate로 정답/오답을 무작위로 굴린다.
function runQuestionSession(state, type, count, answerRate, extra) {
  const session = Object.assign({ type, correctCount: 0, sessionBestCombo: 0, goldEarned: 0, currentSubject: null, askedQuestions: [] }, extra);
  for (let i = 0; i < count; i++) {
    const problem = Engine.generateNextProblem(state, session);
    if (Math.random() < answerRate) {
      Engine.applyCorrect(state, session, problem);
    } else {
      Engine.applyWrong(state, session);
    }
  }
  return session;
}

function runBonusSession(state, type, answerRate) {
  return runQuestionSession(state, type, 1, answerRate);
}

function runWeekActivity(state, activity, answerRate, log) {
  if (activity === 'study') {
    runQuestionSession(state, 'study', QUESTIONS_PER_STUDY, answerRate);
  } else if (activity === 'job') {
    runQuestionSession(state, 'job', QUESTIONS_PER_JOB, answerRate);
  } else if (activity === 'exercise') {
    const session = runBonusSession(state, 'exercise-bonus', answerRate);
    Engine.finishExerciseBonusOutcome(state, session);
  } else if (activity === 'rest') {
    const session = runBonusSession(state, 'rest-bonus', answerRate);
    Engine.finishRestBonusOutcome(state, session);
  } else if (activity === 'laundry') {
    if (state.items.maid) return; // 자동화되어 스케줄할 필요 없음(실제 UI에서도 잠김)
    const session = runBonusSession(state, 'laundry-bonus', answerRate);
    Engine.finishLaundryBonusOutcome(state, session);
  } else if (activity === 'garden') {
    if (state.items.gardener) return;
    const session = runBonusSession(state, 'garden-bonus', answerRate);
    Engine.finishGardenBonusOutcome(state, session);
  } else if (activity === 'banquet') {
    tryRunBanquet(state, answerRate, log);
  }
}

function meetNpc(state, npcId, answerRate, log) {
  const attempt = Engine.meetNpcAttempt(state, npcId);
  if (attempt.kind === 'blocked-outfit') {
    log.princeBlockedByOutfit = (log.princeBlockedByOutfit || 0) + 1;
    return;
  }
  if (attempt.kind === 'scenario') {
    const scenario = attempt.scenario;
    if (scenario.type === 'quiz') {
      const session = runQuestionSession(state, 'scenario-quiz', scenario.quiz.questionsPerSession, answerRate, { scenario });
      Engine.finishScenarioQuizOutcome(state, session);
    } else if (scenario.type === 'branching') {
      const opt = scenario.branching.options[Math.floor(Math.random() * scenario.branching.options.length)];
      Engine.resolveBranchingOption(state, scenario, opt);
    } else {
      Engine.resolveNarrativeScenario(state, scenario);
    }
    if (!state.completedScenarios.includes(scenario.id)) state.completedScenarios.push(scenario.id);
    log.scenariosCompleted.push(scenario.id);
  }
  // kind === 'met'인 경우 meetNpcAttempt가 이미 state를 반영했으므로 더 할 일 없음.
}

function tryRunBanquet(state, answerRate, log) {
  const result = Engine.tryStartBanquet(state);
  if (!result.ok) {
    if (result.reason === 'outfit') log.banquetBlockedByOutfit = (log.banquetBlockedByOutfit || 0) + 1;
    else log.banquetBlockedByGold = (log.banquetBlockedByGold || 0) + 1;
    return;
  }
  const session = runQuestionSession(state, 'banquet', QUESTIONS_PER_BANQUET, answerRate);
  const outcome = Engine.finishBanquetOutcome(state, session);
  if (outcome.result === 'met-prince') log.banquetSuccesses = (log.banquetSuccesses || 0) + 1;
}

function maybeBuyItems(state) {
  ITEMS.forEach((item) => { if (!state.items[item.id] && state.gold >= item.cost) Engine.buyItem(state, item.id); });
}

// 품위로 해금된(구매 가능한) 최고 단계 옷을 살 수 있으면 사서 갈아입는다("옷을 갖춰 입는" 정책).
function maybeBuyOutfit(state) {
  const graceTier = Engine.currentOutfit(state.stats).tierIndex;
  for (let t = graceTier; t > state.wardrobe.equipped; t--) {
    if (state.wardrobe.owned[t]) { Engine.equipOutfit(state, t); return; }
    if (Engine.buyOutfit(state, t)) return;
  }
}

/* ---------------- 플레이어 정책 ---------------- */

// "균형 잡힌" 플레이어: 매주(월 4주 x 48개월 = 총 192주) 공부/알바/운동/휴식/
// 빨래/텃밭/친구 만나기/연회를 고루 섞어서 진행한다. 친구는 6명을 순환 방문한다.
const WEEK_ACTIVITY_PATTERN = ['study', 'friend', 'job', 'laundry', 'exercise', 'friend', 'study', 'garden', 'rest', 'banquet', 'friend', 'study'];

function simulateBalanced(answerRate) {
  const state = Engine.makeInitialState();
  const log = { scenariosCompleted: [] };
  const rotationRef = { i: 0 };
  let weekCounter = 0;

  for (let turn = 1; turn <= TOTAL_TURNS; turn++) {
    state.turn = turn;
    for (let week = 0; week < WEEKS_PER_MONTH; week++) {
      let activity = WEEK_ACTIVITY_PATTERN[weekCounter % WEEK_ACTIVITY_PATTERN.length];
      weekCounter++;
      if (state.stats.stamina < 20) activity = 'rest';
      else if (state.stats.stress > 75) activity = 'rest';

      // 스트레스가 너무 쌓이면 계획했던 활동 대신 몸살로 이번 주를 앓아누울 수 있다(실제 게임과 동일).
      const overflow = Engine.checkStressOverflow(state);
      if (overflow) {
        log.stressOverflowCount = (log.stressOverflowCount || 0) + 1;
      } else if (activity === 'friend') {
        for (let i = 0; i < NPC_DEFS.length; i++) {
          const idx = (rotationRef.i + i) % NPC_DEFS.length;
          const def = NPC_DEFS[idx];
          if (def.unlock(state.stats)) { rotationRef.i = (idx + 1) % NPC_DEFS.length; meetNpc(state, def.id, answerRate, log); break; }
        }
      } else {
        runWeekActivity(state, activity, answerRate, log);
      }
      maybeBuyItems(state);
      maybeBuyOutfit(state);
      Engine.clampStats(state);
    }
    // 월말(advanceTurn)에만 한 번 적용되는 것들
    Engine.applyServantEffects(state);
    Engine.applyAffectionDecay(state);
    Engine.clampStats(state);
  }
  const ending = E.computeEnding(state.stats, state.npcs);
  return { state, ending, log };
}

// "왕자님 루트": 아직 왕자님을 만날 옷차림(PRINCE_MIN_TIER)을 갖추지 못했으면
// 공부/알바로 돈과 품위를 먼저 쌓고, 갖춘 뒤에는 연회/친구 만나기로 왕자님과의
// 관계에 집중하는 "적응형" 정책. 옷을 사려면 골드가 필요해진 뒤로는 이렇게
// 순서를 지키는 게 자연스러운 공략법이라, 실제로 48개월 안에 도달 가능한지
// (엔딩 임계값/옷차림 게이트가 너무 가혹하지 않은지) 확인한다.
function simulatePrinceRoute(answerRate) {
  const state = Engine.makeInitialState();
  const log = { scenariosCompleted: [] };
  for (let turn = 1; turn <= TOTAL_TURNS; turn++) {
    state.turn = turn;
    for (let week = 0; week < WEEKS_PER_MONTH; week++) {
      const dressedForPrince = state.wardrobe.equipped >= PRINCE_MIN_TIER;
      let activity;
      if (state.stats.stamina < 20) activity = 'rest';
      else if (!dressedForPrince) activity = Math.random() < 0.5 ? 'study' : 'job';
      else if (Math.random() < 0.7) activity = Math.random() < 0.5 ? 'banquet' : 'friend-prince';
      else activity = 'study';

      const overflow = Engine.checkStressOverflow(state);
      if (overflow) {
        log.stressOverflowCount = (log.stressOverflowCount || 0) + 1;
      } else if (activity === 'friend-prince') meetNpc(state, 'prince', answerRate, log);
      else runWeekActivity(state, activity, answerRate, log);
      maybeBuyOutfit(state);
      Engine.clampStats(state);
    }
    Engine.applyServantEffects(state);
    Engine.applyAffectionDecay(state);
    Engine.clampStats(state);
  }
  const ending = E.computeEnding(state.stats, state.npcs);
  return { state, ending, log };
}

/* ---------------- 실행 & 검증 ---------------- */

function checkAnomalies(state, log, trialLabel) {
  STAT_KEYS.forEach((k) => {
    ok(!Number.isNaN(state.stats[k]) && state.stats[k] >= 0 && state.stats[k] <= 100, `[${trialLabel}] 스탯 ${k}가 0~100 범위 안이어야 함 (got ${state.stats[k]})`);
  });
  ok(!Number.isNaN(state.gold) && state.gold >= 0, `[${trialLabel}] 골드가 NaN/음수가 아니어야 함 (got ${state.gold})`);
  state.npcs.forEach((n) => {
    ok(!Number.isNaN(n.affection) && n.affection >= 0 && n.affection <= 100, `[${trialLabel}] ${n.id} 애정도가 0~100 범위여야 함 (got ${n.affection})`);
  });
  const dup = log.scenariosCompleted.filter((id, i) => log.scenariosCompleted.indexOf(id) !== i);
  ok(dup.length === 0, `[${trialLabel}] 같은 시나리오가 중복 완료되면 안 됨: ${dup.join(',')}`);
}

console.log('48개월 x 4주 밸런스 시뮬레이션 (game-engine.js 실사용)');

// 1) 균형 플레이어: 정답률별로 여러 번 돌려서 이상 징후(NaN/범위 이탈/중복 완료) 없는지 검증
const BALANCED_TRIALS = 60;
[0.6, 0.75, 0.9].forEach((rate) => {
  const endingCounts = {};
  for (let t = 0; t < BALANCED_TRIALS; t++) {
    const { state, ending, log } = simulateBalanced(rate);
    checkAnomalies(state, log, `균형 ${Math.round(rate * 100)}%`);
    endingCounts[ending.id] = (endingCounts[ending.id] || 0) + 1;
  }
  console.log(`  균형 플레이어 정답률 ${Math.round(rate * 100)}% (${BALANCED_TRIALS}회) 엔딩 분포:`,
    Object.entries(endingCounts).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id}:${n}`).join(', '));
});

// 2) 왕자님 루트: 집중 플레이 시 48개월 안에 실제로 became-a-princess 엔딩에
//    도달 가능한지(옷차림 게이트/입장료가 사실상 막아버리지는 않는지) 확인.
//    최소 60% 이상은 도달해야 "의도대로 도전 가능한 콘텐츠"라고 볼 수 있다.
const PRINCE_TRIALS = 60;
{
  const rate = 0.75;
  let reached = 0;
  for (let t = 0; t < PRINCE_TRIALS; t++) {
    const { state, ending, log } = simulatePrinceRoute(rate);
    checkAnomalies(state, log, '왕자님 루트');
    if (ending.id === 'became-a-princess') reached++;
  }
  const reachRate = reached / PRINCE_TRIALS;
  console.log(`  왕자님 루트 집중 플레이(정답률 75%, ${PRINCE_TRIALS}회): became-a-princess 도달 ${reached}/${PRINCE_TRIALS} (${Math.round(reachRate * 100)}%)`);
  ok(reachRate >= 0.6, `왕자님 루트에 집중하면 48개월 안에 became-a-princess 엔딩에 60% 이상 도달해야 함 (실제 ${Math.round(reachRate * 100)}%) — 너무 낮으면 옷차림/입장료 게이트가 과도한 것`);
}

summary('48-turn balance simulation');
