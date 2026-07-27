/*
 * 영어/과학 문제 생성 엔진 (순수 로직, DOM 의존 없음)
 * problems.js(수학)와 같은 모양의 문제 객체를 돌려주도록 만들어서,
 * script.js의 퀴즈 화면이 과목과 무관하게 그대로 재사용할 수 있게 했다.
 * 초등학교 4학년 ~ 중학교 1학년 교과 범위에 맞춰 4단계로 구성했으며,
 * 수학의 앞 4단계(unlockIntelligence 0/8/18/28)와 같은 지능 기준으로
 * 해금되어 "공부"를 고를 때 세 과목 중 무엇이 나올지 무작위로 섞인다.
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
    };
  }

  /* ---------------------------------------------------------------- */
  /* 영어                                                                */
  /* ---------------------------------------------------------------- */

  const ENGLISH_LEVELS = [
    { id: 1, name: '초4 영어', desc: '기초 어휘 · 간단한 문장', unlockIntelligence: 0 },
    { id: 2, name: '초5 영어', desc: '품사 · 기본 문법', unlockIntelligence: 8 },
    { id: 3, name: '초6 영어', desc: '시제 · 비교급 · 짧은 독해', unlockIntelligence: 18 },
    { id: 4, name: '중1 영어', desc: '관계대명사 기초 · 문맥 어휘 · 숙어', unlockIntelligence: 28 },
  ];

  const ENGLISH_BANK = {
    1: [
      { question: "'apple'의 뜻으로 알맞은 것은?", choices: ['사과', '바나나', '포도', '딸기'], answer: '사과', explanation: "apple = 사과" },
      { question: "'I ___ a student.' 빈칸에 알맞은 것은?", choices: ['am', 'is', 'are', 'be'], answer: 'am', explanation: "주어가 I일 때는 am을 씁니다." },
      { question: "'dog'의 복수형은?", choices: ['dogs', 'doges', 'dogies', "dog's"], answer: 'dogs', explanation: "대부분의 명사는 뒤에 -s를 붙여 복수형을 만듭니다." },
      { question: "'happy'의 반대말은?", choices: ['sad', 'glad', 'angry', 'tired'], answer: 'sad', explanation: "happy(행복한)의 반대말은 sad(슬픈)입니다." },
      { question: "'This is ___ book.' 빈칸에 알맞은 것은?", choices: ['my', 'I', 'me', 'she'], answer: 'my', explanation: "명사 앞에는 소유격 my(나의)를 씁니다." },
      { question: "Monday, Tuesday, ___, Thursday. 빈칸에 알맞은 요일은?", choices: ['Wednesday', 'Sunday', 'Friday', 'Saturday'], answer: 'Wednesday', explanation: "요일 순서는 월-화-수-목이므로 Wednesday(수요일)입니다." },
    ],
    2: [
      { question: "다음 중 동사(verb)는 무엇일까요?", choices: ['run', 'table', 'blue', 'quickly'], answer: 'run', explanation: "run(달리다)은 동작을 나타내는 동사입니다." },
      { question: "'She ___ to school every day.' 빈칸에 알맞은 것은?", choices: ['goes', 'go', 'going', 'gone'], answer: 'goes', explanation: "주어가 3인칭 단수(She)일 때 동사에 -es를 붙입니다." },
      { question: "'big'과 뜻이 가장 비슷한 단어는?", choices: ['large', 'small', 'tiny', 'short'], answer: 'large', explanation: "big과 large는 모두 '큰'이라는 뜻입니다." },
      { question: "'There ___ two cats on the sofa.' 빈칸에 알맞은 것은?", choices: ['are', 'is', 'was', 'be'], answer: 'are', explanation: "two cats는 복수이므로 are를 씁니다." },
      { question: "다음 중 형용사(adjective)는 무엇일까요?", choices: ['beautiful', 'quickly', 'jump', 'house'], answer: 'beautiful', explanation: "beautiful(아름다운)은 명사를 꾸며주는 형용사입니다." },
      { question: "'yesterday'는 어떤 시제와 가장 잘 어울릴까요?", choices: ['과거형', '현재형', '미래형', '진행형'], answer: '과거형', explanation: "yesterday(어제)는 과거를 나타내는 표현입니다." },
    ],
    3: [
      { question: "'She is taller ___ her brother.' 빈칸에 알맞은 것은?", choices: ['than', 'then', 'that', 'as'], answer: 'than', explanation: "비교급 뒤에는 than을 씁니다." },
      { question: "'go'의 과거형은?", choices: ['went', 'goed', 'gone', 'going'], answer: 'went', explanation: "go의 과거형은 불규칙 변화로 went입니다." },
      { question: "'I ___ my homework tomorrow.' 빈칸에 알맞은 미래형은?", choices: ['will do', 'did', 'do', 'done'], answer: 'will do', explanation: "tomorrow(내일)는 미래이므로 will do를 씁니다." },
      { question: "'Tom has a red bike. Jane has a blue bike.' Jane's bike의 색깔은?", choices: ['blue', 'red', 'green', 'yellow'], answer: 'blue', explanation: "Jane has a blue bike라고 했으므로 파란색입니다." },
      { question: "'fast'의 최상급은?", choices: ['fastest', 'fastly', 'more fast', 'fastiest'], answer: 'fastest', explanation: "짧은 형용사는 뒤에 -est를 붙여 최상급을 만듭니다." },
      { question: "'because'는 문장에서 무엇을 나타낼 때 쓸까요?", choices: ['이유', '결과', '시간', '장소'], answer: '이유', explanation: "because는 '왜냐하면'이라는 뜻으로 이유를 나타냅니다." },
    ],
    4: [
      { question: "'The girl ___ is wearing a red hat is my sister.' 빈칸에 알맞은 것은?", choices: ['who', 'which', 'whose', 'what'], answer: 'who', explanation: "사람을 꾸며주는 주격 관계대명사는 who입니다." },
      { question: "'break the ice'라는 숙어의 의미는?", choices: ['어색한 분위기를 풀다', '얼음을 부수다', '화를 내다', '시간을 낭비하다'], answer: '어색한 분위기를 풀다', explanation: "break the ice는 '어색한 분위기를 풀다'라는 뜻의 관용 표현입니다." },
      { question: "'Although it was raining, we went out.' 밑줄 친 Although의 의미로 알맞은 것은?", choices: ['~에도 불구하고', '그래서', '왜냐하면', '그러는 동안'], answer: '~에도 불구하고', explanation: "Although는 '비록 ~일지라도'라는 뜻입니다." },
      { question: "'The book ___ I bought yesterday is interesting.' 빈칸에 알맞은 것은?", choices: ['that', 'who', 'whose', 'what'], answer: 'that', explanation: "사물을 꾸며주는 목적격 관계대명사로 that을 쓸 수 있습니다." },
      { question: "'The cake was eaten by the dog.'는 어떤 문장을 수동태로 바꾼 것일까요?", choices: ['The dog ate the cake.', 'The dog eats the cake.', 'The cake ate the dog.', 'The dog is eating the cake.'], answer: 'The dog ate the cake.', explanation: "수동태 'was eaten by'는 능동태 과거형 'ate'에서 왔습니다." },
      { question: "'in spite of'와 의미가 가장 비슷한 것은?", choices: ['despite', 'because of', 'thanks to', 'instead of'], answer: 'despite', explanation: "in spite of와 despite 모두 '~에도 불구하고'라는 뜻입니다." },
    ],
  };

  function isEnglishLevelUnlocked(levelId, intelligence) {
    const level = ENGLISH_LEVELS.find((l) => l.id === levelId);
    return !!level && intelligence >= level.unlockIntelligence;
  }

  function generateEnglishProblem(level) {
    const bank = ENGLISH_BANK[level] || ENGLISH_BANK[1];
    return makeChoiceProblem('en', level, randChoice(bank));
  }

  /* ---------------------------------------------------------------- */
  /* 과학                                                                */
  /* ---------------------------------------------------------------- */

  const SCIENCE_LEVELS = [
    { id: 1, name: '초4 과학', desc: '상태변화 · 동식물 · 힘', unlockIntelligence: 0 },
    { id: 2, name: '초5 과학', desc: '태양계 · 용해 · 날씨', unlockIntelligence: 8 },
    { id: 3, name: '초6 과학', desc: '연소 · 전기회로 · 순환계', unlockIntelligence: 18 },
    { id: 4, name: '중1 과학', desc: '상태변화 심화 · 광합성 · 힘과 원소', unlockIntelligence: 28 },
  ];

  const SCIENCE_BANK = {
    1: [
      { question: '물이 얼면 어떤 상태로 변할까요?', choices: ['고체', '액체', '기체', '플라즈마'], answer: '고체', explanation: '물이 얼면 고체 상태인 얼음이 됩니다.' },
      { question: '다음 중 곤충이 아닌 것은?', choices: ['거미', '개미', '나비', '벌'], answer: '거미', explanation: '거미는 다리가 8개라서 곤충(다리 6개)이 아닙니다.' },
      { question: '식물이 광합성을 하기 위해 필요한 것이 아닌 것은?', choices: ['소금', '햇빛', '물', '이산화탄소'], answer: '소금', explanation: '광합성에는 햇빛, 물, 이산화탄소가 필요합니다.' },
      { question: '물체를 밀거나 당기는 작용을 무엇이라고 할까요?', choices: ['힘', '에너지', '속도', '무게'], answer: '힘', explanation: '물체의 모양이나 운동 상태를 바꾸는 작용을 힘이라고 합니다.' },
      { question: '다음 중 자석에 붙는 물질은?', choices: ['철', '나무', '플라스틱', '유리'], answer: '철', explanation: '철과 같은 금속은 자석에 붙습니다.' },
      { question: '하루 동안 태양이 움직이는 것처럼 보이는 까닭은?', choices: ['지구가 자전하기 때문', '태양이 지구 주위를 돌기 때문', '달이 돌기 때문', '바람 때문'], answer: '지구가 자전하기 때문', explanation: '지구가 하루에 한 바퀴씩 자전하기 때문에 태양이 움직이는 것처럼 보입니다.' },
    ],
    2: [
      { question: '태양계에서 태양과 가장 가까운 행성은?', choices: ['수성', '금성', '지구', '화성'], answer: '수성', explanation: '태양에서 가까운 순서는 수성-금성-지구-화성입니다.' },
      { question: '설탕물처럼 물질이 녹아 골고루 섞인 것을 무엇이라 할까요?', choices: ['용액', '고체', '기체', '앙금'], answer: '용액', explanation: '용매에 용질이 녹아 골고루 섞인 것을 용액이라고 합니다.' },
      { question: '구름이 만들어지는 것과 가장 관련이 깊은 것은?', choices: ['수증기의 응결', '물의 증발', '얼음의 융해', '물의 승화'], answer: '수증기의 응결', explanation: '수증기가 식으면서 작은 물방울로 응결되어 구름이 됩니다.' },
      { question: '다음 중 기압이 낮아질 때 나타나기 쉬운 날씨는?', choices: ['흐리거나 비', '맑음', '건조함', '무풍'], answer: '흐리거나 비', explanation: '저기압일 때는 날씨가 흐리거나 비가 오기 쉽습니다.' },
      { question: '우리 몸에서 산소를 흡수하는 기관은?', choices: ['폐', '심장', '위', '간'], answer: '폐', explanation: '폐에서 산소를 받아들이고 이산화탄소를 내보냅니다.' },
      { question: '물체가 물에 뜨거나 가라앉는 것과 가장 관련이 깊은 것은?', choices: ['밀도', '온도', '색깔', '냄새'], answer: '밀도', explanation: '물보다 밀도가 작으면 뜨고, 크면 가라앉습니다.' },
    ],
    3: [
      { question: '물질이 산소와 만나 빛과 열을 내며 타는 현상은?', choices: ['연소', '증발', '융해', '부식'], answer: '연소', explanation: '물질이 산소와 반응해 빛과 열을 내는 현상을 연소라고 합니다.' },
      { question: '전지의 두 극을 반대로 연결해도 전구는 어떻게 될까요?', choices: ['켜진다', '안 켜진다', '터진다', '깜빡인다'], answer: '켜진다', explanation: '전구는 방향과 상관없이 전류가 흐르면 켜집니다.' },
      { question: '다음 중 소화를 담당하지 않는 기관은?', choices: ['심장', '위', '소장', '대장'], answer: '심장', explanation: '심장은 혈액을 순환시키는 기관이며 소화 기관이 아닙니다.' },
      { question: '혈액을 온몸으로 순환시키는 기관은?', choices: ['심장', '폐', '위', '콩팥'], answer: '심장', explanation: '심장이 펌프처럼 뛰면서 혈액을 온몸에 보냅니다.' },
      { question: '다음 중 순물질이 아닌 것은?', choices: ['소금물', '산소', '철', '물'], answer: '소금물', explanation: '소금물은 소금과 물이 섞인 혼합물입니다.' },
      { question: '달의 모양이 날마다 달라 보이는 까닭은?', choices: ['달이 지구 주위를 돌며 빛을 받는 부분이 달라져서', '달의 크기가 변해서', '지구가 자전해서', '태양이 움직여서'], answer: '달이 지구 주위를 돌며 빛을 받는 부분이 달라져서', explanation: '달의 위치에 따라 태양빛을 받는 부분이 달라 보이는 모양이 바뀝니다.' },
    ],
    4: [
      { question: '액체가 기체로 변하는 상태 변화는?', choices: ['기화', '응고', '액화', '승화'], answer: '기화', explanation: '액체가 기체로 변하는 것을 기화라고 합니다.' },
      { question: '식물의 잎에서 빛을 이용해 양분을 만드는 과정은?', choices: ['광합성', '호흡', '증산', '흡수'], answer: '광합성', explanation: '식물은 빛, 물, 이산화탄소로 광합성을 하여 양분을 만듭니다.' },
      { question: '지구가 물체를 잡아당겨 아래로 떨어지게 하는 힘은?', choices: ['중력', '마찰력', '부력', '탄성력'], answer: '중력', explanation: '중력은 지구가 물체를 당기는 힘입니다.' },
      { question: "원소 기호 'O'가 나타내는 원소는?", choices: ['산소', '수소', '질소', '금'], answer: '산소', explanation: "산소의 원소 기호는 O입니다." },
      { question: '두 물체가 맞닿아 움직일 때 운동을 방해하는 힘은?', choices: ['마찰력', '중력', '부력', '탄성력'], answer: '마찰력', explanation: '표면이 맞닿아 움직일 때 방해하는 힘을 마찰력이라고 합니다.' },
      { question: '혼합물을 성질 차이로 분리하는 방법이 아닌 것은?', choices: ['광합성', '거름', '증류', '재결정'], answer: '광합성', explanation: '광합성은 식물이 양분을 만드는 과정으로 혼합물 분리 방법이 아닙니다.' },
    ],
  };

  function isScienceLevelUnlocked(levelId, intelligence) {
    const level = SCIENCE_LEVELS.find((l) => l.id === levelId);
    return !!level && intelligence >= level.unlockIntelligence;
  }

  function generateScienceProblem(level) {
    const bank = SCIENCE_BANK[level] || SCIENCE_BANK[1];
    return makeChoiceProblem('sci', level, randChoice(bank));
  }

  const api = {
    ENGLISH_LEVELS,
    SCIENCE_LEVELS,
    isEnglishLevelUnlocked,
    isScienceLevelUnlocked,
    generateEnglishProblem,
    generateScienceProblem,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessSubjects = api;
  }
})(typeof window !== 'undefined' ? window : null);
