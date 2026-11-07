// Tiện ích gộp mesh tĩnh: bake transform về không gian root để giảm draw call.
// Hình học được biến đổi sẵn nên hình ảnh giữ nguyên tuyệt đối.
import * as THREE from './three.module.js';

// Nối các Float32Array attribute cùng kiểu thành 1 BufferAttribute
function concatAttribute(valid, name, itemSize, totalVerts) {
  const arr = new Float32Array(totalVerts * itemSize);
  let off = 0;
  for (const g of valid) {
    const attr = g.attributes[name];
    if (attr) {
      arr.set(attr.array.subarray(0, g.attributes.position.count * itemSize), off);
    }
    // Thiếu uv: mảng 0 đã sẵn sàng, không cần làm gì
    off += g.attributes.position.count * itemSize;
  }
  return new THREE.BufferAttribute(arr, itemSize);
}

// Gộp mảng geometry non-indexed (position + normal bắt buộc, uv tự sinh 0 nếu thiếu)
export function mergeGeometriesNonIndexed(geos) {
  let skipped = 0;
  const valid = [];
  for (const g of geos) {
    // Thiếu position hoặc normal => bỏ qua geometry đó
    if (!g || !g.attributes.position || !g.attributes.normal) {
      skipped++;
      continue;
    }
    valid.push(g);
  }
  if (valid.length === 0) return { geometry: null, skipped };

  const totalVerts = valid.reduce((s, g) => s + g.attributes.position.count, 0);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', concatAttribute(valid, 'position', 3, totalVerts));
  geometry.setAttribute('normal', concatAttribute(valid, 'normal', 3, totalVerts));
  geometry.setAttribute('uv', concatAttribute(valid, 'uv', 2, totalVerts));

  return { geometry, skipped };
}

// Tách đoạn [start, start+count) của geometry có index thành geometry non-indexed
export function extractGeometrySlice(geometry, start, count) {
  const index = geometry.index;
  if (!index) return null;
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = geometry.attributes.uv;

  const n = Math.min(count, index.count - start);
  const p = new Float32Array(n * 3);
  const nr = new Float32Array(n * 3);
  const u = new Float32Array(n * 2);

  for (let i = 0; i < n; i++) {
    const vi = index.getX(start + i);
    p[i * 3] = pos.getX(vi);
    p[i * 3 + 1] = pos.getY(vi);
    p[i * 3 + 2] = pos.getZ(vi);
    if (nor) {
      nr[i * 3] = nor.getX(vi);
      nr[i * 3 + 1] = nor.getY(vi);
      nr[i * 3 + 2] = nor.getZ(vi);
    }
    if (uv) {
      u[i * 2] = uv.getX(vi);
      u[i * 2 + 1] = uv.getY(vi);
    }
    // Thiếu uv/normal: giữ 0
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(p, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nr, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(u, 2));
  return out;
}

// Gộp các mesh tĩnh con cháu của root về không gian root, bucket theo material + cờ bóng
export function mergeStaticMeshes(root, meshes) {
  root.updateWorldMatrix(true, true);
  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();

  // Bucket: material -> "castShadow|receiveShadow" -> dữ liệu bucket
  const buckets = new Map();
  let skipped = 0;

  for (const mesh of meshes) {
    // Bỏ qua: không phải Mesh thường, material mảng, hoặc có morph target
    if (!mesh || !mesh.isMesh || mesh.isInstancedMesh || mesh.isSprite) { skipped++; continue; }
    if (Array.isArray(mesh.material)) { skipped++; continue; }
    const morph = mesh.geometry && mesh.geometry.morphAttributes;
    if (morph && Object.keys(morph).length > 0) { skipped++; continue; }

    // Bake transform về không gian root
    rel.multiplyMatrices(invRoot, mesh.matrixWorld);
    let geo = mesh.geometry.clone();
    geo.applyMatrix4(rel);
    if (geo.index) geo = geo.toNonIndexed();

    // Gom bucket theo material + cờ bóng
    let flagMap = buckets.get(mesh.material);
    if (!flagMap) {
      flagMap = new Map();
      buckets.set(mesh.material, flagMap);
    }
    const key = (mesh.castShadow ? '1' : '0') + (mesh.receiveShadow ? '1' : '0');
    let bucket = flagMap.get(key);
    if (!bucket) {
      bucket = {
        material: mesh.material,
        castShadow: mesh.castShadow,
        receiveShadow: mesh.receiveShadow,
        geos: [],
        srcs: []
      };
      flagMap.set(key, bucket);
    }
    bucket.geos.push(geo);
    bucket.srcs.push(mesh);
  }

  // Tạo mesh gộp cho từng bucket, xóa mesh gốc đã gộp thành công
  const merged = [];
  for (const flagMap of buckets.values()) {
    for (const bucket of flagMap.values()) {
      const { geometry } = mergeGeometriesNonIndexed(bucket.geos);
      if (!geometry) continue; // không gộp được => giữ nguyên mesh gốc
      const m = new THREE.Mesh(geometry, bucket.material);
      m.castShadow = bucket.castShadow;
      m.receiveShadow = bucket.receiveShadow;
      m.name = 'merged-static';
      root.add(m);
      merged.push(m);
      for (const src of bucket.srcs) src.removeFromParent();
    }
  }

  return { merged, skipped };
}
