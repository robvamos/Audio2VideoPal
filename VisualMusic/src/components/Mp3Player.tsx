import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { PlaylistTrack } from "../types";

interface Mp3PlayerProps {
  onMessage: (value: string) => void;
}

function isMp3File(file: File) {
  return file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3");
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getTrackId(file: File) {
  const path = file.webkitRelativePath || file.name;
  return `${path}-${file.size}-${file.lastModified}`;
}

function createTrack(file: File): PlaylistTrack {
  const path = file.webkitRelativePath || file.name;
  return {
    id: getTrackId(file),
    name: file.name.replace(/\.mp3$/i, ""),
    path,
    file,
    url: URL.createObjectURL(file),
  };
}

export default function Mp3Player({ onMessage }: Mp3PlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const playlistRef = useRef<PlaylistTrack[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentTrack = playlist[currentIndex] || null;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const playlistLabel = useMemo(() => {
    if (playlist.length === 0) {
      return "No tracks loaded";
    }

    return `${playlist.length} track${playlist.length === 1 ? "" : "s"}`;
  }, [playlist.length]);

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter(isMp3File);

    if (files.length === 0) {
      onMessage("No MP3 files found.");
      return;
    }

    setPlaylist((currentPlaylist) => {
      const existingIds = new Set(currentPlaylist.map((track) => track.id));
      const newTracks = files
        .filter((file) => !existingIds.has(getTrackId(file)))
        .map(createTrack);

      if (newTracks.length === 0) {
        onMessage("Selected MP3 files are already in the playlist.");
        return currentPlaylist;
      }

      onMessage(`Added ${newTracks.length} MP3 file${newTracks.length === 1 ? "" : "s"} to the playlist.`);
      return [...currentPlaylist, ...newTracks];
    });
  }

  function playTrack(index: number) {
    if (index < 0 || index >= playlist.length) {
      return;
    }

    setCurrentIndex(index);
    setIsPlaying(true);
  }

  function togglePlayPause() {
    if (!currentTrack) {
      onMessage("Load MP3 files before starting playback.");
      return;
    }

    setIsPlaying((value) => !value);
  }

  function stopPlayback() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTime(0);
    setIsPlaying(false);
  }

  function playNext() {
    if (playlist.length === 0) {
      return;
    }

    setCurrentIndex((index) => (index + 1) % playlist.length);
    setIsPlaying(true);
  }

  function playPrevious() {
    if (playlist.length === 0) {
      return;
    }

    setCurrentIndex((index) => (index - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  }

  function clearPlaylist() {
    playlist.forEach((track) => URL.revokeObjectURL(track.url));
    setPlaylist([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onMessage("Playlist cleared.");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    const folderInput = folderInputRef.current;
    if (folderInput) {
      folderInput.setAttribute("webkitdirectory", "");
      folderInput.setAttribute("directory", "");
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) {
      return;
    }

    audio.src = currentTrack.url;
    audio.load();
    setCurrentTime(0);

    if (isPlaying) {
      void audio.play().catch((error) => {
        setIsPlaying(false);
        onMessage(`Playback error: ${error}`);
      });
    }
  }, [currentTrack?.id, onMessage]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) {
      return;
    }

    if (isPlaying) {
      void audio.play().catch((error) => {
        setIsPlaying(false);
        onMessage(`Playback error: ${error}`);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack, onMessage]);

  useEffect(() => {
    return () => {
      playlistRef.current.forEach((track) => URL.revokeObjectURL(track.url));
    };
  }, []);

  return (
    <div className="player-shell">
      <audio
        ref={audioRef}
        onEnded={playNext}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />

      <section className="player-main">
        <div className="player-now">
          <div>
            <h2>MP3 Player</h2>
            <p>{currentTrack ? currentTrack.name : "Ready"}</p>
          </div>
          <span className="track-count">{playlistLabel}</span>
        </div>

        <div className="progress-wrap" aria-label="Playback progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="player-controls">
          <button type="button" onClick={playPrevious} disabled={playlist.length === 0} title="Previous">
            Prev
          </button>
          <button type="button" onClick={togglePlayPause} disabled={playlist.length === 0} title="Play or pause">
            {isPlaying ? "Pause" : "Start"}
          </button>
          <button type="button" onClick={stopPlayback} disabled={!currentTrack} title="Stop">
            Stop
          </button>
          <button type="button" onClick={playNext} disabled={playlist.length === 0} title="Next">
            Next
          </button>
        </div>

        <div
          className={`drop-zone ${isDragging ? "dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <strong>Drop MP3 files here</strong>
          <span>or add files and folders from disk</span>
        </div>

        <div className="player-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Add MP3 Files
          </button>
          <button type="button" onClick={() => folderInputRef.current?.click()}>
            Choose Folder
          </button>
          <button type="button" onClick={clearPlaylist} disabled={playlist.length === 0}>
            Clear
          </button>
        </div>

        <input
          ref={fileInputRef}
          className="hidden-input"
          type="file"
          accept=".mp3,audio/mpeg"
          multiple
          onChange={(event) => {
            if (event.target.files) {
              addFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
        <input
          ref={folderInputRef}
          className="hidden-input"
          type="file"
          accept=".mp3,audio/mpeg"
          multiple
          onChange={(event) => {
            if (event.target.files) {
              addFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
      </section>

      <section className="playlist-panel">
        <div className="playlist-header">
          <h2>Playlist</h2>
          <span>{playlistLabel}</span>
        </div>
        <div className="playlist-list">
          {playlist.length === 0 ? (
            <p>No MP3 files loaded.</p>
          ) : (
            playlist.map((track, index) => (
              <button
                key={track.id}
                type="button"
                className={`playlist-item ${index === currentIndex ? "active" : ""}`}
                onClick={() => playTrack(index)}
              >
                <span>{track.name}</span>
                <small>{track.path}</small>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
