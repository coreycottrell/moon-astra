# Learning engine experiment

Project directory: `/home/corey/projects/moon-learning-engine`.
Branch: `research/learning-engine`, based on completed depot operator commit `fd1b370`.

Canonical proposal: [learning-engine.md](/home/corey/projects/moon-civilization/ideas/learning-engine.md).

This is an isolated read-only prototype: a domain-neutral observation and skill contract, two Moon adapters, strict result validation, episode accounting and compatible-memory recall. It is not imported by the game or server. It does not implement research, continuous telemetry, planning simulation, command execution or model training.

`core.mjs` owns the shared contract; `moon.mjs` supplies traffic/resource candidates; `minimax.mjs` performs one provider call; `benchmark.mjs` runs six explicitly marked live/counterfactual cases. `capture.mjs` performs one authenticated GET and stores observations in a private evidence directory. Neither provider requests nor captured observations contain authentication values; the private key is used only as an HTTPS Authorization header to the fixed provider endpoint.

Offline checks:

```bash
node experiments/learning-engine/core.test.mjs
```

Seven checks passed. The test uses a warehouse domain to exercise the generic contract, plus malformed output, stale evidence, unavailable choices and outcome-memory behavior. These checks do not prove that free-form explanatory prose is true.

Actual trial on September 7: six MiniMax-M2.7 responses, six expected candidate selections, **four strict contract passes**. Manual review identified invented/unsupported statements, including absent rock freight inferred from omitted details and an invented refinery metal catalyst. Read the proposal's trial section before using the results. The prototype intentionally retains the tested prompt/data contract so the initial failure cases remain reproducible.

Private evidence: `/home/corey/moon-deployments/learning-engine-20260907/benchmark.json` and individual request/result files. Two snapshots: ticks 135300 and 135903. Usage 18,784 input / 6,273 output tokens; latency 15.2–24.4 seconds per call. No raw observations or answers are committed. No game action, deployment or GPU workload was performed.

To deliberately repeat the paid trial, capture two observations at different world ticks into a new private directory, then run the benchmark once:

```bash
node experiments/learning-engine/capture.mjs /home/corey/moon-deployments/learning-engine-NEW-RUN
# Capture again later, after the server has advanced.
node experiments/learning-engine/capture.mjs /home/corey/moon-deployments/learning-engine-NEW-RUN
node experiments/learning-engine/benchmark.mjs /home/corey/moon-deployments/learning-engine-NEW-RUN
```

This is a manually launched harness, not a scheduler. It makes at most six provider attempts per invocation with 90-second timeouts, 3072 completion-token caps and no retries. Re-running spends more API usage. Expected live-case choices assume the captured colony still has the observed crew ceiling and local feedstock shortages; changing real state can legitimately change the expected diagnosis. Counterfactuals are synthetic, not evidence that those events happened to Corey.

Next required work: typed semantic assertions, explicit missing-data coverage, complete per-item freight/recipe facts, durable server outcomes, and separate evaluation before any execution path. A returned candidate is a proposal; it is never a command.
