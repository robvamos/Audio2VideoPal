import { useEffect, useState } from "react";

interface SettingsPanelProps {
  onMessage: (value: string) => void;
  onSkinChange: (skin: AppSkin) => void;
  currentSkin: AppSkin;
}

export type AppSkin = "midnight" | "spectrum" | "graphite" | "aurora";

const skins: { id: AppSkin; name: string; description: string }[] = [
  { id: "midnight", name: "Midnight Studio", description: "Dark blue skin for long creative sessions." },
  { id: "spectrum", name: "Spectrum Neon", description: "High contrast neon look for live visuals." },
  { id: "graphite", name: "Graphite Pro", description: "Neutral professional interface." },
  { id: "aurora", name: "Aurora Soft", description: "Soft teal/purple theme for relaxed editing." },
];

export default function SettingsPanel({ onMessage, onSkinChange, currentSkin }: SettingsPanelProps) {
  const [selectedSkin, setSelectedSkin] = useState<AppSkin>(currentSkin);

  useEffect(() => {
    setSelectedSkin(currentSkin);
  }, [currentSkin]);

  function applySkin(skin: AppSkin) {
    setSelectedSkin(skin);
    onSkinChange(skin);
    localStorage.setItem("visualmusic.skin", skin);
    onMessage(`Skin applied: ${skins.find((item) => item.id === skin)?.name ?? skin}`);
  }

  return (
    <div className="settings-grid">
      <section className="settings-panel">
        <h2>Application Skin</h2>
        <p>Choose the UI color skin. This is independent from visualizer presets and export rendering.</p>
        <div className="skin-list">
          {skins.map((skin) => (
            <button
              key={skin.id}
              className={`skin-card skin-${skin.id} ${selectedSkin === skin.id ? "selected" : ""}`}
              onClick={() => applySkin(skin.id)}
            >
              <span className="skin-title">{skin.name}</span>
              <span className="skin-description">{skin.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-panel">
        <h2>Window Output Strategy</h2>
        <p>The graphics output window must remain separated from the audio listener and the disk video writer.</p>
        <ul className="settings-list">
          <li>Dedicated graphic output window</li>
          <li>Maximizable preview window</li>
          <li>Future detachable preview host</li>
          <li>Future fullscreen visual output for live performance</li>
        </ul>
      </section>
    </div>
  );
}
