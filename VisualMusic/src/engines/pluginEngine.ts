import {
  deepScanPlugin,
  getPluginDeepScan,
  loadPlugins,
  scanPlugins,
  scanPluginsInDirectory,
} from "../services/tauriApi";

export const pluginEngine = {
  scanPlugins,
  scanPluginsInDirectory,
  loadPlugins,
  deepScanPlugin,
  getPluginDeepScan,
};
