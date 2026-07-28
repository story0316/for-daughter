// 스트레스가 임계값(STRESS_OVERFLOW_THRESHOLD)을 넘으면 계획했던 활동 대신
// "몸살" 이벤트가 뜨고 그 주를 대신 소모하는 흐름을 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, drainQuizSession, getSavedState, activeScreenId, planWeekActivity } = require('./helpers');

async function planFullMonth(page, activity) {
  await page.click('[data-menu="schedule"]');
  await page.waitForSelector('#screen-schedule.active');
  for (let i = 0; i < 4; i++) {
    await planWeekActivity(page, i, activity);
  }
  await page.click('#btn-schedule-back');
  await page.waitForSelector('#screen-main.active');
}

async function testOverflowCanTrigger() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 100, luck: 20 },
    });
    await seedAndContinue(page, state);
    await planFullMonth(page, 'study');

    let sawOverflow = false;
    // 스트레스 100이면 시도당 최대 60% 확률로 발생 -> 여러 주에 걸쳐 시도하면 사실상 반드시 한 번은 뜬다.
    for (let attempt = 0; attempt < 16 && !sawOverflow; attempt++) {
      const beforeExecute = await getSavedState(page);
      await page.click('[data-menu="execute"]');
      const active = await activeScreenId(page);
      if (active === 'screen-event') {
        const title = await page.textContent('#event-title');
        ok(title.includes('몸살'), `이벤트 제목이 "몸살"을 포함해야 함 (got ${title})`);
        await page.click('#btn-event-confirm');
        await page.waitForSelector('#screen-main.active', { timeout: 12000 });
        const savedAfter = await getSavedState(page);
        ok(savedAfter.stats.stamina < beforeExecute.stats.stamina, '몸살 이벤트 발생 시 체력이 줄어야 함');
        sawOverflow = true;
      } else {
        await page.waitForSelector('#screen-quiz.active');
        await drainQuizSession(page);
        const afterDrain = await activeScreenId(page);
        if (afterDrain === 'screen-session-summary') await page.click('#btn-summary-confirm');
        await page.waitForSelector('#screen-main.active', { timeout: 12000 });
        const saved = await getSavedState(page);
        // 이번 달이 끝났으면(4주 소진) 다음 달에도 계속 공부를 계획해서 시도를 이어간다.
        if (saved.weekIndex === 0 && saved.weekPlan.every((a) => a === null)) {
          await planFullMonth(page, 'study');
        }
      }
    }
    ok(sawOverflow, '여러 번 시도하면 언젠가 몸살 이벤트가 발생해야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testNoOverflowBelowThreshold() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: 20 },
    });
    await seedAndContinue(page, state);
    await planFullMonth(page, 'study');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    const active = await activeScreenId(page);
    eq(active, 'screen-quiz', '스트레스가 낮으면 몸살 이벤트 없이 바로 퀴즈로 진입해야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('stress-overflow e2e tests');
  await testOverflowCanTrigger();
  await testNoOverflowBelowThreshold();
  summary('stress-overflow.test.js');
})();
