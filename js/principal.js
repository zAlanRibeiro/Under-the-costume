/* ============================================================
   Sob o Pano de Mimikyu — comportamento
   ============================================================ */
(function () {
  "use strict";

  var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
        if (!semMovimento) faisca(x, y);
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
      if (semMovimento) return;
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
      if (semMovimento) return;
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

    /* o golpe levanta a poeira do chão da loja; ela sobe na luz e não para mais.
       São motas de tamanho, rota e ritmo próprios: nada deve pulsar em bloco. */
    function semearPoeira() {
      if (semMovimento || sustoPoeira.childElementCount) return;
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

      if (semMovimento) {
        susto.classList.add("bateu");
        sustoFechar.focus();
        return;
      }

      agendado = setTimeout(function () {
        agendado = null;
        if (!sustoAberto) return;
        susto.classList.add("bateu");
        baque();
        if (navigator.vibrate) navigator.vibrate([0, 55, 30, 120]);
      }, ESPERA_BREU);

      setTimeout(function () {
        if (sustoAberto) sustoFechar.focus();
      }, ESPERA_BREU + 1800);
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

  /* ----------------------------------------------------------
     3b. Guarda-roupa: ele costura um pano novo por retalho
     ---------------------------------------------------------- */
  (function guardaRoupa() {
    var caixa = document.getElementById("gr");
    if (!caixa || !window.FANTASIAS) return;

    var tranca    = document.getElementById("gr-tranca");
    var mesa      = document.getElementById("gr-mesa");
    var peca      = document.getElementById("gr-peca");
    var vitrine   = peca.parentElement;
    var elRetalho = document.getElementById("gr-retalhos");
    var elTem     = document.getElementById("gr-tem");
    var elPity    = document.getElementById("gr-pity");
    var elColecao = document.getElementById("gr-colecao");
    var btn1      = document.getElementById("gr-1");
    var btn5      = document.getElementById("gr-5");
    var progValor = document.getElementById("gr-prog-valor");
    var progBarra = document.getElementById("gr-prog-barra");

    var PECAS = window.FANTASIAS;
    var RAR = window.RARIDADES;
    var CHAVE = "mimikyu.guardaroupa.v1";
    var PITY_RARA = 25;     /* costuras sem rara+ até forçar uma */
    var PITY_SECRETA = 70;

    var s = { liberado: false, retalhos: 0, tem: {}, semRara: 0, semSecreta: 0 };

    /* --- persistência: some sem drama se o navegador bloquear --- */
    function carregar() {
      try {
        var bruto = localStorage.getItem(CHAVE);
        if (!bruto) return;
        var d = JSON.parse(bruto);
        if (d && typeof d === "object") {
          s.liberado  = !!d.liberado;
          s.retalhos  = Math.max(0, d.retalhos | 0);
          s.tem       = (d.tem && typeof d.tem === "object") ? d.tem : {};
          s.semRara   = d.semRara | 0;
          s.semSecreta = d.semSecreta | 0;
        }
      } catch (e) { /* segue sem histórico salvo */ }
    }
    function salvar() {
      try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch (e) {}
    }

    /* no site local as imagens vêm da pasta; no arquivo único elas chegam
       embutidas em FANTASIA_IMG, montado pelo construir.sh */
    function urlPeca(id) {
      return (window.FANTASIA_IMG && window.FANTASIA_IMG[id]) ||
             ("imagens/fantasias/" + id + ".png");
    }

    function porId(id) {
      for (var i = 0; i < PECAS.length; i++) if (PECAS[i].id === id) return PECAS[i];
      return null;
    }
    function quantasTem() {
      var n = 0;
      for (var k in s.tem) if (Object.prototype.hasOwnProperty.call(s.tem, k)) n++;
      return n;
    }

    /* --- sorteio: raridade primeiro, peça depois --- */
    function sorteiaRaridade(forcar) {
      if (forcar === "secreta") return "secreta";
      var chaves = ["comum", "incomum", "rara", "ultra", "secreta"];
      if (forcar === "rara+") chaves = ["rara", "ultra", "secreta"];
      var total = 0, i;
      for (i = 0; i < chaves.length; i++) total += RAR[chaves[i]].peso;
      var n = Math.random() * total;
      for (i = 0; i < chaves.length; i++) {
        n -= RAR[chaves[i]].peso;
        if (n <= 0) return chaves[i];
      }
      return chaves[chaves.length - 1];
    }

    function costurar() {
      var forcar = null;
      if (s.semSecreta >= PITY_SECRETA) forcar = "secreta";
      else if (s.semRara >= PITY_RARA)  forcar = "rara+";

      var raridade = sorteiaRaridade(forcar);
      var elenco = PECAS.filter(function (p) { return p.raridade === raridade; });
      var escolhida = elenco[Math.floor(Math.random() * elenco.length)];

      if (raridade === "secreta") s.semSecreta = 0; else s.semSecreta++;
      if (raridade === "rara" || raridade === "ultra" || raridade === "secreta") s.semRara = 0;
      else s.semRara++;

      var repetida = !!s.tem[escolhida.id];
      s.tem[escolhida.id] = (s.tem[escolhida.id] || 0) + 1;
      if (repetida) s.retalhos += 1;   /* repetida devolve o retalho */

      return { peca: escolhida, repetida: repetida };
    }

    function mostrar(res) {
      var p = res.peca;
      var r = RAR[p.raridade];
      vitrine.className = "gr-vitrine r-" + p.raridade;

      peca.className = "gr-peca";
      peca.innerHTML =
        '<div class="gr-revelada">' +
          '<img src="' + urlPeca(p.id) + '" alt="Mimikyu fantasiado de ' + p.nome + '">' +
          '<div class="info">' +
            '<span class="rar">' + r.nome + '</span>' +
            '<h3>' + p.nome + '</h3>' +
            '<p>' + p.txt + '</p>' +
            (res.repetida
              ? '<span class="dup">Ele já tinha feito esse. Desmanchou e devolveu o retalho.</span>'
              : '<span class="dup">Peça nova no varal.</span>') +
          '</div>' +
        '</div>';

      void peca.offsetWidth;
      peca.classList.add("novo");
      if (p.raridade === "rara" || p.raridade === "ultra" || p.raridade === "secreta") {
        vitrine.classList.remove("fulgor");
        void vitrine.offsetWidth;
        vitrine.classList.add("fulgor");
      }
    }

    function puxar(quantos) {
      if (s.retalhos < quantos) return;
      s.retalhos -= quantos;
      var melhor = null;
      var ordem = { comum: 0, incomum: 1, rara: 2, ultra: 3, secreta: 4 };
      for (var i = 0; i < quantos; i++) {
        var res = costurar();
        if (!melhor || ordem[res.peca.raridade] > ordem[melhor.peca.raridade]) melhor = res;
      }
      mostrar(melhor);
      salvar();
      pintar();
      montarColecao();
    }

    /* --- o varal --- */
    function montarColecao() {
      var html = "";
      for (var i = 0; i < PECAS.length; i++) {
        var p = PECAS[i];
        var qtd = s.tem[p.id] || 0;
        if (qtd > 0) {
          html += '<div class="gr-slot tem r-' + p.raridade + '">' +
                    (qtd > 1 ? '<span class="qtd">×' + qtd + '</span>' : '') +
                    '<span class="quadro"><img src="' + urlPeca(p.id) + '" alt="Mimikyu de ' + p.nome + '" loading="lazy"></span>' +
                    '<span class="nome">' + p.nome + '</span>' +
                  '</div>';
        } else {
          html += '<div class="gr-slot falta">' +
                    '<span class="quadro"><img src="imagens/mimikyu-icone.png" alt="" aria-hidden="true"></span>' +
                    '<span class="interro">?</span>' +
                    '<span class="nome">???</span>' +
                  '</div>';
        }
      }
      elColecao.innerHTML = html;
    }

    function pintar() {
      elRetalho.textContent = s.retalhos;
      elTem.textContent = quantasTem();
      btn1.disabled = s.retalhos < 1;
      btn5.disabled = s.retalhos < 5;

      var faltaRara = Math.max(0, PITY_RARA - s.semRara);
      elPity.textContent = faltaRara === 0
        ? "a próxima sai rara ou melhor"
        : "rara garantida em " + faltaRara + " costura" + (faltaRara > 1 ? "s" : "");
    }

    function liberar(primeiraVez) {
      s.liberado = true;
      tranca.hidden = true;
      mesa.hidden = false;
      if (primeiraVez) {
        s.retalhos += 10;
        salvar();
      }
      pintar();
      montarColecao();
    }

    /* --- escuta o palco lá em cima --- */
    document.addEventListener("mimikyu:amizade", function (e) {
      if (s.liberado) return;
      var v = e.detail.valor, m = e.detail.max;
      progValor.textContent = v + " / " + m;
      progBarra.style.width = (v / m * 100).toFixed(1) + "%";
    });

    document.addEventListener("mimikyu:maximo", function () {
      if (s.liberado) return;
      liberar(true);
    });

    document.addEventListener("mimikyu:retalho", function (e) {
      if (!s.liberado) return;
      s.retalhos += (e.detail && e.detail.quantos) || 1;
      salvar();
      pintar();
    });

    btn1.addEventListener("click", function () { puxar(1); });
    btn5.addEventListener("click", function () { puxar(5); });

    carregar();
    if (s.liberado) {
      liberar(false);
    } else {
      pintar();
      montarColecao();
    }
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
      revelacao.hidden = false;
      aviso.classList.add("revelado");
      botao.textContent = "Fechar o pano";
      botao.classList.add("discreto");
      botao.replaceWith(botao.cloneNode(true));
      var novo = document.getElementById("botao-pano");
      novo.addEventListener("click", function () {
        revelacao.hidden = true;
        aviso.classList.remove("revelado");
        novo.textContent = "Levantar o pano mesmo assim";
        novo.classList.remove("discreto");
        location.hash = "#pano";
      }, { once: true });
    }, { once: true });
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
