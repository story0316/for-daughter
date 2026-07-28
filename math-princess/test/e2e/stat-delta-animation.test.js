// 활동 후 메인 화면 능력치 패널의 게이지바가 애니메이션으로 채워지고
// "+N"/"-N" 변화 팝업이 뜨는지 검증한다. 정답/오답 여부와 무관하게 "공부"는
// 항상 무언가(골드+지능+창의력 또는 스트레스+체력)를 바꾸므로 결과와
// 상관없이 최소 하나의 변화 팝업이 떠야 한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, drainQuizSession, activeScreenId } = require('./helpers');

(async () => {
  console.log('stat-delta-animation e2e tests');
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 500 }));

    // 처음 렌더링에는 비교 대상이 없으므로 변화 팝업이 없어야 한다.
    const initialDeltaCount = await page.$$eval('#main-stat-panel .stat-row-delta.show', (els) => els.length);
    eq(initialDeltaCount, 0, '처음 렌더링에는 변화 팝업이 없어야 함');

    const fillHasTransition = await page.evaluate(() => {
      const fill = document.querySelector('#main-stat-panel .stat-row-fill');
      return getComputedStyle(fill).transitionProperty.includes('width');
    });
    ok(fillHasTransition, '게이지바에 width 트랜지션이 걸려 있어야 부드럽게 채워짐');

    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    const cards = await page.$$('#week-plan-list .level-card');
    await cards[0].click();
    await page.waitForSelector('#screen-week-pick.active');
    await page.click('[data-activity="study"]');
    await page.waitForSelector('#screen-schedule.active');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');

    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    await drainQuizSession(page);
    const afterQuiz = await activeScreenId(page);
    if (afterQuiz === 'screen-session-summary') await page.click('#btn-summary-confirm');
    await page.waitForSelector('#screen-main.active', { timeout: 12000 });
    await page.waitForTimeout(150);

    const deltaTexts = await page.$$eval('#main-stat-panel .stat-row-delta.show', (els) => els.map((e) => e.textContent));
    ok(deltaTexts.length > 0, `공부를 마치면 변화한 스탯에 +N/-N 팝업이 떠야 함 (got ${JSON.stringify(deltaTexts)})`);
    deltaTexts.forEach((t) => ok(/^[+-]\d+$/.test(t), `팝업 텍스트는 +N 또는 -N 형태여야 함 (got "${t}")`));

    const pulsedCount = await page.$$eval('#main-stat-panel .stat-row-fill.pulse', (els) => els.length);
    ok(pulsedCount > 0, '변화한 스탯의 게이지바에는 강조(pulse) 효과가 붙어야 함');
    eq(pulsedCount, deltaTexts.length, '팝업이 뜬 스탯 수만큼 게이지바 강조 효과도 붙어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
  summary('stat-delta-animation.test.js');
})();
