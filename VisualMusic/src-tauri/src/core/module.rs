use crate::core::event::PipelineEvent;
use crate::core::runtime_state::PipelineContext;

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
