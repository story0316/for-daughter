// endings.js(엔딩 판정 로직) 유닛 테스트. ENDINGS 배열은 위에서부터 순서대로
// 검사해 첫 조건을 만족하는 엔딩을 반환하므로, 각 엔딩의 조건뿐 아니라
// "더 앞선 엔딩 조건도 함께 만족할 때 앞선 쪽이 이긴다"는 우선순위도 확인한다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

const E = require(path.join(__dirname, '..', '..', 'endings.js'));

console.log('endings.js unit tests');

const BASE_STATS = { intelligence: 10, focus: 10, stamina: 10, charm: 10, creativity: 10, stress: 10, luck: 10 };
const NPC_IDS = ['friend', 'rival', 'teacher', 'noble', 'prince', 'sage'];

function npcs(overrides) {
  return NPC_IDS.map((id) => ({ id, affection: overrides[id] || 0 }));
}

function stats(overrides) {
  return Object.assign({}, BASE_STATS, overrides);
}

// 최소 스탯/애정도에서는 "평범하지만 행복한 나날"(항상 true)로 떨어져야 한다
eq(E.computeEnding(stats({}), npcs({})).id, 'ordinary-happy', '아무 조건도 안 맞으면 기본 엔딩');

// 각 엔딩의 requirement를 정확히 충족시켰을 때 해당 엔딩이 나오는지 확인
const CASES = [
  { id: 'became-a-princess', stats: stats({ charm: 60, creativity: 40, intelligence: 40 }), npcs: npcs({ prince: 80 }) },
  { id: 'best-friend-forever', stats: stats({}), npcs: npcs({ friend: 80 }) },
  { id: 'rival-partnership', stats: stats({ intelligence: 55 }), npcs: npcs({ rival: 80 }) },
  { id: 'teachers-successor', stats: stats({ intelligence: 50 }), npcs: npcs({ teacher: 80 }) },
  { id: 'fields-medalist', stats: stats({ intelligence: 90, creativity: 70 }), npcs: npcs({}) },
  { id: 'ai-engineer', stats: stats({ intelligence: 80, creativity: 70, focus: 55 }), npcs: npcs({}) },
  { id: 'olympiad', stats: stats({ intelligence: 85, luck: 55 }), npcs: npcs({}) },
  { id: 'data-scientist', stats: stats({ intelligence: 75, stress: 45 }), npcs: npcs({}) },
  { id: 'programmer', stats: stats({ intelligence: 65, focus: 60 }), npcs: npcs({}) },
  { id: 'math-youtuber', stats: stats({ intelligence: 55, charm: 70 }), npcs: npcs({}) },
  { id: 'math-teacher', stats: stats({ intelligence: 50, charm: 50 }), npcs: npcs({}) },
  { id: 'novelist', stats: stats({ creativity: 80 }), npcs: npcs({}) },
  { id: 'startup-ceo', stats: stats({ charm: 70, luck: 60 }), npcs: npcs({}) },
  { id: 'athlete', stats: stats({ stamina: 80, charm: 55 }), npcs: npcs({}) },
  { id: 'traveler', stats: stats({ luck: 80 }), npcs: npcs({}) },
  { id: 'burned-out', stats: stats({ stress: 80 }), npcs: npcs({}) },
];

CASES.forEach((c) => {
  const result = E.computeEnding(c.stats, c.npcs);
  eq(result.id, c.id, `${c.id} 조건을 정확히 충족하면 해당 엔딩이 나와야 함`);
});

// 우선순위: became-a-princess 조건(prince>=80, grace>=45)과 best-friend-forever
// 조건(friend>=80)을 동시에 만족하면 목록 앞쪽인 became-a-princess가 이겨야 한다
{
  const s = stats({ charm: 60, creativity: 40, intelligence: 40 });
  const n = npcs({ prince: 80, friend: 80 });
  eq(E.computeEnding(s, n).id, 'became-a-princess', '두 엔딩 조건이 겹치면 ENDINGS 배열 앞쪽이 우선해야 함');
}

// 스탯이 0~100 범위를 벗어나도(음수/초과) clampStats로 안전하게 처리되는지
{
  const s = stats({ stress: 150 });
  const n = npcs({});
  ok(E.computeEnding(s, n).id === 'burned-out', '범위를 벗어난 스탯도 clamp 후 정상 판정되어야 함(stress>100 -> burned-out)');
  const clamped = E.clampStats({ intelligence: -5, stress: 200 });
  eq(clamped.intelligence, 0, 'clampStats는 음수를 0으로');
  eq(clamped.stress, 100, 'clampStats는 100 초과를 100으로');
}

// ENDINGS 목록에 중복 id가 없는지(콘텐츠 실수 방지)
{
  const ids = E.ENDINGS.map((e) => e.id);
  const unique = new Set(ids);
  eq(unique.size, ids.length, 'ENDINGS에 중복된 id가 없어야 함');
}

summary('endings.js');
