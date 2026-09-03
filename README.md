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
| **Cartas** | As 34 cartas de TCG dele, de 2017 a 2026, agrupadas por era |

Insistir com o disfarce já quebrado tem consequência. Você foi avisado na própria página.

## Como rodar

É um site estático, sem build obrigatório e sem dependências. Abra o `index.html` no navegador, ou sirva a pasta:

```bash
python -m http.server 8000
# depois: http://localhost:8000
```

## Estrutura

```
index.html            a página inteira
css/estilo.css        folha de estilo única
js/fantasias.js       dados das 50 roupinhas do gacha
js/principal.js       poeira de fundo, palco, gacha, susto e navegação
imagens/              arte oficial, modelos 3D e sprites
  fantasias/          as 50 roupinhas, fatiadas da folha de referência
  tcg/                as 34 cartas
  itens/ comida/      sprites de itens
dados/                JSONs de origem e o script que fatiou as fantasias
construir.sh          empacota tudo num arquivo único em dist/
```

### `construir.sh`

Junta HTML, CSS, JS e **todas** as imagens (como data URI) num único `dist/index.html`. Serve para publicar em ambientes que bloqueiam arquivos externos. O site em si não precisa dele.

```bash
./construir.sh
```

## De onde vêm os dados

- **Arte oficial, modelos do Pokémon HOME e sprites** — [PokéAPI](https://pokeapi.co)
- **As 34 cartas** — [Pokémon TCG API](https://pokemontcg.io)
- **Builds competitivas** — [Smogon](https://www.smogon.com/dex/sv/pokemon/mimikyu/)
- **Percentuais de uso em duplas** — [Pikalytics](https://www.pikalytics.com/pokedex/gen9doublesou/Mimikyu)
- **As 50 roupinhas** — folha de referência gerada com Gemini, fatiada por [`dados/fatiar.ps1`](dados/fatiar.ps1)

## Detalhes de implementação

- **Tema escuro único, de propósito** — a luz do sol adoece o Mimikyu, então não há modo claro.
- **Sem dependências** — nada de framework, nada de CDN. Só as fontes do Google Fonts.
- **Fundo em canvas** — poeira em suspensão, com uma versão estática para quem pede menos movimento.
- **`prefers-reduced-motion`** é respeitado em toda parte, inclusive no susto, que perde o salto, o clarão, o tremor e o som.
- **O gacha salva em `localStorage`**, dentro de `try/catch` — se o navegador bloquear, a página segue funcionando.
- **As roupinhas tiveram o fundo removido por flood fill a partir das bordas**, não por chave de cor, para preservar o branco interno do jaleco do médico, do chapéu do chef e dos ossos do esqueleto.

## Direitos

Fã-site sem fins lucrativos, feito por gosto. **Pokémon é © Nintendo · Creatures Inc. · GAME FREAK inc.** Todas as imagens de personagens, cartas e sprites pertencem aos seus detentores. Nenhum uso comercial.
