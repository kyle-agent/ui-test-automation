# #/epas/epas/list
title: EPAS(DBaaS) 목록 | EPAS(DBaaS) | kr-west1 | Console
list buttons: ["상세 검색","서비스 생성","서비스 생성"]
headers: 클러스터명 | Database명 | 고가용성 | 설정 | 서버 | 수 | 클러스터 | 상태
rows: 0

## "서비스 생성" → /epas/epas/request — EPAS(DBaaS) 생성 | EPAS(DBaaS) | kr-west1 | Console
-  | div.dropdown "EPAS 17.9" | EPAS Image 버전 EPAS 17.9 Database EPAS EPAS는 DB 관리, SQL, DB 및 응용프로그램 보안, 성능 모니터링과 분석 그리고 응용프로그램 개발유틸리티를 지원합니다. BYOL은 사용자의
- 서버명 prefix 서버명 Prefix 기반으로 postfix(ex. 001, 002)가 붙어 실제 서버명이 | input[text] | 영문 소문자로 시작하며 소문자, 숫자와 특수문자(-)를 사용하여 3~13자로 입력하세요. 0/13
- 클러스터명 서버들을 논리적으로 관리하는 클러스터 이름입니다. | input[text] | 영문을 사용하여 3~20자로 입력하세요. 0/20
- 서비스 유형 | div.dropdown "Standard(db1)", div.dropdown "db1v2m4 (vCPU 2 | Memory 4G)", div.dropdown "SSD", div.dropdown "SSD", input[text], div.checkbox "사용" | 서버 타입 정보 Standard(db1) db1v2m4 (vCPU 2 | Memory 4G) Planned Compute 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성 Block
- 서버 타입 정보 | div.dropdown "Standard(db1)", div.dropdown "db1v2m4 (vCPU 2 | Memory 4G)" | Standard(db1) db1v2m4 (vCPU 2 | Memory 4G)
- Planned Compute | (컨트롤 없음) | 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성
-  | (컨트롤 없음) | 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성
- Block Storage 정보 Database가 사용하는 스토리지의 유형을 선택합니다. 스토리지 유형은 SS | div.dropdown "SSD", div.dropdown "SSD", input[text], div.checkbox "사용" | 기본 OS SSD DATA SSD GB Disk 추가 사용
- 기본 OS | div.dropdown "SSD" | SSD
- DATA | div.dropdown "SSD", input[text] | SSD GB
- Disk 추가 | div.checkbox "사용" | 사용
- 이중화 구성 이중화 구성은 이중화 솔루션을 이용해 Active-Standby로 구성, 디스크 기반의 Sync | div.checkbox "사용" | 사용
- 네트워크 서비스에서 생성되는 모든 서버들이 동일한 설정을 적용하려는 경우 공통 설정을 선택하고, 서버별 다른 | button[submit] "공통 설정", button[submit] "서버별 설정", div.dropdown "vpc-0928-1547-de38 AZ: kr-west", div.dropdown "선택하세요.", div.dropdown "자동 생성" | 공통 설정 서버별 설정 VPC명 vpc-0928-1547-de38 AZ: kr-west1-b Subnet명 선택하세요. IP 자동 생성
- VPC명 | div.dropdown "vpc-0928-1547-de38 AZ: kr-west" | vpc-0928-1547-de38 AZ: kr-west1-b
- Subnet명 | div.dropdown "선택하세요." | 선택하세요.
- IP | div.dropdown "자동 생성" | 자동 생성
- IP 접근 제어 IP 접근 제어는 DB 접근 정책을 설정하는 기능으로 해당 화면에 입력한 IP에 대해 DB  | input[text], button[submit] "추가", button[submit] "전체 삭제" | IP 형식(ex.192.168.10.1) 또는 CIDR 형식(ex.192.168.10.0/24, 192.168.10.1/32)로 입력하세요. 추가 총 0/100 전체 삭제 추가된 IP가 없습니다. 100개 이내의 I
-  | input[text], button[submit] "추가" | IP 형식(ex.192.168.10.1) 또는 CIDR 형식(ex.192.168.10.0/24, 192.168.10.1/32)로 입력하세요. 추가
-  | button[submit] "전체 삭제" | 총 0/100 전체 삭제 추가된 IP가 없습니다. 100개 이내의 IP를 추가하세요.
- 유지 관리 기간 | div.checkbox "사용" | 유지 관리 기간은 사용자가 패치를 수행할 시간대를 설정하는 기능입니다. 시스템의 안정적인 운영을 위해 유지 관리 기간을 설정하여 패치를 수행하는 것을 권고하며, 미사용으로 설정 또는 설정된 기간 내 패치 미수행으로 
- Database명 Database 설치 시 적용되는 이름입니다. | input[text] | 영문으로 시작하며 영문과 숫자를 사용하여 3~20자로 입력하세요. 0/20
- Database 사용자명 Database 사용자명은 Database 접속 시 사용하는 계정명입니다. | input[text] | 영문 소문자를 사용하여 2~20자로 입력하세요. 0/20
- Database 비밀번호 Database 접속 및 사용을 위한 사용자 계정에 대한 비밀번호입니다. 유출 및  | input[password] | 영문, 숫자와 특수문자(" ' 제외)를 포함하여 8~30자로 입력하세요. 0/30
- Database 비밀번호 확인 | input[password] | 비밀번호를 동일하게 한번 더 입력하세요. 0/30
- Database Port번호 Database 접속 시 사용되는 정보로, Port 입력 가능 범위는 1200~ | input[text] | 
- 백업 백업 기능 설정 시 저장 용량에 따른 별도 과금이 발생됩니다. | div.checkbox "사용" | 사용
- Audit Log 설정 Audit 설정 시 Database 성능이 저하될 수 있으며, Audit 설정에 따른 | div.checkbox "사용" | 사용
- ServiceWatch 로그 수집 클러스터의 DB Alert Log를 ServiceWatch > 로그 그룹  | div.checkbox "사용" | 사용
- Parameter SCP에서 권고하는 보안이 적용된 Parameter로 기본 설정됩니다. 서비스 생성 후 수 | div.dropdown "EPAS 17 PISA Default", button[submit] "조회" | EPAS 17 PISA Default 조회
- Database Encoding 텍스트 데이터 저장 시 사용되는 문자 집합입니다. 선택한 Encoding으로 | div.dropdown "UTF-8" | UTF-8
- DB Locale 문자열 처리, 숫자/통화/날짜/시간 표시형식 등과 관련된 설정입니다. 선택한 Locale로 | div.dropdown "C" | C
- 시간대 Database가 사용될 시간대를 선택합니다. | div.dropdown "Asia/Seoul (GMT +09:00)" | Asia/Seoul (GMT +09:00)
- License | div.checkbox "확인" | 제품 라이선스가 포함되지 않은 BYOL(고객 보유 라이선스 사용) 서비스입니다. 라이선스 관리에 대한 책임은 고객에게 있습니다. 확인
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["공통 설정","서버별 설정","추가","전체 삭제(dis)","조회","태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "": ["SSD"]
  dropdown "서비스": ["Standard(db1)","Standard(db2)"]
  dropdown "서버": ["Standard(db1)","Standard(db2)"]
  dropdown "Block": ["SSD"]
  dropdown "기본": ["SSD"]
  dropdown "DATA": ["SSD","SSD_KMS"]
  dropdown "네트워크": ["vpc-0928-1547-de38 AZ: kr-west1-b"]
  dropdown "VPC명": ["vpc-0928-1547-de38 AZ: kr-west1-b"]
  dropdown "Subnet명": []
  dropdown "Parameter": ["EPAS 17 PISA Default"]
  dropdown "Database": ["SSD"]
  dropdown "DB": ["C"]
  dropdown "시간대": ["Africa/Abidjan (GMT +00:00)","Africa/Accra (GMT +00:00)","Africa/Addis_Ababa (GMT +03:00)","Africa/Algiers (GMT +01:00)","Africa/Asmara (GMT +03:00)","Africa/Bamako (GMT +00:00)","Africa/Bangui (GMT +01:00)","Africa/Banjul (GMT +00:00)","Africa/Bissau (GMT +00:00)","Africa/Blantyre (GMT +02:00)","Africa/Brazzaville (GMT +01:00)","Africa/Bujumbura (GMT +02:00)","Africa/Cairo (GMT +03:00)","Africa/Casablanca (GMT +01:00)","Africa/Ceuta (GMT +02:00)","Africa/Conakry (GMT +00:00)","Africa/Dakar (GMT +00:00)","Africa/Dar_es_Salaam (GMT +03:00)","Africa/Djibouti (GMT +03:00)","Africa/Douala (GMT +01:00)"] … 421개
