# 2026-09-30 프로브 (에이전트 B 2차) — VIP · TGW 규칙 · Peering 규칙 · LB/VIP Public NAT · PrivateLink · Private NAT

임시 스크립트로 실제 자원을 만들어 확인했다(run_id 0930-1500-b0b0, 모두 지움). 자세한 문구는 각 시나리오 yaml 머리 주석.

## Subnet Virtual IP (`#/vpc/subnet/detail/vip`, 상세 `#/vpc/subnet/vip/detail`)
- Subnet 상세 탭: 상세 정보 / Virtual IP 관리 (n) / 태그 / 작업 이력. 탭 버튼: 반납(dis) · 상세 검색 · Virtual IP 예약. 표: Virtual IP | Public NAT IP | 연결 Port 수 | 예약 일시.
- "Virtual IP 예약" 모달: Virtual IP 드롭다운("자동 생성"), 설명(50) → 확인 → "Virtual IP를 예약하시겠습니까?" → 즉시 행.
- VIP 상세: Virtual IP · Public NAT IP(연필) · 연결 Port(연결 해제/추가, 표 Port명 | IP | Virtual Server 자원 ID) · 설명(연필).
- "추가" → "연결 Port 추가" 모달(같은 Subnet Port 표, 행 선택) → 확인 → "연결 Port를 추가하시겠습니까?".
- Public NAT IP 연필: VPC 에 IGW 가 없으면 반응 없음. IGW 있으면 "Public NAT IP 수정" 모달(사용 체크 → IP 드롭다운: IGW 구분 Reserved IP)
  → "Public NAT IP를 수정하시겠습니까?" → Creating → Active(≈10초). 해제 "Public NAT IP를 사용 해제하시겠습니까?".
- Port 해제 "연결 Port를 해제하시겠습니까?", 반납 "Virtual IP를 반납하시겠습니까?".

## Transit Gateway 규칙 (`#/vpc/transit-gateway/detail/route`)
- 표: 규칙 유형 | 연결 VPC명 | 출발지 | 목적지 | 목적지 IP 대역 | 생성 일시 | 상태. "규칙 추가" 모달: 규칙 유형(VPC-TGW / TGW-Uplink), 연결 VPC명, 출발지(자동),
  목적지(VPC / TGW), 목적지 IP 대역. 목적지 VPC 는 Subnet 대역과 같아야 함 → 목적지 TGW + 192.168.30.0/24 로 확인(≈20초 Active).

## VPC Peering 규칙 (`#/vpc/vpc-peering/detail/route`)
- 표: 출발지 | 목적지 | 목적지 IP 대역 | 생성 일시 | 상태. 모달: 출발지(요청 VPC / 승인 VPC), 목적지(자동), 목적지 IP 대역.
  Subnet 없는 승인 VPC 대역 10.250.16.0/24 도 받아들였다(≈20초 Active).

## Load Balancer Public NAT IP
- LB 상세 "Public NAT IP" 연필 → "Public NAT IP 설정 — 사용" → IP 드롭다운 → "Public NAT IP를 설정하시겠습니까?" → Creating → Active. 해제 "…정말 해제 하시겠습니까?".

## PrivateLink Service / Endpoint, Private NAT
- `vpc-privatelink-service-list.md`, `vpc-privatelink-endpoint-list.md`, `vpc-private-nat-list.md` (probe-form 출력) 참고.
- 같은 계정·같은 Subnet 에서 Service(IP 연결, 수동 승인) → Endpoint(기타 PrivateLink 서비스 + Service ID) → Service "연결 관리" 행 "승인" → 둘 다 Active 확인.
- Private NAT: 연결 자원 유형 Direct Connect / Transit Gateway (Uplink). 이 계정 DC 로 192.168.100.0/24 생성 → Active ≈20초 → 삭제.
