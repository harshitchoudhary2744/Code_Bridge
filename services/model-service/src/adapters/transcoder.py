from typing import Dict, Any, Optional
from .base import TranslationModelAdapter
from ..schemas import ModelMetadata, GenerationConfig, TranslateResponse, RepairResponse

class TransCoderAdapter(TranslationModelAdapter):
    """
    Adapter representing Meta's TransCoder (NeurIPS 2020).
    Audited and marked INCOMPATIBLE due to reliance on custom XLM PyTorch 1.x binaries
    and external C++ fastBPE compilation rather than native Hugging Face Seq2SeqLM.
    Honoring research requirements: never fakes output; reports actual status.
    """

    def __init__(self, metadata: ModelMetadata):
        super().__init__(metadata)
        self.meta.status = "INCOMPATIBLE"

    def load(self, device: str = "cpu") -> bool:
        self.is_loaded = False
        return False

    def health(self) -> Dict[str, Any]:
        return {
            "modelId": self.meta.id,
            "isLoaded": False,
            "device": self.device,
            "status": "INCOMPATIBLE",
            "incompatibilityReason": (
                "Meta TransCoder requires legacy PyTorch 1.x / apex and C++ fastBPE binaries. "
                "Standard Hugging Face Seq2SeqLM pipeline does not natively support XLM-Sym weights."
            )
        }

    def translate(
        self,
        source_code: str,
        source_language: str,
        target_language: str,
        generation_config: GenerationConfig,
    ) -> TranslateResponse:
        return TranslateResponse(
            modelId=self.meta.id,
            status="MODEL_UNAVAILABLE",
            candidateCode=None,
            generationTimeMs=0.0,
            generationConfig=generation_config.model_dump(),
            checkpointRevision=self.meta.revision,
            deviceUsed=self.device,
            error=(
                f"Model {self.meta.id} is INCOMPATIBLE. "
                "TransCoder checkpoints require legacy custom XLM PyTorch 1.x code and cannot be run "
                "directly in modern Hugging Face Transformers. See docs/model-feasibility.md for details."
            )
        )

    def repair(
        self,
        source_code: str,
        source_language: str,
        target_language: str,
        previous_candidate: str,
        diagnostics: Optional[str],
        failing_input: Optional[Any],
        expected_output: Optional[Any],
        actual_output: Optional[Any],
        generation_config: GenerationConfig,
    ) -> RepairResponse:
        return RepairResponse(
            modelId=self.meta.id,
            status="MODEL_UNAVAILABLE",
            candidateCode=None,
            generationTimeMs=0.0,
            feedbackPayloadUsed="",
            error=f"Model {self.meta.id} is INCOMPATIBLE and cannot perform repair."
        )

    def unload(self) -> None:
        pass
