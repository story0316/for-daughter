#!/usr/bin/env bash
# 순수 로직 유닛 테스트(브라우저/Playwright 불필요, plain Node만 있으면 됨)를
# 전부 실행한다. 하나라도 실패하면 0이 아닌 코드로 종료한다.
set -uo pipefail
cd "$(dirname "$0")/.."

FAIL=0
for f in test/unit/*.test.js; do
  echo ""
  echo "=== $f ==="
  node "$f" || FAIL=1
done

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 모든 유닛 테스트 통과"
else
  echo "❌ 유닛 테스트 중 실패가 있습니다"
fi
exit $FAIL
