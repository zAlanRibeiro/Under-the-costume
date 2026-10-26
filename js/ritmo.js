/* ============================================================
   Pista de dança: um jogo de ritmo em cima de um clipe do YouTube

   O player embutido não deixa a página ler o áudio, então o ritmo vem de dois
   lugares. As músicas da fita já chegam com as batidas achadas em casa
   (dados/ritmo.py grava js/batidas.js). Link novo pede para compartilhar o
   áudio desta aba: o jogo escuta, acha o tempo e a fase enquanto o Mimikyu
   assiste, e segue corrigindo a grade a cada batida.
   O Three.js, o modelo e a API do YouTube só descem quando alguém escolhe
   uma música.
   ============================================================ */
(function () {
  "use strict";

  var rt = document.getElementById("rt");
  if (!rt) return;

  var MODELO = "modelos/mimikyu.glb";
  var semMovimento = window.MK.semMovimento;
  var FITA = window.BATIDAS || {};

  /* janelas em segundos, da mais justa para a mais larga; passou da última, errou */
  var NOTAS = [
    { nome: "Perfeito", janela: 0.035, pontos: 100 },
    { nome: "Ótimo",    janela: 0.060, pontos: 85 },
    { nome: "Boa",      janela: 0.085, pontos: 70 },
    { nome: "Ok",       janela: 0.110, pontos: 50 },
    { nome: "Média",    janela: 0.135, pontos: 35 },
    { nome: "Ruim",     janela: 0.165, pontos: 15 },
    { nome: "Errou",    janela: 0,     pontos: 0 }
  ];
  var RUIM = 5, ERROU = 6, LARGA = NOTAS[RUIM].janela;
  var ALCANCE = 0.35;  // até onde um toque ainda ensina a grade, mesmo sem acertar
  var DESCIDA = 1.6;   // segundos de uma nota do topo da pista até o botão
  var SETAS = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
  var CORES = ["#2BD95F", "#FF3B4E", "#FFD338", "#3B8BFF"];    // verde, vermelho, amarelo, azul: as do Guitar Hero
  var ANGULOS = [-Math.PI / 2, Math.PI, 0, Math.PI / 2];       // ← ↓ ↑ →, girando a seta que aponta para cima

  var palco = document.getElementById("rt-palco");
  var trilho = document.getElementById("rt-trilho");
  var ctx = trilho.getContext("2d");
  var estado = document.getElementById("rt-estado");
  var marca = document.getElementById("rt-nota");
  var hudPontos = document.getElementById("rt-pontos");
  var hudCombo = document.getElementById("rt-combo");
  var botoes = Array.prototype.slice.call(rt.querySelectorAll(".rt-seta"));
  var faixas = Array.prototype.slice.call(rt.querySelectorAll("#rt-lista button"));

  var etapa = "parado";          // parado | carregando | ouvindo | jogando | fim
  var musica = null;             // { video, bpm }
  var trechos = [];              // a batida x cai em t0 + (x - k0) * p, no trecho que a contém
  var ajuste = 0;                // o quanto os acertos empurraram a grade inteira
  var fora = [];                 // atrasos dos últimos toques fora da janela
  var notas = [], primeira = 0;  // primeira: a nota mais antiga ainda sem julgamento
  var virarEm = 0;               // quando ele larga a TV e vira para você
  var placar = null;
  var THREE = null, Contorno = null, player = null, carregando = null;
  var renderer, efeito, cena, camera, boneco;
  var visivel = true, rodando = false, antes = 0;

  function dizer(texto) { estado.textContent = texto; }

  /* ----------------------------------------------------------
     O relógio
     getCurrentTime() anda aos saltos; entre um salto e outro o relógio do
     navegador preenche, e os dois só se reacertam quando se afastam.
     ---------------------------------------------------------- */
  var desvio = 0, ultimoYt = -1, ultimo = null;   // ultimo: { v: o último tempo devolvido, real: quando }
  var taxa = 1, escolhida = 1;   // a velocidade que o vídeo está tocando e a que a pessoa pediu
  function tocando() {
    return !!(player && player.getPlayerState) && player.getPlayerState() === YT.PlayerState.PLAYING;
  }
  /* andou mais do que o tempo deixava, ou voltou: alguém pulou o vídeo */
  function pulou(yt, ref) {
    return !!ref && (etapa === "jogando" || etapa === "ouvindo") &&
      (yt > ref.v + (performance.now() / 1000 - ref.real) * taxa + 1 || yt < ref.v - 1);
  }
  function relogio() {
    if (!player || !player.getCurrentTime) return 0;
    var real = performance.now() / 1000, t = real * taxa, yt = player.getCurrentTime();
    /* até o vigia desfazer o pulo o jogo não enxerga o vídeo lá na frente:
       um quadro só bastaria para dar todas as notas do caminho como perdidas */
    if (pulou(yt, ultimo)) return ultimo.v;
    if (!tocando()) desvio = yt - t;
    else if (yt !== ultimoYt) {
      ultimoYt = yt;
      var erro = yt - (t + desvio);
      desvio += Math.abs(erro) > 0.08 ? erro : erro * 0.1;
    }
    ultimo = { v: t + desvio, real: real };
    return ultimo.v;
  }

  /* A TV não tem barra nem aceita clique, mas tecla de mídia e a central de
     mídia do navegador ainda pulam. A cada quarto de segundo o vigia confere
     se o vídeo andou mais do que o tempo deixava, ou voltou, e desfaz. Fica
     fora do quadro de desenho porque o pulo vem seguido de "carregando", e
     porque a seção pode estar fora da tela. Carregar de verdade só atrasa o
     vídeo, nunca adianta: não dispara. */
  var vigiado = null;   // { v: onde o vídeo estava, real: quando }
  setInterval(function () {
    if (!player || !player.getCurrentTime || (etapa !== "jogando" && etapa !== "ouvindo")) { vigiado = null; return; }
    var yt = player.getCurrentTime();
    if (pulou(yt, vigiado)) { player.seekTo(vigiado.v, true); return; }
    vigiado = { v: yt, real: performance.now() / 1000 };
  }, 250);

  /* o relógio passa a andar na velocidade nova sem dar salto */
  function mudouTaxa(e) {
    taxa = e.data;
    desvio = player.getCurrentTime() - performance.now() / 1000 * taxa;
    /* os ataques já ouvidos estavam em outro andamento: a escuta recomeça a janela */
    if (escuta) { escuta.t = []; escuta.e = []; escuta.palpites = []; escuta.antes = null; escuta.ponte = null; }
  }

  /* ----------------------------------------------------------
     A grade: batidas numeradas, em trechos de tempo constante
     ---------------------------------------------------------- */
  function quando(x) {
    var s = trechos[0];
    for (var i = 1; i < trechos.length && trechos[i].k0 <= x; i++) s = trechos[i];
    return s.t0 + (x - s.k0) * s.p + ajuste;
  }

  function batidaEm(t) {
    t -= ajuste;
    var s = trechos[0];
    for (var i = 1; i < trechos.length && trechos[i].t0 <= t; i++) s = trechos[i];
    return s.k0 + (t - s.t0) / s.p;
  }

  function seta() { return Math.floor(Math.random() * 4); }

  /* ----------------------------------------------------------
     Carregar o 3D, o modelo e o YouTube, uma vez só
     ---------------------------------------------------------- */
  function carregar() {
    if (carregando) return carregando;
    var yt = new Promise(function (pronto, falhou) {
      if (window.YT && window.YT.Player) { pronto(); return; }
      window.onYouTubeIframeAPIReady = pronto;
      var s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = falhou;
      document.head.appendChild(s);
    });
    /* "three" vem do importmap no <head> */
    carregando = Promise.all([import("three"), import("three/addons/loaders/GLTFLoader.js"),
                              import("three/addons/effects/OutlineEffect.js"), yt])
      .then(function (r) {
        THREE = r[0];
        Contorno = r[2].OutlineEffect;
        return new r[1].GLTFLoader().loadAsync(MODELO);
      })
      .then(montarCena);
    /* rede caiu ou bloqueador barrou: o próximo clique tenta de novo */
    carregando.catch(function () { carregando = null; });
    return carregando;
  }

  function tocar(m, botao) {
    musica = m;
    etapa = "carregando";
    ultimo = null;   // o tempo do vídeo anterior não serve de referência para o novo
    ajuste = 0;
    fora = [];
    faixas.forEach(function (b) { b.removeAttribute("aria-current"); });
    if (botao) botao.setAttribute("aria-current", "true");
    hudPontos.textContent = hudCombo.textContent = "0";
    marca.textContent = "";
    dizer("Ligando a televisão… se o clipe não começar sozinho, aperte o play nela.");

    carregar().then(function () {
      if (m !== musica) return;   // trocou de música enquanto carregava
      if (!player) {
        player = new YT.Player("rt-video", {
          videoId: m.video,
          /* sem barra, sem tela cheia, sem teclado: não dá para pular a música */
          playerVars: { playsinline: 1, rel: 0, disablekb: 1, controls: 0, fs: 0, iv_load_policy: 3 },
          events: {
            /* se trocou de música antes de o player ficar pronto, vale a última */
            onReady: function (e) { e.target.loadVideoById(musica.video); },
            onStateChange: mudou,
            onPlaybackRateChange: mudouTaxa,
            onError: recusou
          }
        });
      } else if (player.loadVideoById) {
        player.loadVideoById(m.video);
      }
    }, function () {
      etapa = "parado";
      dizer("Não consegui ligar o 3D ou o YouTube aqui. Confira a conexão e escolha a música de novo.");
    });
  }

  function mudou(e) {
    /* a TV só aceita clique antes de começar, para o caso de o navegador
       barrar o autoplay; tocando, o clique pausaria ou abriria outro vídeo */
    rt.classList.toggle("rt-tv-livre", e.data === YT.PlayerState.UNSTARTED || e.data === YT.PlayerState.CUED);
    /* o YouTube volta para 1× a cada vídeo novo */
    if (e.data === YT.PlayerState.PLAYING && player.getPlaybackRate() !== escolhida) player.setPlaybackRate(escolhida);
    if (e.data === YT.PlayerState.PLAYING && etapa === "carregando") {
      if (FITA[musica.video]) comecarFita(FITA[musica.video]);
      else {
        etapa = "ouvindo";
        boneco.virar(Math.PI);
        dizer("Ele está vidrado na TV, ouvindo para pegar o ritmo…");
      }
    }
    if (e.data !== YT.PlayerState.ENDED) return;
    if (etapa === "jogando") terminar();
    if (etapa === "ouvindo") {
      etapa = "parado";
      pararDeOuvir();
      dizer("A música acabou e ele não achou uma batida firme. Tente outra, ou diga o BPM.");
    }
  }

  function recusou(e) {
    etapa = "parado";
    pararDeOuvir();
    if (e.data === 101 || e.data === 150) {
      dizer("Esse clipe não deixa tocar fora do YouTube. Tente outro link.");
    } else if (location.protocol === "file:") {
      dizer("O YouTube não toca em página aberta direto do disco. Sirva a pasta (python -m http.server) e abra pelo localhost.");
    } else {
      dizer("O YouTube não quis tocar esse vídeo (erro " + e.data + "). Confira o link.");
    }
  }

  /* ----------------------------------------------------------
     O jogo
     ---------------------------------------------------------- */
  function comecarFita(dados) {
    var k = 0;
    trechos = dados.s.map(function (s) {
      var r = { t0: s[0], p: s[1], k0: k };
      k += s[2];
      return r;
    });
    comecarJogo(dados.h.map(function (h) { return { x: h / 2, seta: seta() }; }));
    dizer("Ele está assistindo. As setas começam quando a música engrenar.");
  }

  function comecarJogo(lista) {
    etapa = "jogando";
    notas = lista;
    primeira = 0;
    placar = { pontos: 0, combo: 0, maior: 0, conta: NOTAS.map(function () { return 0; }) };
    /* fica de costas, assistindo, até a primeira nota estar para chegar */
    boneco.virar(Math.PI);
    virarEm = notas.length ? quando(notas[0].x) - DESCIDA - 0.5 : 0;
  }

  function julgar(qual, t) {
    /* a nota mais perto nessa seta, até ALCANCE; recua um pouco para achar
       também as que acabaram de ser dadas como erro */
    var perto = null, certa = null;
    for (var i = Math.max(0, primeira - 8); i < notas.length; i++) {
      var n = notas[i], erro = t - quando(n.x);
      if (erro < -ALCANCE) break;   // daqui em diante, tudo cedo demais
      if (n.seta !== qual || erro > ALCANCE || (n.feita && !n.errou)) continue;
      if (!perto || Math.abs(erro) < Math.abs(perto.erro)) perto = { n: n, erro: erro };
      if (!n.feita && Math.abs(erro) <= LARGA && (!certa || Math.abs(erro) < Math.abs(certa.erro))) {
        certa = { n: n, erro: erro };
      }
    }
    /* Quem bate sempre atrasado está ouvindo a batida mais tarde: fone sem fio
       atrasa 150 a 250 ms, mais que a janela inteira, e quem nunca acerta nunca
       corrigiria a grade. Fora da janela um toque sozinho não diz nada (pode
       ser seta errada); quatro seguidos com o mesmo atraso dizem: é o fone.
       Aí a grade pula de uma vez.
       ponytail: com contratempos seguidos na mesma seta, o toque atrasado cai
       na janela da nota seguinte e o pulo não vem; se isso aparecer, guardar
       o atraso por seta em vez de por toque. */
    if (!certa) {
      if (!perto) return;
      fora.push(perto.erro);
      if (fora.length > 4) fora.shift();
      var o = fora.slice().sort(function (a, b) { return a - b; });
      if (fora.length === 4 && o[3] - o[0] < 0.06) { ajuste += (o[1] + o[2]) / 2; fora = []; }
      return;
    }
    fora = [];
    ajuste += certa.erro * 0.15;   // dentro da janela, escorrega devagar
    var g = 0;
    while (Math.abs(certa.erro) > NOTAS[g].janela) g++;
    certa.n.feita = true;
    marcar(g);
    brilhar(qual, g);
    boneco.passo(qual);
  }

  function marcar(g) {
    placar.pontos += NOTAS[g].pontos;
    placar.conta[g]++;
    placar.combo = g >= RUIM ? 0 : placar.combo + 1;
    placar.maior = Math.max(placar.maior, placar.combo);
    if (g >= RUIM) boneco.tropecar();
    hudPontos.textContent = placar.pontos;
    hudCombo.textContent = placar.combo;
    marca.textContent = NOTAS[g].nome;
    marca.dataset.nota = g;
    marca.classList.remove("pop");
    void marca.offsetWidth;   // reinicia a animação
    marca.classList.add("pop");
  }

  function terminar() {
    etapa = "fim";
    pararDeOuvir();
    var total = notas.length * 100 || 1;
    dizer("Fim da música. " + placar.pontos + " pontos · " +
      Math.round(placar.pontos / total * 100) + "% de precisão · maior combo " + placar.maior +
      (taxa !== 1 ? " · a " + String(taxa).replace(".", ",") + "×" : "") + "\n" +
      NOTAS.map(function (g, i) { return g.nome + " " + placar.conta[i]; }).join(" · "));
  }

  /* ----------------------------------------------------------
     Ouvir a aba: só para link novo, que não tem batida achada em casa

     Um AudioWorklet mede a energia de seis faixas, do bumbo ao chimbal, a
     cada 512 amostras (~11 ms); a subida de energia somada é o ataque. Com
     ~7 s de música, um pente fino testa cada andamento entre 70 e 180 BPM e
     cada fase, e fica com o que mais cai em cima de ataques. Só vale quando
     o melhor se destaca da média e quatro palpites seguidos, de meio em meio
     segundo, concordam: a vinheta e a cena muda do começo do clipe não passam.
     Depois, a cada ~2 s, o mesmo pente refeito perto do tempo e da fase
     atuais puxa a grade 30% na direção dele: é isso que segura a música
     inteira, porque nenhum tempo medido em 7 s aguenta três minutos sozinho.
     Os tempos ficam no relógio do áudio, que anda certinho; só viram tempo
     do vídeo na hora de usar, pela ponte entre os dois relógios.
     Os números (faixas, preferência por 120 BPM, contraste 2,7) saíram de
     simular esta conta no áudio das 11 músicas da fita, contra as batidas
     achadas em casa.
     ---------------------------------------------------------- */
  var QUADRO = 512;
  /* passa-faixa RBJ com Q = 1 em cada faixa; o worklet manda [tempo, energia de cada faixa] */
  var PROCESSADOR =
    "var FAIXAS = [70, 180, 450, 1100, 2800, 7000];" +
    "registerProcessor('energia', class extends AudioWorkletProcessor {" +
    "constructor() { super(); this.n = 0; this.f = FAIXAS.map(function (f0) {" +
    "  var w = 2 * Math.PI * f0 / sampleRate, al = Math.sin(w) / 2, a0 = 1 + al;" +
    "  return { b0: al / a0, b2: -al / a0, a1: -2 * Math.cos(w) / a0, a2: (1 - al) / a0," +
    "           x1: 0, x2: 0, y1: 0, y2: 0, e: 0 }; }); }" +
    "process(ent) {" +
    "  var x = ent[0] && ent[0][0];" +
    "  if (x) for (var j = 0; j < this.f.length; j++) { var b = this.f[j];" +
    "    for (var i = 0; i < x.length; i++) {" +
    "      var y = b.b0 * x[i] + b.b2 * b.x2 - b.a1 * b.y1 - b.a2 * b.y2;" +
    "      b.x2 = b.x1; b.x1 = x[i]; b.y2 = b.y1; b.y1 = y; b.e += y * y; } }" +
    "  if ((this.n += 128) >= " + QUADRO + ") {" +
    "    this.port.postMessage([currentTime].concat(this.f.map(function (b) { var e = b.e; b.e = 0; return e; })));" +
    "    this.n = 0; }" +
    "  return true; } });";

  var escuta = null;   // { stream, audio, t: [], e: [], ponte, antes, palpites }

  function pedirAudio() {
    var md = navigator.mediaDevices;
    if (!md || !md.getDisplayMedia || !window.AudioWorkletNode) return Promise.reject(new Error("sem"));
    /* precisa sair do clique: o navegador só mostra o pedido com o gesto ainda quente */
    return md.getDisplayMedia({
      video: true, audio: true,
      preferCurrentTab: true, selfBrowserSurface: "include", systemAudio: "exclude"
    }).then(function (stream) {
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach(function (f) { f.stop(); });
        throw new Error("mudo");
      }
      var audio = new AudioContext();
      audio.resume();   // criado depois do clique, pode nascer suspenso
      var url = URL.createObjectURL(new Blob([PROCESSADOR], { type: "text/javascript" }));
      return audio.audioWorklet.addModule(url).then(function () {
        var no = new AudioWorkletNode(audio, "energia");
        var mudo = audio.createGain();
        mudo.gain.value = 0;   // o worklet só roda puxado até a saída; o som já sai pelo player
        audio.createMediaStreamSource(stream).connect(no).connect(mudo).connect(audio.destination);
        escuta = { stream: stream, audio: audio, t: [], e: [], ponte: null, antes: null, palpites: [] };
        no.port.onmessage = ouvir;
        /* quem clicar em "parar de compartilhar" na barra do navegador encerra a escuta */
        stream.getAudioTracks()[0].onended = function () { if (etapa === "ouvindo") recusouAudio(); };
      });
    });
  }

  function pararDeOuvir() {
    if (!escuta) return;
    escuta.stream.getTracks().forEach(function (f) { f.stop(); });
    escuta.audio.close();
    escuta = null;
  }

  function recusouAudio() {
    pararDeOuvir();
    etapa = "parado";
    if (player && player.pauseVideo) player.pauseVideo();
    dizer("Sem o áudio da aba ele não consegue ouvir a música. No Chrome ou no Edge do computador, " +
      "escolha esta aba e deixe \"compartilhar áudio\" marcado. A fita ali do lado funciona sem isso.");
  }

  function ouvir(m) {
    if (escuta.ponte === null) return;
    /* vídeo parado: os ataques de antes já não se alinham com os de depois */
    if (!tocando()) {
      if (etapa === "ouvindo") { escuta.t = []; escuta.e = []; escuta.palpites = []; }
      return;
    }
    var d = m.data, agora = [], ataque = 0;
    for (var b = 1; b < d.length; b++) agora.push(Math.log(d[b] + 1e-4));
    if (escuta.antes) agora.forEach(function (v, i) { ataque += Math.max(0, v - escuta.antes[i]); });
    escuta.antes = agora;
    escuta.t.push(d[0]);
    escuta.e.push(ataque);
    if (etapa === "ouvindo" && escuta.e.length % 47 === 0) acharRitmo();
    if (etapa === "jogando" && escuta.e.length % 188 === 0) seguirRitmo();
  }

  /* tempo do áudio para tempo do vídeo: a 0,5× um segundo de áudio é meio segundo de clipe */
  function noVideo(ta) { return ta * taxa + escuta.ponte; }

  /* os últimos ~10 s de ataques, alisados um quadro para cada lado e sem a média */
  function janela() {
    var e = escuta.e, n = Math.min(e.length, 900), de = e.length - n, x = [], media = 0, i;
    for (i = 0; i < n; i++) {
      var j = de + i;
      x.push(0.5 * e[j] + 0.25 * (e[j - 1] || 0) + 0.25 * (e[j + 1] || 0));
      media += x[i] / n;
    }
    return x.map(function (v) { return v - media; });
  }

  /* Pulsos de período P (em quadros), do fim da janela para trás, começando f
     quadros antes do fim; vale a média dos ataques neles mais metade da média
     no contratempo. A batida certa tem colcheia no meio; a falsa de 3 por 2,
     que DNA e Boy With Luv armam, não tem. */
  function pente(x, P, f) {
    var n = x.length, s = 0, a = 0, m = 0, b = 0, q, i;
    for (q = n - 1 - f; q >= 0; q -= P) { i = Math.round(q); if (i < n) { s += x[i]; a++; } }
    for (q = n - 1 - f - P / 2; q >= 0; q -= P) { i = Math.round(q); if (i < n) { m += x[i]; b++; } }
    return (a ? s / a : 0) + 0.5 * (b ? m / b : 0);
  }

  function melhorFase(x, P, de, ate) {
    var r = { s: -Infinity, P: P, f: de };
    for (var f = de; f < ate; f += 0.5) {
      var s = pente(x, P, f);
      if (s > r.s) r = { s: s, P: P, f: f };
    }
    return r;
  }

  function acharRitmo() {
    if (escuta.e.length < 600) return;
    var x = janela(), dt = QUADRO / escuta.audio.sampleRate * taxa, fim = noVideo(escuta.t[escuta.t.length - 1]);
    var dica = musica.bpm ? 60 / musica.bpm / dt : 0;
    var de = Math.min(60 / 180 / dt, dica ? dica * 0.97 : Infinity), ate = Math.max(60 / 70 / dt, dica * 1.03);

    /* sem preferência por perto de 120 a metade ou o dobro do tempo ganham quase sempre */
    var todos = [], media = 0, P, r;
    for (P = de; P <= ate; P += 0.5) {
      var bpm = 60 / (P * dt);
      r = melhorFase(x, P, 0, P);
      r.s *= Math.exp(-0.5 * Math.pow(Math.log(bpm / 120) / Math.LN2 / 0.6, 2));
      todos.push(r);
      media += r.s;
    }
    media /= todos.length;
    var vale = dica ? todos.filter(function (c) { return Math.abs(c.P / dica - 1) < 0.03; }) : todos;
    var topo = vale.reduce(function (a, c) { return c.s > a.s ? c : a; });
    /* fala, silêncio ou intro sem bateria; e áudio mudo, em que tudo empata em zero */
    if (!(media > 0) || topo.s < 2.7 * media) { escuta.palpites = []; return; }

    /* fino: um vigésimo de quadro em volta do vencedor */
    for (P = topo.P - 0.5; P <= topo.P + 0.5; P += 0.05) {
      r = melhorFase(x, P, 0, P);
      if (r.s > topo.s) topo = r;
    }
    var p = topo.P * dt, ultima = fim - topo.f * dt;   // no relógio do vídeo
    var palpites = escuta.palpites;
    palpites.push([p, ultima]);
    if (palpites.length > 4) palpites.shift();
    if (palpites.length < 4 || !palpites.every(function (q) {
      var volta = (ultima - q[1]) / p;
      return Math.abs(q[0] - p) < 0.015 * p && Math.abs(volta - Math.round(volta)) * p < 0.04;
    })) return;
    trechos = [{ t0: ultima, p: p, k0: 0 }];

    var desde = relogio() + DESCIDA, fimDoVideo = (player.getDuration() || desde + 600) - 2, lista = [];
    var meia = p > 0.43;   // abaixo de ~140 BPM ainda cabe nota no contratempo
    for (var k = Math.ceil(batidaEm(desde)); quando(k) < fimDoVideo; k++) {
      if (Math.random() < 0.8) lista.push({ x: k, seta: seta() });
      if (meia && Math.random() < 0.2) lista.push({ x: k + 0.5, seta: seta() });
    }
    comecarJogo(lista);
    dizer("Pegou o ritmo: " + Math.round(60 / p) + " BPM. Agora as setas, quando a nota chegar no botão.");
  }

  function seguirRitmo() {
    if (escuta.e.length < 600) return;   // a janela recomeçou (mudou a velocidade)
    var x = janela(), dt = QUADRO / escuta.audio.sampleRate * taxa, s = trechos[0];
    var fim = noVideo(escuta.t[escuta.t.length - 1]);
    var k = Math.floor((fim - s.t0) / s.p) + s.k0, prevista = s.t0 + (k - s.k0) * s.p;
    /* preso perto do tempo e da fase atuais: sem isso ele pularia para o
       dobro do tempo ou para o contratempo num refrão mais cheio */
    var P0 = s.p / dt, f0 = (fim - prevista) / dt, topo = { s: -Infinity };
    for (var P = P0 * 0.985; P <= P0 * 1.015; P += 0.05) {
      var r = melhorFase(x, P, f0 - 0.2 * P, f0 + 0.2 * P);
      if (r.s > topo.s) topo = r;
    }
    var erro = (fim - topo.f * dt) - prevista;
    /* reancora na batida k, para mudar o período não arrastar o passado */
    s.t0 = prevista + 0.3 * erro;
    s.k0 = k;
    s.p = 0.7 * s.p + 0.3 * topo.P * dt;
  }

  /* ----------------------------------------------------------
     A pista, no jeito do Guitar Hero: uma estrada em perspectiva que some
     num ponto de fuga acima do canvas. A nota anda em profundidade a passo
     constante, então na tela ela nasce pequena lá no fundo e acelera ao
     chegar no traste, como no jogo. Os botões de verdade ficam por cima,
     invisíveis: são eles que recebem o toque e o foco; o desenho é todo aqui.
     ---------------------------------------------------------- */
  var centros = [], alvo = 0, raio = 0;   // medidos dos botões em ajustar()
  var FUNDO = 1.7;      // lá no fundo a nota tem 1/(1 + FUNDO) do tamanho que chega
  var ACHATA = 0.68;    // gema e traste vistos de cima, em ângulo
  var aceso = [0, 0, 0, 0], aneis = [], faiscas = [];

  /* seta desenhada, não letra: nem toda fonte tem o glifo, e girar um caminho é de graça */
  function flecha(x, y, tam, qual, cor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ANGULOS[qual]);
    ctx.scale(tam, tam);
    ctx.beginPath();
    ctx.moveTo(0, -1); ctx.lineTo(0.9, -0.05); ctx.lineTo(0.34, -0.05); ctx.lineTo(0.34, 0.9);
    ctx.lineTo(-0.34, 0.9); ctx.lineTo(-0.34, -0.05); ctx.lineTo(-0.9, -0.05);
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
    ctx.restore();
  }

  /* a gema: um disco grosso da cor da faixa, tampa branca com a seta, brilho no alto */
  function gema(x, y, r, qual, alfa, apagada) {
    var cor = apagada ? "#5A5266" : CORES[qual];
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    ctx.scale(1, ACHATA);
    ctx.beginPath(); ctx.arc(0, r * 0.22, r, 0, Math.PI * 2);   // a espessura, aparecendo embaixo
    ctx.fillStyle = "#0A0710"; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = cor; ctx.fill();
    var sombra = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r);
    sombra.addColorStop(0, "rgba(255, 255, 255, .35)");
    sombra.addColorStop(0.55, "rgba(255, 255, 255, 0)");
    sombra.addColorStop(1, "rgba(10, 7, 16, .45)");
    ctx.fillStyle = sombra; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -r * 0.04, r * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = apagada ? "#8A8296" : "#F7F3EA"; ctx.fill();
    ctx.lineWidth = r * 0.09; ctx.strokeStyle = "rgba(10, 7, 16, .35)"; ctx.stroke();
    flecha(0, -r * 0.04, r * 0.34, qual, cor);
    ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.5, r * 0.22, r * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, .55)"; ctx.fill();
    ctx.restore();
  }

  /* acerto: um anel abre no traste e, com movimento, faíscas sobem da faixa */
  function brilhar(qual, g) {
    var agora = performance.now(), cor = CORES[qual];
    aneis.push({ qual: qual, nasce: agora, cor: cor, perfeito: g === 0 });
    if (semMovimento) return;
    for (var i = 0; i < (g === 0 ? 14 : 9 - g); i++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, vel = raio * (4 + Math.random() * 6);
      faiscas.push({ x: centros[qual], y: alvo, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, nasce: agora, cor: cor });
    }
  }

  function desenharPista(t) {
    var w = trilho.width, h = trilho.height, agora = performance.now();
    ctx.clearRect(0, 0, w, h);
    if (!raio) return;
    var cx = w / 2, topo = h * 0.02;
    var fuga = (topo * (1 + FUNDO) - alvo) / FUNDO;   // o ponto de fuga, acima do canvas
    function escala(u) { return 1 / (1 + u * FUNDO); }  // u: 0 no traste, 1 lá no fundo
    function py(s) { return fuga + (alvo - fuga) * s; }
    function px(X, s) { return cx + (X - cx) * s; }
    var vao = (centros[3] - centros[0]) / 3;
    var esq = centros[0] - vao * 0.62, dir = centros[3] + vao * 0.62;
    var sTopo = escala(1), sChao = (h - fuga) / (alvo - fuga);

    /* a estrada, sumindo no escuro lá no fundo */
    var piso = ctx.createLinearGradient(0, topo, 0, h);
    piso.addColorStop(0, "rgba(27, 20, 38, 0)");
    piso.addColorStop(0.3, "rgba(27, 20, 38, .92)");
    piso.addColorStop(1, "rgba(42, 32, 54, .98)");
    ctx.beginPath();
    ctx.moveTo(px(esq, sTopo), topo); ctx.lineTo(px(dir, sTopo), topo);
    ctx.lineTo(px(dir, sChao), h); ctx.lineTo(px(esq, sChao), h);
    ctx.closePath();
    ctx.fillStyle = piso; ctx.fill();

    /* divisórias das faixas e os trilhos dos lados, todos correndo para o ponto de fuga */
    var trilhos = ctx.createLinearGradient(0, topo, 0, h);
    trilhos.addColorStop(0, "rgba(227, 200, 106, 0)");
    trilhos.addColorStop(1, "rgba(242, 222, 155, .9)");
    [esq, (centros[0] + centros[1]) / 2, (centros[1] + centros[2]) / 2, (centros[2] + centros[3]) / 2, dir].forEach(function (X, i) {
      var lado = i === 0 || i === 4;
      ctx.beginPath(); ctx.moveTo(px(X, sTopo), topo); ctx.lineTo(px(X, sChao), h);
      ctx.lineWidth = lado ? Math.max(2, raio * 0.09) : Math.max(1, raio * 0.025);
      ctx.strokeStyle = lado ? trilhos : "rgba(237, 230, 220, .07)";
      ctx.stroke();
    });

    /* os fachos de quem apertou, subindo pela faixa */
    ctx.globalCompositeOperation = "lighter";
    for (var q = 0; q < 4; q++) {
      var forca = Math.max(0, 1 - (agora - aceso[q]) / 260);
      if (!forca) continue;
      var meia = vao * 0.45, facho = ctx.createLinearGradient(0, alvo, 0, py(escala(0.6)));
      facho.addColorStop(0, CORES[q]); facho.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalAlpha = 0.45 * forca;
      ctx.beginPath();
      ctx.moveTo(centros[q] - meia, alvo); ctx.lineTo(centros[q] + meia, alvo);
      ctx.lineTo(px(centros[q] + meia, escala(0.6)), py(escala(0.6)));
      ctx.lineTo(px(centros[q] - meia, escala(0.6)), py(escala(0.6)));
      ctx.closePath();
      ctx.fillStyle = facho; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    /* as barras de compasso: uma por batida, mais forte a cada quatro */
    if (etapa === "jogando") {
      for (var k = Math.ceil(batidaEm(t)); ; k++) {
        var u = (quando(k) - t) / DESCIDA;
        if (u > 1) break;
        var s = escala(u), forte = ((k % 4) + 4) % 4 === 0;
        ctx.beginPath(); ctx.moveTo(px(esq, s), py(s)); ctx.lineTo(px(dir, s), py(s));
        ctx.lineWidth = Math.max(1, raio * (forte ? 0.1 : 0.04) * s);
        ctx.strokeStyle = "rgba(237, 230, 220, " + ((forte ? 0.4 : 0.18) * Math.min(1, (1 - u) * 3)) + ")";
        ctx.stroke();
      }
    }

    /* a linha de batida e os trastes: anel da cor da faixa, miolo escuro, seta */
    ctx.beginPath(); ctx.moveTo(esq, alvo); ctx.lineTo(dir, alvo);
    ctx.lineWidth = raio * 0.12; ctx.strokeStyle = "rgba(242, 222, 155, .18)"; ctx.stroke();
    for (q = 0; q < 4; q++) {
      var x = centros[q], aperto = Math.max(0, 1 - (agora - aceso[q]) / 220);
      ctx.save();
      ctx.translate(x, alvo); ctx.scale(1, ACHATA);
      var miolo = ctx.createRadialGradient(0, -raio * 0.3, raio * 0.1, 0, 0, raio);
      miolo.addColorStop(0, aperto ? "#FFFFFF" : "#3B2E4C");
      miolo.addColorStop(1, aperto ? CORES[q] : "#120D1B");
      ctx.beginPath(); ctx.arc(0, 0, raio * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = miolo; ctx.fill();
      if (aperto) { ctx.shadowColor = CORES[q]; ctx.shadowBlur = raio * 0.9 * aperto; }
      ctx.lineWidth = raio * 0.16; ctx.strokeStyle = CORES[q]; ctx.stroke();
      ctx.shadowBlur = 0;
      flecha(0, 0, raio * 0.36, q, aperto ? "#120D1B" : CORES[q]);
      ctx.restore();
    }

    /* as gemas, do fundo para a frente, para a de perto ficar por cima; a
       perdida passa cinza pelo traste e some logo depois */
    if (etapa === "jogando") {
      var vistas = [];
      for (var i = Math.max(0, primeira - 12); i < notas.length; i++) {
        var n = notas[i], un = (quando(n.x) - t) / DESCIDA;
        if (un > 1.02) break;
        if ((n.feita && !n.errou) || un < -0.14) continue;
        vistas.push([n, un]);
      }
      for (i = vistas.length - 1; i >= 0; i--) {
        var nota = vistas[i][0], uu = vistas[i][1], sg = escala(uu);
        gema(px(centros[nota.seta], sg), py(sg), raio * 0.9 * sg, nota.seta,
          uu < 0 ? 1 + uu / 0.14 : Math.min(1, (1.02 - uu) * 6), !!nota.errou);
      }
    }

    /* anéis e faíscas dos acertos */
    ctx.globalCompositeOperation = "lighter";
    aneis = aneis.filter(function (a) {
      var vida = (agora - a.nasce) / 420;
      if (vida >= 1) return false;
      ctx.save();
      ctx.translate(centros[a.qual], alvo); ctx.scale(1, ACHATA);
      ctx.globalAlpha = 1 - vida;
      /* o clarão no traste, e no Perfeito um miolo branco por cima */
      var clarao = ctx.createRadialGradient(0, 0, 0, 0, 0, raio * 1.3);
      clarao.addColorStop(0, a.perfeito ? "#FFFFFF" : a.cor);
      clarao.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.beginPath(); ctx.arc(0, 0, raio * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = clarao; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, raio * (semMovimento ? 1.05 : 1 + vida * 1.1), 0, Math.PI * 2);
      ctx.lineWidth = raio * 0.24 * (1 - vida); ctx.strokeStyle = a.cor; ctx.stroke();
      ctx.restore();
      return true;
    });
    faiscas = faiscas.filter(function (f) {
      var vida = (agora - f.nasce) / 550, seg = (agora - f.nasce) / 1000;
      if (vida >= 1) return false;
      var x = f.x + f.vx * seg, y = f.y + f.vy * seg + raio * 9 * seg * seg;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - f.vx * 0.05, y - (f.vy + raio * 18 * seg) * 0.05);
      ctx.lineWidth = Math.max(1, raio * 0.12 * (1 - vida)); ctx.lineCap = "round"; ctx.strokeStyle = f.cor;
      ctx.globalAlpha = 1 - vida; ctx.stroke();
      return true;
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ----------------------------------------------------------
     O boneco: o modelo pronto, com os ossos mexidos no compasso

     Cada parte que balança vai por uma mola, não direto no seno: a cabeça
     chega um tiquinho atrasada e passa do ponto antes de assentar, e é isso
     que tira a cara de boneco de corda. O tombo do erro é a mesma mola, só que
     frouxa, para a cabeça quicar antes de voltar.
     ---------------------------------------------------------- */
  function mola(rigidez, freio) {
    return {
      x: 0, v: 0,
      ir: function (alvo, dt) {
        /* passos curtos: a 10 fps uma mola dura explodiria num passo só */
        for (var h; dt > 0; dt -= h) {
          h = Math.min(dt, 1 / 120);
          this.v += (rigidez * (alvo - this.x) - freio * this.v) * h;
          this.x += this.v * h;
        }
        return this.x;
      }
    };
  }

  function montarMimikyu(gltf) {
    var modelo = gltf.scene;
    var raiz = new THREE.Group(), corpo = new THREE.Group();
    raiz.add(corpo);

    /* de pé no chão, centrado, com 1,9 de altura, seja qual for a escala do arquivo */
    var caixa = new THREE.Box3().setFromObject(modelo), tam = caixa.getSize(new THREE.Vector3());
    var escala = 1.9 / tam.y;
    modelo.scale.setScalar(escala);
    modelo.position.set(-(caixa.min.x + tam.x / 2) * escala, -caixa.min.y * escala, -(caixa.min.z + tam.z / 2) * escala);
    corpo.add(modelo);

    /* cara de desenho: três faixas de luz em vez do degradê, e o contorno
       escuro vem do OutlineEffect em montarCena; o quadradinho dos olhos de
       pano fica sem contorno, senão aparece um retângulo */
    var faixas = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
    faixas.needsUpdate = true;
    modelo.traverse(function (o) {
      if (!o.isMesh) return;
      var velho = o.material;
      o.material = new THREE.MeshToonMaterial({ map: velho.map, gradientMap: faixas, side: velho.side, name: velho.name });
      if (velho.name === "eyes") o.material.userData.outlineParameters = { visible: false };
      o.frustumCulled = false;   // a caixa do osso parado não acompanha o pulo nem o giro
    });

    /* "Head_Armature_7" -> "Head". Os ossos vêm do arquivo com eixos tortos
       (a cabeça descansa girada ~25° em dois eixos), então o giro é pedido
       nos eixos do modelo e convertido para o do osso: x acena para a frente,
       y vira, z inclina de lado. */
    modelo.updateMatrixWorld(true);
    var deFora = modelo.getWorldQuaternion(new THREE.Quaternion()).invert(), ossos = {};
    modelo.traverse(function (o) {
      if (!o.isBone) return;
      var pai = deFora.clone().multiply(o.parent.getWorldQuaternion(new THREE.Quaternion()));
      ossos[o.name.replace(/_Armature_\d+$/, "")] = { o: o, descanso: o.quaternion.clone(), pai: pai, paiVolta: pai.clone().invert() };
    });
    var giro = new THREE.Quaternion(), angulos = new THREE.Euler();
    function osso(nome, x, y, z) {
      var b = ossos[nome];
      if (!b) return;
      giro.setFromEuler(angulos.set(x, y, z, "YXZ"));
      b.o.quaternion.copy(b.paiVolta).multiply(giro).multiply(b.pai).multiply(b.descanso);
    }

    var sombra = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    sombra.material.userData.outlineParameters = { visible: false };
    sombra.rotation.x = -Math.PI / 2;
    raiz.add(sombra);

    var d = { x: 0, alvoX: 0, giro: Math.PI, alvoGiro: Math.PI, altura: 0, vy: 0, tombo: 0, olhaTv: true };
    raiz.rotation.y = Math.PI;
    var aceno = mola(160, 14), inclina = mola(140, 12), vira = mola(90, 11);
    var orelhas = mola(110, 7), ponta = mola(70, 5), cauda = mola(60, 6);

    function pular(forca) { if (!semMovimento && d.altura === 0) d.vy = forca; }

    return {
      raiz: raiz,
      /* sempre para a frente: o giro acumula, nunca desvira */
      virar: function (para) {
        d.alvoGiro = para + 2 * Math.PI * Math.ceil((d.alvoGiro - para) / (2 * Math.PI));
        d.olhaTv = para === Math.PI;
        if (d.olhaTv) d.alvoX = 0;
      },
      /* errou: a cabeça tomba de lado, como quando o disfarce quebra */
      tropecar: function () { d.tombo = 1; inclina.v += 3; },
      /* ← e → andam, ↑ pula, ↓ gira */
      passo: function (qual) {
        if (qual === 0) d.alvoX = Math.max(-1.3, d.alvoX - 0.4);
        if (qual === 3) d.alvoX = Math.min(1.3, d.alvoX + 0.4);
        if (qual === 2) pular(3.2);
        if (qual === 1 && !semMovimento) d.alvoGiro += 2 * Math.PI;
      },
      /* b: posição em batidas; inteiro = em cima da batida */
      animar: function (b, dt) {
        var amp = semMovimento ? 0.3 : 1;
        var entre = Math.abs(Math.sin(Math.PI * b));   // 0 na batida, 1 entre duas
        var batida = Math.pow(1 - entre, 3);           // pico estreito em cima da batida
        var k = Math.min(1, dt * 8);
        d.x += (d.alvoX - d.x) * k;
        d.giro += (d.alvoGiro - d.giro) * Math.min(1, dt * 5);
        d.vy -= 14 * dt;
        d.altura = Math.max(0, d.altura + d.vy * dt);
        if (d.altura === 0) d.vy = 0;
        d.tombo = Math.max(0, d.tombo - dt * 1.6);
        var andando = d.alvoX - d.x, girando = Math.max(-0.7, Math.min(0.7, d.alvoGiro - d.giro));

        raiz.position.x = d.x;
        raiz.rotation.y = d.giro;
        sombra.scale.setScalar(1 - d.altura * 0.6);
        corpo.position.y = 0.06 * entre * amp + d.altura;
        var aperto = (1 - entre) * amp;
        corpo.scale.set(1 + 0.04 * aperto, 1 - 0.06 * aperto, 1 + 0.04 * aperto);
        corpo.rotation.z = 0.08 * Math.sin(Math.PI * b) * amp - andando * 0.15;

        /* A cabeça: acena na batida, inclina um lado por batida, olha para onde
           anda, sobe o queixo no pulo e baixa na queda, fica para trás no giro
           e, olhando a TV, levanta o rosto para a tela. */
        var a = aceno.ir((d.olhaTv ? -0.32 : 0) + 0.2 * batida * amp - d.vy * 0.05, dt);
        var z = inclina.ir(0.2 * Math.sin(Math.PI * b) * amp - andando * 0.5 + d.tombo * 0.9, dt);
        var y = vira.ir(andando * 0.6 - girando * 0.5 + 0.12 * Math.sin(Math.PI * b / 2) * amp, dt);
        /* pescoço com um terço, cabeça com o resto: dobra em curva, não numa dobradiça */
        osso("Neck", a * 0.35, y * 0.35, z * 0.35);
        osso("Head", a * 0.65, y * 0.65, z * 0.65);

        /* orelhas e cauda vêm atrasadas, puxadas pela cabeça e pelo pulo */
        var o = orelhas.ir(0.35 * aperto - z * 0.4 + d.vy * 0.06, dt);
        var p = ponta.ir(o, dt);
        osso("EarR", 0, 0, o);
        osso("EarL", 0, 0, -o);
        osso("Ear_tipR", 0, 0, (p - o) * 0.8);
        osso("Ear_tipL", 0, 0, -(p - o) * 0.8);
        var c = cauda.ir(0.45 * Math.sin(2 * Math.PI * b) * amp + andando * 0.6, dt);
        osso("Tail", 0, 0, c);
        osso("Tail_tip", 0, 0, c * 0.6);
      }
    };
  }

  function montarCena(gltf) {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = "rt-3d";
    renderer.domElement.setAttribute("aria-hidden", "true");
    palco.appendChild(renderer.domElement);
    /* o contorno escuro de desenho: um segundo passe com as costas da malha inflada */
    efeito = new Contorno(renderer, { defaultThickness: 0.005, defaultColor: [0.1, 0.07, 0.13] });

    cena = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.6, 7);
    camera.lookAt(0, 1.5, 0);
    /* abajur, nunca sol: a luz do sol o adoece */
    cena.add(new THREE.HemisphereLight(0xF2DE9B, 0x3B2E4C, 1.6));
    var abajur = new THREE.DirectionalLight(0xFFFFFF, 2);
    abajur.position.set(2, 4, 5);
    cena.add(abajur);

    boneco = montarMimikyu(gltf);
    cena.add(boneco.raiz);
    document.getElementById("rt-costas").hidden = true;
    ajustar();
    ligar();
  }

  function quadro(ms) {
    if (!visivel) { rodando = false; return; }
    requestAnimationFrame(quadro);
    var dt = Math.min(0.1, (ms - antes) / 1000);
    antes = ms;
    var t = relogio();

    /* a ponte entre o relógio do áudio capturado e o do vídeo, só com o vídeo andando */
    if (escuta && tocando()) {
      var ponte = t - escuta.audio.currentTime * taxa;
      /* salto grande é pausa ou busca no vídeo: reancora; o resto é tremido, suaviza */
      escuta.ponte = escuta.ponte === null || Math.abs(ponte - escuta.ponte) > 0.1
        ? ponte : escuta.ponte + (ponte - escuta.ponte) * 0.05;
    }

    if (etapa === "jogando") {
      if (virarEm && t > virarEm) {
        boneco.virar(0);
        virarEm = 0;
        if (FITA[musica.video]) dizer("A música engrenou: setas quando a nota chegar no botão.");
      }
      /* o que passou da janela mais larga sem ninguém apertar vira erro */
      while (primeira < notas.length && (notas[primeira].feita || t - quando(notas[primeira].x) > LARGA)) {
        if (!notas[primeira].feita) { notas[primeira].feita = notas[primeira].errou = true; marcar(ERROU); }
        primeira++;
      }
    }

    desenharPista(t);
    /* sem grade ainda ele balança num tempo qualquer, só assistindo */
    boneco.animar(etapa === "jogando" ? batidaEm(t) : ms / 600, dt);
    efeito.render(cena, camera);
  }

  /* fora da tela não desenha: a página já tem a poeira gastando bateria */
  function ligar() {
    if (rodando || !renderer || !visivel) return;
    rodando = true;
    antes = performance.now();
    requestAnimationFrame(quadro);
  }

  function ajustar() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    trilho.width = trilho.clientWidth * dpr;
    trilho.height = trilho.clientHeight * dpr;
    /* o alvo é o próprio botão: a nota cai até o meio dele */
    var caixa = trilho.getBoundingClientRect(), b0 = botoes[0].getBoundingClientRect();
    centros = botoes.map(function (b) {
      var r = b.getBoundingClientRect();
      return (r.left + r.width / 2 - caixa.left) * dpr;
    });
    alvo = (b0.top + b0.height / 2 - caixa.top) * dpr;
    raio = b0.width / 2 * dpr * 0.9;
    if (!rodando) desenharPista(0);   // a pista aparece antes de o 3D descer
    if (!renderer) return;
    renderer.setSize(palco.clientWidth, palco.clientHeight, false);
    camera.aspect = palco.clientWidth / palco.clientHeight;
    camera.updateProjectionMatrix();
  }

  /* ----------------------------------------------------------
     Entradas
     ---------------------------------------------------------- */
  function apertar(qual) {
    aceso[qual] = performance.now();
    if (etapa === "jogando") julgar(qual, relogio());
  }

  botoes.forEach(function (b, i) {
    /* pointerdown, não click: o click só sai quando o dedo levanta, tarde demais para ritmo */
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); apertar(i); });
    /* click sem ponteiro (detail 0) é Enter ou espaço num botão focado */
    b.addEventListener("click", function (e) { if (e.detail === 0) apertar(i); });
  });

  document.addEventListener("keydown", function (e) {
    if (etapa === "parado" || !visivel || e.repeat) return;
    if (e.target.closest && e.target.closest("input, textarea")) return;
    var qual = SETAS[e.key];
    if (qual === undefined) return;
    e.preventDefault();   // as setas rolariam a página
    apertar(qual);
  });

  /* Clicar na TV (para dar play, por exemplo) leva o foco para dentro do
     player, e dali o teclado não volta: as setas iam para o YouTube. A página
     só percebe que perdeu o foco, e o pega de volta. */
  window.addEventListener("blur", function () {
    if (etapa === "parado") return;
    setTimeout(function () {
      var f = document.activeElement;
      if (f && f.tagName === "IFRAME" && rt.contains(f)) rt.focus({ preventScroll: true });
    }, 0);
  });

  faixas.forEach(function (b) {
    b.addEventListener("click", function () {
      pararDeOuvir();
      tocar({ video: b.dataset.video, bpm: +b.dataset.bpm }, b);
    });
  });

  var botoesTaxa = Array.prototype.slice.call(rt.querySelectorAll(".rt-veloc button"));
  botoesTaxa.forEach(function (b) {
    b.addEventListener("click", function () {
      escolhida = +b.dataset.taxa;
      botoesTaxa.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      if (player && player.setPlaybackRate) player.setPlaybackRate(escolhida);
    });
  });

  var campoLink = document.getElementById("rt-link");
  var campoBpm = document.getElementById("rt-bpm");
  document.getElementById("rt-url").addEventListener("submit", function (e) {
    e.preventDefault();
    var texto = campoLink.value.trim();
    /* watch?v=, youtu.be/, shorts/, embed/, live/ ou o id puro: o id só tem estes 11 caracteres */
    var achou = texto.match(/(?:[?&]v=|youtu\.be\/|\/(?:embed|shorts|live)\/)([\w-]{11})(?![\w-])/) ||
                texto.match(/^([\w-]{11})$/);
    if (!achou) { dizer("Não reconheci esse link. Cole o endereço de um vídeo do YouTube."); return; }
    var bpm = parseFloat(campoBpm.value);
    var m = { video: achou[1], bpm: bpm >= 40 && bpm <= 250 ? bpm : 0 };
    pararDeOuvir();
    if (FITA[m.video]) { tocar(m, null); return; }   // link de música da fita: já tem batida
    dizer("Para ele ouvir a música, compartilhe o áudio desta aba (deixe \"compartilhar áudio\" marcado).");
    pedirAudio().then(function () { tocar(m, null); }, recusouAudio);
  });

  new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; ligar(); }).observe(rt);
  new ResizeObserver(ajustar).observe(rt);
})();
