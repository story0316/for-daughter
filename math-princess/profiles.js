/*
 * 기기 내 여러 사람이 같은 게임을 나눠 쓸 수 있게 해주는 "프로필(계정)"
 * 관리 모듈. 서버가 없는 정적 사이트이므로 실제 로그인이 아니라, 기기(또는
 * 브라우저) 안에서 저장 데이터를 프로필별로 나누는 방식이다.
 *
 * 설계 원칙: 프로필을 한 번도 만들어본 적 없는 사용자(와 그런 상황을
 * 가정하는 기존 e2e 테스트들)는 이 모듈이 있든 없든 완전히 똑같이
 * 동작해야 한다. 그래서 프로필이 1개(기본 프로필) 뿐일 때는 기존
 * math-princess-save-v1 / math-princess-endings-v1 키를 그대로 쓰고,
 * "누가 할까요?" 화면도 띄우지 않는다. 두 번째 프로필을 만드는 순간부터만
 * 매번 프로필을 고르는 화면이 나타난다.
 */
(function (root) {
  'use strict';

  const PROFILES_KEY = 'math-princess-profiles-v1';
  const ACTIVE_PROFILE_SESSION_KEY = 'math-princess-active-profile';
  const LEGACY_SAVE_KEY = 'math-princess-save-v1';
  const LEGACY_ENDINGS_KEY = 'math-princess-endings-v1';

  // 프로필이 하나뿐일 때 그 프로필이 쓰는 고정 id. 이 id의 저장 키는 항상
  // 레거시 키와 동일해서, 프로필 기능을 쓰지 않던 기존 저장 데이터를
  // 옮기는 마이그레이션 과정 없이도 자연스럽게 "그 사람의 데이터"가 된다.
  const DEFAULT_PROFILE_ID = 'default';

  const PROFILE_EMOJIS = ['👑', '🎀', '🌸', '⭐', '🦄', '🍀', '🌙', '🎈'];

  function loadProfilesRaw() {
    try {
      const arr = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveProfilesRaw(list) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 등록된 프로필이 하나도 없으면(첫 방문이거나, 프로필 기능이 나오기 전에
  // 이미 플레이하던 기존 사용자라면) 기본 프로필 하나를 자동으로 만들어
  // 등록해둔다. 이 시점에는 화면에 아무것도 보여주지 않는다.
  function ensureDefaultProfile() {
    const list = loadProfilesRaw();
    if (list.length > 0) return list;
    const defaultProfile = {
      id: DEFAULT_PROFILE_ID,
      name: '플레이어 1',
      emoji: PROFILE_EMOJIS[0],
      pin: null,
      createdAt: Date.now(),
    };
    saveProfilesRaw([defaultProfile]);
    return [defaultProfile];
  }

  function listProfiles() {
    return ensureDefaultProfile();
  }

  function getProfile(id) {
    return listProfiles().find((p) => p.id === id) || null;
  }

  function saveKeyFor(profileId) {
    return profileId === DEFAULT_PROFILE_ID ? LEGACY_SAVE_KEY : `${LEGACY_SAVE_KEY}::${profileId}`;
  }

  function endingsKeyFor(profileId) {
    return profileId === DEFAULT_PROFILE_ID ? LEGACY_ENDINGS_KEY : `${LEGACY_ENDINGS_KEY}::${profileId}`;
  }

  function nextEmoji(existing) {
    const used = new Set(existing.map((p) => p.emoji));
    const free = PROFILE_EMOJIS.find((e) => !used.has(e));
    return free || PROFILE_EMOJIS[existing.length % PROFILE_EMOJIS.length];
  }

  function makeProfileId() {
    return `p_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }

  // name: 화면에 표시할 이름(비어있으면 "플레이어 N"). pin: 4자리 숫자
  // 문자열이거나, PIN을 쓰지 않으면 null/undefined.
  function createProfile(name, pin) {
    const list = listProfiles();
    const trimmed = (name || '').trim().slice(0, 10);
    const profile = {
      id: makeProfileId(),
      name: trimmed || `플레이어 ${list.length + 1}`,
      emoji: nextEmoji(list),
      pin: pin ? String(pin).slice(0, 4) : null,
      createdAt: Date.now(),
    };
    list.push(profile);
    saveProfilesRaw(list);
    return profile;
  }

  function renameProfile(id, name) {
    const list = listProfiles();
    const profile = list.find((p) => p.id === id);
    if (!profile) return false;
    const trimmed = (name || '').trim().slice(0, 10);
    if (!trimmed) return false;
    profile.name = trimmed;
    saveProfilesRaw(list);
    return true;
  }

  // 기본 프로필(마지막 하나 남은 프로필)은 지울 수 없다 — 프로필이 0개인
  // 상태는 이 모듈의 다른 전제(ensureDefaultProfile)와 맞지 않는다.
  function deleteProfile(id) {
    const list = listProfiles();
    if (list.length <= 1) return false;
    const next = list.filter((p) => p.id !== id);
    if (next.length === list.length) return false;
    saveProfilesRaw(next);
    try {
      localStorage.removeItem(saveKeyFor(id));
      localStorage.removeItem(endingsKeyFor(id));
    } catch (e) {
      // no-op
    }
    if (getActiveProfileId() === id) clearActiveProfile();
    return true;
  }

  function verifyPin(id, pin) {
    const profile = getProfile(id);
    if (!profile) return false;
    if (!profile.pin) return true;
    return String(pin) === profile.pin;
  }

  /* ---------------- 이번 세션에서 고른 프로필 ---------------- */
  // 브라우저 탭/세션이 유지되는 동안만 "로그인 상태"를 유지한다(sessionStorage).
  // 탭을 닫았다 다시 열면 프로필이 여러 개일 때 다시 "누가 할까요?"부터 시작한다.

  function getActiveProfileId() {
    try {
      return sessionStorage.getItem(ACTIVE_PROFILE_SESSION_KEY);
    } catch (e) {
      return null;
    }
  }

  function setActiveProfileId(id) {
    try {
      sessionStorage.setItem(ACTIVE_PROFILE_SESSION_KEY, id);
    } catch (e) {
      // no-op
    }
  }

  function clearActiveProfile() {
    try {
      sessionStorage.removeItem(ACTIVE_PROFILE_SESSION_KEY);
    } catch (e) {
      // no-op
    }
  }

  function getActiveProfile() {
    const id = getActiveProfileId();
    return id ? getProfile(id) : null;
  }

  // 프로필 선택 화면을 띄워야 하면 true. 프로필이 1개뿐이면(기본 프로필,
  // 즉 프로필 기능을 아직 안 쓰는 사용자) 자동으로 그 프로필을 활성화하고
  // 화면은 건너뛴다 — 이 분기 덕분에 기존 단일 사용자 흐름이 그대로 유지된다.
  function needsProfilePicker() {
    const list = listProfiles();
    if (list.length <= 1) {
      if (list.length === 1 && !getActiveProfileId()) setActiveProfileId(list[0].id);
      return false;
    }
    return !getActiveProfileId() || !getProfile(getActiveProfileId());
  }

  const api = {
    PROFILES_KEY,
    DEFAULT_PROFILE_ID,
    listProfiles,
    getProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    verifyPin,
    saveKeyFor,
    endingsKeyFor,
    getActiveProfileId,
    setActiveProfileId,
    clearActiveProfile,
    getActiveProfile,
    needsProfilePicker,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MathPrincessProfiles = api;
  }
})(typeof window !== 'undefined' ? window : null);
