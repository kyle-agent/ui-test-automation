# 탐색 보고서: subnet-form

- 라우트: `#/vpc/subnet/list` · run_id 0928-0822-e691 · 2026-09-27T23:22 ~ 23:23
- 종료 사유: Jev 가 두 번 연속 BLOCKED
- 결정 7회, 동작 5회, 비용 $0.0007, 이상 0건, 정보 2건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): sub-0928-0822-e691

## 이상·정보 판정
- #1 정보 **validation-text** — 검색어를 입력하세요. 신규 생성 vpc-0928-0822-e691 AZ: kr-west1-b (동작: button "선택하세요.", [스크린샷](screenshots\01.jpg))
- #4 정보 **validation-text** — 총 0 20개씩 보기 삭제 정확한 검색어를 입력하세요. 상세 검색 Subnet ID 생성 일시 상태 서비스를 생성하세요. 다양한 서비스가 당신의 업무를 도와드려요. (동작: button "취소", [스크린샷](screenshots\04.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CLICK button "선택하세요." | → vpc-0928-0822-e691 AZ: kr-west1-b |  | 0.86 | 예 |  |
| 2 | CLICK textbox "Open Subnet명" |  |  | 0.53 | 예 |  |
| 3 | CLICK button "서비스 정보" |  |  | 0.75 | 예 |  |
| 4 | CLICK button "취소" |  |  | 1.00 | 예 |  |
| 5 | TYPE_TEXT textbox "Subnet명" | "sub-0928-0822-e691" | 유효 이름 (3~20자) | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
