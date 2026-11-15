import {clone,canonical,validateContent} from './content-model.mjs';
import {rebaseLibraryCleanup} from './draft-rebase.mjs';
import {rebasePermanentDeletion} from './media-purge.mjs';

export function restoreOwnerDraft(saved,published,entries){
 if(!saved?.draft)return {draft:clone(published),state:'current'};
 validateContent(saved.draft,entries);
 const live=canonical(published),local=canonical(saved.draft);
 if(saved.baseline===live)return {draft:clone(saved.draft),state:local===live?'current':'restored'};
 // There is nothing unpublished to lose when the old draft was unmodified,
 // or when it is the exact content that has just reached the public site.
 if(local===saved.baseline||local===live)return {draft:clone(published),state:'refreshed'};
 const deletion=rebasePermanentDeletion(saved.baseline,published,saved.draft);if(deletion)return {draft:deletion,state:'purged'};
 const merged=rebaseLibraryCleanup(saved.baseline,published,saved.draft,entries);
 if(merged)return {draft:merged,state:'merged'};
 return {draft:clone(saved.draft),state:'conflict'};
}

export function ownerDraftStatus({ready,busy,stale,changed,storageOK=true,loadError=false}){
 if(!ready)return loadError?'網站內容未能載入':'正在讀取網站內容…';
 if(!storageOK)return '瀏覽器無法儲存草稿，請下載備份';
 if(stale)return '內容已讀取 · 草稿版本需核對';
 if(busy)return '正在提交 GitHub…';
 return changed?'草稿已自動儲存 · 尚未發佈':'內容與已提交版本一致';
}
