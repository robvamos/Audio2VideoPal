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
import TechnicalMapPanel from "./components/TechnicalMapPanel";
import { useListeningStudio } from "./hooks/useListeningStudio";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "player", label: "Player" },
  { id: "system", label: "System" },
  { id: "plugins", label: "Plugins" },
  { id: "control-room", label: "Control Room" },
  { id: "pipeline", label: "Pipeline" },
  { id: "wiring", label: "Wiring" },
  { id: "map-lab", label: "Puzzle Mappa" },
  { id: "telemetry", label: "Telemetry" },
  { id: "learning", label: "Learning Lab" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
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
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <ListeningOverviewPanel
          appState={listeningStudio.appState}
          timingState={listeningStudio.timingState}
          telemetry={listeningStudio.telemetry}
        />
      )}
      {activeTab === "player" && <Mp3Player onMessage={setMessage} />}
      {activeTab === "system" && <HomePanel setMessage={setMessage} />}
      {activeTab === "plugins" && <PluginManager onMessage={setMessage} />}
      {activeTab === "control-room" && (
        <ListeningControlRoom
          audioActive={listeningStudio.audioActive}
          appState={listeningStudio.appState}
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
      {activeTab === "map-lab" && <TechnicalMapPanel telemetry={listeningStudio.telemetry} />}
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
