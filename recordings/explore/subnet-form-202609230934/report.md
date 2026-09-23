# 탐색 보고서: subnet-form

- 라우트: `#/vpc/subnet/list` · run_id 0923-1834-4b3d · 2026-09-23T09:34 ~ 09:35
- 종료 사유: 시도할 컨트롤이 더 없음
- 결정 15회, 동작 14회, 비용 $0.0016, 이상 0건, 정보 3건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): sub-0923-1834-4b3d

## 이상·정보 판정
- #1 정보 **validation-text** — 검색어를 입력하세요. 신규 생성 vpc-0923-1833-1bb2 AZ: kr-west1-b vpc-0923-1834-4b3d AZ: kr-west1-b (동작: button "선택하세요.", [스크린샷](screenshots\01.jpg))
- #7 정보 **validation-text** — 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. (동작: textbox "Open Subnet명", [스크린샷](screenshots\07.jpg))
- #9 정보 **validation-text** — 총 1 20개씩 보기 삭제 정확한 검색어를 입력하세요. 상세 검색 Subnet ID 생성 일시 상태 sub-0923-1833-1bb2 c3c4a6cf51c14a49a0ffbd7218a642ca 10.250.0.0/24 10.250.0.1 2026-09-23  (동작: button "확인", [스크린샷](screenshots\09.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CLICK button "선택하세요." | → vpc-0923-1833-1bb2 AZ: kr-west1-b |  | 0.83 | 예 |  |
| 2 | CLICK button "vpc-0923-1833-1bb2" |  |  | 0.39 | 예 |  |
| 3 | TYPE_TEXT textbox "Subnet명" | "sub-0923-1834-4b3d" | 유효 이름 (3~20자) | 1.00 | 예 |  |
| 4 | CLICK button "선택하세요." | → Public |  | 0.86 | 예 |  |
| 5 | CLICK button "선택하세요." | → Primary |  | 0.36 | 예 |  |
| 6 | CLICK button "서비스 정보" |  |  | 0.28 | 아니오 |  |
| 7 | CLICK textbox "Open Subnet명" |  |  | 0.33 | 예 |  |
| 8 | CLICK button "취소" |  |  | 0.48 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 9 | CLICK button "확인" |  |  | 0.53 | 예 |  |
| 10 | TYPE_TEXT textbox "Subnet명" | "su" | 2자 (최소 3) (거부 기대) | 1.00 | 예 |  |
| 12 | TYPE_TEXT textbox "Subnet명" | "sub-0923-1834-4b3d-xx" | 21자 (최대 20) (거부 기대) | 1.00 | 예 |  |
| 13 | TYPE_TEXT textbox "Subnet명" | "sub-0923-1834-4b3_@#" | 허용되지 않는 특수문자 (거부 기대) | 1.00 | 예 |  |
| 14 | TYPE_TEXT textbox "Subnet명" | "한글sub-0923-1834-4b3d" | 한글 (거부 기대) | 1.00 | 예 |  |
| 15 | TYPE_TEXT textbox "Subnet명" | "" | 빈 값 (거부 기대) | 1.00 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
