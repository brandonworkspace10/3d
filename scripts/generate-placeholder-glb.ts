/**
 * One-off script to generate placeholder.glb for the mock 3D API.
 * Run: bun run scripts/generate-placeholder-glb.ts
 */
import { Document, NodeIO, Primitive } from "@gltf-transform/core";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "placeholder.glb");

// Minimal cube
const positions = new Float32Array([
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
  0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
]);
const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11,
  12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
]);
const uvs = new Float32Array(48);
for (let f = 0; f < 6; f++) {
  const o = f * 8;
  uvs[o + 0] = 0; uvs[o + 1] = 0;
  uvs[o + 2] = 1; uvs[o + 3] = 0;
  uvs[o + 4] = 1; uvs[o + 5] = 1;
  uvs[o + 6] = 0; uvs[o + 7] = 1;
}

const doc = new Document();
const buf = doc.createBuffer();
const pos = doc.createAccessor().setArray(positions).setType("VEC3").setBuffer(buf);
const idx = doc.createAccessor().setArray(indices).setType("SCALAR").setBuffer(buf);
const uv = doc.createAccessor().setArray(uvs).setType("VEC2").setBuffer(buf);
const mat = doc.createMaterial().setBaseColorFactor([0.6, 0.6, 0.65, 1]);
const prim = doc
  .createPrimitive()
  .setAttribute("POSITION", pos)
  .setAttribute("TEXCOORD_0", uv)
  .setIndices(idx)
  .setMaterial(mat)
  .setMode(Primitive.Mode.TRIANGLES);
const mesh = doc.createMesh().addPrimitive(prim);
const node = doc.createNode().setMesh(mesh);
const scene = doc.createScene().addChild(node);
doc.getRoot().setDefaultScene(scene);

const io = new NodeIO();
const glb = await io.writeBinary(doc);
mkdirSync(join(process.cwd(), "public"), { recursive: true });
writeFileSync(OUT, Buffer.from(glb));
console.log("Written:", OUT);
