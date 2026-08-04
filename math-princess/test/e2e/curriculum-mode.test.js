// 게임 시작 시 학습 난이도(curriculumMode: 초등학교/중학교/전체) 선택 화면
// e2e 테스트. 실제 문제 출제 필터링 자체는 question-engine.test.js의
// unlockedLevelsFor 유닛 테스트가 담당하고, 여기서는 UI 플로우(화면 등장,
// 선택→저장, 뒤로가기, "다시 시작하기" 시 재질문 없이 이어짐)를 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const {
  withPage, BASE_URL, getSavedState, activeScreenId, drainQuizSession, makeState, seedAndContinue,
  pickCurriculumModeAndStart,
} = require('./helpers');

async function testScreenAppearsOnNewGame() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html?turns=48`);
    await page.evaluate(() => localStorage.removeItem('math-princess-save-v1'));
    await page.reload();
    await page.click('#btn-new-game');
    await page.waitForSelector('#screen-curriculum-mode.active');
    const active = await activeScreenId(page);
    eq(active, 'screen-curriculum-mode', '새 게임을 시작하면 난이도 모드 선택 화면부터 보여야 함');
    const modeButtons = await page.$$('#curriculum-mode-list [data-mode]');
    eq(modeButtons.length, 3, '난이도 모드 카드는 3개(초등학교/중학교/전체)여야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testBackButtonReturnsToStart() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html?turns=48`);
    await page.evaluate(() => localStorage.removeItem('math-princess-save-v1'));
    await page.reload();
    await page.click('#btn-new-game');
    await page.waitForSelector('#screen-curriculum-mode.active');
    await page.click('#btn-curriculum-mode-back');
    await page.waitForSelector('#screen-start.active');
    const saved = await getSavedState(page);
    ok(!saved, '뒤로가기를 누르면 게임이 시작되지 않아야 함(저장 데이터 없음)');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testEachModeIsSavedCorrectly() {
  for (const mode of ['elementary', 'middle', 'all']) {
    const errors = await withPage(async (page) => {
      await page.goto(`${BASE_URL}/math-princess/index.html?turns=48`);
      await page.evaluate(() => localStorage.removeItem('math-princess-save-v1'));
      await page.reload();
      await page.click('#btn-new-game');
      await pickCurriculumModeAndStart(page, mode);
      const saved = await getSavedState(page);
      eq(saved.curriculumMode, mode, `"${mode}" 카드를 고르면 저장 데이터의 curriculumMode도 "${mode}"여야 함`);
    });
    ok(errors.length === 0, `JS 에러 없어야 함(mode=${mode}): ${errors.join('\n')}`);
  }
}

async function testOldSaveWithoutCurriculumModeDefaultsToAll() {
  const errors = await withPage(async (page) => {
    // curriculumMode 필드가 아예 없는 예전 형식의 저장 데이터를 이어하면
    // (이 기능 이전에 저장된 데이터), 마이그레이션으로 'all'(무제한)이
    // 되어야 한다 — 예전 사용자의 진행 상황이 갑자기 좁아지면 안 됨.
    const state = makeState({});
    delete state.curriculumMode;
    await seedAndContinue(page, state);
    const saved = await getSavedState(page);
    eq(saved.curriculumMode, 'all', 'curriculumMode가 없는 예전 저장 데이터는 마이그레이션 시 "all"이 되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testEndingRestartPreservesModeWithoutRePrompting() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      turn: 48, gold: 500, curriculumMode: 'elementary',
      stats: { intelligence: 90, focus: 80, stamina: 80, charm: 90, creativity: 80, stress: 10, luck: 40 },
      weekPlan: ['rest', 'rest', 'rest', 'rest'], weekIndex: 3,
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-quiz.active');
    await drainQuizSession(page);
    if ((await activeScreenId(page)) === 'screen-event') await page.click('#btn-event-confirm');
    await page.waitForSelector('#screen-ending.active', { timeout: 12000 });

    await page.click('#btn-ending-restart');
    // 모드를 이미 알고 있으므로 선택 화면을 다시 띄우지 않고 바로 메인으로 가야 함.
    await page.waitForSelector('#screen-main.active');
    const active = await activeScreenId(page);
    eq(active, 'screen-main', '"다시 시작하기"는 난이도 모드를 다시 묻지 않고 바로 새 게임을 시작해야 함');

    const saved = await getSavedState(page);
    eq(saved.curriculumMode, 'elementary', '"다시 시작하기"를 해도 이전에 고른 난이도 모드(elementary)가 유지되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('curriculum-mode e2e tests');
  await testScreenAppearsOnNewGame();
  await testBackButtonReturnsToStart();
  await testEachModeIsSavedCorrectly();
  await testOldSaveWithoutCurriculumModeDefaultsToAll();
  await testEndingRestartPreservesModeWithoutRePrompting();
  summary('curriculum-mode.test.js');
})();
