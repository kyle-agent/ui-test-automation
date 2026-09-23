# #/secretvault/secretvault/list
title: Secret Vault 목록 | Secret Vault | kr-west1 | Console
list buttons: ["서비스 해지(dis)","","상세 검색","서비스 생성","서비스 생성"]
headers:  | Secret명 | 유형 | 생성일시 | Token | 만료 | 일시 | 삭제 | 예정 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /secretvault/secretvault/request — Secret Vault 생성 | Secret Vault | kr-west1 | Console
- Secret명 | input[text] | 영문 소문자와 숫자를 사용하여 3~63자로 입력하세요. 0/63
- 유형 암호화 대상의 유형을 선택할 수 있습니다. | div.dropdown "SCP Open API Key" | SCP Open API Key
- 인증키 인증키 관리 메뉴에서 미리 생성하신 인증키 중에 Secret Vault에서 사용할 인증키를 선택하세요 | input[text], button[submit] "선택" | 선택 서비스 신청 및 사용을 위해서는 콘솔의 인증키 관리 메뉴에서 보안 인증방식을 반드시 ‘임시키 인증’으로 선택하셔야 합니다.
- Token 사용 기간 Token 사용 기간은 기본적으로 입력하신 인증키의 유효 기간과 동일하게 자동으로 설정 | input[text] | 30 - 7300 일 내부 시스템 제약으로 최대 7300일(20년)까지 설정 가능하며, 보안 강화를 위해 token은 주기적으로 교체하시길 권고합니다. Token 사용 기간이 만료되면 임시키 발급이 불가능하며, 서비
- 임시키 교체 주기 임시키 사용시간은 서비스 생성 완료 시점부터 적용됩니다. | div.dropdown "15" | 15 시간 임시키는 보안 강화를 위해 최대 1.5일(36시간)까지만 사용 설정이 가능합니다. 임시키 사용 기간이 만료되기 전 신규 임시키가 발급되며 동일한 사용 기간이 적용됩니다.
- 접근 허용 IP 접근 허용 IP는 필수로 입력하셔야 하며, 0.0.0.0/0을 제외한 설정하신 특정 IP 대 | input[text], button[submit] "추가", button[submit] "전체 삭제" | ex) 192.168.11.1/32 추가 총 0/10 전체 삭제 추가된 IP가 없습니다. 10개 이내의 IP를 추가하세요. Secret Vault 서비스를 통해 등록하신 접근 허용 IP는 반드시 ‘인증키 관리 > 보
- 설명 | textarea[textarea] | 100자 이내로 입력하세요. 0/100
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["선택","추가","전체 삭제(dis)","태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "유형": ["SCP Open API Key"]
  dropdown "임시키": ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"] … 36개
