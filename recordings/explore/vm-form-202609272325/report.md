# 탐색 보고서: vm-form

- 라우트: `#/virtualserver/virtualserver/list` · run_id 0928-0825-1aab · 2026-09-27T23:29 ~ 23:31
- 종료 사유: 시도할 컨트롤이 더 없음
- 결정 28회, 동작 28회, 비용 $0.0036, 이상 0건, 정보 3건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): vm-0928-0825-1aab

## 이상·정보 판정
- #1 정보 **validation-text** — 1~100 사이의 값을 입력하세요. (동작: textbox "서버 수" = "1", [스크린샷](screenshots\01.jpg))
- #8 정보 **validation-text** — 0 1~100 사이의 값을 입력하세요. (동작: textbox "서버 수" = "0", [스크린샷](screenshots\08.jpg))
- #19 정보 **validation-text** — 현재 0 10개씩 보기 상세 보기 정확한 Image명을 입력하세요. 상세 검색 Image명 OS 타입 Visibility Availability Zone 생성 일시 상태 데이터가 없습니다. Image별로 지원하는 Availability Zone이 다르므로 네트워크 설정  (동작: button "Custom", [스크린샷](screenshots\19.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "서버 수" | "1" | 1대 | 1.00 | 아니오 |  |
| 2 | CLICK button "Image 및 서버" |  |  | 0.19 | 아니오 |  |
| 3 | CLICK button "스토리지" |  |  | 0.42 | 아니오 |  |
| 4 | CLICK button "Alma Linux" |  |  | 0.19 | 아니오 |  |
| 5 | CLICK button "Oracle Linux" |  |  | 0.31 | 예 |  |
| 6 | CLICK button "RHEL" |  |  | 0.17 | 예 |  |
| 7 | CLICK button "RHEL 9.6" | → RHEL 9.6 |  | 0.13 | 아니오 |  |
| 8 | TYPE_TEXT textbox "서버 수" | "0" | 0대 (거부 기대) | 1.00 | 예 |  |
| 9 | CLICK textbox "Open 서버 수" |  |  | 0.25 | 아니오 |  |
| 10 | CLICK button "2025-05-20" | → 2025-05-20 |  | 0.21 | 예 |  |
| 11 | CLICK button "Rocky Linux" |  |  | 0.25 | 예 |  |
| 12 | CLICK button "Ubuntu" |  |  | 0.22 | 예 |  |
| 13 | CLICK button "Windows" |  |  | 0.35 | 예 |  |
| 14 | CLICK button "2026-04-21" | → 2026-04-21 |  | 0.21 | 아니오 |  |
| 15 | CLICK link "사용자 가이드 > Image 버전" |  |  | 0.26 | 아니오 |  |
| 16 | CLICK button "취소" |  |  | 0.23 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 17 | CLICK button "취소" |  |  | 0.65 | 예 |  |
| 18 | CLICK button "Windows 2025 Standard ENG" | → Windows 2025 Standard ENG |  | 0.29 | 아니오 |  |
| 19 | CLICK button "Custom" |  |  | 0.29 | 예 |  |
| 20 | CLICK textbox "Open 정확한 Image명을 입력하세요." |  |  | 0.61 | 아니오 |  |
| 21 | TYPE_TEXT textbox "정확한 Image명을 입력하세요." | "vm-0928-0825-1aab" | 유효 이름 (3~20자) | 1.00 | 예 |  |
| 22 | CLICK button "vm-0928-0825-1aab" |  |  | 0.43 | 예 |  |
| 23 | CLICK button "표준" |  |  | 0.62 | 예 |  |
| 24 | CLICK button "Kubernetes" |  |  | 0.31 | 예 |  |
| 25 | CLICK button "선택하세요." | → Standard-1 AZ: kr-west1-b |  | 0.77 | 예 |  |
| 26 | CLICK button "Standard-1" |  |  | 0.33 | 예 |  |
| 27 | CLICK button "선택하세요." | → s1v1m2 (vCPU 1 | Memory 2G) |  | 0.60 | 예 |  |
| 28 | CLICK button "Marketplace" |  |  | 0.51 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
