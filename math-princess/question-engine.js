/*
 * 질문 엔진 (순수 로직, DOM 의존 없음)
 *
 * "다음에 어떤 문제를 낼지"만 담당한다 — 과목/레벨을 고르고, 문제를
 * 생성하고, 이미 나온 문제를 피하는 로직. 정답/오답에 대한 보상(골드/스탯
 * 증감)은 다루지 않는다(그건 reward-engine.js의 역할).
 *
 * game-engine.js가 problems.js/subjects.js/scenarios.js를 주입해서
 * createQuestionEngine({ P, SUBJ })로 만들어 쓴다.
 */
(function (root) {
  'use strict';

  function createQuestionEngine(deps) {
    const P = deps.P;
    const SUBJ = deps.SUBJ;

    const SUBJECTS = {
      math: { name: '수학', isLevelUnlocked: P.isLevelUnlocked, generateProblem: P.generateProblem, maxLevel: 10 },
      english: { name: '영어', isLevelUnlocked: SUBJ.isEnglishLevelUnlocked, generateProblem: SUBJ.generateEnglishProblem, maxLevel: 4 },
      science: { name: '과학', isLevelUnlocked: SUBJ.isScienceLevelUnlocked, generateProblem: SUBJ.generateScienceProblem, maxLevel: 4 },
    };
    const SUBJECT_KEYS = Object.keys(SUBJECTS);

    // 과목별 문제 대신 고정된 문제 은행에서 뽑는 세션 유형(연회 예절 문제).
    const MULTI_SUBJECT_TYPES = ['study', 'job', 'exercise-bonus', 'rest-bonus', 'laundry-bonus', 'garden-bonus'];

    const ETIQUETTE_QUESTIONS = [
      { question: '연회장에 들어갈 때 가장 예의바른 행동은 무엇일까요?', choices: ['조용히 미소지으며 인사하기', '큰 소리로 부르기', '먼저 앉아서 기다리기', '음식부터 먹기'], answer: '조용히 미소지으며 인사하기', explanation: '들어갈 때는 밝게 미소지으며 조용히 인사하는 게 기본 예절이에요.' },
      { question: '식사할 때 나이프와 포크는 어떻게 사용해야 할까요?', choices: ['왼손 포크, 오른손 나이프로 조용히', '아무 손이나 편한 대로', '손으로 집어서 먹기', '포크로 소리 내며 먹기'], answer: '왼손 포크, 오른손 나이프로 조용히', explanation: '나이프와 포크는 소리 나지 않게, 왼손 포크·오른손 나이프로 사용해요.' },
      { question: '다른 사람이 이야기하고 있을 때 나는 어떻게 해야 할까요?', choices: ['끝까지 귀 기울여 듣는다', '말을 끊고 내 얘기를 한다', '휴대폰을 본다', '딴 곳을 본다'], answer: '끝까지 귀 기울여 듣는다', explanation: '상대방의 말이 끝날 때까지 귀 기울여 듣는 것이 대화의 기본 예절이에요.' },
      { question: '누군가를 처음 만나 인사할 때 가장 좋은 태도는?', choices: ['눈을 마주치고 미소지으며 인사한다', '고개를 푹 숙이고 아무 말 안 한다', '뒤돌아선다', '손을 흔들지 않고 지나간다'], answer: '눈을 마주치고 미소지으며 인사한다', explanation: '눈을 맞추고 밝게 미소지으며 인사하면 좋은 첫인상을 줄 수 있어요.' },
      { question: '차를 마시는 다과회에서 지켜야 할 예절은?', choices: ['조용히 한 모금씩 마신다', '소리 내며 후루룩 마신다', '단숨에 들이켠다', '차를 흘리며 마신다'], answer: '조용히 한 모금씩 마신다', explanation: '차는 소리 내지 않고 천천히, 한 모금씩 마시는 것이 예의랍니다.' },
      { question: '누군가 나에게 친절을 베풀었을 때 해야 할 말은?', choices: ['"고맙습니다"라고 인사한다', '아무 말도 하지 않는다', '그냥 지나간다', '표정을 찡그린다'], answer: '"고맙습니다"라고 인사한다', explanation: '고마운 마음은 꼭 말로 표현하는 게 좋은 예절이에요.' },
      { question: '약속 시간에 대한 예절로 알맞은 것은?', choices: ['약속 시간에 맞춰 도착한다', '많이 늦어도 상관없다', '아무 때나 간다', '못 갈 땐 말 안 해도 된다'], answer: '약속 시간에 맞춰 도착한다', explanation: '시간 약속을 지키는 것은 상대방을 존중하는 기본 예절이에요.' },
      { question: '실수로 다른 사람의 발을 밟았을 때는?', choices: ['바로 "미안합니다"라고 사과한다', '못 본 척한다', '웃고 넘어간다', '오히려 화를 낸다'], answer: '바로 "미안합니다"라고 사과한다', explanation: '실수했을 때는 바로 진심으로 사과하는 것이 예의예요.' },
    ];

    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function randChoice(arr) { return arr[randInt(0, arr.length - 1)]; }
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function subjectName(key) { return SUBJECTS[key].name; }

    // 현재 지능으로 어떤 과목의 어떤 레벨까지 풀 수 있는지 확인한다.
    function unlockedLevelsFor(intelligence, subjectKey) {
      const subj = SUBJECTS[subjectKey];
      const ids = [];
      for (let i = 1; i <= subj.maxLevel; i++) {
        if (subj.isLevelUnlocked(i, intelligence)) ids.push(i);
      }
      return ids;
    }

    function typicalStudyLevel(intelligence) {
      const unlocked = unlockedLevelsFor(intelligence, 'math');
      return unlocked.length ? unlocked[unlocked.length - 1] : 1;
    }

    // 과목은 무작위로, 레벨은 방금 해금된 것 위주(최근 3개)로 뽑아 너무 쉬운
    // 문제만 반복되지 않게 한다.
    function pickRandomSubjectAndLevel(intelligence) {
      const subjectKey = randChoice(SUBJECT_KEYS);
      const unlocked = unlockedLevelsFor(intelligence, subjectKey);
      const recentBand = unlocked.slice(-3);
      const level = randChoice(recentBand.length ? recentBand : [1]);
      return { subject: subjectKey, level };
    }

    function pickRandomSubjectLevel1() {
      return { subject: randChoice(SUBJECT_KEYS), level: 1 };
    }

    function generateEtiquetteQuestion(session) {
      const remaining = ETIQUETTE_QUESTIONS.filter((q) => !session.askedQuestions.includes(q.question));
      const pool = remaining.length ? remaining : ETIQUETTE_QUESTIONS;
      const picked = randChoice(pool);
      session.askedQuestions.push(picked.question);
      return { type: 'choice', question: picked.question, choices: shuffle(picked.choices), answer: picked.answer, explanation: picked.explanation, rewardGold: 0, level: 0 };
    }

    // session.hint가 true면(인물과 충분히 친해졌을 때) 오답 보기 하나를 미리
    // 지워줘서 문제를 살짝 쉽게 만든다 — 친밀한 사이일수록 상대가 은근히
    // 힌트를 주는 느낌을 낸다.
    function generateScenarioQuestion(session) {
      const bank = session.scenario.quiz.bank;
      const remaining = bank.filter((q) => !session.askedQuestions.includes(q.question));
      const pool = remaining.length ? remaining : bank;
      const picked = randChoice(pool);
      session.askedQuestions.push(picked.question);
      let choices = picked.choices;
      if (session.hint && choices.length > 2) {
        const wrongChoices = choices.filter((c) => c !== picked.answer);
        const removed = randChoice(wrongChoices);
        choices = choices.filter((c) => c !== removed);
      }
      return { type: 'choice', question: picked.question, choices: shuffle(choices), answer: picked.answer, explanation: picked.explanation, rewardGold: 0, level: 0 };
    }

    // 세션 유형에 맞는 다음 문제를 만든다(UI는 이 결과로 화면만 그리면 된다).
    // 필요하면 session.currentSubject를 채워준다(표시용 과목 이름을 UI가 알 수 있도록).
    function generateNextProblem(intelligence, session) {
      if (session.type === 'banquet') return generateEtiquetteQuestion(session);
      if (session.type === 'scenario-quiz') return generateScenarioQuestion(session);
      if (MULTI_SUBJECT_TYPES.includes(session.type)) {
        const picked = session.type === 'job' ? pickRandomSubjectLevel1() : pickRandomSubjectAndLevel(intelligence);
        session.currentSubject = picked.subject;
        return SUBJECTS[picked.subject].generateProblem(picked.level);
      }
      return P.generateProblem(session.level);
    }

    return {
      SUBJECTS, SUBJECT_KEYS, MULTI_SUBJECT_TYPES, ETIQUETTE_QUESTIONS,
      randInt, randChoice, shuffle,
      subjectName, unlockedLevelsFor, typicalStudyLevel,
      pickRandomSubjectAndLevel, pickRandomSubjectLevel1,
      generateEtiquetteQuestion, generateScenarioQuestion, generateNextProblem,
    };
  }

  const api = { createQuestionEngine };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessQuestionEngine = api;
  }
})(typeof window !== 'undefined' ? window : null);
