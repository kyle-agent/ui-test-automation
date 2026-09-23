# 탐색 보고서: vm-list

- 라우트: `#/virtualserver/virtualserver/list` · run_id 0923-1857-d5e3 · 2026-09-23T09:57 ~ 09:58
- 종료 사유: 결정 예산 소진
- 결정 15회, 동작 15회, 비용 $0.0021, 이상 0건, 정보 3건

## 이상·정보 판정
- #1 정보 **validation-text** — S: 최소 5,000 IOPS, 최대 20,000 IOPS 사이의 값을 입력하세요. Throughput: 최소 250MB/s, 최대 1,000MB/s 값을 입력하세요. 기본 OS 정보 선택하세요. Units GB Delete on termination 추가 사용 Server Group  (동작: button "서비스 생성", [스크린샷](screenshots\01.jpg))
- #2 정보 **validation-text** — 1~100 사이의 값을 입력하세요. (동작: textbox "Open 서버 수", [스크린샷](screenshots\02.jpg))
- #11 정보 **validation-text** — 현재 0 10개씩 보기 상세 보기 정확한 Image명을 입력하세요. 상세 검색 Image명 OS 타입 Visibility Availability Zone 생성 일시 상태 데이터가 없습니다. Image별로 지원하는 Availability Zone이 다르므로 네트워크 설정  (동작: button "Custom", [스크린샷](screenshots\11.jpg))

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CLICK button "서비스 생성" |  |  | 0.94 | 예 |  |
| 2 | CLICK textbox "Open 서버 수" |  |  | 0.23 | 아니오 |  |
| 3 | CLICK button "Alma Linux" |  |  | 0.15 | 아니오 |  |
| 4 | CLICK button "Oracle Linux" |  |  | 0.17 | 예 |  |
| 5 | CLICK button "RHEL" |  |  | 0.16 | 예 |  |
| 6 | CLICK button "스토리지" |  |  | 0.15 | 아니오 |  |
| 7 | CLICK button "취소" |  |  | 0.15 | 예 | 알림 현재 화면을 나가시겠습니까? 변경사항이 저장되지 않습니다. 취소 확인 |
| 8 | CLICK button "취소" |  |  | 0.75 | 예 |  |
| 9 | CLICK button "Image 및 서버" |  |  | 0.19 | 아니오 |  |
| 10 | CLICK button "표준" |  |  | 0.17 | 예 |  |
| 11 | CLICK button "Custom" |  |  | 0.27 | 예 |  |
| 12 | CLICK textbox "Open 정확한 Image명을 입력하세요." |  |  | 0.55 | 아니오 |  |
| 13 | CLICK button "Kubernetes" |  |  | 0.71 | 예 |  |
| 14 | CLICK button "선택하세요." | → Standard-1 AZ: kr-west1-b |  | 0.63 | 예 |  |
| 15 | CLICK button "선택하세요." |  |  | 0.19 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- button "Marketplace"
- button "rhel-9.6-kube-v1.36.3-ske.p3.n1"
- textbox "서버 수"
- button "button"
- button "button"
- button "img"
- button "Ubuntu"
- button "img"
- button "Standard-1"
- button "AZ: kr-west1-b"
- button "Standard-2"
- button "AZ: kr-west1-b"
- button "High Capacity-2"
- button "AZ: kr-west1-b"
- button "High Capacity-3"
- button "AZ: kr-west1-b"
