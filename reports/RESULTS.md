# 회귀 결과 정리

> 생성 파일입니다. 직접 고치지 말고 `npm run results` 로 다시 만듭니다 (원본: `reports/runs/*.json`, `service-map/coverage.yaml`, `data/known-issues.yaml`). 생성 시각 2026-09-23 17:00, 실행 기록 1건.

## 1. spec 별 최근 상태

| spec | 마지막 실행 | 결과 | 소요 | 최근 5회 | 통과 평균 |
| --- | --- | --- | ---: | --- | ---: |
| networking.vpc.create-delete | 2026-09-23 17:00 | PASS | 41초 | P | 41초 |
| compute.vm-stack | 기록 없음 | - | - | - | - |
| compute.vm-volume | 기록 없음 | - | - | - | - |
| compute.vm-stack-net | 기록 없음 | - | - | - | - |

실행 기록은 `npm run test:stacks` 가 spec 하나를 마칠 때마다 `reports/runs/<YYYYMMDD-HHMM>-<spec id>.json` 으로 남긴다. 결과의 FAIL(class) 는 실패 분류(unclassified/environment/product/test), FAIL(known: KI-xxx) 는 알려진 이슈에 매칭된 실패.

## 2. 최근 실패 (최대 10건)

최근 실패 없음

## 3. 알려진 이슈

등록 1개 (활성 0개) — data/known-issues.yaml

적용된 항목 없음 (알려진 이슈로 분류된 실패가 없다)

## 4. 커버리지 (service-map/coverage.yaml)

level: 0 없음 · 1 진입(스모크) · 2 CRUD · 3 동작 · 4 통합 의존 체인. 갱신 규칙은 README "회귀 스택 스위트" 절.

- 서비스 89 · 화면 276 (Service Home 83, 그 외 193) · 스모크 진입 282
- 목록 화면 100, 그중 리소스 키 있음 80 = 장부 리소스 80개
- level ≥ 2 (CRUD 이상): **7/80** (9%) · level ≥ 3 (동작 이상): **7/80** (9%)

| 카테고리 | 리소스 | L1 | L2 | L3 | L4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AI-ML | 3 | 3 | 0 | 0 | 0 |
| Compute | 14 | 12 | 0 | 1 | 1 |
| Data Analytics | 3 | 3 | 0 | 0 | 0 |
| Database | 6 | 6 | 0 | 0 | 0 |
| Financial Management | 1 | 1 | 0 | 0 | 0 |
| Management | 8 | 8 | 0 | 0 | 0 |
| Networking | 30 | 25 | 0 | 1 | 4 |
| Security | 7 | 7 | 0 | 0 | 0 |
| Storage | 8 | 8 | 0 | 0 | 0 |
| **합계** | **80** | **73** | **0** | **2** | **5** |
