// 평민 → 귀족 신분 상승(작위 수여) 이벤트: 성장 능력치 6개가 전부 Lv5를
// 다 채우면(값 50) 메인 화면 대신 왕실 작위 수여 이벤트가 뜨고, 작위명을
// 입력해야 귀족이 되며, 메인 화면에 눈에 띄는 배지로 표시되는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, getSavedState, activeScreenId, BASE_URL } = require('./helpers');

const ALL_STATS_AT_50 = { intelligence: 50, focus: 50, stamina: 50, charm: 50, creativity: 50, stress: 10, luck: 50 };

// seedAndContinue는 항상 #screen-main.active를 기다리는데, 승급 조건을 이미
// 만족한 상태로 이어하기를 하면 메인 대신 작위 수여 화면이 뜨므로 그 헬퍼를
// 쓸 수 없다. "이어하기"까지만 대신 해주는 로컬 버전을 쓴다.
async function seedAndContinueWithoutAssertingScreen(page, state) {
  await page.goto(`${BASE_URL}/math-princess/index.html?turns=48`);
  await page.evaluate((s) => localStorage.setItem('math-princess-save-v1', JSON.stringify(s)), state);
  await page.reload();
  await page.click('#btn-continue');
  await page.waitForTimeout(200);
}

async function testBelowThresholdGoesStraightToMain() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: 20 } }));
    eq(await activeScreenId(page), 'screen-main', '능력치가 부족하면 평소처럼 메인 화면으로 가야 함');
    const badgeVisible = await page.evaluate(() => document.querySelector('#noble-title-badge').style.display !== 'none');
    ok(!badgeVisible, '아직 승급 전이면 작위 배지가 보이면 안 됨');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(기본 상태): ${errors.join('\n')}`);
}

async function testReachingAllStatsAt50TriggersPromotionCeremony() {
  const errors = await withPage(async (page) => {
    await seedAndContinueWithoutAssertingScreen(page, makeState({ stats: ALL_STATS_AT_50 }));
    eq(await activeScreenId(page), 'screen-noble-promotion', '성장 능력치 6개가 모두 50 이상이면 메인 대신 작위 수여 화면이 떠야 함');

    // 빈 입력으로 제출하면 오류 문구가 뜨고 화면이 넘어가면 안 된다.
    await page.click('#btn-noble-title-confirm');
    await page.waitForTimeout(150);
    eq(await activeScreenId(page), 'screen-noble-promotion', '작위명 없이 제출하면 화면이 넘어가면 안 됨');
    ok((await page.textContent('#noble-title-error')).includes('입력'), '작위명이 비어있으면 안내 문구가 떠야 함');

    await page.fill('#noble-title-input', '은빛 백작');
    await page.click('#btn-noble-title-confirm');
    await page.waitForSelector('#screen-main.active');

    const badgeText = await page.textContent('#noble-title-badge');
    ok(badgeText.includes('은빛 백작'), `메인 화면에 작위 배지가 눈에 띄게 표시되어야 함 (got "${badgeText}")`);
    const badgeVisible = await page.evaluate(() => document.querySelector('#noble-title-badge').style.display !== 'none');
    ok(badgeVisible, '승급 후에는 작위 배지가 보여야 함');

    const saved = await getSavedState(page);
    eq(saved.nobleTitle, '은빛 백작', '저장 데이터에 작위명이 기록되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(승급 이벤트): ${errors.join('\n')}`);
}

async function testAlreadyPromotedSkipsCeremonyOnReload() {
  const errors = await withPage(async (page) => {
    const state = makeState({ stats: ALL_STATS_AT_50, nobleTitle: '루비 자작' });
    await seedAndContinue(page, state);
    eq(await activeScreenId(page), 'screen-main', '이미 작위를 받았으면 조건을 다시 만족해도 메인 화면으로 바로 가야 함');
    const badgeText = await page.textContent('#noble-title-badge');
    ok(badgeText.includes('루비 자작'), '이어하기를 해도 기존 작위 배지가 그대로 보여야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(이미 승급): ${errors.join('\n')}`);
}

(async () => {
  console.log('noble-promotion e2e tests');
  await testBelowThresholdGoesStraightToMain();
  await testReachingAllStatsAt50TriggersPromotionCeremony();
  await testAlreadyPromotedSkipsCeremonyOnReload();
  summary('noble-promotion.test.js');
})();
