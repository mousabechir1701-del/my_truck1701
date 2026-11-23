// دفتر الشاحنة - Service Worker v6
// الفكرة: أي شيء تم تحميله مرة واحدة مع النت، يفتح بعدها فوراً من الجوال بدون نت (حتى لو الشبكة ضعيفة).
var CACHE='truck-v6';
var ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
var SHELL='./index.html';

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(ASSETS.map(function(a){
      return fetch(new Request(a,{cache:'reload'})).then(function(r){
        if(r&&r.ok)return c.put(a,r);
      }).catch(function(){});
    }));
  }).then(function(){return self.skipWaiting();}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.protocol!=='http:'&&url.protocol!=='https:')return;
  var same=url.origin===self.location.origin;
  var font=url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com';
  if(!same&&!font)return;
  e.respondWith(handle(e,req,same));
});

// من الكاش أولاً (سريع ويخدم بدون نت)، ويتحدّث من النت في الخلفية
function handle(e,req,same){
  var nav=req.mode==='navigate';
  var key=nav?SHELL:req;
  return caches.open(CACHE).then(function(c){
    return c.match(key,{ignoreSearch:same}).then(function(hit){
      var net=fetch(req).then(function(res){
        if(res&&(res.ok||res.type==='opaque')){c.put(key,res.clone());}
        return res;
      });
      if(hit){
        e.waitUntil(net.catch(function(){}));
        return hit;
      }
      return net.catch(function(){
        if(nav)return c.match(SHELL).then(function(r){return r||Response.error();});
        return new Response('',{status:504,statusText:'offline'});
      });
    });
  });
}
