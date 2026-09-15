/* ============================================================
   Interface: o pano, copiar build e a navegacao
   ============================================================ */
(function () {
  "use strict";

  /* ----------------------------------------------------------
     O interruptor de movimento
     O sistema so decide enquanto ninguem tiver opinado. No Windows o preset
     "melhor desempenho" desliga as animacoes e o navegador passa a reportar
     reduce, entao muita gente cai aqui sem nunca ter pedido menos movimento.
     ---------------------------------------------------------- */
  (function movimento() {
    var botao = document.getElementById("botao-movimento");
    if (!botao) return;
    var rotulo = botao.querySelector(".texto");

    function pintar() {
      var sem = window.MK.semMovimento;
      /* sem aria-pressed: o texto ja diz a acao, e os dois juntos fariam o leitor
         de tela anunciar "Desligar o movimento, pressionado" */
      rotulo.textContent = sem ? "Ligar o movimento" : "Desligar o movimento";
      botao.title = window.MK.pediuPeloSistema()
        ? "Seguindo a preferencia do seu sistema"
        : "Sua escolha, guardada neste navegador";
    }

    pintar();
    botao.addEventListener("click", function () {
      window.MK.definirMovimento(window.MK.semMovimento);
    });
  })();

  /* ----------------------------------------------------------
     4. Levantar o pano (não levante o pano)
     ---------------------------------------------------------- */
  (function pano() {
    var botao = document.getElementById("botao-pano");
    var revelacao = document.getElementById("revelacao");
    var aviso = document.getElementById("aviso");
    if (!botao || !revelacao) return;

    botao.addEventListener("click", function () {
      var abrir = revelacao.hidden;
      revelacao.hidden = !abrir;
      aviso.classList.toggle("revelado", abrir);
      botao.textContent = abrir ? "Fechar o pano" : "Levantar o pano mesmo assim";
      botao.classList.toggle("discreto", abrir);
      if (!abrir) location.hash = "#pano";
    });
  })();

  /* ----------------------------------------------------------
     5. Copiar o bloco de build para o Pokémon Showdown
     ---------------------------------------------------------- */
  (function copiarBuilds() {
    var botoes = document.querySelectorAll(".botao-copiar");
    Array.prototype.forEach.call(botoes, function (botao) {
      botao.addEventListener("click", function () {
        var bloco = document.getElementById("sd-" + botao.dataset.copiar);
        if (!bloco) return;
        var texto = bloco.textContent;

        function confirmar(ok) {
          botao.textContent = ok ? "Copiado" : "Selecione e copie";
          botao.classList.toggle("feito", ok);
          setTimeout(function () {
            botao.textContent = "Copiar";
            botao.classList.remove("feito");
          }, 2200);
        }

        function selecionar() {
          var faixa = document.createRange();
          faixa.selectNodeContents(bloco);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(faixa);
          confirmar(false);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(texto).then(function () { confirmar(true); }, selecionar);
        } else {
          selecionar();
        }
      });
    });
  })();

  /* ----------------------------------------------------------
     6. Marcar a seção em que o leitor está
     ---------------------------------------------------------- */
  (function navegacao() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".navegacao a"));
    if (!links.length || !("IntersectionObserver" in window)) return;

    var porId = {};
    var secoes = [];
    links.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var s = document.getElementById(id);
      if (s) { porId[id] = a; secoes.push(s); }
    });

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var a = porId[e.target.id];
        if (a) a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    secoes.forEach(function (s) { observador.observe(s); });
  })();
})();
