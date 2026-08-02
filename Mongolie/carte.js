/* ════════════════════════════════════════════════════
   MONGOLIE À VÉLO — Logique de la carte
   Ce fichier ne contient que du code JavaScript.
   Tu n'as normalement pas besoin d'y toucher.

   Les données sont dans  → pois_fr.json
   Le style est dans      → style.css
════════════════════════════════════════════════════ */


/* ── COULEURS ET LABELS PAR CATÉGORIE ───────────── */
const CAT_COLORS = {
  depart:       '#C0272D',
  etape:        '#1B4F8A',
  pratique:     '#edc709',
  culture:      '#8B6BBE',
  nature:       '#2E8B57',
  frontiere:    '#5D4037'
};

const CAT_LABELS = {
  depart:       'Point de départ',
  etape:        'Étapes',
  pratique:     'Infos pratiques',
  culture:      'Culture & Divertissement',
  nature:       'Nature',
  frontiere:    'Frontière'
};


/* ── INITIALISATION DE LA CARTE ─────────────────── */
const map = L.map('map', {
  center: [46.5, 102],
  zoom: 5.4,
  zoomControl: true
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19,
  subdomains: 'abcd'
}).addTo(map);


/* ── MARQUEURS ───────────────────────────────────── */
let allMarkers  = [];
let activeFilter = 'all';

function createMarkerIcon(poi) {
  const color = CAT_COLORS[poi.categorie] || '#888';
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin" style="background:${color}">
             <span class="emoji">${poi.emoji}</span>
           </div>`,
    iconSize:    [34, 34],
    iconAnchor:  [17, 34],
    popupAnchor: [0, -36]
  });
}


/* ── PANNEAU DÉTAIL ──────────────────────────────── */
function showDetail(poi) {
  const color = CAT_COLORS[poi.categorie] || '#888';

  const festivalHtml = poi.dates_festival
    ? `<div class="detail-dates">🗓️ <strong>Festival :</strong> ${poi.dates_festival}</div>`
    : '';

  const packHtml = poi.pack
    ? `<div>
         <div class="detail-section-label">Inclus dans</div>
         <div class="pack-pills">
           ${poi.pack.map(p =>
             `<span class="pack-pill ${p}">
               ${p === 'aventurier' ? '🏔 Aventurier' : '🧳 Clé en main'}
             </span>`
           ).join('')}
         </div>
       </div>`
    : '';

  const conseilHtml = poi.conseil_velo
    ? `<div class="detail-conseil">🚴 <strong>Conseil vélo :</strong><br>${poi.conseil_velo}</div>`
    : '';

  const attentionHtml = poi.attention
    ? `<div class="detail-attention">⚠️ <strong>Attention :</strong><br>${poi.attention}</div>`
    : '';

  document.getElementById('detail-placeholder').style.display = 'none';

  const content = document.getElementById('detail-content');
  content.style.display = 'flex';
  content.innerHTML = `
    <div class="detail-hero" style="background:${color}">
      <div class="cat-badge">${CAT_LABELS[poi.categorie] || poi.categorie}</div>
      <h2>${poi.emoji} ${poi.nom}</h2>
      <div class="ville">📍 ${poi.ville}</div>
    </div>
    <div class="detail-body">
      <div class="detail-section">
        <div class="detail-section-label">Description</div>
        ${poi.description}
      </div>
      ${festivalHtml}
      ${packHtml}
      ${conseilHtml}
      ${attentionHtml}
    </div>
  `;

  map.panTo([poi.lat, poi.lng], { animate: true, duration: 0.5 });
}


/* ── FILTRES ─────────────────────────────────────── */
function applyFilter(cat) {
  activeFilter = cat;
  allMarkers.forEach(marker => {
    const visible = cat === 'all' || marker.poi.categorie === cat;
    if (visible && !map.hasLayer(marker)) marker.addTo(map);
    if (!visible && map.hasLayer(marker))  map.removeLayer(marker);
  });
  document.getElementById('detail-placeholder').style.display = '';
  document.getElementById('detail-content').style.display     = 'none';
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    applyFilter(this.dataset.cat);
  });
});


/* ── LÉGENDE ─────────────────────────────────────── */
function buildLegende() {
  const el = document.createElement('div');
  el.id = 'legende';
  el.innerHTML = `
    <strong>Catégories</strong>
    ${Object.entries(CAT_COLORS).map(([cat, color]) => `
      <div class="leg-item">
        <div class="leg-dot" style="background:${color}"></div>
        ${CAT_LABELS[cat]}
      </div>
    `).join('')}
  `;
  document.getElementById('map').appendChild(el);
}


/* ── CHARGEMENT DES DONNÉES ──────────────────────── */
fetch('pois_fr.json')
  .then(r => r.json())
  .then(POIS => {

    POIS.forEach(poi => {
      const marker = L.marker([poi.lat, poi.lng], { icon: createMarkerIcon(poi) });
      marker.poi = poi;

      marker.bindPopup(`
        <div class="popup-cat">${CAT_LABELS[poi.categorie] || poi.categorie}</div>
        <div class="popup-title">${poi.emoji} ${poi.nom}</div>
        <div style="font-size:11px;color:#888;margin-top:2px">${poi.ville}</div>
      `, { maxWidth: 220, closeButton: false });

      marker.on('click',     ()           => showDetail(poi));
      marker.on('mouseover', function ()  { this.openPopup(); });
      marker.on('mouseout',  function ()  { this.closePopup(); });

      marker.addTo(map);
      allMarkers.push(marker);
    });

    buildLegende();
  })
  .catch(() => {
    document.getElementById('map').innerHTML =
      '<p style="padding:30px;color:#C0392B;font-family:sans-serif">⚠️ Impossible de charger pois_fr.json.<br>Vérifie que le fichier est bien dans le même dossier que index.html.</p>';
  });
