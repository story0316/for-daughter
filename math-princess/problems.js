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
    if (/^-?\d+\/\d+$/.test(s)) {
      const [n, d] = s.split('/').map(Number);
      if (d === 0) return null;
      return n / d;
    }
    if (/^-?\d+(\.\d+)?$/.test(s)) {
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

  const LEVELS = [
    { id: 1, name: '초등 연산', desc: '덧셈 · 뺄셈 · 곱셈 · 나눗셈', unlockIntelligence: 0 },
    { id: 2, name: '분수와 소수', desc: '분수, 소수, 약수와 배수', unlockIntelligence: 8 },
    { id: 3, name: '방정식', desc: '일차방정식, 비례식', unlockIntelligence: 18 },
    { id: 4, name: '함수와 좌표', desc: '일차함수, 좌표평면', unlockIntelligence: 28 },
    { id: 5, name: '도형', desc: '도형의 넓이, 피타고라스 정리', unlockIntelligence: 38 },
    { id: 6, name: '확률과 통계', desc: '확률, 평균', unlockIntelligence: 48 },
    { id: 7, name: '수열과 로그', desc: '등차수열, 등비수열, 로그', unlockIntelligence: 58 },
    { id: 8, name: '삼각함수와 벡터', desc: '삼각비, 벡터', unlockIntelligence: 68 },
    { id: 9, name: '미분과 적분', desc: '다항함수 미분 · 적분', unlockIntelligence: 78 },
    { id: 10, name: '심화 문제', desc: '올림피아드 · 논리 문제', unlockIntelligence: 88 },
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

  const GENERATORS = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [] };

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

  // ---- Level 1: 사칙연산 ----
  register(1, () => {
    const op = randChoice(['+', '-', '*', '/']);
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
      answer: String(answer),
      explanation: `${text.replace(' = ?', '')} = ${answer}`,
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
      answer,
      explanation: `${n1}/${d1} + ${n2}/${d2} = ${num}/${den} = ${answer}`,
    });
  });

  register(2, () => {
    const a = (randInt(10, 99) / 10).toFixed(1);
    const b = (randInt(10, 99) / 10).toFixed(1);
    const answer = (Number(a) + Number(b)).toFixed(1);
    return makeProblem(2, {
      question: `${a} + ${b} = ?`,
      answer,
      tolerance: 0.05,
      explanation: `${a} + ${b} = ${answer}`,
    });
  });

  register(2, () => {
    const a = randInt(4, 40);
    const b = randInt(4, 40);
    const answer = gcd(a, b);
    return makeProblem(2, {
      question: `${a}와 ${b}의 최대공약수는?`,
      answer: String(answer),
      explanation: `${a} = ${answer} × ${a / answer}, ${b} = ${answer} × ${b / answer}`,
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
      answer: String(x),
      explanation: `${a}x = ${c - b} → x = ${x}`,
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
      answer: String(x),
      explanation: `비율 ${c}/${a} = ${k} 이므로 x = ${b} × ${k} = ${x}`,
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
      answer: String(y),
      explanation: `y = ${a}×${x} ${bTerm} = ${y}`,
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
      answer: fractionToString(y2 - y1, x2 - x1),
      tolerance: 0.01,
      explanation: `기울기 = (${y2} - ${y1}) / (${x2} - ${x1}) = ${fractionToString(y2 - y1, x2 - x1)}`,
    });
  });

  // ---- Level 5: 도형 ----
  register(5, () => {
    const w = randInt(3, 20);
    const h = randInt(3, 20);
    return makeProblem(5, {
      question: `가로 ${w}, 세로 ${h}인 직사각형의 넓이는?`,
      answer: String(w * h),
      explanation: `${w} × ${h} = ${w * h}`,
    });
  });

  const PYTHAGOREAN_TRIPLES = [
    [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25],
  ];
  register(5, () => {
    const [a, b, c] = randChoice(PYTHAGOREAN_TRIPLES);
    const askHyp = Math.random() < 0.5;
    if (askHyp) {
      return makeProblem(5, {
        question: `직각삼각형의 두 변이 ${a}, ${b}일 때 빗변의 길이는?`,
        answer: String(c),
        explanation: `${a}² + ${b}² = ${c}² → 빗변 = ${c}`,
      });
    }
    return makeProblem(5, {
      question: `직각삼각형의 빗변이 ${c}, 한 변이 ${a}일 때 나머지 한 변은?`,
      answer: String(b),
      explanation: `${c}² - ${a}² = ${b}²`,
    });
  });

  // ---- Level 6: 확률과 통계 ----
  register(6, () => {
    const total = randInt(4, 10);
    const favorable = randInt(1, total - 1);
    return makeProblem(6, {
      question: `주머니에 공이 ${total}개 있고 그중 ${favorable}개가 빨간공이다. 하나를 꺼낼 때 빨간공일 확률은? (기약분수)`,
      answer: fractionToString(favorable, total),
      explanation: `${favorable}/${total} = ${fractionToString(favorable, total)}`,
    });
  });

  register(6, () => {
    const nums = Array.from({ length: randInt(3, 5) }, () => randInt(1, 20));
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    return makeProblem(6, {
      question: `${nums.join(', ')}의 평균은?`,
      answer: String(avg),
      tolerance: 0.05,
      explanation: `합 ${sum} ÷ ${nums.length}개 = ${avg}`,
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
      answer: String(answer),
      explanation: `${first} + ${diff} × (${n} - 1) = ${answer}`,
    });
  });

  register(7, () => {
    const base = randChoice([2, 3, 5]);
    const exp = randInt(2, 5);
    const value = Math.pow(base, exp);
    return makeProblem(7, {
      question: `log₍${base}₎ ${value} = ?`,
      answer: String(exp),
      explanation: `${base}^${exp} = ${value} 이므로 log₍${base}₎ ${value} = ${exp}`,
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
      answer,
      choices: shuffle([...pool]),
      explanation: `${func}(${row.angle}°) = ${answer}`,
    });
  });

  register(8, () => {
    const x = randInt(1, 9);
    const y = randInt(1, 9);
    const answer = Math.sqrt(x * x + y * y);
    const isPerfect = Number.isInteger(answer);
    if (!isPerfect) {
      return makeProblem(8, {
        question: `벡터 (${x}, ${y})의 내적을 자기 자신과 계산하면? (x²+y²)`,
        answer: String(x * x + y * y),
        explanation: `${x}² + ${y}² = ${x * x + y * y}`,
      });
    }
    return makeProblem(8, {
      question: `벡터 (${x}, ${y})의 크기는?`,
      answer: String(answer),
      explanation: `√(${x}² + ${y}²) = ${answer}`,
    });
  });

  // ---- Level 9: 미분과 적분 ----
  register(9, () => {
    const a = randInt(1, 6);
    const n = randInt(2, 4);
    const x = randInt(1, 5);
    const derivCoef = a * n;
    const value = derivCoef * Math.pow(x, n - 1);
    return makeProblem(9, {
      question: `f(x) = ${a}x^${n} 일 때 f'(${x})의 값은?`,
      answer: String(value),
      explanation: `f'(x) = ${derivCoef}x^${n - 1} → f'(${x}) = ${value}`,
    });
  });

  register(9, () => {
    const a = randInt(1, 5);
    const upper = randInt(2, 5);
    const value = (a / 2) * upper * upper;
    return makeProblem(9, {
      question: `∫₀^${upper} ${a}x dx 의 값은?`,
      answer: String(value),
      tolerance: 0.05,
      explanation: `[${a}x²/2]₀^${upper} = ${value}`,
    });
  });

  // ---- Level 10: 심화 문제 (조합/논리) ----
  function factorial(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  register(10, () => {
    const n = randInt(4, 7);
    const r = randInt(2, n - 1);
    const nPr = factorial(n) / factorial(n - r);
    return makeProblem(10, {
      question: `${n}명 중 ${r}명을 순서를 고려해 뽑는 경우의 수(순열)는?`,
      answer: String(nPr),
      explanation: `${n}P${r} = ${n}! / (${n}-${r})! = ${nPr}`,
    });
  });

  register(10, () => {
    const n = randInt(4, 8);
    const r = randInt(2, n - 1);
    const nCr = factorial(n) / (factorial(r) * factorial(n - r));
    return makeProblem(10, {
      question: `${n}명 중 ${r}명을 순서 상관없이 뽑는 경우의 수(조합)는?`,
      answer: String(nCr),
      explanation: `${n}C${r} = ${n}! / (${r}! × (${n}-${r})!) = ${nCr}`,
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
