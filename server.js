// Servidor do Vale dos Canhões: entrega o index.html, lista as salas abertas e repassa mensagens entre os jogadores.
// Cada sala tem um líder; se o líder sair, a liderança passa para o jogador mais antigo da sala.
// Até 8 conexões por sala (4 jogadores + espectadores). Salas podem ter senha.
const http = require('http'), fs = require('fs'), { WebSocketServer } = require('ws');

const rooms = new Map(), MAX = 8;
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n);
const open = c => c.ws.readyState === 1;

function roomList() {
  const out = [];
  rooms.forEach((r, code) => {
    r.cl = r.cl.filter(open);
    if (!r.meta || !r.cl.length) return;
    const m = r.meta;
    out.push({ code, name: m.name, lead: m.lead, fmt: m.fmt, n: m.n, max: m.max, ig: m.ig, lock: !!r.pw, con: r.cl.length, t: r.t });
  });
  out.sort((a, b) => (a.ig - b.ig) || (b.t - a.t));
  return out.slice(0, 60);
}

const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/rooms') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
    return res.end(JSON.stringify(roomList()));
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(__dirname + '/index.html'));
});
const wss = new WebSocketServer({ server: srv, path: '/ws', maxPayload: 64 * 1024 });

wss.on('connection', (ws, req) => {
  const u = new URL(req.url, 'http://x');
  const room = str(u.searchParams.get('room'), 12).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'X';
  const cid = str(u.searchParams.get('cid') || Math.random().toString(36).slice(2), 24);
  const create = u.searchParams.get('create') === '1', pw = str(u.searchParams.get('pw'), 20);
  const bye = t => { ws.send(JSON.stringify({ t })); ws.close(); };

  let r = rooms.get(room);
  if (r) r.cl = r.cl.filter(open);
  if (create) {
    if (r && r.cl.length) return bye('exists');
    r = { host: null, cl: [], pw, meta: null, t: Date.now() };
    rooms.set(room, r);
  } else {
    if (!r || !r.cl.length) return bye('nf');
    if (r.pw && pw !== r.pw) return bye('badpw');
  }
  if (r.cl.length >= MAX || r.cl.some(c => c.cid === cid)) return bye('full');

  const isHost = r.cl.length === 0;
  if (isHost) r.host = cid;
  const me = { ws, cid };
  r.cl.push(me);
  const cast = (o, all) => { const s = JSON.stringify(o); r.cl.forEach(c => (all || c !== me) && open(c) && c.ws.send(s)); };

  ws.send(JSON.stringify({ t: 'role', h: isHost, host: r.host }));
  if (!isHost) cast({ t: 'join', from: cid });

  ws.on('message', d => {
    let o; try { o = JSON.parse(d); } catch (e) { return; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return;
    if (o.t === 'meta' || o.t === 'pw') { // informações da sala: só o líder atual pode mudar
      if (cid !== r.host) return;
      if (o.t === 'pw') r.pw = str(o.pw, 20);
      else r.meta = { name: str(o.name, 30) || 'Sala', lead: str(o.lead, 14), fmt: o.fmt === '2v2' ? '2v2' : '1v1',
        n: Math.max(0, Math.min(4, o.n | 0)), max: o.max === 4 ? 4 : 2, ig: o.ig ? 1 : 0 };
      return;
    }
    o.from = cid; // o servidor carimba quem enviou
    cast(o);
  });
  ws.on('close', () => {
    r.cl = r.cl.filter(c => c !== me && open(c));
    if (!r.cl.length) { if (rooms.get(room) === r) rooms.delete(room); return; }
    if (r.host === cid) { // passa a liderança para o jogador mais antigo
      r.host = r.cl[0].cid;
      cast({ t: 'host', host: r.host, old: cid }, true);
    }
    cast({ t: 'left', from: cid }, true);
  });
});

srv.listen(process.env.PORT || 8080, '0.0.0.0', () => console.log('Servidor na porta', process.env.PORT || 8080));
