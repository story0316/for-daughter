// reward-engine.js(보상 엔진) 유닛 테스트. "정답/오답에 얼마를 줄지"만
// 검증한다 — 어떤 문제를 낼지는 question-engine.test.js가 담당한다.
// 밸런스 수치(배율, 증감량)를 조정했을 때 가장 먼저 깨져야 할 테스트다.
const path = require('path');
const { ok, eq, approx, summary } = require('../helpers/assert');

const BASE = path.join(__dirname, '..', '..');
const { createRewardEngine } = require(path.join(BASE, 'reward-engine.js'));

// 실제 ITEMS 상수는 game-engine.js에 있지만, reward-engine.js는 ITEMS를
// 주입받아 쓰므로 여기서는 필요한 필드만 가진 최소 아이템 목록으로 테스트한다.
const ITEMS = [
  { id: 'sharp', goldBonus: 0.1 },
  { id: 'tablet', intBonus: 1 },
  { id: 'laptop', comboBonus: 0.2 },
  { id: 'tiara', charmBonus: 1 },
  { id: 'invitation', affectionBonus: 2 },
  { id: 'apartment', restBonus: 0.5 },
  { id: 'sketchbook', creativityBonus: 1 },
  { id: 'clover-necklace', luckBonus: 1 },
];

const Reward = createRewardEngine({ ITEMS });

console.log('reward-engine.js unit tests');

/* ---------------- 콤보 배율 / 아이템 보너스 ---------------- */

eq(Reward.comboMultiplier(0), 1.0, '콤보 0은 배율 1.0');
eq(Reward.comboMultiplier(2), 1.2, '콤보 2부터 배율 1.2');
eq(Reward.comboMultiplier(5), 1.6, '콤보 5부터 배율 1.6');
eq(Reward.comboMultiplier(10), 2.2, '콤보 10부터 배율 2.2');
eq(Reward.comboMultiplier(20), 3.0, '콤보 20부터 배율 3.0');

eq(Reward.itemBonusSum({}, 'goldBonus'), 0, '아이템이 없으면 보너스 합은 0');
eq(Reward.itemBonusSum({ sharp: true }, 'goldBonus'), 0.1, '아이템 하나 보유 시 그 보너스만 합산');
approx(Reward.itemBonusSum({ sharp: true, }, 'goldBonus'), 0.1, 0.001, '샤프 하나면 goldBonus 0.1');
eq(Reward.itemBonusSum({ sharp: true, tablet: true }, 'intBonus'), 1, '다른 키의 보너스는 섞이지 않아야 함');

/* ---------------- 정답 보상 ---------------- */

{
  const r = Reward.correctAnswerReward('study', { level: 3, rewardGold: 10 }, 1, {});
  eq(r.gold, 10, '콤보 1(배율 1.0)에서 공부 정답 골드는 rewardGold 그대로');
  eq(r.intelligence, 3, '공부 정답은 문제 레벨만큼 지능이 오름(아이템 없을 때)');
  approx(r.creativity, 0.6, 0.001, '공부 정답은 레벨*0.2만큼 창의력이 오름');
}
{
  const r = Reward.correctAnswerReward('study', { level: 3, rewardGold: 10 }, 1, { tablet: true });
  eq(r.intelligence, 4, '태블릿 보유 시 지능 보너스 +1이 더해져야 함');
}
{
  const r = Reward.correctAnswerReward('study', { level: 3, rewardGold: 10 }, 1, { sketchbook: true });
  approx(r.creativity, 1.6, 0.001, '창의력 스케치북 보유 시 공부 정답 창의력 보너스 +1이 더해져야 함(0.6+1)');
}
{
  const r = Reward.correctAnswerReward('job', { level: 1, rewardGold: 10 }, 1, {});
  eq(r.gold, 15, '알바는 골드에 1.5배 보너스가 붙어야 함(10 * 1.5)');
  ok(typeof r.intelligence === 'undefined', '알바 정답은 지능을 올리지 않음');
  eq(r.stamina, -2, '알바 정답은 체력을 2 소모');
}
{
  const r = Reward.correctAnswerReward('study', { level: 1, rewardGold: 10 }, 10, {});
  eq(r.gold, 22, '콤보 10(배율 2.2)에서 골드는 rewardGold*2.2 반올림');
}
{
  const r = Reward.correctAnswerReward('banquet', {}, 1, {});
  eq(r.charm, 4, '연회 정답은 매력 +4(아이템 없을 때)');
  ok(typeof r.gold === 'undefined', '연회는 골드를 주지 않음');
}
{
  const r = Reward.correctAnswerReward('banquet', {}, 1, { tiara: true });
  eq(r.charm, 5, '티아라 보유 시 연회 매력 보너스 +1이 더해져야 함');
}
['scenario-quiz', 'exercise-bonus', 'rest-bonus', 'laundry-bonus', 'garden-bonus'].forEach((type) => {
  const r = Reward.correctAnswerReward(type, { level: 1, rewardGold: 10 }, 1, {});
  eq(Object.keys(r).length, 0, `${type}은 정답 즉시가 아니라 세션 종료 시 한 번에 보상을 줘야 함(빈 객체)`);
});

/* ---------------- 오답 페널티 ---------------- */

eq(Reward.wrongAnswerPenalty('study').stress, 6, '공부 오답은 스트레스 +6');
eq(Reward.wrongAnswerPenalty('study').stamina, -4, '공부 오답은 체력 -4');
eq(Reward.wrongAnswerPenalty('job').stamina, -3, '알바 오답은 체력 -3');
eq(Reward.wrongAnswerPenalty('banquet').stress, 2, '연회 오답은 스트레스 +2');
['scenario-quiz', 'exercise-bonus', 'rest-bonus', 'laundry-bonus', 'garden-bonus'].forEach((type) => {
  eq(Object.keys(Reward.wrongAnswerPenalty(type)).length, 0, `${type}은 오답 즉시 페널티가 없어야 함`);
});

/* ---------------- 보너스 세션 종료 보상 ---------------- */

{
  const withoutBonus = Reward.exerciseBonusReward(false);
  const withBonus = Reward.exerciseBonusReward(true);
  eq(withoutBonus.stamina, 8, '운동 기본 체력 회복 +8');
  ok(withBonus.stamina > withoutBonus.stamina, '보너스 문제까지 맞히면 체력 회복이 더 커야 함');
}
{
  const base = Reward.restBonusReward(false, {});
  eq(base.stress, -12, '휴식 기본 스트레스 감소 -12');
  const withApartment = Reward.restBonusReward(false, { apartment: true });
  ok(withApartment.stress < base.stress, '아파트 보유 시 휴식 효과가 더 커야 함(스트레스가 더 많이 감소)');
}
{
  const withoutBonus = Reward.laundryBonusReward(false);
  const withBonus = Reward.laundryBonusReward(true);
  eq(withoutBonus.gold, 10, '빨래 기본 골드 +10');
  ok(withBonus.gold > withoutBonus.gold, '보너스 문제까지 맞히면 골드가 더 많아야 함');
  ok(withoutBonus.stress > 0, '직접 빨래하면 스트레스가 오히려 쌓여야 함(하녀 고용의 대가가 뚜렷해지도록)');
  ok(withBonus.stress < withoutBonus.stress, '보너스 문제까지 맞히면 그나마 스트레스가 덜 쌓여야 함');
  ok(withoutBonus.stamina < 0, '직접 빨래하면 체력도 소모되어야 함');
}
{
  const withoutBonus = Reward.gardenBonusReward(false, {});
  const withBonus = Reward.gardenBonusReward(true, {});
  eq(withoutBonus.gold, 25, '텃밭 기본 골드 +25');
  ok(withBonus.gold > withoutBonus.gold, '보너스 문제까지 맞히면 골드가 더 많아야 함');
  eq(withoutBonus.luck, 1, '텃밭은 기본으로도 행운 +1을 줘야 함(노동을 통해 행운을 키우는 대표 활동)');
  ok(withBonus.luck > withoutBonus.luck, '보너스 문제까지 맞히면 행운도 더 많아야 함');

  const withClover = Reward.gardenBonusReward(false, { 'clover-necklace': true });
  ok(withClover.luck > withoutBonus.luck, '네잎클로버 목걸이가 있으면 텃밭 행운 획득이 더 커야 함');
}

/* ---------------- 왕국 수학경시대회 상금 ---------------- */

{
  const lowLevel = Reward.competitionQuestionReward(1);
  const highLevel = Reward.competitionQuestionReward(8);
  ok(highLevel.gold > lowLevel.gold, '더 높은 레벨(더 어려운 문제)일수록 문제당 상금이 커져야 함');
  ok(lowLevel.gold > 0, '가장 쉬운 덧셈뺄셈 문제도 상금을 줘야 함');
  ok(lowLevel.intelligence > 0, '정답을 맞히면 지능도 올라야 함');

  const lowBonus = Reward.competitionPerfectBonus(1);
  const highBonus = Reward.competitionPerfectBonus(8);
  ok(highBonus.gold > lowBonus.gold, '만점 보너스도 가장 어려웠던 문제의 레벨이 높을수록 커져야 함');

  ok(Reward.wrongAnswerPenalty('competition').stress > 0, '경시대회 오답은 스트레스가 쌓여야 함');
}

/* ---------------- 창의력 올림피아드 상금 ---------------- */

{
  const perQuestion = Reward.creativityQuestionReward();
  ok(perQuestion.gold > 0, '창의력 문제 정답은 골드를 줘야 함');
  ok(perQuestion.creativity > 0, '창의력 문제 정답은 창의력도 올라야 함');

  const bonus = Reward.creativityPerfectBonus();
  ok(bonus.gold > 0, '만점 보너스는 골드를 줘야 함');
  ok(bonus.creativity > 0, '만점 보너스는 창의력도 추가로 올라야 함');
  const bonusWithLm = Reward.creativityPerfectBonus(1.5);
  ok(bonusWithLm.gold > bonus.gold, '문제 수를 많이 고를수록(lengthMultiplier) 만점 보너스 골드도 커져야 함');

  const correct = Reward.correctAnswerReward('creativity', {}, 1, {});
  eq(correct.gold, perQuestion.gold, '창의력 올림피아드는 콤보 배율 없이 문제당 고정 보상을 줘야 함');
  eq(correct.creativity, perQuestion.creativity, '창의력 올림피아드 정답 보상에 창의력 증가량이 포함되어야 함');
  ok(Reward.wrongAnswerPenalty('creativity').stress > 0, '창의력 올림피아드 오답은 스트레스가 쌓여야 함');

  const withSketchbook = Reward.correctAnswerReward('creativity', {}, 1, { sketchbook: true });
  ok(withSketchbook.creativity > correct.creativity, '창의력 스케치북 보유 시 창의력 올림피아드 정답 창의력 획득이 더 커야 함');
}

/* ---------------- 기도와 선행 ---------------- */

{
  const correct = Reward.correctAnswerReward('faith', {}, 1, {});
  ok(correct.luck > 0, '기도와 선행 정답은 행운을 올려야 함');
  ok(correct.stress < 0, '기도와 선행 정답은 스트레스를 내려야 함(차분해지는 시간)');
  eq(correct.gold, undefined, '기도와 선행은 골드를 주지 않는 활동이어야 함');

  const wrong = Reward.wrongAnswerPenalty('faith');
  eq(Object.keys(wrong).length, 0, '기도와 선행은 오답이어도 벌점이 없어야 함(마음가짐을 돌아보는 시간)');

  const withClover = Reward.correctAnswerReward('faith', {}, 1, { 'clover-necklace': true });
  ok(withClover.luck > correct.luck, '네잎클로버 목걸이 보유 시 기도와 선행 정답 행운 획득이 더 커야 함');
}

/* ---------------- 호감도 증가량 ---------------- */

{
  for (let i = 0; i < 30; i++) {
    const g = Reward.affectionGain([8, 14], {});
    ok(g >= 8 && g <= 14, `범위 [8,14] 안의 호감도 증가량이어야 함 (got ${g})`);
  }
  const g = Reward.affectionGain([8, 14], { invitation: true });
  ok(g >= 10 && g <= 16, '왕실 초대장 보유 시 호감도 증가량에 +2 보너스가 더해져야 함');
  eq(Reward.affectionGain(5, {}), 5, '고정값이 주어지면 그대로(보너스 없을 때)');
  eq(Reward.affectionGain(5, { invitation: true }), 7, '고정값 + 아이템 보너스');
}

summary('reward-engine.js');
