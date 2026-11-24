# Elevator Pitch – forgatókönyv (~2 perc)

**1. Bevezetés (15 mp)**
„Egy CS2 esport tornakövető mini alkalmazást készítettünk, és köré egy teljesen automatikus CI/CD pipeline-t. Egyetlen `git push` elég ahhoz, hogy a kód buildelve, letesztelve és telepítve legyen."

**2. Az alkalmazás (30 mp)** – mutasd a böngészőben
- Dashboard (animált számlálók, dobogó, diagramok), majd a téma váltása.
- Új meccs: BO3, pályánként `13-9`, `11-13`, `16-14` → a tabella frissül.
- Mutass egy hibás eredményt (`13-12`) → élőben pirosra vált, a CS2 szabályai szerint elutasítja.

**3. A pipeline (45 mp)** – mutasd a GitHub Actions fület
- Változtass egy apróságot, commit, push.
- Három szakasz: **build-test** (lint + 14 teszt) → **docker** (image a GHCR-be) → **deploy** (konténer indul, smoke teszt).
- Ha a teszt elbukik, nincs image és nincs deploy.

**4. Bizonyíték a működésre (20 mp)**
- A smoke teszt log: `/health` visszaadja a commit SHA-t – azaz pontosan az újonnan épített artifact fut.

**5. Zárás (10 mp)**
„Eszközök: Git, GitHub Actions, Docker, GHCR. Az alkalmazás egyszerű, a hangsúly az automatizáláson van. Köszönjük!"
