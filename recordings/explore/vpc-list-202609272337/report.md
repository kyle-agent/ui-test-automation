# 탐색 보고서: vpc-list

- 라우트: `#/vpc/vpc/list` · run_id 0928-0837-45d7 · 2026-09-27T23:37 ~ 23:38
- 종료 사유: 시도할 컨트롤이 더 없음
- 결정 14회, 동작 14회, 비용 $0.0016, 이상 0건, 정보 3건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): vpc-0928-0837-45d7

## 이상·정보 판정
- #1 정보 **validation-text** —  서비스 정보 입력 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20 Public Zone Public Zone의 Availability Zone(가용 영역)은 1-zone(kr-west1-b)으로 확장되어 생성됩니다. 일부 IP 대역은 관리용으로 사용할 수 없습 (동작: button "서비스 생성", [스크린샷](screenshots\01.jpg))
- #10 정보 **validation-text** — ue 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/128 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/256 49개 태그를 더 추가할 수 있습니다. (최대 50개) (동작: button "태그 추가", [스크린샷](screenshots\10.jpg))
- #14 정보 **validation-text** — 총 0 20개씩 보기 서비스 해지 검색어를 입력하세요. 상세 검색 서비스 생성 VPC ID IP 대역 수 생성 일시 상태 서비스를 생성하세요. 다양한 서비스가 당신의 업무를 도와드려요. 서비스 생성 (동작: button "확인", [스크린샷](screenshots\14.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CLICK button "서비스 생성" |  |  | 0.94 | 예 |  |
| 2 | CLICK textbox "Open VPC명" |  |  | 0.39 | 예 |  |
| 3 | CLICK button "Public Zone" | → Public Zone |  | 0.39 | 예 |  |
| 4 | TYPE_TEXT textbox "VPC명" | "vpc-0928-0837-45d7" | 유효 이름 (3~20자) | 0.89 | 예 |  |
| 5 | CLICK textbox "Open IP 대역" |  |  | 0.74 | 예 |  |
| 6 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/20" | 유효 CIDR (/20) | 0.95 | 예 |  |
| 7 | CLICK textbox "Open 설명" |  |  | 0.41 | 예 |  |
| 8 | CLICK button "생성" |  |  | 0.48 | 예 | 알림 VPC를 생성하시겠습니까? 취소 확인 |
| 9 | CLICK button "취소" |  |  | 0.65 | 예 |  |
| 10 | CLICK button "태그 추가" |  |  | 0.70 | 예 |  |
| 11 | CLICK textbox "Open 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." |  |  | 0.38 | 예 |  |
| 12 | CLICK button "서비스 정보" |  |  | 0.60 | 예 |  |
| 13 | CLICK button "취소" |  |  | 1.00 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 14 | CLICK button "확인" |  |  | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
