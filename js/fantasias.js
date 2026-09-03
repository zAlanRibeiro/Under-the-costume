/* ============================================================
   As 50 roupinhas que ele costurou depois do Pikachu.
   raridade: comum(20) · incomum(14) · rara(10) · ultra(5) · secreta(1)
   ============================================================ */
window.FANTASIAS = [
  /* ---------- comuns: as profissões que ele viu de longe ---------- */
  { id: "chef",        nome: "Chef",             raridade: "comum", txt: "Ele cozinha. Ninguém nunca viu o que sai da panela." },
  { id: "medico",      nome: "Médico",           raridade: "comum", txt: "Ele mede a sua pulsação com um cuidado exagerado." },
  { id: "bombeiro",    nome: "Bombeiro",         raridade: "comum", txt: "Ele tem medo de fogo. Costurou o pano mesmo assim." },
  { id: "jardineiro",  nome: "Jardineiro",       raridade: "comum", txt: "Ele rega as plantas do Megamercado. Não há plantas no Megamercado." },
  { id: "cientista",   nome: "Cientista",        raridade: "comum", txt: "Os óculos são de mentira. As anotações não são." },
  { id: "artista",     nome: "Artista",          raridade: "comum", txt: "Ele pintou um Pikachu. De memória. De novo." },
  { id: "detetive",    nome: "Detetive",         raridade: "comum", txt: "Ele investiga por que as pessoas saem correndo." },
  { id: "cauboi",      nome: "Caubói",           raridade: "comum", txt: "O lenço vermelho foi a parte mais difícil de costurar." },
  { id: "marinheiro",  nome: "Marinheiro",       raridade: "comum", txt: "Ele não sabe nadar. O pano encharca e pesa." },
  { id: "mecanico",    nome: "Mecânico",         raridade: "comum", txt: "Ele conserta o próprio graveto uma vez por semana." },
  { id: "aviador",     nome: "Aviador",          raridade: "comum", txt: "Os óculos ficam tortos porque a orelha direita cai." },
  { id: "fazendeiro",  nome: "Fazendeiro",       raridade: "comum", txt: "Ele planta linha e colhe pano." },
  { id: "fotografo",   nome: "Fotógrafo",        raridade: "comum", txt: "Ele fotografa todo mundo que foge dele." },
  { id: "padeiro",     nome: "Padeiro",          raridade: "comum", txt: "Ele assa a noite inteira. Ninguém aparece para comer." },
  { id: "professor",   nome: "Professor",        raridade: "comum", txt: "Ele dá aula de costura. A turma é ele mesmo." },
  { id: "operario",    nome: "Operário",         raridade: "comum", txt: "O capacete não protege nada: é de pano." },
  { id: "salva-vidas", nome: "Salva-vidas",      raridade: "comum", txt: "Ele vigia uma piscina vazia desde 2016." },
  { id: "ioga",        nome: "Instrutor de Ioga",raridade: "comum", txt: "Ele consegue todas as posições. Ele acha que não tem ossos." },
  { id: "gamer",       nome: "Gamer",            raridade: "comum", txt: "Ele joga um jogo de Pikachu. Está estudando o modelo." },
  { id: "dj",          nome: "DJ",               raridade: "comum", txt: "Os fones são maiores que a cabeça dele inteira." },

  /* ---------- incomuns ---------- */
  { id: "pirata",            nome: "Pirata",            raridade: "incomum", txt: "O tapa-olho cobre um olho que ele desenhou torto." },
  { id: "ninja",             nome: "Ninja",             raridade: "incomum", txt: "Você não deveria estar vendo isso. Ele falhou." },
  { id: "mago",              nome: "Mago",              raridade: "incomum", txt: "As estrelas do chapéu são recortes de embalagem." },
  { id: "cavaleiro",         nome: "Cavaleiro",         raridade: "incomum", txt: "A armadura é de papel-alumínio e faz barulho quando ele anda." },
  { id: "samurai",           nome: "Samurai",           raridade: "incomum", txt: "Ele treinou o corte perfeito. Só corta linha." },
  { id: "viking",            nome: "Viking",            raridade: "incomum", txt: "Os chifres são gravetos. Combinam com a cauda." },
  { id: "surfista",          nome: "Surfista",          raridade: "incomum", txt: "Ele nunca viu o mar. Viu uma foto rasgada." },
  { id: "bailarina",         nome: "Bailarina",         raridade: "incomum", txt: "Ele gira e cai. Levanta e gira de novo." },
  { id: "boxeador",          nome: "Boxeador",          raridade: "incomum", txt: "As luvas são grandes demais para segurar a agulha." },
  { id: "palhaco",           nome: "Palhaço",           raridade: "incomum", txt: "Ele quer fazer rir. Continua não funcionando." },
  { id: "pintor",            nome: "Pintor",            raridade: "incomum", txt: "A boina é a peça favorita dele. Ele dorme com ela." },
  { id: "soldado",           nome: "Soldado",           raridade: "incomum", txt: "Camuflagem para o escuro. Redundante, no caso dele." },
  { id: "piloto-de-corrida", nome: "Piloto de Corrida", raridade: "incomum", txt: "O capacete não abre. Ele prefere assim." },
  { id: "astro-do-rock",     nome: "Astro do Rock",     raridade: "incomum", txt: "A peruca amarela é a coisa mais parecida com Pikachu que ele já fez." },

  /* ---------- raras ---------- */
  { id: "astronauta",  nome: "Astronauta",  raridade: "rara", txt: "Não há sol lá em cima. Ele finalmente poderia sair." },
  { id: "super-heroi", nome: "Super-herói", raridade: "rara", txt: "A capa foi feita de outro pano velho, mais velho ainda." },
  { id: "vampiro",     nome: "Vampiro",     raridade: "rara", txt: "Também evita a luz do sol. Os dois se entenderam." },
  { id: "dinossauro",  nome: "Dinossauro",  raridade: "rara", txt: "Os espinhos são de feltro. Ele os alisa quando fica nervoso." },
  { id: "sereia",      nome: "Sereia",      raridade: "rara", txt: "A cauda cobre o graveto. Ele não gostou nada disso." },
  { id: "robo",        nome: "Robô",        raridade: "rara", txt: "Ele imitou outra coisa que também não tem rosto de verdade." },
  { id: "rei",         nome: "Rei",         raridade: "rara", txt: "A coroa é de papel dourado. Ele se curva para você mesmo assim." },
  { id: "bruxa",       nome: "Bruxa",       raridade: "rara", txt: "Ele mexe um caldeirão vazio há três noites seguidas." },
  { id: "magico",      nome: "Mágico",      raridade: "rara", txt: "O truque é que ele some de verdade." },
  { id: "alienigena",  nome: "Alienígena",  raridade: "rara", txt: "Ele desenhou como imagina que seja lá fora." },

  /* ---------- ultra raras ---------- */
  { id: "anjo",     nome: "Anjo",     raridade: "ultra", txt: "As asas não sustentam nada. Ele já flutuava antes." },
  { id: "diabo",    nome: "Diabo",    raridade: "ultra", txt: "Ele fez para assustar. Ficou fofo. Ele desistiu de tentar." },
  { id: "esqueleto",nome: "Esqueleto",raridade: "ultra", txt: "Ele desenhou ossos por fora. Ninguém sabe dizer se acertou." },
  { id: "mumia",    nome: "Múmia",    raridade: "ultra", txt: "Ele se enrolou inteiro. Duas camadas de pano é o dobro de segurança." },
  { id: "cupido",   nome: "Cupido",   raridade: "ultra", txt: "Ele acerta a flecha em quem chega perto. Só quer companhia." },

  /* ---------- secreta ---------- */
  { id: "fantasma", nome: "Fantasma", raridade: "secreta", txt: "Ele se fantasiou de fantasma. Ele é um fantasma. Fez um pano para parecer aquilo que já era, porque assim, quem sabe, alguém fica." }
];

window.RARIDADES = {
  comum:   { nome: "Comum",      peso: 50,  cor: "comum" },
  incomum: { nome: "Incomum",    peso: 30,  cor: "incomum" },
  rara:    { nome: "Rara",       peso: 15,  cor: "rara" },
  ultra:   { nome: "Ultra Rara", peso: 4.4, cor: "ultra" },
  secreta: { nome: "Secreta",    peso: 0.6, cor: "secreta" }
};
