const $ = id => document.getElementById(id);
const controls = ['ore-grade', 'haul-distance', 'haul-crew', 'concentrate'];
function compare() {
  const grade = Number($('ore-grade').value) / 100;
  const distance = Number($('haul-distance').value);
  const crew = Number($('haul-crew').value);
  const concentrated = $('concentrate').checked;
  const hauling = (distance, count) => count * 12 * 60 / (6 + distance / 60);
  const nearby = Math.min(100, hauling(250, 1)) * .12 * .8;
  const capacity = hauling(distance, crew) / (concentrated ? .5 : 1);
  const processing = concentrated ? 60 : 100;
  const distant = Math.min(100, processing, capacity) * grade * .8;
  $('grade-value').textContent = `${Math.round(grade * 100)}%`;
  $('distance-value').textContent = `${distance.toLocaleString('en-US')} m`;
  $('crew-value').textContent = crew;
  $('near-rate').textContent = `${nearby.toFixed(1)} units/h`;
  $('far-rate').textContent = `${distant.toFixed(1)} units/h`;
  const max = Math.max(nearby, distant, 1);
  $('near-bar').style.width = `${100 * nearby / max}%`;
  $('far-bar').style.width = `${100 * distant / max}%`;
  const tie = Math.abs(distant - nearby) < .05;
  $('comparison-verdict').textContent = tie ? 'These sites deliver about the same useful output.' : distant > nearby ? 'The distant field wins on delivered output in this example.' : 'Nearby ground wins with this transport budget.';
  $('comparison-limit').textContent = capacity < processing ? 'The distant field is limited by hauling.' : concentrated ? 'The distant field is limited by concentrator throughput.' : 'The distant field is limited by excavation.';
}
controls.forEach(id => $(id).addEventListener('input', compare));
$('reset-comparison').addEventListener('click', () => {
  $('ore-grade').value = 30; $('haul-distance').value = 1500;
  $('haul-crew').value = 1; $('concentrate').checked = false; compare();
});
compare();
const menu = $('resource-menu'), contents = $('contents');
function closeMenu() { contents.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
menu.addEventListener('click', () => { const open = contents.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
contents.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && contents.classList.contains('open')) { closeMenu(); menu.focus(); } });
$('print-resource').addEventListener('click', () => window.print());
let scheduled = false;
function progress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  $('reading-progress').style.width = `${max > 0 ? Math.min(100, 100 * scrollY / max) : 0}%`;
  scheduled = false;
}
addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(progress); } }, {passive:true});
addEventListener('resize', progress); progress();
