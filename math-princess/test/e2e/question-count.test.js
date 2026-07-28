// 공부/알바/왕국 수학경시대회는 문제 수를 슬라이더로 직접 고를 수 있고,
// 많이 고를수록 문제당 보상이 커진다는 표시가 뜨는지, 그리고 실제로 고른
// 문제 수만큼 퀴즈가 진행되는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, drainQuizSession, planWeekActivity } = require('./helpers');

async function testSliderShowsBiggerBonusAtHigherCount() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 500 }));
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    const cards = await page.$$('#week-plan-list .level-card');
    await cards[0].click();
    await page.waitForSelector('#screen-week-pick.active');
    await page.click('[data-activity="study"]');
    await page.waitForSelector('#screen-question-count-pick.active');

    const min = Number(await page.getAttribute('#count-pick-slider', 'min'));
    const max = Number(await page.getAttribute('#count-pick-slider', 'max'));
    ok(max > min, `슬라이더 최댓값이 최솟값보다 커야 함 (min=${min}, max=${max})`);

    await page.evaluate((n) => {
      const s = document.querySelector('#count-pick-slider');
      s.value = String(n);
      s.dispatchEvent(new Event('input', { bubbles: true }));
    }, min);
    const valueAtMin = await page.textContent('#count-pick-value');
    const bonusAtMin = await page.textContent('#count-pick-multiplier');
    ok(valueAtMin.includes(String(min)), `최솟값을 고르면 문제 수 표시가 ${min}이어야 함 (got "${valueAtMin}")`);

    await page.evaluate((n) => {
      const s = document.querySelector('#count-pick-slider');
      s.value = String(n);
      s.dispatchEvent(new Event('input', { bubbles: true }));
    }, max);
    const valueAtMax = await page.textContent('#count-pick-value');
    const bonusAtMax = await page.textContent('#count-pick-multiplier');
    ok(valueAtMax.includes(String(max)), `최댓값을 고르면 문제 수 표시가 ${max}여야 함 (got "${valueAtMax}")`);

    ok(bonusAtMax !== bonusAtMin, `문제 수에 따라 보상 배율 표시가 달라져야 함 (min="${bonusAtMin}", max="${bonusAtMax}")`);
    ok(/\+\d+%/.test(bonusAtMax), `문제 수를 최대로 고르면 보상이 커진다는 표시(+N%)가 있어야 함 (got "${bonusAtMax}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testChosenCountShownOnScheduleCard() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 500 }));
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    await planWeekActivity(page, 0, 'study', 9);

    const desc = await page.textContent('#week-plan-list .level-card .level-desc');
    ok(desc.includes('9'), `계획표 카드에 고른 문제 수(9)가 표시되어야 함 (got "${desc}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testExecutionUsesChosenCount() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 500 }));
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    await planWeekActivity(page, 0, 'study', 7);
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');

    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    await drainQuizSession(page, 7);
    await page.waitForSelector('#screen-session-summary.active', { timeout: 12000 });
    const desc = await page.textContent('#summary-desc');
    ok(desc.includes('7문제'), `고른 문제 수(7)만큼 세션이 진행되어야 함 (got "${desc}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('question-count e2e tests');
  await testSliderShowsBiggerBonusAtHigherCount();
  await testChosenCountShownOnScheduleCard();
  await testExecutionUsesChosenCount();
  summary('question-count.test.js');
})();
