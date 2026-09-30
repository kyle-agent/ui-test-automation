# PostgreSQL(DBaaS) 읽기 복제본 프로브 (2026-09-30, 에이전트 C)

프로브 자원: pgcprobec(Master, db1v2m4, DATA 128GB) on vpc/sub-c0930-prb, Replica repcprb.

- Master 상세 상단: 시작 · 중지 · 재시작 · 서비스 상태 동기화 · 백업 이력 · Database 복구 · [더보기 아이콘] · 서비스 해지.
  더보기(`[id^="menu-"] button`) 항목: Parameter 관리 · **Replica 구성** · Replica 구성(Other Region) · DB 사용자 관리 · DB 접근 제어 설정 · Archive 설정 관리 ·
  DB Log 내보내기 · Migration 구성 · OS(Kernel) 업그레이드 · Block Storage 사용량 관리.
- "Replica 구성" → 모달 "지금 Replica를 추가하시겠습니까? • Replica 추가 중에는 Master Database 변경 작업이 불가 • 1대 최소 20분 …" → 확인
  → 폼 `#/postgresql/postgresql/replica?dbType=postgresql&clusterId=…`: Replica 수(1) · **Replica 명**(소문자 시작, 소문자·숫자·- 3~19자, 서버명 prefix·클러스터명이 됨) ·
  서버 타입(Master 값) · 기본 OS SSD · DATA SSD 128GB(Master 값) · 네트워크 공통 설정(VPC/Subnet Master 값, 인스턴스 유형 Replica, IP 자동) · IP 접근 제어 · 유지 관리 기간 · 태그 · 요금 확인(월 ≈₩165,754) → "완료"
  → "Replica를 구성하시겠습니까? 생성 완료까지 구성을 취소할 수 없습니다 … 추가 과금" → 확인.
- 요청 본문(콘솔): `{nat_enabled:false, replica_count:1, replicas:[{name, instance_groups:[{role_type:"REPLICA", server_type_name, instances:[{role_type:"REPLICA"}], block_storage_groups:[{role_type:"DATA", volume_type:"SSD", size_gb:128}]}]}], allowable_ip_addresses:[], tags:[]}`.
- **백업이 꺼진 Master 에서는 POST …/clusters/{id}/replicas 가 500 `ContactAdminForAssistance`**(2회). 화면엔 안내 없이 폼에 머문다.
  상세 "백업" 연필 → "백업 수정" 모달(사용 · 보관 기간 7일 · 시작 시간 · Archive 백업주기 1시간) → "백업을 수정하시겠습니까?" → POST …/backups 202 → Editing ≈1분 → Running.
  그 뒤 같은 요청 202. Master 는 Editing, Replica 는 목록에 별도 행(Creating → Running ≈10분, 클러스터 유형 Replica Cluster, "Master 클러스터 pgcprobec").
  Master 상세에 "Replica정보 (1)" 탭. Replica 상세 버튼: 시작 · 중지 · 재시작 · 서비스 상태 동기화 · Replica 재구성 · Parameter 관리 · 서비스 해지.
- Replica 해지: 상세 "서비스 해지" → "Database명 : qadb PostgreSQL(DBaaS)을 해지하시겠습니까? … 확인을 위해 Database명을 입력해주세요." → Terminating → 소멸 ≈4분.
- **그 직후 Master 해지가 Terminating → Failed**(작업 이력 "Postgresql Delete Error", 서버 Terminated). 재해지 2회도 Failed. Failed 상태에선 백업 수정 모달이 열리지 않는다.
  (API 자동화도 FAILED 웨지를 기록했고 재삭제로 풀렸다고 적었지만 여기선 풀리지 않음.)
- spec 실행(백업을 생성 폼에서 켠 채 생성, 2026-09-30 17:53 PASS)에선 Replica 해지 → Master 해지가 정상 소멸. dbaas.ts terminateCluster 는 Failed 면 5분 뒤 재해지(최대 6회). 프로브 Master 는 ≈40분 뒤 네 번째 재해지에 소멸.
- MySQL 도 같은 메뉴·폼·모달(Replica 생성 202, Running ≈10분).
