# 탐색 보고서: iam-group-form

- 라우트: `#/iam/group/list` · run_id 0923-2005-be3f · 2026-09-23T11:05 ~ 11:08
- 종료 사유: Jev 가 DONE
- 결정 14회, 동작 13회, 비용 $0.0015, 이상 0건, 정보 2건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): xp-0923-2005-be3f

## 이상·정보 판정
- #8 정보 **validation-text** — 한글, 영문, 숫자와 특수문자(+=,.@-_)를 사용하여 3~24자로 입력하세요. (동작: textbox "Open 사용자 그룹명", [스크린샷](screenshots\08.jpg))
- #11 정보 **validation-text** — 1,000자 이내로 입력하세요. (동작: textbox "Open 설명", [스크린샷](screenshots\11.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "사용자 그룹명" | "xp-0923-2005-be3f" | 유효 이름 (3~24자) | 0.95 | 예 |  |
| 2 | TYPE_TEXT textbox "설명" | "탐색 0923-2005-be3f" | 짧은 설명 | 0.71 | 예 |  |
| 3 | TYPE_TEXT textbox "정확한 사용자 ID를 입력하세요." | "xp-0923-2005-be3f" | 유효 이름 (3~20자) | 1.00 | 예 |  |
| 4 | CLICK button "사용자 ID" |  |  | 0.66 | 예 |  |
| 5 | CLICK textbox "Open 정확한 사용자 ID를 입력하세요." | → 사용자 ID userName |  | 0.76 | 예 |  |
| 6 | CLICK button "userName" |  |  | 0.90 | 예 |  |
| 7 | CLICK button "Global" | → 한국 동부1 kr-east1 |  | 0.47 | 예 |  |
| 8 | CLICK textbox "Open 사용자 그룹명" |  |  | 0.58 | 예 |  |
| 9 | TYPE_TEXT textbox "정확한 사용자 ID를 입력하세요." | "xp" | 2자 (최소 3) (거부 기대) | 0.89 | 예 |  |
| 10 | CLICK button "xp" |  |  | 0.88 | 예 |  |
| 11 | CLICK textbox "Open 설명" |  |  | 1.00 | 예 |  |
| 12 | TYPE_TEXT textbox "정확한 사용자 ID를 입력하세요." | "xp-0923-2005-be3f-xxx" | 21자 (최대 20) (거부 기대) | 0.68 | 예 |  |
| 13 | CLICK button "xp-0923-2005-be3f-xxx" |  |  | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
