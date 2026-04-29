# Video posters

Place 6 WebP poster images here, named `work-1.webp` through `work-6.webp`.

## Format expected

- **Format**: WebP (95%+ browser support).
- **Aspect ratio**: 9:16 (matches the videos).
- **Resolution**: 720×1280, lossless or quality ~80.
- **Size target**: < 60 KB each (the grid renders 6 of them).

## Quick generation from the matching video

```bash
ffmpeg -i ../videos/work-1.mp4 -vframes 1 -ss 00:00:01 -c:v libwebp -quality 80 work-1.webp
```

## Why WebP and not JPG

WebP is ~30% smaller than JPG at equivalent quality and is supported by all modern browsers (Chrome, Firefox, Edge, Safari 14+). The `<video poster="…">` attribute accepts WebP transparently — no `<picture>` fallback needed for this use case.
