# Videos showcase

Place 6 MP4 files here, named `work-1.mp4` through `work-6.mp4`.

## Format expected

- **Container**: MP4
- **Codec**: H.264 (`libx264`)
- **Aspect ratio**: 9:16 (vertical) — the grid in `index.html` enforces this aspect ratio on every cell, so any other ratio will be cropped via `object-fit: cover`.
- **Resolution**: 1080×1920 max, 720×1280 recommended.
- **Duration**: 6–15 seconds. They loop forever, so make sure the start and end frames are visually consistent.
- **Audio**: stripped (videos auto-play muted).
- **Bitrate**: aim for ~2–4 Mbps. The full grid lazy-loads, but each clip should still be lean.

## Encoding recipe (ffmpeg)

```bash
ffmpeg -i source.mov \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
  -c:v libx264 -preset slow -crf 24 \
  -an \
  -movflags +faststart \
  -pix_fmt yuv420p \
  work-1.mp4
```

The `-movflags +faststart` flag is **important** — it puts the moov atom at the head of the file so the browser can start playback before the full file is downloaded.

## Posters

For each `work-N.mp4`, generate a matching `work-N.webp` poster in `/posters/`.

```bash
ffmpeg -i work-1.mp4 -vframes 1 -ss 00:00:01 -c:v libwebp -quality 80 ../posters/work-1.webp
```
