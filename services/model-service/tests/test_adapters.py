import pytest
from src.schemas import ModelMetadata, GenerationConfig
from src.registry import ModelRegistry
from src.adapters.codet5 import CodeT5Adapter
from src.adapters.plbart import PLBartAdapter
from src.adapters.transcoder import TransCoderAdapter

def test_registry_initialization():
    registry = ModelRegistry()
    models = registry.list_models()
    assert len(models) >= 3

    model_ids = [m.id for m in models]
    assert "salesforce-codet5-small" in model_ids
    assert "uclanlp-plbart-base" in model_ids
    assert "facebook-transcoder" in model_ids

def test_transcoder_incompatible_handling():
    meta = ModelMetadata(
        id="facebook-transcoder",
        displayName="TransCoder",
        publisher="Meta",
        family="TransCoder",
        architecture="encoder-decoder",
        checkpoint="facebookresearch/TransCoder",
        revision="NeurIPS-2020",
        tokenizer="Custom",
        license="CC-BY-NC-4.0",
        supportedTasks=["code-to-code"],
        supportedLanguages=["python", "java"],
        status="INCOMPATIBLE"
    )
    adapter = TransCoderAdapter(meta)
    assert not adapter.load()
    resp = adapter.translate("def foo(): pass", "python", "java", GenerationConfig())
    assert resp.status == "MODEL_UNAVAILABLE"
    assert "INCOMPATIBLE" in resp.error

def test_codet5_formatting():
    meta = ModelMetadata(
        id="salesforce-codet5-small",
        displayName="CodeT5 Small",
        publisher="Salesforce",
        family="CodeT5",
        architecture="encoder-decoder",
        checkpoint="Salesforce/codet5-small",
        revision="b1ee9570c289f21b5922b9c768a1ce12957bf968",
        tokenizer="Salesforce/codet5-small",
        license="BSD-3-Clause",
        supportedTasks=["code-to-code"],
        supportedLanguages=["python", "java"],
        status="AVAILABLE"
    )
    adapter = CodeT5Adapter(meta)
    formatted = adapter._format_input("def add(a, b): return a + b", "python", "java")
    assert formatted == "translate Python to Java: def add(a, b): return a + b"
