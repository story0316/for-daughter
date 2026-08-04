// profiles.js(기기 내 프로필 관리) 유닛 테스트. Node에는 localStorage/
// sessionStorage가 없으므로 아주 작은 인메모리 목을 전역에 심어두고 쓴다.
const path = require('path');
const { ok, eq, summary } = require('../helpers/assert');

function makeStorageMock() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}

console.log('profiles.js unit tests');

function freshModule() {
  global.localStorage = makeStorageMock();
  global.sessionStorage = makeStorageMock();
  delete require.cache[require.resolve(path.join(__dirname, '..', '..', 'profiles.js'))];
  return require(path.join(__dirname, '..', '..', 'profiles.js'));
}

// ---- 프로필이 하나도 없는 첫 방문: 기본 프로필이 자동 생성되고, 키는 레거시 키와 같아야 한다 ----
{
  const Profiles = freshModule();
  const list = Profiles.listProfiles();
  eq(list.length, 1, '첫 방문에는 기본 프로필 1개가 자동 생성됨');
  eq(list[0].id, Profiles.DEFAULT_PROFILE_ID, '기본 프로필의 id는 DEFAULT_PROFILE_ID');
  eq(Profiles.saveKeyFor(Profiles.DEFAULT_PROFILE_ID), 'math-princess-save-v1', '기본 프로필의 저장 키는 레거시 키와 동일');
  eq(Profiles.endingsKeyFor(Profiles.DEFAULT_PROFILE_ID), 'math-princess-endings-v1', '기본 프로필의 엔딩 키는 레거시 키와 동일');
  ok(!Profiles.needsProfilePicker(), '프로필이 1개뿐이면 선택 화면이 필요 없음');
  eq(Profiles.getActiveProfileId(), Profiles.DEFAULT_PROFILE_ID, '프로필이 1개면 자동으로 활성화됨');
}

// ---- 기존 레거시 저장 데이터가 있던 사용자도 기본 프로필로 자연스럽게 이어짐 ----
{
  global.localStorage = makeStorageMock();
  global.sessionStorage = makeStorageMock();
  localStorage.setItem('math-princess-save-v1', JSON.stringify({ turn: 5, gold: 100 }));
  delete require.cache[require.resolve(path.join(__dirname, '..', '..', 'profiles.js'))];
  const Profiles = require(path.join(__dirname, '..', '..', 'profiles.js'));
  const list = Profiles.listProfiles();
  eq(list.length, 1, '레거시 저장 데이터가 있어도 프로필은 1개로 시작');
  const saved = JSON.parse(localStorage.getItem(Profiles.saveKeyFor(list[0].id)));
  eq(saved.turn, 5, '레거시 저장 데이터가 그대로 기본 프로필의 저장 데이터로 읽힘(마이그레이션 불필요)');
}

// ---- 두 번째 프로필을 만들면 선택 화면이 필요해짐 ----
{
  const Profiles = freshModule();
  Profiles.listProfiles(); // 기본 프로필 생성
  const second = Profiles.createProfile('서연', null);
  eq(Profiles.listProfiles().length, 2, '프로필 생성 후 2개');
  ok(second.id !== Profiles.DEFAULT_PROFILE_ID, '새 프로필의 id는 기본 프로필과 달라야 함');
  eq(second.name, '서연', '이름이 그대로 저장됨');
  ok(Profiles.needsProfilePicker(), '프로필이 2개 이상이고 아직 아무것도 선택 안 했으면 선택 화면 필요');
  Profiles.setActiveProfileId(second.id);
  ok(!Profiles.needsProfilePicker(), '활성 프로필을 고르고 나면 더 이상 선택 화면 필요 없음');
  eq(Profiles.getActiveProfile().name, '서연', 'getActiveProfile이 고른 프로필을 반환');
}

// ---- 이름을 비워서 만들면 자동으로 "플레이어 N"이 붙는다 ----
{
  const Profiles = freshModule();
  Profiles.listProfiles();
  const p = Profiles.createProfile('   ', null);
  eq(p.name, '플레이어 2', '빈 이름은 자동으로 플레이어 N으로 대체됨');
}

// ---- 프로필마다 저장 키가 서로 겹치지 않아야 한다(별도 계정 저장의 핵심 조건) ----
{
  const Profiles = freshModule();
  Profiles.listProfiles();
  const a = Profiles.createProfile('민준', null);
  const b = Profiles.createProfile('하윤', null);
  ok(Profiles.saveKeyFor(a.id) !== Profiles.saveKeyFor(b.id), '서로 다른 프로필은 서로 다른 저장 키를 가짐');
  ok(Profiles.endingsKeyFor(a.id) !== Profiles.endingsKeyFor(b.id), '서로 다른 프로필은 서로 다른 엔딩 키를 가짐');

  localStorage.setItem(Profiles.saveKeyFor(a.id), JSON.stringify({ characterName: '민준이' }));
  localStorage.setItem(Profiles.saveKeyFor(b.id), JSON.stringify({ characterName: '하윤이' }));
  const savedA = JSON.parse(localStorage.getItem(Profiles.saveKeyFor(a.id)));
  const savedB = JSON.parse(localStorage.getItem(Profiles.saveKeyFor(b.id)));
  eq(savedA.characterName, '민준이', 'A 프로필의 저장 데이터는 A의 것');
  eq(savedB.characterName, '하윤이', 'B 프로필의 저장 데이터는 B의 것');
}

// ---- PIN 검증 ----
{
  const Profiles = freshModule();
  Profiles.listProfiles();
  const withPin = Profiles.createProfile('보안맨', '1234');
  const withoutPin = Profiles.createProfile('자유맨', null);
  ok(Profiles.verifyPin(withPin.id, '1234'), '올바른 PIN은 통과');
  ok(!Profiles.verifyPin(withPin.id, '0000'), '틀린 PIN은 거부');
  ok(Profiles.verifyPin(withoutPin.id, ''), 'PIN이 없는 프로필은 아무 입력이나 통과');
  ok(Profiles.verifyPin(withoutPin.id, '9999'), 'PIN이 없는 프로필은 아무 입력이나 통과 (숫자여도)');
}

// ---- 이름 변경 ----
{
  const Profiles = freshModule();
  Profiles.listProfiles();
  const p = Profiles.createProfile('원래이름', null);
  ok(Profiles.renameProfile(p.id, '바뀐이름'), '이름 변경 성공');
  eq(Profiles.getProfile(p.id).name, '바뀐이름', '이름이 실제로 바뀜');
  ok(!Profiles.renameProfile(p.id, '   '), '빈 이름으로는 변경 불가');
  ok(!Profiles.renameProfile('없는id', '아무이름'), '존재하지 않는 프로필은 변경 실패');
}

// ---- 삭제: 마지막 하나 남은 프로필은 지울 수 없다 ----
{
  const Profiles = freshModule();
  const [defaultProfile] = Profiles.listProfiles();
  ok(!Profiles.deleteProfile(defaultProfile.id), '프로필이 1개뿐이면 삭제 불가');
  eq(Profiles.listProfiles().length, 1, '삭제 실패 후에도 여전히 1개');

  const second = Profiles.createProfile('지워질사람', null);
  localStorage.setItem(Profiles.saveKeyFor(second.id), JSON.stringify({ turn: 1 }));
  Profiles.setActiveProfileId(second.id);
  ok(Profiles.deleteProfile(second.id), '두 번째 프로필은 삭제 가능');
  eq(Profiles.listProfiles().length, 1, '삭제 후 1개 남음');
  eq(localStorage.getItem(Profiles.saveKeyFor(second.id)), null, '삭제된 프로필의 저장 데이터도 함께 삭제됨');
  eq(Profiles.getActiveProfileId(), null, '삭제된 프로필이 활성 상태였다면 활성 선택도 해제됨');
}

// ---- 활성 프로필 해제 ----
{
  const Profiles = freshModule();
  const [p] = Profiles.listProfiles();
  Profiles.setActiveProfileId(p.id);
  eq(Profiles.getActiveProfileId(), p.id, '설정한 프로필이 활성 상태로 반영됨');
  Profiles.clearActiveProfile();
  eq(Profiles.getActiveProfileId(), null, '해제 후에는 활성 프로필이 없음');
}

summary('profiles.js');
