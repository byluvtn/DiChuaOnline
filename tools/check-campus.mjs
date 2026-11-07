import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = url(fs.readFileSync('js/three.module.js', 'utf8'));
const gradient = { addColorStop() { } };
const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => gradient : () => { }, set: () => true });
globalThis.document = { createElement: () => ({ getContext: () => context }) };
const glowURL = url(fs.readFileSync('js/glow.js', 'utf8').replace("'./three.module.js'", JSON.stringify(threeURL)));
const load = path => import(url(fs.readFileSync(path, 'utf8')
    .replace("'./three.module.js'", JSON.stringify(threeURL))
    .replace("'./glow.js'", JSON.stringify(glowURL))));
const THREE = await import(threeURL);
const { buildCampus, SEAT_LAYOUT, CAMPUS_BOUNDS } = await load('js/campus.js');
assert.equal(SEAT_LAYOUT.length, 120);
assert.equal(new Set(SEAT_LAYOUT.map(p => `${p.x},${p.z}`)).size, 120);
for (const p of SEAT_LAYOUT) {
    assert.ok(Math.abs(p.x) < CAMPUS_BOUNDS.x);
    assert.ok(p.z >= CAMPUS_BOUNDS.minZ && p.z <= CAMPUS_BOUNDS.maxZ);
    assert.ok(Math.abs(p.x) > 3, 'Central aisle remains clear');
}
const scene = new THREE.Scene();
const seats = buildCampus(scene);
assert.equal(seats.length, 120);
assert.equal(scene.children.length, 1);
assert.equal(seats[119].userData.seatIndex, 119);
const { createChibi, createCharacter, switchCharacter, updateCharacter, normalizeCharacterType, poseChibi, disposeCharacter } = await load('js/characters.js');
for (const type of ['novice', 'male', 'female', 'chutieu', 'sunam', 'sunu']) {
    const character = createChibi({ type });
    assert.equal(character.userData.type, type);
    const u = character.userData;
    assert.equal(u.classType, normalizeCharacterType(type));
    for (const part of [u.head, u.armL, u.armR, u.legL, u.legR]) assert.equal(part.parent, u.body);
    character.rotation.y = .75;
    u.isMoving = true;
    for (let i = 0; i < 60; i++) updateCharacter(character, 1 / 60);
    assert.ok(Math.abs(u.armL.rotation.x) > .01);
    assert.ok(u.body.position.y >= 0 && u.body.position.y <= .06);
    assert.equal(character.rotation.y, .75);
    u.isMoving = false;
    for (let i = 0; i < 180; i++) updateCharacter(character, 1 / 60);
    assert.ok(Math.abs(u.legL.rotation.x) < .001);
    poseChibi(character, true);
    for (let i = 0; i < 60; i++) updateCharacter(character, 1 / 60);
    assert.ok(Math.abs(u.armL.rotation.x + .72) < .001);
    assert.equal(character.userData.seated, true);
    assert.equal(character.userData.legL.visible, false);
    assert.equal(character.userData.foldedLegs.visible, true);
    poseChibi(character, false);
    assert.equal(character.userData.legL.visible, true);
    assert.equal(character.scale.y, 1);
    character.traverse(node => {
        if (!node.geometry) return;
        for (const value of node.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    });
    disposeCharacter(character);
}
const player = createCharacter('chutieu', { isSelf: true });
scene.add(player);
player.position.set(2, .29, 3);
player.rotation.y = 1.2;
const preview = createCharacter('sunu');
let disposedGeometry = 0;
player.userData.bodyMesh.geometry.addEventListener('dispose', () => disposedGeometry++);
for (const type of ['sunam', 'sunu', 'chutieu']) {
    assert.equal(switchCharacter(type), player);
    assert.equal(player.parent, scene);
    assert.equal(player.position.x, 2);
    assert.equal(player.rotation.y, 1.2);
    assert.equal(player.userData.classType, type);
    updateCharacter(1 / 60, true);
    assert.ok(player.userData.walkTime > 0);
    assert.equal(preview.userData.walkTime, 0);
}
assert.equal(disposedGeometry, 1);
poseChibi(player, true);
switchCharacter('sunam');
assert.equal(player.userData.seated, true);
assert.equal(player.userData.foldedLegs.visible, true);
for (const dt of [NaN, Infinity, -1, 100]) updateCharacter(player, dt);
assert.ok(Number.isFinite(player.userData.body.position.y));
disposeCharacter(player);
disposeCharacter(preview);
assert.equal(normalizeCharacterType('constructor'), 'chutieu');
const storage = fs.readFileSync('js/storage.js', 'utf8').replace(/export /g, '');
for (const [saved, expected] of [['novice', 'chutieu'], ['male', 'sunam'], ['female', 'sunu'], ['chutieu', 'chutieu'], ['sunam', 'sunam'], ['sunu', 'sunu'], ['invalid', 'chutieu'], ['constructor', 'chutieu'], [null, 'chutieu']]) {
    const sandbox = { localStorage: { getItem: () => JSON.stringify({ avatar: saved }) }, structuredClone, Date };
    vm.createContext(sandbox);
    vm.runInContext(storage + '\nresult = load();', sandbox);
    assert.equal(sandbox.result.avatar, expected);
}
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes('./js/campus.js') && sw.includes('./js/characters.js'));
const source = fs.readFileSync('js/scene.js', 'utf8');
assert.ok(source.includes('raycaster.intersectObjects(meditationSeats)'));
assert.ok(source.includes('onZoneChangeCallback(currentZone?.key, currentZone)'));
assert.ok(source.includes('player = createCharacter(selectedAvatar, { isSelf: true })'));
assert.ok(!source.includes('populateCourtyardCrowd'));
assert.ok(!source.includes('onlineMonks.push('), 'No decorative NPC spawning');
assert.ok(source.includes('hall.add(cushion)'), 'Hall cushions remain');
assert.ok(sw.includes('niemphat-v7-offline'));
assert.ok(sw.includes("cache: 'reload'"));
assert.ok(sw.includes('./js/minimap.js'));

// Execute the actual game-loop function with the real character rig (no WebGL needed).
const gamePlayer = createCharacter('chutieu', { isSelf: true });
const input = {};
const game = {
    THREE, player: gamePlayer, keysDown: input, joystickVector: { x: 0, y: 0 },
    targetPosition: null, pendingSeat: null, camYaw: 0, camDistance: 17, camPitch: .52,
    playerSpeed: 4.2, CAMPUS_BOUNDS, camera: new THREE.PerspectiveCamera(),
    clock: { getElapsedTime: () => 1 }, isChanting: false, clickMarker: null,
    lanternsInPond: [], poseChibi, updateCharacter,
    standUp: () => { if (gamePlayer.userData.seated) poseChibi(gamePlayer, false); },
    updateGlowPulses: () => { }, checkPlayerZone: () => { }
};
Object.assign(game, {
    scene: new THREE.Scene(), document: globalThis.document,
    terrainMeshes: [], pondLeaves: [], bridgeLights: [], lotusMaterials: [],
    terrainRaycaster: new THREE.Raycaster(), terrainOrigin: new THREE.Vector3(),
    terrainDown: new THREE.Vector3(0, -1, 0),
    createGlowSprite: () => new THREE.Object3D()
});
vm.createContext(game);
vm.runInContext(source.slice(source.indexOf('function registerWalkable('), source.indexOf('let onlineMonks')), game);
vm.runInContext(source.slice(source.indexOf('function buildLotusPond()'), source.indexOf('/* ========================================================', source.indexOf('function createLotusMesh('))), game);
game.buildLotusPond();
buildCampus(game.scene, game.registerWalkable);
game.scene.updateMatrixWorld(true);
assert.equal(game.bridgeLights.length, 4);
const bridge = game.scene.getObjectByName('Arched ironwood bridge');
bridge.traverse(object => {
    if (object.isMesh) assert.ok(object.castShadow && object.receiveShadow);
});
assert.equal(game.terrainMeshes.filter(mesh => mesh.name === 'Bridge plank').length, 40);
// Check every seam, the translated pond group, and the full width of the deck.
for (const x of [-0.7, 0, 0.7]) {
    for (let i = 0; i <= 400; i++) {
        const z = -4.699 + 9.398 * i / 400;
        gamePlayer.position.set(x, 0, z + 2.5);
        game.groundPlayer(0, true);
        const expected = .16 + .74 * Math.cos(z / 9.4 * Math.PI);
        assert.ok(Math.abs(gamePlayer.position.y - expected) < .002, `Deck support at ${x}, ${z}`);
    }
}
gamePlayer.position.set(0, 0, 2.5);
game.groundPlayer(1 / 60);
assert.ok(Math.abs(gamePlayer.position.y - .225) < .001, 'Height interpolation is 0.25 at 60 FPS');
game.groundPlayer(0, true);
assert.ok(Math.abs(gamePlayer.position.y - .9) < .001, 'Teleport snaps to bridge crown');
poseChibi(gamePlayer, true);
gamePlayer.position.y = .29;
game.groundPlayer(1);
assert.equal(gamePlayer.position.y, .29, 'Grounding preserves seated height');
poseChibi(gamePlayer, false);
game.updatePondEffects(1);
assert.ok(game.pondLeaves.every(({ mesh, baseY }) => Math.abs(mesh.position.y - baseY) <= .008));
assert.ok(game.bridgeLights.every(({ light }) => light.intensity > 1.3 && light.intensity < 1.7));
gamePlayer.position.set(0, 0, -5);
const loop = source.slice(source.indexOf('function updateGame(dt)'), source.indexOf('function checkPlayerZone()'));
vm.runInContext(loop, game);
poseChibi(gamePlayer, true);
input.KeyW = true;
game.updateGame(1 / 60);
assert.equal(gamePlayer.userData.seated, false);
assert.equal(gamePlayer.userData.isMoving, true, 'Walking starts on the first frame after standing');
const startZ = gamePlayer.position.z;
for (let i = 0; i < 20; i++) game.updateGame(1 / 60);
assert.ok(gamePlayer.position.z < startZ);
assert.ok(Math.abs(gamePlayer.userData.legL.rotation.x) > .05);
input.KeyW = false;
for (let i = 0; i < 180; i++) game.updateGame(1 / 60);
assert.equal(gamePlayer.userData.isMoving, false);
assert.ok(Math.abs(gamePlayer.userData.legL.rotation.x) < .001);
game.joystickVector.x = 1;
game.updateGame(1 / 60);
assert.equal(gamePlayer.userData.isMoving, true);
game.joystickVector.x = 0;
game.updateGame(1 / 60);
assert.equal(gamePlayer.userData.isMoving, false);
game.targetPosition = gamePlayer.position.clone().add(new THREE.Vector3(1, 0, 0));
game.updateGame(1 / 60);
assert.equal(gamePlayer.userData.isMoving, true);
game.targetPosition.copy(gamePlayer.position);
game.updateGame(1 / 60);
assert.equal(gamePlayer.userData.isMoving, false, 'Click-to-move stops at destination');
disposeCharacter(gamePlayer);
console.log('PASS: 120 unique seats, clear aisle, campus meshes, character rigs, avatar migration, actual game loop keyboard/joystick/click movement, empty cushions and v7 SW assets.');
