// 빨래하기/텃밭 가꾸기 활동, 하녀/정원사 고용 시 자동화(스케줄 잠금) 검증.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, drainQuizSession, getSavedState } = require('./helpers');

async function planWeek(page, weekIdx, activity) {
  await page.click('[data-menu="schedule"]');
  await page.waitForSelector('#screen-schedule.active');
  const cards = await page.$$('#week-plan-list .level-card');
  await cards[weekIdx].click();
  await page.waitForSelector('#screen-week-pick.active');
  const locked = await page.evaluate((a) => document.querySelector(`[data-activity="${a}"]`).classList.contains('locked'), activity);
  await page.click(`[data-activity="${activity}"]`);
  if (!locked) {
    await page.waitForSelector('#screen-schedule.active');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');
  }
  return locked;
}

(async () => {
  console.log('servants e2e tests');
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 3000 }));

    const laundryLockedBefore = await planWeek(page, 0, 'laundry');
    ok(!laundryLockedBefore, '하녀 없을 때 빨래하기는 잠겨 있지 않아야 함');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    await drainQuizSession(page, 2);
    await page.waitForSelector('#screen-main.active', { timeout: 12000 });
    let saved = await getSavedState(page);
    eq(saved.weekIndex, 1, '빨래하기 완료 후 weekIndex가 1로 진행되어야 함');

    await planWeek(page, 1, 'garden');
    const goldBefore = saved.gold;
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    await drainQuizSession(page, 2);
    await page.waitForSelector('#screen-main.active', { timeout: 12000 });
    saved = await getSavedState(page);
    ok(saved.gold > goldBefore, `텃밭 가꾸기는 골드를 벌어야 함 (before ${goldBefore}, after ${saved.gold})`);

    // 하녀/정원사 고용
    await page.click('[data-menu="shop"]');
    await page.waitForSelector('#screen-shop.active');
    for (const label of ['하녀 고용', '정원사 고용']) {
      const cards = await page.$$('.shop-item');
      for (const c of cards) {
        const title = await c.$eval('.level-title', (el) => el.textContent);
        if (title === label) {
          const btn = await c.$('.shop-buy-btn');
          if ((await btn.getAttribute('disabled')) === null) await btn.click();
          await page.waitForTimeout(150);
          break;
        }
      }
    }
    saved = await getSavedState(page);
    ok(saved.items.maid && saved.items.gardener, '하녀/정원사를 구매하면 items에 기록되어야 함');
    await page.click('#btn-shop-back');
    await page.waitForSelector('#screen-main.active');

    // 3주차 픽커에서 빨래/텃밭이 잠겨 있어야 함
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    const cards3 = await page.$$('#week-plan-list .level-card');
    await cards3[2].click();
    await page.waitForSelector('#screen-week-pick.active');
    const laundryLockedAfter = await page.evaluate(() => document.querySelector('[data-activity="laundry"]').classList.contains('locked'));
    const gardenLockedAfter = await page.evaluate(() => document.querySelector('[data-activity="garden"]').classList.contains('locked'));
    ok(laundryLockedAfter, '하녀 고용 후 빨래하기는 잠겨(자동화) 있어야 함');
    ok(gardenLockedAfter, '정원사 고용 후 텃밭 가꾸기는 잠겨(자동화) 있어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
  summary('servants.test.js');
})();
