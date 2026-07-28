// 연회 참석의 입장료/옷차림 조건, 왕자님을 만나는 데 필요한 옷차림 조건
// (친구 만나기 경로 + 연회 경로 둘 다)을 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, activeScreenId, getSavedState } = require('./helpers');

async function planWeek(page, weekIdx, activity) {
  await page.click('[data-menu="schedule"]');
  await page.waitForSelector('#screen-schedule.active');
  const cards = await page.$$('#week-plan-list .level-card');
  await cards[weekIdx].click();
  await page.waitForSelector('#screen-week-pick.active');
  await page.click(`[data-activity="${activity}"]`);
  await page.waitForSelector('#screen-schedule.active');
  await page.click('#btn-schedule-back');
  await page.waitForSelector('#screen-main.active');
}

async function testBanquetGates() {
  const errors = await withPage(async (page) => {
    // 평범한 옷(tier0) 상태에서는 입장 자체가 거부되어야 한다(주는 그냥 넘어감)
    await seedAndContinue(page, makeState({ gold: 2000, wardrobe: { equipped: 0, owned: [true, false, false, false, false, false] } }));
    await planWeek(page, 0, 'banquet');
    const goldBefore = (await getSavedState(page)).gold;
    await page.click('[data-menu="execute"]');
    await page.waitForTimeout(300);
    const savedAfterBlock = await getSavedState(page);
    eq(savedAfterBlock.weekIndex, 1, '옷차림 미달로 연회가 막히면 그 주는 그냥 넘어가야 함(weekIndex 진행)');
    eq(savedAfterBlock.gold, goldBefore, '입장이 막히면 입장료가 빠지면 안 됨');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(1단계): ${errors.join('\n')}`);
}

async function testBanquetFeeCharged() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 2000, wardrobe: { equipped: 1, owned: [true, true, false, false, false, false] } }));
    await planWeek(page, 0, 'banquet');
    const goldBefore = (await getSavedState(page)).gold;
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    const goldAfter = (await getSavedState(page)).gold;
    eq(goldAfter, goldBefore - 150, '단정한 옷 이상이면 입장료 150G가 즉시 빠져야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(2단계): ${errors.join('\n')}`);
}

async function testPrinceGateViaFriendSelect() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 500,
      stats: { intelligence: 60, focus: 40, stamina: 60, charm: 70, creativity: 50, stress: 20, luck: 30 }, // grace=61 -> prince unlocked
      wardrobe: { equipped: 0, owned: [true, true, true, true, false, false] },
    });
    await seedAndContinue(page, state);
    await planWeek(page, 0, 'friend');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-npc-select.active');
    const cards = await page.$$('.npc-card');
    let princeIdx = -1;
    for (let i = 0; i < cards.length; i++) {
      const t = await cards[i].textContent();
      if (t.includes('왕자')) { princeIdx = i; break; }
    }
    ok(princeIdx >= 0, '왕자님 카드가 목록에 있어야 함(품위 조건은 만족)');
    const cardText = await cards[princeIdx].textContent();
    ok(cardText.includes('입어야'), '옷차림이 부족하면 카드에 안내 문구가 보여야 함');
    await cards[princeIdx].click();
    await page.waitForTimeout(300);
    eq(await activeScreenId(page), 'screen-npc-select', '옷차림이 부족하면 클릭해도 화면이 넘어가지 않아야 함(막힘)');
    const toast = await page.textContent('#level-toast');
    ok(toast.includes('입어야'), '토스트로 옷차림 조건을 안내해야 함');

    // tier2(예쁜 드레스)로 갈아입으면 만날 수 있어야 한다
    await page.click('#btn-npc-back');
    await page.waitForSelector('#screen-main.active');
    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="wardrobe"]');
    await page.waitForTimeout(150);
    const wardrobeCards = await page.$$('.wardrobe-card');
    await wardrobeCards[2].click();
    await page.click('#btn-shop-back');
    await page.waitForSelector('#screen-main.active');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-npc-select.active');
    const cards2 = await page.$$('.npc-card');
    for (const c of cards2) {
      const t = await c.textContent();
      if (t.includes('왕자')) { await c.click(); break; }
    }
    await page.waitForTimeout(300);
    ok(['screen-event', 'screen-branching', 'screen-quiz'].includes(await activeScreenId(page)), '예쁜 드레스 이상이면 왕자님을 만날 수 있어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(3단계): ${errors.join('\n')}`);
}

(async () => {
  console.log('banquet-prince-gate e2e tests');
  await testBanquetGates();
  await testBanquetFeeCharged();
  await testPrinceGateViaFriendSelect();
  summary('banquet-prince-gate.test.js');
})();
