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
      math: { name: '수학', isLevelUnlocked: P.isLevelUnlocked, generateProblem: P.generateProblem, maxLevel: 9 },
      english: { name: '영어', isLevelUnlocked: SUBJ.isEnglishLevelUnlocked, generateProblem: SUBJ.generateEnglishProblem, maxLevel: 8 },
      science: { name: '과학', isLevelUnlocked: SUBJ.isScienceLevelUnlocked, generateProblem: SUBJ.generateScienceProblem, maxLevel: 4 },
    };
    const SUBJECT_KEYS = Object.keys(SUBJECTS);

    // 과목별 문제 대신 고정된 문제 은행에서 뽑는 세션 유형(연회 예절 문제).
    const MULTI_SUBJECT_TYPES = ['study', 'job', 'exercise-bonus', 'rest-bonus', 'laundry-bonus', 'garden-bonus'];

    // 각 문제의 category는 상황판단(situational judgment) 유형 태그로,
    // competency-model.js가 이 값을 읽어 어떤 역량과 연결되는지 관리자
    // 페이지에서 보여준다(게임 로직 자체는 이 필드를 쓰지 않음).
    const ETIQUETTE_QUESTIONS = [
      { id: 'greet-entrance', category: '인사예절', question: '연회장에 들어갈 때 가장 예의바른 행동은 무엇일까요?', choices: ['조용히 미소지으며 인사하기', '큰 소리로 부르기', '먼저 앉아서 기다리기', '음식부터 먹기'], answer: '조용히 미소지으며 인사하기', explanation: '들어갈 때는 밝게 미소지으며 조용히 인사하는 게 기본 예절이에요.', hint: '좋은 첫인상은 어떤 표정과 목소리 크기에서 나올까요? 다른 사람을 배려하는 조용하고 다정한 태도를 떠올려보세요.' },
      { id: 'table-manners', category: '식사예절', question: '식사할 때 나이프와 포크는 어떻게 사용해야 할까요?', choices: ['왼손 포크, 오른손 나이프로 조용히', '아무 손이나 편한 대로', '손으로 집어서 먹기', '포크로 소리 내며 먹기'], answer: '왼손 포크, 오른손 나이프로 조용히', explanation: '나이프와 포크는 소리 나지 않게, 왼손 포크·오른손 나이프로 사용해요.', hint: '서양식 식사 예절에서는 양손을 각각 다르게 써요. 어느 손에 무엇을 쥐고, 소리는 얼마나 내야 할지 생각해보세요.' },
      { id: 'active-listening', category: '경청예절', question: '다른 사람이 이야기하고 있을 때 나는 어떻게 해야 할까요?', choices: ['끝까지 귀 기울여 듣는다', '말을 끊고 내 얘기를 한다', '휴대폰을 본다', '딴 곳을 본다'], answer: '끝까지 귀 기울여 듣는다', explanation: '상대방의 말이 끝날 때까지 귀 기울여 듣는 것이 대화의 기본 예절이에요.', hint: "대화의 기본은 '경청'이에요. 상대방의 말을 존중하는 태도가 무엇일지 떠올려보세요." },
      { id: 'first-impression', category: '인사예절', question: '누군가를 처음 만나 인사할 때 가장 좋은 태도는?', choices: ['눈을 마주치고 미소지으며 인사한다', '고개를 푹 숙이고 아무 말 안 한다', '뒤돌아선다', '손을 흔들지 않고 지나간다'], answer: '눈을 마주치고 미소지으며 인사한다', explanation: '눈을 맞추고 밝게 미소지으며 인사하면 좋은 첫인상을 줄 수 있어요.', hint: '좋은 첫인상을 남기려면 표정과 시선 처리가 중요해요. 상대와 눈을 마주치는 것과 피하는 것 중 무엇이 더 예의 바를까요?' },
      { id: 'tea-manners', category: '식사예절', question: '차를 마시는 다과회에서 지켜야 할 예절은?', choices: ['조용히 한 모금씩 마신다', '소리 내며 후루룩 마신다', '단숨에 들이켠다', '차를 흘리며 마신다'], answer: '조용히 한 모금씩 마신다', explanation: '차는 소리 내지 않고 천천히, 한 모금씩 마시는 것이 예의랍니다.', hint: '차를 마실 때는 급하게 마시지 않아요. 소리와 속도를 생각하며 우아하게 마시는 방법을 떠올려보세요.' },
      { id: 'gratitude', category: '감사와배려', question: '누군가 나에게 친절을 베풀었을 때 해야 할 말은?', choices: ['"고맙습니다"라고 인사한다', '아무 말도 하지 않는다', '그냥 지나간다', '표정을 찡그린다'], answer: '"고맙습니다"라고 인사한다', explanation: '고마운 마음은 꼭 말로 표현하는 게 좋은 예절이에요.', hint: '누군가 나를 도와줬을 때 마음을 표현하는 말이 있어요. 짧고 따뜻한 인사말을 떠올려보세요.' },
      { id: 'punctuality', category: '시간약속', question: '약속 시간에 대한 예절로 알맞은 것은?', choices: ['약속 시간에 맞춰 도착한다', '많이 늦어도 상관없다', '아무 때나 간다', '못 갈 땐 말 안 해도 된다'], answer: '약속 시간에 맞춰 도착한다', explanation: '시간 약속을 지키는 것은 상대방을 존중하는 기본 예절이에요.', hint: '약속은 상대방과의 신뢰를 지키는 일이에요. 시간을 대하는 어떤 태도가 신뢰를 줄 수 있을지 생각해보세요.' },
      { id: 'apology', category: '사과와배려', question: '실수로 다른 사람의 발을 밟았을 때는?', choices: ['바로 "미안합니다"라고 사과한다', '못 본 척한다', '웃고 넘어간다', '오히려 화를 낸다'], answer: '바로 "미안합니다"라고 사과한다', explanation: '실수했을 때는 바로 진심으로 사과하는 것이 예의예요.', hint: '실수를 했을 때 가장 먼저, 그리고 진심으로 해야 하는 말이 있어요. 짧고 정직한 사과의 말을 떠올려보세요.' },
      { id: 'online-privacy', category: '디지털시민의식', question: '온라인 게임이나 채팅에서 모르는 사람이 내 주소나 전화번호를 물어보면?', choices: ['알려주지 않고 어른에게 이야기한다', '친해 보이면 알려준다', '일단 답을 피하고 넘어간다', '내 번호 대신 친구 번호를 알려준다'], answer: '알려주지 않고 어른에게 이야기한다', explanation: '온라인에서 만난 사람에게는 개인정보를 알려주지 않고, 이런 일이 있으면 꼭 부모님이나 선생님께 말씀드려야 해요.', hint: '온라인에서는 상대가 정말 누구인지 알기 어려워요. 나를 지키는 가장 안전한 행동이 무엇일지, 그리고 혼자 판단하기보다 누구에게 알려야 할지 생각해보세요.' },
      { id: 'online-empathy', category: '디지털시민의식', question: '친구가 SNS에서 다른 사람들에게 나쁜 댓글을 받아 속상해할 때 나는?', choices: ['위로해주고 함께 방법을 찾아본다', '재미있는 일이니 그냥 웃어넘긴다', '나도 같이 나쁜 댓글을 남긴다', '못 본 척한다', '더 놀린다'], answer: '위로해주고 함께 방법을 찾아본다', explanation: '온라인에서도 현실처럼 서로를 배려해야 하고, 힘든 친구에게는 공감하고 도와주는 태도가 필요해요.', hint: '온라인 공간이라도 사람의 마음은 똑같이 다칠 수 있어요. 친구가 힘들어할 때 가장 필요한 건 무엇일까요?' },
      { id: 'help-fallen', category: '안전과배려', question: '길을 걷다가 앞에서 넘어진 사람을 봤을 때 가장 먼저 해야 할 행동은?', choices: ['괜찮은지 물어보고 도와준다', '못 본 척 지나간다', '사진을 찍는다', '웃으며 지나간다'], answer: '괜찮은지 물어보고 도와준다', explanation: '다치거나 어려움을 겪는 사람을 보면 먼저 안전을 살피고 도움을 주는 것이 배려예요.', hint: '누군가 다쳤을 수도 있는 상황이에요. 나라면 어떤 도움을 받고 싶을지 생각하며 행동해보세요.' },
      { id: 'fire-drill', category: '안전', question: '건물 안에서 화재경보음이 울리면 가장 먼저 해야 할 행동은?', choices: ['침착하게 비상구로 대피한다', '엘리베이터를 탄다', '무슨 일인지 구경하러 간다', '짐을 다 챙긴 뒤 천천히 나간다'], answer: '침착하게 비상구로 대피한다', explanation: '화재 시에는 엘리베이터 대신 계단(비상구)으로, 짐보다 몸의 안전을 먼저 생각하며 침착하게 대피해야 해요.', hint: '위급한 상황에서는 무엇보다 안전이 먼저예요. 평소 학교에서 배운 대피 요령을 떠올려보세요(엘리베이터는 위험할 수 있어요).' },
      { id: 'disagree-kindly', category: '갈등해결', question: '친구와 의견이 다를 때 가장 바람직한 태도는?', choices: ['서로 이야기를 나누며 타협점을 찾는다', '내 의견만 계속 주장한다', '화를 내고 자리를 떠난다', '무조건 친구 의견을 따른다'], answer: '서로 이야기를 나누며 타협점을 찾는다', explanation: '의견이 다를 때는 서로의 생각을 들어보고 함께 좋은 답을 찾아가는 대화가 중요해요.', hint: "의견 차이는 나쁜 게 아니에요. 이럴 때 필요한 건 '누가 이기느냐'가 아니라 무엇일지 생각해보세요." },
      { id: 'fair-roles', category: '협력과공정', question: '모둠 활동에서 역할을 나눌 때 가장 바람직한 방법은?', choices: ['서로 의논해서 공평하게 나눈다', '힘센 사람이 정한다', '가위바위보로만 정하고 불만은 무시한다', '아무도 하기 싫은 일은 안 한다'], answer: '서로 의논해서 공평하게 나눈다', explanation: '모둠 활동에서는 서로의 의견을 듣고 역할을 공평하게 나누는 것이 협력의 기본이에요.', hint: '함께하는 활동에서는 한 사람만 힘들거나 편해지지 않는 게 중요해요. 모두가 납득할 수 있는 방법이 무엇일지 생각해보세요.' },
      { id: 'respect-diversity', category: '다양성존중', question: '나와 다른 문화나 배경을 가진 친구를 대할 때 가장 바람직한 태도는?', choices: ['다름을 이해하고 존중한다', '이상하다고 놀린다', '같이 어울리지 않는다', '내 방식만 따르라고 한다'], answer: '다름을 이해하고 존중한다', explanation: '사람마다 자라온 환경과 문화가 다를 수 있고, 그 차이를 이해하고 존중하는 태도가 중요해요.', hint: '나와 다르다고 해서 틀린 것은 아니에요. 서로 다른 점을 어떻게 바라보는 게 좋을지 생각해보세요.' },
      { id: 'litter-responsibility', category: '환경과공공질서', question: '쓰레기를 버리려는데 근처에 쓰레기통이 안 보일 때 가장 바람직한 행동은?', choices: ['쓰레기통을 찾을 때까지 가지고 있는다', '아무 데나 놓고 간다', '나무 밑에 숨겨둔다', '남이 안 볼 때 버린다'], answer: '쓰레기통을 찾을 때까지 가지고 있는다', explanation: '쓰레기통이 없다고 아무 데나 버리면 안 되고, 찾을 때까지 가지고 있는 책임감이 필요해요.', hint: '지금 당장 편하자고 한 행동이 나중에 다른 사람이나 환경에 피해를 줄 수 있어요. 조금 불편해도 지켜야 할 규칙을 떠올려보세요.' },
      { id: 'public-quiet', category: '환경과공공질서', question: '도서관이나 극장 같은 공공장소에서 지켜야 할 예절은?', choices: ['조용히 하고 다른 사람을 배려한다', '큰 소리로 통화한다', '음식을 소리 내며 먹는다', '뛰어다닌다'], answer: '조용히 하고 다른 사람을 배려한다', explanation: '공공장소는 여러 사람이 함께 쓰는 곳이라, 다른 사람에게 방해가 되지 않도록 조용히 행동해야 해요.', hint: '나 혼자 있는 공간이 아니에요. 다른 사람들도 편안하게 지내려면 내가 어떻게 행동해야 할지 생각해보세요.' },
      { id: 'honest-mistake', category: '정직과책임감', question: '실수로 친구의 물건을 망가뜨렸을 때 가장 바람직한 행동은?', choices: ['솔직히 말하고 사과한다', '모르는 척한다', '몰래 숨겨둔다', '다른 사람 탓을 한다'], answer: '솔직히 말하고 사과한다', explanation: '실수를 했을 때는 숨기기보다 솔직하게 말하고 사과하는 것이 신뢰를 지키는 방법이에요.', hint: '숨기면 그 순간은 편할 수 있지만 나중에 신뢰를 잃을 수 있어요. 정직함이 왜 중요한지 생각해보세요.' },
      { id: 'refuse-cheating', category: '정직과책임감', question: '시험 중 친구가 답을 보여달라고 할 때 가장 바람직한 행동은?', choices: ['안 된다고 부드럽게 거절한다', '몰래 보여준다', '선생님 몰래 답을 알려준다', '큰 소리로 화를 낸다'], answer: '안 된다고 부드럽게 거절한다', explanation: '부정행위는 친구를 도와주는 것이 아니라 서로에게 해가 되는 일이므로, 정중하지만 분명하게 거절해야 해요.', hint: '진짜 도움은 그 순간만 편하게 해주는 게 아니에요. 정직함을 지키면서도 친구 마음을 상하지 않게 거절하는 방법을 생각해보세요.' },
      { id: 'queue-courage', category: '환경과공공질서', question: '줄을 서 있는데 누군가 새치기를 하는 것을 봤을 때 가장 바람직한 행동은?', choices: ['정중하게 순서를 지켜달라고 말한다', '아무 말도 못 하고 참는다', '큰 소리로 화를 낸다', '나도 새치기를 한다'], answer: '정중하게 순서를 지켜달라고 말한다', explanation: '불편한 상황이라도 예의를 지키며 정중하게 말하는 것이 문제를 해결하는 용기 있는 태도예요.', hint: '화를 내거나 참기만 하는 것 말고, 침착하고 예의 바르게 내 생각을 전달하는 방법을 떠올려보세요.' },
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

    // 레벨은 방금 해금된 것 위주(최근 3개)로 뽑아 너무 쉬운 문제만
    // 반복되지 않게 한다.
    function pickLevelForSubject(intelligence, subjectKey) {
      const unlocked = unlockedLevelsFor(intelligence, subjectKey);
      const recentBand = unlocked.slice(-3);
      return randChoice(recentBand.length ? recentBand : [1]);
    }

    // 과목은 무작위로, 레벨은 방금 해금된 것 위주로 뽑는다.
    function pickRandomSubjectAndLevel(intelligence) {
      const subjectKey = randChoice(SUBJECT_KEYS);
      return { subject: subjectKey, level: pickLevelForSubject(intelligence, subjectKey) };
    }

    function pickRandomSubjectLevel1() {
      return { subject: randChoice(SUBJECT_KEYS), level: 1 };
    }

    function generateEtiquetteQuestion(session) {
      const remaining = ETIQUETTE_QUESTIONS.filter((q) => !session.askedQuestions.includes(q.question));
      const pool = remaining.length ? remaining : ETIQUETTE_QUESTIONS;
      const picked = randChoice(pool);
      session.askedQuestions.push(picked.question);
      return { type: 'choice', question: picked.question, choices: shuffle(picked.choices), answer: picked.answer, explanation: picked.explanation, hint: picked.hint, rewardGold: 0, level: 0 };
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
      return { type: 'choice', question: picked.question, choices: shuffle(choices), answer: picked.answer, explanation: picked.explanation, hint: picked.hint, rewardGold: 0, level: 0 };
    }

    // 세션 유형에 맞는 다음 문제를 만든다(UI는 이 결과로 화면만 그리면 된다).
    // 필요하면 session.currentSubject를 채워준다(표시용 과목 이름을 UI가 알 수 있도록).
    // session.fixedSubject가 있으면(공부 세션) 매 문제 과목을 다시 뽑지 않고
    // 세션 내내 그 과목으로 통일해, "이번엔 수학을 공부한다"처럼 연계성을 준다.
    function generateNextProblem(intelligence, session) {
      if (session.type === 'banquet') return generateEtiquetteQuestion(session);
      if (session.type === 'scenario-quiz') return generateScenarioQuestion(session);
      // 왕국 수학경시대회: 문제마다 미리 정해둔 난이도 사다리(session.levels)를
      // 따라간다(덧셈뺄셈부터 점점 어려워짐), 다른 과목과 섞이지 않는다.
      if (session.type === 'competition') return P.generateProblem(session.levels[session.index]);
      // 기초 과목 등급 인증 시험: 그 과목의 그 등급이 요구하는 레벨로만
      // 출제한다. 영어/과학은 한 레벨당 문제 은행이 6개뿐이라 5문제를 뽑을
      // 때 같은 문제가 반복되기 쉬운데, 한 시험 안에서 같은 문제가 또
      // 나오면 방금 본 설명 때문에 사실상 정답을 아는 채로 다시 풀게 되어
      // 시험의 의미가 옅어진다. generateProblem에 askedQuestions를 넘기면
      // (영어/과학은) 이미 나온 문제를 걸러내고 뽑아주므로 같은 회차
      // 안에서는 반복되지 않는다(수학은 절차적으로 생성되어 이 인자를 쓰지
      // 않지만 넘겨도 무해하다).
      if (session.type === 'cert-exam') {
        // 영어 인증 시험만 문법이 아니라 "단어 - 뜻 짝지어 맞추기" 형식으로 낸다.
        const problem = session.subject === 'english'
          ? SUBJ.generateEnglishVocabMatchProblem(session.tier.requiredLevel, session.askedQuestions)
          : SUBJECTS[session.subject].generateProblem(session.tier.requiredLevel, session.askedQuestions);
        session.askedQuestions.push(problem.question);
        return problem;
      }
      if (MULTI_SUBJECT_TYPES.includes(session.type)) {
        let picked;
        if (session.type === 'job') picked = pickRandomSubjectLevel1();
        else if (session.fixedSubject) picked = { subject: session.fixedSubject, level: pickLevelForSubject(intelligence, session.fixedSubject) };
        else picked = pickRandomSubjectAndLevel(intelligence);
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
