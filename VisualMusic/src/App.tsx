import { useState } from "react";
import "./App.css";
import HomePanel from "./components/HomePanel";
import PluginManager from "./components/PluginManager";
import AudioVideoPipeline from "./components/AudioVideoPipeline";

function App() {
  const [activeTab, setActiveTab] = useState<"home" | "plugins" | "pipeline">("home");
  const [message, setMessage] = useState("");

  return (
    <main className="container">
      <h1>Visual Music App</h1>

      <div className="tabs">
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

      {activeTab === "home" && <HomePanel setMessage={setMessage} />}
      {activeTab === "plugins" && <PluginManager onMessage={setMessage} />}
      {activeTab === "pipeline" && <AudioVideoPipeline onMessage={setMessage} />}

      {message && <p className="message">{message}</p>}
    </main>
  );
}

export default App;
