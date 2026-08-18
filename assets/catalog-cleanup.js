(function(){
  if(!window.REC_DATA || !window.REC_HAT_CATALOG) return;
  const c=window.REC_HAT_CATALOG;
  if(c['112']) window.REC_DATA.color112=c['112'].colors.map(name=>({category:'Verified',name}));
  if(c['168']) window.REC_DATA.collection168=[...c['168'].colors];
  if(c['256']) window.REC_DATA.collection256=[...c['256'].colors];
  window.REC_DATA.printed={
    '112PM Printed Mesh': [...(c['112PM']?.colors||[])],
    '112P Printed Trucker': [...(c['112P']?.colors||[])],
    '112PFP Printed Five Panel': [...(c['112PFP']?.colors||[])],
    '168P Printed Seven Panel': [...(c['168P']?.colors||[])],
    '256P Printed Gramps': [...(c['256P']?.colors||[])]
  };
})();
