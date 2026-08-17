# Registro de modelos

Cada modelo promovido deve possuir um manifesto JSON com:

```text
model_id
version
kind
base_model
ollama_tag
modelfile_hash
weights_location
license
dataset_version
features
validation_period
metrics
limitations
previous_model
promotion_reason
created_at
```

Pesos e dados pessoais não entram no Git. O manifesto e a receita entram para
permitir reconstrução e auditoria.
