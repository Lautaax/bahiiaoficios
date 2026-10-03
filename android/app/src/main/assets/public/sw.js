/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-fa6cb374'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "index.html",
    "revision": "afd26e62e3552c61cefb0844b044757d"
  }, {
    "url": "icon.svg",
    "revision": "443dede249bd5a2bdf1a4c1955f3bee7"
  }, {
    "url": "icon-maskable-512x512.png",
    "revision": "60712b61aaab05aefb912858c6e31fce"
  }, {
    "url": "icon-512x512.png",
    "revision": "d58d317c61acc871133351078cc4eb46"
  }, {
    "url": "icon-192x192.png",
    "revision": "3c592ae37c12176ff874fb9f94a9275a"
  }, {
    "url": "firebase-messaging-sw.js",
    "revision": "99be24cd90a3da861e099ca308170f80"
  }, {
    "url": "favicon-32x32.png",
    "revision": "e9b9b657d73a2fc07f97db1b4f343b02"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "64b699c9cf94eb4de56b91a7d18940a7"
  }, {
    "url": "assets/workbox-window.prod.es5-BIl4cyR9.js",
    "revision": null
  }, {
    "url": "assets/purify.es-BgtpMKW3.js",
    "revision": null
  }, {
    "url": "assets/index.esm-BvtMF1gV.js",
    "revision": null
  }, {
    "url": "assets/index.es-eqMhR6YS.js",
    "revision": null
  }, {
    "url": "assets/index-PDW4iEwb.js",
    "revision": null
  }, {
    "url": "assets/index-CvmZGdNa.css",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-QH1iLAAe.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "64b699c9cf94eb4de56b91a7d18940a7"
  }, {
    "url": "icon-192x192.png",
    "revision": "3c592ae37c12176ff874fb9f94a9275a"
  }, {
    "url": "icon-512x512.png",
    "revision": "d58d317c61acc871133351078cc4eb46"
  }, {
    "url": "icon-maskable-512x512.png",
    "revision": "60712b61aaab05aefb912858c6e31fce"
  }, {
    "url": "icon.svg",
    "revision": "443dede249bd5a2bdf1a4c1955f3bee7"
  }, {
    "url": "manifest.webmanifest",
    "revision": "52e8bae2d5874182053b231f00b83efb"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/images\.unsplash\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "unsplash-images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/firebasestorage\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "firebase-storage-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 150,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/ui-avatars\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "ui-avatars-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 150,
      maxAgeSeconds: 5184000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/(raw\.githubusercontent\.com|cdn\.jsdelivr\.net|http2\.mlstatic\.com)\/.*/i, new workbox.CacheFirst({
    "cacheName": "external-assets-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 60,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i, new workbox.StaleWhileRevalidate({
    "cacheName": "local-images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 120,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
