function estimateHatTotal(q,premium){
  const unit=premium?35:30;
  const paid=Math.max(parseInt(q,10)||1,1);
  const free=Math.floor(paid/12);
  return {unit,free,billed:paid,received:paid+free,total:paid*unit};
}
