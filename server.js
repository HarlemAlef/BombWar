// Servidor do BombWar: entrega o index.html, lista as salas abertas e repassa mensagens entre os jogadores.
// Cada sala tem um líder; se o líder sair, a liderança passa para o jogador mais antigo da sala.
// Até 8 conexões por sala (4 jogadores + espectadores). Salas podem ter senha.
const http = require('http'), fs = require('fs'), { WebSocketServer } = require('ws');

const rooms = new Map(), MAX = 8;
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n);
const open = c => c.ws.readyState === 1;

// ===== Presença, amigos e ranking (modo de desenvolvimento) =====
// Enquanto o Supabase não está ligado, perfis públicos, amizades e pedidos ficam num arquivo JSON (dev-store.json).
// No plano grátis do Render o disco é apagado a cada deploy/reinício. Com o Supabase, isto passa a vir do Postgres
// e o servidor só cuida de quem está online (e confere o token de login).
const path = require('path');
const STORE = process.env.DEV_STORE || path.join(__dirname, 'dev-store.json');
let store = { profiles: {}, friends: {}, reqs: {} };
try { store = Object.assign(store, JSON.parse(fs.readFileSync(STORE, 'utf8'))); } catch (e) {}
let saveT = null;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { fs.writeFileSync(STORE, JSON.stringify(store)); } catch (e) {} }, 800); };
const online = new Map(); // uid -> { ws, st, room }
const SLOTS = ['hat', 'face', 'body', 'back', 'feet'];
const int = v => Math.max(0, Math.min(1e9, v | 0));
function cleanPub(p, uid) {
  p = p && typeof p === 'object' ? p : {};
  const eq = {}; SLOTS.forEach(k => { const v = p.eq && p.eq[k]; eq[k] = v ? str(v, 16) : null; });
  return { uid, pid: str(p.pid, 8).replace(/\D/g, ''), nick: str(p.nick, 14) || 'Jogador', look: str(p.look, 4) || 'sol', eq, cls: str(p.cls, 4) || 'war',
    wins: int(p.wins), losses: int(p.losses), shots: int(p.shots), hits: int(p.hits), games: int(p.games) };
}
function pubOf(uid) { const p = store.profiles[uid]; if (!p) return null; const o = online.get(uid); return Object.assign({}, p, { on: o ? 1 : 0, st: o ? o.st : 'off', room: o ? o.room : '' }); }
function sendTo(uid, o) { const c = online.get(uid); if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(o)); }
const fr = uid => store.friends[uid] || (store.friends[uid] = []);
const rq = uid => store.reqs[uid] || (store.reqs[uid] = []); // pedidos recebidos por uid
function tellFriends(uid) { const o = online.get(uid); fr(uid).forEach(f => sendTo(f, { t: 'fst', uid, on: o ? 1 : 0, st: o ? o.st : 'off', room: o ? o.room : '' })); }
function nickTaken(nick, uid) { const n = nick.toLowerCase(); return Object.values(store.profiles).some(p => p.uid !== uid && p.nick.toLowerCase() === n); }
function presence(ws) {
  let me = null;
  ws.on('message', d => {
    let o; try { o = JSON.parse(d); } catch (e) { return; }
    if (!o || typeof o !== 'object') return;
    const reply = x => { x.rid = o.rid; if (ws.readyState === 1) ws.send(JSON.stringify(x)); };
    if (o.t === 'hello') {
      const uid = str(o.uid, 40).replace(/[^\w-]/g, ''); if (!uid) return;
      const old = online.get(uid); if (old && old.ws !== ws) try { old.ws.close(); } catch (e) {}
      me = uid; const p = cleanPub(o.pub, uid); const taken = nickTaken(p.nick, uid);
      store.profiles[uid] = p; online.set(uid, { ws, st: 'menu', room: '' }); save(); tellFriends(uid);
      return reply({ t: 'hello', ok: 1, taken });
    }
    if (o.t === 'nick') return reply({ t: 'nick', ok: !nickTaken(str(o.nick, 14), me) });
    if (!me) return;
    switch (o.t) {
      case 'pub': store.profiles[me] = cleanPub(o.pub, me); save(); return;
      case 'status': { const c = online.get(me); if (!c) return; c.st = ['menu', 'lobby', 'game'].includes(o.s) ? o.s : 'menu'; c.room = str(o.room, 12); tellFriends(me); return; }
      case 'nick': return reply({ t: 'nick', ok: !nickTaken(str(o.nick, 14), me) });
      case 'find': { const q = str(o.q, 40).replace(/^#/, ''); let uid = store.profiles[q] ? q : null;
        if (!uid) { const p = Object.values(store.profiles).find(x => x.pid === q || x.nick.toLowerCase() === q.toLowerCase()); uid = p && p.uid; }
        return reply({ t: 'find', p: uid ? pubOf(uid) : null }); }
      case 'online': { const map = {}; (Array.isArray(o.uids) ? o.uids : []).slice(0, 200).forEach(u => { const c = online.get(String(u)); map[u] = { on: c ? 1 : 0, st: c ? c.st : 'off', room: c ? c.room : '' }; }); return reply({ t: 'online', map }); }
      case 'friends': {
        const out = Object.keys(store.reqs).filter(k => store.reqs[k].includes(me));
        return reply({ t: 'friends', list: fr(me).map(pubOf).filter(Boolean), inc: rq(me).map(pubOf).filter(Boolean), out: out.map(pubOf).filter(Boolean) });
      }
      case 'freq': {
        const to = str(o.to, 40); if (to === me || !store.profiles[to]) return reply({ t: 'freq', e: 'Jogador não encontrado.' });
        if (fr(me).includes(to)) return reply({ t: 'freq', e: 'Vocês já são amigos.' });
        if (rq(me).includes(to)) { // a outra pessoa já tinha pedido: viram amigos na hora
          store.reqs[me] = rq(me).filter(x => x !== to); fr(me).push(to); fr(to).push(me); save(); sendTo(to, { t: 'fupd' }); return reply({ t: 'freq', ok: 1 });
        }
        if (!rq(to).includes(me)) rq(to).push(me); save(); sendTo(to, { t: 'freqIn', p: pubOf(me) }); return reply({ t: 'freq', ok: 1 });
      }
      case 'fresp': {
        const from = str(o.from, 40); if (!rq(me).includes(from)) return reply({ t: 'fresp', e: 'Pedido não encontrado.' });
        store.reqs[me] = rq(me).filter(x => x !== from);
        if (o.ok && !fr(me).includes(from)) { fr(me).push(from); fr(from).push(me); }
        save(); sendTo(from, { t: 'fupd' }); return reply({ t: 'fresp', ok: 1 });
      }
      case 'unfriend': { const u = str(o.uid, 40); store.friends[me] = fr(me).filter(x => x !== u); store.friends[u] = fr(u).filter(x => x !== me); save(); sendTo(u, { t: 'fupd' }); return reply({ t: 'unfriend', ok: 1 }); }
      case 'top': { const list = Object.values(store.profiles).filter(p => p.games > 0)
          .sort((a, b) => (b.wins - a.wins) || (b.wins / (b.games || 1) - a.wins / (a.games || 1))).slice(0, 50).map(p => pubOf(p.uid));
        return reply({ t: 'top', list }); }
      case 'invite': { const to = str(o.to, 40); if (fr(me).includes(to)) sendTo(to, { t: 'invite', from: pubOf(me), code: str(o.code, 12) }); return; }
      case 'ping': { const to = str(o.to, 40); sendTo(to, { t: 'fupd' }); return; }
    }
  });
  ws.on('close', () => { if (me && online.get(me) && online.get(me).ws === ws) { online.delete(me); tellFriends(me); } });
}

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
  if (u.searchParams.get('presence') === '1') return presence(ws);
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
