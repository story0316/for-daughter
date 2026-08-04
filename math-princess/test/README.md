# 프린세스 메이커 회귀 테스트

이 게임에 기능을 추가/수정할 때마다 매번 수동으로 다시 확인하는 대신,
아래 스위트를 돌려서 자동으로 회귀를 잡아내기 위한 테스트입니다.
빌드 과정이 없는 정적 파일 프로젝트라는 원칙에 맞춰, 테스트도 외부
프레임워크(jest/mocha 등) 없이 순수 Node.js + Playwright로만 작성했습니다.

## 구성

```
test/
  helpers/assert.js     외부 의존성 없는 아주 작은 assertion 헬퍼(ok/eq/approx/summary)
  unit/*.test.js         순수 로직(problems.js/subjects.js/endings.js/scenarios.js/
                         question-engine.js/reward-engine.js/game-engine.js/
                         profiles.js) 유닛 테스트 — 브라우저 불필요, plain Node로
                         즉시 실행됨, 아주 빠름
  balance/simulate.js    48개월 x 4주 생활 계획표 전체를 game-engine.js를 그대로
                         require해 실제 게임과 완전히 같은 코드로 재현하는
                         경제/엔딩 도달 가능성 시뮬레이션(수백 회 반복)
  e2e/*.test.js          Playwright로 실제 브라우저를 띄워 UI까지 통째로 검증
  run-unit.sh            유닛 테스트만 실행
  run-e2e.sh             e2e 테스트만 실행(정적 서버 자동 기동/정리)
  run-all.sh             유닛 → 밸런스 시뮬레이션 → e2e 순서로 전부 실행
```

## 실행 방법

```bash
cd math-princess/test
bash run-all.sh       # 전부
bash run-unit.sh       # 유닛 테스트만(몇 초)
node balance/simulate.js  # 밸런스 시뮬레이션만
bash run-e2e.sh         # e2e만(브라우저를 여러 번 띄우므로 몇 분 걸릴 수 있음)
```

개별 파일 하나만 돌리고 싶으면 그냥 `node test/unit/problems.test.js`처럼 직접
실행하면 됩니다. 모든 테스트 파일은 실패가 있으면 0이 아닌 종료 코드를
반환하므로 CI에서 그대로 게이트로 쓸 수 있습니다.

## e2e 테스트 요구사항

- Node.js
- [Playwright](https://playwright.dev) 패키지. 이 저장소는 로컬에 `node_modules`를
  두지 않는 것이 원칙이라 `package.json`이 없습니다. 실행 환경에 전역으로
  Playwright가 깔려 있다면(`NODE_PATH`로 잡히는 곳) 그대로 동작하고,
  없다면 아무 디렉터리에서나 `npm install playwright`로 로컬 설치한 뒤
  `NODE_PATH=$(npm root -g 이거나 방금 설치한 경로)`로 잡아주면 됩니다.
- Chromium 실행 파일. 기본값은 `/opt/pw-browsers/chromium`이며,
  `PLAYWRIGHT_CHROMIUM_PATH` 환경변수로 다른 경로를 지정할 수 있습니다.
  없다면 `npx playwright install chromium`으로 받을 수 있습니다.
- `run-e2e.sh`는 `MATH_PRINCESS_TEST_URL`(기본 `http://localhost:8138`)에
  서버가 이미 떠 있지 않으면 저장소 루트를 `python3 -m http.server`로
  직접 띄웠다가 끝나면 정리합니다. 이미 띄워둔 서버를 쓰고 싶다면
  `MATH_PRINCESS_TEST_URL=http://localhost:다른포트`를 지정하세요.

## 새 기능을 추가할 때

1. `problems.js`/`subjects.js`/`endings.js`/`scenarios.js`/`question-engine.js`/
   `reward-engine.js`/`game-engine.js`/`profiles.js`처럼 DOM에 의존하지 않는
   순수 로직을 건드렸다면 `test/unit/`에 케이스를 추가하세요.
2. 골드/스탯 보상 공식(콤보 배율, 아이템 보너스, 정답/오답 증감량 등)을
   조정하고 싶다면 `reward-engine.js`만 고치면 됩니다 — `test/balance/
   simulate.js`는 `game-engine.js`를 그대로 `require`해서 쓰고
   `game-engine.js`는 다시 `reward-engine.js`를 그대로 쓰므로, 손으로
   다시 맞출 필요 없이 시뮬레이션 결과에 바로 반영됩니다. 새 문제
   유형/과목을 추가하고 싶다면 `question-engine.js`를 고치세요. 다만 새
   활동/세션 유형 자체를 추가했다면 시뮬레이터의 플레이어 정책
   (`runWeekActivity` 등)에도 그 유형을 어떻게 다룰지 반영해줘야 합니다.
3. 화면 흐름(새 스케줄 화면, 새 게이트 조건, 새 팝업 등)을 추가했다면
   `test/e2e/`에 그 흐름을 그대로 따라가는 테스트를 추가하세요. 기존
   파일들(`weekly-plan.test.js`, `banquet-prince-gate.test.js` 등)이
   패턴 참고하기 좋습니다.
4. 테스트를 다 통과하는 걸 확인한 뒤 커밋하세요. `run-all.sh`가 초록불이면
   최소한 "이미 만들어둔 기능들은 안 깨졌다"는 확신을 갖고 다음 기능으로
   넘어갈 수 있습니다.
