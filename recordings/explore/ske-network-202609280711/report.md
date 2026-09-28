# 탐색 보고서: ske-network

- 라우트: `#/ske/network` · run_id 0928-1611-31b1 · 2026-09-28T07:11 ~ 07:12
- 종료 사유: Jev 가 여섯 번 연속 BLOCKED
- 결정 7회, 동작 5회, 비용 $0.0012, 이상 0건, 정보 8건

## 이상·정보 판정
- #1 정보 **console-error** — TypeError: Cannot read properties of undefined (reading 'length')
    at immediate (https://console.kr-west1.e.samsungsdscloud.com/console/bundles/scp-kubernetes-user-console/main.90183ad278ec4c82aefe (동작: button "VPC", [스크린샷](screenshots\01.jpg))
- #1 정보 **console-error** — TypeError: Cannot read properties of undefined (reading 'map')
    at h (https://console.kr-west1.e.samsungsdscloud.com/console/bundles/scp-kubernetes-user-console/main.90183ad278ec4c82aefe.js:1:17881 (동작: button "VPC", [스크린샷](screenshots\01.jpg))
- #1 정보 **console-error** — Failed to load resource: the server responded with a status of 404 (NOT FOUND) (동작: button "VPC", [스크린샷](screenshots\01.jpg))
- #1 정보 **console-error** — AxiosError: Request failed with status code 404
    at tr (https://console.kr-west1.e.samsungsdscloud.com/console/js/vendors.c6bc6f52eca6e8ba3783.js:2:8022082)
    at XMLHttpRequest.M (https://console (동작: button "VPC", [스크린샷](screenshots\01.jpg))
- #3 정보 **console-error** — Failed to load resource: the server responded with a status of 404 (NOT FOUND) (동작: button "My Info.", [스크린샷](screenshots\03.jpg))
- #3 정보 **console-error** — AxiosError: Request failed with status code 404
    at tr (https://console.kr-west1.e.samsungsdscloud.com/console/js/vendors.c6bc6f52eca6e8ba3783.js:2:8022082)
    at XMLHttpRequest.M (https://console (동작: button "My Info.", [스크린샷](screenshots\03.jpg))
- #4 정보 **console-error** — Failed to load resource: the server responded with a status of 404 (NOT FOUND) (동작: button "알림 목록", [스크린샷](screenshots\04.jpg))
- #4 정보 **console-error** — AxiosError: Request failed with status code 404
    at tr (https://console.kr-west1.e.samsungsdscloud.com/console/js/vendors.c6bc6f52eca6e8ba3783.js:2:8022082)
    at XMLHttpRequest.M (https://console (동작: button "알림 목록", [스크린샷](screenshots\04.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CLICK button "VPC" |  |  | 0.88 | 예 |  |
| 3 | BLOCKED button "My Info." |  |  | 0.52 | 예 |  |
| 4 | BLOCKED button "알림 목록" |  |  | 0.51 | 아니오 |  |
| 5 | BLOCKED button "Quick Start Guide" |  |  | 0.52 | 아니오 |  |
| 6 | BLOCKED button "Architecture Center" |  |  | 0.53 | 아니오 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "Documentation"
- button "Marketplace"
- button "IAM"
- button "Kubernetes Engine"
- button "Virtual Server"
- button "Resource Groups"
- button "Security Group"
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
