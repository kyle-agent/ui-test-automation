#!/usr/bin/env bash
# service-map/screens.txt -> scenarios/smoke/<category>--<service>.yaml (읽기 전용 화면 진입 스모크)
# 사용: bash runner/gen_smoke.sh   (프로젝트 루트에서)
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf scenarios/smoke && mkdir -p scenarios/smoke
awk -f runner/gen_smoke.awk service-map/screens.txt
echo "files: $(ls scenarios/smoke | wc -l)"
