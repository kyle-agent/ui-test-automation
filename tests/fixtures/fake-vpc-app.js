// 가짜 VPC 콘솔 앱. root 는 document 또는 shadowRoot. 세 가지 구조(같은 문서 / shadow DOM / iframe)에서 같은 코드를 쓴다.
// SCP 콘솔의 목록/생성/삭제 흐름과 제목 형식("<화면명> | <서비스명> | <리전> | Console")만 흉내 낸다.
function mountFakeVpc(root, host) {
  const state = { vpcs: [], selected: null };
  const view = root.getElementById ? root.getElementById('view') : root.querySelector('#view');
  const modalRoot = root.getElementById
    ? root.getElementById('modal-root')
    : root.querySelector('#modal-root');
  const $ = (id) => (root.getElementById ? root.getElementById(id) : root.querySelector('#' + id));
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const setTitle = (screen) => host.setTitle(screen + ' | VPC | kr-west1 | Console');
  root
    .querySelectorAll('nav button')
    .forEach((b) => b.addEventListener('click', () => host.setHash('#' + b.dataset.route)));
  function render() {
    const route = host.getHash().replace(/^#/, '') || '/vpc/dashboard';
    modalRoot.innerHTML = '';
    if (route === '/vpc/dashboard') {
      setTitle('Service Home');
      view.innerHTML = '<h1>VPC 대시보드</h1><p>VPC ' + state.vpcs.length + '개</p>';
      return;
    }
    if (route === '/vpc/subnet/list') {
      setTitle('Subnet 목록');
      view.innerHTML = '<h1>Subnet</h1><p>총 0</p>';
      return;
    }
    if (route === '/vpc/vpc/create') {
      setTitle('VPC 생성');
      renderCreate();
      return;
    }
    setTitle('VPC 목록');
    renderList();
  }
  function renderList() {
    const rows = state.vpcs
      .map(
        (v, i) =>
          `<tr><td><input type="checkbox" aria-label="선택: ${esc(v.name)}" data-i="${i}"></td><td>${esc(v.name)}</td><td>${esc(v.cidr)}</td><td>${esc(v.status)}</td></tr>`,
      )
      .join('');
    view.innerHTML = `<h1>VPC</h1><div class="toolbar"><span>총 ${state.vpcs.length}</span><input type="search" placeholder="검색" aria-label="검색"><button type="button" id="delete" disabled>삭제</button><button type="button" id="create">VPC 생성</button></div>
      <table><thead><tr><th></th><th>이름</th><th>IP 대역</th><th>상태</th></tr></thead><tbody>${rows || '<tr><td colspan="4">데이터가 없습니다</td></tr>'}</tbody></table>`;
    $('create').addEventListener('click', () => host.setHash('#/vpc/vpc/create'));
    const del = $('delete');
    view.querySelectorAll('input[type=checkbox]').forEach((c) =>
      c.addEventListener('change', () => {
        state.selected = c.checked ? Number(c.dataset.i) : null;
        del.disabled = state.selected === null;
      }),
    );
    del.addEventListener('click', () => {
      const v = state.vpcs[state.selected];
      modalRoot.innerHTML = `<div class="modal" role="dialog" aria-label="VPC 삭제"><div class="box"><h2>VPC 삭제</h2><p>${esc(v.name)} 을(를) 삭제하시겠습니까?</p><button type="button" id="cancel">취소</button> <button type="button" id="confirm">삭제</button></div></div>`;
      $('cancel').addEventListener('click', () => (modalRoot.innerHTML = ''));
      $('confirm').addEventListener('click', () => {
        state.vpcs.splice(state.selected, 1);
        state.selected = null;
        render();
      });
    });
  }
  function renderCreate() {
    view.innerHTML = `<h1>VPC 생성</h1>
      <div class="form-row"><label for="name">VPC 이름</label><br><input id="name" type="text" placeholder="이름을 입력하세요"></div>
      <div class="form-row"><label for="cidr">IP 대역(CIDR)</label><br><input id="cidr" type="text" placeholder="예: 10.0.0.0/16"></div>
      <div class="form-row"><label for="desc">설명</label><br><input id="desc" type="text"></div>
      <p class="error hidden" id="err"></p>
      <button type="button" id="cancel">취소</button> <button type="button" id="submit">생성</button>`;
    $('cancel').addEventListener('click', () => host.setHash('#/vpc/vpc/list'));
    $('submit').addEventListener('click', () => {
      const name = $('name').value.trim();
      const cidr = $('cidr').value.trim();
      const err = $('err');
      if (!name || !/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(cidr)) {
        err.textContent = '이름과 IP 대역을 확인하세요.';
        err.classList.remove('hidden');
        return;
      }
      state.vpcs.push({ name, cidr, status: 'Active' });
      host.setHash('#/vpc/vpc/list');
    });
  }
  host.onHashChange(render);
  render();
}
const FAKE_VPC_MARKUP = `
<style>
  :host, body { font-family: sans-serif; }
  nav button { display: block; margin: 4px 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  .toolbar { display: flex; gap: 8px; margin: 12px 0; }
  .form-row { margin: 10px 0; }
  .modal { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; }
  .modal .box { background: #fff; padding: 24px; min-width: 320px; }
  .hidden { display: none; }
  .error { color: #b00020; }
</style>
<div style="display:flex; gap:24px">
  <nav aria-label="VPC 메뉴">
    <button type="button" data-route="/vpc/dashboard">Service Home</button>
    <button type="button" data-route="/vpc/vpc/list">VPC</button>
    <button type="button" data-route="/vpc/subnet/list">Subnet</button>
  </nav>
  <main id="view" style="flex:1"></main>
</div>
<div id="modal-root"></div>`;
