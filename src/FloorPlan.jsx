import React, {useId} from 'react';
import {FLOORS, PURPOSES, number} from './catalog.js';

export default function FloorPlan({design}) {
  const id=useId().replaceAll(':',''),w=design.width,d=design.depth;
  const s=Math.min(370/w,250/d),W=w*s,D=d*s,x=(550-W)/2-15,y=60+(250-D)/2;
  const lshape=design.style==='lshape',pergola=design.style==='pergola';
  // The 3D and PDF share this envelope: rear body 65% deep; left wing 38% wide.
  const mainDepth=lshape?d*.65:d,wingWidth=lshape?w*.38:0;
  const outline=lshape?[[0,0],[w,0],[w,mainDepth],[wingWidth,mainDepth],[wingWidth,d],[0,d]]:[[0,0],[w,0],[w,d],[0,d]];
  const path=outline.map(([px,py],i)=>`${i?'L':'M'}${x+px*s} ${y+py*s}`).join(' ')+'Z';
  const floor=FLOORS.find(f=>f.id===design.floor)||FLOORS[0];
  const purpose=pergola?'retreat':design.purpose,purposeName=PURPOSES.find(p=>p.id===purpose)?.label||'Garden room';
  const frontSpan=w-wingWidth,doorWidth=Math.min(frontSpan-(lshape?.32:.52),design.glazing==='french'?2.35:frontSpan*.78);
  const doorX=wingWidth+(frontSpan-doorWidth)/2,doorY=mainDepth;
  const panels=design.glazing==='bifold'?Math.max(3,Math.round(doorWidth/.76)):2;
  const windowWidth=Math.min(1.35,mainDepth*.52),cornerGlazing=['ecke','ofiko'].includes(design.style);
  const px=m=>x+m*s,py=m=>y+m*s;
  const glazing=(left,top,width,vertical=false,key='door')=><g key={key}>
    <path d={`M${px(left)} ${py(top)}${vertical?'v':'h'}${width*s}`} stroke="#cee9e6" strokeWidth="9"/>
    <path d={`M${px(left)} ${py(top)}${vertical?'v':'h'}${width*s}`} stroke="#18746c" strokeWidth="2"/>
  </g>;
  const furnitureWidth=design.bathroom!=='none'?Math.max(.9,w-Math.min(1.28,w*.36)-.2):w;
  const deskWidth=Math.min(1.55,furnitureWidth*.5),deskCenter=furnitureWidth*.33;
  const deskY=design.kitchen==='kitchenette'?mainDepth*.55:mainDepth*.25;
  const fixtureDepth=design.bathroom==='shower'?Math.min(1.6,mainDepth*.58):Math.min(1.18,mainDepth*.45);
  const fixtureWidth=Math.min(1.28,w*.36),fixtureX=w-fixtureWidth-.1;
  return <div className="floor-plan"><svg viewBox="0 0 550 400" role="img" aria-labelledby={`${id}-title ${id}-description`}>
    <title id={`${id}-title`}>{`Illustrative ${number(w)} by ${number(d)} metre ${lshape?'L-shaped ':''}${pergola?'pergola':'garden room'} plan`}</title>
    <desc id={`${id}-description`}>{`${purposeName}. ${pergola?'Open structure with no enclosed doors or walls.':`Front ${design.glazing==='french'?'double':design.glazing==='bifold'?'bi-fold':'sliding'} doors. ${cornerGlazing?'Corner glazing. ':''}${design.window==='none'?'No optional side windows.':`${design.window==='both'?'Left and right':design.window==='left'?'Left':'Right'} side window${design.window==='both'?'s':''}.`}`} Furniture, openings and fitted options are illustrative. Overall external dimensions; final layout is agreed with Pecasa.`}</desc>
    <defs>
      <pattern id={`${id}-planks`} width={.22*s} height={1.5*s} patternUnits="userSpaceOnUse"><path d={`M0 0V${1.5*s} M0 0H${.22*s}`} stroke="#6e604d" strokeOpacity=".35" strokeWidth=".7"/></pattern>
      <clipPath id={`${id}-footprint`}><path d={path}/></clipPath>
    </defs>
    <path d={path} fill={pergola&&!design.decking?'#d7ddd6':floor.colour}/>
    {(!pergola||design.decking)&&<path d={path} fill={`url(#${id}-planks)`}/>}
    <g clipPath={`url(#${id}-footprint)`}>
      {['office','studio'].includes(purpose)?<g>
        <rect x={px(deskCenter-deskWidth/2)} y={py(deskY-.31)} width={deskWidth*s} height={.62*s} rx="2" fill="#b99765" stroke="#8c734e" strokeWidth=".7"/>
        {purpose==='office'&&<rect x={px(deskCenter-.275)} y={py(deskY-.18)} width={.55*s} height={.065*s} fill="#314c45"/>}
        <rect x={px(deskCenter+.1-.235)} y={py(Math.min(mainDepth-.32,deskY+.72)-.225)} width={.47*s} height={.45*s} rx="7" fill="#879a8e" stroke="#60756a" strokeWidth="1"/>
      </g>:purpose==='gym'?<g>
        <rect x={px(furnitureWidth*.68-.365)} y={py(Math.max(.12,mainDepth*.37-.74))} width={.73*s} height={Math.min(1.48,mainDepth-.24)*s} rx="3" fill="#70817b"/>
        <rect x={px(Math.max(.1,furnitureWidth*.27-.4))} y={py(Math.max(.12,mainDepth*.5-.8))} width={Math.min(.8,furnitureWidth*.4)*s} height={Math.min(1.6,mainDepth-.24)*s} rx="2" fill="#b9c7b4"/>
      </g>:<g>
        <rect x={px(furnitureWidth*.5-Math.min(1.95,furnitureWidth*.64)/2)} y={py(Math.max(.1,mainDepth*.28-.385))} width={Math.min(1.95,furnitureWidth*.64)*s} height={Math.min(.77,mainDepth*.4)*s} rx="8" fill="#a5b1a0" stroke="#6b8173" strokeWidth="1"/>
        <circle cx={px(furnitureWidth*.5)} cy={py(mainDepth*.69)} r={Math.min(.42,mainDepth*.15)*s} fill="#b99765"/>
      </g>}
      {!pergola&&design.kitchen==='kitchenette'&&<g>
        <rect x={px(.13)} y={py(.115)} width={Math.min(1.6,w*.5)*s} height={.49*s} fill="#d8d2c4" stroke="#6d7c71"/>
        <rect x={px(.13+Math.min(1.6,w*.5)*.22)} y={py(.2)} width={.31*s} height={.25*s} fill="#8a9b96"/>
      </g>}
      {!pergola&&design.bathroom!=='none'&&<g>
        <rect x={px(fixtureX)} y={py(.1)} width={fixtureWidth*s} height={fixtureDepth*s} fill="#e5eae6" stroke="#3f5a50" strokeWidth="3"/>
        <ellipse cx={px(fixtureX+fixtureWidth*.31)} cy={py(.4)} rx={.14*s} ry={.2*s} fill="white" stroke="#667c73"/>
        {design.bathroom==='shower'&&<rect x={px(fixtureX+fixtureWidth*.53)} y={py(.1+fixtureDepth*.53)} width={fixtureWidth*.43*s} height={fixtureDepth*.42*s} fill="#cee9e6" stroke="#667c73"/>}
      </g>}
    </g>
    <path d={path} fill="none" stroke="#293d38" strokeWidth={pergola?2:7} strokeDasharray={pergola?'7 5':undefined}/>
    {pergola?outline.map(([left,top],i)=><rect key={i} x={px(left)-4} y={py(top)-4} width="8" height="8" fill="#293d38"/>):<>
      {glazing(doorX,doorY,doorWidth)}
      {Array.from({length:panels-1},(_,i)=><path key={i} d={`M${px(doorX+doorWidth*(i+1)/panels)} ${py(doorY)-4}v8`} stroke="#315f56" strokeWidth="1"/>)}
      {lshape&&<>{glazing(.1,d,Math.max(.2,wingWidth-.2),false,'wing-glass')}{glazing(wingWidth,mainDepth+.06,d-mainDepth-.12,true,'notch-glass')}</>}
      {['left','both'].includes(design.window)&&glazing(0,mainDepth/2+.05-windowWidth/2,windowWidth,true,'left-window')}
      {cornerGlazing?glazing(w,d*.28,d*.72,true,'corner-glass'):['right','both'].includes(design.window)&&glazing(w,mainDepth/2-.05-windowWidth/2,windowWidth,true,'right-window')}
    </>}
    <g stroke="#6b8279" strokeWidth="1"><path d={`M${x} ${y-24}H${x+W} M${x} ${y-31}v14 M${x+W} ${y-31}v14 M${x+W+24} ${y}v${D} M${x+W+17} ${y}h14 M${x+W+17} ${y+D}h14`}/></g>
    <text x={x+W/2} y={y-34} textAnchor="middle" fill="#315f56" fontSize="14" fontWeight="700">{number(w)} m</text>
    <text x={x+W+43} y={y+D/2} textAnchor="middle" fill="#315f56" fontSize="14" fontWeight="700" transform={`rotate(90 ${x+W+43} ${y+D/2})`}>{number(d)} m</text>
    <text x={x+W/2} y={y+D+39} textAnchor="middle" fill="#576e65" fontSize="10" letterSpacing="2">GARDEN FACING</text>
  </svg><p>{lshape?`Overall external envelope; L-shaped concept footprint ${number(w*d*.783)} m². `:'Overall external dimensions. '}Furniture, openings and fitted options are illustrative. External decking and canopy projections are omitted. Final drawings are agreed with Pecasa.</p></div>;
}
