/*
 * 영어/과학 문제 생성 엔진 (순수 로직, DOM 의존 없음)
 * problems.js(수학)와 같은 모양의 문제 객체를 돌려주도록 만들어서,
 * script.js의 퀴즈 화면이 과목과 무관하게 그대로 재사용할 수 있게 했다.
 * 과학은 초등학교 4학년 ~ 고등학교 1학년 교과 범위에 맞춰 7단계로, 영어는
 * 고등학교 2학년 수준까지 8단계로 구성했다(둘 다 수학과 같은 지능 기준
 * unlockIntelligence 0/8/18/28/38/48/58/68으로 해금되어 "공부"를 고를 때
 * 세 과목 중 무엇이 나올지 무작위로 섞인다). 기초 과목 인증 금메달
 * (MEDAL_TIERS의 requiredLevel=7)은 과학도 이제 도전할 수 있다.
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

  // "공부"처럼 한 은행(9~10문제)에서 계속 뽑아 쓰는 일반 플레이 세션은
  // 순수 무작위 추첨만 쓰면 방금 본 문제가 금방 또 나오기 쉽다(특히
  // 은행이 수학의 절차적 생성기만큼 크지 않기 때문). 그래서 레벨별로
  // "가방(bag)"에 문제를 섞어 담아두고 하나씩 뽑아 쓰다가(뽑은 건 가방에서
  // 사라짐) 가방이 비면 그때 다시 섞어 채우는 방식을 쓴다 — 카드게임의
  // 셔플 덱과 같은 원리로, 은행 전체를 한 바퀴 다 보기 전에는 같은 문제가
  // 반복되지 않는다는 게 순수 무작위 추첨과의 차이다. 기초 과목 인증
  // 시험(askedQuestions를 명시적으로 넘기는 호출)은 이 가방과 무관하게
  // 기존처럼 회차 안에서 이미 나온 문제만 걸러내는 방식을 그대로 쓴다.
  const studyBags = {};
  function nextFromStudyBag(subjectTag, level, bank) {
    const key = `${subjectTag}-${level}`;
    if (!studyBags[key] || !studyBags[key].length) {
      studyBags[key] = shuffle(bank);
    }
    return studyBags[key].pop();
  }

  // 그 레벨이 concept을 갖고 있으면(중학교 이상) 문제 객체에 그대로 붙여준다.
  function attachConcept(problem, levels, level) {
    const levelDef = levels.find((l) => l.id === level);
    if (levelDef && levelDef.concept) problem.concept = levelDef.concept;
    return problem;
  }

  function makeChoiceProblem(subjectTag, level, item) {
    return {
      id: `${subjectTag}-${level}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      level,
      type: 'choice',
      rewardGold: 8 + level * 4,
      rewardExp: 4 + level * 2,
      question: item.question,
      choices: shuffle(item.choices),
      answer: item.answer,
      explanation: item.explanation,
      hint: item.hint,
    };
  }

  /* ---------------------------------------------------------------- */
  /* 영어                                                                */
  /* ---------------------------------------------------------------- */

  // concept: 초등학생 기준으로 중학교 이상 범위인 레벨(4~8)에만 있는 핵심
  // 개념 설명. problems.js LEVELS의 concept과 같은 규칙(정답을 알려주지
  // 않는 일반 개념 설명, 문제를 낼 때마다 도움 캐릭터 대사로 쓰임)을 따른다.
  const ENGLISH_LEVELS = [
    { id: 1, name: '초4 영어', desc: '기초 어휘 · 간단한 문장', unlockIntelligence: 0 },
    { id: 2, name: '초5 영어', desc: '품사 · 기본 문법', unlockIntelligence: 8 },
    { id: 3, name: '초6 영어', desc: '시제 · 비교급 · 짧은 독해', unlockIntelligence: 18 },
    { id: 4, name: '중1 영어', desc: '관계대명사 기초 · 문맥 어휘 · 숙어', unlockIntelligence: 28, concept: '관계대명사(who, which, that)는 명사 바로 뒤에서 그 명사를 자세히 설명해주는 문장을 이어주는 말이야. 꾸며주는 대상이 사람이면 who, 사물이면 which나 that을 써.' },
    { id: 5, name: '중2 영어', desc: '현재완료 · 5형식 문장 · to부정사', unlockIntelligence: 38, concept: '현재완료(have/has + p.p.)는 과거에 시작된 일이 지금까지 영향을 미치거나 막 끝났을 때 써. to부정사(to + 동사원형)는 "~하는 것", "~할"처럼 문장 안에서 여러 역할을 할 수 있는 말이야.' },
    { id: 6, name: '중3 영어', desc: '관계부사 · 가정법 과거 · 화법전환', unlockIntelligence: 48, concept: '관계부사(where, when 등)는 장소나 시간을 나타내는 명사 뒤에서 문장을 이어줘. 가정법 과거는 지금 사실과 반대되는 상상을 할 때 쓰는데, be동사는 인칭에 상관없이 항상 were를 써.' },
    { id: 7, name: '고1 영어', desc: '강조구문 · 도치 · 분사구문', unlockIntelligence: 58, concept: '강조구문 "It is/was ~ that"은 문장의 한 부분을 특별히 강조하고 싶을 때 써. 도치는 부정의 뜻을 가진 말이 문장 맨 앞에 오면 주어와 동사의 순서가 바뀌는 걸 말해.' },
    { id: 8, name: '고2 영어', desc: '수능형 어휘 · 논리 추론 · 복잡한 관계절', unlockIntelligence: 68, concept: '긴 문장은 콤마(,)나 접속사를 기준으로 끊어서 하나씩 해석하면 도움이 돼. however, therefore처럼 글의 흐름을 바꿔주는 연결어에 주목하면 글쓴이의 생각 흐름을 따라가기 쉬워.' },
  ];

  const ENGLISH_BANK = {
    1: [
      { question: "'apple'의 뜻으로 알맞은 것은?", choices: ['사과', '바나나', '포도', '딸기'], answer: '사과', explanation: "apple = 사과", hint: '우리가 자주 먹는, 빨갛거나 초록색인 동그란 과일을 떠올려보세요. 백설공주 이야기에도 나오는 과일이에요!' },
      { question: "'I ___ a student.' 빈칸에 알맞은 것은?", choices: ['am', 'is', 'are', 'be'], answer: 'am', explanation: "주어가 I일 때는 am을 씁니다.", hint: 'be동사는 주어에 따라 모습이 바뀌어요. I(나)는 항상 정해진 한 가지 형태의 be동사와만 짝을 이뤄요.' },
      { question: "'dog'의 복수형은?", choices: ['dogs', 'doges', 'dogies', "dog's"], answer: 'dogs', explanation: "대부분의 명사는 뒤에 -s를 붙여 복수형을 만듭니다.", hint: '대부분의 영어 명사는 여러 개(복수)를 나타낼 때 끝에 한 글자를 붙여요. dog 끝에 그 글자를 붙이면 어떻게 될까요?' },
      { question: "'happy'의 반대말은?", choices: ['sad', 'glad', 'angry', 'tired'], answer: 'sad', explanation: "happy(행복한)의 반대말은 sad(슬픈)입니다.", hint: 'happy는 기분이 좋을 때 쓰는 말이에요. 반대로 기분이 안 좋을 때, 눈물이 날 것 같을 때 쓰는 짧은 단어를 떠올려보세요.' },
      { question: "'This is ___ book.' 빈칸에 알맞은 것은?", choices: ['my', 'I', 'me', 'she'], answer: 'my', explanation: "명사 앞에는 소유격 my(나의)를 씁니다.", hint: "book 앞에는 '누구의 것'인지 나타내는 말이 와요. '나의'라는 뜻을 가진 짧은 단어가 무엇일까요?" },
      { question: "Monday, Tuesday, ___, Thursday. 빈칸에 알맞은 요일은?", choices: ['Wednesday', 'Sunday', 'Friday', 'Saturday'], answer: 'Wednesday', explanation: "요일 순서는 월-화-수-목이므로 Wednesday(수요일)입니다.", hint: '월요일(Monday)부터 손가락으로 하나씩 짚어가며 순서대로 말해보세요. 화요일 다음, 목요일 전에 오는 요일이 뭘까요?' },
      { question: "'cat'의 뜻으로 알맞은 것은?", choices: ['고양이', '강아지', '토끼', '햄스터'], answer: '고양이', explanation: "cat = 고양이", hint: '야옹하고 우는, 집에서 많이 기르는 동물을 떠올려보세요.' },
      { question: "'Can I ___ your pencil?' 빈칸에 알맞은 것은?", choices: ['borrow', 'lend', 'give', 'take away'], answer: 'borrow', explanation: "borrow는 '(남의 것을) 빌리다'라는 뜻입니다.", hint: '내가 상대방에게 물건을 잠깐 빌려달라고 부탁할 때 쓰는 단어예요.' },
      { question: "'two, four, six, ___' 빈칸에 알맞은 숫자를 영어로 쓰면?", choices: ['eight', 'seven', 'nine', 'five'], answer: 'eight', explanation: "2, 4, 6 다음은 8(eight)입니다.", hint: '2씩 커지는 숫자 순서예요. 6 다음에 오는 짝수를 영어로 떠올려보세요.' },
      { question: "'sun'의 뜻으로 알맞은 것은?", choices: ['해, 태양', '달', '별', '구름'], answer: '해, 태양', explanation: "sun = 해, 태양", hint: '낮에 하늘에서 밝게 빛나며 우리를 따뜻하게 해주는 것을 떠올려보세요.' },
      { question: "'He ___ happy today.' 빈칸에 알맞은 것은?", choices: ['is', 'am', 'are', 'be'], answer: 'is', explanation: "주어가 He(3인칭 단수)일 때는 is를 씁니다.", hint: 'he, she, it처럼 한 사람/한 개를 가리키는 주어와 짝이 되는 be동사를 떠올려보세요.' },
      { question: "'box'의 복수형은?", choices: ['boxes', 'boxs', 'boxies', "box's"], answer: 'boxes', explanation: "s, x, ch, sh로 끝나는 명사는 뒤에 -es를 붙여 복수형을 만듭니다.", hint: 'box는 x로 끝나는 단어예요. 이런 단어들은 복수형을 만들 때 -s 대신 조금 더 붙여요.' },
      { question: "'cold'의 반대말은?", choices: ['hot', 'cool', 'warm', 'wet'], answer: 'hot', explanation: "cold(추운)의 반대말은 hot(더운, 뜨거운)입니다.", hint: '겨울에 느끼는 온도의 정반대, 여름에 느끼는 뜨거운 느낌을 나타내는 단어예요.' },
      { question: "'What ___ your name?' 빈칸에 알맞은 것은?", choices: ['is', 'are', 'am', 'do'], answer: 'is', explanation: "your name은 단수이므로 be동사 is를 씁니다.", hint: "'당신의 이름'은 하나예요. 단수 명사와 짝이 되는 be동사를 떠올려보세요." },
    ],
    2: [
      { question: "다음 중 동사(verb)는 무엇일까요?", choices: ['run', 'table', 'blue', 'quickly'], answer: 'run', explanation: "run(달리다)은 동작을 나타내는 동사입니다.", hint: "동사는 '움직임'이나 '동작'을 나타내는 말이에요. 보기 중에서 사람이 실제로 '할 수 있는 행동'을 찾아보세요." },
      { question: "'She ___ to school every day.' 빈칸에 알맞은 것은?", choices: ['goes', 'go', 'going', 'gone'], answer: 'goes', explanation: "주어가 3인칭 단수(She)일 때 동사에 -es를 붙입니다.", hint: '주어가 he, she, it처럼 한 명/한 개(3인칭 단수)이고 지금 하는 습관을 말할 때는, 동사 끝에 보통 -s나 -es를 붙여요.' },
      { question: "'big'과 뜻이 가장 비슷한 단어는?", choices: ['large', 'small', 'tiny', 'short'], answer: 'large', explanation: "big과 large는 모두 '큰'이라는 뜻입니다.", hint: "big은 '크다'는 뜻이에요. 보기 중에서 크기가 크다는 뜻을 가진 단어를 찾아보세요(작다는 뜻의 단어들은 답이 아니겠죠?)." },
      { question: "'There ___ two cats on the sofa.' 빈칸에 알맞은 것은?", choices: ['are', 'is', 'was', 'be'], answer: 'are', explanation: "two cats는 복수이므로 are를 씁니다.", hint: 'be동사는 뒤에 오는 명사가 하나(단수)인지 여럿(복수)인지에 따라 달라져요. two cats는 몇 마리인가요?' },
      { question: "다음 중 형용사(adjective)는 무엇일까요?", choices: ['beautiful', 'quickly', 'jump', 'house'], answer: 'beautiful', explanation: "beautiful(아름다운)은 명사를 꾸며주는 형용사입니다.", hint: "형용사는 사람이나 사물의 '상태나 모양'을 꾸며주는 말이에요. 보기 중 명사를 꾸며줄 수 있는 단어를 찾아보세요." },
      { question: "'yesterday'는 어떤 시제와 가장 잘 어울릴까요?", choices: ['과거형', '현재형', '미래형', '진행형'], answer: '과거형', explanation: "yesterday(어제)는 과거를 나타내는 표현입니다.", hint: "yesterday는 '어제'라는 뜻이에요. 어제 있었던 일은 이미 지나간 일이니 어떤 시제로 표현해야 할까요?" },
      { question: "'kind'의 뜻으로 알맞은 것은?", choices: ['친절한', '똑똑한', '용감한', '조용한'], answer: '친절한', explanation: "kind = 친절한", hint: '다른 사람을 잘 도와주고 다정하게 대하는 사람을 표현하는 말이에요.' },
      { question: "'She ___ TV every evening.' 빈칸에 알맞은 것은?", choices: ['watches', 'watch', 'watching', 'watched'], answer: 'watches', explanation: "주어가 3인칭 단수(She)이고 습관을 말할 때는 동사에 -es를 붙입니다.", hint: '주어가 she일 때, 매일 반복하는 습관을 말하는 동사는 어떤 모양이어야 할까요?' },
      { question: "'library'의 뜻으로 알맞은 것은?", choices: ['도서관', '병원', '공원', '식당'], answer: '도서관', explanation: "library = 도서관", hint: '책을 빌리거나 조용히 읽을 수 있는 장소를 떠올려보세요.' },
      { question: "다음 중 명사(noun)는 무엇일까요?", choices: ['teacher', 'run', 'happy', 'slowly'], answer: 'teacher', explanation: "teacher(선생님)는 사람을 가리키는 명사입니다.", hint: '명사는 사람, 사물, 장소의 이름을 나타내는 말이에요. 보기 중 사람을 가리키는 단어를 찾아보세요.' },
      { question: "'play'의 과거형은?", choices: ['played', 'plaied', 'plays', 'playing'], answer: 'played', explanation: "규칙동사는 대부분 뒤에 -ed를 붙여 과거형을 만듭니다.", hint: '규칙적으로 변하는 동사는 과거형을 만들 때 끝에 무언가를 붙여요. play 끝에 그것을 붙이면 어떻게 될까요?' },
      { question: "'The cat is ___ the table.' 빈칸에 알맞은 것은?", choices: ['on', 'in', 'to', 'at'], answer: 'on', explanation: "table 표면 위에 있을 때는 전치사 on을 씁니다.", hint: '고양이가 탁자 표면 위에 있는 모습을 떠올려보세요. 무언가의 위에 있을 때 쓰는 전치사예요.' },
      { question: "다음 중 부사(adverb)는 무엇일까요?", choices: ['slowly', 'happy', 'book', 'run'], answer: 'slowly', explanation: "slowly(천천히)는 동작이 일어나는 방식을 나타내는 부사입니다.", hint: '부사는 동작이 어떻게 일어나는지를 꾸며주는 말이에요. -ly로 끝나는 단어를 찾아보세요.' },
      { question: "'kitchen'의 뜻으로 알맞은 것은?", choices: ['부엌', '침실', '거실', '화장실'], answer: '부엌', explanation: "kitchen = 부엌", hint: '음식을 요리하는 집 안의 공간을 떠올려보세요.' },
    ],
    3: [
      { question: "'She is taller ___ her brother.' 빈칸에 알맞은 것은?", choices: ['than', 'then', 'that', 'as'], answer: 'than', explanation: "비교급 뒤에는 than을 씁니다.", hint: "두 대상을 비교해서 '더 ~하다'라고 말할 때, 형용사 뒤에 붙이는 짝꿍 단어가 있어요. '~보다'라는 뜻의 그 단어를 떠올려보세요." },
      { question: "'go'의 과거형은?", choices: ['went', 'goed', 'gone', 'going'], answer: 'went', explanation: "go의 과거형은 불규칙 변화로 went입니다.", hint: "go는 불규칙 동사라서 규칙적으로 -ed를 붙이지 않아요. '갔다'라는 뜻의 완전히 다른 모양의 단어를 기억해보세요." },
      { question: "'I ___ my homework tomorrow.' 빈칸에 알맞은 미래형은?", choices: ['will do', 'did', 'do', 'done'], answer: 'will do', explanation: "tomorrow(내일)는 미래이므로 will do를 씁니다.", hint: "tomorrow는 '내일'이라는 뜻으로 아직 일어나지 않은 일이에요. 아직 일어나지 않은 미래를 말할 때 쓰는 표현을 떠올려보세요." },
      { question: "'Tom has a red bike. Jane has a blue bike.' Jane's bike의 색깔은?", choices: ['blue', 'red', 'green', 'yellow'], answer: 'blue', explanation: "Jane has a blue bike라고 했으므로 파란색입니다.", hint: '글을 다시 천천히 읽어보세요. Jane에 대해 설명하는 문장이 어디에 있는지 찾아 그 부분에 집중해보세요.' },
      { question: "'fast'의 최상급은?", choices: ['fastest', 'fastly', 'more fast', 'fastiest'], answer: 'fastest', explanation: "짧은 형용사는 뒤에 -est를 붙여 최상급을 만듭니다.", hint: '짧은 형용사는 최상급을 만들 때 끝에 무언가를 붙여요. fast의 끝에 그것을 붙이면 어떤 모양이 될까요?' },
      { question: "'because'는 문장에서 무엇을 나타낼 때 쓸까요?", choices: ['이유', '결과', '시간', '장소'], answer: '이유', explanation: "because는 '왜냐하면'이라는 뜻으로 이유를 나타냅니다.", hint: "because는 문장과 문장을 이어주는 접속사예요. '왜 그런 일이 일어났는지'를 설명할 때 자주 쓰는 말이에요." },
      { question: "'careful'의 뜻으로 알맞은 것은?", choices: ['조심스러운', '게으른', '시끄러운', '느린'], answer: '조심스러운', explanation: "careful = 조심스러운, 주의 깊은", hint: '다칠까 봐 신경 써서 행동하는 태도를 나타내는 말이에요.' },
      { question: "'He has two brothers ___ one sister.' 빈칸에 알맞은 것은?", choices: ['and', 'or', 'but', 'so'], answer: 'and', explanation: "형제와 자매를 나열할 때는 and로 연결합니다.", hint: '두 가지 사실을 단순히 이어서 나열할 때 쓰는 가장 기본적인 접속사예요.' },
      { question: "'polite'의 반대말로 가장 알맞은 것은?", choices: ['rude', 'kind', 'quiet', 'honest'], answer: 'rude', explanation: "polite(예의 바른)의 반대말은 rude(무례한)입니다.", hint: 'polite는 예의 바르다는 뜻이에요. 보기 중 예의 없고 무례한 태도를 나타내는 단어를 찾아보세요.' },
      { question: "'She ___ TV now.' 빈칸에 알맞은 것은?", choices: ['is watching', 'watches', 'watch', 'watched'], answer: 'is watching', explanation: "now(지금)는 현재진행형과 함께 쓰입니다.", hint: "'지금(now)'은 바로 이 순간 일어나고 있는 일을 나타내요. '~하고 있다'는 뜻의 진행형을 떠올려보세요." },
      { question: "'I ___ reading a book when she called.' 빈칸에 알맞은 것은?", choices: ['was', 'am', 'is', 'were'], answer: 'was', explanation: "주어가 I이고 과거 진행 중이던 일을 나타낼 때는 was reading을 씁니다.", hint: '전화가 왔을 때(과거) 이미 하고 있던 일을 표현해요. 주어가 I일 때 짝이 되는 be동사의 과거형을 떠올려보세요.' },
      { question: "'beautiful'의 비교급은?", choices: ['more beautiful', 'beautifuler', 'beautifulest', 'more beautifuler'], answer: 'more beautiful', explanation: "음절이 긴 형용사는 앞에 more를 붙여 비교급을 만듭니다.", hint: '짧은 단어는 뒤에 -er을 붙이지만, 이 단어처럼 긴 형용사는 앞에 다른 단어를 붙여요.' },
      { question: "'Minji likes apples. She doesn't like bananas.' Minji가 좋아하지 않는 과일은?", choices: ['bananas', 'apples', 'grapes', 'strawberries'], answer: 'bananas', explanation: "doesn't like bananas라고 했으므로 바나나를 좋아하지 않습니다.", hint: "문장을 다시 읽고 doesn't like(좋아하지 않는다) 뒤에 나오는 단어를 찾아보세요." },
      { question: "'honest'의 뜻으로 알맞은 것은?", choices: ['정직한', '게으른', '무례한', '수줍은'], answer: '정직한', explanation: "honest = 정직한", hint: '거짓말을 하지 않고 사실대로 말하는 사람을 표현하는 단어예요.' },
    ],
    4: [
      { question: "'The girl ___ is wearing a red hat is my sister.' 빈칸에 알맞은 것은?", choices: ['who', 'which', 'whose', 'what'], answer: 'who', explanation: "사람을 꾸며주는 주격 관계대명사는 who입니다.", hint: '밑줄 앞의 명사(the girl)가 사람인지 사물인지 확인해보세요. 사람을 꾸며주는 주격 관계대명사가 따로 있어요.' },
      { question: "'break the ice'라는 숙어의 의미는?", choices: ['어색한 분위기를 풀다', '얼음을 부수다', '화를 내다', '시간을 낭비하다'], answer: '어색한 분위기를 풀다', explanation: "break the ice는 '어색한 분위기를 풀다'라는 뜻의 관용 표현입니다.", hint: "이 표현을 글자 그대로 해석하면 '얼음을 깨다'이지만, 실제로는 처음 만난 사람들 사이의 서먹한 분위기를 풀 때 쓰는 관용 표현이에요." },
      { question: "'Although it was raining, we went out.' 밑줄 친 Although의 의미로 알맞은 것은?", choices: ['~에도 불구하고', '그래서', '왜냐하면', '그러는 동안'], answer: '~에도 불구하고', explanation: "Although는 '비록 ~일지라도'라는 뜻입니다.", hint: 'Although 뒤에는 비가 왔다는 내용이, 그 다음엔 그런데도 나갔다는 내용이 나와요. 앞뒤 내용이 서로 반대될 때 쓰는 접속사예요.' },
      { question: "'The book ___ I bought yesterday is interesting.' 빈칸에 알맞은 것은?", choices: ['that', 'who', 'whose', 'what'], answer: 'that', explanation: "사물을 꾸며주는 목적격 관계대명사로 that을 쓸 수 있습니다.", hint: 'the book 뒤에 이어지는 절이 사물을 꾸며주고 있어요. 사물을 꾸며줄 때 쓸 수 있는 관계대명사를 떠올려보세요(who는 사람에게만 써요).' },
      { question: "'The cake was eaten by the dog.'는 어떤 문장을 수동태로 바꾼 것일까요?", choices: ['The dog ate the cake.', 'The dog eats the cake.', 'The cake ate the dog.', 'The dog is eating the cake.'], answer: 'The dog ate the cake.', explanation: "수동태 'was eaten by'는 능동태 과거형 'ate'에서 왔습니다.", hint: "수동태 'was eaten by the dog'를 능동태로 바꾸려면, 'by' 뒤의 대상(the dog)을 주어로 앞에 내세우고 동사를 원래 시제의 능동형으로 바꿔요." },
      { question: "'in spite of'와 의미가 가장 비슷한 것은?", choices: ['despite', 'because of', 'thanks to', 'instead of'], answer: 'despite', explanation: "in spite of와 despite 모두 '~에도 불구하고'라는 뜻입니다.", hint: "in spite of는 '~에도 불구하고'라는 뜻이에요. 보기 중에서 같은 뜻을 가진 한 단어짜리 표현을 찾아보세요." },
      { question: "'responsible'의 뜻으로 알맞은 것은?", choices: ['책임감 있는', '무관심한', '게으른', '이기적인'], answer: '책임감 있는', explanation: "responsible = 책임감 있는", hint: '맡은 일을 끝까지 해내려고 노력하는 태도를 나타내는 말이에요.' },
      { question: "'not only A but also B' 구문의 뜻으로 알맞은 것은?", choices: ['A뿐만 아니라 B도', 'A도 B도 아닌', 'A 대신 B', 'A와 B 둘 다 아닌'], answer: 'A뿐만 아니라 B도', explanation: "'not only A but also B'는 'A뿐만 아니라 B도'라는 뜻의 상관접속사입니다.", hint: '두 가지를 모두 강조해서 말할 때 쓰는 표현이에요. A만 있는 게 아니라 B까지 있다는 뜻이에요.' },
      { question: "'cooperate'의 뜻으로 알맞은 것은?", choices: ['협력하다', '경쟁하다', '무시하다', '반대하다'], answer: '협력하다', explanation: "cooperate = 협력하다, 함께 일하다", hint: '다른 사람과 힘을 합쳐 함께 일을 해나가는 것을 뜻하는 단어예요.' },
      { question: "'The pen ___ is on the desk is mine.' 빈칸에 알맞은 것은?", choices: ['which', 'who', 'whom', 'what'], answer: 'which', explanation: "사물을 꾸며주는 주격 관계대명사는 which입니다.", hint: 'the pen은 사물이에요. 사물을 꾸며줄 때 쓰는 주격 관계대명사를 떠올려보세요(who는 사람에게만 써요).' },
      { question: "'give up'이라는 숙어의 의미는?", choices: ['포기하다', '나눠주다', '일어서다', '계속하다'], answer: '포기하다', explanation: "give up은 '포기하다'라는 뜻의 숙어입니다.", hint: '어려운 일을 더 이상 하지 않고 멈추기로 할 때 쓰는 표현이에요.' },
      { question: "'I am interested ___ science.' 빈칸에 알맞은 것은?", choices: ['in', 'at', 'on', 'to'], answer: 'in', explanation: "'be interested in'은 '~에 관심이 있다'는 뜻의 숙어입니다.", hint: "'~에 관심이 있다'는 표현은 정해진 짧은 전치사 하나와만 항상 짝을 이뤄요. 통째로 외워두는 게 좋아요." },
      { question: "'generous'의 뜻으로 알맞은 것은?", choices: ['관대한, 후한', '인색한', '엄격한', '수줍은'], answer: '관대한, 후한', explanation: "generous = 관대한, 후한", hint: '다른 사람에게 아낌없이 베풀고 나누는 성격을 나타내는 단어예요.' },
      { question: "'as soon as'의 의미로 알맞은 것은?", choices: ['~하자마자', '~하는 동안', '~때문에', '~에도 불구하고'], answer: '~하자마자', explanation: "as soon as는 '~하자마자'라는 뜻의 접속사구입니다.", hint: '한 가지 일이 끝나자마자 바로 다음 일이 일어난다는 것을 나타내는 표현이에요.' },
    ],
    5: [
      { question: "'I have lived here ___ 2020.' 빈칸에 알맞은 것은?", choices: ['since', 'for', 'from', 'at'], answer: 'since', explanation: "since는 특정 시점('~부터'), for는 기간('~동안')과 함께 씁니다.", hint: '2020은 특정 시점이에요. 기간이 아니라 시작 시점을 나타낼 때 쓰는 전치사를 떠올려보세요.' },
      { question: "'She has just ___ her homework.' 빈칸에 알맞은 것은?", choices: ['finished', 'finish', 'finishing', 'finishes'], answer: 'finished', explanation: "현재완료(have/has + p.p.)는 '막 ~했다'는 의미로 방금 끝난 일을 나타냅니다.", hint: 'has 다음에는 동사원형이 아니라 특별한 형태가 와야 해요. 어떤 형태일지 떠올려보세요.' },
      { question: "'They made her happy.'에서 her happy는 문장에서 어떤 역할일까요?", choices: ['목적어와 목적격보어', '주어와 동사', '목적어와 부사', '두 개의 목적어'], answer: '목적어와 목적격보어', explanation: "make + 목적어 + 목적격보어 구조로, happy가 her의 상태를 설명합니다.", hint: 'happy는 형용사로 목적어(her)의 상태를 보충 설명하고 있어요. 5형식 문장의 구조를 떠올려보세요.' },
      { question: "'I want ___ the piano.' 빈칸에 알맞은 것은?", choices: ['to play', 'playing', 'play', 'played'], answer: 'to play', explanation: "want는 to부정사를 목적어로 취하는 동사입니다.", hint: "want 뒤에는 동사원형이 아니라 특별한 형태가 와요. '~하는 것을 원하다'라는 뜻을 만드는 형태를 떠올려보세요." },
      { question: "'I heard someone ___ the door.' 빈칸에 알맞은 것은?", choices: ['knock', 'to knock', 'knocked', 'knocks'], answer: 'knock', explanation: "지각동사(hear, see 등)는 목적어 뒤에 동사원형을 씁니다.", hint: '지각동사(hear, see 등) 뒤에는 to부정사가 아니라 동사의 어떤 형태가 오는지 떠올려보세요.' },
      { question: "'Although'와 바꿔 쓸 수 있는 접속사는?", choices: ['though', 'but', 'so', 'because'], answer: 'though', explanation: "although와 though는 둘 다 '비록 ~일지라도'라는 뜻의 접속사입니다.", hint: '이 질문의 단어와 비슷한 뜻이면서, 앞부분 세 글자만 뗀 더 짧고 캐주얼한 접속사를 떠올려보세요.' },
      { question: "'respect'의 뜻으로 알맞은 것은?", choices: ['존중하다', '무시하다', '비교하다', '설득하다'], answer: '존중하다', explanation: "respect = 존중하다", hint: '다른 사람의 생각이나 다름을 소중히 여기고 인정하는 태도를 나타내는 단어예요.' },
      { question: "'I would rather stay home ___ go out.' 빈칸에 알맞은 것은?", choices: ['than', 'then', 'as', 'to'], answer: 'than', explanation: "'would rather A than B'는 'B보다 A하는 것이 낫다'는 뜻입니다.", hint: "'차라리 ~하는 게 낫다'는 표현은 비교의 의미를 담고 있어요. 비교급과 함께 자주 쓰이는 단어를 떠올려보세요." },
      { question: "'apologize'의 뜻으로 알맞은 것은?", choices: ['사과하다', '자랑하다', '설명하다', '거절하다'], answer: '사과하다', explanation: "apologize = 사과하다", hint: '실수했을 때 미안한 마음을 말로 표현하는 행동을 뜻하는 단어예요.' },
      { question: "'I have never ___ sushi before.' 빈칸에 알맞은 것은?", choices: ['eaten', 'eat', 'ate', 'eating'], answer: 'eaten', explanation: "현재완료(have + p.p.)는 '~해 본 적이 있다(경험)'를 나타낼 때 씁니다.", hint: 'have 다음에는 과거분사(p.p.) 형태가 와요. eat의 과거분사를 떠올려보세요.' },
      { question: "'It is important ___ study every day.' 빈칸에 알맞은 것은?", choices: ['to', 'for', 'that', 'of'], answer: 'to', explanation: "'It is + 형용사 + to부정사'는 '~하는 것은 …하다'라는 뜻의 구문입니다.", hint: '가주어 It을 쓸 때 진짜 주어 역할을 하는 부분은 동사원형이 아니라 특별한 부정사 형태로 나타나요.' },
      { question: "'She allowed him ___ use her phone.' 빈칸에 알맞은 것은?", choices: ['to', 'using', 'use', 'used'], answer: 'to', explanation: "allow는 목적격보어로 to부정사를 취하는 동사입니다.", hint: 'allow(허락하다)는 목적어 다음에 동사원형을 바로 쓰지 않고 특별한 부정사 형태를 써요.' },
      { question: "'generation'의 뜻으로 알맞은 것은?", choices: ['세대', '경쟁', '협력', '희생'], answer: '세대', explanation: "generation = 세대", hint: '나이가 비슷하고 같은 시기에 태어나 자란 사람들의 무리를 가리키는 말이에요. 부모님 때와 지금 우리 때를 비교할 때 자주 쓰는 단어예요.' },
      { question: "'I have known her ___ ten years.' 빈칸에 알맞은 것은?", choices: ['for', 'since', 'from', 'at'], answer: 'for', explanation: "for는 기간('~동안')과 함께 쓰이고, since는 시점('~부터')과 함께 쓰입니다.", hint: 'ten years는 기간이에요. 특정 시점이 아니라 기간을 나타낼 때 쓰는 전치사를 떠올려보세요.' },
    ],
    6: [
      { question: "'This is the house ___ I was born.' 빈칸에 알맞은 것은?", choices: ['where', 'which', 'who', 'when'], answer: 'where', explanation: "장소를 나타내는 선행사(the house) 뒤에는 관계부사 where를 씁니다.", hint: 'the house는 장소예요. 장소를 꾸며줄 때 쓰는 관계부사를 떠올려보세요.' },
      { question: "'If I ___ a bird, I could fly.' 빈칸에 알맞은 것은?", choices: ['were', 'am', 'was', 'be'], answer: 'were', explanation: "가정법 과거에서는 be동사의 과거형으로 인칭에 관계없이 were를 씁니다.", hint: '가정법에서는 현실과 반대되는 상상을 말할 때 be동사를 인칭에 상관없이 항상 같은 형태로 써요.' },
      { question: "'He said, \"I am tired.\"'를 간접화법으로 바꾸면?", choices: ['He said that he was tired.', 'He said that he is tired.', 'He said I am tired.', 'He said that he will tired.'], answer: 'He said that he was tired.', explanation: "직접화법을 간접화법으로 바꿀 때 시제는 한 단계 과거로, 인칭대명사도 알맞게 바뀝니다.", hint: '주절의 said가 과거이므로 종속절의 시제도 한 단계 뒤로 물러나요(현재 → 과거).' },
      { question: "'He is ___ student in the class.' 빈칸에 알맞은 것은?", choices: ['the smartest', 'smarter', 'more smart', 'smartest'], answer: 'the smartest', explanation: "최상급 앞에는 the를 붙입니다.", hint: '최상급(가장 ~한) 표현 앞에는 꼭 붙는 관사가 있어요.' },
      { question: "'find out'과 의미가 가장 비슷한 것은?", choices: ['discover', 'lose', 'ignore', 'hide'], answer: 'discover', explanation: "find out은 '알아내다, 발견하다'라는 뜻으로 discover와 비슷합니다.", hint: 'find out은 몰랐던 것을 새로 알게 됐을 때 쓰는 표현이에요.' },
      { question: "'neither A nor B' 구문에서 동사의 수는 무엇에 맞출까요?", choices: ['B에 맞춘다', 'A에 맞춘다', '항상 단수', '항상 복수'], answer: 'B에 맞춘다', explanation: "neither A nor B, either A or B 구문은 동사를 B(더 가까운 것)에 맞춥니다.", hint: '이 구문은 두 개 중 동사와 더 가까이 있는 쪽에 수를 맞춘다는 규칙이 있어요.' },
      { question: "'resolve a conflict'의 뜻으로 가장 알맞은 것은?", choices: ['갈등을 해결하다', '갈등을 만들다', '갈등을 무시하다', '갈등을 숨기다'], answer: '갈등을 해결하다', explanation: "resolve a conflict는 '갈등/문제를 해결하다'라는 뜻입니다.", hint: 'resolve는 문제를 풀어서 끝낸다는 뜻이에요. conflict(갈등)를 그렇게 하면 어떻게 될까요?' },
      { question: "'Not until she apologized ___ he forgive her.' 빈칸에 알맞은 것은?", choices: ['did', 'he did', 'he does', 'has'], answer: 'did', explanation: "'Not until ~'가 문장 앞에 오면 주어와 조동사가 도치되어 'did he forgive'의 어순이 됩니다.", hint: "'Not until'처럼 부정의 뜻을 담은 표현이 문장 맨 앞에 나오면, 뒤에 오는 주어와 동사의 순서가 바뀌어요." },
      { question: "'diverse'의 뜻으로 알맞은 것은?", choices: ['다양한', '똑같은', '단순한', '희귀한'], answer: '다양한', explanation: "diverse = 다양한", hint: '여러 종류나 배경이 서로 다르게 섞여 있는 것을 나타내는 단어예요.' },
      { question: "'I remember the day ___ we first met.' 빈칸에 알맞은 것은?", choices: ['when', 'where', 'who', 'which'], answer: 'when', explanation: "시간을 나타내는 선행사(the day) 뒤에는 관계부사 when을 씁니다.", hint: 'the day는 시간을 나타내요. 시간을 꾸며줄 때 쓰는 관계부사를 떠올려보세요.' },
      { question: "'If I had money, I ___ travel abroad.' 빈칸에 알맞은 것은?", choices: ['would', 'will', 'do', 'did'], answer: 'would', explanation: "가정법 과거(If + 과거형, 주어 + would/could + 동사원형)의 주절에는 would가 옵니다.", hint: '현실과 반대되는 상상을 하는 가정법 과거 문장이에요. If절이 과거형일 때 주절에 오는 조동사를 떠올려보세요.' },
      { question: "'She said, \"I like chocolate.\"'를 간접화법으로 바꾸면?", choices: ['She said that she liked chocolate.', 'She said that she likes chocolate.', 'She said I like chocolate.', 'She said that she will like chocolate.'], answer: 'She said that she liked chocolate.', explanation: "주절이 과거(said)이므로 종속절의 시제도 과거로 바뀝니다.", hint: 'said가 과거형이므로, 직접화법의 현재형(like)도 한 단계 과거로 물러나야 해요.' },
      { question: "'humble'의 뜻으로 알맞은 것은?", choices: ['겸손한', '거만한', '용감한', '게으른'], answer: '겸손한', explanation: "humble = 겸손한", hint: '자기 자랑을 하지 않고 다른 사람을 존중하는 태도를 나타내는 단어예요.' },
      { question: "'Not only she but also I ___ responsible.' 빈칸에 알맞은 것은?", choices: ['am', 'is', 'are', 'be'], answer: 'am', explanation: "'not only A but also B' 구문은 동사를 B(더 가까운 것, 여기서는 I)에 맞춥니다.", hint: '이 구문은 동사와 더 가까운 쪽에 수를 맞춰요. I와 짝이 되는 be동사를 떠올려보세요.' },
    ],
    7: [
      { question: "'It was Tom ___ broke the window.' 빈칸에 알맞은 것은?", choices: ['who', 'whom', 'which', 'what'], answer: 'who', explanation: "It is/was ~ that(who) 강조구문에서 사람을 강조할 때는 who도 쓸 수 있습니다.", hint: 'It was ~ that 강조구문이에요. 강조하는 대상이 사람(Tom)일 때 that 대신 쓸 수 있는 관계대명사가 있어요.' },
      { question: "'Never ___ such a beautiful sunset.' 빈칸에 알맞은 것은?", choices: ['have I seen', 'I have seen', 'I saw', 'did I saw'], answer: 'have I seen', explanation: "부정어(Never)가 문장 앞에 오면 주어와 동사가 도치됩니다.", hint: '부정의 뜻을 가진 부사(Never)가 문장 맨 앞에 나오면 주어와 동사의 순서가 바뀌어요.' },
      { question: "'___ tired, she kept studying.' 빈칸에 알맞은 분사구문은?", choices: ['Being', 'Been', 'To be', 'Be'], answer: 'Being', explanation: "분사구문은 접속사와 주어를 생략하고 동사를 -ing 형태로 바꿔 만듭니다(Being tired = Although she was tired).", hint: '분사구문은 동사를 어떤 형태로 바꿔서 문장을 시작하는지 떠올려보세요.' },
      { question: "완료부정사(to have + p.p.)는 본동사 기준으로 어떤 시점을 나타낼까요?", choices: ['본동사보다 앞선 시점', '본동사와 같은 시점', '미래의 일', '반복되는 일'], answer: '본동사보다 앞선 시점', explanation: "완료부정사(to have p.p.)는 본동사의 시점보다 이전에 일어난 일을 나타냅니다.", hint: "완료부정사는 '더 먼저 일어난 일'을 나타낼 때 쓰는 특별한 부정사 형태예요." },
      { question: "'used to'와 'would'의 공통점은?", choices: ['과거의 습관을 나타낸다', '미래를 나타낸다', '현재 상태를 나타낸다', '명령을 나타낸다'], answer: '과거의 습관을 나타낸다', explanation: "used to와 would는 모두 과거의 반복적인 습관이나 행동을 나타낼 수 있습니다(단, used to만 과거의 상태도 나타낼 수 있음).", hint: '둘 다 예전에는 ~하곤 했다는 뜻으로 쓰이는 표현이에요.' },
      { question: "'The more you practice, the better you get.'과 같은 구조가 나타내는 것은?", choices: ['할수록 더 ~해지는 비례관계', '과거의 습관', '최상급 비교', '가정법 과거'], answer: '할수록 더 ~해지는 비례관계', explanation: "'the 비교급 ~, the 비교급 ~' 구문은 '~할수록 더 ~하다'라는 비례관계를 나타냅니다.", hint: '두 개의 비교급이 나란히 쓰이면서, 하나가 변하면 다른 하나도 같이 변한다는 것을 나타내는 구문이에요.' },
      { question: "'integrity'의 뜻으로 가장 알맞은 것은?", choices: ['진실성, 정직함', '호기심', '창의성', '관대함'], answer: '진실성, 정직함', explanation: "integrity는 '진실성, 정직함, 성실함'이라는 뜻입니다.", hint: '남이 보지 않아도 스스로 옳은 일을 하려는 마음가짐을 나타내는 단어예요.' },
      { question: "'Had I known the truth, I ___ have acted differently.' 빈칸에 알맞은 것은?", choices: ['would', 'will', 'do', 'am'], answer: 'would', explanation: "'Had I known'은 가정법 과거완료의 도치 표현으로, 주절에는 'would have p.p.'가 옵니다.", hint: '이 문장은 실제로 몰랐던 과거를 가정하는 가정법이에요. If를 생략하고 도치된 가정법 과거완료 문장의 짝이 되는 조동사를 떠올려보세요.' },
      { question: "'empathy'의 뜻으로 가장 알맞은 것은?", choices: ['공감', '경쟁심', '자신감', '호기심'], answer: '공감', explanation: "empathy는 '공감, 감정이입'이라는 뜻입니다.", hint: '다른 사람의 입장이 되어 그 사람의 감정을 함께 느끼는 능력을 나타내는 단어예요.' },
      { question: "'Little ___ she know that he was watching her.' 빈칸에 알맞은 것은?", choices: ['did', 'she did', 'does', 'she does'], answer: 'did', explanation: "부정의 뜻을 가진 Little이 문장 앞에 오면 주어와 조동사가 도치됩니다.", hint: 'Little(거의 ~않다)처럼 부정적 의미의 부사가 문장 맨 앞에 오면 주어와 동사의 순서가 바뀌어요.' },
      { question: "'___ by the noise, the baby began to cry.' 빈칸에 알맞은 분사구문은?", choices: ['Startled', 'Startling', 'To startle', 'Startle'], answer: 'Startled', explanation: "수동의 의미를 가진 분사구문은 과거분사(p.p.)로 시작합니다(Being startled의 Being 생략).", hint: '아기가 소리에 놀라게 된 것이므로 수동의 의미예요. 수동 분사구문은 어떤 형태로 시작하는지 떠올려보세요.' },
      { question: "'It was not until she left that he realized her value.'의 의미로 가장 알맞은 것은?", choices: ['그녀가 떠나고 나서야 그는 그녀의 소중함을 깨달았다', '그녀가 떠나기 전에 그는 그녀의 소중함을 알았다', '그는 그녀의 소중함을 전혀 몰랐다', '그녀는 떠나지 않았다'], answer: '그녀가 떠나고 나서야 그는 그녀의 소중함을 깨달았다', explanation: "'It is not until A that B'는 'A하고 나서야 비로소 B하다'라는 강조구문입니다.", hint: "'not until ~'은 '~하고 나서야 비로소'라는 뜻의 강조 표현이에요." },
      { question: "'meticulous'의 뜻으로 가장 알맞은 것은?", choices: ['꼼꼼한, 세심한', '거친', '느긋한', '즉흥적인'], answer: '꼼꼼한, 세심한', explanation: "meticulous는 '매우 꼼꼼하고 세심한'이라는 뜻입니다.", hint: '아주 작은 부분까지 놓치지 않고 신경 쓰는 성격을 나타내는 단어예요.' },
      { question: "'Providing that it doesn't rain, we will go on a picnic.'에서 Providing that의 의미는?", choices: ['만약 ~라면', '~때문에', '~에도 불구하고', '~하는 동안'], answer: '만약 ~라면', explanation: "providing (that)은 '만약 ~라면'이라는 뜻으로 if와 비슷하게 조건을 나타냅니다.", hint: '이 표현은 if와 비슷한 뜻으로, 어떤 조건이 충족되면이라는 의미를 나타내요.' },
    ],
    8: [
      { question: "'The book, the cover of which was torn, was still readable.'에서 the cover of which는 무엇을 나타낼까요?", choices: ["the book's cover", "the cover's book", 'a new cover', 'nothing'], answer: "the book's cover", explanation: "소유격 관계대명사 'of which'는 the book's cover(그 책의 표지)를 나타냅니다.", hint: 'of which는 소유의 의미를 나타내는 관계대명사예요. 무엇의 표지인지 생각해보세요.' },
      { question: "'ubiquitous'의 의미로 가장 알맞은 것은?", choices: ['어디에나 있는', '매우 드문', '시대에 뒤떨어진', '복잡한'], answer: '어디에나 있는', explanation: "ubiquitous는 '어디에나 존재하는, 편재하는'이라는 뜻의 단어입니다.", hint: '스마트폰처럼 요즘 어디서나 쉽게 볼 수 있는 것을 표현할 때 쓰는 단어예요.' },
      { question: "'She studied hard. ___, she failed the exam.' 빈칸에 알맞은 연결어는?", choices: ['Nevertheless', 'Therefore', 'Similarly', 'For example'], answer: 'Nevertheless', explanation: "앞뒤 내용이 상반될 때는 Nevertheless(그럼에도 불구하고)를 씁니다.", hint: '열심히 공부했는데 시험에 떨어졌다는 건 예상과 반대되는 결과예요. 반전을 나타내는 연결어를 떠올려보세요.' },
      { question: "'She is not so much a singer as a dancer.'의 의미는?", choices: ['그녀는 가수라기보다는 무용수이다', '그녀는 가수이자 무용수이다', '그녀는 가수도 무용수도 아니다', '그녀는 가수보다 무용수를 더 좋아한다'], answer: '그녀는 가수라기보다는 무용수이다', explanation: "'not so much A as B'는 'A라기보다는 B'라는 뜻입니다.", hint: "'not so much A as B' 구문은 두 대상을 비교하며 어느 쪽에 더 가까운지를 나타내요." },
      { question: "'in retrospect'의 의미로 가장 알맞은 것은?", choices: ['돌이켜보면', '앞으로는', '즉시', '우연히'], answer: '돌이켜보면', explanation: "in retrospect는 '돌이켜 생각해보면'이라는 뜻의 표현입니다.", hint: '지나간 일을 다시 떠올리며 생각할 때 쓰는 표현이에요.' },
      { question: "다음 중 글의 요지를 파악할 때 가장 주의 깊게 봐야 할 것은?", choices: ['반복되는 핵심 주장과 결론 문장', '예시로 든 세부 사항', '낯선 단어의 개수', '문장의 길이'], answer: '반복되는 핵심 주장과 결론 문장', explanation: "글의 요지는 보통 반복되는 핵심 주장이나 결론 부분에 드러납니다.", hint: '글쓴이가 가장 하고 싶은 말은 보통 어디에 나타날까요? 세부 예시보다 더 중요한 것을 생각해보세요.' },
      { question: "'perspective'의 뜻으로 가장 알맞은 것은?", choices: ['관점, 시각', '결과', '규칙', '경험'], answer: '관점, 시각', explanation: "perspective는 '관점, 시각, 견해'라는 뜻입니다.", hint: '같은 상황도 사람마다 다르게 바라볼 수 있는데, 그 서로 다른 시각을 나타내는 단어예요.' },
      { question: "'Rarely does she complain about her workload, ___ she is under great pressure.' 빈칸에 알맞은 것은?", choices: ['even though', 'so that', 'in that', 'now that'], answer: 'even though', explanation: "even though는 '비록 ~일지라도'라는 뜻으로 양보를 나타내는 접속사입니다.", hint: '앞뒤 내용이 서로 반대(불평하지 않지만 사실은 부담이 크다)될 때 쓰는 양보의 접속사를 떠올려보세요.' },
      { question: "'take responsibility for'의 뜻으로 가장 알맞은 것은?", choices: ['~에 대해 책임을 지다', '~을 무시하다', '~을 비판하다', '~을 피하다'], answer: '~에 대해 책임을 지다', explanation: "take responsibility for는 '~에 대해 책임을 지다'라는 뜻의 표현입니다.", hint: 'responsibility는 책임이라는 뜻이에요. 그 책임을 스스로 떠맡는다는 의미를 생각해보세요.' },
      { question: "'The reason ___ she was late is that the bus was delayed.' 빈칸에 알맞은 것은?", choices: ['why', 'which', 'who', 'what'], answer: 'why', explanation: "이유를 나타내는 선행사(the reason) 뒤에는 관계부사 why를 씁니다.", hint: 'the reason은 이유를 나타내요. 이유를 꾸며줄 때 쓰는 관계부사를 떠올려보세요.' },
      { question: "'She is, in a sense, right.'에서 in a sense의 의미는?", choices: ['어떤 의미에서는', '결국', '반대로', '분명히'], answer: '어떤 의미에서는', explanation: "in a sense는 '어떤 의미에서는, 어느 정도는'이라는 뜻의 표현입니다.", hint: '완전히 그런 건 아니지만 부분적으로는 맞다고 말할 때 쓰는 표현이에요.' },
      { question: "'The evidence suggests that the theory is flawed. ___, we need more research.' 빈칸에 알맞은 연결어는?", choices: ['Thus', 'However', 'For instance', 'In contrast'], answer: 'Thus', explanation: "앞 내용이 원인이 되어 뒤 내용(더 많은 연구가 필요하다)이 결론으로 이어지므로 Thus(따라서)가 알맞습니다.", hint: '앞 내용이 이유가 되어 뒤에 결론이 이어지고 있어요. 결과를 나타내는 연결어를 떠올려보세요.' },
      { question: "'ambiguous'의 뜻으로 가장 알맞은 것은?", choices: ['모호한', '명확한', '단순한', '흥미로운'], answer: '모호한', explanation: "ambiguous는 '모호한, 여러 가지로 해석될 수 있는'이라는 뜻입니다.", hint: '뜻이 분명하지 않아 여러 가지로 해석될 수 있는 상태를 나타내는 단어예요.' },
      { question: "소유격 관계대명사 whose가 꾸며줄 수 있는 선행사로 알맞은 것은?", choices: ['사람과 사물 모두 가능', '사람만 가능', '사물만 가능', '장소만 가능'], answer: '사람과 사물 모두 가능', explanation: "소유격 관계대명사 whose는 선행사가 사람이든 사물이든 모두 쓸 수 있습니다.", hint: 'who(사람)나 which(사물)와 달리, 소유의 의미를 나타내는 whose는 선행사의 종류에 제한이 없어요.' },
    ],
  };

  function isEnglishLevelUnlocked(levelId, intelligence) {
    const level = ENGLISH_LEVELS.find((l) => l.id === levelId);
    return !!level && intelligence >= level.unlockIntelligence;
  }

  // askedQuestions를 배열로 명시해서 주면(예: 기초 과목 인증 시험처럼 한
  // 회차 안에서 반복을 피해야 할 때) 그중 이미 나온 문제는 걸러내고
  // 뽑는다(다 걸러내서 남는 게 없으면 은행 전체에서 다시 뽑는다). 그
  // 인자를 아예 안 넘기면(일반 "공부"/"알바" 세션) 레벨별 셔플 가방에서
  // 뽑아 은행을 한 바퀴 다 돌 때까지 같은 문제가 반복되지 않게 한다.
  function generateEnglishProblem(level, askedQuestions) {
    const bank = ENGLISH_BANK[level] || ENGLISH_BANK[1];
    let problem;
    if (Array.isArray(askedQuestions)) {
      const pool = askedQuestions.length ? bank.filter((item) => !askedQuestions.includes(item.question)) : bank;
      problem = makeChoiceProblem('en', level, randChoice(pool.length ? pool : bank));
    } else {
      problem = makeChoiceProblem('en', level, nextFromStudyBag('en', level, bank));
    }
    return attachConcept(problem, ENGLISH_LEVELS, level);
  }

  /* ---------------------------------------------------------------- */
  /* 영어 인증 시험 전용: 단어-뜻 짝짓기                                    */
  /* ---------------------------------------------------------------- */

  // 기초 과목 인증(동/은/금메달) 시험은 문법이 아니라 "영어 단어 - 뜻
  // 짝지어 맞추기" 형식으로 낸다. MEDAL_TIERS의 requiredLevel(1/4/7)에 맞춰
  // 동메달은 초4, 은메달은 초5~중1, 금메달은 중2~고1 수준 어휘로 구성했다.
  const ENGLISH_VOCAB_BANK = {
    1: [
      { word: 'apple', meaning: '사과' },
      { word: 'dog', meaning: '개' },
      { word: 'happy', meaning: '행복한' },
      { word: 'book', meaning: '책' },
      { word: 'water', meaning: '물' },
      { word: 'school', meaning: '학교' },
      { word: 'friend', meaning: '친구' },
      { word: 'big', meaning: '큰' },
      { word: 'small', meaning: '작은' },
      { word: 'run', meaning: '달리다' },
      { word: 'cat', meaning: '고양이' },
      { word: 'bird', meaning: '새' },
      { word: 'tree', meaning: '나무' },
      { word: 'house', meaning: '집' },
      { word: 'table', meaning: '탁자' },
      { word: 'sun', meaning: '해, 태양' },
      { word: 'moon', meaning: '달' },
      { word: 'star', meaning: '별' },
      { word: 'rain', meaning: '비' },
      { word: 'snow', meaning: '눈' },
      { word: 'hot', meaning: '뜨거운' },
      { word: 'cold', meaning: '차가운' },
      { word: 'fast', meaning: '빠른' },
      { word: 'slow', meaning: '느린' },
      { word: 'jump', meaning: '뛰다' },
      { word: 'walk', meaning: '걷다' },
      { word: 'eat', meaning: '먹다' },
      { word: 'drink', meaning: '마시다' },
      { word: 'sleep', meaning: '자다' },
      { word: 'play', meaning: '놀다' },
      { word: 'read', meaning: '읽다' },
      { word: 'write', meaning: '쓰다' },
      { word: 'teacher', meaning: '선생님' },
      { word: 'student', meaning: '학생' },
    ],
    4: [
      { word: 'important', meaning: '중요한' },
      { word: 'difficult', meaning: '어려운' },
      { word: 'environment', meaning: '환경' },
      { word: 'decide', meaning: '결정하다' },
      { word: 'improve', meaning: '향상시키다' },
      { word: 'opportunity', meaning: '기회' },
      { word: 'compare', meaning: '비교하다' },
      { word: 'explain', meaning: '설명하다' },
      { word: 'discover', meaning: '발견하다' },
      { word: 'increase', meaning: '증가하다' },
      { word: 'achieve', meaning: '성취하다' },
      { word: 'various', meaning: '다양한' },
      { word: 'essential', meaning: '필수적인' },
      { word: 'positive', meaning: '긍정적인' },
      { word: 'negative', meaning: '부정적인' },
      { word: 'purpose', meaning: '목적' },
      { word: 'benefit', meaning: '이익, 혜택' },
      { word: 'effect', meaning: '효과' },
      { word: 'effort', meaning: '노력' },
      { word: 'community', meaning: '공동체' },
      { word: 'individual', meaning: '개인' },
      { word: 'communicate', meaning: '의사소통하다' },
      { word: 'participate', meaning: '참여하다' },
      { word: 'recognize', meaning: '인식하다, 알아보다' },
      { word: 'encourage', meaning: '격려하다' },
      { word: 'solve', meaning: '해결하다' },
      { word: 'reduce', meaning: '줄이다' },
      { word: 'maintain', meaning: '유지하다' },
      { word: 'require', meaning: '필요로 하다' },
      { word: 'suggest', meaning: '제안하다' },
      { word: 'describe', meaning: '묘사하다' },
      { word: 'examine', meaning: '조사하다, 검토하다' },
      { word: 'reason', meaning: '이유' },
      { word: 'behavior', meaning: '행동' },
    ],
    7: [
      { word: 'inevitable', meaning: '피할 수 없는' },
      { word: 'significant', meaning: '중요한, 의미심장한' },
      { word: 'controversial', meaning: '논란이 많은' },
      { word: 'accomplish', meaning: '성취하다' },
      { word: 'persuade', meaning: '설득하다' },
      { word: 'tremendous', meaning: '엄청난' },
      { word: 'genuine', meaning: '진실한' },
      { word: 'reluctant', meaning: '꺼리는, 마지못한' },
      { word: 'contradict', meaning: '모순되다' },
      { word: 'sustain', meaning: '지속하다' },
      { word: 'ambiguous', meaning: '애매모호한' },
      { word: 'arbitrary', meaning: '임의의, 제멋대로인' },
      { word: 'compelling', meaning: '설득력 있는' },
      { word: 'deteriorate', meaning: '악화되다' },
      { word: 'discrepancy', meaning: '불일치, 차이' },
      { word: 'eloquent', meaning: '유창한, 설득력 있는' },
      { word: 'exemplify', meaning: '예를 들어 설명하다' },
      { word: 'hypothesis', meaning: '가설' },
      { word: 'inherent', meaning: '내재하는' },
      { word: 'innovative', meaning: '혁신적인' },
      { word: 'justify', meaning: '정당화하다' },
      { word: 'meticulous', meaning: '꼼꼼한' },
      { word: 'notion', meaning: '개념, 관념' },
      { word: 'obsolete', meaning: '구식의, 쓸모없는' },
      { word: 'perceive', meaning: '인식하다, 지각하다' },
      { word: 'plausible', meaning: '그럴듯한' },
      { word: 'profound', meaning: '심오한' },
      { word: 'rigorous', meaning: '엄격한' },
      { word: 'subsequent', meaning: '다음의, 이후의' },
      { word: 'substantial', meaning: '상당한' },
      { word: 'underestimate', meaning: '과소평가하다' },
      { word: 'unprecedented', meaning: '전례 없는' },
      { word: 'verify', meaning: '검증하다' },
      { word: 'viable', meaning: '실행 가능한' },
    ],
  };

  function vocabQuestionText(item) {
    return `'${item.word}'의 뜻으로 알맞은 것은?`;
  }

  // askedQuestions(선택)를 주면 이미 나온 단어는 걸러내고 뽑는다(한 시험
  // 회차 안에서 같은 단어가 반복되지 않도록). 오답 보기는 같은 등급의
  // 다른 단어 뜻 3개를 무작위로 섞어 만든다.
  function generateEnglishVocabMatchProblem(level, askedQuestions) {
    const bank = ENGLISH_VOCAB_BANK[level] || ENGLISH_VOCAB_BANK[1];
    const pool = askedQuestions && askedQuestions.length
      ? bank.filter((item) => !askedQuestions.includes(vocabQuestionText(item)))
      : bank;
    const picked = randChoice(pool.length ? pool : bank);
    const distractors = shuffle(bank.filter((item) => item.word !== picked.word)).slice(0, 3).map((item) => item.meaning);
    return {
      id: `en-vocab-${level}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      level,
      type: 'choice',
      rewardGold: 8 + level * 4,
      question: vocabQuestionText(picked),
      choices: shuffle([picked.meaning, ...distractors]),
      answer: picked.meaning,
      explanation: `${picked.word} = ${picked.meaning}`,
      hint: `'${picked.word}'는 그 뜻을 아는 다른 문장이나 상황을 떠올리면 기억하기 쉬워요.`,
    };
  }

  /* ---------------------------------------------------------------- */
  /* 과학                                                                */
  /* ---------------------------------------------------------------- */

  // concept: 초등학생 기준으로 중학교 이상 범위인 레벨(4~7)에만 있는 핵심
  // 개념 설명. ENGLISH_LEVELS의 concept과 같은 규칙을 따른다.
  const SCIENCE_LEVELS = [
    { id: 1, name: '초4 과학', desc: '상태변화 · 동식물 · 힘', unlockIntelligence: 0 },
    { id: 2, name: '초5 과학', desc: '태양계 · 용해 · 날씨', unlockIntelligence: 8 },
    { id: 3, name: '초6 과학', desc: '연소 · 전기회로 · 순환계', unlockIntelligence: 18 },
    { id: 4, name: '중1 과학', desc: '상태변화 심화 · 광합성 · 힘과 원소', unlockIntelligence: 28, concept: '광합성은 식물이 햇빛·물·이산화탄소를 이용해 스스로 양분을 만드는 과정이야. 원소 기호(O=산소, H=수소 등)는 원소마다 정해진 약속된 표시야.' },
    { id: 5, name: '중2 과학', desc: '밀도와 용해도 · 기압과 바람 · 소화·순환·호흡 · 유전', unlockIntelligence: 38, concept: '밀도는 같은 부피에서 질량이 얼마나 되는지를 나타내는 값이야(빽빽한 정도라고 생각하면 돼). 유전은 부모의 특징이 자식에게 전해지는 현상이야.' },
    { id: 6, name: '중3 과학', desc: '질량보존 · 등가속도 운동 · 일과 에너지 · 자연선택', unlockIntelligence: 48, concept: '질량 보존 법칙은 화학 반응 전후에 물질의 총 질량이 변하지 않는다는 법칙이야. 등가속도 운동은 시간이 지날수록 속력이 일정하게 늘어나거나 줄어드는 운동이야.' },
    { id: 7, name: '고1 통합과학', desc: '주기율표 · 관성의 법칙 · 지구시스템 · 중화반응', unlockIntelligence: 58, concept: '주기율표는 원소를 성질이 비슷한 것끼리 규칙적으로 배열한 표야. 관성은 물체가 원래 상태(멈춰있거나 움직이던 대로)를 계속 유지하려는 성질이야.' },
  ];

  const SCIENCE_BANK = {
    1: [
      { question: '물이 얼면 어떤 상태로 변할까요?', choices: ['고체', '액체', '기체', '플라즈마'], answer: '고체', explanation: '물이 얼면 고체 상태인 얼음이 됩니다.', hint: '물이 차가워져서 단단하게 굳으면 어떤 상태가 될지 생각해보세요. 얼음을 만져본 느낌을 떠올려보면 답을 알 수 있어요.' },
      { question: '다음 중 곤충이 아닌 것은?', choices: ['거미', '개미', '나비', '벌'], answer: '거미', explanation: '거미는 다리가 8개라서 곤충(다리 6개)이 아닙니다.', hint: '곤충은 다리가 6개예요. 보기 중에서 다리 개수가 다른 동물이 있는지 세어보세요.' },
      { question: '식물이 광합성을 하기 위해 필요한 것이 아닌 것은?', choices: ['소금', '햇빛', '물', '이산화탄소'], answer: '소금', explanation: '광합성에는 햇빛, 물, 이산화탄소가 필요합니다.', hint: '식물이 광합성을 할 때 필요한 건 햇빛, 물, 그리고 공기 중의 어떤 기체예요. 우리가 요리할 때 넣는 조미료는 광합성과 관련이 없어요.' },
      { question: '물체를 밀거나 당기는 작용을 무엇이라고 할까요?', choices: ['힘', '에너지', '속도', '무게'], answer: '힘', explanation: '물체의 모양이나 운동 상태를 바꾸는 작용을 힘이라고 합니다.', hint: '물체를 밀거나 당겨서 모양이나 움직임을 바꾸는 작용을 무엇이라고 하는지 떠올려보세요. 운동선수들이 많이 쓰는 말이기도 해요.' },
      { question: '다음 중 자석에 붙는 물질은?', choices: ['철', '나무', '플라스틱', '유리'], answer: '철', explanation: '철과 같은 금속은 자석에 붙습니다.', hint: '자석에 붙는 물질은 정해져 있어요. 나무, 플라스틱, 유리는 자석에 붙지 않는다는 걸 생각하며 남은 보기를 확인해보세요.' },
      { question: '하루 동안 태양이 움직이는 것처럼 보이는 까닭은?', choices: ['지구가 자전하기 때문', '태양이 지구 주위를 돌기 때문', '달이 돌기 때문', '바람 때문'], answer: '지구가 자전하기 때문', explanation: '지구가 하루에 한 바퀴씩 자전하기 때문에 태양이 움직이는 것처럼 보입니다.', hint: '우리가 살고 있는 지구 자체가 팽이처럼 하루에 한 바퀴씩 돈다는 사실을 떠올려보세요.' },
      { question: '물이 끓어 수증기로 변하는 현상을 무엇이라 할까요?', choices: ['기화', '응고', '융해', '승화'], answer: '기화', explanation: '액체인 물이 기체인 수증기로 변하는 것을 기화라고 합니다.', hint: '물을 끓이면 뜨거운 김이 하늘로 올라가는 걸 본 적 있나요? 액체가 기체로 바뀌는 현상이에요.' },
      { question: '다음 중 우리 몸을 지탱하고 보호하는 기관은?', choices: ['뼈', '피부', '눈', '혀'], answer: '뼈', explanation: '뼈는 몸을 지탱하고 내부 장기를 보호하는 역할을 합니다.', hint: '몸속에 있으면서 딱딱하고 단단해 몸 전체를 지지해주는 부분을 떠올려보세요.' },
      { question: '식물이 뿌리에서 물을 흡수하는 주된 까닭은?', choices: ['광합성과 생장에 필요하기 때문', '뿌리를 무겁게 하려고', '색깔을 바꾸려고', '냄새를 내려고'], answer: '광합성과 생장에 필요하기 때문', explanation: '식물은 물을 흡수해 광합성에 이용하고 성장하는 데 씁니다.', hint: '식물이 살아가고 자라나려면 꼭 필요한 게 있어요. 그것을 뿌리로 빨아들인다고 생각해보세요.' },
      { question: '얼음이 녹아 물이 되는 상태 변화를 무엇이라 할까요?', choices: ['융해', '기화', '응고', '승화'], answer: '융해', explanation: '고체가 액체로 변하는 것을 융해라고 합니다.', hint: '딱딱한 얼음이 시간이 지나면 흐르는 물로 바뀌는 걸 본 적 있죠? 고체가 액체로 변하는 현상이에요.' },
      { question: '식물의 씨가 싹트기 위해 꼭 필요하지 않은 것은?', choices: ['전등 불빛', '물', '적당한 온도', '공기'], answer: '전등 불빛', explanation: '씨가 싹트는 데는 물, 적당한 온도, 공기가 필요하며 빛은 꼭 필요하지 않습니다.', hint: '씨가 싹트는 단계에서는 물과 온도, 공기가 중요해요. 빛은 싹이 튼 후 광합성을 할 때 더 중요해져요.' },
      { question: '동물이 새끼를 낳아 번식하는 방법을 무엇이라 할까요?', choices: ['태생', '난생', '포자번식', '분열'], answer: '태생', explanation: '어미 몸속에서 새끼가 자라 태어나는 것을 태생이라고 합니다(사람, 개 등).', hint: '알을 낳는 게 아니라 배 속에서 새끼가 자라서 바로 태어나는 방식을 떠올려보세요.' },
      { question: '용수철저울로 측정할 수 있는 것은?', choices: ['무게', '온도', '길이', '부피'], answer: '무게', explanation: '용수철저울은 물체를 걸었을 때 늘어나는 정도로 무게를 측정합니다.', hint: '물건을 걸면 스프링이 늘어나는 도구예요. 그 늘어난 정도로 무엇을 알 수 있을지 생각해보세요.' },
      { question: '동물이 다른 동물을 잡아먹기 위해 발달시킨 것이 아닌 것은?', choices: ['꽃가루', '날카로운 이빨', '빠른 다리', '예리한 발톱'], answer: '꽃가루', explanation: '꽃가루는 식물이 번식하기 위한 것으로 동물의 사냥 도구가 아닙니다.', hint: '이빨, 다리, 발톱은 모두 동물이 사냥할 때 쓰는 신체 부위예요. 보기 중 식물과 관련된 것을 찾아보세요.' },
      { question: '다음 중 척추(등뼈)가 있는 동물은?', choices: ['개구리', '지렁이', '달팽이', '오징어'], answer: '개구리', explanation: '개구리는 등뼈(척추)가 있는 척추동물이고, 지렁이·달팽이·오징어는 척추가 없는 무척추동물입니다.', hint: '몸속에 딱딱한 등뼈가 있어 몸을 지지하는 동물을 찾아보세요. 나머지는 몸이 물렁물렁해요.' },
      { question: '자석의 같은 극끼리 가까이 하면 어떻게 될까요?', choices: ['서로 밀어낸다', '서로 끌어당긴다', '아무 변화 없다', '붙어서 안 떨어진다'], answer: '서로 밀어낸다', explanation: '자석은 같은 극(N-N, S-S)끼리는 밀어내고, 다른 극(N-S)끼리는 끌어당깁니다.', hint: '같은 성격을 가진 두 극이 만나면 사이가 안 좋아서 멀어지려는 것처럼 생각해보세요.' },
    ],
    2: [
      { question: '태양계에서 태양과 가장 가까운 행성은?', choices: ['수성', '금성', '지구', '화성'], answer: '수성', explanation: '태양에서 가까운 순서는 수성-금성-지구-화성입니다.', hint: "태양계 행성들의 순서를 '수-금-지-화-목-토-천-해'로 외워두면 쉬워요. 그중 태양에서 가장 가까운 첫 번째 행성이 뭘까요?" },
      { question: '설탕물처럼 물질이 녹아 골고루 섞인 것을 무엇이라 할까요?', choices: ['용액', '고체', '기체', '앙금'], answer: '용액', explanation: '용매에 용질이 녹아 골고루 섞인 것을 용액이라고 합니다.', hint: "설탕이 물에 녹아서 눈에 안 보이게 골고루 섞인 것을 무엇이라 부르는지 떠올려보세요. '녹다'라는 뜻과 관련된 단어예요." },
      { question: '구름이 만들어지는 것과 가장 관련이 깊은 것은?', choices: ['수증기의 응결', '물의 증발', '얼음의 융해', '물의 승화'], answer: '수증기의 응결', explanation: '수증기가 식으면서 작은 물방울로 응결되어 구름이 됩니다.', hint: '따뜻한 수증기가 하늘 위로 올라가 차가워지면 어떻게 되는지 생각해보세요. 여름에 시원한 음료수 잔 표면에 물방울이 맺히는 것과 비슷한 원리예요.' },
      { question: '다음 중 기압이 낮아질 때 나타나기 쉬운 날씨는?', choices: ['흐리거나 비', '맑음', '건조함', '무풍'], answer: '흐리거나 비', explanation: '저기압일 때는 날씨가 흐리거나 비가 오기 쉽습니다.', hint: '기압이 낮다는 건 공기가 위로 올라가기 쉽다는 뜻이에요. 공기가 올라가서 구름이 잘 만들어지면 날씨가 어떻게 될까요?' },
      { question: '우리 몸에서 산소를 흡수하는 기관은?', choices: ['폐', '심장', '위', '간'], answer: '폐', explanation: '폐에서 산소를 받아들이고 이산화탄소를 내보냅니다.', hint: '숨을 들이쉴 때 공기가 들어가는 몸속 기관을 떠올려보세요. 가슴 속에서 풍선처럼 부풀어 오르는 곳이에요.' },
      { question: '물체가 물에 뜨거나 가라앉는 것과 가장 관련이 깊은 것은?', choices: ['밀도', '온도', '색깔', '냄새'], answer: '밀도', explanation: '물보다 밀도가 작으면 뜨고, 크면 가라앉습니다.', hint: "같은 크기라도 무거운 것과 가벼운 것이 있어요. 물체가 물보다 '빽빽한 정도'가 큰지 작은지와 관련된 단어를 떠올려보세요." },
      { question: '다음 중 물질의 세 가지 상태(고체·액체·기체)에 속하지 않는 것은?', choices: ['에너지', '얼음', '물', '수증기'], answer: '에너지', explanation: '고체·액체·기체는 물질의 상태이고, 에너지는 물질의 상태가 아닙니다.', hint: '얼음, 물, 수증기는 모두 같은 물질(H2O)의 서로 다른 상태예요. 그중 물질 자체가 아닌 것을 골라보세요.' },
      { question: '지진이 발생했을 때 가장 먼저 해야 할 안전한 행동은?', choices: ['책상 아래로 몸을 피한다', '창문 밖을 구경한다', '엘리베이터를 탄다', '높은 곳으로 올라간다'], answer: '책상 아래로 몸을 피한다', explanation: '지진이 나면 떨어지는 물건으로부터 몸을 보호하기 위해 튼튼한 책상 아래로 피해야 합니다.', hint: '지진이 나면 물건이 떨어질 수 있어요. 머리와 몸을 보호할 수 있는 튼튼한 가구를 떠올려보세요.' },
      { question: '식물의 뿌리, 줄기, 잎 중 광합성이 가장 활발히 일어나는 곳은?', choices: ['잎', '뿌리', '줄기', '꽃'], answer: '잎', explanation: '잎에는 엽록소가 많아 광합성이 가장 활발하게 일어납니다.', hint: '햇빛을 가장 많이 받는 초록색 부분이 어디인지 생각해보세요.' },
      { question: '태양계에서 가장 큰 행성은?', choices: ['목성', '토성', '지구', '화성'], answer: '목성', explanation: '목성은 태양계에서 가장 큰 행성입니다.', hint: '태양계 행성 중 덩치가 가장 커서 다른 행성들을 모두 합친 것보다도 큰 행성이에요.' },
      { question: '용액에서 녹아 있는 물질을 무엇이라 할까요?', choices: ['용질', '용매', '용액', '앙금'], answer: '용질', explanation: '용액에서 녹는 물질을 용질, 녹이는 물질을 용매라고 합니다.', hint: '설탕물에서 설탕처럼 녹아 들어간 물질을 무엇이라 부르는지 떠올려보세요(녹이는 물인 용매와는 달라요).' },
      { question: '맑은 날 낮과 밤의 기온 변화에 대한 설명으로 옳은 것은?', choices: ['낮에는 기온이 오르고 밤에는 내려간다', '낮과 밤 기온이 항상 같다', '밤에 기온이 더 높다', '기온은 변하지 않는다'], answer: '낮에는 기온이 오르고 밤에는 내려간다', explanation: '태양의 영향으로 낮에는 기온이 오르고, 해가 지면 기온이 내려갑니다.', hint: '태양이 떠 있을 때와 없을 때 중 언제 더 따뜻할지 생각해보세요.' },
      { question: '물에 잘 녹지 않는 고체 가루를 물과 분리할 때 사용하는 도구는?', choices: ['거름종이', '온도계', '자석', '돋보기'], answer: '거름종이', explanation: '물에 녹지 않는 고체는 거름종이로 걸러 분리할 수 있습니다.', hint: '커피를 내릴 때 찌꺼기를 걸러내는 종이를 떠올려보세요.' },
      { question: '바람이 부는 방향을 알아보는 기구는?', choices: ['풍향계', '온도계', '습도계', '기압계'], answer: '풍향계', explanation: '풍향계는 바람이 부는 방향을 측정하는 기구입니다.', hint: '바람이 부는 방향을 가리켜주는, 화살표 모양이 달린 기구를 떠올려보세요.' },
      { question: '다음 중 그림자가 생기기 위해 필요한 조건이 아닌 것은?', choices: ['소리', '빛', '물체', '스크린(바닥)'], answer: '소리', explanation: '그림자는 빛, 물체, 빛을 가로막아 그림자가 생기는 바닥(스크린)이 있어야 생기며 소리와는 관련이 없습니다.', hint: '그림자가 생기려면 빛과 그 빛을 가로막는 물체, 그리고 그림자가 비칠 곳이 필요해요. 귀로 듣는 것과는 관련이 없어요.' },
      { question: '물이 증발해 수증기가 되는 현상이 가장 활발하게 일어나는 경우는?', choices: ['넓은 그릇에 담아 햇볕에 두었을 때', '좁은 병에 담아 냉장고에 두었을 때', '뚜껑을 닫아 어두운 곳에 두었을 때', '얼려서 냉동실에 두었을 때'], answer: '넓은 그릇에 담아 햇볕에 두었을 때', explanation: '온도가 높고 표면적이 넓을수록 증발이 활발하게 일어납니다.', hint: '빨래가 넓게 펴서 햇볕이 잘 드는 곳에 널려 있을 때 더 빨리 마르는 이유를 생각해보세요.' },
    ],
    3: [
      { question: '물질이 산소와 만나 빛과 열을 내며 타는 현상은?', choices: ['연소', '증발', '융해', '부식'], answer: '연소', explanation: '물질이 산소와 반응해 빛과 열을 내는 현상을 연소라고 합니다.', hint: '물질이 산소와 만나 활활 타오르며 빛과 열을 내는 현상을 무엇이라고 하는지 떠올려보세요. 촛불이나 장작불을 생각해보세요.' },
      { question: '전지의 두 극을 반대로 연결해도 전구는 어떻게 될까요?', choices: ['켜진다', '안 켜진다', '터진다', '깜빡인다'], answer: '켜진다', explanation: '전구는 방향과 상관없이 전류가 흐르면 켜집니다.', hint: '전구는 전류가 어느 방향으로 흐르든 불이 켜지는 성질이 있어요. 극을 반대로 연결해도 전류 자체는 흐를 수 있다는 점을 생각해보세요.' },
      { question: '다음 중 소화를 담당하지 않는 기관은?', choices: ['심장', '위', '소장', '대장'], answer: '심장', explanation: '심장은 혈액을 순환시키는 기관이며 소화 기관이 아닙니다.', hint: '소화 기관은 음식물이 지나가는 길에 있는 기관들이에요(위, 소장, 대장 등). 온몸에 피를 보내는 펌프 역할을 하는 기관은 소화와 관련이 없어요.' },
      { question: '혈액을 온몸으로 순환시키는 기관은?', choices: ['심장', '폐', '위', '콩팥'], answer: '심장', explanation: '심장이 펌프처럼 뛰면서 혈액을 온몸에 보냅니다.', hint: '몸속에서 펌프처럼 뛰면서 피를 온몸 구석구석으로 보내는 기관을 떠올려보세요. 가슴에 손을 얹으면 콩닥콩닥 느껴지는 곳이에요.' },
      { question: '다음 중 순물질이 아닌 것은?', choices: ['소금물', '산소', '철', '물'], answer: '소금물', explanation: '소금물은 소금과 물이 섞인 혼합물입니다.', hint: '순물질은 다른 물질이 섞이지 않은 한 가지 물질이에요. 보기 중에서 두 가지 물질이 섞여 있는 것을 찾아보세요.' },
      { question: '달의 모양이 날마다 달라 보이는 까닭은?', choices: ['달이 지구 주위를 돌며 빛을 받는 부분이 달라져서', '달의 크기가 변해서', '지구가 자전해서', '태양이 움직여서'], answer: '달이 지구 주위를 돌며 빛을 받는 부분이 달라져서', explanation: '달의 위치에 따라 태양빛을 받는 부분이 달라 보이는 모양이 바뀝니다.', hint: '달은 스스로 빛을 내지 않고 태양빛을 반사해요. 달이 지구 주위를 돌면서 태양빛을 받는 부분이 계속 바뀐다는 점을 떠올려보세요.' },
      { question: '다음 중 전기를 잘 통하는 도체가 아닌 것은?', choices: ['고무', '철', '구리', '알루미늄'], answer: '고무', explanation: '고무는 전기가 잘 통하지 않는 부도체이고, 철·구리·알루미늄은 도체입니다.', hint: '전선 겉을 감싸는 재료를 떠올려보세요. 전기가 통하면 위험하니 안 통하는 재료로 감싸요.' },
      { question: '길을 걷다가 갑자기 소나기(번개·천둥)를 만났을 때 가장 안전한 행동은?', choices: ['건물 안으로 들어간다', '큰 나무 아래로 피한다', '우산을 높이 든다', '넓은 운동장 한가운데 선다'], answer: '건물 안으로 들어간다', explanation: '번개가 칠 때는 큰 나무나 넓은 곳보다 건물 안으로 대피하는 것이 가장 안전합니다.', hint: '큰 나무나 넓은 운동장은 번개를 맞기 쉬운 장소예요. 비바람을 피할 수 있는 안전한 곳이 어디일지 생각해보세요.' },
      { question: '혼합물에서 소금과 모래를 분리할 때 가장 적절한 방법은?', choices: ['물에 녹여 거름종이로 거른다', '자석으로 분리한다', '체로 거른다', '그냥 손으로 골라낸다'], answer: '물에 녹여 거름종이로 거른다', explanation: '소금은 물에 녹고 모래는 녹지 않으므로, 물에 녹인 뒤 거름종이로 걸러 분리할 수 있습니다.', hint: '소금은 물에 잘 녹지만 모래는 물에 녹지 않아요. 이 성질 차이를 이용해 분리하는 방법을 떠올려보세요.' },
      { question: '초가 타기 위해 반드시 필요한 기체는?', choices: ['산소', '질소', '이산화탄소', '수소'], answer: '산소', explanation: '연소(타는 것)에는 반드시 산소가 필요합니다.', hint: '병으로 촛불을 덮으면 불이 꺼지는 실험을 떠올려보세요. 어떤 기체가 부족해져서 꺼지는 걸까요?' },
      { question: '전구 두 개를 직렬로 연결했을 때, 하나가 고장 나면 나머지 전구는 어떻게 될까요?', choices: ['꺼진다', '더 밝아진다', '그대로 켜져 있다', '깜빡인다'], answer: '꺼진다', explanation: '직렬연결에서는 전류가 흐르는 길이 하나뿐이라 하나가 고장 나면 회로 전체에 전류가 흐르지 않습니다.', hint: '직렬연결은 전기가 흐르는 길이 하나로 이어져 있어요. 그 길의 중간이 끊기면 어떻게 될까요?' },
      { question: '심장에서 나온 혈액을 온몸으로 나르는 혈관은?', choices: ['동맥', '정맥', '모세혈관', '림프관'], answer: '동맥', explanation: '동맥은 심장에서 나온 혈액을 온몸으로 보내는 혈관입니다.', hint: '심장에서 "나가는" 피가 흐르는 혈관을 떠올려보세요(돌아오는 혈관과는 달라요).' },
      { question: '기체가 바로 고체로 변하는 상태 변화는?', choices: ['승화', '기화', '융해', '액화'], answer: '승화', explanation: '기체에서 고체로(또는 고체에서 기체로) 바로 변하는 현상을 승화라고 합니다.', hint: '드라이아이스가 액체 없이 바로 기체로 변하는 것처럼, 고체와 기체가 액체 단계 없이 바로 바뀌는 현상이에요.' },
      { question: '화산이 폭발할 때 나오는 뜨겁게 녹은 액체 물질은?', choices: ['용암', '화산재', '수증기', '이산화탄소'], answer: '용암', explanation: '화산 활동으로 지표면 위로 흘러나온 뜨거운 액체 물질을 용암이라고 합니다.', hint: '화산이 터질 때 산비탈을 타고 뜨겁게 흘러내리는 붉은 액체를 떠올려보세요.' },
      { question: '물이 전기를 잘 통하게 하기 위해 흔히 녹이는 물질은?', choices: ['소금', '설탕', '기름', '모래'], answer: '소금', explanation: '순수한 물은 전기가 잘 통하지 않지만, 소금과 같은 전해질을 녹이면 이온이 생겨 전기가 잘 통하게 됩니다.', hint: '음식의 짠맛을 내는 물질이 물에 녹으면 물속에 전기를 나르는 입자가 많아져요.' },
      { question: '우리 몸에서 노폐물을 걸러 오줌으로 내보내는 기관은?', choices: ['콩팥', '간', '폐', '위'], answer: '콩팥', explanation: '콩팥(신장)은 혈액 속 노폐물을 걸러내 오줌으로 내보내는 배설 기관입니다.', hint: '허리 부근 양쪽에 있으면서 몸속 노폐물을 걸러 오줌을 만드는 기관을 떠올려보세요.' },
    ],
    4: [
      { question: '액체가 기체로 변하는 상태 변화는?', choices: ['기화', '응고', '액화', '승화'], answer: '기화', explanation: '액체가 기체로 변하는 것을 기화라고 합니다.', hint: '물이 끓어서 수증기가 되는 것처럼, 액체가 기체로 변하는 현상을 무엇이라고 하는지 떠올려보세요.' },
      { question: '식물의 잎에서 빛을 이용해 양분을 만드는 과정은?', choices: ['광합성', '호흡', '증산', '흡수'], answer: '광합성', explanation: '식물은 빛, 물, 이산화탄소로 광합성을 하여 양분을 만듭니다.', hint: '식물의 잎이 햇빛을 받아 스스로 양분을 만들어내는 과정을 무엇이라고 부르는지 떠올려보세요.' },
      { question: '지구가 물체를 잡아당겨 아래로 떨어지게 하는 힘은?', choices: ['중력', '마찰력', '부력', '탄성력'], answer: '중력', explanation: '중력은 지구가 물체를 당기는 힘입니다.', hint: '사과가 나무에서 땅으로 떨어지는 이유를 설명해주는 힘이에요. 지구가 물체를 끌어당기는 힘을 무엇이라고 부르는지 떠올려보세요.' },
      { question: "원소 기호 'O'가 나타내는 원소는?", choices: ['산소', '수소', '질소', '금'], answer: '산소', explanation: "산소의 원소 기호는 O입니다.", hint: "우리가 숨을 쉴 때 들이마시는 기체의 원소 기호예요. 영어 단어 'oxygen'의 앞글자를 떠올려보세요." },
      { question: '두 물체가 맞닿아 움직일 때 운동을 방해하는 힘은?', choices: ['마찰력', '중력', '부력', '탄성력'], answer: '마찰력', explanation: '표면이 맞닿아 움직일 때 방해하는 힘을 마찰력이라고 합니다.', hint: '두 물체의 표면이 맞닿아 움직일 때 그 움직임을 방해하는 힘이에요. 미끄러운 바닥과 거친 바닥에서 걷는 느낌 차이를 떠올려보세요.' },
      { question: '혼합물을 성질 차이로 분리하는 방법이 아닌 것은?', choices: ['광합성', '거름', '증류', '재결정'], answer: '광합성', explanation: '광합성은 식물이 양분을 만드는 과정으로 혼합물 분리 방법이 아닙니다.', hint: '거름, 증류, 재결정은 모두 성질이 다른 물질들을 나누는 방법이에요. 보기 중 식물이 양분을 만드는 것과 관련된 것을 찾아보세요(그건 분리 방법이 아니에요).' },
      { question: '원소 기호 H가 나타내는 원소는?', choices: ['수소', '헬륨', '질소', '나트륨'], answer: '수소', explanation: '수소의 원소 기호는 H입니다.', hint: "영어 단어 'hydrogen'의 앞글자를 떠올려보세요. 물(H2O)을 이루는 원소 중 하나예요." },
      { question: '실험실에서 뜨거운 물질을 다룰 때 지켜야 할 안전 수칙으로 옳은 것은?', choices: ['보호 장갑과 보안경을 착용한다', '장난치며 서로 부딪힌다', '맨손으로 만져본다', '뛰어다니며 실험한다'], answer: '보호 장갑과 보안경을 착용한다', explanation: '실험실에서는 항상 안전 장비를 착용하고 안전 수칙을 지켜야 합니다.', hint: '실험실은 다칠 위험이 있는 곳이에요. 나를 보호할 수 있는 장비를 먼저 갖추는 것이 순서예요.' },
      { question: '물체의 운동에서 마찰력이 하는 역할로 옳은 것은?', choices: ['운동을 방해해 속도를 줄인다', '운동을 항상 빠르게 한다', '물체를 공중에 띄운다', '온도를 낮춘다'], answer: '운동을 방해해 속도를 줄인다', explanation: '마찰력은 운동을 방해하는 힘으로, 물체의 속도를 줄이는 역할을 합니다.', hint: '자전거 브레이크를 잡으면 왜 멈추는지 생각해보세요. 표면끼리 스치면서 운동을 방해하는 힘이에요.' },
      { question: '기체가 액체로 변하는 상태 변화는?', choices: ['액화', '기화', '융해', '승화'], answer: '액화', explanation: '기체가 액체로 변하는 것을 액화라고 합니다.', hint: '차가운 유리컵 표면에 물방울이 맺히는 것처럼, 수증기(기체)가 물(액체)로 바뀌는 현상이에요.' },
      { question: '식물이 광합성으로 만든 양분을 저장하는 형태로 가장 알맞은 것은?', choices: ['녹말', '단백질', '이산화탄소', '산소'], answer: '녹말', explanation: '식물은 광합성으로 만든 포도당을 녹말 형태로 저장합니다.', hint: '식물이 광합성으로 만든 양분은 나중에 쓰기 위해 저장하기 좋은 형태로 바뀌어요. 감자에 많이 들어있는 성분을 떠올려보세요.' },
      { question: '물체를 물속에 넣었을 때 위로 뜨게 하는 힘은?', choices: ['부력', '중력', '마찰력', '탄성력'], answer: '부력', explanation: '부력은 액체나 기체가 그 속에 있는 물체를 위로 밀어 올리는 힘입니다.', hint: '튜브를 타고 물 위에 둥둥 뜰 수 있게 해주는 힘을 떠올려보세요.' },
      { question: '원소 기호 N이 나타내는 원소는?', choices: ['질소', '나트륨', '니켈', '네온'], answer: '질소', explanation: '질소의 원소 기호는 N입니다.', hint: "우리가 마시는 공기의 대부분(약 78%)을 차지하는 기체예요. 영어 단어 'nitrogen'의 앞글자를 떠올려보세요." },
      { question: '용수철이 늘어난 길이는 매단 추의 무게와 어떤 관계일까요?', choices: ['비례한다', '반비례한다', '관계없다', '항상 같다'], answer: '비례한다', explanation: '용수철의 늘어난 길이는 매단 추의 무게에 비례합니다(훅의 법칙).', hint: '무거운 추를 매달수록 용수철이 얼마나 늘어나는지 생각해보세요. 무게가 커질수록 늘어나는 길이도 커질까요, 줄어들까요?' },
      { question: '물체에 작용하는 알짜힘(합력)이 0일 때 물체의 운동 상태는?', choices: ['운동 상태가 변하지 않는다', '반드시 정지한다', '반드시 가속한다', '반드시 감속한다'], answer: '운동 상태가 변하지 않는다', explanation: '알짜힘이 0이면 물체는 원래의 운동 상태(정지 또는 등속 운동)를 계속 유지합니다.', hint: '힘들이 서로 상쇄되어 결과적으로 아무 힘도 작용하지 않는 것과 같은 상태를 떠올려보세요. 그럴 때 물체는 하던 대로 계속할까요, 바뀔까요?' },
      { question: '잎에서 물이 수증기 형태로 빠져나가는 현상을 무엇이라 할까요?', choices: ['증산작용', '광합성', '호흡작용', '흡수작용'], answer: '증산작용', explanation: '증산작용은 식물의 잎에 있는 기공을 통해 물이 수증기로 빠져나가는 현상입니다.', hint: '식물이 뿌리로 빨아들인 물 중 일부가 잎의 작은 구멍을 통해 수증기로 날아가는 현상을 떠올려보세요.' },
    ],
    5: [
      { question: '같은 부피의 두 물질 중 질량이 더 큰 쪽은 무엇이 더 클까요?', choices: ['밀도', '온도', '색깔의 진하기', '부피'], answer: '밀도', explanation: '밀도는 단위 부피당 질량이므로, 같은 부피에서 질량이 클수록 밀도가 큽니다.', hint: '같은 크기의 솜뭉치와 쇠공을 들어보면 어느 쪽이 더 무겁게 느껴질지 생각해보세요. 그 "빽빽한 정도"를 나타내는 말이에요.' },
      { question: '온도가 높아질수록 대부분의 고체 물질이 물에 녹는 양(용해도)은 어떻게 될까요?', choices: ['커진다', '작아진다', '변화 없다', '0이 된다'], answer: '커진다', explanation: '대부분의 고체는 온도가 높아질수록 용해도가 커져 더 많이 녹습니다.', hint: '따뜻한 물과 차가운 물 중 설탕이 더 잘 녹는 쪽이 어디인지 떠올려보세요.' },
      { question: '공기가 고기압에서 저기압 쪽으로 이동하는 현상을 무엇이라 할까요?', choices: ['바람', '파도', '구름', '눈'], answer: '바람', explanation: '기압 차이 때문에 공기가 이동하는 것이 바람입니다.', hint: '선풍기 없이도 밖에서 얼굴에 스치는, 공기의 흐름을 무엇이라 부르는지 떠올려보세요.' },
      { question: '지방을 분해하는 소화 효소(리파아제)를 분비해 소화를 돕는 기관은?', choices: ['이자(췌장)', '콩팥', '폐', '뼈'], answer: '이자(췌장)', explanation: '이자는 지방·단백질·탄수화물을 분해하는 여러 소화 효소를 분비합니다.', hint: '위와 작은창자 사이에서 소화를 돕는 액체를 만들어내는, 콩팥이나 폐와는 다른 소화 관련 기관을 떠올려보세요.' },
      { question: '심장에서 나온 혈액이 온몸을 거쳐 다시 심장으로 돌아오는 순환은?', choices: ['온몸순환(체순환)', '폐순환', '소화순환', '림프순환'], answer: '온몸순환(체순환)', explanation: '온몸순환은 심장에서 출발해 온몸 구석구석을 돌고 다시 심장으로 돌아오는 큰 순환입니다.', hint: '피가 심장에서 나가 손끝, 발끝까지 몸 전체를 돌고 다시 심장으로 돌아오는 큰 경로를 떠올려보세요(폐만 도는 순환과는 달라요).' },
      { question: '숨을 들이쉴 때 갈비뼈와 가로막(횡격막)은 각각 어떻게 움직일까요?', choices: ['갈비뼈는 올라가고 가로막은 내려간다', '갈비뼈는 내려가고 가로막은 올라간다', '둘 다 움직이지 않는다', '둘 다 내려간다'], answer: '갈비뼈는 올라가고 가로막은 내려간다', explanation: '숨을 들이쉴 때 가슴 공간이 넓어지도록 갈비뼈는 올라가고 가로막은 내려갑니다.', hint: '숨을 크게 들이쉴 때 가슴이 넓어지려면 갈비뼈와 가로막이 서로 반대 방향으로 움직여야 해요.' },
      { question: '눈, 귀 같은 감각기관이 받아들인 자극을 뇌로 전달하는 세포는?', choices: ['뉴런(신경세포)', '적혈구', '백혈구', '근육세포'], answer: '뉴런(신경세포)', explanation: '뉴런(신경세포)은 자극과 신호를 전기적 신호로 바꿔 전달하는 신경계의 기본 단위입니다.', hint: '온몸에 퍼져 있으면서 자극을 전기 신호처럼 빠르게 뇌까지 실어 나르는 특별한 세포를 떠올려보세요(피를 나르는 세포와는 달라요).' },
      { question: '완두콩 교배 실험으로 유전의 기본 원리를 처음 밝혀낸 과학자는?', choices: ['멘델', '다윈', '뉴턴', '파스퇴르'], answer: '멘델', explanation: '멘델은 완두콩 교배 실험을 통해 우열의 법칙, 분리의 법칙 등 유전의 기본 원리를 발견했습니다.', hint: '수도원 정원에서 완두콩을 심고 교배시키며 유전의 규칙을 처음 정리한 과학자의 이름이에요.' },
      { question: '태풍이 올 때 가장 안전한 행동은?', choices: ['창문에서 떨어져 안전한 실내에 머문다', '창문 옆에서 밖을 구경한다', '우산을 쓰고 밖에 나간다', '강가로 나가 구경한다'], answer: '창문에서 떨어져 안전한 실내에 머문다', explanation: '태풍이 불 때는 유리 파손 등의 위험이 있는 창가나 야외를 피하고 실내 안전한 곳에 머물러야 합니다.', hint: '강한 바람에 유리창이 깨지거나 물건이 날아올 수 있어요. 그런 위험에서 먼 곳이 어디일지 생각해보세요.' },
      { question: '기체의 부피는 온도가 높아지면 어떻게 될까요?(압력이 일정할 때)', choices: ['커진다', '작아진다', '변화 없다', '0이 된다'], answer: '커진다', explanation: '압력이 일정할 때 기체의 부피는 온도가 높아지면 커집니다(샤를 법칙).', hint: '풍선을 따뜻하게 하면 부풀어 오르는 것을 떠올려보세요. 온도가 오르면 기체 입자들이 어떻게 움직일지 생각해보세요.' },
      { question: '입에서 시작해 항문까지 음식물이 지나가는 하나의 긴 관을 무엇이라 할까요?', choices: ['소화관', '순환계', '호흡관', '배설관'], answer: '소화관', explanation: '입-식도-위-소장-대장-항문으로 이어지는 긴 관을 소화관이라고 합니다.', hint: '음식이 들어가서 소화되며 지나가는, 입에서 항문까지 이어진 긴 통로를 떠올려보세요.' },
      { question: '부모의 형질이 자손에게 전달될 때 그 정보를 담고 있는 것은?', choices: ['유전자', '세포막', '미토콘드리아', '엽록체'], answer: '유전자', explanation: '유전자는 부모의 형질에 대한 정보를 자손에게 전달하는 역할을 합니다.', hint: '부모를 닮게 만드는 정보가 담겨 있는, DNA 속의 단위를 떠올려보세요.' },
      { question: '들이마신 산소가 몸속 세포까지 전달되는 경로로 옳은 것은?', choices: ['폐 → 혈액 → 온몸의 세포', '위 → 소장 → 대장', '심장 → 뇌 → 간', '입 → 식도 → 위'], answer: '폐 → 혈액 → 온몸의 세포', explanation: '산소는 폐에서 흡수되어 혈액을 통해 온몸의 세포로 전달됩니다.', hint: '숨 쉴 때 들어온 산소가 어디를 거쳐 몸 구석구석 세포까지 가는지 순서대로 생각해보세요.' },
      { question: '높은 산 위로 올라갈수록 기압은 어떻게 변할까요?', choices: ['낮아진다', '높아진다', '변화 없다', '0이 된다'], answer: '낮아진다', explanation: '높이 올라갈수록 공기의 양이 적어져 기압이 낮아집니다.', hint: '높은 산 정상에서는 숨쉬기가 더 힘들다고 하죠? 공기가 희박해지는 것과 관련이 있어요.' },
      { question: '혈액 속에서 산소를 운반하는 역할을 하는 세포는?', choices: ['적혈구', '백혈구', '혈소판', '혈장'], answer: '적혈구', explanation: '적혈구는 헤모글로빈을 이용해 산소를 온몸으로 운반하는 역할을 합니다.', hint: '피가 빨갛게 보이도록 하는 색소를 가지고 있으면서, 산소를 몸 곳곳에 실어 나르는 혈액 성분을 떠올려보세요.' },
      { question: '여러 종류의 세포가 모여 특정한 기능을 수행하는 단계를 무엇이라 할까요?', choices: ['조직', '기관', '개체', '기관계'], answer: '조직', explanation: '비슷한 세포들이 모여 특정 기능을 담당하는 것을 조직이라고 하며, 조직들이 모여 기관을 이룹니다.', hint: '세포보다 크고 기관보다 작은 단계로, 비슷한 세포들이 모여 이루어진 단계를 떠올려보세요.' },
    ],
    6: [
      { question: '화학 반응이 일어나기 전과 후, 물질의 총 질량은 어떻게 될까요?', choices: ['변하지 않는다', '항상 늘어난다', '항상 줄어든다', '반응마다 다르다'], answer: '변하지 않는다', explanation: '질량 보존 법칙에 따라 화학 반응 전후 물질의 총 질량은 변하지 않습니다.', hint: '반응 전 재료들의 무게를 다 더한 것과 반응 후 생성물들의 무게를 다 더한 것을 비교하면 어떨지 생각해보세요.' },
      { question: '물(H2O)을 이루는 수소와 산소는 항상 어떤 관계로 결합할까요?', choices: ['일정한 질량비', '그때그때 다른 비율', '온도에 따라 달라지는 비율', '압력에 따라 달라지는 비율'], answer: '일정한 질량비', explanation: '일정 성분비 법칙에 따라 한 화합물을 이루는 성분 원소의 질량비는 항상 일정합니다.', hint: '물은 언제 어디서 만들어지든 항상 수소와 산소가 똑같은 비율로 이루어져 있어요.' },
      { question: '시간이 지날수록 속력이 일정하게 계속 늘어나는 운동을 무엇이라 할까요?', choices: ['등가속도 운동', '등속 운동', '정지 상태', '왕복 운동'], answer: '등가속도 운동', explanation: '속력이 일정한 비율로 계속 변하는(예: 늘어나는) 운동을 등가속도 운동이라고 합니다.', hint: '자유낙하하는 물체처럼, 시간이 지날수록 속력이 규칙적으로 점점 빨라지는 운동을 떠올려보세요.' },
      { question: '공기 저항이 없다면 자유낙하하는 물체의 속력은 1초마다 약 몇 m/s씩 빨라질까요?', choices: ['약 9.8m/s', '약 1m/s', '약 100m/s', '전혀 빨라지지 않는다'], answer: '약 9.8m/s', explanation: '중력가속도는 약 9.8m/s²로, 자유낙하하는 물체는 1초마다 속력이 약 9.8m/s씩 늘어납니다.', hint: '지구의 중력이 물체를 끌어당기는 정도를 나타내는 값으로, 과학 시간에 자주 나오는 약 9.8이라는 숫자를 떠올려보세요.' },
      { question: '물체에 힘을 작용해 힘의 방향으로 물체를 이동시켰을 때, 이를 무엇이라 할까요?', choices: ['일', '에너지', '속력', '가속도'], answer: '일', explanation: '물리학에서 힘이 물체를 힘의 방향으로 이동시켰을 때 "일을 했다"고 표현합니다.', hint: '무거운 상자를 밀어서 옮겼을 때, 과학에서는 그 행동을 한 글자로 뭐라고 부르는지 떠올려보세요.' },
      { question: '뜨거운 것에 닿았을 때 나도 모르게 손을 떼는 것처럼 의식하지 않고 즉각 일어나는 반응은?', choices: ['무조건반사', '의식적 반응', '학습된 습관', '생각한 뒤의 행동'], answer: '무조건반사', explanation: '무조건반사는 대뇌를 거치지 않고 척수 등에서 즉각 일어나는 반응으로 반응 속도가 매우 빠릅니다.', hint: '너무 뜨거워서 생각할 틈도 없이 손이 저절로 움직이는 것처럼, 뇌로 판단할 시간도 없이 몸이 먼저 반응하는 경우를 떠올려보세요.' },
      { question: '정자와 난자가 만나 하나의 세포(수정란)가 되는 과정을 무엇이라 할까요?', choices: ['수정', '배란', '착상', '발생'], answer: '수정', explanation: '정자와 난자가 결합하는 과정을 수정이라고 하며, 그 결과 수정란이 만들어집니다.', hint: '새로운 생명이 시작되는 첫 순간, 두 세포가 하나로 합쳐지는 과정을 무엇이라 부르는지 떠올려보세요.' },
      { question: '환경에 잘 적응한 개체가 살아남아 자손을 남기며 종이 변화해가는 과정은?', choices: ['자연선택', '인공선택', '돌연변이', '멸종'], answer: '자연선택', explanation: '다윈이 제시한 자연선택은 환경에 유리한 형질을 가진 개체가 살아남아 자손을 남기는 진화의 원리입니다.', hint: '자연 속에서 살아남기에 유리한 특징을 가진 개체가 더 많이 살아남아 자손을 남긴다는 다윈의 이론을 떠올려보세요.' },
      { question: '밤하늘에서 스스로 빛을 내는 천체를 무엇이라 할까요?', choices: ['항성(별)', '행성', '위성', '혜성'], answer: '항성(별)', explanation: '항성(별)은 스스로 빛을 내는 천체이며, 태양도 항성의 하나입니다.', hint: '태양처럼 스스로 뜨겁게 타올라 빛을 내는 천체와, 그 빛을 반사만 하는 행성·위성의 차이를 생각해보세요.' },
      { question: '높은 곳에 있는 물체가 가진, 위치에 의한 에너지를 무엇이라 할까요?', choices: ['위치 에너지', '운동 에너지', '화학 에너지', '전기 에너지'], answer: '위치 에너지', explanation: '높은 곳에 있는 물체가 중력에 의해 가지는 에너지를 위치 에너지라고 합니다.', hint: '롤러코스터가 높은 곳에서 출발할수록 더 빠르게 내려가는 이유와 관련된 에너지예요.' },
      { question: '움직이고 있는 물체가 가진 에너지를 무엇이라 할까요?', choices: ['운동 에너지', '위치 에너지', '탄성 에너지', '열 에너지'], answer: '운동 에너지', explanation: '움직이는 물체가 가진 에너지를 운동 에너지라고 하며, 속력이 빠를수록 커집니다.', hint: '달리는 자동차처럼 움직이고 있는 물체가 가진 에너지를 떠올려보세요.' },
      { question: '외부에서 에너지가 들어오거나 나가지 않으면 전체 에너지의 총량은 어떻게 될까요?', choices: ['변하지 않는다', '점점 늘어난다', '점점 줄어든다', '0이 된다'], answer: '변하지 않는다', explanation: '에너지 보존 법칙에 따라 에너지는 형태만 바뀔 뿐 총량은 변하지 않습니다.', hint: '에너지는 형태(운동 에너지, 위치 에너지 등)만 바뀔 뿐 전체 양은 그대로 유지된다는 법칙이 있어요.' },
      { question: '오랜 시간에 걸쳐 생물의 특징이 변화해 새로운 종이 나타나는 과정을 무엇이라 할까요?', choices: ['진화', '유전', '돌연변이', '분류'], answer: '진화', explanation: '진화는 오랜 시간에 걸쳐 생물 집단의 특징이 변해가는 과정입니다.', hint: '아주 오랜 시간에 걸쳐 생물의 모습이나 특징이 서서히 변해가는 큰 흐름을 떠올려보세요.' },
      { question: '화학 반응 전 물질(반응물)과 반응 후 물질(생성물)의 종류는 어떻게 될까요?', choices: ['달라질 수 있다', '항상 완전히 같다', '항상 개수만 같다', '항상 부피만 같다'], answer: '달라질 수 있다', explanation: '화학 반응이 일어나면 물질의 종류는 바뀌지만(반응물≠생성물), 총 질량은 보존됩니다.', hint: '나무가 타서 재가 되는 것처럼, 화학 반응 후에는 원래와는 다른 새로운 물질이 만들어질 수 있어요(질량만 보존돼요).' },
      { question: '화학 반응에서 반응 속도를 빠르게 해주지만 자신은 변하지 않는 물질은?', choices: ['촉매', '용매', '용질', '생성물'], answer: '촉매', explanation: '촉매는 반응 속도를 변화시키지만 반응 전후 자신은 변하지 않는 물질입니다.', hint: '반응을 도와주지만 반응이 끝난 뒤에도 그대로 남아있는 물질을 떠올려보세요.' },
      { question: '물체의 속력을 시간에 대해 나타낸 그래프에서 그래프 아래 넓이가 나타내는 것은?', choices: ['이동 거리', '가속도', '질량', '힘'], answer: '이동 거리', explanation: '속력-시간 그래프에서 그래프와 시간축 사이의 넓이는 이동 거리를 나타냅니다.', hint: '속력을 시간에 따라 그린 그래프에서, 그 아래 색칠된 부분의 넓이가 무엇을 뜻할지 생각해보세요.' },
    ],
    7: [
      { question: '원소를 원자 번호 순서로 배열해 성질이 비슷한 원소가 주기적으로 나타나도록 만든 표는?', choices: ['주기율표', '원소기호표', '화학식표', '분자모형표'], answer: '주기율표', explanation: '주기율표는 원소를 원자 번호 순으로 배열해 성질이 비슷한 원소가 같은 세로줄(족)에 오도록 만든 표입니다.', hint: '과학실 벽에 자주 붙어 있는, 원소들을 규칙적인 표 모양으로 정리해둔 것을 떠올려보세요.' },
      { question: '지각을 이루는 암석에서 가장 많은 양을 차지하는 원소는?', choices: ['산소', '철', '탄소', '수소'], answer: '산소', explanation: '지각을 구성하는 원소 중 산소가 질량비로 가장 많은 비중을 차지합니다.', hint: '우리가 숨 쉬는 기체이기도 한 이 원소는, 놀랍게도 땅속 암석에도 가장 많이 들어있어요.' },
      { question: '물체에 힘이 작용하지 않으면 정지한 물체는 계속 정지해 있고, 운동하던 물체는 계속 등속 운동을 한다는 법칙은?', choices: ['관성의 법칙', '가속도의 법칙', '작용 반작용의 법칙', '에너지 보존 법칙'], answer: '관성의 법칙', explanation: '뉴턴의 운동 제1법칙인 관성의 법칙에 대한 설명입니다.', hint: '버스가 갑자기 출발하면 몸이 뒤로 쏠리는 것처럼, 물체가 원래 상태를 계속 유지하려는 성질을 무엇이라 하는지 떠올려보세요.' },
      { question: '지권, 수권, 기권, 생물권처럼 서로 영향을 주고받는 지구의 하위 요소들을 통틀어 무엇이라 할까요?', choices: ['지구시스템', '생태계', '수권', '암석권'], answer: '지구시스템', explanation: '지권·수권·기권·생물권이 서로 물질과 에너지를 주고받으며 상호작용하는 것을 지구시스템이라고 합니다.', hint: '땅, 물, 공기, 생물이 서로 영향을 주고받으며 지구 전체를 이루는 큰 틀을 무엇이라 부르는지 생각해보세요.' },
      { question: '생명체를 이루는 가장 기본적인 구조적·기능적 단위는?', choices: ['세포', '기관', '조직', '개체'], answer: '세포', explanation: '세포는 생명체를 이루는 가장 작은 구조적·기능적 단위입니다.', hint: '현미경으로 봐야 보일 만큼 작지만, 우리 몸을 이루는 가장 기본적인 살아있는 단위가 무엇인지 떠올려보세요.' },
      { question: '산과 염기가 반응해 물과 염이 생기는 반응을 무엇이라 할까요?', choices: ['중화 반응', '산화 반응', '환원 반응', '연소 반응'], answer: '중화 반응', explanation: '산과 염기가 만나 서로의 성질을 상쇄시키며 물과 염을 만드는 반응을 중화 반응이라고 합니다.', hint: '신 것(산)과 미끈거리는 것(염기)이 만나 서로 성질이 사라지는 반응을 무엇이라 하는지 떠올려보세요.' },
      { question: '먹고 먹히는 관계로 사슬처럼 연결된 생물들 사이의 관계를 무엇이라 할까요?', choices: ['먹이 사슬', '생태 피라미드', '개체군', '군집'], answer: '먹이 사슬', explanation: '생산자에서 소비자로 이어지는 먹고 먹히는 관계의 사슬을 먹이 사슬이라고 합니다.', hint: '풀을 토끼가 먹고, 토끼를 여우가 먹는 것처럼 사슬 모양으로 이어지는 관계를 떠올려보세요.' },
      { question: '태양빛을 직접 전기 에너지로 바꾸는 신재생 에너지 발전 방식은?', choices: ['태양광 발전', '화력 발전', '수력 발전', '원자력 발전'], answer: '태양광 발전', explanation: '태양광 발전은 태양 전지를 이용해 태양빛을 곧바로 전기 에너지로 바꾸는 발전 방식입니다.', hint: '지붕 위에 반짝이는 검은 판을 설치해서 햇빛을 직접 전기로 바꾸는 발전 방식을 떠올려보세요.' },
      { question: '물질이 산소와 결합하는 반응을 무엇이라 할까요?', choices: ['산화', '환원', '중화', '증발'], answer: '산화', explanation: '물질이 산소를 얻는 반응을 산화라고 하며, 철이 녹스는 것도 산화의 한 예입니다.', hint: '철이 오랫동안 공기 중에 있으면 녹이 스는데, 이때 철이 공기 중의 어떤 기체와 결합하는 반응인지 떠올려보세요.' },
      { question: '지구 대기 중 가장 많은 비율을 차지하는 기체는?', choices: ['질소', '산소', '이산화탄소', '수소'], answer: '질소', explanation: '지구 대기의 약 78%는 질소가 차지합니다.', hint: '우리가 숨 쉴 때 들이마시는 산소보다 훨씬 더 많은 비율을 차지하는 기체예요.' },
      { question: '운동하던 버스가 갑자기 멈추면 승객의 몸이 앞으로 쏠리는 현상과 관련된 법칙은?', choices: ['관성의 법칙', '작용 반작용의 법칙', '에너지 보존 법칙', '만유인력의 법칙'], answer: '관성의 법칙', explanation: '몸이 원래 움직이던 상태를 유지하려는 관성 때문에 버스가 멈춰도 몸은 앞으로 쏠립니다.', hint: '몸이 계속 원래대로 움직이려는 성질 때문에 생기는 현상이에요.' },
      { question: '산성 용액과 염기성 용액을 섞으면 pH는 어느 쪽으로 가까워질까요?', choices: ['중성(7)', '더 강한 산성', '더 강한 염기성', '변화 없음'], answer: '중성(7)', explanation: '산과 염기가 중화 반응을 일으키면 pH가 중성(7)에 가까워집니다.', hint: '중화 반응은 산성과 염기성이 서로 성질을 상쇄시키는 반응이에요. 그 결과 pH는 어느 쪽에 가까워질까요?' },
      { question: '지구시스템의 네 가지 구성 요소가 아닌 것은?', choices: ['우주권', '지권', '수권', '기권'], answer: '우주권', explanation: '지구시스템은 지권, 수권, 기권, 생물권 네 가지로 구성됩니다.', hint: '지구시스템은 땅(지권), 물(수권), 공기(기권), 생물(생물권) 네 가지로 이루어져요. 우주 전체를 가리키는 것은 포함되지 않아요.' },
      { question: '기권에서 오존층이 하는 중요한 역할은?', choices: ['자외선을 흡수해 생물을 보호한다', '산소를 만들어낸다', '이산화탄소를 흡수한다', '비를 내리게 한다'], answer: '자외선을 흡수해 생물을 보호한다', explanation: '오존층은 태양의 해로운 자외선을 흡수해 지표의 생물을 보호하는 역할을 합니다.', hint: '태양에서 오는 해로운 빛을 걸러줘서 우리를 보호해주는 대기층의 역할을 떠올려보세요.' },
      { question: '생물 분류의 기본 단위이며, 서로 교배해 생식 능력이 있는 자손을 낳을 수 있는 무리를 무엇이라 할까요?', choices: ['종', '속', '과', '목'], answer: '종', explanation: '생물 분류의 가장 기본 단위는 종이며, 같은 종끼리는 교배해 생식 능력이 있는 자손을 낳을 수 있습니다.', hint: '생물을 나누는 여러 단계 중, 가장 작고 기본이 되는 단위를 떠올려보세요. 같은 무리끼리는 짝을 지어 새끼를 낳을 수 있어요.' },
      { question: '지구 온난화의 주요 원인 기체 중 하나로, 화석 연료를 태울 때 많이 배출되는 것은?', choices: ['이산화탄소', '질소', '헬륨', '수소'], answer: '이산화탄소', explanation: '화석 연료를 태우면 이산화탄소가 많이 배출되며, 이는 온실 효과를 일으켜 지구 온난화의 주요 원인이 됩니다.', hint: '우리가 숨을 내쉴 때도 나오는 기체지만, 공장이나 자동차에서 너무 많이 나오면 지구를 뜨겁게 만드는 온실가스가 돼요.' },
    ],
  };

  function isScienceLevelUnlocked(levelId, intelligence) {
    const level = SCIENCE_LEVELS.find((l) => l.id === levelId);
    return !!level && intelligence >= level.unlockIntelligence;
  }

  // askedQuestions를 배열로 명시해서 주면(기초 과목 인증 시험 등) 그중
  // 이미 나온 문제는 걸러내고 뽑고, 아예 안 넘기면(일반 "공부"/"알바"
  // 세션) 레벨별 셔플 가방에서 뽑는다 — generateEnglishProblem과 동일한
  // 규칙(위 주석 참고).
  function generateScienceProblem(level, askedQuestions) {
    const bank = SCIENCE_BANK[level] || SCIENCE_BANK[1];
    let problem;
    if (Array.isArray(askedQuestions)) {
      const pool = askedQuestions.length ? bank.filter((item) => !askedQuestions.includes(item.question)) : bank;
      problem = makeChoiceProblem('sci', level, randChoice(pool.length ? pool : bank));
    } else {
      problem = makeChoiceProblem('sci', level, nextFromStudyBag('sci', level, bank));
    }
    return attachConcept(problem, SCIENCE_LEVELS, level);
  }

  const api = {
    ENGLISH_LEVELS,
    SCIENCE_LEVELS,
    isEnglishLevelUnlocked,
    isScienceLevelUnlocked,
    generateEnglishProblem,
    generateScienceProblem,
    generateEnglishVocabMatchProblem,
    // 문제 은행 원본(읽기 전용 참고용). 게임 로직은 위 generate* 함수만
    // 쓰고, 이 원본 배열은 관리자 페이지(admin.html)가 문제 은행 규모와
    // 내용을 직접 살펴볼 수 있게 노출하는 용도다.
    ENGLISH_BANK,
    SCIENCE_BANK,
    ENGLISH_VOCAB_BANK,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessSubjects = api;
  }
})(typeof window !== 'undefined' ? window : null);
