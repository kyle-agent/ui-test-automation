# #/iam/idp/list
title: 자격 증명 공급자 목록 | Identity and Access Management(IAM) | Global | Console
list buttons: ["삭제(dis)","자격 증명 공급자 생성","자격 증명 공급자 생성"]
headers:  | 자격 | 증명 | 공급자명 | 설명 | 유형 | 생성 | 일시 | 수정 | 일시
rows: 0

## "자격 증명 공급자 생성" → /iam/idp/create — 자격 증명 공급자 생성 | Identity and Access Management(IAM) | Global | Console
- 자격 증명 공급자명 | input[text] | 영문, 숫자와 특수문자(._-)를 사용하여 128자 이내로 입력하세요. 0/128
- 설명 | textarea[textarea] | 1,000자 이내로 입력하세요. 0/1,000
- 유형 | div.checkbox "SAML", div.checkbox "OIDC" | SAML OIDC
- 메타데이터 | button[submit] "파일첨부" | 파일첨부 총 0 여기를 클릭하시거나 업로드할 파일을 여기에 끌어 놓으세요. 첨부 파일은 10MB 이내의 유효한 UTF-8 xml 문서 1개만 업로드 가능합니다.
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["파일첨부","태그 추가","취소","생성(dis)"]
