#!/usr/bin/env bash
# Divide css/estilo.css e js/principal.js em modulos menores.
# A ordem dos trechos e preservada exatamente: concatenar os arquivos
# gerados na ordem de carregamento reproduz os originais byte a byte.
set -e
raiz="$(cd "$(dirname "$0")/.." && pwd)"
cd "$raiz"

# ---------------------------------------------------------------- CSS
recorta_css() {  # nome  primeira  ultima
  sed -n "$2,$3p" css/estilo.css > "css/$1"
  echo "  css/$1  ($(wc -l < "css/$1") linhas)"
}

echo "CSS:"
recorta_css base.css          1    183
recorta_css heroi.css         184  308
recorta_css conteudo.css      309  624
recorta_css builds.css        625  766
recorta_css cartas.css        767  860
recorta_css palco.css         861  1159
recorta_css guarda-roupa.css  1160 1464
recorta_css anatomia.css      1465 1561

# ---------------------------------------------------------------- JS
# Cada modulo mantem o mesmo involucro do original — IIFE + "use strict" —
# para o codigo de dentro continuar identico, indentacao inclusive.
# Quem precisa de semMovimento pega de comum.js.
recorta_js() {   # nome  primeira  ultima  titulo  precisa_semmovimento
  {
    echo "/* ============================================================"
    echo "   $4"
    echo "   ============================================================ */"
    echo "(function () {"
    echo '  "use strict";'
    echo ""
    if [ "$5" = "sim" ]; then
      echo "  var semMovimento = window.MK.semMovimento;"
      echo ""
    fi
    sed -n "$2,$3p" js/principal.js
    echo "})();"
  } > "js/$1"
  echo "  js/$1  ($(wc -l < "js/$1") linhas)"
}

echo "JS:"
recorta_js fundo.js         9    110  "Fundo: poeira em suspensao e o jeito que ele acompanha o cursor" sim
recorta_js palco.js         112  595  "Palco: carinho, comida, amizade, o disfarce e o susto"          sim
recorta_js guarda-roupa.js  597  907  "Guarda-roupa: ele costura um pano novo por retalho"             nao
recorta_js anatomia.js      909  1006 "Diagrama de anatomia: acende a parte que voce aponta"           nao
recorta_js interface.js     1008 1097 "Interface: o pano, copiar build e a navegacao"                  nao

echo ""
echo "Confira o resultado com: dados/conferir.sh"
