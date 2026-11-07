import fs from 'node:fs';
let s = fs.readFileSync('js/scene.js', 'utf8');
const start = s.indexOf('function buildGroundAndPaths() {');
const end = s.indexOf('function buildLotusPond()', start);
if (start < 0 || end < 0) throw Error('Missing ground anchors');
s = s.slice(0, start) + `function buildGroundAndPaths() {
  terrain = new THREE.Group();
  const texture = createTempleGrassTexture();
  texture.repeat.set(20, 24);
  groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(84, 100),
    new THREE.MeshStandardMaterial({ map: texture, color: 0x35533a, roughness: 1 }));
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -.025;
  groundPlane.receiveShadow = true;
  terrain.add(groundPlane);
  // Vòng dạo bộ quanh hồ, không để sân cũ hoặc bó vỉa cắt qua đệm thiền.
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 7, 64),
    new THREE.MeshStandardMaterial({ color: 0x92958a, roughness: .9 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, .07, 2.5);
  ring.receiveShadow = true;
  terrain.add(ring);
  scene.add(terrain);
}

` + s.slice(end);
s = s.replace('    const radius = key === \'pond\' ? 5.2 : 3.8;', "    const radius = key === 'pond' ? 5.2 : key === 'meditation' ? 16 : key === 'garden' ? 12 : 3.8;");
fs.writeFileSync('js/scene.js', s);
console.log('Removed obsolete overlapping courtyard and expanded meditation zone');
