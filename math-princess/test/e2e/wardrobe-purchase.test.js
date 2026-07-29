// 옷은 품위 점수만으로 무료 자동 해금되지 않고, 옷장에서 골드로 직접
// 사야 입을 수 있다는 구조(잠김 -> 구매 가능 -> 구매 -> 착용)를 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, getSavedState } = require('./helpers');

// tier3 이상(공주 드레스/무도회 드레스/대관식 드레스)은 품위가 아무리
// 높아도 귀족 신분(state.nobleTitle)이 없으면 살 수 없어야 한다.
async function testTopTiersRequireNobleTitle() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 100000,
      // grace = 100*.4 + 100*.3 + 100*.3 = 100(만점) — tier3~5 품위 요건은 전부 충족
      stats: { intelligence: 100, focus: 40, stamina: 60, charm: 100, creativity: 100, stress: 20, luck: 30 },
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="wardrobe"]');
    await page.waitForTimeout(150);

    const cardStates = await page.$$eval('.wardrobe-card', (cards) => cards.map((c) => ({
      classes: c.className,
      hasBuyBtn: !!c.querySelector('.wardrobe-buy-btn'),
      hasNobleBadge: !!c.querySelector('.wardrobe-card-noble-badge'),
    })));
    ok(cardStates[2].classes.includes('purchasable'), '예쁜 드레스(tier2)는 귀족이 아니어도 품위만 충분하면 구매 가능해야 함');
    [3, 4, 5].forEach((i) => {
      ok(cardStates[i].classes.includes('locked') && !cardStates[i].hasBuyBtn, `tier${i}는 품위가 만점이어도 귀족이 아니면 잠겨 있어야 함`);
      ok(cardStates[i].hasNobleBadge, `tier${i} 카드에는 "귀족 전용" 표시가 있어야 함`);
    });
  });
  ok(errors.length === 0, `JS 에러 없어야 함(귀족 전용 옷): ${errors.join('\n')}`);
}

// 귀족 신분(state.nobleTitle)을 이미 갖고 시작하면, 같은 품위로도
// tier3 이상을 구매하고 착용할 수 있어야 한다.
// (mid-session에 localStorage를 직접 패치하고 reload하면 pagehide 시점의
// 자동 저장(flushSaveIfStarted)이 in-memory state로 그 패치를 덮어써버리므로,
// 처음부터 nobleTitle을 가진 상태로 seedAndContinue해서 그 문제를 피한다.)
async function testNobleCanBuyTopTiers() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 100000,
      stats: { intelligence: 100, focus: 40, stamina: 60, charm: 100, creativity: 100, stress: 20, luck: 30 },
      nobleTitle: '별빛 자작',
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="wardrobe"]');
    await page.waitForTimeout(150);

    const cardStates = await page.$$eval('.wardrobe-card', (cards) => cards.map((c) => ({
      classes: c.className,
      hasBuyBtn: !!c.querySelector('.wardrobe-buy-btn'),
    })));
    ok(cardStates[3].classes.includes('purchasable') && cardStates[3].hasBuyBtn, '귀족이면 공주 드레스(tier3)를 살 수 있어야 함');

    const buyBtns = await page.$$('.wardrobe-card:nth-child(4) .wardrobe-buy-btn');
    await buyBtns[0].click();
    await page.waitForTimeout(200);
    const saved = await getSavedState(page);
    eq(saved.wardrobe.owned[3], true, '귀족 신분으로 구매하면 실제로 소유 목록에 기록되어야 함');
    eq(saved.wardrobe.equipped, 3, '구매하면 바로 갈아입어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(귀족 구매): ${errors.join('\n')}`);
}

// "역량"(능력치) 탭인 상태 화면에서 품위 점수를 숫자로 직접 확인할 수 있어야 한다.
async function testStatusScreenShowsGraceScoreAndRank() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      stats: { intelligence: 40, focus: 20, stamina: 50, charm: 90, creativity: 60, stress: 10, luck: 20 },
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="status"]');
    await page.waitForSelector('#screen-status.active');
    const line = await page.textContent('#status-grace-line');
    ok(line.includes('66'), `품위 점수(66)가 상태 화면에 숫자로 보여야 함 (got "${line}")`);
    ok(line.includes('평민'), `귀족이 되기 전에는 "평민"으로 표시되어야 함 (got "${line}")`);
    ok(line.includes('남작 이상 신분'), `다음 단계가 귀족 전용이면 요구되는 구체적인 작위가 안내되어야 함 (got "${line}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함(품위 표시): ${errors.join('\n')}`);
}

async function testStatusScreenShowsNobleRankWhenPromoted() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      stats: { intelligence: 40, focus: 20, stamina: 50, charm: 90, creativity: 60, stress: 10, luck: 20 },
      nobleTitle: '은빛 백작',
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="status"]');
    await page.waitForSelector('#screen-status.active');
    const line = await page.textContent('#status-grace-line');
    ok(line.includes('은빛 백작'), `귀족이 된 뒤에는 작위명이 상태 화면에 표시되어야 함 (got "${line}")`);
    ok(!line.includes('평민'), `귀족이 된 뒤에는 "평민"으로 표시되면 안 됨 (got "${line}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함(귀족 표시): ${errors.join('\n')}`);
}

async function testBasicPurchaseFlow() {
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
}

// tier6 이상(자작~대공 예복)은 품위가 만점이어도 남작(귀족이기만 함)으로는
// 살 수 없고, 그 카드에 필요한 구체적인 작위 이름이 배지로 표시되어야 한다.
async function testRankGatedOutfitTiersRequireSpecificRank() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 1000000,
      stats: { intelligence: 100, focus: 40, stamina: 60, charm: 100, creativity: 100, stress: 20, luck: 30 },
      nobleTitle: '세분화 테스트',
      nobleRankIndex: 0, // 남작
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="wardrobe"]');
    await page.waitForTimeout(150);

    const cardStates = await page.$$eval('.wardrobe-card', (cards) => cards.map((c) => ({
      classes: c.className,
      hasBuyBtn: !!c.querySelector('.wardrobe-buy-btn'),
      badgeText: (c.querySelector('.wardrobe-card-noble-badge') || {}).textContent || '',
    })));
    eq(cardStates.length, 11, '옷장 카드는 기존 6단계 + 작위별 예복 5단계 = 총 11장이어야 함');
    [6, 7, 8, 9, 10].forEach((i) => {
      ok(cardStates[i].classes.includes('locked') && !cardStates[i].hasBuyBtn, `tier${i}는 남작만으로는 잠겨 있어야 함`);
    });
    ok(cardStates[6].badgeText.includes('자작'), `tier6(자작 예복) 배지는 "자작 이상"처럼 구체적인 작위를 보여줘야 함 (got "${cardStates[6].badgeText}")`);
    ok(cardStates[10].badgeText.includes('대공'), `tier10(대공 예복) 배지는 "대공 이상"을 보여줘야 함 (got "${cardStates[10].badgeText}")`);

    // 백작(인덱스2)까지 승급하면 자작 예복(tier6)·백작 예복(tier7)은 살 수 있고,
    // 그보다 위(후작 예복 이상)는 여전히 잠겨 있어야 한다.
    const state2 = makeState({
      gold: 1000000,
      stats: { intelligence: 100, focus: 40, stamina: 60, charm: 100, creativity: 100, stress: 20, luck: 30 },
      nobleTitle: '세분화 테스트',
      nobleRankIndex: 2, // 백작
    });
    await seedAndContinue(page, state2);
    await page.click('[data-menu="wardrobe"]');
    await page.waitForSelector('#screen-shop.active');
    await page.click('.shop-tab-btn[data-tab="wardrobe"]');
    await page.waitForTimeout(150);
    const cardStates2 = await page.$$eval('.wardrobe-card', (cards) => cards.map((c) => ({
      classes: c.className,
      hasBuyBtn: !!c.querySelector('.wardrobe-buy-btn'),
    })));
    ok(cardStates2[6].classes.includes('purchasable') && cardStates2[6].hasBuyBtn, '백작이면 자작 예복(tier6)을 살 수 있어야 함');
    ok(cardStates2[7].classes.includes('purchasable') && cardStates2[7].hasBuyBtn, '백작이면 백작 예복(tier7)을 살 수 있어야 함');
    ok(cardStates2[8].classes.includes('locked') && !cardStates2[8].hasBuyBtn, '백작이면 후작 예복(tier8)은 아직 잠겨 있어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(작위별 상위 예복): ${errors.join('\n')}`);
}

(async () => {
  console.log('wardrobe-purchase e2e tests');
  await testBasicPurchaseFlow();
  await testTopTiersRequireNobleTitle();
  await testNobleCanBuyTopTiers();
  await testStatusScreenShowsGraceScoreAndRank();
  await testStatusScreenShowsNobleRankWhenPromoted();
  await testRankGatedOutfitTiersRequireSpecificRank();
  summary('wardrobe-purchase.test.js');
})();
