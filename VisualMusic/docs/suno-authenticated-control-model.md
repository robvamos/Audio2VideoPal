# Suno Authenticated Control Model

## Purpose

Define how `Suno` is reachable and controllable from the authenticated browser bridge already active on this workspace.

This model is meant for repeatable use with the user's logged-in account, especially for:

- reading the personal library
- opening the profile catalog
- enumerating songs, playlists, and voices
- opening and controlling individual song pages

## Session Model

The working session is browser-authenticated and user-owned.

Observed authenticated identity:

- handle: `@robsica72`
- display name: `LesoDB`

This means the browser bridge should treat `Suno` as a live session target, not as a public unauthenticated site.

## Stable Routes

These routes were observed as stable and directly usable:

- home / discover: `https://suno.com/discover`
- create: `https://suno.com/create`
- studio: `https://suno.com/studio`
- library root: `https://suno.com/me`
- profile root: `https://suno.com/@robsica72`
- song page: `https://suno.com/song/{song_uuid}`
- playlist page: `https://suno.com/playlist/{playlist_uuid}`
- voice page: `https://suno.com/voice/{voice_uuid}`
- notifications: `https://suno.com/notifications`

## Primary Navigation

The left navigation exposes stable text or href anchors:

- `Home`
- `Explore`
- `Create`
- `Studio`
- `Library`
- `Hooks`
- `Notifications`

Useful stable links:

- library: `a[href="https://suno.com/me"]`
- profile: `a[href="https://suno.com/@robsica72"]`
- create: `a[href="https://suno.com/create"]`

Useful stable button labels:

- `Profile menu button`
- `Search`
- `More from Suno`
- `Collapse sidebar`

## Library Model

The personal library route is:

- `https://suno.com/me`

Observed library sections:

- `Songs`
- `Playlists`
- `Workspaces`
- `Studio Projects`
- `Voices`
- `Cover Art`
- `Hooks`
- `Liked Hooks`
- `History`

Observed library filters and controls:

- `Filters (2)`
- `Newest`
- `Liked`
- `Public`
- `Uploads`

This means the library is controllable by a mix of:

- route navigation for major sections
- button clicking for local filters and ordering

## Profile Model

The personal author page is:

- `https://suno.com/@robsica72`

Observed stable profile signals:

- display name: `LesoDB`
- handle: `@robsica72`
- counts: `38 songs`, `64 followers`, `132 following`

Observed profile subsections:

- `Songs`
- `Playlists`
- `Voices`
- `About`

Observed profile-level controls:

- `View all Songs`
- `View all Playlists`
- `View all Voices`
- `Edit`

## Song Catalog Model

Song entries are strongly routable through direct song URLs.

Observed examples from the profile:

- `Tanti saluti`
- `Ti amo, urlo`
- `Censura artificiale`
- `Protosclero`
- `Poesiat`
- `testami`
- `Trappola`

Observed song link pattern:

- `a[href*="/song/"]`

Observed playable song tiles:

- aria label pattern: `Play {song_title}`

Observed per-song action controls in grids:

- `More options`
- `Remix`

This means the recommended extraction pattern is:

1. enumerate `a[href*="/song/"]`
2. normalize to unique song URLs
3. use adjacent visible title text only as a label, not as the primary identifier

## Playlist And Voice Model

Observed playlist links:

- `Remixes`
- `Best liked`
- `AlbumOne`

Observed playlist route pattern:

- `a[href*="/playlist/"]`

Observed voice examples:

- `Chiara`
- `Noemi`
- `Sibilla`
- `Mary`

Observed voice route pattern:

- `a[href*="/voice/"]`

## Song Page Model

Observed single-song page:

- `https://suno.com/song/27e73a20-070c-43e3-bae0-db5c37557855`

Stable content zones observed on song pages:

- artist / owner link
- voice link
- style tags
- lyrics block
- play count
- reactions / comments area

Observed stable song-page controls:

- `Edit Song Details`
- `Download Cover Image`
- `Copy styles to clipboard`
- `Add a Caption`
- `Edit Displayed Lyrics`
- `More menu contents`

Observed playbar controls:

- `Playbar: Play button`
- `Playbar: Previous Song button`
- `Playbar: Next Song button`
- `Playbar: Toggle shuffle button`
- `Playbar: Toggle repeat button`
- `Playbar: Song Queue`
- `Playbar: Share`
- `Playbar: Comment`
- `Playbar: Toggle song details panel`

## Recommended Control Strategy

Preferred control order:

1. use direct route navigation for `Library`, `Profile`, `Song`, `Playlist`, `Voice`
2. use href-based selection for catalog traversal
3. use aria-label-based selection for active controls such as play, remix, share, edit
4. use visible title text only as a fallback or confirmation layer

Best stable selectors:

- `a[href="https://suno.com/me"]`
- `a[href="https://suno.com/@robsica72"]`
- `a[href*="/song/"]`
- `a[href*="/playlist/"]`
- `a[href*="/voice/"]`
- buttons by aria label for playbar and song actions

## Noise And Extraction Hazards

The page contains persistent noise that should be filtered out in automation:

- notification panel content in the sidebar
- cookie / OneTrust controls
- emoji picker controls after opening caption or reaction UI

This means extraction should ignore:

- buttons with OneTrust classes
- large emoji grids
- unrelated sidebar social activity when building a song list

## Practical Use Cases

The bridge can now support these tasks reliably:

- open the user's library
- enumerate owned songs
- open the user's profile catalog
- enumerate playlists and voices
- open a song page for inspection
- operate playbar controls
- copy style descriptors
- reach edit and share affordances

## Next Step

For durable reuse, the next layer should be a small extractor that returns structured JSON:

- current route type
- current owner
- visible songs
- visible playlists
- visible voices
- available controls

That extractor can then become the stable adapter between Codex and the authenticated `Suno` session.
