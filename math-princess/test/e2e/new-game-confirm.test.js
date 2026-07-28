// 시작 화면에서 "새로 시작하기"를 눌렀을 때, 진행 중인 저장 데이터가 있으면
// 실수로 지우지 않도록 먼저 확인을 받는지 검증한다(취소하면 기존 진행 보존,
// 확인하면 실제로 새 게임 시작). 저장 데이터가 없을 때는 확인 없이 바로 시작한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, getSavedState, activeScreenId, BASE_URL } = require('./helpers');

async function testNoExistingSaveStartsImmediately() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html?turns=48`);
    await page.evaluate(() => localStorage.removeItem('math-princess-save-v1'));
    await page.reload();
    await page.click('#btn-new-game');
    await page.waitForSelector('#screen-main.active');
    const active = await activeScreenId(page);
    eq(active, 'screen-main', '저장 데이터가 없으면 확인 없이 바로 새 게임이 시작되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testExistingSaveShowsConfirmDialog() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 777 }));
    // 메인 화면에서 시작 화면으로 직접 돌아가는 경로는 없으므로, 저장 데이터가
    // 남아 있는 채로 다시 페이지를 열어 "이어하기"가 뜨는 시작 화면부터 검증한다.
    await page.reload();
    await page.waitForSelector('#screen-start.active');
    const continueVisible = await page.evaluate(() => document.getElementById('btn-continue').style.display !== 'none');
    ok(continueVisible, '저장 데이터가 있으면 이어하기 버튼이 보여야 함');

    await page.click('#btn-new-game');
    await page.waitForSelector('#screen-confirm-new-game.active');
    const desc = await page.textContent('#screen-confirm-new-game p');
    ok(desc.includes('사라'), `경고 문구에 진행 상황이 사라진다는 안내가 있어야 함 (got "${desc}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testCancelPreservesExistingSave() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 888 }));
    await page.reload();
    await page.waitForSelector('#screen-start.active');
    await page.click('#btn-new-game');
    await page.waitForSelector('#screen-confirm-new-game.active');
    await page.click('#btn-cancel-new-game');
    await page.waitForSelector('#screen-start.active');

    const saved = await getSavedState(page);
    eq(saved.gold, 888, '취소하면 기존 저장 데이터가 그대로 남아 있어야 함');

    await page.click('#btn-continue');
    await page.waitForSelector('#screen-main.active');
    const goldShown = await page.textContent('#gold-label');
    ok(goldShown.includes('888'), `이어하기로 들어가면 취소 전 진행 상황(골드 888)이 유지되어야 함 (got "${goldShown}")`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

async function testConfirmOverwritesExistingSave() {
  const errors = await withPage(async (page) => {
    await seedAndContinue(page, makeState({ gold: 999 }));
    await page.reload();
    await page.waitForSelector('#screen-start.active');
    await page.click('#btn-new-game');
    await page.waitForSelector('#screen-confirm-new-game.active');
    await page.click('#btn-confirm-new-game');
    await page.waitForSelector('#screen-main.active');

    const saved = await getSavedState(page);
    eq(saved.gold, 0, '확인하면 새 게임으로 초기화되어 골드가 0이어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함: ${errors.join('\n')}`);
}

(async () => {
  console.log('new-game-confirm e2e tests');
  await testNoExistingSaveStartsImmediately();
  await testExistingSaveShowsConfirmDialog();
  await testCancelPreservesExistingSave();
  await testConfirmOverwritesExistingSave();
  summary('new-game-confirm.test.js');
})();
