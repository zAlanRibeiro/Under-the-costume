#!/usr/bin/env bash
# Prova que a divisao nao perdeu nem alterou nada.
set -e
raiz="$(cd "$(dirname "$0")/.." && pwd)"; cd "$raiz"

ORDEM_CSS="base heroi conteudo builds cartas palco guarda-roupa anatomia"

echo "== CSS: concatenar na ordem de carregamento reproduz o original? =="
: > /tmp/css-remontado.css
for m in $ORDEM_CSS; do cat "css/$m.css" >> /tmp/css-remontado.css; done
if diff -q --strip-trailing-cr css/estilo.css /tmp/css-remontado.css > /dev/null; then
  echo "  IDENTICO ($(wc -l < css/estilo.css) linhas)"
else
  echo "  DIFERENTE:";  diff --strip-trailing-cr css/estilo.css /tmp/css-remontado.css | head -20; exit 1
fi

echo ""
echo "== JS: chaves e parenteses balanceados em cada modulo? =="
for f in js/comum.js js/fantasias.js js/fundo.js js/palco.js js/guarda-roupa.js js/anatomia.js js/interface.js; do
  a=$(tr -cd '{' < "$f" | wc -c); b=$(tr -cd '}' < "$f" | wc -c)
  c=$(tr -cd '(' < "$f" | wc -c); d=$(tr -cd ')' < "$f" | wc -c)
  if [ "$a" = "$b" ] && [ "$c" = "$d" ]; then
    printf "  ok   %-22s {} %-4s ()  %s\n" "$f" "$a" "$c"
  else
    printf "  ERRO %-22s { %s } %s   ( %s ) %s\n" "$f" "$a" "$b" "$c" "$d"; exit 1
  fi
done

echo ""
echo "== JS: o codigo util e o mesmo? =="
: > /tmp/js-antigo.txt
sed -n '9,1097p' js/principal.js | sed 's/^[[:space:]]*//' | grep -v '^$' > /tmp/js-antigo.txt
: > /tmp/js-novo.txt
for f in js/fundo.js js/palco.js js/guarda-roupa.js js/anatomia.js js/interface.js; do
  sed '1,3d' "$f" | sed 's/^[[:space:]]*//' | grep -v '^$'
done | grep -v '^(function () {$' | grep -v '^"use strict";$' \
     | grep -v '^var semMovimento = window.MK.semMovimento;$' | grep -v '^})();$' > /tmp/js-novo.txt
antigo=$(grep -v '^})();$' /tmp/js-antigo.txt | wc -l)
novo=$(wc -l < /tmp/js-novo.txt)
echo "  linhas de codigo antes: $antigo   depois: $novo"
