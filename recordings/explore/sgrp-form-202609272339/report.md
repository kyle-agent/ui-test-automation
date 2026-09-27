# 탐색 보고서: sgrp-form

- 라우트: `#/virtualserver/server-group/list` · run_id 0928-0839-46e6 · 2026-09-27T23:39 ~ 23:40
- 종료 사유: Jev 가 DONE
- 결정 17회, 동작 16회, 비용 $0.0020, 이상 0건, 정보 1건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): xp-0928-0839-46e6

## 이상·정보 판정
- #3 정보 **validation-text** — ue 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/128 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요. 0/256 49개 태그를 더 추가할 수 있습니다. (최대 50개) (동작: button "태그 추가", [스크린샷](screenshots\03.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "Server Group명" | "xp-0928-0839-46e6" | 유효 이름 (3~20자) | 1.00 | 예 |  |
| 2 | CLICK button "Affinity(근접 배치)" | → Affinity(근접 배치) |  | 0.81 | 예 |  |
| 3 | CLICK button "태그 추가" |  |  | 0.60 | 예 |  |
| 4 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "xp-0928-0839-46e6" | 유효 이름 (3~20자) | 0.89 | 예 |  |
| 5 | CLICK button "생성" |  |  | 0.51 | 예 | 알림 Server Group을 생성하시겠습니까? 취소 확인 |
| 6 | CLICK button "취소" |  |  | 0.56 | 예 |  |
| 7 | CLICK textbox "Open 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." |  |  | 0.79 | 예 |  |
| 8 | CLICK button "Affinity(근접 배치)" | → Anti-Affinity(분산 배치) |  | 0.59 | 예 |  |
| 9 | CLICK button "Anti-Affinity(분산 배치)" | → Affinity(근접 배치) |  | 0.83 | 예 |  |
| 10 | CLICK button "Affinity(근접 배치)" | → Partition(서버와 Block Storage 분산배치) |  | 0.69 | 예 |  |
| 11 | CLICK button "Anti-Affinity(분산 배치)" |  |  | 0.57 | 예 |  |
| 12 | CLICK button "취소" |  |  | 0.56 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 13 | CLICK button "확인" |  |  | 1.00 | 예 |  |
| 14 | TYPE_TEXT textbox "Server Group명" | "xp" | 2자 (최소 3) (거부 기대) | 1.00 | 예 |  |
| 15 | CLICK textbox "Open Server Group명" |  |  | 1.00 | 아니오 |  |
| 16 | TYPE_TEXT textbox "Server Group명" | "xp-0928-0839-46e6-xxx" | 21자 (최대 20) (거부 기대) | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
