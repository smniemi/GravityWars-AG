const DEFAULT_MANIFEST_URL = '/native/gravitywars.json';
const DEFAULT_LOADER_URL = '/native/gravitywars.js';
const DEFAULT_WASM_URL = '/native/gravitywars.wasm';
const DEFAULT_DATA_URL = '/native/gravitywars.data';

type GravityWarsFactory = (moduleConfig?: Record<string, unknown>) => Promise<GravityWarsRuntime>;

export interface GravityWarsRuntime {
  HEAPU8: Uint8Array;
  HEAP32?: Int32Array;
  init_gw(): void;
  main_init(): void;
  main_end(): void;
  control(): void;
  animate(): void;
  _malloc?(size: number): number;
  _free?(ptr: number): void;
  cwrap?(ident: string, returnType: string, argTypes: string[]): (...args: unknown[]) => any;
}

export interface GravityWarsManifest {
  exports: string[];
  generatedAt?: string;
}

export interface WasmBridgeOptions {
  manifestUrl?: string;
  loaderUrl?: string;
  wasmUrl?: string;
  dataUrl?: string;
  factoryOverride?: GravityWarsFactory;
}

export interface GravityWarsModule {
  runtime: GravityWarsRuntime;
  manifest: GravityWarsManifest;
}

export async function loadGravityWarsModule(
  options: WasmBridgeOptions = {}
): Promise<GravityWarsModule> {
  const manifestUrl = options.manifestUrl ?? DEFAULT_MANIFEST_URL;
  const loaderUrl = options.loaderUrl ?? DEFAULT_LOADER_URL;
  const wasmUrl = options.wasmUrl ?? DEFAULT_WASM_URL;
  const dataUrl = options.dataUrl ?? DEFAULT_DATA_URL;

  const manifestResponse = await fetch(manifestUrl);
  if (!manifestResponse.ok) {
    throw new Error(
      `GravityWars wasm manifest missing (${manifestUrl}). Run ./tools/build-wasm.sh first.`
    );
  }

  const manifest: GravityWarsManifest = await manifestResponse.json();

  const factory =
    options.factoryOverride ??
    ((await import(
      /* @vite-ignore */ new URL(loaderUrl, window.location.origin).toString()
    )).default as GravityWarsFactory);

  if (typeof factory !== 'function') {
    throw new Error(`GravityWars loader at ${loaderUrl} is invalid. Expected default export factory.`);
  }

  const runtime = await factory({
    locateFile: (path: string) => {
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

