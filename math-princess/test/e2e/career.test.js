// 직업(정식 취업) 시스템: 요건 미달이면 지원할 수 없고, 요건을 만족하면
// 상점의 "직업" 탭에서 지원해 매턴 자동으로 급여가 들어오는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, getSavedState, drainQuizSession, activeScreenId } = require('./helpers');

async function testLockedWithoutRequirement() {
  const errors = await withPage(async (page) => {
    const state = makeState({ gold: 500, stats: { intelligence: 10, focus: 10, stamina: 50, charm: 10, creativity: 10, stress: 10, luck: 10 } });
    await seedAndContinue(page, state);
    await page.click('[data-menu="shop"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="career"]');
    await page.waitForTimeout(150);

    const cardStates = await page.$$eval('.career-card', (cards) => cards.map((c) => ({
      locked: c.className.includes('locked'),
      disabled: c.querySelector('.shop-buy-btn').disabled,
    })));
    ok(cardStates.every((c) => c.locked && c.disabled), '요건을 하나도 만족하지 못하면 모든 직업 카드가 잠겨 있어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testApplyAndMonthlyIncome() {
  const errors = await withPage(async (page) => {
    const state = makeState({ gold: 500, stats: { intelligence: 30, focus: 10, stamina: 50, charm: 10, creativity: 10, stress: 10, luck: 10 } });
    await seedAndContinue(page, state);
    await page.click('[data-menu="shop"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="career"]');
    await page.waitForTimeout(150);

    const cards = await page.$$('.career-card');
    const firstBuyBtn = await cards[0].$('.shop-buy-btn');
    ok(!(await firstBuyBtn.isDisabled()), '지능 30이면 첫 번째 직업(과외 선생님)은 지원 가능해야 함');
    await firstBuyBtn.click();
    await page.waitForTimeout(150);

    let saved = await getSavedState(page);
    eq(saved.career, 'tutor', '지원하면 그 직업으로 취업되어야 함');

    const employedBadge = await page.$('.career-card.employed');
    ok(employedBadge, '취업한 카드는 "재직 중" 상태로 표시되어야 함');

    // 상태 화면에도 직업 배지가 보여야 함
    await page.click('#btn-shop-back');
    await page.waitForSelector('#screen-main.active');
    await page.click('[data-menu="status"]');
    await page.waitForSelector('#screen-status.active');
    const careerBadgeVisible = await page.evaluate(() => getComputedStyle(document.getElementById('status-career-badge')).display !== 'none');
    ok(careerBadgeVisible, '상태 화면에 직업 배지가 표시되어야 함');
    await page.click('#btn-status-back');
    await page.waitForSelector('#screen-main.active');

    // 한 달(4주)을 흘려보내며 급여가 자동으로 들어오는지 확인
    const goldBeforeMonth = (await getSavedState(page)).gold;
    for (let week = 0; week < 4; week++) {
      await page.click('[data-menu="schedule"]');
      await page.waitForSelector('#screen-schedule.active');
      const planCards = await page.$$('#week-plan-list .level-card');
      await planCards[week].click();
      await page.waitForSelector('#screen-week-pick.active');
      await page.click('[data-activity="rest"]');
      await page.waitForSelector('#screen-schedule.active');
      await page.click('#btn-schedule-back');
      await page.waitForSelector('#screen-main.active');

      await page.click('[data-menu="execute"]');
      await page.waitForSelector('#screen-quiz.active');
      await drainQuizSession(page);
      const active = await activeScreenId(page);
      if (active === 'screen-event') await page.click('#btn-event-confirm');
      await page.waitForSelector('#screen-main.active', { timeout: 12000 });
    }
    saved = await getSavedState(page);
    ok(saved.gold > goldBeforeMonth, '한 달이 지나면 취업 급여가 자동으로 들어와 골드가 늘어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('career e2e tests');
  await testLockedWithoutRequirement();
  await testApplyAndMonthlyIncome();
  summary('career.test.js');
})();
