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
const save = () => { if (sbOn) return; clearTimeout(saveT); saveT = setTimeout(() => { try { fs.writeFileSync(STORE, JSON.stringify(store)); } catch (e) {} }, 800); };
const online = new Map(); // uid -> { ws, st, room }

// ===== Supabase (quando SUPABASE_URL e SUPABASE_SECRET estão nas variáveis de ambiente) =====
// O servidor confere o login de cada jogador (token do Supabase) e grava o resultado das partidas com a chave secreta.
// Perfis, amigos, loja e ranking vêm direto do banco pelo jogo; aqui fica só quem está online e os convites.
const SB = { url: (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, ''), key: (process.env.SUPABASE_SECRET || '').trim() };
const sbOn = !!(SB.url && SB.key);
async function sbFetch(p, opt = {}) {
  const r = await fetch(SB.url + p, Object.assign({}, opt, { headers: Object.assign({ apikey: SB.key, 'content-type': 'application/json' }, opt.headers || {}) }));
  const t = await r.text();
  if (!r.ok) throw new Error(r.status + ' ' + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
const tokCache = new Map(); // token -> { uid, t }
async function userOf(token) {
  if (!token || typeof token !== 'string' || token.length > 4000) return null;
  const c = tokCache.get(token); if (c && Date.now() - c.t < 5 * 60e3) return c.uid;
  try {
    const u = await sbFetch('/auth/v1/user', { headers: { authorization: 'Bearer ' + token } });
    if (!u || !u.id) return null;
    if (tokCache.size > 5000) tokCache.clear();
    tokCache.set(token, { uid: u.id, t: Date.now() }); return u.id;
  } catch (e) { return null; }
}
const sbFr = new Map(); // uid -> [amigos], lido do banco
async function loadFriends(uid) {
  if (!sbOn || !uid) return;
  try { const rows = await sbFetch('/rest/v1/friendships?select=b&a=eq.' + encodeURIComponent(uid)); sbFr.set(uid, rows.map(r => r.b)); } catch (e) { console.log('amigos', e.message); }
}
const lastRes = new Map(); // uid -> hora do último resultado gravado
if (sbOn) console.log('Supabase ligado:', SB.url); else console.log('Supabase desligado: modo de desenvolvimento (dev-store.json)');
const SLOTS = ['hat', 'face', 'body', 'back', 'feet', 'vwar', 'vsni', 'vmag', 'vart', 'vbal']; // roupas + uma skin por veículo
const int = v => Math.max(0, Math.min(1e9, v | 0));
function cleanPub(p, uid) {
  p = p && typeof p === 'object' ? p : {};
  const eq = {}; SLOTS.forEach(k => { const v = p.eq && p.eq[k]; eq[k] = v ? str(v, 16) : null; });
  return { uid, pid: str(p.pid, 8).replace(/\D/g, ''), nick: str(p.nick, 14) || 'Jogador', look: str(p.look, 4) || 'sol', eq, cls: str(p.cls, 4) || 'war',
    wins: int(p.wins), losses: int(p.losses), shots: int(p.shots), hits: int(p.hits), games: int(p.games) };
}
function pubOf(uid) { const p = store.profiles[uid]; if (!p) return null; const o = online.get(uid); return Object.assign({}, p, { on: o ? 1 : 0, st: o ? o.st : 'off', room: o ? o.room : '' }); }
function sendTo(uid, o) { const c = online.get(uid); if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(o)); }
const fr = uid => sbOn ? (sbFr.get(uid) || []) : (store.friends[uid] || (store.friends[uid] = []));
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
      if (sbOn) { // confere no Supabase que o token é mesmo desse jogador
        userOf(o.token).then(async real => {
          if (real !== uid) return reply({ t: 'hello', e: 'Sessão expirada. Saia e entre de novo.' });
          const old = online.get(uid); if (old && old.ws !== ws) try { old.ws.close(); } catch (e) {}
          me = uid; store.profiles[uid] = cleanPub(o.pub, uid); online.set(uid, { ws, st: 'menu', room: '' }); // perfil só em memória (convites)
          await loadFriends(uid); tellFriends(uid); reply({ t: 'hello', ok: 1 });
        });
        return;
      }
      const old = online.get(uid); if (old && old.ws !== ws) try { old.ws.close(); } catch (e) {}
      me = uid; const p = cleanPub(o.pub, uid); const taken = nickTaken(p.nick, uid);
      store.profiles[uid] = p; online.set(uid, { ws, st: 'menu', room: '' }); save(); tellFriends(uid);
      return reply({ t: 'hello', ok: 1, taken });
    }
    if (o.t === 'nick') return reply({ t: 'nick', ok: !nickTaken(str(o.nick, 14), me) });
    if (!me) return;
    switch (o.t) {
      case 'pub': store.profiles[me] = cleanPub(o.pub, me); if (!sbOn) save(); return;
      case 'result': { // fim de partida: só com Supabase
        if (!sbOn) return reply({ t: 'result', e: 'off' });
        // ranqueada = a última partida iniciada na sala do jogador era só de jogadores (sem bots), com ele dentro; 1 resultado por partida
        const c = online.get(me), rm = c && c.room ? rooms.get(c.room.toUpperCase().replace(/[^A-Z0-9]/g, '')) : null, gm = rm && rm.go;
        const inGo = !!(gm && gm.uids.includes(me));
        if (inGo) { if (gm.done.has(me)) return reply({ t: 'result', e: 'repetido' }); gm.done.add(me); }
        const now = Date.now(); if (!inGo && now - (lastRes.get(me) || 0) < 30e3) return reply({ t: 'result', e: 'cedo' });
        lastRes.set(me, now);
        const ranked = inGo && gm.bots === 0 && gm.uids.length >= 2;
        const shots = Math.max(0, Math.min(80, o.shots | 0)), hits = Math.max(0, Math.min(shots, o.hits | 0)), win = !!o.win, gold = ranked ? (win ? 60 : 20) : 20;
        sbFetch('/rest/v1/rpc/record_result', { method: 'POST', body: JSON.stringify({ p_user: me, p_win: win, p_shots: shots, p_hits: hits, p_gold: gold, p_ranked: ranked }) })
          .then(() => reply({ t: 'result', ok: 1, gold, ranked: ranked ? 1 : 0 }))
          .catch(e => { console.log('record_result', e.message); reply({ t: 'result', e: 'falhou' }); });
        return;
      }
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
      case 'ping': { const to = str(o.to, 40); if (sbOn) { loadFriends(me); loadFriends(to); } sendTo(to, { t: 'fupd' }); return; }
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

const STATIC = { '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'], '/icon-192.png': ['icon-192.png', 'image/png'], '/icon-512.png': ['icon-512.png', 'image/png'] };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const sf = STATIC[u.pathname]; // ícones e manifesto (instalar o jogo na tela inicial do celular)
  if (sf) { try { const b = fs.readFileSync(path.join(__dirname, sf[0])); res.writeHead(200, { 'content-type': sf[1], 'cache-control': 'public, max-age=86400' }); return res.end(b); } catch (e) {} }
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
  const create = u.searchParams.get('create') === '1', pw = str(u.searchParams.get('pw'), 20), uid = str(u.searchParams.get('uid'), 40).replace(/[^\w-]/g, '');
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
  if (r.ban) { const now = Date.now(); for (const [k, t] of r.ban) if (t < now) r.ban.delete(k); if ((uid && r.ban.has(uid)) || r.ban.has(cid)) return bye('kicked'); }
  if (r.cl.length >= MAX || r.cl.some(c => c.cid === cid)) return bye('full');

  const isHost = r.cl.length === 0;
  if (isHost) r.host = cid;
  const me = { ws, cid, uid };
  r.cl.push(me);
  const cast = (o, all) => { const s = JSON.stringify(o); r.cl.forEach(c => (all || c !== me) && open(c) && c.ws.send(s)); };

  ws.send(JSON.stringify({ t: 'role', h: isHost, host: r.host }));
  if (!isHost) cast({ t: 'join', from: cid });

  ws.on('message', d => {
    let o; try { o = JSON.parse(d); } catch (e) { return; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return;
    if (o.t === 'kick') { // expulsar: só o líder; fecha a conexão do jogador e bloqueia a volta por 10 minutos
      if (cid !== r.host) return;
      const tg = r.cl.find(c => c.cid === str(o.cid, 24) && c !== me); if (!tg) return;
      r.ban = r.ban || new Map(); const until = Date.now() + 10 * 60e3; r.ban.set(tg.cid, until); if (tg.uid) r.ban.set(tg.uid, until);
      try { tg.ws.send(JSON.stringify({ t: 'kicked' })); tg.ws.close(); } catch (e) {}
      return;
    }
    if (o.t === 'meta' || o.t === 'pw') { // informações da sala: só o líder atual pode mudar
      if (cid !== r.host) return;
      if (o.t === 'pw') r.pw = str(o.pw, 20);
      else r.meta = { name: str(o.name, 30) || 'Sala', lead: str(o.lead, 14), fmt: o.fmt === '2v2' ? '2v2' : '1v1',
        n: Math.max(0, Math.min(4, o.n | 0)), max: o.max === 4 ? 4 : 2, ig: o.ig ? 1 : 0 };
      return;
    }
    if (o.t === 'go' && cid === r.host && Array.isArray(o.players)) { // guarda quem está na partida (para o ranking só contar partidas sem bots)
      const ps = o.players.slice(0, 8);
      r.go = { uids: ps.filter(p => p && !p.bot && p.uid).map(p => str(p.uid, 40)), bots: ps.filter(p => p && p.bot).length, done: new Set() };
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
