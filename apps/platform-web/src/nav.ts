/** Pushes a path and notifies the existing popstate listener, so any component can navigate
 * without prop-drilling a navigate callback through the page tree. */
export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
