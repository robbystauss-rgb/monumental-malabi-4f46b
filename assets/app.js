
function el(id){return document.getElementById(id)}
function currency(n){return `$${n.toFixed(2)}`}
function freeHats(q){return Math.floor(q/12)}
function estimateTotal(q,premium){
  const unit=premium?35:30;
  const free=freeHats(q);
  return {unit,free,billed:Math.max(q-free,0),total:Math.max(q-free,0)*unit};
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
  el('count112').textContent = `${items.length} colorways shown`;
  mount.innerHTML = items.map(item => `
    <article class="color-card">
      <div>
        <small>${item.category}</small>
        <b>${item.name}</b>
      </div>
      <div class="meta"><span class="pill">112 Trucker</span></div>
    </article>`).join('');
}
function renderSimpleList(key,mountId,badge){
  const mount=el(mountId); if(!mount) return;
  const items=window.REC_DATA[key]||[];
  mount.innerHTML=items.map(name=>`<article class="color-card"><div><small>${badge}</small><b>${name}</b></div></article>`).join('');
}
function renderPrinted(){
  const mount=el('printedCollections'); if(!mount) return;
  const groups=window.REC_DATA.printed||{};
  mount.innerHTML = Object.entries(groups).map(([name,items])=>`
    <section class="list-panel">
      <h3>${name}</h3>
      <p class="lead">${items.length} listed patterns from the current catalog.</p>
      <div class="color-grid">${items.map(item=>`<article class="color-card"><div><small>Printed / Camo</small><b>${item}</b></div></article>`).join('')}</div>
    </section>
  `).join('');
}
function updateMockup(){
  const family=el('orderFamily')?.value || '112';
  const map={
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
  if(base) base.src = map[family] || 'assets/112-black.png';
  const text=el('patchText')?.value?.trim() || 'Your patch preview';
  const label=el('patchLabel');
  const img=el('patchPreview');
  if(img && img.dataset.hasimg==='true'){
    label.style.display='none';
    img.style.display='block';
  } else {
    img.style.display='none';
    label.style.display='block';
    label.textContent=text;
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
      label.style.display='none';
    };
    reader.readAsDataURL(file);
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
  navigator.clipboard.writeText(body).then(()=>{const btn=el('copyBtn'); if(btn){btn.textContent='Copied'; setTimeout(()=>btn.textContent='Copy order summary',1400)}});
}
function mailtoOrder(){
  const qty=parseInt(el('quantity')?.value||'1',10)||1;
  const est=estimateTotal(qty, el('patchTier')?.value==='premium');
  const subject=encodeURIComponent('REC Mama Made custom hat order request');
  const body=encodeURIComponent(`Name: ${el('customerName')?.value||''}\nEmail: ${el('customerEmail')?.value||''}\nHat family: ${el('orderFamily')?.value||''}\nColorway / pattern: ${el('colorway')?.value||''}\nPatch tier: ${el('patchTier')?.value||''}\nPatch shape: ${el('patchShape')?.value||''}\nPatch text / initials: ${el('patchText')?.value||''}\nQuantity: ${qty}\nFree hats earned: ${est.free}\nEstimated total: ${currency(est.total)}\nNotes: ${el('orderNotes')?.value||''}`);
  window.location.href=`mailto:?subject=${subject}&body=${body}`;
}
document.addEventListener('DOMContentLoaded', ()=>{
  render112Grid();
  renderSimpleList('collection168','grid168','168');
  renderSimpleList('collection256','grid256','256');
  renderPrinted();
  ['search112','cat112','orderFamily','patchTier','patchShape','patchText','quantity','colorway'].forEach(id=>{
    const node=el(id); if(node) node.addEventListener('input', ()=>{ if(id==='search112' || id==='cat112') render112Grid(); updateMockup(); });
    if(node) node.addEventListener('change', ()=>{ if(id==='search112' || id==='cat112') render112Grid(); updateMockup(); });
  });
  bindUpload(); updateMockup();
  if(el('copyBtn')) el('copyBtn').addEventListener('click', copyOrderSummary);
  if(el('emailBtn')) el('emailBtn').addEventListener('click', mailtoOrder);
});
