# #/cssdlan/cssdlan-network
title: Network 목록 | Cloud Secured SD-LAN | Global | Console
list buttons: ["상세 검색","서비스 생성","서비스 생성"]
headers: Network명 | Network | ID | 서비스 | 구분 | 계약 | 기간 | 서비스 | 시작일 | 계약 | 만료일 | 상태
rows: 0

## "서비스 생성" → /cssdlan/cssdlan-network/new — Network 생성 | Cloud Secured SD-LAN | Global | Console
- Network명 자원별 구분/검색이 가능하도록 규칙을 갖는 Network명으로 생성을 권장드립니다. | input[text] | 영문, 숫자와 특수문자(-_)를 사용하여 3~30자로 입력하세요. 0/30
- 서비스 구분 NW Access 일 때: 사용이 필요한 네트워크 서비스를 선택합니다. NW Authentica | button[submit] "NW Access", button[submit] "NW Authentication" | NW Access NW Authentication
-  | div.dropdown "6년", div.checkbox "사용" | 계약 기간 6년 Network Managed 서비스 Network 장비 운영 서비스를 신청합니다. 사용
- 계약 기간 | div.dropdown "6년" | 6년
- Network Managed 서비스 Network 장비 운영 서비스를 신청합니다. | div.checkbox "사용" | 사용
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["NW Access","NW Authentication","태그 추가","취소","생성(dis)"]
  dropdown "": ["4년","5년","6년","7년"]
  dropdown "계약": ["4년","5년","6년","7년"]
