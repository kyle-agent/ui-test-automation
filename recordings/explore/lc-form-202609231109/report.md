# 탐색 보고서: lc-form

- 라우트: `#/virtualserver/launch-configuration/list` · run_id 0923-2009-fae3 · 2026-09-23T11:09 ~ 11:11
- 종료 사유: 결정 예산 소진
- 결정 25회, 동작 25회, 비용 $0.0034, 이상 0건, 정보 3건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): xp-0923-2009-fae3

## 이상·정보 판정
- #3 정보 **validation-text** — ed로 생성하기 현재 0 10개씩 보기 상세 보기 정확한 Image명을 입력하세요. 상세 검색 Image명 OS 타입 Visibility Image 유형 Availability Zone 생성 일시 상태 데이터가 없습니다. SSD_Provisioned 8GB (동작: button "Custom", [스크린샷](screenshots\03.jpg))
- #17 정보 **validation-text** — 영문, 숫자와 특수문자(-_)를 사용하여 63자 이내로 입력하세요. (동작: textbox "Open Launch Configuration명", [스크린샷](screenshots\17.jpg))
- #19 정보 **validation-text** — 총 0 20개씩 보기 삭제 Launch Configuration명을 입력하세요. Auto-Scaling Group 수 서비스를 생성하세요. 다양한 서비스가 당신의 업무를 도와드려요. (동작: button "확인", [스크린샷](screenshots\19.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "Launch Configuration명" | "xp-0923-2009-fae3" | 유효 이름 (3~20자) | 1.00 | 예 |  |
| 2 | CLICK button "스토리지" |  |  | 0.15 | 예 |  |
| 3 | CLICK button "Custom" |  |  | 0.15 | 예 |  |
| 4 | CLICK textbox "Open 정확한 Image명을 입력하세요." |  |  | 0.56 | 아니오 |  |
| 5 | CLICK button "표준" |  |  | 0.30 | 예 |  |
| 6 | CLICK button "Image" |  |  | 0.14 | 아니오 |  |
| 7 | CLICK button "서비스 정보" |  |  | 0.40 | 아니오 |  |
| 8 | CLICK link "사용자 가이드 > Image 버전" |  |  | 0.24 | 아니오 |  |
| 9 | CLICK button "2025-05-22" | → 2025-05-22 |  | 0.17 | 아니오 |  |
| 10 | CLICK button "Oracle Linux" |  |  | 0.25 | 예 |  |
| 11 | CLICK button "Alma Linux" |  |  | 0.35 | 예 |  |
| 12 | CLICK button "RHEL" |  |  | 0.39 | 예 |  |
| 13 | CLICK button "Rocky Linux" |  |  | 0.20 | 예 |  |
| 14 | CLICK button "Ubuntu" |  |  | 0.41 | 예 |  |
| 15 | CLICK button "Windows" |  |  | 0.33 | 예 |  |
| 16 | CLICK button "2026-04-21" | → 2026-04-21 |  | 0.42 | 아니오 |  |
| 17 | CLICK textbox "Open Launch Configuration명" |  |  | 0.27 | 예 |  |
| 18 | CLICK button "취소" |  |  | 0.37 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 19 | CLICK button "확인" |  |  | 0.56 | 예 |  |
| 20 | TYPE_TEXT textbox "Launch Configuration명" | "xp" | 2자 (최소 3) (거부 기대) | 1.00 | 예 |  |
| 21 | CLICK button "Alma 9.6" | → Alma 9.6 |  | 0.50 | 예 |  |
| 22 | CLICK button "img" |  |  | 0.59 | 아니오 |  |
| 23 | CLICK button "Alma 9.6" | → Alma 8.10 |  | 1.00 | 예 |  |
| 24 | CLICK button "2025-01-09" | → 2025-01-09 |  | 0.69 | 아니오 |  |
| 25 | CLICK button "Alma 8.10" | → Alma 9.6 |  | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
