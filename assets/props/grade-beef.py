"""Lead-authored colour recipe for the owned Recraft sear swatch.
The original stays unchanged. This derivative still needs an in-scene review."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/devlog/media/kitchen-production/seared-beef-surface-01.webp"
OUTPUT = ROOT / "assets/recraft/food-lino/seared-beef-surface.webp"
EXPECTED = "d566639170011b88e6ddf6c3afd593c4f3a2ecdde1474e090f661d675f779a30"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED, "Source changed"

def linear(c):
    return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)

def srgb(c):
    return np.where(c <= .0031308, c * 12.92, 1.055 * np.maximum(c, 0) ** (1 / 2.4) - .055)

palette_hex = ["3c2119", "744027", "a5663b", "bd8a56"]
palette = np.array([[int(h[i:i+2], 16) / 255 for i in (0, 2, 4)] for h in palette_hex])
knots = [0, .25, .6, 1]
source = np.asarray(Image.open(SOURCE).convert("RGB"), dtype=np.float32) / 255
# Artistic perceptual-luma palette mapping, followed by linear-light resizing.
luma = source @ np.array([.2126, .7152, .0722])
graded = np.stack([np.interp(luma, knots, linear(palette)[:, c]) for c in range(3)], axis=-1)
small = np.stack([
    np.asarray(Image.fromarray(graded[..., c].astype(np.float32)).resize((512, 512), Image.Resampling.LANCZOS))
    for c in range(3)
], axis=-1)
Image.fromarray(np.uint8(np.clip(srgb(small), 0, 1) * 255 + .5)).save(OUTPUT, quality=90, method=6)
receipt = {
    "status": "candidate_requires_in_scene_review",
    "source": str(SOURCE.relative_to(ROOT)), "source_sha256": EXPECTED,
    "output": str(OUTPUT.relative_to(ROOT)),
    "sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
    "size": [512, 512], "palette_srgb_hex": palette_hex, "perceptual_luma_knots": knots,
    "resampling": "linear-light float-channel Lanczos",
    "pillow_version": pillow_version,
}
(ROOT / "assets/props/beef-surface-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt, indent=2))
