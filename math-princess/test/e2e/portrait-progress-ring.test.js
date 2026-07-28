// 메인 화면 초상화 테두리의 "평민 → 공주" 경험치 링(품위 점수 기반)을 검증한다.
// 실제로 입고 있는 옷(착장)이 아니라 품위 점수 자체(잠재적으로 어디까지
// 갈 수 있는지)를 기준으로 채워지고 색이 바뀌어야 한다는 점이 핵심이다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState } = require('./helpers');

const RING_CIRCUMFERENCE = 2 * Math.PI * 46;

function expectedOffset(percent) {
  return RING_CIRCUMFERENCE * (1 - percent / 100);
}

async function getRingState(page) {
  return page.evaluate(() => {
    const fill = document.querySelector('#portrait-exp-ring-fill');
    return {
      dashoffset: Number(fill.style.strokeDashoffset),
      stroke: fill.style.stroke,
      label: document.querySelector('#portrait-progress-label').textContent,
    };
  });
}

async function testRingReflectsGraceScoreNotEquippedOutfit() {
  const errors = await withPage(async (page) => {
    // grace = 60*.4 + 50*.3 + 60*.3 = 24+15+18 = 57 (tier2 잠재력) 이지만
    // 실제로는 아직 평범한 옷(tier0)을 입고 있는 상태.
    const state = makeState({
      stats: { intelligence: 60, focus: 40, stamina: 60, charm: 60, creativity: 50, stress: 20, luck: 30 },
      wardrobe: { equipped: 0, owned: [true, false, false, false, false, false], notifiedGraceTier: 0 },
    });
    await seedAndContinue(page, state);
    await page.waitForTimeout(200);

    const ring = await getRingState(page);
    ok(Math.abs(ring.dashoffset - expectedOffset(57)) < 1, `링 채움 정도가 품위 점수(57%)를 반영해야 함(got dashoffset=${ring.dashoffset})`);
    eq(ring.label, '평민 → 공주 57%', `진행률 라벨이 품위 점수를 그대로 보여줘야 함 (got "${ring.label}")`);
    ok(ring.stroke === 'rgb(180, 143, 255)' || ring.stroke === '#b48fff', `품위 57은 tier2(예쁜 드레스) 색이어야 함(실제 착장과 무관) (got "${ring.stroke}")`);

    const badge = await page.textContent('#outfit-badge');
    ok(badge.includes('평범한 옷'), '옷 배지는 여전히 실제 착장(평범한 옷)을 보여줘야 함(링과는 별개)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(품위 기반 링): ${errors.join('\n')}`);
}

async function testRingAtZeroAndNearMax() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ stats: { intelligence: 0, focus: 0, stamina: 50, charm: 0, creativity: 0, stress: 10, luck: 0 } }));
    await page.waitForTimeout(200);
    const zeroRing = await getRingState(page);
    eq(zeroRing.label, '평민 → 공주 0%', '능력치가 전부 0이면 진행률도 0%여야 함');
    ok(Math.abs(zeroRing.dashoffset - RING_CIRCUMFERENCE) < 1, '진행률 0%면 링이 전혀 채워지지 않아야 함(dashoffset = 전체 둘레)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(0%): ${errors.join('\n')}`);

  const errors2 = await withPage(async (page) => {
    // grace = 100*.4+100*.3+100*.3 = 100 (만점)
    await seedAndContinue(page, makeState({ stats: { intelligence: 100, focus: 50, stamina: 50, charm: 100, creativity: 100, stress: 10, luck: 30 } }));
    await page.waitForTimeout(200);
    const maxRing = await getRingState(page);
    eq(maxRing.label, '평민 → 공주 100%', '품위 만점이면 진행률도 100%여야 함');
    ok(Math.abs(maxRing.dashoffset) < 1, '진행률 100%면 링이 완전히 채워져야 함(dashoffset ≈ 0)');
  });
  ok(errors2.length === 0, `JS 에러 없어야 함(100%): ${errors2.join('\n')}`);
}

(async () => {
  console.log('portrait-progress-ring e2e tests');
  await testRingReflectsGraceScoreNotEquippedOutfit();
  await testRingAtZeroAndNearMax();
  summary('portrait-progress-ring.test.js');
})();
