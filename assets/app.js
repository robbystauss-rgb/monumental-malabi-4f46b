function el(id){return document.getElementById(id)}
function currency(n){return `$${Number(n).toFixed(2)}`}
function freeHats(q){return Math.floor(q/12)}
function estimateHatTotal(q,premium){
  const unit=premium?35:30;
  const free=freeHats(q);
  return {unit,free,billed:Math.max(q-free,0),total:Math.max(q-free,0)*unit};
}
function estimatePatchTotal(q){
  const unit=5;
  return {unit,total:Math.max(q,1)*unit};
}
function driveImage(id,size='w1200'){
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=${size}` : '';
}
function render112Grid(){
  const query=(el('search112')?.value||'').toLowerCase().trim();
  const cat=el('cat112')?.value||'All';
  const mount=el('grid112');
  if(!mount) return;
  const items=(window.REC_DATA?.color112||[]).filter(item=>{
    const inCat=cat==='All' || item.category===cat;
    const inSearch=!query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
    return inCat && inSearch;
  });
  if(el('count112')) el('count112').textContent = `${items.length} colorways shown`;
  mount.innerHTML = items.map(item => `
    <article class="color-card">
      <div><small>${item.category}</small><b>${item.name}</b></div>
      <div class="meta"><span class="pill">112 Trucker</span></div>
    </article>`).join('');
}
function render168Grid(){
  const mount=el('grid168');
  const items=window.REC_DRIVE?.assets168||[];
  if(!mount || !items.length) return false;
  mount.innerHTML = items.map(item=>`
    <article class="product-card">
      <img class="product-thumb js-swap-image" src="${driveImage(item.front,'w900')}" alt="${item.name} 168 front">
      <div class="card-body"><small>168 Seven Panel</small><b>${item.name}</b>
        <div class="view-switch"><button class="is-active" type="button" data-src="${driveImage(item.front,'w900')}">Front</button><button type="button" data-src="${driveImage(item.side,'w900')}">Side</button><button type="button" data-src="${driveImage(item.back,'w900')}">Back</button></div>
      </div>
    </article>`).join('');
  return true;
}
function renderImageList(items,mountId,badge){
  const mount=el(mountId);
  if(!mount || !items?.length) return false;
  mount.innerHTML = items.map(item=>`<article class="product-card"><img class="product-thumb" src="${driveImage(item.image,'w900')}" alt="${item.name}"><div class="card-body"><small>${badge}</small><b>${item.name}</b></div></article>`).join('');
  return true;
}
function renderSimpleList(key,mountId,badge){
  if(mountId==='grid168' && render168Grid()) return;
  if(mountId==='grid256' && renderImageList(window.REC_DRIVE?.assets256||[], mountId, badge)) return;
  const mount=el(mountId); if(!mount) return;
  const items=window.REC_DATA[key]||[];
  mount.innerHTML=items.map(name=>`<article class="color-card"><div><small>${badge}</small><b>${name}</b></div></article>`).join('');
}
function renderPrinted(){
  const mount=el('printedCollections'); if(!mount) return;
  const groups=window.REC_DATA.printed||{};
  const real112pfp = window.REC_DRIVE?.assets112PFP || [];
  let html = '';
  if(real112pfp.length){
    html += `<section class="list-panel"><h3>112PFP Printed Five Panel</h3><p class="lead">${real112pfp.length} real product images loaded from the confirmed 112PFP asset set.</p><div class="color-grid product-grid">${real112pfp.map(item=>`<article class="product-card"><img class="product-thumb" src="${driveImage(item.image,'w900')}" alt="${item.name}"><div class="card-body"><small>112PFP</small><b>${item.name}</b></div></article>`).join('')}</div></section>`;
  }
  html += Object.entries(groups).filter(([name])=>name!=='112PFP Printed Five Panel').map(([name,items])=>`<section class="list-panel"><h3>${name}</h3><p class="lead">${items.length} listed patterns from the current catalog.</p><div class="color-grid">${items.map(item=>`<article class="color-card"><div><small>Printed / Camo</small><b>${item}</b></div></article>`).join('')}</div></section>`).join('');
  mount.innerHTML = html;
}
function updateHeroImages(){
  const d = window.REC_DRIVE || {};
  const hero168 = el('hero168Image');
  const hero256 = el('hero256Image');
  const heroPrinted = el('heroPrintedImage');
  if(hero168 && d.hero168Chart) hero168.src = driveImage(d.hero168Chart,'w1400');
  if(hero256 && d.hero256) hero256.src = driveImage(d.hero256,'w1200');
  if(heroPrinted && d.hero112PFP) heroPrinted.src = driveImage(d.hero112PFP,'w1200');
}
function placementLabel(value){
  return ({'front-center':'Front Center','left-front':'Left Front Panel','right-front':'Right Front Panel','side':'Side Panel','rear':'Rear / Back'})[value] || 'Front Center';
}
function setPlacement(value){
  const select=el('patchPlacement');
  if(select) select.value=value;
  const overlay=el('patchOverlay');
  if(overlay) overlay.dataset.placement=value;
  const badge=el('previewBadge');
  if(badge) badge.textContent=placementLabel(value);
  document.querySelectorAll('.placement-chip').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.placement===value));
  const offView=el('offViewNote');
  if(offView) offView.hidden = !['side','rear'].includes(value);
  updateMockup();
}
function syncOrderType(){
  const patchOnly=el('orderType')?.value==='patch';
  document.querySelectorAll('.hat-only').forEach(node=>node.hidden=patchOnly);
  const wrap=el('mockupWrap');
  const card=el('patchOnlyCard');
  if(wrap) wrap.hidden=patchOnly;
  if(card) card.hidden=!patchOnly;
  updateMockup();
}
function updateMockup(){
  const patchOnly=el('orderType')?.value==='patch';
  const family=el('orderFamily')?.value || '112';
  const driveMap=window.REC_DRIVE?.mockupBase||{};
  const fallbackMap={'112':'assets/112-black.png','168':'assets/168-hero.png','256':'assets/256-hero.png','112PM':'assets/112-black.png','112P':'assets/112-black.png','112PFP':'assets/112-black.png','168P':'assets/168-hero.png','256P':'assets/256-hero.png'};
  const base=el('mockupBase');
  if(base) base.src = driveMap[family] ? driveImage(driveMap[family],'w1200') : (fallbackMap[family] || 'assets/112-black.png');

  const overlay=el('patchOverlay');
  const placement=el('patchPlacement')?.value || 'front-center';
  const size=el('patchSize')?.value || 'medium';
  if(overlay){overlay.dataset.placement=placement;overlay.dataset.size=size;}
  const badge=el('previewBadge');
  if(badge) badge.textContent=patchOnly ? 'Patch Only' : placementLabel(placement);

  const text=el('patchText')?.value?.trim() || 'Your patch preview';
  const label=el('patchLabel');
  const img=el('patchPreview');
  if(img && img.dataset.hasimg==='true'){
    if(label) label.style.display='none';
    img.style.display='block';
  } else {
    if(img) img.style.display='none';
    if(label){label.style.display='block';label.textContent=text;}
  }

  const qty=Math.max(parseInt(el('quantity')?.value || '1',10)||1,1);
  if(el('summaryBox')){
    if(patchOnly){
      const est=estimatePatchTotal(qty);
      el('summaryBox').innerHTML = `<b>Custom patch only</b><br>Starting unit price: ${currency(est.unit)}<br>Quantity: ${qty}<br><strong>Estimated starting total: ${currency(est.total)}</strong><br><span class="note">Custom die-cuts, oversize patches, special backing, or complex artwork may change final pricing.</span>`;
    } else {
      const premium=el('patchTier')?.value==='premium';
      const est=estimateHatTotal(qty,premium);
      el('summaryBox').innerHTML = `<b>${premium?'Premium hat + patch':'Standard hat + custom patch'}</b><br>Unit price: ${currency(est.unit)}<br>Quantity entered: ${qty}<br>Free hats earned: ${est.free}<br>Estimated billed hats: ${est.billed}<br>Placement: ${placementLabel(placement)}<br><strong>Estimated total: ${currency(est.total)}</strong>`;
    }
  }
}
function bindUpload(){
  const input=el('artUpload');
  if(!input) return;
  input.addEventListener('change', e=>{
    const file=e.target.files && e.target.files[0];
    const img=el('patchPreview');
    const label=el('patchLabel');
    if(!file || !img) return;
    const reader=new FileReader();
    reader.onload = () => {img.src = reader.result;img.dataset.hasimg='true';img.style.display='block';if(label) label.style.display='none';};
    reader.readAsDataURL(file);
  });
}
function bindViewSwitches(){
  document.querySelectorAll('.view-switch').forEach(group=>{
    const img = group.closest('.product-card')?.querySelector('.js-swap-image');
    if(!img) return;
    group.querySelectorAll('button').forEach(btn=>btn.addEventListener('click', ()=>{img.src = btn.dataset.src;group.querySelectorAll('button').forEach(b=>b.classList.remove('is-active'));btn.classList.add('is-active');}));
  });
}
function orderText(){
  const patchOnly=el('orderType')?.value==='patch';
  const qty=Math.max(parseInt(el('quantity')?.value||'1',10)||1,1);
  const common=[`REC Mama Made order request`,``,`Name: ${el('customerName')?.value||''}`,`Email: ${el('customerEmail')?.value||''}`,`Order type: ${patchOnly?'Custom Patch Only':'Custom Hat + Patch'}`];
  if(!patchOnly){
    const est=estimateHatTotal(qty,el('patchTier')?.value==='premium');
    common.push(`Hat family: ${el('orderFamily')?.value||''}`,`Colorway / pattern: ${el('colorway')?.value||''}`,`Hat tier: ${el('patchTier')?.value||''}`,`Patch placement: ${placementLabel(el('patchPlacement')?.value||'front-center')}`,`Quantity: ${qty}`,`Free hats earned: ${est.free}`,`Estimated total: ${currency(est.total)}`);
  } else {
    const est=estimatePatchTotal(qty);
    common.push(`Quantity: ${qty}`,`Estimated starting total: ${currency(est.total)}`);
  }
  common.push(`Patch shape: ${el('patchShape')?.value||''}`,`Patch size: ${el('patchSize')?.value||''}`,`Patch text / initials: ${el('patchText')?.value||''}`,`Notes: ${el('orderNotes')?.value||''}`);
  return common.join('\n');
}
function copyOrderSummary(){
  navigator.clipboard.writeText(orderText()).then(()=>{const btn=el('copyBtn');if(btn){btn.textContent='Copied';setTimeout(()=>btn.textContent='Copy order summary',1400);}});
}
function mailtoOrder(){
  const subject=encodeURIComponent('REC Mama Made custom order request');
  const body=encodeURIComponent(orderText());
  window.location.href=`mailto:?subject=${subject}&body=${body}`;
}
document.addEventListener('DOMContentLoaded', ()=>{
  updateHeroImages();
  render112Grid();
  renderSimpleList('collection168','grid168','168');
  renderSimpleList('collection256','grid256','256');
  renderPrinted();
  bindViewSwitches();
  ['search112','cat112'].forEach(id=>{const node=el(id);if(node){node.addEventListener('input',render112Grid);node.addEventListener('change',render112Grid);}});
  ['orderFamily','patchTier','patchShape','patchSize','patchText','quantity','colorway'].forEach(id=>{const node=el(id);if(node){node.addEventListener('input',updateMockup);node.addEventListener('change',updateMockup);}});
  if(el('orderType')) el('orderType').addEventListener('change',syncOrderType);
  if(el('patchPlacement')) el('patchPlacement').addEventListener('change',e=>setPlacement(e.target.value));
  document.querySelectorAll('.placement-chip').forEach(btn=>btn.addEventListener('click',()=>setPlacement(btn.dataset.placement)));
  bindUpload();
  syncOrderType();
  setPlacement(el('patchPlacement')?.value||'front-center');
  if(el('copyBtn')) el('copyBtn').addEventListener('click', copyOrderSummary);
  if(el('emailBtn')) el('emailBtn').addEventListener('click', mailtoOrder);
});
