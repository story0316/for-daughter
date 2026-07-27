(() => {
  'use strict';

  const HEART_MAX = 3;
  const HINT_MAX = 3;

  const DIFFS = {
    easy: { key: 'easy', label: '쉬움', givens: 40, desc: '가장 쉬운 단계예요. 힌트도 3번 쓸 수 있어요.' },
    normal: { key: 'normal', label: '보통', givens: 32, desc: '조금 더 채워야 할 빈칸이 많아져요.' },
    hard: { key: 'hard', label: '어려움', givens: 26, desc: '빈칸이 아주 많아요. 집중해서 풀어보세요!' },
  };
  const DIFF_ORDER = ['easy', 'normal', 'hard'];

  const el = {
    screens: {
      start: document.getElementById('screen-start'),
      game: document.getElementById('screen-game'),
      result: document.getElementById('screen-result'),
    },
    diffButtons: document.getElementById('difficulty-buttons'),
    diffDesc: document.getElementById('difficulty-desc'),
    bestTime: document.getElementById('best-time'),
    btnStart: document.getElementById('btn-start'),

    hearts: document.getElementById('hearts'),
    timer: document.getElementById('timer'),
    btnHint: document.getElementById('btn-hint'),
    hintCount: document.getElementById('hint-count'),
    diffBadge: document.getElementById('diff-badge'),
    progressText: document.getElementById('progress-text'),
    board: document.getElementById('board'),
    numpad: document.getElementById('numpad'),
    loadingOverlay: document.getElementById('loading-overlay'),

    resultEmoji: document.getElementById('result-emoji'),
    resultTitle: document.getElementById('result-title'),
    resultDesc: document.getElementById('result-desc'),
    statTime: document.getElementById('stat-time'),
    statMistakes: document.getElementById('stat-mistakes'),
    statHints: document.getElementById('stat-hints'),
    btnRetry: document.getElementById('btn-retry'),
    btnNext: document.getElementById('btn-next'),
    btnHome: document.getElementById('btn-home'),
  };

  const state = {
    selectedDiff: 'easy',
    diffKey: 'easy',
    solution: [],
    puzzle: [],
    given: [],
    board: [],
    selectedIndex: -1,
    hearts: HEART_MAX,
    hintsLeft: HINT_MAX,
    hintsUsed: 0,
    mistakes: 0,
    seconds: 0,
    timerId: null,
    over: false,
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

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* ---------- 스도쿠 생성/검증 ---------- */

  function isValid(grid, row, col, n) {
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 9; i++) {
      if (grid[row * 9 + i] === n) return false;
      if (grid[i * 9 + col] === n) return false;
    }
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (grid[r * 9 + c] === n) return false;
      }
    }
    return true;
  }

  function fillGrid(grid) {
    const idx = grid.indexOf(0);
    if (idx === -1) return true;
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const n of nums) {
      if (isValid(grid, row, col, n)) {
        grid[idx] = n;
        if (fillGrid(grid)) return true;
        grid[idx] = 0;
      }
    }
    return false;
  }

  function generateSolvedGrid() {
    const grid = new Array(81).fill(0);
    fillGrid(grid);
    return grid;
  }

  function countSolutions(grid, limit) {
    const g = grid.slice();
    let count = 0;
    function solve() {
      if (count >= limit) return;
      const idx = g.indexOf(0);
      if (idx === -1) {
        count++;
        return;
      }
      const row = Math.floor(idx / 9);
      const col = idx % 9;
      for (let n = 1; n <= 9; n++) {
        if (count >= limit) return;
        if (isValid(g, row, col, n)) {
          g[idx] = n;
          solve();
          g[idx] = 0;
        }
      }
    }
    solve();
    return count;
  }

  function generatePuzzle(targetGivens) {
    const solved = generateSolvedGrid();
    const puzzle = solved.slice();
    const positions = shuffle([...Array(81).keys()]);
    let givens = 81;
    for (const idx of positions) {
      if (givens <= targetGivens) break;
      const backup = puzzle[idx];
      if (backup === 0) continue;
      puzzle[idx] = 0;
      const solCount = countSolutions(puzzle, 2);
      if (solCount !== 1) {
        puzzle[idx] = backup;
      } else {
        givens--;
      }
    }
    return { puzzle, solution: solved };
  }

  /* ---------- localStorage 최고 기록 ---------- */

  function bestTimeKey(diffKey) {
    return `sudoku-best-time-${diffKey}`;
  }

  function getBestTime(diffKey) {
    const v = localStorage.getItem(bestTimeKey(diffKey));
    return v ? Number(v) : null;
  }

  function saveBestTime(diffKey, seconds) {
    const best = getBestTime(diffKey);
    if (best === null || seconds < best) {
      localStorage.setItem(bestTimeKey(diffKey), String(seconds));
    }
  }

  function updateStartScreenForDiff(diffKey) {
    const diff = DIFFS[diffKey];
    el.diffDesc.textContent = diff.desc;
    const best = getBestTime(diffKey);
    el.bestTime.textContent = best !== null ? `${diff.label} 최고 기록: ${formatTime(best)}` : '';
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

  el.btnHint.addEventListener('click', useHint);

  el.numpad.addEventListener('click', (e) => {
    const btn = e.target.closest('.num-btn');
    if (!btn || state.over) return;
    handleNumberInput(Number(btn.dataset.num));
  });

  /* ---------- 게임 진행 ---------- */

  function startGame(diffKey) {
    clearInterval(state.timerId);
    const diff = DIFFS[diffKey];
    state.diffKey = diffKey;
    state.selectedIndex = -1;
    state.hearts = HEART_MAX;
    state.hintsLeft = HINT_MAX;
    state.hintsUsed = 0;
    state.mistakes = 0;
    state.seconds = 0;
    state.over = false;

    el.diffBadge.textContent = diff.label;
    showScreen('game');
    renderHearts();
    updateHintButton();
    el.timer.textContent = `⏱ ${formatTime(0)}`;
    el.board.innerHTML = '';
    el.loadingOverlay.classList.add('show');

    setTimeout(() => {
      const { puzzle, solution } = generatePuzzle(diff.givens);
      state.puzzle = puzzle;
      state.solution = solution;
      state.given = puzzle.map((v) => v !== 0);
      state.board = puzzle.slice();
      el.loadingOverlay.classList.remove('show');
      renderBoard();
      updateProgress();
      state.timerId = setInterval(tick, 1000);
    }, 30);
  }

  function tick() {
    state.seconds++;
    el.timer.textContent = `⏱ ${formatTime(state.seconds)}`;
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

  function updateHintButton() {
    el.hintCount.textContent = state.hintsLeft;
    el.btnHint.disabled = state.hintsLeft <= 0;
  }

  function updateProgress() {
    const filled = state.board.filter((v) => v !== 0).length;
    el.progressText.textContent = `채운 칸 ${filled} / 81`;
  }

  function renderBoard() {
    el.board.innerHTML = '';
    for (let i = 0; i < 81; i++) {
      const row = Math.floor(i / 9);
      const col = i % 9;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      if (col % 3 === 0 && col !== 0) cell.classList.add('border-left-thick');
      if (row % 3 === 0 && row !== 0) cell.classList.add('border-top-thick');
      if (state.given[i]) cell.classList.add('given');
      cell.addEventListener('click', () => selectCell(i));
      el.board.appendChild(cell);
    }
    renderCells();
  }

  function renderCells() {
    const sel = state.selectedIndex;
    const selRow = sel >= 0 ? Math.floor(sel / 9) : -1;
    const selCol = sel >= 0 ? sel % 9 : -1;
    const selBoxRow = sel >= 0 ? Math.floor(selRow / 3) : -1;
    const selBoxCol = sel >= 0 ? Math.floor(selCol / 3) : -1;
    const selValue = sel >= 0 ? state.board[sel] : 0;

    const digitCounts = new Array(10).fill(0);
    state.board.forEach((v) => {
      if (v !== 0) digitCounts[v]++;
    });

    for (let i = 0; i < 81; i++) {
      const cellEl = el.board.children[i];
      const row = Math.floor(i / 9);
      const col = i % 9;
      const boxRow = Math.floor(row / 3);
      const boxCol = Math.floor(col / 3);
      const value = state.board[i];

      cellEl.textContent = value === 0 ? '' : String(value);
      cellEl.classList.remove('selected', 'same-unit', 'same-number', 'wrong');

      if (i === sel) {
        cellEl.classList.add('selected');
      } else if (sel >= 0) {
        const sameUnit = row === selRow || col === selCol || (boxRow === selBoxRow && boxCol === selBoxCol);
        if (sameUnit) cellEl.classList.add('same-unit');
        if (selValue !== 0 && value === selValue) cellEl.classList.add('same-number');
      }

      if (!state.given[i] && value !== 0 && value !== state.solution[i]) {
        cellEl.classList.add('wrong');
      } else if (state.given[i]) {
        cellEl.classList.remove('filled');
      }
      cellEl.classList.toggle('filled', !state.given[i] && value !== 0);
    }

    [...el.numpad.children].forEach((btn) => {
      const n = Number(btn.dataset.num);
      if (n >= 1 && n <= 9) {
        btn.classList.toggle('used', digitCounts[n] >= 9);
      }
    });
  }

  function selectCell(i) {
    if (state.over) return;
    state.selectedIndex = i;
    renderCells();
  }

  function handleNumberInput(n) {
    const i = state.selectedIndex;
    if (i < 0 || state.given[i]) return;

    if (n === 0) {
      state.board[i] = 0;
      renderCells();
      updateProgress();
      return;
    }

    const prev = state.board[i];
    state.board[i] = n;

    if (n !== state.solution[i] && prev !== n) {
      loseHeart();
      if (state.over) {
        renderCells();
        updateProgress();
        return;
      }
    }

    renderCells();
    updateProgress();
    checkComplete();
  }

  function loseHeart() {
    state.mistakes++;
    state.hearts--;
    renderHearts();
    if (state.hearts <= 0) {
      state.over = true;
      clearInterval(state.timerId);
      setTimeout(() => endGame(false), 500);
    }
  }

  function useHint() {
    if (state.over || state.hintsLeft <= 0) return;
    let target = state.selectedIndex;
    if (target < 0 || state.given[target] || state.board[target] === state.solution[target]) {
      target = state.board.findIndex((v, idx) => !state.given[idx] && v !== state.solution[idx]);
    }
    if (target < 0) return;

    state.board[target] = state.solution[target];
    state.hintsLeft--;
    state.hintsUsed++;
    state.selectedIndex = target;
    updateHintButton();
    renderCells();
    updateProgress();
    checkComplete();
  }

  function checkComplete() {
    if (state.board.every((v) => v !== 0) && state.board.every((v, i) => v === state.solution[i])) {
      state.over = true;
      clearInterval(state.timerId);
      setTimeout(() => endGame(true), 300);
    }
  }

  function endGame(cleared) {
    clearInterval(state.timerId);
    const diff = DIFFS[state.diffKey];

    if (cleared) {
      saveBestTime(state.diffKey, state.seconds);
      el.resultEmoji.textContent = '🎉';
      el.resultTitle.textContent = `${diff.label} 클리어!`;
      el.resultDesc.textContent = `${formatTime(state.seconds)} 만에 스도쿠를 풀었어요!`;
    } else {
      el.resultEmoji.textContent = '💔';
      el.resultTitle.textContent = '아쉬워요!';
      el.resultDesc.textContent = '하트를 모두 잃었어요. 다시 도전해봐요!';
    }

    el.statTime.textContent = formatTime(state.seconds);
    el.statMistakes.textContent = state.mistakes;
    el.statHints.textContent = state.hintsUsed;

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
