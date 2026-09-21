function slug(s) { s = tolower(s); gsub(/[^a-z0-9]+/, "-", s); gsub(/^-|-$/, "", s); return s }
function yq(s)   { gsub(/"/, "\\\"", s); return "\"" s "\"" }
function header(cat, svc, route, f) {
  print "id: smoke." slug(svc) > f
  print "title: " yq(svc " 화면 진입 스모크 (읽기 전용)") > f
  print "service: " yq(svc) > f
  print "category: " yq(cat) > f
  print "tags: [smoke, readonly, generated]" > f
  print "precondition:" > f
  print "  session: root" > f
  print "  region: kr-west1" > f
  print "  language: ko" > f
  print "steps:" > f
  print "  - goal: " yq("모든 서비스에서 " cat " > " svc " 를 열어 서비스에 진입한다") > f
  print "    expect:" > f
  print "      url: " yq("#" route) > f
  print "      not_text: [\"오류가 발생\", \"Error\", \"권한이 없습니다\"]" > f
}
/^#/ && !/^## / { next }
/^## / {
  if (f != "") close(f)
  line = $0; sub(/^## /, "", line)
  split(line, a, " \\| "); split(a[1], b, " > ")
  cat = b[1]; svc = b[2]; route = a[2]; sub(/ \[folder\]$/, "", route)
  f = "scenarios/smoke/" slug(cat) "--" slug(svc) ".yaml"; n++
  header(cat, svc, route, f)
  next
}
/\|/ && f != "" {
  split($0, a, " \\| "); name = a[1]; r = a[2]; sub(/ \(.*\)$/, "", r)
  if (name == "Service Home") next
  print "  - goal: " yq("좌측 메뉴에서 " name " 을(를) 클릭한다") > f
  print "    expect:" > f
  print "      url: " yq("#" r) > f
  print "      text: [" yq(name) "]" > f
  print "      not_text: [\"오류가 발생\", \"Error\", \"권한이 없습니다\"]" > f
  m++
}
END { print n " scenario files, " m " screen steps" }
