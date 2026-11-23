import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteCart, customerData, verifiedPayment, settings, safeCheckoutUrl, makeService } from '../server/infinitepay.js';
const token = 'a'.repeat(64);
const env = { APP_URL: 'https://azul-skye.vercel.app', INFINITEPAY_ENABLED: 'true', INFINITEPAY_API_KEY: 'test-key', INFINITEPAY_HANDLE: 'test-store', SUPABASE_URL: 'https://db.example.test', SUPABASE_SECRET_KEY: 'test-db-key', CHECKOUT_DELIVERY_MODE: 'pickup' };
const customer = { name: 'Cliente Teste', email: 'TESTE@example.com', phone: '+5511999999999' };
const body = { accessToken: token, items: [{ id: 'he-paramotor-mv1', quantity: 1 }], customer, delivery: 'pickup', expectedAmount: 2090000 };
const respond = data => ({ ok: true, status: 200, json: async () => data });
test('checkout derives prices from deployed catalog and refuses marketplace, hidden, duplicate, unavailable and invalid quantities', () => {
 assert.equal(quoteCart([{id:'he-paramotor-mv1',quantity:2,price:1}]).amount,4180000);
 for(const lines of [[{id:'demo-1',quantity:1}],[{id:'1817',quantity:1}],[{id:'he-paramotor-mv1',quantity:0}],[{id:'he-paramotor-mv1',quantity:1.5}],[{id:'he-paramotor-mv1',quantity:11}],[{id:'he-paramotor-mv1',quantity:1},{id:'he-paramotor-mv1',quantity:1}]]) assert.throws(()=>quoteCart(lines));
});
test('live checkout stays disabled until account, storage and delivery are explicitly configured', () => {
 assert.equal(settings(env).ready,true);
 for (const key of ['INFINITEPAY_ENABLED','INFINITEPAY_HANDLE','INFINITEPAY_API_KEY','SUPABASE_URL','SUPABASE_SECRET_KEY','APP_URL','CHECKOUT_DELIVERY_MODE']) assert.equal(settings({...env,[key]:''}).ready,false,key);
 assert.equal(settings({...env,CHECKOUT_DELIVERY_MODE:'flat'}).ready,false);
 assert.equal(settings({...env,CHECKOUT_DELIVERY_MODE:'flat',CHECKOUT_SHIPPING_CENTS:'1500'}).ready,true);
});
test('customer validation and redirect host allowlist block malformed data', () => {
 assert.equal(customerData(customer).email,'teste@example.com');
 assert.throws(()=>customerData({...customer,phone:'123'}));
 assert.throws(()=>safeCheckoutUrl('https://checkout.infinitepay.io.evil.test/a'));
 assert.throws(()=>safeCheckoutUrl('javascript:alert(1)'));
 assert.ok(safeCheckoutUrl('https://checkout.infinitepay.io/test/abc'));
});
test('a redirect or unsigned webhook is never sufficient to mark paid', () => {
 assert.equal(verifiedPayment({success:true,paid:true,amount:1000,paid_amount:1050,capture_method:'credit_card'},1000),true);
 for(const patch of [{paid:false},{amount:1},{paid_amount:900},{capture_method:'unknown'},{success:false}]) assert.equal(verifiedPayment({success:true,paid:true,amount:1000,paid_amount:1000,capture_method:'pix',...patch},1000),false);
});
test('storage must accept an order before any provider call; rejects tampered total first',async()=>{
 let providerCalls=0;
 const fetchImpl=async url=>{if(url.startsWith('https://api.')) providerCalls++;return {ok:false};};
 const service=makeService({env,fetchImpl});
 await assert.rejects(service.create({...body,expectedAmount:100}),/preços mudaram/);
 await assert.rejects(service.create(body),/salvar ou consultar/);
 assert.equal(providerCalls,0);
});
test('creation persists authoritative total, creates a single-use expiring checkout, then saves its URL',async()=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,body:options.body?JSON.parse(options.body):null});
  if(url.includes('access_hash=eq.'))return respond([]);
  if(url.includes('create_checkout_order'))return respond(true);
  if(url.endsWith('/links'))return respond({url:'https://checkout.infinitepay.io/test/abc'});
  return {ok:true,status:204};
 };
 const result=await makeService({env,fetchImpl,now:()=>new Date('2026-11-23T12:00:00Z')}).create(body,'127.0.0.1');
 assert.match(result.id,/^AZ-/);
 const insert=calls.find(c=>c.url.includes('create_checkout_order')).body.order_data;
 assert.equal(insert.amount,2090000);assert.equal(insert.access_hash.length,64);assert.notEqual(insert.access_hash,token);
 const payload=calls.find(c=>c.url.endsWith('/links')).body;
 assert.equal(payload.items[0].price,2090000);assert.equal(payload.options.single_payment,true);
 assert.equal(payload.options.valid_until,'2026-11-23T12:30:00.000Z');assert.equal(payload.handle,'test-store');
 assert.match(payload.webhook_url,/api\/infinitepay\?action=webhook/);
 assert.match(calls.at(-1).url,/status=eq.creating/);
});
test('retry returns the stored URL without another charge request',async()=>{
 let calls=0;
 const quote=quoteCart(body.items);
 const service=makeService({env,fetchImpl:async()=>{calls++;return respond([{id:'AZ-existing',items:quote.items,amount:quote.amount,customer:{email:'teste@example.com'},status:'pending',checkout_url:'https://checkout.infinitepay.io/test/abc',expires_at:'2099-01-01'}]);}});
 const result=await service.create(body);assert.equal(result.id,'AZ-existing');assert.equal(calls,1);
});
test('webhook verifies amount with provider and never trusts caller status; retries do not apply payment twice',async()=>{
 const id='AZ-12345678-1234-1234-1234-123456789012';let updates=0;let row={id,amount:1000,status:'pending'};
 const fetchImpl=async(url)=>{
 if(url.includes('checkout_orders?'))return respond([row]);
 if(url.endsWith('payment_check'))return respond({success:true,paid:true,amount:1,paid_amount:1000,capture_method:'pix'});
 updates++;return respond(null);
 };
 const service=makeService({env,fetchImpl});
 await assert.rejects(service.webhook({order_nsu:id,transaction_nsu:'tx-1',invoice_slug:'abc',paid:true,amount:1000}),/não confirmado/);
 assert.equal(updates,0);
 row={...row,status:'paid'};
 assert.deepEqual(await service.webhook({order_nsu:id}),{received:true});assert.equal(updates,0);
});
test('receipt requires secret capability and never reveals customer details',async()=>{
 const id='AZ-12345678-1234-1234-1234-123456789012';
 const {createHash}=await import('node:crypto');
 const row={id,status:'paid',amount:1000,items:[],customer:{email:'private@example.com'},access_hash:createHash('sha256').update(token).digest('hex'),expires_at:'2099-01-01',delivery:'pickup'};
 const service=makeService({env,fetchImpl:async()=>respond([row])});
 await assert.rejects(service.status({order:id},'wrong'),/mesmo navegador|navegador em que/);
 const result=await service.status({order:id},token);assert.equal(result.status,'paid');assert.equal(result.customer,undefined);assert.equal(result.access_hash,undefined);
});
test('verified payment is committed once and unsigned callback customer data is ignored',async()=>{
 const id='AZ-12345678-1234-1234-1234-123456789012';const calls=[];
 const fetchImpl=async(url,options)=>{
   calls.push({url,body:options.body?JSON.parse(options.body):null});
   if(url.includes('checkout_orders?'))return respond([{id,amount:1000,status:'pending'}]);
   if(url.endsWith('payment_check'))return respond({success:true,paid:true,amount:1000,paid_amount:1050,capture_method:'credit_card'});
   return respond(null);
 };
 const result=await makeService({env,fetchImpl}).webhook({order_nsu:id,transaction_nsu:'tx-real',invoice_slug:'invoice',status:'fake',customer:{email:'attacker@example.com'}});
 assert.equal(result.received,true);
 assert.deepEqual(calls.at(-1).body,{order_id:id,transaction_id:'tx-real',invoice:'invoice',method:'credit_card',paid:1050});
});
test('endpoint is closed to cross-origin calls and never leaks env credentials',async()=>{
 const {default:handler}=await import('../api/infinitepay.js');
 let code;let payload;const headers={};const res={setHeader:(k,v)=>headers[k]=v,status:c=>{code=c;return res;},json:p=>{payload=p;return res;}};
 await handler({method:'GET',query:{action:'config'},headers:{}},res);
 assert.equal(code,200);assert.deepEqual(Object.keys(payload).sort(),['deliveryMode','enabled','shippingCents']);
 await handler({method:'POST',query:{action:'checkout'},headers:{origin:'https://evil.test','content-type':'application/json'},body:{}},res);
 assert.equal(code,403);assert.equal(payload.error,'Origem não permitida.');
 await handler({method:'POST',query:{action:'checkout'},headers:{'content-type':'text/plain'},body:{}},res);
 assert.equal(code,415);assert.equal(headers['Cache-Control'],'no-store');
});
test('readiness checks storage and merchant credentials without creating a payment link',async()=>{
 const calls=[];
 const service=makeService({env:{...env,SUPABASE_URL:'https://ready-db.example.test'},fetchImpl:async(url,options)=>{
  calls.push(url);
  if(url.includes('checkout_orders?')) { assert.equal(options.headers.apikey,'test-db-key');assert.equal(options.headers.Authorization,undefined); return respond([]); }
  return respond({success:false,paid:false});
 }});
 assert.equal(await service.availability(),true);
 assert.equal(await service.availability(),true);
 assert.equal(calls.length,2);assert.ok(!calls.some(url=>url.endsWith('/links')));
 const failing=makeService({env:{...env,SUPABASE_URL:'https://missing-db.example.test'},fetchImpl:async()=>({ok:false})});
 assert.equal(await failing.availability(),false);
});
test('checkout normalizes Brazilian contact formats consistently, including DDD 55',()=>{
 for(const phone of ['(55) 91234-5678','+55 (55) 91234-5678','0055 55 91234-5678','055 91234-5678','5555912345678']){
   assert.deepEqual(customerData({name:'  Li ',email:' TESTE@example.com ',phone}),{name:'Li',email:'teste@example.com',phone_number:'+5555912345678'});
 }
 for(const [field,value] of [['name',' '],['email','incompleto'],['phone','9999-1234'],['phone','+1 212 555 0100']]){
   assert.throws(()=>customerData({...customer,[field]:value}),error=>error.field===field);
 }
});
test('a checkout link can be reopened only for its original cart and before expiration',async()=>{
 const {usableHandoff}=await import('../src/checkout-handoff.js');
 const saved={cartKey:'basket',id:'AZ-12345678-1234-1234-1234-123456789012',url:'https://checkout.infinitepay.io/shop/sample',expiresAt:'2026-11-24T00:30:00Z'};
 const now=Date.parse('2026-11-24T00:00:00Z');
 assert.ok(usableHandoff(saved,'basket',now));
 assert.equal(usableHandoff(saved,'other',now),false);
 assert.equal(usableHandoff(saved,'basket',now+1800000),false);
 assert.equal(usableHandoff({...saved,url:'https://example.com'},'basket',now),false);
});
