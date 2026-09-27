# 탐색 보고서: vpc-form

- 라우트: `#/vpc/vpc/list` · run_id 0928-0844-52a4 · 2026-09-27T23:44 ~ 23:44
- 종료 사유: Jev 가 DONE
- 결정 7회, 동작 6회, 비용 $0.0008, 이상 0건, 정보 0건
- 사용한 리소스 이름(생성됐을 수 있음, `npm run stacks:cleanup` 으로 정리): vpc-0928-0844-52a4

## 이상·정보 판정
- 없음

## 단계
| # | 동작 | 입력 | 이유 | p | 변화 | 모달 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TYPE_TEXT textbox "VPC명" | "vpc-0928-0844-52a4" | 유효 이름 (3~20자) | 0.97 | 예 |  |
| 2 | CLICK textbox "Open IP 대역" |  |  | 0.56 | 예 |  |
| 3 | TYPE_TEXT textbox "IP 대역" | "10.250.0.0/20" | 유효 CIDR (/20) | 0.96 | 예 |  |
| 4 | CLICK textbox "Open 설명" |  |  | 0.27 | 예 |  |
| 5 | CLICK button "생성" |  |  | 0.52 | 예 | 알림 VPC를 생성하시겠습니까? 취소 확인 |
| 6 | CLICK button "확인" |  |  | 0.62 | 예 |  |

## 시도하지 않은 컨트롤
- button "button"
- button "button"
- button "button"
- button "button"
- link "vpc-0928-0844-52a4"
- textbox "Open VPC명"
- button "Public Zone"
- textbox "설명"
- button "서비스 정보"
- button "서비스 정보"
- button "button"
- button "취소"
