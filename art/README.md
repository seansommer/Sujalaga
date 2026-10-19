# Original Sujalaga artwork

Still artwork was created with OpenAI image generation for this game. Original PNGs are retained in `assets/`; compressed versions serve the game, app icon, and share card.

Cover direction: original premium 3D arcade key art, emerald and violet space hangar, polished chrome and SUJA-green twin-nozzle filling ship, flying juice bottles with tiny metallic wings and purple thrusters, orbiting planets and juice droplets. Large readable SUJALAGA! title with SUJA GAME CENTER subtitle. No people, no existing arcade characters or copied game assets.

Icon direction: use the cover as a visual reference; square composition with the filling ship large in the foreground and three flying juice bottles above it, emerald planet, violet engines, strong silhouette, no title. Designed for small home-screen use.

## Animated title screen

The cover was animated in Runway on October 19, 2026 (task `261afcfe-ab41-4124-b3bb-650e3f5d48ae`), using the same cover as both the starting and ending reference. Direction: a locked camera, hovering ships, pulsing purple thrusters and neon lights, moving juice streams and floating droplets, with the existing SUJALAGA lettering and composition preserved. No soundtrack was generated; the game's music controls remain independent.

`attract-loop-master.mp4` is the retained full-resolution 1664 × 1248 silent movie at 24 fps. The generated clip was trimmed to ten seconds, given a half-second wrap dissolve, and retimed to exactly ten seconds for smooth looping. This master stays in GitHub and is not copied into the published game.

`scripts/encode-attract.sh` exports the runtime media from this master with FFmpeg:

- `assets/attract-wide.mp4`: 1280 × 720; the complete illustration sits on the right over a blurred extension, leaving room for the arcade controls.
- `assets/attract-portrait.mp4`: 540 × 960; a crop below the baked-in title, with a readable HTML wordmark above the action on phones.
- Matching WebP posters provide immediate artwork and the reduced-motion fallback.

Both web movies use H.264, yuv420p, a front-loaded MP4 index, and no audio. The service worker leaves movie byte-range requests to the browser/CDN; posters remain available offline. Video playback needs the media to have loaded successfully.
