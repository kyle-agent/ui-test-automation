# 탐색 보고서: rg-form

- 라우트: `#/resourcegroups/resource-group/list` · run_id 0923-1855-e062 · 2026-09-23T09:55 ~ 09:56
- 종료 사유: 5회 연속 화면 변화 없음
- 결정 15회, 동작 15회, 비용 $0.0021, 이상 0건, 정보 2건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): xp-0923-1855-e062

## 이상·정보 판정
- #8 정보 **validation-text** — 선택하세요. 검색어를 입력하세요. quota:account-quota security-group:address-group aiml-brightix:aimlops-platform billingsystem:anomaly-data apigat (동작: button "전체", [스크린샷](screenshots\08.jpg))
- #10 정보 **validation-text** — 전체 검색어를 입력하세요. 전체 quota:account-quota security-group:address-group aiml-brightix:aimlops-platform billingsystem:anomaly-data api (동작: button "선택하세요.", [스크린샷](screenshots\10.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "Resource Group명" | "xp-0923-1855-e062" | 유효 이름 (3~64자) | 0.95 | 예 |  |
| 2 | CLICK textbox "Open 설명" |  |  | 0.41 | 예 |  |
| 3 | TYPE_TEXT textbox "설명" | "탐색 0923-1855-e062" | 짧은 설명 | 0.83 | 예 |  |
| 4 | CLICK textbox "Open 한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." |  |  | 0.31 | 예 |  |
| 5 | CLICK button "태그 추가" |  |  | 0.59 | 예 |  |
| 6 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "xp-0923-1855-e062" | 유효 이름 (3~20자) | 0.95 | 예 |  |
| 7 | TYPE_TEXT textbox "한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요." | "xp" | 2자 (최소 3) (거부 기대) | 1.00 | 예 |  |
| 8 | CLICK button "전체" | → 전체 |  | 0.63 | 예 |  |
| 9 | CLICK button "사용자 가이드 > Resource Group 생성하기" |  |  | 0.33 | 예 |  |
| 10 | CLICK button "선택하세요." | → 전체 |  | 0.99 | 예 |  |
| 11 | CLICK button "virtualserver:auto-scaling-group" | → 전체 |  | 0.32 | 아니오 |  |
| 12 | CLICK button "cloudwan:attachment" | → 전체 |  | 0.18 | 아니오 |  |
| 13 | CLICK button "apigateway:api" | → 전체 |  | 0.21 | 아니오 |  |
| 14 | CLICK button "cloud-fabric-connect:cfc-attachment" | → 전체 |  | 0.25 | 아니오 |  |
| 15 | CLICK button "billingsystem:anomaly-data" | → 전체 |  | 0.31 | 아니오 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "security-group:address-group"
- button "aiml-brightix:aimlops-platform"
