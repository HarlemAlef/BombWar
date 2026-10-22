# Vale dos Canhões

Jogo de artilharia 2D por turnos no estilo DDTank, feito em **um único arquivo** (`index.html`, HTML + JavaScript com canvas) e com um servidor Node pequeno (`server.js`) para jogar online.

Para quem vai mexer no código (pessoa ou agente de IA): leia o **[AGENTS.md](AGENTS.md)** antes. Ele é o mapa técnico do projeto.

---

## Como jogar

| Ação | Teclado | Celular (botões na tela) |
|---|---|---|
| Mover | ← → (Shift = passo fino) | ◀ ▶ |
| Ângulo | ↑ ↓ (Shift = ajuste fino) | ▲ ▼ (toque rápido = ajuste fino) |
| Atirar | segure **Espaço** para carregar a força e solte | segure **FOGO** e solte |
| Power-ups | teclas **1 a 7** ou clique no botão | toque no botão |
| Chat | **Enter** | — |
| Música / sons | **M** / **N** | ⚙ Configurações |

- Turnos de **20 segundos**. Se o tempo acabar enquanto você carrega a força, o tiro sai sozinho.
- Na vez do outro jogador, você não consegue fazer nada.
- O painel de cada jogador mostra a **força, o ângulo e o vento do último tiro**, para ajudar a corrigir a mira.
- O que você digita no chat aparece num **balão em cima do personagem**.
- Os botões na tela para celular ficam em **⚙ Configurações**, no canto do menu e na lateral da tela durante a partida.

## Modos

- **Jogar Offline:** sala local contra bots. Escolha 1v1 ou 2v2, a dificuldade de cada bot (Fácil, Normal ou Difícil), o mapa e o horário.
- **Online Servidor:** lista de salas abertas, atualizada a cada 3 segundos. Você pode criar uma sala (nome e senha opcional) ou entrar com o código.
  - Na sala, todos precisam clicar em **Estou pronto** antes do líder 👑 iniciar.
  - O líder pode trocar o formato, o mapa, o horário, o nome e a senha da sala, e completar vagas com bots.
  - Se o líder sair, a liderança passa para o jogador mais antigo da sala, mesmo no meio da partida.
  - Quem entra com a partida em andamento fica assistindo e joga na próxima.
- **P2P (PeerJS):** o código continua no projeto, mas o botão foi retirado do menu.

## Contas, armazém, loja e amigos

- **Login:** Google, e-mail ou convidado. Na criação da conta você escolhe um **apelido único** (3 a 14 letras ou números) e o personagem básico, sem skins. Cada conta recebe um **ID público de 8 números**.
- **Saldo inicial (versão de testes):** 1.000 de ouro e **10.000 gemas**. Ouro também se ganha jogando: +60 por vitória e +20 por derrota.
- **Estatísticas:** vitórias, derrotas, % de vitórias, precisão e partidas.
- **Loja:** 50 skins em 5 abas (Chapéu, Rosto, Roupa, Costas e Calçado), com 4 raridades (Comum e Raro custam ouro; Épico e Lendário custam gemas). Dá para buscar pelo nome, filtrar por raridade, ordenar por preço, esconder o que já tem e **provar** antes de comprar.
- **Armazém:** grade com os seus itens, no estilo do DDTank. **Arraste** um item até o espaço do personagem para equipar (ou dê dois cliques), e arraste de volta para a grade para tirar. Funciona com o dedo no celular.
- **Amigos:** busque pelo ID ou apelido, ou clique no nome de alguém na sala para ver o perfil (skins e estatísticas) e mandar pedido. A lista mostra quem está **online**, **na sala** ou **em partida**. Na sala, o botão **Convidar amigos** manda um convite com o código.
- **Ranking:** os 50 jogadores com mais vitórias.
- **Convidados** jogam normalmente, mas não compram nem adicionam amigos. Ao criar conta, o progresso do convidado é transferido.

### Modo de desenvolvimento (agora) e Supabase (próximo passo)

Enquanto o Supabase não está ligado, o jogo roda em **modo de desenvolvimento**:
- a conta (saldo, itens, estatísticas) fica salva **no aparelho**;
- apelidos, amigos, pedidos e ranking ficam no servidor do jogo, no arquivo `dev-store.json`. No plano grátis do Render esse arquivo é apagado a cada deploy ou reinício.

**Como ligar o Supabase** (quando você tiver as chaves):
1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No painel, abra **SQL Editor**, cole o arquivo `db/schema.sql` inteiro e clique em **Run**. Isso cria as tabelas, as travas de segurança, as funções de compra e de amizade e os 50 itens.
3. Em **Authentication → Providers**, ative **E-mail** e **Google** (o Google pede um "Client ID" criado no Google Cloud; o painel do Supabase explica). Em **Authentication → Settings**, ative **Anonymous sign-ins** (convidados).
4. Em **Authentication → URL Configuration**, coloque o endereço do jogo (ex.: `https://vale-dos-canhoes.onrender.com`).
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** e me mande. Eu coloco no `SUPA` do `index.html`, ligo a gravação das partidas no servidor e testamos juntos.

A chave **service_role** é secreta: ela vai só nas variáveis de ambiente do Render, nunca no código do jogo.

## Personagens e armas

Todo mundo joga com o **mesmo personagem padrão** (camiseta azul, short preto e cabelo curto). A cor do time aparece na faixa do ombro, no nome e na barra de vida, e a personalização é feita com as skins da Loja. Cada jogador escolhe só a **arma**, que define o tiro. Todos têm **1000 de vida**.

| Arma | Como é |
|---|---|
| Canhão Pesado | tiro forte e confiável, área de dano grande e cratera pequena |
| Rifle de Precisão | muito dano, tiro rápido e trajetória plana |
| Cajado Arcano | queima o alvo por 2 turnos |
| Morteiro | duas bolas que se cruzam no ar e se juntam na queda; cada uma tem 60% do dano do Canhão (as duas juntas, 120%). Atire para o alto para acertar as duas |
| Bola Quicante | quica uma vez no chão (mais forte quanto mais alto vier) e explode no segundo toque; acerto direto explode na hora |


## Power-ups

Depois de usado, cada power-up recarrega em **5 rodadas**. A **cura recarrega em 10**.

| Tecla | Power-up | Efeito |
|---|---|---|
| 1 | Cura | +200 de vida na hora |
| 2 | Dano x2 | dobra o dano do próximo tiro (combina com os outros) |
| 3 | Tiro duplo | dois disparos seguidos, 70% do dano cada |
| 4 | Tiro triplo | três projéteis girando em espiral, 55% do dano cada |
| 5 | Bomba pesada | cratera 1,7× maior e +30% de dano |
| 6 | Chuva de bombas | 5 bombas caem do céu depois do impacto |
| 7 | Avião | você é teletransportado para onde o avião cair (sem dano) |

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
3. O link `https://<nome>.onrender.com` abre o jogo, e o modo **Online Servidor** já funciona por ele.

No plano gratuito, o servidor dorme depois de 15 minutos sem ninguém jogando e leva cerca de 1 minuto para acordar. Quando ele dorme ou reinicia, as salas abertas somem.

Para atualizar, basta enviar o novo `index.html` (e o `server.js`, se ele mudou) para o GitHub. O Render publica sozinho.

Se preferir o Fly.io (pago, servidor em São Paulo), o `Dockerfile` e o `fly.toml` já estão prontos: `fly deploy`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | o jogo inteiro (cliente) |
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
