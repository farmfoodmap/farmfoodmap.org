import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import fetch from 'node-fetch';

console.log(
  'Running script to fetch all the farm shops in the world!\nPlease be patient...'
);
try {
  const q = `[out:json];node[shop=farm](-90,-180,90,180);out body;>;out skel qt;`;
  const address =
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=' +
    encodeURIComponent(q);
  const r = await fetch(address);
  console.log('Response received. Now Processing...');
  const j = await r.json();
  const mapData = {};
  if (j.elements === undefined) {
    console.log('j :>> ', j);
  }
  j.elements.forEach((n) => {
    if (n.id && n.lat && n.lon && n.tags) {
      const p = {
        id: parseInt(n.id),
        lat: n.lat,
        lon: n.lon,
        tags: n.tags,
      };
      mapData[`id${p.id}`] = p;
    } else {
      console.log('n :>> ', n);
    }
  });
  const data = new Uint8Array(Buffer.from(JSON.stringify(mapData)));
  await writeFile('./src/globalData.json', data);
  console.log('Success!');
} catch (error) {
  console.error(`ERROR:>> `, error);
}
