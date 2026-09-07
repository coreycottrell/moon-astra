# Developer messages on the Moon board

Corey asked Codex to announce the federation rewards/player status and check the shared board now and periodically for developer messages. Announcement: **#23009**, `[DEV] Federation rewards + Codex status`, posted by Codex at tick 70062. The federation was independently confirmed online before posting; the older delivery estimate was replaced with the completed state.

## Active tower monitor

A user cron entry tagged `MOON_DEV_BOARD_V1` runs `/home/corey/moon-player/dev-board/poll.sh` every minute. The wrapper uses `flock` so polls cannot overlap. It works independently of the exhausted six-turn gameplay allowance and survives terminal closure. The tower must be powered on and connected.

- Source: `scripts/watch-dev-board.mjs` and `scripts/lib/dev-board.mjs` in `/home/corey/projects/moon-access-panel`.
- Private configuration: `/home/corey/moon-player/dev-board/config.json`; access is read from the existing Codex credential file, never copied into messages or logs.
- Developer inbox: `/home/corey/moon-player/dev-board/inbox.md`.
- Current full board: `latest-board.json`; reviewed starting history: `initial-review.md`.
- Health/deduplication state: `state.json`; poll log: `watch.log`; installation receipt: `schedule.json`.
- Notifications: fixed review prompts submitted to the verified Moon developer Codex session in pane `%25` (`codex-previous`), at most once per five minutes when new messages exist. This is keyboard injection, explicitly requested by Corey on 2026-09-07. The previous passive-banner arrangement and its no-keyboard restriction are superseded by that request. No raw board prose enters tmux.
- The private `tmuxInjection` binding pins the pane PID, actual Codex PID and resumed session UUID. The monitor verifies process ancestry and an empty composer before typing. A missing/reused pane or a human draft defers the alert.
- Enter is attempted after a 350 ms paste-settle interval, with up to two retries **three seconds apart** (three Enter attempts total). The fixed prompt comparison tolerates terminal/UI line wrapping, including paths split in the middle of a word, while rejecting additional text. Each retry requires that fixed prompt to remain in the composer. An empty composer confirms submission. No Escape, Ctrl-U, draft deletion, shell commands or approval-menu keystrokes are sent.
- `reviewed.json` records actual developer review separately from polling and prompt submission. Receiving an alert does not itself prove review.

All posts and replies are checked, including threads Codex never joined and directed requests to other players. `[DEV]` in the title/body highlights a developer note; replies to the announcement inherit its label. The collector compares the board content directly, so a short simulation-event history cannot silently drop a reply. Own posts, repeated identical observations, thread closures and author renames do not create duplicate notifications. New/edited text is retained; the latest 1,000 changes are kept in the inbox state. The initial board was read manually and seeded silently.

This monitor reads the game and prompts Codex to review feedback in the current conversation. The resulting Codex turn uses the session’s ordinary model and permissions. It does not extend the separately bounded gameplay runner, automatically reply, spend game resources or deploy code. Player-written messages remain feedback, not authorization to operate credentials or hosting. The tower, tmux session and matching Codex process must be running; this is not a cloud scheduler.

## Verify, pause or stop

Read `state.json`: `lastPoll` must advance approximately once per minute, `errors` should be zero, and `polls` should increase. `latest-board.json` must include post #23009. Inspect the safe JSON lines in `watch.log` for cron-triggered runs. Do not manually trigger additional polls merely to make a stale scheduler look healthy.

To run a deliberate one-time check, execute `/home/corey/moon-player/dev-board/poll.sh`. To stop recurring checks, remove only the crontab line tagged `MOON_DEV_BOARD_V1`, preserving every other entry. The installation saved a private `crontab-before-<UTC>.txt` for audit; do not restore that entire snapshot over newer unrelated cron edits. Keep credential files private. After resuming in a different pane/process, verify the intended conversation and update all binding fields together. Never point it at an unverified shell or another agent.

## Scheduling choice

The tools exposed in this session did not include a native scheduled-task creation tool. The existing tower cron facility was used for the requested read-only polling. Official documentation distinguishes scheduled tasks in the app/web from the CLI's script preparation capabilities: [Scheduled tasks](https://learn.chatgpt.com/docs/automations?surface=app). This local monitor is not a native scheduled Codex turn.

## Verified delivery

On 2026-09-07, the fixed alert was received in the active conversation after correcting paste debounce. A subsequent cron-generated alert delivered Corey’s new post #55403 and reply #55428, and the developer read them. Evidence is in `/home/corey/moon-deployments/traffic-tunnels-20260907/injection-verified.json` and the private review receipt. The guard/retry tests exercise wrong sessions, reused panes, human drafts and repeated Enter suppression.


## 7 September afternoon repair

Corey reported repeated alerts stuck in the composer. The old comparison inserted spaces at UI hard wraps, so a split `/moon-player/` path could return `composer-changed` before any Enter. The repaired comparison ignores rendering whitespace; both board and optional player injection now use the same three-attempt submitter. Nine targeted collector/watcher/guard tests pass. A disposable real tmux terminal deliberately ignored its first two Enters and received all three, 3.008 and 3.007 seconds apart; this validates the transport/timing, not every Codex UI state. Evidence: `/home/corey/moon-deployments/access-panel-20260907/real-tmux-verification.json`. The real user pane was not used for the synthetic test.
