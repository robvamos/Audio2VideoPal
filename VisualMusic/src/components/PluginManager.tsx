import { useEffect, useState } from "react";
import type { Plugin, ScanDetails } from "../types";
import {
  deepScanPlugin,
  getPluginDeepScan,
  loadPlugins,
  scanPlugins,
} from "../services/tauriApi";

interface PluginManagerProps {
  onMessage: (value: string) => void;
}

export default function PluginManager({ onMessage }: PluginManagerProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [scanDetails, setScanDetails] = useState<ScanDetails | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  async function refreshPlugins() {
    try {
      const pluginList = await loadPlugins();
      setPlugins(pluginList);
      if (selectedPlugin) {
        const reselected = pluginList.find((item) => item.id === selectedPlugin.id);
        setSelectedPlugin(reselected || null);
      }
    } catch (error) {
      onMessage(`Error loading plugins: ${error}`);
    }
  }

  async function handleScanPlugins() {
    try {
      setIsScanning(true);
      onMessage("Scanning plugins in the local plugins folder...");
      const result = await scanPlugins();
      onMessage(result);
      await refreshPlugins();
    } catch (error) {
      onMessage(`Error scanning plugins: ${error}`);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleDeepScan(plugin: Plugin) {
    try {
      setIsScanning(true);
      onMessage(`Scanning ${plugin.file_name}...`);
      const result = await deepScanPlugin(plugin.file_path);
      onMessage(result);
      const details = await getPluginDeepScan(plugin.id);
      setScanDetails(details);
      await refreshPlugins();
    } catch (error) {
      onMessage(`Error: ${error}`);
    } finally {
      setIsScanning(false);
    }
  }

  useEffect(() => {
    refreshPlugins();
  }, []);

  return (
    <div className="tab-content">
      <div className="plugins-container">
        <div className="plugins-list">
          <div className="plugin-list-header">
            <h2>Discovered Plugins</h2>
            <button onClick={handleScanPlugins} disabled={isScanning}>
              Refresh Plugin List
            </button>
          </div>

          <div className="plugin-items">
            {plugins.length === 0 ? (
              <p>No plugins found. Click "Refresh Plugin List" to scan.</p>
            ) : (
              plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className={`plugin-item ${selectedPlugin?.id === plugin.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedPlugin(plugin);
                    setScanDetails(null);
                  }}
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
                  onClick={() => handleDeepScan(selectedPlugin)}
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
                      <dd>{scanDetails.machine_type}</dd>
                      <dt>Bitness:</dt>
                      <dd>{scanDetails.bitness}</dd>
                      <dt>Is DLL:</dt>
                      <dd>{scanDetails.is_dll ? "Yes" : "No"}</dd>
                      <dt>Scan Time:</dt>
                      <dd>{scanDetails.timestamp}</dd>
                    </dl>
                  </div>
                  <div className="result-section">
                    <h4>Full Analysis</h4>
                    <pre className="json-output">{JSON.stringify(scanDetails.raw_scan, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Select a plugin to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
