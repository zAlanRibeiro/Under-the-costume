/* ============================================================
   Diagrama de anatomia: acende a parte que voce aponta
   ============================================================ */
(function () {
  "use strict";

  /* ----------------------------------------------------------
     3c. Diagrama de anatomia: acende a parte que você aponta
     ---------------------------------------------------------- */
  (function anatomia() {
    var caixa = document.querySelector(".diagrama");
    if (!caixa) return;

    var focoA = document.getElementById("foco-a");
    var focoB = document.getElementById("foco-b");
    var anelA = document.getElementById("anel-a");
    var anelB = document.getElementById("anel-b");
    var dica  = document.getElementById("diagrama-dica");
    if (!focoA || !focoB) return;

    var chamadas = Array.prototype.slice.call(caixa.querySelectorAll(".chamada"));
    var itens    = Array.prototype.slice.call(document.querySelectorAll(".legenda-item"));
    if (!chamadas.length) return;

    var presa = null;      /* parte fixada por clique */
    var mexeu = false;

    /* "356,74,62" -> posiciona o recorte e o anel que o contorna */
    function porFoco(circulo, anel, spec) {
      if (!spec) {
        circulo.setAttribute("r", 0);
        if (anel) anel.setAttribute("r", 0);
        return;
      }
      var p = spec.split(",");
      circulo.setAttribute("cx", p[0]);
      circulo.setAttribute("cy", p[1]);
      circulo.setAttribute("r",  p[2]);
      if (anel) {
        anel.setAttribute("cx", p[0]);
        anel.setAttribute("cy", p[1]);
        anel.setAttribute("r",  p[2]);
      }
    }

    function acender(parte) {
      var g = null;
      for (var i = 0; i < chamadas.length; i++) {
        var ativa = chamadas[i].dataset.parte === parte;
        chamadas[i].classList.toggle("ativa", ativa);
        chamadas[i].classList.toggle("presa", ativa && presa === parte);
        if (ativa) g = chamadas[i];
      }
      itens.forEach(function (it) {
        it.classList.toggle("ativa", it.dataset.parte === parte);
      });
      if (!g) return;

      /* o segundo foco só existe nas partes que são duas: orelhas e bochechas */
      porFoco(focoA, anelA, g.dataset.fa);
      porFoco(focoB, anelB, g.dataset.fb);
      caixa.classList.add("focando");

      if (!mexeu && dica) { mexeu = true; dica.classList.add("sumiu"); }
    }

    function apagar() {
      if (presa) { acender(presa); return; }
      caixa.classList.remove("focando");
      chamadas.forEach(function (c) { c.classList.remove("ativa", "presa"); });
      itens.forEach(function (it) { it.classList.remove("ativa"); });
      /* os focos encolhem no lugar onde estavam, em vez de saltar para o centro */
      focoA.setAttribute("r", 0);
      focoB.setAttribute("r", 0);
      anelA.setAttribute("r", 0);
      anelB.setAttribute("r", 0);
    }

    function fixar(parte) {
      presa = (presa === parte) ? null : parte;
      if (presa) acender(presa); else apagar();
    }

    function ligar(el, parte) {
      el.addEventListener("mouseenter", function () { if (!presa) acender(parte); });
      el.addEventListener("mouseleave", function () { if (!presa) apagar(); });
      el.addEventListener("click", function () { fixar(parte); });
      el.addEventListener("focus", function () { if (!presa) acender(parte); });
      el.addEventListener("blur", function () { if (!presa) apagar(); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          fixar(parte);
        }
      });
    }

    chamadas.forEach(function (g) { ligar(g, g.dataset.parte); });
    itens.forEach(function (it) { ligar(it, it.dataset.parte); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && presa) { presa = null; apagar(); }
    });
  })();
})();
