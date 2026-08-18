(function(){
  function byId(id){return document.getElementById(id)}
  function injectStyles(){
    if(byId('recCatalogBuilderStyles')) return;
    const style=document.createElement('style');
    style.id='recCatalogBuilderStyles';
    style.textContent='.catalog-build-link{display:inline-flex;margin-top:12px;color:var(--brand);font-weight:850;font-size:.9rem;text-decoration:underline;text-underline-offset:4px}.catalog-build-link:hover{color:var(--brand-2)}';
    document.head.appendChild(style);
  }
  function builderUrl(family,color){
    const url=new URL('order.html',window.location.href);
    if(family) url.searchParams.set('family',family);
    if(color) url.searchParams.set('color',color);
    return `${url.pathname.split('/').pop()}${url.search}`;
  }
  function addLink(card,family,color){
    if(!card || card.querySelector('.catalog-build-link') || !family || !color) return;
    const target=card.querySelector('.card-body') || card;
    const a=document.createElement('a');
    a.className='catalog-build-link';
    a.href=builderUrl(family,color);
    a.textContent='Build with this color →';
    a.setAttribute('aria-label',`Build a ${family} hat in ${color}`);
    target.appendChild(a);
  }
  function linkCatalogCards(){
    const path=location.pathname.toLowerCase();
    if(path.endsWith('/112.html') || path.endsWith('112.html')){
      document.querySelectorAll('#grid112 .color-card').forEach(card=>addLink(card,'112',card.querySelector('b')?.textContent?.trim()));
    }
    if(path.endsWith('/168.html') || path.endsWith('168.html')){
      document.querySelectorAll('#grid168 .product-card').forEach(card=>addLink(card,'168',card.querySelector('.card-body b')?.textContent?.trim()));
    }
    if(path.endsWith('/256.html') || path.endsWith('256.html')){
      document.querySelectorAll('#grid256 .product-card').forEach(card=>addLink(card,'256',card.querySelector('.card-body b')?.textContent?.trim()));
    }
    if(path.endsWith('/printed-camo.html') || path.endsWith('printed-camo.html')){
      const familyMap={'112PFP':'112PFP','112PM':'112PM','112P':'112P','168P':'168P','256P':'256P'};
      document.querySelectorAll('#printedCollections > section').forEach(section=>{
        const heading=section.querySelector('h3')?.textContent?.trim()||'';
        const key=Object.keys(familyMap).find(k=>heading.startsWith(k));
        const family=familyMap[key];
        if(!family) return;
        section.querySelectorAll('.color-card,.product-card').forEach(card=>addLink(card,family,card.querySelector('b')?.textContent?.trim()));
      });
    }
  }
  function applyBuilderParams(){
    if(!byId('orderFamily')) return;
    const p=new URLSearchParams(location.search);
    const family=p.get('family');
    const familyEl=byId('orderFamily');
    if(family && [...familyEl.options].some(o=>o.value===family)) familyEl.value=family;
    if(typeof window.populateColorways==='function') window.populateColorways(p.get('color')||undefined);
    const setters={orderType:p.get('type'),patchTier:p.get('tier'),patchShape:p.get('shape'),patchSize:p.get('size'),patchPlacement:p.get('placement')};
    Object.entries(setters).forEach(([id,value])=>{
      const node=byId(id);
      if(value && node && [...node.options].some(o=>o.value===value || o.textContent===value)) node.value=value;
    });
    const color=p.get('color');
    const colorEl=byId('colorway');
    if(color && colorEl && [...colorEl.options].some(o=>o.value===color)) colorEl.value=color;
    if(typeof window.syncOrderType==='function') window.syncOrderType();
    if(typeof window.setPlacement==='function') window.setPlacement(byId('patchPlacement')?.value||'front-center');
    if(typeof window.updateMockup==='function') window.updateMockup();
    if(typeof window.saveDraft==='function') window.saveDraft();
  }
  function buildShareUrl(){
    const url=new URL('order.html',location.href);
    const params={family:byId('orderFamily')?.value,color:byId('colorway')?.value,type:byId('orderType')?.value,tier:byId('patchTier')?.value,shape:byId('patchShape')?.value,size:byId('patchSize')?.value,placement:byId('patchPlacement')?.value};
    Object.entries(params).forEach(([k,v])=>{if(v) url.searchParams.set(k,v)});
    return url.href;
  }
  async function shareBuilder(){
    const url=buildShareUrl();
    const btn=byId('shareBtn');
    try{
      if(navigator.share){await navigator.share({title:'REC Mama Made custom hat configuration',url});return;}
      await navigator.clipboard.writeText(url);
    }catch(err){
      if(err?.name==='AbortError') return;
      const input=document.createElement('textarea');input.value=url;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();
    }
    if(btn){const old=btn.textContent;btn.textContent='Link copied';setTimeout(()=>btn.textContent=old,1400)}
  }
  function injectShareButton(){
    if(byId('shareBtn')) return;
    const actions=document.querySelector('.builder-actions');
    if(!actions) return;
    const button=document.createElement('button');
    button.className='btn btn-secondary';button.id='shareBtn';button.type='button';button.textContent='Share this setup';
    actions.insertBefore(button,actions.lastElementChild || null);
  }
  function run(){injectStyles();linkCatalogCards();injectShareButton();applyBuilderParams();byId('shareBtn')?.addEventListener('click',shareBuilder);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
