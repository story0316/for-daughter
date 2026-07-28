/*
 * 영어/과학 문제 생성 엔진 (순수 로직, DOM 의존 없음)
 * problems.js(수학)와 같은 모양의 문제 객체를 돌려주도록 만들어서,
 * script.js의 퀴즈 화면이 과목과 무관하게 그대로 재사용할 수 있게 했다.
 * 과학은 초등학교 4학년 ~ 중학교 1학년 교과 범위에 맞춰 4단계로, 영어는
 * 그보다 더 나아가 고등학교 2학년 수준까지 8단계로 구성했다. 둘 다
 * 수학과 같은 지능 기준(unlockIntelligence 0/8/18/28/38/48/58/68)으로
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
      hint: item.hint,
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
    { id: 5, name: '중2 영어', desc: '현재완료 · 5형식 문장 · to부정사', unlockIntelligence: 38 },
    { id: 6, name: '중3 영어', desc: '관계부사 · 가정법 과거 · 화법전환', unlockIntelligence: 48 },
    { id: 7, name: '고1 영어', desc: '강조구문 · 도치 · 분사구문', unlockIntelligence: 58 },
    { id: 8, name: '고2 영어', desc: '수능형 어휘 · 논리 추론 · 복잡한 관계절', unlockIntelligence: 68 },
  ];

  const ENGLISH_BANK = {
    1: [
      { question: "'apple'의 뜻으로 알맞은 것은?", choices: ['사과', '바나나', '포도', '딸기'], answer: '사과', explanation: "apple = 사과", hint: '우리가 자주 먹는, 빨갛거나 초록색인 동그란 과일을 떠올려보세요. 백설공주 이야기에도 나오는 과일이에요!' },
      { question: "'I ___ a student.' 빈칸에 알맞은 것은?", choices: ['am', 'is', 'are', 'be'], answer: 'am', explanation: "주어가 I일 때는 am을 씁니다.", hint: 'be동사는 주어에 따라 모습이 바뀌어요. I(나)는 항상 정해진 한 가지 형태의 be동사와만 짝을 이뤄요.' },
      { question: "'dog'의 복수형은?", choices: ['dogs', 'doges', 'dogies', "dog's"], answer: 'dogs', explanation: "대부분의 명사는 뒤에 -s를 붙여 복수형을 만듭니다.", hint: '대부분의 영어 명사는 여러 개(복수)를 나타낼 때 끝에 한 글자를 붙여요. dog 끝에 그 글자를 붙이면 어떻게 될까요?' },
      { question: "'happy'의 반대말은?", choices: ['sad', 'glad', 'angry', 'tired'], answer: 'sad', explanation: "happy(행복한)의 반대말은 sad(슬픈)입니다.", hint: 'happy는 기분이 좋을 때 쓰는 말이에요. 반대로 기분이 안 좋을 때, 눈물이 날 것 같을 때 쓰는 짧은 단어를 떠올려보세요.' },
      { question: "'This is ___ book.' 빈칸에 알맞은 것은?", choices: ['my', 'I', 'me', 'she'], answer: 'my', explanation: "명사 앞에는 소유격 my(나의)를 씁니다.", hint: "book 앞에는 '누구의 것'인지 나타내는 말이 와요. '나의'라는 뜻을 가진 짧은 단어가 무엇일까요?" },
      { question: "Monday, Tuesday, ___, Thursday. 빈칸에 알맞은 요일은?", choices: ['Wednesday', 'Sunday', 'Friday', 'Saturday'], answer: 'Wednesday', explanation: "요일 순서는 월-화-수-목이므로 Wednesday(수요일)입니다.", hint: '월요일(Monday)부터 손가락으로 하나씩 짚어가며 순서대로 말해보세요. 화요일 다음, 목요일 전에 오는 요일이 뭘까요?' },
    ],
    2: [
      { question: "다음 중 동사(verb)는 무엇일까요?", choices: ['run', 'table', 'blue', 'quickly'], answer: 'run', explanation: "run(달리다)은 동작을 나타내는 동사입니다.", hint: "동사는 '움직임'이나 '동작'을 나타내는 말이에요. 보기 중에서 사람이 실제로 '할 수 있는 행동'을 찾아보세요." },
      { question: "'She ___ to school every day.' 빈칸에 알맞은 것은?", choices: ['goes', 'go', 'going', 'gone'], answer: 'goes', explanation: "주어가 3인칭 단수(She)일 때 동사에 -es를 붙입니다.", hint: '주어가 he, she, it처럼 한 명/한 개(3인칭 단수)이고 지금 하는 습관을 말할 때는, 동사 끝에 보통 -s나 -es를 붙여요.' },
      { question: "'big'과 뜻이 가장 비슷한 단어는?", choices: ['large', 'small', 'tiny', 'short'], answer: 'large', explanation: "big과 large는 모두 '큰'이라는 뜻입니다.", hint: "big은 '크다'는 뜻이에요. 보기 중에서 크기가 크다는 뜻을 가진 단어를 찾아보세요(작다는 뜻의 단어들은 답이 아니겠죠?)." },
      { question: "'There ___ two cats on the sofa.' 빈칸에 알맞은 것은?", choices: ['are', 'is', 'was', 'be'], answer: 'are', explanation: "two cats는 복수이므로 are를 씁니다.", hint: 'be동사는 뒤에 오는 명사가 하나(단수)인지 여럿(복수)인지에 따라 달라져요. two cats는 몇 마리인가요?' },
      { question: "다음 중 형용사(adjective)는 무엇일까요?", choices: ['beautiful', 'quickly', 'jump', 'house'], answer: 'beautiful', explanation: "beautiful(아름다운)은 명사를 꾸며주는 형용사입니다.", hint: "형용사는 사람이나 사물의 '상태나 모양'을 꾸며주는 말이에요. 보기 중 명사를 꾸며줄 수 있는 단어를 찾아보세요." },
      { question: "'yesterday'는 어떤 시제와 가장 잘 어울릴까요?", choices: ['과거형', '현재형', '미래형', '진행형'], answer: '과거형', explanation: "yesterday(어제)는 과거를 나타내는 표현입니다.", hint: "yesterday는 '어제'라는 뜻이에요. 어제 있었던 일은 이미 지나간 일이니 어떤 시제로 표현해야 할까요?" },
    ],
    3: [
      { question: "'She is taller ___ her brother.' 빈칸에 알맞은 것은?", choices: ['than', 'then', 'that', 'as'], answer: 'than', explanation: "비교급 뒤에는 than을 씁니다.", hint: "두 대상을 비교해서 '더 ~하다'라고 말할 때, 형용사 뒤에 붙이는 짝꿍 단어가 있어요. '~보다'라는 뜻의 그 단어를 떠올려보세요." },
      { question: "'go'의 과거형은?", choices: ['went', 'goed', 'gone', 'going'], answer: 'went', explanation: "go의 과거형은 불규칙 변화로 went입니다.", hint: "go는 불규칙 동사라서 규칙적으로 -ed를 붙이지 않아요. '갔다'라는 뜻의 완전히 다른 모양의 단어를 기억해보세요." },
      { question: "'I ___ my homework tomorrow.' 빈칸에 알맞은 미래형은?", choices: ['will do', 'did', 'do', 'done'], answer: 'will do', explanation: "tomorrow(내일)는 미래이므로 will do를 씁니다.", hint: "tomorrow는 '내일'이라는 뜻으로 아직 일어나지 않은 일이에요. 아직 일어나지 않은 미래를 말할 때 쓰는 표현을 떠올려보세요." },
      { question: "'Tom has a red bike. Jane has a blue bike.' Jane's bike의 색깔은?", choices: ['blue', 'red', 'green', 'yellow'], answer: 'blue', explanation: "Jane has a blue bike라고 했으므로 파란색입니다.", hint: '글을 다시 천천히 읽어보세요. Jane에 대해 설명하는 문장이 어디에 있는지 찾아 그 부분에 집중해보세요.' },
      { question: "'fast'의 최상급은?", choices: ['fastest', 'fastly', 'more fast', 'fastiest'], answer: 'fastest', explanation: "짧은 형용사는 뒤에 -est를 붙여 최상급을 만듭니다.", hint: '짧은 형용사는 최상급을 만들 때 끝에 무언가를 붙여요. fast의 끝에 그것을 붙이면 어떤 모양이 될까요?' },
      { question: "'because'는 문장에서 무엇을 나타낼 때 쓸까요?", choices: ['이유', '결과', '시간', '장소'], answer: '이유', explanation: "because는 '왜냐하면'이라는 뜻으로 이유를 나타냅니다.", hint: "because는 문장과 문장을 이어주는 접속사예요. '왜 그런 일이 일어났는지'를 설명할 때 자주 쓰는 말이에요." },
    ],
    4: [
      { question: "'The girl ___ is wearing a red hat is my sister.' 빈칸에 알맞은 것은?", choices: ['who', 'which', 'whose', 'what'], answer: 'who', explanation: "사람을 꾸며주는 주격 관계대명사는 who입니다.", hint: '밑줄 앞의 명사(the girl)가 사람인지 사물인지 확인해보세요. 사람을 꾸며주는 주격 관계대명사가 따로 있어요.' },
      { question: "'break the ice'라는 숙어의 의미는?", choices: ['어색한 분위기를 풀다', '얼음을 부수다', '화를 내다', '시간을 낭비하다'], answer: '어색한 분위기를 풀다', explanation: "break the ice는 '어색한 분위기를 풀다'라는 뜻의 관용 표현입니다.", hint: "이 표현을 글자 그대로 해석하면 '얼음을 깨다'이지만, 실제로는 처음 만난 사람들 사이의 서먹한 분위기를 풀 때 쓰는 관용 표현이에요." },
      { question: "'Although it was raining, we went out.' 밑줄 친 Although의 의미로 알맞은 것은?", choices: ['~에도 불구하고', '그래서', '왜냐하면', '그러는 동안'], answer: '~에도 불구하고', explanation: "Although는 '비록 ~일지라도'라는 뜻입니다.", hint: 'Although 뒤에는 비가 왔다는 내용이, 그 다음엔 그런데도 나갔다는 내용이 나와요. 앞뒤 내용이 서로 반대될 때 쓰는 접속사예요.' },
      { question: "'The book ___ I bought yesterday is interesting.' 빈칸에 알맞은 것은?", choices: ['that', 'who', 'whose', 'what'], answer: 'that', explanation: "사물을 꾸며주는 목적격 관계대명사로 that을 쓸 수 있습니다.", hint: 'the book 뒤에 이어지는 절이 사물을 꾸며주고 있어요. 사물을 꾸며줄 때 쓸 수 있는 관계대명사를 떠올려보세요(who는 사람에게만 써요).' },
      { question: "'The cake was eaten by the dog.'는 어떤 문장을 수동태로 바꾼 것일까요?", choices: ['The dog ate the cake.', 'The dog eats the cake.', 'The cake ate the dog.', 'The dog is eating the cake.'], answer: 'The dog ate the cake.', explanation: "수동태 'was eaten by'는 능동태 과거형 'ate'에서 왔습니다.", hint: "수동태 'was eaten by the dog'를 능동태로 바꾸려면, 'by' 뒤의 대상(the dog)을 주어로 앞에 내세우고 동사를 원래 시제의 능동형으로 바꿔요." },
      { question: "'in spite of'와 의미가 가장 비슷한 것은?", choices: ['despite', 'because of', 'thanks to', 'instead of'], answer: 'despite', explanation: "in spite of와 despite 모두 '~에도 불구하고'라는 뜻입니다.", hint: "in spite of는 '~에도 불구하고'라는 뜻이에요. 보기 중에서 같은 뜻을 가진 한 단어짜리 표현을 찾아보세요." },
    ],
    5: [
      { question: "'I have lived here ___ 2020.' 빈칸에 알맞은 것은?", choices: ['since', 'for', 'from', 'at'], answer: 'since', explanation: "since는 특정 시점('~부터'), for는 기간('~동안')과 함께 씁니다.", hint: '2020은 특정 시점이에요. 기간이 아니라 시작 시점을 나타낼 때 쓰는 전치사를 떠올려보세요.' },
      { question: "'She has just ___ her homework.' 빈칸에 알맞은 것은?", choices: ['finished', 'finish', 'finishing', 'finishes'], answer: 'finished', explanation: "현재완료(have/has + p.p.)는 '막 ~했다'는 의미로 방금 끝난 일을 나타냅니다.", hint: 'has 다음에는 동사원형이 아니라 특별한 형태가 와야 해요. 어떤 형태일지 떠올려보세요.' },
      { question: "'They made her happy.'에서 her happy는 문장에서 어떤 역할일까요?", choices: ['목적어와 목적격보어', '주어와 동사', '목적어와 부사', '두 개의 목적어'], answer: '목적어와 목적격보어', explanation: "make + 목적어 + 목적격보어 구조로, happy가 her의 상태를 설명합니다.", hint: 'happy는 형용사로 목적어(her)의 상태를 보충 설명하고 있어요. 5형식 문장의 구조를 떠올려보세요.' },
      { question: "'I want ___ the piano.' 빈칸에 알맞은 것은?", choices: ['to play', 'playing', 'play', 'played'], answer: 'to play', explanation: "want는 to부정사를 목적어로 취하는 동사입니다.", hint: "want 뒤에는 동사원형이 아니라 특별한 형태가 와요. '~하는 것을 원하다'라는 뜻을 만드는 형태를 떠올려보세요." },
      { question: "'I heard someone ___ the door.' 빈칸에 알맞은 것은?", choices: ['knock', 'to knock', 'knocked', 'knocks'], answer: 'knock', explanation: "지각동사(hear, see 등)는 목적어 뒤에 동사원형을 씁니다.", hint: '지각동사(hear, see 등) 뒤에는 to부정사가 아니라 동사의 어떤 형태가 오는지 떠올려보세요.' },
      { question: "'Although'와 바꿔 쓸 수 있는 접속사는?", choices: ['though', 'but', 'so', 'because'], answer: 'though', explanation: "although와 though는 둘 다 '비록 ~일지라도'라는 뜻의 접속사입니다.", hint: '이 질문의 단어와 비슷한 뜻이면서, 앞부분 세 글자만 뗀 더 짧고 캐주얼한 접속사를 떠올려보세요.' },
    ],
    6: [
      { question: "'This is the house ___ I was born.' 빈칸에 알맞은 것은?", choices: ['where', 'which', 'who', 'when'], answer: 'where', explanation: "장소를 나타내는 선행사(the house) 뒤에는 관계부사 where를 씁니다.", hint: 'the house는 장소예요. 장소를 꾸며줄 때 쓰는 관계부사를 떠올려보세요.' },
      { question: "'If I ___ a bird, I could fly.' 빈칸에 알맞은 것은?", choices: ['were', 'am', 'was', 'be'], answer: 'were', explanation: "가정법 과거에서는 be동사의 과거형으로 인칭에 관계없이 were를 씁니다.", hint: '가정법에서는 현실과 반대되는 상상을 말할 때 be동사를 인칭에 상관없이 항상 같은 형태로 써요.' },
      { question: "'He said, \"I am tired.\"'를 간접화법으로 바꾸면?", choices: ['He said that he was tired.', 'He said that he is tired.', 'He said I am tired.', 'He said that he will tired.'], answer: 'He said that he was tired.', explanation: "직접화법을 간접화법으로 바꿀 때 시제는 한 단계 과거로, 인칭대명사도 알맞게 바뀝니다.", hint: '주절의 said가 과거이므로 종속절의 시제도 한 단계 뒤로 물러나요(현재 → 과거).' },
      { question: "'He is ___ student in the class.' 빈칸에 알맞은 것은?", choices: ['the smartest', 'smarter', 'more smart', 'smartest'], answer: 'the smartest', explanation: "최상급 앞에는 the를 붙입니다.", hint: '최상급(가장 ~한) 표현 앞에는 꼭 붙는 관사가 있어요.' },
      { question: "'find out'과 의미가 가장 비슷한 것은?", choices: ['discover', 'lose', 'ignore', 'hide'], answer: 'discover', explanation: "find out은 '알아내다, 발견하다'라는 뜻으로 discover와 비슷합니다.", hint: 'find out은 몰랐던 것을 새로 알게 됐을 때 쓰는 표현이에요.' },
      { question: "'neither A nor B' 구문에서 동사의 수는 무엇에 맞출까요?", choices: ['B에 맞춘다', 'A에 맞춘다', '항상 단수', '항상 복수'], answer: 'B에 맞춘다', explanation: "neither A nor B, either A or B 구문은 동사를 B(더 가까운 것)에 맞춥니다.", hint: '이 구문은 두 개 중 동사와 더 가까이 있는 쪽에 수를 맞춘다는 규칙이 있어요.' },
    ],
    7: [
      { question: "'It was Tom ___ broke the window.' 빈칸에 알맞은 것은?", choices: ['who', 'whom', 'which', 'what'], answer: 'who', explanation: "It is/was ~ that(who) 강조구문에서 사람을 강조할 때는 who도 쓸 수 있습니다.", hint: 'It was ~ that 강조구문이에요. 강조하는 대상이 사람(Tom)일 때 that 대신 쓸 수 있는 관계대명사가 있어요.' },
      { question: "'Never ___ such a beautiful sunset.' 빈칸에 알맞은 것은?", choices: ['have I seen', 'I have seen', 'I saw', 'did I saw'], answer: 'have I seen', explanation: "부정어(Never)가 문장 앞에 오면 주어와 동사가 도치됩니다.", hint: '부정의 뜻을 가진 부사(Never)가 문장 맨 앞에 나오면 주어와 동사의 순서가 바뀌어요.' },
      { question: "'___ tired, she kept studying.' 빈칸에 알맞은 분사구문은?", choices: ['Being', 'Been', 'To be', 'Be'], answer: 'Being', explanation: "분사구문은 접속사와 주어를 생략하고 동사를 -ing 형태로 바꿔 만듭니다(Being tired = Although she was tired).", hint: '분사구문은 동사를 어떤 형태로 바꿔서 문장을 시작하는지 떠올려보세요.' },
      { question: "완료부정사(to have + p.p.)는 본동사 기준으로 어떤 시점을 나타낼까요?", choices: ['본동사보다 앞선 시점', '본동사와 같은 시점', '미래의 일', '반복되는 일'], answer: '본동사보다 앞선 시점', explanation: "완료부정사(to have p.p.)는 본동사의 시점보다 이전에 일어난 일을 나타냅니다.", hint: "완료부정사는 '더 먼저 일어난 일'을 나타낼 때 쓰는 특별한 부정사 형태예요." },
      { question: "'used to'와 'would'의 공통점은?", choices: ['과거의 습관을 나타낸다', '미래를 나타낸다', '현재 상태를 나타낸다', '명령을 나타낸다'], answer: '과거의 습관을 나타낸다', explanation: "used to와 would는 모두 과거의 반복적인 습관이나 행동을 나타낼 수 있습니다(단, used to만 과거의 상태도 나타낼 수 있음).", hint: '둘 다 예전에는 ~하곤 했다는 뜻으로 쓰이는 표현이에요.' },
      { question: "'The more you practice, the better you get.'과 같은 구조가 나타내는 것은?", choices: ['할수록 더 ~해지는 비례관계', '과거의 습관', '최상급 비교', '가정법 과거'], answer: '할수록 더 ~해지는 비례관계', explanation: "'the 비교급 ~, the 비교급 ~' 구문은 '~할수록 더 ~하다'라는 비례관계를 나타냅니다.", hint: '두 개의 비교급이 나란히 쓰이면서, 하나가 변하면 다른 하나도 같이 변한다는 것을 나타내는 구문이에요.' },
    ],
    8: [
      { question: "'The book, the cover of which was torn, was still readable.'에서 the cover of which는 무엇을 나타낼까요?", choices: ["the book's cover", "the cover's book", 'a new cover', 'nothing'], answer: "the book's cover", explanation: "소유격 관계대명사 'of which'는 the book's cover(그 책의 표지)를 나타냅니다.", hint: 'of which는 소유의 의미를 나타내는 관계대명사예요. 무엇의 표지인지 생각해보세요.' },
      { question: "'ubiquitous'의 의미로 가장 알맞은 것은?", choices: ['어디에나 있는', '매우 드문', '시대에 뒤떨어진', '복잡한'], answer: '어디에나 있는', explanation: "ubiquitous는 '어디에나 존재하는, 편재하는'이라는 뜻의 단어입니다.", hint: '스마트폰처럼 요즘 어디서나 쉽게 볼 수 있는 것을 표현할 때 쓰는 단어예요.' },
      { question: "'She studied hard. ___, she failed the exam.' 빈칸에 알맞은 연결어는?", choices: ['Nevertheless', 'Therefore', 'Similarly', 'For example'], answer: 'Nevertheless', explanation: "앞뒤 내용이 상반될 때는 Nevertheless(그럼에도 불구하고)를 씁니다.", hint: '열심히 공부했는데 시험에 떨어졌다는 건 예상과 반대되는 결과예요. 반전을 나타내는 연결어를 떠올려보세요.' },
      { question: "'She is not so much a singer as a dancer.'의 의미는?", choices: ['그녀는 가수라기보다는 무용수이다', '그녀는 가수이자 무용수이다', '그녀는 가수도 무용수도 아니다', '그녀는 가수보다 무용수를 더 좋아한다'], answer: '그녀는 가수라기보다는 무용수이다', explanation: "'not so much A as B'는 'A라기보다는 B'라는 뜻입니다.", hint: "'not so much A as B' 구문은 두 대상을 비교하며 어느 쪽에 더 가까운지를 나타내요." },
      { question: "'in retrospect'의 의미로 가장 알맞은 것은?", choices: ['돌이켜보면', '앞으로는', '즉시', '우연히'], answer: '돌이켜보면', explanation: "in retrospect는 '돌이켜 생각해보면'이라는 뜻의 표현입니다.", hint: '지나간 일을 다시 떠올리며 생각할 때 쓰는 표현이에요.' },
      { question: "다음 중 글의 요지를 파악할 때 가장 주의 깊게 봐야 할 것은?", choices: ['반복되는 핵심 주장과 결론 문장', '예시로 든 세부 사항', '낯선 단어의 개수', '문장의 길이'], answer: '반복되는 핵심 주장과 결론 문장', explanation: "글의 요지는 보통 반복되는 핵심 주장이나 결론 부분에 드러납니다.", hint: '글쓴이가 가장 하고 싶은 말은 보통 어디에 나타날까요? 세부 예시보다 더 중요한 것을 생각해보세요.' },
    ],
  };

  function isEnglishLevelUnlocked(levelId, intelligence) {
    const level = ENGLISH_LEVELS.find((l) => l.id === levelId);
    return !!level && intelligence >= level.unlockIntelligence;
  }

  // askedQuestions(선택)를 주면 그중 이미 나온 문제는 은행에서 걸러내고
  // 뽑는다(예: 기초 과목 인증 시험처럼 한 회차 안에서 반복을 피해야 할 때).
  // 다 걸러내서 남는 게 없으면(문제 수가 은행 크기보다 많은 경우) 은행
  // 전체에서 다시 뽑는다.
  function generateEnglishProblem(level, askedQuestions) {
    const bank = ENGLISH_BANK[level] || ENGLISH_BANK[1];
    const pool = askedQuestions && askedQuestions.length ? bank.filter((item) => !askedQuestions.includes(item.question)) : bank;
    return makeChoiceProblem('en', level, randChoice(pool.length ? pool : bank));
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

  const SCIENCE_LEVELS = [
    { id: 1, name: '초4 과학', desc: '상태변화 · 동식물 · 힘', unlockIntelligence: 0 },
    { id: 2, name: '초5 과학', desc: '태양계 · 용해 · 날씨', unlockIntelligence: 8 },
    { id: 3, name: '초6 과학', desc: '연소 · 전기회로 · 순환계', unlockIntelligence: 18 },
    { id: 4, name: '중1 과학', desc: '상태변화 심화 · 광합성 · 힘과 원소', unlockIntelligence: 28 },
  ];

  const SCIENCE_BANK = {
    1: [
      { question: '물이 얼면 어떤 상태로 변할까요?', choices: ['고체', '액체', '기체', '플라즈마'], answer: '고체', explanation: '물이 얼면 고체 상태인 얼음이 됩니다.', hint: '물이 차가워져서 단단하게 굳으면 어떤 상태가 될지 생각해보세요. 얼음을 만져본 느낌을 떠올려보면 답을 알 수 있어요.' },
      { question: '다음 중 곤충이 아닌 것은?', choices: ['거미', '개미', '나비', '벌'], answer: '거미', explanation: '거미는 다리가 8개라서 곤충(다리 6개)이 아닙니다.', hint: '곤충은 다리가 6개예요. 보기 중에서 다리 개수가 다른 동물이 있는지 세어보세요.' },
      { question: '식물이 광합성을 하기 위해 필요한 것이 아닌 것은?', choices: ['소금', '햇빛', '물', '이산화탄소'], answer: '소금', explanation: '광합성에는 햇빛, 물, 이산화탄소가 필요합니다.', hint: '식물이 광합성을 할 때 필요한 건 햇빛, 물, 그리고 공기 중의 어떤 기체예요. 우리가 요리할 때 넣는 조미료는 광합성과 관련이 없어요.' },
      { question: '물체를 밀거나 당기는 작용을 무엇이라고 할까요?', choices: ['힘', '에너지', '속도', '무게'], answer: '힘', explanation: '물체의 모양이나 운동 상태를 바꾸는 작용을 힘이라고 합니다.', hint: '물체를 밀거나 당겨서 모양이나 움직임을 바꾸는 작용을 무엇이라고 하는지 떠올려보세요. 운동선수들이 많이 쓰는 말이기도 해요.' },
      { question: '다음 중 자석에 붙는 물질은?', choices: ['철', '나무', '플라스틱', '유리'], answer: '철', explanation: '철과 같은 금속은 자석에 붙습니다.', hint: '자석에 붙는 물질은 정해져 있어요. 나무, 플라스틱, 유리는 자석에 붙지 않는다는 걸 생각하며 남은 보기를 확인해보세요.' },
      { question: '하루 동안 태양이 움직이는 것처럼 보이는 까닭은?', choices: ['지구가 자전하기 때문', '태양이 지구 주위를 돌기 때문', '달이 돌기 때문', '바람 때문'], answer: '지구가 자전하기 때문', explanation: '지구가 하루에 한 바퀴씩 자전하기 때문에 태양이 움직이는 것처럼 보입니다.', hint: '우리가 살고 있는 지구 자체가 팽이처럼 하루에 한 바퀴씩 돈다는 사실을 떠올려보세요.' },
    ],
    2: [
      { question: '태양계에서 태양과 가장 가까운 행성은?', choices: ['수성', '금성', '지구', '화성'], answer: '수성', explanation: '태양에서 가까운 순서는 수성-금성-지구-화성입니다.', hint: "태양계 행성들의 순서를 '수-금-지-화-목-토-천-해'로 외워두면 쉬워요. 그중 태양에서 가장 가까운 첫 번째 행성이 뭘까요?" },
      { question: '설탕물처럼 물질이 녹아 골고루 섞인 것을 무엇이라 할까요?', choices: ['용액', '고체', '기체', '앙금'], answer: '용액', explanation: '용매에 용질이 녹아 골고루 섞인 것을 용액이라고 합니다.', hint: "설탕이 물에 녹아서 눈에 안 보이게 골고루 섞인 것을 무엇이라 부르는지 떠올려보세요. '녹다'라는 뜻과 관련된 단어예요." },
      { question: '구름이 만들어지는 것과 가장 관련이 깊은 것은?', choices: ['수증기의 응결', '물의 증발', '얼음의 융해', '물의 승화'], answer: '수증기의 응결', explanation: '수증기가 식으면서 작은 물방울로 응결되어 구름이 됩니다.', hint: '따뜻한 수증기가 하늘 위로 올라가 차가워지면 어떻게 되는지 생각해보세요. 여름에 시원한 음료수 잔 표면에 물방울이 맺히는 것과 비슷한 원리예요.' },
      { question: '다음 중 기압이 낮아질 때 나타나기 쉬운 날씨는?', choices: ['흐리거나 비', '맑음', '건조함', '무풍'], answer: '흐리거나 비', explanation: '저기압일 때는 날씨가 흐리거나 비가 오기 쉽습니다.', hint: '기압이 낮다는 건 공기가 위로 올라가기 쉽다는 뜻이에요. 공기가 올라가서 구름이 잘 만들어지면 날씨가 어떻게 될까요?' },
      { question: '우리 몸에서 산소를 흡수하는 기관은?', choices: ['폐', '심장', '위', '간'], answer: '폐', explanation: '폐에서 산소를 받아들이고 이산화탄소를 내보냅니다.', hint: '숨을 들이쉴 때 공기가 들어가는 몸속 기관을 떠올려보세요. 가슴 속에서 풍선처럼 부풀어 오르는 곳이에요.' },
      { question: '물체가 물에 뜨거나 가라앉는 것과 가장 관련이 깊은 것은?', choices: ['밀도', '온도', '색깔', '냄새'], answer: '밀도', explanation: '물보다 밀도가 작으면 뜨고, 크면 가라앉습니다.', hint: "같은 크기라도 무거운 것과 가벼운 것이 있어요. 물체가 물보다 '빽빽한 정도'가 큰지 작은지와 관련된 단어를 떠올려보세요." },
    ],
    3: [
      { question: '물질이 산소와 만나 빛과 열을 내며 타는 현상은?', choices: ['연소', '증발', '융해', '부식'], answer: '연소', explanation: '물질이 산소와 반응해 빛과 열을 내는 현상을 연소라고 합니다.', hint: '물질이 산소와 만나 활활 타오르며 빛과 열을 내는 현상을 무엇이라고 하는지 떠올려보세요. 촛불이나 장작불을 생각해보세요.' },
      { question: '전지의 두 극을 반대로 연결해도 전구는 어떻게 될까요?', choices: ['켜진다', '안 켜진다', '터진다', '깜빡인다'], answer: '켜진다', explanation: '전구는 방향과 상관없이 전류가 흐르면 켜집니다.', hint: '전구는 전류가 어느 방향으로 흐르든 불이 켜지는 성질이 있어요. 극을 반대로 연결해도 전류 자체는 흐를 수 있다는 점을 생각해보세요.' },
      { question: '다음 중 소화를 담당하지 않는 기관은?', choices: ['심장', '위', '소장', '대장'], answer: '심장', explanation: '심장은 혈액을 순환시키는 기관이며 소화 기관이 아닙니다.', hint: '소화 기관은 음식물이 지나가는 길에 있는 기관들이에요(위, 소장, 대장 등). 온몸에 피를 보내는 펌프 역할을 하는 기관은 소화와 관련이 없어요.' },
      { question: '혈액을 온몸으로 순환시키는 기관은?', choices: ['심장', '폐', '위', '콩팥'], answer: '심장', explanation: '심장이 펌프처럼 뛰면서 혈액을 온몸에 보냅니다.', hint: '몸속에서 펌프처럼 뛰면서 피를 온몸 구석구석으로 보내는 기관을 떠올려보세요. 가슴에 손을 얹으면 콩닥콩닥 느껴지는 곳이에요.' },
      { question: '다음 중 순물질이 아닌 것은?', choices: ['소금물', '산소', '철', '물'], answer: '소금물', explanation: '소금물은 소금과 물이 섞인 혼합물입니다.', hint: '순물질은 다른 물질이 섞이지 않은 한 가지 물질이에요. 보기 중에서 두 가지 물질이 섞여 있는 것을 찾아보세요.' },
      { question: '달의 모양이 날마다 달라 보이는 까닭은?', choices: ['달이 지구 주위를 돌며 빛을 받는 부분이 달라져서', '달의 크기가 변해서', '지구가 자전해서', '태양이 움직여서'], answer: '달이 지구 주위를 돌며 빛을 받는 부분이 달라져서', explanation: '달의 위치에 따라 태양빛을 받는 부분이 달라 보이는 모양이 바뀝니다.', hint: '달은 스스로 빛을 내지 않고 태양빛을 반사해요. 달이 지구 주위를 돌면서 태양빛을 받는 부분이 계속 바뀐다는 점을 떠올려보세요.' },
    ],
    4: [
      { question: '액체가 기체로 변하는 상태 변화는?', choices: ['기화', '응고', '액화', '승화'], answer: '기화', explanation: '액체가 기체로 변하는 것을 기화라고 합니다.', hint: '물이 끓어서 수증기가 되는 것처럼, 액체가 기체로 변하는 현상을 무엇이라고 하는지 떠올려보세요.' },
      { question: '식물의 잎에서 빛을 이용해 양분을 만드는 과정은?', choices: ['광합성', '호흡', '증산', '흡수'], answer: '광합성', explanation: '식물은 빛, 물, 이산화탄소로 광합성을 하여 양분을 만듭니다.', hint: '식물의 잎이 햇빛을 받아 스스로 양분을 만들어내는 과정을 무엇이라고 부르는지 떠올려보세요.' },
      { question: '지구가 물체를 잡아당겨 아래로 떨어지게 하는 힘은?', choices: ['중력', '마찰력', '부력', '탄성력'], answer: '중력', explanation: '중력은 지구가 물체를 당기는 힘입니다.', hint: '사과가 나무에서 땅으로 떨어지는 이유를 설명해주는 힘이에요. 지구가 물체를 끌어당기는 힘을 무엇이라고 부르는지 떠올려보세요.' },
      { question: "원소 기호 'O'가 나타내는 원소는?", choices: ['산소', '수소', '질소', '금'], answer: '산소', explanation: "산소의 원소 기호는 O입니다.", hint: "우리가 숨을 쉴 때 들이마시는 기체의 원소 기호예요. 영어 단어 'oxygen'의 앞글자를 떠올려보세요." },
      { question: '두 물체가 맞닿아 움직일 때 운동을 방해하는 힘은?', choices: ['마찰력', '중력', '부력', '탄성력'], answer: '마찰력', explanation: '표면이 맞닿아 움직일 때 방해하는 힘을 마찰력이라고 합니다.', hint: '두 물체의 표면이 맞닿아 움직일 때 그 움직임을 방해하는 힘이에요. 미끄러운 바닥과 거친 바닥에서 걷는 느낌 차이를 떠올려보세요.' },
      { question: '혼합물을 성질 차이로 분리하는 방법이 아닌 것은?', choices: ['광합성', '거름', '증류', '재결정'], answer: '광합성', explanation: '광합성은 식물이 양분을 만드는 과정으로 혼합물 분리 방법이 아닙니다.', hint: '거름, 증류, 재결정은 모두 성질이 다른 물질들을 나누는 방법이에요. 보기 중 식물이 양분을 만드는 것과 관련된 것을 찾아보세요(그건 분리 방법이 아니에요).' },
    ],
  };

  function isScienceLevelUnlocked(levelId, intelligence) {
    const level = SCIENCE_LEVELS.find((l) => l.id === levelId);
    return !!level && intelligence >= level.unlockIntelligence;
  }

  // askedQuestions(선택)를 주면 그중 이미 나온 문제는 은행에서 걸러내고
  // 뽑는다(예: 기초 과목 인증 시험처럼 한 회차 안에서 반복을 피해야 할 때).
  function generateScienceProblem(level, askedQuestions) {
    const bank = SCIENCE_BANK[level] || SCIENCE_BANK[1];
    const pool = askedQuestions && askedQuestions.length ? bank.filter((item) => !askedQuestions.includes(item.question)) : bank;
    return makeChoiceProblem('sci', level, randChoice(pool.length ? pool : bank));
  }

  const api = {
    ENGLISH_LEVELS,
    SCIENCE_LEVELS,
    isEnglishLevelUnlocked,
    isScienceLevelUnlocked,
    generateEnglishProblem,
    generateScienceProblem,
    generateEnglishVocabMatchProblem,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessSubjects = api;
  }
})(typeof window !== 'undefined' ? window : null);
