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
| `constantes` | `W,H` (mundo 1600×900), `TW,TH` (máscara 800×450, 2 px por célula), `UW,UH` (interface 1280×720), `WATER`, `VMAX`, `WK` (vento), `TURN=20`, `FUEL`. Também `CL` (**veículos**, antes armas; a chave continua se chamando `cls` no código e na rede; `n` = nome do veículo, `w` = tipo de tiro; `st` = barras do menu; `rad` = área de dano, `cr` = tamanho da cratera quando é diferente; `bal` = Bola Quicante; `pair` = Morteiro, duas bolas criadas por `mkPair` que usam `q.c` + `q.tw` e `mortOff` (`MORT.T` = 150, `MORT.A` = 70); para power-ups conta como um projétil: só a bola `tw = 1` chama a chuva, e a Bomba pesada dá metade do bônus a cada bola), `LOOK` (um único personagem padrão, chave `sol` mantida por compatibilidade; a escolha de personagem foi removida), `ITEMS`/`ITEM` (50 skins de personagem + 25 de veículo: `s` = espaço, `k` = desenho, `r` = raridade, `g` ouro ou `gm` gemas; as de veículo têm `v` = veículo, `s` = `'v'+veículo`, `k` = estilo do corpo, `c1..c3`, `dec`, `pj` (projétil), `ex` (explosão)), `SLOTS` (só roupas), `VK` (espaços de veículo `vwar…vbal`), `RAR`, `cleanEq` (roupas + `VK`), `drawSkin` (desenha cada skin dentro do `drawChar`), `PU` (power-ups, `u` = cargas — todos com 1 —, `rc` = rodadas para recarregar; a chuva usa `frag` com 70 de dano que não é dobrado pelo Dano x2: `q.x2`), `DIFF`/`DN` (dificuldade dos bots), variáveis globais, `CFG` (configurações) e `rngf` (gerador aleatório com semente) |
| `áudio (sintetizado)` | objeto `AU`: efeitos e duas músicas feitas com WebAudio, sem arquivos de som |
| `biomas, horários e clima` | `BIO` (11 biomas; campos próprios: `liq`, `gm`, `wk`, `drag`, `fog`, `cur`, `fixT`, `fall`), `TOD` (4 horários) e `TODX` (ambientes fixos da Lua e do mar), `EV` (eventos: `wm` vento, `gm` gravidade, `up` corrente para cima, `meteor`, `bolt`), `tint`/`tcol` |
| `criação da partida` | `spawnXs(N, r)` (posições sorteadas pela semente: chão firme, 110 px entre todos, 180 px até o inimigo mais perto, 1v1 entre 380 e 1300 px, no 2v2 o aliado não pode ficar muito mais longe que os dois inimigos), `newGame(seed,players,opt)` (também sorteia `G.t`, quem começa, e vira cada um para o inimigo mais perto), `paint` (material), `makeTerrain` (formato por `B.shape`; prédios em `G.bld`, cogumelos), `makeBg`, `makeDecor`/`drawDecor`/`decorHit`, `evStep`/`evApply` (clima), `meteorHit`/`flushMet` (meteoros), `strike` (raio) |
| `turnos` | `startTurn`, `recharge`, `useItem`, `hurt`, `checkOver`, `showOver` (+ `podium(w)`: canvases `PODF` desenhados por `drawPod` no laço `PV`), `endTurn` |
| `tiros, power-ups, física e explosões` | `mkProj`, `fire` (power-ups), `phys` (gravidade, vento, corrente `G.up`, arrasto do mar), `hit` (5 = quica: cogumelo ou 1º toque da Bola Quicante), `bounce`, `boom`, `teleport`, `carve` (cratera; material duro), `explode`, `fx`, `splash`, `die` |
| `IA com mira balística` | `simShot` (simula o tiro com a mesma `phys`), `planAI` (busca grossa e depois fina; erro conforme `p.df`; com Avião disponível e `inHole(p)` ou melhor tiro ruim (`b.d > 140`) usa `planTp`, que simula o voo e escolhe um pouso firme, alto e a ~550 px do inimigo), `aiStep`, `botSay` |
| `entrada` | teclado, botões de toque, chat (`sendChat`, `chat`, `bubble`/`drawBubble`), `openCfg` (painel ⚙) |
| `loop de lógica` | `pumpQ` (fila de turnos online), `update()` a 60 Hz fixos |
| `veículos` (logo depois do `drawChar`) | `VEH` (por veículo: `arc` = faixa de mira relativa, `def` = visual padrão), `VARC`, `vskin(cls,eq)`, `slT`/`tiltAt`/`pivotOf` (inclinação do chão e pivô do cano), `VB[veículo][estilo]` (`back`, `front`, `gun`, `cap`, `lift`, `hov`), `GUN`, `drawVeh`, `VT` (inclinação usada no próximo desenho), `PJ` (desenho de cada tipo de projétil; `X` = canvas atual), `projTrail`, `fxV` (explosão da skin), `drawShape` (partículas `k:'sh'`), `shotIcon`/`shotLoop` (tiro na loja e no provador). Detalhes em "Veículos" abaixo |
| `render` | `drawChar(g,cls,x,y,f,ang,cor,t,burn,look,eq)` (se `cls` é um veículo, desvia para `drawVeh`; `'veh'` = piloto sentado; `'none'` = só o personagem), `drawP`, `lpOff`/`drawProj` (giro de 360° só visual), `sky` (ambiente animado por bioma), `water` (água, lava, abismo, nuvens, vazio), `column`, `wxUpdate` (clima, ambiente, meteoros), `weather` (chuva, raios, meteoros), `fogLayer` (névoa do cemitério), `vignette`, `panel`, `dial`, `bottom`, `hud`, `draw`. Também `step`/`loop`: `requestAnimationFrame` com `setInterval` de reserva, para o tempo correr com a aba em segundo plano |
| `sala (lobby)` | objeto `L`, `lobbyNew`, `offLobby`, `pushLobby`, `sendMeta`, `newHost` (passagem de liderança), `hostApply`, `setFmt`, `addBot`, `botDf`, `setOpt`, `hostStart`, `startOnline`, `renderLobby` |
| `menu-cidade` (penúltimo `<script>`) | `CITY`: menu depois do login, desenhado no canvas `#bg`. Mundo 1600×900, rua em `WY=592`; prédios em `B` (`k`: inv, shop, arena, rank, fr; `x`, `w`, `h`, `ly` = altura da placa). `DRAW[k]` desenha cada prédio uma vez num canvas guardado (`buildSprites`); o fundo parado vai para `bgc` (`buildBg`). `frame()` desenha a cada quadro só luzes, bandeira, portão, fumaça, troféus, vaga-lumes, reflexos e fogos (`fireworks`). Os botões são HTML (`.bld` com `.plq` e `.goa`), posicionados por `place()`; passar o mouse liga `CITY.hov` (prédio cresce e brilha). Ações em `BLD` (`goScreen` / `showBrowse`) |
| `fundo animado` (último `<script>`) | `BG`: batalha de demonstração só visual, **só na tela de login** (`#auth`); nas outras telas o mesmo loop chama `CITY.frame`. Canvas `#bg`, z-index 4; as telas têm classe `see` (`see dim` escurece). Motor próprio e pequeno (terreno em `hm`, tiros, crateras, partículas); **não usa `G`, nem som, nem estatística**. Reaproveita `drawChar`, `ITEMS`, `BIO`, `TOD`, `TEAM`. `BG.next()` pula de cena (teste), `BG.burst()` é a explosão quando a logo aparece. A logo é HTML/CSS (`.logo`, `.bomb`) |
| `câmera` (logo depois da entrada) | `CAM` {z, x, y, alvos tz/tx/ty, follow}: zoom de 1 (mapa todo) a 3. **Só visual**: `draw()` usa `camView()` no `setTransform`; a simulação e a rede não mudam. Pinça/roda (`zoomAt`), arrastar, toque duplo, `camStep` (segue o tiro ou quem está na vez enquanto `follow`), `minimap()`/`mmRect` no HUD (abaixo dos painéis da direita), `offscreen()` segue a câmera. `camReset()` em `begin` |
| `rede` | `send`, `onMsg` (todas as mensagens do jogo), `lost`; `p2pHost`/`p2pJoin` (P2P oculto) |
| `servidor: lista de salas e conexão` | `srvAddr`, `showBrowse`, `loadRooms`/`renderRooms` (`GET /rooms`), `wsJoin` |
| `contas, armazém, loja, amigos e ranking` | `SUPA` (chaves; vazio = modo local), `START`/`REWARD`, `ACC` (conta atual), `PS` (conexão de presença), `LocalDB` e `SupaDB` (mesma interface; `DB` escolhe), `drawIcon`/`drawFig`/`drawAv`, login (`showAuth`, `doSignIn`, `createAcc`, `onLogin`), `renderInv`/`equip`/`dragSrc`, `renderShop`/`buyFlow`, `openProfile`, `social` (amigos), `renderRank` |
| `menu` | `begin(seed,players,opt)` (fecha inventário/loja/perfil e o cartão ao começar a partida) e ligação de todos os botões (`$('id').onclick`), inclusive `BLD` (prédios da cidade), `goFull`/`fsUI` (tela cheia + travar paisagem) e `cardOn()` (cartão no menu, salas e sala). O `#menu` antigo (armas, Jogar Offline desativado, `mnav`) fica escondido em `#mold`, porque o código ainda usa esses ids. Abertura: `#auth` começa visível com `#a0` ("Carregando...") e o `#menu` escondido, para não piscar o menu antes do login |

O estado global da partida fica em `G`, criado do zero por `newGame` a cada partida (reset total). Os campos principais são:

- `G.pl[]`: jogadores, com `i, team, ctl ('human'|'bot'|'remote'), cid, cls (veículo), look, eq, hp, x, y, ang (relativo ao veículo), vsl (inclinação só para desenho), f, items, cd, arm {x2,ty}, df, bub, gone`.
- `G.t`: índice de quem joga. `G.turn`: contador de turnos.
- `G.state`: `'aim' | 'fly' | 'wait' | 'over'`.
- `G.wind`, `G.mask` (Uint8Array do terreno: 0 vazio, 1 normal, 2 duro, 3 quicante), `G.tc` (canvas do terreno), `G.B`/`G.T` (bioma e horário), `G.ev`, `G.wm`, `G.gm`, `G.up`, `G.dec`, `G.q`.

Vagas e times: vagas 0 e 2 são o Time Azul (`team 0`), vagas 1 e 3 são o Time Rosa (`team 1`). A ordem dos turnos é dada por `nextT()`.

## Partida: modos, abates e destaques

- `newGame(seed, players, {map, tod, ffa})`: `team = ffa ? i : i % 2`, `side = i % 2` (lado do painel e do minimapa), `lh` (último atacante). Campos novos em `G`: `ffa`, `kills[]`, `sui[]`, `feed[]` (destaques na tela), `cur` (tiro atual: `pi, back, top, dmg, kills, done`) e `rp` (resultado de `rpCalc`).
- Fim: `liveTeams()` (times com alguém vivo); `wiped()` = 1 time ou menos; `teamName(t)` dá o nome do time ou do jogador (todos contra todos).
- `spawnXs(N, r, ffa)`: de 2 a 6 jogadores; times não deixam o aliado muito mais longe que os inimigos; todos contra todos espalha por igual.
- **Destaques** (`shotBadges`, chamado aos 8 quadros do fim do `wait` ou no `checkOver`): excelente (dano ≥ 300), de costas (`cur.back` e acertou), alto (`cur.top` < -200 e acertou), dois coelhos (`cur.kills` ≥ 2). `feed()` desenha na lateral esquerda; som `AU.badge`. Tudo é calculado igual em todos os clientes, então todos veem.
- **IA de costas:** se o melhor tiro de frente ficou ruim (`b.d > 30`), `planAI` vira o veículo para longe do inimigo e procura ângulos reais de 92° a 170° dentro da faixa (`b.f` guarda o lado escolhido).

## Veículos

- Cada `cls` é um veículo com o personagem pilotando. `drawChar` desvia para `drawVeh`, que desenha: fundo do veículo (`back`) → piloto (`drawChar` com `'veh'`, sem arma) → frente (`front`) → cano girando no pivô `(2,-19)` (`gun`) → tampa (`cap`) e a mão do piloto. Tudo gira com `VT` (graus, + = chão subindo para a direita) em volta do ponto de apoio.
- **Regras para um estilo novo:** coordenadas locais com o veículo virado para a direita e chão em `y = 0`; largura de ~±24 px; cano com ~28 px a partir do pivô `(2,-19)` (é dali que o tiro sai); `lift` = altura do piloto (9 padrão, 15–17 nos altos); `hov` = flutuação. Traço `#0a0f2b` com linha 2, cores chapadas, brilho branco e sombra preta translúcidos. Animações paradas usam `t` (quadro) e as rodas giram com `s = x/4`.
- **Faixa de mira:** `VEH[cls].arc` (Tanque 0–90, Jipe -10–70, Kart 10–100, Obra 30–120, Mola 0–90). Ângulo real = `tiltAt(p) + p.ang`; acima de 90° o tiro vai para trás. `fire(p,a,w)` recebe `a` relativo e converte; `mkProj`, `simShot`, `shots` e `G.sched` trabalham com o ângulo real. `G.last[i].a` = ângulo real, `.r` = relativo.
- **IA:** `planAI` e `planTp` procuram só ângulos reais dentro da faixa (`tiltAt + arc`) e guardam em `G.ai.a` o ângulo relativo.
- **Skins de veículo:** `vskin(cls, eq)` devolve a skin equipada (`eq['v'+cls]`) ou `VEH[cls].def`. `mkProj` copia `pj` (projétil), `ex` (explosão) e `col = ex.c` para o projétil; a chuva (`frag`) herda. `drawProj` usa `PJ[pj.k]`; `projTrail` faz o rastro; `explode` chama `fxV` e passa `ex.rim` para `carve` (cor da borda da cratera). Tudo isso é **só visual** (usa `Math.random`, não `G.r`).
- Tipos de projétil (`pj.k`): `missile` (`st:'toy'` = listrado), `bullet` (`c3` = traçante), `laser`, `fire` (`big` = maior), `orb`, `ghost`, `iron`, `stone`, `water`, `melon`, `gear`, `ball`, `beach`, `slime`, `planet`, `feather`. `pj.tr` troca o rastro (ex.: `ember`). Tipos de explosão (`ex.k`): `fire`, `ice`, `confetti`, `coins`, `stone`, `feathers`, `bats`, `water`, `pulp`, `goo`, `stars`, `sparks`, `electric`, `laser`, `dust`.
- Área de acerto do jogador em `hit()`: ±18 px na horizontal e de -46 a +2 px na vertical.

## Determinismo e rede (não quebre)

- **Cada cliente simula a partida inteira localmente** a partir da mesma `seed`, enviada na mensagem `go`. Terreno, vento, bioma, horário e eventos de clima saem de `G.r` (gerador com semente).
  - **Toda chamada a `G.r()` precisa acontecer na mesma ordem em todos os clientes.** Por isso o sorteio fica em `newGame`, `makeTerrain`, `makeBg` e `startTurn`/`evStep`.
  - Para algo só visual, use `Math.random()` ou outro `rngf` separado, como faz `makeDecor`.
  - **Meteoros** caem com animação, mas a cratera é aplicada por `flushMet()` antes de qualquer tiro, fim de turno ou plano da IA. **Raios** caem em `startTurn` (via `evStep`). Assim o terreno é o mesmo em todos os clientes no momento do tiro.
  - A mensagem `fire` leva `x`, `y` e `vy` do atirador (ele pode estar caindo numa cratera aberta por raio ou meteoro).
  - **Ângulo:** `st` e `fire` levam `a` = ângulo **relativo ao veículo** (`p.ang`, preso em `VARC`). Cada cliente soma a inclinação com `tiltAt(p)`, que lê só o terreno (`slT`), então dá o mesmo valor em todos. `p.vsl` é a inclinação suavizada só para o desenho: **nunca use `vsl` na física**. O tiro sai de `pivotOf(p)` + 28 px.
- **Quem manda em cada turno:** só o cliente de quem está jogando (`isAuth()`) envia `st` (posição e mira, a cada 4 ticks), `fire`, `item` e `turn`. O fim do turno leva hp, x e queimadura de todos e corrige pequenas diferenças.
- **Papel do líder (`isHost`):** controla os bots, os jogadores que saíram (`gone`) e o "watchdog" (força o fim do turno de um jogador travado com `force:1`).
- **Fila de turnos:** mensagens `turn` recebidas entram em `G.q` e são aplicadas em ordem de `tn` por `pumpQ()`.
- **Validação do remetente:** o cliente confere o `from` de cada mensagem. O servidor carimba o `from` em tudo o que repassa, então um cliente não consegue se passar por outro.

### Mensagens de cliente para cliente (repassadas pelo servidor)

| Tipo | Quem envia | Conteúdo |
|---|---|---|
| `hi` | quem entra | `name`, `cls` (veículo), `look`, `eq`, `uid`, `pid` |
| `cls`, `look`, `slot`, `ready` | membro | arma / personagem / vaga / pronto (o líder aplica em `hostApply`). `slot` com `s: -1` = ir para a plateia (`mem.spec = true`; `fillSlots` e o `hi` não colocam espectador em vaga) |
| `lobby` | líder | objeto `L` completo |
| `go` | líder | `seed`, `players[{cid,name,cls,look,eq,uid,bot,df}]` (2, 4 ou 6; com sorteio a lista já vem embaralhada), `map`, `tod`, `ffa` |
| `st`, `fire`, `item`, `turn` | jogador da vez (ou o líder, no caso de bots) | sempre com `pi` e `tn`; `fire` tem `x,y,vy,ar`; `turn` tem `hp,bn,x,f` |
| `chat`, `sys`, `quit` | todos / líder / líder | — |

### Mensagens do servidor

| Tipo | Quando |
|---|---|
| `role` | ao conectar: `{h, host}` (se você é o líder e quem é o líder) |
| `join`, `left` | entrada ou saída de alguém, com `from` |
| `host` | novo líder: `{host, old}`, **sem `from`**. O cliente só aceita se não houver `from` |
| `exists`, `nf`, `badpw`, `full` | erros ao criar ou entrar numa sala |
| `kicked` | você foi expulso (ou tentou voltar antes de 10 min); a conexão é fechada em seguida |

Mensagens que o servidor intercepta e **não** repassa: `kick {cid}` (só do líder: fecha a conexão do alvo e guarda `r.ban` por cid e uid durante 10 min; o `uid` vem na URL do WebSocket), `meta` (nome, líder, formato `1v1|2v2|3v3`, `ffa`, vagas e "em partida", usados na lista de salas) e `pw` (troca de senha). Só são aceitas do líder atual. A senha fica só no servidor.

### Objeto da sala

```
L = {code, mode, name, dn, lock, off, fmt ('1v1'|'2v2'|'3v3'), ffa, rnd, map, tod, host,
     mem: {cid: {name, cls, look, eq, uid, pid, st, bot, ready, df, spec}},
     slots: [cid | null] × 6, nb}
```

- `dn = true`: a sala usa o nome padrão "Sala de (líder)". Ele é renomeado quando a liderança passa.
- `off = 1`: sala offline. É a mesma interface, com `isHost = true` e `net = null`.
- `FMTN` dá as vagas ativas (2, 4, 6) e `actN()` o número atual. Vagas pares = Time Azul, ímpares = Time Rosa; no todos contra todos (`ffa`) cada vaga é um time (`team = índice`) e o lado na tela é `side = i % 2`.
- `rnd` (sorteio): `hostStart` embaralha a lista de jogadores (com `Math.random`, só no líder) antes de mandar o `go`; a ordem final define os times.
- O líder não precisa marcar pronto (`lobbyReady` conta o líder como pronto).
- Tela: `renderLobby`/`slotEl` (vagas `.lsl` com `figVeh`, patente e chips), `mapThumb` (miniatura do mapa), `openMcfg`/`mcfgStep`/`mcfgSave` (modal **Configurações da partida**, `#lcfg`; só leitura para quem não é líder), `openVeh` (modal **Veículo**, `#vpick`; usa `selectClass` + `req({t:'cls'})`). Botões `#lside` (Lado) e `#lspec` (Assistir/Jogar).

## server.js

- `GET /rooms`: lista de salas em JSON.
- `GET` em qualquer outro caminho: entrega o `index.html`.
- WebSocket `/ws?room=CÓDIGO&cid=ID&uid=CONTA&create=1&pw=SENHA`.
- Até 10 conexões por sala (6 jogadores + plateia). Quando a última pessoa sai, a sala é apagada. Se o líder sai, o próximo da lista (o mais antigo) vira líder.
- Porta: `process.env.PORT` (padrão 8080).

## Armazenamento local (localStorage)

| Chave | Conteúdo |
|---|---|
| `vdc-name` | nome do jogador (o prefixo `vdc-` ficou do nome antigo; não troque, senão quem já joga perde as configurações) |
| `vdc-audio` | música e sons ligados ou desligados |
| `vdc-cfg` | `{touch}` (botões na tela) |
| `vdc-wpn` | último veículo escolhido (`vdc-look` não é mais usado) |
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

- **Interface única:** todo acesso a dados passa por `DB`: `SupaDB` (ligado; `SUPA` = projeto `zfqzzzidzyfbmwqlxpjp` + chave publicável) ou `LocalDB` (se `SUPA` ficar vazio). Métodos: `load, signIn, signOut, checkNick, create, update, buy, addMatch(win,shots,hits,ranked,rp), find, getProfile, friends, request, respond, unfriend, top` (por RP) e `ranks(uids)` → `{uid: {rp, pos, tot}}` (Supabase: RPC `rank_info`; local: presença `rk`).
- **Conta (`ACC`):** `uid, pid (ID de 8 números), nick, email, guest, look, eq {hat,face,body,back,feet}, inv [ids], cls, gold, gems, wins, losses, shots, hits, games, rp` (pontos de ranking, começa em 100).
- **Presença (`PS`, WebSocket `/ws?presence=1`):** mensagens `hello, pub, status {s: menu|lobby|game, room}, nick, find, online, friends, freq, fresp, unfriend, top, invite, ping`, `who` (todos online, com o perfil público), `rk {uids}` (posição no ranking, modo local), `ghist` (últimas 50 mensagens do chat global) e `gchat {s}` (chat global: só com `status = menu`, 1 mensagem a cada 10 s por conta, texto passado pelo filtro `cleanTxt`; erro `{e, wait}`). O servidor avisa `fst` (status de amigo), `freqIn` (pedido novo), `fupd` (lista mudou), `invite` e `gmsg {m: {uid,nick,pid,rp,s,ts}}` (mensagem nova do chat global, para todos).
- **Na sala:** `hi` leva `eq, uid, pid`; a mensagem `eq` troca o equipamento; `go` leva `eq` e `uid` de cada jogador; `newGame` guarda `p.eq`. Toda skin vinda da rede passa por `cleanEq` (roupas e `VK`). No banco, `items.slot` aceita `vwar…vbal` e o gatilho `check_eq` aceita essas chaves; o `server.js` também guarda essas chaves no perfil público (`SLOTS`).
- **Supabase:** `db/schema.sql` (testado num Postgres 16 local com um `auth` simulado). Cliente: supabase-js 2.105.4 (UMD pelo jsDelivr), `flowType:'implicit'` (o link do e-mail funciona em outro aparelho). `SupaDB.load` devolve a conta, ou `{uid, nick:''}` quando há sessão sem perfil (volta do link/Google): o início do jogo abre direto a escolha de apelido. O jogador só pode gravar `nick, look, weapon, guest` (ao criar) e `look, eq, weapon` (depois); o gatilho `check_eq` impede equipar item que não tem; ouro, gemas e estatísticas só mudam por `buy_item` ou `record_result` (só service_role). Testado com um Supabase simulado (falso `supabase-js` no navegador + servidor HTTP falso); falta o teste com o projeto real.
- **Servidor com Supabase** (variáveis `SUPABASE_URL` e `SUPABASE_SECRET` no Render): `hello` leva `token` e o servidor confere em `/auth/v1/user` (cache de 5 min); `result {win,shots,hits}` grava via `/rest/v1/rpc/record_result` (+60 ouro vitória, +20 derrota; no máximo 1 a cada 30 s por jogador; tiros ≤ 80). Amigos para status e convites vêm de `friendships` (`loadFriends`, recarregado no `ping`). Nesse modo o `dev-store.json` não é gravado. Convidados (login anônimo) também se conectam à presença para gravar partidas.
- **Ranking só sem bots:** o servidor guarda, a cada `go` do líder, `r.go = {uids, bots, done}`. No `result`, ele acha a sala pelo `status.room` do jogador: ranqueada = `bots === 0`, 2+ jogadores e o jogador na lista; um resultado por partida (`done`). Sem sala/partida: não ranqueada (+20 ouro, 1 a cada 30 s). `record_result(..., p_ranked)`: com `false` só soma ouro. No modo local, `recordMatch` calcula `ranked` pelo `G.pl` (nenhum `bot`).
- **RP:** `rpCalc(w)` (no fim da partida, igual em todos os clientes) dá a cada jogador `{win, k, s, t}`: vitória pelo número de jogadores (`RPWIN`: 2 → 2, 4 → 4, 6 → 8; com bot → 1), `k` abates (+1), `s` suicídios (-2). Abate e suicídio vêm de `credit(p, drown)` dentro do `die`: `p.lh` = último que causou dano (`hurt`); afogado durante um tiro = quem atirou; afogado andando na própria vez = suicídio. No Supabase o servidor recalcula o RP no `result {win, shots, hits, kills, sui}` com o `r.go {n, bots}` da sala (abates limitados a n-1, suicídio a 1) e chama `record_result(..., p_rp)`, que devolve o RP novo. No modo local, `LocalDB.addMatch` soma `rp.t`.
- **Patentes:** `RANKS` (21, com `min` de RP), `tierOf(rp, pos, tot)` (Águia exige `pos` nos 30% melhores; Mestre exige `pos` 1–3), `rankImg`/`rankCanvas` (emblemas desenhados em canvas, com cache), `RK`/`rkLoad(uids)` (cache de 30 s da posição de cada conta), `tierFor(uid, rp)`, `rankHelp()` (tabela no ranking).
- **Chat global e online:** `browse.js` dentro do `index.html`: `chatClean` (mesmo filtro do servidor), `gOpen`, `gSend`, `renderGlog`, `loadOnline`/`renderOnline` (a cada 5 s com a aba aberta).
- **Ainda falta:** o resultado é informado pelo próprio jogador (o servidor só confere quem é e limita os valores); convidado que cria conta começa uma conta nova (sem migrar o progresso).

## Limitações conhecidas

- `goScreen` volta para a tela de origem (`backTo`: menu, `browse` ou `lobby`); na sala, voltar manda `eq` para todos. Durante a partida (`inGame`) inventário, loja, amigos e ranking não abrem.
- As salas ficam só na memória do servidor. No plano gratuito do Render, elas somem quando o servidor dorme ou reinicia.
- O P2P não tem servidor TURN: falha em algumas redes (4G, redes de empresa).
- Fogo amigo está ligado: o tiro também acerta o próprio time.
- No modo local, a conta fica no aparelho e o servidor confia no `uid` enviado (é só para desenvolvimento).
- Com Supabase, vitória/derrota e tiros são informados pelo cliente (o servidor não simula a partida). Para um ranking competitivo, o próximo passo é o servidor conferir o resultado com os outros jogadores da sala.
