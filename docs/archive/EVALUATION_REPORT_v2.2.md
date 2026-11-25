# Evaluation report — v2.2

The v2.2 increment adds a repeatable evaluation command and persisted Markdown/JSON result artifacts. The harness calls the same deterministic agent engine used by the local prototype and checks the four registered synthetic scenarios against their declared expected postures. It also verifies that the prototype never grants authorization or takes an external action in those cases.

Run `npm run evaluate` to regenerate the report. The report is generated from the current code at runtime; do not treat a prior report as proof that a later code revision has been tested.
