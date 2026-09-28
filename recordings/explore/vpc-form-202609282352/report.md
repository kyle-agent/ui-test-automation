# 탐색 보고서: vpc-form

- 라우트: `#/vpc/vpc/list` · run_id 0929-0852-f08d · 2026-09-28T23:52 ~ 23:53
- 종료 사유: Jev 가 DONE
- 결정 21회, 동작 20회, 비용 $0.0022, 이상 0건, 정보 9건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): vpc-0929-0852-f08d

## 이상·정보 판정
- #2 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 (동작: textbox "IP 대역" = "10.250.0.0/15", [스크린샷](screenshots\02.jpg))
- #3 정보 **validation-error** — "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "Open 설명", [스크린샷](screenshots\03.jpg))
- #12 정보 **validation-error** — "10.250.0.0/29" → 사용할 수 없는 IP 대역입니다. (동작: textbox "IP 대역" = "10.250.0.0/29", [스크린샷](screenshots\12.jpg))
- #13 정보 **validation-error** — "vpc-0929-0852-f08d-x" → 입력 조건에 맞지 않습니다.20/20 (동작: textbox "VPC명" = "vpc-0929-0852-f08d-xx", [스크린샷](screenshots\13.jpg))
- #15 정보 **validation-error** — "vpc-0929-0852-f08_@#" → 입력 조건에 맞지 않습니다.20/20 (동작: textbox "VPC명" = "vpc-0929-0852-f08_@#", [스크린샷](screenshots\15.jpg))
- #16 정보 **validation-error** — "한글vpc-0929-0852-f08d" → 입력 조건에 맞지 않습니다.20/20 (동작: textbox "VPC명" = "한글vpc-0929-0852-f08d", [스크린샷](screenshots\16.jpg))
- #18 정보 **validation-error** — 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요.입력 조건에 맞지 않습니다.0/20 (동작: textbox "VPC명" = "", [스크린샷](screenshots\18.jpg))
- #19 정보 **validation-error** — "vpc-0929-0852-f08d" → 입력 조건에 맞지 않습니다.18/20 (동작: textbox "VPC명" = "vpc-0929-0852-f08d", [스크린샷](screenshots\19.jpg))
- #20 정보 **validation-error** — "10.251.0.0/20" → 사용할 수 없는 IP 대역입니다. (동작: textbox "IP 대역" = "10.251.0.0/20", [스크린샷](screenshots\20.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "VPC명" | "vp" | 2자 (최소 3) (거부 기대) | 0.97 | 예 |  |
| 2 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/15" | 범위 밖 (/15) (거부 기대) | 0.93 | 예 |  |
| 3 | CLICK textbox "Open 설명" |  |  | 0.38 | 예 |  |
| 4 | CLICK button "태그 추가" |  |  | 0.52 | 예 |  |
| 5 | CLICK button "서비스 정보" |  |  | 0.38 | 아니오 |  |
| 6 | TYPE_TEXT textbox "설명" | "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | 51자 (최대 50) (거부 기대) | 0.97 | 예 |  |
| 7 | CLICK button "Public Zone" | → Public Zone |  | 0.40 | 예 |  |
| 8 | CLICK button "취소" |  |  | 0.52 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 9 | CLICK button "취소" |  |  | 0.68 | 예 |  |
| 10 | TYPE_TEXT textbox "설명" | "탐색 0929-0852-f08d" | 짧은 설명 | 0.56 | 예 |  |
| 11 | CLICK textbox "Open IP 대역" |  |  | 0.59 | 예 |  |
| 12 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/29" | 범위 밖 (/29) (거부 기대) | 0.67 | 예 |  |
| 13 | TYPE_TEXT textbox "VPC명" | "vpc-0929-0852-f08d-xx" | 21자 (최대 20) (거부 기대) | 0.62 | 예 |  |
| 14 | CLICK textbox "Open VPC명" |  |  | 1.00 | 아니오 |  |
| 15 | TYPE_TEXT textbox "VPC명" | "vpc-0929-0852-f08_@#" | 허용되지 않는 특수문자 (거부 기대) | 0.57 | 예 |  |
| 16 | TYPE_TEXT textbox "VPC명" | "한글vpc-0929-0852-f08d" | 한글 (거부 기대) | 0.61 | 예 |  |
| 17 | TYPE_TEXT textbox "설명" | "<b>bold</b> & \"quote\"" | HTML·따옴표 | 0.54 | 예 |  |
| 18 | TYPE_TEXT textbox "VPC명" | "" | 빈 값 (거부 기대) | 0.57 | 예 |  |
| 19 | TYPE_TEXT textbox "VPC명" | "vpc-0929-0852-f08d" | 유효 이름 (3~20자) | 0.95 | 예 |  |
| 20 | TYPE_TEXT textbox "IP 대역" | "10.251.0.0/20" | 관리용 대역 (콘솔이 막음) (거부 기대) | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
