// e2e 테스트에서 공용으로 쓰는 Playwright 헬퍼. 실제 브라우저를 띄워
// index.html을 조작하므로, script.js의 UI 연결(이벤트 리스너, 화면 전환)까지
// 통째로 검증할 수 있다. run-e2e.sh가 정적 서버(BASE_URL)를 먼저 띄워둔다.
const { chromium } = require('playwright');

const BASE_URL = process.env.MATH_PRINCESS_TEST_URL || 'http://localhost:8138';
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';

async function withPage(fn, viewport) {
  const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
  const page = await browser.newPage({ viewport: viewport || { width: 390, height: 780 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack || ''}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`); });
  try {
    await fn(page, errors);
  } catch (e) {
    // 여기서 던진 예외(대개 Playwright의 waitForSelector 타임아웃)를 그냥
    // 죽게 두면 프로세스가 통째로 죽어서 이 파일의 다른 테스트 함수들이
    // 아예 실행되지 못한다. 실패로 기록만 하고 계속 진행할 수 있게 한다.
    errors.push(`${e.message}\n${e.stack || ''}`);
  } finally {
    await browser.close();
  }
  return errors;
}

// localStorage에 저장 데이터를 미리 심어두고 이어하기로 바로 원하는 상태에서 시작한다.
async function seedAndContinue(page, state, query) {
  await page.goto(`${BASE_URL}/math-princess/index.html${query || '?turns=48'}`);
  await page.evaluate((s) => localStorage.setItem('math-princess-save-v1', JSON.stringify(s)), state);
  await page.reload();
  await page.click('#btn-continue');
  await page.waitForSelector('#screen-main.active');
}

function makeState(overrides) {
  const base = {
    turn: 1, gold: 500, characterName: '테스트',
    stats: { intelligence: 20, focus: 20, stamina: 50, charm: 20, creativity: 20, stress: 10, luck: 20 },
    totalCorrect: 0, combo: 0, bestCombo: 0, items: {},
    npcs: ['friend', 'rival', 'teacher', 'noble', 'prince', 'sage'].map((id) => ({ id, affection: 15, lastMetTurn: 0 })),
    wardrobe: { equipped: 0, owned: [true, false, false, false, false, false], notifiedGraceTier: 0 },
    weekPlan: [null, null, null, null], weekIndex: 0, talkedThisTurn: false, completedScenarios: [],
  };
  return Object.assign(base, overrides);
}

// 문제 화면에서 선택형/입력형 상관없이 아무 답이나 골라 넘긴다(정답 여부는
// 신경 쓰지 않는 흐름 테스트용 — 정답이 필요한 테스트는 별도로 answer map을 쓴다).
async function answerAnyQuizQuestion(page) {
  await page.waitForTimeout(150);
  const choiceBtn = await page.$('.choice-btn');
  if (choiceBtn) {
    await choiceBtn.click();
  } else {
    await page.click('.keypad-btn[data-key="1"]');
    await page.click('#btn-quiz-submit');
  }
  await page.waitForTimeout(1300);
}

// 화면이 quiz에서 벗어날 때까지(세션의 모든 문제를 다 풀 때까지) 계속 답한다.
async function drainQuizSession(page, maxQuestions) {
  for (let i = 0; i < (maxQuestions || 6); i++) {
    const stillQuiz = await page.evaluate(() => document.querySelector('.screen.active').id === 'screen-quiz');
    if (!stillQuiz) break;
    await answerAnyQuizQuestion(page);
  }
}

async function getSavedState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('math-princess-save-v1')));
}

async function activeScreenId(page) {
  return page.evaluate(() => document.querySelector('.screen.active')?.id);
}

// #screen-schedule이 열려 있는 상태에서 weekIdx번째 칸에 activityId를 배정한다.
// 공부/알바/경시대회처럼 문제 수를 고를 수 있는 활동은 count-pick 슬라이더
// 화면까지 거쳐 count(생략 시 기본값)를 확정하고 다시 #screen-schedule로 돌아온다.
const COUNTABLE_ACTIVITIES = ['study', 'job', 'competition'];

async function planWeekActivity(page, weekIdx, activityId, count) {
  const cards = await page.$$('#week-plan-list .level-card');
  await cards[weekIdx].click();
  await page.waitForSelector('#screen-week-pick.active');
  await page.click(`[data-activity="${activityId}"]`);
  if (COUNTABLE_ACTIVITIES.includes(activityId)) {
    await page.waitForSelector('#screen-question-count-pick.active');
    if (count != null) {
      await page.evaluate((n) => {
        const slider = document.querySelector('#count-pick-slider');
        slider.value = String(n);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }, count);
    }
    await page.click('#btn-count-pick-confirm');
  }
  await page.waitForSelector('#screen-schedule.active');
}

module.exports = {
  BASE_URL, withPage, seedAndContinue, makeState, answerAnyQuizQuestion, drainQuizSession, getSavedState, activeScreenId,
  planWeekActivity,
};
