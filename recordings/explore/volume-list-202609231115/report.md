# 탐색 보고서: volume-list

- 라우트: `#/virtualserver/block-storage/list` · run_id 0923-2015-ea95 · 2026-09-23T11:15 ~ 11:16
- 종료 사유: Jev 가 DONE
- 결정 7회, 동작 6회, 비용 $0.0008, 이상 0건, 정보 2건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): vol-0923-2015-ea95

## 이상·정보 판정
- #3 정보 **validation-text** —  입력 영문, 숫자, 공백과 특수문자(-_)를 사용하여 255자 이내로 입력하세요. 0/255 - SSD_Provisioned: IOPS, Throughput 설정이 가능한 SSD 볼륨 - SSD/HDD: 일반 SSD/HDD 볼륨 - SSD/HDD_KMS: 전송 암호화 볼륨(일반 볼륨  (동작: button "Block Storage 생성", [스크린샷](screenshots\03.jpg))
- #6 정보 **validation-text** — 총 0 20개씩 보기 삭제 볼륨명을 입력하세요. 상세 검색 볼륨 ID 종류 생성 일시 상태 서비스를 생성하세요. 다양한 서비스가 당신의 업무를 도와드려요. ※ Available 상태의 볼륨 선택 시 볼륨 이전 버튼이 활성화 되며 동일한 리전 내에서 볼 (동작: button "취소", [스크린샷](screenshots\06.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CLICK textbox "Open 볼륨명을 입력하세요." |  |  | 0.67 | 아니오 |  |
| 2 | TYPE_TEXT textbox "볼륨명을 입력하세요." | "vol-0923-2015-ea95" | 유효 이름 (3~20자) | 1.00 | 예 |  |
| 3 | CLICK button "Block Storage 생성" |  |  | 0.51 | 예 |  |
| 4 | CLICK button "kr-west1-b" | → kr-west1-b |  | 0.30 | 아니오 |  |
| 5 | CLICK button "서비스 정보" |  |  | 0.39 | 아니오 |  |
| 6 | CLICK button "취소" |  |  | 0.34 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "button"
