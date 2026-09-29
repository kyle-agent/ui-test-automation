# #/directconnect/directconnect/list
title: Direct Connect 목록 | Direct Connect | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | Direct | Connect명 | Direct | Connect | ID | 연결 | VPC명 | 생성 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /directconnect/directconnect/request — Direct Connect 생성 | Direct Connect | kr-west1 | Console
- Direct Connect명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20
- Uplink 사용 Direct Connect에 고객사 회선 연결을 위해 Uplink 포트용량을 선택해 주세요 | div.dropdown "포트용량 1G" | 포트용량 1G
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- Firewall 사용 Firewall 사용을 선택하지 않더라도 Firewall 자원은 '미사용' 상태로 생성 | div.checkbox "사용" | 사용
- Firewall 로그 저장 여부 | div.checkbox "사용" | 사용
-  | (컨트롤 없음) | ※ 로그 저장을 사용하는 경우 로그 저장소를 먼저 설정해야 합니다. 로그 저장소 설정은 Firewall Logging에서 확인할 수 있습니다. ※ 로그 저장소를 사용하면 로그 저장에 대한 Object Storage 
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "Uplink": ["포트용량 1G","포트용량 10G","포트용량 20G","포트용량 40G"]
  dropdown "VPC명": ["vpc-0929-1700-b001 AZ: kr-west1-b"]
