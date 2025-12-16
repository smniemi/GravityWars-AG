const DEFAULT_MANIFEST_URL = 'native/gravitywars.json';
const DEFAULT_LOADER_URL = 'native/gravitywars.js';
const DEFAULT_WASM_URL = 'native/gravitywars.wasm';
const DEFAULT_DATA_URL = 'native/gravitywars.data';
export async function loadGravityWarsModule(options = {}) {
    const manifestUrl = options.manifestUrl ?? DEFAULT_MANIFEST_URL;
    const loaderUrl = options.loaderUrl ?? DEFAULT_LOADER_URL;
    const wasmUrl = options.wasmUrl ?? DEFAULT_WASM_URL;
    const dataUrl = options.dataUrl ?? DEFAULT_DATA_URL;
    const manifestResponse = await fetch(manifestUrl);
    if (!manifestResponse.ok) {
        throw new Error(`GravityWars wasm manifest missing (${manifestUrl}). Run ./tools/build-wasm.sh first.`);
    }
    const manifest = await manifestResponse.json();
    const factory = options.factoryOverride ??
        (await import(
        /* @vite-ignore */ new URL(loaderUrl, window.location.href).toString())).default;
    if (typeof factory !== 'function') {
        throw new Error(`GravityWars loader at ${loaderUrl} is invalid. Expected default export factory.`);
    }
    const runtime = await factory({
        locateFile: (path) => {
            if (path.endsWith('.wasm')) {
                return wasmUrl;
            }
            if (path.endsWith('.data')) {
                return dataUrl;
            }
            return path;
        }
    });
    return { runtime, manifest };
}
