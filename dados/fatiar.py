# -*- coding: utf-8 -*-
"""
Fatia costumes.jpg (grade 10x5) em 50 sprites PNG com fundo transparente.

Tres cuidados que a versao anterior em PowerShell nao tinha, e que produziam
os defeitos visiveis nas cartas:

  - O corte cai DENTRO das linhas da grade. Elas sao escuras, sobrevivem ao
    flood fill do fundo e entravam no bounding box como uma barra colada na
    borda direita do sprite.

  - A faixa do nome era apagada por um retangulo de altura fixa, que decepava
    os pes do personagem. Aqui ela e achada pelo vao branco que a separa do
    desenho: fica o bloco de tinta com mais pixels, some o resto.

  - O redimensionamento acontece com alpha premultiplicado. Sem isso o branco
    dos pixels transparentes sangra para dentro da silhueta na reamostragem e
    vira uma franja clara em volta do personagem.

Requer: Pillow e numpy.  Uso: python dados/fatiar.py [destino]
"""
import os
import sys
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTE = os.path.join(RAIZ, "costumes.jpg")
DESTINO = os.path.join(RAIZ, "imagens", "fantasias")

ALTURA = 210          # altura do personagem no sprite final
MARGEM_GRADE = 3      # folga para entrar de vez na celula, longe da moldura
FUNDO_MIN = 225       # a partir deste valor de canal o pixel conta como fundo
NUMERO = (70, 50)     # canto onde mora o numero da celula: some se couber aqui
MIGALHA = 250         # componente menor que isto e sujeira, nao desenho

NOMES = """
astronauta pirata chef ninja mago super-heroi medico bombeiro cavaleiro vampiro
fantasma dinossauro sereia robo cauboi samurai detetive artista jardineiro cientista
rei anjo diabo esqueleto bruxa viking surfista bailarina boxeador dj
palhaco mumia alienigena mecanico aviador marinheiro gamer astro-do-rock pintor padeiro
fazendeiro fotografo magico piloto-de-corrida soldado ioga salva-vidas professor operario cupido
""".split()


# --- os bolsoes de fundo -----------------------------------------------------
# O flood fill entra pelas bordas da celula, entao o branco que fica cercado
# pelo desenho sobrevive. Isso e o que preserva os brancos internos: o jaleco do
# medico, o corpo do fantasma, o arminho do rei. Mas tambem preserva o papel que
# ficou preso num vao, tipicamente o entalhe onde o graveto quase encosta no
# corpo, e ele aparece como uma mancha branca sobre o fundo escuro do card.
#
# Nao da para separar os dois casos por conta propria. Nesse traco o branco da
# roupa E o papel, com um contorno desenhado em volta: o chapeu do chef e a
# cunha do samurai tem a mesma cor (253 contra 253), a mesma espessura e a mesma
# topologia. So o desenho diz qual e qual, entao a decisao vem escrita aqui.
#
# Cada entrada e o centro aproximado de um bolsao, em coordenadas da celula.
# Se algum parar de casar, o script avisa em vez de calar.
BOLSOES_DE_FUNDO = {
    # a cunha entre o corpo e o graveto
    "samurai":       [(173, 182)],
    "aviador":       [(169, 180), (176, 206)],
    "astro-do-rock": [(175, 188)],
    "medico":        [(184, 237), (160, 245), (176, 215)],
    # o vao entre o arco do fone e a cabeca
    "dj":            [(152, 69), (85, 73)],
    # entre o elmo e o penacho
    "cavaleiro":     [(163, 51), (174, 215)],
    # o entalhe raso onde o graveto encosta na barra da roupa
    "astronauta":    [(171, 214)],
    "pirata":        [(172, 214)],
    "chef":          [(172, 215)],
    "ninja":         [(176, 215)],
    "mago":          [(175, 214)],
    "bombeiro":      [(174, 214)],
    "robo":          [(175, 214)],
    "detetive":      [(176, 215)],
    "mecanico":      [(174, 206)],
    "soldado":       [(184, 200)],
    "professor":     [(178, 198)],
    "operario":      [(175, 198)],
}
TOLERANCIA = 7   # quanto o centro de um bolsao pode ter andado e ainda casar


def expande(semente, permitido):
    """Cresce a semente pelos vizinhos ate nao caber mais dentro de permitido."""
    atual = semente & permitido
    while True:
        novo = atual.copy()
        novo[1:, :] |= atual[:-1, :]
        novo[:-1, :] |= atual[1:, :]
        novo[:, 1:] |= atual[:, :-1]
        novo[:, :-1] |= atual[:, 1:]
        novo &= permitido
        if novo.sum() == atual.sum():
            return atual
        atual = novo


def dilata(mascara):
    """A mascara mais o anel de um pixel em volta dela."""
    d = mascara.copy()
    d[1:, :] |= mascara[:-1, :]
    d[:-1, :] |= mascara[1:, :]
    d[:, 1:] |= mascara[:, :-1]
    d[:, :-1] |= mascara[:, 1:]
    return d


def componentes(mascara):
    """Todas as ilhas conexas da mascara, da maior para a menor."""
    sobra = mascara.copy()
    achadas = []
    while sobra.any():
        ys, xs = np.nonzero(sobra)
        semente = np.zeros_like(sobra)
        semente[ys[0], xs[0]] = True
        ilha = expande(semente, sobra)
        achadas.append(ilha)
        sobra &= ~ilha
    achadas.sort(key=lambda c: c.sum(), reverse=True)
    return achadas


def linhas_da_grade(escuro, eixo, extensao):
    """Onde a moldura desenha linhas continuas, agrupadas em faixas."""
    soma = escuro.sum(axis=eixo)
    marcas = [i for i, v in enumerate(soma) if v > extensao * 0.80]
    faixas = []
    for m in marcas:
        if faixas and m - faixas[-1][-1] <= 3:
            faixas[-1].append(m)
        else:
            faixas.append([m])
    return [(min(f), max(f)) for f in faixas]


def recorta_celula(celula, bolsoes=(), avisos=None):
    """Do retalho cru para (mascara do personagem, alpha suave). None se vazio."""
    claro = celula.min(axis=2) >= FUNDO_MIN
    alt, larg = claro.shape

    # o fundo e o branco que se alcanca a partir da borda: os brancos internos
    # do desenho (jaleco do medico, o fantasma inteiro) ficam de fora
    borda = np.zeros_like(claro)
    borda[0, :] = borda[-1, :] = True
    borda[:, 0] = borda[:, -1] = True
    fundo = expande(borda, claro)
    tinta = ~fundo

    # a faixa do nome fica separada do desenho por um vao de linhas em branco;
    # entre os blocos de tinta, o personagem e o que tem mais pixels
    ocupada = tinta.sum(axis=1) > 0
    blocos, dentro = [], False
    for y, v in enumerate(ocupada):
        if v and not dentro:
            ini, dentro = y, True
        elif not v and dentro:
            blocos.append((ini, y))
            dentro = False
    if dentro:
        blocos.append((ini, alt))
    if not blocos:
        return None
    y0, y1 = max(blocos, key=lambda b: tinta[b[0]:b[1]].sum())
    faixa = np.zeros_like(tinta)
    faixa[y0:y1] = tinta[y0:y1]

    # sobram o personagem, os dois digitos do numero e alguma sujeira solta
    ilhas = componentes(faixa)
    if not ilhas:
        return None
    guardadas = ilhas[0]                       # o desenho e sempre a maior ilha
    for ilha in ilhas[1:]:
        if ilha.sum() < MIGALHA:
            continue                           # migalha: fora
        ys, xs = np.nonzero(ilha)
        if xs.max() < NUMERO[0] and ys.max() < NUMERO[1]:
            continue                           # o numero da celula: fora
        guardadas |= ilha                      # peca solta de verdade (a aureola)

    # o papel preso num vao do desenho: some pelo endereco anotado em
    # BOLSOES_DE_FUNDO, porque nenhuma medida local o distingue de roupa branca
    if bolsoes:
        presos = claro & ~fundo & guardadas
        for alvo in bolsoes:
            achou = False
            for ilha in componentes(presos):
                ys, xs = np.nonzero(ilha)
                if (abs(xs.mean() - alvo[0]) <= TOLERANCIA
                        and abs(ys.mean() - alvo[1]) <= TOLERANCIA):
                    guardadas &= ~ilha
                    achou = True
                    break
            if not achou and avisos is not None:
                avisos.append(alvo)

    # a franja: pixels quase brancos que encostam no fundo saem por meio-tom,
    # em vez de ficarem opacos e virarem pontinhos claros sobre o card escuro
    alpha = guardadas.astype(np.float32)
    # so o anel de um pixel que encosta no fundo. Usar expande() aqui deixaria o
    # fundo atravessar o desenho e comeria os brancos internos: o chapeu do
    # marinheiro, o jaleco do medico, o fantasma inteiro.
    encosta_no_fundo = dilata(fundo) & guardadas
    lum = celula.mean(axis=2)
    suave = encosta_no_fundo & (lum > 228)
    alpha[suave] = np.clip((252.0 - lum[suave]) / 24.0, 0.0, 1.0)
    return guardadas, alpha


def redimensiona(rgb, alpha, altura):
    """Reamostra com alpha premultiplicado, para o transparente nao sangrar."""
    pm = rgb.astype(np.float32) * alpha[..., None]
    escala = altura / float(alpha.shape[0])
    larg = max(1, int(round(alpha.shape[1] * escala)))
    tam = (larg, altura)
    pm_p = np.stack([
        np.asarray(Image.fromarray(pm[..., c]).resize(tam, Image.LANCZOS))
        for c in range(3)
    ], axis=2)
    a_p = np.clip(np.asarray(Image.fromarray(alpha).resize(tam, Image.LANCZOS)), 0.0, 1.0)
    seguro = np.maximum(a_p, 1e-6)[..., None]
    cor = np.clip(pm_p / seguro, 0, 255).astype(np.uint8)

    # onde o alpha e zero a divisao acima devolve lixo, que nao aparece na tela
    # mas incha o PNG e volta como halo quando o navegador reduz a imagem.
    # A cor da silhueta sangra alguns pixels para fora e o resto fica chapado.
    vazio = a_p < 0.004
    for _ in range(4):
        if not vazio.any():
            break
        vizinho = dilata(~vazio) & vazio
        if not vizinho.any():
            break
        empurrada = cor.copy()
        for eixo, passo in ((0, 1), (0, -1), (1, 1), (1, -1)):
            rolada = np.roll(cor, passo, axis=eixo)
            valida = np.roll(~vazio, passo, axis=eixo) & vizinho
            empurrada[valida] = rolada[valida]
        cor[vizinho] = empurrada[vizinho]
        vazio &= ~vizinho
    cor[vazio] = 0
    return cor, a_p


def main():
    if not os.path.exists(FONTE):
        sys.exit("nao achei %s" % FONTE)
    destino = sys.argv[1] if len(sys.argv) > 1 else DESTINO
    if not os.path.isdir(destino):
        os.makedirs(destino)

    folha = np.asarray(Image.open(FONTE).convert("RGB")).astype(np.int16)
    alt, larg, _ = folha.shape
    escuro = folha.max(axis=2) < 150
    verticais = linhas_da_grade(escuro, 0, alt)
    horizontais = linhas_da_grade(escuro, 1, larg)
    if len(verticais) != 11 or len(horizontais) != 5:
        sys.exit("grade inesperada: %d verticais, %d horizontais"
                 % (len(verticais), len(horizontais)))

    colunas = [(verticais[i][1] + MARGEM_GRADE, verticais[i + 1][0] - MARGEM_GRADE)
               for i in range(10)]
    fileiras = [(horizontais[i][1] + MARGEM_GRADE,
                 horizontais[i + 1][0] - MARGEM_GRADE if i + 1 < len(horizontais) else alt)
                for i in range(5)]

    prontos = []
    for idx, nome in enumerate(NOMES):
        y0, y1 = fileiras[idx // 10]
        x0, x1 = colunas[idx % 10]
        celula = folha[y0:y1, x0:x1]
        avisos = []
        achado = recorta_celula(celula, BOLSOES_DE_FUNDO.get(nome, ()), avisos)
        if achado is None:
            sys.exit("celula vazia: %s" % nome)
        for alvo in avisos:
            print("AVISO: %s nao tem bolsao em %s; a lista saiu do lugar" % (nome, alvo))
        mascara, alpha = achado
        ys, xs = np.nonzero(mascara)
        cy0, cy1, cx0, cx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        cor, a = redimensiona(celula[cy0:cy1, cx0:cx1].astype(np.uint8),
                              alpha[cy0:cy1, cx0:cx1], ALTURA)
        prontos.append((nome, cor, a))

    # tela unica para todos: assim o personagem sai do mesmo tamanho em toda
    # carta, seja o CSS normalizando por largura ou por altura
    tela = max(c.shape[1] for _, c, _ in prontos)
    for nome, cor, a in prontos:
        sprite = np.zeros((ALTURA, tela, 4), dtype=np.uint8)
        esq = (tela - cor.shape[1]) // 2
        sprite[:, esq:esq + cor.shape[1], :3] = cor
        sprite[:, esq:esq + cor.shape[1], 3] = (a * 255).round().astype(np.uint8)
        # arte chapada com poucas cores: a paleta de 256 guarda o meio-tom das
        # bordas com erro medio de ~1/255 e deixa o PNG cinco vezes menor
        pronto = Image.fromarray(sprite, "RGBA").quantize(colors=256,
                                                          method=Image.FASTOCTREE)
        pronto.save(os.path.join(destino, nome + ".png"), optimize=True)
    kb = sum(os.path.getsize(os.path.join(destino, n + ".png"))
             for n, _, _ in prontos) / 1024.0
    print("%d sprites de %dx%d em %s (%.0f KB)" % (len(prontos), tela, ALTURA, destino, kb))


if __name__ == "__main__":
    main()
