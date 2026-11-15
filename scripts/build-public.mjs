import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
for(const script of ['unpack-assets.mjs','sync-video-delivery.mjs','build-browser.mjs','build-admin.mjs'])execFileSync(process.execPath,['scripts/'+script],{stdio:'inherit'});
execFileSync(process.execPath,['--test',...fs.readdirSync('tests').filter(name=>name.endsWith('.test.mjs')).map(name=>'tests/'+name)],{stdio:'inherit'});
for(const script of ['prepare-media.mjs','check-site.mjs'])execFileSync(process.execPath,['scripts/'+script],{stdio:'inherit'});
