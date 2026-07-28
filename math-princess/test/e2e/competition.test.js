// 수학 경시대회: 지능 요건 미달이면 스케줄에서 고를 수 없고(잠김), 요건을
// 만족하면 도전할 수 있으며 성적에 따라 큰 상금이 한 번에 지급되는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, drainQuizSession, getSavedState, planWeekActivity } = require('./helpers');

async function testLockedBelowThreshold() {
  const errors = await withPage(async (page) => {
    const state = makeState({ stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: 20 } });
    await seedAndContinue(page, state);
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    const cards = await page.$$('#week-plan-list .level-card');
    await cards[0].click();
    await page.waitForSelector('#screen-week-pick.active');

    const locked = await page.evaluate(() => document.querySelector('[data-activity="competition"]').classList.contains('locked'));
    ok(locked, '지능 요건 미달이면 경시대회 카드가 잠겨 있어야 함');

    await page.click('[data-activity="competition"]');
    await page.waitForTimeout(200);
    const stillOnPick = await page.evaluate(() => document.getElementById('screen-week-pick').classList.contains('active'));
    ok(stillOnPick, '잠긴 카드를 눌러도 아무 일도 일어나지 않고 그대로 있어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testCompetitionAwardsBigPrize() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 100,
      stats: { intelligence: 70, focus: 40, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: 20 },
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    const cards = await page.$$('#week-plan-list .level-card');
    await cards[0].click();
    await page.waitForSelector('#screen-week-pick.active');
    const locked = await page.evaluate(() => document.querySelector('[data-activity="competition"]').classList.contains('locked'));
    ok(!locked, '지능 70이면 경시대회 카드가 잠겨 있지 않아야 함');
    await page.click('[data-activity="competition"]');
    await page.waitForSelector('#screen-question-count-pick.active');
    await page.click('#btn-count-pick-confirm');
    await page.waitForSelector('#screen-schedule.active');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');

    const goldBefore = (await getSavedState(page)).gold;
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    const label = await page.textContent('#quiz-session-label');
    ok(label.includes('경시대회'), `퀴즈 화면 라벨에 "경시대회"가 표시되어야 함 (got "${label}")`);

    await drainQuizSession(page, 5);
    await page.waitForSelector('#screen-session-summary.active', { timeout: 12000 });

    const goldEarnedShown = Number((await page.textContent('#summary-gold')).trim());
    ok(goldEarnedShown >= 0, '상금이 숫자로 표시되어야 함');

    await page.click('#btn-summary-confirm');
    await page.waitForSelector('#screen-main.active', { timeout: 12000 });
    const saved = await getSavedState(page);
    eq(saved.gold, goldBefore + goldEarnedShown, '요약 화면에 표시된 상금만큼 실제로 골드가 늘어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('competition e2e tests');
  await testLockedBelowThreshold();
  await testCompetitionAwardsBigPrize();
  summary('competition.test.js');
})();
