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
      science: { name: '과학', isLevelUnlocked: SUBJ.isScienceLevelUnlocked, generateProblem: SUBJ.generateScienceProblem, maxLevel: 7 },
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

    // "창의력 올림피아드" 전용 문제 은행. 수학처럼 절차적으로 생성하기 어려운
    // 유형(패턴 찾기/유추/공간지각/창의적 사고 퀴즈)이라 연회 예절처럼 고정
    // 은행에서 뽑는다. category는 관리자 페이지가 역량 모델과 연결할 때 쓴다.
    const CREATIVITY_PUZZLE_BANK = [
      { id: 'pattern-powers-of-2', category: '패턴찾기', question: "2, 4, 8, 16, ? 다음에 올 숫자는 무엇일까요?", choices: ['32', '24', '30', '20'], answer: '32', explanation: '앞의 수에 2를 곱하는 규칙이라 16 다음은 32예요.', hint: '각 숫자가 바로 앞 숫자와 어떤 관계인지 곱셈으로 살펴보세요.' },
      { id: 'pattern-fibonacci', category: '패턴찾기', question: "1, 1, 2, 3, 5, 8, ? 다음에 올 숫자는 무엇일까요?", choices: ['13', '11', '10', '15'], answer: '13', explanation: '바로 앞 두 숫자를 더하면 다음 숫자가 되는 규칙(피보나치 수열)이에요.', hint: '바로 앞의 두 숫자를 더해보면 다음 숫자가 나와요.' },
      { id: 'pattern-korean-letters', category: '패턴찾기', question: "가, 다, 마, 사, ? 다음에 올 글자는 무엇일까요?", choices: ['아', '자', '바', '차'], answer: '아', explanation: "가나다라마바사아 순서에서 하나씩 건너뛴 글자들이라 사 다음은 아예요.", hint: '한글 자음을 순서대로 짚어가며, 하나씩 건너뛰는 규칙을 확인해보세요.' },
      { id: 'pattern-multiples-of-3', category: '패턴찾기', question: "3, 6, 9, 12, ? 다음에 올 숫자는 무엇일까요?", choices: ['15', '14', '16', '18'], answer: '15', explanation: '3씩 커지는 규칙이라 12 다음은 15예요.', hint: '숫자가 몇씩 커지고 있는지 차이를 계산해보세요.' },
      { id: 'analogy-hand-foot', category: '유추', question: "손 : 장갑 = 발 : ?", choices: ['양말', '모자', '목도리', '신발'], answer: '양말', explanation: '손을 감싸는 장갑처럼, 발을 감싸는 것은 양말이에요.', hint: '앞의 관계(손과 장갑)가 어떤 사이인지 먼저 생각하고, 발에 그대로 적용해보세요.' },
      { id: 'analogy-fish-gill', category: '유추', question: "물고기 : 아가미 = 사람 : ?", choices: ['폐', '심장', '위', '간'], answer: '폐', explanation: '물고기가 아가미로 숨을 쉬듯, 사람은 폐로 숨을 쉬어요.', hint: '물고기가 물속에서 숨 쉴 때 쓰는 기관과 같은 역할을 사람의 어느 기관이 하는지 생각해보세요.' },
      { id: 'analogy-tadpole-frog', category: '유추', question: "올챙이 : 개구리 = 애벌레 : ?", choices: ['나비', '거미', '벌', '메뚜기'], answer: '나비', explanation: '올챙이가 자라 개구리가 되듯, 애벌레가 자라면 나비가 돼요.', hint: '올챙이가 자라서 어떤 동물이 되는지 떠올리고, 애벌레도 그렇게 자라서 무엇이 되는지 생각해보세요.' },
      { id: 'analogy-winter-summer', category: '유추', question: "겨울 : 눈 = 여름 : ?", choices: ['장마', '낙엽', '새싹', '서리'], answer: '장마', explanation: '겨울을 대표하는 날씨가 눈이라면, 여름을 대표하는 날씨는 장마(비)예요.', hint: '겨울 하면 떠오르는 날씨처럼, 여름 하면 떠오르는 비 오는 계절을 생각해보세요.' },
      { id: 'spatial-cube-faces', category: '공간지각', question: "정육면체(주사위 모양)의 면은 몇 개일까요?", choices: ['6개', '4개', '8개', '12개'], answer: '6개', explanation: '정육면체는 위아래, 앞뒤, 좌우 여섯 방향에 면이 하나씩 있어 총 6개예요.', hint: '주사위를 떠올려보세요. 숫자가 몇 개의 면에 적혀 있나요?' },
      { id: 'spatial-clock-angle', category: '공간지각', question: "시계가 정확히 3시를 가리킬 때 시침과 분침 사이의 각도는?", choices: ['90도', '60도', '120도', '180도'], answer: '90도', explanation: '3시 정각에는 시침이 3, 분침이 12를 가리켜 정확히 직각(90도)을 이뤄요.', hint: '시계 문자판을 그려서 3과 12 사이가 시계 전체(360도)의 몇 분의 1인지 생각해보세요.' },
      { id: 'spatial-fold-square', category: '공간지각', question: "정사각형 종이를 반으로 두 번 접으면 몇 개의 작은 사각형 칸으로 나뉠까요?", choices: ['4개', '2개', '6개', '8개'], answer: '4개', explanation: '한 번 접으면 2칸, 다시 한 번 더 접으면 그 2칸이 각각 반으로 나뉘어 4칸이 돼요.', hint: '종이를 한 번 접으면 몇 칸이 되는지 먼저 생각하고, 그 상태에서 한 번 더 접으면 어떻게 되는지 떠올려보세요.' },
      { id: 'riddle-bigger-eaten', category: '창의적사고', question: "많이 먹을수록(파낼수록) 더 커지는 것은 무엇일까요?", choices: ['구멍', '풍선', '나무', '빵'], answer: '구멍', explanation: '구멍은 파낼수록(먹을수록) 점점 더 커져요.', hint: '땅이나 벽에 있는, 파낼수록 넓어지는 것을 떠올려보세요.' },
      { id: 'riddle-born-daily', category: '창의적사고', question: "매일 아침 새로 시작되고 매일 밤 사라지는 것은 무엇일까요?", choices: ['하루(오늘)', '꽃', '별', '나비'], answer: '하루(오늘)', explanation: '오늘이라는 하루는 아침에 시작해서 밤에 끝나고, 내일이 되면 또 새로운 하루가 시작돼요.', hint: '달력을 넘길 때마다 반복되는, 아침에 시작해서 밤에 끝나는 시간의 단위를 생각해보세요.' },
      { id: 'riddle-not-wet', category: '창의적사고', question: "물속에 넣어도 절대 젖지 않는 것은 무엇일까요?", choices: ['그림자', '돌', '종이', '나뭇잎'], answer: '그림자', explanation: '그림자는 빛이 만든 것이라 물에 넣어도 젖지 않아요.', hint: '해가 비칠 때 내 몸을 따라다니는, 만질 수 없는 검은 형태를 떠올려보세요.' },
      { id: 'riddle-teeth-no-chew', category: '창의적사고', question: "이빨(살)은 있지만 아무것도 씹지 못하는 것은 무엇일까요?", choices: ['빗', '포크', '수저', '칫솔'], answer: '빗', explanation: '빗의 뾰족한 살들을 이빨에 비유한 표현으로, 머리카락을 빗는 데만 쓰여요.', hint: '머리를 정리할 때 쓰는, 촘촘한 살들이 나란히 있는 물건을 떠올려보세요.' },
      { id: 'riddle-smaller-used', category: '창의적사고', question: "쓸수록(닳을수록) 점점 작아지는 것은 무엇일까요?", choices: ['지우개', '책', '가방', '의자'], answer: '지우개', explanation: '지우개는 쓸 때마다 조금씩 닳아서 점점 작아져요.', hint: '연필로 쓴 글씨를 지울 때 쓰는, 쓰면 쓸수록 닳는 물건을 떠올려보세요.' },
    ];

    // "기도와 선행" 전용 문제 은행. 성경 이야기(쉬운 성경 퀴즈), 어른 공경,
    // 친구를 배려하는 태도, 기도하는 마음가짐을 함께 다룬다. category는
    // 관리자 페이지가 역량 모델과 연결할 때 쓴다.
    const FAITH_QUESTIONS = [
      { id: 'bible-noah-ark', category: '성경퀴즈', question: '하나님이 큰 홍수를 대비해 노아에게 만들라고 하신 것은 무엇일까요?', choices: ['방주(커다란 배)', '피라미드', '높은 탑', '튼튼한 성벽'], answer: '방주(커다란 배)', explanation: '노아는 하나님의 말씀대로 방주를 만들어 가족과 동물들을 홍수에서 구했어요.', hint: '물이 불어나도 안전하게 뜰 수 있는, 나무로 만든 커다란 탈 것을 떠올려보세요.' },
      { id: 'bible-david-goliath', category: '성경퀴즈', question: '다윗은 거인 골리앗과 싸울 때 무엇을 사용했나요?', choices: ['물맷돌', '큰 칼', '활과 화살', '창'], answer: '물맷돌', explanation: '다윗은 칼이나 창 대신 물맷돌(무릿매)로 골리앗을 이겼어요.', hint: '작은 돌을 멀리, 세게 던질 수 있게 해주는 끈으로 된 도구를 떠올려보세요.' },
      { id: 'bible-nativity', category: '성경퀴즈', question: '아기 예수님이 태어나신 곳은 어디였나요?', choices: ['마구간(말구유)', '궁전', '동굴 속 보물창고', '여관방'], answer: '마구간(말구유)', explanation: '여관에 방이 없어서 아기 예수님은 동물들이 지내는 마구간의 구유에서 태어나셨어요.', hint: '동물들이 먹이를 먹는 곳, 여관에 방이 없어서 대신 머물게 된 장소를 떠올려보세요.' },
      { id: 'bible-ten-commandments', category: '성경퀴즈', question: '모세가 산에서 하나님께 받아 이스라엘 백성에게 전한 것은?', choices: ['십계명', '금송아지', '지팡이', '만나'], answer: '십계명', explanation: '모세는 시내산에서 하나님께 십계명이 새겨진 돌판을 받았어요.', hint: '사람들이 지켜야 할 열 가지 중요한 약속(계명)이 새겨진 돌판을 떠올려보세요.' },
      { id: 'bible-jonah-fish', category: '성경퀴즈', question: '요나는 하나님의 말씀을 피해 도망가다가 무엇에게 삼켜졌나요?', choices: ['큰 물고기', '사자', '독수리', '곰'], answer: '큰 물고기', explanation: '요나는 큰 물고기 배 속에서 사흘을 지내며 잘못을 뉘우쳤어요.', hint: '바다에 사는, 사람을 통째로 삼킬 만큼 아주 큰 동물을 떠올려보세요.' },
      { id: 'bible-walk-on-water', category: '성경퀴즈', question: '예수님이 물 위를 걸으실 때, 함께 물 위를 걸어보려 했던 제자는 누구였나요?', choices: ['베드로', '요한', '야고보', '안드레'], answer: '베드로', explanation: '베드로는 예수님처럼 물 위를 걸으려 했지만 무서워서 물에 빠질 뻔했어요.', hint: '예수님의 제자 중 가장 앞장서서 용기를 내는 성격으로 잘 알려진 사람을 떠올려보세요.' },
      { id: 'bible-good-samaritan', category: '성경퀴즈', question: '착한 사마리아인 이야기에서, 강도를 만나 다친 사람을 도와준 사람은 어떤 사람이었나요?', choices: ['지나가던 사마리아 사람', '제사장', '레위 사람', '함께 있던 강도'], answer: '지나가던 사마리아 사람', explanation: '종교 지도자들은 그냥 지나쳤지만, 사마리아 사람이 다친 사람을 정성껏 돌봐주었어요.', hint: '이야기 속에서 다른 사람들은 그냥 지나쳤지만, 끝까지 멈춰서 도와준 낯선 여행자를 떠올려보세요.' },
      { id: 'elder-both-hands', category: '어른공경', question: '어른께 물건을 드릴 때 가장 예의 바른 방법은?', choices: ['두 손으로 공손히 드린다', '한 손으로 휙 던지듯 드린다', '아무렇게나 드린다', '드리지 않고 그냥 놓아둔다'], answer: '두 손으로 공손히 드린다', explanation: '어른께 무언가를 드릴 때는 두 손으로 공손하게 드리는 것이 예의예요.', hint: '소중한 것을 전할 때 손을 몇 개나 쓰는 게 더 정성스러워 보일지 생각해보세요.' },
      { id: 'elder-give-seat', category: '어른공경', question: '버스나 지하철에서 나이 드신 분이 서 계실 때 가장 바람직한 행동은?', choices: ['자리를 양보한다', '못 본 척한다', '자는 척한다', '더 크게 앉아 자리를 넓게 쓴다'], answer: '자리를 양보한다', explanation: '몸이 불편하실 수 있는 어르신께 자리를 양보하는 것은 기본적인 배려예요.', hint: '서 계신 어르신이 힘드실 수 있다는 걸 생각하면, 앉아 있는 내가 할 수 있는 배려가 무엇일지 떠올려보세요.' },
      { id: 'elder-polite-speech', category: '어른공경', question: '어른과 대화할 때 가장 바람직한 태도는?', choices: ['높임말을 쓰고 공손하게 말한다', '반말로 편하게 말한다', '딴청을 피운다', '말을 끊고 내 얘기만 한다'], answer: '높임말을 쓰고 공손하게 말한다', explanation: '어른과 대화할 때는 높임말을 쓰고 예의 바르게 말하는 것이 기본이에요.', hint: '친구와 이야기할 때와 어른과 이야기할 때, 말투가 어떻게 달라져야 할지 생각해보세요.' },
      { id: 'elder-holiday-greeting', category: '어른공경', question: '명절에 어른들께 인사드릴 때 가장 바람직한 행동은?', choices: ['공손하게 인사드린다', '인사 없이 넘어간다', '장난치며 인사한다', '멀리서 손만 흔든다'], answer: '공손하게 인사드린다', explanation: '명절에는 어른들께 예의를 갖춰 공손하게 인사드리는 것이 우리의 전통이에요.', hint: '명절에 온 가족이 모였을 때, 어른들께 정성을 담아 표현하는 인사 방법을 떠올려보세요.' },
      { id: 'elder-listen', category: '어른공경', question: '할머니, 할아버지께서 말씀하실 때 가장 바람직한 태도는?', choices: ['끝까지 귀 기울여 듣는다', '중간에 말을 끊는다', '딴 곳을 본다', '휴대폰을 본다'], answer: '끝까지 귀 기울여 듣는다', explanation: '어르신 말씀을 끝까지 귀 기울여 듣는 것은 존중을 표현하는 방법이에요.', hint: '누군가 나에게 소중한 이야기를 들려줄 때, 내가 어떻게 듣는 게 예의일지 생각해보세요.' },
      { id: 'friend-share-snack', category: '친구배려', question: '친구와 함께 간식을 나눌 때 가장 바람직한 태도는?', choices: ['공평하게 나누거나 친구에게 양보한다', '내가 더 많이 가진다', '나누지 않고 혼자 먹는다', '몰래 숨겨둔다'], answer: '공평하게 나누거나 친구에게 양보한다', explanation: '함께 나누고 때로는 양보하는 마음이 진짜 우정을 키워줘요.', hint: '친구와 함께 있을 때, 나 혼자만 생각하지 않는 마음이 무엇일지 떠올려보세요.' },
      { id: 'friend-compliment', category: '친구배려', question: '친구가 멋진 그림을 그렸을 때 가장 좋은 반응은?', choices: ['진심으로 칭찬해준다', '비웃는다', '무시한다', '더 못 그렸다고 말한다'], answer: '진심으로 칭찬해준다', explanation: '친구의 노력과 재능을 진심으로 칭찬해주면 서로 더 가까워질 수 있어요.', hint: '친구가 열심히 한 일을 봤을 때, 어떤 말을 해주면 친구가 기뻐할지 생각해보세요.' },
      { id: 'friend-encourage-win', category: '친구배려', question: '친구와 게임을 할 때 내가 이기고 있다면 가장 바람직한 태도는?', choices: ['친구를 놀리지 않고 격려한다', '계속 자랑한다', '친구를 놀린다', '억지로 그만하자고 한다'], answer: '친구를 놀리지 않고 격려한다', explanation: '이기고 있을 때일수록 친구를 배려하고 격려하는 마음이 중요해요.', hint: '내가 앞서고 있을 때, 뒤처진 친구의 기분을 생각하면 어떤 태도가 좋을지 떠올려보세요.' },
      { id: 'friend-help-hard-time', category: '친구배려', question: '친구가 힘든 일을 하고 있을 때 가장 바람직한 행동은?', choices: ['먼저 나서서 도와준다', '못 본 척한다', '구경만 한다', '비웃는다'], answer: '먼저 나서서 도와준다', explanation: '친구가 어려울 때 먼저 손을 내밀어 도와주는 것이 진짜 우정이에요.', hint: '친구가 혼자 끙끙대고 있을 때, 내가 먼저 할 수 있는 행동이 무엇일지 생각해보세요.' },
      { id: 'prayer-honest-heart', category: '기도', question: '기도할 때 가장 중요한 마음가짐은 무엇일까요?', choices: ['진실한 마음으로 이야기하듯 하기', '크고 화려한 말만 쓰기', '남에게 보여주기 위해 하기', '빨리 끝내기'], answer: '진실한 마음으로 이야기하듯 하기', explanation: '기도는 화려한 말보다 진실한 마음으로 다가가는 것이 중요해요.', hint: '가장 가까운 사람에게 내 마음을 솔직하게 이야기할 때와 같은 태도를 떠올려보세요.' },
      { id: 'prayer-before-meal', category: '기도', question: '식사 전에 감사 기도를 드리는 이유는 무엇일까요?', choices: ['주신 음식에 감사하는 마음을 표현하려고', '그냥 습관이라서', '다른 사람이 시켜서', '시간을 보내려고'], answer: '주신 음식에 감사하는 마음을 표현하려고', explanation: '식사 전 기도는 우리에게 주어진 음식에 대한 감사를 표현하는 시간이에요.', hint: '맛있는 음식을 먹기 전에, 그 음식이 어디서 왔는지 떠올리며 드는 마음을 생각해보세요.' },
      { id: 'prayer-comfort', category: '기도', question: '힘든 일이 있을 때 기도를 하면 마음이 어떻게 될까요?', choices: ['편안해지고 위로를 받는다', '더 불안해진다', '아무 느낌이 없다', '더 화가 난다'], answer: '편안해지고 위로를 받는다', explanation: '기도는 힘든 마음을 털어놓고 위로받을 수 있는 시간이 되어줘요.', hint: '누군가에게 내 걱정을 솔직히 털어놓고 나면 마음이 어떻게 되는지 떠올려보세요.' },
      { id: 'prayer-for-others', category: '기도', question: '다른 사람이 건강하고 행복하기를 바라며 기도하는 것은 어떤 마음에서 나올까요?', choices: ['사랑과 배려하는 마음', '경쟁하는 마음', '무관심한 마음', '시기하는 마음'], answer: '사랑과 배려하는 마음', explanation: '다른 사람을 위해 기도하는 것은 그 사람을 사랑하고 배려하는 마음에서 나와요.', hint: '누군가 잘되기를 진심으로 바랄 때, 그 마음의 바탕에는 어떤 감정이 있을지 생각해보세요.' },
    ];

    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function randChoice(arr) { return arr[randInt(0, arr.length - 1)]; }
    // items가 [쉬움 ... 어려움] 순서로 정렬돼 있다고 보고, 뒤로 갈수록(더
    // 어려울수록) 뽑힐 확률이 선형으로 커지게 뽑는다(가중치 1,2,3,...).
    // pickLevelForSubject가 "최근 해금된 3개 레벨" 중 가장 어려운(가장
    // 최근에 해금된) 레벨을 더 자주 내도록 쓴다.
    function weightedChoice(items) {
      const totalWeight = (items.length * (items.length + 1)) / 2;
      let r = randInt(1, totalWeight);
      for (let i = 0; i < items.length; i++) {
        const weight = i + 1;
        if (r <= weight) return items[i];
        r -= weight;
      }
      return items[items.length - 1];
    }
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

    // 레벨은 방금 해금된 것 위주(최근 3개)로 뽑되, 그중에서도 균등하게
    // 고르지 않고 가장 어려운(가장 최근에 해금된) 쪽에 가중치를 둬서 더
    // 자주 나오게 한다 — 지능이 오를수록 실제로 체감하는 난이도도 함께
    // 올라가게 하려는 의도다(예전에는 3개 레벨이 똑같은 확률이라 지능이
    // 아무리 높아져도 가장 쉬운 레벨만 자주 걸릴 수 있었다). 그래도 가끔은
    // 살짝 쉬운 레벨도 섞여 나와 복습 효과를 준다.
    function pickLevelForSubject(intelligence, subjectKey) {
      const unlocked = unlockedLevelsFor(intelligence, subjectKey);
      const recentBand = unlocked.slice(-3);
      return recentBand.length ? weightedChoice(recentBand) : 1;
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

    function generateCreativityQuestion(session) {
      const remaining = CREATIVITY_PUZZLE_BANK.filter((q) => !session.askedQuestions.includes(q.question));
      const pool = remaining.length ? remaining : CREATIVITY_PUZZLE_BANK;
      const picked = randChoice(pool);
      session.askedQuestions.push(picked.question);
      return { type: 'choice', question: picked.question, choices: shuffle(picked.choices), answer: picked.answer, explanation: picked.explanation, hint: picked.hint, rewardGold: 0, level: 0 };
    }

    function generateFaithQuestion(session) {
      const remaining = FAITH_QUESTIONS.filter((q) => !session.askedQuestions.includes(q.question));
      const pool = remaining.length ? remaining : FAITH_QUESTIONS;
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
      if (session.type === 'creativity') return generateCreativityQuestion(session);
      if (session.type === 'faith') return generateFaithQuestion(session);
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
      CREATIVITY_PUZZLE_BANK, FAITH_QUESTIONS,
      randInt, randChoice, shuffle, weightedChoice,
      subjectName, unlockedLevelsFor, typicalStudyLevel, pickLevelForSubject,
      pickRandomSubjectAndLevel, pickRandomSubjectLevel1,
      generateEtiquetteQuestion, generateCreativityQuestion, generateFaithQuestion,
      generateScenarioQuestion, generateNextProblem,
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
