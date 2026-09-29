# #/scf/cloudfunctions
title: Function 목록 | Cloud Functions | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | Function명 | Runtime | 생성 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /scf/cloudfunctions/request — Function 생성 | Cloud Functions | kr-west1 | Console
- Function명 | input[text] | 영문 소문자로 시작하며 소문자, 숫자와 특수문자(-)를 사용하여 3~64자로 입력하세요. 0/64
- Runtime | button[submit] "새로 작성", button[submit] "Blueprint로 시작하기", div.dropdown "Node.js 24" | 새로 작성 Blueprint로 시작하기 Runtime & Version Node.js 24
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["새로 작성","Blueprint로 시작하기","태그 추가","취소","생성(dis)"]
  dropdown "Runtime": [".NET 10",".NET 10","Go 1.25","Go 1.25","Java 17","Java 17","Node.js 24","Node.js 24","Node.js 22","Node.js 22","PHP 8.5","PHP 8.5","PHP 8.4","PHP 8.4","Python 3.14","Python 3.14","Python 3.11","Python 3.11","Python 3.10","Python 3.10"] … 22개
