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

// Indicative furniture stays in the rear main body, including for an L shape.
// Coordinates are metres from the back-left corner and match the PDF symbols.
export function furniturePlacement(design){
 if(design.style==='pergola')return null;
 const sizes={office:[1.4,.65],studio:[1.5,.7],retreat:[1.6,.85],gym:[.65,1.4]};
 const size=sizes[design.purpose];
 if(!size)return null;
 const {bodyDepth}=planGeometry(design),margin=.05;
 const width=Math.min(size[0],design.width*.45),height=Math.min(size[1],bodyDepth*.4);
 const x=design.width*.12,y=design.kitchen!=='none'?bodyDepth*.55-height/2:bodyDepth*.13;
 const chair=design.purpose==='gym'?null:{x:x+width*.5,y:y+height+.22,r:.16};
 const furniture={x,y,width,height,chair};
 const inside=(left,top,right,bottom)=>left>=margin&&top>=margin&&right<=design.width-margin&&bottom<=bodyDepth-margin;
 if(!inside(x,y,x+width,y+height))return null;
 if(chair&&!inside(chair.x-chair.r,chair.y-chair.r,chair.x+chair.r,chair.y+chair.r))return null;
 const fixtures=[];
 if(design.kitchen!=='none')fixtures.push({x:.13,y:.11,width:Math.min(1.6,design.width*.5),height:.49});
 if(design.bathroom!=='none'){
  const bw=Math.min(1.28,design.width*.36);
  fixtures.push({x:design.width-bw-.1,y:.1,width:bw,height:Math.min(design.bathroom==='shower'?1.6:1.18,bodyDepth*(design.bathroom==='shower'?.58:.45))});
 }
 for(const fixture of fixtures){
  const overlaps=x<fixture.x+fixture.width&&x+width>fixture.x&&y<fixture.y+fixture.height&&y+height>fixture.y;
  if(overlaps)return null;
  if(chair){
   const nearestX=Math.max(fixture.x,Math.min(chair.x,fixture.x+fixture.width));
   const nearestY=Math.max(fixture.y,Math.min(chair.y,fixture.y+fixture.height));
   if((chair.x-nearestX)**2+(chair.y-nearestY)**2<=chair.r**2)return null;
  }
 }
 return furniture;
}
