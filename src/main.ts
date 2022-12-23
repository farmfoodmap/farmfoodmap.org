import './style.css';
import '../node_modules/leaflet/dist/leaflet.css';
// import { setupCounter } from './counter';
import * as L from 'leaflet';
import '../node_modules/leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet/dist/leaflet.css';
import { LatLngBounds } from 'leaflet';
import { debounce } from './debounce';

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
let currentMarkers: L.Layer[] = [];
type MapData = {
  id: number;
  lat: string;
  lon: string;
  tags: {
    [key: string]: string;
  };
};

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
try {
  const c = JSON.parse(localStorage.center);
  const z = parseInt(localStorage.zoom);
  console.log('c :>> ', c);
  console.log('z :>> ', z);
  map.setView(c, z);
} catch (_) {}
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
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
  console.log('z :>> ', z);
  console.log('c :>> ', c);
  localStorage.zoom = z;
  localStorage.center = JSON.stringify(c);
  localStorage.bounds = JSON.stringify(bounds);
  updateInfo('Map moved, processing...');
  fetchData();
}, 50);

const fetchData = debounce(() => {
  if (map.getZoom() < 8) {
    updateInfo('Zoom in to load data');
    return;
  }
  updateInfo('Fetching latest data...');
  const q = `node[shop=farm](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});out;`;
  const address =
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=' +
    encodeURIComponent(q);
  // const address = encodeURI(
  //   `https://overpass.kumi.systems/api/interpreter?data=[out:json][timeout:25000];node["shop"="farm"](nwr(${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}););out body;>;out skel qt;`
  // );
  console.log('address :>> ', address);
  fetch(address)
    // .then((r) => r.json())
    .then((t) => t.text())
    .then((j) => {
      updateInfo('Processing data...');
      console.log('j :>> ', j);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(j, 'text/xml');
      updateInfo('Updating markers');
      markers.removeLayers(currentMarkers);
      currentMarkers = [];
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
        const address = [];
        if (p.tags['addr:housename']) address.push(p.tags['addr:housename']);
        if (p.tags['addr:street']) address.push(p.tags['addr:street']);
        if (p.tags['addr:city']) address.push(p.tags['addr:city']);
        if (p.tags['addr:postcode']) address.push(p.tags['addr:postcode']);
        if (p.tags['website'])
          address.push(
            `<a href="${p.tags['website']}" target="_blank">${p.tags['website']}</a>`
          );
        if (p.tags['facebook'])
          address.push(
            `<a href="${p.tags['website']}" target="_blank">Facebook</a>`
          );
        let info = `<h4>${p.tags.name || 'Unknown'}</h4>
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
        const thisMarker = L.marker([parseFloat(p.lat), parseFloat(p.lon)], {
          icon: FFMM,
        }).bindPopup(info);
        markers.addLayer(thisMarker);
        currentMarkers.push(thisMarker);
      });
      map.addLayer(markers);
      updateInfo();
    })
    .catch((e) => console.log('e :>> ', e));
}, 1000);

// ₷ 𝇟

setBounds();
map.on('moveend', setBounds);
map.on('zoomend', setBounds);

// let bounds = map.getBounds();

// console.log('bounds.getCenter() :>> ', bounds.getCenter());
