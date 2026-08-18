from __future__ import annotations

import math
from pathlib import Path

import imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
WIDTH = 1920
HEIGHT = 1080
FPS = 30
DURATION_SECONDS = 15
FRAME_COUNT = FPS * DURATION_SECONDS
OUTPUT = ROOT / "public" / "previews" / "exgenesis-dashboard-preview.mp4"
POSTER = ROOT / "public" / "previews" / "exgenesis-dashboard-preview-poster.png"

TEXT = (249, 246, 240)


def make_background() -> Image.Image:
    return Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))


def draw_rotated_square(layer: Image.Image, center: tuple[int, int], size: int, stroke: int, angle: float, alpha: int) -> None:
    square = Image.new("RGBA", (size + stroke * 4, size + stroke * 4), (0, 0, 0, 0))
    draw = ImageDraw.Draw(square)
    pad = stroke * 2
    draw.rectangle((pad, pad, pad + size, pad + size), outline=(*TEXT, alpha), width=stroke)
    rotated = square.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    x = center[0] - rotated.width // 2
    y = center[1] - rotated.height // 2
    layer.alpha_composite(rotated, (x, y))


def draw_corners(draw: ImageDraw.ImageDraw, center: tuple[int, int], mark_size: int) -> None:
    corner = round(mark_size * 0.23)
    stroke = 10
    offset = round(mark_size * 0.12)
    x0 = center[0] - mark_size // 2 - offset
    y0 = center[1] - mark_size // 2 - offset
    x1 = center[0] + mark_size // 2 + offset
    y1 = center[1] + mark_size // 2 + offset
    color = (*TEXT, 245)

    draw.rectangle((x0, y0, x0 + corner - 1, y0 + stroke - 1), fill=color)
    draw.rectangle((x0, y0, x0 + stroke - 1, y0 + corner - 1), fill=color)
    draw.rectangle((x1 - corner + 1, y1 - stroke + 1, x1, y1), fill=color)
    draw.rectangle((x1 - stroke + 1, y1 - corner + 1, x1, y1), fill=color)


def draw_core(draw: ImageDraw.ImageDraw, center: tuple[int, int], mark_size: int, t: float) -> None:
    size = mark_size * 0.13 * (0.9 + 0.22 * ((1 - math.cos(2 * math.pi * t / 1.9)) / 2))
    half = size / 2
    points = [
        (center[0], center[1] - half),
        (center[0] + half, center[1]),
        (center[0], center[1] + half),
        (center[0] - half, center[1]),
    ]
    alpha = round(178 + 77 * ((1 - math.cos(2 * math.pi * t / 1.9)) / 2))
    draw.polygon(points, fill=(*TEXT, alpha))


def make_frame(background: Image.Image, frame_index: int) -> Image.Image:
    frame = background.copy()
    mark_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mark_layer)
    center = (WIDTH // 2, HEIGHT // 2)
    mark_size = 360
    t = frame_index / FPS

    draw_rotated_square(mark_layer, center, mark_size, 12, (t / 10) * 360, 108)
    draw_rotated_square(mark_layer, center, round(mark_size * 0.4), 5, -(t / 6) * 360, 168)
    draw_corners(draw, center, mark_size)
    draw_core(draw, center, mark_size, t)

    shadow = mark_layer.filter(ImageFilter.GaussianBlur(18))
    shadow.putalpha(shadow.getchannel("A").point(lambda a: int(a * 0.28)))
    frame = Image.alpha_composite(frame, shadow)
    return Image.alpha_composite(frame, mark_layer).convert("RGB")


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    background = make_background()
    POSTER.parent.mkdir(parents=True, exist_ok=True)
    make_frame(background, 0).save(POSTER)

    writer = imageio.get_writer(
        OUTPUT,
        fps=FPS,
        codec="libx264",
        quality=9,
        pixelformat="yuv420p",
        macro_block_size=1,
    )
    try:
        for i in range(FRAME_COUNT):
            writer.append_data(np.asarray(make_frame(background, i)))
    finally:
        writer.close()

    print(OUTPUT)
    print(POSTER)


if __name__ == "__main__":
    main()
