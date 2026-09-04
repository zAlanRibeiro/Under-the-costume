/* ============================================================
   Fundo: poeira em suspensao e o jeito que ele acompanha o cursor
   ============================================================ */
(function () {
  "use strict";

  var semMovimento = window.MK.semMovimento;

  /* ----------------------------------------------------------
     1. Poeira em suspensão no ar parado da loja abandonada
     ---------------------------------------------------------- */
  (function poeira() {
    var tela = document.getElementById("poeira");
    if (!tela) return;
    var ctx = tela.getContext("2d");
    var motas = [];
    var larg = 0, alt = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function dimensionar() {
      larg = window.innerWidth;
      alt = window.innerHeight;
      tela.width = larg * dpr;
      tela.height = alt * dpr;
      tela.style.width = larg + "px";
      tela.style.height = alt + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      semear();
    }

    function semear() {
      var quantas = Math.round(Math.min(90, (larg * alt) / 17000));
      motas = [];
      for (var i = 0; i < quantas; i++) {
        motas.push({
          x: Math.random() * larg,
          y: Math.random() * alt,
          r: Math.random() * 1.5 + 0.4,
          vy: -(Math.random() * 0.16 + 0.03),
          fase: Math.random() * Math.PI * 2,
          amp: Math.random() * 0.35 + 0.08,
          alfa: Math.random() * 0.34 + 0.08,
          espectral: Math.random() < 0.22
        });
      }
    }

    function pintar() {
      ctx.clearRect(0, 0, larg, alt);
      for (var i = 0; i < motas.length; i++) {
        var m = motas[i];
        m.y += m.vy;
        m.fase += 0.006;
        if (m.y < -6) { m.y = alt + 6; m.x = Math.random() * larg; }
        var x = m.x + Math.sin(m.fase) * (m.amp * 24);
        var pulso = 0.75 + Math.sin(m.fase * 1.7) * 0.25;
        ctx.beginPath();
        ctx.arc(x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = m.espectral
          ? "rgba(160, 130, 210, " + (m.alfa * pulso).toFixed(3) + ")"
          : "rgba(227, 200, 106, " + (m.alfa * pulso * 0.8).toFixed(3) + ")";
        ctx.fill();
      }
      requestAnimationFrame(pintar);
    }

    dimensionar();
    window.addEventListener("resize", dimensionar);

    if (semMovimento) {
      for (var i = 0; i < motas.length; i++) {
        var m = motas[i];
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(227, 200, 106, " + (m.alfa * 0.7).toFixed(3) + ")";
        ctx.fill();
      }
    } else {
      requestAnimationFrame(pintar);
    }
  })();

  /* ----------------------------------------------------------
     2. Ele se inclina de leve na direção de quem está olhando
     ---------------------------------------------------------- */
  (function olhar() {
    if (semMovimento) return;
    var raiz = document.documentElement;
    var alvoX = 0, alvoY = 0, atualX = 0, atualY = 0, pedido = null;
    var LIMITE = 7;

    function suavizar() {
      atualX += (alvoX - atualX) * 0.12;
      atualY += (alvoY - atualY) * 0.12;
      raiz.style.setProperty("--olhar-x", atualX.toFixed(2) + "px");
      raiz.style.setProperty("--olhar-y", atualY.toFixed(2) + "px");
      if (Math.abs(alvoX - atualX) > 0.02 || Math.abs(alvoY - atualY) > 0.02) {
        pedido = requestAnimationFrame(suavizar);
      } else {
        pedido = null;
      }
    }

    window.addEventListener("pointermove", function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      alvoX = Math.max(-1, Math.min(1, nx)) * LIMITE;
      alvoY = Math.max(-1, Math.min(1, ny)) * LIMITE * 0.7;
      if (!pedido) pedido = requestAnimationFrame(suavizar);
    }, { passive: true });
  })();
})();
