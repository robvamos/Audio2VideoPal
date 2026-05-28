use crate::core::runtime_state::{ListeningRunResult, ListeningTelemetry};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};

fn telemetry_dir(base_dir: &Path) -> PathBuf {
    base_dir.join("runtime").join("telemetry")
}

pub fn write_telemetry(
    base_dir: &Path,
    run_result: &ListeningRunResult,
) -> Result<ListeningTelemetry, String> {
    let dir = telemetry_dir(base_dir);
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;

    let run_id = &run_result.telemetry.run_id;
    let json_path = dir.join(format!("{run_id}.telemetry.json"));
    let summary_path = dir.join(format!("{run_id}.summary.md"));

    let json_payload = json!({
        "run_id": run_result.telemetry.run_id,
        "profile": run_result.telemetry.profile,
        "source": run_result.telemetry.source,
        "status": run_result.telemetry.status,
        "fused_bpm": run_result.telemetry.fused_bpm,
        "bpm_confidence": run_result.telemetry.bpm_confidence,
        "sync_state": run_result.telemetry.sync_state,
        "downbeat_confidence": run_result.telemetry.downbeat_confidence,
        "one_bar_grid_score": run_result.telemetry.one_bar_grid_score,
        "timing_state": run_result.timing_state,
        "one_bar_grid": run_result.one_bar_grid,
        "wiring": run_result.telemetry.wiring,
        "recommendations": run_result.telemetry.recommendations,
    });

    fs::write(
        &json_path,
        serde_json::to_string_pretty(&json_payload).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;

    let summary = format!(
        "# Listening telemetry - {run_id}\n\n\
Profile: `{}`\n\
Source: `{}`\n\
Status: `{}`\n\n\
## Timing\n\
- Fused BPM: `{:.1}`\n\
- BPM confidence: `{:.2}`\n\
- Sync state: `{}`\n\
- Downbeat confidence: `{:.2}`\n\
- Current beat: `{}`\n\
- One-bar grid score: `{:.2}`\n\n\
## Wiring\n\
- Active modules: {}\n\
- Disabled modules: {}\n\n\
## Recommendations\n\
{}\n",
        run_result.telemetry.profile,
        run_result.telemetry.source,
        run_result.telemetry.status,
        run_result.telemetry.fused_bpm,
        run_result.telemetry.bpm_confidence,
        run_result.telemetry.sync_state,
        run_result.telemetry.downbeat_confidence,
        run_result.one_bar_grid.current_beat,
        run_result.telemetry.one_bar_grid_score,
        run_result.telemetry.wiring.active_modules.join(", "),
        run_result.telemetry.wiring.disabled_modules.join(", "),
        run_result
            .telemetry
            .recommendations
            .iter()
            .map(|item| format!("- {item}"))
            .collect::<Vec<_>>()
            .join("\n")
    );
    fs::write(&summary_path, summary).map_err(|error| error.to_string())?;

    let mut telemetry = run_result.telemetry.clone();
    telemetry.telemetry_json_path = json_path.to_string_lossy().to_string();
    telemetry.telemetry_summary_path = summary_path.to_string_lossy().to_string();
    Ok(telemetry)
}
