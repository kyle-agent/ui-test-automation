# #/cdn/cdn/list
title: Global CDN 목록 | Global CDN | kr-west1 | Console
list buttons: ["상세 검색","서비스 생성","서비스 생성"]
headers: Global | CDN명 | 원본 | 위치 | CDN | 도메인 | 생성 | 일시 | 상태
rows: 0

## "서비스 생성" → /cdn/cdn/request — Global CDN 생성 | Global CDN | kr-west1 | Console
- CDN명 Global CDN 서비스 제공을 위한 이름을 설정합니다. 이미 사용된 이름은 설정할 수 없습니다. | input[text] | 영문과 숫자를 사용하여 3~20자로 입력하세요. 0/20
- CDN 도메인 기본적으로 Global CDN 도메인이 제공됩니다. | input[text] | 소문자와 숫자를 사용하여 4~40자로 입력하세요. 0/40 .cdn.e.samsungsdscloud.com
- 원본 위치 | div.dropdown "Domain", input[text], button[submit] "HTTPS", button[submit] "HTTP", input[text] | 도메인 또는 IP · Global CDN 서비스를 이용할 원본 서버의 위치를 설정 합니다. 도메인 이름(권장) 또는 원본 서버의 공인 IP를 직접 입력하세요. · 도메인 이름은 전체 영문 소문자 및 숫자, 특수문자(
- 도메인 또는 IP · Global CDN 서비스를 이용할 원본 서버의 위치를 설정 합니다. 도메인 이름(권장 | div.dropdown "Domain", input[text] | Domain 도메인 또는 원본서버의 공인 IP를 직접 입력하세요. 0/253
- 프로토콜 | button[submit] "HTTPS", button[submit] "HTTP" | HTTPS HTTP
- Port 번호 72, 80-89, 443, 488, 591, 777, 1080, 1088, 1111, 144 | input[text] | ex) 80 0/5
- 원본 경로 실제 서비스로 제공될 원본 파일이 위치한 디렉토리 위치를 지정 해주세요. 원본경로 /directo | input[text] | 영문, 숫자와 특수문자(-_./)를 사용하여 253자 이내로 입력하세요. 0/253
- Forward host header Global CDN에서 원본 서버로 요청시 사용자에게 전달할 host 헤 | button[submit] "Incoming host header", button[submit] "Origin hostname", button[submit] "Custom value" | Incoming host header Origin hostname Custom value
- Cache key hostname Global CDN Edge 서버에서 콘텐츠를 식별하기 위한 key 정보입 | button[submit] "Incoming host header", button[submit] "Origin hostname" | Incoming host header Origin hostname
- Custom header(요청) Global CDN Edge 서버에서 원본서버로 요청시 특정 header를  | div.checkbox "사용" | 사용
- 캐싱 옵션 Global CDN Edge 서버로 전송되는 모든 콘텐츠에 적용되는 캐싱 정책을 설정합니다. 원본 | div.dropdown "Honor origin cache-control and" | Honor origin cache-control and expires
- 콘텐츠 전송 정책 Global CDN Edge 서버에서 원본 서버와 콘텐츠 유효성을 검증할 수 있습니다. T | button[submit] "유효한 콘텐츠만 제공", button[submit] "캐싱된 모든 콘텐츠를 제공" | 유효한 콘텐츠만 제공 캐싱된 모든 콘텐츠를 제공
- Cache 만료시간 Global CDN Edge에서 캐싱된 콘텐츠가 만료되는 시간을 설정합니다. | input[text] | 초
- Ignore query string 캐싱 정책 적용시 query string의 사용 여부를 설정합니다. | div.checkbox "사용" | 사용
- Range request 허용 100MB 이상의 오브젝트에 대한 대용량 파일 최적화로 1.8GB까지 지원하는 | div.checkbox "사용" | 사용
- Custom header(응답) Global CDN Edge 서버에서 원본서버로 요청시 특정 header를  | div.checkbox "사용" | 사용
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["HTTPS","HTTP","Incoming host header","Origin hostname","Custom value","Incoming host header","Origin hostname","유효한 콘텐츠만 제공","캐싱된 모든 콘텐츠를 제공","태그 추가","취소","생성(dis)"]
  dropdown "원본": ["Honor origin cache-control and expires","Cache","Honor origin expires","Honor origin cache-control"]
  dropdown "도메인": ["Domain","IP"]
  dropdown "캐싱": ["Honor origin cache-control and expires","Cache","Honor origin expires","Honor origin cache-control"]
