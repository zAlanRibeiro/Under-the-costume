# -*- coding: utf-8 -*-
"""
Acha as batidas das musicas da fita da pista de danca e grava js/batidas.js.

O YouTube nao deixa a pagina ouvir o audio do clipe, entao a fita chega com o
ritmo ja achado. Este script baixa o audio de cada video para a pasta temporaria
do sistema (fora do repositorio; fica la para a proxima rodada nao baixar de
novo), acha as batidas e decide onde caem as notas. Tres cuidados:

  - A grade e o que o jogo julga, e a janela do Perfeito (35 ms) e menor que
    tres quadros de analise. O rastreador do librosa da a batida no quadro;
    cada trecho de tempo constante vira uma reta de minimos quadrados, que
    acerta muito abaixo do quadro.

  - Clipe nao e faixa de album: tem fala, silencio e pausa no meio. Trecho
    novo quando duas batidas seguidas caem longe da reta do trecho ou a musica
    cala (uma so fora do lugar e o rastreador tropecando), e trecho curto
    demais para ser musica e descartado.

  - Nota so onde a musica bate de verdade: na batida com ataque acima do
    normal da musica, e no contratempo so com ataque forte.

Le os videos e o BPM aproximado do proprio index.html (data-video, data-bpm).
Requer: yt-dlp, librosa, imageio-ffmpeg.  Uso: python dados/ritmo.py
"""
import json
import os
import re
import subprocess
import sys
import tempfile

import imageio_ffmpeg
import librosa
import numpy as np
import yt_dlp

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGINA = os.path.join(RAIZ, "index.html")
DESTINO = os.path.join(RAIZ, "js", "batidas.js")

TAXA = 22050
SALTO = 256           # ~11,6 ms por quadro
SALTO_FASE = 0.05     # segundos: batida mais longe que isto da reta do trecho esta fora
MINIMO = 16           # batidas: menos que isso e fala ou virada, nao musica
SILENCIO_DB = -32     # abaixo disto (relativo ao trecho mais alto) a musica calou
CACHE = os.path.join(tempfile.gettempdir(), "mimikyu-ritmo")


def baixar(video):
    ja = [f for f in os.listdir(CACHE) if f.startswith(video + ".")]
    if ja:
        return os.path.join(CACHE, ja[0])
    opcoes = {"format": "bestaudio", "quiet": True, "no_warnings": True, "noprogress": True,
              "outtmpl": os.path.join(CACHE, "%(id)s.%(ext)s")}
    # o YouTube devolve 403 de vez em quando no meio de uma leva; na segunda costuma ir
    for tentativa in range(3):
        try:
            with yt_dlp.YoutubeDL(opcoes) as ydl:
                return ydl.prepare_filename(ydl.extract_info("https://www.youtube.com/watch?v=" + video))
        except yt_dlp.utils.DownloadError:
            if tentativa == 2:
                raise


def decodificar(arquivo):
    bruto = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", arquivo,
         "-ac", "1", "-ar", str(TAXA), "-f", "f32le", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(bruto, dtype=np.float32)


def trechos(tempos, soando):
    """Separa as batidas em trechos de tempo constante e ajusta uma reta em cada."""
    grupos, atual, fora = [], [], 0   # atual: (indice da batida no trecho, tempo)
    for t, ok in zip(tempos, soando):
        if not ok:
            grupos.append(atual)
            atual, fora = [], 0
            continue
        k = atual[-1][0] + 1 if atual else 0
        if len(atual) >= 4:
            # o rastreador oscila um ou dois quadros de batida a batida: o que
            # vale e a distancia ate a reta do trecho inteiro, nao ate a vizinha
            p, t0 = np.polyfit(*zip(*atual), 1)
            k = round((t - t0) / p)
            if k <= atual[-1][0] or abs(t - (t0 + p * k)) > SALTO_FASE:
                fora += 1
                if fora < 2:
                    continue
                grupos.append(atual)
                atual, k = [], 0
        fora = 0
        atual.append((k, t))
    grupos.append(atual)

    saida = []
    for g in grupos:
        if len(g) < MINIMO:
            continue
        k, t = (np.array(v) for v in zip(*g))
        p, t0 = np.polyfit(k, t, 1)
        resto = t - (t0 + p * k)
        saida.append({"t0": t0, "p": p, "n": int(k[-1]) + 1, "erro": float(np.std(resto))})
    return saida


def notas(segs, envelope, sr_env):
    """Meias batidas (contadas desde a primeira do primeiro trecho) que viram nota."""
    def ataque(t):
        q = int(round(t * sr_env))
        r = max(1, int(0.025 * sr_env))
        return float(envelope[max(0, q - r):q + r + 1].max(initial=0))

    todas = [ataque(s["t0"] + i * s["p"]) for s in segs for i in range(s["n"])]
    na_batida, no_meio = np.percentile(todas, 35), np.percentile(todas, 80)

    lista, k0 = [], 0
    for s in segs:
        for i in range(s["n"]):
            t = s["t0"] + i * s["p"]
            if ataque(t) >= na_batida:
                lista.append(2 * (k0 + i))
            if i + 1 < s["n"] and ataque(t + s["p"] / 2) >= no_meio:
                lista.append(2 * (k0 + i) + 1)
        k0 += s["n"]
    return lista


def analisar(arquivo, bpm):
    y = decodificar(arquivo)
    envelope = librosa.onset.onset_strength(y=y, sr=TAXA, hop_length=SALTO)
    # bpm fixo pela fita: o rastreador so decide onde cada batida cai
    _, quadros = librosa.beat.beat_track(onset_envelope=envelope, sr=TAXA,
                                         hop_length=SALTO, bpm=bpm, tightness=400)
    tempos = librosa.frames_to_time(quadros, sr=TAXA, hop_length=SALTO)

    volume = librosa.amplitude_to_db(librosa.feature.rms(y=y, hop_length=SALTO)[0], ref=np.max)
    soando = volume[np.minimum(quadros, len(volume) - 1)] > SILENCIO_DB

    segs = trechos(tempos, soando)
    return segs, notas(segs, envelope, TAXA / SALTO)


def main():
    html = open(PAGINA, encoding="utf-8").read()
    fita = re.findall(r'data-video="([\w-]{11})" data-bpm="([\d.]+)"', html)
    if not fita:
        sys.exit("nenhuma musica com data-video/data-bpm no index.html")

    saida = {}
    os.makedirs(CACHE, exist_ok=True)
    for video, bpm in fita:
        segs, lista = analisar(baixar(video), float(bpm))
        assert segs, video + ": nenhum trecho com ritmo"
        assert all(segs[i]["t0"] < segs[i + 1]["t0"] for i in range(len(segs) - 1))
        assert lista == sorted(set(lista))
        pior = max(s["erro"] for s in segs) * 1000
        medido = 60 / np.median([s["p"] for s in segs])
        print(f"{video}  fita {bpm:>5}  medido {medido:6.2f} BPM  {len(segs)} trecho(s) "
              f"desde {segs[0]['t0']:5.1f}s  {len(lista)} notas  desvio da reta {pior:.1f} ms")
        saida[video] = {
            "s": [[round(s["t0"], 4), round(s["p"], 6), s["n"]] for s in segs],
            "h": lista,
        }

    with open(DESTINO, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* ============================================================\n"
                "   As batidas da fita, achadas por dados/ritmo.py. Nao editar a mao.\n"
                "   s: trechos de tempo constante [inicio em s, periodo em s, batidas]\n"
                "   h: as notas, em meias batidas contadas desde a primeira do primeiro trecho\n"
                "   ============================================================ */\n")
        f.write("window.BATIDAS = " + json.dumps(saida, separators=(",", ":")) + ";\n")
    print("gravado:", DESTINO)


if __name__ == "__main__":
    main()
