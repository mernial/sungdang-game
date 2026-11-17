// 웹판 (v2.05): GitHub Pages는 파일 하나 100MB까지라 index.pck를 index.pck.0, .1 … 조각으로 나눠 올린다.
// 엔진이 index.pck를 받으려 하면 조각을 차례로 받아 이어 붙여 하나처럼 건넨다.
(function () {
  var orig = window.fetch.bind(window);
  window.fetch = function (u, o) {
    var s = typeof u === 'string' ? u : (u && u.url) || '';
    if (!/index\.pck(\?|$)/.test(s)) return orig(u, o);
    var parts = [];
    function next(i) {
      return orig('index.pck.' + i, o).then(function (r) {
        if (!r.ok) {
          if (i === 0) throw new Error('pck');
          return new Response(new Blob(parts), { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
        }
        return r.blob().then(function (b) { parts.push(b); return next(i + 1); });
      });
    }
    return next(0);
  };
})();
