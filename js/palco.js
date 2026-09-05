/* ============================================================
   Palco: carinho, comida, amizade, o disfarce e o susto
   ============================================================ */
(function () {
  "use strict";

  var semMovimento = window.MK.semMovimento;

  /* ----------------------------------------------------------
     3. O palco: carinho, comida, amizade, o disfarce e o susto
     ---------------------------------------------------------- */
  (function palco() {
    var alvo = document.getElementById("alvo");
    if (!alvo) return;

    var area      = document.getElementById("area-carinho");
    var faiscas   = document.getElementById("faiscas");
    var impacto   = document.getElementById("impacto");
    var recado    = document.getElementById("recado");

    var estado    = document.getElementById("medidor-estado");
    var barra     = document.getElementById("medidor-barra");
    var trilho    = barra.parentElement;

    var afetoBarra  = document.getElementById("amizade-barra");
    var afetoTrilho = document.getElementById("amizade-trilho");
    var afetoValor  = document.getElementById("amizade-valor");
    var afetoEstado = document.getElementById("amizade-estado");

    /* a classe .bateu no contentor rege todas as animações do susto, por isso
       as camadas de dentro não precisam ser tocadas uma a uma pelo script */
    var susto       = document.getElementById("susto");
    var sustoFechar = document.getElementById("susto-fechar");
    var sustoPoeira = document.getElementById("susto-poeira");

    /* --- estado --- */
    var AFETO_MAX = 255;
    var COSTURA = 14000;          /* ele leva a noite toda; aqui, catorze segundos */
    var LIMIAR_SUSTO = 5;         /* cliques insistentes com o disfarce já rasgado */
    var SACIEDADE_MAX = 8;

    var afeto = 0;
    var quebrado = false;
    var inicioReparo = 0;
    var duracaoReparo = COSTURA;
    var insistencia = 0;
    var saciedade = 0;
    var empanturrado = false;
    var sustoAberto = false;
    var ultimoFoco = null;

    function texto(t) { recado.textContent = t; }
    function sorteio(lista) { return lista[Math.floor(Math.random() * lista.length)]; }

    /* ==========================================================
       Amizade — a mesma escala de 0 a 255 do jogo
       ========================================================== */
    var marcosVistos = {};
    var marcos = [
      { em: 60,  txt: "Ele parou de recuar quando você chega perto." },
      { em: 120, txt: "A orelha direita levantou um pouco. Só um pouco." },
      { em: 180, txt: "Ele encostou a cabeça na sua mão e ficou assim." },
      { em: 255, txt: "Ele terminou um segundo pano. Do seu tamanho." }
    ];

    function rotuloAfeto(v) {
      if (v >= 250) return "Não vai mais te largar";
      if (v >= 180) return "Apegado";
      if (v >= 120) return "Aliviado";
      if (v >= 60)  return "Chegando perto";
      if (v >= 1)   return "Reparando em você";
      return "Desconfiado";
    }

    function pintarAfeto(despencou) {
      afetoBarra.style.width = (afeto / AFETO_MAX * 100).toFixed(1) + "%";
      afetoValor.textContent = afeto + " / " + AFETO_MAX;
      afetoEstado.textContent = rotuloAfeto(afeto);
      afetoTrilho.setAttribute("aria-valuenow", afeto);
      afetoBarra.classList.toggle("maxima", afeto >= AFETO_MAX);
      alvo.classList.toggle("amado", afeto >= AFETO_MAX);
      afetoBarra.classList.toggle("despencou", !!despencou);
      if (despencou) {
        setTimeout(function () { afetoBarra.classList.remove("despencou"); }, 900);
      }
    }

    /* sobra de afeto depois do máximo: é o que vira retalho de costura */
    var sobra = 0;
    var POR_RETALHO = 25;

    function avisar(nome, dados) {
      document.dispatchEvent(new CustomEvent(nome, { detail: dados }));
    }

    function somarAfeto(delta) {
      var antes = afeto;
      var bruto = afeto + delta;
      afeto = Math.max(0, Math.min(AFETO_MAX, bruto));
      pintarAfeto(delta < 0);
      avisar("mimikyu:amizade", { valor: afeto, max: AFETO_MAX });
      if (delta <= 0) return;

      for (var i = 0; i < marcos.length; i++) {
        if (!marcosVistos[marcos[i].em] && antes < marcos[i].em && afeto >= marcos[i].em) {
          marcosVistos[marcos[i].em] = true;
          texto(marcos[i].txt);
        }
      }
      if (antes < AFETO_MAX && afeto >= AFETO_MAX) avisar("mimikyu:maximo", {});

      /* o que passou de 255 não se perde: acumula até virar retalho */
      if (bruto > AFETO_MAX) {
        sobra += bruto - AFETO_MAX;
        while (sobra >= POR_RETALHO) {
          sobra -= POR_RETALHO;
          avisar("mimikyu:retalho", { quantos: 1 });
        }
      }
    }

    /* ==========================================================
       Carinho — enquanto o cursor passeia em cima dele
       ========================================================== */
    var acumulado = 0, ultimoX = null, ultimoY = null;
    var ultimoPonto = 0, ultimoRecadoCarinho = 0;

    var carinhoInteiro = [
      "Ele fechou os olhos desenhados.",
      "O pano está morno.",
      "Ele se encostou na sua mão.",
      "A cauda de graveto balançou uma vez.",
      "Ele não está acostumado com isso.",
      "Alguma coisa embaixo do pano fez um barulhinho."
    ];
    var carinhoQuebrado = [
      "Ele deixou você chegar perto mesmo assim.",
      "Está tremendo, mas não se afastou.",
      "Ele está costurando e recebendo carinho ao mesmo tempo.",
      "Você quebrou o disfarce e ele te perdoou."
    ];

    function faisca(x, y) {
      if (faiscas.childElementCount > 18) return;
      var s = document.createElement("span");
      var doce = Math.random() < 0.3;
      s.className = "faisca" + (doce ? " doce" : "");
      s.textContent = doce ? "✦" : (Math.random() < 0.5 ? "♥" : "♡");
      s.style.left = x + "px";
      s.style.top = y + "px";
      s.style.fontSize = (16 + Math.random() * 9).toFixed(0) + "px";
      faiscas.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1200);
    }

    alvo.addEventListener("pointerenter", function () {
      if (sustoAberto) return;
      alvo.classList.add("acariciando");
    });
    alvo.addEventListener("pointerleave", function () {
      alvo.classList.remove("acariciando");
      ultimoX = ultimoY = null;
      acumulado = 0;
    });

    alvo.addEventListener("pointermove", function (e) {
      if (sustoAberto) return;
      var caixa = area.getBoundingClientRect();
      var x = e.clientX - caixa.left;
      var y = e.clientY - caixa.top;

      if (ultimoX !== null) {
        acumulado += Math.abs(x - ultimoX) + Math.abs(y - ultimoY);
      }
      ultimoX = x; ultimoY = y;

      var agora = performance.now();
      if (acumulado > 26 && agora - ultimoPonto > 140) {
        acumulado = 0;
        ultimoPonto = agora;
        faisca(x, y);
        somarAfeto(quebrado ? 2 : 1);

        if (agora - ultimoRecadoCarinho > 2400 && afeto < AFETO_MAX) {
          ultimoRecadoCarinho = agora;
          texto(sorteio(quebrado ? carinhoQuebrado : carinhoInteiro));
        }
      }
    }, { passive: true });

    /* ==========================================================
       Comida
       ========================================================== */
    var COMIDAS = {
      figy: {
        nome: "Figy Berry", ganho: 14, arquivo: "imagens/comida/figy-berry.png",
        txt: ["Figy é picante. Ele engoliu inteira e fingiu que não ardeu.",
              "Ele mastigou devagar, olhando pro chão."]
      },
      pecha: {
        nome: "Pecha Berry", ganho: 14, arquivo: "imagens/comida/pecha-berry.png",
        txt: ["Pecha é doce. Ele guardou metade embaixo do pano.",
              "Ele aceitou com as duas mãos de pano."]
      },
      sitrus: {
        nome: "Sitrus Berry", ganho: 16, arquivo: "imagens/comida/sitrus-berry.png",
        txt: ["Sitrus recupera PS. Ele não estava ferido, mas aceitou assim mesmo.",
              "Ele comeu e conferiu se tinha mais."]
      },
      doce: {
        nome: "Doce Raro", ganho: 22, arquivo: "imagens/comida/rare-candy.png",
        txt: ["Doce Raro. Ele olhou pra você antes de comer, conferindo se podia.",
              "Ele comeu inteiro e ficou parado, esperando você não ir embora."]
      }
    };

    function petisco(arquivo) {
      var img = document.createElement("img");
      img.className = "petisco";
      img.src = arquivo;
      img.alt = "";
      area.appendChild(img);
      setTimeout(function () { if (img.parentNode) img.parentNode.removeChild(img); }, 660);
    }

    var botoesComida = document.querySelectorAll(".comida-btn");

    function travarComida(ms) {
      Array.prototype.forEach.call(botoesComida, function (b) { b.disabled = true; });
      setTimeout(function () {
        Array.prototype.forEach.call(botoesComida, function (b) { b.disabled = false; });
        saciedade = 0;
        empanturrado = false;
      }, ms);
    }

    Array.prototype.forEach.call(botoesComida, function (botao) {
      botao.addEventListener("click", function () {
        if (sustoAberto) return;
        var c = COMIDAS[botao.dataset.comida];
        if (!c) return;

        petisco(c.arquivo);
        alvo.classList.remove("comendo");
        void alvo.offsetWidth;
        alvo.classList.add("comendo");
        setTimeout(function () { alvo.classList.remove("comendo"); }, 700);

        saciedade++;
        if (saciedade >= SACIEDADE_MAX) {
          empanturrado = true;
          somarAfeto(2);
          texto("Não cabe mais nada embaixo do pano. Deixe ele digerir.");
          travarComida(12000);
          return;
        }

        somarAfeto(c.ganho);

        if (quebrado) {
          /* comer enquanto costura faz ele apressar o serviço */
          duracaoReparo = Math.max(1500, duracaoReparo - 2200);
          texto(c.nome + " no meio do conserto. Ele costurou mais rápido.");
        } else {
          texto(sorteio(c.txt));
        }
      });
    });

    /* ==========================================================
       O disfarce: absorve um golpe, depois é costurado de novo
       ========================================================== */
    function sacudir() {
      if (semMovimento) return;
      impacto.classList.remove("tremendo");
      void impacto.offsetWidth;
      impacto.classList.add("tremendo");
    }

    function quebrar() {
      quebrado = true;
      inicioReparo = performance.now();
      duracaoReparo = COSTURA;
      alvo.classList.add("busted");
      sacudir();
      alvo.setAttribute("aria-label", "Mimikyu com o disfarce quebrado, costurando de volta");
      estado.textContent = "Quebrado";
      barra.classList.add("reparando");
      barra.style.width = "0%";
      trilho.setAttribute("aria-valuenow", "0");
      somarAfeto(-18);
      texto("O disfarce absorveu o golpe inteiro. Dano recebido: 0.");
      requestAnimationFrame(costurar);
    }

    function costurar(agora) {
      if (!quebrado) return;
      var p = Math.min(1, (agora - inicioReparo) / duracaoReparo);
      barra.style.width = (p * 100).toFixed(1) + "%";
      trilho.setAttribute("aria-valuenow", Math.round(p * 100));
      if (p < 1) {
        estado.textContent = "Costurando · " + Math.ceil((duracaoReparo - (agora - inicioReparo)) / 1000) + "s";
        requestAnimationFrame(costurar);
      } else {
        restaurar(true);
      }
    }

    function restaurar(comRecado) {
      quebrado = false;
      insistencia = 0;
      alvo.classList.remove("busted");
      impacto.classList.remove("tremendo");
      alvo.setAttribute("aria-label", "Fazer carinho ou cutucar o disfarce de Mimikyu");
      estado.textContent = "Intacto";
      barra.classList.remove("reparando");
      barra.style.width = "100%";
      trilho.setAttribute("aria-valuenow", "100");
      if (comRecado) texto("Costurou tudo de novo. Ficou pior que antes, mas ficou.");
    }

    /* avisos que escalam antes do susto */
    var avisos = [
      "Ele encaixou a orelha de volta. E você bateu de novo.",
      "Ele não desviou dessa vez.",
      "Ele parou de piscar.",
      "Pare."
    ];

    alvo.addEventListener("click", function () {
      if (sustoAberto) return;
      if (!quebrado) { quebrar(); return; }

      insistencia++;
      somarAfeto(-25);
      sacudir();

      if (insistencia >= LIMIAR_SUSTO) {
        abrirSusto();
      } else {
        texto(avisos[insistencia - 1]);
      }
    });

    /* ==========================================================
       O susto
       ========================================================== */
    function baque() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        var ac = new AC();
        var t = ac.currentTime;

        /* tudo passa por aqui: uma única torneira para o volume do golpe */
        var mestre = ac.createGain();
        mestre.gain.value = 0.8;
        mestre.connect(ac.destination);

        /* 1. o estalo: ruído branco de ataque instantâneo, filtro despencando */
        var buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < d.length; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
        }
        var ruido = ac.createBufferSource();
        ruido.buffer = buf;
        var filtro = ac.createBiquadFilter();
        filtro.type = "lowpass";
        filtro.frequency.setValueAtTime(3400, t);
        filtro.frequency.exponentialRampToValueAtTime(170, t + 0.4);
        var g1 = ac.createGain();
        g1.gain.setValueAtTime(0.5, t);
        g1.gain.exponentialRampToValueAtTime(0.0008, t + 0.46);
        ruido.connect(filtro); filtro.connect(g1); g1.connect(mestre);
        ruido.start(t); ruido.stop(t + 0.5);

        /* 2. a barriga do susto: sub descendo até quase o inaudível */
        var osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(172, t);
        osc.frequency.exponentialRampToValueAtTime(31, t + 0.44);
        var g2 = ac.createGain();
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(0.55, t + 0.012);
        g2.gain.exponentialRampToValueAtTime(0.0008, t + 0.52);
        osc.connect(g2); g2.connect(mestre);
        osc.start(t); osc.stop(t + 0.54);

        /* 3. o guincho: três dentes-de-serra desafinados entre si, curtos e feios */
        var guincho = ac.createGain();
        guincho.gain.setValueAtTime(0.0001, t);
        guincho.gain.exponentialRampToValueAtTime(0.15, t + 0.008);
        guincho.gain.exponentialRampToValueAtTime(0.0006, t + 0.6);
        guincho.connect(mestre);
        [1390, 1477, 2090].forEach(function (hz, k) {
          var o = ac.createOscillator();
          o.type = "sawtooth";
          o.frequency.setValueAtTime(hz, t);
          o.frequency.linearRampToValueAtTime(hz * 0.68, t + 0.55);
          var og = ac.createGain();
          og.gain.value = k === 2 ? 0.32 : 1;
          o.connect(og); og.connect(guincho);
          o.start(t); o.stop(t + 0.6);
        });

        setTimeout(function () { ac.close(); }, 1200);
      } catch (e) { /* sem áudio: o susto continua funcionando visualmente */ }
    }

    /* Nem a faísca, nem o petisco, nem esta poeira olham para semMovimento: são
       miúdos, locais e lentos. O que olha é o que sacode a tela inteira — o
       tranco em sacudir(), o salto do susto e o parallax lá no fundo.js. */

    /* o golpe levanta a poeira do chão da loja; ela sobe na luz e não para mais.
       São motas de tamanho, rota e ritmo próprios: nada deve pulsar em bloco. */
    function semearPoeira() {
      if (sustoPoeira.childElementCount) return;
      var monte = document.createDocumentFragment();
      for (var i = 0; i < 30; i++) {
        var m = document.createElement("span");
        var r = (0.9 + Math.random() * 2.8).toFixed(2) + "px";
        m.style.left = (Math.random() * 100).toFixed(2) + "%";
        m.style.top  = (52 + Math.random() * 54).toFixed(2) + "%";
        m.style.width = r;
        m.style.height = r;
        m.style.setProperty("--desvio", (Math.random() * 70 - 35).toFixed(0) + "px");
        m.style.setProperty("--subida", (-110 - Math.random() * 240).toFixed(0) + "px");
        m.style.animationDuration = (4.5 + Math.random() * 6.5).toFixed(2) + "s";
        m.style.animationDelay = (Math.random() * 7).toFixed(2) + "s";
        if (Math.random() < 0.32) m.className = "brasa";
        monte.appendChild(m);
      }
      sustoPoeira.appendChild(monte);
    }

    /* a tela some, e por um instante não acontece nada. É nesse instante
       que a pessoa se inclina para a tela. O golpe vem depois. */
    var ESPERA_BREU = 170;
    var agendado = null;

    function abrirSusto() {
      sustoAberto = true;
      ultimoFoco = document.activeElement;
      alvo.classList.remove("acariciando");

      susto.classList.remove("bateu");
      semearPoeira();
      susto.hidden = false;
      document.documentElement.style.overflow = "hidden";

      afeto = 0;
      marcosVistos = {};
      pintarAfeto(true);

      /* Os dois caminhos batem no mesmo compasso: o que muda e o que a tela
         faz. Com movimento reduzido saem o salto, o tranco, o clarao e a
         vibracao, que sao o que ataca o labirinto e os olhos. Ficam a pausa no
         breu e o som -- som nao e movimento, e sem ele o susto vira so uma
         imagem parada aparecendo do nada. */
      agendado = setTimeout(function () {
        agendado = null;
        if (!sustoAberto) return;
        susto.classList.add("bateu");
        baque();
        if (!semMovimento && navigator.vibrate) navigator.vibrate([0, 55, 30, 120]);
      }, ESPERA_BREU);

      setTimeout(function () {
        if (sustoAberto) sustoFechar.focus();
      }, ESPERA_BREU + (semMovimento ? 700 : 1800));
    }

    function fecharSusto() {
      if (!sustoAberto) return;
      sustoAberto = false;
      if (agendado) { clearTimeout(agendado); agendado = null; }
      susto.hidden = true;
      susto.classList.remove("bateu");
      document.documentElement.style.overflow = "";
      insistencia = 0;
      restaurar(false);
      texto("Ele costurou tudo de novo enquanto você não estava olhando.");
      if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    }

    sustoFechar.addEventListener("click", fecharSusto);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sustoAberto) fecharSusto();
    });

    pintarAfeto(false);
  })();
})();
