import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {videoPlaybackSource} from '../site/video-delivery.mjs';
import {NATIVE_VIDEO_FILES} from '../site/native-video-files.mjs';
import {inspectWebVideo} from '../scripts/web-video.mjs';
const base='https://ankertam-cyber.github.io/anker-portfolio/';
const archive='https://github.com/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/';
test('every archived film resolves identically from existing draft URLs and original asset paths',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../media-sources.json',import.meta.url)));
 assert.deepEqual(NATIVE_VIDEO_FILES,manifest.videos.map(v=>[v.path,v.archiveName]));
 for(const [source,name]of NATIVE_VIDEO_FILES){const expected=base+'assets/web-video-v1/'+name;assert.equal(videoPlaybackSource(source,base),expected);assert.equal(videoPlaybackSource(base+source,base),expected);assert.equal(videoPlaybackSource(archive+name,base),expected);}
});
test('foreign origins, private URLs, unrecognised uploads and Vimeo are never rewritten',()=>{
 const name=NATIVE_VIDEO_FILES[0][1];for(const src of ['https://player.vimeo.com/video/123','https://example.com/new.mp4',archive+'new.mp4',archive+name+'?signed=1',archive.replace('github.com','github.com.evil.test')+name,archive.replace('/anker-portfolio/','/other/')+name])assert.equal(videoPlaybackSource(src,base),src);
});
test('playback resolution preserves media identity and leaves the saved draft untouched',()=>{
 const media={type:'video',src:archive+NATIVE_VIDEO_FILES[0][1],label:'Owner label'},saved=JSON.stringify(media);assert.notEqual(videoPlaybackSource(media.src,base),media.src);assert.equal(JSON.stringify(media),saved);
 const [source,name]=NATIVE_VIDEO_FILES[0];assert.equal(videoPlaybackSource(source),'assets/web-video-v1/'+name);
});
function box(type,payload=Buffer.alloc(0)){const header=Buffer.alloc(8);header.writeUInt32BE(payload.length+8);header.write(type,4);return Buffer.concat([header,payload]);}
test('publication requires H.264 with a non-empty movie and the playback index before media data',()=>{
 const header=box('ftyp',Buffer.from('isom')),moov=box('moov',Buffer.from('avc1')),mdat=box('mdat',Buffer.from('movie bytes'));
 assert.equal(inspectWebVideo(Buffer.concat([header,moov,mdat])).fastStart,true);
 for(const bytes of [Buffer.from('<html>error</html>'),Buffer.concat([header,mdat,moov]),Buffer.concat([header,box('moov',Buffer.from('vp09')),mdat]),Buffer.concat([header,moov,box('mdat')]),Buffer.concat([header,moov,mdat]).subarray(0,-1)])assert.throws(()=>inspectWebVideo(bytes));
});
