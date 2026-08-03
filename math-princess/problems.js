/*
 * 문제 생성 엔진 (순수 로직, DOM 의존 없음)
 * Node에서도, 브라우저에서도 그대로 동작하도록 작성했다.
 */
(function (root) {
  'use strict';

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randChoice(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      [a, b] = [b, a % b];
    }
    return a || 1;
  }

  /** 기약분수 문자열("n/d" 또는 정수면 "n")을 만든다. */
  function fractionToString(num, den) {
    if (den < 0) {
      num = -num;
      den = -den;
    }
    const g = gcd(num, den);
    num /= g;
    den /= g;
    if (den === 1) return String(num);
    return `${num}/${den}`;
  }

  function parseFractionValue(str) {
    const s = String(str).trim();
    if (/^[+-]?\d+\/\d+$/.test(s)) {
      const [n, d] = s.split('/').map(Number);
      if (d === 0) return null;
      return n / d;
    }
    if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
      return Number(s);
    }
    return null;
  }

  /** 사용자가 입력한 답과 정답을 비교한다. */
  function checkAnswer(problem, rawInput) {
    const input = String(rawInput).trim();
    if (problem.type === 'choice') {
      return input === problem.answer;
    }
    const answerVal = parseFractionValue(problem.answer);
    const inputVal = parseFractionValue(input);
    if (answerVal === null || inputVal === null) return false;
    const tolerance = problem.tolerance || 0.01;
    return Math.abs(answerVal - inputVal) <= tolerance;
  }

  /* ---------------------------------------------------------------- */
  /* 레벨 정의                                                          */
  /* ---------------------------------------------------------------- */

  // concept: 초등학생 기준으로 중학교 이상 범위인 레벨(3~9)에만 있는,
  // 그 레벨의 핵심 개념을 짧고 친절하게 설명하는 문구. 특정 문제의 정답을
  // 알려주지 않는 "일반적인 개념" 설명이며, 문제를 낼 때마다 도움 캐릭터가
  // 말해주는 대사로 쓰인다(script.js의 nextQuizQuestion 참고).
  // curriculum: 2022 개정 교육과정 기준 실제 학년·학기·대단원 목차를 이
  // 레벨과 대응시킨 참고 정보(관리자 페이지 전용, 게임 로직에는 관여하지
  // 않음). 수학은 절차적으로 문제를 생성해 학년마다 정확히 문제은행을
  // 나누지는 않지만, 이 레벨이 대략 어떤 학년·단원 범위에 해당하는지
  // 밝혀두면 "지금 이 레벨이 실제 교과서 어디쯤인지" 가늠할 수 있다.
  const LEVELS = [
    { id: 1, name: '초등 연산', desc: '덧셈 · 뺄셈 · 곱셈 · 나눗셈', unlockIntelligence: 0,
      curriculum: { gradeRange: '초1~3', units: [
        '초1-1 9까지의 수·덧셈과 뺄셈', '초1-2 100까지의 수·덧셈과 뺄셈(1)(2)(3)',
        '초2-1 세 자리 수·덧셈과 뺄셈·곱셈', '초2-2 네 자리 수·곱셈구구',
        '초3-1 덧셈과 뺄셈·나눗셈·곱셈', '초3-2 곱셈·나눗셈',
      ] } },
    { id: 2, name: '분수와 소수', desc: '분수, 소수, 약수와 배수', unlockIntelligence: 8,
      curriculum: { gradeRange: '초3~6', units: [
        '초3-1 분수와 소수', '초3-2 분수', '초4-2 분수의 덧셈과 뺄셈·소수의 덧셈과 뺄셈',
        '초5-1 약수와 배수·약분과 통분·분수의 덧셈과 뺄셈', '초5-2 분수의 곱셈·소수의 곱셈',
        '초6-1 분수의 나눗셈·소수의 나눗셈', '초6-2 분수의 나눗셈·소수의 나눗셈',
      ] } },
    { id: 3, name: '방정식', desc: '일차방정식, 비례식', unlockIntelligence: 18, concept: '방정식은 모르는 수 x가 들어있는 식이야. 등호(=) 양쪽에 같은 수를 더하거나 빼거나 곱하거나 나누어도 식은 그대로 성립한다는 규칙을 이용해서, x만 남을 때까지 정리하면 답을 구할 수 있어. 비례식(A:B = C:D)은 안쪽 두 수를 곱한 값과 바깥쪽 두 수를 곱한 값이 서로 같다는 성질을 이용하면 돼.',
      curriculum: { gradeRange: '초6~중2', units: ['초6-2 비례식과 비례배분', '중1-1 문자와 식·일차방정식', '중2-1 연립일차방정식'] } },
    { id: 4, name: '함수와 좌표', desc: '일차함수, 좌표평면', unlockIntelligence: 28, concept: '좌표평면은 가로(x축)와 세로(y축) 두 줄로 위치를 나타내는 방법이야. 일차함수 y = ax + b는 x값을 정하면 그에 따라 y값이 하나로 정해지는 규칙이야. x자리에 주어진 수를 그대로 넣어서 계산하면 y를 구할 수 있어.',
      curriculum: { gradeRange: '초5~중3', units: ['초5-1 규칙과 대응', '중1-1 좌표평면과 그래프', '중2-1 일차함수와 그래프', '중3-1 이차함수와 그래프'] } },
    { id: 5, name: '도형', desc: '도형의 넓이, 피타고라스 정리', unlockIntelligence: 38, concept: '도형의 넓이는 도형마다 정해진 공식(예: 직사각형은 가로×세로)으로 구해. 피타고라스 정리는 직각삼각형에서, 직각을 낀 두 변을 각각 제곱해서 더한 값이 빗변을 제곱한 값과 같아진다는 성질이야.',
      curriculum: { gradeRange: '초2~중2', units: [
        '초2-1 여러 가지 도형', '초3-1 평면도형', '초3-2 원', '초4-1 각도·평면도형의 이동',
        '초4-2 삼각형·사각형·다각형', '초5-1 다각형의 둘레와 넓이', '초5-2 합동과 대칭·직육면체',
        '초6-1 각기둥과 각뿔·직육면체의 부피와 겉넓이', '초6-2 공간과 입체·원의 넓이·원기둥원뿔구',
        '중1-2 기본도형·평면도형의 성질·입체도형의 성질', '중2-2 도형의 성질·도형의 닮음·피타고라스 정리',
      ] } },
    { id: 6, name: '확률과 통계', desc: '확률, 평균', unlockIntelligence: 48, concept: '확률은 원하는 경우의 수를 전체 경우의 수로 나눈 값이야(전체 중에서 몇 분의 몇인지). 평균은 여러 수를 모두 더한 다음 그 개수로 나누면 구할 수 있어.',
      curriculum: { gradeRange: '초2~중3', units: [
        '초2-2 표와 그래프', '초4-1 막대그래프', '초4-2 꺾은선그래프', '초5-2 평균과 가능성',
        '초6-1 여러 가지 그래프', '중1-2 자료의 정리와 해석', '중2-2 확률', '중3-2 통계',
      ] } },
    { id: 7, name: '수열과 로그', desc: '등차수열, 등비수열, 로그', unlockIntelligence: 58, concept: '등차수열은 앞의 수에 항상 같은 수(공차)를 더해가며 만들어지는 수의 줄이야. 로그 log(밑) 값 은 "밑을 몇 번 곱해야 그 값이 되는지"를 나타내는 거야.',
      curriculum: { gradeRange: '고등학교', units: ['고등 대수: 지수와 로그', '고등 대수: 수열'] } },
    { id: 8, name: '삼각함수와 벡터', desc: '삼각비, 벡터', unlockIntelligence: 68, concept: '삼각비(sin, cos, tan)는 직각삼각형에서 각도에 따라 변들의 길이 비율이 항상 똑같다는 성질을 이용한 값이야. 자주 나오는 각도(30°, 45°, 60°)의 값은 표로 외워두면 편해. 벡터는 크기와 방향을 함께 가진 화살표 같은 개념이야.',
      curriculum: { gradeRange: '중3~고등학교', units: ['중3-2 삼각비', '고등 대수: 삼각함수', '고등 기하: 벡터'] } },
    { id: 9, name: '심화 문제', desc: '올림피아드 · 논리 문제', unlockIntelligence: 78, concept: '순열은 순서를 따져서 뽑는 경우의 수이고(첫 자리부터 하나씩 곱해서 구해), 조합은 순서를 따지지 않고 뽑는 경우의 수야(순열로 구한 값을, 뽑은 인원을 줄 세우는 경우의 수로 나누면 돼).',
      curriculum: { gradeRange: '전 학년 심화', units: ['공통수학1: 경우의 수(순열·조합 심화)', '올림피아드·사고력 유형(전 학년 대상)'] } },
  ];

  function isLevelUnlocked(levelId, intelligence) {
    const level = LEVELS.find((l) => l.id === levelId);
    if (!level) return false;
    return intelligence >= level.unlockIntelligence;
  }

  function baseRewardForLevel(levelId) {
    return { gold: 8 + levelId * 4, exp: 4 + levelId * 2 };
  }

  /* ---------------------------------------------------------------- */
  /* 레벨별 생성기 (플러그인 방식: GENERATORS[level] = [fn, fn, ...])       */
  /* ---------------------------------------------------------------- */

  const GENERATORS = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };

  function register(level, fn) {
    GENERATORS[level].push(fn);
  }

  function makeProblem(level, overrides) {
    const reward = baseRewardForLevel(level);
    return Object.assign(
      {
        id: `${level}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        level,
        type: 'input',
        tolerance: 0.01,
        rewardGold: reward.gold,
        rewardExp: reward.exp,
      },
      overrides
    );
  }

  const ARITHMETIC_HINTS = {
    '+': '예를 들어 23 + 15를 더할 땐 일의 자리(3+5=8)부터 더하고, 그 다음 십의 자리(2+1=3)를 더해서 38이 돼요. 지금 문제도 똑같이 일의 자리부터 차근차근 더해보세요!',
    '-': '예를 들어 42 - 17을 뺄 땐 일의 자리 2에서 7을 뺄 수 없으니 십의 자리에서 10을 빌려와 12-7=5, 남은 십의 자리끼리 3-1=2를 계산해서 25가 돼요. 지금 문제도 받아내림을 해보세요!',
    '*': '예를 들어 6 × 7을 구할 땐 구구단 7단을 떠올리거나, 6을 7번 더해보면(6+6+6+6+6+6+6) 42가 나와요. 지금 문제도 구구단을 떠올리며 풀어보세요!',
    '/': "예를 들어 24 ÷ 6을 구할 땐 '6에 얼마를 곱해야 24가 될까?'를 생각하면 돼요(6×4=24이니 답은 4). 지금 문제도 나누는 수에 곱셈을 해보며 답을 찾아보세요!",
  };
  // unit: 절차적으로 생성되는 수학 문제는 문제은행이 없어 curriculum.units
  // (학기 단위 참고 정보)와 1:1로 대응시킬 수 없다. 대신 각 생성기가 실제로
  // 다루는 연산/개념 이름을 unit으로 붙여, 어떤 유형이 얼마나 나오는지
  // 정도는 파악할 수 있게 한다(관리자 페이지 전용 메타데이터, 게임 로직에는
  // 관여하지 않음).
  // ---- Level 1: 사칙연산 ----
  register(1, () => {
    const op = randChoice(['+', '-', '*', '/']);
    const OP_UNIT = { '+': '덧셈', '-': '뺄셈', '*': '곱셈', '/': '나눗셈' };
    let a, b, answer, text;
    if (op === '+') {
      a = randInt(2, 99);
      b = randInt(2, 99);
      answer = a + b;
      text = `${a} + ${b} = ?`;
    } else if (op === '-') {
      a = randInt(10, 99);
      b = randInt(2, a);
      answer = a - b;
      text = `${a} - ${b} = ?`;
    } else if (op === '*') {
      a = randInt(2, 12);
      b = randInt(2, 12);
      answer = a * b;
      text = `${a} × ${b} = ?`;
    } else {
      b = randInt(2, 12);
      answer = randInt(2, 12);
      a = b * answer;
      text = `${a} ÷ ${b} = ?`;
    }
    return makeProblem(1, {
      question: text,
      unit: OP_UNIT[op],
      answer: String(answer),
      explanation: `${text.replace(' = ?', '')} = ${answer}`,
      hint: ARITHMETIC_HINTS[op],
    });
  });

  // ---- Level 2: 분수 / 소수 / 약수·배수 ----
  register(2, () => {
    const d1 = randInt(2, 8);
    const d2 = randInt(2, 8);
    const n1 = randInt(1, d1 - 1 < 1 ? 1 : d1 - 1);
    const n2 = randInt(1, d2 - 1 < 1 ? 1 : d2 - 1);
    const num = n1 * d2 + n2 * d1;
    const den = d1 * d2;
    const answer = fractionToString(num, den);
    return makeProblem(2, {
      question: `${n1}/${d1} + ${n2}/${d2} = ? (기약분수로)`,
      unit: '분수의 덧셈',
      answer,
      explanation: `${n1}/${d1} + ${n2}/${d2} = ${num}/${den} = ${answer}`,
      hint: '예를 들어 1/3 + 1/4를 더할 땐 분모를 같게 만들어야 해요. 분모의 최소공배수인 12로 통분하면 1/3=4/12, 1/4=3/12가 되고, 더하면 7/12예요. 지금 문제도 두 분모를 통분한 다음 분자끼리 더해보세요!',
    });
  });

  register(2, () => {
    const a = (randInt(10, 99) / 10).toFixed(1);
    const b = (randInt(10, 99) / 10).toFixed(1);
    const answer = (Number(a) + Number(b)).toFixed(1);
    return makeProblem(2, {
      question: `${a} + ${b} = ?`,
      unit: '소수의 덧셈',
      answer,
      tolerance: 0.05,
      explanation: `${a} + ${b} = ${answer}`,
      hint: '예를 들어 2.3 + 1.5를 더할 땐 소수점 자리를 맞춰서 세로로 쓰고 각 자리를 더하면 3.8이 돼요. 지금 문제도 소수점 자리를 맞춰서 더해보세요!',
    });
  });

  register(2, () => {
    const a = randInt(4, 40);
    const b = randInt(4, 40);
    const answer = gcd(a, b);
    return makeProblem(2, {
      question: `${a}와 ${b}의 최대공약수는?`,
      unit: '최대공약수',
      answer: String(answer),
      explanation: `${a} = ${answer} × ${a / answer}, ${b} = ${answer} × ${b / answer}`,
      hint: '예를 들어 12와 18의 최대공약수를 구할 땐, 두 수를 모두 나눌 수 있는 가장 큰 수를 찾아요. 12=2×2×3, 18=2×3×3이니 공통인 2×3=6이 최대공약수예요. 지금 문제도 두 수를 나눠보며 공통된 약수를 찾아보세요!',
    });
  });

  // ---- Level 3: 방정식 / 비례식 ----
  register(3, () => {
    const a = randInt(2, 9);
    const x = randInt(-10, 10);
    const b = randInt(-20, 20);
    const c = a * x + b;
    const bTerm = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
    return makeProblem(3, {
      question: `${a}x ${bTerm} = ${c}, x = ?`,
      unit: '일차방정식',
      answer: String(x),
      explanation: `${a}x = ${c - b} → x = ${x}`,
      hint: '예를 들어 3x + 2 = 11을 풀 땐 먼저 양쪽에서 2를 빼서 3x = 9로 만들고, 그다음 양쪽을 3으로 나누면 x = 3이 나와요. 지금 문제도 숫자를 옮긴 다음 x 앞의 수로 나눠보세요!',
    });
  });

  register(3, () => {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const k = randInt(2, 6);
    const c = a * k;
    const x = b * k;
    return makeProblem(3, {
      question: `${a} : ${b} = ${c} : x, x = ?`,
      unit: '비례식',
      answer: String(x),
      explanation: `비율 ${c}/${a} = ${k} 이므로 x = ${b} × ${k} = ${x}`,
      hint: '예를 들어 2 : 3 = 6 : x를 풀 땐, 앞의 2가 6이 되려면 몇 배가 됐는지부터 찾아요(6÷2=3배). 뒤의 3도 똑같이 3배 해주면 x = 9예요. 지금 문제도 앞의 비율이 몇 배가 됐는지 찾아서 뒤에도 똑같이 곱해보세요!',
    });
  });

  // ---- Level 4: 함수와 좌표 ----
  register(4, () => {
    const a = randInt(-5, 5) || 2;
    const b = randInt(-10, 10);
    const x = randInt(-10, 10);
    const y = a * x + b;
    const bTerm = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
    return makeProblem(4, {
      question: `y = ${a}x ${bTerm} 일 때, x = ${x}이면 y = ?`,
      unit: '일차함수(대입)',
      answer: String(y),
      explanation: `y = ${a}×${x} ${bTerm} = ${y}`,
      hint: '예를 들어 y = 2x + 1에서 x = 3일 때 y를 구하려면, x 자리에 3을 그대로 넣어서 y = 2×3 + 1 = 7을 계산하면 돼요. 지금 문제도 주어진 x값을 식에 그대로 대입해서 계산해보세요!',
    });
  });

  register(4, () => {
    const x1 = randInt(-8, 8);
    const y1 = randInt(-8, 8);
    let x2 = randInt(-8, 8);
    while (x2 === x1) x2 = randInt(-8, 8);
    const y2 = randInt(-8, 8);
    const slope = (y2 - y1) / (x2 - x1);
    return makeProblem(4, {
      question: `두 점 (${x1}, ${y1}), (${x2}, ${y2})을 지나는 직선의 기울기는? (기약분수)`,
      unit: '직선의 기울기',
      answer: fractionToString(y2 - y1, x2 - x1),
      tolerance: 0.01,
      explanation: `기울기 = (${y2} - ${y1}) / (${x2} - ${x1}) = ${fractionToString(y2 - y1, x2 - x1)}`,
      hint: '예를 들어 두 점 (1, 2)와 (3, 6)을 지나는 직선의 기울기는 (y가 변한 양)÷(x가 변한 양) = (6-2)/(3-1) = 4/2 = 2예요. 지금 문제도 두 점의 y좌표 차이를 x좌표 차이로 나눠보세요!',
    });
  });

  // ---- Level 5: 도형 ----
  register(5, () => {
    const w = randInt(3, 20);
    const h = randInt(3, 20);
    return makeProblem(5, {
      question: `가로 ${w}, 세로 ${h}인 직사각형의 넓이는?`,
      unit: '도형의 넓이',
      answer: String(w * h),
      explanation: `${w} × ${h} = ${w * h}`,
      hint: '예를 들어 가로 4, 세로 5인 직사각형의 넓이는 4×5=20이에요. 지금 문제도 가로와 세로를 그대로 곱해보세요!',
    });
  });

  const PYTHAGOREAN_TRIPLES = [
    [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25],
  ];
  const PYTHAGOREAN_HINT = '예를 들어 직각삼각형의 두 변이 3과 4일 때 빗변은 3²+4²=9+16=25, 즉 √25=5가 돼요. 지금 문제도 두 변을 각각 제곱해서 더한 다음 제곱근을 구해보세요(반대로 빗변이 주어졌다면, 빗변을 제곱한 값에서 다른 한 변의 제곱을 빼면 나머지 변의 제곱이 나와요)!';
  register(5, () => {
    const [a, b, c] = randChoice(PYTHAGOREAN_TRIPLES);
    const askHyp = Math.random() < 0.5;
    if (askHyp) {
      return makeProblem(5, {
        question: `직각삼각형의 두 변이 ${a}, ${b}일 때 빗변의 길이는?`,
        unit: '피타고라스 정리',
        answer: String(c),
        explanation: `${a}² + ${b}² = ${c}² → 빗변 = ${c}`,
        hint: PYTHAGOREAN_HINT,
      });
    }
    return makeProblem(5, {
      question: `직각삼각형의 빗변이 ${c}, 한 변이 ${a}일 때 나머지 한 변은?`,
      unit: '피타고라스 정리',
      answer: String(b),
      explanation: `${c}² - ${a}² = ${b}²`,
      hint: PYTHAGOREAN_HINT,
    });
  });

  // ---- Level 6: 확률과 통계 ----
  register(6, () => {
    const total = randInt(4, 10);
    const favorable = randInt(1, total - 1);
    return makeProblem(6, {
      question: `주머니에 공이 ${total}개 있고 그중 ${favorable}개가 빨간공이다. 하나를 꺼낼 때 빨간공일 확률은? (기약분수)`,
      unit: '확률',
      answer: fractionToString(favorable, total),
      explanation: `${favorable}/${total} = ${fractionToString(favorable, total)}`,
      hint: '예를 들어 공 5개 중 2개가 빨간공이면, 빨간공을 뽑을 확률은 2/5예요(원하는 경우의 수 ÷ 전체 경우의 수). 지금 문제도 원하는 개수를 전체 개수로 나눠서 기약분수로 나타내보세요!',
    });
  });

  register(6, () => {
    const nums = Array.from({ length: randInt(3, 5) }, () => randInt(1, 20));
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    return makeProblem(6, {
      question: `${nums.join(', ')}의 평균은?`,
      unit: '평균',
      answer: String(avg),
      tolerance: 0.05,
      explanation: `합 ${sum} ÷ ${nums.length}개 = ${avg}`,
      hint: '예를 들어 3, 5, 7의 평균을 구하려면 먼저 다 더해서(3+5+7=15) 개수인 3으로 나누면 평균은 5예요. 지금 문제도 모든 수를 더한 다음 개수로 나눠보세요!',
    });
  });

  // ---- Level 7: 수열과 로그 ----
  register(7, () => {
    const first = randInt(1, 10);
    const diff = randInt(2, 9);
    const n = randInt(5, 12);
    const answer = first + diff * (n - 1);
    return makeProblem(7, {
      question: `첫째항 ${first}, 공차 ${diff}인 등차수열의 제${n}항은?`,
      unit: '등차수열',
      answer: String(answer),
      explanation: `${first} + ${diff} × (${n} - 1) = ${answer}`,
      hint: '예를 들어 첫째항이 2이고 공차가 3인 등차수열의 제5항을 구하려면, 2 + 3×(5-1) = 2+12 = 14가 돼요(첫째항에 공차를 (항의 번호-1)번만큼 더해요). 지금 문제도 같은 방법으로 계산해보세요!',
    });
  });

  register(7, () => {
    const base = randChoice([2, 3, 5]);
    const exp = randInt(2, 5);
    const value = Math.pow(base, exp);
    return makeProblem(7, {
      question: `log₍${base}₎ ${value} = ?`,
      unit: '로그',
      answer: String(exp),
      explanation: `${base}^${exp} = ${value} 이므로 log₍${base}₎ ${value} = ${exp}`,
      hint: "예를 들어 log₂ 8을 구하려면 '2를 몇 번 곱해야 8이 될까?'를 생각해요(2×2×2=8이니 답은 3). 지금 문제도 밑을 몇 번 곱해야 그 값이 나오는지 찾아보세요!",
    });
  });

  // ---- Level 8: 삼각함수와 벡터 (객관식) ----
  const TRIG_TABLE = [
    { angle: 30, sin: '1/2', cos: '√3/2', tan: '√3/3' },
    { angle: 45, sin: '√2/2', cos: '√2/2', tan: '1' },
    { angle: 60, sin: '√3/2', cos: '1/2', tan: '√3' },
  ];
  register(8, () => {
    const row = randChoice(TRIG_TABLE);
    const func = randChoice(['sin', 'cos', 'tan']);
    const answer = row[func];
    const pool = new Set([answer]);
    while (pool.size < 4) {
      const r = randChoice(TRIG_TABLE);
      const f = randChoice(['sin', 'cos', 'tan']);
      pool.add(r[f]);
    }
    return makeProblem(8, {
      type: 'choice',
      question: `${func}(${row.angle}°) 의 값은?`,
      unit: '삼각비',
      answer,
      choices: shuffle([...pool]),
      explanation: `${func}(${row.angle}°) = ${answer}`,
      hint: '30°, 45°, 60°는 시험에 자주 나오는 대표 각도예요. 예를 들어 sin(30°)=1/2, cos(45°)=√2/2, tan(60°)=√3처럼 세 각도의 sin·cos·tan 값을 표로 외워두면 편해요. 지금 문제도 각도와 삼각함수 이름을 잘 보고 떠올려보세요!',
    });
  });

  register(8, () => {
    const x = randInt(1, 9);
    const y = randInt(1, 9);
    const answer = Math.sqrt(x * x + y * y);
    const isPerfect = Number.isInteger(answer);
    const vectorHint = '예를 들어 벡터 (3, 4)의 크기를 구하려면 각 성분을 제곱해서 더한 다음(3²+4²=25) 제곱근을 구해요(√25=5). 제곱근이 딱 떨어지지 않으면 x²+y² 값 그대로가 답이 되기도 해요. 지금 문제도 같은 방법으로 계산해보세요!';
    if (!isPerfect) {
      return makeProblem(8, {
        question: `벡터 (${x}, ${y})의 내적을 자기 자신과 계산하면? (x²+y²)`,
        unit: '벡터',
        answer: String(x * x + y * y),
        explanation: `${x}² + ${y}² = ${x * x + y * y}`,
        hint: vectorHint,
      });
    }
    return makeProblem(8, {
      question: `벡터 (${x}, ${y})의 크기는?`,
      unit: '벡터',
      answer: String(answer),
      explanation: `√(${x}² + ${y}²) = ${answer}`,
      hint: vectorHint,
    });
  });

  // ---- Level 9: 심화 문제 (조합/논리) ----
  function factorial(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  register(9, () => {
    const n = randInt(4, 7);
    const r = randInt(2, n - 1);
    const nPr = factorial(n) / factorial(n - r);
    return makeProblem(9, {
      question: `${n}명 중 ${r}명을 순서를 고려해 뽑는 경우의 수(순열)는?`,
      unit: '순열',
      answer: String(nPr),
      explanation: `${n}P${r} = ${n}! / (${n}-${r})! = ${nPr}`,
      hint: '예를 들어 5명 중 2명을 순서를 고려해 뽑는 경우의 수는 5×4=20이에요(첫 번째 자리에 5명 중 아무나, 두 번째 자리엔 남은 4명 중 아무나 올 수 있어요). 지금 문제도 첫 자리부터 하나씩 줄여가며 곱해보세요!',
    });
  });

  register(9, () => {
    const n = randInt(4, 8);
    const r = randInt(2, n - 1);
    const nCr = factorial(n) / (factorial(r) * factorial(n - r));
    return makeProblem(9, {
      question: `${n}명 중 ${r}명을 순서 상관없이 뽑는 경우의 수(조합)는?`,
      unit: '조합',
      answer: String(nCr),
      explanation: `${n}C${r} = ${n}! / (${r}! × (${n}-${r})!) = ${nCr}`,
      hint: '예를 들어 5명 중 2명을 순서 상관없이 뽑는 경우의 수는, 순서를 고려한 5×4=20에서 2명을 줄 세우는 방법(2가지)만큼 나누면 20÷2=10이에요. 지금 문제도 순서를 고려해 곱한 다음, 뽑은 인원수를 줄 세우는 경우의 수로 나눠보세요!',
    });
  });

  /* ---------------------------------------------------------------- */
  /* 최근 문제 중복 방지 + 생성 API                                        */
  /* ---------------------------------------------------------------- */

  const RECENT_HISTORY_SIZE = 8;
  const recentQuestions = [];

  function generateProblem(level) {
    const generators = GENERATORS[level];
    if (!generators || generators.length === 0) {
      throw new Error(`레벨 ${level}에 등록된 문제 생성기가 없습니다.`);
    }
    let problem;
    let attempts = 0;
    do {
      const gen = randChoice(generators);
      problem = gen();
      attempts++;
    } while (recentQuestions.includes(problem.question) && attempts < 15);

    recentQuestions.push(problem.question);
    if (recentQuestions.length > RECENT_HISTORY_SIZE) recentQuestions.shift();

    const levelDef = LEVELS.find((l) => l.id === level);
    if (levelDef && levelDef.concept) problem.concept = levelDef.concept;

    return problem;
  }

  const api = {
    LEVELS,
    isLevelUnlocked,
    generateProblem,
    checkAnswer,
    gcd,
    fractionToString,
    parseFractionValue,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessProblems = api;
  }
})(typeof window !== 'undefined' ? window : null);
