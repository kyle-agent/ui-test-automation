# #/gslb/gslb/list
title: GSLB 목록 | GSLB | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | 도메인명 | 용도 | 알고리즘 | 
rows: 0

## "서비스 생성" → /gslb/gslb/request — GSLB 생성 | GSLB | kr-west1 | Console
- 용도 | (컨트롤 없음) | Public
- 도메인명 활용할 도메인명을 영문 소문자, 숫자를 사용하여 4~40자로 입력하세요. 영문 소문자, 숫자로 시작 | input[text] | 소문자와 숫자를 사용하여 4~40자로 입력하세요. 0/40 .gslb.e.samsungsdscloud.com
- 연결 대상 추가 | input[text], div.dropdown "KR-WEST-1", textarea[textarea], button[submit] "추가" | IP ex)192.168.0.2 위치 연결 대상에 대한 모니터링을 수행할 위치는 연결 대상 서버와 근접한 위치로 설정을 권장합니다. KR-WEST-1 설명 50자 이내로 입력하세요. 0/50 추가
- IP | input[text] | ex)192.168.0.2
- 위치 연결 대상에 대한 모니터링을 수행할 위치는 연결 대상 서버와 근접한 위치로 설정을 권장합니다. | div.dropdown "KR-WEST-1" | KR-WEST-1
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 연결 대상 목록 | button[submit] "전체 삭제" | 총 0/8 전체 삭제 데이터가 없습니다. GSLB가 연결 대상을 모니터링하기 위해서는 Firewall 및 Security Group에 허용 규칙 추가가 필요합니다. GSLB IP 대역 : "112.106.155.0/
-  | (컨트롤 없음) | · Health Check용으로 사용할 통신 프로토콜은 ICMP, TCP, HTTP, HTTPS를 사용할 수 있습니다. · 통신 프로토콜별 Interval(Health check 주기), Timeout(서비스 다운 
- Health Check | div.dropdown "ICMP" | ICMP
- Interval | input[text] | 초
- Timeout | input[text] | 초
- Probe Timeout | input[text] | 초
-  | (컨트롤 없음) | · Ratio 정책은 연결 대상별 가중치(Weight)에 비례하여 값이 클수록 트래픽이 자주 분배되고, Round Robin 정책은 순환방식 기반으로 트래픽이 균등하게 분배됩니다. · 가중치는 Ratio 알고리즘에만
- 알고리즘 | div.dropdown "Ratio" | Ratio
- 연결 대상 | (컨트롤 없음) | 총 0 Weight * IP 위치 설명 데이터가 없습니다.
- 설명 | textarea[textarea] | 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["추가(dis)","전체 삭제(dis)","태그 추가","취소","생성(dis)"]
  dropdown "연결": ["KR-WEST-1","KR-EAST-1"]
  dropdown "위치": ["KR-WEST-1","KR-EAST-1"]
  dropdown "Health": ["ICMP","TCP","HTTP","HTTPS","사용 안함"]
  dropdown "알고리즘": ["Ratio","Round Robin"]
