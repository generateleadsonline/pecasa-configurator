import test from 'node:test';
import assert from 'node:assert/strict';
import {furniturePlacement,planGeometry} from '../server/geometry.mjs';

const room={style:'portal',width:4,depth:3,purpose:'office',glazing:'french',kitchen:'none',bathroom:'none'};

function assertWithinMainBody(design,furniture){
 assert.ok(furniture,'expected a suitable furniture placement');
 const {bodyDepth}=planGeometry(design);
 assert.ok(furniture.x>=.05&&furniture.y>=.05);
 assert.ok(furniture.x+furniture.width<=design.width-.05);
 assert.ok(furniture.y+furniture.height<=bodyDepth-.05);
 if(furniture.chair){
  assert.ok(furniture.chair.x-furniture.chair.r>=.05);
  assert.ok(furniture.chair.x+furniture.chair.r<=design.width-.05);
  assert.ok(furniture.chair.y-furniture.chair.r>=.05);
  assert.ok(furniture.chair.y+furniture.chair.r<=bodyDepth-.05);
 }
}

test('default office keeps the existing furniture dimensions and fits inside the room',()=>{
 const furniture=furniturePlacement(room);
 assertWithinMainBody(room,furniture);
 assert.deepEqual(furniture,{x:.48,y:.39,width:1.4,height:.65,chair:{x:1.18,y:1.26,r:.16}});
});

test('minimum L-shape omits furniture that would overlap the kitchenette',()=>{
 // Gym has no chair, isolating the desk/equipment rectangle collision.
 const design={...room,style:'lshape',width:2,depth:2,purpose:'gym',kitchen:'kitchenette'};
 assert.equal(furniturePlacement(design),null);
 assertWithinMainBody({...design,kitchen:'none'},furniturePlacement({...design,kitchen:'none'}));
});

test('minimum L-shape cannot draw an office chair across the recessed front',()=>{
 const design={...room,style:'lshape',width:2,depth:2,kitchen:'kitchenette',bathroom:'shower'};
 assert.equal(furniturePlacement(design),null);
 const clear={...design,kitchen:'none',bathroom:'none'};
 assertWithinMainBody(clear,furniturePlacement(clear));
});

test('a roomy L-shape with kitchen and bathroom retains safe furniture',()=>{
 const design={...room,style:'lshape',width:5,depth:4,kitchen:'kitchenette',bathroom:'shower'};
 const furniture=furniturePlacement(design);
 assertWithinMainBody(design,furniture);
 assert.ok(furniture.y>=.6,'desk must clear the rear kitchenette');
 assert.ok(furniture.x+furniture.width<=5-1.28-.1,'desk must clear the shower room');
});

test('bathroom collision is rejected even if a future catalog allows narrower rooms',()=>{
 // Current validation starts at 2 m. The pure geometry helper also guards a
 // narrower envelope, where its desk would overlap the bathroom by 1.6 cm.
 const design={...room,width:1.2,bathroom:'shower'};
 assertWithinMainBody({...design,bathroom:'none'},furniturePlacement({...design,bathroom:'none'}));
 assert.equal(furniturePlacement(design),null);
});

test('pergola has no room furniture and gym has no chair',()=>{
 assert.equal(furniturePlacement({...room,style:'pergola'}),null);
 const gym={...room,purpose:'gym'};
 assertWithinMainBody(gym,furniturePlacement(gym));
 assert.equal(furniturePlacement(gym).chair,null);
});
