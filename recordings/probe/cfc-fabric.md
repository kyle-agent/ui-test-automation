# #/cfc/fabric
title: Fabric 목록 | Cloud Fabric Connect | Global | Console
list buttons: ["서비스 해지(dis)","서비스 생성","서비스 생성"]
headers:  | Fabric명 | Fabric | ID | Location | 생성 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /cfc/fabric/new — Fabric 생성 | Cloud Fabric Connect | Global | Console
- Fabric명 | input[text] | 영문과 숫자를 사용하여 3~20자로 입력하세요. 0/20
- Location | div.dropdown "Gasan" | Gasan
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "Location": ["Gasan","Pyeongchon"]
