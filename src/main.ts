import './style.css';
import '../node_modules/leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import '../node_modules/leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet/dist/leaflet.css';
import { LatLngBounds } from 'leaflet';
import { debounce } from './debounce';
import { MapData, MapDataObject, globalMapData } from './global_map_data';

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active');
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

// …

registerServiceWorker();

const mapData: MapDataObject = {};
// const L = window['L'];
const markers = L.markerClusterGroup();
const FFMM = L.icon({
  iconUrl: '/android-chrome-384x384.png',
  iconRetinaUrl: '/android-chrome-384x384.png',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, 0],
});
// import { setupMap } from './map';
let bounds: LatLngBounds;

/*

*/

document.querySelector<HTMLDivElement>('#app')!.innerHTML = /*html*/ `
<div id="heading">
   <img src="/android-chrome-384x384.png"/>
   <span>FARM FOOD MAP</span>
</div>
<div id="settings" onclick="()=>{}"><svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 483 483">
  <path d="M117 203c13-2 27 3 36 13l24 24 23-23-33-33a13 13 0 0 1 19-18l32 33 23-23-24-24c-9-10-14-23-12-36A102 102 0 0 0 88 1c-4 1-6 7-3 10l31 31c15 15 15 39 0 53l-19 19a37 37 0 0 1-53 0L13 84c-4-4-10-2-10 3a102 102 0 0 0 114 116zm192 41-23 23 135 134a13 13 0 0 1-18 19L268 285l-23 23 139 139a45 45 0 0 0 64-64L309 244z"/>
  <path d="M361 154h60l60-120-30-30-120 60v60L169 286l-30-29L21 375a63 63 0 1 0 89 89l118-118-30-30 163-162z"/>
</svg></div>
<div id="infoBar" class="hidden" onclick="()=>{}"><a href="https://twitter.com/farmfoodmap" target="_blank" noreferrer="true" tooltip="Visit our Twitter"><svg xmlns="http://www.w3.org/2000/svg" class="svg-social" id="svg-icon-twitter" viewBox="0 0 512 512">
<path d="M419.6 168.6c-11.7 5.2-24.2 8.7-37.4 10.2 13.4-8.1 23.8-20.8 28.6-36 -12.6 7.5-26.5 12.9-41.3 15.8 -11.9-12.6-28.8-20.6-47.5-20.6 -42 0-72.9 39.2-63.4 79.9 -54.1-2.7-102.1-28.6-134.2-68 -17 29.2-8.8 67.5 20.1 86.9 -10.7-0.3-20.7-3.3-29.5-8.1 -0.7 30.2 20.9 58.4 52.2 64.6 -9.2 2.5-19.2 3.1-29.4 1.1 8.3 25.9 32.3 44.7 60.8 45.2 -27.4 21.4-61.8 31-96.4 27 28.8 18.5 63 29.2 99.8 29.2 120.8 0 189.1-102.1 185-193.6C399.9 193.1 410.9 181.7 419.6 168.6z"
  />
</svg></a>&nbsp;&nbsp;&nbsp;<a href="https://github.com/farmfoodmap" target="_blank" noreferrer="true" tooltip="Visit our GitHub"><svg xmlns="http://www.w3.org/2000/svg" class="svg-social" id="svg-icon-github" viewBox="0 0 512 512">
<path d="M256 70.7c-102.6 0-185.9 83.2-185.9 185.9 0 82.1 53.3 151.8 127.1 176.4 9.3 1.7 12.3-4 12.3-8.9V389.4c-51.7 11.3-62.5-21.9-62.5-21.9 -8.4-21.5-20.6-27.2-20.6-27.2 -16.9-11.5 1.3-11.3 1.3-11.3 18.7 1.3 28.5 19.2 28.5 19.2 16.6 28.4 43.5 20.2 54.1 15.4 1.7-12 6.5-20.2 11.8-24.9 -41.3-4.7-84.7-20.6-84.7-91.9 0-20.3 7.3-36.9 19.2-49.9 -1.9-4.7-8.3-23.6 1.8-49.2 0 0 15.6-5 51.1 19.1 14.8-4.1 30.7-6.2 46.5-6.3 15.8 0.1 31.7 2.1 46.6 6.3 35.5-24 51.1-19.1 51.1-19.1 10.1 25.6 3.8 44.5 1.8 49.2 11.9 13 19.1 29.6 19.1 49.9 0 71.4-43.5 87.1-84.9 91.7 6.7 5.8 12.8 17.1 12.8 34.4 0 24.9 0 44.9 0 51 0 4.9 3 10.7 12.4 8.9 73.8-24.6 127-94.3 127-176.4C441.9 153.9 358.6 70.7 256 70.7z"/>
</svg></a><span id="installPrompt" style="display: none;" tooltip="Click to install"><svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 256 256" class="svg-social">
  <g stroke-miterlimit="10" stroke-width="0">
    <path d="M244 141c-9-3-9-11-9-13s0-10 9-14a17 17 0 0 0 9-22l-11-27c-4-9-14-13-23-9-8 3-14-2-16-4-1-1-6-7-3-16a17 17 0 0 0-9-22L164 3c-9-4-19 0-23 9-3 8-11 9-13 9s-10-1-14-9a17 17 0 0 0-22-9L65 14a17 17 0 0 0-9 22c3 9-2 15-4 16-1 2-7 7-16 4a17 17 0 0 0-22 9L3 92a17 17 0 0 0 9 22c8 4 9 12 9 14s-1 10-9 13c-9 4-13 14-9 23l11 27a17 17 0 0 0 22 9c9-3 15 2 16 3 2 2 7 8 4 16-4 9 0 19 9 23l27 11a17 17 0 0 0 22-9c4-9 12-9 14-9s10 0 13 9c4 8 14 13 23 9l27-11c9-4 13-14 9-23-3-8 2-14 3-16 2-1 8-6 16-3 9 4 19 0 23-9l11-27c4-9-1-19-9-23zm-116 59a72 72 0 1 1 0-144 72 72 0 0 1 0 144z"/>
    <path d="m128 173-6-3-28-28a8 8 0 1 1 12-12l22 22 22-22a8 8 0 1 1 12 12l-28 28-6 3z"/>
    <path d="M128 173c-5 0-9-4-9-9V91a8 8 0 1 1 17 0v73c0 5-3 9-8 9z"/>
  </g>
</svg></span><br><span id="statusText"></span></div>
<div id="myModal" class="modal">

  <!-- Modal content -->
  <div class="modal-content">
    <span id="modalClose">&times;</span>
    <p>Hi and thank you for visiting the Farm Food Map! This Web Application is designed to be installed onto your device for offline access.</p>
    <p>If you don't want to install the application yet, you are free to continue to use the online version by dismissing this. You can always return by clicking this icon below in the settings box (bottom left):</p>
    <p><svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 256 256" style="height: 2em;">
  <g stroke-miterlimit="10" stroke-width="0">
    <path d="M244 141c-9-3-9-11-9-13s0-10 9-14a17 17 0 0 0 9-22l-11-27c-4-9-14-13-23-9-8 3-14-2-16-4-1-1-6-7-3-16a17 17 0 0 0-9-22L164 3c-9-4-19 0-23 9-3 8-11 9-13 9s-10-1-14-9a17 17 0 0 0-22-9L65 14a17 17 0 0 0-9 22c3 9-2 15-4 16-1 2-7 7-16 4a17 17 0 0 0-22 9L3 92a17 17 0 0 0 9 22c8 4 9 12 9 14s-1 10-9 13c-9 4-13 14-9 23l11 27a17 17 0 0 0 22 9c9-3 15 2 16 3 2 2 7 8 4 16-4 9 0 19 9 23l27 11a17 17 0 0 0 22-9c4-9 12-9 14-9s10 0 13 9c4 8 14 13 23 9l27-11c9-4 13-14 9-23-3-8 2-14 3-16 2-1 8-6 16-3 9 4 19 0 23-9l11-27c4-9-1-19-9-23zm-116 59a72 72 0 1 1 0-144 72 72 0 0 1 0 144z"/>
    <path d="m128 173-6-3-28-28a8 8 0 1 1 12-12l22 22 22-22a8 8 0 1 1 12 12l-28 28-6 3z"/>
    <path d="M128 173c-5 0-9-4-9-9V91a8 8 0 1 1 17 0v73c0 5-3 9-8 9z"/>
  </g>
</svg></p>
    ${
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        ? '<p>iOS Install Notes: If you are on an iPhone or iPad, tap the sharing button at the bottom of the screen. This calls up the sharing panel. Among the options should be the "Add to Home Screen" option</p>'
        : '<button id="installButton">Install</button>'
    }
  </div>

</div>
<div id="map"></div>
`;

const settings = document.getElementById('settings');
const infoBar = document.getElementById('infoBar');
settings?.addEventListener('mouseenter', () => {
  settings.classList.add('hidden');
  infoBar?.classList.remove('hidden');
});
infoBar?.addEventListener('mouseleave', () => {
  infoBar.classList.add('hidden');
  settings?.classList.remove('hidden');
});

const mbAttr =
  'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
const mbUrl =
  'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});
const streets = L.tileLayer(mbUrl, {
  id: 'mapbox/streets-v11',
  tileSize: 512,
  zoomOffset: -1,
  attribution: mbAttr,
});
const satellite = L.tileLayer(mbUrl, {
  id: 'mapbox/satellite-v9',
  tileSize: 512,
  zoomOffset: -1,
  attribution: mbAttr,
});
const darkMatter = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  }
);
const cycle = L.tileLayer(
  'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
  {
    maxZoom: 20,
    attribution:
      '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
);
const railway = L.tileLayer(
  'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map style: &copy; <a href="https://www.OpenRailwayMap.org">OpenRailwayMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  }
);
const baseLayers = {
  OpenStreetMap: osm,
  Streets: streets,
  Satellite: satellite,
  Dark: darkMatter,
  Cycle: cycle,
  Railway: railway,
};

const map = L.map('map', {
  layers: [osm],
}).setView([0, 0], 3);
const moveMapToSavedPosition = () => {
  const c = JSON.parse(localStorage.center);
  const z = parseInt(localStorage.zoom);
  map.setView(c, z);
};
L.control.layers(baseLayers).addTo(map);

try {
  const s = location.search;
  if (s && s.includes('lat=') && s.includes('lng=') && s.includes('z=')) {
    // there is probably map coords in the params
    const p = new URLSearchParams(s);
    const lat = parseFloat(p.get('lat') || 'l');
    const lng = parseFloat(p.get('lng') || 'l');
    const z = parseInt(p.get('z') || 'z');
    if (isNaN(lat) || isNaN(lng) || isNaN(z)) {
      moveMapToSavedPosition();
    } else {
      map.setView({ lat, lng }, z);
    }
  } else {
    moveMapToSavedPosition();
  }
} catch (_) {}
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
map.addLayer(markers);

// setupCounter(document.querySelector<HTMLButtonElement>('#counter')!);
// const attributionBox = document.querySelector(
//   '.leaflet-bottom.leaflet-right>.leaflet-control-attribution'
// );
// attributionBox!.innerHTML = attributionBox?.innerHTML
//   ? '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" class="!text-link hover:!text-hover !no-underline transition-colors">OpenStreetMap</a> contributors'
//   : '';

const updateInfo = (message = 'MAP IS READY') => {
  const statusText = document.querySelector('#statusText');
  if (statusText) {
    statusText!.innerHTML = message;
  }
};
updateInfo();

const setBounds = debounce(() => {
  bounds = map.getBounds();
  const z = map.getZoom();
  const c = map.getCenter();
  localStorage.zoom = z;
  localStorage.center = JSON.stringify(c);
  localStorage.bounds = JSON.stringify(bounds);
  history.replaceState({}, '', `?lat=${c.lat}&lng=${c.lng}&z=${z}`);
  updateInfo('Map moved, processing...');
  fetchData();
}, 50);

const fetchData = debounce(() => {
  if (map.getZoom() < 8) {
    updateInfo();
    return;
  }
  updateInfo('Fetching latest data...');
  const q = `node[shop=farm](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});out;`;
  const address =
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=' +
    encodeURIComponent(q);
  fetch(address)
    // .then((r) => r.json())
    .then((t) => t.text())
    .then((j) => {
      updateInfo('Processing data...');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(j, 'text/xml');
      updateInfo('Updating markers');
      xmlDoc.querySelectorAll('node').forEach((n) => {
        const p: MapData = {
          id: parseInt(n.id),
          lat: n.getAttribute('lat') || 'ERROR',
          lon: n.getAttribute('lon') || 'ERROR',
          tags: {},
        };
        n.querySelectorAll('tag').forEach((tag) => {
          const key: string = tag.getAttribute('k') || 'ERROR';
          const value: string = tag.getAttribute('v') || 'ERROR';
          p.tags[key] = value;
        });
        const pid: string = `id${p.id}`;
        if (!mapData[pid]) {
          mapData[pid] = p;
          markerToMap(p);
        }
      });

      updateInfo();
    })
    .catch((e) => console.error('e :>> ', e));
}, 1000);

const formatPopup = (p: MapData): string => {
  const address = [];
  if (p?.tags['addr:housename']) address.push(p.tags['addr:housename']);
  if (p?.tags['addr:street']) address.push(p.tags['addr:street']);
  if (p?.tags['addr:city']) address.push(p.tags['addr:city']);
  if (p?.tags['addr:postcode']) address.push(p.tags['addr:postcode']);
  if (p?.tags['website'])
    address.push(
      `<a href="${p.tags['website']}" target="_blank">${p.tags['website']}</a>`
    );
  if (p?.tags['facebook'])
    address.push(`<a href="${p.tags['website']}" target="_blank">Facebook</a>`);
  let info = `<h4>${p?.tags.name || 'Unknown'}</h4>
        ${
          address.length ? `<small>${address.join('<br>')}</small><br><br>` : ''
        }
        ${Object.keys(p.tags)
          .filter((k) => {
            if (k.startsWith('addr')) return false;
            if (k === 'name') return false;
            if (k === 'shop') return false;
            if (k === 'website') return false;
            if (k === 'facebook') return false;
            return true;
          })
          .map((k) => {
            return `${k.replace('_', ' ')}: ${p.tags[k]}<br>`;
          })
          .join('')}<br><small>OSM Node ID: ${p.id}</small>`;
  return info;
};

const markerToMap = (p: MapData) => {
  const info = formatPopup(p);
  const thisMarker = L.marker([parseFloat(p.lat), parseFloat(p.lon)], {
    icon: FFMM,
  }).bindPopup(info);
  markers.addLayer(thisMarker);
};

const bulkMarkersToMap = (arr: MapData[]) => {
  const markerArr = arr.map((p) => {
    const info = formatPopup(p);
    const thisMarker = L.marker([parseFloat(p.lat), parseFloat(p.lon)], {
      icon: FFMM,
    }).bindPopup(info);
    return thisMarker;
  });
  markers.addLayers(markerArr);
  updateInfo();
};

setBounds();
map.on('moveend', setBounds);
map.on('zoomend', setBounds);

window.setTimeout(() => {
  Object.values(globalMapData).forEach((p: MapData) => {
    const pid: string = `id${p.id}`;
    if (Object.prototype.hasOwnProperty.call(globalMapData, pid)) {
      // const element: MapData = mapDataImport[pid];
      if (!mapData[pid]) {
        mapData[pid] = p;
        // markerToMap(p);
      }
    }
  });
  bulkMarkersToMap(Object.values(mapData));
}, 1000);

// Get the modal
const modal = document.getElementById('myModal');

// Get the <span> element that closes the modal
const closeButton = document.getElementById('modalClose') as HTMLElement;

// When the user clicks on <span> (x), close the modal
closeButton!.onclick = function () {
  modal!.style.display = 'none';
  localStorage.userInstallChoice = 'dismissed';
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal!.style.display = 'none';
    localStorage.userInstallChoice = 'dismissed';
  }
};

const installPromptButton = document.getElementById('installPrompt');

if (!localStorage.userInstallChoice) {
  localStorage.userInstallChoice = 'null';
}

const showInstallPromotion = () => {
  if (localStorage.userInstallChoice === 'accepted') {
    return;
  }
  console.log('showInstallPromotion');
  if (localStorage.userInstallChoice === 'null') {
    modal!.style.display = 'block';
  }
  installPromptButton!.style.display = 'block';
};

const hideInstallPromotion = () => {
  console.log('hideInstallPromotion');
  modal!.style.display = 'none';
  installPromptButton!.style.display = 'none';
};

installPromptButton!.onclick = () => {
  localStorage.userInstallChoice = 'null';
  showInstallPromotion();
};
/**
 * The BeforeInstallPromptEvent is fired at the Window.onbeforeinstallprompt handler
 * before a user is prompted to "install" a web site to a home screen on mobile.
 *
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// Initialize deferredPrompt for use later to show browser install prompt.
let deferredPrompt: BeforeInstallPromptEvent | null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  showInstallPromotion();
  // Optionally, send analytics event that PWA install promo was shown.
  console.log(`'beforeinstallprompt' event was fired.`);
});

window.addEventListener('appinstalled', () => {
  // Hide the app-provided install promotion
  hideInstallPromotion();
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  // Optionally, send analytics event to indicate successful install
  console.log('PWA was installed');
  localStorage.userInstallChoice = 'installed';
});

document
  .getElementById('installButton')
  ?.addEventListener('click', async () => {
    // Hide the app provided install promotion
    hideInstallPromotion();
    // Show the install prompt
    deferredPrompt!.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt!.userChoice;
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`);
    localStorage.userInstallChoice = outcome;
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
  });

// iOS install instructions
if (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
) {
  if (!localStorage.iOSLoaded) {
    localStorage.iOSLoaded = 1;
    showInstallPromotion();
  } else {
    installPromptButton!.style.display = 'block';
  }
}
