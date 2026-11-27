const get = id => document.getElementById(id);
const menu = get('board-menu');
const menuButton = get('menu-toggle');
const pin = menu.querySelector('.btn-pin');
const shade = get('menu-shade');
const smallScreen = matchMedia('(max-width: 850px)');
const main = document.querySelector('main');

function syncMenu() {
  const drawerOpen = smallScreen.matches && document.body.classList.contains('menu-open');
  const expanded = smallScreen.matches ? drawerOpen : !document.body.classList.contains('menu-closed');
  menuButton.setAttribute('aria-expanded', String(expanded));
  pin.setAttribute('aria-label', smallScreen.matches ? 'Close board menu' : 'Collapse board menu');
  pin.title = pin.getAttribute('aria-label');
  shade.hidden = !drawerOpen;
  menu.inert = smallScreen.matches && !drawerOpen;
  main.inert = drawerOpen;
}

function toggleMenu() {
  document.body.classList.toggle(smallScreen.matches ? 'menu-open' : 'menu-closed');
  syncMenu();
  (menuButton.getAttribute('aria-expanded') === 'true' ? pin : menuButton).focus();
}
menuButton.onclick = pin.onclick = shade.onclick = toggleMenu;
smallScreen.addEventListener('change', () => {
  document.body.classList.remove('menu-open');
  syncMenu();
});
syncMenu();

const radarLink = get('nav-radar');
const relationsLink = get('nav-relations');
let lastRelationsHash = '';
function updateView() {
  const showRadar = new URLSearchParams(location.hash.slice(1)).get('view') === 'radar';
  get('radar-view').hidden = !showRadar;
  get('relations-view').hidden = showRadar;
  for (const [link, active] of [[radarLink, showRadar], [relationsLink, !showRadar]]) {
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.title = (showRadar ? 'Radar' : 'Relations') + ' · New Balance: Future of Running · Trendtracker';
}
function closeDrawer() {
  if (!shade.hidden) toggleMenu();
}
radarLink.addEventListener('click', () => {
  if (!get('relations-view').hidden) lastRelationsHash = location.hash;
  closeDrawer();
});
relationsLink.addEventListener('click', event => {
  event.preventDefault();
  if (get('relations-view').hidden) location.hash = lastRelationsHash;
  closeDrawer();
});
window.addEventListener('hashchange', updateView);
updateView();

const search = get('board-search');
const results = get('board-search-results');
const topics = [...get('nr-topic').options].filter(option => option.value !== '-1');
function hideResults() {
  results.hidden = true;
}
function chooseTopic(option) {
  const params = new URLSearchParams();
  params.set('topic', option.value);
  const cutoff = get('nr-cut').value;
  if (Number(cutoff) !== .01) params.set('cut', String(Number(cutoff)));
  search.value = '';
  hideResults();
  location.hash = params.toString();
  search.focus();
}
function findTopics() {
  const query = search.value.trim().toLocaleLowerCase();
  results.replaceChildren();
  results.hidden = !query;
  if (!query) return;
  for (const option of topics.filter(item => item.text.toLocaleLowerCase().includes(query))) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.text;
    button.onclick = () => chooseTopic(option);
    results.append(button);
  }
  if (!results.childElementCount) results.textContent = 'No matching topics';
}
search.addEventListener('input', findTopics);
search.addEventListener('focus', findTopics);
search.addEventListener('keydown', event => {
  if (results.hidden) return;
  if (event.key === 'Enter' || event.key === 'ArrowDown') {
    event.preventDefault();
    const first = results.querySelector('button');
    if (event.key === 'Enter') first?.click();
    else first?.focus();
  }
});
search.closest('app-global-search').addEventListener('focusout', event => {
  if (!event.currentTarget.contains(event.relatedTarget)) hideResults();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!results.hidden) { search.focus(); hideResults(); }
    closeDrawer();
  }
});

const share = get('share-view');
let resetShare;
share.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    share.querySelector('.text').textContent = 'Copied!';
    clearTimeout(resetShare);
    resetShare = setTimeout(() => { share.querySelector('.text').textContent = 'Share'; }, 1600);
  } catch {
    window.prompt('Copy this view link', location.href);
  }
});
