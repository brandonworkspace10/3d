/**
 * Stub reconstruction adapter: produces a valid GLB (textured cube) and preview.
 * Swap for COLMAP/OpenMVS or other engine via the adapter interface.
 */
import sharp from "sharp";
import { mkdir, readFile } from "fs/promises";
import { join } from "path";
import {
  Document,
  NodeIO,
  Primitive,
  Material,
} from "@gltf-transform/core";

export interface StubAdapterInput {
  jobDir: string;
  preprocessedPaths: string[]; // paths relative to jobDir
}

export interface StubAdapterOutput {
  glbPath: string;   // relative to jobDir
  previewPath: string;
}

// Cube: 24 vertices (4 per face) for correct UV mapping
const CUBE_POSITIONS = new Float32Array([
  // front (z=0.5)
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  // back (z=-0.5)
  0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
  // right (x=0.5)
  0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  // left (x=-0.5)
  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
  // top (y=0.5)
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  // bottom (y=-0.5)
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
]);
const CUBE_INDICES = new Uint16Array([
  0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11,
  12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
]);
const CUBE_UVS = new Float32Array(
  Array.from({ length: 24 }, (_, i) => (i % 2 === 0 ? (i % 4 < 2 ? 0 : 1) : i % 4 < 2 ? 0 : 1))
);
// Fix UVs: each face gets [0,0], [1,0], [1,1], [0,1]
for (let f = 0; f < 6; f++) {
  const o = f * 8;
  CUBE_UVS[o + 0] = 0; CUBE_UVS[o + 1] = 0;
  CUBE_UVS[o + 2] = 1; CUBE_UVS[o + 3] = 0;
  CUBE_UVS[o + 4] = 1; CUBE_UVS[o + 5] = 1;
  CUBE_UVS[o + 6] = 0; CUBE_UVS[o + 7] = 1;
}

async function createTexturedCubeGlb(
  imagePath: string,
  outputPath: string
): Promise<void> {
  const document = new Document();
  const buffer = document.createBuffer();

  const posAccessor = document
    .createAccessor()
    .setArray(CUBE_POSITIONS)
    .setType("VEC3")
    .setBuffer(buffer);
  const idxAccessor = document
    .createAccessor()
    .setArray(CUBE_INDICES)
    .setType("SCALAR")
    .setBuffer(buffer);
  const uvAccessor = document
    .createAccessor()
    .setArray(CUBE_UVS)
    .setType("VEC2")
    .setBuffer(buffer);

  const imageBytes = await readFile(imagePath);
  const texture = document
    .createTexture()
    .setImage(imageBytes)
    .setMimeType("image/png");
  const material = document
    .createMaterial()
    .setBaseColorTexture(texture)
    .setBaseColorFactor([1, 1, 1, 1]);

  const primitive = document
    .createPrimitive()
    .setAttribute("POSITION", posAccessor)
    .setAttribute("TEXCOORD_0", uvAccessor)
    .setIndices(idxAccessor)
    .setMaterial(material)
    .setMode(Primitive.Mode.TRIANGLES);

  const mesh = document.createMesh().addPrimitive(primitive);
  const node = document.createNode().setMesh(mesh);
  const scene = document.createScene().addChild(node);
  document.getRoot().setDefaultScene(scene);

  const io = new NodeIO();
  await io.write(outputPath, document);
}

export async function runStubAdapter(
  input: StubAdapterInput
): Promise<StubAdapterOutput> {
  const firstImagePath = join(input.jobDir, input.preprocessedPaths[0]);
  const outputDir = join(input.jobDir, "output");
  await mkdir(outputDir, { recursive: true });

  const glbPath = join(outputDir, "model.glb");
  await createTexturedCubeGlb(firstImagePath, glbPath);

  const previewPath = join(outputDir, "preview.png");
  await sharp(firstImagePath)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toFile(previewPath);

  return {
    glbPath: "output/model.glb",
    previewPath: "output/preview.png",
  };
}
