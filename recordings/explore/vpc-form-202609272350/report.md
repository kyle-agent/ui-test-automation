# 탐색 보고서: vpc-form

- 라우트: `#/vpc/vpc/list` · run_id 0928-0850-9656 · 2026-09-27T23:50 ~ 23:50
- 종료 사유: Jev 가 DONE
- 결정 21회, 동작 20회, 비용 $0.0022, 이상 0건, 정보 19건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): vpc-0928-0850-9656

## 이상·정보 판정
- #2 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 (동작: textbox "IP 대역" = "10.250.0.0/15", [스크린샷](screenshots\02.jpg))
- #3 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "Open 설명", [스크린샷](screenshots\03.jpg))
- #4 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: button "태그 추가", [스크린샷](screenshots\04.jpg))
- #5 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: button "서비스 정보", [스크린샷](screenshots\05.jpg))
- #6 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "설명" = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", [스크린샷](screenshots\06.jpg))
- #7 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: button "Public Zone", [스크린샷](screenshots\07.jpg))
- #8 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: button "취소", [스크린샷](screenshots\08.jpg))
- #9 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: button "취소", [스크린샷](screenshots\09.jpg))
- #10 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "Open VPC명", [스크린샷](screenshots\10.jpg))
- #11 정보 **validation-error** — "vpc-0928-0850-9656-x" → 입력 조건에 맞지 않습니다.20/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "VPC명" = "vpc-0928-0850-9656-xx", [스크린샷](screenshots\11.jpg))
- #12 정보 **validation-error** — "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "Open IP 대역", [스크린샷](screenshots\12.jpg))
- #13 정보 **validation-error** — "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "설명" = "탐색 0928-0850-9656", [스크린샷](screenshots\13.jpg))
- #14 정보 **validation-error** — "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "VPC명" = "vpc-0928-0850-965_@#", [스크린샷](screenshots\14.jpg))
- #15 정보 **validation-error** — "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "VPC명" = "한글vpc-0928-0850-9656", [스크린샷](screenshots\15.jpg))
- #16 정보 **validation-error** — "한글vpc-0928-0850-9656" → 입력 조건에 맞지 않습니다.20/20 | "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "설명" = "<b>bold</b> & \"quote\"", [스크린샷](screenshots\16.jpg))
- #17 정보 **validation-error** — "한글vpc-0928-0850-9656" → 입력 조건에 맞지 않습니다.20/20 | "10.250.0.0/29" → 사용할 수 없는 IP 대역입니다. (동작: textbox "IP 대역" = "10.250.0.0/29", [스크린샷](screenshots\17.jpg))
- #18 정보 **validation-error** — "한글vpc-0928-0850-9656" → 입력 조건에 맞지 않습니다.20/20 | "10.251.0.0/20" → 사용할 수 없는 IP 대역입니다. (동작: textbox "IP 대역" = "10.251.0.0/20", [스크린샷](screenshots\18.jpg))
- #19 정보 **validation-error** — 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요.필수값입니다.0/20 | "10.251.0.0/20" → 사용할 수 없는 IP 대역입니다. (동작: textbox "VPC명" = "", [스크린샷](screenshots\19.jpg))
- #20 정보 **validation-error** — "vpc-0928-0850-9656" → 필수값입니다.18/20 | "10.251.0.0/20" → 사용할 수 없는 IP 대역입니다. (동작: textbox "VPC명" = "vpc-0928-0850-9656", [스크린샷](screenshots\20.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "VPC명" | "vp" | 2자 (최소 3) (거부 기대) | 0.97 | 예 |  |
| 2 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/15" | 범위 밖 (/15) (거부 기대) | 0.93 | 예 |  |
| 3 | CLICK textbox "Open 설명" |  |  | 0.38 | 예 |  |
| 4 | CLICK button "태그 추가" |  |  | 0.44 | 예 |  |
| 5 | CLICK button "서비스 정보" |  |  | 0.43 | 아니오 |  |
| 6 | TYPE_TEXT textbox "설명" | "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | 51자 (최대 50) (거부 기대) | 0.97 | 예 |  |
| 7 | CLICK button "Public Zone" | → Public Zone |  | 0.44 | 예 |  |
| 8 | CLICK button "취소" |  |  | 0.51 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 9 | CLICK button "취소" |  |  | 0.62 | 예 |  |
| 10 | CLICK textbox "Open VPC명" |  |  | 0.50 | 예 |  |
| 11 | TYPE_TEXT textbox "VPC명" | "vpc-0928-0850-9656-xx" | 21자 (최대 20) (거부 기대) | 0.48 | 예 |  |
| 12 | CLICK textbox "Open IP 대역" |  |  | 1.00 | 예 |  |
| 13 | TYPE_TEXT textbox "설명" | "탐색 0928-0850-9656" | 짧은 설명 | 0.86 | 예 |  |
| 14 | TYPE_TEXT textbox "VPC명" | "vpc-0928-0850-965_@#" | 허용되지 않는 특수문자 (거부 기대) | 0.51 | 예 |  |
| 15 | TYPE_TEXT textbox "VPC명" | "한글vpc-0928-0850-9656" | 한글 (거부 기대) | 0.41 | 예 |  |
| 16 | TYPE_TEXT textbox "설명" | "<b>bold</b> & \"quote\"" | HTML·따옴표 | 0.34 | 예 |  |
| 17 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/29" | 범위 밖 (/29) (거부 기대) | 0.66 | 예 |  |
| 18 | TYPE_TEXT textbox "IP 대역" | "10.251.0.0/20" | 관리용 대역 (콘솔이 막음) (거부 기대) | 0.51 | 예 |  |
| 19 | TYPE_TEXT textbox "VPC명" | "" | 빈 값 (거부 기대) | 0.60 | 예 |  |
| 20 | TYPE_TEXT textbox "VPC명" | "vpc-0928-0850-9656" | 유효 이름 (3~20자) | 0.99 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
