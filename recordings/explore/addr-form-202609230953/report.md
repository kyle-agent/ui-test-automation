# 탐색 보고서: addr-form

- 라우트: `#/securitygroup/addressgroup/list` · run_id 0923-1853-e1aa · 2026-09-23T09:53 ~ 09:54
- 종료 사유: Jev 가 DONE
- 결정 16회, 동작 15회, 비용 $0.0017, 이상 0건, 정보 4건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): sg-0923-1853-e1aa

## 이상·정보 판정
- #6 정보 **validation-text** — ue 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/128 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/256 49개 태그를 더 추가할 수 있습니다. (최대 50개) (동작: button "태그 추가", [스크린샷](screenshots\06.jpg))
- #10 정보 **validation-text** —  시작하며 영문, 숫자와 특수문자(-또는_)를 사용하여 100자 이내로 입력하세요. (동작: textbox "Open Address Group명", [스크린샷](screenshots\10.jpg))
- #12 정보 **validation-text** — 255자 이내로 입력하세요. (동작: textbox "Open 설명", [스크린샷](screenshots\12.jpg))
- #13 정보 **validation-text** —  시작하며 영문, 숫자와 특수문자(-또는_)를 사용하여 100자 이내로 입력하세요. (동작: textbox "Address Group명" = "sg-0923-1853-e1aa-xxx", [스크린샷](screenshots\13.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "Address Group명" | "sg-0923-1853-e1aa" | 유효 이름 (3~20자) | 0.96 | 예 |  |
| 2 | TYPE_TEXT textbox "대상 주소" | "10.250.0.0/20" | 유효 CIDR (/20) | 0.95 | 예 |  |
| 3 | CLICK button "생성" |  |  | 0.51 | 예 | 알림 Address Group을 생성하시겠습니까? 취소 확인 |
| 4 | CLICK button "확인" |  |  | 0.55 | 예 |  |
| 5 | TYPE_TEXT textbox "설명" | "탐색 0923-1853-e1aa" | 짧은 설명 | 0.86 | 예 |  |
| 6 | CLICK button "태그 추가" |  |  | 0.85 | 예 |  |
| 7 | TYPE_TEXT textbox "대상 주소" | "10.250.0.0/15" | 범위 밖 (/15) (거부 기대) | 0.64 | 예 |  |
| 8 | TYPE_TEXT textbox "Address Group명" | "sg" | 2자 (최소 3) (거부 기대) | 0.98 | 예 |  |
| 9 | CLICK link "sg-0923-1853-e1aa" |  |  | 0.54 | 예 |  |
| 10 | CLICK textbox "Open Address Group명" |  |  | 0.64 | 예 |  |
| 11 | CLICK textbox "Open 대상 주소" |  |  | 0.51 | 예 |  |
| 12 | CLICK textbox "Open 설명" |  |  | 1.00 | 예 |  |
| 13 | TYPE_TEXT textbox "Address Group명" | "sg-0923-1853-e1aa-xxx" | 21자 (최대 20) (거부 기대) | 0.58 | 예 |  |
| 14 | TYPE_TEXT textbox "설명" | "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | 51자 (최대 50) (거부 기대) | 0.46 | 예 |  |
| 15 | TYPE_TEXT textbox "대상 주소" | "10.250.0.0/29" | 범위 밖 (/29) (거부 기대) | 0.53 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
