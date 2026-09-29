# #/resourcegroups/resource-group/list
title: Resource Group 목록 | Resource Groups | kr-west1 | Console
list buttons: ["삭제(dis)","Resource Group 생성","Resource Group 생성"]
headers:  | Resource | Group명 | 설명 | 생성 | 일시
rows: 0

## "Resource Group 생성" → /resourcegroups/resource-group/create — Resource Group 생성 | Resource Groups | kr-west1 | Console
- Resource Group명 | input[text] | 한글, 영문, 숫자와 특수문자(+= ,.@-_)를 사용하여 3~64자로 입력하세요. 0/64
- 설명 | textarea[textarea] | 1,000자 이내로 입력하세요. 0/1,000
- 자원 유형 | div.dropdown "전체" | 그룹핑이 지원되는 자원 유형은 사용자 가이드 > Resource Group 생성하기를 참고하세요. 전체
- 그룹 정의 태그 | input[text] ph=한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요., input[text] ph=한글, 영문, 숫자, 공백과 특수문자(_.:/=+@-)를 사용하여 입력하세요., button[submit] "태그 추가" | 그룹핑할 기준 태그를 설정해 주세요. 해당 태그를 가지고 있는 자원들이 그룹으로 설정됩니다. 자세한 그룹핑 방법은 사용자 가이드 > Resource Group 생성하기를 참고하세요. Key Value 한글, 영문, 
- 그룹 대상 자원 | button[submit] "자원 미리보기", div.dropdown "10개씩 보기" | [자원 미리보기] 버튼을 선택하면 대상 자원 확인이 가능합니다. 자원 미리보기 총 0 10개씩 보기 자원명 자원 ID 서비스명 자원 유형 태그 생성 일시 데이터가 없습니다.
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개) 추가된 태그는 그룹 내 자원이 아닌, Resource Group에만 적용됩니다.
buttons: ["태그 추가","자원 미리보기(dis)","태그 추가","취소","생성(dis)"]
  dropdown "자원": ["전체","quota:account-quota","security-group:address-group","aiml-brightix:aimlops-platform","billingsystem:anomaly-data","apigateway:api","cloud-fabric-connect:cfc-attachment","cloudwan:attachment","virtualserver:auto-scaling-group","backup:backup","backup:backup-agent","baremetal:baremetal","cloudcontrol:baseline-assignment","cloud-fabric-connect:bgp","objectstorage:bucket","archivestorage:bucket","cachestore:cache-store","certificatemanager:certificate","cloudlastmile:circuit-and-edge","scf:cloud-function"] … 172개
  dropdown "그룹": ["전체","quota:account-quota","security-group:address-group","aiml-brightix:aimlops-platform","billingsystem:anomaly-data","apigateway:api","cloud-fabric-connect:cfc-attachment","cloudwan:attachment","virtualserver:auto-scaling-group","backup:backup","backup:backup-agent","baremetal:baremetal","cloudcontrol:baseline-assignment","cloud-fabric-connect:bgp","objectstorage:bucket","archivestorage:bucket","cachestore:cache-store","certificatemanager:certificate","cloudlastmile:circuit-and-edge","scf:cloud-function"] … 172개
