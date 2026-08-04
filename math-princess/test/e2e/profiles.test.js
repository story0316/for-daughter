// 프로필(기기 내 계정) 기능의 e2e 테스트. 핵심 확인 사항:
// 1) 프로필을 한 번도 안 만든 사용자는 기존과 동일하게 시작 화면부터 바로 보임(회귀 방지)
// 2) 두 번째 프로필을 만들면, 그 이후 새 탭(=새 세션)에서는 "누가 할까요?" 화면부터 보임
// 3) 프로필마다 저장 데이터가 완전히 분리됨(이어하기, 진행 상태 모두 독립적)
// 4) PIN을 설정한 프로필은 틀린 PIN을 막고 맞는 PIN만 통과시킴
// 5) 프로필 삭제 시 그 프로필의 저장 데이터도 함께 지워짐, 마지막 하나는 삭제 버튼 자체가 없음
const { chromium } = require('playwright');
const { BASE_URL, pickCurriculumModeAndStart } = require('./helpers');
const { ok, eq, summary } = require('../helpers/assert');

const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';

async function withFreshContext(fn) {
  const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
  const context = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const errors = [];
  try {
    await fn(browser, context, errors);
  } catch (e) {
    errors.push(`${e.message}\n${e.stack || ''}`);
  } finally {
    await browser.close();
  }
  return errors;
}

console.log('profiles e2e tests');

async function testSingleProfileIsUnchanged() {
  const errors = await withFreshContext(async (browser, context) => {
    const page = await context.newPage();
    page.on('pageerror', (e) => { throw e; });
    await page.goto(`${BASE_URL}/math-princess/index.html`);
    await page.waitForSelector('#screen-start.active');
    const activeId = await page.evaluate(() => document.querySelector('.screen.active').id);
    eq(activeId, 'screen-start', '프로필을 한 번도 안 만들었으면 시작 화면부터 바로 보여야 함');
    const barDisplay = await page.evaluate(() => getComputedStyle(document.getElementById('btn-profile-bar')).display);
    ok(barDisplay !== 'none', '프로필 바는 항상 보여서 나중에 프로필을 추가할 수 있음을 알 수 있어야 함');
    const barName = await page.textContent('#profile-bar-name');
    eq(barName, '플레이어 1', '기본 프로필 이름은 플레이어 1');
  });
  errors.forEach((e) => ok(false, `[단일 프로필 회귀] JS 에러 없어야 함: ${e}`));
}

async function testCreateProfileAndSeparateSaves() {
  const errors = await withFreshContext(async (browser, context) => {
    const page = await context.newPage();
    page.on('pageerror', (e) => { throw e; });
    await page.goto(`${BASE_URL}/math-princess/index.html`);
    await page.waitForSelector('#screen-start.active');

    // 기본 프로필로 새 게임을 시작해 저장 데이터를 만들어둔다.
    await page.fill('#character-name-input', '기본이');
    await page.click('#btn-new-game');
    await pickCurriculumModeAndStart(page);
    await page.click('.home-link', { trial: true }).catch(() => {}); // no-op, just ensures main screen rendered

    // 프로필 관리로 가려면 일단 새로고침 후 시작 화면으로(진행 중 화면에는 프로필 바가 없음)
    await page.goto(`${BASE_URL}/math-princess/index.html`);
    await page.waitForSelector('#screen-start.active');
    await page.click('#btn-profile-bar');
    await page.waitForSelector('#screen-profiles.active');
    await page.click('#btn-profile-add');
    await page.waitForSelector('#screen-profile-new.active');
    await page.fill('#profile-name-input', '둘째');
    await page.click('#btn-profile-new-confirm');
    await page.waitForSelector('#screen-start.active');

    const activeName = await page.textContent('#profile-bar-name');
    eq(activeName, '둘째', '새 프로필을 만들면 바로 그 프로필이 활성화됨');

    const hasContinueForNewProfile = await page.evaluate(() => getComputedStyle(document.getElementById('btn-continue')).display);
    eq(hasContinueForNewProfile, 'none', '새로 만든 프로필은 아직 저장 데이터가 없어 이어하기 버튼이 없어야 함');

    await page.fill('#character-name-input', '둘째공주');
    await page.click('#btn-new-game');
    await pickCurriculumModeAndStart(page);

    const saveKeys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('math-princess-save-v1')));
    eq(saveKeys.length, 2, '두 프로필의 저장 데이터가 서로 다른 키에 각각 존재해야 함');

    const defaultSave = await page.evaluate(() => JSON.parse(localStorage.getItem('math-princess-save-v1')));
    eq(defaultSave.characterName, '기본이', '기본 프로필의 저장 데이터는 그대로 남아있어야 함(다른 프로필이 덮어쓰지 않음)');
  });
  errors.forEach((e) => ok(false, `[프로필별 저장 분리] JS 에러 없어야 함: ${e}`));
}

async function testPickerAppearsOnNewSessionWithMultipleProfiles() {
  const errors = await withFreshContext(async (browser, context) => {
    const page = await context.newPage();
    page.on('pageerror', (e) => { throw e; });
    await page.goto(`${BASE_URL}/math-princess/index.html`);
    await page.waitForSelector('#screen-start.active');
    await page.click('#btn-profile-bar');
    await page.waitForSelector('#screen-profiles.active');
    await page.click('#btn-profile-add');
    await page.waitForSelector('#screen-profile-new.active');
    await page.fill('#profile-name-input', '언니');
    await page.fill('#profile-pin-input', '5678');
    await page.click('#btn-profile-new-confirm');
    await page.waitForSelector('#screen-start.active');

    // 새 탭(=같은 기기의 새 세션)에서는 프로필이 2개이므로 선택 화면부터 보여야 한다.
    const page2 = await context.newPage();
    page2.on('pageerror', (e) => { throw e; });
    await page2.goto(`${BASE_URL}/math-princess/index.html`);
    await page2.waitForSelector('#screen-profiles.active');
    const cardCount = await page2.$$eval('.profile-card', (els) => els.length);
    eq(cardCount, 2, '프로필이 2개면 선택 화면에 카드 2개가 보여야 함');

    // PIN이 걸린 프로필: 틀린 PIN은 막고, 맞는 PIN은 통과.
    const cards = await page2.$$('.profile-card-select');
    await cards[1].click();
    await page2.waitForSelector('#screen-profile-pin.active');
    await page2.fill('#profile-pin-verify-input', '0000');
    await page2.click('#btn-profile-pin-confirm');
    await page2.waitForTimeout(100);
    const errorText = await page2.textContent('#profile-pin-error');
    ok(errorText.length > 0, '틀린 PIN을 입력하면 에러 메시지가 보여야 함');
    const stillOnPinScreen = await page2.evaluate(() => document.querySelector('.screen.active').id);
    eq(stillOnPinScreen, 'screen-profile-pin', '틀린 PIN으로는 화면이 넘어가지 않아야 함');

    await page2.fill('#profile-pin-verify-input', '5678');
    await page2.click('#btn-profile-pin-confirm');
    await page2.waitForSelector('#screen-start.active');
    const name = await page2.textContent('#profile-bar-name');
    eq(name, '언니', '맞는 PIN을 입력하면 그 프로필로 진입해야 함');
  });
  errors.forEach((e) => ok(false, `[여러 프로필 선택 화면] JS 에러 없어야 함: ${e}`));
}

async function testDeleteProfile() {
  const errors = await withFreshContext(async (browser, context) => {
    const page = await context.newPage();
    page.on('pageerror', (e) => { throw e; });
    await page.goto(`${BASE_URL}/math-princess/index.html`);
    await page.waitForSelector('#screen-start.active');
    await page.click('#btn-profile-bar');
    await page.waitForSelector('#screen-profiles.active');

    const noDeleteButtonYet = await page.$$('.profile-card-delete');
    eq(noDeleteButtonYet.length, 0, '프로필이 1개뿐일 때는 삭제 버튼이 없어야 함(마지막 프로필 삭제 방지)');

    await page.click('#btn-profile-add');
    await page.waitForSelector('#screen-profile-new.active');
    await page.fill('#profile-name-input', '지워질프로필');
    await page.click('#btn-profile-new-confirm');
    await page.waitForSelector('#screen-start.active');
    await page.click('#btn-new-game');
    await pickCurriculumModeAndStart(page);

    await page.goto(`${BASE_URL}/math-princess/index.html`);
    await page.waitForSelector('#screen-start.active');
    await page.click('#btn-profile-bar');
    await page.waitForSelector('#screen-profiles.active');

    const deleteButtons = await page.$$('.profile-card-delete');
    eq(deleteButtons.length, 2, '프로필이 2개가 되면 각 카드에 삭제 버튼이 보여야 함');
    const targetId = await page.$eval('.profile-card:has-text("지워질프로필") .profile-card-delete', (el) => el.dataset.id);
    await page.click(`.profile-card-delete[data-id="${targetId}"]`);
    await page.waitForSelector('.profile-card-confirm');
    await page.click(`.profile-card-delete-confirm[data-id="${targetId}"]`);
    await page.waitForTimeout(100);

    const remainingCards = await page.$$eval('.profile-card-name', (els) => els.map((e) => e.textContent));
    eq(remainingCards.length, 1, '삭제 후 프로필 1개만 남아야 함');
    ok(!remainingCards.includes('지워질프로필'), '삭제한 프로필은 목록에서 사라져야 함');

    const leftoverSaveKeys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('math-princess-save-v1::')));
    eq(leftoverSaveKeys.length, 0, '삭제된 프로필의 저장 데이터도 함께 지워져야 함');
  });
  errors.forEach((e) => ok(false, `[프로필 삭제] JS 에러 없어야 함: ${e}`));
}

(async () => {
  await testSingleProfileIsUnchanged();
  await testCreateProfileAndSeparateSaves();
  await testPickerAppearsOnNewSessionWithMultipleProfiles();
  await testDeleteProfile();
  summary('profiles.test.js');
})();
