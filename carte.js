/* ════════════════════════════════════════════════════
   MOTEUR UNIVERSEL — carte.js
   Partagé par toutes les cartes du blog.

   Ne pas modifier ce fichier pour changer les données
   ou le style d'un pays spécifique.

   Données      → [pays]/pois.json
   Style base   → style.css
   Style pays   → [pays]/theme.css
   Config pays  → [pays]/index.html  (variable CONFIG)

   Langue lue depuis le paramètre URL :
     carte.html?lang=fr  →  français
     carte.html?lang=en  →  anglais
     (défaut : fr si absent)
════════════════════════════════════════════════════ */


/* ── LANGUE ──────────────────────────────────────── */
const LANG = new URLSearchParams(window.location.search).get('lang') || 'fr';

/* Lit un champ qui peut être une string simple ou {fr, en} */
function t(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[LANG] || field['fr'] || '';
}


/* ── CATÉGORIES ──────────────────────────────────── */
/* Définies dans CONFIG (index.html du pays).
   Fallback sur des valeurs génériques si absent.    */
const CAT_COLORS = (typeof CONFIG !== 'undefined' && CONFIG.categories)
  ? Object.fromEntries(CONFIG.categories.map(c => [c.id, c.color]))
  : {};

const CAT_LABELS = (typeof CONFIG !== 'undefined' && CONFIG.categories)
  ? Object.fromEntries(CONFIG.categories.map(c => [c.id, t(c.label)]))
  : {};


/* ── INITIALISATION DE LA CARTE ─────────────────── */
const isMobile = window.innerWidth <= 768;

const map = L.map('map', {
  center: CONFIG.centre,
  zoom:   isMobile ? CONFIG.zoomMobile : CONFIG.zoom,
  zoomControl: !isMobile
});

L.tileLayer(CONFIG.tileUrl || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: CONFIG.tileAttribution || '© OpenStreetMap contributors © CARTO',
  maxZoom: 19,
  subdomains: 'abcd'
}).addTo(map);


/* ── CONTOUR DU PAYS ─────────────────────────────── */
if (CONFIG.contour) {
  fetch(CONFIG.contour)
    .then(r => r.json())
    .then(data => {
      L.geoJSON(data, {
        style: {
          color:  CONFIG.contourColor || '#2A5F7A',
          weight: CONFIG.contourWeight || 2,
          fill:   false
        }
      }).addTo(map);
    });
}


/* ── MARQUEURS ───────────────────────────────────── */
let allMarkers   = [];
let activeFilter = 'all';

function createMarkerIcon(poi) {
  const color = CAT_COLORS[poi.categorie] || '#888';
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin" style="background:${color}">
             <span class="emoji">${poi.emoji || '📍'}</span>
           </div>`,
    iconSize:    [34, 34],
    iconAnchor:  [17, 34],
    popupAnchor: [0, -36]
  });
}


/* ── PANNEAU DÉTAIL ──────────────────────────────── */
function showDetail(poi) {
  const color = CAT_COLORS[poi.categorie] || '#888';

  const festivalHtml = t(poi.dates_festival)
    ? `<div class="detail-dates">🗓️ <strong>${LANG === 'fr' ? 'Festival' : 'Festival'} :</strong> ${t(poi.dates_festival)}</div>`
    : '';

  const packHtml = poi.pack
    ? `<div>
         <div class="detail-section-label">${LANG === 'fr' ? 'Inclus dans' : 'Included in'}</div>
         <div class="pack-pills">
           ${poi.pack.map(p =>
             `<span class="pack-pill ${p}">
               ${p === 'aventurier'
                 ? (LANG === 'fr' ? '🏔 Aventurier' : '🏔 Adventurer')
                 : (LANG === 'fr' ? '🧳 Clé en main' : '🧳 Guided')}
             </span>`
           ).join('')}
         </div>
       </div>`
    : '';

  const conseilHtml = t(poi.conseil_velo)
    ? `<div class="detail-conseil">🚴 <strong>${LANG === 'fr' ? 'Conseil vélo' : 'Cycling tip'} :</strong><br>${t(poi.conseil_velo)}</div>`
    : '';

  const attentionHtml = t(poi.attention)
    ? `<div class="detail-attention">⚠️ <strong>${LANG === 'fr' ? 'Attention' : 'Warning'} :</strong><br>${t(poi.attention)}</div>`
    : '';

  document.getElementById('detail-placeholder').style.display = 'none';

  const content = document.getElementById('detail-content');
  content.style.display = 'flex';
  content.innerHTML = `
    <div class="detail-hero" style="background:${color}; position:relative;">
      <button id="detail-close" onclick="fermerDetail()">✖</button>
      <div class="cat-badge">${CAT_LABELS[poi.categorie] || poi.categorie}</div>
      <h2>${poi.emoji || ''} ${t(poi.nom)}</h2>
      <div class="ville">📍 ${t(poi.ville) || poi.ville}</div>
    </div>
    <div class="detail-body">
      <div class="detail-section">
        <div class="detail-section-label">${LANG === 'fr' ? 'Description' : 'Description'}</div>
        ${t(poi.description)}
      </div>
      ${festivalHtml}
      ${conseilHtml}
      ${attentionHtml}
    </div>
  `;
  /*à rajouter si je veux les packs    ${packHtml}*/

  /* Réattacher l'événement sur le bouton close recréé dans le innerHTML */
  document.getElementById('detail-close').addEventListener('click', fermerDetail);

  /* Ouvre le panneau sur mobile */
  document.getElementById('detail').classList.add('open');

  /* Recentrage carte */
  if (isMobile) {
    const offset   = map.getSize().y * 0.25;
    const point    = map.latLngToContainerPoint([poi.lat, poi.lng]);
    const newPoint = L.point(point.x, point.y + offset);
    map.panTo(map.containerPointToLatLng(newPoint), { animate: true, duration: 0.4 });
  } else {
    map.panTo([poi.lat, poi.lng], { animate: true, duration: 0.5 });
  }
}

function fermerDetail() {
  document.getElementById('detail').classList.remove('open');
  document.getElementById('detail-placeholder').style.display = '';
  document.getElementById('detail-content').style.display     = 'none';
}


/* ── SWIPE VERS LE BAS POUR FERMER (mobile) ─────── */
if (isMobile) {
  const detailEl = document.getElementById('detail');
  let startY = 0;

  detailEl.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
  });

  detailEl.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - startY > 60) fermerDetail();
  });
}


/* ── FILTRES ─────────────────────────────────────── */
function applyFilter(cat) {
  activeFilter = cat;
  allMarkers.forEach(marker => {
    const visible = cat === 'all' || marker.poi.categorie === cat;
    if (visible  && !map.hasLayer(marker)) marker.addTo(map);
    if (!visible &&  map.hasLayer(marker)) map.removeLayer(marker);
  });
  document.getElementById('detail-placeholder').style.display = '';
  document.getElementById('detail-content').style.display     = 'none';
  document.getElementById('detail').classList.remove('open');
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const cat = this.dataset.cat;

    // Si on reclique sur le filtre déjà actif → retour au all
    if (cat !== 'all' && cat === activeFilter) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.filter-btn[data-cat="all"]').classList.add('active');
      applyFilter('all');
      return;
    }

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    applyFilter(cat);
  });
});


/* ── LÉGENDE ─────────────────────────────────────── */
function buildLegende() {
  const el = document.createElement('div');
  el.id = 'legende';
  el.innerHTML = `
    <strong>${LANG === 'fr' ? 'Catégories' : 'Categories'}</strong>
    ${CONFIG.categories.map(c => `
      <div class="leg-item">
        <div class="leg-dot" style="background:${c.color}"></div>
        ${t(c.label)}
      </div>
    `).join('')}
  `;
  document.getElementById('map').appendChild(el);
}

/* ── TRADUCTION DU PLACEHOLDER ET FILTRE ALL ────── */
function applyTranslations() {
  // Header
  if (CONFIG.header) {
    const titre = document.getElementById('header-titre');
    const soustitre = document.getElementById('header-soustitre');
    const droite = document.getElementById('header-right');
    if (titre)     titre.textContent     = t(CONFIG.header.titre);
    if (soustitre) soustitre.textContent = t(CONFIG.header.soustitre);
    if (droite)    droite.textContent    = t(CONFIG.header.droite);
  };

  // Placeholder
  document.querySelector('#detail-placeholder p').innerHTML =
    LANG === 'fr'
      ? '<strong>Clique sur un marqueur</strong> pour découvrir le lieu — tips de cycliste, infos culturelles, conseils pratiques et points de vigilance.'
      : '<strong>Click on a marker</strong> to discover the place — cycling tips, cultural info, practical advice and things to watch out for.';

  // Bouton "Tout afficher"
  const allBtn = document.querySelector('.filter-btn[data-cat="all"]');
  if (allBtn) allBtn.textContent = LANG === 'fr' ? 'Tout afficher' : 'Show all';
  
  // Traduit les boutons de filtre depuis CONFIG.categories
  CONFIG.categories.forEach(cat => {
  const btn = document.querySelector(`.filter-btn[data-cat="${cat.id}"]`);
  if (btn) {
    const emoji = btn.textContent.trim().split(' ')[0]; // garde l'emoji
    btn.textContent = emoji + ' ' + t(cat.label);
  }
});
}

applyTranslations();

/* ── CHARGEMENT DES DONNÉES ──────────────────────── */
fetch(CONFIG.pois)
  .then(r => r.json())
  .then(POIS => {

    POIS.forEach(poi => {
      const marker = L.marker([poi.lat, poi.lng], { icon: createMarkerIcon(poi) });
      marker.poi = poi;

      marker.bindPopup(`
        <div class="popup-cat">${CAT_LABELS[poi.categorie] || poi.categorie}</div>
        <div class="popup-title">${poi.emoji || ''} ${t(poi.nom)}</div>
        <div style="font-size:11px;color:#888;margin-top:2px">${poi.ville}</div>
      `, { maxWidth: 220, closeButton: false });

      marker.on('click',     ()          => showDetail(poi));
      marker.on('mouseover', function () { this.openPopup(); });
      marker.on('mouseout',  function () { this.closePopup(); });

      marker.addTo(map);
      allMarkers.push(marker);
    });

    buildLegende();
  })
  .catch(() => {
    document.getElementById('map').innerHTML =
      `<p style="padding:30px;color:#C0392B;font-family:sans-serif">
        ⚠️ Impossible de charger ${CONFIG.pois}.<br>
        Vérifie que le fichier est bien dans le même dossier que index.html.
      </p>`;
  });
