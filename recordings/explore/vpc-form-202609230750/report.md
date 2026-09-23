# 탐색 보고서: vpc-form

- 라우트: `#/vpc/vpc/list` · run_id 0923-1650-ebcf · 2026-09-23T07:50 ~ 07:51
- 종료 사유: 시도할 컨트롤이 더 없음
- 결정 11회, 동작 11회, 비용 $0.0014, 이상 0건, 정보 2건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): vpc-0923-1650-ebcf

## 이상·정보 판정
- #6 정보 **validation-text** —  서비스 정보 입력 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20 Public Zone Public Zone의 Availability Zone(가용 영역)은 1-zone(kr-west1-b)으로 확장되어 생성됩니다. 일부 IP 대역은 관리용으로 사용할 수 없습 (동작: button "서비스 생성", [스크린샷](screenshots\06.jpg))
- #10 정보 **validation-text** — 사용할 수 없는 IP 대역입니다. 17/50 (동작: textbox "설명" = "탐색 0923-1650-ebcf", [스크린샷](screenshots\10.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "VPC명" | "vpc-0923-1650-ebcf" | 유효 이름 (3~20자) | 0.96 | 예 |  |
| 2 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/20" | 유효 CIDR (/20) | 0.90 | 예 |  |
| 3 | CLICK textbox "Open 설명" |  |  | 0.39 | 예 |  |
| 4 | CLICK button "생성" |  |  | 0.58 | 예 | 알림 VPC를 생성하시겠습니까? 취소 확인 |
| 5 | CLICK button "확인" |  |  | 0.60 | 예 |  |
| 6 | CLICK button "서비스 생성" |  |  | 0.86 | 예 |  |
| 7 | CLICK link "vpc-0923-1650-ebcf" |  |  | 0.26 | 아니오 |  |
| 8 | TYPE_TEXT textbox "VPC명" | "vp" | 2자 (최소 3) (거부 기대) | 0.61 | 예 |  |
| 9 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/15" | 범위 밖 (/15) (거부 기대) | 0.78 | 예 |  |
| 10 | TYPE_TEXT textbox "설명" | "탐색 0923-1650-ebcf" | 짧은 설명 | 0.98 | 예 |  |
| 11 | CLICK button "취소" |  |  | 0.29 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |

## 시도하지 않은 컨트롤
- 없음
