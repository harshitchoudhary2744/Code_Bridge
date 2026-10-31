import time
import torch
from typing import Dict, Any, Optional
from transformers import PLBartTokenizer, PLBartForConditionalGeneration
from .base import TranslationModelAdapter
from ..schemas import ModelMetadata, GenerationConfig, TranslateResponse, RepairResponse

class PLBartAdapter(TranslationModelAdapter):
    """
    Adapter for UCLA/Columbia PLBART sequence-to-sequence models.
    Supports uclanlp/plbart-base, uclanlp/plbart-large, and multilingual language routing.
    """

    def __init__(self, metadata: ModelMetadata):
        super().__init__(metadata)
        self.tokenizer = None
        self.model = None

    def load(self, device: str = "cpu") -> bool:
        if self.is_loaded:
            return True
        self.device = device
        try:
            self.tokenizer = PLBartTokenizer.from_pretrained(
                self.meta.checkpoint,
                revision=self.meta.revision if self.meta.revision != "main" else None
            )
            self.model = PLBartForConditionalGeneration.from_pretrained(
                self.meta.checkpoint,
                revision=self.meta.revision if self.meta.revision != "main" else None
            )
            self.model.to(self.device)
            self.model.eval()
            self.is_loaded = True
            return True
        except Exception as e:
            self.is_loaded = False
            self.meta.status = "INCOMPATIBLE"
            self.meta.limitations.append(f"Load error: {str(e)}")
            return False

    def health(self) -> Dict[str, Any]:
        return {
            "modelId": self.meta.id,
            "isLoaded": self.is_loaded,
            "device": self.device,
            "status": self.meta.status,
            "parameterCount": self.meta.parameterCount,
        }

    def _lang_tag(self, lang: str) -> str:
        lang_lower = lang.lower()
        if lang_lower == "python":
            return "__python__"
        elif lang_lower == "java":
            return "__java__"
        return f"__{lang_lower}__"

    def _clean_code(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        while text and text[0] in [":", ";", ","]:
            text = text[1:].strip()
        open_braces = text.count("{")
        close_braces = text.count("}")
        if open_braces > close_braces:
            text += "\n" + ("}" * (open_braces - close_braces))
        return text

    def translate(
        self,
        source_code: str,
        source_language: str,
        target_language: str,
        generation_config: GenerationConfig,
    ) -> TranslateResponse:
        if not self.is_loaded:
            if not self.load(self.device):
                return TranslateResponse(
                    modelId=self.meta.id,
                    status="MODEL_UNAVAILABLE",
                    candidateCode=None,
                    generationTimeMs=0.0,
                    generationConfig=generation_config.model_dump(),
                    checkpointRevision=self.meta.revision,
                    deviceUsed=self.device,
                    error=f"Model {self.meta.id} is not loaded or could not be loaded."
                )

        src_tag = self._lang_tag(source_language)
        tgt_tag = self._lang_tag(target_language)
        start_time = time.perf_counter()

        try:
            if generation_config.seed is not None:
                torch.manual_seed(generation_config.seed)

            # Set tokenizer language codes
            self.tokenizer.src_lang = src_tag
            self.tokenizer.tgt_lang = tgt_tag
            decoder_start_token_id = self.tokenizer.lang_code_to_id.get(tgt_tag, self.model.config.decoder_start_token_id)

            inputs = self.tokenizer(
                source_code.strip(),
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    decoder_start_token_id=decoder_start_token_id,
                    max_new_tokens=generation_config.maxNewTokens,
                    num_beams=generation_config.numBeams,
                    temperature=generation_config.temperature if generation_config.doSample else None,
                    top_p=generation_config.topP if generation_config.doSample else None,
                    do_sample=generation_config.doSample,
                )

            duration_ms = (time.perf_counter() - start_time) * 1000.0
            generated_text = self._clean_code(self.tokenizer.decode(outputs[0], skip_special_tokens=True))

            if not generated_text:
                return TranslateResponse(
                    modelId=self.meta.id,
                    status="GENERATION_FAILED",
                    candidateCode="",
                    generationTimeMs=round(duration_ms, 2),
                    generationConfig=generation_config.model_dump(),
                    checkpointRevision=self.meta.revision,
                    deviceUsed=self.device,
                    error="Model generated empty or punctuation-only tokens"
                )

            return TranslateResponse(
                modelId=self.meta.id,
                status="GENERATED",
                candidateCode=generated_text,
                generationTimeMs=round(duration_ms, 2),
                generationConfig=generation_config.model_dump(),
                checkpointRevision=self.meta.revision,
                deviceUsed=self.device,
                error=None
            )

        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return TranslateResponse(
                modelId=self.meta.id,
                status="GENERATION_FAILED",
                candidateCode=None,
                generationTimeMs=round(duration_ms, 2),
                generationConfig=generation_config.model_dump(),
                checkpointRevision=self.meta.revision,
                deviceUsed=self.device,
                error=str(e)
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
        if not self.is_loaded:
            self.load(self.device)

        feedback_parts = [
            f"# Target {target_language} repair for source {source_language}:",
            f"# Previous: {previous_candidate.strip()}",
        ]
        if diagnostics:
            feedback_parts.append(f"# Error: {diagnostics.strip()[:300]}")
        if failing_input is not None:
            feedback_parts.append(f"# Failed input: {failing_input}")
        feedback_parts.append(source_code.strip())

        feedback_prompt = "\n".join(feedback_parts)
        start_time = time.perf_counter()

        try:
            src_tag = self._lang_tag(source_language)
            tgt_tag = self._lang_tag(target_language)
            self.tokenizer.src_lang = src_tag
            self.tokenizer.tgt_lang = tgt_tag
            decoder_start_token_id = self.tokenizer.lang_code_to_id.get(tgt_tag, self.model.config.decoder_start_token_id)

            inputs = self.tokenizer(
                feedback_prompt,
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    decoder_start_token_id=decoder_start_token_id,
                    max_new_tokens=generation_config.maxNewTokens,
                    num_beams=generation_config.numBeams,
                    temperature=generation_config.temperature if generation_config.doSample else None,
                    top_p=generation_config.topP if generation_config.doSample else None,
                    do_sample=generation_config.doSample,
                )

            duration_ms = (time.perf_counter() - start_time) * 1000.0
            repaired_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True).strip()

            return RepairResponse(
                modelId=self.meta.id,
                status="REPAIRED",
                candidateCode=repaired_text,
                generationTimeMs=round(duration_ms, 2),
                feedbackPayloadUsed=feedback_prompt,
                error=None
            )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return RepairResponse(
                modelId=self.meta.id,
                status="REPAIR_FAILED",
                candidateCode=None,
                generationTimeMs=round(duration_ms, 2),
                feedbackPayloadUsed=feedback_prompt,
                error=str(e)
            )

    def unload(self) -> None:
        self.model = None
        self.tokenizer = None
        self.is_loaded = False
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
