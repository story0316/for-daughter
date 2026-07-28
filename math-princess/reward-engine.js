/*
 * 보상 엔진 (순수 로직, DOM 의존 없음)
 *
 * "정답/오답에 얼마나 줄지"만 담당한다 — 골드/스탯 증감 공식, 콤보 배율,
 * 장비(ITEMS) 보너스 적용, 인물 호감도 증가량. 어떤 문제를 낼지는 다루지
 * 않는다(그건 question-engine.js의 역할). 밸런스 수치(배율, 증감량)를
 * 조정할 때는 이 파일만 보면 된다.
 *
 * game-engine.js가 ITEMS를 주입해서 createRewardEngine({ ITEMS })로 만들어 쓴다.
 */
(function (root) {
  'use strict';

  function createRewardEngine(deps) {
    const ITEMS = deps.ITEMS;

    // 세션 도중에는 콤보만 쌓고, 정답/오답 보상은 세션이 끝날 때 한 번에
    // 반영하는 유형(보너스 미니게임들). 연회/공부/알바처럼 문제마다 바로
    // 보상을 주는 유형과 구분하기 위한 목록이다.
    const DEFERRED_REWARD_TYPES = ['scenario-quiz', 'exercise-bonus', 'rest-bonus', 'laundry-bonus', 'garden-bonus', 'cert-exam'];

    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    function itemBonusSum(items, key) {
      return ITEMS.filter((i) => items[i.id]).reduce((sum, i) => sum + (i[key] || 0), 0);
    }

    function comboMultiplier(combo) {
      if (combo >= 20) return 3.0;
      if (combo >= 10) return 2.2;
      if (combo >= 5) return 1.6;
      if (combo >= 2) return 1.2;
      return 1.0;
    }

    // 정답 하나에 대한 스탯/골드 증가량을 계산한다. { gold, intelligence, ... }
    // 형태로 "바뀔 값만" 돌려주므로, 호출부는 이 키들만 state에 더하면 된다.
    // 보상이 세션 종료 시 한 번에 반영되는 유형(DEFERRED_REWARD_TYPES)은 {}.
    // lengthMultiplier는 공부/알바/경시대회에서 도전자가 고른 문제 수에 따라
    // game-engine.js가 계산해 넘겨주는 배율이다(문제 수가 많을수록 1을 넘어
    // 최대 1.5배까지 커짐, 생략하면 1). 골드 보상에만 적용해 "길게 도전할수록
    // 이득"이라는 트레이드오프를 주고, 정답률에 따라 자연히 늘어나는 스탯
    // 성장량 자체는 배율로 부풀리지 않는다.
    function correctAnswerReward(sessionType, problem, combo, items, lengthMultiplier) {
      const lm = lengthMultiplier || 1;
      if (sessionType === 'banquet') {
        return { charm: 4 + itemBonusSum(items, 'charmBonus') };
      }
      if (sessionType === 'competition') {
        const base = competitionQuestionReward(problem.level);
        return { gold: Math.round(base.gold * lm), intelligence: base.intelligence };
      }
      if (DEFERRED_REWARD_TYPES.includes(sessionType)) {
        return {};
      }
      const multiplier = comboMultiplier(combo) + itemBonusSum(items, 'comboBonus');
      const jobBonus = sessionType === 'job' ? 1.5 : 1;
      const goldMultiplier = (1 + itemBonusSum(items, 'goldBonus')) * lm;
      const gold = Math.round(problem.rewardGold * multiplier * jobBonus * goldMultiplier);
      if (sessionType === 'study') {
        return { gold, intelligence: problem.level + itemBonusSum(items, 'intBonus'), creativity: problem.level * 0.2 };
      }
      return { gold, stamina: -2 };
    }

    // 오답 하나에 대한 스탯 페널티. 형태는 correctAnswerReward와 동일.
    function wrongAnswerPenalty(sessionType) {
      if (sessionType === 'banquet') return { stress: 2 };
      if (sessionType === 'competition') return { stress: 3 };
      if (DEFERRED_REWARD_TYPES.includes(sessionType)) return {};
      if (sessionType === 'study') return { stress: 6, stamina: -4 };
      return { stamina: -3 };
    }

    // 보너스 미니게임(운동/휴식/빨래/텃밭) 종료 시 반영할 변화량.
    // bonus=true면 문제까지 맞혀서 추가 효과가 붙는다.
    function exerciseBonusReward(bonus) {
      const d = { stamina: 8, focus: 4, stress: 3 };
      if (bonus) { d.focus += 3; d.stamina += 2; }
      return d;
    }

    function restBonusReward(bonus, items) {
      const rm = 1 + itemBonusSum(items, 'restBonus');
      const d = { stress: -12 * rm, stamina: 10 * rm };
      if (bonus) { d.stress -= 5; d.stamina += 3; }
      return d;
    }

    // 직접 빨래하면 골드는 들이지 않지만 몸이 힘들다(체력/스트레스 비용).
    // 하녀를 고용해 이 수고를 자동화하면 골드가 들지만 그만큼 아낀 시간을
    // 공부·알바에 써서 오히려 더 많은 골드를 벌 수도 있다는 트레이드오프를
    // 주기 위해, 자기 부담 빨래는 순수 이득이 아니라 진짜 "비용"이 되도록 했다.
    function laundryBonusReward(bonus) {
      const d = { stress: 5, stamina: -3, gold: 10 };
      if (bonus) { d.stress -= 3; d.gold += 5; }
      return d;
    }

    // 텃밭을 가꾸다 보면 가끔 네잎클로버를 발견한다 — 다른 스탯과 달리
    // 행운(luck)을 꾸준히 키울 수 있는 유일한 활동이라, 행운이 필요한
    // 엔딩(올림피아드/스타트업 CEO/여행가)을 노리는 플레이어의 주력 활동이 된다.
    function gardenBonusReward(bonus) {
      const d = { stamina: -4, gold: 25, luck: 1 };
      if (bonus) { d.gold += 15; d.luck += 1; }
      return d;
    }

    // 왕국 수학경시대회: 문제마다 난이도(레벨)가 덧셈뺄셈(레벨 1)부터 점점
    // 올라가므로, 정답 하나의 상금도 그 문제의 레벨에 비례해 커진다(일반
    // 알바보다 훨씬 큰 목돈을 벌 수 있지만, 전체 경제를 무너뜨리지 않도록
    // 알바 대비 3~5배 수준으로만 크게 잡았다).
    function competitionQuestionReward(level) {
      return { gold: 10 + level * 3, intelligence: 1.5 };
    }

    // 문제를 전부 맞히면(만점) 붙는 보너스. 가장 어려웠던 마지막 문제의
    // 레벨에 비례해 커지고, lengthMultiplier(도전자가 고른 문제 수에 따른
    // 배율)도 함께 적용된다.
    function competitionPerfectBonus(topLevel, lengthMultiplier) {
      const lm = lengthMultiplier || 1;
      return { gold: Math.round((20 + topLevel * 4) * lm) };
    }

    // 기초 과목 등급 인증 시험을 통과했을 때 주는 축하금. 등급이 높을수록
    // (동=0, 은=1, 금=2) 더 큰 목돈을 준다 - 매주 반복하는 활동이 아니라
    // 한 번뿐인 성취라서 그만큼 화끈하게 보상한다.
    function certExamReward(tierIndex) {
      return { gold: 80 + tierIndex * 70 };
    }

    // 인물 호감도 증가량. rangeOrValue는 [최소,최대] 배열이거나 고정값.
    // 왕실 초대장(ITEMS의 affectionBonus) 보너스가 항상 함께 적용된다.
    function affectionGain(rangeOrValue, items) {
      const gain = Array.isArray(rangeOrValue) ? randInt(rangeOrValue[0], rangeOrValue[1]) : rangeOrValue;
      return gain + itemBonusSum(items, 'affectionBonus');
    }

    return {
      DEFERRED_REWARD_TYPES,
      itemBonusSum, comboMultiplier,
      correctAnswerReward, wrongAnswerPenalty,
      exerciseBonusReward, restBonusReward, laundryBonusReward, gardenBonusReward,
      competitionQuestionReward, competitionPerfectBonus, certExamReward, affectionGain,
    };
  }

  const api = { createRewardEngine };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessRewardEngine = api;
  }
})(typeof window !== 'undefined' ? window : null);
