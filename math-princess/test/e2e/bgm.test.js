// 배경음악: 메인 화면=기본 트랙, 매핑된 시나리오 진입 시 전용 트랙으로 전환,
// 시나리오 종료 후 메인 복귀 시 기본 트랙 복귀, 음소거 토글/영속성 검증.
const { ok, eq, summary } = require('../helpers/assert');
const { withPage, seedAndContinue, makeState, BASE_URL } = require('./helpers');

async function testDefaultTrackAndMute() {
  const errors = await withPage(async (page) => {
    await page.evaluate(() => localStorage.removeItem('math-princess-muted')).catch(() => {});
    await seedAndContinue(page, makeState({}));
    await page.waitForTimeout(300);
    const initial = await page.evaluate(() => {
      const a = document.getElementById('bgm-player');
      return { src: a.src.split('/').pop(), paused: a.paused, muted: a.muted };
    });
    eq(initial.src, 'bgm-default.mp3', '이어하기(사용자 클릭) 직후 기본 배경음악이 재생되어야 함');
    ok(!initial.paused, '배경음악이 실제로 재생 중이어야 함');
    ok(!initial.muted, '초기 상태는 음소거가 아니어야 함');

    await page.click('#btn-mute-toggle');
    await page.waitForTimeout(100);
    const afterMute = await page.evaluate(() => ({
      muted: document.getElementById('bgm-player').muted,
      icon: document.getElementById('btn-mute-toggle').textContent,
    }));
    ok(afterMute.muted, '음소거 버튼을 누르면 audio.muted가 true여야 함');
    eq(afterMute.icon, '🔇', '음소거 상태에서는 아이콘이 🔇여야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(기본 트랙/음소거): ${errors.join('\n')}`);
}

async function testMutePersistsAcrossReload() {
  const errors = await withPage(async (page) => {
    await page.goto(`${BASE_URL}/math-princess/index.html?turns=48`);
    await page.evaluate(() => localStorage.removeItem('math-princess-muted'));
    await page.reload();
    await page.click('#btn-mute-toggle');
    await page.reload();
    const muted = await page.evaluate(() => document.getElementById('bgm-player').muted);
    const icon = await page.textContent('#btn-mute-toggle');
    ok(muted, '음소거 설정은 새로고침 후에도 유지되어야 함');
    eq(icon.trim(), '🔇', '새로고침 후에도 아이콘이 음소거 상태를 반영해야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(영속성): ${errors.join('\n')}`);
}

async function testScenarioTrackSwitchAndRevert() {
  const errors = await withPage(async (page) => {
    const state = makeState({
      turn: 47, gold: 5000,
      stats: { intelligence: 100, focus: 90, stamina: 80, charm: 100, creativity: 100, stress: 5, luck: 80 },
      npcs: ['friend', 'rival', 'teacher', 'noble', 'prince', 'sage'].map((id) => ({ id, affection: 90, lastMetTurn: 46 })),
      wardrobe: { equipped: 5, owned: [true, true, true, true, true, true], notifiedGraceTier: 5 },
      weekPlan: ['friend', null, null, null],
      completedScenarios: ['prince-and-stray-dog', 'grand-ball-debut', 'garden-walk-prince'],
    });
    await seedAndContinue(page, state);
    await page.click('[data-menu="execute"]');
    await page.waitForSelector('#screen-npc-select.active');
    const cards = await page.$$('.npc-card');
    for (const c of cards) {
      const t = await c.textContent();
      if (t.includes('왕자')) { await c.click(); break; }
    }
    await page.waitForSelector('#screen-event.active', { timeout: 12000 });
    await page.waitForTimeout(300);
    const during = await page.evaluate(() => document.getElementById('bgm-player').src.split('/').pop());
    eq(during, 'bgm-coronation.mp3', '대관식 무도회 시나리오 진입 시 전용 트랙으로 전환되어야 함');

    await page.click('#btn-event-confirm');
    await page.waitForSelector('#screen-main.active', { timeout: 12000 });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.getElementById('bgm-player').src.split('/').pop());
    eq(after, 'bgm-default.mp3', '시나리오 종료 후 메인 복귀 시 기본 트랙으로 되돌아가야 함');
  });
  ok(errors.length === 0, `JS 에러 없어야 함(트랙 전환): ${errors.join('\n')}`);
}

(async () => {
  console.log('bgm e2e tests');
  await testDefaultTrackAndMute();
  await testMutePersistsAcrossReload();
  await testScenarioTrackSwitchAndRevert();
  summary('bgm.test.js');
})();
