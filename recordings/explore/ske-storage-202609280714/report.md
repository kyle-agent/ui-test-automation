# 탐색 보고서: ske-storage

- 라우트: `#/ske/storage` · run_id 0928-1614-d903 · 2026-09-28T07:14 ~ 07:15
- 종료 사유: Jev 가 여섯 번 연속 BLOCKED
- 결정 6회, 동작 4회, 비용 $0.0010, 이상 0건, 정보 6건

## 이상·정보 판정
- #2 정보 **console-error** — TypeError: Cannot read properties of undefined (reading 'length')
    at immediate (https://console.kr-west1.e.samsungsdscloud.com/console/bundles/scp-kubernetes-user-console/main.90183ad278ec4c82aefe (동작: button "My Info.", [스크린샷](screenshots\02.jpg))
- #2 정보 **console-error** — TypeError: Cannot read properties of undefined (reading 'map')
    at h (https://console.kr-west1.e.samsungsdscloud.com/console/bundles/scp-kubernetes-user-console/main.90183ad278ec4c82aefe.js:1:17881 (동작: button "My Info.", [스크린샷](screenshots\02.jpg))
- #2 정보 **console-error** — Failed to load resource: the server responded with a status of 404 (NOT FOUND) (동작: button "My Info.", [스크린샷](screenshots\02.jpg))
- #2 정보 **console-error** — AxiosError: Request failed with status code 404
    at tr (https://console.kr-west1.e.samsungsdscloud.com/console/js/vendors.c6bc6f52eca6e8ba3783.js:2:8022082)
    at XMLHttpRequest.M (https://console (동작: button "My Info.", [스크린샷](screenshots\02.jpg))
- #3 정보 **console-error** — Failed to load resource: the server responded with a status of 404 (NOT FOUND) (동작: button "알림 목록", [스크린샷](screenshots\03.jpg))
- #3 정보 **console-error** — AxiosError: Request failed with status code 404
    at tr (https://console.kr-west1.e.samsungsdscloud.com/console/js/vendors.c6bc6f52eca6e8ba3783.js:2:8022082)
    at XMLHttpRequest.M (https://console (동작: button "알림 목록", [스크린샷](screenshots\03.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | BLOCKED button "My Info." |  |  | 0.59 | 예 |  |
| 3 | BLOCKED button "알림 목록" |  |  | 0.55 | 예 |  |
| 4 | BLOCKED button "Quick Start Guide" |  |  | 0.51 | 아니오 |  |
| 5 | BLOCKED button "Architecture Center" |  |  | 0.51 | 아니오 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "Documentation"
- button "Marketplace"
- button "Kubernetes Engine"
- button "IAM"
- button "DNS"
- button "Virtual Server"
- button "VPC"
- button "Feature Update"
- button "전체"
- button "공지 사항"
- button "Simple AI Inference 서비스 모델 변경(신규) 안내 (2026.09.18) 2026-09-17"
- button "Vertica(DBaaS) 상품 일부 버전 제공 종료 예정 안내 (2026.11.19) 2026-09-09"
- button "인프라 유지보수 작업 안내 (2026.09.21 ~ 2026.10.30) 2026-09-04"
- button "인프라 유지보수 작업 안내 (2026.09.29) 2026-09-02"
- button "인프라 유지보수 작업 안내 (2026.09.28) 2026-09-02"
- button "이용 및 청구 내역"
- button "예산 현황"
