import './style.css';
import '../node_modules/leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import '../node_modules/leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet/dist/leaflet.css';
import { LatLngBounds } from 'leaflet';
import { debounce } from './debounce';
import { MapData, MapDataObject, globalMapData } from './global_map_data';

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
   <span>FOOD FARM MAP</span>
</div>
<div id="infobar">Info</div>
<div id="map"></div>
`;
const map = L.map('map').setView([0, 0], 3);
const moveMapToSavedPosition = () => {
  const c = JSON.parse(localStorage.center);
  const z = parseInt(localStorage.zoom);
  map.setView(c, z);
};
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

document.querySelector('.leaflet-control-attribution')!.innerHTML =
  document.querySelector('.leaflet-control-attribution')?.innerHTML
    ? '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" class="!text-link hover:!text-hover !no-underline transition-colors">OpenStreetMap</a> contributors'
    : '';

const updateInfo = (message = 'MAP IS READY') => {
  const infobar = document.getElementById('infobar');
  if (infobar) {
    document.getElementById('infobar')!.innerText = message;
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
