# 탐색 보고서: ske-cluster-form

- 라우트: `#/ske/cluster` · run_id 0928-1547-de38 · 2026-09-28T06:51 ~ 06:53
- 종료 사유: 시도할 컨트롤이 더 없음
- 결정 26회, 동작 26회, 비용 $0.0033, 이상 0건, 정보 3건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): xp-0928-1547-de38

## 이상·정보 판정
- #2 정보 **validation-error** — "xp" → 입력 조건에 맞지 않습니다.2/30 (동작: button "v1.36.3", [스크린샷](screenshots\02.jpg))
- #16 정보 **validation-error** — "xp-0928-1547-de38-xxx" → 입력 조건에 맞지 않습니다.21/30 (동작: textbox "클러스터명" = "xp-0928-1547-de38-xxx", [스크린샷](screenshots\16.jpg))
- #20 정보 **validation-text** — 20개씩 보기 서비스 해지 정확한 클러스터명을 입력하세요. 상세 검색 서비스 생성 노드 수 버전 상태 서비스를 생성하세요. 다양한 서비스가 당신의 업무를 도와드려요. 서비스 생성 (동작: button "확인", [스크린샷](screenshots\20.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "클러스터명" | "xp" | 2자 (최소 3) (거부 기대) | 1.00 | 예 |  |
| 2 | CLICK button "v1.36.3" | → v1.36.3 2028-06-28 지원 종료 |  | 0.55 | 예 |  |
| 3 | CLICK button "v1.35.5" |  |  | 0.40 | 예 |  |
| 4 | CLICK button "사용" |  |  | 0.48 | 예 | 알림 Kubernetes API 에 대한 외부 접근이 가능합니다. 외부 접근이 필요하지 않다면, '사용' 체 |
| 5 | CLICK button "취소" |  |  | 1.00 | 예 |  |
| 6 | CLICK button "추가" |  |  | 0.49 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 7 | CLICK button "Virtual Server (0 개 선택)" |  |  | 0.63 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 8 | CLICK textbox "Open 서버명을 입력하세요." |  |  | 0.66 | 아니오 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 9 | CLICK button "Bare Metal Server (0 개 선택)" |  |  | 0.79 | 아니오 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 10 | CLICK button "GPU Server (0 개 선택)" |  |  | 0.78 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 11 | CLICK button "Multi-node GPU Cluster (0 개 선택)" |  |  | 0.73 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 12 | CLICK button "DevOps Service (0 개 선택)" |  |  | 1.00 | 예 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 13 | CLICK textbox "Open 서비스명을 입력하세요." |  |  | 0.43 | 아니오 | 프라이빗 엔드포인트 접근 허용 자원 추가 서비스 Virtual Server (0 개 선택) Bare Meta |
| 14 | CLICK button "5 개씩 보기" |  |  | 0.54 | 예 |  |
| 15 | CLICK textbox "Open 클러스터명" |  |  | 0.42 | 예 |  |
| 16 | TYPE_TEXT textbox "클러스터명" | "xp-0928-1547-de38-xxx" | 21자 (최대 20) (거부 기대) | 1.00 | 예 |  |
| 17 | CLICK button "클러스터 정보" |  |  | 0.42 | 예 |  |
| 18 | CLICK button "네트워크 정보" |  |  | 0.75 | 아니오 |  |
| 19 | CLICK button "취소" |  |  | 1.00 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 20 | CLICK button "확인" |  |  | 1.00 | 예 |  |
| 21 | CLICK button "v1.36.3" | → v1.35.5 2028-02-28 지원 종료 |  | 1.00 | 예 |  |
| 22 | CLICK button "2028-02-28 지원 종료" |  |  | 0.35 | 예 |  |
| 23 | TYPE_TEXT textbox "클러스터명" | "xp-0928-1547-de38_@#" | 허용되지 않는 특수문자 (거부 기대) | 1.00 | 예 |  |
| 24 | TYPE_TEXT textbox "클러스터명" | "한글xp-0928-1547-de38" | 한글 (거부 기대) | 1.00 | 예 |  |
| 25 | TYPE_TEXT textbox "클러스터명" | "" | 빈 값 (거부 기대) | 1.00 | 예 |  |
| 26 | TYPE_TEXT textbox "클러스터명" | "xp-0928-1547-de38" | 유효 이름 (3~30자) | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
