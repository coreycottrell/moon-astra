"""Reproduce proposal figures and arithmetic; this is not the MOON simulation."""
from pathlib import Path
import csv
import json
import math

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

BASE = Path(__file__).resolve().parent
FIGURES = BASE / 'figures'
FIGURES.mkdir(exist_ok=True)
RADIUS_KM = 1737.4
AREA_KM2 = 4 * math.pi * RADIUS_KM ** 2
SIGMA = 5.670374419e-8


def cell_area(level, x, y):
    """Exact solid angle of a normalized cube-face rectangle, times radius²."""
    n = 2 ** level
    u, v, span = -1 + 2 * x / n, -1 + 2 * y / n, 2 / n
    f = lambda a, b: math.atan2(a * b, math.sqrt(1 + a*a + b*b))
    return RADIUS_KM ** 2 * (f(u+span, v+span) - f(u, v+span)
                             - f(u+span, v) + f(u, v))


def coverage(day, productivity=1.0):
    # Prescribed illustrative history, beginning with an established 1 km² site.
    # Dates do not unlock technology. No resources or spatial fronts are modeled.
    anchor_days = [0, 7, 14, 21, 28, 35]
    anchor_percent = [100 / AREA_KM2, .0001, .001, .01, .1, 1]
    if day <= 35:
        return 10 ** float(np.interp(day, anchor_days, np.log10(anchor_percent)))
    return min(100.0, 2 ** ((day - 35) * productivity))


summary = {
    'model_kind': 'Analytical pacing illustration; not a local-resource, technology, or construction simulation.',
    'assumptions': {
        'radius_km': RADIUS_KM,
        'initial_established_site_km2': 1,
        'pre_day_35_growth': 'Prescribed log-interpolated targets, not an economic result.',
        'day_35_coverage_percent': 1,
        'ideal_late_doubling_days': 1,
        'radiator_emissivity': .9,
        'radiator_sink_temperature_K': 0,
        'radiator_environment': 'Ideal unobstructed cold sink; no absorbed sunlight, ground radiation, or transport losses.',
    },
    'moon_area_km2': AREA_KM2,
    'claim_levels': [],
    'radiator_examples': [],
    'ideal_final_phase_days': math.log2(100),
    'ideal_completion_day': 35 + math.log2(100),
    'day_42_coverage_percent': {str(u): coverage(42, u) for u in (1., .9, .75)},
    'day_42_after_one_day_complete_interruption_percent': 2**6,
    'texture_equatorial_km_per_pixel_4096': 2 * math.pi * RADIUS_KM / 4096,
    'dem_equatorial_km_per_sample_5760': 2 * math.pi * RADIUS_KM / 5760,
}
for level in (8, 10, 14):
    n = 2 ** level
    summary['claim_levels'].append({
        'level': level, 'cells': 6 * 4**level,
        'mean_area_km2': AREA_KM2 / (6 * 4**level),
        'corner_cell_area_km2': cell_area(level, 0, 0),
        'central_cell_area_km2': cell_area(level, n//2, n//2),
    })
for temperature in (300, 350, 400):
    flux = .9 * SIGMA * temperature**4
    summary['radiator_examples'].append({
        'temperature_K': temperature, 'W_per_m2': flux,
        'km2_per_GW_rejected': 1e9 / flux / 1e6,
    })

# Validate the actual arithmetic used in the published proposal.
assert math.isclose(6 * cell_area(0, 0, 0), AREA_KM2, rel_tol=1e-12)
assert math.isclose(sum(cell_area(4, x, y) for x in range(16) for y in range(16)) * 6,
                    AREA_KM2, rel_tol=1e-12)
assert math.isclose(coverage(35), 1)
assert math.isclose(coverage(41), 64)
assert math.isclose(coverage(35 + math.log2(100)), 100, abs_tol=1e-10)
assert math.isclose(summary['day_42_coverage_percent']['0.9'], 78.79324245407463)

days = np.linspace(0, 42, 1009)
with (BASE / 'balance-data.csv').open('w', newline='') as stream:
    writer = csv.writer(stream)
    writer.writerow(['day', 'ideal_coverage_percent', 'productivity_90_percent', 'productivity_75_percent'])
    for day in days:
        writer.writerow([f'{day:.6f}', *(f'{coverage(day, u):.12g}' for u in (1, .9, .75))])
(BASE / 'model-summary.json').write_text(json.dumps(summary, indent=2) + '\n')

plt.rcParams.update({
    'font.family': 'DejaVu Sans', 'font.size': 11,
    'axes.spines.top': False, 'axes.spines.right': False,
    'axes.labelcolor': '#364253', 'text.color': '#182537',
    'xtick.color': '#526174', 'ytick.color': '#526174',
    'svg.fonttype': 'none', 'figure.facecolor': '#f6f8fc',
    'axes.facecolor': '#f6f8fc', 'axes.edgecolor': '#c6cfdb',
})
fig, axes = plt.subplots(2, 1, figsize=(12, 9))
fig.subplots_adjust(top=.87, bottom=.13, hspace=.5, left=.09, right=.96)
fig.suptitle('THE LAST WEEK CHANGES THE MOON', x=.09, ha='left', y=.97,
             fontsize=19, fontweight='bold')
fig.text(.09, .924, 'Illustrative growth targets • 1% on day 35 • one-day late doubling time', fontsize=11)
ax = axes[0]
ax.plot(days, [coverage(d) for d in days], color='#157a67', linewidth=3)
ax.fill_between(days, [coverage(d) for d in days], color='#157a67', alpha=.12)
ax.axvspan(35, 42, color='#c99532', alpha=.13)
ax.text(3, 75, 'Small beginnings.\nCapabilities, factories, and partnerships\naccumulate before planetary coverage is visible.',
        fontsize=11, linespacing=1.6)
ax.set(xlim=(0, 42), ylim=(0, 105), ylabel='Commissioned coverage (%)', xlabel='Campaign day')
ax.set_xticks(range(0, 43, 7))
ax.grid(axis='y', alpha=.22)
ax.set_title('A. The whole arc', loc='left', pad=12, fontsize=12, fontweight='bold')
ax = axes[1]
late = np.linspace(35, 42, 169)
colors = ['#157a67', '#346daf', '#bd751c']
for u, color in zip((1, .9, .75), colors):
    ax.plot(late, [coverage(d, u) for d in late], color=color, linewidth=2.7,
            label=f'{round(u*100)}% effective productivity')
ax.axvline(35 + math.log2(100), linestyle=':', color='#526174', linewidth=1.2)
ax.set(xlim=(35, 42), ylim=(0, 108), ylabel='Commissioned coverage (%)', xlabel='Campaign day')
ax.set_xticks(range(35, 43))
ax.grid(axis='y', alpha=.22)
ax.legend(loc='upper left', frameon=False, fontsize=10)
ax.set_title('B. Infrastructure changes the finish', loc='left', pad=12, fontsize=12, fontweight='bold')
fig.text(.09, .044, 'Pacing sketch only: no material, transport, construction, or discovery simulation.\n'
         'The actual game must earn this curve through accountable deployment and commissioning.',
         fontsize=10, color='#526174', linespacing=1.5)
fig.savefig(FIGURES / 'growth.svg')
plt.close(fig)

print(json.dumps({
    'status': 'model arithmetic verified',
    'moon_area_km2': AREA_KM2,
    'ideal_completion_day': summary['ideal_completion_day'],
    'day_42': summary['day_42_coverage_percent'],
}, indent=2))
