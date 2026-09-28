# 탐색 보고서: ske-cluster-list

- 라우트: `#/ske/cluster` · run_id 0928-1601-8d9f · 2026-09-28T07:01 ~ 07:03
- 종료 사유: 결정 예산 소진
- 결정 15회, 동작 15회, 비용 $0.0019, 이상 0건, 정보 2건

## 이상·정보 판정
- #2 정보 **validation-text** — 나지 않도록 소문자, 숫자와 특수문자(-)를 사용하여 3 ~ 30 자로 입력하세요. 0/30 제어 영역 설정 Kubernetes 버전 선택하세요. 프라이빗 엔드포인트 접근 허용 자원 해당 클러스터의 노드가 아닌 다른 자원에서 프라이빗 엔드포인트로 접근을 허용하려면, 접근이 필요한 자원을 (동작: button "서비스 생성", [스크린샷](screenshots\02.jpg))
- #4 정보 **validation-error** — "xp" → 입력 조건에 맞지 않습니다.2/30 (동작: button "v1.36.3", [스크린샷](screenshots\04.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CLICK textbox "Open 정확한 클러스터명을 입력하세요." |  |  | 0.66 | 아니오 |  |
| 2 | CLICK button "서비스 생성" |  |  | 0.90 | 예 |  |
| 3 | TYPE_TEXT textbox "클러스터명" | "xp" | 2자 (최소 3) (거부 기대) | 1.00 | 예 |  |
| 4 | CLICK button "v1.36.3" | → v1.36.3 2028-06-28 지원 종료 |  | 0.65 | 예 |  |
| 5 | CLICK button "v1.35.5" |  |  | 0.39 | 예 |  |
| 6 | CLICK button "사용" |  |  | 0.37 | 예 | 알림 Kubernetes API 에 대한 외부 접근이 가능합니다. 외부 접근이 필요하지 않다면, '사용' 체 |
| 7 | CLICK button "취소" |  |  | 1.00 | 예 |  |
| 8 | CLICK button "추가" |  |  | 0.40 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 9 | CLICK button "Virtual Server (0 개 선택)" |  |  | 0.57 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 10 | CLICK textbox "Open 서버명을 입력하세요." |  |  | 0.58 | 아니오 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 11 | CLICK button "Bare Metal Server (0 개 선택)" |  |  | 0.79 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 12 | CLICK button "GPU Server (0 개 선택)" |  |  | 0.74 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 13 | CLICK button "Multi-node GPU Cluster (0 개 선택)" |  |  | 0.72 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 14 | CLICK button "DevOps Service (0 개 선택)" |  |  | 1.00 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 15 | CLICK button "DevOps Console" |  |  | 0.41 | 아니오 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |

## 시도하지 않은 컨트롤
- button "5 개씩 보기"
- textbox "서비스명을 입력하세요."
- textbox "Open 서비스명을 입력하세요."
