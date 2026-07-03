# Genera el heroImage de la tarjeta de Google Wallet a partir de una foto.
# Recorta al ratio del banner (1032x336 ≈ 3:1), aplica un degradado espresso
# de abajo hacia arriba para que el texto/branding se lea, y exporta PNG.
#
# Uso:
#   python scripts/wallet/make-hero.py <foto_entrada> [salida]
#   (salida por defecto: apps/cliente/public/wallet-hero.png)
import sys
from PIL import Image

W, H = 1032, 336
ESPRESSO = (66, 36, 26)  # #42241A

def main():
    if len(sys.argv) < 2:
        print("Uso: python make-hero.py <foto> [salida]")
        sys.exit(1)
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else r"apps/cliente/public/wallet-hero.png"

    img = Image.open(src).convert("RGB")

    # Recorte "cover" centrado al ratio del banner.
    target = W / H
    r = img.width / img.height
    if r > target:                       # más ancha → recorta lados
        nw = int(img.height * target)
        x = (img.width - nw) // 2
        img = img.crop((x, 0, x + nw, img.height))
    else:                                # más alta → recorta arriba/abajo
        nh = int(img.width / target)
        y = (img.height - nh) // 2
        img = img.crop((0, y, img.width, y + nh))
    img = img.resize((W, H), Image.LANCZOS)

    # Degradado espresso (más fuerte abajo) para legibilidad del texto de Wallet.
    overlay = Image.new("L", (1, H))
    for y in range(H):
        t = y / (H - 1)
        overlay.putpixel((0, y), int(200 * (t ** 1.6)))  # 0 arriba → ~200 abajo
    overlay = overlay.resize((W, H))
    tint = Image.new("RGB", (W, H), ESPRESSO)
    img = Image.composite(tint, img, overlay)

    img.save(out)
    print("hero →", out, img.size)

if __name__ == "__main__":
    main()
