import {DRAFT_KEY,emptyContent,applyContent} from './content-model.mjs';
import {ownerUploads,uploadedImageSource} from './upload-store.mjs';
import {previewUploadedEntries} from './photo-upload.mjs';
export async function loadOwnerContent(entries){
 let content;
 const response=await fetch('content.json',{cache:'no-store'});if(response.status===404)content=emptyContent();else{if(!response.ok)throw Error('Website content unavailable');content=await response.json();}
 const preview=new URLSearchParams(location.search).get('owner-preview')==='1';
 if(preview){
  document.documentElement.dataset.ownerPreview='true';
  const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(!saved?.draft)throw Error('Preview draft unavailable');content=saved.draft;
  const banner=document.createElement('aside');banner.className='owner-preview-banner';banner.textContent='草稿預覽 · 未發佈';const close=document.createElement('button');close.type='button';close.textContent='關閉預覽';close.addEventListener('click',()=>window.close());banner.append(close);document.body.prepend(banner);
 }
 let result=applyContent(entries,content);if(preview){await ownerUploads.restore();result=previewUploadedEntries(result,uploadedImageSource);}applyProfile(content.profile);if(preview)document.title='草稿預覽 · '+document.title;document.documentElement.dataset.contentRevision=content.revision||'baseline';return result;
}
export function applyProfile(profile){
 const set=(selector,value)=>{const el=document.querySelector(selector);if(el){el.textContent=value;el.style.whiteSpace='pre-line';}};
 if(profile.name!==undefined){const mark=document.querySelector('.wordmark');mark.firstChild.textContent=profile.name.toUpperCase();mark.setAttribute('aria-label',profile.name+', home');const year=document.getElementById('copyright-year');year.nextSibling.textContent=' '+profile.name.toUpperCase();document.title=profile.name+' — Ideas take the stage.';}
 if(profile.role!==undefined||profile.location!==undefined){const caption=document.querySelector('.brand-caption');caption.textContent=(profile.role??'Creative Director')+' /\n'+(profile.location??'Hong Kong');caption.style.whiteSpace='pre-line';}
 if(profile.location!==undefined)set('.preview-label',profile.location.toUpperCase());
 for(const [key,selector]of Object.entries({aboutTitle:'#about-title',aboutIntro:'.about-copy>p:first-child',aboutBody:'.about-copy>p:nth-child(2)',contactTitle:'.contact-content h2'}))if(profile[key]!==undefined)set(selector,profile[key]);
 if(profile.email!==undefined)for(const el of document.querySelectorAll('.contact-email,.menu-email')){el.firstChild.textContent=profile.email+' ';el.href='mailto:'+profile.email;}
 if(profile.linkedin!==undefined)for(const el of document.querySelectorAll('a[href*="linkedin.com"]'))el.href=profile.linkedin;
 if(profile.metaDescription!==undefined)document.querySelector('meta[name="description"]').content=profile.metaDescription;
}
