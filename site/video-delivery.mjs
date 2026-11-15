import {NATIVE_VIDEO_FILES} from './native-video-files.mjs';

const archiveRoot='https://github.com/ankertam-cyber/anker-portfolio/releases/download/portfolio-media-v1/';
const files=new Map(NATIVE_VIDEO_FILES.flatMap(([source,name])=>[[source,name],[archiveRoot+name,name]]));
// Resolve only at playback. Draft IDs, selections, removals and source archives
// keep their original URLs, including drafts created before this delivery fix.
export function videoPlaybackSource(src,site=globalThis.document?.baseURI){
 let name=files.get(src);
 if(!name&&site){try{const url=new URL(src,site),root=new URL('./',site);if(!url.username&&!url.password&&!url.search&&!url.hash&&url.origin===root.origin&&url.pathname.startsWith(root.pathname))name=files.get(url.pathname.slice(root.pathname.length));}catch{}}
 if(!name)return src;
 const path='assets/web-video-v1/'+name;
 return site?new URL(path,site).href:path;
}
