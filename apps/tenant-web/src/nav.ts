/** Vite's own base path, e.g. "/outreach/" when served combined with the
 * API, or "/" when this app is deployed standalone (VITE_BASE_PATH=/ at
 * build time) — always ends with a trailing slash. */
export const BASE_URL = import.meta.env.BASE_URL;

/** Joins a path onto BASE_URL without doubling slashes, e.g. appPath('campaigns')
 * -> "/outreach/campaigns" or "/campaigns" depending on how this build's base was set. */
export function appPath(path = ''): string {
  return `${BASE_URL}${path}`.replace(/\/{2,}/g, '/');
}

/** Pushes a path and notifies the existing popstate listener, so any component can navigate
 * without prop-drilling a navigate callback through the page tree. */
export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
