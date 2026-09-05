# Data and software credits

**Lunar elevations:** NASA Lunar Reconnaissance Orbiter / Lunar Orbiter Laser Altimeter Science Team; David E. Smith; NASA Goddard Space Flight Center; NASA Planetary Data System Geosciences Node, Washington University in St. Louis. Product **LDEM_16**, **V3.1**, created March 15, 2019, dataset **LRO-L-LOLA-4-GDR-V1.0**.

- [Official LOLA archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm)
- [Product label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_16.lbl)
- [Product data](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_16.img)

Heights are longitude-recentered, offset from signed to unsigned half-meter values, and losslessly compressed for the browser. The geographic reference is the mean Earth/polar axis frame of DE421. The product label notes that source interpolation and latitude-band boundaries can introduce artifacts.

**Lunar surface imagery:** Solar System Scope / INOVE, based on NASA elevation and imagery. Licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The original 8K Moon image is resized to 4K, encoded as WebP, and also resized to a 1K map preview. No endorsement is implied.

- [Texture source and license](https://www.solarsystemscope.com/textures/)
- [Original Moon texture](https://www.solarsystemscope.com/textures/download/8k_moon.jpg)

**Rendering and development:** [Three.js](https://threejs.org/) (MIT), [Vite](https://vite.dev/) (MIT), [Playwright](https://playwright.dev/) (Apache-2.0). Package versions are pinned in `package-lock.json`; dependency license files are distributed with their packages.

All machine geometry, interface icons, and procedural close-up terrain in this project were authored for this prototype.
