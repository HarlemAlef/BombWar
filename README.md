# BombWar

Jogo de artilharia 2D por turnos no estilo DDTank, feito em **um único arquivo** (`index.html`, HTML + JavaScript com canvas) e com um servidor Node pequeno (`server.js`) para jogar online.

Para quem vai mexer no código (pessoa ou agente de IA): leia o **[AGENTS.md](AGENTS.md)** antes. Ele é o mapa técnico do projeto.

---

## Como jogar

| Ação | Teclado | Celular (botões na tela) |
|---|---|---|
| Mover | ← → (Shift = passo fino) | ◀ ▶ |
| Ângulo do cano | ↑ ↓ (Shift = ajuste fino) | ▲ ▼ (toque rápido = ajuste fino) |
| Atirar | segure **Espaço** para carregar a força e solte | segure **FOGO** e solte |
| Power-ups | teclas **1 a 7** ou clique no botão | toque no botão |
| Chat | **Enter** | — |
| Zoom da câmera | roda do mouse; arrastar move; duplo clique volta | pinça com 2 dedos; arrastar move; toque duplo aproxima/volta; toque no minimapa |
| Música / sons | **M** / **N** | ⚙ Configurações |

- **Início:** as posições e a distância entre os jogadores são sorteadas a cada partida (os times podem se misturar, sem deixar ninguém sozinho contra dois), e **quem começa também é sorteado**.
- Turnos de **20 segundos**. Se o tempo acabar enquanto você carrega a força, o tiro sai sozinho.
- Na vez do outro jogador, você não consegue fazer nada.
- **Veículo inclinado:** o veículo acompanha o chão (até 45° para cima ou para baixo) e o cano mira dentro de uma faixa fixa em relação ao veículo. Numa subida a faixa sobe junto (e dá até para atirar para trás); numa descida ela desce. Na sua vez, um leque claro mostra a faixa. O medidor no canto de baixo mostra o chão (linha amarela), a faixa permitida, o ângulo real do tiro e o texto "chão +20°".
- O painel de cada jogador mostra a **força, o ângulo e o vento do último tiro**, para ajudar a corrigir a mira.
- O que você digita no chat aparece num **balão em cima do personagem**.
- Os botões na tela para celular ficam em **⚙ Configurações**, no canto do menu e na lateral da tela durante a partida. O FOGO fica no canto de baixo à direita, para não tapar o mapa.
- **Câmera:** a partida começa mostrando o mapa todo. Com zoom, a câmera acompanha o tiro e quem está na vez até você arrastar. O **minimapa** (canto de cima, à direita) mostra o mapa inteiro e o pedaço que está na tela; toque nele para pular para um ponto. Aparece sempre no celular e, no computador, quando há zoom.
- **Tela cheia:** em ⚙ Configurações. No celular, tocar na Arena já tenta entrar em tela cheia e deitar a tela. No iPhone o navegador não deixa: use **Compartilhar → Adicionar à Tela de Início** e abra pelo ícone do BombWar (o jogo abre em tela cheia).
- **Login:** atrás da tela de entrar roda uma batalha de demonstração (só visual). Depois do login, o menu é uma **cidade** no estilo DDTank.

## Menu (cidade)

Cada prédio é um botão, com luz quando o mouse passa por cima: **Inventário** (depósito), **Loja**, **Arena** (castelo no centro, com o botão **Jogue agora**), **Hall da Fama** (ranking) e **Amigos** (taverna). Postes e janelas acesas, vaga-lumes, fumaça e fogos saindo dos canhões da Arena dão vida à cena. O **cartão do jogador** fica no canto de cima, à esquerda, no menu, na lista de salas e dentro da sala; clicar nele abre o **Inventário** (dá para trocar de roupa na sala, nunca durante a partida). O veículo é escolhido dentro da sala.

## Modos

- **Arena** (antigo "Online Servidor"): lista de salas abertas, atualizada a cada 3 segundos. Você pode criar uma sala (nome e senha opcional) ou entrar com o código. Para jogar contra bots, crie uma sala e use **+ Bot**.
- **Jogar Offline:** desativado no menu (o código continua no jogo, função `offLobby`).
  - Na sala, todos precisam clicar em **Estou pronto** antes do líder 👑 iniciar.
  - O líder pode trocar o formato, o mapa, o horário, o nome e a senha da sala, e completar vagas com bots.
  - **👁 Assistir** tira você da vaga e você fica na plateia (continua assim depois da partida); para voltar, use **Entrar aqui** numa vaga livre.
  - O líder pode **expulsar ⛔** um jogador na sala (fora da partida). O servidor fecha a conexão dele, que não consegue voltar àquela sala por 10 minutos.
  - Se o líder sair, a liderança passa para o jogador mais antigo da sala, mesmo no meio da partida.
  - Quem entra com a partida em andamento fica assistindo e joga na próxima.
- **P2P (PeerJS):** o código continua no projeto, mas o botão foi retirado do menu.

## Contas, inventário, loja e amigos

- **Login:** Google, e-mail ou convidado. Na criação da conta você escolhe um **apelido único** (3 a 14 letras ou números) e o personagem básico, sem skins. Cada conta recebe um **ID público de 8 números**.
- **Saldo inicial (versão de testes):** 1.000 de ouro e **10.000 gemas**. Ouro também se ganha jogando: +60 por vitória e +20 por derrota; partida com bots dá +20 de participação.
- **Estatísticas:** vitórias, derrotas, % de vitórias, precisão e partidas. **Só contam partidas entre jogadores**: se tiver qualquer bot na partida, ela não entra nas estatísticas nem no ranking.
- **Loja:** 50 skins de personagem em 5 abas (Chapéu, Rosto, Roupa, Costas e Calçado) e **25 skins de veículo** na aba **Veículos** (5 por veículo), com 4 raridades (Comum e Raro custam ouro; Épico e Lendário custam gemas). Dá para buscar pelo nome, filtrar por raridade, ordenar por preço, esconder o que já tem e **provar** antes de comprar. No provador, a skin de veículo aparece com o tiro dela voando.
- **Inventário:** grade com os seus itens, no estilo do DDTank. **Arraste** um item até o espaço do personagem para equipar (ou dê dois cliques), e arraste de volta para a grade para tirar. Funciona com o dedo no celular. Na aba **Veículos**, clique na skin e em **Equipar**: cada veículo guarda a sua própria skin.
- **Amigos:** busque pelo ID ou apelido, ou clique no nome de alguém na sala para ver o perfil (skins e estatísticas) e mandar pedido. A lista mostra quem está **online**, **na sala** ou **em partida**. Na sala, o botão **Convidar amigos** manda um convite com o código.
- **Ranking (Hall da Fama):** os 50 jogadores com mais vitórias em partidas sem bots.
- **Convidados** jogam normalmente, mas não compram nem adicionam amigos. Ao criar conta, o progresso do convidado é transferido.

### Banco de dados (Supabase)

O jogo está ligado ao projeto Supabase `zfqzzzidzyfbmwqlxpjp`. Login com Google, e-mail (link mágico) ou convidado; conta, loja, inventário, amigos e ranking ficam no banco e valem em qualquer aparelho. O resultado de cada partida (vitórias, derrotas, precisão e ouro) é gravado pelo servidor do jogo.

**Configuração (já feita / para refazer num projeto novo):**
1. **SQL Editor:** cole `db/schema.sql` inteiro e clique em **Run**. Sempre que o `schema.sql` mudar, rode de novo (ele pode ser rodado várias vezes sem apagar dados).
2. **Authentication → Sign In / Providers:** ligue **Email**, **Anonymous sign-ins** (convidados) e, se quiser, **Google** (Client ID e Secret do Google Cloud).
3. **Authentication → URL Configuration:** **Site URL** = endereço do jogo (ex.: `https://bombwar.onrender.com`) e o mesmo em **Redirect URLs**.
4. **index.html:** `SUPA` = Project URL (`https://<id>.supabase.co`, sem `/rest/v1/`) + chave **publicável** (`sb_publishable_...`). Ela pode ficar no código.
5. **Render → seu serviço → Environment:** crie `SUPABASE_URL` (a Project URL) e `SUPABASE_SECRET` (a chave **secreta** `sb_secret_...`). Salve; o Render reinicia sozinho. No log deve aparecer `Supabase ligado`.

Sem essas duas variáveis o servidor volta ao **modo de desenvolvimento** (amigos e ranking em `dev-store.json`). Para o jogo inteiro voltar ao modo de desenvolvimento, deixe `SUPA` vazio no `index.html`.

A chave **secreta** (`sb_secret_...`, antiga service_role) vai só nas variáveis de ambiente do Render, nunca no código, no GitHub ou em conversas. Se ela vazar, apague e crie outra em **Project Settings → API Keys**.

## Personagens e veículos

Todo mundo joga com o **mesmo personagem padrão** (camiseta azul, short preto e cabelo curto), que vai **pilotando um veículo**. A cor do time aparece na faixa do ombro, no veículo, no nome e na barra de vida, e a personalização é feita com as skins da Loja (as roupas continuam valendo no piloto). Cada jogador escolhe o **veículo**, que define o tiro. Todos têm **1000 de vida**.

| Veículo | Tiro | Dano | Raio | Mira (em relação ao veículo) | Como é |
|---|---|---|---|---|---|
| Tanque Bolota | míssil | 215 | 66 | 0° a 90° | tiro forte e confiável, área de dano grande e cratera pequena |
| Jipe Mira | bala calibre .50 | 263 | 40 | -10° a 70° | muito dano, tiro rápido e trajetória plana; não mira alto |
| Kart Arcano | bola de fogo com rastro | 170 + queima 40 por 2 turnos | 44 | 10° a 100° | flutua; queima o alvo |
| Carrinho de Obra | duas bolas de ferro | 125 por bola | 66 | 30° a 120° | duas bolas que se cruzam na saída, se abrem bastante (até 140 px) e só se juntam depois de uns 2,5 s de voo. Só tiros bem altos acertam as duas; passa da vertical e atira para trás |
| Monstro Mola | bola quicante | 230 | 58 | 0° a 90° | quica uma vez no chão (mais forte quanto mais alto vier) e explode no segundo toque; acerto direto explode na hora |

Valores de dano ajustados depois do teste de 1.000 partidas entre bots (relatório de balanceamento de 22/10/2026). A área de acerto de cada jogador ficou um pouco maior (36 × 48 px) para acompanhar o tamanho do veículo.

### Skins de veículo

Cada veículo tem 5 skins na Loja, com raridade igual às roupas. Algumas só trocam as cores; outras trocam o **formato do veículo** (inclusive animais), com animações paradas. Toda skin troca também o **projétil**, o **rastro**, a **explosão** e a **cor da borda da cratera**. Nada disso muda dano, raio ou física.

| Veículo | Skins |
|---|---|
| Tanque Bolota | **Tanque do Deserto** (Comum, 900 ouro): só cores<br>**Tanque Ártico** (Raro, 2.200 ouro): neve no casco, míssil de gelo e estilhaços<br>**Tanque de Corda** (Épico, 600 💎): brinquedo com chave girando, foguete de brinquedo, confete<br>**Tartaruga Couraçada** (Épico, 750 💎): tartaruga que anda e pisca, atira pedras<br>**Tanque do Rei** (Lendário, 1.800 💎): bandeira com coroa e brilhos, explode em moedas |
| Jipe Mira | **Jipe da Selva** (Comum, 900 ouro): traçante verde<br>**Jipe Noturno** (Raro, 2.000 ouro): faróis de visão noturna, traçante verde<br>**Jipe de Rali** (Raro, 2.600 ouro): carro de rali com aerofólio e número 50<br>**Avestruz Corredora** (Épico, 650 💎): avestruz que corre, atira penas<br>**Jipe Spectre** (Lendário, 2.000 💎): flutua, atira laser |
| Kart Arcano | **Kart Rubi** (Comum, 1.000 ouro): bola de fogo vermelha<br>**Kart Gelo Eterno** (Raro, 2.200 ouro): bola de gelo, estilhaços<br>**Nuvem de Tempestade** (Raro, 2.600 ouro): nuvem com relâmpagos e chuva, orbe elétrico<br>**Abóbora Assombrada** (Épico, 700 💎): rosto aceso, fantasma e morcegos<br>**Dragão Ancestral** (Lendário, 2.500 💎): bate as asas, solta fumaça, cospe bola de fogo maior |
| Carrinho de Obra | **Carrinho Militar** (Comum, 900 ouro): só cores<br>**Carrinho Bombeiro** (Raro, 2.000 ouro): escada, sirene, bolas d'água<br>**Trator da Fazenda** (Raro, 2.400 ouro): trator com fumaça, atira melancias<br>**Elefante de Carga** (Épico, 750 💎): orelhas e tromba mexendo, atira pedras<br>**Engrenagem a Vapor** (Lendário, 1.900 💎): engrenagens girando, chaminé, atira engrenagens |
| Monstro Mola | **Monstro Chiclete** (Comum, 1.000 ouro): bola de chiclete<br>**Monstro de Lava** (Raro, 2.300 ouro): rachaduras acesas, bola de magma<br>**Buggy de Praia** (Raro, 2.400 ouro): prancha de surfe, bola de praia<br>**Sapo Saltador** (Épico, 700 💎): pisca e infla o papo, bola de gosma<br>**Monstro Galáctico** (Lendário, 2.200 💎): disco voador com luzes, planetinha com anel |

## Power-ups

Cada power-up tem **uma carga só** (não acumula). Depois de usado, recarrega em **5 rodadas**; a **cura recarrega em 10**. O Morteiro conta como **um** projétil para os power-ups: a Chuva de bombas cai uma vez só, e a Bomba pesada dá metade do bônus (+15% de dano, raio 1,35×) a cada uma das duas bolas.

| Tecla | Power-up | Efeito |
|---|---|---|
| 1 | Cura | +200 de vida na hora |
| 2 | Dano x2 | dobra o dano do próximo tiro (combina com os outros) |
| 3 | Tiro duplo | dois disparos seguidos, 70% do dano cada |
| 4 | Tiro triplo | três projéteis girando em espiral, 65% do dano cada |
| 5 | Bomba pesada | cratera 1,7× maior e +30% de dano |
| 6 | Chuva de bombas | 5 bombas de 70 caem do céu depois do impacto (o Dano x2 não vale para elas) |
| 7 | Avião | você é teletransportado para onde o avião cair (sem dano). Os bots usam quando estão num buraco ou sem nenhum tiro bom |

## Mapas, horários e clima

Onze biomas, cada um com terreno de formato próprio:

| Bioma | Destaque | Eventos de clima possíveis |
|---|---|---|
| Campos Verdes | morros e um vale no meio | Chuva, Furacão, Raios |
| Ilhas Tropicais | mais água e ilhas flutuantes | Chuva, Furacão |
| Picos Gelados | montanhas pontudas | Nevasca |
| Deserto Escaldante | dunas suaves | Tempestade de areia, Furacão, Meteoros |
| Terras Vulcânicas | vulcão no meio, **lava** no fundo | Chuva de cinzas, Coluna de calor, Meteoros |
| Superfície Lunar | **gravidade baixa e sem vento**, crateras, a Terra no céu | Meteoros |
| Fundo do Mar | **água freia o tiro** e a "maré" faz o papel do vento; abismo no fundo | Jato de bolhas, Corrente forte |
| Cidade em Ruínas | prédios com **material duro** (só quebra no centro da explosão) e andares onde dá para subir | Chuva, Raios, Furacão |
| Floresta Mágica | **cogumelos gigantes que fazem o tiro quicar** (até 3 vezes) | Chuva, Furacão |
| Cemitério Assombrado | **névoa**: você só enxerga perto do seu time, dos tiros e das explosões | Raios, Chuva |
| Reino das Nuvens | ilhas flutuantes em **3 andares**: quem cai de cima aterrissa no andar do meio ou na base; só morre quem cair pelos buracos da base | Furacão, Raios, Chuva |

- **Horários:** Dia, Entardecer, Noite e Amanhecer (a Lua e o Fundo do Mar têm ambiente próprio).
- **Vento:** varia de 0 a 5 e muda aos poucos a cada turno.
- **Eventos de clima** (duram de 4 a 7 rodadas):
  - Chuva e tempestade de areia: vento 1,5× mais forte. Corrente forte (mar): 1,6×.
  - Nevasca: projéteis 15% mais pesados. Chuva de cinzas: 12% mais pesados.
  - Furacão, coluna de calor e jato de bolhas: jogam para o alto os tiros que passam pela faixa, e o projétil dá um giro de 360°.
  - Chuva de meteoros: no começo de cada turno caem 2 ou 3 meteoros que abrem crateras (sem dano).
  - Tempestade de raios: uma marca vermelha aparece perto de um jogador; no turno seguinte cai um raio ali (até 130 de dano).
- Cair na água, lava, abismo, vazio ou das nuvens mata.

## Colocar online (Render, grátis)

1. Envie `index.html`, `server.js` e `package.json` para um repositório no GitHub.
2. No [render.com](https://render.com), crie um **Web Service** a partir desse repositório, com estas opções:
   - **Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance:** Free
3. O link `https://<nome>.onrender.com` abre o jogo, e a **Arena** já funciona por ele.

No plano gratuito, o servidor dorme depois de 15 minutos sem ninguém jogando e leva cerca de 1 minuto para acordar. Quando ele dorme ou reinicia, as salas abertas somem.

Para atualizar, basta enviar o novo `index.html` (e o `server.js`, se ele mudou) para o GitHub. O Render publica sozinho.

### Trocar o endereço (URL)

O Render **não deixa mudar** o `https://<nome>.onrender.com` de um serviço que já existe. Para ter `bombwar.onrender.com`:
1. (Opcional) No GitHub, renomeie o repositório: **Settings → Repository name → `bombwar`**.
2. No Render, crie um **novo Web Service** desse repositório com o nome **`bombwar`** e as mesmas opções acima. Se o nome já estiver em uso por outra pessoa, o Render coloca um sufixo (ex.: `bombwar-x1y2`).
3. Abra o link novo e teste. Depois, apague o serviço antigo em **Settings → Delete Web Service**.
4. No Supabase, troque o endereço em **Authentication → URL Configuration** (Site URL e Redirect URLs) e, se usar o Google, nada muda no Google Cloud (ele aponta para o Supabase).
5. Mande o link novo para os amigos. Contas do **modo de desenvolvimento** ficam salvas no navegador por endereço, então no link novo elas começam do zero (com o Supabase isso deixa de acontecer).

Para um endereço próprio (ex.: `bombwar.com.br`), compre o domínio e adicione em **Settings → Custom Domains** do serviço no Render.

Se preferir o Fly.io (pago, servidor em São Paulo), o `Dockerfile` e o `fly.toml` já estão prontos: `fly deploy`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | o jogo inteiro (cliente) |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | ícone e configuração para instalar o jogo na tela inicial do celular (abre em tela cheia, deitado) |
| `server.js` | servidor Node: entrega o jogo, lista as salas (`/rooms`), repassa as mensagens (WebSocket `/ws`) e cuida da presença online, amigos e ranking (`/ws?presence=1`) |
| `package.json` | dependência `ws` |
| `db/schema.sql` | banco de dados do Supabase: tabelas, travas (RLS), funções e catálogo de skins |
| `dev-store.json` | criado pelo servidor no modo de desenvolvimento (não vai para o GitHub) |
| `Dockerfile`, `fly.toml` | só para o Fly.io |
| `README.md` | este arquivo (para pessoas) |
| `AGENTS.md` | guia técnico para quem mexe no código e para agentes de IA |

## Histórico de versões

Do mais antigo para o mais recente:

1. Primeira versão: 4 classes, turnos de 20 s, força carregada, vento, terreno destrutível, bot com mira balística, P2P e servidor.
2. Foco no PC: power-ups de tiro (duplo, triplo girando etc.), interface e gráficos melhores.
3. Vento suave de 0 a 5, câmera mais afastada, interface menor, dados do último tiro, sons e músicas sintetizados, chat no canto inferior direito.
4. Recarga dos power-ups e power-up Avião (teletransporte).
5. Até 4 jogadores (2v2), sala com líder e lista de jogadores, nome do jogador no menu.
6. Configurações com botões na tela para celular, tiro só pelo Espaço ou pelo botão FOGO, botão de "pronto" na sala, correção do tempo do turno quando a aba fica em segundo plano.
7. Lista de salas online com nome e senha, passagem de liderança, menu com 2 botões, sala offline com bots e dificuldade por bot, recarga de 5 rodadas (cura 10), balão de chat, ⚙ na lateral.
8. 5 biomas, 4 horários, eventos de clima que mudam a trajetória, escolha de mapa e horário na sala.
9. Armas no lugar de classes (5 armas, incluindo o Bumerangue) e 4 personagens padrão, poder SS por arma, 6 biomas novos com mecânicas próprias (Lua, Fundo do Mar, Cidade, Floresta, Cemitério, Nuvens), chuva de meteoros e raios, furacão mais forte com giro de 360°.
10. Reino das Nuvens refeito em 3 andares de plataformas (cima, meio e base), para não derrubar jogadores com tanta facilidade.
11. Removido o poder SS (pode voltar no futuro) e o Bumerangue foi trocado pela Bola Quicante, para manter o jogo simples.
12. Cratera do Canhão Pesado reduzida pela metade; Morteiro refeito com duas bolas que se cruzam e se juntam na queda.
13. Contas (login com Google, e-mail ou convidado; apelido único e ID), 50 skins em 5 tipos, Armazém com arrastar e soltar, Loja por abas, amigos com status online, perfis, ranking e convite para sala. Banco do Supabase pronto em `db/schema.sql`.
14. Fim da escolha de personagem: todas as contas usam o personagem padrão (camiseta azul e short preto) e se personalizam com skins.
15. O jogo passou a se chamar **BombWar**: logo nova e batalha de demonstração animada atrás do login e dos menus.
16. Supabase ligado: contas, loja, amigos e ranking no banco; o servidor confere o login e grava o resultado das partidas.
17. Menu em forma de cidade (Inventário, Loja, Arena, Hall da Fama, Amigos) com luzes e fogos; cartão do jogador na sala com acesso ao inventário; Jogar Offline desativado (bots na Arena); ranking só com partidas sem bots; Morteiro exige tiro mais alto; botões de toque menores; tela cheia; zoom com pinça/roda, câmera que acompanha o tiro e minimapa.
18. Balanceamento pelo relatório de 1.000 partidas (Bola Quicante, Morteiro e Rifle mais fortes/fracos, Rifle +5% de dano, Chuva de bombas 5×70 sem Dano x2, Tiro triplo 65%; depois da 2ª rodada de 1.000 partidas, queimadura do Cajado 45 → 40); power-ups com uma carga; Morteiro conta como um projétil para power-ups; bots usam o Avião; posições e primeiro turno sorteados; pódio com os personagens no fim da partida; botão Assistir e expulsão pelo líder na sala.
19. **Veículos** no lugar das armas (Tanque Bolota, Jipe Mira, Kart Arcano, Carrinho de Obra e Monstro Mola), com o personagem pilotando; veículo inclina com o terreno (até 45°) e mira numa faixa fixa em relação ao veículo (dá para atirar para trás); medidor e leque de mira novos; projéteis próprios (míssil, bala .50, bola de fogo com rastro, bolas de ferro, bola quicante); 25 skins de veículo na Loja (5 por veículo, com raridade), que trocam formato, animações, projétil, rastro, explosão e cor da cratera; área de acerto um pouco maior.
