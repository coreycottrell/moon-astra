# Moon Mind engine v1
A standalone Node 24 learning library and CLI. Built-in SQLite; no package installation required.

Run:
    node tests/mind-engine.test.js
    node scripts/mind-engine.mjs demo --db ./private/gym.sqlite --out ./private/demo.json
    node scripts/mind-engine.mjs list --db ./private/gym.sqlite

The demo compares a lift, crew and road, stores actual simulator outcomes, then consults retained memory for its next decision. Repeat requests do not become extra independent evidence. The default demo uses no model or game connection. Daily analysis allowances still apply.

For a current Moon Guide context saved privately:
    node scripts/mind-engine.mjs analyze --db ./private/advice.sqlite --context ./private/context.json --skill traffic --provider minimax --credentials ./private/minimax.env

The credential file can contain MOON_MINIMAX_API_KEY. MiniMax-M3 is enforced; stale model settings cannot select M2.7. Keep the file private (0600), outside source control. Omit --provider minimax for deterministic advice. The CLI does not obtain live game state itself.

Source:
- lib/mind-engine/engine.mjs: persistent jobs, quotas, reservations, audit, evaluation and memory.
- lib/mind-engine/protocol.mjs: exact typed fact verification and capability gates.
- lib/mind-engine/gym.mjs: shared synthetic transport simulator.
- lib/mind-engine/moon-adapter.mjs: read-only traffic/resource advice.
- lib/mind-engine/minimax.mjs: bounded M3 provider adapter.

The host must authenticate owners and supply authoritative research and current spare mind. Library IDs are not authentication. Use one private SQLite database per intended shared scheduler, and back it up using SQLite-aware procedures. No HTTP server, live action executor, game research migration or arbitrary-code plugin loading is included.

Read system-report.md for the design, boundaries and integration sequence. Public explainer: https://ai-civ.com/moon-mind-learning-engine/

