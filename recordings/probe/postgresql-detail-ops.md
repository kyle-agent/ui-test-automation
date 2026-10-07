# PostgreSQL(DBaaS) 상세 동작 프로브 (2026-10-07, 에이전트 6A)

spec 실행 중 프로브(DBAAS_SOFT=1)로 확인. 자원은 run_id 이름(pgc…/vpc-1007-…)이고 실행 끝에 해지됨.

## 상세 (#/postgresql/postgresql/detail/info?clusterId=…)
- 상단 버튼: 시작 · 중지 · 재시작 · 서비스 상태 동기화 · 백업 이력 · Database 복구 · [더보기] · 서비스 해지 · Disk 추가 (백업을 켜면 "즉시 백업" 추가).
  작업 중에는 모두 비활성(dis) — 행이 Running 이어도 잠시 비활성일 때가 있다.
- 연필 라벨: Image 버전 · 유지 관리 기간 · 백업 · Audit Log 설정 · ServiceWatch 로그 수집 · IP 접근 제어.
- 생성 폼에서 백업을 끄지 않았는데도(replica 옵션) 상세에는 "백업 = 미사용" 이었다 → 상세 연필로 켠다.

## 동작별 모달
- 서비스 상태 동기화: "현재 서버 상태를 조회하여 Console에 동기화합니다 … Synchronizing" → 확인 → Running.
- 재시작: "Database를 재시작하시겠습니까? DB 서비스만 재시작" → 확인 → Running.
- 백업 연필: "백업 수정" — 사용 체크 → 보관 기간(7일)·백업 시작 시간·Archive 백업주기(1시간) 드롭다운 → 확인 → "백업을 수정하시겠습니까?" → 상세 "보관 기간 7일 …".
- 유지 관리 기간 연필: 사용 체크 → 시작 요일(월)·시·분·기간(0.5) 드롭다운 → 확인 → "수정한 정보를 저장하시겠습니까?" → 끄기도 같은 모달.
- Audit Log 설정 연필: 사용 체크 → "Audit Log 설정을 수정하시겠습니까? … 성능 저하". 끌 때 "Audit Log가 저장된 파일은 삭제되지 않습니다".
- IP 접근 제어 연필: CIDR 입력칸 + "추가" → 목록(총 n/100, 전체 삭제) → 확인 → 상세 값 "10.250.250.0/24". 삭제는 같은 모달에서 항목 삭제(또는 전체 삭제).
- 더보기 메뉴: Parameter 관리 · Replica 구성 · Replica 구성(Other Region) · DB 사용자 관리 · DB 접근 제어 설정 · Archive 설정 관리 · DB Log 내보내기 · Migration 구성 · OS(Kernel) 업그레이드 · Block Storage 사용량 관리.
  메뉴 화면은 별도 주소(…/detail/parameter, …/database-users, …/access-control, …/archive-config, …/disk-usage)이고 모두 하단 "조회"(DB 서버와 동기화, 확인 모달 "…조회하시겠습니까? 몇 분") 뒤에야 "수정"/"추가" 가 켜진다.
- Parameter 관리: 65개, 열 = Parameter명 · 적용 유형(동적/정적) · 현재 설정값 · 사용자 정의값 · 허용 기준값 · 설명. "수정" → 행 입력칸 → "저장" → "Parameter를 수정하시겠습니까? 규모에 따라 수십 분" → 확인.
  cpu_tuple_cost(동적) 0.01 → 0.02 반영 확인(다시 조회 시 현재 설정값 0.02).
- Archive 설정 관리: "Archive Mode 사용(Archive Log 보관기간 3일)", 버튼 Archive 전체삭제 · 백업된 Archive 삭제 · 조회 · 수정. "수정" 은 별도 화면 …/archive-config/edit ("Archive Log 보관기간", 취소·저장).
- OS(Kernel) 업그레이드: "정상적으로 업그레이드된 이후 기존 OS 버전으로 원상 복구될 수 없습니다" → 되돌릴 수 없음(하지 않음).
- Block Storage 사용량 관리: 조회만. "Disk 추가"(상세 버튼)는 디스크 추가 — 상세에 추가 디스크 삭제 버튼이 보이지 않아(되돌림 미확인) 하지 않음. DATA 용량 변경(setblockstoragesize)은 확장만 가능한 성격이라 하지 않음.
