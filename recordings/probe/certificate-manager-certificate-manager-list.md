# #/certificate-manager/certificate-manager/list
title: Certificate Manager 목록 | Certificate Manager | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | 인증서명 | Common | Name | 유형 | 시작 | 일시 | 만료 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /certificate-manager/certificate-manager/request — Certificate Manager 생성 | Certificate Manager | kr-west1 | Console
- 인증서명 | input[text] | 영문, 숫자와 특수문자(-_.)를 사용하여 3~30자로 입력하세요. 0/30
- 유형 CA로부터 발급받은 인증서를 등록하거나, Self-Signed 인증서를 생성할 수 있습니다. | button[submit] "사용자 인증서", button[submit] "자체 발급 인증서" | 사용자 인증서 자체 발급 인증서
-  | textarea[textarea], textarea[textarea], textarea[textarea], button[submit] "인증서 유효성 검증" | 인증서 정보 사용자 인증서는 유효한 인증서에 한해 등록 가능합니다. 생성 완료 전 유효성 검증 버튼을 클릭하여 입력한 인증서 정보가 유효한지 확인하세요. Certificate Body PEM 형식의 인증서 본문을 입
- 인증서 정보 | textarea[textarea], textarea[textarea], textarea[textarea], button[submit] "인증서 유효성 검증" | 사용자 인증서는 유효한 인증서에 한해 등록 가능합니다. 생성 완료 전 유효성 검증 버튼을 클릭하여 입력한 인증서 정보가 유효한지 확인하세요. Certificate Body PEM 형식의 인증서 본문을 입력합니다. -
- Certificate Body PEM 형식의 인증서 본문을 입력합니다. -----BEGIN CERTIFICA | textarea[textarea] | BEGIN, END 행을 포함한 전체 내용을 입력하세요. 0/35,000 bytes
- Private Key PEM 형식의 복호화된 인증서 Private Key를 입력합니다. -----BEGIN  | textarea[textarea] | BEGIN, END 행을 포함한 전체 내용을 입력하세요. 0/35,000 bytes
- Certificate Chain PEM 형식의 인증서에 체인을 입력합니다. Sub CA → Root CA 순 | textarea[textarea] | BEGIN, END 행을 포함한 전체 내용을 입력하세요. 인증서 순서는 Sub, CA, Root CA 순으로 입력하세요. 0/70,000 bytes
- 만료 알림 | div.checkbox "사용" | 사용
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["사용자 인증서","자체 발급 인증서","인증서 유효성 검증(dis)","태그 추가","취소","생성(dis)"]
