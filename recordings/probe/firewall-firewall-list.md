# #/firewall/firewall/list (2026-09-29, 수동 프로브 — 에이전트 B)
title: Firewall 목록 | Firewall | kr-west1 | Console
list buttons: ["사용(dis)","","상세 검색"]  (생성 버튼 없음 — IGW·LB·Direct Connect 를 만들면 따라 생긴다)
headers:  | Firewall명 | Firewall 구분 | 크기 | VPC명 | 연결명 | 규칙 수 | 사용 여부 | 상태 |
rows 예: FW_IGW_vpc-0929-1700-b001 Internet Gateway EXSMALL vpc-0929-1700-b001 IGW_vpc-0929-1700-b001 0 사용 Active

## 상세 #/firewall/firewall/detail/info?firewallId=…
탭: 상세 정보 / 규칙 (n) / 태그 / 작업 이력. 상세: Firewall 구분, 크기 Extra Small, 규칙 수/할당량 0개/최대 5개, 로그 저장 여부.
규칙 탭 (#/firewall/firewall/detail/rule): "규칙 동기화 상태 In Sync|Syncing", 버튼 ["이전 동기화 내역(dis)","엑셀 다운로드","상세 검색","규칙 수정","규칙 추가"]
행: 순서 · 규칙 ID · 출발지 주소 · 목적지 주소 · 서비스 · 동작 · 방향 · 활성 여부

## "규칙 추가" → #/firewall/firewall/detail/rule/request
- 직접 입력 / 규칙 일괄 입력, 규칙 위치(마지막 규칙 뒤), 복사할 규칙 ID + 조회
- 출발지 주소 | textarea (라벨 연결 없음, 0번째)   - 목적지 주소* | IP/Domain 토글 + textarea (1번째)
- 유형 | 목적지 포트/Type 선택 / Internet Protocol / ALL — 프로토콜 TCP/UDP/ICMP 체크 → 목적지 포트 input(읽기 전용, 기본 22 "SSH") + "추가"
- 동작 Allow/Deny, 방향 Inbound/Outbound, 설명 textarea(2번째) → 아래 "추가" → '추가된 규칙' 표 → "완료" → 모달 "규칙을 추가하시겠습니까?"
## "규칙 수정" → #/firewall/firewall/detail/rule/edit
버튼 ["활성화","비활성화","삭제","삭제 취소","상세 검색","수정","취소","완료"]. 행 선택 → 삭제 → 변경 사항 "삭제 예정" → 완료 → "규칙을 수정하시겠습니까?"
