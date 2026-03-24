
function el(id){return document.getElementById(id)}
function currency(n){return `$${n.toFixed(2)}`}
function freeHats(q){return Math.floor(q/12)}
function estimateTotal(q,premium){
  const unit=premium?35:30;
  const free=freeHats(q);
  return {unit,free,billed:Math.max(q-free,0),total:Math.max(q-free,0)*unit};
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
      <div>
        <small>${item.category}</small>
        <b>${item.name}</b>
      </div>
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
      <div class="card-body">
        <small>168 Seven Panel</small>
        <b>${item.name}</b>
        <div class="view-switch">
          <button class="is-active" type="button" data-src="${driveImage(item.front,'w900')}">Front</button>
          <button type="button" data-src="${driveImage(item.side,'w900')}">Side</button>
          <button type="button" data-src="${driveImage(item.back,'w900')}">Back</button>
        </div>
      </div>
    </article>
  `).join('');
  return true;
}
function renderImageList(items,mountId,badge){
  const mount=el(mountId);
  if(!mount || !items?.length) return false;
  mount.innerHTML = items.map(item=>`
    <article class="product-card">
      <img class="product-thumb" src="${driveImage(item.image,'w900')}" alt="${item.name}">
      <div class="card-body">
        <small>${badge}</small>
        <b>${item.name}</b>
      </div>
    </article>
  `).join('');
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
    html += `
      <section class="list-panel">
        <h3>112PFP Printed Five Panel</h3>
        <p class="lead">${real112pfp.length} real product images loaded from the confirmed 112PFP asset set.</p>
        <div class="color-grid product-grid">${real112pfp.map(item=>`
          <article class="product-card">
            <img class="product-thumb" src="${driveImage(item.image,'w900')}" alt="${item.name}">
            <div class="card-body">
              <small>112PFP</small>
              <b>${item.name}</b>
            </div>
          </article>
        `).join('')}</div>
      </section>
    `;
  }
  html += Object.entries(groups).filter(([name])=>name!=='112PFP Printed Five Panel').map(([name,items])=>`
    <section class="list-panel">
      <h3>${name}</h3>
      <p class="lead">${items.length} listed patterns from the current catalog.</p>
      <div class="color-grid">${items.map(item=>`<article class="color-card"><div><small>Printed / Camo</small><b>${item}</b></div></article>`).join('')}</div>
    </section>
  `).join('');
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
function updateMockup(){
  const family=el('orderFamily')?.value || '112';
  const driveMap=window.REC_DRIVE?.mockupBase||{};
  const fallbackMap={
    '112':'assets/112-black.png',
    '168':'assets/168-hero.png',
    '256':'assets/256-hero.png',
    '112PM':'assets/112-black.png',
    '112P':'assets/112-black.png',
    '112PFP':'assets/112-black.png',
    '168P':'assets/168-hero.png',
    '256P':'assets/256-hero.png'
  };
  const base=el('mockupBase');
  if(base){
    base.src = driveMap[family] ? driveImage(driveMap[family],'w1200') : (fallbackMap[family] || 'assets/112-black.png');
  }
  const text=el('patchText')?.value?.trim() || 'Your patch preview';
  const label=el('patchLabel');
  const img=el('patchPreview');
  if(img && img.dataset.hasimg==='true'){
    label.style.display='none';
    img.style.display='block';
  } else {
    if(img) img.style.display='none';
    if(label){
      label.style.display='block';
      label.textContent=text;
    }
  }
  const qty=parseInt(el('quantity')?.value || '1',10);
  const premium=el('patchTier')?.value==='premium';
  const est=estimateTotal(isNaN(qty)?1:qty,premium);
  if(el('summaryBox')){
    el('summaryBox').innerHTML = `
      <b>${premium?'Premium hat + patch':'Hat + custom patch'}</b><br>
      Unit price: ${currency(est.unit)}<br>
      Quantity entered: ${qty || 1}<br>
      Free hats earned: ${est.free}<br>
      Estimated billed hats: ${est.billed}<br>
      <strong>Estimated total: ${currency(est.total)}</strong>
    `;
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
    reader.onload = () => {
      img.src = reader.result;
      img.dataset.hasimg='true';
      img.style.display='block';
      if(label) label.style.display='none';
    };
    reader.readAsDataURL(file);
  });
}
function bindViewSwitches(){
  document.querySelectorAll('.view-switch').forEach(group=>{
    const img = group.closest('.product-card')?.querySelector('.js-swap-image');
    if(!img) return;
    group.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        img.src = btn.dataset.src;
        group.querySelectorAll('button').forEach(b=>b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  });
}
function copyOrderSummary(){
  const fields={
    name:el('customerName')?.value||'',
    email:el('customerEmail')?.value||'',
    family:el('orderFamily')?.value||'',
    color:el('colorway')?.value||'',
    patch:el('patchTier')?.value||'',
    shape:el('patchShape')?.value||'',
    text:el('patchText')?.value||'',
    qty:el('quantity')?.value||'1',
    notes:el('orderNotes')?.value||''
  };
  const qty=parseInt(fields.qty||'1',10)||1;
  const est=estimateTotal(qty, fields.patch==='premium');
  const body = `REC Mama Made order request\n\nName: ${fields.name}\nEmail: ${fields.email}\nHat family: ${fields.family}\nColorway / pattern: ${fields.color}\nPatch tier: ${fields.patch}\nPatch shape: ${fields.shape}\nPatch text / initials: ${fields.text}\nQuantity: ${qty}\nFree hats earned: ${est.free}\nEstimated total: ${currency(est.total)}\nNotes: ${fields.notes}`;
  navigator.clipboard.writeText(body).then(()=>{
    const btn=el('copyBtn');
    if(btn){
      btn.textContent='Copied';
      setTimeout(()=>btn.textContent='Copy order summary',1400);
    }
  });
}
function mailtoOrder(){
  const qty=parseInt(el('quantity')?.value||'1',10)||1;
  const est=estimateTotal(qty, el('patchTier')?.value==='premium');
  const subject=encodeURIComponent('REC Mama Made custom hat order request');
  const body=encodeURIComponent(`Name: ${el('customerName')?.value||''}\nEmail: ${el('customerEmail')?.value||''}\nHat family: ${el('orderFamily')?.value||''}\nColorway / pattern: ${el('colorway')?.value||''}\nPatch tier: ${el('patchTier')?.value||''}\nPatch shape: ${el('patchShape')?.value||''}\nPatch text / initials: ${el('patchText')?.value||''}\nQuantity: ${qty}\nFree hats earned: ${est.free}\nEstimated total: ${currency(est.total)}\nNotes: ${el('orderNotes')?.value||''}`);
  window.location.href=`mailto:?subject=${subject}&body=${body}`;
}
document.addEventListener('DOMContentLoaded', ()=>{
  updateHeroImages();
  render112Grid();
  renderSimpleList('collection168','grid168','168');
  renderSimpleList('collection256','grid256','256');
  renderPrinted();
  bindViewSwitches();
  ['search112','cat112','orderFamily','patchTier','patchShape','patchText','quantity','colorway'].forEach(id=>{
    const node=el(id);
    if(node) node.addEventListener('input', ()=>{ if(id==='search112' || id==='cat112') render112Grid(); updateMockup(); });
    if(node) node.addEventListener('change', ()=>{ if(id==='search112' || id==='cat112') render112Grid(); updateMockup(); });
  });
  bindUpload();
  updateMockup();
  if(el('copyBtn')) el('copyBtn').addEventListener('click', copyOrderSummary);
  if(el('emailBtn')) el('emailBtn').addEventListener('click', mailtoOrder);
});
