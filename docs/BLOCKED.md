# Blocked / Escalations

The loop appends here when it must stop for a human (3-strikes rule, an unresolved product
decision, or a change that would require a large refactor). One entry per blocker; a human
clears it by resolving and deleting the entry (or converting it to an ADR / TASKS item).

Format:
```
## <date> — <task id> — <one-line title>
- What was attempted (and the 3 failing approaches, if 3-strikes)
- The exact failing verify output / error
- Why it can't be resolved autonomously (decision needed / refactor scope / missing input)
- Proposed options for the human
```

---

_No active blockers._
