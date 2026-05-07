import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface Plugin {
  id: number;
  file_name: string;
  file_path: string;
  architecture: string;
  file_size_bytes: number;
  sha256: string;
  deep_scan_status: string;
  deep_scan_completed_at: string | null;
}

function App() {
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [scanDetails, setScanDetails] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (activeTab === "plugins") {
      loadPlugins();
    }
  }, [activeTab]);

  async function initDb() {
    try {
      const result = await invoke("init_db");
      setMessage(result as string);
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  }

  async function detectFfmpeg() {
    try {
      const result = await invoke("detect_ffmpeg");
      setMessage(result as string);
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  }

  async function batchRenderTest() {
    try {
      const result = await invoke("batch_render_test");
      setMessage(result as string);
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  }

  async function loadPlugins() {
    try {
      const result = await invoke("get_plugins_list");
      const pluginList = JSON.parse(result as string);
      setPlugins(pluginList);
    } catch (error) {
      setMessage(`Error loading plugins: ${error}`);
    }
  }

  async function deepScanPlugin(plugin: Plugin) {
    try {
      setIsScanning(true);
      setMessage(`Scanning ${plugin.file_name}...`);
      const result = await invoke("deep_scan_plugin", { filePath: plugin.file_path });
      setMessage(result as string);
      
      // Get detailed scan results
      const details = await invoke("get_plugin_deep_scan", { fileId: plugin.id });
      setScanDetails(details);
      setIsScanning(false);
    } catch (error) {
      setMessage(`Error: ${error}`);
      setIsScanning(false);
    }
  }

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
      </div>

      {activeTab === "home" && (
        <div className="tab-content">
          <div className="row">
            <button onClick={initDb}>Initialize Database</button>
            <button onClick={detectFfmpeg}>Detect FFmpeg</button>
            <button onClick={batchRenderTest}>Batch Render Test</button>
            <button onClick={scanPlugins}>Scan Plugins</button>
          </div>
          <p>{message}</p>
        </div>
      )}

      {activeTab === "plugins" && (
        <div className="tab-content">
          <div className="plugins-container">
            <div className="plugins-list">
              <h2>Discovered Plugins</h2>
              <button onClick={() => {
                scanPlugins().then(() => loadPlugins());
              }}>Refresh Plugin List</button>
              <div className="plugin-items">
                {plugins.length === 0 ? (
                  <p>No plugins found. Click "Refresh Plugin List" to scan.</p>
                ) : (
                  plugins.map((plugin) => (
                    <div
                      key={plugin.id}
                      className={`plugin-item ${selectedPlugin?.id === plugin.id ? "selected" : ""}`}
                      onClick={() => setSelectedPlugin(plugin)}
                    >
                      <div className="plugin-name">{plugin.file_name}</div>
                      <div className="plugin-meta">
                        <span>{plugin.architecture}</span>
                        <span className={`status ${plugin.deep_scan_status}`}>
                          {plugin.deep_scan_status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="plugin-details">
              <h2>Plugin Details</h2>
              {selectedPlugin ? (
                <div className="details-panel">
                  <div className="detail-section">
                    <h3>{selectedPlugin.file_name}</h3>
                    <dl>
                      <dt>Path:</dt>
                      <dd>{selectedPlugin.file_path}</dd>
                      <dt>Architecture:</dt>
                      <dd>{selectedPlugin.architecture}</dd>
                      <dt>Size:</dt>
                      <dd>{(selectedPlugin.file_size_bytes / 1024).toFixed(2)} KB</dd>
                      <dt>SHA256:</dt>
                      <dd className="hash">{selectedPlugin.sha256.substring(0, 16)}...</dd>
                      <dt>Scan Status:</dt>
                      <dd className={`status ${selectedPlugin.deep_scan_status}`}>
                        {selectedPlugin.deep_scan_status}
                      </dd>
                    </dl>
                  </div>

                  {selectedPlugin.deep_scan_status !== "completed" && (
                    <button
                      onClick={() => deepScanPlugin(selectedPlugin)}
                      disabled={isScanning}
                      className="scan-button"
                    >
                      {isScanning ? "Scanning..." : "Deep Scan"}
                    </button>
                  )}

                  {scanDetails && selectedPlugin.deep_scan_status === "completed" && (
                    <div className="scan-results">
                      <h3>Deep Scan Results</h3>
                      <div className="result-section">
                        <h4>PE File Information</h4>
                        <dl>
                          <dt>Machine Type:</dt>
                          <dd>{JSON.parse(scanDetails).machine_type}</dd>
                          <dt>Bitness:</dt>
                          <dd>{JSON.parse(scanDetails).bitness}</dd>
                          <dt>Is DLL:</dt>
                          <dd>{JSON.parse(scanDetails).is_dll ? "Yes" : "No"}</dd>
                          <dt>Scan Time:</dt>
                          <dd>{JSON.parse(scanDetails).timestamp}</dd>
                        </dl>
                      </div>
                      <div className="result-section">
                        <h4>Full Analysis</h4>
                        <pre className="json-output">
                          {JSON.stringify(JSON.parse(scanDetails).raw_scan, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p>Select a plugin to view details</p>
              )}
            </div>
          </div>
          {message && <p className="message">{message}</p>}
        </div>
      )}
    </main>
  );
}

export default App;
