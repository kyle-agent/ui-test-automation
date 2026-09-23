# 탐색 보고서: sg-form

- 라우트: `#/securitygroup/securitygroup/list` · run_id 0923-1852-1b0d · 2026-09-23T09:52 ~ 09:52
- 종료 사유: 결정 예산 소진
- 결정 20회, 동작 20회, 비용 $0.0022, 이상 0건, 정보 5건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): sg-0923-1852-1b0d

## 이상·정보 판정
- #5 정보 **validation-text** — ue 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/128 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/256 49개 태그를 더 추가할 수 있습니다. (최대 50개) (동작: button "태그 추가", [스크린샷](screenshots\05.jpg))
- #11 정보 **validation-text** — 255자 이내로 입력하세요. (동작: textbox "Open Security Group명", [스크린샷](screenshots\11.jpg))
- #15 정보 **validation-text** — 51/255 255자 이내로 입력하세요. (동작: textbox "설명" = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", [스크린샷](screenshots\15.jpg))
- #17 정보 **validation-text** — 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/128 현재 입력값을 key로 사용합니다. (동작: textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." = "", [스크린샷](screenshots\17.jpg))
- #18 정보 **validation-text** — 2/255 필수값입니다. 255자 이내로 입력하세요. (동작: textbox "Security Group명" = "sg", [스크린샷](screenshots\18.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "Security Group명" | "sg-0923-1852-1b0d" | 유효 이름 (3~20자) | 0.98 | 예 |  |
| 2 | CLICK textbox "Open 설명" |  |  | 0.55 | 예 |  |
| 3 | CLICK button "생성" |  |  | 0.42 | 예 | 알림 로그 저장을 사용하기 위해서 Security Group 로그 저장소를 먼저 설정해야 합니다. 로그 저장 |
| 4 | CLICK button "확인" |  |  | 1.00 | 예 |  |
| 5 | CLICK button "태그 추가" |  |  | 0.77 | 예 |  |
| 6 | TYPE_TEXT textbox "설명" | "탐색 0923-1852-1b0d" | 짧은 설명 | 0.88 | 예 |  |
| 7 | CLICK textbox "Open 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." |  |  | 0.49 | 예 |  |
| 8 | CLICK button "사용" |  |  | 0.85 | 예 |  |
| 9 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "sg-0923-1852-1b0d" | 유효 이름 (3~20자) | 0.83 | 예 |  |
| 10 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "sg" | 2자 (최소 3) (거부 기대) | 0.99 | 예 |  |
| 11 | CLICK textbox "Open Security Group명" |  |  | 1.00 | 예 |  |
| 12 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "sg-0923-1852-1b0d-xxx" | 21자 (최대 20) (거부 기대) | 0.65 | 예 |  |
| 13 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "sg-0923-1852-1b0d_@#" | 허용되지 않는 특수문자 (거부 기대) | 0.43 | 예 |  |
| 14 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "한글sg-0923-1852-1b0d" | 한글 (거부 기대) | 0.42 | 예 |  |
| 15 | TYPE_TEXT textbox "설명" | "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | 51자 (최대 50) (거부 기대) | 0.36 | 예 |  |
| 16 | TYPE_TEXT textbox "설명" | "<b>bold</b> & \"quote\"" | HTML·따옴표 | 0.43 | 예 |  |
| 17 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "" | 빈 값 (거부 기대) | 0.46 | 예 |  |
| 18 | TYPE_TEXT textbox "Security Group명" | "sg" | 2자 (최소 3) (거부 기대) | 1.00 | 예 |  |
| 19 | TYPE_TEXT textbox "Security Group명" | "sg-0923-1852-1b0d-xxx" | 21자 (최대 20) (거부 기대) | 1.00 | 예 |  |
| 20 | TYPE_TEXT textbox "Security Group명" | "sg-0923-1852-1b0d_@#" | 허용되지 않는 특수문자 (거부 기대) | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
