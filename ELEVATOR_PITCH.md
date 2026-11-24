# Elevator Pitch – szó szerinti szöveg és felvételi útmutató

Hossz: kb. 2 perc 30 másodperc. A **dőlt, szögletes zárójeles** részek azt jelzik, mit csinálj a képernyőn – ezeket NEM kell felolvasni. Az idézőjeles részeket mondd el szóról szóra.

---

## Felkészülés a felvétel előtt (5 perc)

1. Indítsd el az alkalmazást: dupla kattintás a `cs2-esports-tracker` mappában a **start.bat** fájlra. Megnyílik a böngészőben: `http://localhost:3000`.
2. Nyiss egy második böngészőfület: `https://github.com/pumca/cs2-esports-tracker/actions` – itt látszik a pipeline.
3. Felvétel indítása (Windows 11): nyisd meg a **Clipchamp** alkalmazást (Start menü → Clipchamp) → *Felvétel és létrehozás* → *Képernyő és kamera* (vagy csak *Képernyő*) → válaszd a böngészőablakot → piros gomb. A végén *Mentés* → *Exportálás* → 1080p MP4.
   (Másik lehetőség: **Win + Alt + R** az Xbox Game Barral – ez a böngészőablakot veszi fel, a mikrofont a Game Bar beállításaiban kapcsold be.)
4. Ha elrontasz egy mondatot, nem gond: tarts egy kis szünetet, és mondd újra – a végén a Clipchampben kivághatod.

---

## 1. Bemutatkozás és a probléma (0:00–0:20)

*[A böngészőben a GitHub Actions oldal látszik.]*

„Sziasztok! A projektem neve CS2 Esports Tracker. Ez egy Counter-Strike 2 esport tornakövető alkalmazás, de a lényeg nem maga az alkalmazás, hanem az, ahogyan eljut a felhasználóhoz: egy teljesen automatikus CI/CD folyamat. Elég feltölteni a kódot a GitHubra, és minden más magától történik."

## 2. A pipeline elindítása (0:20–0:40)

*[Kattints a legfelső, zöld pipaval jelölt futásra, majd jobb fent a „Re-run all jobs” gombra, és a megjelenő ablakban újra a „Re-run jobs” gombra.]*

„A pipeline a GitHub Actions sandboxban fut. Most újraindítom, hogy élőben is lássuk. Három lépésből áll: először buildel és lefuttatja a teszteket, utána Docker image-et készít, és feltölti a GitHub Container Registry-be, végül ezt az image-et telepíti és ellenőrzi. Amíg fut, megmutatom az alkalmazást."

## 3. Az alkalmazás bemutatása (0:40–1:30)

*[Válts át a `localhost:3000` fülre. Az Áttekintés oldal látszik.]*

„Ez az áttekintő oldal: itt látszik a tabella, a legutóbbi meccsek, és hogy melyik pályán hányszor játszottak."

*[Kattints fent az „+ Meccs” gombra. Csapat 1: NAVI, Csapat 2: FaZe Clan, BO3 marad. Az 1. pályához írd: 13 és 9, a 2. pályához: 13 és 12.]*

„Új meccset rögzítek. Az alkalmazás ismeri a CS2 szabályait: egy pálya tizenhárom nyert körig tart, ezért a tizenhárom–tizenkettő nem lehet végeredmény. Látszik, hogy pirossal azonnal jelzi a hibát, és a szerver sem fogadná el."

*[Javítsd a 2. pálya eredményét: 13 és 7. Kattints a „Mentés” gombra. A Tabella oldal jelenik meg.]*

„Kijavítom tizenhárom–hétre, mentem, és a tabella azonnal frissül: a győzelem három pontot ér, holtversenynél a pálya- és a körkülönbség dönt."

*[Kattints a „Csapatok” menüre.]*

„A csapatoknál logót vagy saját címert lehet választani. A felület mobilon is működik, és van sötét meg világos témája."

## 4. A pipeline eredménye (1:30–2:10)

*[Válts vissza a GitHub fülre. Ha még fut, várj pár másodpercet, amíg mindhárom lépés zöld lesz.]*

„Visszatérve a pipeline-hoz: mindhárom lépés zöld. Az első lépésben lefutott tizenhét automatikus teszt. Ha bármelyik elbukna, a pipeline megállna, és hibás verzió nem kerülne ki."

*[Kattints a harmadik lépésre: „Deploy sandbox környezetbe és smoke teszt”, majd nyisd le a „Smoke teszt – az üzleti funkciók elérhetők” sort.]*

„A harmadik lépés a telepítés: a frissen elkészült Docker image elindul konténerként, és egy úgynevezett smoke teszt ellenőrzi. Itt látszik, hogy az alkalmazás válaszol, és visszaadja azt a commit-azonosítót, amiből készült. Ez bizonyítja, hogy pontosan az új verzió fut. Lekérdezi a tabellát, és felvesz egy új csapatot is – vagyis az üzleti funkciók működnek."

## 5. Zárás (2:10–2:30)

*[Maradhat a GitHub oldal.]*

„Összefoglalva: Git verziókezelés, GitHub Actions pipeline, Docker konténer és automatikus tesztek. Egy push után körülbelül egy perc alatt letesztelt, telepített és ellenőrzött alkalmazás áll elő, emberi beavatkozás nélkül. A forráskód és a dokumentáció nyilvánosan elérhető a GitHubon. Köszönöm a figyelmet!"

---

### Ha valami nem úgy megy, ahogy tervezted
- **A pipeline még fut, amikor visszaváltasz:** mondd azt, hogy „Még dolgozik, pár másodperc”, és várj – vagy a felvételen kivágod a várakozást.
- **Nem indul a start.bat:** a gépen telepíteni kell a Node.js-t (https://nodejs.org, LTS változat), utána újra dupla kattintás.
- **Nem tudsz bejelentkezni a GitHubra a videóban:** a repó nyilvános, a futások bejelentkezés nélkül is megnézhetők; ilyenkor csak az újraindítás (Re-run) marad ki – azt a mondatot hagyd el.
