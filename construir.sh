#!/usr/bin/env bash
# Junta index.html + css + js + imagens (como data URI) num arquivo unico em dist/.
# As imagens precisam ir embutidas: o visualizador de Artifact bloqueia arquivo externo.
set -e
raiz="$(cd "$(dirname "$0")" && pwd)"
saida="$raiz/dist/index.html"
subs="$raiz/dist/.substituicoes.sed"
mkdir -p "$raiz/dist"

: > "$subs"

# renders e sprites
for f in "$raiz"/imagens/*.png; do
  nome="$(basename "$f")"
  # delimitador | porque base64 contem barras
  echo "s|imagens/$nome|data:image/png;base64,$(base64 -w0 "$f")|g" >> "$subs"
done

# sprites de comida
for f in "$raiz"/imagens/comida/*.png; do
  nome="$(basename "$f")"
  echo "s|imagens/comida/$nome|data:image/png;base64,$(base64 -w0 "$f")|g" >> "$subs"
done

# sprites dos itens segurados
for f in "$raiz"/imagens/itens/*.png; do
  nome="$(basename "$f")"
  echo "s|imagens/itens/$nome|data:image/png;base64,$(base64 -w0 "$f")|g" >> "$subs"
done

# cartas do TCG (JPEG: 6x menor que o PNG original, e carta nao precisa de alfa)
for f in "$raiz"/imagens/tcg/*.jpg; do
  nome="$(basename "$f")"
  echo "s|imagens/tcg/$nome|data:image/jpeg;base64,$(base64 -w0 "$f")|g" >> "$subs"
done

{
  echo '<title>Sob o Pano de Mimikyu</title>'
  grep 'fonts\.' "$raiz/index.html"
  echo '<style>'
  # a mesma ordem dos <link> do index.html: a cascata depende dela
  for m in base heroi conteudo builds cartas palco guarda-roupa anatomia; do
    cat "$raiz/css/$m.css"
  done
  echo '</style>'
  awk '/<body>/{f=1;next} /<\/body>/{f=0} f' "$raiz/index.html" \
    | grep -vE '<script src="js/' \
    | sed -f "$subs"
  echo '<script>'
  cat "$raiz/js/comum.js"
  cat "$raiz/js/fantasias.js"

  # as 50 fantasias sao montadas em tempo de execucao pelo JS, entao o sed do HTML
  # nao as alcanca: vao num mapa id -> data URI que o guarda-roupa.js consulta
  echo 'window.FANTASIA_IMG = {'
  for f in "$raiz"/imagens/fantasias/*.png; do
    id="$(basename "$f" .png)"
    echo "\"$id\":\"data:image/png;base64,$(base64 -w0 "$f")\","
  done
  echo '};'

  # o proprio JS tambem cita imagens (o icone dos slots vazios)
  for m in fundo palco guarda-roupa anatomia interface; do
    sed -f "$subs" "$raiz/js/$m.js"
  done
  echo '</script>'
} > "$saida"

rm -f "$subs"
restantes="$(grep -c 'src="imagens/\|href="imagens/' "$saida" || true)"
echo "gerado:  $saida"
echo "tamanho: $(( $(wc -c < "$saida") / 1024 )) KB"
echo "imagens: $(grep -o 'data:image/' "$saida" | wc -l) embutidas · $restantes referencias externas restantes"
