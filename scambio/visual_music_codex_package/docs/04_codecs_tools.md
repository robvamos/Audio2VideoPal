# Codec, container e tool multimediali

## Backend raccomandato

### FFmpeg

Backend primario per:

- decoding audio;
- encoding video;
- muxing;
- conversioni;
- hardware encoder;
- batch/headless.

Usare anche `ffprobe` per metadati file.

### GStreamer

Alternativa modulare, utile per pipeline complesse o plugin-based.

### Windows Media Foundation

Backend nativo Windows per H.264/AAC/MP4 e accesso encoder di sistema.

### OBS/libobs

Non necessariamente da integrare, ma utile come riferimento per:

- compositor;
- scene graph;
- encoder hardware;
- recording pipeline;
- capture source.

## Codec video

| Codec | Encoder possibili | Container tipici | Uso |
|---|---|---|---|
| H.264/AVC | libx264, h264_nvenc, h264_qsv, h264_amf, Media Foundation | MP4, MKV | default compatibilità |
| H.265/HEVC | libx265, hevc_nvenc, hevc_qsv, hevc_amf | MP4, MKV | alta compressione |
| VP8 | libvpx | WebM | web open legacy |
| VP9 | libvpx-vp9 | WebM | web open qualità |
| AV1 | libaom-av1, SVT-AV1, rav1e, av1_nvenc, av1_qsv, av1_amf | WebM, MKV, MP4 | alta compressione moderna |
| Theora | libtheora | OGV/OGG | open legacy |
| ProRes | prores_ks, prores_aw | MOV, MKV | editing alta qualità |
| DNxHD/DNxHR | dnxhd | MOV, MXF, MKV | editing professionale |
| MPEG-4 Part 2 | mpeg4 | MP4/AVI | legacy |

## Codec audio

| Codec | Encoder | Container tipici | Uso |
|---|---|---|---|
| PCM | pcm_s16le, pcm_f32le | WAV, MOV, MKV | temporaneo/lossless |
| MP3 | libmp3lame | MP3, MP4, MKV | input comune |
| AAC | aac, Media Foundation AAC | MP4, MOV | default MP4 |
| Vorbis | libvorbis | OGG, WebM | open |
| Opus | libopus | WebM, OGG, MKV | moderno, efficiente |
| FLAC | flac | FLAC, MKV | lossless |
| ALAC | alac | MOV, MP4 | lossless Apple |

## Container

| Container | Combinazioni consigliate | Note |
|---|---|---|
| MP4 | H.264/AAC, HEVC/AAC | default compatibile |
| MKV | quasi tutto | robusto, buono per recording |
| WebM | VP9/AV1 + Opus/Vorbis | web open |
| MOV | ProRes/DNxHR/PCM | editing |
| OGV/OGG | Theora/Vorbis | legacy/open |

## Hardware encoding

Rilevare e usare se disponibile:

- NVIDIA NVENC: H.264, HEVC, AV1 su GPU compatibili;
- Intel Quick Sync/QSV: H.264, HEVC, AV1 su hardware compatibile;
- AMD AMF: H.264, HEVC, AV1 dove supportato.

## Rilevamento capacità

All'avvio o su richiesta:

- percorso `ffmpeg`;
- versione `ffmpeg`;
- percorso `ffprobe`;
- encoder disponibili;
- decoder disponibili;
- muxer/demuxer;
- hardware encoder;
- Media Foundation;
- GStreamer.

Salvare nel database.
