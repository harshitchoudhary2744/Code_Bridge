from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from ..schemas import ModelMetadata, GenerationConfig, TranslateResponse, RepairResponse

class TranslationModelAdapter(ABC):
    """
    Abstract base adapter for neural code translation models.
    Standardizes loading, health inspection, inference, metadata reporting,
    and resource cleanup across sequence-to-sequence architectures.
    """

    def __init__(self, metadata: ModelMetadata):
        self.meta = metadata
        self.is_loaded = False
        self.device = "cpu"

    @abstractmethod
    def load(self, device: str = "cpu") -> bool:
        """Load weights, tokenizer, and place onto designated device."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Check operational readiness and memory footprint."""
        pass

    @abstractmethod
    def translate(
        self,
        source_code: str,
        source_language: str,
        target_language: str,
        generation_config: GenerationConfig,
    ) -> TranslateResponse:
        """Run genuine sequence-to-sequence translation inference."""
        pass

    @abstractmethod
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
        """Generate a repaired candidate guided by structured diagnostic feedback."""
        pass

    def metadata(self) -> ModelMetadata:
        """Return immutable model metadata snapshot."""
        return self.meta

    @abstractmethod
    def unload(self) -> None:
        """Free GPU/CPU memory and unload weights."""
        pass

