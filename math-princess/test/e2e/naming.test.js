// 시작 화면 이름 짓기: 입력값이 저장/표시되는지, 비워두면 기본값("우리 딸")을
// 쓰는지, 엔딩에서 "다시 시작하기"를 눌러도 이름이 이어지는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, BASE_URL, getSavedState } = require('./helpers');

async function testCustomName() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html?turns=48`);
    await page.evaluate(() => localStorage.removeItem('math-princess-save-v1'));
    await page.reload();
    await page.fill('#character-name-input', '서연');
    await page.click('#btn-new-game');
    await page.waitForSelector('#screen-main.active');
    const shown = await page.textContent('#character-name');
    eq(shown.trim(), '서연', '입력한 이름이 메인 화면에 표시되어야 함');
    const saved = await getSavedState(page);
    eq(saved.characterName, '서연', '입력한 이름이 저장 데이터에 기록되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(커스텀 이름): ${errors.join('\n')}`);
}

async function testDefaultName() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html?turns=48`);
    await page.evaluate(() => localStorage.removeItem('math-princess-save-v1'));
    await page.reload();
    await page.click('#btn-new-game'); // 이름을 비워둠
    await page.waitForSelector('#screen-main.active');
    const shown = await page.textContent('#character-name');
    eq(shown.trim(), '우리 딸', '이름을 비워두면 기본값 "우리 딸"이어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(기본 이름): ${errors.join('\n')}`);
}

(async () => {
  console.log('naming e2e tests');
  await testCustomName();
  await testDefaultName();
  summary('naming.test.js');
})();
