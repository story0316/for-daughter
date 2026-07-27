/*
 * 엔딩 판정 로직 (순수 로직, DOM 의존 없음)
 * 최종 스탯을 기준으로 위에서부터 순서대로 검사해 처음 조건을 만족하는
 * 엔딩을 반환한다. 목록 뒤에 새 엔딩을 추가하면 쉽게 확장할 수 있다.
 */
(function (root) {
  'use strict';

  function affectionOf(npcs, id) {
    const npc = (npcs || []).find((n) => n.id === id);
    return npc ? npc.affection : 0;
  }

  function graceScore(stats) {
    return stats.charm * 0.4 + stats.creativity * 0.3 + stats.intelligence * 0.3;
  }

  const ENDINGS = [
    {
      id: 'became-a-princess',
      emoji: '👸',
      title: '진짜 공주가 되다',
      desc: '평범한 옷을 입던 아이는 꾸준히 공부하고 교양을 쌓아, 마침내 왕자님의 마음을 얻고 성 안의 진짜 공주가 되었다.',
      requirement: (s, npcs) => affectionOf(npcs, 'prince') >= 80 && graceScore(s) >= 45,
    },
    {
      id: 'best-friend-forever',
      emoji: '👭',
      title: '평생 단짝',
      desc: '어떤 진로보다 먼저, 무슨 일이 있어도 곁을 지켜주는 둘도 없는 단짝을 얻었다.',
      requirement: (s, npcs) => affectionOf(npcs, 'friend') >= 80,
    },
    {
      id: 'rival-partnership',
      emoji: '🤝',
      title: '라이벌에서 파트너로',
      desc: '서로를 이기려고 애쓰던 두 사람은, 어느새 서로를 가장 잘 이해하는 동업자가 되어 함께 회사를 차렸다.',
      requirement: (s, npcs) => affectionOf(npcs, 'rival') >= 80 && s.intelligence >= 55,
    },
    {
      id: 'teachers-successor',
      emoji: '🍎',
      title: '은사님의 뒤를 이어',
      desc: '가장 존경했던 선생님처럼, 이제는 자신이 후배들의 길잡이가 되어주는 선생님이 되었다.',
      requirement: (s, npcs) => affectionOf(npcs, 'teacher') >= 80 && s.intelligence >= 50,
    },
    {
      id: 'fields-medalist',
      emoji: '🏅',
      title: '세계적인 천재 학자',
      desc: '어려운 문제일수록 눈을 반짝이던 아이는, 결국 아무도 풀지 못한 문제를 푸는 사람이 되었다.',
      requirement: (s) => s.intelligence >= 90 && s.creativity >= 70,
    },
    {
      id: 'ai-engineer',
      emoji: '🤖',
      title: 'AI 개발자',
      desc: '논리와 상상력을 함께 갈고닦은 끝에, 세상을 바꾸는 인공지능을 만드는 사람이 되었다.',
      requirement: (s) => s.intelligence >= 80 && s.creativity >= 70 && s.focus >= 55,
    },
    {
      id: 'olympiad',
      emoji: '🥇',
      title: '올림피아드 금메달리스트',
      desc: '수많은 문제와 약간의 행운이 만나, 국제무대에서 금메달을 목에 걸었다.',
      requirement: (s) => s.intelligence >= 85 && s.luck >= 55,
    },
    {
      id: 'data-scientist',
      emoji: '📊',
      title: '데이터 사이언티스트',
      desc: '차분하게 숫자 속 패턴을 읽어내는 사람이 되어, 세상의 문제를 데이터로 풀어낸다.',
      requirement: (s) => s.intelligence >= 75 && s.stress <= 45,
    },
    {
      id: 'programmer',
      emoji: '💻',
      title: '프로그래머',
      desc: '논리적으로 생각하는 힘을 무기로, 코드로 무엇이든 만들어내는 사람이 되었다.',
      requirement: (s) => s.intelligence >= 65 && s.focus >= 60,
    },
    {
      id: 'math-youtuber',
      emoji: '🎥',
      title: '인기 지식 유튜버',
      desc: '어려운 개념도 재미있게 설명하는 매력으로, 많은 사람들의 든든한 선생님이 되었다.',
      requirement: (s) => s.intelligence >= 55 && s.charm >= 70,
    },
    {
      id: 'math-teacher',
      emoji: '🍎',
      title: '다정한 선생님',
      desc: '자신이 좋아했던 공부의 재미를, 이제는 다른 아이들에게 전해주는 선생님이 되었다.',
      requirement: (s) => s.intelligence >= 50 && s.charm >= 50,
    },
    {
      id: 'novelist',
      emoji: '📚',
      title: '베스트셀러 작가',
      desc: '숫자보다 이야기에 더 끌렸던 마음이 자라, 사람들의 마음을 움직이는 글을 쓴다.',
      requirement: (s) => s.creativity >= 80,
    },
    {
      id: 'startup-ceo',
      emoji: '🚀',
      title: '스타트업 CEO',
      desc: '사람을 끌어당기는 매력과 대담한 행운으로, 자신만의 회사를 세웠다.',
      requirement: (s) => s.charm >= 70 && s.luck >= 60,
    },
    {
      id: 'athlete',
      emoji: '🏃',
      title: '만능 스포츠 스타',
      desc: '책상 앞보다 운동장을 더 사랑했던 아이는, 튼튼한 몸으로 사람들을 응원하는 스타가 되었다.',
      requirement: (s) => s.stamina >= 80 && s.charm >= 55,
    },
    {
      id: 'traveler',
      emoji: '✈️',
      title: '자유로운 여행가',
      desc: '어디서든 운이 따라주는 사람이 되어, 세계 곳곳을 누비며 산다.',
      requirement: (s) => s.luck >= 80,
    },
    {
      id: 'burned-out',
      emoji: '😮‍💨',
      title: '지친 하루하루',
      desc: '너무 많은 것을 한꺼번에 하려다 지쳐버렸다. 이제는 천천히 쉬어가는 법을 배우는 중이다.',
      requirement: (s) => s.stress >= 80,
    },
    {
      id: 'ordinary-happy',
      emoji: '🌷',
      title: '평범하지만 행복한 나날',
      desc: '특별한 1등은 아니었지만, 자기 속도로 성실히 걸어와 소소하고 단단한 하루하루를 살아간다.',
      requirement: () => true,
    },
  ];

  function clampStats(stats) {
    const clamped = {};
    Object.keys(stats).forEach((k) => {
      clamped[k] = Math.max(0, Math.min(100, stats[k]));
    });
    return clamped;
  }

  function computeEnding(stats, npcs) {
    const s = clampStats(stats);
    for (const ending of ENDINGS) {
      if (ending.requirement(s, npcs || [])) return ending;
    }
    return ENDINGS[ENDINGS.length - 1];
  }

  const api = { ENDINGS, computeEnding, clampStats };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessEndings = api;
  }
})(typeof window !== 'undefined' ? window : null);
