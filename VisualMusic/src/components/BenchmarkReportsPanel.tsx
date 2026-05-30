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

function formatShort(value: number) {
  return value.toFixed(2);
}

function formatRatio(value: number) {
  return `${Math.round(value * 100)}`;
}

function learningWindowValues(candidate: BenchmarkSweepCandidateSummary, song: BenchmarkSweepCandidateSummary["songs"][number]) {
  const short = Math.min(1, Math.max(0.14, (song.grid_score * 0.72) + (candidate.mean_grid_score * 0.28)));
  const medium = Math.min(1, Math.max(0.14, (song.bar_phase_score * 0.68) + (candidate.robustness_score * 0.32)));
  const long = Math.min(1, Math.max(0.14, (song.downbeat_score * 0.7) + (candidate.mean_downbeat_score * 0.3)));
  return { short, medium, long };
}

function renderCandidateChips(candidate: BenchmarkSweepCandidateSummary) {
  return (
    <div className="report-chip-row">
      <span
        className="report-chip"
        title={`Modo di fusione attivo: ${candidate.plugin_mode}. Indica come vengono combinati onset e low band.`}
      >
        {candidate.plugin_mode}
      </span>
      <span
        className="report-chip"
        title={`Pesi attivi dei due rami di ascolto. Onset ${formatShort(candidate.onset_weight)} e low band ${formatShort(candidate.low_band_weight)}.`}
      >
        {formatShort(candidate.onset_weight)} / {formatShort(candidate.low_band_weight)}
      </span>
      <span
        className="report-chip"
        title={`Profilo onset scelto: ${candidate.onset_profile}. Cambia come vengono letti gli attacchi.`}
      >
        {candidate.onset_profile}
      </span>
      <span
        className={`report-chip ${candidate.tonality_guard ? "is-positive" : "is-muted"}`}
        title={candidate.tonality_guard
          ? "Tonality guard attivo: usa i cambi armonici come conferma lenta della fase."
          : "Tonality guard disattivo: la lettura non usa una conferma armonica dedicata."}
      >
        {candidate.tonality_guard ? "guard on" : "guard off"}
      </span>
      <span
        className="report-chip"
        title={`Banda onset favorita: ${candidate.onset_band_label}. Qui cerchiamo gli attacchi più informativi.`}
      >
        {candidate.onset_band_label}
      </span>
      <span
        className="report-chip"
        title={`Banda low-band favorita: ${candidate.low_band_label}. Qui cerchiamo kick, pulse e ancora ritmica bassa.`}
      >
        {candidate.low_band_label}
      </span>
    </div>
  );
}

function renderGridSnapshot(candidate: BenchmarkSweepCandidateSummary, song: BenchmarkSweepCandidateSummary["songs"][number]) {
  const windows = learningWindowValues(candidate, song);
  const followerBeatOne = Math.min(1, Math.max(0.16, (song.downbeat_score * 0.8) + (song.bar_phase_score * 0.2)));
  const followerTail = Math.min(1, Math.max(0.14, song.bar_phase_score));
  const beats = [
    { label: "1", value: followerBeatOne, tone: "is-one" },
    { label: "2", value: Math.max(0.12, followerTail * 0.7), tone: "" },
    { label: "3", value: Math.max(0.12, followerTail * 0.82), tone: "" },
    { label: "4", value: Math.max(0.12, followerTail * 0.74), tone: "" },
  ];

  return (
    <div className="report-grid-compare" title="Confronto sintetico tra battuta attesa, fase ricostruita e finestre di learning.">
      <div className="report-grid-track">
        <span title="Battuta di riferimento: i quattro quarti attesi della grid.">Grid</span>
        <div className="report-grid-cells">
          {["1", "2", "3", "4"].map((label) => (
            <div className="report-grid-cell is-expected" key={`expected-${song.song_id}-${label}`} title={`Quarto atteso ${label} nella battuta di riferimento.`}>
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="report-grid-track">
        <span title="Ricostruzione dell'inseguitore: quanto ogni quarto viene sostenuto dalla fase trovata.">Track</span>
        <div className="report-grid-cells">
          {beats.map((beat) => (
            <div
              className={`report-grid-cell is-followed ${beat.tone}`.trim()}
              key={`followed-${song.song_id}-${beat.label}`}
              style={{ opacity: beat.value }}
              title={`Quarto ${beat.label}: confidenza visiva ${formatRatio(beat.value)} su 100.`}
            >
              {beat.label}
            </div>
          ))}
        </div>
      </div>
      <div className="report-grid-track">
        <span title="Finestre di memoria usate per stabilizzare il battito e l'1.">Learn</span>
        <div className="report-grid-cells is-learning">
          <div
            className="report-grid-cell is-learn"
            style={{ opacity: windows.short }}
            title={`Finestra breve. Si appoggia soprattutto a onset e colpi immediati. Intensità ${formatRatio(windows.short)} su 100.`}
          >
            S
          </div>
          <div
            className="report-grid-cell is-learn"
            style={{ opacity: windows.medium }}
            title={`Finestra media. Aiuta a tenere la fase della battuta stabile. Intensità ${formatRatio(windows.medium)} su 100.`}
          >
            M
          </div>
          <div
            className="report-grid-cell is-learn"
            style={{ opacity: windows.long }}
            title={`Finestra lunga. Aiuta a confermare l'1 e la frase su più battute. Intensità ${formatRatio(windows.long)} su 100.`}
          >
            L
          </div>
        </div>
      </div>
    </div>
  );
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
        <strong title={`Nome interno della configurazione: ${candidate.id}.`}>{candidate.id}</strong>
        <span title="Punteggio complessivo ottenuto da questa configurazione nella sweep attuale.">{formatPct(score)}</span>
      </div>
      <div className="report-score-bar" title="Barra di confronto del punteggio generale rispetto al migliore della sweep.">
        <div className="report-score-fill" style={{ width: candidateBarWidth(score, best) }} />
      </div>
      {renderCandidateChips(candidate)}
      <div className="report-metrics-inline">
        <span className="report-mini-metric" title="Quanto il setup resta forte su molti pezzi diversi, non solo sui casi facili.">
          Robust {formatPct(candidate.robustness_score)}
        </span>
        <span className="report-mini-metric" title="Prestazione minima tra le suite principali. Più è alta, più il setup è trasversale.">
          Floor {formatPct(candidate.suite_floor)}
        </span>
        <span className="report-mini-metric" title="Qualità media della grid ricostruita sulla battuta.">
          Grid {formatPct(candidate.mean_grid_score)}
        </span>
        <span className="report-mini-metric" title="Capacità media di prendere bene l'1 della battuta.">
          1 {formatPct(candidate.mean_downbeat_score)}
        </span>
        <span className="report-mini-metric" title="Distanza dal miglior setup della sweep. Più basso è meglio.">
          Gap {formatGap(candidate.distance_from_best)}
        </span>
        <span className="report-mini-metric" title="Quanto questa configurazione resta sopra il fondo classifica.">
          Lead {formatGap(candidate.distance_from_worst)}
        </span>
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
          <button
            className="action-button"
            onClick={() => void onRefresh()}
            title="Rilegge i report salvati e aggiorna la vista senza cambiare i dati delle sweep."
          >
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
            <article
              className="studio-panel report-summary-card"
              title="Configurazione consigliata in questo momento, scelta dal report più recente."
            >
              <span>Champion</span>
              <strong>{latest.recommended_candidate_id}</strong>
              <p>{latest.analysis_version}</p>
            </article>
            <article
              className="studio-panel report-summary-card"
              title="Punteggio più alto trovato nell'ultima sweep."
            >
              <span>Best</span>
              <strong>{formatPct(latestBest)}</strong>
              <p>{latest.candidate_count} config testate</p>
            </article>
            <article
              className="studio-panel report-summary-card"
              title="Punteggio peggiore nell'ultima sweep. Serve per capire il fondo classifica."
            >
              <span>Worst</span>
              <strong>{formatPct(latestWorst)}</strong>
              <p>distanza utile per capire lo spread</p>
            </article>
            <article
              className="studio-panel report-summary-card"
              title="Differenza tra migliore e peggiore. Più è ampia, più la scelta del setup conta."
            >
              <span>Spread</span>
              <strong>{formatGap(latestSpread)}</strong>
              <p>quanto il migliore stacca il fondo</p>
            </article>
          </div>

          <div className="report-grid">
            <div className="studio-panel">
              <h3>Top Config</h3>
              <p className="panel-note" title="Vista sintetica dei setup più promettenti della sweep.">
                I setup migliori, con parametri compatti e distanza dal top.
              </p>
              <div className="report-candidate-list">
                {latest.top_candidates.map((candidate, index) => renderCandidateRow(candidate, index, latestBest, "best"))}
              </div>
            </div>

            <div className="studio-panel">
              <h3>Bottom Config</h3>
              <p className="panel-note" title="Vista sintetica dei setup deboli, utile per capire cosa evitare.">
                Chi resta indietro e quanto viene superato.
              </p>
              <div className="report-candidate-list">
                {latest.bottom_candidates.map((candidate, index) => renderCandidateRow(candidate, index, latestBest, "worst"))}
              </div>
            </div>
          </div>

          <div className="report-grid">
            <div className="studio-panel">
              <h3 title="Confronto rapido tra grid attesa, fase ricostruita e memoria temporale del setup migliore.">
                Phase / Grid Snapshot
              </h3>
              <p className="panel-note" title="Ogni card mostra il pezzo, la qualità dell'1 e una mini-grid visiva.">
                Grid breve, fase ricostruita e pannelli temporali di learning.
              </p>
              <div className="report-song-grid">
                {(latest.top_candidates[0]?.songs ?? []).map((song) => {
                  const champion = latest.top_candidates[0];
                  return (
                    <article className="report-song-card report-song-card-compact" key={song.song_id} title={`Snapshot del pezzo ${song.song_id}.`}>
                      <div className="report-song-header">
                        <strong title={`Identificatore del brano o test: ${song.song_id}.`}>{song.song_id}</strong>
                        <span className="report-suite-badge" title={`Suite di appartenenza: ${song.suite}.`}>
                          {song.suite}
                        </span>
                      </div>
                      <div className="report-song-metrics">
                        <span className="report-mini-metric" title="Punteggio generale del pezzo con il setup campione.">
                          score {formatPct(song.overall_score)}
                        </span>
                        <span className="report-mini-metric" title="Quanto bene viene riconosciuto l'1 della battuta.">
                          1 {formatPct(song.downbeat_score)}
                        </span>
                        <span className="report-mini-metric" title="Quanto è stabile la posizione 1-2-3-4 dentro la battuta.">
                          phase {formatPct(song.bar_phase_score)}
                        </span>
                        <span className="report-mini-metric" title="Qualità media della grid ricostruita.">
                          grid {formatPct(song.grid_score)}
                        </span>
                        <span className="report-mini-metric" title="Errore medio assoluto sul BPM.">
                          bpm {song.mean_bpm_abs_error.toFixed(3)}
                        </span>
                      </div>
                      {renderGridSnapshot(champion, song)}
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="studio-panel">
              <h3 title="Storico delle sweep salvate, utile per vedere se il champion cambia nel tempo.">Report History</h3>
              <div className="report-history-list">
                {reports.map((report) => (
                  <article className="report-history-card" key={report.report_id} title={`Report ${report.report_id} generato il ${report.generated_at}.`}>
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
