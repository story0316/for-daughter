/*
 * 역량 모델 (순수 데이터, DOM/엔진 의존 없음)
 *
 * 이 파일은 게임 로직에는 전혀 관여하지 않는다(문제 생성/보상 계산과 무관).
 * 오직 "이 게임의 각 콘텐츠(과목·활동·연회 예절·시나리오)가 초등/중학생에게
 * 필요한 어떤 역량·지식·상황판단 능력과 연결되는지"를 태그해서, 관리자
 * 페이지(admin.html)가 그 연결 구조를 한눈에 보여줄 수 있게 하는 참고
 * 데이터다.
 *
 * 근거로 삼은 프레임워크:
 * - 2022 개정 교육과정(교육부) 총론의 6대 핵심역량 — 자기관리, 지식정보처리,
 *   창의적 사고, 심미적 감성, 협력적 소통, 공동체 역량. 한국 초/중학교
 *   교육과정이 실제로 채택한 역량 분류라 이 게임의 실사용자(한국 초/중학생)
 *   에게 가장 직접적으로 맞아떨어진다.
 * - OECD Learning Compass 2030(Future of Education and Skills 2030 프로젝트)
 *   — 지식·기술·태도와 가치를 아우르는 역량 개념, 그리고 "새로운 가치 창출/
 *   갈등과 딜레마 조정/책임감 갖기"라는 변혁적 역량(transformative
 *   competencies) 개념을 상황판단 문제 설계에 참고했다.
 * - Romero, Usart & Ott (2015), "Can Serious Games Contribute to Developing
 *   and Sustaining 21st-Century Skills?", Games and Culture — 협업, 창의성,
 *   문제해결 등 21세기 역량을 게임 메커닉과 연결한 실증 연구로, 활동(공부/
 *   경시대회/친구 만나기 등)별 역량 태깅의 근거로 삼았다.
 * - Game-based learning in early childhood education: a systematic review
 *   and meta-analysis (Frontiers in Psychology, 2024) — life simulation
 *   게임이 인지·사회·정서 발달을 함께 촉진할 수 있다는 근거.
 *
 * 지식(수학/영어/과학)과 역량(6대 핵심역량)과 상황판단(생활 속 판단력)을
 * 서로 다른 세 축으로 나눠 태깅하는 것이 이 모델의 핵심 설계다:
 *   - 지식 축: 과목/레벨 (기존 subjects.js/problems.js가 이미 담당)
 *   - 역량 축: 6대 핵심역량 (아래 CORE_COMPETENCIES)
 *   - 상황판단 축: 연회 예절 문제·시나리오 선택지처럼 "이럴 때 어떻게
 *     행동하는 게 맞을까"를 묻는 콘텐츠 전용 (아래 JUDGMENT_CATEGORIES)
 */
(function (root) {
  'use strict';

  const CORE_COMPETENCIES = [
    { id: 'self-management', name: '자기관리 역량', emoji: '🧭', color: '#8a93b8', desc: '자신의 삶과 학습을 스스로 계획하고 관리하는 힘' },
    { id: 'knowledge-processing', name: '지식정보처리 역량', emoji: '📚', color: '#6fa8ff', desc: '지식과 정보를 깊이 이해하고 비판적으로 탐구·활용하는 힘' },
    { id: 'creative-thinking', name: '창의적 사고 역량', emoji: '💡', color: '#b48fff', desc: '다양한 지식과 경험을 융합해 새로운 것을 만들어내는 힘' },
    { id: 'aesthetic-emotional', name: '심미적 감성 역량', emoji: '🎨', color: '#ff8fb3', desc: '공감적 이해와 문화적 감수성으로 삶의 의미와 가치를 느끼는 힘' },
    { id: 'communication', name: '협력적 소통 역량', emoji: '💬', color: '#ffd873', desc: '상대를 존중하며 듣고, 내 생각과 감정을 효과적으로 표현하는 힘' },
    { id: 'community', name: '공동체 역량', emoji: '🤝', color: '#5fd6a8', desc: '공동체의 일원으로서 개방적·포용적 태도로 책임감 있게 참여하는 힘' },
  ];

  // 레벨이 없는 고정 문제 은행(연회 예절 ETIQUETTE_QUESTIONS, 기도와 선행
  // FAITH_QUESTIONS, 창의력 올림피아드 CREATIVITY_PUZZLE_BANK)의 category
  // 값과 1:1로 대응하는 통합 분류 체계다. 대부분은 "이 상황에서 어떤 행동이
  // 바람직한가"를 묻는 상황판단형이지만(예절/기도와 선행), 창의력 올림피아드의
  // 패턴찾기/유추/공간지각/창의적사고처럼 순수 사고력 유형도 같은 구조로
  // 태깅해 관리자 페이지에서 하나의 필터/매트릭스로 함께 볼 수 있게 한다.
  const JUDGMENT_CATEGORIES = [
    { id: '인사예절', emoji: '🙇', desc: '만남과 헤어짐에서 지켜야 할 예절', competencies: ['communication', 'aesthetic-emotional'] },
    { id: '식사예절', emoji: '🍽️', desc: '함께 먹는 자리에서 지켜야 할 예절', competencies: ['self-management', 'aesthetic-emotional'] },
    { id: '경청예절', emoji: '👂', desc: '다른 사람의 말을 존중하며 듣는 태도', competencies: ['communication'] },
    { id: '감사와배려', emoji: '🙌', desc: '고마움과 배려를 표현하는 태도', competencies: ['communication', 'community'] },
    { id: '사과와배려', emoji: '💧', desc: '실수했을 때 책임지는 태도', competencies: ['self-management', 'communication'] },
    { id: '시간약속', emoji: '⏰', desc: '시간을 지켜 신뢰를 쌓는 태도', competencies: ['self-management', 'community'] },
    { id: '디지털시민의식', emoji: '💻', desc: '온라인에서 안전하고 바르게 행동하는 태도', competencies: ['community', 'self-management'] },
    { id: '안전', emoji: '🛟', desc: '위급 상황에서 자신과 타인을 지키는 판단력', competencies: ['self-management'] },
    { id: '안전과배려', emoji: '🚑', desc: '어려움에 처한 사람을 돕는 태도', competencies: ['community', 'self-management'] },
    { id: '갈등해결', emoji: '🕊️', desc: '의견 차이를 대화로 풀어가는 능력', competencies: ['communication', 'community'] },
    { id: '협력과공정', emoji: '⚖️', desc: '함께 일하며 공정하게 나누는 태도', competencies: ['community', 'communication'] },
    { id: '다양성존중', emoji: '🌍', desc: '서로 다름을 이해하고 존중하는 태도', competencies: ['community', 'aesthetic-emotional'] },
    { id: '환경과공공질서', emoji: '🌱', desc: '공동체의 규칙과 환경을 지키는 태도', competencies: ['community', 'self-management'] },
    { id: '정직과책임감', emoji: '🧾', desc: '정직하게 행동하고 책임지는 태도', competencies: ['self-management', 'community'] },
    { id: '성경퀴즈', emoji: '📖', desc: '쉬운 성경 이야기를 아는지 묻는 퀴즈', competencies: ['knowledge-processing', 'aesthetic-emotional'] },
    { id: '어른공경', emoji: '🧓', desc: '어른을 말과 행동으로 공경하는 태도', competencies: ['community', 'communication'] },
    { id: '친구배려', emoji: '🤗', desc: '친구에게 양보하고 칭찬하는 태도', competencies: ['communication', 'community'] },
    { id: '기도', emoji: '🙏', desc: '진실한 마음으로 기도하며 돌아보는 태도', competencies: ['aesthetic-emotional', 'self-management'] },
    { id: '패턴찾기', emoji: '🔢', desc: '숫자·글자의 규칙을 찾아내는 사고력', competencies: ['knowledge-processing', 'creative-thinking'] },
    { id: '유추', emoji: '🔗', desc: '두 관계의 공통점을 찾아 적용하는 사고력', competencies: ['creative-thinking', 'knowledge-processing'] },
    { id: '공간지각', emoji: '📐', desc: '도형과 공간을 머릿속으로 그려보는 사고력', competencies: ['knowledge-processing', 'creative-thinking'] },
    { id: '창의적사고', emoji: '💭', desc: '고정관념을 벗어나 답을 찾는 사고력', competencies: ['creative-thinking'] },
  ];

  // 지식 축: 과목별로 어떤 역량과 주로 연결되는지(문항 하나하나가 아니라
  // 과목 전체 단위로 태깅 — 수학/영어/과학은 문제은행/생성기 규모가 커서
  // 문항별 태깅 대신 과목 단위가 더 실용적이다).
  const SUBJECT_COMPETENCY_TAGS = {
    math: { competencies: ['knowledge-processing', 'creative-thinking'], note: '연산부터 올림피아드형 심화 문제까지, 논리적으로 사고하고 패턴을 찾아 응용하는 힘을 기른다.' },
    english: { competencies: ['knowledge-processing', 'communication'], note: '어휘·문법 지식과 함께, 다른 언어로 생각과 정보를 주고받는 소통의 기초를 기른다.' },
    science: { competencies: ['knowledge-processing', 'creative-thinking'], note: '자연 현상을 관찰하고 원리를 탐구하며 왜 그런지 궁금해하는 힘을 기른다.' },
    music: { competencies: ['aesthetic-emotional', 'creative-thinking'], note: '작곡가·악기·음악 이론을 배우며 음악을 느끼고 표현하는 감수성을 기른다.' },
    korean: { competencies: ['communication', 'knowledge-processing'], note: '문학 작품과 어법·맞춤법을 익히며 우리말을 정확히 읽고 표현하는 힘을 기른다.' },
    art: { competencies: ['aesthetic-emotional', 'creative-thinking'], note: '화가·미술사·색채 이론을 배우며 아름다움을 감상하고 표현하는 힘을 기른다.' },
    social: { competencies: ['community', 'knowledge-processing'], note: '지리·역사·정치·경제를 배우며 사회를 이해하고 공동체의 일원으로 참여하는 힘을 기른다.' },
  };

  // 게임 내 활동(스케줄에서 고르는 활동)이 어떤 역량과 연결되는지.
  const ACTIVITY_COMPETENCY_TAGS = {
    study: { name: '공부', competencies: ['knowledge-processing', 'self-management'] },
    job: { name: '알바', competencies: ['knowledge-processing', 'self-management'] },
    school: { name: '학교 수업', competencies: ['knowledge-processing', 'aesthetic-emotional'] },
    exercise: { name: '운동', competencies: ['self-management'] },
    rest: { name: '휴식', competencies: ['self-management'] },
    laundry: { name: '빨래하기', competencies: ['self-management', 'community'] },
    garden: { name: '텃밭 가꾸기', competencies: ['self-management', 'community'] },
    friend: { name: '친구 만나기', competencies: ['communication', 'community'] },
    banquet: { name: '연회 참석', competencies: ['aesthetic-emotional', 'communication'] },
    competition: { name: '왕국 수학경시대회', competencies: ['knowledge-processing', 'creative-thinking', 'self-management'] },
    creativity: { name: '창의력 올림피아드', competencies: ['creative-thinking', 'knowledge-processing'] },
    faith: { name: '기도와 선행', competencies: ['aesthetic-emotional', 'community', 'self-management'] },
    career: { name: '직업', competencies: ['community', 'self-management'] },
  };

  // 시나리오(인물별 1회성 이야기) 14편의 역량/상황판단 태깅.
  // scenarios.js의 id와 1:1로 대응한다.
  const SCENARIO_COMPETENCY_TAGS = {
    'banquet-etiquette': { theme: '연회 예절', competencies: ['aesthetic-emotional', 'communication'] },
    'first-royal-etiquette': { theme: '기본 예절 학습', competencies: ['aesthetic-emotional', 'self-management'] },
    'lost-kitten-in-garden': { theme: '생명 존중과 책임감', competencies: ['community', 'communication'] },
    'baking-cookies-with-rival': { theme: '선의의 경쟁과 협력', competencies: ['communication', 'community'] },
    'noble-tea-party-invitation': { theme: '사교 예절', competencies: ['aesthetic-emotional', 'communication'] },
    'prince-and-stray-dog': { theme: '생명 존중과 신뢰', competencies: ['community', 'self-management'] },
    'royal-history-quiz': { theme: '학업 태도와 탐구', competencies: ['knowledge-processing', 'self-management'] },
    'grand-ball-debut': { theme: '자신감과 예절', competencies: ['aesthetic-emotional', 'self-management'] },
    'rival-study-duel': { theme: '선의의 경쟁', competencies: ['knowledge-processing', 'communication'] },
    'friend-birthday': { theme: '우정과 배려', competencies: ['communication', 'community'] },
    'tea-party-manners': { theme: '사교 예절', competencies: ['aesthetic-emotional', 'communication'] },
    'library-secret': { theme: '탐구심', competencies: ['knowledge-processing', 'creative-thinking'] },
    'garden-walk-prince': { theme: '관계 발전', competencies: ['communication', 'aesthetic-emotional'] },
    'coronation-ball': { theme: '책임감과 종합적 성장', competencies: ['self-management', 'community', 'aesthetic-emotional'] },
  };

  // 기초 과목 인증(동/은/금메달) 등급이 요구하는 역량 — 지식 축(과목)과
  // 자기관리 역량(꾸준히 준비해서 응시하는 태도)을 함께 기른다.
  const CERT_EXAM_COMPETENCY_TAGS = { competencies: ['knowledge-processing', 'self-management'] };

  function competencyById(id) {
    return CORE_COMPETENCIES.find((c) => c.id === id) || null;
  }

  function judgmentCategoryById(id) {
    return JUDGMENT_CATEGORIES.find((j) => j.id === id) || null;
  }

  const api = {
    CORE_COMPETENCIES,
    JUDGMENT_CATEGORIES,
    SUBJECT_COMPETENCY_TAGS,
    ACTIVITY_COMPETENCY_TAGS,
    SCENARIO_COMPETENCY_TAGS,
    CERT_EXAM_COMPETENCY_TAGS,
    competencyById,
    judgmentCategoryById,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessCompetencyModel = api;
  }
})(typeof window !== 'undefined' ? window : null);
