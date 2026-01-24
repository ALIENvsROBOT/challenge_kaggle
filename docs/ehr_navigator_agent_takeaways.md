# Key Takeaways from Google Health EHR Navigator Agent

This document summarizes the architectural patterns and best practices observed in the [Google Health MedGemma EHR Navigator Agent](https://github.com/google-health/medgemma/blob/main/notebooks/ehr_navigator_agent.ipynb). These insights are directly applicable to building the **MedGemma FHIR-Bridge**.

## 1. The "Discover-Plan-Act" Agentic Flow

Instead of a single "magical" prompt, the notebook employs a structured **LangGraph** workflow that breaks the problem into discrete, deterministic steps. This is critical for medical reliability.

### The 4-Step Pattern:

1.  **Discover (Manifest Tool)**: Before trying to answer, the agent runs a global query (`get_patient_data_manifest`) to understand _what data exists_.
    - _relevance_: For our project, we should "scan" the input doc first to classify document types before attempting detailed extraction.
2.  **Identify**: The LLM analyzes the manifest + user question to decide _which_ specific resources (e.g., `Condition`, `MedicationRequest`) are relevant.
3.  **Plan (Data Selection)**: The LLM formulates specific API calls (with SNOMED/LOINC codes if available) to retrieve _only_ the necessary data.
4.  **Execute & Summarize**: The agent fetches data and uses a **"Fact Filter"** loop to summarize findings incrementally.

## 2. Managing Context Window via "Fact Filtering"

One of the biggest challenges in FHIR is the verbosity of the JSON. The notebook solves this using an iterative **Fact Filter Agent**.

- **The Problem:** Dumping a full FHIR Bundle into the context window distracts the model.
- **The Solution:**
  - Run a separate LLM call for _each_ tool output.
  - **Prompt**: _"You are a fact summarizing agent... Collect facts ONLY if relevant... Filter out any facts which are not helpful."_
  - Only the _summaries_ are passed to the final answer generation step.

## 3. FHIR-Specific Prompt Engineering

The notebook demonstrates effective prompting strategies for MedGemma 1.5/27B:

### Role-Based Prompting

Assign specific roles for specific sub-tasks to narrow the search space.

- **For Planning:** `"You are a specialized API request generator. Your SOLE task is to output a JSON of a tool call..."`
- **For Summarization:** `"You are a fact summarizing agent... You are not authorized to answer the user question. Do not provide any output beyond concise facts."`

### JSON Cleaning

Before sending FHIR data to the LLM, the notebook uses a helper function to strip noise:

```python
def clean(obj):
    # Remove .resource.meta (timestamps/versions) which consume tokens but add little semantic value
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items() if k != "meta"}
    return obj
```

## 4. Relevance to Our "Self-Healing" Architecture

Our **MedGemma FHIR-Bridge** can adapt these patterns for the **Validation Loop**:

| Navigator Agent (Read) | FHIR-Bridge (Write)                                                                                                                                             |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manifest Tool**      | **Document Classifier**: Scan the image/PDF to identify sections (Vitals, Assessment, Plan).                                                                    |
| **Fact Filter Agent**  | **Section Validator**: Isolate a specific extracted segment (e.g., Medications) and validate it against the FHIR schema _before_ merging into the final Bundle. |
| **Final Answer**       | **Final Bundle Assembly**: Aggregate validated resources into a transaction bundle.                                                                             |

## 5. Implementation Snippets to Borrow

### The "Thinking" Cleaner

MedGemma often outputs "chain-of-thought" tokens (`<unused94>...<unused95>`). The notebook includes a regex to clean this before parsing:

```python
def exclude_thinking_component(text: str) -> str:
    return re.sub(r"<unused94>.*?<unused95>", "", text, flags=re.DOTALL).strip()
```

### JSON Decoration Stripper

Robustly handles Markdown code blocks in responses:

````python
def strip_json_decoration(text: str) -> str:
    cleaned = text.strip()
    return (
        cleaned[7:-3].strip() if cleaned.startswith('```json') else
        cleaned[3:-3].strip() if cleaned.startswith('```') else
        cleaned
    )
````
