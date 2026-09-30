# #/virtualserver/image/list
title: Image 목록 | Virtual Server | kr-west1 | Console
list buttons: ["삭제(dis)","","상세 검색","Image 생성","Image 생성"]
headers:  | Image명 | OS | 타입 | Visibility | Availability | Zone | 생성 | 일시 | 상태
rows: 0

## "Image 생성" → /virtualserver/image/request — Image 생성 | Virtual Server | kr-west1 | Console
- Image명 | input[text] | 영문, 숫자, 공백과 특수문자(-_)를 사용하여 255자 이내로 입력하세요. 0/255
- Image 파일 Object Storage에 Image 파일을 업로드한 후, Object Storage 상세 | input[text] | URL Object Storage에 업로드 한 Image 파일 URL을 255자 이내로 입력하세요. 0/255 Image 파일은 다음의 확장자만 가능합니다. (qcow2) 안전한 Image 파일을 업로드하여 보안 위
- URL | input[text] | Object Storage에 업로드 한 Image 파일 URL을 255자 이내로 입력하세요. 0/255
- OS 타입 | div.dropdown "Alma Linux" | Alma Linux
- 최소 디스크 | input[text] | GB
- 최소 RAM | input[text] | GB
- Visibility Image에 대한 접근 권한을 표시합니다. | button[submit] "Private", button[submit] "Shared" | Private Shared
- Protected | div.checkbox "사용" | 사용
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["Private","Shared","태그 추가","취소","생성(dis)"]
  dropdown "OS": ["Alma Linux","CentOS","Oracle Linux","RHEL","Rocky Linux","Ubuntu","Windows"]
