import type { BenchmarkSweepCandidateSummary, BenchmarkSweepReportSummary } from "../types";

interface BenchmarkReportsPanelProps {
  reports: BenchmarkSweepReportSummary[];
  onRefresh: () => Promise<void>;
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatGap(value: number) {
  return `${(value * 100).toFixed(1)} pt`;
}

function candidateBarWidth(value: number, max: number) {
  if (max <= 0) {
    return "0%";
  }
  return `${Math.max(6, (value / max) * 100)}%`;
}

function renderCandidateRow(
  candidate: BenchmarkSweepCandidateSummary,
  index: number,
  best: number,
  label: "best" | "worst",
) {
  const score = candidate.overall_score;
  return (
    <article className={`report-candidate-card ${label === "best" ? "is-best" : "is-worst"}`} key={`${label}-${candidate.id}-${index}`}>
      <div className="report-candidate-header">
        <strong>{candidate.id}</strong>
        <span>{formatPct(score)}</span>
      </div>
      <div className="report-score-bar">
        <div className="report-score-fill" style={{ width: candidateBarWidth(score, best) }} />
      </div>
      <p>
        {candidate.plugin_mode} · {candidate.onset_weight.toFixed(2)} / {candidate.low_band_weight.toFixed(2)} · {candidate.onset_profile}
      </p>
      <p>
        {candidate.onset_band_label} · {candidate.low_band_label}
      </p>
      <div className="report-metrics-inline">
        <span>Robust {formatPct(candidate.robustness_score)}</span>
        <span>Suite floor {formatPct(candidate.suite_floor)}</span>
        <span>Grid {formatPct(candidate.mean_grid_score)}</span>
        <span>Downbeat {formatPct(candidate.mean_downbeat_score)}</span>
        <span>Gap top {formatGap(candidate.distance_from_best)}</span>
        <span>Lead bottom {formatGap(candidate.distance_from_worst)}</span>
      </div>
    </article>
  );
}

export default function BenchmarkReportsPanel({ reports, onRefresh }: BenchmarkReportsPanelProps) {
  const latest = reports[0] ?? null;
  const latestBest = latest?.best_overall_score ?? 0;
  const latestWorst = latest?.worst_overall_score ?? 0;
  const latestSpread = latest?.spread_score ?? 0;

  return (
    <section className="report-panel-shell">
      <div className="studio-hero compact">
        <div>
          <p className="eyebrow">Benchmark Reports</p>
          <h2>Consultazione grafica delle sweep: chi va meglio, chi va peggio, e quanto distano.</h2>
        </div>
        <div className="report-actions">
          <button className="action-button" onClick={() => void onRefresh()}>
            Refresh
          </button>
        </div>
      </div>

      {!latest ? (
        <div className="studio-panel">
          <h3>No reports yet</h3>
          <p>Nessuna sweep trovata. Esegui prima i benchmark per riempire questa vista.</p>
        </div>
      ) : (
        <>
          <div className="report-summary-grid">
            <article className="studio-panel report-summary-card">
              <span>Champion</span>
              <strong>{latest.recommended_candidate_id}</strong>
              <p>{latest.analysis_version}</p>
            </article>
            <article className="studio-panel report-summary-card">
              <span>Best</span>
              <strong>{formatPct(latestBest)}</strong>
              <p>{latest.candidate_count} config testate</p>
            </article>
            <article className="studio-panel report-summary-card">
              <span>Worst</span>
              <strong>{formatPct(latestWorst)}</strong>
              <p>distanza utile per capire lo spread</p>
            </article>
            <article className="studio-panel report-summary-card">
              <span>Spread</span>
              <strong>{formatGap(latestSpread)}</strong>
              <p>quanto il migliore stacca il fondo</p>
            </article>
          </div>

          <div className="report-grid">
            <div className="studio-panel">
              <h3>Top Config</h3>
              <p className="panel-note">Qui vedi i candidati migliori, con punteggio, bande e distanza dal primo.</p>
              <div className="report-candidate-list">
                {latest.top_candidates.map((candidate, index) => renderCandidateRow(candidate, index, latestBest, "best"))}
              </div>
            </div>

            <div className="studio-panel">
              <h3>Bottom Config</h3>
              <p className="panel-note">Qui vedi chi resta indietro e quanto il migliore lo supera.</p>
              <div className="report-candidate-list">
                {latest.bottom_candidates.map((candidate, index) => renderCandidateRow(candidate, index, latestBest, "worst"))}
              </div>
            </div>
          </div>

          <div className="report-grid">
            <div className="studio-panel">
              <h3>Phase / Grid Snapshot</h3>
              <div className="report-song-grid">
                {(latest.top_candidates[0]?.songs ?? []).map((song) => (
                  <article className="report-song-card" key={song.song_id}>
                    <strong>{song.song_id}</strong>
                    <span>Suite {song.suite}</span>
                    <span>Overall {formatPct(song.overall_score)}</span>
                    <span>Downbeat {formatPct(song.downbeat_score)}</span>
                    <span>Bar phase {formatPct(song.bar_phase_score)}</span>
                    <span>Grid {formatPct(song.grid_score)}</span>
                    <span>BPM err {song.mean_bpm_abs_error.toFixed(3)}</span>
                    <div className="report-phase-ladder" aria-hidden="true">
                      <div className="report-phase-pill is-one" style={{ opacity: Math.max(0.2, song.downbeat_score) }}>1</div>
                      <div className="report-phase-pill" style={{ opacity: Math.max(0.2, 1 - song.bar_phase_score * 0.45) }}>2</div>
                      <div className="report-phase-pill" style={{ opacity: Math.max(0.2, 1 - song.bar_phase_score * 0.65) }}>3</div>
                      <div className="report-phase-pill" style={{ opacity: Math.max(0.2, 1 - song.bar_phase_score * 0.55) }}>4</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="studio-panel">
              <h3>Report History</h3>
              <div className="report-history-list">
                {reports.map((report) => (
                  <article className="report-history-card" key={report.report_id}>
                    <strong>{report.recommended_candidate_id}</strong>
                    <span>{report.generated_at}</span>
                    <span>Best {formatPct(report.best_overall_score)}</span>
                    <span>Spread {formatGap(report.spread_score)}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
