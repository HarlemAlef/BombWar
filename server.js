// Servidor do Vale dos Canhões: entrega o index.html e repassa mensagens entre os jogadores de cada sala.
// O primeiro a entrar numa sala é o líder; até 8 conexões por sala (4 jogadores + espectadores).
const http = require('http'), fs = require('fs'), { WebSocketServer } = require('ws');

const srv = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(__dirname + '/index.html'));
});
const wss = new WebSocketServer({ server: srv, path: '/ws', maxPayload: 64 * 1024 });
const rooms = new Map(), MAX = 8;

wss.on('connection', (ws, req) => {
  const u = new URL(req.url, 'http://x');
  const room = (u.searchParams.get('room') || 'x').slice(0, 12);
  const cid = (u.searchParams.get('cid') || Math.random().toString(36).slice(2)).slice(0, 24);
  let r = rooms.get(room);
  if (!r) { r = { host: null, cl: [] }; rooms.set(room, r); }
  r.cl = r.cl.filter(c => c.ws.readyState === 1);
  if (r.cl.length >= MAX || r.cl.some(c => c.cid === cid)) { ws.send('{"t":"full"}'); return ws.close(); }

  const isHost = r.cl.length === 0;
  if (isHost) r.host = cid;
  const me = { ws, cid };
  r.cl.push(me);
  const cast = o => { const s = JSON.stringify(o); r.cl.forEach(c => c !== me && c.ws.readyState === 1 && c.ws.send(s)); };

  ws.send(JSON.stringify({ t: 'role', h: isHost, host: r.host }));
  if (!isHost) cast({ t: 'join', from: cid });

  ws.on('message', d => {
    let o; try { o = JSON.parse(d); } catch (e) { return; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return;
    o.from = cid; // o servidor carimba quem enviou
    cast(o);
  });
  ws.on('close', () => {
    r.cl = r.cl.filter(c => c !== me);
    if (r.host === cid) { r.cl.forEach(c => c.ws.close()); if (rooms.get(room) === r) rooms.delete(room); }
    else { cast({ t: 'left', from: cid }); if (!r.cl.length && rooms.get(room) === r) rooms.delete(room); }
  });
});

srv.listen(process.env.PORT || 8080, '0.0.0.0', () => console.log('Servidor na porta', process.env.PORT || 8080));
