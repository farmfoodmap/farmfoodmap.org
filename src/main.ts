import './style.css';
import '../node_modules/leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import '../node_modules/leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet/dist/leaflet.css';
import { LatLngBounds } from 'leaflet';
import { debounce } from './debounce';
import { MapData, MapDataObject } from './MapTypes';
import globalMapData from './globalData.json';
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

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

registerServiceWorker();

const mapData: MapDataObject = {};
const markers = L.markerClusterGroup();
const FFMM = L.icon({
  iconUrl: '/android-chrome-192x192.png',
  iconRetinaUrl: '/android-chrome-192x192.png',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, 0],
});
let bounds: LatLngBounds;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = /*html*/ `
<section id="mapPage" class="pages">
  <div id="heading">
    <img src="/android-chrome-192x192.png" />
    <span>FARM FOOD MAP</span>
  </div>
  <div id="settings" class="custom-button" onclick="()=>{}"></div>
  <div id="infoBar" class="hidden" onclick="()=>{}"><a href="https://twitter.com/farmfoodmap" target="_blank" rel="noopener noreferrer" tooltip="Visit our Twitter"><svg xmlns="http://www.w3.org/2000/svg" class="svg-social"
        id="svg-icon-twitter" viewBox="0 0 512 512">
        <path
          d="M419.6 168.6c-11.7 5.2-24.2 8.7-37.4 10.2 13.4-8.1 23.8-20.8 28.6-36 -12.6 7.5-26.5 12.9-41.3 15.8 -11.9-12.6-28.8-20.6-47.5-20.6 -42 0-72.9 39.2-63.4 79.9 -54.1-2.7-102.1-28.6-134.2-68 -17 29.2-8.8 67.5 20.1 86.9 -10.7-0.3-20.7-3.3-29.5-8.1 -0.7 30.2 20.9 58.4 52.2 64.6 -9.2 2.5-19.2 3.1-29.4 1.1 8.3 25.9 32.3 44.7 60.8 45.2 -27.4 21.4-61.8 31-96.4 27 28.8 18.5 63 29.2 99.8 29.2 120.8 0 189.1-102.1 185-193.6C399.9 193.1 410.9 181.7 419.6 168.6z" />
      </svg></a>&nbsp;&nbsp;&nbsp;<a href="https://github.com/farmfoodmap" target="_blank" rel="noopener noreferrer"
      tooltip="Visit our GitHub"><svg xmlns="http://www.w3.org/2000/svg" class="svg-social" id="svg-icon-github"
        viewBox="0 0 512 512">
        <path
          d="M256 70.7c-102.6 0-185.9 83.2-185.9 185.9 0 82.1 53.3 151.8 127.1 176.4 9.3 1.7 12.3-4 12.3-8.9V389.4c-51.7 11.3-62.5-21.9-62.5-21.9 -8.4-21.5-20.6-27.2-20.6-27.2 -16.9-11.5 1.3-11.3 1.3-11.3 18.7 1.3 28.5 19.2 28.5 19.2 16.6 28.4 43.5 20.2 54.1 15.4 1.7-12 6.5-20.2 11.8-24.9 -41.3-4.7-84.7-20.6-84.7-91.9 0-20.3 7.3-36.9 19.2-49.9 -1.9-4.7-8.3-23.6 1.8-49.2 0 0 15.6-5 51.1 19.1 14.8-4.1 30.7-6.2 46.5-6.3 15.8 0.1 31.7 2.1 46.6 6.3 35.5-24 51.1-19.1 51.1-19.1 10.1 25.6 3.8 44.5 1.8 49.2 11.9 13 19.1 29.6 19.1 49.9 0 71.4-43.5 87.1-84.9 91.7 6.7 5.8 12.8 17.1 12.8 34.4 0 24.9 0 44.9 0 51 0 4.9 3 10.7 12.4 8.9 73.8-24.6 127-94.3 127-176.4C441.9 153.9 358.6 70.7 256 70.7z" />
      </svg></a><span id="installPrompt" style="display: none;" tooltip="Click to install"><svg
        xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 256 256" class="svg-social">
        <g stroke-miterlimit="10" stroke-width="0">
          <path
            d="M244 141c-9-3-9-11-9-13s0-10 9-14a17 17 0 0 0 9-22l-11-27c-4-9-14-13-23-9-8 3-14-2-16-4-1-1-6-7-3-16a17 17 0 0 0-9-22L164 3c-9-4-19 0-23 9-3 8-11 9-13 9s-10-1-14-9a17 17 0 0 0-22-9L65 14a17 17 0 0 0-9 22c3 9-2 15-4 16-1 2-7 7-16 4a17 17 0 0 0-22 9L3 92a17 17 0 0 0 9 22c8 4 9 12 9 14s-1 10-9 13c-9 4-13 14-9 23l11 27a17 17 0 0 0 22 9c9-3 15 2 16 3 2 2 7 8 4 16-4 9 0 19 9 23l27 11a17 17 0 0 0 22-9c4-9 12-9 14-9s10 0 13 9c4 8 14 13 23 9l27-11c9-4 13-14 9-23-3-8 2-14 3-16 2-1 8-6 16-3 9 4 19 0 23-9l11-27c4-9-1-19-9-23zm-116 59a72 72 0 1 1 0-144 72 72 0 0 1 0 144z" />
          <path d="m128 173-6-3-28-28a8 8 0 1 1 12-12l22 22 22-22a8 8 0 1 1 12 12l-28 28-6 3z" />
          <path d="M128 173c-5 0-9-4-9-9V91a8 8 0 1 1 17 0v73c0 5-3 9-8 9z" />
        </g>
      </svg></span><br><a id="aboutLink">About</a><br><span id="statusText"></span></div>
  <div id="addLocation">Add a new location to the map by clicking on its location</div>
  <div id="myModal" class="modal">

    <div class="modal-content">
      <span id="modalClose">&times;</span>
      <p>Hi and thank you for visiting the Farm Food Map! This Web Application is designed to be installed onto your
        device for offline access.</p>
      <p>If you don't want to install the application yet, you are free to continue to use the online version by
        dismissing this. You can always return by clicking this icon below in the settings box (bottom left):</p>
      <p><svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 256 256"
          style="height: 2em;fill: var(--color-text);">
          <g stroke-miterlimit="10" stroke-width="0">
            <path
              d="M244 141c-9-3-9-11-9-13s0-10 9-14a17 17 0 0 0 9-22l-11-27c-4-9-14-13-23-9-8 3-14-2-16-4-1-1-6-7-3-16a17 17 0 0 0-9-22L164 3c-9-4-19 0-23 9-3 8-11 9-13 9s-10-1-14-9a17 17 0 0 0-22-9L65 14a17 17 0 0 0-9 22c3 9-2 15-4 16-1 2-7 7-16 4a17 17 0 0 0-22 9L3 92a17 17 0 0 0 9 22c8 4 9 12 9 14s-1 10-9 13c-9 4-13 14-9 23l11 27a17 17 0 0 0 22 9c9-3 15 2 16 3 2 2 7 8 4 16-4 9 0 19 9 23l27 11a17 17 0 0 0 22-9c4-9 12-9 14-9s10 0 13 9c4 8 14 13 23 9l27-11c9-4 13-14 9-23-3-8 2-14 3-16 2-1 8-6 16-3 9 4 19 0 23-9l11-27c4-9-1-19-9-23zm-116 59a72 72 0 1 1 0-144 72 72 0 0 1 0 144z" />
            <path d="m128 173-6-3-28-28a8 8 0 1 1 12-12l22 22 22-22a8 8 0 1 1 12 12l-28 28-6 3z" />
            <path d="M128 173c-5 0-9-4-9-9V91a8 8 0 1 1 17 0v73c0 5-3 9-8 9z" />
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
</section>
<section id="aboutPage" class="pages hidden">
  <span class="backToMap">
    Back to the map
  </span>
  <article>
    <h1>ABOUT</h1>
    <p>Contribute to the worlds largest, borderless, farm food map - built on local open data.</p>
    <ol>
      <li>Discover local farmers at <a href="https://farmfoodmap.org" target="_blank" noreferrer noopener>farmfoodmap.org</a></li>
      <li>Shake your farmers hand & eat local</li>
      <li>Add/edit/verify local listings</li>
    </ol>
    <p>Growing local circular economies - globally. Mapping where to buy real food, direct from independent farmers, food producers, farm shops, growers, farmers markets & co-ops.</p>
    <p>Our mission is to provide access to this valuable, free and open data, fully editable by users, on beautiful open source mobile web apps. Core to our mission is simplifying your ability to add/edit & verify local farmers & food producers.</p>
    <p>Follow us on <a href="https://www.twitter.com/farmfoodmap" target="_blank" noreferrer noopener>Twitter @farmfoodmap</a> and <a href="https://www.instagram.com/farmfoodmap" target="_blank" noreferrer noopener>Instagram @farmfoodmap</a></p>
    </p>
  </article>
</section>
<section id="mapEditPage" class="pages hidden">
  <span class="backToMap">
    Back to the map
  </span>
  <article>
    <h1>Editing the map</h1>
    <p>
      You will be directed to Open Street Map Editing tool which you can use to make changes to the map. Please follow
      their rules and guidelines in order to have the most accurate information represented for everyone. We recommend
      taking the brief tutorial, called the "Walkthrough" on how the editor works.
    </p>
    <p>
      There are a few important things for you to know in order for your map edits to register on the farmfoodmap.org
      map:
    </p>
    <ul>
      <li>Farm Food Map only displays "points" (AKA "nodes"), so make sure that you only edit points.</li>
      <li>There is a form to input some standard things, like "Feature Type", "Name", "Address", "Hours" etc. As you
        fill the form in, "Tags" will be added for each form field. Tags are where the information is stored and that is
        where Farm Food Map looks for information to present to users. you may add fields to the form but only the
        fields below will be listed on the map.</li>
      <li>In order for a place to appear on Farm Food Map, it must include the tag <code>shop</code> set to
        <code>farm</code>. This tag can be added by setting the Feature Type to "Farm Shop" or by expanding the tags
        section and manually adding tags there.</li>
      <li>Where a tag may have multiple values, please separate them with a semicolon and space ("<code>; </code>"), for
        example: <code>produce</code>: <code>beef; lamb; milk</code> or <code>opening_hours</code>: <code>Mo-Fr 09:00-17:00; Sa-Su 10:00-17:00</code></li>
      <li>You may have noticed that <code>opening_hours</code> was separated by an underscore (<code>_</code>). That is because tag keys
        should not contain spaces.</li>
    </ul>
    <p>
      These are the only tags that Farm Food Map displays currently:
    </p>
    <p>
      For more information, see the <a href="https://wiki.openstreetmap.org/wiki/Main_Page" target="_blank" rel="noopener noreferrer">Open Street
        Map Wiki</a>.
    </p>
    <h2><code>shop</code></h2>
    <p>
      <strong>MUST</strong> be set to <code>farm</code>. This is required to appear on the map.
    </p>
    <h2><code>name</code></h2>
    <p>
      Please add the name of the location.
    </p>
    <h2><code>addr:*</code></h2>
    <p>
      Tags relating to each part of the address, like <code>addr:housename</code>, <code>addr:housenumber</code>,
      <code>addr:floor</code>, <code>addr:street</code>, <code>addr:suburb</code>, <code>addr:city</code>,
      <code>addr:state</code>, <code>addr:province</code>, <code>addr:postcode</code>, <code>addr:country</code>. Use
      only ones that apply. <a href="https://wiki.openstreetmap.org/wiki/Key:addr:*" target="_blank"
        rel="noopener noreferrer">Wiki</a>
    </p>
    <h2><code>opening_hours</code></h2>
    <p>
      What hours is the location open represented by either a url to the opening hours on the location's website, or text,
      for example: <code>Mo-Sa 09:00-17:00; Sa-Su 10:00-17:00</code>. <strong>Note:</strong> Days are represented by
      the first two letters and times are in 24 hour format with a leading zero (<code>09:00</code>
      <strong>NOT</strong> <code>9:00</code>). For more information on more complicated opening hours, please see the
      <a href="https://wiki.openstreetmap.org/wiki/Key:opening_hours" target="_blank" rel="noopener noreferrer">wiki</a>
    </p>
    <h2><code>payment:*</code></h2>
    <p>
      This group of tags describes which payment methods are available and are indicated with a <code>yes</code>,
      <code>no</code>, <code>only</code> or an <em>Interval</em> value (in the same format as <code>opening_hours</code> if,
      for example, cards are only accepted during office hours). Furthermore, "payment:cash" set to "no" means
      that you cannot pay with cash. These are a few very generic tags. If possible, they should be replaced by more
      specific ones which are listed in the
      <a href="https://wiki.openstreetmap.org/wiki/Key:payment:*" target="_blank" rel="noopener noreferrer">wiki</a>.
      E.g. payment:cards=* is less specific than payment:credit_cards=* which in turn is less specific than e.g.
      payment:mastercard=*. Many of these tags are especially useful to express that a whole group of payment options
      is not
      accepted, like payment:cards=no. <strong>NOTE:</strong> If a location accepts other currencies, like <a
        href="https://bitcoin.org" target="_blank" rel="noopener noreferrer">Bitcoin</a>, please don't select it from
      the list in the form, as it is an outdated way of indicating this, rather use <code>currency:XBT</code> set to
      <code>yes</code>. There are tags for payment methods for Bitcoin and we ask that you use these if they apply:
      <code>payment:onchain</code> <code>payment:lightning</code> <code>payment:lightning_contactless</code>
    </p>
    <h2><code>organic</code></h2>
    <p>
      Do they sell organic products? Possible values are <code>yes</code>, <code>no</code> or <code>only</code>. <a
        href="https://wiki.openstreetmap.org/wiki/Key:organic" target="_blank" rel="noopener noreferrer">wiki</a>
    </p>
    <h2><code>phone</code></h2>
    <p>
      The telephone number with international dialing code, see the <a
        href="https://wiki.openstreetmap.org/wiki/Key:phone" target="_blank" rel="noopener noreferrer">wiki</a> for more
      details.
    </p>
    <h2><code>website</code></h2>
    <p>
      This is for the location's website only. For Wikipedia links, please use the <code>wikipedia</code> tag. For
      social media links, please use the <code>contact:*</code> tag (see below) Please only include https links,
      without any tracking parameters. See the <a href="https://wiki.openstreetmap.org/wiki/Key:website" target="_blank"
        rel="noopener noreferrer">wiki</a> for more information.
    </p>
    <h2><code>email</code></h2>
    <p>
      The public email address of the location, see the <a href="https://wiki.openstreetmap.org/wiki/Key:email"
        target="_blank" rel="noopener noreferrer">wiki</a> for more details.
    </p>
    <h2><code>contact:*</code></h2>
    <p>
      Please use this for all social media contacts, for example <code>contact:twitter</code> set to
      <code>https://twitter.com/farmfoodmap</code> (without and tracking parameters). See the <a
        href="https://wiki.openstreetmap.org/wiki/Key:contact:*" target="_blank" rel="noopener noreferrer">wiki</a>
      for a full list.
    </p>
    <h2><code>produce / product</code></h2>
    <p>
      A guide by example. If the whole live animal/fish or plant is sold from the farm then tag it as <code>produce=*</code>.
      If it is
      killed and then sold with little processing then that is OK for tagging as produce. If the processing is
      'extensive'
      then it is a <code>product=*</code> not produce, so it should use the <code>product=*</code> key. Fuzzy like life. Use your judgement. If
      the output of the feature is is man made or manufactured in a factory or part of industrial production the
      <code>product=*</code>
      tag should be used. Some examples for <code>produce</code> are
      <code>vegetables; fruit; beef; lamb; pork; game; fruits; eggs; poultry; dairy; fish; honey</code> and some
      examples for <code>product</code> are things like
      <code>cider; beer; wine; olive oil; preserves; cream; butter; tallow; stock; sausages; biltong; jerky; leather goods;</code>.
      <strong>Note:</strong> This is only a distinction for OSM, both categories will be grouped together on Farm Food Map. See the <a href="https://wiki.openstreetmap.org/wiki/Key:produce" target="_blank" rel="noopener noreferrer">wiki</a> for more information.
    </p>
    <h2><code>description</code></h2>
    <p>
      This is a free text field where you can write a sentence or two about the location. It must be objective and not
      an opinion or an advert. Some suggestions to include might be things like "regenerative", "free range", "home
      delivery", "online ordering", "tours" and "visitors".
    </p>
    <h2>Lastly...</h2>
    <p>
      There are two more tags that can be used to help show how recent the information is (although it is not currently displayed on the map): <code>survey:date</code> should be used when you have physically visited the location and <code>check_date</code> should be used when the location has been verified with local knowledge or extrapolation. Both of these tags require the date in ISO format: <code>yyyy-mm-dd</code>.
    </p>
    </article>
    <p>
      <a href="" target="_blank" rel="noopener noreferrer" id="editorLink">I understand, take me to the editor!</a>
    </p>
</section>
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
let isInAddMode = false;
const customControl = L.Control.extend({
  options: {
    position: 'topleft',
  },

  onAdd: function (_map: L.Map) {
    const addControlDiv = L.DomUtil.create('div');
    addControlDiv.style.border = 'none';

    const newLocationButton = L.DomUtil.create('input');
    newLocationButton.type = 'button';
    newLocationButton.title = 'Add a new location to the map';
    newLocationButton.className =
      'leaflet-bar-part leaflet-bar-part-single custom-button';
    newLocationButton.style.background = `url(/icons/marker.svg) center no-repeat, #fff`;

    newLocationButton.onmouseover = function () {
      newLocationButton.style.background = `url(/icons/marker-black.svg) center no-repeat, #fff`;
    };
    newLocationButton.onmouseout = function () {
      newLocationButton.style.background = `url(/icons/marker.svg) center no-repeat, #fff`;
    };

    newLocationButton.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      const mapElement = document.getElementById('map');
      const addLocation = document.getElementById('addLocation');
      if (typeof mapElement !== null) {
        if (isInAddMode) {
          mapElement!.style.cursor = 'pointer';
          addLocation!.style.display = 'none';
        } else {
          mapElement!.style.cursor = 'crosshair';
          addLocation!.style.display = 'block';
        }
      }
      isInAddMode = !isInAddMode;
    };
    addControlDiv.append(newLocationButton);
    return addControlDiv;
  },
});

map.addControl(new customControl());

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
  const q = `[out:json];node[shop=farm](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});out body;>;out skel qt;`;
  const address =
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=' +
    encodeURIComponent(q);
  fetch(address)
    .then((r) => r.json())
    // .then((t) => t.text())
    .then((j) => {
      updateInfo('Processing data...');
      updateInfo('Updating markers');
      j?.elements.forEach((n: MapData) => {
        const p: MapData = {
          id: n.id,
          lat: n.lat,
          lon: n.lon,
          tags: n.tags,
        };
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
  if (p?.tags['addr:housenumber']) address.push(p.tags['addr:housenumber']);
  if (p?.tags['addr:floor']) address.push(p.tags['addr:floor']);
  if (p?.tags['addr:street']) address.push(p.tags['addr:street']);
  if (p?.tags['addr:suburb']) address.push(p.tags['addr:suburb']);
  if (p?.tags['addr:city']) address.push(p.tags['addr:city']);
  if (p?.tags['addr:state']) address.push(p.tags['addr:state']);
  if (p?.tags['addr:province']) address.push(p.tags['addr:province']);
  if (p?.tags['addr:postcode']) address.push(p.tags['addr:postcode']);
  if (p?.tags['addr:country']) address.push(p.tags['addr:country']);
  if (p?.tags['website'])
    address.push(
      `<a href="${p.tags['website']}" target="_blank" rel="noopener noreferrer">${p.tags['website']}</a>`
    );
  if (p?.tags['email'])
    address.push(
      `<a href="mailto:${p.tags['email']}" target="_blank" rel="noopener noreferrer">${p.tags['email']}</a>`
    );
  if (p?.tags['phone'])
    address.push(`<a href="tel:${p.tags['phone']}">${p.tags['phone']}</a>`);
  const capitalize = (word: string) =>
    word.charAt(0).toUpperCase() + word.slice(1);
  const joiner = new Intl.ListFormat('en', {
    style: 'long',
    type: 'conjunction',
  });
  p.tags.products = '';
  let info = `<h4>${p?.tags.name || 'Unknown Name'}</h4>
        ${
          address.length ? `<small>${address.join('<br>')}</small><br><br>` : ''
        }
        ${Object.keys(p.tags)
          .filter((k) => {
            if (k.startsWith('contact:')) return true;
            if (k.startsWith('payment:')) return true;
            if (k === 'organic') return true;
            if (k === 'description') return true;
            if (k === 'produce' || k === 'product') {
              p.tags.products = p.tags.products
                ? `${p.tags.products};${p.tags[k]}`
                : p.tags[k];
              return false;
            }
            if (k === 'currency:XBT') return true;
            return false;
          })
          .concat(['products'])
          .map((k) => {
            return p.tags[k]
              ? `<strong>${capitalize(
                  k
                    .replace('_', ' ')
                    .replace(':', ' with ')
                    .replace('currency:XBT', 'Bitcoin accepted')
                )}</strong>: ${joiner.format(
                  capitalize(p.tags[k])
                    .split(';')
                    .map((w) => w.trim())
                )}<br>`
              : '';
          })
          .join('')}<br><button onclick="editMap('${p.id}')">Edit</button>`;
  return info;
};

const markerToMap = (p: MapData) => {
  const info = formatPopup(p);
  const thisMarker = L.marker([p.lat, p.lon], {
    icon: FFMM,
  }).bindPopup(info);
  markers.addLayer(thisMarker);
};

const bulkMarkersToMap = (arr: MapData[]) => {
  const markerArr = arr.map((p) => {
    const info = formatPopup(p);
    const thisMarker = L.marker([p.lat, p.lon], {
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
      if (!mapData[pid]) {
        mapData[pid] = p;
      }
    }
  });
  bulkMarkersToMap(Object.values(mapData));
}, 1000);

const modal = document.getElementById('myModal');
const closeButton = document.getElementById('modalClose') as HTMLElement;

closeButton!.onclick = function () {
  modal!.style.display = 'none';
  localStorage.userInstallChoice = 'dismissed';
};

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
  if (localStorage.userInstallChoice === 'null') {
    modal!.style.display = 'block';
  }
  installPromptButton!.style.display = 'block';
};

const hideInstallPromotion = () => {
  modal!.style.display = 'none';
  installPromptButton!.style.display = 'none';
};

installPromptButton!.onclick = () => {
  localStorage.userInstallChoice = 'null';
  showInstallPromotion();
};

let deferredPrompt: BeforeInstallPromptEvent | null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPromotion();
});

window.addEventListener('appinstalled', () => {
  hideInstallPromotion();
  deferredPrompt = null;
  localStorage.userInstallChoice = 'installed';
});

document
  .getElementById('installButton')
  ?.addEventListener('click', async () => {
    hideInstallPromotion();
    deferredPrompt!.prompt();
    const { outcome } = await deferredPrompt!.userChoice;
    localStorage.userInstallChoice = outcome;
    deferredPrompt = null;
  });

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
declare global {
  interface Window {
    editMap: Function;
  }
}
window.editMap = (nodeId = '') => {
  document.querySelectorAll('.pages').forEach((p) => {
    p.classList.add('hidden');
  });
  const c = JSON.parse(localStorage.center);
  document.getElementById('mapEditPage')?.classList.remove('hidden');
  document
    .getElementById('editorLink')
    ?.setAttribute(
      'href',
      nodeId
        ? `https://www.openstreetmap.org/edit?node=${nodeId}#map=${parseInt(
            localStorage.zoom
          )}/${parseFloat(c.lat).toFixed(5)}/${parseFloat(c.lng).toFixed(5)}`
        : `https://www.openstreetmap.org/edit?#map=${parseInt(
            localStorage.zoom
          )}/${parseFloat(c.lat).toFixed(5)}/${parseFloat(c.lng).toFixed(5)}`
    );
};

const backToMap = () => {
  document.querySelectorAll('.pages').forEach((p) => {
    p.classList.add('hidden');
  });
  document.getElementById('mapPage')?.classList.remove('hidden');
};

document.getElementById('aboutLink')?.addEventListener('click', () => {
  document.querySelectorAll('.pages').forEach((p) => {
    p.classList.add('hidden');
  });
  document.getElementById('aboutPage')?.classList.remove('hidden');
});

document.querySelectorAll('.backToMap').forEach((b) => {
  b.addEventListener('click', backToMap);
});

map.addEventListener('click', (event: L.LeafletMouseEvent) => {
  if (isInAddMode) {
    document.getElementById('map')!.style.cursor = 'pointer';
    document.getElementById('addLocation')!.style.display = 'none';
    isInAddMode = false;
    document.querySelectorAll('.pages').forEach((p) => {
      p.classList.add('hidden');
    });
    document.getElementById('mapEditPage')?.classList.remove('hidden');
    document
      .getElementById('editorLink')
      ?.setAttribute(
        'href',
        `https://www.openstreetmap.org/edit?#map=${parseInt(
          localStorage.zoom
        )}/${event.latlng.lat.toFixed(5)}/${event.latlng.lng.toFixed(5)}`
      );
  }
});
