## What does this do?

<!---
_Describe what your changes **do**; did you add a $COOL_FEATURE? Write about it here._
-->

## Why did you do this?

<!---
_**Why** did you make these changes? This is your opportunity to provide the rationale that drove the design of your solution._
-->

## Who/what does this impact?

<!---
_Does your code affect something downstream? Are there side effects people should know about? Tag any developers that should be kept abreast of this change._
-->

## How did you test this?

<!---
_How did you test your change? Document it here._
-->

## Legal / privacy gate

Check this when the PR changes **what we collect**, **what we ask OS permission for**, or **how we describe the product**.

- [ ] No new OS permission / Info.plist / Android permission / privacy-sensitive API
- [ ] If there **is** a new permission or data practice → update `docs/privacy-policy.md` (and hosted `/privacy` if shipped) + bump “last updated”
- [ ] If product promises or restrictions change → update `docs/terms-of-service.md` (+ hosted `/terms` if shipped)
- [ ] App Store / Play privacy nutrition labels still accurate (analytics, crash data, session replay, etc.)
- [ ] N/A — pure code / UI / docs with no data or permission impact
