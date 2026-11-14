import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPortfolioImage} from '../site/image-loader.mjs';
class ImageDouble{
 hidden=false;complete=false;naturalWidth=0;naturalHeight=0;attributes=new Map();
 setAttribute(k,v){this.attributes.set(k,v);}
 removeAttribute(k){this.attributes.delete(k);}
 loaded(width,height){this.naturalWidth=width;this.naturalHeight=height;this.onload?.();}
 failed(){this.onerror?.();}
}
test('a network failure retries the local thumbnail and displays a valid image',()=>{
 const image=new ImageDouble(),states=[];image.attributes.set('srcset','bad.jpg 2048w');
 loadPortfolioImage(image,{src:'full.jpg',fallback:'thumb.jpg'},s=>states.push(s));
 image.failed();assert.equal(image.src,'thumb.jpg');assert.equal(image.attributes.has('srcset'),false);
 image.loaded(480,320);assert.deepEqual(states,['loading','ready']);assert.equal(image.hidden,false);
});
test('a one-pixel derivative cannot be mistaken for a loaded portfolio photo',()=>{
 const image=new ImageDouble(),states=[];loadPortfolioImage(image,{src:'broken.jpg'},s=>states.push(s));
 image.loaded(1,1);assert.deepEqual(states,['loading','error']);assert.equal(image.hidden,true);
});
test('cancelled loads cannot reveal a previous project or change its loading state',()=>{
 const image=new ImageDouble(),states=[];const cancel=loadPortfolioImage(image,{src:'old.jpg'},s=>states.push(s));
 const old=image.onload;cancel();image.naturalWidth=2048;image.naturalHeight=1365;old();
 assert.deepEqual(states,['loading']);assert.equal(image.onload,null);assert.equal(image.onerror,null);
});
test('a lazy image remains in layout while loading and a retry can recover after failure',()=>{
 const image=new ImageDouble(),states=[];image.loading='lazy';
 loadPortfolioImage(image,{src:'photo.jpg'},s=>states.push(s));assert.equal(image.hidden,false);
 assert.equal(image.attributes.get('data-loading'),'true');image.failed();assert.equal(image.hidden,true);
 loadPortfolioImage(image,{src:'photo.jpg'},s=>states.push(s));image.loaded(2048,1365);
 assert.equal(image.hidden,false);assert.equal(image.attributes.has('data-loading'),false);assert.deepEqual(states,['loading','error','loading','ready']);
});
