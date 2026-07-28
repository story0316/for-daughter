#!/usr/bin/env bash
# Playwright 기반 e2e 테스트를 전부 실행한다. 정적 파일 서버가 필요하므로,
# 이미 떠 있지 않다면 이 스크립트가 하나 띄웠다가 끝나면 정리한다.
#
# 요구사항:
#   - Node.js
#   - playwright 패키지(전역 NODE_PATH로 잡히거나 npm install playwright로 로컬 설치)
#   - Chromium 실행 파일(기본 /opt/pw-browsers/chromium, 없으면
#     PLAYWRIGHT_CHROMIUM_PATH 환경변수로 지정하거나 `npx playwright install chromium`)
#
# 환경변수:
#   MATH_PRINCESS_TEST_URL   기본 http://localhost:8138 (이미 떠 있는 서버를 쓰려면 지정)
#   MATH_PRINCESS_TEST_PORT  이 스크립트가 새로 띄울 때 쓸 포트(기본 8138)
#   PLAYWRIGHT_CHROMIUM_PATH Chromium 실행 파일 경로
set -uo pipefail
cd "$(dirname "$0")/.."
REPO_ROOT="$(cd .. && pwd)"

PORT="${MATH_PRINCESS_TEST_PORT:-8138}"
export MATH_PRINCESS_TEST_URL="${MATH_PRINCESS_TEST_URL:-http://localhost:$PORT}"

# 이 환경에는 전역 NODE_PATH에 playwright가 깔려 있는 경우가 있다(로컬
# node_modules 없이도 바로 쓸 수 있게). NODE_PATH가 이미 설정돼 있지 않고
# 그 경로가 실제로 있으면 자동으로 잡아준다. 다른 환경에서는 npm install
# playwright로 로컬 설치하면 이 자동 설정 없이도 그대로 동작한다.
if [ -z "${NODE_PATH:-}" ] && [ -d "/opt/node22/lib/node_modules" ]; then
  export NODE_PATH="/opt/node22/lib/node_modules"
fi
if [ -z "${PLAYWRIGHT_CHROMIUM_PATH:-}" ] && [ -x "/opt/pw-browsers/chromium" ]; then
  export PLAYWRIGHT_CHROMIUM_PATH="/opt/pw-browsers/chromium"
fi

STARTED_SERVER=0
if ! curl -s -o /dev/null "$MATH_PRINCESS_TEST_URL/math-princess/index.html"; then
  echo "정적 서버가 없어서 새로 띄웁니다: $MATH_PRINCESS_TEST_URL (repo root: $REPO_ROOT)"
  (cd "$REPO_ROOT" && python3 -m http.server "$PORT" > /tmp/math-princess-test-server.log 2>&1 &)
  STARTED_SERVER=1
  for i in $(seq 1 20); do
    curl -s -o /dev/null "$MATH_PRINCESS_TEST_URL/math-princess/index.html" && break
    sleep 0.5
  done
fi

FAIL=0
for f in test/e2e/*.test.js; do
  echo ""
  echo "=== $f ==="
  node "$f" || FAIL=1
done

if [ "$STARTED_SERVER" -eq 1 ]; then
  pkill -f "http.server $PORT" 2>/dev/null || true
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 모든 e2e 테스트 통과"
else
  echo "❌ e2e 테스트 중 실패가 있습니다"
fi
exit $FAIL
