"""Prepare official NASA LOLA heights and a CC BY 4.0 lunar color map."""
from pathlib import Path
import gzip
import hashlib
import json
import urllib.request
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.asset-cache'
OUT = ROOT / 'public' / 'data'
BASE = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/'
CACHE.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
sources = []
urls = {'ldem_16.img': BASE+'ldem_16.img', 'ldem_16.lbl': BASE+'ldem_16.lbl', '8k_moon.jpg': 'https://www.solarsystemscope.com/textures/download/8k_moon.jpg'}
for name, url in urls.items():
    path = CACHE / name
    if not path.exists():
        print(f'Downloading {name}', flush=True)
        urllib.request.urlretrieve(url, path)
    sources.append({'file': name, 'url': url, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

with Image.open(CACHE / '8k_moon.jpg') as im:
    im.resize((4096, 2048), Image.Resampling.LANCZOS).convert('RGB').save(OUT / 'moon-color.webp', quality=85, method=6)
    im.resize((1024, 512)).convert('RGB').save(OUT / 'moon-map.webp', quality=85)
width, height = 5760, 2880
raw = np.fromfile(CACHE / 'ldem_16.img', dtype='<i2').reshape(height, width)
assert raw.min() >= -18150 and raw.max() <= 21580, 'Validate against the PDS label bounds before conversion'
# PDS is 0..360 east. Recenter at 0 longitude to match the color texture.
a = (np.roll(raw.astype(np.int32), width//2, axis=1) + 20000).astype('<u2')
with gzip.open(OUT / 'moon-height.u16.gz', 'wb', compresslevel=9) as f:
    f.write(a.tobytes())

metadata = {
    'credit': 'Elevation: NASA / LRO / LOLA Science Team, PDS Geosciences Node. Color: Solar System Scope / INOVE, CC BY 4.0, based on NASA imagery.',
    'sourcePage': 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
    'colorSource': 'https://www.solarsystemscope.com/textures/',
    'colorLicense': 'https://creativecommons.org/licenses/by/4.0/',
    'modifications': 'Heights longitude-recentered and offset to uint16, then losslessly compressed. Color resized from 8k to 4k and converted to WebP; map preview resized.',
    'sources': sources,
    'width': width, 'height': height,
    'encoding': 'gzip-compressed little-endian unsigned 16-bit, row-major, north to south',
    'heightMeters': 'sample * 0.5 - 10000',
    'radiusMeters': 1737400,
    'longitude': 'west -180 to east +180, pixel centers',
    'latitude': 'north +90 to south -90, pixel centers',
    'notes': 'Global measured terrain; procedural details below the roughly 1.9 km equatorial elevation sample spacing are artistic, not surveyed.'
}
(OUT / 'sources.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps({'width': width, 'height': height, 'elevationRangeMeters': [float(a.min())*.5-10000,float(a.max())*.5-10000], 'assets': {p.name:p.stat().st_size for p in OUT.iterdir()}}, indent=2), flush=True)
