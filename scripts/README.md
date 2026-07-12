# scripts/extract_screenshots.py

Extrae capturas de los **momentos clave** de un vídeo (YouTube u otra URL soportada
por `yt-dlp`), detectando cambios de escena en lugar de un intervalo fijo, para
quedarse con los instantes donde aparece una operación, un gráfico o una explicación
nueva.

## Requisitos

```bash
pip install yt-dlp
sudo apt-get install ffmpeg      # o: brew install ffmpeg
```

## Uso

```bash
# Por defecto: detecta momentos clave y genera galería + hoja de contactos en ./capturas
python3 scripts/extract_screenshots.py "https://youtu.be/ALlHbUlFg_0"

# Más capturas (umbral más bajo) y carpeta propia
python3 scripts/extract_screenshots.py "https://youtu.be/ALlHbUlFg_0" \
    --outdir capturas_sensei --threshold 0.25 --min-gap 3

# Modo intervalo fijo (una captura cada 15 s) en vez de por escenas
python3 scripts/extract_screenshots.py "URL" --interval 15
```

## Salida

- `capturas/frames/` — un PNG por momento clave (el nombre lleva el minuto exacto).
- `capturas/index.html` — galería navegable; cada imagen enlaza al instante exacto del vídeo.
- `capturas/contact_sheet.png` — hoja de contactos (mosaico) para verlo todo de un vistazo.

## Nota sobre entornos con red restringida

En Claude Code on the web (u otros entornos con política de egress) el acceso a
YouTube puede estar **bloqueado**, por lo que `yt-dlp` no podrá descargar el vídeo.
En ese caso, ejecuta el script en tu **máquina local**, o sube el vídeo a un origen
accesible (por ejemplo Google Drive) para procesarlo desde ahí.
