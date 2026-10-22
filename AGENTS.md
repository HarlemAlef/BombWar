# AGENTS.md — guia técnico do BombWar (antigo "Vale dos Canhões")

Leia isto **antes** de abrir o código. O objetivo é gastar poucos tokens: `index.html` tem cerca de 1100 linhas muito densas, então **nunca leia o arquivo inteiro**. Ache a seção pelo marcador e leia só o trecho necessário.

## Regras de trabalho

- **Idioma:** o dono do projeto fala português do Brasil. Responda, comente o código e escreva os textos do jogo em pt-BR.
- **Jogabilidade:** está balanceada. Não mude números de jogo (dano, vida, física, tempos) sem pedido explícito.
- **Arquivo único:** o cliente fica todo em `index.html`, sem build nem bundler. A única biblioteca externa é o PeerJS via CDN (usado só no modo P2P, que está oculto). As fontes vêm do Google Fonts.
- **Determinismo online:** é a regra mais importante, veja a seção abaixo.
- **Documentação:** atualize este arquivo e o `README.md` (inclusive o "Histórico de versões") **só quando houver mudança relevante** (novo recurso, mudança de protocolo, nova regra). Correções pequenas não entram.
- **Cópias:** no ambiente de trabalho do Claude existe uma cópia do jogo em `outputs/index.html` e outra em `outputs/servidor-fly/index.html`. As duas precisam ficar idênticas.

## Como achar as coisas

```bash
grep -n "/\* ===" index.html          # lista as seções (os números de linha mudam; não confie em números fixos)
grep -n "^function nomeDaFuncao" index.html
```

| Seção (marcador `/* === ... */`) | O que tem |
|---|---|
| `constantes` | `W,H` (mundo 1600×900), `TW,TH` (máscara 800×450, 2 px por célula), `UW,UH` (interface 1280×720), `WATER`, `VMAX`, `WK` (vento), `TURN=20`, `FUEL`. Também `CL` (**armas**; a chave continua se chamando `cls` no código e na rede; `st` = barras do menu; `rad` = área de dano, `cr` = tamanho da cratera quando é diferente; `bal` = Bola Quicante; `pair` = Morteiro, duas bolas criadas por `mkPair` que usam `q.c` + `q.tw` e se juntam até a idade 100), `LOOK` (um único personagem padrão, chave `sol` mantida por compatibilidade; a escolha de personagem foi removida), `ITEMS`/`ITEM` (50 skins: `s` = espaço, `k` = desenho, `r` = raridade, `g` ouro ou `gm` gemas), `SLOTS`, `RAR`, `cleanEq`, `drawSkin` (desenha cada skin dentro do `drawChar`), `PU` (power-ups, `u` = usos, `rc` = rodadas para recarregar), `DIFF`/`DN` (dificuldade dos bots), variáveis globais, `CFG` (configurações) e `rngf` (gerador aleatório com semente) |
| `áudio (sintetizado)` | objeto `AU`: efeitos e duas músicas feitas com WebAudio, sem arquivos de som |
| `biomas, horários e clima` | `BIO` (11 biomas; campos próprios: `liq`, `gm`, `wk`, `drag`, `fog`, `cur`, `fixT`, `fall`), `TOD` (4 horários) e `TODX` (ambientes fixos da Lua e do mar), `EV` (eventos: `wm` vento, `gm` gravidade, `up` corrente para cima, `meteor`, `bolt`), `tint`/`tcol` |
| `criação da partida` | `newGame(seed,players,opt)`, `paint` (material), `makeTerrain` (formato por `B.shape`; prédios em `G.bld`, cogumelos), `makeBg`, `makeDecor`/`drawDecor`/`decorHit`, `evStep`/`evApply` (clima), `meteorHit`/`flushMet` (meteoros), `strike` (raio) |
| `turnos` | `startTurn`, `recharge`, `useItem`, `hurt`, `checkOver`, `showOver`, `endTurn` |
| `tiros, power-ups, física e explosões` | `mkProj`, `fire` (power-ups), `phys` (gravidade, vento, corrente `G.up`, arrasto do mar), `hit` (5 = quica: cogumelo ou 1º toque da Bola Quicante), `bounce`, `boom`, `teleport`, `carve` (cratera; material duro), `explode`, `fx`, `splash`, `die` |
| `IA com mira balística` | `simShot` (simula o tiro com a mesma `phys`), `planAI` (busca grossa e depois fina; erro conforme `p.df`), `aiStep`, `botSay` |
| `entrada` | teclado, botões de toque, chat (`sendChat`, `chat`, `bubble`/`drawBubble`), `openCfg` (painel ⚙) |
| `loop de lógica` | `pumpQ` (fila de turnos online), `update()` a 60 Hz fixos |
| `render` | `drawChar(g,arma,x,y,f,ang,cor,t,burn,look)`, `drawP`, `lpOff`/`drawProj` (giro de 360° só visual), `sky` (ambiente animado por bioma), `water` (água, lava, abismo, nuvens, vazio), `column`, `wxUpdate` (clima, ambiente, meteoros), `weather` (chuva, raios, meteoros), `fogLayer` (névoa do cemitério), `vignette`, `panel`, `dial`, `bottom`, `hud`, `draw`. Também `step`/`loop`: `requestAnimationFrame` com `setInterval` de reserva, para o tempo correr com a aba em segundo plano |
| `sala (lobby)` | objeto `L`, `lobbyNew`, `offLobby`, `pushLobby`, `sendMeta`, `newHost` (passagem de liderança), `hostApply`, `setFmt`, `addBot`, `botDf`, `setOpt`, `hostStart`, `startOnline`, `renderLobby` |
| `menu-cidade` (penúltimo `<script>`) | `CITY`: menu depois do login, desenhado no canvas `#bg`. Mundo 1600×900, rua em `WY=592`; prédios em `B` (`k`: inv, shop, arena, rank, fr; `x`, `w`, `h`, `ly` = altura da placa). `DRAW[k]` desenha cada prédio uma vez num canvas guardado (`buildSprites`); o fundo parado vai para `bgc` (`buildBg`). `frame()` desenha a cada quadro só luzes, bandeira, portão, fumaça, troféus, vaga-lumes, reflexos e fogos (`fireworks`). Os botões são HTML (`.bld` com `.plq` e `.goa`), posicionados por `place()`; passar o mouse liga `CITY.hov` (prédio cresce e brilha). Ações em `BLD` (`goScreen` / `showBrowse`) |
| `fundo animado` (último `<script>`) | `BG`: batalha de demonstração só visual, **só na tela de login** (`#auth`); nas outras telas o mesmo loop chama `CITY.frame`. Canvas `#bg`, z-index 4; as telas têm classe `see` (`see dim` escurece). Motor próprio e pequeno (terreno em `hm`, tiros, crateras, partículas); **não usa `G`, nem som, nem estatística**. Reaproveita `drawChar`, `ITEMS`, `BIO`, `TOD`, `TEAM`. `BG.next()` pula de cena (teste), `BG.burst()` é a explosão quando a logo aparece. A logo é HTML/CSS (`.logo`, `.bomb`) |
| `câmera` (logo depois da entrada) | `CAM` {z, x, y, alvos tz/tx/ty, follow}: zoom de 1 (mapa todo) a 3. **Só visual**: `draw()` usa `camView()` no `setTransform`; a simulação e a rede não mudam. Pinça/roda (`zoomAt`), arrastar, toque duplo, `camStep` (segue o tiro ou quem está na vez enquanto `follow`), `minimap()`/`mmRect` no HUD (abaixo dos painéis da direita), `offscreen()` segue a câmera. `camReset()` em `begin` |
| `rede` | `send`, `onMsg` (todas as mensagens do jogo), `lost`; `p2pHost`/`p2pJoin` (P2P oculto) |
| `servidor: lista de salas e conexão` | `srvAddr`, `showBrowse`, `loadRooms`/`renderRooms` (`GET /rooms`), `wsJoin` |
| `contas, armazém, loja, amigos e ranking` | `SUPA` (chaves; vazio = modo local), `START`/`REWARD`, `ACC` (conta atual), `PS` (conexão de presença), `LocalDB` e `SupaDB` (mesma interface; `DB` escolhe), `drawIcon`/`drawFig`/`drawAv`, login (`showAuth`, `doSignIn`, `createAcc`, `onLogin`), `renderInv`/`equip`/`dragSrc`, `renderShop`/`buyFlow`, `openProfile`, `social` (amigos), `renderRank` |
| `menu` | `begin(seed,players,opt)` (fecha inventário/loja/perfil e o cartão ao começar a partida) e ligação de todos os botões (`$('id').onclick`), inclusive `BLD` (prédios da cidade), `goFull`/`fsUI` (tela cheia + travar paisagem) e `cardOn()` (cartão no menu, salas e sala). O `#menu` antigo (armas, Jogar Offline desativado, `mnav`) fica escondido em `#mold`, porque o código ainda usa esses ids. Abertura: `#auth` começa visível com `#a0` ("Carregando...") e o `#menu` escondido, para não piscar o menu antes do login |

O estado global da partida fica em `G`, criado do zero por `newGame` a cada partida (reset total). Os campos principais são:

- `G.pl[]`: jogadores, com `i, team, ctl ('human'|'bot'|'remote'), cid, cls (arma), look, hp, x, y, ang, f, items, cd, arm {x2,ty}, df, bub, gone`.
- `G.t`: índice de quem joga. `G.turn`: contador de turnos.
- `G.state`: `'aim' | 'fly' | 'wait' | 'over'`.
- `G.wind`, `G.mask` (Uint8Array do terreno: 0 vazio, 1 normal, 2 duro, 3 quicante), `G.tc` (canvas do terreno), `G.B`/`G.T` (bioma e horário), `G.ev`, `G.wm`, `G.gm`, `G.up`, `G.dec`, `G.q`.

Vagas e times: vagas 0 e 2 são o Time Azul (`team 0`), vagas 1 e 3 são o Time Rosa (`team 1`). A ordem dos turnos é dada por `nextT()`.

## Determinismo e rede (não quebre)

- **Cada cliente simula a partida inteira localmente** a partir da mesma `seed`, enviada na mensagem `go`. Terreno, vento, bioma, horário e eventos de clima saem de `G.r` (gerador com semente).
  - **Toda chamada a `G.r()` precisa acontecer na mesma ordem em todos os clientes.** Por isso o sorteio fica em `newGame`, `makeTerrain`, `makeBg` e `startTurn`/`evStep`.
  - Para algo só visual, use `Math.random()` ou outro `rngf` separado, como faz `makeDecor`.
  - **Meteoros** caem com animação, mas a cratera é aplicada por `flushMet()` antes de qualquer tiro, fim de turno ou plano da IA. **Raios** caem em `startTurn` (via `evStep`). Assim o terreno é o mesmo em todos os clientes no momento do tiro.
  - A mensagem `fire` leva `x`, `y` e `vy` do atirador (ele pode estar caindo numa cratera aberta por raio ou meteoro).
- **Quem manda em cada turno:** só o cliente de quem está jogando (`isAuth()`) envia `st` (posição e mira, a cada 4 ticks), `fire`, `item` e `turn`. O fim do turno leva hp, x e queimadura de todos e corrige pequenas diferenças.
- **Papel do líder (`isHost`):** controla os bots, os jogadores que saíram (`gone`) e o "watchdog" (força o fim do turno de um jogador travado com `force:1`).
- **Fila de turnos:** mensagens `turn` recebidas entram em `G.q` e são aplicadas em ordem de `tn` por `pumpQ()`.
- **Validação do remetente:** o cliente confere o `from` de cada mensagem. O servidor carimba o `from` em tudo o que repassa, então um cliente não consegue se passar por outro.

### Mensagens de cliente para cliente (repassadas pelo servidor)

| Tipo | Quem envia | Conteúdo |
|---|---|---|
| `hi` | quem entra | `name`, `cls` (arma), `look` |
| `cls`, `look`, `slot`, `ready` | membro | arma / personagem / vaga / pronto (o líder aplica em `hostApply`) |
| `lobby` | líder | objeto `L` completo |
| `go` | líder | `seed`, `players[{cid,name,cls,look,bot,df}]`, `map`, `tod` |
| `st`, `fire`, `item`, `turn` | jogador da vez (ou o líder, no caso de bots) | sempre com `pi` e `tn`; `fire` tem `x,y,vy,ar`; `turn` tem `hp,bn,x,f` |
| `chat`, `sys`, `quit` | todos / líder / líder | — |

### Mensagens do servidor

| Tipo | Quando |
|---|---|
| `role` | ao conectar: `{h, host}` (se você é o líder e quem é o líder) |
| `join`, `left` | entrada ou saída de alguém, com `from` |
| `host` | novo líder: `{host, old}`, **sem `from`**. O cliente só aceita se não houver `from` |
| `exists`, `nf`, `badpw`, `full` | erros ao criar ou entrar numa sala |

Mensagens que o servidor intercepta e **não** repassa: `meta` (nome, líder, formato, vagas e "em partida", usados na lista de salas) e `pw` (troca de senha). Só são aceitas do líder atual. A senha fica só no servidor.

### Objeto da sala

```
L = {code, mode, name, dn, lock, off, fmt, map, tod, host,
     mem: {cid: {name, cls, look, st, bot, ready, df}},
     slots: [cid | null] × 4, nb}
```

- `dn = true`: a sala usa o nome padrão "Sala de (líder)". Ele é renomeado quando a liderança passa.
- `off = 1`: sala offline. É a mesma interface, com `isHost = true` e `net = null`.

## server.js

- `GET /rooms`: lista de salas em JSON.
- `GET` em qualquer outro caminho: entrega o `index.html`.
- WebSocket `/ws?room=CÓDIGO&cid=ID&create=1&pw=SENHA`.
- Até 8 conexões por sala. Quando a última pessoa sai, a sala é apagada. Se o líder sai, o próximo da lista (o mais antigo) vira líder.
- Porta: `process.env.PORT` (padrão 8080).

## Armazenamento local (localStorage)

| Chave | Conteúdo |
|---|---|
| `vdc-name` | nome do jogador (o prefixo `vdc-` ficou do nome antigo; não troque, senão quem já joga perde as configurações) |
| `vdc-audio` | música e sons ligados ou desligados |
| `vdc-cfg` | `{touch}` (botões na tela) |
| `vdc-wpn` | última arma escolhida (`vdc-look` não é mais usado) |
| `vdc-accounts`, `vdc-session` | contas do modo local e a conta logada (some quando o Supabase for ligado) |
| `vdc-srv` | endereço do servidor, só quando o jogo é aberto como arquivo local (`file://`) |

## Como testar (já usado no projeto)

- **Sintaxe:**
  ```bash
  node -e "const s=require('fs').readFileSync('index.html','utf8');new Function(s.split('<script>')[1].split('</script>')[0])"
  ```
- **Servidor local:** `PORT=8099 node server.js` (precisa de `ws` em `node_modules`).
- **Navegador:** Playwright (Python) com vários `browser.new_context()`, um por jogador, contra `http://localhost:8099/`.
  - Para disparar: `page.evaluate("(()=>{const p=G.pl[G.t];p.ang=45;G.pw=70;doFire()})()")` quando `canAct()` for verdadeiro.
  - Para checar sincronia, compare `[G.state, G.turn, G.wind, G.ev, hp]` entre os clientes.
  - Funções úteis no console: `setOpt('map','neve')`, `addBot(1)`, `evApply()`, `G.ev = {k:'tor', end:999, x:800}`.
- **O que não dá para testar no ambiente de nuvem:** o modo P2P (precisa do broker do PeerJS) e o som.

## Contas e banco de dados

- **Interface única:** todo acesso a dados passa por `DB`: `SupaDB` (ligado; `SUPA` = projeto `zfqzzzidzyfbmwqlxpjp` + chave publicável) ou `LocalDB` (se `SUPA` ficar vazio). Métodos: `load, signIn, signOut, checkNick, create, update, buy, addMatch, find, getProfile, friends, request, respond, unfriend, top`.
- **Conta (`ACC`):** `uid, pid (ID de 8 números), nick, email, guest, look, eq {hat,face,body,back,feet}, inv [ids], cls, gold, gems, wins, losses, shots, hits, games`.
- **Presença (`PS`, WebSocket `/ws?presence=1`):** mensagens `hello, pub, status {s: menu|lobby|game, room}, nick, find, online, friends, freq, fresp, unfriend, top, invite, ping`. O servidor avisa `fst` (status de amigo), `freqIn` (pedido novo), `fupd` (lista mudou) e `invite`.
- **Na sala:** `hi` leva `eq, uid, pid`; a mensagem `eq` troca o equipamento; `go` leva `eq` e `uid` de cada jogador; `newGame` guarda `p.eq`. Toda skin vinda da rede passa por `cleanEq`.
- **Supabase:** `db/schema.sql` (testado num Postgres 16 local com um `auth` simulado). Cliente: supabase-js 2.105.4 (UMD pelo jsDelivr), `flowType:'implicit'` (o link do e-mail funciona em outro aparelho). `SupaDB.load` devolve a conta, ou `{uid, nick:''}` quando há sessão sem perfil (volta do link/Google): o início do jogo abre direto a escolha de apelido. O jogador só pode gravar `nick, look, weapon, guest` (ao criar) e `look, eq, weapon` (depois); o gatilho `check_eq` impede equipar item que não tem; ouro, gemas e estatísticas só mudam por `buy_item` ou `record_result` (só service_role). Testado com um Supabase simulado (falso `supabase-js` no navegador + servidor HTTP falso); falta o teste com o projeto real.
- **Servidor com Supabase** (variáveis `SUPABASE_URL` e `SUPABASE_SECRET` no Render): `hello` leva `token` e o servidor confere em `/auth/v1/user` (cache de 5 min); `result {win,shots,hits}` grava via `/rest/v1/rpc/record_result` (+60 ouro vitória, +20 derrota; no máximo 1 a cada 30 s por jogador; tiros ≤ 80). Amigos para status e convites vêm de `friendships` (`loadFriends`, recarregado no `ping`). Nesse modo o `dev-store.json` não é gravado. Convidados (login anônimo) também se conectam à presença para gravar partidas.
- **Ranking só sem bots:** o servidor guarda, a cada `go` do líder, `r.go = {uids, bots, done}`. No `result`, ele acha a sala pelo `status.room` do jogador: ranqueada = `bots === 0`, 2+ jogadores e o jogador na lista; um resultado por partida (`done`). Sem sala/partida: não ranqueada (+20 ouro, 1 a cada 30 s). `record_result(..., p_ranked)`: com `false` só soma ouro. No modo local, `recordMatch` calcula `ranked` pelo `G.pl` (nenhum `bot`).
- **Ainda falta:** o resultado é informado pelo próprio jogador (o servidor só confere quem é e limita os valores); convidado que cria conta começa uma conta nova (sem migrar o progresso).

## Limitações conhecidas

- `goScreen` volta para a tela de origem (`backTo`: menu, `browse` ou `lobby`); na sala, voltar manda `eq` para todos. Durante a partida (`inGame`) inventário, loja, amigos e ranking não abrem.
- As salas ficam só na memória do servidor. No plano gratuito do Render, elas somem quando o servidor dorme ou reinicia.
- O P2P não tem servidor TURN: falha em algumas redes (4G, redes de empresa).
- Fogo amigo está ligado: o tiro também acerta o próprio time.
- No modo local, a conta fica no aparelho e o servidor confia no `uid` enviado (é só para desenvolvimento).
- Com Supabase, vitória/derrota e tiros são informados pelo cliente (o servidor não simula a partida). Para um ranking competitivo, o próximo passo é o servidor conferir o resultado com os outros jogadores da sala.
