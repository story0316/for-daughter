// 48개월(턴) x 4주 생활 계획표 전체를 script.js의 실제 공식/데이터로 재현해,
// 여러 유형의 플레이어가 끝까지 플레이했을 때 경제/엔딩 도달 가능성이
// 여전히 정상 범위인지, NaN/범위 이탈 같은 실제 버그가 없는지 검증한다.
// script.js 자체는 DOM에 의존해 Node에서 직접 require할 수 없으므로, 여기서는
// 순수 로직 모듈(problems.js/subjects.js/scenarios.js/endings.js)은 그대로
// require하고, script.js의 상수/공식은 그대로 옮겨 적었다. script.js에서
// 이 값들을 바꾸면 이 시뮬레이터도 함께 갱신해야 한다.
const path = require('path');
const { ok, summary } = require('../helpers/assert');

const BASE = path.join(__dirname, '..', '..');
const P = require(path.join(BASE, 'problems.js'));
const SUBJ = require(path.join(BASE, 'subjects.js'));
const SC = require(path.join(BASE, 'scenarios.js'));
const E = require(path.join(BASE, 'endings.js'));

const SUBJECTS = {
  math: { isLevelUnlocked: P.isLevelUnlocked, maxLevel: 10 },
  english: { isLevelUnlocked: SUBJ.isEnglishLevelUnlocked, maxLevel: 4 },
  science: { isLevelUnlocked: SUBJ.isScienceLevelUnlocked, maxLevel: 4 },
};
const SUBJECT_KEYS = Object.keys(SUBJECTS);
const STAT_KEYS = ['intelligence', 'focus', 'stamina', 'charm', 'creativity', 'stress', 'luck'];

const TOTAL_TURNS = 48;
const WEEKS_PER_MONTH = 4;
const QUESTIONS_PER_STUDY = 4;
const QUESTIONS_PER_JOB = 3;
const QUESTIONS_PER_BANQUET = 3;
const BANQUET_PASS_COUNT = 3;
const BANQUET_ENTRY_FEE = 150;
const BANQUET_MIN_TIER = 1;
const PRINCE_MIN_TIER = 2;
const AFFECTION_DECAY_GRACE_TURNS = 3;
const AFFECTION_DECAY_AMOUNT = 1;

const ITEMS = [
  { id: 'sharp', cost: 300, goldBonus: 0.1 },
  { id: 'tablet', cost: 600, intBonus: 1 },
  { id: 'maid', cost: 700 },
  { id: 'apartment', cost: 1000, restBonus: 0.5 },
  { id: 'laptop', cost: 1200, comboBonus: 0.2 },
  { id: 'gardener', cost: 1300 },
  { id: 'tiara', cost: 1500, charmBonus: 1 },
  { id: 'invitation', cost: 2000, affectionBonus: 2 },
  { id: 'house', cost: 2500, restBonus: 0.5 },
  { id: 'aiTutor', cost: 3500, goldBonus: 0.25, intBonus: 2 },
  { id: 'orchestra', cost: 4000, intBonus: 2 },
  { id: 'palace', cost: 5000, restBonus: 0.5 },
];

const OUTFIT_TIERS = [
  { min: 0, cost: 0 },
  { min: 25, cost: 400 },
  { min: 50, cost: 900 },
  { min: 75, cost: 1800 },
  { min: 90, cost: 3200 },
  { min: 100, cost: 6000 },
];

const NPC_DEFS = [
  { id: 'friend', unlock: () => true, apply: (s) => { s.stats.charm += 6; } },
  { id: 'rival', unlock: () => true, apply: (s) => { s.stats.intelligence += 3; s.stats.stress += 3; } },
  { id: 'teacher', unlock: () => true, apply: (s) => { s.stats.intelligence += 2; s.stats.stress -= 5; } },
  { id: 'noble', unlock: (stats) => graceScore(stats) >= 35, apply: (s) => { s.stats.charm += 4; s.stats.creativity += 3; } },
  { id: 'prince', unlock: (stats) => graceScore(stats) >= 55, apply: (s) => { s.stats.charm += 5; s.stats.luck += 2; } },
  { id: 'sage', unlock: (stats) => stats.intelligence >= 55, apply: (s) => { s.stats.intelligence += 4; s.stats.creativity += 2; } },
];

const EVENTS = [
  { apply: (s) => { s.stats.charm += 3; } },
  { apply: (s) => { s.stats.intelligence += 2; s.stats.stress += 3; } },
  { apply: (s) => { s.gold += 20; s.stats.luck += 1; } },
  { apply: (s) => { s.stats.stamina -= 10; } },
  { apply: (s) => { s.stats.charm += 2; s.stats.stress -= 5; } },
  { apply: (s) => { s.gold += 100; }, requirement: (s) => s.stats.intelligence >= 50 },
];

function graceScore(stats) { return stats.charm * 0.4 + stats.creativity * 0.3 + stats.intelligence * 0.3; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[randInt(0, arr.length - 1)]; }
function comboMultiplier(combo) { if (combo >= 20) return 3.0; if (combo >= 10) return 2.2; if (combo >= 5) return 1.6; if (combo >= 2) return 1.2; return 1.0; }

function clampStats(state) {
  STAT_KEYS.forEach((k) => { state.stats[k] = Math.max(0, Math.min(100, state.stats[k])); });
  state.gold = Math.max(0, state.gold);
  state.npcs.forEach((n) => { n.affection = Math.max(0, Math.min(100, n.affection)); });
}
function itemBonusSum(state, key) { return ITEMS.filter((i) => state.items[i.id]).reduce((sum, i) => sum + (i[key] || 0), 0); }
function currentOutfitTier(stats) { const grace = graceScore(stats); let t = 0; OUTFIT_TIERS.forEach((o, i) => { if (grace >= o.min) t = i; }); return t; }

function unlockedLevelsFor(state, subjectKey) {
  const subj = SUBJECTS[subjectKey]; const ids = [];
  for (let i = 1; i <= subj.maxLevel; i++) if (subj.isLevelUnlocked(i, state.stats.intelligence)) ids.push(i);
  return ids;
}
function pickRandomSubjectAndLevel(state) {
  const subjectKey = randChoice(SUBJECT_KEYS); const unlocked = unlockedLevelsFor(state, subjectKey);
  const recentBand = unlocked.slice(-3); return { subject: subjectKey, level: randChoice(recentBand.length ? recentBand : [1]) };
}
function pickRandomSubjectLevel1() { return { subject: randChoice(SUBJECT_KEYS), level: 1 }; }

function scenarioUnlocked(scenario, state) {
  const u = scenario.unlock || {};
  if (typeof u.minGrace === 'number' && graceScore(state.stats) < u.minGrace) return false;
  if (u.minStat && state.stats[u.minStat.key] < u.minStat.value) return false;
  if (u.minAffection) { const n = state.npcs.find((x) => x.id === u.minAffection.npcId); if (!n || n.affection < u.minAffection.value) return false; }
  return true;
}
function findActiveScenario(state, npcId) {
  return SC.SCENARIOS.find((s) => s.npcId === npcId && s.status === 'ready' && !s.bespoke && !state.completedScenarios.includes(s.id) && scenarioUnlocked(s, state)) || null;
}
function applyStatNpcEffects(state, statEffects, npcEffects) {
  if (statEffects) Object.keys(statEffects).forEach((k) => { state.stats[k] += statEffects[k]; });
  if (npcEffects) Object.keys(npcEffects).forEach((npcId) => {
    const n = state.npcs.find((x) => x.id === npcId); if (!n) return;
    const eff = npcEffects[npcId]; const gain = Array.isArray(eff) ? randInt(eff[0], eff[1]) : eff;
    n.affection += gain + itemBonusSum(state, 'affectionBonus'); n.lastMetTurn = state.turn;
  });
}

function runQuestionSession(state, type, count, answerRate) {
  let correctCount = 0;
  const bonusTypes = ['exercise-bonus', 'rest-bonus', 'laundry-bonus', 'garden-bonus'];
  for (let i = 0; i < count; i++) {
    let level = 0, subjectKey = null;
    if (type === 'study' || bonusTypes.includes(type)) { const p = pickRandomSubjectAndLevel(state); subjectKey = p.subject; level = p.level; }
    else if (type === 'job') { const p = pickRandomSubjectLevel1(); subjectKey = p.subject; level = p.level; }
    const rewardGold = subjectKey ? 8 + level * 4 : 0;
    const correct = Math.random() < answerRate;
    if (correct) {
      state.combo++; state.bestCombo = Math.max(state.bestCombo, state.combo);
      if (type === 'banquet') state.stats.charm += 4 + itemBonusSum(state, 'charmBonus');
      else if (type === 'scenario-quiz' || bonusTypes.includes(type)) { /* 세션 종료 시 일괄 적용 */ }
      else {
        const multiplier = comboMultiplier(state.combo) + itemBonusSum(state, 'comboBonus');
        const jobBonus = type === 'job' ? 1.5 : 1;
        const goldMultiplier = 1 + itemBonusSum(state, 'goldBonus');
        state.gold += Math.round(rewardGold * multiplier * jobBonus * goldMultiplier);
        if (type === 'study') { state.stats.intelligence += level + itemBonusSum(state, 'intBonus'); state.stats.creativity += level * 0.2; }
        else state.stats.stamina -= 2;
      }
      state.totalCorrect++; correctCount++;
    } else {
      state.combo = 0;
      if (type === 'banquet') state.stats.stress += 2;
      else if (type === 'study') { state.stats.stress += 6; state.stats.stamina -= 4; }
      else if (type !== 'scenario-quiz' && !bonusTypes.includes(type)) state.stats.stamina -= 3;
    }
    clampStats(state);
  }
  return correctCount;
}

function maybeTriggerEvent(state, chance) {
  if (Math.random() > chance) return;
  const pool = EVENTS.filter((ev) => !ev.requirement || ev.requirement(state));
  randChoice(pool).apply(state);
  clampStats(state);
}

function runScenario(state, scenario, answerRate, log) {
  if (scenario.type === 'quiz') {
    const c = runQuestionSession(state, 'scenario-quiz', scenario.quiz.questionsPerSession, answerRate);
    const outcome = c >= scenario.quiz.passCount ? scenario.outcomes.success : scenario.outcomes.fail;
    applyStatNpcEffects(state, outcome.statEffects, outcome.npcEffects);
    const n = state.npcs.find((x) => x.id === scenario.npcId); if (n) n.lastMetTurn = state.turn;
  } else if (scenario.type === 'branching') {
    const opt = randChoice(scenario.branching.options);
    applyStatNpcEffects(state, opt.statEffects, opt.npcEffects);
    applyStatNpcEffects(state, scenario.outcomes.success.statEffects, scenario.outcomes.success.npcEffects);
    const n = state.npcs.find((x) => x.id === scenario.npcId); if (n) n.lastMetTurn = state.turn;
  } else {
    applyStatNpcEffects(state, scenario.outcomes.success.statEffects, scenario.outcomes.success.npcEffects);
    const n = state.npcs.find((x) => x.id === scenario.npcId); if (n) n.lastMetTurn = state.turn;
  }
  clampStats(state);
  if (!state.completedScenarios.includes(scenario.id)) state.completedScenarios.push(scenario.id);
  log.scenariosCompleted.push(scenario.id);
}

function meetNpc(state, npcId, answerRate, log) {
  if (npcId === 'prince' && state.wardrobe.equipped < PRINCE_MIN_TIER) {
    log.princeBlockedByOutfit = (log.princeBlockedByOutfit || 0) + 1;
    return;
  }
  const activeScenario = findActiveScenario(state, npcId);
  if (activeScenario) { runScenario(state, activeScenario, answerRate, log); return; }
  const def = NPC_DEFS.find((n) => n.id === npcId);
  const n = state.npcs.find((x) => x.id === npcId);
  def.apply(state);
  n.affection += randInt(8, 14) + itemBonusSum(state, 'affectionBonus');
  n.lastMetTurn = state.turn;
  clampStats(state);
}

function tryRunBanquet(state, answerRate, log) {
  if (state.wardrobe.equipped < BANQUET_MIN_TIER) { log.banquetBlockedByOutfit = (log.banquetBlockedByOutfit || 0) + 1; return; }
  if (state.gold < BANQUET_ENTRY_FEE) { log.banquetBlockedByGold = (log.banquetBlockedByGold || 0) + 1; return; }
  state.gold -= BANQUET_ENTRY_FEE;
  const c = runQuestionSession(state, 'banquet', QUESTIONS_PER_BANQUET, answerRate);
  const dressedForPrince = state.wardrobe.equipped >= PRINCE_MIN_TIER;
  if (c >= BANQUET_PASS_COUNT && dressedForPrince) {
    const prince = state.npcs.find((n) => n.id === 'prince');
    prince.affection += randInt(10, 16) + itemBonusSum(state, 'affectionBonus');
    prince.lastMetTurn = state.turn;
    clampStats(state);
    log.banquetSuccesses = (log.banquetSuccesses || 0) + 1;
  }
}

function applyServantEffects(state) {
  if (state.items.maid) state.stats.stress = Math.max(0, state.stats.stress - 2);
  if (state.items.gardener) state.gold += 10;
}
function applyAffectionDecay(state) {
  state.npcs.forEach((n) => { if (state.turn - n.lastMetTurn > AFFECTION_DECAY_GRACE_TURNS) n.affection = Math.max(0, n.affection - AFFECTION_DECAY_AMOUNT); });
}
function maybeBuyItems(state) {
  ITEMS.forEach((item) => { if (!state.items[item.id] && state.gold >= item.cost) { state.gold -= item.cost; state.items[item.id] = true; } });
}
// 품위로 해금된(구매 가능한) 최고 단계 옷을 살 수 있으면 사서 갈아입는다("옷을 갖춰 입는" 정책).
function maybeBuyOutfit(state) {
  const graceTier = currentOutfitTier(state.stats);
  for (let t = graceTier; t > state.wardrobe.equipped; t--) {
    if (state.wardrobe.owned[t]) { state.wardrobe.equipped = t; return; }
    if (state.gold >= OUTFIT_TIERS[t].cost) {
      state.gold -= OUTFIT_TIERS[t].cost;
      state.wardrobe.owned[t] = true;
      state.wardrobe.equipped = t;
      return;
    }
  }
}

function makeInitialState() {
  return {
    turn: 1, gold: 0,
    stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: randInt(10, 30) },
    totalCorrect: 0, combo: 0, bestCombo: 0, items: {},
    npcs: NPC_DEFS.map((n) => ({ id: n.id, affection: randInt(10, 20), lastMetTurn: 0 })),
    wardrobe: { equipped: 0, owned: OUTFIT_TIERS.map((_, i) => i === 0) },
    completedScenarios: [],
  };
}

function runWeekActivity(state, activity, answerRate, log) {
  if (activity === 'study') runQuestionSession(state, 'study', QUESTIONS_PER_STUDY, answerRate);
  else if (activity === 'job') runQuestionSession(state, 'job', QUESTIONS_PER_JOB, answerRate);
  else if (activity === 'exercise') {
    const c = runQuestionSession(state, 'exercise-bonus', 1, answerRate); const bonus = c > 0;
    state.stats.stamina += 8; state.stats.focus += 4; state.stats.stress += 3;
    if (bonus) { state.stats.focus += 3; state.stats.stamina += 2; }
    clampStats(state); maybeTriggerEvent(state, 0.25);
  } else if (activity === 'rest') {
    const c = runQuestionSession(state, 'rest-bonus', 1, answerRate); const bonus = c > 0;
    const rm = 1 + itemBonusSum(state, 'restBonus');
    state.stats.stress -= 12 * rm; state.stats.stamina += 10 * rm;
    if (bonus) { state.stats.stress -= 5; state.stats.stamina += 3; }
    clampStats(state); maybeTriggerEvent(state, 0.15);
  } else if (activity === 'laundry') {
    if (state.items.maid) return; // 자동화되어 스케줄할 필요 없음(실제 UI에서도 잠김)
    const c = runQuestionSession(state, 'laundry-bonus', 1, answerRate); const bonus = c > 0;
    state.stats.stress -= 6; state.stats.stamina -= 2; state.gold += 10;
    if (bonus) { state.stats.stress -= 3; state.gold += 5; }
    clampStats(state);
  } else if (activity === 'garden') {
    if (state.items.gardener) return;
    const c = runQuestionSession(state, 'garden-bonus', 1, answerRate); const bonus = c > 0;
    state.stats.stamina -= 4; state.gold += 25;
    if (bonus) state.gold += 15;
    clampStats(state);
  } else if (activity === 'friend') {
    // 실제 게임은 플레이어가 인물을 직접 고르지만, 시뮬레이션에서는 정책이 npcId를 넘겨준다.
  } else if (activity === 'banquet') {
    tryRunBanquet(state, answerRate, log);
  }
}

// "균형 잡힌" 플레이어: 매주(월 4주 x 48개월 = 총 192주) 공부/알바/운동/휴식/
// 빨래/텃밭/친구 만나기/연회를 고루 섞어서 진행한다. 친구는 6명을 순환 방문한다.
const WEEK_ACTIVITY_PATTERN = ['study', 'friend', 'job', 'laundry', 'exercise', 'friend', 'study', 'garden', 'rest', 'banquet', 'friend', 'study'];

function simulateBalanced(answerRate) {
  const state = makeInitialState();
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

      if (activity === 'friend') {
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
      clampStats(state);
    }
    // 월말(advanceTurn)에만 한 번 적용되는 것들
    applyServantEffects(state);
    applyAffectionDecay(state);
    clampStats(state);
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
  const state = makeInitialState();
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

      if (activity === 'friend-prince') meetNpc(state, 'prince', answerRate, log);
      else runWeekActivity(state, activity, answerRate, log);
      maybeBuyOutfit(state);
      clampStats(state);
    }
    applyServantEffects(state);
    applyAffectionDecay(state);
    clampStats(state);
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

console.log('48개월 x 4주 밸런스 시뮬레이션');

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
