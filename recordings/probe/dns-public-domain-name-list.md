# #/dns/public-domain-name/list
title: Public Domain Name 목록 | DNS | kr-west1 | Console
list buttons: ["서비스 생성","서비스 생성"]
headers:  | Public | Domain | Name | 명 | 등록일 | 만료일 | 상태
rows: 0

## "서비스 생성" → /dns/public-domain-name/request — Public Domain Name 생성 | DNS | kr-west1 | Console
- 등록할 도메인명 도메인 유형에 따른 요금은 요금표를 참조해 주세요. | input[text], div.dropdown ".com", button[submit] "사용 가능 여부 조회" | 영문 소문자 또는 숫자로 시작하고 끝나야 하며, 소문자, 숫자 그리고 특수문자(-)를 사용하여 2 ~ 63자로 입력하세요. 0/63 .com 사용 가능 여부 조회
- 구매기간 | div.dropdown "1년" | 1년
- 자동 연장 자동 연장을 설정하면 사용 기간이 1년 단위로 자동 연장됩니다. 자동 연장 기능은 도메인 사용 기 | div.checkbox "사용" | 사용
- 등록인명(상호명) | input[text], input[text] | 한글을 사용하여 30자 이내로 입력하세요. 0/30 (한글) 영문을 사용하여 30자 이내로 입력하세요. 0/30 (영문)
- 등록인 이메일 | input[text] | 64자 이내로 입력하세요. 0/64
- 등록인 주소 | div.dropdown "국내", input[text], button[submit] "우편번호 찾기", input[text], input[text], input[text], input[text] | 국내 우편번호 찾기 나머지 한글 주소를 16자 이내로 입력하세요. 0/16 (한글) 나머지 영문 주소를 16자 이내로 입력하세요. 0/16 (영문)
- 전화번호 | input[text], input[text], input[text] | - -
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["사용 가능 여부 조회","우편번호 찾기","태그 추가","취소","생성(dis)"]
  dropdown "등록인": ["국내","해외"]
