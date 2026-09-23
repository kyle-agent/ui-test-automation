# 탐색 보고서: vpc-form

- 라우트: `#/vpc/vpc/list` · run_id 0923-1654-49e5 · 2026-09-23T07:54 ~ 07:55
- 종료 사유: 시도할 컨트롤이 더 없음
- 결정 20회, 동작 20회, 비용 $0.0025, 이상 0건, 정보 6건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): vpc-0923-1654-49e5

## 이상·정보 판정
- #6 정보 **validation-text** —  서비스 정보 입력 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20 Public Zone Public Zone의 Availability Zone(가용 영역)은 1-zone(kr-west1-b)으로 확장되어 생성됩니다. 일부 IP 대역은 관리용으로 사용할 수 없습 (동작: button "서비스 생성", [스크린샷](screenshots\06.jpg))
- #10 정보 **validation-text** — 사용할 수 없는 IP 대역입니다. 17/50 (동작: textbox "설명" = "탐색 0923-1654-49e5", [스크린샷](screenshots\10.jpg))
- #16 정보 **validation-text** — 654-49e5-x 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. (동작: textbox "VPC명" = "vpc-0923-1654-49e5-xx", [스크린샷](screenshots\16.jpg))
- #17 정보 **validation-text** — 50/50 50자 이내로 입력하세요. (동작: textbox "설명" = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", [스크린샷](screenshots\17.jpg))
- #18 정보 **validation-text** — CIDR 형식으로 /16~/28 범위 내에서 입력하세요. ex) 192.168.0.0/16 (동작: textbox "Open IP 대역", [스크린샷](screenshots\18.jpg))
- #19 정보 **validation-text** — 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. (동작: textbox "Open VPC명", [스크린샷](screenshots\19.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "VPC명" | "vpc-0923-1654-49e5" | 유효 이름 (3~20자) | 0.97 | 예 |  |
| 2 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/20" | 유효 CIDR (/20) | 0.90 | 예 |  |
| 3 | CLICK textbox "Open 설명" |  |  | 0.39 | 예 |  |
| 4 | CLICK button "생성" |  |  | 0.55 | 예 | 알림 VPC를 생성하시겠습니까? 취소 확인 |
| 5 | CLICK button "확인" |  |  | 0.64 | 예 |  |
| 6 | CLICK button "서비스 생성" |  |  | 0.85 | 예 |  |
| 7 | CLICK link "vpc-0923-1654-49e5" |  |  | 0.23 | 아니오 |  |
| 8 | TYPE_TEXT textbox "VPC명" | "vp" | 2자 (최소 3) (거부 기대) | 0.61 | 예 |  |
| 9 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/15" | 범위 밖 (/15) (거부 기대) | 0.78 | 예 |  |
| 10 | TYPE_TEXT textbox "설명" | "탐색 0923-1654-49e5" | 짧은 설명 | 0.98 | 예 |  |
| 11 | CLICK button "취소" |  |  | 0.32 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 12 | CLICK button "취소" |  |  | 1.00 | 예 |  |
| 13 | CLICK button "서비스 정보" |  |  | 0.33 | 아니오 |  |
| 14 | CLICK button "Public Zone" |  |  | 0.32 | 예 |  |
| 15 | CLICK button "VPC 생성" |  |  | 0.35 | 예 |  |
| 16 | TYPE_TEXT textbox "VPC명" | "vpc-0923-1654-49e5-xx" | 21자 (최대 20) (거부 기대) | 0.59 | 예 |  |
| 17 | TYPE_TEXT textbox "설명" | "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | 51자 (최대 50) (거부 기대) | 0.43 | 예 |  |
| 18 | CLICK textbox "Open IP 대역" |  |  | 0.48 | 예 |  |
| 19 | CLICK textbox "Open VPC명" |  |  | 0.67 | 예 |  |
| 20 | CLICK button "VPC 목록" |  |  | 0.51 | 예 | 알림 화면 이동 시 작성 중인 정보는 저장되지 않습니다. 화면을 이동하시겠습니까? 취소 확인 |

## 시도하지 않은 컨트롤
- 없음
