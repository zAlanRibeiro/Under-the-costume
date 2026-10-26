# Sob o Pano de Mimikyu

Um dossiê de campo sobre Mimikyu, o Pokémon Disfarce — feito como fã-site, sem fins lucrativos.

**Site:** https://zalanribeiro.github.io/Under-the-costume/

Vinte centímetros de pano velho sobre uma coisa que ninguém descreveu duas vezes. A página trata o Mimikyu como um verbete de arquivo: entradas de Pokédex, anatomia do disfarce, ficha de campo, builds competitivas, as cartas do TCG — e algumas coisas que ele faz se você ficar por perto tempo suficiente.

## O que tem dentro

| Seção | Conteúdo |
|---|---|
| **Palco** | Carinho com o cursor, comida, medidor de amizade de 0 a 255 e o disfarce que quebra com um golpe |
| **Registro** | Seis entradas de Pokédex, de Sol e Lua a Escarlate e Violeta |
| **Anatomia** | Diagrama com seis chamadas sobre a arte oficial, com barra de escala real (0,2 m) |
| **Ficha** | Estatísticas-base, tabela de tipos calculada e a habilidade Disguise |
| **Golpes** | Oito golpes com poder, precisão e efeito |
| **Moveset** | Três builds do Smogon com EVs, IVs, nature e bloco pronto para o Pokémon Showdown |
| **Habitat** | Onde ele aparece nos jogos |
| **Retratos** | Arte oficial, modelos 3D e sprites de jogo |
| **Guarda-roupa** | Gacha de 50 roupinhas, liberado ao chegar na amizade máxima |
| **Dança** | Jogo de ritmo: um Mimikyu 3D dança na frente de uma TV que toca o clipe. A fita padrão é do BTS, com as batidas achadas antes; para qualquer outro link do YouTube ele escuta a aba e acha o ritmo sozinho |
| **Cartas** | As 34 cartas de TCG dele, de 2017 a 2026, agrupadas por era |

Insistir com o disfarce já quebrado tem consequência. Você foi avisado na própria página.

## Como rodar

É um site estático, sem build obrigatório e sem dependências. Abra o `index.html` no navegador, ou sirva a pasta:

```bash
python -m http.server 8000
# depois: http://localhost:8000
```

A pista de dança é a exceção ao "abra direto": o YouTube recusa tocar em página aberta do disco (`file://`), então para ela sirva a pasta.

## Estrutura

```
index.html            a página inteira

css/                  ORDEM IMPORTA — a cascata depende dela
  base.css            tokens, reset, fundo, cabeçalho, layout de seção
  heroi.css           moldura do herói, selos, medidores
  conteudo.css        registros, anatomia, ficha, golpes, habitat, retratos, rodapé
  builds.css          as três builds competitivas
  cartas.css          galeria do TCG
  palco.css           carinho, comida, amizade e o susto
  guarda-roupa.css    gacha, roleta e varal
  anatomia.css        diagrama interativo
  ritmo.css           a pista de dança

js/                   comum.js precisa vir primeiro
  comum.js            window.MK — o que todos consultam
  fantasias.js        dados das 50 roupinhas
  fundo.js            poeira em canvas e o olhar que segue o cursor
  palco.js            carinho, comida, amizade, disfarce e susto
  guarda-roupa.js     sorteio, roleta, varal e as duas gavetas de gravacao
  anatomia.js         foco de luz no diagrama
  interface.js        o pano, copiar build e navegação
  batidas.js          as batidas da fita (gerado por dados/ritmo.py, não editar)
  ritmo.js            a pista de dança: o modelo 3D, a TV, a escuta e o julgamento das notas

imagens/              arte oficial, modelos 3D e sprites
  fantasias/          as 50 roupinhas, fatiadas da folha de referência
  tcg/                as 34 cartas
  itens/ comida/      sprites de itens
costumes.jpg          folha de referência com as 50 fantasias (fonte dos sprites)
modelos/              o Mimikyu 3D da pista de dança (.glb)
dados/                JSONs de origem, URLs das cartas e os scripts que fatiam a folha e acham as batidas
construir.sh          empacota tudo num arquivo único em dist/
```

> **A ordem dos `<link>` e dos `<script>` no `index.html` não é decorativa.** O CSS foi
> escrito como uma cascata contínua e os arquivos são fatias dela na sequência original;
> trocar a ordem quebra sobrescritas. No JS, `comum.js` define `window.MK`, que os outros
> módulos leem. O `construir.sh` concatena na mesma ordem.

### `construir.sh`

Junta HTML, CSS, JS e **todas** as imagens (como data URI) num único `dist/index.html`. Serve para publicar em ambientes que bloqueiam arquivos externos. O site em si não precisa dele.

```bash
./construir.sh
```

## De onde vêm os dados

- **Arte oficial, modelos do Pokémon HOME e sprites** — [PokéAPI](https://pokeapi.co)
- **As 34 cartas** — [Pokémon TCG API](https://pokemontcg.io)
- **Builds competitivas** — [Smogon](https://www.smogon.com/dex/sv/pokemon/mimikyu/)
- **As batidas da fita** — achadas por [`dados/ritmo.py`](dados/ritmo.py) no áudio dos próprios clipes, partindo do BPM de [SongBPM](https://songbpm.com/@bts) e [Tunebat](https://tunebat.com). Os clipes tocam pelo player do YouTube, direto dos canais oficiais
- **O Mimikyu 3D** — [modelo de Minecraft_Master](https://sketchfab.com/3d-models/pokemon-pikachu-4949a0c1c03a47c6892a585c3ed39cf6) no Sketchfab, sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), via [Pokémon 3D API](https://github.com/Pokemon-3D-api/assets). A única mudança foi tirar a compressão Draco, para o site não precisar baixar o decodificador
- **Percentuais de uso em duplas** — [Pikalytics](https://www.pikalytics.com/pokedex/gen9doublesou/Mimikyu)
- **As 50 roupinhas** — folha de referência gerada com Gemini (`costumes.jpg`), fatiada em sprites individuais por [`dados/fatiar.py`](dados/fatiar.py) (precisa de Pillow e numpy)

## Detalhes de implementação

- **Tema escuro único, de propósito** — a luz do sol adoece o Mimikyu, então não há modo claro.
- **Sem dependências** — nada de framework. Só as fontes do Google Fonts, e duas exceções que só descem quando alguém escolhe uma música na pista de dança: o [Three.js](https://threejs.org) 0.170.0 (com o `GLTFLoader`), do jsDelivr, via importmap, e a API de iframe do YouTube.
- **O ritmo da fita é achado em casa** — o YouTube não deixa a página ler o áudio do vídeo embutido. `dados/ritmo.py` baixa o áudio de cada clipe com yt-dlp (o que os termos do YouTube não permitem; o áudio fica na pasta temporária do sistema e só os tempos entram no repositório), acha as batidas com librosa e ajusta uma reta por trecho de tempo constante, que acerta abaixo dos 12 ms de um quadro de análise. As notas caem onde a música bate de verdade, então as falas e as pausas do clipe ficam sem nota. Para mudar a fita: troque os `data-video`/`data-bpm` no `index.html` e rode `python dados/ritmo.py` (precisa de yt-dlp, librosa e imageio-ffmpeg).
- **Link novo é ouvido ao vivo** — o jogo pede para compartilhar o áudio da própria aba (Chrome ou Edge no computador; o celular não deixa). Um AudioWorklet mede a energia de seis faixas de frequência, um pente fino testa andamento e fase a cada meio segundo, e o jogo só começa quando quatro palpites seguidos concordam. Depois o pente é refeito a cada 2 s, preso perto do tempo atual, e puxa a grade. Os parâmetros saíram de rodar a mesma conta no áudio das 11 músicas da fita: acerta o andamento em todas, menos FAKE LOVE, que fica no dobro do tempo.
- **O atraso do som se corrige sozinho** — cada acerto puxa a grade 15% na direção do erro. E quatro toques seguidos fora da janela com o mesmo atraso (fone Bluetooth atrasa 150 a 250 ms) fazem a grade pular de uma vez, senão quem está longe demais nunca acertaria para começar a corrigir.
- **O Mimikyu dança pelos ossos** — o modelo tem esqueleto; a animação que vem no arquivo não tem ritmo, então cabeça, orelhas e cauda são giradas no compasso da grade, cada uma por uma mola (chega um tiquinho atrasada e passa do ponto antes de assentar). Os ossos vêm com eixos tortos, então o giro é pedido nos eixos do modelo e convertido para o de cada osso. ← → ↑ ↓ fazem ele andar, pular e girar; errar faz a cabeça tombar e quicar. O material vira desenho animado: três faixas de luz e o contorno escuro do `OutlineEffect` do Three.js.
- **A música não pula, só muda de velocidade** — o player fica sem barra, sem tela cheia e sem teclado, e a TV não aceita clique enquanto toca (só antes do primeiro play, para quando o navegador barra o autoplay). Tecla de mídia e a central de mídia do navegador ainda conseguem pular: um vigia confere a cada ¼ de segundo se o vídeo andou mais do que o tempo deixava e volta, e o relógio do jogo segura o último tempo bom até lá, senão as notas do caminho seriam dadas como perdidas. A velocidade vai de 0,5× a 1,5×; o relógio, as notas e a dança andam no tempo do vídeo, então a janela de cada nota fica mais folgada a 0,5× e mais justa a 1,5×. No link novo a escuta recomeça a cada troca e fica menos confiável devagar, porque o YouTube estica o áudio e borra os ataques.
- **Anúncio não conta como música** — os clipes são monetizados e o site não tem como (nem pode, pela política do YouTube) tirar o anúncio do player. Durante o anúncio o player já diz "tocando", mas informa o tempo do clipe parado no zero; o jogo só larga quando esse tempo anda, e enquanto isso avisa que é anúncio. Sem isso, nas músicas de abertura curta as primeiras notas viravam erro, e no link novo ele tentaria pegar o ritmo da música do anúncio.
- **No celular a dança abre numa tela só dela** — no meio da página o jogo ficava espremido, então ali a seção mostra só um botão. Ele abre a dança em tela cheia: primeiro a escolha da música e da velocidade; escolhida, um close do Mimikyu (a câmera chega perto e acompanha os passos, a TV vai para o canto) com a pista embaixo, perto dos polegares, e dois botões em cima, para escolher outra música ou sair. É o mesmo jogo com outra roupa no CSS, nada se repete; abrir empilha uma entrada no histórico, então o voltar do aparelho também sai. Deitado (tela de toque com até 520 px de altura) o Mimikyu e a pista ficam lado a lado. Quando o navegador barra o autoplay, o que o Safari do iPhone sempre faz, a TV vem para o meio pedindo o toque. No computador fica como estava.
- **O relógio aguenta o Safari** — no Chrome o player informa o tempo do clipe a cada 5 ms, exato. No WebKit (o motor do Safari) ele informa a cada ~250 ms, e boa parte das vezes um valor de uma volta atrás, nunca adiantado. Seguir cada amostra fazia o relógio do jogo pular; ele segue o teto das amostras dos últimos 4 s. Reproduzindo 20 s de tempos gravados no WebKit, o erro mediano do relógio caiu de 264 ms para 5 ms.
- **A pista é a do Guitar Hero** — estrada em perspectiva desenhada num canvas, com as notas andando em profundidade (nascem pequenas no fundo e aceleram ao chegar), trastes e gemas em verde, vermelho, amarelo e azul, facho de luz ao apertar, anel e faíscas no acerto. Os botões de verdade ficam por cima, invisíveis, só para o toque e o foco. Com movimento reduzido, sem faíscas e sem o anel crescendo.
- **Fundo em canvas** — poeira em suspensão, com uma versão estática para quem pede menos movimento.
- **`prefers-reduced-motion`** é respeitado em toda parte, inclusive no susto, que perde o salto, o clarão, o tremor e o som, e na pista de dança, onde o boneco não gira nem pula e balança bem menos.
- **A coleção do gacha é guardada em duas gavetas** (`MK.cofre`, em `comum.js`): `localStorage` para ler rápido e síncrono no boot, e IndexedDB como segunda cópia. Um carimbo `salvoEm` decide quem está mais novo quando as duas discordam, e a mais nova recompõe a outra — nos dois sentidos. Se as duas estiverem trancadas, a página **diz isso** em vez de perder tudo calada.
- **A amizade não é salva de propósito** — ela recomeça do zero a cada visita. Só a gaveta destrancada e as roupinhas atravessam.
- **As roupinhas tiveram o fundo removido por flood fill a partir das bordas**, não por chave de cor, para preservar o branco interno do jaleco do médico, do chapéu do chef e dos ossos do esqueleto.

## Direitos e afiliação

> **Este não é um site oficial de Pokémon.** É um projeto de fã, sem fins lucrativos, e **não tem
> nenhuma afiliação, patrocínio, aprovação ou endosso** da Nintendo, da Creatures Inc. ou da
> GAME FREAK inc.

Pokémon, Mimikyu e todos os nomes, personagens, cartas, sprites e imagens relacionados são marcas
registradas e obras protegidas de seus respectivos detentores, reproduzidos aqui apenas para fins
informativos. **Pokémon © 1995–2026 Nintendo · Creatures Inc. · GAME FREAK inc.**

O site não tem publicidade, monetização, doações nem qualquer outra exploração comercial, e não
distribui ROMs, jogos ou material que não seja informativo.

### Sobre licença

Este repositório **não tem licença open source**, e é intencional: boa parte do conteúdo aqui não é
minha para licenciar. Uma licença permissiva no repositório inteiro estaria dizendo que qualquer um
pode reusar comercialmente arte e sprites que pertencem à Nintendo — o que eu não posso autorizar.

Se você quiser aproveitar alguma coisa, o código (HTML, CSS, JS e os scripts de build) é a parte que
eu escrevi. As imagens em `imagens/` não são minhas e não estão cobertas por nenhuma permissão daqui. O modelo em `modelos/` é de Minecraft_Master, sob CC BY 4.0, e segue com essa licença.

Se você detém direitos sobre algum material usado aqui e quer que ele seja removido, abra uma issue
ou entre em contato — atendo na hora.
