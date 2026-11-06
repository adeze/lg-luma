# HDMI live preview investigation

2026-11-05. Requested: reuse LG Home Dashboard's live HDMI preview in native Luma,
and determine whether the same pipeline helps QSync streaming/inference.

## Verified on the inspected TV firmware

- Home Dashboard is the web app `com.webos.app.homeconnect`, not native LG Home.
- Its manifest declares a transparent, trusted web app.
- Its JavaScript builds `ext://hdmi:<port>` with MIME type
  `service/webos-external`; tuner input uses `tv://` and
  `service/webos-broadcast`. A video media-overlay component autoplays it.
- The app observes `pipelinestarted`, reads the video element's `mediaId`, and
  subscribes to external-input signal and Dolby-conflict status for that pipeline.
- It observes `com.webos.service.videooutput/getStatus` and video-mute status.
  These observations establish display/pipeline state, not a readable frame API.
- Local copies of `libumedia_api_c.so.1.0.0` export create, destroy, load, unload,
  play and pause entry points. This is symbol evidence only; function signatures,
  callback ownership, window positioning and firmware compatibility remain unqualified.
- `libextinput-service.so.1.0.0` contains HDMI-controller audio-decoding and
  video-sink operations. This supports an internal audio/video pipeline, not an
  exported PCM/AAC/H.264 stream. No native operation was invoked.

Private source copies and SHA receipts remain outside this repository under
`~/.local/share/lg-hue-sync/research/home-dashboard-2026-11-05/`.

## Consequences for Luma and QSync

Luma is native Rust/SDL/OpenGL ES, so the web app's `<video>` component cannot be
inserted directly. The preferred prototype is native media-pipeline integration
with a positioned video plane and a transparent preview region. First qualify
the installed native client ABI, media-resource ownership, input restoration,
audio routing, hide/unload cleanup and coexistence with QSync. Existing alpha
support in Luma's GL setup does not establish working video-plane composition.

Displaying HDMI locally does not establish CPU/GPU-readable pixels. Encoding
for remote HLS is another operation; the Home Dashboard source inspected here
does not expose an HLS URL. Inference should consume shared captured pixels
before encoding when possible, rather than decode a delayed viewing stream.

No Luma runtime code, TV settings, media routing or live lighting settings were
changed for this investigation. No integration or physical audio/video result is
claimed yet.

## Primary references

- [webOS Homebrew: input embedding](https://www.webosbrew.org/develop/guides/web-app/#inputtv-embedding)
  documents the same external-input source type and warns that concurrent input
  display may be limited to one source.
- [webOS OSE media API](https://www.webosose.org/docs/reference/ls2-api/com-webos-media/)
  describes media resource/pipeline management; OSE documentation is not proof
  of signatures or supported behaviour on this retail TV.
- [webOS OSE video output](https://www.webosose.org/docs/reference/ls2-api/com-webos-service-videooutput/)
  describes source-to-video-plane routing and positioning, not encoded export.
