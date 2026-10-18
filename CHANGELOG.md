# Changelog

## 1.2.9
- fix: require a directory boundary in the matchesGlob /** branch. Before this, client/** also matched sibling paths such as clientele/secret.ts and backend-old/x.ts, so out-of-scope files could pass scope validation. findInScope had the same defect in the opposite direction. The defect was present from v1.0.54 but could only affect completions where scope validation actually ran (see 1.2.7).
- test: unit tests for matchesGlob, findViolations, resolveScope, findInScope and the preflight assess decision paths.
- chore: test script, prepublishOnly gate, CI on push to main and on pull requests.

## 1.2.8
- fix: bind the completion target to the caller worktree identity.

## 1.2.7
- fix: scope validation was skipped silently. Commit 5a768b9 (first shipped in v1.0.61) removed the scope.json writer during a refactor, and completion treated a missing scope.json as nothing to validate. Worktrees launched from v1.0.61 through v1.2.6 had no scope.json, and backend INIT worktrees never had one. Completion now fails closed and regenerates a missing scope.json from the tracking state.
- fix: restored the scope.json writer on the main launch path and added one for backend INIT.
- fix: the updater never downgrades project workflow scripts (an inequality check treated any version mismatch as behind).
- fix: sync no longer marks a zero-commit ACTIVE session as merged; it now requires worktree presence and TASK.md confirmation.
- docs: Shared Orchestration is labelled experimental; the --force hint, re-init commit handling and wipe warning text were made accurate.
