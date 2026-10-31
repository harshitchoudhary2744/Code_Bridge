import pytest
from src.schemas import GenerationConfig
from src.registry import ModelRegistry

@pytest.mark.integration
def test_real_codet5_inference():
    registry = ModelRegistry()
    adapter = registry.get_model("salesforce-codet5-small")
    assert adapter is not None
    assert adapter.load()

    resp = adapter.translate(
        source_code="def add(a: int, b: int) -> int:\n    return a + b",
        source_language="python",
        target_language="java",
        generation_config=GenerationConfig(maxNewTokens=32, numBeams=1)
    )

    assert resp.status == "GENERATED"
    assert resp.candidateCode is not None
    assert resp.generationTimeMs > 0
    assert resp.deviceUsed == "cpu"
    print(f"\n[Test] CodeT5 Small output: '{resp.candidateCode}' (latency: {resp.generationTimeMs}ms)")

@pytest.mark.integration
def test_real_plbart_inference():
    registry = ModelRegistry()
    adapter = registry.get_model("uclanlp-plbart-base")
    assert adapter is not None
    assert adapter.load()

    resp = adapter.translate(
        source_code="def add(a, b):\n    return a + b",
        source_language="python",
        target_language="java",
        generation_config=GenerationConfig(maxNewTokens=32, numBeams=1)
    )

    assert resp.status == "GENERATED"
    assert resp.candidateCode is not None
    assert resp.generationTimeMs > 0
    print(f"\n[Test] PLBART Base output: '{resp.candidateCode}' (latency: {resp.generationTimeMs}ms)")

