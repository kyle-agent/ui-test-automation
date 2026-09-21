(() => {
  // browser-use/jev-ultrafast snapshot.js(MIT) 기반. 한 번의 evaluate 로 보이는 컨트롤·텍스트를 원자적으로 읽고,
  // 실제 DOM 노드 참조를 window.__jevFast.nodes 에 남긴다.
  // 확장 1: cursor:pointer / onclick 인 div·span 도 button 으로 수집한다 (SSO 화면, 일부 위젯).
  // 확장 2: shadow DOM 을 뚫고 수집한다 (micro-app 스타일 격리). iframe 은 browser.ts 가 프레임별로 이 스크립트를 돌린다.
  if (!document.body) return null;
  const cache = (window.__jevFast ||= { ids: new WeakMap(), nodes: new Map(), next: 1 });
  const identity = (e) => {
    if (!cache.ids.has(e)) cache.ids.set(e, cache.next++);
    const id = cache.ids.get(e);
    cache.nodes.set(id, e);
    return id;
  };
  for (const [id, e] of cache.nodes) if (!e.isConnected) cache.nodes.delete(id);
  // shadow root 를 포함해 요소를 모은다 (문서 순서 유지: 호스트 다음에 그 shadow 내용).
  const shadowHosts = [];
  const deepAll = (root, out = []) => {
    for (const e of root.querySelectorAll('*')) {
      out.push(e);
      if (e.shadowRoot) {
        shadowHosts.push(e);
        deepAll(e.shadowRoot, out);
      }
    }
    return out;
  };
  const everything = deepAll(document);
  const deepQuery = (sel) => everything.filter((e) => e.matches(sel));
  const safe = (e) => !['password', 'file', 'hidden'].includes(e.type);
  const visible = (e) =>
    !e.closest('[aria-hidden="true"],[inert]') &&
    e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const name = (e, seen = new Set()) => {
    if (!e || seen.has(e)) return '';
    seen.add(e);
    const root = e.getRootNode();
    const byId = (id) =>
      (root.getElementById ? root.getElementById(id) : null) || document.getElementById(id);
    const referenced = (e.getAttribute('aria-labelledby') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => name(byId(id), seen))
      .filter(Boolean)
      .join(' ');
    return (
      referenced ||
      e.getAttribute('aria-label') ||
      [...(e.labels || [])]
        .map((l) => name(l, seen))
        .filter(Boolean)
        .join(' ') ||
      (['button', 'submit', 'reset'].includes(e.type) ? e.value : '') ||
      e.getAttribute('alt') ||
      (e.tagName === 'INPUT'
        ? ''
        : [...e.childNodes]
            .map((n) =>
              n.nodeType === 3
                ? n.textContent
                : n.nodeType === 1 && n.getAttribute('aria-hidden') !== 'true'
                  ? name(n, seen)
                  : '',
            )
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()) ||
      e.getAttribute('title') ||
      e.getAttribute('placeholder') ||
      ''
    );
  };
  const roles = [
    'button',
    'link',
    'checkbox',
    'radio',
    'switch',
    'tab',
    'menuitem',
    'menuitemradio',
    'option',
    'gridcell',
    'combobox',
    'textbox',
    'searchbox',
    'spinbutton',
  ];
  const selector =
    'a[href],button,input,textarea,select,summary,[contenteditable="true"],' +
    roles.map((role) => '[role="' + role + '"]').join(',');
  const role = (e) => {
    const explicit = e.getAttribute('role');
    if (roles.includes(explicit)) return explicit;
    if (e.tagName === 'BUTTON' || e.tagName === 'SUMMARY') return 'button';
    if (e.tagName === 'A') return 'link';
    if (e.tagName === 'SELECT') return 'combobox';
    if (e.tagName === 'TEXTAREA' || e.isContentEditable) return 'textbox';
    if (e.tagName === 'INPUT') {
      if (['checkbox', 'radio'].includes(e.type)) return e.type;
      if (['button', 'submit', 'reset', 'image'].includes(e.type)) return 'button';
      if (e.type === 'search') return 'searchbox';
      if (e.type === 'number') return 'spinbutton';
      if (['text', 'email', 'url', 'tel'].includes(e.type)) return 'textbox';
    }
    return null;
  };
  // 진짜 컨트롤이 아니지만 클릭 대상인 요소 (cursor:pointer 또는 onclick). 자기 텍스트가 있거나 leaf 인 것만.
  const pointerLike = (e) => {
    if (e.matches(selector) || e.closest(selector) || e.querySelector(selector)) return false;
    if (!(e.hasAttribute('onclick') || getComputedStyle(e).cursor === 'pointer')) return false;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    return own || e.children.length === 0;
  };
  // shadow DOM 을 고려한 hit-test: 최상위 elementFromPoint 가 호스트를 돌려주면 그 shadow 안으로 내려간다.
  const deepFromPoint = (x, y) => {
    let el = document.elementFromPoint(x, y),
      guard = 0;
    while (el && el.shadowRoot && guard++ < 10) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) break;
      el = inner;
    }
    return el;
  };
  cache.role = (e) => role(e) || (pointerLike(e) ? 'button' : null);
  cache.name = name;
  cache.visible = visible;
  cache.deepAll = () => deepAll(document);
  cache.deepFromPoint = deepFromPoint;
  cache.pageKey = () => [
    performance.timeOrigin,
    location.href,
    scrollX,
    scrollY,
    innerWidth,
    innerHeight,
    deepQuery('input,textarea,select')
      .filter(safe)
      .map((e) => [identity(e), e.value, e.checked, e.selectedIndex, e.disabled, e.readOnly]),
  ];
  cache.guard = (e) => {
    if (!e?.isConnected || !visible(e)) return null;
    const scope = e.closest('form,dialog,[role="dialog"],article,li,tr,[role="row"]') || e.parentElement;
    return [
      identity(e),
      cache.role(e),
      name(e),
      e.value ?? null,
      e.checked ?? null,
      e.selectedIndex ?? null,
      e.readOnly ?? null,
      e.matches(':disabled'),
      e.getAttribute('aria-disabled'),
      e.getAttribute('aria-expanded'),
      e.getAttribute('aria-checked'),
      e.getAttribute('aria-selected'),
      e.getAttribute('href'),
      scope?.innerText?.slice(0, 6000) || '',
    ];
  };
  const actions = [];
  const inViewport = (r) =>
    r.width > 0 &&
    r.height > 0 &&
    r.x + r.width / 2 >= 0 &&
    r.y + r.height / 2 >= 0 &&
    r.x + r.width / 2 < innerWidth &&
    r.y + r.height / 2 < innerHeight;
  for (const e of deepQuery(selector)) {
    if (!safe(e) || !visible(e) || e.matches(':disabled') || e.closest('[aria-disabled="true"]')) continue;
    const r = e.getBoundingClientRect(),
      rname = role(e);
    if (!rname || !inViewport(r)) continue;
    if (rname === 'gridcell' && e.querySelector('button,[role="button"]')) continue;
    const base = {
      node: identity(e),
      role: rname,
      label: name(e) || rname,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    };
    for (const key of ['checked', 'selected', 'expanded']) {
      const value = e.getAttribute('aria-' + key);
      if (value !== null) base[key] = value;
    }
    if (['checkbox', 'radio'].includes(e.type)) base.checked = String(e.checked);
    if (e.tagName === 'SELECT') {
      for (const o of e.options)
        if (!o.selected && !o.disabled && !o.closest('optgroup[disabled]'))
          actions.push({
            ...base,
            kind: 'select',
            value: o.value,
            current_value: [...e.selectedOptions].map((o) => o.label).join(', '),
            label: base.label + ' → ' + o.label,
          });
    } else {
      const editable =
        !e.readOnly &&
        e.getAttribute('aria-readonly') !== 'true' &&
        (['textbox', 'searchbox', 'spinbutton'].includes(rname) ||
          (rname === 'combobox' && ['INPUT', 'TEXTAREA'].includes(e.tagName)));
      const value =
        'value' in e
          ? String(e.value)
          : e.isContentEditable || rname === 'combobox'
            ? e.innerText.trim()
            : '';
      actions.push({ ...base, kind: editable ? 'fill' : 'click', value });
      if (editable) actions.push({ ...base, kind: 'click', value, label: 'Open ' + base.label });
    }
  }
  let pointerCount = 0;
  for (const e of everything) {
    if (pointerCount >= 120) break;
    if (!e.matches('div,span,li,td,p,label,i,img,svg')) continue;
    if (!visible(e) || e.closest('[aria-disabled="true"],[inert]') || !pointerLike(e)) continue;
    const r = e.getBoundingClientRect();
    if (!inViewport(r)) continue;
    const label = name(e) || e.id || e.getAttribute('class')?.split(/\s+/)[0] || e.tagName.toLowerCase();
    actions.push({
      node: identity(e),
      role: 'button',
      label,
      pointer: true,
      kind: 'click',
      value: '',
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    });
    pointerCount++;
  }
  // 보이는 텍스트 (shadow root 포함)
  const words = [];
  let length = 0;
  const range = document.createRange();
  const collectText = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) && length < 6000) {
      const value = node.textContent.trim(),
        parent = node.parentElement;
      if (!value || !parent || parent.closest('script,style,noscript,template') || !visible(parent)) continue;
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.top < innerHeight &&
        r.right > 0 &&
        r.left < innerWidth
      ) {
        words.push(value);
        length += value.length;
      }
    }
  };
  collectText(document.body);
  for (const host of shadowHosts) collectText(host.shadowRoot);
  const text = words.join('\n').slice(0, 6000),
    height = document.documentElement.scrollHeight;
  const page_key = cache.pageKey(),
    guards = {};
  for (const a of actions) if (!(a.node in guards)) guards[a.node] = cache.guard(cache.nodes.get(a.node));
  const semantics = actions.map(({ rect, ...action }) => action);
  const marker = [
    performance.timeOrigin,
    location.href,
    scrollX,
    scrollY,
    innerWidth,
    innerHeight,
    document.title,
    text,
    semantics,
    page_key[6],
  ];
  const omitted_actions = Math.max(0, actions.length - 250);
  actions.splice(250);
  actions.forEach((a, i) => (a.id = 'e' + (i + 1)));
  const iframes = [...document.querySelectorAll('iframe')].map((f) => ({
    src: f.getAttribute('src') || '',
    name: f.getAttribute('name') || '',
    id: f.id || '',
  }));
  return {
    url: location.href,
    title: document.title,
    w: innerWidth,
    h: innerHeight,
    text,
    scroll: { y: scrollY, height },
    actions,
    marker,
    page_key,
    guards,
    omitted_actions,
    shadow_hosts: shadowHosts.length,
    iframes,
  };
})();
