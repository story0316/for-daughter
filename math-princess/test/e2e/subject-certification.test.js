// 기초 과목(수학/영어/과학) 등급 인증(동/은/금메달) 시스템: 상태 화면에 표시,
// 시험 응시 흐름(주/달을 소모하지 않고 상태 화면으로 돌아옴), 실패해도 기존
// 등급이 유지되는지, 과목별 진행 상황이 올바르게 표시되는지 검증한다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, getSavedState, activeScreenId } = require('./helpers');
const SUBJ = require(path.join(__dirname, '..', '..', 'subjects.js'));

async function openStatus(page) {
  await page.click('[data-menu="status"]');
  await page.waitForSelector('#screen-status.active');
}

async function testShowsUncertifiedWithButtonByDefault() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ stats: { intelligence: 60, focus: 40, stamina: 60, charm: 60, creativity: 40, stress: 10, luck: 30 } }));
    await openStatus(page);
    const rows = await page.$$eval('.status-cert-row', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    eq(rows.length, 3, '수학/영어/과학 3과목 인증 행이 있어야 함');
    rows.forEach((text) => {
      ok(text.includes('미인증'), `초기 상태는 미인증이어야 함 (got "${text}")`);
      ok(text.includes('동메달 시험 보기'), `초기 상태는 동메달 시험 버튼이 있어야 함 (got "${text}")`);
    });
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testFailingExamKeepsNullAndReturnsToStatusWithoutConsumingWeek() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekIndex: 1, stats: { intelligence: 60, focus: 40, stamina: 60, charm: 60, creativity: 40, stress: 10, luck: 30 } }));
    await openStatus(page);
    await page.click('.status-cert-btn[data-subject="math"]');
    await page.waitForSelector('#screen-quiz.active');
    eq(await page.textContent('#quiz-session-label'), '📜 수학 동메달 인증 시험', '세션 라벨이 인증 시험을 보여줘야 함');

    for (let i = 0; i < 5; i++) {
      const active = await page.evaluate(() => document.querySelector('.screen.active').id);
      if (active !== 'screen-quiz') break;
      // 수학 동메달(레벨1)은 전부 입력형 사칙연산이라, 절대 답이 될 수 없는
      // 값을 넣어 확실히 오답 처리되게 한다.
      for (const ch of '999999') {
        await page.click(`.keypad-btn[data-key="${ch}"]`);
      }
      await page.click('#btn-quiz-submit');
      await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
      await page.click('#btn-quiz-next');
      await page.waitForTimeout(150);
    }
    await page.waitForSelector('#screen-session-summary.active');
    ok((await page.textContent('#summary-title')).includes('아직이에요'), '전부 틀리면 통과 실패 문구가 떠야 함');
    eq((await page.textContent('#btn-summary-confirm')).trim(), '확인', '인증 시험 결과 화면의 버튼은 "확인"이어야 함(다음 주/달이 아님)');

    await page.click('#btn-summary-confirm');
    await page.waitForSelector('#screen-status.active', { timeout: 8000 });

    const saved = await getSavedState(page);
    eq(saved.certifications.math, null, '실패하면 미인증 상태가 유지되어야 함');
    eq(saved.weekIndex, 1, '인증 시험은 주/달을 소모하면 안 됨(weekIndex가 그대로여야 함)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testDisplaysExistingMedalsAndNextTierCorrectly() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      stats: { intelligence: 90, focus: 80, stamina: 60, charm: 60, creativity: 40, stress: 10, luck: 30 },
      certifications: { math: 'silver', english: 'gold', science: null },
    });
    await seedAndContinue(page, state);
    await openStatus(page);
    const rows = await page.$$eval('.status-cert-row', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    const mathRow = rows.find((r) => r.startsWith('수학'));
    const englishRow = rows.find((r) => r.startsWith('영어'));
    const scienceRow = rows.find((r) => r.startsWith('과학'));

    ok(mathRow.includes('은메달') && mathRow.includes('금메달 시험 보기'), `은메달 보유 중이면 다음 목표(금메달) 버튼이 떠야 함 (got "${mathRow}")`);
    ok(englishRow.includes('금메달') && englishRow.includes('최고 등급 달성'), `금메달(최고 등급)이면 더 이상 시험 버튼이 없어야 함 (got "${englishRow}")`);
    ok(scienceRow.includes('미인증') && scienceRow.includes('동메달 시험 보기'), `미인증 과목은 동메달부터 시작해야 함 (got "${scienceRow}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

// 과학도 고1 통합과학(레벨7)까지 콘텐츠가 생겨서, 수학/영어와 마찬가지로
// 지능이 충분하면 금메달 시험에 응시해서 실제로 딸 수 있어야 한다.
async function testScienceCertExamCanReachGoldAtHighIntelligence() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      weekIndex: 3,
      stats: { intelligence: 95, focus: 80, stamina: 60, charm: 60, creativity: 40, stress: 10, luck: 30 },
      certifications: { math: null, english: null, science: 'silver' },
    });
    await seedAndContinue(page, state);
    await openStatus(page);
    const scienceRowBefore = (await page.$$eval('.status-cert-row', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))).find((r) => r.startsWith('과학'));
    ok(scienceRowBefore.includes('은메달'), '과학은 은메달 상태를 유지해야 함');
    ok(scienceRowBefore.includes('금메달 시험 보기'), `과학도 지능이 충분하면 다른 과목처럼 금메달 시험 버튼이 떠야 함 (got "${scienceRowBefore}")`);

    await page.click('.status-cert-btn[data-subject="science"]');
    await page.waitForSelector('#screen-quiz.active');
    eq(await page.textContent('#quiz-session-label'), '📜 과학 금메달 인증 시험', '세션 라벨이 인증 시험을 보여줘야 함');

    const answerBank = {};
    SUBJ.SCIENCE_BANK[7].forEach((item) => { answerBank[item.question] = item.answer; });

    for (let i = 0; i < 5; i++) {
      const active = await page.evaluate(() => document.querySelector('.screen.active').id);
      if (active !== 'screen-quiz') break;
      const question = await page.textContent('#quiz-question');
      const answer = answerBank[question];
      ok(answer, `테스트가 아는 문제여야 함(subjects.js SCIENCE_BANK[7]와 동기화 필요): "${question}"`);
      await page.click(`.choice-btn:text-is("${answer}")`);
      await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
      await page.click('#btn-quiz-next');
      await page.waitForTimeout(150);
    }
    await page.waitForSelector('#screen-session-summary.active');
    ok(!(await page.textContent('#summary-title')).includes('아직이에요'), '전부 정답을 맞히면 통과해야 함');

    await page.click('#btn-summary-confirm');
    await page.waitForSelector('#screen-status.active', { timeout: 8000 });

    const saved = await getSavedState(page);
    eq(saved.certifications.science, 'gold', '통과하면 과학도 금메달이 인증되어야 함');
    eq(saved.weekIndex, 3, '인증 시험은 주/달을 소모하면 안 됨(weekIndex가 그대로여야 함)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(과학 금메달 인증): ${errors.join('\n')}`);
}

// subjects.js의 ENGLISH_VOCAB_BANK[1](동메달 레벨) 정답 목록. 화면에 뜬 단어를
// 보고 정답 뜻을 찾아 클릭하기 위한 것으로, 콘텐츠 자체는 subjects.js와 동일해야 한다.
const ENGLISH_BRONZE_VOCAB = {
  apple: '사과', dog: '개', happy: '행복한', book: '책', water: '물',
  school: '학교', friend: '친구', big: '큰', small: '작은', run: '달리다',
};

async function answerEnglishCertQuestionCorrectly(page) {
  await page.waitForTimeout(150);
  const question = await page.textContent('#quiz-question');
  const word = question.match(/^'(.+)'/)[1];
  const meaning = ENGLISH_BRONZE_VOCAB[word];
  ok(meaning, `테스트가 아는 단어여야 함(subjects.js와 동기화 필요): "${question}"`);
  await page.click(`.choice-btn:text-is("${meaning}")`);
}

async function testEnglishCertExamUsesVocabMatchFormatAndAwardsMedal() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ weekIndex: 2, stats: { intelligence: 60, focus: 40, stamina: 60, charm: 60, creativity: 40, stress: 10, luck: 30 } }));
    await openStatus(page);
    await page.click('.status-cert-btn[data-subject="english"]');
    await page.waitForSelector('#screen-quiz.active');
    eq(await page.textContent('#quiz-session-label'), '📜 영어 동메달 인증 시험', '세션 라벨이 인증 시험을 보여줘야 함');

    for (let i = 0; i < 5; i++) {
      const active = await page.evaluate(() => document.querySelector('.screen.active').id);
      if (active !== 'screen-quiz') break;
      const question = await page.textContent('#quiz-question');
      ok(/^'.+'의 뜻으로 알맞은 것은\?$/.test(question), `영어 인증 시험은 단어-뜻 짝짓기 형식이어야 함(문법 문제가 아님): "${question}"`);
      await answerEnglishCertQuestionCorrectly(page);
      await page.waitForSelector('#btn-quiz-next', { state: 'visible' });
      await page.click('#btn-quiz-next');
      await page.waitForTimeout(150);
    }
    await page.waitForSelector('#screen-session-summary.active');
    ok(!(await page.textContent('#summary-title')).includes('아직이에요'), '전부 정답을 맞히면 통과해야 함');

    await page.click('#btn-summary-confirm');
    await page.waitForSelector('#screen-status.active', { timeout: 8000 });

    const saved = await getSavedState(page);
    eq(saved.certifications.english, 'bronze', '통과하면 동메달이 인증되어야 함');
    eq(saved.weekIndex, 2, '인증 시험은 주/달을 소모하면 안 됨(weekIndex가 그대로여야 함)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(영어 인증 단어-뜻 짝짓기): ${errors.join('\n')}`);
}

(async () => {
  console.log('subject-certification e2e tests');
  await testShowsUncertifiedWithButtonByDefault();
  await testFailingExamKeepsNullAndReturnsToStatusWithoutConsumingWeek();
  await testDisplaysExistingMedalsAndNextTierCorrectly();
  await testScienceCertExamCanReachGoldAtHighIntelligence();
  await testEnglishCertExamUsesVocabMatchFormatAndAwardsMedal();
  summary('subject-certification.test.js');
})();
