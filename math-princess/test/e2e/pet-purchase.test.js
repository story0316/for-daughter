// 애완동물은 옷장과 같은 구조(품위 요건 + 상위 등급은 귀족 신분까지 필요)로
// 골드를 내고 사야 하고, 귀족이 될수록 더 고급 동물을 데려올 수 있다는 걸 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, getSavedState } = require('./helpers');

async function testBasicPetPurchaseFlow() {
  const errors = await withPage(async (page) => {
    const state = makeState({ gold: 2000 });
    await seedAndContinue(page, state);
    await page.waitForTimeout(300);

    const badgeBefore = await page.evaluate(() => getComputedStyle(document.getElementById('pet-badge')).display);
    eq(badgeBefore, 'none', '펫이 없으면 메인 화면에 펫 배지가 보이면 안 됨');

    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="pet"]');
    await page.waitForTimeout(150);

    const cardStates = await page.$$eval('#pet-list .wardrobe-card', (cards) => cards.map((c) => ({
      classes: c.className,
      hasBuyBtn: !!c.querySelector('.wardrobe-buy-btn'),
    })));
    ok(cardStates[0].classes.includes('purchasable') && cardStates[0].hasBuyBtn, 'tier0(강아지)는 처음부터 구매 가능해야 함');

    const goldBefore = (await getSavedState(page)).gold;
    const buyButtons = await page.$$('#pet-list .wardrobe-buy-btn');
    await buyButtons[0].click(); // tier0(강아지, 300G) 구매
    await page.waitForTimeout(200);
    const afterBuy = await getSavedState(page);
    eq(afterBuy.gold, goldBefore - 300, '강아지 구매 시 300G가 정확히 빠져야 함');
    eq(afterBuy.pets.owned[0], true, '구매한 tier0은 owned 배열에 true로 기록되어야 함');
    eq(afterBuy.pets.equipped, 0, '구매하면 자동으로 함께하게 되어야 함');

    await page.click('#btn-shop-back');
    await page.waitForSelector('#screen-main.active');
    const badgeAfter = await page.textContent('#pet-badge');
    ok(badgeAfter.includes('강아지'), '구매 후 메인 화면 펫 배지가 보여야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(펫 기본 구매): ${errors.join('\n')}`);
}

// tier4 이상(공작새/백마/유니콘)은 품위가 아무리 높아도 귀족 신분이 없으면
// 데려올 수 없어야 한다.
async function testTopPetTiersRequireNobleTitle() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 100000,
      stats: { intelligence: 100, focus: 40, stamina: 60, charm: 100, creativity: 100, stress: 20, luck: 30 },
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="pet"]');
    await page.waitForTimeout(150);

    const cardStates = await page.$$eval('#pet-list .wardrobe-card', (cards) => cards.map((c) => ({
      classes: c.className,
      hasBuyBtn: !!c.querySelector('.wardrobe-buy-btn'),
      hasNobleBadge: !!c.querySelector('.wardrobe-card-noble-badge'),
    })));
    ok(cardStates[3].classes.includes('purchasable'), '여우(tier3)는 귀족이 아니어도 품위만 충분하면 구매 가능해야 함');
    [4, 5, 6].forEach((i) => {
      ok(cardStates[i].classes.includes('locked') && !cardStates[i].hasBuyBtn, `tier${i}는 품위가 만점이어도 귀족이 아니면 잠겨 있어야 함`);
      ok(cardStates[i].hasNobleBadge, `tier${i} 카드에는 "귀족 전용" 표시가 있어야 함`);
    });
  });
  ok(errors.length === 0, `JS 에러 없어야 함(귀족 전용 펫): ${errors.join('\n')}`);
}

// 귀족 신분을 이미 갖고 시작하면 같은 품위로도 tier4 이상을 살 수 있어야 한다.
async function testNobleCanBuyTopPetTiers() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 100000,
      stats: { intelligence: 100, focus: 40, stamina: 60, charm: 100, creativity: 100, stress: 20, luck: 30 },
      nobleTitle: '별빛 자작',
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="pet"]');
    await page.waitForTimeout(150);

    const cardStates = await page.$$eval('#pet-list .wardrobe-card', (cards) => cards.map((c) => ({
      classes: c.className,
      hasBuyBtn: !!c.querySelector('.wardrobe-buy-btn'),
    })));
    ok(cardStates[6].classes.includes('purchasable') && cardStates[6].hasBuyBtn, '귀족이면 유니콘(tier6)을 살 수 있어야 함');

    const buyBtns = await page.$$('#pet-list .wardrobe-card:nth-child(7) .wardrobe-buy-btn');
    await buyBtns[0].click();
    await page.waitForTimeout(200);
    const saved = await getSavedState(page);
    eq(saved.pets.owned[6], true, '귀족 신분으로 구매하면 실제로 소유 목록에 기록되어야 함');
    eq(saved.pets.equipped, 6, '구매하면 바로 함께하게 되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(귀족 펫 구매): ${errors.join('\n')}`);
}

// 상태 화면에도 현재 함께하는 펫이 표시되어야 한다.
async function testStatusScreenShowsPetBadge() {
  const errors = await withPage(async (page) => {
    const state = makeState({ gold: 2000 });
    state.pets = { equipped: 1, owned: [true, true, false, false, false, false, false], notifiedGraceTier: 1 };
    await seedAndContinue(page, state);
    await page.click('[data-menu="status"]');
    await page.waitForSelector('#screen-status.active');
    const badge = await page.textContent('#status-pet-badge');
    ok(badge.includes('고양이'), `상태 화면에 현재 펫(고양이)이 표시되어야 함 (got "${badge}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함(상태 화면 펫 표시): ${errors.join('\n')}`);
}

// 여러 마리를 산 뒤에는 옷장처럼 자유롭게 갈아탈 수 있어야 한다.
async function testCanSwitchBetweenOwnedPets() {
  const errors = await withPage(async (page) => {
    const state = makeState({ gold: 2000 });
    state.pets = { equipped: 0, owned: [true, true, false, false, false, false, false], notifiedGraceTier: 1 };
    await seedAndContinue(page, state);
    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="pet"]');
    await page.waitForTimeout(150);

    await page.click('#pet-list .wardrobe-card:nth-child(2)'); // 이미 소유한 tier1(고양이)로 갈아타기
    await page.waitForTimeout(150);
    const saved = await getSavedState(page);
    eq(saved.pets.equipped, 1, '소유한 다른 펫 카드를 클릭하면 그 펫으로 갈아타야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(펫 갈아타기): ${errors.join('\n')}`);
}

(async () => {
  console.log('pet-purchase e2e tests');
  await testBasicPetPurchaseFlow();
  await testTopPetTiersRequireNobleTitle();
  await testNobleCanBuyTopPetTiers();
  await testStatusScreenShowsPetBadge();
  await testCanSwitchBetweenOwnedPets();
  summary('pet-purchase.test.js');
})();
