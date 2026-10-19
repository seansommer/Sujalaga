#!/usr/bin/env bash
# Run from the repository root. Requires FFmpeg; ordinary app builds use the checked-in exports.
set -euo pipefail
ffmpeg -hide_banner -loglevel error -y -i art/attract-loop-master.mp4 \
  -filter_complex '[0:v]split=3[widebg][widefg][phone];[widebg]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,gblur=sigma=24,eq=brightness=-0.12:saturation=0.8[bg];[widefg]scale=960:720[fg];[bg][fg]overlay=320:0,setsar=1[wide];[phone]crop=504:896:580:352,scale=540:960,setsar=1[portrait]' \
  -map '[wide]' -an -c:v libx264 -preset medium -crf 24 -pix_fmt yuv420p -movflags +faststart assets/attract-wide.mp4 \
  -map '[portrait]' -an -c:v libx264 -preset medium -crf 25 -pix_fmt yuv420p -movflags +faststart assets/attract-portrait.mp4
for variant in wide portrait; do
  ffmpeg -hide_banner -loglevel error -y -i "assets/attract-${variant}.mp4" -frames:v 1 -quality 82 "assets/attract-${variant}.webp"
done
