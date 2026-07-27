(() => {
  'use strict';

  const HEART_MAX = 3;

  const DIFFS = {
    easy: {
      key: 'easy',
      label: '이지',
      range: [2, 5],
      mode: 'choice',
      time: 15,
      count: 10,
      desc: '2~5단 곱셈이 나와요. 4개 중에 답을 골라요. 시간이 넉넉해요.',
    },
    normal: {
      key: 'normal',
      label: '노말',
      range: [2, 9],
      mode: 'choice',
      time: 10,
      count: 15,
      desc: '2~9단 곱셈이 나와요. 4개 중에 답을 골라요. 조금 빠르게 풀어야 해요.',
    },
    hard: {
      key: 'hard',
      label: '하드',
      range: [2, 9],
      mode: 'input',
      time: 8,
      count: 20,
      desc: '2~9단 곱셈이 나와요. 답을 직접 입력해요. 시간이 짧으니 집중!',
    },
  };
  const DIFF_ORDER = ['easy', 'normal', 'hard'];

  const CORRECT_FX = ['🎉', '✨', '⭐', '💖'];

  const el = {
    screens: {
      start: document.getElementById('screen-start'),
      game: document.getElementById('screen-game'),
      result: document.getElementById('screen-result'),
    },
    diffButtons: document.getElementById('difficulty-buttons'),
    diffDesc: document.getElementById('difficulty-desc'),
    bestScore: document.getElementById('best-score'),
    btnStart: document.getElementById('btn-start'),

    hearts: document.getElementById('hearts'),
    score: document.getElementById('score'),
    progressText: document.getElementById('progress-text'),
    diffBadge: document.getElementById('diff-badge'),
    timerBar: document.getElementById('timer-bar'),
    question: document.getElementById('question'),
    choices: document.getElementById('choices'),
    typedWrap: document.getElementById('typed-answer-wrap'),
    typedInput: document.getElementById('typed-input'),
    btnSubmit: document.getElementById('btn-submit'),
    feedback: document.getElementById('feedback'),
    fxLayer: document.getElementById('fx-layer'),

    resultEmoji: document.getElementById('result-emoji'),
    resultTitle: document.getElementById('result-title'),
    resultDesc: document.getElementById('result-desc'),
    statScore: document.getElementById('stat-score'),
    statCorrect: document.getElementById('stat-correct'),
    statBest: document.getElementById('stat-best'),
    btnRetry: document.getElementById('btn-retry'),
    btnNext: document.getElementById('btn-next'),
    btnHome: document.getElementById('btn-home'),
  };

  const state = {
    selectedDiff: 'easy',
    diffKey: 'easy',
    questions: [],
    index: 0,
    score: 0,
    hearts: HEART_MAX,
    correctCount: 0,
    combo: 0,
    bestCombo: 0,
    answered: false,
    timerTimeoutId: null,
    nextTimeoutId: null,
    dangerTimeoutId: null,
  };

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showScreen(name) {
    Object.values(el.screens).forEach((s) => s.classList.remove('active'));
    el.screens[name].classList.add('active');
  }

  function bestScoreKey(diffKey) {
    return `mult-quiz-best-${diffKey}`;
  }

  function getBestScore(diffKey) {
    return Number(localStorage.getItem(bestScoreKey(diffKey)) || 0);
  }

  function saveBestScore(diffKey, score) {
    const best = getBestScore(diffKey);
    if (score > best) {
      localStorage.setItem(bestScoreKey(diffKey), String(score));
    }
  }

  function updateStartScreenForDiff(diffKey) {
    const diff = DIFFS[diffKey];
    el.diffDesc.textContent = diff.desc;
    const best = getBestScore(diffKey);
    el.bestScore.textContent = best > 0 ? `${diff.label} 최고 점수: ${best}점` : '';
    [...el.diffButtons.children].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.diff === diffKey);
    });
  }

  el.diffButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('.diff-btn');
    if (!btn) return;
    state.selectedDiff = btn.dataset.diff;
    updateStartScreenForDiff(state.selectedDiff);
  });

  el.btnStart.addEventListener('click', () => startGame(state.selectedDiff));
  el.btnRetry.addEventListener('click', () => startGame(state.diffKey));
  el.btnHome.addEventListener('click', () => {
    updateStartScreenForDiff(state.diffKey);
    showScreen('start');
  });
  el.btnNext.addEventListener('click', () => {
    const idx = DIFF_ORDER.indexOf(state.diffKey);
    const next = DIFF_ORDER[Math.min(idx + 1, DIFF_ORDER.length - 1)];
    startGame(next);
  });

  el.btnSubmit.addEventListener('click', handleSubmit);
  el.typedInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });

  function generateQuestions(diff) {
    const questions = [];
    let last = null;
    for (let i = 0; i < diff.count; i++) {
      let a, b;
      do {
        a = randInt(diff.range[0], diff.range[1]);
        b = randInt(1, 9);
      } while (last && last.a === a && last.b === b);
      last = { a, b };
      questions.push({ a, b, answer: a * b });
    }
    return questions;
  }

  function genWrongAnswers(correct, count) {
    const set = new Set();
    let guard = 0;
    while (set.size < count && guard < 200) {
      guard++;
      const offset = randInt(-10, 10);
      const val = correct + offset;
      if (offset === 0 || val < 0 || val === correct) continue;
      set.add(val);
    }
    // fallback in the unlikely case we couldn't fill enough unique values
    let filler = correct + count + 1;
    while (set.size < count) {
      if (filler !== correct) set.add(filler);
      filler++;
    }
    return [...set];
  }

  function clearAllTimers() {
    clearTimeout(state.timerTimeoutId);
    clearTimeout(state.nextTimeoutId);
    clearTimeout(state.dangerTimeoutId);
  }

  function startGame(diffKey) {
    clearAllTimers();
    const diff = DIFFS[diffKey];
    state.diffKey = diffKey;
    state.questions = generateQuestions(diff);
    state.index = 0;
    state.score = 0;
    state.hearts = HEART_MAX;
    state.correctCount = 0;
    state.combo = 0;
    state.bestCombo = 0;

    el.diffBadge.textContent = diff.label;
    showScreen('game');
    renderQuestion();
  }

  function renderHearts() {
    el.hearts.innerHTML = '';
    for (let i = 0; i < HEART_MAX; i++) {
      const span = document.createElement('span');
      span.textContent = '❤️';
      if (i >= state.hearts) span.classList.add('lost');
      el.hearts.appendChild(span);
    }
  }

  function renderQuestion() {
    if (state.index >= state.questions.length) {
      endGame(true);
      return;
    }
    state.answered = false;
    const diff = DIFFS[state.diffKey];
    const q = state.questions[state.index];

    el.question.textContent = `${q.a} × ${q.b} = ?`;
    el.progressText.textContent = `${state.index + 1} / ${state.questions.length}`;
    el.score.textContent = `점수 ${state.score}`;
    el.feedback.textContent = '';
    renderHearts();

    if (diff.mode === 'choice') {
      el.choices.style.display = 'grid';
      el.typedWrap.classList.remove('active');
      const wrongs = genWrongAnswers(q.answer, 3);
      const options = shuffle([q.answer, ...wrongs]);
      el.choices.innerHTML = '';
      options.forEach((val) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = val;
        btn.addEventListener('click', () => handleChoice(val, btn));
        el.choices.appendChild(btn);
      });
    } else {
      el.choices.style.display = 'none';
      el.choices.innerHTML = '';
      el.typedWrap.classList.add('active');
      el.typedInput.value = '';
      el.typedInput.classList.remove('correct', 'wrong');
      el.typedInput.disabled = false;
      el.btnSubmit.disabled = false;
      setTimeout(() => el.typedInput.focus(), 50);
    }

    startTimer(diff.time);
  }

  function startTimer(seconds) {
    clearTimeout(state.timerTimeoutId);
    clearTimeout(state.dangerTimeoutId);
    const bar = el.timerBar;
    bar.classList.remove('danger');
    bar.style.transition = 'none';
    bar.style.width = '100%';
    // force reflow so the next transition actually animates
    void bar.offsetWidth;
    bar.style.transition = `width ${seconds}s linear`;
    bar.style.width = '0%';

    state.dangerTimeoutId = setTimeout(() => {
      bar.classList.add('danger');
    }, seconds * 1000 * 0.6);

    state.timerTimeoutId = setTimeout(() => onTimeout(), seconds * 1000);
  }

  function onTimeout() {
    if (state.answered) return;
    state.answered = true;
    const diff = DIFFS[state.diffKey];
    const q = state.questions[state.index];

    if (diff.mode === 'choice') {
      [...el.choices.children].forEach((btn) => {
        btn.disabled = true;
        if (Number(btn.textContent) === q.answer) btn.classList.add('correct');
      });
    } else {
      el.typedInput.disabled = true;
      el.btnSubmit.disabled = true;
      el.typedInput.classList.add('wrong');
    }

    state.combo = 0;
    el.feedback.textContent = `시간 초과! 정답은 ${q.answer}예요`;
    el.question.classList.add('shake');
    setTimeout(() => el.question.classList.remove('shake'), 400);

    loseHeartFlow();
  }

  function handleChoice(value, btnEl) {
    if (state.answered) return;
    state.answered = true;
    clearTimeout(state.timerTimeoutId);
    clearTimeout(state.dangerTimeoutId);

    const q = state.questions[state.index];
    [...el.choices.children].forEach((btn) => (btn.disabled = true));

    if (value === q.answer) {
      btnEl.classList.add('correct');
      handleCorrect();
    } else {
      btnEl.classList.add('wrong');
      [...el.choices.children].forEach((btn) => {
        if (Number(btn.textContent) === q.answer) btn.classList.add('correct');
      });
      handleWrong(q.answer);
    }
  }

  function handleSubmit() {
    if (state.answered) return;
    const diff = DIFFS[state.diffKey];
    if (diff.mode !== 'input') return;
    const raw = el.typedInput.value.trim();
    if (raw === '') {
      el.typedInput.focus();
      return;
    }
    state.answered = true;
    clearTimeout(state.timerTimeoutId);
    clearTimeout(state.dangerTimeoutId);

    const q = state.questions[state.index];
    const value = Number(raw);
    el.typedInput.disabled = true;
    el.btnSubmit.disabled = true;

    if (value === q.answer) {
      el.typedInput.classList.add('correct');
      handleCorrect();
    } else {
      el.typedInput.classList.add('wrong');
      handleWrong(q.answer);
    }
  }

  function handleCorrect() {
    state.combo++;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.correctCount++;
    const comboBonus = Math.min(state.combo, 5) * 2;
    state.score += 10 + comboBonus;
    el.score.textContent = `점수 ${state.score}`;
    el.feedback.textContent = state.combo >= 3 ? `정답이에요! 🎉 ${state.combo}연속!` : '정답이에요! 🎉';
    spawnFx(CORRECT_FX, 6);
    state.nextTimeoutId = setTimeout(nextQuestion, 700);
  }

  function handleWrong(answer) {
    state.combo = 0;
    el.feedback.textContent = `아쉬워요! 정답은 ${answer}예요`;
    el.question.classList.add('shake');
    setTimeout(() => el.question.classList.remove('shake'), 400);
    loseHeartFlow();
  }

  function loseHeartFlow() {
    state.hearts--;
    renderHearts();
    if (state.hearts <= 0) {
      state.nextTimeoutId = setTimeout(() => endGame(false), 900);
    } else {
      state.nextTimeoutId = setTimeout(nextQuestion, 900);
    }
  }

  function nextQuestion() {
    state.index++;
    renderQuestion();
  }

  function spawnFx(emojiList, count) {
    for (let i = 0; i < count; i++) {
      const emoji = document.createElement('div');
      emoji.className = 'fx-emoji';
      emoji.textContent = emojiList[randInt(0, emojiList.length - 1)];
      emoji.style.left = `${randInt(10, 90)}%`;
      emoji.style.bottom = '35%';
      emoji.style.animationDuration = `${(0.7 + Math.random() * 0.6).toFixed(2)}s`;
      el.fxLayer.appendChild(emoji);
      emoji.addEventListener('animationend', () => emoji.remove());
    }
  }

  function endGame(cleared) {
    clearAllTimers();
    const diff = DIFFS[state.diffKey];
    saveBestScore(state.diffKey, state.score);

    if (cleared) {
      el.resultEmoji.textContent = '🎉';
      el.resultTitle.textContent = `${diff.label} 클리어!`;
      el.resultDesc.textContent = `${state.questions.length}문제 중 ${state.correctCount}개를 맞혔어요!`;
    } else {
      el.resultEmoji.textContent = '💔';
      el.resultTitle.textContent = '아쉬워요!';
      el.resultDesc.textContent = `${state.index + 1}번째 문제까지 풀었어요. 점수 ${state.score}점!`;
    }

    el.statScore.textContent = state.score;
    el.statCorrect.textContent = state.correctCount;
    el.statBest.textContent = state.bestCombo;

    const idx = DIFF_ORDER.indexOf(state.diffKey);
    const hasNext = idx < DIFF_ORDER.length - 1;
    if (cleared && hasNext) {
      const nextDiff = DIFFS[DIFF_ORDER[idx + 1]];
      el.btnNext.style.display = 'block';
      el.btnNext.textContent = `${nextDiff.label} 도전하기!`;
    } else {
      el.btnNext.style.display = 'none';
    }

    showScreen('result');
  }

  updateStartScreenForDiff(state.selectedDiff);
})();
