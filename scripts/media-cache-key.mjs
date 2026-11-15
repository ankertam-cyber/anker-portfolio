import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const content=JSON.parse(await fs.readFile('site/content.json','utf8')),purged=[...(content.library?.purged||[])].sort();
const suffix=purged.length?'-purged-'+createHash('sha256').update(JSON.stringify(purged)).digest('hex').slice(0,16):'';
if(!process.env.GITHUB_OUTPUT)throw Error('Missing workflow output destination');
await fs.appendFile(process.env.GITHUB_OUTPUT,'suffix='+suffix+'\n');
