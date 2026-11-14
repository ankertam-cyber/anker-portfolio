import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVimeoPlayer, normalizeVimeoEmbedUrl} from '../site/vimeo-player.mjs';

const film = id => ({src: `https://player.vimeo.com/video/${id}?h=private-token`, title: `Film ${id}`, sourcePage: 'https://vimeo.com/123'});
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
class Element {
  constructor(tag, doc) {
    Object.assign(this, {tagName: tag, ownerDocument: doc, children: [], parentNode: null,
      attributes: {}, listeners: new Map(), style: {}, hidden: false, textContent: ''});
  }
  appendChild(child) { child.remove(); this.children.push(child); child.parentNode = this; return child; }
  remove() {
    if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  fire(name) { for (const fn of [...(this.listeners.get(name) ?? [])]) fn({type: name}); }
}
class Document {
  constructor() { this.created = []; }
  createElement(tag) { const el = new Element(tag, this); this.created.push(el); return el; }
}
class MockPlayer {
  constructor(iframe) {
    Object.assign(this, {iframe, readiness: deferred(), handlers: new Map(), pauseCalls: 0,
      destroyCalls: 0, readyCalls: 0, offCalls: [], playCalls: 0,
      pauseImpl: () => Promise.resolve(), destroyImpl: () => Promise.resolve()});
  }
  ready() { this.readyCalls++; return this.readiness.promise; }
  on(name, fn) { if (!this.handlers.has(name)) this.handlers.set(name, new Set()); this.handlers.get(name).add(fn); }
  off(name, fn) { this.offCalls.push(name); this.handlers.get(name)?.delete(fn); }
  emit(name, data) { for (const fn of [...(this.handlers.get(name) ?? [])]) fn(data); }
  pause() { this.pauseCalls++; return this.pauseImpl(); }
  destroy() { this.destroyCalls++; return this.destroyImpl(); }
  play() { this.playCalls++; return Promise.resolve(); }
}
function timers() {
  let serial = 0;
  const pending = new Map();
  return {
    pending,
    setTimeout(fn, ms) { const id = ++serial; pending.set(id, {fn, ms}); return id; },
    clearTimeout(id) { pending.delete(id); },
    expire() { const jobs = [...pending.values()]; pending.clear(); jobs.forEach(j => j.fn()); }
  };
}
function harness(options = {}) {
  const document = new Document();
  const slot = document.createElement('div');
  const clock = timers(), players = [], statuses = [], plays = [];
  const controller = mountVimeoPlayer(slot, {
    document,
    createPlayer: iframe => { const p = new MockPlayer(iframe); players.push(p); return p; },
    onStatus: status => statuses.push(status), onPlay: media => plays.push(media),
    timeoutMs: 100, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    ...options
  });
  return {document, slot, clock, players, statuses, plays, controller};
}
function all(root) { return root.children.flatMap(child => [child, ...all(child)]); }
function find(root, tag) { return all(root).find(el => el.tagName === tag); }

test('strict URL whitelist rejects lookalike origins, credentials and non-player paths', () => {
  for (const src of ['http://player.vimeo.com/video/123', 'https://player.vimeo.com.evil.test/video/123',
    'https://player.vimeo.com:444/video/123', 'https://user@player.vimeo.com/video/123',
    'https://vimeo.com/123', 'https://player.vimeo.com/video/123/extra',
    'https://player.vimeo.com/video/not-a-number', 'https://player.vimeo.com/video/0',
    '/video/123', 'javascript:alert(1)', null]) {
    assert.throws(() => normalizeVimeoEmbedUrl(src), TypeError, String(src));
  }
});

test('observed privacy/quality/hash parameters survive while autoplay and chromeless modes cannot', () => {
  const url = new URL(normalizeVimeoEmbedUrl('https://player.vimeo.com/video/123?h=secret&quality=1080p&autoplay=1&autoplay=1&background=1&controls=0#t=12s'));
  assert.equal(url.searchParams.get('h'), 'secret');
  assert.equal(url.searchParams.get('quality'), '1080p');
  assert.equal(url.hash, '#t=12s');
  for (const [name, value] of Object.entries({dnt: '1', title: '0', byline: '0', portrait: '0', autoplay: '0', playsinline: '1', controls: '1', background: '0'})) {
    assert.deepEqual(url.searchParams.getAll(name), [value]);
  }
});

test('mount is inert; only SDK ready makes a newly opened iframe visible', async t => {
  const h = harness(); t.after(() => h.controller.close());
  assert.equal(h.players.length, 0);
  assert.equal(h.slot.children.length, 0);
  const result = h.controller.open(film(123));
  const iframe = find(h.slot, 'iframe');
  assert.equal(h.players.length, 1);
  assert.equal(iframe.hidden, true);
  assert.equal(iframe.title, 'Film 123');
  assert.equal(iframe.getAttribute('allowfullscreen'), '');
  assert.match(iframe.getAttribute('allow'), /fullscreen/);
  assert.equal(h.statuses.at(-1).status, 'loading');
  iframe.fire('load'); // An iframe load is not evidence that the Vimeo API works.
  assert.equal(h.statuses.at(-1).status, 'loading');
  h.players[0].readiness.resolve();
  assert.equal((await result).status, 'ready');
  assert.equal(iframe.hidden, false);
  assert.equal(find(h.slot, 'p').hidden, true);
  assert.equal(h.statuses.at(-1).status, 'ready');
  assert.equal(h.clock.pending.size, 0);
  assert.equal(h.players[0].playCalls, 0);
});

test('invalid open rejects without disturbing an active film or producing DOM/network work', async t => {
  const h = harness(); t.after(() => h.controller.close());
  const first = h.controller.open(film(123)); h.players[0].readiness.resolve(); await first;
  const oldFrame = find(h.slot, 'iframe');
  const created = h.document.created.length, statusCount = h.statuses.length;
  await assert.rejects(h.controller.open({src: 'https://evil.test/video/456'}), TypeError);
  assert.equal(find(h.slot, 'iframe'), oldFrame);
  assert.equal(h.document.created.length, created);
  assert.equal(h.players.length, 1);
  assert.equal(h.statuses.length, statusCount);
  assert.equal(h.players[0].pauseCalls, 0);
  assert.equal(h.players[0].destroyCalls, 0);
});

test('replacement retires the old player; old ready/error/play cannot affect the new clip', async t => {
  const h = harness(); t.after(() => h.controller.close());
  const firstResult = h.controller.open(film(123));
  const first = h.players[0], oldFrame = first.iframe;
  const latePlay = [...first.handlers.get('play')][0];
  const lateError = [...first.handlers.get('error')][0];
  const secondResult = h.controller.open(film(456));
  assert.equal((await firstResult).status, 'closed');
  assert.equal(oldFrame.parentNode, null);
  assert.equal(oldFrame.src, 'about:blank');
  assert.equal(first.pauseCalls, 1); assert.equal(first.destroyCalls, 1);
  assert.deepEqual(first.offCalls.sort(), ['error', 'play']);
  first.readiness.resolve(); lateError(new Error('stale failure')); latePlay(); await flush();
  assert.equal(h.statuses.at(-1).status, 'loading');
  assert.match(find(h.slot, 'iframe').src, /\/456\?/);
  assert.equal(h.plays.length, 0);
  h.players[1].readiness.resolve(); assert.equal((await secondResult).status, 'ready');
});

test('close detaches immediately, settles pending open and ignores all stale callbacks', async () => {
  const h = harness();
  const result = h.controller.open(film(123)); const p = h.players[0];
  const lateError = [...p.handlers.get('error')][0];
  p.destroyImpl = () => Promise.reject(new Error('provider cleanup failed'));
  const cleanup = h.controller.close();
  assert.equal(h.slot.children.length, 0); // Does not wait for SDK cleanup.
  assert.equal((await result).status, 'closed'); await cleanup;
  p.readiness.resolve(); lateError(new Error('closed failure')); await flush();
  assert.equal(h.statuses.at(-1).status, 'closed');
  assert.equal(h.clock.pending.size, 0);
  assert.equal(p.pauseCalls, 1); assert.equal(p.destroyCalls, 1);
  await h.controller.close(); assert.equal(p.destroyCalls, 1);
});

test('a rejected old readiness Promise after replacement cannot fail the new film', async t => {
  const h = harness(); t.after(() => h.controller.close());
  const a = h.controller.open(film(123)); const old = h.players[0];
  const b = h.controller.open(film(456));
  old.readiness.reject(new Error('late network rejection')); await flush();
  assert.equal((await a).status, 'closed');
  assert.equal(h.statuses.at(-1).status, 'loading');
  h.players[1].readiness.resolve(); assert.equal((await b).status, 'ready');
});

test('timeout shows an accessible useful error, removes the frame and retries with a fresh player', async t => {
  const h = harness(); t.after(() => h.controller.close());
  const firstResult = h.controller.open(film(123)); const first = h.players[0];
  h.clock.expire();
  assert.equal((await firstResult).status, 'error');
  assert.equal(find(h.slot, 'iframe'), undefined);
  assert.equal(find(h.slot, 'p').getAttribute('role'), 'alert');
  assert.match(find(h.slot, 'p').textContent, /too long.*connection/i);
  assert.equal(h.statuses.at(-1).reason, 'timeout');
  assert.equal(first.destroyCalls, 1);
  const retry = find(h.slot, 'button'); retry.fire('click');
  assert.equal(h.players.length, 2); assert.notEqual(h.players[1].iframe, first.iframe);
  first.readiness.resolve(); await flush(); assert.equal(h.statuses.at(-1).status, 'loading');
  h.players[1].readiness.resolve(); await flush(); assert.equal(h.statuses.at(-1).status, 'ready');
  retry.fire('click'); assert.equal(h.players.length, 2); // Stale detached retry is inert.
});

test('SDK initialization rejection reports privacy restrictions and leaves no blank frame', async t => {
  const h = harness(); t.after(() => h.controller.close());
  const result = h.controller.open(film(123));
  h.players[0].readiness.reject(Object.assign(new Error('private'), {name: 'PrivacyError'}));
  assert.equal((await result).status, 'error');
  assert.match(h.statuses.at(-1).message, /restricts access/i);
  assert.equal(find(h.slot, 'iframe'), undefined);
  assert.equal(find(h.slot, 'button').textContent, 'Retry film');
  assert.equal(h.clock.pending.size, 0);
});

test('SDK error after ready replaces the player with an error and detaches audio immediately', async t => {
  const h = harness(); t.after(() => h.controller.close());
  const result = h.controller.open(film(123)); const p = h.players[0];
  p.readiness.resolve(); await result;
  p.emit('error', {message: '<img src=x onerror=alert(1)>', name: 'Error'});
  assert.equal(h.statuses.at(-1).status, 'error');
  assert.equal(find(h.slot, 'iframe'), undefined);
  assert.equal(find(h.slot, 'p').textContent, 'This Vimeo film could not load: <img src=x onerror=alert(1)>');
  assert.equal(p.pauseCalls, 1); assert.equal(p.destroyCalls, 1);
});

test('current SDK play notifies the host to pause native video; controller never calls play', async t => {
  let nativePauseCalls = 0;
  const h = harness({onPlay: () => { nativePauseCalls++; }}); t.after(() => h.controller.close());
  const result = h.controller.open(film(123)); const p = h.players[0]; p.readiness.resolve(); await result;
  p.emit('play'); assert.equal(nativePauseCalls, 1); assert.equal(p.playCalls, 0);
  assert.equal(await h.controller.pause(), true); assert.equal(p.pauseCalls, 1);
});

test('pause rejection cannot leave a potentially audible iframe running', async t => {
  const h = harness(); t.after(() => h.controller.close());
  const result = h.controller.open(film(123)); const p = h.players[0]; p.readiness.resolve(); await result;
  p.pauseImpl = () => Promise.reject(new Error('pause command failed'));
  assert.equal(await h.controller.pause(), false);
  assert.equal(find(h.slot, 'iframe'), undefined);
  assert.equal(h.statuses.at(-1).reason, 'pause-error'); assert.equal(p.destroyCalls, 1);
});

test('a late rejection from an old pause cannot remove a newly opened movie', async t => {
  const h = harness(); t.after(() => h.controller.close());
  const first = h.controller.open(film(123)); const p = h.players[0]; p.readiness.resolve(); await first;
  const pendingPause = deferred(); p.pauseImpl = () => pendingPause.promise;
  const pauseResult = h.controller.pause();
  const next = h.controller.open(film(456)); h.players[1].readiness.resolve(); await next;
  pendingPause.reject(new Error('old pause rejected'));
  assert.equal(await pauseResult, false);
  assert.equal(h.statuses.at(-1).status, 'ready');
  assert.match(find(h.slot, 'iframe').src, /\/456\?/);
});

test('factory and synchronous ready failures receive the same visible cleanup path', async () => {
  for (const factory of [() => { throw new Error('SDK missing'); }, iframe => {
    const p = new MockPlayer(iframe); p.ready = () => { throw new Error('ready failed'); }; return p;
  }]) {
    const h = harness({createPlayer: factory});
    assert.equal((await h.controller.open(film(123))).status, 'error');
    assert.equal(find(h.slot, 'iframe'), undefined); assert.ok(find(h.slot, 'button'));
    await h.controller.close(); assert.equal(h.slot.children.length, 0);
  }
});

test('default factory uses global Vimeo.Player and handles a missing SDK with a retryable message', async () => {
  const previous = globalThis.Vimeo;
  try {
    delete globalThis.Vimeo;
    const document = new Document(), slot = document.createElement('div'), clock = timers();
    const statuses = [];
    const controller = mountVimeoPlayer(slot, {document, onStatus: s => statuses.push(s), setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout});
    assert.equal((await controller.open(film(123))).status, 'error');
    assert.match(statuses.at(-1).message, /library is unavailable/);
    let p;
    globalThis.Vimeo = {Player: class extends MockPlayer { constructor(frame) { super(frame); p = this; } }};
    find(slot, 'button').fire('click'); p.readiness.resolve(); await flush();
    assert.equal(statuses.at(-1).status, 'ready'); await controller.close();
  } finally { if (previous === undefined) delete globalThis.Vimeo; else globalThis.Vimeo = previous; }
});

test('host observer exceptions cannot interrupt close, audio cleanup or readiness', async () => {
  const h = harness({onStatus: () => { throw new Error('host render failed'); }, onPlay: () => Promise.reject(new Error('host pause failed'))});
  const result = h.controller.open(film(123)); const p = h.players[0]; p.readiness.resolve();
  assert.equal((await result).status, 'ready'); p.emit('play'); await h.controller.close(); await flush();
  assert.equal(h.slot.children.length, 0); assert.equal(p.destroyCalls, 1);
});

test('controller removes only its own DOM, preserving unrelated slot content', async () => {
  const h = harness(); const sibling = h.document.createElement('span'); h.slot.appendChild(sibling);
  const result = h.controller.open(film(123)); await h.controller.close();
  assert.equal((await result).status, 'closed'); assert.deepEqual(h.slot.children, [sibling]);
  assert.equal(await h.controller.pause(), false);
});
