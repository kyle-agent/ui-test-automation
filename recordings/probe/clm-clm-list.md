# #/clm/clm/list
title: Cloud Last Mile 목록 | Cloud Last Mile | Global | Console
list buttons: ["서비스 생성","서비스 생성"]
headers: Cloud | Last | Mile명 | 계약 | 기간 | 설치 | 요청일 | 상태
rows: 0

## "서비스 생성" → /clm/clm/new — Cloud Last Mile 생성 | Cloud Last Mile | Global | Console
- Cloud Last Mile명 | input[text] | 영문과 숫자를 사용하여 3~20자로 입력하세요. 0/20
- 설치 권역 | div.dropdown "선택하세요." | 선택하세요.
- 설치 주소 | input[text] | 100자 이내로 입력하세요. 0/100
- 계약 기간 | div.dropdown "1년" | 1년
- 설치 요청일 | input[text] ph=YYYY-MM-DD | 현재일 기준 최소 2개월 후 날짜로 선택하세요.
- 기타 요청사항 | input[text] | 50자 이내로 입력하세요. 0/50
buttons: ["취소","생성(dis)"]
  dropdown "설치": ["뉴저지","도쿄","두바이","런던","마이애미","북경","산호세","상암","상파울로","상해","수원","싱가포르","첸나이","프랑크푸르트","하노이","홍콩"]
  dropdown "계약": ["1년","2년","3년","4년","5년","6년","7년"]
