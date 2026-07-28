// 메인 화면 게이지바에 "이번 달 남은 계획을 다 하면 여기까지 오를 수 있어요"를
// 보여주는 반투명 예상 바(.stat-row-projected)가 계획 내용에 맞게 뜨는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState } = require('./helpers');

async function readBarWidths(page, key) {
  return page.evaluate((k) => {
    const row = document.querySelector(`#main-stat-panel .stat-row[data-stat-key="${k}"]`);
    return {
      fill: parseFloat(row.querySelector('.stat-row-fill').style.width),
      projected: parseFloat(row.querySelector('.stat-row-projected').style.width),
    };
  }, key);
}

async function testNoPlanMeansNoProjection() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekPlan: [null, null, null, null] }));
    const widths = await readBarWidths(page, 'intelligence');
    eq(widths.projected, widths.fill, '계획된 활동이 없으면 예상 바가 현재 게이지와 같아야 함(더 늘어나 보이면 안 됨)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testStudyPlanProjectsIntelligenceGrowth() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekPlan: ['study', 'study', 'study', 'study'] }));
    const widths = await readBarWidths(page, 'intelligence');
    ok(widths.projected > widths.fill, `공부를 4주 계획해두면 지능 예상 바가 현재보다 넓어야 함 (fill=${widths.fill}, projected=${widths.projected})`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testProjectionUpdatesAfterEditingSchedule() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekPlan: [null, null, null, null] }));
    const before = await readBarWidths(page, 'intelligence');
    eq(before.projected, before.fill, '계획을 세우기 전에는 예상 바가 없어야 함');

    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    const cards = await page.$$('#week-plan-list .level-card');
    await cards[0].click();
    await page.waitForSelector('#screen-week-pick.active');
    await page.click('[data-activity="study"]');
    await page.waitForSelector('#screen-schedule.active');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');

    const after = await readBarWidths(page, 'intelligence');
    ok(after.projected > after.fill, `스케줄 화면에서 공부를 계획하고 돌아오면 예상 바가 즉시 갱신되어야 함 (fill=${after.fill}, projected=${after.projected})`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('projected-gauge e2e tests');
  await testNoPlanMeansNoProjection();
  await testStudyPlanProjectsIntelligenceGrowth();
  await testProjectionUpdatesAfterEditingSchedule();
  summary('projected-gauge.test.js');
})();
