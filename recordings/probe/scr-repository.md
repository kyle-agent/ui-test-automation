# #/scr/repository
title: Repository 목록 | Container Registry | kr-west1 | Console
list buttons: ["조회(dis)","Repository 생성"]
headers: 리포지토리명 | 생성 | 일시 | 수정 | 일시 | 상태
rows: 0

## "Repository 생성" → /scr/repository/request — Repository 생성 | Container Registry | kr-west1 | Console
- 레지스트리 | div.dropdown "선택하세요." | 선택하세요.
- 리포지토리명 | input[text] | 영문 소문자, 숫자, 특수문자(-)를 사용하여 3~30자로 입력하세요. (시작과 끝은 영문 소문자, 숫자만 가능) 0/30
-  | (컨트롤 없음) | Repository에 생성되는 Image 기본(최초) 정책을 설정합니다. 이 설정은 Repository 생성 후 상세조회 화면에서 변경할 수 있습니다. Repository 기본 정책 설정 변경 후 최초 생성된 Ima
- 이미지 스캔 이미지가 Push되면 자동으로 이미지 취약점을 스캔하도록 설정합니다. | div.checkbox "사용", div.checkbox "사용" | 자동 스캔 사용 스캔 제외 정책 사용
- 자동 스캔 | div.checkbox "사용" | 사용
- 스캔 제외 정책 | div.checkbox "사용" | 사용
-  | (컨트롤 없음) | 자동 스캔을 사용으로 설정하면, 이미지가 Push 되고 자동으로 이미지를 점검하여 알려진 보안 취약점이 있는지 확인합니다. 이 경우, 취약점 점검 비용이 과금됩니다. 스캔 제외 정책을 설정하면, 이미지 스캔 시 제외
- 이미지 pull 제한 스캔되지 않거나 취약한 이미지 pull을 제한합니다. | div.checkbox "사용", div.checkbox "사용" | 스캔되지 않은 이미지 pull 제한 사용 취약한 이미지 pull 제한 사용
- 스캔되지 않은 이미지 pull 제한 | div.checkbox "사용" | 사용
- 취약한 이미지 pull 제한 | div.checkbox "사용" | 사용
-  | (컨트롤 없음) | 스캔되지 않거나 취약한 이미지 pull을 제한할 수 있습니다. Critical, High는 취약점의 심각도를 의미합니다. 입력한 값 이상의 Critical 또는 High 레벨 취약점이 발견된 경우 이미지 pull을 
- 이미지 잠금 여부 이미지 전체를 삭제하거나 업데이트할 수 없도록 잠글 수 있습니다. | div.checkbox "Lock" | Lock
-  | div.checkbox "Lock" | Lock
- 이미지 태그 삭제 | div.checkbox "Untagged Image 자동 삭제", input[text], div.checkbox "Tagged Image 자동 삭제", input[text], input[text], div.checkbox "사용" | 이미지 태그(다이제스트) 자동 삭제 정책을 설정할 수 있습니다. 삭제 정책 활성화를 사용해야 설정한 삭제 정책에 따라 이미지 태그(다이제스트)가 자동 삭제됩니다. 삭제 정책 활성화를 사용 설정한 후 처음 삭제 정책이
-  | (컨트롤 없음) | 이미지 태그(다이제스트) 자동 삭제 정책을 설정할 수 있습니다. 삭제 정책 활성화를 사용해야 설정한 삭제 정책에 따라 이미지 태그(다이제스트)가 자동 삭제됩니다. 삭제 정책 활성화를 사용 설정한 후 처음 삭제 정책이
-  | div.checkbox "Untagged Image 자동 삭제", input[text], div.checkbox "Tagged Image 자동 삭제", input[text], input[text], div.checkbox "사용" | 삭제 정책 Untagged Image 자동 삭제 Days after first Push Tagged Image 자동 삭제 Days after first Push Tag expression 삭제 정책 활성화 사용
- 삭제 정책 | div.checkbox "Untagged Image 자동 삭제", input[text], div.checkbox "Tagged Image 자동 삭제", input[text], input[text] | Untagged Image 자동 삭제 Days after first Push Tagged Image 자동 삭제 Days after first Push Tag expression
-  | div.checkbox "Untagged Image 자동 삭제" | Untagged Image 자동 삭제
-  | input[text] | Days after first Push
-  | input[text] | Days after first Push
-  | div.checkbox "Tagged Image 자동 삭제" | Tagged Image 자동 삭제
-  | input[text], input[text] | Days after first Push Tag expression
-  | input[text] | Days after first Push
-  | input[text] | Tag expression
- 삭제 정책 활성화 | div.checkbox "사용" | 사용
-  | (컨트롤 없음) | 
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "레지스트리": []
