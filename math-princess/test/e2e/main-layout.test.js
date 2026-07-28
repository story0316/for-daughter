// 메인 화면/계획표 화면이 큰 기기와 작은 기기(iPhone SE급) 양쪽에서
// 스크롤 없이(또는 의도된 스크롤 영역 안에서) 잘리지 않고 보이는지 확인한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState } = require('./helpers');

async function testViewport(viewport, label) {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({
      gold: 1200,
      stats: { intelligence: 55, focus: 60, stamina: 50, charm: 65, creativity: 40, stress: 20, luck: 45 },
      wardrobe: { equipped: 5, owned: [true, true, true, true, true, true], notifiedGraceTier: 5 },
    }));
    await page.waitForTimeout(300);

    const overflow = await page.evaluate(() => {
      const main = document.getElementById('screen-main');
      return { scrollHeight: main.scrollHeight, clientHeight: main.clientHeight };
    });
    ok(overflow.scrollHeight <= overflow.clientHeight + 1, `[${label}] 메인 화면이 뷰포트 밖으로 넘치면 안 됨 (scroll=${overflow.scrollHeight}, client=${overflow.clientHeight})`);

    const statPanelRows = await page.$$eval('#main-stat-panel .stat-row', (rows) => rows.length);
    eq(statPanelRows, 7, `[${label}] 메인 화면 능력치 패널에 7개 스탯 행이 있어야 함`);

    const menuRect = await page.evaluate(() => document.getElementById('main-menu-grid').getBoundingClientRect());
    ok(menuRect.bottom <= (viewport.height + 1), `[${label}] 메인 메뉴 버튼이 화면 아래로 잘리면 안 됨 (bottom=${menuRect.bottom}, viewport=${viewport.height})`);

    // 계획표 화면도 확인(4주 카드 + 예상 변화 패널)
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    await page.waitForTimeout(200);
    const planScroll = await page.evaluate(() => {
      const el = document.querySelector('.week-plan-scroll');
      return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, overflowY: getComputedStyle(el).overflowY };
    });
    ok(planScroll.overflowY === 'auto' || planScroll.overflowY === 'scroll', `[${label}] 계획표 화면은 내용이 많아지면 스크롤되어야 함`);
  }, viewport);
  ok(errors.length === 0, `[${label}] JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('main-layout e2e tests');
  await testViewport({ width: 390, height: 780 }, 'large');
  await testViewport({ width: 375, height: 667 }, 'small(iPhone SE)');
  summary('main-layout.test.js');
})();
