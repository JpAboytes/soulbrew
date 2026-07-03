# Genera el logo circular de la tarjeta de Wallet: wordmark centrado sobre espresso.
# Google recorta programLogo a un CÍRCULO, así que el wordmark debe caber en el
# círculo inscrito. Uso: python make-logo.py <padding_frac> <salida>
import sys
from PIL import Image
SRC = r"apps/cliente/public/logo-dark.png"
ESPRESSO = (66, 36, 26)
pad = float(sys.argv[1]) if len(sys.argv) > 1 else 0.08
out = sys.argv[2] if len(sys.argv) > 2 else r"apps/cliente/public/wallet-logo.png"
S = 660
logo = Image.open(SRC).convert("RGBA")
canvas = Image.new("RGBA", (S, S), ESPRESSO + (255,))
maxw = S - 2*int(S*pad)
r = min(maxw/logo.width, maxw/logo.height)
lg = logo.resize((int(logo.width*r), int(logo.height*r)), Image.LANCZOS)
canvas.alpha_composite(lg, ((S-lg.width)//2, (S-lg.height)//2))
canvas.convert("RGB").save(out)
print("logo →", out, "padding", pad)
