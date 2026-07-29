// 연회 3단계(작은 다과회/사교 모임/고급 사교 모임)의 등급 선택 화면, 등급별
// 입장료/옷차림/품위/영어 인증 게이트, 그리고 왕자님은 고급 사교 모임에서만
// 만날 수 있다는 것을 실제 UI 흐름으로 검증한다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, activeScreenId, getSavedState, planWeekActivity } = require('./helpers');
const P = require(path.join(__dirname, '..', '..', 'problems.js'));
const SUBJ = require(path.join(__dirname, '..', '..', 'subjects.js'));
const QE = require(path.join(__dirname, '..', '..', 'question-engine.js')).createQuestionEngine({ P, SUBJ });

// question-engine.js의 ETIQUETTE_QUESTIONS 정답 문구(고정 콘텐츠)를 실제
// 문제 은행에서 그대로 가져온다. 은행 크기가 바뀌어도(문제가 추가/삭제돼도)
// 이 목록이 항상 동기화되도록, 하드코딩된 정답 목록 대신 동적으로 만든다.
const CORRECT_ETIQUETTE_ANSWERS = QE.ETIQUETTE_QUESTIONS.map((q) => q.answer);

async function answerBanquetCorrectly(page) {
  await page.waitForTimeout(150);
  const buttons = await page.$$('.choice-btn');
  for (const b of buttons) {
    const text = (await b.textContent()).trim();
    if (CORRECT_ETIQUETTE_ANSWERS.includes(text)) {
      await b.click();
      return;
    }
  }
  throw new Error('연회 문제에서 정답 보기를 찾지 못함');
}

async function answerAllBanquetQuestionsCorrectly(page, count) {
  for (let i = 0; i < count; i++) {
    await answerBanquetCorrectly(page);
    await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
    await page.click('#btn-quiz-next');
    await page.waitForTimeout(150);
  }
}

async function openBanquetTierPickScreen(page) {
  await page.click('[data-menu="schedule"]');
  await page.waitForSelector('#screen-schedule.active');
  const cards = await page.$$('#week-plan-list .level-card');
  await cards[0].click();
  await page.waitForSelector('#screen-week-pick.active');
  await page.click('[data-activity="banquet"]');
  await page.waitForSelector('#screen-banquet-tier-pick.active');
}

async function tierCardLockState(page) {
  return page.$$eval('#banquet-tier-pick-list .level-card', (els) =>
    Object.fromEntries(els.map((e) => [e.dataset.tier, e.classList.contains('locked')])));
}

async function testTeaPartyAlwaysAccessibleAndFeeCharged() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 500 }));
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    await planWeekActivity(page, 0, 'banquet', 'tea-party');
    const goldBefore = (await getSavedState(page)).gold;
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    ok((await page.textContent('#quiz-session-label')).includes('작은 다과회'), '세션 라벨에 선택한 등급 이름이 보여야 함');
    const goldAfter = (await getSavedState(page)).gold;
    eq(goldAfter, goldBefore - 100, '작은 다과회는 입장료 100G가 차감되어야 함(옷차림/품위 요건 없음)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(작은 다과회): ${errors.join('\n')}`);
}

async function testSocialAndGrandSocialLockedByDefault() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 2000 }));
    await openBanquetTierPickScreen(page);
    const locks = await tierCardLockState(page);
    eq(locks['tea-party'], false, '작은 다과회는 기본 상태에서도 잠기지 않아야 함');
    eq(locks['social'], true, '사교 모임은 옷차림/품위 미달 시 잠겨야 함');
    eq(locks['grand-social'], true, '고급 사교 모임은 옷차림/품위/영어 인증 미달 시 잠겨야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(기본 잠금): ${errors.join('\n')}`);
}

async function testSocialUnlocksWithOutfitAndGraceAndChargesFee() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 2000,
      wardrobe: { equipped: 1, owned: [true, true, false, false, false, false], notifiedGraceTier: 0 },
      stats: { intelligence: 60, focus: 40, stamina: 60, charm: 70, creativity: 50, stress: 10, luck: 30 },
    });
    await seedAndContinue(page, state);
    await openBanquetTierPickScreen(page);
    const locks = await tierCardLockState(page);
    eq(locks['social'], false, '옷차림(단정한 옷 이상)과 품위(35 이상)를 갖추면 사교 모임 잠금이 풀려야 함');
    eq(locks['grand-social'], true, '영어 인증이 없으면 고급 사교 모임은 여전히 잠겨야 함');

    await page.click('.level-card[data-tier="social"]');
    await page.waitForSelector('#screen-schedule.active');
    const goldBefore = (await getSavedState(page)).gold;
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    const goldAfter = (await getSavedState(page)).gold;
    eq(goldAfter, goldBefore - 200, '사교 모임은 입장료 200G가 차감되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(사교 모임): ${errors.join('\n')}`);
}

async function testGrandSocialLockedWithoutEnglishCertEvenWithFullOutfitAndGrace() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 2000,
      wardrobe: { equipped: 2, owned: [true, true, true, false, false, false], notifiedGraceTier: 0 },
      stats: { intelligence: 60, focus: 40, stamina: 60, charm: 90, creativity: 60, stress: 10, luck: 30 },
      certifications: { math: null, english: null, science: null },
    });
    await seedAndContinue(page, state);
    await openBanquetTierPickScreen(page);
    const locks = await tierCardLockState(page);
    eq(locks['social'], false, '옷차림/품위를 충분히 갖췄으면 사교 모임은 잠기지 않아야 함');
    eq(locks['grand-social'], true, '옷차림/품위를 갖춰도 영어 인증(은메달 이상)이 없으면 고급 사교 모임은 잠겨야 함');

    // 잠긴 카드는 클릭해도 반응이 없어야 한다(다음 화면으로 못 넘어감)
    await page.click('.level-card[data-tier="grand-social"]');
    await page.waitForTimeout(200);
    eq(await activeScreenId(page), 'screen-banquet-tier-pick', '잠긴 등급 카드는 클릭해도 화면이 넘어가지 않아야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(고급 사교 모임 잠금): ${errors.join('\n')}`);
}

async function testGrandSocialUnlocksWithEnglishSilverAndMeetsPrince() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 2000,
      wardrobe: { equipped: 2, owned: [true, true, true, false, false, false], notifiedGraceTier: 0 },
      stats: { intelligence: 60, focus: 40, stamina: 60, charm: 90, creativity: 60, stress: 10, luck: 30 },
      certifications: { math: null, english: 'silver', science: null },
    });
    await seedAndContinue(page, state);
    await openBanquetTierPickScreen(page);
    const locks = await tierCardLockState(page);
    eq(locks['grand-social'], false, '영어 은메달 이상이면 고급 사교 모임 잠금이 풀려야 함');

    await page.click('.level-card[data-tier="grand-social"]');
    await page.waitForSelector('#screen-schedule.active');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    ok((await page.textContent('#quiz-session-label')).includes('고급 사교 모임'), '세션 라벨이 고급 사교 모임을 보여줘야 함');

    const count = await page.evaluate(() => Number(document.querySelector('#quiz-progress').textContent.split('/')[1].trim()));
    await answerAllBanquetQuestionsCorrectly(page, count);

    await page.waitForSelector('#screen-event.active', { timeout: 8000 });
    ok((await page.textContent('#event-title')).includes('왕자님'), '조건을 모두 갖추고 만점을 받으면 왕자님을 만나는 이벤트가 떠야 함');

    const saved = await getSavedState(page);
    const prince = saved.npcs.find((n) => n.id === 'prince');
    ok(prince.affection > 15, '왕자님을 만나면 애정도가 올라야 함(기본값 15보다 커야 함)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(왕자님 만나기): ${errors.join('\n')}`);
}

async function testLowerTierSuccessNeverMeetsPrinceEvenIfDressedForPrince() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      gold: 2000,
      wardrobe: { equipped: 2, owned: [true, true, true, false, false, false], notifiedGraceTier: 0 },
      stats: { intelligence: 60, focus: 40, stamina: 60, charm: 90, creativity: 60, stress: 10, luck: 30 },
      certifications: { math: null, english: 'silver', science: null },
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="schedule"]');
    await page.waitForSelector('#screen-schedule.active');
    await planWeekActivity(page, 0, 'banquet', 'social');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    const count = await page.evaluate(() => Number(document.querySelector('#quiz-progress').textContent.split('/')[1].trim()));
    await answerAllBanquetQuestionsCorrectly(page, count);

    await page.waitForSelector('#screen-event.active', { timeout: 8000 });
    const title = await page.textContent('#event-title');
    ok(!title.includes('왕자님'), '사교 모임(최고 등급이 아님)에서는 만점을 받아도 왕자님을 만나면 안 됨');
    ok(title.includes('성공적으로'), '최고 등급이 아닌 곳에서 통과하면 성공 문구가 떠야 함(왕자님 언급 없이)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(하위 등급 성공): ${errors.join('\n')}`);
}

(async () => {
  console.log('banquet-prince-gate e2e tests');
  await testTeaPartyAlwaysAccessibleAndFeeCharged();
  await testSocialAndGrandSocialLockedByDefault();
  await testSocialUnlocksWithOutfitAndGraceAndChargesFee();
  await testGrandSocialLockedWithoutEnglishCertEvenWithFullOutfitAndGrace();
  await testGrandSocialUnlocksWithEnglishSilverAndMeetsPrince();
  await testLowerTierSuccessNeverMeetsPrinceEvenIfDressedForPrince();
  summary('banquet-prince-gate.test.js');
})();
