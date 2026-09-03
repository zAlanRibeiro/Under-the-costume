# Fatia a folha de referencia (grade 10x5) em 50 sprites PNG com fundo transparente.
# O fundo branco e removido por flood fill a partir das bordas, para preservar
# os brancos internos do personagem (jaleco do medico, chapeu do chef, o fantasma).
Add-Type -AssemblyName System.Drawing

$raiz  = Split-Path -Parent $PSScriptRoot   # a raiz do projeto, para o script rodar em qualquer clone
$fonte = Join-Path $raiz "costumes.jpg"
$destino = Join-Path $raiz "imagens\fantasias"
New-Item -ItemType Directory -Force $destino | Out-Null

# linhas da grade detectadas na analise
$colX = @(19, 288, 558, 829, 1102, 1377, 1652, 1926, 2197, 2467, 2732)
$rowY = @(26, 332, 638, 945, 1246, 1536)   # a ultima fileira vem cortada na origem

$nomes = @(
  "astronauta","pirata","chef","ninja","mago","super-heroi","medico","bombeiro","cavaleiro","vampiro",
  "fantasma","dinossauro","sereia","robo","cauboi","samurai","detetive","artista","jardineiro","cientista",
  "rei","anjo","diabo","esqueleto","bruxa","viking","surfista","bailarina","boxeador","dj",
  "palhaco","mumia","alienigena","mecanico","aviador","marinheiro","gamer","astro-do-rock","pintor","padeiro",
  "fazendeiro","fotografo","magico","piloto-de-corrida","soldado","ioga","salva-vidas","professor","operario","cupido"
)

$orig = [System.Drawing.Bitmap]::FromFile($fonte)
$ALTURA_FINAL = 210
$relatorio = @()

for ($linha = 0; $linha -lt 5; $linha++) {
  for ($coluna = 0; $coluna -lt 10; $coluna++) {
    $indice = $linha * 10 + $coluna
    $nome = $nomes[$indice]

    $x0 = $colX[$coluna] + 2
    $x1 = $colX[$coluna + 1] - 2
    $y0 = $rowY[$linha] + 2
    $y1 = $rowY[$linha + 1] - 2
    $w = $x1 - $x0
    $h = $y1 - $y0

    # recorta a celula
    $rc = New-Object System.Drawing.Rectangle $x0, $y0, $w, $h
    $celula = $orig.Clone($rc, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    # apaga o numero (canto superior esquerdo) e a faixa do nome (base)
    $g = [System.Drawing.Graphics]::FromImage($celula)
    $branco = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.FillRectangle($branco, 0, 0, 84, 62)
    $alturaNome = if ($linha -eq 4) { 44 } else { 58 }
    $g.FillRectangle($branco, 0, $h - $alturaNome, $w, $alturaNome)
    $g.Dispose(); $branco.Dispose()

    # --- flood fill do fundo, partindo das bordas ---
    $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
    $dados = $celula.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $dados.Stride
    $buf = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($dados.Scan0, $buf, 0, $buf.Length)

    $visto = New-Object bool[] ($w * $h)
    $pilha = New-Object System.Collections.Generic.Stack[int]

    function EhFundo($idx) {
      $p = $idx * 4
      return ($buf[$p] -gt 224 -and $buf[$p+1] -gt 224 -and $buf[$p+2] -gt 224)
    }

    for ($x = 0; $x -lt $w; $x++) {
      $pilha.Push($x); $pilha.Push(($h - 1) * $w + $x)
    }
    for ($y = 0; $y -lt $h; $y++) {
      $pilha.Push($y * $w); $pilha.Push($y * $w + $w - 1)
    }

    while ($pilha.Count -gt 0) {
      $i = $pilha.Pop()
      if ($i -lt 0 -or $i -ge $w * $h) { continue }
      if ($visto[$i]) { continue }
      $py = [int]([math]::Floor($i / $w))
      $px = $i - $py * $w
      $off = $py * $stride + $px * 4
      if (-not ($buf[$off] -gt 224 -and $buf[$off+1] -gt 224 -and $buf[$off+2] -gt 224)) { continue }
      $visto[$i] = $true
      $buf[$off+3] = 0    # transparente
      if ($px -gt 0)      { $pilha.Push($i - 1) }
      if ($px -lt $w - 1) { $pilha.Push($i + 1) }
      if ($py -gt 0)      { $pilha.Push($i - $w) }
      if ($py -lt $h - 1) { $pilha.Push($i + $w) }
    }

    # --- bounding box do que sobrou ---
    $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
    for ($py = 0; $py -lt $h; $py++) {
      $base = $py * $stride
      for ($px = 0; $px -lt $w; $px++) {
        if ($buf[$base + $px*4 + 3] -gt 8) {
          if ($px -lt $minX) { $minX = $px }
          if ($px -gt $maxX) { $maxX = $px }
          if ($py -lt $minY) { $minY = $py }
          if ($py -gt $maxY) { $maxY = $py }
        }
      }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $dados.Scan0, $buf.Length)
    $celula.UnlockBits($dados)

    if ($maxX -lt 0) { $relatorio += "$nome VAZIO"; $celula.Dispose(); continue }

    $cw = $maxX - $minX + 1
    $ch = $maxY - $minY + 1
    $rc2 = New-Object System.Drawing.Rectangle $minX, $minY, $cw, $ch
    $cortado = $celula.Clone($rc2, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $celula.Dispose()

    # redimensiona para altura padrao
    $escala = $ALTURA_FINAL / $ch
    $nw = [int][math]::Round($cw * $escala)
    $nh = $ALTURA_FINAL
    $final = New-Object System.Drawing.Bitmap $nw, $nh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g2 = [System.Drawing.Graphics]::FromImage($final)
    $g2.InterpolationMode = "HighQualityBicubic"
    $g2.PixelOffsetMode = "HighQuality"
    $g2.DrawImage($cortado, 0, 0, $nw, $nh)
    $g2.Dispose(); $cortado.Dispose()

    $saida = Join-Path $destino "$nome.png"
    $final.Save($saida, [System.Drawing.Imaging.ImageFormat]::Png)
    $final.Dispose()
    $relatorio += ("{0,-20} {1}x{2}" -f $nome, $nw, $nh)
  }
}

$orig.Dispose()
$relatorio | ForEach-Object { $_ }
"--- total: $((Get-ChildItem "$destino\*.png").Count) arquivos, $([math]::Round((Get-ChildItem "$destino\*.png" | Measure-Object Length -Sum).Sum/1KB)) KB ---"
