// 평민 → 귀족 신분 상승(작위 수여) 이벤트: 성장 능력치 6개가 전부 Lv5를
// 다 채우면(값 50) 메인 화면 대신 왕실 작위 수여 이벤트가 뜨고, 작위명을
// 입력해야 귀족이 되며, 메인 화면에 눈에 띄는 배지로 표시되는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, getSavedState, activeScreenId, BASE_URL } = require('./helpers');
const P = require('../../problems.js');
const SUBJ = require('../../subjects.js');
const { createQuestionEngine } = require('../../question-engine.js');

const Question = createQuestionEngine({ P, SUBJ });
const FAITH_ANSWERS = new Map(Question.FAITH_QUESTIONS.map((q) => [q.question, q.answer]));

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

// 회귀 테스트: 게임의 마지막 턴에 마지막 활동을 완료하면서 "동시에" 승급
// 조건도 채우는 경우, 엔딩으로 바로 넘어가 버리면 작위 수여 기회가 영영
// 사라진다(엔딩 화면은 저장 데이터를 지우기 때문). 엔딩보다 승급 이벤트가
// 먼저 떠야 한다.
async function testPromotionCeremonyShowsBeforeEndingOnFinalTurn() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      turn: 1,
      weekIndex: 3, // 이번 달의 마지막 주
      weekPlan: [null, null, null, 'faith'],
      // luck만 아직 50 미만이고 나머지 5개 성장 능력치는 이미 50. 기도와
      // 선행(문제 3개, 정답마다 luck+1)을 만점으로 마치면 정확히 50이 된다.
      stats: { intelligence: 50, focus: 50, stamina: 50, charm: 50, creativity: 50, stress: 10, luck: 47 },
    });
    await seedAndContinue(page, state, '?turns=1'); // turns=1이라 이번 턴이 곧 마지막 턴

    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    const count = await page.evaluate(() => Number(document.querySelector('#quiz-progress').textContent.split('/')[1].trim()));
    for (let i = 0; i < count; i++) {
      await page.waitForTimeout(150);
      const questionText = (await page.textContent('#quiz-question')).trim();
      const answer = FAITH_ANSWERS.get(questionText);
      const buttons = await page.$$('.choice-btn');
      for (const b of buttons) {
        if ((await b.textContent()).trim() === answer) { await b.click(); break; }
      }
      await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
      await page.click('#btn-quiz-next');
    }
    await page.waitForSelector('#screen-session-summary.active');
    await page.click('#btn-summary-confirm');

    // 게임이 끝나는 턴이지만, 승급 조건도 함께 채웠으므로 엔딩보다 작위
    // 수여 이벤트가 먼저 떠야 한다.
    await page.waitForSelector('#screen-noble-promotion.active', { timeout: 8000 });
    eq(await activeScreenId(page), 'screen-noble-promotion', '마지막 턴에 승급 조건을 채워도 엔딩보다 작위 수여 이벤트가 먼저 떠야 함');

    await page.fill('#noble-title-input', '별빛 자작');
    await page.click('#btn-noble-title-confirm');

    // 작위를 받은 뒤에는 (게임이 끝나는 턴이었으므로) 엔딩 화면으로 이어져야 한다.
    await page.waitForSelector('#screen-ending.active', { timeout: 8000 });
    eq(await activeScreenId(page), 'screen-ending', '작위 수여를 마치면 원래 예정되어 있던 엔딩 화면으로 이어져야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(마지막 턴 승급 후 엔딩): ${errors.join('\n')}`);
}

(async () => {
  console.log('noble-promotion e2e tests');
  await testBelowThresholdGoesStraightToMain();
  await testReachingAllStatsAt50TriggersPromotionCeremony();
  await testAlreadyPromotedSkipsCeremonyOnReload();
  await testPromotionCeremonyShowsBeforeEndingOnFinalTurn();
  summary('noble-promotion.test.js');
})();
