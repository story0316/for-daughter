// 이번 달 생활 계획표(주간 스케줄) 흐름: 4주를 계획 -> 순차 실행 -> 달 전환이
// 정확히 한 번만 일어나는지, 마지막 달의 마지막 주에서 엔딩이 트리거되는지.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, drainQuizSession, getSavedState, activeScreenId } = require('./helpers');

async function testPlanAndExecuteFourWeeks() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 500 }));

    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    eq(await page.$$eval('#week-plan-list .level-card', (c) => c.length), 4, '계획표에는 4주 칸이 있어야 함');

    const plan = ['study', 'job', 'exercise', 'rest'];
    for (let i = 0; i < 4; i++) {
      const cards = await page.$$('#week-plan-list .level-card');
      await cards[i].click();
      await page.waitForSelector('#screen-week-pick.active');
      await page.click(`[data-activity="${plan[i]}"]`);
      await page.waitForSelector('#screen-schedule.active');
    }
    const titles = await page.$$eval('#week-plan-list .level-title', (els) => els.map((e) => e.textContent));
    ok(titles[0].includes('공부') && titles[1].includes('알바') && titles[2].includes('운동') && titles[3].includes('휴식'), `계획한 활동이 카드에 반영되어야 함 (got ${titles.join(', ')})`);

    const previewText = await page.textContent('#week-plan-preview');
    ok(previewText.trim().length > 0, '예상 변화 패널에 내용이 있어야 함');

    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');

    for (let week = 0; week < 4; week++) {
      await page.click('[data-menu="execute"]');
      await page.waitForSelector('#screen-quiz.active');
      await drainQuizSession(page);
      const active = await activeScreenId(page);
      if (active === 'screen-session-summary') await page.click('#btn-summary-confirm');
      // 운동/휴식 뒤에는 일정 확률로 랜덤 이벤트 팝업이 뜰 수 있다(게임 자체 사양).
      if ((await activeScreenId(page)) === 'screen-event') await page.click('#btn-event-confirm');
      await page.waitForSelector('#screen-main.active', { timeout: 12000 });
      const saved = await getSavedState(page);
      if (week < 3) {
        eq(saved.turn, 1, `${week + 1}주 완료 후에도 아직 같은 달이어야 함`);
        eq(saved.weekIndex, week + 1, `${week + 1}주 완료 후 weekIndex가 ${week + 1}이어야 함`);
      } else {
        eq(saved.turn, 2, '4주를 모두 마치면 달이 넘어가야 함');
        eq(saved.weekIndex, 0, '새 달에서는 weekIndex가 0으로 초기화되어야 함');
        ok(saved.weekPlan.every((a) => a === null), '새 달에서는 weekPlan이 전부 비어 있어야 함');
      }
    }
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testEndingTriggersAtFinalWeek() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      turn: 48, gold: 500,
      stats: { intelligence: 90, focus: 80, stamina: 80, charm: 90, creativity: 80, stress: 10, luck: 40 },
      weekPlan: ['rest', 'rest', 'rest', 'rest'], weekIndex: 3,
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    await drainQuizSession(page);
    await page.waitForSelector('#screen-ending.active', { timeout: 12000 });
    const title = await page.textContent('#ending-title');
    ok(title.trim().length > 0, '마지막 달 마지막 주를 마치면 엔딩 화면에 제목이 표시되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('weekly-plan e2e tests');
  await testPlanAndExecuteFourWeeks();
  await testEndingTriggersAtFinalWeek();
  summary('weekly-plan.test.js');
})();
