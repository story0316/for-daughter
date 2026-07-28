// 외부 의존성 없는 아주 작은 assertion 헬퍼. jest/mocha 등을 새로 설치하지
// 않고도(이 프로젝트는 빌드 과정 없는 정적 파일이 원칙이라) 각 테스트
// 파일이 이 모듈만 require해서 바로 pass/fail을 셀 수 있게 해준다.
let passCount = 0;
let failCount = 0;
const failures = [];

function ok(condition, message) {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function eq(actual, expected, message) {
  ok(actual === expected, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

function approx(actual, expected, tolerance, message) {
  ok(Math.abs(actual - expected) <= tolerance, `${message} (expected ~${expected} ±${tolerance}, got ${actual})`);
}

// 파일 하나의 테스트가 끝났을 때 요약을 찍고, 실패가 있으면 프로세스 종료
// 코드를 1로 세팅해서 run-*.sh가 실패를 알아챌 수 있게 한다.
function summary(label) {
  const total = passCount + failCount;
  if (failCount === 0) {
    console.log(`✅ ${label}: ${total}/${total} passed`);
  } else {
    console.log(`❌ ${label}: ${passCount}/${total} passed, ${failCount} failed`);
    process.exitCode = 1;
  }
  return failCount === 0;
}

module.exports = { ok, eq, approx, summary };
