// 창의력 올림피아드(창의력 요건 미달 시 잠김, 문제 수 직접 선택, 정답마다
// 창의력/상금)와 기도와 선행(항상 열려 있음, 고정 3문제, 정답마다 행운
// 상승·오답은 벌점 없음) 두 새 활동을 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, drainQuizSession, getSavedState } = require('./helpers');

// 정답을 화면에 뜬 "질문 문구" 기준으로 정확히 찾기 위해, 실제 콘텐츠(질문
// 은행)를 직접 불러와 question -> answer 맵을 만든다. 여러 문제에서 서로의
// 오답 보기가 다른 문제의 정답 문구와 우연히 겹치는 경우(예: "4개"가 어떤
// 문제의 정답이면서 다른 문제의 오답 보기이기도 함)가 있어, 정답 텍스트만
// 보고 아무 버튼이나 고르면 잘못된(오답) 버튼을 클릭할 위험이 있기 때문이다.
const P = require('../../problems.js');
const SUBJ = require('../../subjects.js');
const { createQuestionEngine } = require('../../question-engine.js');
const Question = createQuestionEngine({ P, SUBJ });

const QUESTION_TO_ANSWER = new Map();
[...Question.CREATIVITY_PUZZLE_BANK, ...Question.FAITH_QUESTIONS].forEach((q) => {
  QUESTION_TO_ANSWER.set(q.question, q.answer);
});

async function answerKnownCorrectly(page) {
  await page.waitForTimeout(150);
  const questionText = (await page.textContent('#quiz-question')).trim();
  const answer = QUESTION_TO_ANSWER.get(questionText);
  if (!answer) return false;
  const buttons = await page.$$('.choice-btn');
  for (const b of buttons) {
    const text = (await b.textContent()).trim();
    if (text === answer) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function answerSessionKnownCorrectly(page, count) {
  for (let i = 0; i < count; i++) {
    const found = await answerKnownCorrectly(page);
    ok(found, `${i + 1}번째 문제에서 정답 보기를 찾지 못함(테스트의 KNOWN_ANSWERS를 콘텐츠와 동기화해야 함)`);
    await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
    await page.click('#btn-quiz-next');
    await page.waitForTimeout(150);
  }
}

async function planWeek0(page, activity) {
  await page.click('[data-menu="schedule"]');
  await page.waitForSelector('#screen-schedule.active');
  const cards = await page.$$('#week-plan-list .level-card');
  await cards[0].click();
  await page.waitForSelector('#screen-week-pick.active');
  await page.click(`[data-activity="${activity}"]`);
}

async function testCreativityLockedBelowThreshold() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 10, stress: 10, luck: 20 } }));
    await planWeek0(page, 'creativity');
    await page.waitForTimeout(200);
    const locked = await page.evaluate(() => document.querySelector('[data-activity="creativity"]').classList.contains('locked'));
    ok(locked, '창의력 요건 미달이면 창의력 올림피아드 카드가 잠겨 있어야 함');
    const stillOnPick = await page.evaluate(() => document.getElementById('screen-week-pick').classList.contains('active'));
    ok(stillOnPick, '잠긴 카드를 눌러도 화면이 그대로여야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(창의력 잠김): ${errors.join('\n')}`);
}

async function testCreativityUnlockedHasCountPickerAndAwardsCreativity() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 30, stress: 10, luck: 20 } }));
    await planWeek0(page, 'creativity');
    const locked = await page.evaluate(() => document.querySelector('[data-activity="creativity"]').classList.contains('locked'));
    ok(!locked, '창의력 30이면 잠겨 있지 않아야 함');
    await page.waitForSelector('#screen-question-count-pick.active');
    await page.click('#btn-count-pick-confirm');
    await page.waitForSelector('#screen-schedule.active');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');

    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    const label = await page.textContent('#quiz-session-label');
    ok(label.includes('창의력 올림피아드'), `퀴즈 라벨에 "창의력 올림피아드"가 표시되어야 함 (got "${label}")`);

    const count = await page.evaluate(() => Number(document.querySelector('#quiz-progress').textContent.split('/')[1].trim()));
    const creativityBefore = (await getSavedState(page)).stats.creativity;
    await answerSessionKnownCorrectly(page, count);
    await page.waitForSelector('#screen-session-summary.active', { timeout: 8000 });
    ok((await page.textContent('#summary-title')).includes('만점'), '전부 맞히면 만점 문구가 떠야 함');

    await page.click('#btn-summary-confirm');
    await page.waitForSelector('#screen-main.active');
    const saved = await getSavedState(page);
    ok(saved.stats.creativity > creativityBefore, '창의력 올림피아드 정답은 창의력을 올려야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(창의력 진행): ${errors.join('\n')}`);
}

async function testFaithAlwaysAvailableNoCountPickerAndAwardsLuck() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 30, luck: 20 } }));
    await planWeek0(page, 'faith');
    // 기도와 선행은 문제 수를 고르는 활동이 아니므로 바로 스케줄 화면으로 돌아가야 한다.
    await page.waitForSelector('#screen-schedule.active');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');

    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    const label = await page.textContent('#quiz-session-label');
    ok(label.includes('기도와 선행'), `퀴즈 라벨에 "기도와 선행"이 표시되어야 함 (got "${label}")`);

    const count = await page.evaluate(() => Number(document.querySelector('#quiz-progress').textContent.split('/')[1].trim()));
    eq(count, 3, '기도와 선행은 항상 3문제로 고정되어야 함');

    const before = (await getSavedState(page)).stats;
    await answerSessionKnownCorrectly(page, count);
    await page.waitForSelector('#screen-session-summary.active', { timeout: 8000 });
    ok(Number((await page.textContent('#summary-gold')).trim()) === 0, '기도와 선행은 골드를 주지 않아야 함');

    await page.click('#btn-summary-confirm');
    await page.waitForSelector('#screen-main.active');
    const after = (await getSavedState(page)).stats;
    ok(after.luck > before.luck, '기도와 선행 정답은 행운을 올려야 함');
    ok(after.stress < before.stress, '기도와 선행 정답은 스트레스를 내려야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(기도와 선행 진행): ${errors.join('\n')}`);
}

async function testFaithWrongAnswerHasNoPenalty() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: 20 } }));
    await planWeek0(page, 'faith');
    await page.waitForSelector('#screen-schedule.active');
    await page.click('#btn-schedule-back');
    await page.waitForSelector('#screen-main.active');
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    const before = (await getSavedState(page)).stats;
    // 확실히 오답 처리되도록, 지금 문제의 정답이 아닌 보기를 골라 클릭한다.
    await page.waitForTimeout(150);
    const questionText = (await page.textContent('#quiz-question')).trim();
    const correctAnswer = QUESTION_TO_ANSWER.get(questionText);
    const buttons = await page.$$('.choice-btn');
    const texts = await Promise.all(buttons.map((b) => b.textContent()));
    let wrongIdx = texts.findIndex((t) => t.trim() !== correctAnswer);
    if (wrongIdx === -1) wrongIdx = 0;
    await buttons[wrongIdx].click();
    await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
    const saved = await getSavedState(page);
    ok(saved.stats.stamina === before.stamina, '기도와 선행은 오답이어도 체력이 깎이면 안 됨');
    ok(saved.stats.stress === before.stress, '기도와 선행은 오답이어도 스트레스가 오르면 안 됨');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(기도와 선행 오답 무벌점): ${errors.join('\n')}`);
}

(async () => {
  console.log('creativity-and-faith e2e tests');
  await testCreativityLockedBelowThreshold();
  await testCreativityUnlockedHasCountPickerAndAwardsCreativity();
  await testFaithAlwaysAvailableNoCountPickerAndAwardsLuck();
  await testFaithWrongAnswerHasNoPenalty();
  summary('creativity-and-faith.test.js');
})();
