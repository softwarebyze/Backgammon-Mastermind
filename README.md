# QA evidence for PR #387 @ a992747

WebKit stills of the Home difficulty row and zoom matrix on the commit-pinned preview
https://backgammon-mastermind-4oirc5lgc-softwarebyzes-projects.vercel.app
versus production. Do not treat this branch as a product release.

Verdict: **FAIL**. English "Medium" ellipsizes (`Medi…`) at 100% zoom on 667×375
(iPhone SE landscape). Production wraps it mid-word as `Mediu / m`. Russian
"Средний" / "Сложный" also ellipsize at 150% zoom once the 0.55 font floor is hit.

The 402×681 / 390×844 matrix in en, de, es, he, and ar at 100–150% has no
mid-word breaks and no edge clipping. At 100% on 402×681, 390×844, 390×664, and
852×260, Home is pixel-identical to production.
