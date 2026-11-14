export function imageDimensions(b){
 if(b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),format:'png'};
 if(b.length>=10&&/^GIF8[79]a$/.test(b.toString('ascii',0,6)))return {width:b.readUInt16LE(6),height:b.readUInt16LE(8),format:'gif'};
 if(b[0]===255&&b[1]===216){let o=2;while(o+8<b.length){if(b[o]!==255){o++;continue;}const marker=b[o+1];o+=2;if(marker===218||marker===217)break;if(marker===216||marker===1||marker>=208&&marker<=215)continue;const size=b.readUInt16BE(o);if(size<2)break;if(marker>=192&&marker<=207&&![196,200,204].includes(marker))return {width:b.readUInt16BE(o+5),height:b.readUInt16BE(o+3),format:'jpeg'};o+=size;}}
 if(b.toString('ascii',4,8)==='ftyp'){let best=null,o=0;while((o=b.indexOf('ispe',o))>=0){if(o+16<=b.length){const width=b.readUInt32BE(o+8),height=b.readUInt32BE(o+12);if(width&&height&&width<50000&&height<50000&&(!best||width*height>best.width*best.height))best={width,height,format:'avif'};}o+=4;}if(best)return best;}
 throw Error('Unrecognized or incomplete portfolio image');
}
export function assertPortfolioImage(b,label,expected){
 const size=imageDimensions(b);
 if(size.width<64||size.height<64)throw Error('Portfolio image is too small: '+label+' '+size.width+'x'+size.height);
 if(expected?.width&&expected?.height&&(size.width!==expected.width||size.height!==expected.height))throw Error('Image dimensions do not match the catalogue: '+label);
 return size;
}
