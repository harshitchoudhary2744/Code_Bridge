import os
import yaml
import asyncio
from typing import Dict, List, Optional
from .schemas import ModelMetadata
from .adapters.base import TranslationModelAdapter
from .adapters.codet5 import CodeT5Adapter
from .adapters.plbart import PLBartAdapter
from .adapters.transcoder import TransCoderAdapter

class ModelRegistry:
    """
    Central Model Registry managing model adapters, lifecycle,
    and readiness state.
    """

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or os.getenv("MODELS_CONFIG_PATH", "./configs/models.yaml")
        self.adapters: Dict[str, TranslationModelAdapter] = {}
        self.metadata_store: Dict[str, ModelMetadata] = {}
        self.concurrency_semaphore = asyncio.Semaphore(int(os.getenv("MAX_CONCURRENT_INFERENCES", "2")))
        self._initialize_from_config()

    def _initialize_from_config(self) -> None:
        if not os.path.exists(self.config_path):
            # Fallback path if running from services/model-service directory
            alt_path = os.path.join("..", "..", self.config_path)
            if os.path.exists(alt_path):
                self.config_path = alt_path

        if os.path.exists(self.config_path):
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                for item in data.get("models", []):
                    meta = ModelMetadata(**item)
                    self.metadata_store[meta.id] = meta
                    self._register_adapter(meta)
        else:
            # Default fallback definitions
            self._register_default_models()

    def _register_default_models(self) -> None:
        defaults = [
            ModelMetadata(
                id="salesforce-codet5-finetuned",
                displayName="CodeT5 Small (Fine-Tuned Seq2Seq)",
                publisher="Salesforce Research / TransCode Lab",
                family="CodeT5",
                architecture="encoder-decoder",
                checkpoint="./checkpoints/codet5-small-finetuned",
                revision="finetuned-v1",
                tokenizer="./checkpoints/codet5-small-finetuned",
                license="BSD-3-Clause",
                supportedTasks=["code-to-code"],
                supportedLanguages=["python", "java"],
                parameterCount=60492288,
                status="AVAILABLE",
                fineTuningStatus="TASK_FINETUNED",
                limitations=[]
            ),
            ModelMetadata(
                id="salesforce-codet5-small",
                displayName="CodeT5 Small (60M)",
                publisher="Salesforce Research",
                family="CodeT5",
                architecture="encoder-decoder",
                checkpoint="Salesforce/codet5-small",
                revision="b1ee9570c289f21b5922b9c768a1ce12957bf968",
                tokenizer="Salesforce/codet5-small",
                license="BSD-3-Clause",
                supportedTasks=["code-to-code"],
                supportedLanguages=["python", "java"],
                parameterCount=60492288,
                status="AVAILABLE",
                fineTuningStatus="PRETRAINED_ONLY",
                limitations=["Pretrained-only baseline requires translation fine-tuning for valid multi-line target code"]
            ),
            ModelMetadata(
                id="salesforce-codet5-base",
                displayName="CodeT5 Base (220M)",
                publisher="Salesforce Research",
                family="CodeT5",
                architecture="encoder-decoder",
                checkpoint="Salesforce/codet5-base",
                revision="02cd2d31bb7c6d0e4d91156167b2de044989c733",
                tokenizer="Salesforce/codet5-base",
                license="BSD-3-Clause",
                supportedTasks=["code-to-code"],
                supportedLanguages=["python", "java"],
                parameterCount=222882048,
                status="AVAILABLE",
                fineTuningStatus="PRETRAINED_ONLY",
                limitations=["Higher memory footprint on CPU"]
            ),
            ModelMetadata(
                id="uclanlp-plbart-base",
                displayName="PLBART Base (140M)",
                publisher="UCLA / Columbia NLP",
                family="PLBART",
                architecture="encoder-decoder",
                checkpoint="uclanlp/plbart-base",
                revision="main",
                tokenizer="uclanlp/plbart-base",
                license="MIT",
                supportedTasks=["code-to-code"],
                supportedLanguages=["python", "java"],
                parameterCount=139220736,
                status="AVAILABLE",
                fineTuningStatus="PRETRAINED_ONLY",
                limitations=["Pretrained denoising autoencoder copies/reconstructs code unless fine-tuned on parallel data"]
            ),
            ModelMetadata(
                id="facebook-transcoder",
                displayName="TransCoder (Unsupervised Seq2Seq)",
                publisher="Meta / Facebook AI Research",
                family="TransCoder",
                architecture="encoder-decoder",
                checkpoint="facebookresearch/TransCoder",
                revision="NeurIPS-2020",
                tokenizer="Custom XLM FastBPE",
                license="CC-BY-NC-4.0",
                supportedTasks=["code-to-code"],
                supportedLanguages=["python", "java"],
                status="INCOMPATIBLE",
                limitations=["Incompatible with modern Hugging Face Seq2SeqLM pipeline"]
            )
        ]
        for meta in defaults:
            self.metadata_store[meta.id] = meta
            self._register_adapter(meta)

    def _register_adapter(self, meta: ModelMetadata) -> None:
        if meta.checkpoint.startswith("."):
            if not os.path.exists(meta.checkpoint):
                alt_checkpoint = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../", meta.checkpoint))
                if os.path.exists(alt_checkpoint):
                    meta.checkpoint = alt_checkpoint
            else:
                meta.checkpoint = os.path.abspath(meta.checkpoint)

        if meta.family == "CodeT5" or meta.family == "CodeT5+":
            self.adapters[meta.id] = CodeT5Adapter(meta)
        elif meta.family == "PLBART":
            self.adapters[meta.id] = PLBartAdapter(meta)
        elif meta.family == "TransCoder":
            self.adapters[meta.id] = TransCoderAdapter(meta)
        else:
            self.adapters[meta.id] = CodeT5Adapter(meta)

    def get_model(self, model_id: str) -> Optional[TranslationModelAdapter]:
        return self.adapters.get(model_id)

    def get_metadata(self, model_id: str) -> Optional[ModelMetadata]:
        return self.metadata_store.get(model_id)

    def list_models(self) -> List[ModelMetadata]:
        return list(self.metadata_store.values())

    def preload_available(self, device: str = "cpu") -> None:
        """Preload models marked AVAILABLE."""
        for model_id, adapter in self.adapters.items():
            if adapter.metadata().status == "AVAILABLE":
                adapter.load(device)

