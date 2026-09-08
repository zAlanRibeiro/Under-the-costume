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

  /* ==========================================================
     O cofre: a mesma coisa guardada em duas gavetas

     O localStorage sozinho e fragil demais para uma colecao que leva horas
     para juntar. Ele vai embora inteiro com "limpar dados de navegacao", o
     Safari o expira sozinho depois de sete dias sem visita, e sob pressao de
     disco ele e a primeira coisa que o navegador despeja. O IndexedDB cai nas
     mesmas faxinas, mas raramente no mesmo dia: quem sobreviver recompoe o
     outro. E quando as duas gavetas estiverem trancadas, bloqueado() deixa a
     pagina dizer isso em voz alta, em vez de perder tudo calada.
     ========================================================== */
  var BANCO = "mimikyu", LOJA = "estado";
  var travado = false;    /* algum acesso ja lancou */
  var fixado = false;

  function pedir(versao, aoAbrir, aoFaltar) {
    var req;
    /* em contexto bloqueado o proprio open() lanca, antes de qualquer evento */
    try {
      /* Sem numero, open() abre a versao que existir — e cria na 1 se nao
         existir. Fixar 1 aqui daria VersionError para sempre depois de um
         conserto ter subido a versao, que e o proximo bloco. */
      req = versao ? indexedDB.open(BANCO, versao) : indexedDB.open(BANCO);
    } catch (e) { travado = true; aoAbrir(null); return; }
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(LOJA)) db.createObjectStore(LOJA);
    };
    req.onsuccess = function () {
      var db = req.result;
      if (aoFaltar && !db.objectStoreNames.contains(LOJA)) { aoFaltar(db); return; }
      aoAbrir(db);
    };
    /* os dois caminhos tristes precisam responder: um callback pendurado
       deixaria o boot esperando uma gaveta que nunca vai abrir */
    req.onerror   = function () { aoAbrir(null); };
    req.onblocked = function () { aoAbrir(null); };
  }

  function abrir(aoAbrir) {
    pedir(0, aoAbrir, function (db) {
      /* Banco na versao certa mas sem a prateleira dentro — sobra de um upgrade
         que morreu no meio, ou de outro script que abriu o mesmo nome antes.
         Sem isto o open() continuaria dando certo para sempre e toda leitura e
         escrita cairia no catch, calada: a segunda gaveta existiria de mentira.
         Subir a versao e o unico jeito de disparar onupgradeneeded outra vez. */
      var v = db.version + 1;
      db.close();
      pedir(v, aoAbrir, null);
    });
  }

  var cofre = {
    /* sincrono, para o boot pintar sem piscar o varal vazio */
    ler: function (chave) {
      try {
        var bruto = localStorage.getItem(chave);
        return bruto ? JSON.parse(bruto) : null;
      } catch (e) { travado = true; return null; }
    },

    gravar: function (chave, obj) {
      var texto = JSON.stringify(obj), ok = true;
      try { localStorage.setItem(chave, texto); } catch (e) { travado = true; ok = false; }
      abrir(function (db) {
        if (!db) return;
        try {
          var t = db.transaction(LOJA, "readwrite");
          t.objectStore(LOJA).put(texto, chave);
          /* fechar assim que acabar: conexao aberta BLOQUEIA o upgrade de versao,
             que e justamente o que o conserto da prateleira precisa fazer */
          t.oncomplete = t.onerror = function () { db.close(); };
        } catch (e) { db.close(); /* a gaveta rapida ja tem a copia */ }
      });
      return ok;
    },

    lerFundo: function (chave, pronto) {
      abrir(function (db) {
        if (!db) { pronto(null); return; }
        try {
          var t = db.transaction(LOJA, "readonly");
          var p = t.objectStore(LOJA).get(chave);
          p.onsuccess = function () {
            try { pronto(p.result ? JSON.parse(p.result) : null); }
            catch (e) { pronto(null); }
          };
          p.onerror = function () { pronto(null); };
          t.oncomplete = t.onerror = function () { db.close(); };
        } catch (e) { db.close(); pronto(null); }
      });
    },

    bloqueado: function () { return travado; },

    /* Tira os dados de "best-effort", a categoria que o navegador despeja
       primeiro. Nao roda no load de proposito: o Chrome decide sozinho pelo
       engajamento, mas o Firefox PERGUNTA, e perguntar antes de a pessoa ter
       alguma coisa a perder e pedir demais. Quem chama e a primeira costura. */
    fixar: function () {
      if (fixado || !navigator.storage || !navigator.storage.persist) return;
      fixado = true;
      try {
        Promise.resolve(navigator.storage.persist()).catch(function () {});
      } catch (e) {}
    }
  };

  return {
    /* quem pediu menos movimento nao recebe as animacoes que sacodem a tela */
    semMovimento: calcular(),

    cofre: cofre,

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
