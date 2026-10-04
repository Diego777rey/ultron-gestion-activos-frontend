import { version } from '../../../package.json';

/**
 * Versión publicada en GitHub. `.github/scripts/release.sh` la escribe en package.json
 * y crea el tag `v<versión>` antes de empaquetar, así que coincide con el release.
 */
export const APP_VERSION: string = version;
