"""Build local image-content fingerprints; never edits or uploads source images.

Requires Pillow and NumPy. Runtime scanning uses this small index rather than
downloading full-resolution photographs on the owner's phone.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
catalogue = json.loads((root / "site/projects.json").read_text(encoding="utf-8"))
sources = sorted({item if isinstance(item, str) else item["src"]
                  for project in catalogue["entries"]
                  for item in project.get("images", [])})
cosine = np.cos(np.pi * (np.arange(32)[:, None] + .5) * np.arange(8)[None, :] / 32).T


def bits(values):
    number = 0
    for value in values:
        number = (number << 1) | bool(value)
    return f"{number:016x}"


records = {}
for index, source in enumerate(sources):
    if not source.startswith("assets/") or ".." in Path(source).parts:
        raise ValueError("Unexpected image source")
    file = root / "site" / source
    raw = file.read_bytes()
    with Image.open(file) as opened:
        if getattr(opened, "is_animated", False):
            continue
        rgba = ImageOps.exif_transpose(opened).convert("RGBA")
        image = Image.new("RGBA", rgba.size, "white")
        image.alpha_composite(rgba)
        image = image.convert("RGB")
        gray = np.asarray(image.resize((32, 32), Image.Resampling.LANCZOS).convert("L"), dtype=float)
        dct = cosine @ gray @ cosine.T
        coefficients = dct.flatten()
        phash = bits(coefficients > np.median(coefficients[1:]))
        gradient = np.asarray(image.resize((9, 8), Image.Resampling.LANCZOS).convert("L"), dtype=int)
        dhash = bits((gradient[:, :-1] > gradient[:, 1:]).flatten())
        records[source] = {
            "sha256": hashlib.sha256(raw).hexdigest(),
            "pixels": hashlib.sha256(f"{rgba.width}x{rgba.height}:".encode() + rgba.tobytes()).hexdigest(),
            "p": phash, "d": dhash,
            "width": rgba.width, "height": rgba.height, "bytes": len(raw),
            "color": list(image.resize((3, 3), Image.Resampling.BILINEAR).tobytes()),
            "detail": round(float(gray.std()), 2),
        }
    if (index + 1) % 100 == 0:
        print(f"Indexed {index + 1}/{len(sources)} photographs", flush=True)

destination = root / "site/image-fingerprints.json"
destination.write_text(json.dumps({"version": 1, "algorithm": "photo-content-v1", "records": records}, separators=(",", ":")), encoding="utf-8")
print(json.dumps({"indexed": len(records), "bytes": destination.stat().st_size}))
