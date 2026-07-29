// 관리자 페이지(admin.html): PIN 로그인 게이트와, 콘텐츠 ↔ 역량 모델 매핑을
// 보여주는 대시보드가 실제로 올바른 데이터를 렌더링하는지 검증한다.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, BASE_URL } = require('./helpers');

async function gotoAdmin(page) {
  await page.goto(`${BASE_URL}/math-princess/admin.html`);
  await page.waitForSelector('#screen-pin.active');
}

async function enterPin(page, pin) {
  for (const ch of pin) {
    await page.click(`.pin-key[data-key="${ch}"]`);
  }
}

async function testWrongPinIsRejected() {
  const errors = await withPage(async (page) => {
    await gotoAdmin(page);
    await enterPin(page, '111111');
    await page.waitForTimeout(200);
    eq(await page.evaluate(() => document.querySelector('.admin-screen.active').id), 'screen-pin', '틀린 PIN이면 대시보드로 넘어가면 안 됨');
    ok((await page.textContent('#pin-error')).includes('올바르지 않아요'), '틀린 PIN이면 오류 문구가 떠야 함');
    eq(await page.evaluate(() => document.querySelectorAll('#pin-dots .pin-dot.filled').length), 0, '틀린 PIN 시도 후에는 입력이 초기화되어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(오답 PIN): ${errors.join('\n')}`);
}

async function testCorrectPinUnlocksDashboardAndPersistsAcrossReload() {
  const errors = await withPage(async (page) => {
    await gotoAdmin(page);
    await enterPin(page, '000001');
    await page.waitForSelector('#screen-dashboard.active');

    // 새로고침해도(같은 탭 세션이 남아있는 동안) 다시 PIN을 묻지 않아야 한다.
    await page.reload();
    await page.waitForTimeout(200);
    eq(await page.evaluate(() => document.querySelector('.admin-screen.active').id), 'screen-dashboard', 'PIN을 한 번 맞히면 새로고침해도 대시보드가 유지되어야 함(세션 유지)');

    await page.click('#btn-lock');
    await page.waitForSelector('#screen-pin.active');
    await page.reload();
    await page.waitForTimeout(200);
    eq(await page.evaluate(() => document.querySelector('.admin-screen.active').id), 'screen-pin', '잠그기 이후에는 새로고침해도 다시 PIN 화면이어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(정답 PIN/세션): ${errors.join('\n')}`);
}

async function testDashboardShowsExpectedCounts() {
  const errors = await withPage(async (page) => {
    await gotoAdmin(page);
    await enterPin(page, '000001');
    await page.waitForSelector('#screen-dashboard.active');

    const cardValues = await page.$$eval('.overview-card-value', (els) => els.map((e) => e.textContent.trim()));
    ok(cardValues.some((v) => v === '20개'), `개요 카드에 연회 예절 문제 수(20개)가 있어야 함 (got ${JSON.stringify(cardValues)})`);
    ok(cardValues.some((v) => v === '14편'), `개요 카드에 시나리오 수(14편)가 있어야 함 (got ${JSON.stringify(cardValues)})`);
    ok(cardValues.some((v) => v === '6개'), `개요 카드에 핵심역량 축 수(6개)가 있어야 함 (got ${JSON.stringify(cardValues)})`);

    const etiquetteCount = await page.locator('#etiquette-list .admin-card').count();
    eq(etiquetteCount, 20, '연회 예절 문제 카드가 20개 렌더링되어야 함');

    const scenarioCount = await page.locator('#scenario-list .admin-card').count();
    eq(scenarioCount, 14, '시나리오 카드가 14개 렌더링되어야 함');

    const matrixRows = await page.locator('#coverage-matrix tr').count();
    ok(matrixRows > 40, `역량 커버리지 매트릭스에는 지식/활동/상황판단/시나리오/인증을 모두 합친 행이 있어야 함 (got ${matrixRows})`);

    // 디자인 노트에 실제 참고문헌 링크(연구 근거)가 포함되어 있어야 한다.
    const notesHtml = await page.innerHTML('#design-notes');
    ok(notesHtml.includes('oecd.org'), '설계 노트에 OECD 참고 링크가 있어야 함');
    ok(notesHtml.includes('sagepub.com') || notesHtml.includes('journals.sagepub'), '설계 노트에 학술 논문 참고 링크가 있어야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(대시보드 데이터): ${errors.join('\n')}`);
}

async function testEtiquetteFilterNarrowsList() {
  const errors = await withPage(async (page) => {
    await gotoAdmin(page);
    await enterPin(page, '000001');
    await page.waitForSelector('#screen-dashboard.active');

    const totalBefore = await page.locator('#etiquette-list .admin-card').count();
    await page.click('#etiquette-filter [data-cat="디지털시민의식"]');
    await page.waitForTimeout(100);
    const filteredCount = await page.locator('#etiquette-list .admin-card').count();
    eq(filteredCount, 2, '디지털시민의식 카테고리로 필터링하면 해당 문제만(2개) 보여야 함');
    ok(filteredCount < totalBefore, '필터링하면 전체보다 적은 카드가 보여야 함');

    await page.click('#etiquette-filter [data-cat=""]');
    await page.waitForTimeout(100);
    const backToAll = await page.locator('#etiquette-list .admin-card').count();
    eq(backToAll, totalBefore, '전체 필터를 다시 누르면 처음 개수로 돌아와야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(예절 필터): ${errors.join('\n')}`);
}

async function testSubjectAndCertSectionsReflectRealBankSizes() {
  const errors = await withPage(async (page) => {
    await gotoAdmin(page);
    await enterPin(page, '000001');
    await page.waitForSelector('#screen-dashboard.active');

    const subjectCards = await page.$$eval('#subject-list .admin-card-title', (els) => els.map((e) => e.textContent));
    ok(subjectCards.some((t) => t.includes('수학') && t.includes('9단계')), `수학 카드에 9단계가 표시되어야 함 (got ${JSON.stringify(subjectCards)})`);
    ok(subjectCards.some((t) => t.includes('영어') && t.includes('총 72문제')), `영어 카드에 총 문제 수(72)가 표시되어야 함 (got ${JSON.stringify(subjectCards)})`);
    ok(subjectCards.some((t) => t.includes('과학') && t.includes('총 63문제')), `과학 카드에 총 문제 수(63)가 표시되어야 함 (got ${JSON.stringify(subjectCards)})`);

    const certCards = await page.$$eval('#cert-list .admin-card-title', (els) => els.map((e) => e.textContent));
    eq(certCards.length, 3, '기초 과목 인증은 동/은/금메달 3단계여야 함');
    ok(certCards.some((t) => t.includes('동메달')) && certCards.some((t) => t.includes('은메달')) && certCards.some((t) => t.includes('금메달')), `인증 카드 목록에 동/은/금메달이 모두 있어야 함 (got ${JSON.stringify(certCards)})`);
  });
  ok(errors.length === 0, `JS 에러 없어야 함(과목/인증 섹션): ${errors.join('\n')}`);
}

(async () => {
  console.log('admin e2e tests');
  await testWrongPinIsRejected();
  await testCorrectPinUnlocksDashboardAndPersistsAcrossReload();
  await testDashboardShowsExpectedCounts();
  await testEtiquetteFilterNarrowsList();
  await testSubjectAndCertSectionsReflectRealBankSizes();
  summary('admin.test.js');
})();
