use crate::core::event::PipelineEvent;
use crate::core::runtime_state::PipelineContext;

/// Planned module contract for the next wiring slices.
/// The current runtime still uses a simpler pipeline config path,
/// so this trait is intentionally kept as a forward-looking interface.
#[allow(dead_code)]
pub trait PipelineModule {
    fn name(&self) -> &'static str;
    fn enabled(&self) -> bool;
    fn input_types(&self) -> Vec<&'static str>;
    fn output_types(&self) -> Vec<&'static str>;
    fn process(
        &mut self,
        event: &PipelineEvent,
        context: &mut PipelineContext,
    ) -> Vec<PipelineEvent>;
    fn telemetry(&self) -> serde_json::Value;
}
