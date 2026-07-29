// 연회 3단계(작은 다과회/사교 모임/고급 사교 모임)의 등급 선택 화면, 등급별
// 입장료/옷차림/품위/영어 인증 게이트, 그리고 왕자님은 고급 사교 모임에서만
// 만날 수 있다는 것을 실제 UI 흐름으로 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, activeScreenId, getSavedState, planWeekActivity } = require('./helpers');

// question-engine.js의 ETIQUETTE_QUESTIONS 정답 문구(고정 콘텐츠). 연회 문제를
// 확실히 맞히기 위해 화면에 뜬 보기 중 이 목록에 있는 텍스트를 고른다.
const CORRECT_ETIQUETTE_ANSWERS = [
  '조용히 미소지으며 인사하기',
  '왼손 포크, 오른손 나이프로 조용히',
  '끝까지 귀 기울여 듣는다',
  '눈을 마주치고 미소지으며 인사한다',
  '조용히 한 모금씩 마신다',
  '"고맙습니다"라고 인사한다',
  '약속 시간에 맞춰 도착한다',
  '바로 "미안합니다"라고 사과한다',
  '알려주지 않고 어른에게 이야기한다',
  '위로해주고 함께 방법을 찾아본다',
  '괜찮은지 물어보고 도와준다',
  '침착하게 비상구로 대피한다',
  '서로 이야기를 나누며 타협점을 찾는다',
  '서로 의논해서 공평하게 나눈다',
  '다름을 이해하고 존중한다',
  '쓰레기통을 찾을 때까지 가지고 있는다',
  '조용히 하고 다른 사람을 배려한다',
  '솔직히 말하고 사과한다',
  '안 된다고 부드럽게 거절한다',
  '정중하게 순서를 지켜달라고 말한다',
  '문 앞까지 나가서 인사한다',
  '손이나 손수건으로 입을 가린다',
  '미리 연락해서 상황을 알린다',
  '출처를 밝히고 허락을 구한다',
  '단호히 거절하고 자리를 피한다',
  '직접 만나서 차분히 이야기해본다',
  '왜 어려운지 먼저 물어보고 함께 방법을 찾는다',
  '불편한 곳이 있는지 살피고 자연스럽게 돕는다',
  '정해진 분리수거함에 버린다',
  '실제 점수를 솔직하게 말씀드린다',
];

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
