#!/usr/bin/env bash
# 유닛 테스트 -> 밸런스 시뮬레이션 -> e2e 테스트 순서로 전부 실행한다.
set -uo pipefail
cd "$(dirname "$0")"

FAIL=0
bash run-unit.sh || FAIL=1
echo ""
echo "=== balance/simulate.js ==="
node balance/simulate.js || FAIL=1
echo ""
bash run-e2e.sh || FAIL=1

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅✅✅ 전체 회귀 테스트 통과 ✅✅✅"
else
  echo "❌❌❌ 회귀 테스트 중 실패가 있습니다 ❌❌❌"
fi
exit $FAIL
