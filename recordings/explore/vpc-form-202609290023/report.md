# 탐색 보고서: vpc-form

- 라우트: `#/vpc/vpc/list` · run_id 0929-0923-3a0c · 2026-09-29T00:23 ~ 00:23
- 종료 사유: Jev 가 DONE
- 결정 15회, 동작 14회, 비용 $0.0016, 이상 0건, 정보 3건

## 이상·정보 판정
- #1 정보 **validation-error** — "vp" → 입력 조건에 맞지 않습니다.2/20 (동작: textbox "VPC명" = "vp", [스크린샷](screenshots\01.jpg))
- #2 정보 **validation-error** — "10.250.0.0/15" → 사용할 수 없는 IP 대역입니다. (동작: textbox "IP 대역" = "10.250.0.0/15", [스크린샷](screenshots\02.jpg))
- #11 정보 **validation-error** — "10.250.0.0/29" → 사용할 수 없는 IP 대역입니다. (동작: textbox "IP 대역" = "10.250.0.0/29", [스크린샷](screenshots\11.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "VPC명" | "vp" | 2자 (최소 3) (거부 기대) | 0.96 | 예 |  |
| 2 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/15" | 범위 밖 (/15) (거부 기대) | 0.93 | 예 |  |
| 3 | CLICK textbox "Open 설명" |  |  | 0.41 | 아니오 |  |
| 4 | CLICK button "태그 추가" |  |  | 0.49 | 예 |  |
| 5 | CLICK button "서비스 정보" |  |  | 0.38 | 아니오 |  |
| 6 | TYPE_TEXT textbox "설명" | "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | 51자 (최대 50) (거부 기대) | 0.97 | 예 |  |
| 7 | CLICK button "Public Zone" | → Public Zone |  | 0.45 | 예 |  |
| 8 | CLICK button "취소" |  |  | 0.51 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 9 | CLICK button "취소" |  |  | 0.70 | 예 |  |
| 10 | CLICK textbox "Open IP 대역" |  |  | 0.55 | 예 |  |
| 11 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/29" | 범위 밖 (/29) (거부 기대) | 0.52 | 예 |  |
| 12 | CLICK textbox "Open VPC명" |  |  | 1.00 | 예 |  |
| 13 | TYPE_TEXT textbox "설명" | "탐색 0929-0923-3a0c" | 짧은 설명 | 0.85 | 예 |  |
| 14 | TYPE_TEXT textbox "VPC명" | "vpc-0929-0923-3a0c-xx" | 21자 (최대 20) (거부 기대) | 0.61 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
