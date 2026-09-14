// Copies the ZXing reader wasm used by @yudiel/react-qr-scanner (via barcode-detector)
// into public/wasm so the scanner page can self-host it instead of loading from jsDelivr.
// The file must match the zxing-wasm version pinned by barcode-detector.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const barcodeDetectorPkg = JSON.parse(await readFile(join(root, "node_modules/barcode-detector/package.json"), "utf8"));
const zxingPkg = JSON.parse(await readFile(join(root, "node_modules/zxing-wasm/package.json"), "utf8"));
const pinned = barcodeDetectorPkg.dependencies?.["zxing-wasm"];
if (pinned && pinned !== zxingPkg.version) {
  throw new Error(
    `zxing-wasm ${zxingPkg.version} is installed but barcode-detector pins ${pinned}; the scanner would load a mismatched wasm.`,
  );
}

const src = join(root, "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm");
const outDir = join(root, "public/wasm");
await mkdir(outDir, { recursive: true });
await copyFile(src, join(outDir, "zxing_reader.wasm"));
await writeFile(join(outDir, "version.json"), JSON.stringify({ zxingWasm: zxingPkg.version }, null, 2) + "\n");
console.log(`copied zxing_reader.wasm (${zxingPkg.version}) to public/wasm`);
