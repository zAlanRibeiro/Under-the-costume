/* ============================================================
   Guarda-roupa: ele costura um pano novo por retalho
   ============================================================ */
(function () {
  "use strict";

  var semMovimento = window.MK.semMovimento;

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
    var roleta    = document.getElementById("gr-roleta");
    var fita      = document.getElementById("gr-fita");
    var chkRapida = document.getElementById("gr-rapida");
    var progValor = document.getElementById("gr-prog-valor");
    var progBarra = document.getElementById("gr-prog-barra");

    var PECAS = window.FANTASIAS;
    var RAR = window.RARIDADES;
    var CHAVE = "mimikyu.guardaroupa.v1";
    var PITY_RARA = 25;     /* costuras sem rara+ até forçar uma */
    var PITY_SECRETA = 70;

    /* quem pediu menos movimento comeca com a rolagem rapida ligada, mas pode
       desmarcar: a preferencia do sistema define o padrao, nao uma trava */
    var s = { liberado: false, retalhos: 0, tem: {}, semRara: 0, semSecreta: 0,
              rapida: semMovimento, salvoEm: 0 };

    /* a fita corre por peças sorteadas e para na que saiu de verdade */
    var LARGURA_ITEM = 168;   /* precisa bater com o .gr-fita > figure do CSS */
    var ITENS_FITA = 32;
    var POUSO = 28;           /* em que casa da fita a peça premiada mora */
    var DURACAO = 2500;
    var girando = false;

    /* --- persistência: duas gavetas, e a página avisa se as duas fecharem --- */
    var elAviso = document.getElementById("gr-aviso");
    var mexeu = false;          /* já costurou nesta sessão */

    /* Só entram ids que existem hoje e contagens que são inteiro positivo: uma
       cópia corrompida não pode encher o varal de peças que não existem.
       Math.floor(undefined) é NaN, e NaN > 0 é false — o filtro cai sozinho. */
    function limpar(tem) {
      var limpo = {};
      if (!tem || typeof tem !== "object") return limpo;
      for (var i = 0; i < PECAS.length; i++) {
        var n = Math.floor(tem[PECAS[i].id]);
        if (n > 0) limpo[PECAS[i].id] = n;
      }
      return limpo;
    }

    /* serve às duas gavetas, para as duas passarem pela mesma peneira */
    function aplicar(d) {
      if (!d || typeof d !== "object") return false;
      s.liberado   = !!d.liberado;
      s.retalhos   = Math.max(0, d.retalhos | 0);
      s.tem        = limpar(d.tem);
      s.semRara    = d.semRara | 0;
      s.semSecreta = d.semSecreta | 0;
      /* nada de | 0 aqui: Date.now() nao cabe num Int32 e daria a volta */
      s.salvoEm    = Math.max(0, +d.salvoEm || 0);
      if (typeof d.rapida === "boolean") s.rapida = d.rapida;
      return true;
    }

    function salvar() {
      s.salvoEm = Date.now();
      window.MK.cofre.gravar(CHAVE, s);
      avisarArmazenamento();
    }

    /* perder a coleção calada é o pior dos finais: se nem o localStorage nem o
       IndexedDB aceitarem, a gaveta diz isso antes de a pessoa investir a noite */
    function avisarArmazenamento() {
      if (!elAviso) return;
      var travado = window.MK.cofre.bloqueado();
      if (travado && !elAviso.textContent) {
        elAviso.textContent = "Este navegador não está guardando nada: o que ele " +
          "costurar agora some quando você fechar a aba. Costuma ser janela " +
          "anônima, ou dados de site bloqueados nas permissões.";
      }
      elAviso.hidden = !travado;
    }

    /* põe a tela inteira de acordo com s, venha ele de qual gaveta vier */
    function repintar() {
      chkRapida.checked = s.rapida;
      if (s.liberado) {
        liberar(false);         /* nunca liberar(true): esse paga os +10 de novo */
      } else {
        tranca.hidden = false;
        mesa.hidden = true;
        pintar();
        montarColecao();
      }
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

    /* a mesma ficha serve para o sorteio e para a consulta no varal;
       só muda o rodapé, que conta de onde a peça veio */
    function mostrarFicha(p, rodape, festejar) {
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
            '<span class="dup">' + rodape + '</span>' +
          '</div>' +
        '</div>';

      void peca.offsetWidth;
      peca.classList.add("novo");
      if (festejar && (p.raridade === "rara" || p.raridade === "ultra" || p.raridade === "secreta")) {
        vitrine.classList.remove("fulgor");
        void vitrine.offsetWidth;
        vitrine.classList.add("fulgor");
      }
    }

    function mostrar(res) {
      mostrarFicha(res.peca, res.repetida
        ? "Ele já tinha feito esse. Desmanchou e devolveu o retalho."
        : "Peça nova no varal.", true);
    }

    /* --- a roleta ------------------------------------------------------
       Uma fita de peças sorteadas corre para a esquerda e freia com a
       premiada no meio. O sorteio já aconteceu antes de a fita andar: a
       animação só conta o que foi decidido, e por isso pular é inofensivo. */
    function montarFita(premiada) {
      var html = "";
      for (var i = 0; i < ITENS_FITA; i++) {
        var p = (i === POUSO) ? premiada : PECAS[Math.floor(Math.random() * PECAS.length)];
        html += '<figure class="r-' + p.raridade + '">' +
                  '<img src="' + urlPeca(p.id) + '" alt="" loading="lazy">' +
                '</figure>';
      }
      fita.innerHTML = html;
    }

    function girar(res, aoFim) {
      /* so o interruptor decide. A fita corre dentro de uma caixa de 238px, sem
         zoom nem clarao, e quem quiser pular tem a caixinha logo ali do lado. */
      if (s.rapida) { aoFim(); return; }
      girando = true;
      pintarSaldo();
      montarFita(res.peca);
      peca.hidden = true;
      roleta.hidden = false;
      roleta.classList.remove("parou");

      /* o alvo é o centro da casa premiada; a sobra desalinha de propósito,
         para não parecer que a fita encaixa sempre no mesmo lugar */
      var sobra = (Math.random() - 0.5) * LARGURA_ITEM * 0.42;
      var alvo = POUSO * LARGURA_ITEM + LARGURA_ITEM / 2 + sobra;

      fita.style.transition = "none";
      fita.style.transform = "translateX(0)";
      void fita.offsetWidth;
      fita.style.transition = "transform " + DURACAO + "ms cubic-bezier(.11,.72,.15,1)";
      fita.style.transform = "translateX(" + (-alvo) + "px)";

      setTimeout(function () { roleta.classList.add("parou"); }, DURACAO - 260);
      setTimeout(function () {
        roleta.hidden = true;
        peca.hidden = false;
        girando = false;
        aoFim();
        pintarSaldo();
      }, DURACAO + 330);
    }

    function puxar(quantos) {
      if (girando || s.retalhos < quantos) return;
      mexeu = true;
      /* só agora existe coleção a perder: é a hora de pedir ao navegador que
         não a despeje — e não no load, quando não havia nada em jogo */
      window.MK.cofre.fixar();
      s.retalhos -= quantos;
      var melhor = null;
      var ordem = { comum: 0, incomum: 1, rara: 2, ultra: 3, secreta: 4 };
      for (var i = 0; i < quantos; i++) {
        var res = costurar();
        if (!melhor || ordem[res.peca.raridade] > ordem[melhor.peca.raridade]) melhor = res;
      }
      /* grava antes de girar: o sorteio já aconteceu e não pode se perder se a
         pessoa recarregar no meio da animação */
      salvar();
      pintarSaldo();
      girar(melhor, function () {
        mostrar(melhor);
        pintar();
        montarColecao();
      });
    }

    /* --- o varal --- */
    function montarColecao() {
      var html = "";
      for (var i = 0; i < PECAS.length; i++) {
        var p = PECAS[i];
        var qtd = s.tem[p.id] || 0;
        if (qtd > 0) {
          html += '<button type="button" class="gr-slot tem r-' + p.raridade + '" data-peca="' + p.id + '">' +
                    (qtd > 1 ? '<span class="qtd">×' + qtd + '</span>' : '') +
                    '<span class="quadro"><img src="' + urlPeca(p.id) + '" alt="" aria-hidden="true" loading="lazy"></span>' +
                    '<span class="nome">' + p.nome + '</span>' +
                  '</button>';
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

    /* o saldo cai assim que se clica, porque o retalho ja foi gasto; o varal e
       a conta so mudam quando a fita para, senao entregam o final antes */
    function pintarSaldo() {
      elRetalho.textContent = s.retalhos;
      btn1.disabled = girando || s.retalhos < 1;
      btn5.disabled = girando || s.retalhos < 5;
    }

    function pintar() {
      pintarSaldo();
      elTem.textContent = quantasTem();

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

    /* um ouvinte só no varal inteiro: os slots são refeitos a cada costura */
    elColecao.addEventListener("click", function (e) {
      var alvo = e.target.closest ? e.target.closest(".gr-slot[data-peca]") : null;
      if (!alvo || girando) return;
      var p = porId(alvo.dataset.peca);
      if (!p) return;
      var qtd = s.tem[p.id] || 0;
      mostrarFicha(p, qtd > 1
        ? "Ele costurou esse " + qtd + " vezes. Não soube parar."
        : "Está no varal desde a primeira noite.", false);
      vitrine.scrollIntoView({ block: "center",
        behavior: semMovimento ? "auto" : "smooth" });
    });

    chkRapida.addEventListener("change", function () {
      s.rapida = chkRapida.checked;
      salvar();
    });

    /* a gaveta rápida primeiro, e síncrona: é o caso comum, e assim o varal
       nunca pisca vazio antes de se preencher */
    aplicar(window.MK.cofre.ler(CHAVE));
    repintar();
    avisarArmazenamento();

    /* A segunda gaveta chega alguns milissegundos depois. Só vale se for mais
       nova — que é o caso em que o localStorage foi limpo e o IndexedDB não.
       Somar as duas seria errado: retalho é moeda, e somar contaria o mesmo
       carinho duas vezes. O mais recente vence inteiro, e recompõe a outra. */
    window.MK.cofre.lerFundo(CHAVE, function (d) {
      /* quem já costurou nesta sessão manda: a cópia de fundo não pode puxar
         o varal debaixo de quem está jogando (e salvar() já escreveu as duas) */
      if (mexeu) return;

      if (d && (+d.salvoEm || 0) > s.salvoEm && aplicar(d)) repintar();

      /* Nos dois sentidos. Quem tem a cópia mais nova recompõe a outra gaveta:
         sem isto, apagar só o IndexedDB deixaria a segunda cópia faltando até
         a próxima costura, e a promessa das duas gavetas valeria pela metade.
         gravar() e não salvar(), porque isto é restauração e não progresso
         novo: o salvoEm segue sendo o da costura que originou a cópia. */
      if (s.salvoEm > 0) window.MK.cofre.gravar(CHAVE, s);
    });
  })();
})();
