import { useState } from "react";
import "./App.css";
import HomePanel from "./components/HomePanel";
import PluginManager from "./components/PluginManager";
import AudioVideoPipeline from "./components/AudioVideoPipeline";
import Mp3Player from "./components/Mp3Player";
import SkinSelector from "./components/SkinSelector";

function App() {
  const [activeTab, setActiveTab] = useState<"player" | "home" | "plugins" | "pipeline">("player");
  const [message, setMessage] = useState("");

  return (
    <main className="container">
      <header className="app-header">
        <h1>Visual Music App</h1>
        <SkinSelector />
      </header>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "player" ? "active" : ""}`}
          onClick={() => setActiveTab("player")}
        >
          Player
        </button>
        <button
          className={`tab-button ${activeTab === "home" ? "active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          Home
        </button>
        <button
          className={`tab-button ${activeTab === "plugins" ? "active" : ""}`}
          onClick={() => setActiveTab("plugins")}
        >
          Plugins
        </button>
        <button
          className={`tab-button ${activeTab === "pipeline" ? "active" : ""}`}
          onClick={() => setActiveTab("pipeline")}
        >
          Pipeline
        </button>
      </div>

      {activeTab === "player" && <Mp3Player onMessage={setMessage} />}
      {activeTab === "home" && <HomePanel setMessage={setMessage} />}
      {activeTab === "plugins" && <PluginManager onMessage={setMessage} />}
      {activeTab === "pipeline" && <AudioVideoPipeline onMessage={setMessage} />}

      {message && <p className="message">{message}</p>}
    </main>
  );
}

export default App;
