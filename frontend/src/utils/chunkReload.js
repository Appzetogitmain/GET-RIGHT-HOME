// A tab left open across a deploy still points at the old hashed page files,
// which no longer exist. Opening a lazy-loaded page then fails with
// "Failed to fetch dynamically imported module" and the user lands on the
// "Something went wrong" screen until they refresh by hand. A single automatic
// reload fetches the new index.html and fixes it.

const KEY = 'chunk-reload-at';
const COOLDOWN_MS = 15000; // never loop if the reload does not cure it

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Loading chunk [\w-]+ failed|Unable to preload CSS/i;

export const isChunkLoadError = (error) =>
  CHUNK_ERROR.test(String(error?.message || error || ''));

// Returns true when a reload was triggered.
export const reloadOnceForStaleChunk = () => {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sessionStorage blocked: reload anyway, the browser will not loop on its own
  }
  window.location.reload();
  return true;
};
