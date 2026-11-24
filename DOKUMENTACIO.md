# CS2 Esports Tracker – CI/CD projektdokumentáció

## 1. A feladat és a megoldás röviden
A feladat egy mini alkalmazás és egy teljes (end-to-end) CI/CD pipeline elkészítése, amely git push hatására automatikusan **buildel, tesztel és telepít** egy sandbox környezetbe.

Az alkalmazás egy **CS2 (Counter-Strike 2) esport tornakövető**: csapatok és meccsek (BO1/BO3/BO5) rögzítése, a pályaeredmények validálása a CS2 szabályai szerint, és automatikusan számolt tabella.

## 2. Az alkalmazás (üzleti funkcionalitás)
| Végpont | Leírás |
|---|---|
| `GET /` | Admin panel webes felület (SPA) |
| `GET /health` | Állapot + a futó verzió (commit SHA) |
| `GET/POST /api/teams`, `DELETE /api/teams/:id` | Csapatok listázása / létrehozása / törlése |
| `GET/POST /api/matches`, `DELETE /api/matches/:id` | Meccsek listázása / rögzítése / törlése |
| `PATCH /api/teams/:id` | Csapat címerének / országának módosítása |
| `GET /api/emblems` | Elérhető címerformák és jelképek |
| `GET /api/standings` | Tabella |
| `GET /api/stats` | Dashboard statisztikák (meccsek, pályák, körök, hosszabbítások, pályanépszerűség) |

**Csapatlogók és címerek:** a csapatok hivatalos logója a `public/logos/` mappából jön (NAVI, FaZe Clan, G2 Esports, Vitality; forrás: Wikimedia Commons / Wikipedia, a logók az érintett szervezetek védjegyei, itt kizárólag oktatási célra szerepelnek). Új logó egyszerűen a mappába másolt `.svg`/`.png` fájllal bővíthető, a Csapatok oldalon kiválasztható. Ha egy csapatnak nincs logója, helyette a saját, eredeti SVG-címere jelenik meg (forma + jelkép + szín, élő előnézettel szerkeszthető). A szerver validálja a logóútvonalat és a címert is (`logo`, `icon` mező).

**Webes felület** (`public/`): közvetítés-hangulatú, lapos, tabella-központú megjelenés (a CS2 két oldala, T-arany és CT-kék adja a színeket). Oldalak: Áttekintés (számsor, tabella, legutóbbi meccsek, diagramok), Tabella, Meccsek (keresés, törlés), Csapatok (címerszerkesztő), Új meccs (BO1/3/5, pályánként élő CS2-eredményvalidáció). Toast értesítések, megerősítő ablak, sötét/világos téma, reszponzív mobilnézet. Külső függőség nélkül (vanilla JS + CSS).

**Üzleti szabályok** (`src/rules.js`, `src/store.js`):
- Pályaeredmény: MR12 – 13 nyert körig tart (13-0 … 13-11); 12-12 után MR3 hosszabbítás, így 16-12/13/14, 19-15/16/17 stb. érvényes. Pl. 13-12 vagy 16-15 érvénytelen.
- Sorozat (BO1/3/5): a győzelemhez `ceil(bo/2)` pálya kell; felesleges vagy hiányzó pálya hibát ad.
- Tabella: győzelem 3 pont; sorrend: pont → pályakülönbség → körkülönbség → név.
- Duplikált csapatnév és önmaga elleni meccs tiltott.

Az adattárolás szándékosan memóriabeli, mert a feladat hangsúlya az automatizáláson van.

## 3. Architektúra és eszközök
- **Futtatókörnyezet:** Node.js 20 + Express
- **Verziókezelés:** Git + GitHub
- **CI/CD:** GitHub Actions (a DevOps sandbox)
- **Csomagolás / artifact:** Docker image, GitHub Container Registry (GHCR)
- **Tesztek:** Node beépített test runnere (`node --test`), 16 teszt (szabályok + HTTP API)

```
git push ─► GitHub ─► Actions pipeline
                       1. build-test : npm ci → lint → tesztek
                       2. docker     : image build → push GHCR (:latest, :<sha>)
                       3. deploy     : image pull → konténer indítás → várakozás → smoke teszt
```

## 4. A pipeline lépései (`.github/workflows/ci-cd.yml`)
1. **Trigger:** push és pull request a `main` ágra, valamint kézi indítás.
2. **build-test:** checkout, Node 20 telepítés (npm cache), `npm ci` (reprodukálható build), `npm run lint`, `npm test`. Hiba esetén a pipeline megáll, nem készül image.
3. **docker:** Docker Buildx, bejelentkezés a GHCR-be a beépített `GITHUB_TOKEN`-nel, multi-stage build, push két taggel (`latest` és a commit SHA). A SHA a `APP_VERSION` build-argumentumon át bekerül az image-be.
4. **deploy:** a sandbox (a GitHub runner) a registry-ből **lehúzza a most elkészült artifactot**, elindítja konténerként, majd megvárja a `/health` válaszát.
5. **Smoke teszt (Definition of Done):** ellenőrzi, hogy az artifact elindult és az üzleti funkciók elérhetők: `/health` ok és a verzió megegyezik a commit SHA-val, a tabella tartalmazza a seed adatokat, új csapat létrehozható, a webes felület kiszolgálódik.

Pull requestnél csak a build-test fut (nincs publikálás).

## 5. Dockerfile
Multi-stage build: az első fázisban `npm ci --omit=dev`, a második fázis csak a futáshoz szükséges fájlokat másolja. A konténer nem root (`USER node`) felhasználóval fut, `HEALTHCHECK` van benne a `/health` végpontra.

## 6. Futtatás helyben
```
start.bat                 # Windows: telepít, elindít és megnyitja a böngészőt
npm install
npm test
npm start                 # http://localhost:3000
docker compose up --build # Dockerrel
```

## 7. Bevezetés lépésről lépésre (első alkalom)
1. GitHub-on új repository létrehozása (pl. `cs2-esports-tracker`).
2. ```
   git init -b main
   git add .
   git commit -m "CS2 Esports Tracker + CI/CD pipeline"
   git remote add origin https://github.com/<felhasznalo>/cs2-esports-tracker.git
   git push -u origin main
   ```
3. A GitHub **Actions** fülön látszik a pipeline futása; a zöld deploy job a Definition of Done teljesülését jelenti. (A GHCR-csomag a repository „Packages” részében jelenik meg.)

## 8. Továbbfejlesztési lehetőségek
Tartós adatbázis (PostgreSQL), telepítés külső felhőbe (pl. Render/Fly.io/Azure) a deploy jobban, Kubernetes manifest, monitoring (Prometheus), automatikus verziózás (semantic release).
