export const PINNED_PROJECT_IDS=['1izI9spxl5fjwdvyw8g6iowBpPPAE5p0j','1XVL41h99QcZDcYzZfl28SbsFy4QJNh4_','19XhwSYzZ8gheZZVxhBB17S0_IruFdHeW'];

export function dateFromProjectTitle(title){
  const prefix=title.match(/^\s*((?:19|20)\d{2})\b/);
  const prefixYear=prefix?Number(prefix[1]):null;
  const dates=[...title.matchAll(/\b((?:19|20)\d{2})[\s._/-]+(0?[1-9]|1[0-2])(?:[\s._/-]+(0?[1-9]|[12]\d|3[01]))?(?!\d)/g)];
  for(const match of dates){
    const year=Number(match[1]),month=Number(match[2]),day=match[3]?Number(match[3]):null;
    if(day){const test=new Date(Date.UTC(year,month-1,day));if(test.getUTCMonth()!==month-1||test.getUTCDate()!==day)continue;}
    return {year,month,day,precision:day?'day':'month',source:'folder-name',sourceText:match[0],prefixYear,requiresReview:prefixYear!==null&&prefixYear!==year};
  }
  return {year:prefixYear,month:null,day:null,precision:prefixYear?'year':'unknown',source:'folder-name',sourceText:prefix?.[1]||null,prefixYear,requiresReview:false};
}

export function sortProjectEntries(entries,pinned=PINNED_PROJECT_IDS){
  const sorted=[...entries].sort((a,b)=>{
    const ai=pinned.indexOf(a.id),bi=pinned.indexOf(b.id);
    const rankA=ai<0?pinned.length:ai,rankB=bi<0?pinned.length:bi;
    if(rankA!==rankB)return rankA-rankB;
    for(const key of ['year','month','day']){
      const difference=(b.projectDate?.[key]??0)-(a.projectDate?.[key]??0);
      if(difference)return difference;
    }
    return a.sourceOrder-b.sourceOrder;
  });
  const seen=new Set(),result=[];
  for(const project of sorted){
    if(!project.orderGroup){result.push(project);continue;}
    if(seen.has(project.orderGroup))continue;
    seen.add(project.orderGroup);
    result.push(...sorted.filter(p=>p.orderGroup===project.orderGroup));
  }
  return result;
}
