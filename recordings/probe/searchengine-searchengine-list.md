# #/searchengine/searchengine/list
title: Search Engine 목록 | Search Engine | kr-west1 | Console
list buttons: ["상세 검색","서비스 생성","서비스 생성"]
headers: 클러스터명 | 서버 | 수 | 클러스터 | 상태
rows: 0

## "서비스 생성" → /searchengine/searchengine/request — Search Engine 생성 | Search Engine | kr-west1 | Console
-  | div.dropdown "Elasticsearch Enterprise 9.4.2" | Elasticsearch Enterprise OpenSearch Image 버전 Elasticsearch Enterprise 9.4.2 Data Analytics Elasticsearch Enterprise Elas
- 서버명 prefix 서버명 Prefix 기반으로 postfix(ex. 001, 002)가 붙어 실제 서버명이 | input[text] | 영문 소문자로 시작하며 소문자, 숫자와 특수문자(-)를 사용하여 3~13자로 입력하세요. 0/13
- 클러스터명 서버들을 논리적으로 관리하는 클러스터 이름입니다. | input[text] | 영문을 사용하여 3~20자로 입력하세요. 0/20
- MasterNode 별도설치 Master Node를 별도로 설치할지 선택합니다. Master Node 별도  | div.checkbox "사용" | 사용
- Node 수 Node 수만큼 서버명과 숫자 조합으로 Host명이 자동 부여됩니다. | div.dropdown "1" | 1
- 서비스 유형 | div.dropdown "Standard(ses1)", div.dropdown "ses1v2m4 (vCPU 2 | Memory 4G)", div.dropdown "SSD", div.dropdown "SSD", input[text], div.checkbox "사용" | 서버 타입 정보 Standard(ses1) ses1v2m4 (vCPU 2 | Memory 4G) Planned Compute 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성 Blo
- 서버 타입 정보 | div.dropdown "Standard(ses1)", div.dropdown "ses1v2m4 (vCPU 2 | Memory 4G)" | Standard(ses1) ses1v2m4 (vCPU 2 | Memory 4G)
- Planned Compute | (컨트롤 없음) | 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성
-  | (컨트롤 없음) | 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성
- Block Storage 정보 Search Engine이 사용하는 스토리지 유형을 선택합니다. 스토리지 유형 | div.dropdown "SSD", div.dropdown "SSD", input[text], div.checkbox "사용" | 기본 OS SSD DATA SSD GB Disk 추가 사용
- 기본 OS | div.dropdown "SSD" | SSD
- DATA | div.dropdown "SSD", input[text] | SSD GB
- Disk 추가 | div.checkbox "사용" | 사용
- Kibana | div.dropdown "Standard(ses1)", div.dropdown "ses1v2m4 (vCPU 2 | Memory 4G)", div.dropdown "SSD" | 서버 타입 정보 Standard(ses1) ses1v2m4 (vCPU 2 | Memory 4G) Planned Compute 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성 Blo
- 서버 타입 정보 | div.dropdown "Standard(ses1)", div.dropdown "ses1v2m4 (vCPU 2 | Memory 4G)" | Standard(ses1) ses1v2m4 (vCPU 2 | Memory 4G)
- Planned Compute | (컨트롤 없음) | 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성
-  | (컨트롤 없음) | 사용중 0개설정 0개Coverage 미리보기Planned Compute 서비스 생성
- Block Storage 정보 Elasticsearch가 사용하는 스토리지 유형을 선택합니다. 스토리지 유형 | div.dropdown "SSD" | 기본 OS SSD
- 기본 OS | div.dropdown "SSD" | SSD
- 네트워크 서비스에서 생성되는 모든 서버들이 동일한 설정을 적용하려는 경우 공통 설정을 선택하고, 서버별 다른 | button[submit] "공통 설정", button[submit] "서버별 설정", div.dropdown "vpc-0928-1547-de38 AZ: kr-west", div.dropdown "선택하세요.", div.dropdown "자동 생성" | 공통 설정 서버별 설정 VPC명 vpc-0928-1547-de38 AZ: kr-west1-b Subnet명 선택하세요. IP 자동 생성
- VPC명 | div.dropdown "vpc-0928-1547-de38 AZ: kr-west" | vpc-0928-1547-de38 AZ: kr-west1-b
- Subnet명 | div.dropdown "선택하세요." | 선택하세요.
- IP | div.dropdown "자동 생성" | 자동 생성
- IP 접근 제어 IP 접근 제어는 DB 접근 정책을 설정하는 기능으로 해당 화면에 입력한 IP에 대해 DB  | input[text], button[submit] "추가", button[submit] "전체 삭제" | IP 형식(ex.192.168.10.1) 또는 CIDR 형식(ex.192.168.10.0/24, 192.168.10.1/32)로 입력하세요. 추가 총 0/100 전체 삭제 추가된 IP가 없습니다. 100개 이내의 I
-  | input[text], button[submit] "추가" | IP 형식(ex.192.168.10.1) 또는 CIDR 형식(ex.192.168.10.0/24, 192.168.10.1/32)로 입력하세요. 추가
-  | button[submit] "전체 삭제" | 총 0/100 전체 삭제 추가된 IP가 없습니다. 100개 이내의 IP를 추가하세요.
- 유지 관리 기간 | div.checkbox "사용" | 유지 관리 기간은 사용자가 패치를 수행할 시간대를 설정하는 기능입니다. 시스템의 안정적인 운영을 위해 유지 관리 기간을 설정하여 패치를 수행하는 것을 권고하며, 미사용으로 설정 또는 설정된 기간 내 패치 미수행으로 
- 백업 백업 기능 설정 시 저장 용량에 따른 별도 과금이 발생됩니다. | div.checkbox "사용" | 사용
- ServiceWatch 로그 수집 클러스터에 대한 로그를 ServiceWatch > 로그 그룹 에서 확인할  | div.checkbox "사용" | 사용
- 클러스터 Port 번호 클러스터 접속 시 사용되는 정보로, Port 입력 가능 범위는 1200~65535입니 | input[text] | 
- Elastic 사용자명 Database 사용자명은 Database 접속 시 사용하는 계정명입니다. | input[text] | 영문 소문자를 사용하여 2~20자로 입력하세요. 0/20
- Elastic 비밀번호 Elasticsearch 접속 및 사용을 위한 사용자 계정에 대한 비밀번호입니다. 유 | input[password] | 영문, 숫자와 특수문자("'\ 제외)를 포함하여 8~30자로 입력하세요. 0/30
- Elastic 비밀번호 확인 | input[password] | 비밀번호를 동일하게 한번 더 입력하세요. 0/30
- License key 제품 라이선스가 포함되지 않은 BYOL(고객 보유 라이선스 사용) 서비스입니다. 라이선 | textarea[textarea] | 라이선스 값은 2,000자리 이내의 JSON 형식으로 입력하세요. 0/2,000
- 시간대 Cluster가 사용될 시간대를 선택합니다. | div.dropdown "Asia/Seoul (GMT +09:00)" | Asia/Seoul (GMT +09:00)
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["공통 설정","서버별 설정","추가","전체 삭제(dis)","태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "": ["1","3","4","5","6","7","8","9","10"]
  dropdown "Node": ["1","3","4","5","6","7","8","9","10"]
  dropdown "서비스": ["Standard(ses1)","Standard(ses2)"]
  dropdown "서버": ["Standard(ses1)","Standard(ses2)"]
  dropdown "Block": ["SSD"]
  dropdown "기본": ["SSD"]
  dropdown "DATA": ["SSD","SSD_KMS"]
  dropdown "Kibana": ["Standard(ses1)","Standard(ses2)"]
  dropdown "서버": ["Standard(ses1)","Standard(ses2)"]
  dropdown "Block": ["SSD"]
  dropdown "기본": ["SSD"]
  dropdown "네트워크": ["vpc-0928-1547-de38 AZ: kr-west1-b"]
  dropdown "VPC명": ["vpc-0928-1547-de38 AZ: kr-west1-b"]
  dropdown "Subnet명": []
  dropdown "시간대": ["Africa/Abidjan (GMT +00:00)","Africa/Accra (GMT +00:00)","Africa/Addis_Ababa (GMT +03:00)","Africa/Algiers (GMT +01:00)","Africa/Asmara (GMT +03:00)","Africa/Bamako (GMT +00:00)","Africa/Bangui (GMT +01:00)","Africa/Banjul (GMT +00:00)","Africa/Bissau (GMT +00:00)","Africa/Blantyre (GMT +02:00)","Africa/Brazzaville (GMT +01:00)","Africa/Bujumbura (GMT +02:00)","Africa/Cairo (GMT +03:00)","Africa/Casablanca (GMT +01:00)","Africa/Ceuta (GMT +02:00)","Africa/Conakry (GMT +00:00)","Africa/Dakar (GMT +00:00)","Africa/Dar_es_Salaam (GMT +03:00)","Africa/Djibouti (GMT +03:00)","Africa/Douala (GMT +01:00)"] … 421개
