import test from 'node:test';
import assert from 'node:assert/strict';
import { listShopifyProducts, shopifyProductToUniversalProduct } from '../src/connectors/shopify/products.mjs';
import { createUniversalCampaign } from '../src/domain/universal-campaign.mjs';
const product={id:'gid://shopify/Product/1',title:'Sneakers',handle:'sneakers',status:'ACTIVE',onlineStoreUrl:'https://shop.example/products/sneakers',images:{nodes:[{url:'https://cdn.test/shoe.jpg',altText:'Shoes'}]},priceRangeV2:{minVariantPrice:{amount:'49.99',currencyCode:'PEN'},maxVariantPrice:{amount:'69.99',currencyCode:'PEN'}}};

test('products use the connected shop and expose pagination, images, prices and the published storefront URL',async()=>{
 const result=await listShopifyProducts({shop:'luvixy.myshopify.com',accessToken:'test-access',first:50,after:'cursor',search:'sneakers',fetchImpl:async(url,options)=>{
  assert.equal(url,'https://luvixy.myshopify.com/admin/api/2026-10/graphql.json');
  assert.equal(options.headers['X-Shopify-Access-Token'],'test-access');
  assert.deepEqual(JSON.parse(options.body).variables,{first:50,after:'cursor',search:'sneakers'});
  return Response.json({data:{products:{nodes:[product],pageInfo:{hasNextPage:true,endCursor:'next'}}}});
 }});
 assert.equal(result.pageInfo.endCursor,'next');
 const normalized=shopifyProductToUniversalProduct(result.products[0],'luvixy');
 assert.equal(normalized.destinationUrl,product.onlineStoreUrl);assert.equal(normalized.published,true);
 assert.equal(normalized.price,49.99);assert.equal(normalized.priceRange.max,69.99);assert.equal(normalized.imageUrl,'https://cdn.test/shoe.jpg');
});

test('unpublished products do not invent a public destination or pass campaign validation',()=>{
 const normalized=shopifyProductToUniversalProduct({...product,onlineStoreUrl:null},'luvixy');
 assert.equal(normalized.destinationUrl,null);assert.equal(normalized.published,false);
 assert.throws(()=>createUniversalCampaign({name:'Test',goal:'SALES',product:normalized}),/Publish this product/);
});

test('unsafe domains and invalid product query limits fail before any request',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw new Error('Should not fetch');};
 await assert.rejects(listShopifyProducts({shop:'127.0.0.1',accessToken:'test',fetchImpl}));
 await assert.rejects(listShopifyProducts({shop:'luvixy',accessToken:'test',first:1000,fetchImpl}));
 assert.equal(calls,0);
});

test('provider authorization and throttling errors have human messages without raw details',async()=>{
 await assert.rejects(listShopifyProducts({shop:'luvixy',accessToken:'test',fetchImpl:async()=>new Response('private details',{status:401})}),error=>error.code==='REAUTHORIZE'&&!error.message.includes('private'));
 await assert.rejects(listShopifyProducts({shop:'luvixy',accessToken:'test',fetchImpl:async()=>Response.json({errors:[{message:'sensitive upstream detail',extensions:{code:'THROTTLED'}}]})}),error=>error.code==='SHOPIFY_UNAVAILABLE');
});
