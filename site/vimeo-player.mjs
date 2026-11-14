// The official SDK is loaded separately; this controller creates players on demand.
// Official APIs: https://github.com/vimeo/player.js#readme
// Parameters: https://help.vimeo.com/hc/en-us/articles/12426260232977-About-Player-Parameters

export function normalizeVimeoEmbedUrl(src) {
  let url;
  try {
    if (typeof src !== 'string') throw new TypeError();
    url = new URL(src);
  } catch {
    throw new TypeError('Expected an absolute Vimeo player URL.');
  }
  if (url.origin !== 'https://player.vimeo.com' || url.username || url.password ||
      !/^\/video\/[1-9][0-9]*\/?$/.test(url.pathname)) {
    throw new TypeError('Only https://player.vimeo.com/video/<numeric ID> is supported.');
  }
  // Preserve observed hashes, privacy h tokens and other query parameters.
  // These explicit overrides enforce manual playback and retain native controls.
  const policy = {
    dnt: '1', title: '0', byline: '0', portrait: '0',
    autoplay: '0', playsinline: '1', controls: '1', background: '0'
  };
  for (const [name, value] of Object.entries(policy)) url.searchParams.set(name, value);
  return url.href;
}

export function createVimeoPlayer(iframe) {
  const Player = globalThis.Vimeo?.Player;
  if (typeof Player !== 'function') {
    const error = new Error('The Vimeo player library is unavailable. Please try again.');
    error.name = 'VimeoUnavailableError';
    throw error;
  }
  return new Player(iframe);
}

function ignoreFailure(call) {
  try { return Promise.resolve(call()).catch(() => {}); }
  catch { return Promise.resolve(); }
}

function observe(callback, detail) {
  // Host callbacks must not interrupt player teardown or create unhandled rejections.
  ignoreFailure(() => callback(detail));
}

function errorMessage(error, reason) {
  if (reason === 'timeout') return 'Vimeo took too long to load. Check your connection and try again.';
  if (error?.name === 'PrivacyError') return 'Vimeo restricts access to this film. Please choose another film or try again.';
  if (error?.name === 'PasswordError') return 'This Vimeo film is password protected. Please choose another film or try again.';
  const detail = typeof error?.message === 'string' ? error.message.slice(0, 240) : '';
  return detail ? `This Vimeo film could not load: ${detail}` : 'This Vimeo film could not load. Please try again.';
}

/**
 * open(media) -> Promise<{status: 'ready'|'error'|'closed', ...media}>.
 * Invalid URLs reject before touching an active film. A later SDK error is
 * reported through onStatus even after open() has resolved ready.
 * onStatus receives {status, message, reason?, src, sourcePage, title}.
 * onPlay receives media; the host should pause its native videos there.
 * Call pause() before opening other media, and close() when leaving the viewer.
 * close() detaches synchronously; its Promise only awaits best-effort SDK cleanup.
 */
export function mountVimeoPlayer(slot, {
  document: doc = slot?.ownerDocument ?? globalThis.document,
  createPlayer = createVimeoPlayer,
  onStatus = () => {},
  onPlay = () => {},
  timeoutMs = 15000,
  setTimeout: schedule = globalThis.setTimeout,
  clearTimeout: cancel = globalThis.clearTimeout
} = {}) {
  if (!slot?.appendChild || !doc?.createElement) throw new TypeError('A DOM slot and document are required.');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be positive.');
  let current = null;

  const live = session => current === session && !session.disposed;
  const notify = (session, status, message, reason) => observe(onStatus, {
    ...session.media, status, message, ...(reason ? {reason} : {})
  });
  function settle(session, status, message = '') {
    if (session.settled) return;
    session.settled = true;
    session.resolve({...session.media, status, message});
  }
  function stop(session, keepRoot = false) {
    if (session.timer !== null) { cancel(session.timer); session.timer = null; }
    if (!session.disposed) {
      session.disposed = true;
      const player = session.player;
      if (player) {
        ignoreFailure(() => player.off('play', session.handlePlay));
        ignoreFailure(() => player.off('error', session.handleError));
        ignoreFailure(() => player.pause());
        session.cleanup = ignoreFailure(() => player.destroy());
      }
      // Do not wait for a blocked provider, a rejected pause, or destroy Promise.
      // Detaching and navigating this particular frame releases its browsing context.
      session.iframe.remove();
      session.iframe.src = 'about:blank';
      session.player = null;
    }
    if (!keepRoot) {
      if (session.retry) session.retry.removeEventListener('click', session.handleRetry);
      session.root.remove();
    }
    return session.cleanup;
  }
  function fail(session, error, reason = 'sdk-error') {
    if (!live(session)) return;
    session.phase = 'error';
    const message = errorMessage(error, reason);
    stop(session, true);
    session.root.setAttribute('aria-busy', 'false');
    session.message.hidden = false;
    session.message.setAttribute('role', 'alert');
    session.message.textContent = message;
    session.retry = doc.createElement('button');
    session.retry.type = 'button';
    session.retry.textContent = 'Retry film';
    session.handleRetry = () => {
      if (current === session && session.phase === 'error') void open(session.media);
    };
    session.retry.addEventListener('click', session.handleRetry);
    session.root.appendChild(session.retry);
    settle(session, 'error', message);
    notify(session, 'error', message, reason);
  }
  function close() {
    const session = current;
    if (!session) return Promise.resolve();
    current = null; // Invalidate callbacks before any SDK cleanup can run.
    session.phase = 'closed';
    const cleanup = stop(session);
    settle(session, 'closed');
    notify(session, 'closed', 'Film closed.');
    return cleanup;
  }
  function open(media = {}) {
    let normalized;
    try { normalized = normalizeVimeoEmbedUrl(media.src); }
    catch (error) { return Promise.reject(error); }
    if (current) {
      const previous = current;
      current = null;
      previous.phase = 'closed';
      stop(previous);
      settle(previous, 'closed');
    }
    const root = doc.createElement('div');
    root.className = 'vimeo-player';
    root.style.width = '100%';
    root.style.height = '100%';
    root.setAttribute('aria-busy', 'true');
    const message = doc.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = 'Loading Vimeo film…';
    const iframe = doc.createElement('iframe');
    iframe.src = normalized;
    iframe.title = typeof media.title === 'string' && media.title.trim() ? media.title : 'Vimeo film';
    iframe.hidden = true;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('frameborder', '0');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    root.appendChild(message);
    root.appendChild(iframe);
    slot.appendChild(root);
    const session = {
      media: {src: normalized, sourcePage: typeof media.sourcePage === 'string' ? media.sourcePage : '', title: iframe.title},
      root, message, iframe, phase: 'loading', disposed: false, settled: false,
      timer: null, player: null, cleanup: Promise.resolve(), resolve: null, retry: null
    };
    const result = new Promise(resolve => { session.resolve = resolve; });
    current = session;
    session.handlePlay = () => { if (live(session)) observe(onPlay, session.media); };
    session.handleError = error => fail(session, error);
    try {
      session.player = createPlayer(iframe);
      session.player.on('play', session.handlePlay);
      session.player.on('error', session.handleError);
      if (live(session)) {
        session.timer = schedule(() => fail(session, null, 'timeout'), timeoutMs);
        Promise.resolve(session.player.ready()).then(() => {
          if (!live(session) || session.phase !== 'loading') return;
          session.phase = 'ready';
          cancel(session.timer);
          session.timer = null;
          iframe.hidden = false;
          message.hidden = true;
          root.setAttribute('aria-busy', 'false');
          settle(session, 'ready');
          notify(session, 'ready', 'Ready. Press play to start the film.');
        }, error => fail(session, error));
      }
    } catch (error) { fail(session, error); }
    if (live(session)) notify(session, 'loading', message.textContent);
    return result;
  }
  async function pause() {
    const session = current;
    if (!session || !live(session) || !session.player) return false;
    try { await session.player.pause(); return live(session); }
    catch (error) { if (live(session)) fail(session, error, 'pause-error'); return false; }
  }
  return {open, pause, close};
}
