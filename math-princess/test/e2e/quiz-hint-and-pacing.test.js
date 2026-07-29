// 문제 풀이 진행 속도(자동 넘김 대신 "다음" 버튼)와 "도움 받기" 힌트 버튼을
// 검증한다: 정답/오답을 낸 뒤에는 "다음"을 직접 눌러야만 다음 문제로 넘어가고,
// "도움 받기"를 누르면 선생님/왕실 학자가 힌트를 보여주며, 다음 문제로 넘어가면
// 그 힌트는 다시 숨겨져야 한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState } = require('./helpers');

// "공부"는 과목이 수학/영어/과학 중 무작위로 정해지고, 영어/과학은 항상 선택형
// (키패드가 아니라 보기 버튼)이므로 문제 유형에 따라 알맞은 방식으로 답한다.
// (helpers.js의 answerAnyQuizQuestion과 달리, 여기서는 "다음" 버튼 클릭 여부를
// 테스트마다 직접 제어해야 해서 별도로 둔다.)
async function answerCurrentQuestion(page) {
  const choiceBtn = await page.$('.choice-btn');
  if (choiceBtn) {
    await choiceBtn.click();
  } else {
    await page.click('.keypad-btn[data-key="1"]');
    await page.click('#btn-quiz-submit');
  }
}

async function testAnswerDoesNotAutoAdvance() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekPlan: ['study', null, null, null] }));
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    const progressBefore = await page.textContent('#quiz-progress');
    await answerCurrentQuestion(page);
    // 정답을 낸 직후: 짧게 기다려도 "다음"을 누르기 전에는 저절로 다음 문제로
    // 넘어가면 안 된다(예전에는 setTimeout으로 자동으로 넘어갔음).
    await page.waitForTimeout(1500);
    const progressAfter = await page.textContent('#quiz-progress');
    eq(progressAfter, progressBefore, '정답을 낸 뒤 시간이 지나도 "다음"을 누르기 전엔 문제가 자동으로 넘어가면 안 됨');

    const nextVisible = await page.evaluate(() => getComputedStyle(document.getElementById('btn-quiz-next')).display !== 'none');
    ok(nextVisible, '정답을 낸 뒤에는 "다음" 버튼이 보여야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testNextButtonAdvancesQuestion() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekPlan: ['study', null, null, null] }));
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    const progressBefore = await page.textContent('#quiz-progress');
    await answerCurrentQuestion(page);
    await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
    await page.click('#btn-quiz-next');
    await page.waitForTimeout(150);

    const nextHidden = await page.evaluate(() => getComputedStyle(document.getElementById('btn-quiz-next')).display === 'none');
    ok(nextHidden, '다음 문제로 넘어가면 "다음" 버튼은 다시 숨겨져야 함');
    const progressAfter = await page.textContent('#quiz-progress');
    ok(progressAfter !== progressBefore, '"다음"을 누르면 실제로 다음 문제(진행 표시)로 넘어가야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testHintButtonShowsHelperMessage() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekPlan: ['study', null, null, null] }));
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    const hiddenBefore = await page.evaluate(() => getComputedStyle(document.getElementById('quiz-hint')).display === 'none');
    ok(hiddenBefore, '힌트를 누르기 전에는 힌트 영역이 숨겨져 있어야 함');

    await page.click('#btn-quiz-hint');
    await page.waitForTimeout(100);
    const hintText = await page.textContent('#quiz-hint');
    ok(hintText.trim().length > 5, `힌트 버튼을 누르면 힌트 내용이 표시되어야 함 (got "${hintText}")`);
    ok(/👩‍🏫|🧙/.test(hintText), `힌트는 선생님(👩‍🏫) 또는 왕실 스승(🧙)이 알려주는 형태여야 함 (got "${hintText}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testHintResetsOnNextQuestion() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekPlan: ['study', null, null, null] }));
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    await page.click('#btn-quiz-hint');
    await page.waitForTimeout(100);
    let hintVisible = await page.evaluate(() => getComputedStyle(document.getElementById('quiz-hint')).display !== 'none');
    ok(hintVisible, '힌트 버튼을 누르면 힌트가 보여야 함');

    await answerCurrentQuestion(page);
    await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
    await page.click('#btn-quiz-next');
    await page.waitForTimeout(150);

    hintVisible = await page.evaluate(() => getComputedStyle(document.getElementById('quiz-hint')).display !== 'none');
    ok(!hintVisible, '다음 문제로 넘어가면 이전 문제의 힌트는 다시 숨겨져야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testCompetitionHintUsesGivenSubjectHelper() {
  // 경시대회는 수학만 나오므로, 최소 5문제 동안 힌트를 눌러보면 매번 "예를
  // 들어"로 시작하는(실제 문제 예시 힌트가 있는) 수학 힌트가 나와야 한다.
  const errors = await withPage(async (page) => {
    const state = makeState({ stats: { intelligence: 60, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: 20 }, weekPlan: ['competition', null, null, null] });
    await seedAndContinue(page, state);
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    for (let i = 0; i < 3; i++) {
      await page.click('#btn-quiz-hint');
      await page.waitForTimeout(80);
      const hintText = await page.textContent('#quiz-hint');
      ok(hintText.includes('예를 들어'), `수학 문제 힌트는 예시를 포함해야 함 (got "${hintText}")`);
      await answerCurrentQuestion(page);
      await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
      await page.click('#btn-quiz-next');
      await page.waitForTimeout(150);
    }
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

// 초등학생 기준으로 중학교 이상 범위 레벨의 문제를 낼 때는 도움 캐릭터가
// 그 레벨의 핵심 개념을 자동으로(힌트 버튼을 누르지 않아도) 설명해줘야 한다.
// 지능을 100으로 두면 세 과목 모두 "최근 해금된 3개 레벨" 밴드가 전부
// 중학교 이상이라, 공부 세션이 어떤 과목/레벨을 뽑든 항상 개념 설명이 있어야 한다.
async function testConceptShownForAdvancedLevelStudySession() {
  const errors = await withPage(async (page) => {
    // intelligence만 레벨/과목 선택에 영향을 준다. 나머지 성장 능력치는 일부러
    // 50 미만으로 남겨서(모든 성장 능력치가 50을 넘으면 평민→귀족 신분 상승
    // 이벤트가 떠서 #screen-main 대신 그 화면으로 가버리는 걸 피하기 위함).
    const state = makeState({
      stats: { intelligence: 100, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 0, luck: 20 },
      weekPlan: ['study', null, null, null],
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    for (let i = 0; i < 3; i++) {
      const visible = await page.evaluate(() => getComputedStyle(document.getElementById('quiz-concept')).display !== 'none');
      ok(visible, '중학교 이상 레벨에서는 문제를 낼 때마다 개념 설명이 자동으로 보여야 함');
      const conceptText = await page.textContent('#quiz-concept');
      ok(conceptText.trim().length > 10, `개념 설명 내용이 있어야 함 (got "${conceptText}")`);
      ok(/👩‍🏫|🧙/.test(conceptText), `개념 설명은 선생님(👩‍🏫) 또는 왕실 스승(🧙)이 말해주는 형태여야 함 (got "${conceptText}")`);

      await answerCurrentQuestion(page);
      await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
      await page.click('#btn-quiz-next');
      await page.waitForTimeout(150);
    }
  });
  ok(errors.length === 0, `JS 에러 없어야 함(개념 설명 표시): ${errors.join('\n')}`);
}

// 지능 0이면 세 과목 모두 레벨 1(초등 범위)만 나오므로, 개념 설명 영역이
// 계속 숨겨져 있어야 한다(초등학생에게는 불필요한 정보를 보여주지 않음).
async function testConceptHiddenForElementaryLevelStudySession() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      stats: { intelligence: 0, focus: 0, stamina: 50, charm: 0, creativity: 0, stress: 10, luck: 0 },
      weekPlan: ['study', null, null, null],
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');

    for (let i = 0; i < 3; i++) {
      const hidden = await page.evaluate(() => getComputedStyle(document.getElementById('quiz-concept')).display === 'none');
      ok(hidden, '초등 범위 레벨(지능 0)에서는 개념 설명 영역이 보이면 안 됨');

      await answerCurrentQuestion(page);
      await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
      await page.click('#btn-quiz-next');
      await page.waitForTimeout(150);
    }
  });
  ok(errors.length === 0, `JS 에러 없어야 함(개념 설명 숨김): ${errors.join('\n')}`);
}

(async () => {
  console.log('quiz-hint-and-pacing e2e tests');
  await testAnswerDoesNotAutoAdvance();
  await testNextButtonAdvancesQuestion();
  await testHintButtonShowsHelperMessage();
  await testHintResetsOnNextQuestion();
  await testCompetitionHintUsesGivenSubjectHelper();
  await testConceptShownForAdvancedLevelStudySession();
  await testConceptHiddenForElementaryLevelStudySession();
  summary('quiz-hint-and-pacing.test.js');
})();
