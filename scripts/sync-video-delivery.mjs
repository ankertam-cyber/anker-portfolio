import fs from 'node:fs/promises';
const manifest=JSON.parse(await fs.readFile('media-sources.json','utf8'));
const records=manifest.videos.map(v=>[v.path,v.archiveName]);
await fs.writeFile('site/native-video-files.mjs','// Generated from the verified source manifest; source identities remain stable.\nexport const NATIVE_VIDEO_FILES='+JSON.stringify(records,null,2)+';\n');
