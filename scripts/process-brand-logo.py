"""Remove checkerboard/white background from brand logo PNG."""
from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path(
    r"C:\Users\ZhuanZ(无密码)\.cursor\projects\e-ai-supermarket\assets"
    r"\C__Users_ZhuanZ______AppData_Roaming_Cursor_User_workspaceStorage_274050ff540bc6ece7fbb63d3ab8e90d"
    r"_images_image-181f4e15-adec-4f89-913c-0933b775aefe.png"
)
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public"
APP_DIR = ROOT / "src" / "app"


def is_background(r: int, g: int, b: int) -> bool:
    if r >= 235 and g >= 235 and b >= 235:
        return True
    if abs(r - g) <= 10 and abs(g - b) <= 10 and r >= 200:
        return True
    return False


def is_foreground_color(r: int, g: int, b: int) -> bool:
    if r > 150 and g < 80 and b < 80:
        return True
    if r < 80 and g < 80 and b > 60:
        return True
    return False


def make_square_icon(im: Image.Image, size: int, pad: float = 0.85) -> Image.Image:
    w, h = im.size
    scale = min(size / w, size / h) * pad
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def png_to_data_uri(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def write_embedded_svg(im: Image.Image, path: Path, size: int = 64) -> None:
    icon = make_square_icon(im, size)
    data_uri = png_to_data_uri(icon)
    path.write_text(
        "\n".join(
            [
                '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64">',
                f'  <image width="64" height="64" preserveAspectRatio="xMidYMid meet" href="{data_uri}"/>',
                "</svg>",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    pixels = img.load()

    fg = Image.new("L", (w, h), 0)
    fg_pixels = fg.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _a = pixels[x, y]
            if is_foreground_color(r, g, b):
                fg_pixels[x, y] = 255

    expanded = fg
    for _ in range(8):
        expanded = expanded.filter(ImageFilter.MaxFilter(3))

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_pixels = out.load()
    exp = expanded.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _a = pixels[x, y]
            if exp[x, y] or not is_background(r, g, b):
                out_pixels[x, y] = (r, g, b, 255)

    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    APP_DIR.mkdir(parents=True, exist_ok=True)

    out.save(OUT_DIR / "logo.png", "PNG")
    out.save(OUT_DIR / "brand-logo.png", "PNG")
    icon64 = make_square_icon(out, 64)
    icon32 = make_square_icon(out, 32)
    icon180 = make_square_icon(out, 180)
    icon64.save(OUT_DIR / "brand-mark.png", "PNG")
    icon32.save(OUT_DIR / "favicon-32.png", "PNG")
    icon180.save(OUT_DIR / "apple-touch-icon.png", "PNG")
    icon64.save(APP_DIR / "icon.png", "PNG")

    write_embedded_svg(out, OUT_DIR / "brand-mark.svg")
    write_embedded_svg(out, APP_DIR / "icon.svg")

    print(f"Saved logo assets ({out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    main()
