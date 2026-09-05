/* ============================================================
   Um punhado de coisas que todos os modulos consultam.
   Precisa vir antes dos outros scripts.
   ============================================================ */
window.MK = (function () {
  var CHAVE = "mimikyu.movimento";

  /* A mesma conta que o script no <head> ja fez para pintar a classe: a escolha
     do visitante manda, e so na falta dela vale o pedido do sistema. Os dois
     precisam concordar, senao o CSS e o JS discordam sobre o que animar. */
  function guardado() {
    try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
  }
  function calcular() {
    var quer = guardado();
    if (quer !== null) return quer === "nao";
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  return {
    /* quem pediu menos movimento nao recebe as animacoes que sacodem a tela */
    semMovimento: calcular(),

    /* o sistema so vale enquanto o visitante nao tiver opinado */
    pediuPeloSistema: function () {
      return guardado() === null;
    },

    /* trocar movimento remexe animacao de canvas, timers e classes espalhadas
       por cinco modulos; recarregar e o jeito honesto de todos concordarem */
    definirMovimento: function (ligado) {
      try { localStorage.setItem(CHAVE, ligado ? "sim" : "nao"); } catch (e) {}
      location.reload();
    }
  };
})();
