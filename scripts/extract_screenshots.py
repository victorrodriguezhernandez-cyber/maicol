#!/usr/bin/env python3
"""
extract_screenshots.py
======================

Descarga un vídeo (YouTube u otra URL soportada por yt-dlp) y extrae capturas
de pantalla de los "momentos importantes": cada vez que cambia lo que se ve en
pantalla (una operación nueva, un gráfico nuevo, una diapositiva de explicación
distinta...). Usa detección de cambios de escena de ffmpeg, no un intervalo
fijo, para quedarse con los momentos que realmente aportan.

Genera:
  - <outdir>/frames/         -> una imagen PNG por momento clave (con el minuto
                                en el nombre: p.ej. 0007m32s_014.png)
  - <outdir>/index.html      -> galería navegable; cada captura enlaza al
                                momento exacto del vídeo en YouTube
  - <outdir>/contact_sheet.png (opcional) -> hoja de contactos (mosaico)

Requisitos: yt-dlp y ffmpeg/ffprobe en el PATH.

Uso básico:
    python3 scripts/extract_screenshots.py "https://youtu.be/ALlHbUlFg_0"

Opciones útiles:
    --outdir capturas          Carpeta de salida (por defecto: ./capturas)
    --threshold 0.30           Sensibilidad del cambio de escena (0-1).
                               Más bajo = más capturas. 0.25-0.35 va bien.
    --min-gap 4                Segundos mínimos entre capturas (evita duplicados).
    --interval 20              En vez de escenas, captura una cada N segundos.
    --no-contact-sheet         No generar la hoja de contactos.
    --keep-video               No borrar el vídeo descargado al terminar.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile


def die(msg: str) -> None:
    print(f"\n[ERROR] {msg}", file=sys.stderr)
    sys.exit(1)


def check_tools() -> None:
    for tool in ("yt-dlp", "ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            die(
                f"No encuentro '{tool}' en el PATH.\n"
                f"Instálalo:  pip install yt-dlp   /   apt-get install ffmpeg"
            )


def extract_video_id(url: str) -> str | None:
    m = re.search(r"(?:v=|youtu\.be/|/shorts/|/embed/)([A-Za-z0-9_-]{11})", url)
    return m.group(1) if m else None


def download_video(url: str, workdir: str) -> str:
    out_tmpl = os.path.join(workdir, "video.%(ext)s")
    print(f"[1/4] Descargando vídeo...")
    cmd = [
        "yt-dlp",
        "-f", "bv*[height<=1080]+ba/b[height<=1080]/b",
        "--merge-output-format", "mp4",
        "-o", out_tmpl,
        url,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        die(
            "yt-dlp no pudo descargar el vídeo. Salida:\n"
            + proc.stderr[-1500:]
            + "\n\nNota: si estás en un entorno con la red restringida (por "
            "ejemplo Claude Code on the web con política de egress), YouTube "
            "puede estar bloqueado. Ejecuta este script en tu máquina local."
        )
    for f in os.listdir(workdir):
        if f.startswith("video."):
            return os.path.join(workdir, f)
    die("No encuentro el vídeo descargado.")


def get_duration(video_path: str) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", video_path],
        capture_output=True, text=True,
    )
    try:
        return float(proc.stdout.strip())
    except ValueError:
        return 0.0


def detect_scene_timestamps(video_path: str, threshold: float) -> list[float]:
    """Devuelve los timestamps (segundos) de cada cambio de escena."""
    print(f"[2/4] Detectando momentos clave (umbral {threshold})...")
    proc = subprocess.run(
        ["ffmpeg", "-i", video_path,
         "-vf", f"select='gt(scene,{threshold})',showinfo",
         "-vsync", "vfr", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    times = [float(m) for m in re.findall(r"pts_time:([0-9.]+)", proc.stderr)]
    return times


def interval_timestamps(duration: float, interval: float) -> list[float]:
    t, out = interval / 2.0, []
    while t < duration:
        out.append(t)
        t += interval
    return out


def apply_min_gap(times: list[float], min_gap: float) -> list[float]:
    kept: list[float] = []
    for t in times:
        if not kept or (t - kept[-1]) >= min_gap:
            kept.append(t)
    return kept


def fmt_ts(seconds: float) -> str:
    s = int(round(seconds))
    return f"{s // 3600:02d}h{(s % 3600) // 60:02d}m{s % 60:02d}s".removeprefix("00h")


def grab_frame(video_path: str, t: float, out_path: str) -> bool:
    proc = subprocess.run(
        ["ffmpeg", "-y", "-ss", f"{t:.3f}", "-i", video_path,
         "-frames:v", "1", "-q:v", "2", out_path],
        capture_output=True, text=True,
    )
    return proc.returncode == 0 and os.path.exists(out_path)


def build_gallery(outdir: str, shots: list[tuple[str, float]],
                  video_id: str | None, title: str) -> None:
    rows = []
    for fname, t in shots:
        link = (f"https://youtu.be/{video_id}?t={int(t)}"
                if video_id else "#")
        rows.append(f"""
      <figure>
        <a href="{link}" target="_blank" rel="noopener">
          <img src="frames/{fname}" loading="lazy" alt="{fmt_ts(t)}">
        </a>
        <figcaption>⏱ {fmt_ts(t)}</figcaption>
      </figure>""")
    html = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ font-family: system-ui, sans-serif; margin: 0; padding: 24px;
         background:#0f1115; color:#e8eaed; }}
  @media (prefers-color-scheme: light) {{ body {{ background:#f6f7f9; color:#1a1a1a; }} }}
  h1 {{ font-size: 1.3rem; }}
  .meta {{ opacity:.7; margin-bottom:24px; }}
  .grid {{ display:grid; gap:16px;
          grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); }}
  figure {{ margin:0; background:#1a1d24; border-radius:10px; overflow:hidden; }}
  @media (prefers-color-scheme: light) {{ figure {{ background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.1); }} }}
  img {{ width:100%; display:block; aspect-ratio:16/9; object-fit:cover; }}
  figcaption {{ padding:8px 12px; font-size:.9rem; font-variant-numeric:tabular-nums; }}
</style>
</head>
<body>
  <h1>{title}</h1>
  <div class="meta">{len(shots)} capturas de los momentos clave · clic en una imagen para ir a ese instante del vídeo</div>
  <div class="grid">{''.join(rows)}
  </div>
</body>
</html>"""
    with open(os.path.join(outdir, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)


def build_contact_sheet(outdir: str, frames_dir: str, n: int) -> None:
    if n == 0:
        return
    cols = 4
    rows = (n + cols - 1) // cols
    print("[4/4] Generando hoja de contactos...")
    subprocess.run(
        ["ffmpeg", "-y", "-pattern_type", "glob",
         "-i", os.path.join(frames_dir, "*.png"),
         "-vf", f"scale=480:-1,tile={cols}x{rows}:padding=6:margin=6",
         "-frames:v", "1", os.path.join(outdir, "contact_sheet.png")],
        capture_output=True, text=True,
    )


def main() -> None:
    p = argparse.ArgumentParser(description="Extrae capturas de los momentos clave de un vídeo.")
    p.add_argument("url", help="URL del vídeo (YouTube u otra soportada por yt-dlp)")
    p.add_argument("--outdir", default="capturas")
    p.add_argument("--threshold", type=float, default=0.30)
    p.add_argument("--min-gap", type=float, default=4.0)
    p.add_argument("--interval", type=float, default=None,
                   help="Captura cada N segundos en vez de por escenas.")
    p.add_argument("--no-contact-sheet", action="store_true")
    p.add_argument("--keep-video", action="store_true")
    args = p.parse_args()

    check_tools()
    os.makedirs(args.outdir, exist_ok=True)
    frames_dir = os.path.join(args.outdir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    video_id = extract_video_id(args.url)
    workdir = tempfile.mkdtemp(prefix="vidshots_")
    try:
        video_path = download_video(args.url, workdir)
        duration = get_duration(video_path)

        if args.interval:
            times = interval_timestamps(duration, args.interval)
        else:
            times = detect_scene_timestamps(video_path, args.threshold)
            if len(times) < 5:
                print("  (pocos cambios de escena; caigo a intervalo de 20s)")
                times = interval_timestamps(duration, 20.0)

        times = apply_min_gap(sorted(times), args.min_gap)
        if not times:
            die("No se detectaron momentos que capturar.")

        print(f"[3/4] Extrayendo {len(times)} capturas...")
        shots: list[tuple[str, float]] = []
        for i, t in enumerate(times, 1):
            fname = f"{fmt_ts(t)}_{i:03d}.png"
            if grab_frame(video_path, t, os.path.join(frames_dir, fname)):
                shots.append((fname, t))

        title = f"Capturas de los momentos clave"
        if video_id:
            title += f" · YouTube {video_id}"
        build_gallery(args.outdir, shots, video_id, title)
        if not args.no_contact_sheet:
            build_contact_sheet(args.outdir, frames_dir, len(shots))

        print(f"\n✅ Listo: {len(shots)} capturas")
        print(f"   Galería:  {os.path.join(args.outdir, 'index.html')}")
        print(f"   Imágenes: {frames_dir}/")
    finally:
        if args.keep_video:
            dst = os.path.join(args.outdir, os.path.basename(video_path))
            shutil.move(video_path, dst)
            print(f"   Vídeo:    {dst}")
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    main()
