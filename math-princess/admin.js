(() => {
  'use strict';

  // 이 PIN은 평범한 가족용 콘텐츠 대시보드를 위한 가벼운 잠금장치일 뿐,
  // 소스가 그대로 노출되는 정적 페이지 특성상 실제 보안 경계가 아니다
  // (개발자 도구로 누구나 이 값을 볼 수 있음). 민감한 정보를 다루지 않는
  // 콘텐츠 열람 전용 페이지이므로 이 정도 수준으로 충분하다.
  const ADMIN_PIN = '000001';
  const SESSION_KEY = 'math-princess-admin-unlocked';

  const P = window.MathPrincessProblems;
  const SUBJ = window.MathPrincessSubjects;
  const SC = window.MathPrincessScenarios;
  const E = window.MathPrincessEndings;
  const Engine = window.MathPrincessEngine.createEngine({ P, SUBJ, SC, E });
  const CM = window.MathPrincessCompetencyModel;

  const el = {
    screens: {
      pin: document.getElementById('screen-pin'),
      dashboard: document.getElementById('screen-dashboard'),
    },
    pinCard: document.getElementById('pin-card'),
    pinDots: document.getElementById('pin-dots'),
    pinError: document.getElementById('pin-error'),
    pinKeypad: document.getElementById('pin-keypad'),
    btnLock: document.getElementById('btn-lock'),
    overviewCards: document.getElementById('overview-cards'),
    designNotes: document.getElementById('design-notes'),
    matrix: document.getElementById('coverage-matrix'),
    subjectList: document.getElementById('subject-list'),
    certList: document.getElementById('cert-list'),
    activityList: document.getElementById('activity-list'),
    etiquetteFilter: document.getElementById('etiquette-filter'),
    etiquetteList: document.getElementById('etiquette-list'),
    creativityFilter: document.getElementById('creativity-filter'),
    creativityList: document.getElementById('creativity-list'),
    faithFilter: document.getElementById('faith-filter'),
    faithList: document.getElementById('faith-list'),
    scenarioList: document.getElementById('scenario-list'),
    learningList: document.getElementById('learning-list'),
  };

  function showScreen(name) {
    Object.values(el.screens).forEach((s) => s.classList.remove('active'));
    el.screens[name].classList.add('active');
  }

  /* ---------------- PIN 로그인 ---------------- */

  let pinBuffer = '';

  function renderPinDots() {
    el.pinDots.innerHTML = Array.from({ length: 6 }, (_, i) => `<span class="pin-dot${i < pinBuffer.length ? ' filled' : ''}"></span>`).join('');
  }

  function resetPinInput() {
    pinBuffer = '';
    renderPinDots();
  }

  function checkPin() {
    if (pinBuffer === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, '1');
      el.pinError.textContent = '';
      resetPinInput();
      unlockDashboard();
      return;
    }
    el.pinError.textContent = 'PIN이 올바르지 않아요';
    el.pinCard.classList.remove('shake');
    void el.pinCard.offsetWidth; // 애니메이션 재시작을 위한 강제 리플로우
    el.pinCard.classList.add('shake');
    resetPinInput();
  }

  el.pinKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.pin-key');
    if (!btn) return;
    const key = btn.dataset.key;
    if (key === 'erase') {
      pinBuffer = pinBuffer.slice(0, -1);
      renderPinDots();
    } else if (key === 'submit') {
      checkPin();
    } else if (pinBuffer.length < 6) {
      pinBuffer += key;
      renderPinDots();
      if (pinBuffer.length === 6) checkPin();
    }
  });

  el.btnLock.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    resetPinInput();
    showScreen('pin');
  });

  function unlockDashboard() {
    renderDashboard();
    showScreen('dashboard');
  }

  /* ---------------- 렌더링 헬퍼 ---------------- */

  function sumBank(bank) {
    return Object.values(bank).reduce((sum, items) => sum + items.length, 0);
  }

  function competencyChips(ids) {
    return `<div class="admin-card-meta">${(ids || []).map((id) => {
      const c = CM.competencyById(id);
      if (!c) return '';
      return `<span class="tag-chip" style="background:${c.color}33;color:${c.color}">${c.emoji} ${c.name}</span>`;
    }).join('')}</div>`;
  }

  /* ---------------- 개요 ---------------- */

  function renderOverview() {
    const englishBankTotal = sumBank(SUBJ.ENGLISH_BANK);
    const scienceBankTotal = sumBank(SUBJ.SCIENCE_BANK);
    const vocabBankTotal = sumBank(SUBJ.ENGLISH_VOCAB_BANK);
    const etiquetteTotal = Engine.ETIQUETTE_QUESTIONS.length;
    const creativityTotal = Engine.CREATIVITY_PUZZLE_BANK.length;
    const faithTotal = Engine.FAITH_QUESTIONS.length;
    const scenarioTotal = SC.SCENARIOS.length;
    const scenarioQuizTotal = SC.SCENARIOS.reduce((sum, s) => sum + (s.quiz ? s.quiz.bank.length : 0), 0);
    const cards = [
      { value: `${P.LEVELS.length}단계`, label: '수학 (생성기 기반, 무한 변형)' },
      { value: `${englishBankTotal}개`, label: `영어 학습 문제 은행 (${SUBJ.ENGLISH_LEVELS.length}레벨)` },
      { value: `${scienceBankTotal}개`, label: `과학 학습 문제 은행 (${SUBJ.SCIENCE_LEVELS.length}레벨)` },
      { value: `${vocabBankTotal}개`, label: '영어 인증 전용 단어-뜻 은행' },
      { value: `${etiquetteTotal}개`, label: '연회 예절 · 상황판단 문제' },
      { value: `${creativityTotal}개`, label: '창의력 올림피아드 문제' },
      { value: `${faithTotal}개`, label: '기도와 선행 문제' },
      { value: `${scenarioTotal}편`, label: `시나리오 (문제 ${scenarioQuizTotal}개 포함)` },
      { value: `${CM.CORE_COMPETENCIES.length}개`, label: '핵심역량 축' },
      { value: `${CM.JUDGMENT_CATEGORIES.length}개`, label: '상황판단·사고력 유형' },
    ];
    el.overviewCards.innerHTML = cards.map((c) => `
      <div class="overview-card">
        <div class="overview-card-value">${c.value}</div>
        <div class="overview-card-label">${c.label}</div>
      </div>`).join('');
  }

  /* ---------------- 설계 노트 ---------------- */

  function renderDesignNotes() {
    el.designNotes.innerHTML = `
      <p>이 게임은 단순히 문제를 푸는 도구가 아니라, 초등/중학생이 갖춰야 할 <b>역량(competency)</b>·<b>지식(knowledge)</b>·<b>상황판단 능력(situational judgment)</b>을 함께 기르도록 세 축으로 설계했습니다.</p>
      <ul>
        <li><b>역량 축</b>: 2022 개정 교육과정(교육부) 총론의 6대 핵심역량 — 자기관리, 지식정보처리, 창의적 사고, 심미적 감성, 협력적 소통, 공동체 역량을 그대로 채택했습니다. 한국 초/중학교 교육과정이 실제로 쓰는 분류라 이 게임의 사용자(한국 초/중학생)에게 가장 직접적으로 맞아떨어집니다.</li>
        <li><b>지식 축</b>: 수학/영어/과학 세 과목의 학년별 교과 지식(기존 study/job/기초 과목 인증 시스템).</li>
        <li><b>상황판단·사고력 축</b>: 연회 예절 문제, 창의력 올림피아드 퀴즈, 기도와 선행 문제, 시나리오 선택지처럼 "이 상황에서 어떤 행동이 바람직한가" 또는 "어떻게 생각을 확장할까"를 묻는 콘텐츠 전용 축입니다. 인사·식사 예절뿐 아니라 디지털 시민의식, 안전, 갈등해결, 협력과 공정, 다양성 존중, 정직과 책임감, 패턴/유추/공간지각 같은 사고력, 성경 지식·어른 공경·친구 배려·기도하는 마음가짐까지 생활 전반으로 넓혔습니다.</li>
        <li>OECD <a href="https://www.oecd.org/en/about/projects/future-of-education-and-skills-2030.html" target="_blank" rel="noopener">Learning Compass 2030</a>이 제시한 지식·기술·태도·가치를 아우르는 역량 개념과, Romero, Usart &amp; Ott (2015) <a href="https://journals.sagepub.com/doi/10.1177/1555412014548919" target="_blank" rel="noopener">"Can Serious Games Contribute to Developing and Sustaining 21st-Century Skills?"</a> 연구, 그리고 게임 기반 학습이 인지·사회·정서 발달을 함께 촉진할 수 있다는 <a href="https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1307881/full" target="_blank" rel="noopener">2024년 체계적 문헌 고찰</a>을 활동별 역량 태깅의 참고 근거로 삼았습니다.</li>
        <li>아래 매트릭스는 이 세 축이 실제 게임 콘텐츠(과목/활동/예절·창의력·기도와 선행 문제/시나리오)와 어떻게 연결되는지 한눈에 보여줍니다.</li>
      </ul>`;
  }

  /* ---------------- 역량 커버리지 매트릭스 ---------------- */

  function competencyDotsRow(ids) {
    return CM.CORE_COMPETENCIES.map((c) => {
      const has = (ids || []).includes(c.id);
      return `<td>${has ? `<span class="matrix-dot" style="background:${c.color}" title="${c.name}"></span>` : ''}</td>`;
    }).join('');
  }

  function axisHeaderRow(label) {
    return `<tr class="matrix-axis-row"><td colspan="${CM.CORE_COMPETENCIES.length + 1}">${label}</td></tr>`;
  }

  function renderMatrix() {
    const header = `<tr><th>콘텐츠</th>${CM.CORE_COMPETENCIES.map((c) => `<th title="${c.desc}">${c.emoji} ${c.name}</th>`).join('')}</tr>`;
    const rows = [];

    rows.push(axisHeaderRow('📘 지식 축 — 과목'));
    Object.keys(Engine.SUBJECTS).forEach((key) => {
      const tag = CM.SUBJECT_COMPETENCY_TAGS[key];
      rows.push(`<tr><td>${Engine.SUBJECTS[key].name}</td>${competencyDotsRow(tag.competencies)}</tr>`);
    });

    rows.push(axisHeaderRow('🗓️ 활동 축 — 스케줄 활동'));
    Object.keys(Engine.ACTIVITY_DEFS).forEach((key) => {
      const tag = CM.ACTIVITY_COMPETENCY_TAGS[key];
      const def = Engine.ACTIVITY_DEFS[key];
      rows.push(`<tr><td>${def.emoji} ${def.name}</td>${competencyDotsRow(tag.competencies)}</tr>`);
    });

    rows.push(axisHeaderRow('🧭 상황판단·사고력 축 — 예절/창의력/기도와 선행 유형'));
    CM.JUDGMENT_CATEGORIES.forEach((j) => {
      rows.push(`<tr><td>${j.emoji} ${j.id}</td>${competencyDotsRow(j.competencies)}</tr>`);
    });

    rows.push(axisHeaderRow('📖 시나리오 축 — 인물 이야기'));
    SC.SCENARIOS.forEach((s) => {
      const tag = CM.SCENARIO_COMPETENCY_TAGS[s.id] || { competencies: [] };
      rows.push(`<tr><td>${s.entryEmoji} ${s.title}</td>${competencyDotsRow(tag.competencies)}</tr>`);
    });

    rows.push(axisHeaderRow('📜 기초 과목 인증'));
    rows.push(`<tr><td>동/은/금메달 시험</td>${competencyDotsRow(CM.CERT_EXAM_COMPETENCY_TAGS.competencies)}</tr>`);

    el.matrix.innerHTML = header + rows.join('');
  }

  /* ---------------- 과목별 콘텐츠 현황 ---------------- */

  function bankSubjectCard(name, emoji, levels, bank, tag) {
    const total = levels.reduce((sum, l) => sum + (bank[l.id] ? bank[l.id].length : 0), 0);
    const perLevel = levels.map((l) => `Lv.${l.id} ${l.name}: ${bank[l.id] ? bank[l.id].length : 0}개(지능 ${l.unlockIntelligence}+)`).join(' · ');
    return `
      <div class="admin-card">
        <div class="admin-card-title">${emoji} ${name} (총 ${total}문제, ${levels.length}레벨)</div>
        <div class="admin-card-desc">${perLevel}</div>
        <div class="admin-card-desc" style="margin-top:6px;">${tag.note}</div>
        ${competencyChips(tag.competencies)}
      </div>`;
  }

  function renderSubjects() {
    const mathTag = CM.SUBJECT_COMPETENCY_TAGS.math;
    const mathLevels = P.LEVELS.map((l) => `Lv.${l.id} ${l.name}(지능 ${l.unlockIntelligence}+)`).join(' · ');
    const mathCard = `
      <div class="admin-card">
        <div class="admin-card-title">🔢 수학 (${P.LEVELS.length}단계, 생성기 기반)</div>
        <div class="admin-card-desc">문제은행이 아니라 규칙 기반 생성기로 매번 새로운 문제를 만들어 사실상 무한한 변형이 있습니다.</div>
        <div class="admin-card-desc" style="margin-top:6px;">${mathLevels}</div>
        <div class="admin-card-desc" style="margin-top:6px;">${mathTag.note}</div>
        ${competencyChips(mathTag.competencies)}
      </div>`;

    el.subjectList.innerHTML = mathCard
      + bankSubjectCard('영어', '🔤', SUBJ.ENGLISH_LEVELS, SUBJ.ENGLISH_BANK, CM.SUBJECT_COMPETENCY_TAGS.english)
      + bankSubjectCard('과학', '🔬', SUBJ.SCIENCE_LEVELS, SUBJ.SCIENCE_BANK, CM.SUBJECT_COMPETENCY_TAGS.science);
  }

  /* ---------------- 기초 과목 인증 ---------------- */

  function renderCert() {
    el.certList.innerHTML = Engine.MEDAL_TIERS.map((t) => `
      <div class="admin-card">
        <div class="admin-card-title">${t.emoji} ${t.name} (요구 레벨 ${t.requiredLevel}, ${t.passCount}/${t.questionCount} 이상 합격)</div>
        <div class="admin-card-desc">수학·과학은 각 과목의 study 문제은행에서, 영어는 전용 단어-뜻 짝짓기 은행(레벨 ${t.requiredLevel})에서 출제됩니다.</div>
        ${competencyChips(CM.CERT_EXAM_COMPETENCY_TAGS.competencies)}
      </div>`).join('');
  }

  /* ---------------- 활동별 역량 태그 ---------------- */

  function renderActivities() {
    el.activityList.innerHTML = Object.entries(Engine.ACTIVITY_DEFS).map(([key, def]) => {
      const tag = CM.ACTIVITY_COMPETENCY_TAGS[key];
      return `
        <div class="admin-card">
          <div class="admin-card-title">${def.emoji} ${def.name}</div>
          ${competencyChips(tag.competencies)}
        </div>`;
    }).join('');
  }

  /* ---------------- 고정 문제 은행 브라우저(연회 예절/창의력/기도와 선행 공용) ---------------- */

  // 세 문제 은행(연회 예절, 창의력 올림피아드, 기도와 선행) 모두 "category
  // 필드로 태깅된 flat 배열"이라는 같은 모양이라, 필터 칩 + 카드 목록
  // 렌더링 로직을 한 번만 만들어 재사용한다.
  function createBankBrowser(bank, filterEl, listEl) {
    let filter = '';
    function renderFilter() {
      const categories = CM.JUDGMENT_CATEGORIES.filter((j) => bank.some((q) => q.category === j.id));
      const allBtn = `<button class="filter-chip${filter === '' ? ' active' : ''}" data-cat="">전체(${bank.length})</button>`;
      const catBtns = categories.map((j) => {
        const count = bank.filter((q) => q.category === j.id).length;
        return `<button class="filter-chip${filter === j.id ? ' active' : ''}" data-cat="${j.id}">${j.emoji} ${j.id}(${count})</button>`;
      }).join('');
      filterEl.innerHTML = allBtn + catBtns;
    }
    function renderList() {
      const items = bank.filter((q) => !filter || q.category === filter);
      listEl.innerHTML = items.map((q) => {
        const cat = CM.judgmentCategoryById(q.category);
        return `
          <div class="admin-card" data-question-id="${q.id}">
            <div class="admin-card-title">${cat ? cat.emoji : ''} ${q.question}</div>
            <div class="admin-card-desc">정답: ${q.answer} · ${q.explanation}</div>
            <div class="admin-card-meta">
              <span class="tag-chip">${q.category}</span>
            </div>
            ${competencyChips(cat ? cat.competencies : [])}
          </div>`;
      }).join('');
    }
    filterEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      filter = btn.dataset.cat || '';
      renderFilter();
      renderList();
    });
    return { render: () => { renderFilter(); renderList(); } };
  }

  const etiquetteBrowser = createBankBrowser(Engine.ETIQUETTE_QUESTIONS, el.etiquetteFilter, el.etiquetteList);
  const creativityBrowser = createBankBrowser(Engine.CREATIVITY_PUZZLE_BANK, el.creativityFilter, el.creativityList);
  const faithBrowser = createBankBrowser(Engine.FAITH_QUESTIONS, el.faithFilter, el.faithList);

  /* ---------------- 시나리오 ---------------- */

  function renderScenarios() {
    el.scenarioList.innerHTML = SC.SCENARIOS.map((s) => {
      const tag = CM.SCENARIO_COMPETENCY_TAGS[s.id] || { competencies: [], theme: '(미태깅)' };
      const questionCount = s.quiz ? s.quiz.bank.length : 0;
      return `
        <div class="admin-card" data-scenario-id="${s.id}">
          <div class="admin-card-title">${s.entryEmoji} ${s.title} <span class="level-badge">${s.arc}</span></div>
          <div class="admin-card-desc">인물: ${s.npcId || '없음'} · 유형: ${s.type} · ${questionCount ? `문제 ${questionCount}개` : '문제 없음(순수 서사)'} · 주제: ${tag.theme}</div>
          ${competencyChips(tag.competencies)}
        </div>`;
    }).join('');
  }

  /* ---------------- 학습 현황(오답 로그) ---------------- */

  // 이 브라우저의 실제 저장 데이터(script.js와 같은 localStorage 키)를 읽어
  // 온다. 콘텐츠 브라우저인 이 페이지의 다른 섹션과 달리, 여기만 유일하게
  // "지금 이 아이가 실제로 어떻게 하고 있는지"를 보여준다.
  function loadRealSaveState() {
    let raw;
    try {
      raw = localStorage.getItem(Engine.SAVE_KEY);
    } catch (e) {
      return null;
    }
    if (!raw) return null;
    try {
      return Engine.migrateLoadedState(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function renderLearning() {
    const state = loadRealSaveState();
    if (!state) {
      el.learningList.innerHTML = `<div class="admin-card-desc">아직 이 브라우저에서 게임을 이어한 기록이 없어요. 아이가 플레이한 뒤 이 페이지를 새로고침하면 여기 표시됩니다.</div>`;
      return;
    }
    el.learningList.innerHTML = Engine.CERT_SUBJECT_KEYS.map((subjectKey) => {
      const log = state.learningLog[subjectKey];
      const subjectName = Engine.SUBJECTS[subjectKey].name;
      const levels = Object.keys(log.byLevel).map(Number).sort((a, b) => a - b);
      const levelRows = levels.map((level) => {
        const { correct, wrong } = log.byLevel[level];
        const total = correct + wrong;
        const accuracy = total ? Math.round((correct / total) * 100) : 0;
        const weak = total >= 3 && accuracy < 60;
        return `<div class="admin-card-desc"${weak ? ' style="color:#e0685f;font-weight:700;"' : ''}>레벨 ${level}: 정답 ${correct} · 오답 ${wrong} (정답률 ${accuracy}%)${weak ? ' — 약한 부분일 수 있어요' : ''}</div>`;
      }).join('');
      const mistakeRows = log.recentMistakes.slice(0, 5).map((m) => `<div class="admin-card-desc">· [레벨 ${m.level}, ${m.turn}턴] ${m.question}</div>`).join('');
      return `
        <div class="admin-card">
          <div class="admin-card-title">${subjectName}</div>
          ${levels.length ? levelRows : '<div class="admin-card-desc">아직 이 과목의 학습 기록이 없어요.</div>'}
          ${log.recentMistakes.length ? `<div class="admin-card-title" style="margin-top:8px;font-size:13px;">최근 오답</div>${mistakeRows}` : ''}
        </div>`;
    }).join('');
  }

  /* ---------------- 초기화 ---------------- */

  function renderDashboard() {
    renderOverview();
    renderLearning();
    renderDesignNotes();
    renderMatrix();
    renderSubjects();
    renderCert();
    renderActivities();
    etiquetteBrowser.render();
    creativityBrowser.render();
    faithBrowser.render();
    renderScenarios();
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    unlockDashboard();
  } else {
    renderPinDots();
  }
})();
