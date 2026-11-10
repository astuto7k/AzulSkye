import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { filterProducts, orderGroups, validateProduct, demoSeed, groupOf } from '../src/model.js';
const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url)));
test('catalog retains the original catalog plus two new official products and every image exists', () => {
 assert.equal(products.length, 162); assert.equal(new Set(products.map(p=>p.id)).size,162);
 for(const p of products) {assert.equal(p.official,true);assert.ok(existsSync(new URL('../public'+p.image,import.meta.url)),p.name);}
 assert.equal(products.find(p=>p.id==='1955').price,39774);
});
test('accent-insensitive search and category/source/condition filters', () => {
 assert.ok(filterProducts(products,{query:'helice'}).length>0);
 assert.ok(filterProducts(products,{category:'Peças'}).every(p=>groupOf(p)==='Peças'));
 const seed=demoSeed(products), all=[...products,...seed.listings];
 assert.equal(filterProducts(all,{source:'marketplace'}).length,2);
 assert.equal(filterProducts(all,{source:'marketplace',condition:'Usado'}).length,1);
 assert.ok(!filterProducts(all).some(p=>p.id==='demo-3'));
 assert.equal(filterProducts(products,{query:'___doesnotexist'}).length,0);
});
test('cart separates official shop from marketplace and computes quantities', () => {
 const seed=demoSeed(products),all=[...products,...seed.listings];
 const groups=orderGroups([{id:'89',quantity:2},{id:'demo-1',quantity:1}],all);
 assert.equal(groups.length,2);assert.equal(groups[0].total,3592.98);assert.equal(groups[1].total,1890);
 assert.equal(orderGroups([{id:'1820',quantity:1}],all).length,0);
 assert.equal(orderGroups([{id:'demo-3',quantity:1}],all).length,0);
 assert.equal(orderGroups([{id:'demo-1',quantity:1}],all.map(p=>p.id==='demo-1'?{...p,status:'seller-inactive'}:p)).length,0);
});
test('new listings require condition, image, weight and all dimensions', () => {
 const valid={name:'Motor',description:'Exemplo',price:100,condition:'Usado',image:'/placeholder.svg',weight:1,length:10,width:10,height:10};
 assert.equal(validateProduct(valid),'');
 for(const key of ['weight','length','width','height']) assert.notEqual(validateProduct({...valid,[key]:0}),'');
 assert.notEqual(validateProduct({...valid,image:''}),'');assert.notEqual(validateProduct({...valid,condition:''}),'');
});
test('PWA contains standalone manifest, correctly sized icons and offline fallback', () => {
 const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url)));
 assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons) assert.ok(existsSync(new URL('../public'+icon.src,import.meta.url)));
 assert.ok(existsSync(new URL('../public/offline.html',import.meta.url)));
});

test('removed products stay out of search and cart, and new products have their categories', () => {
 assert.ok(!filterProducts(products).some(p => ['1817','1818'].includes(p.id)));
 assert.equal(groupOf(products.find(p => p.id === 'powerseat-comfort-low')), 'Seletes');
 assert.equal(products.find(p => p.id === 'powerseat-comfort-low').price, 5499.9);
 assert.equal(products.find(p => p.id === 'macpara-colorado-2gt').price, 22990);
 const hidden = {...products[0],status:'hidden'};
 assert.deepEqual(orderGroups([{id:hidden.id,quantity:1}],[hidden]), []);
 assert.equal(filterProducts([{...hidden,status:'approved'}]).length,1);
});
