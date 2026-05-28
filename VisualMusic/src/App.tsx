import { useState } from "react";
import "./App.css";
import HomePanel from "./components/HomePanel";
import LearningLabPanel from "./components/LearningLabPanel";
import ListeningControlRoom from "./components/ListeningControlRoom";
import ListeningOverviewPanel from "./components/ListeningOverviewPanel";
import ListeningPipelinePanel from "./components/ListeningPipelinePanel";
import ListeningTelemetryPanel from "./components/ListeningTelemetryPanel";
import ListeningWiringPanel from "./components/ListeningWiringPanel";
import PluginManager from "./components/PluginManager";
import Mp3Player from "./components/Mp3Player";
import SkinSelector from "./components/SkinSelector";
import { useListeningStudio } from "./hooks/useListeningStudio";

function App() {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "player"
    | "system"
    | "plugins"
    | "control-room"
    | "pipeline"
    | "wiring"
    | "telemetry"
    | "learning"
  >("overview");
  const [message, setMessage] = useState("");
  const listeningStudio = useListeningStudio({ onMessage: setMessage });

  return (
    <main className="container">
      <header className="app-header">
        <div className="app-title-group">
          <p className="eyebrow">Audio2VideoPal</p>
          <h1>Visual Music Control Surface</h1>
        </div>
        <SkinSelector />
      </header>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === "player" ? "active" : ""}`}
          onClick={() => setActiveTab("player")}
        >
          Player
        </button>
        <button
          className={`tab-button ${activeTab === "system" ? "active" : ""}`}
          onClick={() => setActiveTab("system")}
        >
          System
        </button>
        <button
          className={`tab-button ${activeTab === "plugins" ? "active" : ""}`}
          onClick={() => setActiveTab("plugins")}
        >
          Plugins
        </button>
        <button
          className={`tab-button ${activeTab === "control-room" ? "active" : ""}`}
          onClick={() => setActiveTab("control-room")}
        >
          Control Room
        </button>
        <button
          className={`tab-button ${activeTab === "pipeline" ? "active" : ""}`}
          onClick={() => setActiveTab("pipeline")}
        >
          Pipeline
        </button>
        <button
          className={`tab-button ${activeTab === "wiring" ? "active" : ""}`}
          onClick={() => setActiveTab("wiring")}
        >
          Wiring
        </button>
        <button
          className={`tab-button ${activeTab === "telemetry" ? "active" : ""}`}
          onClick={() => setActiveTab("telemetry")}
        >
          Telemetry
        </button>
        <button
          className={`tab-button ${activeTab === "learning" ? "active" : ""}`}
          onClick={() => setActiveTab("learning")}
        >
          Learning Lab
        </button>
      </div>

      {activeTab === "overview" && (
        <ListeningOverviewPanel timingState={listeningStudio.timingState} telemetry={listeningStudio.telemetry} />
      )}
      {activeTab === "player" && <Mp3Player onMessage={setMessage} />}
      {activeTab === "system" && <HomePanel setMessage={setMessage} />}
      {activeTab === "plugins" && <PluginManager onMessage={setMessage} />}
      {activeTab === "control-room" && (
        <ListeningControlRoom
          audioActive={listeningStudio.audioActive}
          videoActive={listeningStudio.videoActive}
          isBusy={listeningStudio.isBusy}
          profile={listeningStudio.profile}
          source={listeningStudio.source}
          timingState={listeningStudio.timingState}
          telemetry={listeningStudio.telemetry}
          onProfileChange={listeningStudio.setProfile}
          onSourceChange={listeningStudio.setSource}
          onStartListening={listeningStudio.startListening}
          onStopListening={listeningStudio.stopListening}
          onRunListeningTest={listeningStudio.runListeningTest}
          onRefreshState={listeningStudio.refreshListeningState}
          onToggleVideo={listeningStudio.toggleVideo}
        />
      )}
      {activeTab === "pipeline" && (
        <ListeningPipelinePanel
          timingState={listeningStudio.timingState}
          telemetry={listeningStudio.telemetry}
        />
      )}
      {activeTab === "wiring" && <ListeningWiringPanel telemetry={listeningStudio.telemetry} />}
      {activeTab === "telemetry" && <ListeningTelemetryPanel telemetry={listeningStudio.telemetry} />}
      {activeTab === "learning" && (
        <LearningLabPanel
          telemetry={listeningStudio.telemetry}
          isBusy={listeningStudio.isBusy}
          onAdjustStructureLearning={listeningStudio.adjustStructureLearning}
          onRerunListeningTest={listeningStudio.runListeningTest}
          onSaveLearningEvaluation={listeningStudio.saveLearningEvaluation}
          onSaveFilterSetupEvaluation={listeningStudio.saveFilterSetupEvaluation}
        />
      )}

      {message && <p className="message">{message}</p>}
    </main>
  );
}

export default App;
