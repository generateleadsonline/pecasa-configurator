// Mirrors the preview's indicative geometry. Width/depth are the overall envelope.
export function planGeometry(design){
 const w=design.width,d=design.depth,lshape=design.style==='lshape';
 const bodyDepth=lshape?d*.65:d,wingWidth=lshape?w*.38:0;
 const outline=lshape?[[0,0],[w,0],[w,bodyDepth],[wingWidth,bodyDepth],[wingWidth,d],[0,d]]:[[0,0],[w,0],[w,d],[0,d]];
 const area=w*d*(lshape?.65+.38*.35:1);
 const frontSpan=lshape?w-wingWidth:w;
 const doorWidth=Math.min(frontSpan-(lshape?.32:.52),design.glazing==='french'?2.35:frontSpan*.78);
 return {outline,area,bodyDepth,wingWidth,frontSpan,doorWidth,doorStart:wingWidth+(frontSpan-doorWidth)/2,frontY:bodyDepth};
}
