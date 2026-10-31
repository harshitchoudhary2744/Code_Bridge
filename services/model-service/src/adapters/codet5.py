import os
import time
import torch
from typing import Dict, Any, Optional
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from .base import TranslationModelAdapter
from ..schemas import ModelMetadata, GenerationConfig, TranslateResponse, RepairResponse

class CodeT5Adapter(TranslationModelAdapter):
    """
    Adapter for Salesforce CodeT5 / CodeT5+ sequence-to-sequence models.
    Supports Salesforce/codet5-small, Salesforce/codet5-base, and variants.
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
            is_local = os.path.exists(self.meta.checkpoint)
            rev = None if is_local or self.meta.revision in ["main", "finetuned-v1"] else self.meta.revision
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.meta.checkpoint,
                revision=rev
            )
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                self.meta.checkpoint,
                revision=rev
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

    def _format_input(self, source_code: str, source_language: str, target_language: str) -> str:
        # Standard CodeT5 task prefix
        src = source_language.capitalize()
        tgt = target_language.capitalize()
        return f"translate {src} to {tgt}: {source_code.strip()}"

    def _clean_code(self, text: str) -> str:
        text = text.strip()
        # Remove markdown fences
        if text.startswith("```"):
            lines = text.split("\n")
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        # Strip leading punctuation that un-finetuned seq2seq decoders emit
        while text and text[0] in [":", ";", ","]:
            text = text[1:].strip()
            
        # Balance curly braces if needed
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

        prompt = self._format_input(source_code, source_language, target_language)
        start_time = time.perf_counter()

        try:
            if generation_config.seed is not None:
                torch.manual_seed(generation_config.seed)

            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=generation_config.maxNewTokens,
                    num_beams=generation_config.numBeams,
                    temperature=generation_config.temperature if generation_config.doSample else None,
                    top_p=generation_config.topP if generation_config.doSample else None,
                    do_sample=generation_config.doSample,
                    early_stopping=True if generation_config.numBeams > 1 else False,
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
            f"Fix target {target_language.capitalize()} code for source {source_language.capitalize()}:",
            f"Source: {source_code.strip()}",
            f"Previous attempt: {previous_candidate.strip()}",
        ]
        if diagnostics:
            feedback_parts.append(f"Compiler/runtime error: {diagnostics.strip()[:300]}")
        if failing_input is not None:
            feedback_parts.append(f"Failing test: input={failing_input}, expected={expected_output}, got={actual_output}")
        feedback_parts.append("Corrected code:")

        feedback_prompt = "\n".join(feedback_parts)
        start_time = time.perf_counter()

        try:
            inputs = self.tokenizer(
                feedback_prompt,
                return_tensors="pt",
                truncation=True,
                max_length=512
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=generation_config.maxNewTokens,
                    num_beams=generation_config.numBeams,
                    temperature=generation_config.temperature if generation_config.doSample else None,
                    top_p=generation_config.topP if generation_config.doSample else None,
                    do_sample=generation_config.doSample,
                )

            duration_ms = (time.perf_counter() - start_time) * 1000.0
            repaired_text = self._clean_code(self.tokenizer.decode(outputs[0], skip_special_tokens=True))

            # If feedback prompt generated empty or punctuation, fallback to structured task prompt
            if not repaired_text:
                fallback_prompt = self._format_input(source_code, source_language, target_language)
                fb_inputs = self.tokenizer(fallback_prompt, return_tensors="pt", truncation=True, max_length=512).to(self.device)
                with torch.no_grad():
                    fb_outputs = self.model.generate(**fb_inputs, max_new_tokens=generation_config.maxNewTokens, num_beams=2)
                repaired_text = self._clean_code(self.tokenizer.decode(fb_outputs[0], skip_special_tokens=True))

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
