// 옷은 품위 점수만으로 무료 자동 해금되지 않고, 옷장에서 골드로 직접
// 사야 입을 수 있다는 구조(잠김 -> 구매 가능 -> 구매 -> 착용)를 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, getSavedState } = require('./helpers');

(async () => {
  console.log('wardrobe-purchase e2e tests');
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 2000,
      // grace = 60*.4 + 50*.3 + 60*.3 = 24+15+18 = 57 -> tier2(예쁜 드레스, min 50)까지 구매 가능
      stats: { intelligence: 60, focus: 40, stamina: 60, charm: 60, creativity: 50, stress: 20, luck: 30 },
    });
    await seedAndContinue(page, state);
    await page.waitForTimeout(300);

    const outfitBadge = await page.textContent('#outfit-badge');
    ok(outfitBadge.includes('평범한 옷'), `품위가 충분해도 사지 않으면 여전히 평범한 옷이어야 함 (got "${outfitBadge.trim()}")`);
    const toast = await page.textContent('#level-toast');
    ok(toast.includes('구매 가능'), '품위가 새 단계에 닿으면 "구매 가능" 토스트로만 알려줘야 함(자동 착용 아님)');

    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="wardrobe"]');
    await page.waitForTimeout(150);
    const cardStates = await page.$$eval('.wardrobe-card', (cards) => cards.map((c) => ({
      classes: c.className,
      hasBuyBtn: !!c.querySelector('.wardrobe-buy-btn'),
    })));
    ok(cardStates[0].classes.includes('equipped'), 'tier0(평범한 옷)은 착용 중이어야 함');
    ok(cardStates[1].classes.includes('purchasable') && cardStates[1].hasBuyBtn, 'tier1은 구매 가능 상태로 구매 버튼이 있어야 함');
    ok(cardStates[2].classes.includes('purchasable') && cardStates[2].hasBuyBtn, 'tier2도 구매 가능 상태여야 함(grace=57>=50)');
    ok(cardStates[3].classes.includes('locked') && !cardStates[3].hasBuyBtn, 'tier3은 품위 부족으로 잠겨 있어야 함(구매 버튼 없음)');

    const goldBefore = (await getSavedState(page)).gold;
    const buyButtons = await page.$$('.wardrobe-buy-btn');
    await buyButtons[0].click(); // tier1(단정한 옷, 400G) 구매
    await page.waitForTimeout(200);
    const afterBuy = await getSavedState(page);
    eq(afterBuy.gold, goldBefore - 400, '단정한 옷 구매 시 400G가 정확히 빠져야 함');
    eq(afterBuy.wardrobe.owned[1], true, '구매한 tier1은 owned 배열에 true로 기록되어야 함');
    eq(afterBuy.wardrobe.equipped, 1, '구매하면 자동으로 착용해야 함');

    await page.click('#btn-shop-back');
    await page.waitForSelector('#screen-main.active');
    const badgeAfter = await page.textContent('#outfit-badge');
    ok(badgeAfter.includes('단정한 옷'), '구매 후 메인 화면 옷 배지가 갱신되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
  summary('wardrobe-purchase.test.js');
})();
