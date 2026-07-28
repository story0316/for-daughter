// 엔딩 도감: 아직 아무 엔딩도 못 봤으면 전부 잠겨 있는지, 엔딩에 도달하면
// "새로운 엔딩 발견" 배지가 뜨고 도감에 기록되는지, 같은 엔딩을 또 봐도
// 배지가 다시 뜨지 않는지, 엔딩 화면의 "홈으로" 버튼이 실제로 동작하는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, drainQuizSession, activeScreenId, BASE_URL } = require('./helpers');

// 마지막 주 실행 후 엔딩 화면에 도달할 때까지, 중간에 뜰 수 있는 팝업(스트레스
// 오버플로우 몸살 이벤트, 휴식 보너스 랜덤 이벤트, 세션 요약)을 전부 안전하게
// 넘겨준다. 이 테스트에서 중요한 건 "결국 엔딩에 도달하는지"이지 그 사이에
// 어떤 팝업이 뜨는지가 아니므로, 뭐가 뜨든 계속 다음으로 넘긴다.
async function executeUntilEnding(page) {
  await page.click('[data-menu="execute"]');
  for (let i = 0; i < 8; i++) {
    const active = await activeScreenId(page);
    if (active === 'screen-ending') return;
    if (active === 'screen-quiz') {
      await drainQuizSession(page);
      continue;
    }
    if (active === 'screen-session-summary') {
      await page.click('#btn-summary-confirm');
      continue;
    }
    if (active === 'screen-event') {
      await page.click('#btn-event-confirm');
      continue;
    }
    await page.waitForTimeout(200);
  }
}

async function testFreshGalleryIsAllLocked() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html`);
    await page.evaluate(() => { localStorage.removeItem('math-princess-endings-v1'); localStorage.removeItem('math-princess-save-v1'); });
    await page.reload();
    await page.click('#btn-open-ending-gallery');
    await page.waitForSelector('#screen-ending-gallery.active');
    const summaryText = await page.textContent('#ending-gallery-summary');
    ok(summaryText.includes('0 /'), `아직 아무 엔딩도 없으면 0/N으로 표시되어야 함 (got "${summaryText}")`);
    const lockedCount = await page.$$eval('.ending-gallery-card.locked', (els) => els.length);
    const totalCount = await page.$$eval('.ending-gallery-card', (els) => els.length);
    eq(lockedCount, totalCount, '엔딩을 하나도 못 봤으면 카드가 전부 잠겨 있어야 함');

    await page.click('#btn-ending-gallery-back');
    await page.waitForSelector('#screen-start.active');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testReachingEndingUnlocksGalleryEntry() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html`);
    await page.evaluate(() => { localStorage.removeItem('math-princess-endings-v1'); });
    // 기본 스탯(makeState 기본값)은 어떤 특정 엔딩 조건도 만족하지 않으므로
    // 항상 기본 엔딩("평범하지만 행복한 나날")으로 결정론적으로 도달한다.
    const state = makeState({
      turn: 1, gold: 500,
      weekPlan: ['rest', 'rest', 'rest', 'rest'], weekIndex: 3,
    });
    await seedAndContinue(page, state, '?turns=1');
    await executeUntilEnding(page);
    await page.waitForSelector('#screen-ending.active', { timeout: 12000 });

    const title = await page.textContent('#ending-title');
    ok(title.trim().length > 0, '엔딩 제목이 표시되어야 함');
    const badgeVisible = await page.evaluate(() => getComputedStyle(document.getElementById('ending-new-badge')).display !== 'none');
    ok(badgeVisible, '처음 보는 엔딩이면 "새로운 엔딩 발견" 배지가 떠야 함');

    // "홈으로" 버튼이 실제로 시작 화면으로 이동시켜야 함(이전에는 연결되어 있지 않던 버튼)
    await page.click('#btn-ending-home');
    await page.waitForSelector('#screen-start.active');

    await page.click('#btn-open-ending-gallery');
    await page.waitForSelector('#screen-ending-gallery.active');
    const summaryText = await page.textContent('#ending-gallery-summary');
    ok(summaryText.startsWith('1 /'), `엔딩 하나를 달성했으면 1/N으로 표시되어야 함 (got "${summaryText}")`);
    const unlockedTitles = await page.$$eval('.ending-gallery-card:not(.locked) .ending-gallery-title', (els) => els.map((e) => e.textContent));
    eq(unlockedTitles.length, 1, '달성한 엔딩 카드가 정확히 하나만 잠금 해제되어야 함');
    eq(unlockedTitles[0], title.trim(), '도감에 보이는 제목이 방금 본 엔딩과 같아야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testSameEndingAgainDoesNotReshowNewBadge() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html`);
    // 기본 스탯으로는 반드시 "평범하지만 행복한 나날" 엔딩이 나오므로, 도감에
    // 그 엔딩을 먼저 기록해둔 뒤 같은 상황을 다시 재현해 배지가 안 뜨는지 본다.
    await page.evaluate(() => localStorage.setItem('math-princess-endings-v1', JSON.stringify(['ordinary-happy'])));
    const state = makeState({
      turn: 1, gold: 500,
      weekPlan: ['rest', 'rest', 'rest', 'rest'], weekIndex: 3,
    });
    await seedAndContinue(page, state, '?turns=1');
    await executeUntilEnding(page);
    await page.waitForSelector('#screen-ending.active', { timeout: 12000 });

    const title = await page.textContent('#ending-title');
    const badgeVisible = await page.evaluate(() => getComputedStyle(document.getElementById('ending-new-badge')).display !== 'none');
    ok(!badgeVisible, `이미 도감에 있는 엔딩을 다시 보면 "새로운 엔딩" 배지가 뜨면 안 됨 (ending: ${title})`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('ending-gallery e2e tests');
  await testFreshGalleryIsAllLocked();
  await testReachingEndingUnlocksGalleryEntry();
  await testSameEndingAgainDoesNotReshowNewBadge();
  summary('ending-gallery.test.js');
})();
