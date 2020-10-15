(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const {
    Base,
    Func,
    NeuralNetwork,
    Matrix,
    Template,
    Components,
    Compression,
    ColorPicker,
} = require('@thekade/base');

const AppLibrary = require('../functions/AppLibrary');
const IndexedLibrary = require('../functions/IndexedLibrary');

module.exports = {
    Base,
    Func,
    NeuralNetwork,
    Matrix,
    Template,
    Components,
    Compression,
    ColorPicker,
    IndexedLibrary,
    AppLibrary
}

},{"../functions/AppLibrary":2,"../functions/IndexedLibrary":3,"@thekade/base":19}],2:[function(require,module,exports){
const { Func } = require('@thekade/base');
let func = new Func();

function AppLibrary() {
    let self = {};

    self.makeWebapp = (callback = () => { }) => {
        document.addEventListener('click', event => {
            let anchor = event.target;
            let parentAnchor = event.target.getParents('a');
            let url = anchor.getAttribute('href');//check when a url is about to be open

            if (anchor.nodeName.toLowerCase() != 'a' && !func.isnull(parentAnchor)) {
                anchor = parentAnchor;
            }

            if (func.isnull(url) && !func.isnull(parentAnchor)) {
                anchor = parentAnchor;
            }
            //get the anchor element
            url = anchor.getAttribute('href');
            let target = anchor.getAttribute('target');

            if (target == '_blank') {//check if it is for new page
                window.open(func.prepareUrl(url));
            }
            else if (!func.isnull(url)) {
                event.preventDefault();//block and open inside as webapp
                if (func.prepareUrl(url) != location.href) window.history.pushState('page', 'title', url);
                callback();
            }
        });

        window.onpopstate = callback;
    }

    self.prepareUrl = (url = '') => {
        if (!url.includes(location.origin)) {
            let splitUrl = func.urlSplitter(url);
            if (splitUrl.location == location.origin) {
                url = location.origin + '/' + url;
            }
        }
        else if (!url.includes(location.protocol)) {
            url = location.protocol + '//' + url;
        }

        return url;
    }

    self.ajax = (params = { async: true, data: {}, url: '', method: '', secured: false }) => {
        params.async = params.async || true;
        params.data = params.data || {};
        params.url = params.url || './';
        params.method = params.method || 'POST';
        params.secured = params.secured || false;

        if (params.secured) {
            params.url = 'https://cors-anywhere.herokuapp.com/' + params.url;
        }

        let data = new FormData();
        if (params.data instanceof FormData) {
            data = params.data;
        }
        else {
            for (let i in params.data) {
                data.append(i, params.data[i]);
            }
        }

        return new Promise((resolve, reject) => {
            var request = new XMLHttpRequest();

            request.onreadystatechange = function (event) {
                if (this.readyState == 4 && this.status == 200) {
                    resolve(request.responseText);
                }
            };

            if (func.isset(params.onprogress)) {
                request.upload.onprogress = (event) => {
                    params.onprogress((event.loaded / event.total) * 50);
                }

                request.onprogress = (event) => {
                    params.onprogress((event.loaded / event.total) * 100);
                }
            }

            request.onerror = (error) => {
                reject(error);
            };

            request.open(params.method, params.url, params.async);
            request.send(data);
        });
    }

    return self;
}

module.exports = AppLibrary;
},{"@thekade/base":19}],3:[function(require,module,exports){
const { ObjectsLibrary } = require('@thekade/base');
let objectLibrary = ObjectsLibrary();

function IndexedLibrary(name, version) {
    let self = { name, version, initialized: false };
    self.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    self.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    self.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    self.init = function (callback) {//initialize db by setting the current version
        const request = self.indexedDB.open(self.name);
        request.onupgradeneeded = (event) => {
            if (callback != undefined) {
                (callback(event.target.result));
            }
        }

        request.onsuccess = (event) => {
            self.version = Math.floor(request.result.version) || Math.floor(self.version);
            self.initialized = true;
        }

        request.onerror = (event) => {
            console.log(event.target.error);
        }
    }

    self.getVersion = function () {
        return new Promise((resolve, reject) => {
            const request = self.indexedDB.open(self.name);
            request.onsuccess = (event) => {
                if (self.version == undefined || self.version < request.result.version) {
                    self.version = request.result.version;
                }
                resolve(self.version);
            }

            request.onerror = (event) => {
                reject(event.target.error);
            }
        })
    }

    self.open = async function (callback) {
        if (self.version == undefined) {
            await self.getVersion();//set the version if not set
        }
        return new Promise((resolve, reject) => {
            const request = self.indexedDB.open(self.name, self.version);//open db
            request.onupgradeneeded = (event) => {
                self.version = request.result.version;//update version after upgrade

                if (callback != undefined) {//run the callback if set
                    let workedDb = callback(event.target.result);
                    workedDb.onerror = workedEvent => {
                        reject(workedEvent.target.error);
                    }
                }
            }

            request.onsuccess = (event) => {
                resolve(event.target.result);
            }

            request.onerror = (event) => {
                reject(event.target.error);
            }
        });
    }

    self.collectionExists = function (collection) {
        return self.open().then(db => {
            return db.objectStoreNames.contains(collection);//check if db has this collection in objectstore
        });
    }

    self.createCollection = async function (...collections) {
        let version = await self.getVersion();//upgrade collection
        self.version = version + 1;
        return self.open(db => {
            for (let collection of collections) {
                if (!db.objectStoreNames.contains(collection)) {//create new collection and set _id as the keypath
                    db.createObjectStore(collection, { keyPath: '_id' });
                }
            }
            return db;
        });
    }

    self.emptyCollection = function (collection) {
        let removedCount = 0, foundCount = 0;//set the counters
        return new Promise((resolve, reject) => {
            self.find({ collection, query: {}, many: true }).then(found => {//find all documents
                self.open().then(db => {
                    if (db.objectStoreNames.contains(collection)) {//handle collection non-existence error
                        let transaction = db.transaction(collection, 'readwrite');
                        let store = transaction.objectStore(collection);

                        transaction.onerror = event => {
                            reject(event.target.error);
                        }

                        transaction.oncomplete = event => {
                            resolve({ action: 'emptycollection', removedCount, ok: removedCount == foundCount });
                        }
                        foundCount = found.length;
                        for (let data of found) {
                            let request = store.delete(data._id);//delete each document
                            request.onerror = event => {
                                console.log(`Error while deleting documents => ${event.target.error}`);
                            }

                            request.onsuccess = event => {
                                removedCount++;
                            }
                        }
                    }
                    else {
                        resolve({ removedCount, ok: removedCount == foundCount });
                    }
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            })
        });
    }

    self.find = function (params) {
        return new Promise((resolve, reject) => {
            self.open().then(db => {
                let documents = [];

                if (db.objectStoreNames.contains(params.collection)) {//collection exists
                    let transaction = db.transaction(params.collection, 'readonly');

                    transaction.onerror = event => {
                        reject(event.target.error);
                    }

                    transaction.oncomplete = event => {
                        if (params.many == true) {//many 
                            resolve(documents);
                        }
                        else {
                            resolve(documents[0]);//single
                        }
                    }

                    let store = transaction.objectStore(params.collection);
                    let request = store.openCursor();
                    let cursor;

                    request.onerror = (event) => {
                        reject(event.target.error);
                    }

                    request.onsuccess = (event) => {
                        cursor = event.target.result;
                        if (cursor) {
                            if (params.query == undefined) {//find any
                                documents.push(cursor.value);
                            }
                            else if (objectLibrary.isSubObject(cursor.value, params.query)) {//find specific
                                documents.push(cursor.value);
                            }
                            cursor.continue();
                        }
                    };
                }
                else {
                    if (params.many == true) {//many 
                        resolve(documents);
                    }
                    else {
                        resolve(documents[0]);//single
                    }
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    self.documentExists = function (params) {
        delete params.many;//check for only one
        return self.find(params).then(res => {//
            return res != undefined;
        });
    }

    self.generateId = function (request) {
        let id = Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);//generate the id using time
        return id;
    }

    self.checkId = function (request, query, callback) {
        let id = query._id || self.generateId();//get new _id if not set
        let get = request.get(id);//check if existing
        get.onsuccess = event => {
            if (event.target.result != undefined) {
                self.checkId(request, query, callback);
            }
            else {
                callback(id);//use the _id
            }
        }

        get.onerror = event => {
            console.log(`Error checking ID => ${event.target.error}`);
        }
    }

    self.add = function (params, db) {
        return new Promise((resolve, reject) => {
            let transaction = db.transaction(params.collection, 'readwrite');
            transaction.onerror = (event) => {
                reject(event.target.error)
            };

            transaction.oncomplete = (event) => {
                resolve({ action: 'insert', documents: params.query });
            }

            let request = transaction.objectStore(params.collection);

            if (params.many == true && Array.isArray(params.query)) {// for many
                for (let query of params.query) {
                    self.checkId(request, query, _id => {//validate _id
                        query._id = _id;
                        request.add(query);//add
                    });
                }
            }
            else {
                self.checkId(request, params.query, _id => {//validate _id
                    params.query._id = _id;
                    request.add(params.query);//add
                });
            }
        });
    }

    self.insert = async function (params) {
        let isCollection = await self.collectionExists(params.collection);
        if (isCollection) {//collection is existing
            return self.open()
                .then(db => {
                    return self.add(params, db);//add to collection
                })
                .catch(error => {
                    return error;
                });
        }
        else {
            return self.createCollection(params.collection)//create collection
                .then(db => {
                    return self.add(params, db);//add to new Collection
                })
                .catch(error => {
                    return error;
                });
        }
    }

    self.update = function (params) {
        return new Promise((resolve, reject) => {
            self.open().then(db => {
                if (!db.objectStoreNames.contains(params.collection)) {
                    reject('Collection not found');
                }

                let transaction = db.transaction(params.collection, 'readwrite');

                transaction.onerror = event => {
                    reject(event.target.error);
                }

                transaction.oncomplete = event => {
                    resolve({ action: 'update', documents });
                }

                let store = transaction.objectStore(params.collection);
                let request = store.openCursor();
                let documents = {};

                request.onerror = (event) => {
                    reject(event.target.error);
                }

                request.onsuccess = (event) => {
                    let cursor = event.target.result;
                    let found = false;
                    if (cursor) {
                        if (objectLibrary.isSubObject(cursor.value, params.check)) {//retrieve the matched documents
                            found = true;
                            for (let i in params.query) {
                                cursor.value[i] = params.query[i];
                            }

                            try {
                                let res = cursor.update(cursor.value);//update

                                res.onerror = (rEvent) => {
                                    documents[rEvent.target.result] = { value: cursor.value, status: false };
                                }

                                res.onsuccess = (rEvent) => {
                                    documents[rEvent.target.result] = { value: cursor.value, status: true };
                                }
                            } catch (error) {
                                reject(error);
                            }
                        }

                        if (params.many == true || found == false) {
                            cursor.continue();
                        }
                    }
                };
            }).catch(error => {
                reject(error);
            });
        });
    }

    self.save = function (params = { collection: '', query: {}, check: {} }) {
        //check existence of document
        return self.documentExists({ collection: params.collection, query: params.check }).then(exists => {
            if (exists == false) {
                return self.insert(params);//insert if not found
            }
            else {
                return self.update(params);// update if found
            }
        });
    }

    self.delete = function (params) {
        let foundCount = 0, removedCount = 0;//set the counters
        return new Promise((resolve, reject) => {
            self.find(params).then(found => {
                self.open().then(db => {
                    let transaction = db.transaction(params.collection, 'readwrite');
                    let store = transaction.objectStore(params.collection);

                    transaction.onerror = event => {
                        reject(event.target.error);
                    }

                    transaction.oncomplete = event => {
                        resolve({ action: 'delete', removedCount, ok: removedCount == foundCount });
                    }

                    if (Array.isArray(found)) {//if many
                        foundCount = found.length;
                        for (let data of found) {
                            let request = store.delete(data._id);//delete each
                            request.onerror = event => {
                                console.log(`Error while deleting documents => ${event.target.error}`);
                            }

                            request.onsuccess = event => {
                                removedCount++;
                            }
                        }
                    }
                    else {
                        foundCount = 1;
                        let request = store.delete(found._id);//delete document
                        request.onerror = event => {
                            console.log(`Error while deleting documents => ${event.target.error}`);
                        }

                        request.onsuccess = event => {
                            removedCount++;
                        }
                    }
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        });
    }

    return self;
}

module.exports = IndexedLibrary;

},{"@thekade/base":19}],4:[function(require,module,exports){
let Icons = {};

Icons['address-book'] = 'fas, fa-address-book';
Icons['amazon'] = 'fas, fa-amazon';
Icons['ambulance'] = 'fas, fa-ambulance';
Icons['android'] = 'fas, fa-android';
Icons['apple'] = 'fas, fa-apple';
Icons['asterisk'] = 'fas, fa-asterisk';
Icons['at'] = 'fas, fa-at';
Icons['backward'] = 'fas, fa-backward';
Icons['bank'] = 'fas, fa-bank';
Icons['battery'] = 'fas, fa-battery';
Icons['bed'] = 'fas, fa-bed';
Icons['bell'] = 'fas, fa-bell';
Icons['bicycle'] = 'fas, fa-bicycle';
Icons['birthday-cake'] = 'fas, fa-birthday-cake';
Icons['bitbucket'] = 'fas, fa-bitbucket';
Icons['bitcoin'] = 'fas, fa-bitcoin';
Icons['bluetooth'] = 'fas, fa-bluetooth';
Icons['bolt'] = 'fas, fa-bolt';
Icons['book'] = 'fas, fa-book';
Icons['bus'] = 'fas, fa-bus';
Icons['cab'] = 'fas, fa-cab';
Icons['calculator'] = 'fas, fa-calculator';
Icons['camera'] = 'fas, fa-camera';
Icons['car'] = 'fas, fa-car';
Icons['certificate'] = 'fas, fa-certificate';
Icons['child'] = 'fas, fa-child';
Icons['chrome'] = 'fas, fa-chrome';
Icons['cloud'] = 'fas, fa-cloud';
Icons['coffee'] = 'fas, fa-coffee';
Icons['comment'] = 'fas, fa-comment';
Icons['compass'] = 'fas, fa-compass';
Icons['copy'] = 'fas, fa-copy';
Icons['copyright'] = 'fas, fa-copyright';
Icons['clone'] = 'fas, fa-clone';
Icons['credit-card'] = 'fas, fa-credit-card';
Icons['cube'] = 'fas, fa-cube';
Icons['desktop'] = 'fas, fa-desktop';
Icons['diamond'] = 'fas, fa-diamond';
Icons['download'] = 'fas, fa-download';
Icons['drivers-license'] = 'fas, fa-drivers-license';
Icons['dropbox'] = 'fas, fa-dropbox';
Icons['drupal'] = 'fas, fa-drupal';
Icons['edge'] = 'fas, fa-edge';
Icons['edit'] = 'fas, fa-edit';
Icons['eject'] = 'fas, fa-eject';
Icons['ellipsis-h'] = 'fas, fa-ellipsis-h';
Icons['envelope'] = 'fas, fa-envelope';
Icons['eraser'] = 'fas, fa-eraser';
Icons['exchange'] = 'fas, fa-exchange';
Icons['exclamation'] = 'fas, fa-exclamation';
Icons['expand'] = 'fas, fa-expand';
Icons['eye'] = 'fas, fa-eye';
Icons['eye-slash'] = 'fas, fa-eye-slash';
Icons['fax'] = 'fas, fa-fax';
Icons['female'] = 'fas, fa-female';
Icons['file'] = 'fas, fa-file';
Icons['film'] = 'fas, fa-film';
Icons['fire'] = 'fas, fa-fire';
Icons['flag'] = 'fas, fa-flag';
Icons['flickr'] = 'fas, fa-flickr';
Icons['folder'] = 'fas, fa-folder';
Icons['forward'] = 'fas, fa-forward';
Icons['foursquare'] = 'fas, fa-foursquare';
Icons['gift'] = 'fas, fa-gift';
Icons['glass'] = 'fas, fa-glass';
Icons['globe'] = 'fas, fa-globe';
Icons['google'] = 'fas, fa-google';
Icons['graduation-cap'] = 'fas, fa-graduation-cap';
Icons['group'] = 'fas, fa-group';
Icons['hashtag'] = 'fas, fa-hashtag';
Icons['headphones'] = 'fas, fa-headphones';
Icons['heart'] = 'fas, fa-heart';
Icons['history'] = 'fas, fa-history';
Icons['home'] = 'fas, fa-home';
Icons['hotel'] = 'fas, fa-hotel';
Icons['hourglass'] = 'fas, fa-hourglass';
Icons['image'] = 'fas, fa-image';
Icons['imdb'] = 'fas, fa-imdb';
Icons['inbox'] = 'fas, fa-inbox';
Icons['industry'] = 'fas, fa-industry';
Icons['info'] = 'fas, fa-info';
Icons['instagram'] = 'fas, fa-instagram';
Icons['key'] = 'fas, fa-key';
Icons['language'] = 'fas, fa-language';
Icons['laptop'] = 'fas, fa-laptop';
Icons['leaf'] = 'fas, fa-leaf';
Icons['legal'] = 'fas, fa-legal';
Icons['life-bouy'] = 'fas, fa-life-bouy';
Icons['linkedin'] = 'fas, fa-linkedin';
Icons['linux'] = 'fas, fa-linux';
Icons['lock'] = 'fas, fa-lock';
Icons['magic'] = 'fas, fa-magic';
Icons['magnet'] = 'fas, fa-magnet';
Icons['male'] = 'fas, fa-male';
Icons['map'] = 'fas, fa-map';
Icons['microphone'] = 'fas, fa-microphone';
Icons['mobile'] = 'fas, fa-mobile';
Icons['money'] = 'fas, fa-money';
Icons['motorcycle'] = 'fas, fa-motorcycle';
Icons['music'] = 'fas, fa-music';
Icons['opera'] = 'fas, fa-opera';
Icons['paint-brush'] = 'fas, fa-paint-brush';
Icons['paper-plane'] = 'fas, fa-paper-plane';
Icons['pause'] = 'fas, fa-pause';
Icons['paw'] = 'fas, fa-paw';
Icons['paypal'] = 'fas, fa-paypal';
Icons['pen'] = 'fas, fa-pen';
Icons['pencil'] = 'fas, fa-pencil';
Icons['phone'] = 'fas, fa-phone';
Icons['photo'] = 'fas, fa-photo';
Icons['pinterest'] = 'fas, fa-pinterest';
Icons['plane'] = 'fas, fa-plane';
Icons['play'] = 'fas, fa-play';
Icons['plug'] = 'fas, fa-plug';
Icons['plus'] = 'fas, fa-plus';
Icons['podcast'] = 'fas, fa-podcast';
Icons['question'] = 'fas, fa-question';
Icons['quora'] = 'fas, fa-quora';
Icons['recycle'] = 'fas, fa-recycle';
Icons['reddit'] = 'fas, fa-reddit';
Icons['redo'] = 'fas, fa-redo';
Icons['refresh'] = 'fas, fa-refresh';
Icons['reply'] = 'fas, fa-reply';
Icons['resistance'] = 'fas, fa-resistance';
Icons['retweet'] = 'fas, fa-retweet';
Icons['road'] = 'fas, fa-road';
Icons['rocket'] = 'fas, fa-rocket';
Icons['rss'] = 'fas, fa-rss';
Icons['safari'] = 'fas, fa-safari';
Icons['scribe'] = 'fas, fa-scribe';
Icons['search'] = 'fas, fa-search';
Icons['send'] = 'fas, fa-send';
Icons['server'] = 'fas, fa-server';
Icons['ship'] = 'fas, fa-ship';
Icons['sign-in'] = 'fas, fa-sign-in';
Icons['sitemap'] = 'fas, fa-sitemap';
Icons['skyatlas'] = 'fas, fa-skyatlas';
Icons['skype'] = 'fas, fa-skype';
Icons['slideshare'] = 'fas, fa-slideshare';
Icons['snapchat'] = 'fas, fa-snapchat';
Icons['sort'] = 'fas, fa-sort';
Icons['soundcloud'] = 'fas, fa-soundcloud';
Icons['spoon'] = 'fas, fa-spoon';
Icons['spotify'] = 'fas, fa-spotify';
Icons['square'] = 'fas, fa-square';
Icons['stack-exchange'] = 'fas, fa-stack-exchange';
Icons['star'] = 'fas, fa-star';
Icons['steam'] = 'fas, fa-steam';
Icons['sticky-note'] = 'fas, fa-sticky-note';
Icons['stop'] = 'fas, fa-stop';
Icons['street-view'] = 'fas, fa-street-view';
Icons['subway'] = 'fas, fa-subway';
Icons['suitcase'] = 'fas, fa-suitcase';
Icons['support'] = 'fas, fa-support';
Icons['tasks'] = 'fas, fa-tasks';
Icons['taxi'] = 'fas, fa-taxi';
Icons['telegram'] = 'fas, fa-telegram';
Icons['television'] = 'fas, fa-television';
Icons['terminal'] = 'fas, fa-terminal';
Icons['thermometer'] = 'fas, fa-thermometer';
Icons['ticket'] = 'fas, fa-ticket';
Icons['times'] = 'fas, fa-times';
Icons['train'] = 'fas, fa-train';
Icons['trash'] = 'fas, fa-trash';
Icons['tree'] = 'fas, fa-tree';
Icons['trophy'] = 'fas, fa-trophy';
Icons['truck'] = 'fas, fa-truck';
Icons['tumblr'] = 'fas, fa-tumblr';
Icons['tv'] = 'fas, fa-tv';
Icons['twitter'] = 'fas, fa-twitter';
Icons['umbrella'] = 'fas, fa-umbrella';
Icons['university'] = 'fas, fa-university';
Icons['unlock'] = 'fas, fa-unlock';
Icons['upload'] = 'fas, fa-upload';
Icons['usb'] = 'fas, fa-usb';
Icons['user'] = 'fas, fa-user';
Icons['video-camera'] = 'fas, fa-video-camera';
Icons['vimeo'] = 'fas, fa-vimeo';
Icons['warning'] = 'fas, fa-warning';
Icons['wechat'] = 'fas, fa-wechat';
Icons['weibo'] = 'fas, fa-weibo';
Icons['whatsapp'] = 'fas, fa-whatsapp';
Icons['wheelchair'] = 'fas, fa-wheelchair';
Icons['wifi'] = 'fas, fa-wifi';
Icons['wikipedia-w'] = 'fas, fa-wikipedia-w';
Icons['wordpress'] = 'fas, fa-wordpress';
Icons['yelp'] = 'fas, fa-yelp';
Icons['yoast'] = 'fas, fa-yoast';
Icons['youtube'] = 'fas, fa-youtube';
Icons['undo'] = 'fas, fa-undo';


module.exports = Icons;
},{}],5:[function(require,module,exports){
const Func = require('./Func');
const Template = require('./Template');

function ColorPicker() {

    let self = {};
    self.func = new Func();
    self.elementModifier = new Template();
    self.elementModifier.elementLibrary();
    self.colorIndicatorPosition = { x: 0, y: 0 };
    self.opacityIndicatorPosition = { x: 0, y: 0 };
    self.convertTo = 'RGB';

    self.init = (params) => {
        self.picker = self.elementModifier.createElement({
            element: 'div', attributes: { class: 'color-picker' }, children: [
                {
                    element: 'span', attributes: { id: 'color-picker-setters' }, children: [
                        {
                            element: 'span', attributes: { id: 'color-picker-colors-window' }, children: [
                                { element: 'canvas', attributes: { id: 'color-picker-colors' } },
                                { element: 'span', attributes: { id: 'color-picker-color-indicator' } }
                            ]
                        },
                        {
                            element: 'span', attributes: { id: 'color-picker-opacities-window' }, children: [
                                { element: 'canvas', attributes: { id: 'color-picker-opacities' } },
                                { element: 'span', attributes: { id: 'color-picker-opacity-indicator' } }
                            ]
                        }
                    ]
                },
                {
                    element: 'div', attributes: { id: 'color-picker-result' }, children: [
                        { element: 'span', attributes: { id: 'picked-color' } },
                        {
                            element: 'span', attributes: { id: 'picked-color-window' }, children: [
                                { element: 'select', attributes: { id: 'picked-color-setter' }, options: ['RGB', 'HEX', 'HSL'] },
                                { element: 'span', attributes: { id: 'picked-color-value' } }
                            ]
                        }
                    ]
                }
            ]
        });

        self.colorWindow = self.picker.find('#color-picker-colors-window');
        self.opacityWindow = self.picker.find('#color-picker-opacities-window');
        self.colorCanvas = self.picker.find('#color-picker-colors');
        self.opacityCanvas = self.picker.find('#color-picker-opacities');
        self.colorMarker = self.picker.find('#color-picker-color-indicator');
        self.opacityMarker = self.picker.find('#color-picker-opacity-indicator');
        self.width = params.width;
        self.height = params.height;
        self.pickedColor = params.color || 'rgb(0, 0, 0)';
        self.colorWindow.css({ height: self.height + 'px' });
        self.colorCanvas.width = self.width;
        self.colorCanvas.height = self.height;
        self.opacityWindow.css({ height: self.height + 'px' });
        self.opacityCanvas.height = self.height;
        self.opacityCanvas.width = 20;

        //the context
        self.colorContext = self.colorCanvas.getContext('2d');
        self.opacityContext = self.opacityCanvas.getContext('2d');

        self.picker.find('#picked-color-value').innerText = self.pickedColor;
        self.picker.find('#picked-color-setter').onChanged(value => {
            self.convertTo = value;
            self.reply();
        });

        self.listen();

        return self.picker;
    }

    self.calibrateColor = () => {
        let colorGradient = self.colorContext.createLinearGradient(0, 0, self.width, 0);

        //color stops
        colorGradient.addColorStop(0, "rgb(255, 0, 0)");
        colorGradient.addColorStop(0.15, "rgb(255, 0, 255)");
        colorGradient.addColorStop(0.33, "rgb(0, 0, 255)");
        colorGradient.addColorStop(0.49, "rgb(0, 255, 255)");
        colorGradient.addColorStop(0.67, "rgb(0, 255, 0)");
        colorGradient.addColorStop(0.87, "rgb(255, 255, 0)");
        colorGradient.addColorStop(1, "rgb(255, 0, 0)");

        self.colorContext.fillStyle = colorGradient;
        self.colorContext.fillRect(0, 0, self.width, self.height);

        //add black and white stops
        colorGradient = self.colorContext.createLinearGradient(0, 0, 0, self.height);
        colorGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        colorGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        colorGradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");
        colorGradient.addColorStop(1, "rgba(0, 0, 0, 1)");

        self.colorContext.fillStyle = colorGradient;
        self.colorContext.fillRect(0, 0, self.width, self.height);
    }

    self.calibrateOpacity = () => {
        let rgba;

        self.opacityContext.clearRect(0, 0, self.opacityCanvas.width, self.height);
        let opacityGradient = self.opacityContext.createLinearGradient(0, 0, 0, self.opacityCanvas.height);

        for (let i = 100; i >= 0; i--) {
            rgba = self.addOpacity(self.pickedColor, i / 100);
            opacityGradient.addColorStop(i / 100, rgba);
        }

        self.opacityContext.fillStyle = opacityGradient;
        self.opacityContext.clearRect(0, 0, self.opacityCanvas.width, self.opacityCanvas.height);
        self.opacityContext.fillRect(0, 0, self.opacityCanvas.width, self.opacityCanvas.height);
    }

    self.listen = () => {
        let isColorMouseDown = false;
        let isOpacityMouseDown = false;

        self.picker.notBubbledEvent('click', event => {
            if (self.added && !isColorMouseDown && !isOpacityMouseDown) {
                self.dispose();
            }
        });

        const colorMouseDown = (event) => {
            let currentX = event.clientX - self.colorCanvas.getBoundingClientRect().left;
            let currentY = event.clientY - self.colorCanvas.getBoundingClientRect().top;

            //is mouse in color picker
            isColorMouseDown = (currentX > 0 && currentX < self.colorCanvas.getBoundingClientRect().width && currentY > 0 && currentY < self.colorCanvas.getBoundingClientRect().height);
        };

        const colorMouseMove = (event) => {
            if (isColorMouseDown) {
                self.colorIndicatorPosition.x = event.clientX - self.colorCanvas.getBoundingClientRect().left;
                self.colorIndicatorPosition.y = event.clientY - self.colorCanvas.getBoundingClientRect().top;
                self.colorMarker.css({ top: self.colorIndicatorPosition.y + 'px', left: self.colorIndicatorPosition.x + 'px' });

                let picked = self.getPickedColor();
                self.pickedColor = `rgb(${picked.r}, ${picked.g}, ${picked.b})`;
                self.reply();
            }
        };

        const colorMouseUp = (event) => {
            isColorMouseDown = false;
            self.calibrateOpacity();
        };

        //Register
        self.colorCanvas.addEventListener("mousedown", colorMouseDown);
        self.colorCanvas.addEventListener("mousemove", colorMouseMove);
        self.colorCanvas.addEventListener("mouseup", colorMouseUp);

        const opacityMouseDown = (event) => {
            let currentX = event.clientX - self.opacityCanvas.getBoundingClientRect().left;
            let currentY = event.clientY - self.opacityCanvas.getBoundingClientRect().top;

            //is mouse in color picker
            isOpacityMouseDown = (currentX > 0 && currentX < self.opacityCanvas.getBoundingClientRect().width && currentY > 0 && currentY < self.opacityCanvas.getBoundingClientRect().height);
        };

        const opacityMouseMove = (event) => {
            if (isOpacityMouseDown) {
                self.opacityIndicatorPosition.x = event.clientX - self.opacityCanvas.getBoundingClientRect().left;
                self.opacityIndicatorPosition.y = event.clientY - self.opacityCanvas.getBoundingClientRect().top;
                self.opacityMarker.css({ top: self.opacityIndicatorPosition.y + 'px' });

                let picked = self.getPickedOpacity();
                self.pickedColor = `rgb(${picked.r}, ${picked.g}, ${picked.b}, ${picked.a})`;
                self.reply();
            }
        };

        const opacityMouseUp = (event) => {
            isOpacityMouseDown = false;
        };

        self.opacityCanvas.addEventListener("mousedown", opacityMouseDown);
        self.opacityCanvas.addEventListener("mousemove", opacityMouseMove);
        self.opacityCanvas.addEventListener("mouseup", opacityMouseUp);
    }

    self.reply = () => {
        self.converColor();
        self.picker.dispatchEvent(new CustomEvent('colorChanged'));
        self.picker.find('#picked-color').css({ backgroundColor: self.convertedColor });
        self.picker.find('#picked-color-value').innerText = self.convertedColor;
    }

    self.converColor = () => {
        if (self.convertTo == 'HEX') {
            self.convertedColor = self.rgbToHex(self.pickedColor);
        }
        else if (self.convertTo == 'HSL') {
            self.convertedColor = self.rgbToHSL(self.pickedColor);
        }
        else if (self.convertTo == 'RGB') {
            self.convertedColor = self.pickedColor;
        }
    }

    self.onChanged = (callBack) => {
        self.picker.addEventListener('colorChanged', event => {
            callBack(self.convertedColor);
        });
    }

    self.getPickedColor = () => {
        let imageData = self.colorContext.getImageData(self.colorIndicatorPosition.x, self.colorIndicatorPosition.y, 1, 1);
        return { r: imageData.data[0], g: imageData.data[1], b: imageData.data[2] };
    }

    self.getPickedOpacity = () => {
        let imageData = self.opacityContext.getImageData(self.opacityIndicatorPosition.x, self.opacityIndicatorPosition.y, 1, 1);

        let alpha = Math.ceil(((imageData.data[3] / 255) * 100)) / 100;
        return { r: imageData.data[0], g: imageData.data[1], b: imageData.data[2], a: alpha };
    }

    self.draw = (params) => {
        self.init(params);
        self.calibrateColor();
        self.calibrateOpacity();

        let interval = setTimeout(() => {
            self.added = true;
            clearTimeout(interval);
        }, 2000);

        return self.picker;
    }

    self.dispose = () => {
        clearInterval(self.interval);
        self.picker.remove();
    }

    self.colorType = (color = '#ffffff') => {
        let type = 'string';
        if (color.indexOf('#') == 0 && (color.length - 1) % 3 == 0) {
            type = 'hex';
        }
        else if (color.indexOf('rgba') == 0) {
            let values = self.func.inBetween(color, 'rgba(', ')');
            if (values != -1 && values.split(',').length == 4) {
                type = 'rgba';
            }
        }
        else if (color.indexOf('rgb') == 0) {
            let values = self.func.inBetween(color, 'rgb(', ')');
            if (values != -1 && values.split(',').length == 3) {
                type = 'rgb';
            }
        }
        else if (color.indexOf('hsla') == 0) {
            let values = self.func.inBetween(color, 'hsla(', ')');
            if (values != -1 && values.split(',').length == 4) {
                type = 'hsla';
            }
        }
        else if (color.indexOf('hsl') == 0) {
            let values = self.func.inBetween(color, 'hsl(', ')');
            if (values != -1 && values.split(',').length == 3) {
                type = 'hsl';
            }
        }

        return type;
    }

    self.hexToRGB = (hex = '#ffffff', alpha = true) => {
        let r = 0, g = 0, b = 0, a = 255;
        if (hex.length == 4) {
            r = "0x" + hex[1] + hex[1];
            g = "0x" + hex[2] + hex[2];
            b = "0x" + hex[3] + hex[3];
        }
        else if (hex.length == 5) {
            r = "0x" + hex[1] + hex[1];
            g = "0x" + hex[2] + hex[2];
            b = "0x" + hex[3] + hex[3];
            a = "0x" + hex[4] + hex[4];
        }
        else if (hex.length == 7) {
            r = "0x" + hex[1] + hex[2];
            g = "0x" + hex[3] + hex[4];
            b = "0x" + hex[5] + hex[6];
        }
        else if (hex.length == 9) {
            r = "0x" + hex[1] + hex[2];
            g = "0x" + hex[3] + hex[4];
            b = "0x" + hex[5] + hex[6];
            a = "0x" + hex[7] + hex[8];
        }
        a = +(a / 255).toFixed(3);

        if (alpha == false) {
            return `rgb(${+r}, ${+g}, ${+b})`;
        }
        else {
            return `rgb(${+r}, ${+g}, ${+b}, ${a})`;
        }
    }

    self.hexToHSL = (hex = '#ffffff', alpha = true) => {
        let color = self.hexToRGB(hex, alpha);
        color = self.rgbToHSL(color, alpha);
        return color;
    }

    self.rgbToHex = (rgb = 'rgb(0, 0, 0)', alpha = true) => {
        let start = rgb.indexOf('(') + 1;
        let end = rgb.indexOf(')');
        let [r, g, b, a] = rgb.slice(start, end).split(',');

        if (!self.func.isset(a)) {
            a = 1;
        }

        r = (+r).toString(16);
        g = (+g).toString(16);
        b = (+b).toString(16);
        a = Math.round(a * 255).toString(16);

        if (r.length == 1) {
            r = `0${r}`;
        }

        if (g.length == 1) {
            g = `0${g}`;
        }

        if (b.length == 1) {
            b = `0${b}`;
        }
        if (a.length == 1) {
            a = `0${a}`;
        }

        let hex = '#';
        if (alpha != false) {
            hex += `${r}${g}${b}${a}`;
        }
        else {
            hex += `${r}${g}${b}`;
        }

        return hex;
    }

    self.rgbToHSL = (rgb = 'rgb(0, 0, 0)', alpha = true) => {
        let start = rgb.indexOf('(') + 1;
        let end = rgb.indexOf(')');
        let [r, g, b, a] = rgb.slice(start, end).split(',');

        console.log(r, g, b);
        if (!self.func.isset(a)) {
            a = 1;
        }

        r /= 225;
        g /= 225;
        b /= 225;

        let cmin = Math.min(r, g, b),
            cmax = Math.max(r, g, b),
            delta = cmax - cmin,
            h = 0,
            s = 0,
            l = 0;

        // Calculate hue
        // No difference
        if (delta == 0) {
            h = 0;
        }
        else if (cmax == r) {
            h = ((g - b) / delta) % 6;
        }
        else if (cmax == g) {
            h = (b - r) / delta + 2;
        }
        else if (cmax == g) {
            h = (r - g) / delta + 4;
        }

        h = Math.round(h * 60);
        // Make negative hues positive behind 360°
        if (h < 0) {
            h += 360;
        }

        l = (cmax + cmin) / 2;

        s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

        l = +(l * 100).toFixed(1);
        s = +(s * 100).toFixed(1);

        let hsl = `hsl`;
        if (alpha == false) {
            hsl += `(${h}, ${s}%, ${l}%)`;
        }
        else {
            hsl += `(${h}, ${s}%, ${l}%, ${a})`;
        }
        return hsl;
    }

    self.hslToRGB = (hsl = 'hsl(0, 0%, 0%)', alpha = true) => {
        let rgb = 'rgb';
        let start = hsl.indexOf('(') + 1;
        let end = hsl.indexOf(')');
        let [h, s, l, a] = hsl.slice(start, end).split(',');

        if (!self.func.isset(a)) {
            a = 1;
        }

        console.log(h, s, l);

        if (h.indexOf("deg") > -1)
            h = h.substr(0, h.length - 3);
        else if (h.indexOf("rad") > -1)
            h = Math.round(h.substr(0, h.length - 3) * (180 / Math.PI));
        else if (h.indexOf("turn") > -1)
            h = Math.round(h.substr(0, h.length - 4) * 360);
        // Keep hue fraction of 360 if ending up over
        if (h >= 360)
            h %= 360;

        s = s.replace('%', '') / 100;
        l = l.replace('%', '') / 100;

        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs((h / 60) % 2 - 1)),
            m = l - c / 2,
            r = 0,
            g = 0,
            b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        if (alpha == false) {
            rgb += `(${r}, ${g}, ${b})`;
        }
        else {
            rgb += `(${r}, ${g}, ${b}, ${a})`;
        }

        return rgb;
    }

    self.hslToHex = (hsl = '', alpha = true) => {
        let color = self.hslToRGB(hsl, alpha);
        return self.rgbToHex(color, alpha);
    }

    self.addOpacity = (color = 'rgb(0, 0, 0)', opacity = 0.5) => {
        let start = color.indexOf('(') + 1;
        let end = color.indexOf(')');
        let points = color.slice(start, end).split(',');
        points[3] = opacity;

        let changedColor = `rgba(${points.join(',')})`;

        return changedColor;
    }

    self.getOpacity = (color = 'rgb(0, 0, 0)') => {
        color = self.func.inBetween(color, '(', ')');
        let [r, g, b, a] = color.split(',');
        return a.trim();
    }

    self.invertColor = (color = '#ffffff') => {
        let type = self.colorType(color);
        let invert;
        if (type == 'hex') {
            color = color.replace('#', '');
            invert = '#' + self.invertHex(color);
        }
        else if (type == 'rgb') {
            color = self.rgbToHex(color).replace('#', '');
            invert = self.invertHex(color);
            invert = self.hexToRGB(invert);
        }
        else if (type == 'rgba') {
            let opacity = self.getOpacity(color);
            color = self.rgbToHex(color).replace('#', '');
            invert = self.invertHex(color);
            invert = self.hexToRGB(invert);
            invert = self.addOpacity(invert, opacity);
        }
        return invert;
    }

    self.invertHex = (hex = 'ffffff') => {
        return (Number(`0x1${hex}`) ^ 0xFFFFFF).toString(16).substr(1).toUpperCase();
    }

    return self;
}

module.exports = ColorPicker;
},{"./Func":7,"./Template":12}],6:[function(require,module,exports){
const Template = require('./Template');
class Empty {
}

class Components extends Template {
    constructor(theWindow = Empty) {
        super(theWindow);
    }

    createTab(params = { titles: [] }) {
        var tabTitle = this.createElement({ element: 'ul', attributes: { class: 'tab' } });
        params.view.append(tabTitle);

        for (var i of params.titles) {
            tabTitle.append(
                this.createElement({ element: 'li', attributes: { class: 'tab-title' }, text: i })
            )
        }

        tabTitle.findAll('li').forEach(node => {
            node.addEventListener('click', event => {
                var url = this.urlSplitter(location.href);
                url.vars.tab = node.textContent.toLowerCase();
                router.render({ url: '?' + this.urlSplitter(this.urlMerger(url, 'tab')).queries });
            })
        })
    }

    cell(params = { element: 'input', attributes: {}, name: '', dataAttributes: {}, value: '', text: '', html: '', edit: '' }) {
        //set the cell-data id
        var id = this.stringReplace(params.name, ' ', '-') + '-cell';

        //create the cell label
        var label = this.createElement({ element: 'label', attributes: { class: 'cell-label' }, text: params.name });

        //cell attributes
        params.attributes = (this.isset(params.attributes)) ? params.attributes : {};

        //cell data attributes
        params.dataAttributes = (this.isset(params.dataAttributes)) ? params.dataAttributes : {};
        params.dataAttributes.id = id;

        var components;

        //set the properties of cell data
        if (params.element == 'select') {//check if cell data is in select element
            components = {
                element: params.element, attributes: params.dataAttributes, children: [
                    { element: 'option', attributes: { disabled: '', selected: '' }, text: `Select ${params.name}`, value: '' }//set the default option
                ]
            };
        }
        else {
            components = { element: params.element, attributes: params.dataAttributes, text: params.value };
        }

        if (this.isset(params.value)) components.attributes.value = params.value;
        if (this.isset(params.options)) components.options = params.options;

        let data;
        if (params.element instanceof Element) {
            data = params.element;
        }
        else {
            data = this.createElement(components);//create the cell-data
        }

        data.classList.add('cell-data');

        if (this.isset(params.value)) data.value = params.value;

        //create cell element
        let cell = this.createElement({ element: 'div', attributes: params.attributes, children: [label, data] });

        cell.classList.add('cell');

        if (this.isset(params.text)) data.textContent = params.text;

        if (this.isset(params.html)) data.innerHTML = params.html;


        if (this.isset(params.list)) {
            cell.makeElement({
                element: 'datalist', attributes: { id: `${id}-list` }, options: params.list.sort()
            });

            data.setAttribute('list', `${id}-list`);
        }

        let edit;
        if (this.isset(params.edit)) {
            edit = cell.makeElement({
                element: 'i', attributes: {
                    class: `${params.edit}`, 'data-icon': 'fas, fa-pen', style: { cursor: 'pointer', backgroundColor: 'var(--primary-color)', width: '1em', height: 'auto', position: 'absolute', top: '0px', right: '0px', padding: '.15em' }
                }
            });
            cell.css({ position: 'relative' });
        }
        return cell;
    }

    message(params = { link: '', text: '', temp: 0 }) {
        var me = this.createElement({
            element: 'span', attributes: { class: 'alert' }, children: [
                this.createElement({ element: 'a', text: params.text, attributes: { class: 'text', href: params.link } }),
                this.createElement({ element: 'span', attributes: { class: 'close' } })
            ]
        });

        if (this.isset(params.temp)) {
            var time = setTimeout(() => {
                me.remove();
                clearTimeout(time);
            }, (params.temp != '') ? params.time * 1000 : 5000);
        }

        me.find('.close').addEventListener('click', event => {
            me.remove();
        });

        body.find('#notification-block').append(me);
    }

    createTable(params = { title: '', contents: {}, projection: {}, rename: {}, sort: false, search: false, filter: [] }) {
        //create the table element   
        let headers = [],//the headers
            columns = {},
            columnCount = 0,
            i,
            table = this.createElement(
                { element: 'div', attributes: params.attributes }
            );//create the table 

        table.classList.add('kerdx-table');//add table to the class

        for (let content of params.contents) {//loop through the json array
            i = params.contents.indexOf(content);//get the position of the row
            for (let name in content) {//loop through the row
                if (headers.indexOf(name) == -1) {//add to headers
                    headers.push(name);
                    columns[name] = table.makeElement({
                        element: 'column', attributes: { class: 'kerdx-table-column', 'data-name': name }, children: [
                            {
                                element: 'span', attributes: { class: 'kerdx-table-column-title', 'data-name': name }, children: [
                                    { element: 'p', attributes: { class: 'kerdx-table-column-title-text' }, text: name }
                                ]
                            },
                            { element: 'div', attributes: { class: 'kerdx-table-column-contents' } }
                        ]
                    });

                    if (this.isset(params.sort)) {//make sortable if needed
                        columns[name].find('.kerdx-table-column-title').makeElement({ element: 'i', attributes: { class: 'kerdx-table-column-title-sort', 'data-icon': 'fas, fa-arrow-down' } });
                    }
                }
            }
        }

        params.projection = params.projection || {};

        let hide = Object.values(params.projection).includes(1);


        for (let name of headers) {//loop through the headers and add the contents 
            for (let content of params.contents) {
                i = params.contents.indexOf(content);
                columns[name].find('.kerdx-table-column-contents').makeElement({ element: 'span', attributes: { class: 'kerdx-table-column-cell', 'data-name': name, 'data-value': content[name] || '', 'data-row': i }, html: content[name] || '' });
            }

            if (params.projection[name] == -1 || (hide && !this.isset(params.projection[name]))) {
                columns[name].css({ display: 'none' });
                continue;
            }

            columnCount++;//count the column length
        }

        table.css({ gridTemplateColumns: `repeat(${columnCount}, 1fr)` });

        let tableContainer = this.createElement({//create table container and title
            element: 'div', attributes: { class: 'kerdx-table-container' }, children: [
                {
                    element: 'span', attributes: { class: 'kerdx-table-titleandsearch' }
                },
                table
            ]
        });

        let titleCount = 0;

        if (this.isset(params.title)) {// create the title text if needed
            tableContainer.find('.kerdx-table-titleandsearch').makeElement({ element: 'h5', attributes: { class: 'kerdx-table-title' }, text: params.title });
            titleCount++;
        }

        if (this.isset(params.sort)) {// set the data for sorting
            table.dataset.sort = true;
        }

        if (this.isset(params.search)) {// create the search area
            tableContainer.find('.kerdx-table-titleandsearch').makeElement({ element: 'input', attributes: { class: 'kerdx-table-search', placeHolder: 'Search table...' } });
            titleCount++;
        }

        if (this.isset(params.filter)) {//create the filter area
            tableContainer.find('.kerdx-table-titleandsearch').makeElement({ element: 'select', attributes: { class: 'kerdx-table-filter' }, options: params.filter });
            titleCount++;
        }

        if (params.contents.length == 0) {// Notify if table is empty
            table.textContent = 'Empty Table';
        }

        tableContainer.makeElement({// arrange the table title
            element: 'style', text: `
            @media(min-width: 700px) {
                .kerdx-table-titleandsearch {
                  grid-template-columns: repeat(${titleCount}, 1fr);
                }
              }
        `});

        return tableContainer;
    }

    getTableData(table) {
        let data = [];
        let cells = table.findAll('.kerdx-table-column-cell');

        for (let i = 0; i < cells.length; i++) {
            let { name, value, row } = cells[i].dataset;
            data[row] = data[row] || {};
            data[row][name] = value;
        }

        return data;
    }

    sortTable(table, by = '', direction = 1) {
        let data = this.getTableData(table);

        data.sort((a, b) => {
            a = a[by];
            b = b[by];

            if (this.isNumber(a) && this.isNumber(b)) {
                a = a / 1;
                b = b / 1;
            }

            if (direction > -1) {
                return a > b ? 1 : -1;
            }
            else {
                return a > b ? -1 : 1;
            }
        });
        return data;
    }

    listenTable(params = { table: {}, options: [] }, callbacks = { click: () => { }, filter: () => { } }) {
        params.options = params.options || [];
        callbacks = callbacks || [];
        let table = params.table.find('.kerdx-table');

        let options = this.createElement({
            element: 'span', attributes: { class: 'kerdx-table-options' }
        });

        let list = {
            view: 'fas fa-eye',
            delete: 'fas fa-trash',
            edit: 'fas fa-pen',
            revert: 'fas fa-history'
        }

        let optionClass;
        for (let option of params.options) {
            optionClass = list[option] || `fas fa-${option}`;
            let anOption = options.makeElement({
                element: 'i', attributes: { class: optionClass + ' kerdx-table-option', id: 'kerdx-table-option-' + option }
            });
        }

        let tableTitles = table.findAll('.kerdx-table-column-title');
        let tableColumns = table.findAll('.kerdx-table-column');
        let rows = [];
        let firstColumn = tableColumns[0];
        let firstVisibleColumn;

        if (this.isnull(firstColumn)) {
            return;
        }

        for (let i = 0; i < tableColumns.length; i++) {
            if (tableColumns[i].css().display != 'none') {
                firstVisibleColumn = tableColumns[i];
                break;
            }
        }

        let firstCells = firstColumn.findAll('.kerdx-table-column-cell');
        let firstVisibleCells = firstVisibleColumn.findAll('.kerdx-table-column-cell');

        let tableRow;

        for (let i = 0; i < firstCells.length; i++) {
            rows.push(firstCells[i].dataset.row);
        }

        if (params.table.find('.kerdx-table').dataset.sort == 'true') {
            for (let i = 0; i < tableTitles.length; i++) {
                tableTitles[i].addEventListener('mouseenter', event => {
                    tableTitles[i].find('.kerdx-table-column-title-sort').css({ display: 'unset' });
                });

                tableTitles[i].addEventListener('mouseleave', event => {
                    tableTitles[i].find('.kerdx-table-column-title-sort').css({ display: 'none' });
                });

                tableTitles[i].find('.kerdx-table-column-title-sort').addEventListener('click', event => {
                    let direction;
                    tableTitles[i].find('.kerdx-table-column-title-sort').toggleClasses('fas, fa-arrow-up');
                    tableTitles[i].find('.kerdx-table-column-title-sort').toggleClasses('fas, fa-arrow-down');
                    if (tableTitles[i].find('.kerdx-table-column-title-sort').dataset.direction == 'up') {
                        tableTitles[i].find('.kerdx-table-column-title-sort').dataset.direction = 'down';
                        direction = 1;
                    }
                    else {
                        tableTitles[i].find('.kerdx-table-column-title-sort').dataset.direction = 'up';
                        direction = -1;
                    }

                    let text = tableTitles[i].find('.kerdx-table-column-title-text').textContent;

                    let data = this.sortTable(params.table.find('.kerdx-table'), text, direction);
                    let newTable = this.createTable({ contents: data });

                    let newTableColumns = newTable.findAll('.kerdx-table-column');
                    for (let j = 0; j < newTableColumns.length; j++) {
                        tableColumns[j].find('.kerdx-table-column-contents').innerHTML = newTableColumns[j].find('.kerdx-table-column-contents').innerHTML;
                    }

                    tableColumns = table.findAll('.kerdx-table-column');
                    filter();
                });
            }
        }

        if (!this.isnull(params.table.find('.kerdx-table-search'))) {
            params.table.find('.kerdx-table-search').onChanged(value => {
                filter();
            });
        }

        if (!this.isnull(params.table.find('.kerdx-table-filter'))) {
            params.table.find('.kerdx-table-filter').onChanged(value => {
                filter();
            });
        }

        let searchValue, filterValue;

        let filter = () => {
            if (!this.isnull(params.table.find('.kerdx-table-search'))) {
                searchValue = params.table.find('.kerdx-table-search').value;
            }

            if (!this.isnull(params.table.find('.kerdx-table-filter'))) {
                filterValue = params.table.find('.kerdx-table-filter').value;
            }

            for (let i = 0; i < rows.length; i++) {
                let hide = false;
                tableRow = table.findAll(`.kerdx-table-column-cell[data-row="${i}"]`);

                for (let j = 0; j < tableRow.length; j++) {
                    tableRow[j].cssRemove(['display']);
                }

                if (this.isset(filterValue) && hide == false && this.isset(callbacks.filter)) {
                    hide = callbacks.filter(filterValue, tableRow);
                }

                if (this.isset(searchValue) && hide == false) {
                    hide = true;
                    for (let j = 0; j < tableRow.length; j++) {
                        if (tableRow[j].textContent.toLowerCase().includes(searchValue.toLowerCase())) {
                            hide = false;
                            break;
                        }
                    }
                }

                if (hide) {
                    for (let j = 0; j < tableRow.length; j++) {
                        tableRow[j].css({ display: 'none' });
                    }
                }
            }
        }

        if (this.isset(callbacks.click)) {
            table.addMultipleEventListener('mousedown, touchstart', event => {
                let target = event.target;
                if (target.classList.contains('kerdx-table-option')) {
                    if (this.isset(callbacks.click)) {
                        callbacks.click(event);
                    }
                }
                else if (target.classList.contains('kerdx-table-column-cell') || !this.isnull(target.getParents('.kerdx-table-column-cell'))) {
                    if (!target.classList.contains('kerdx-table-column-cell')) {
                        target = target.getParents('.kerdx-table-column-cell');
                    }
                    let position = target.dataset.row;

                    options.remove();
                    firstVisibleCells[position].css({ position: 'relative' });
                    firstVisibleCells[position].append(options);

                    if (params.table.classList.contains('kerdx-selectable')) {
                        let row = table.findAll(`.kerdx-table-column-cell[data-row="${position}"]`);
                        for (let i = 0; i < row.length; i++) {
                            row[i].classList.toggle('kerdx-table-selected-row');
                        }
                        options.remove();

                        if (!target.classList.contains('kerdx-table-selected-row')) {
                            if (firstColumn.findAll('.kerdx-table-selected-row').length == 0) {
                                params.table.classList.remove('kerdx-selectable');
                            }
                        }
                    }
                }
            });

            table.pressed(event => {
                let target = event.target;
                if (event.duration > 300) {
                    if (target.classList.contains('kerdx-table-column-cell') || !this.isnull(target.getParents('.kerdx-table-column-cell'))) {
                        if (!target.classList.contains('kerdx-table-column-cell')) {
                            target = target.getParents('.kerdx-table-column-cell');
                        }
                        let position = target.dataset.row;

                        if (firstColumn.findAll('.kerdx-table-selected-row').length == 0 && !params.table.classList.contains('kerdx-selectable')) {
                            params.table.classList.add('kerdx-selectable');
                            let row = table.findAll(`.kerdx-table-column-cell[data-row="${position}"]`);
                            for (let i = 0; i < row.length; i++) {
                                row[i].classList.add('kerdx-table-selected-row');
                            }
                            options.remove();
                        }
                    }
                }
            });
        }
    }

    createForm(params = { element: '', title: '', columns: 1, contents: {}, required: [], buttons: {} }) {
        let form = this.createElement({
            element: params.element || 'form', attributes: params.attributes, children: [
                { element: 'h3', attributes: { class: 'kerdx-form-title' }, text: params.title },
                { element: 'section', attributes: { class: 'kerdx-form-contents', style: { gridTemplateColumns: `repeat(${params.columns}, 1fr)` } } },
                { element: 'section', attributes: { class: 'kerdx-form-buttons' } },
            ]
        });

        form.classList.add('kerdx-form');

        if (this.isset(params.parent)) params.parent.append(form);
        let note;
        let formContents = form.find('.kerdx-form-contents');

        for (let key in params.contents) {
            note = (this.isset(params.contents[key].note)) ? `(${params.contents[key].note})` : '';
            let lableText = params.contents[key].label || this.camelCasedToText(key).toLowerCase();
            let block = formContents.makeElement({
                element: 'div', attributes: { class: 'kerdx-form-single-content' }, children: [
                    { element: 'label', html: lableText, attributes: { class: 'kerdx-form-label', for: key.toLowerCase() } }
                ]
            });

            let data = block.makeElement(params.contents[key]);
            data.classList.add('kerdx-form-data');
            if (this.isset(params.contents[key].note)) block.makeElement({ element: 'span', text: params.contents[key].note, attributes: { class: 'kerdx-form-note' } });

            if (this.isset(params.required) && params.required.includes(key)) {
                data.required = true;
            }
        }

        for (let key in params.buttons) {
            form.find('.kerdx-form-buttons').makeElement(params.buttons[key]);
        }

        form.makeElement({ element: 'span', attributes: { class: 'kerdx-form-error' }, state: { name: 'error', owner: `#${form.id}` } });

        return form;
    }

    picker(params = { title: '', contents: [] }, callback = (event) => { }) {
        let picker = this.createElement({
            element: 'div', attributes: { class: 'kerdx-picker' }, children: [
                { element: 'h3', attributes: { class: 'kerdx-picker-title' }, text: params.title || '' },
                { element: 'div', attributes: { class: 'kerdx-picker-contents' } }
            ]
        });

        for (let content of params.contents) {
            picker.find('.kerdx-picker-contents').makeElement({ element: 'span', attributes: { class: 'kerdx-picker-single', 'data-name': content }, text: content });
        }

        picker.addEventListener('dblclick', event => {
            if (event.target.classList.contains('kerdx-picker-single')) {
                callback(event.target.dataset.name);
            }
        });

        return picker;
    }

    popUp(content, params = { title: '', attributes: {} }) {
        let container = params.container || document.body;
        let title = params.title || '';

        params.attributes = params.attributes || {};
        params.attributes.style = params.attributes.style || {};
        params.attributes.style.width = params.attributes.style.width || '50vw';
        params.attributes.style.height = params.attributes.style.height || '50vh';

        let popUp = this.createElement({
            element: 'div', attributes: { class: 'kerdx-pop-up' }, children: [
                {
                    element: 'div', attributes: { id: 'pop-up-window', class: 'kerdx-pop-up-window' }, children: [
                        {
                            element: 'div', attributes: { id: 'pop-up-menu', class: 'kerdx-pop-up-menu' }, children: [
                                { element: 'p', attributes: { id: '', style: { color: 'inherit', padding: '1em' } }, text: title },
                                { element: 'i', attributes: { id: 'toggle-window', class: 'kerdx-pop-up-control fas fa-expand-alt' } },
                                { element: 'i', attributes: { id: 'close-window', class: 'kerdx-pop-up-control fas fa-times' } }
                            ]
                        },
                        {
                            element: 'div', attributes: { id: 'pop-up-content', class: 'kerdx-pop-up-content' }, children: [
                                content
                            ]
                        }
                    ]
                }
            ]
        });

        popUp.find('#pop-up-window').setAttributes(params.attributes);

        popUp.find('#toggle-window').addEventListener('click', event => {
            popUp.find('#toggle-window').classList.toggle('fa-expand-alt');
            popUp.find('#toggle-window').classList.toggle('fa-compress-alt');

            if (popUp.find('#toggle-window').classList.contains('fa-expand-alt')) {
                popUp.find('#pop-up-window').css({ height: params.attributes.style.height, width: params.attributes.style.width });
            }
            else {
                popUp.find('#pop-up-window').css({ height: 'var(--fill-parent)', width: 'var(--fill-parent)' });
            }
        });

        popUp.find('#close-window').addEventListener('click', event => {
            popUp.remove();
        });

        container.append(popUp);
        return popUp;
    }

    createSelect(params = { value: '', contents: {}, multiple: false }) {
        let selected = [],
            allowNavigate = false,
            scrollPosition = -1,
            active;

        //create the element
        let select = this.createElement({
            element: 'div', attributes: params.attributes, children: [
                {
                    element: 'span', attributes: { class: 'kerdx-select-control', }, children: [
                        { element: 'input', attributes: { class: 'kerdx-select-input', value: params.value || '', ignore: true } },
                        {
                            element: 'span', attributes: { class: 'kerdx-select-toggle' }
                        }
                    ]
                },
                { element: 'input', attributes: { class: 'kerdx-select-search', placeHolder: 'Search me...', ignore: true } },
                {
                    element: 'span', attributes: { class: 'kerdx-select-contents' }
                }
            ]
        });
        select.classList.add('kerdx-select');
        let setValue = select.getAttribute('value');
        select.value = [];
        if (!this.isnull(setValue)) {
            select.value = this.array.findAll(setValue.split(','), v => {
                return v.trim() != '';
            });//remove all empty strings
        }

        select.dataset.active = 'false';
        //get the contents
        let contents = select.find('.kerdx-select-contents');
        let input = select.find('.kerdx-select-input');
        let search = select.find('.kerdx-select-search');
        let toggle = select.find('.kerdx-select-toggle');
        params.contents = params.contents || {};
        //populate the element contents
        if (Array.isArray(params.contents)) {//Turn contents to object if its array
            let items = params.contents;
            params.contents = {};
            for (let i = 0; i < items.length; i++) {
                params.contents[items[i]] = items[i];
            }
        }

        for (let i in params.contents) {
            let option = contents.makeElement({ element: 'span', attributes: { class: 'kerdx-select-option', value: i } });
            option.innerHTML = params.contents[i];
            option.value = i;
        }

        for (let v of select.value) {
            input.value += params.contents[v];
            input.dispatchEvent(new CustomEvent('change'));
        }

        //enable multiple values
        let single = (!this.isset(params.multiple) || params.multiple == false);

        let options = select.findAll('.kerdx-select-option');

        //search the contents
        search.onChanged(value => {
            for (let i = 0; i < options.length; i++) {
                if (!options[i].textContent.toLowerCase().includes(value.toLowerCase())) {
                    options[i].css({ display: 'none' });
                }
                else {
                    options[i].cssRemove(['display']);
                }
            }
        });

        //navigate the contents
        let navigate = event => {
            allowNavigate = false;
            if (event.key == 'ArrowDown' && scrollPosition < options.length - 1) {
                scrollPosition++;
                allowNavigate = true;
            }
            else if (event.key == 'ArrowUp' && scrollPosition > 0) {
                scrollPosition--;
                allowNavigate = true;
            }
            else if (event.key == 'Enter') {

            }

            if (allowNavigate) {
                active = contents.find('.kerdx-select-active-option');
                if (!this.isnull(active)) {
                    active.classList.remove('kerdx-select-active-option');
                }

                options[scrollPosition].classList.add('kerdx-select-active-option');
            }
        }

        //toggle the contents
        toggle.addEventListener('click', event => {
            let active = select.dataset.active == 'true';
            if (active) {
                deactivate(active);
            }
            else {
                activate(active);
            }
        });

        //show the contents
        let inView, top, bottom;
        document.body.css({ overflow: 'auto' })

        let placeContents = () => {
            top = select.position().top;
            bottom = document.body.clientHeight - select.position().top;

            if (top > bottom) {
                contents.css({ top: -contents.position().height + 'px' });
            }
            else {
                contents.css({ top: select.position().height + 'px' });
            }
        }

        //show contents
        let activate = () => {
            if (select.inView('body')) {
                input.addEventListener('keydown', navigate, false);
                search.css({ display: 'flex' });
                contents.css({ display: 'flex' });
                placeContents();
                select.dataset.active = 'true';
            }
        }

        //hide the contents
        let deactivate = () => {
            input.removeEventListener('keydown', navigate, false);
            search.cssRemove(['display']);
            contents.cssRemove(['display']);
            select.dataset.active = 'false';
        }

        //update the selected
        let update = (values) => {
            selected = [];
            values = values.split(',');
            for (let value of values) {
                value = value.trim();
                for (let i in params.contents) {
                    if (params.contents[i] == value) {
                        value = i;
                    }
                }

                selected.push(value);
            }

            select.value = selected;
            input.value = values;
        }

        //check when activated
        select.bubbledEvent('click', event => {
            if (event.target != toggle && select.dataset.active == 'false') {
                activate();
            }

            if (event.target.classList.contains('kerdx-select-option')) {
                let text = params.contents[event.target.value];
                if (params.multiple == 'single') {
                    if (input.value.includes(text)) {
                        input.value = input.value.replace(text, '');
                    }
                    else {
                        input.value += `, ${text}`;
                    }
                }
                else {
                    input.value += `, ${text}`;
                }

                input.dispatchEvent(new CustomEvent('change'));

                if (single) {
                    deactivate();
                }
            }
        });

        //check when deactivated
        select.notBubbledEvent('click', event => {
            if (select.dataset.active == 'true') {
                deactivate();
            }
        });

        //when input value changes
        input.addEventListener('change', event => {
            let values = input.value.split(',');

            values = this.array.findAll(values, value => {
                return value.trim() != '';
            });

            values = this.array.each(values, value => {
                return value.trim();
            });

            if (!single) {
                if (params.multiple == 'single') {
                    values = this.array.toSet(values);
                }
            }

            values = values.join(', ');
            update(values);
        });

        //align contents on scroll
        window.addEventListener('scroll', event => {
            if (select.inView('body')) {
                placeContents();
            }
        });

        return select;
    }

    choose(params = { note: '', options: [] }) {
        let chooseWindow = this.createElement({
            element: 'span', attributes: { class: 'crater-choose' }, children: [
                { element: 'p', attributes: { class: 'crater-choose-note' }, text: params.note },
                { element: 'span', attributes: { class: 'crater-choose-control' } },
                { element: 'button', attributes: { id: 'crater-choose-close', class: 'btn' }, text: 'Close' }
            ]
        });

        let chooseControl = chooseWindow.querySelector('.crater-choose-control');

        chooseWindow.querySelector('#crater-choose-close').addEventListener('click', event => {
            chooseWindow.remove();
        });

        for (let option of params.options) {
            chooseControl.makeElement({
                element: 'button', attributes: { class: 'btn choose-option' }, text: option
            });
        }

        return {
            display: chooseWindow, choice: new Promise((resolve, reject) => {
                chooseControl.addEventListener('click', event => {
                    if (event.target.classList.contains('choose-option')) {
                        resolve(event.target.textContent);
                        chooseWindow.remove();
                    }
                });
            })
        };
    }

    textEditor(params = { id: '', width: 'max-width' }) {
        params = params || {};
        params.id = params.id || 'text-editor';
        let textEditor = this.createElement({
            element: 'div', attributes: {
                id: params.id
            }, children: [
                {
                    element: 'style', text: `

                    div#crater-text-editor{
                        margin: 0 auto;
                        display: grid;
                        width: ${params.width || 'max-content'};
                        height: max-content;
                        border: 2px solid rgb(40, 110, 89);
                        border-radius: 8px 8px 0px 0px;
                        background-color: var(--primary-color);
                    }
                    
                    div#crater-rich-text-area{
                        height: 100%;
                        width: 100%;
                    }

                    div#crater-the-ribbon{
                        border-bottom: none;
                        width: 100%;
                        padding: .5em 0;
                        display: grid;
                        grid-template-rows: max-content max-content;
                        background-color: rgb(40, 110, 89);
                        color: var(--primary-color);
                        text-align: left;
                    }

                    iframe#crater-the-WYSIWYG{
                        height: 100%;
                        width: 100%;
                    }

                    div#crater-the-ribbon button{
                        color: var(--primary-color);
                        border: none;
                        outline: none;
                        background-color: transparent;
                        cursor: pointer;
                        padding: .3em;
                        margin: .5em;
                    }

                    div#crater-the-ribbon button:hover{
                        background-color: rgb(20, 90, 70);
                        transition: all 0.3s linear 0s;
                    }

                    div#crater-the-ribbon input,  div#crater-the-ribbon select{
                        margin: .5em;
                    }

                    div#crater-the-ribbon input[type="color"]{
                        border: none;
                        outline: none;
                        background-color: transparent;
                    }
                `},
                {
                    element: 'div', attributes: {
                        id: 'crater-the-ribbon'
                    }, children: [
                        {
                            element: 'span', children: [
                                { element: 'button', attributes: { id: 'undoButton', title: 'Undo' }, text: '&larr;' },
                                { element: 'button', attributes: { id: 'redoButton', title: 'Redo' }, text: '&rarr;' },
                                { element: 'select', attributes: { id: 'fontChanger' }, options: this.fontStyles },
                                { element: 'select', attributes: { id: 'fontSizeChanger' }, options: this.range(1, 20) },
                                { element: 'button', attributes: { id: 'orderedListButton', title: 'Numbered List' }, text: '(i)' },
                                { element: 'button', attributes: { id: 'unorderedListButton', title: 'Bulletted List' }, text: '&bull;' },
                                { element: 'button', attributes: { id: 'linkButton', title: 'Create Link' }, text: 'Link' },
                                { element: 'button', attributes: { id: 'unLinkButton', title: 'Remove Link' }, text: 'Unlink' }
                            ]
                        },
                        {
                            element: 'span', children: [
                                { element: 'button', attributes: { id: 'boldButton', title: 'Bold' }, children: [{ element: 'b', text: 'B' }] },
                                { element: 'button', attributes: { id: 'italicButton', title: 'Italic' }, children: [{ element: 'em', text: 'I' }] },
                                { element: 'button', attributes: { id: 'underlineButton', title: 'Underline' }, children: [{ element: 'u', text: 'U' }] },
                                { element: 'button', attributes: { id: 'supButton', title: 'Superscript' }, children: [{ element: 'sup', text: '2' }] },
                                { element: 'button', attributes: { id: 'subButton', title: 'Subscript' }, children: [{ element: 'sub', text: '2' }] },
                                { element: 'button', attributes: { id: 'strikeButton', title: 'Strikethrough' }, children: [{ element: 's', text: 'abc' }] },
                                { element: 'input', attributes: { type: 'color', id: 'fontColorButton', title: 'Change Font Color', value: '#000000' } },
                                { element: 'input', attributes: { type: 'color', id: 'highlightButton', title: 'Hightlight Text', value: '#ffffff' } },
                                { element: 'input', attributes: { type: 'color', id: 'backgroundButton', title: 'Change Background', value: '#ffffff' } },
                                { element: 'button', attributes: { id: 'alignLeftButton', title: 'Align Left' }, children: [{ element: 'a', text: 'L' }] },
                                { element: 'button', attributes: { id: 'alignCenterButton', title: 'Align Center' }, children: [{ element: 'a', text: 'C' }] },
                                { element: 'button', attributes: { id: 'alignJustifyButton', title: 'Align Justify' }, children: [{ element: 'a', text: 'J' }] },
                                { element: 'button', attributes: { id: 'alignRightButton', title: 'Align Right' }, children: [{ element: 'a', text: 'R' }] }
                            ]
                        }
                    ]
                },
                {
                    element: 'div', attributes: {
                        id: 'crater-rich-text-area'
                    }, children: [
                        {
                            element: 'iframe', attributes: {
                                id: 'crater-the-WYSIWYG', frameBorder: 0, name: 'theWYSIWYG'
                            }
                        }
                    ]
                }
            ]
        });

        let fonts = textEditor.findAll('select#font-changer > option');
        fonts.forEach(font => {
            font.css({ fontFamily: font.value });
        });

        textEditor.find('#unorderedListButton').innerHTML = '&bull;';
        textEditor.find('#redoButton').innerHTML = '&rarr;';
        textEditor.find('#undoButton').innerHTML = '&larr;';

        let self = this;
        let editorWindow = textEditor.find('#crater-the-WYSIWYG');
        editorWindow.onAdded(() => {
            let editor = editorWindow.contentWindow.document;

            editor.body.innerHTML = '';
            if (self.isset(params.content)) {
                editor.body.innerHTML = params.content.innerHTML;
            }

            editor.designMode = 'on';

            textEditor.find('#boldButton').addEventListener('click', () => {
                editor.execCommand('Bold', false, null);
            }, false);

            textEditor.find('#italicButton').addEventListener('click', () => {
                editor.execCommand('Italic', false, null);
            }, false);

            textEditor.find('#underlineButton').addEventListener('click', () => {
                editor.execCommand('Underline', false, null);
            }, false);

            textEditor.find('#supButton').addEventListener('click', () => {
                editor.execCommand('Superscript', false, null);
            }, false);

            textEditor.find('#subButton').addEventListener('click', () => {
                editor.execCommand('Subscript', false, null);
            }, false);

            textEditor.find('#strikeButton').addEventListener('click', () => {
                editor.execCommand('Strikethrough', false, null);
            }, false);

            textEditor.find('#orderedListButton').addEventListener('click', () => {
                editor.execCommand('InsertOrderedList', false, `newOL${self.random()}`);
            }, false);

            textEditor.find('#unorderedListButton').addEventListener('click', () => {
                editor.execCommand('InsertUnorderedList', false, `newUL${self.random()}`);
            }, false);

            textEditor.find('#fontColorButton').onChanged(value => {
                editor.execCommand('ForeColor', false, value);
            });

            textEditor.find('#highlightButton').onChanged(value => {
                editor.execCommand('BackColor', false, value);
            });

            textEditor.find('#backgroundButton').onChanged(value => {
                editor.body.style.background = value;
            });

            textEditor.find('#fontChanger').onChanged(value => {
                editor.execCommand('FontName', false, value);
            });

            textEditor.find('#fontSizeChanger').onChanged(value => {
                editor.execCommand('FontSize', false, value);
            });

            textEditor.find('#linkButton').addEventListener('click', () => {
                let url = prompt('Enter a URL', 'http://');

                if (self.isnull(url)) return;
                editor.execCommand('CreateLink', false, url);
            }, false);

            textEditor.find('#unLinkButton').addEventListener('click', () => {
                editor.execCommand('UnLink', false, null);
            }, false);

            textEditor.find('#undoButton').addEventListener('click', () => {
                editor.execCommand('Undo', false, null);
            }, false);

            textEditor.find('#redoButton').addEventListener('click', () => {
                editor.execCommand('redo', false, null);
            }, false);

            textEditor.find('#alignLeftButton').addEventListener('click', () => {
                editor.execCommand('justifyLeft', false, null);
            });

            textEditor.find('#alignCenterButton').addEventListener('click', () => {
                editor.execCommand('justifyCenter', false, null);
            });

            textEditor.find('#alignJustifyButton').addEventListener('click', () => {
                editor.execCommand('justifyFull', false, null);
            });

            textEditor.find('#alignRightButton').addEventListener('click', () => {
                editor.execCommand('justifyRight', false, null);
            });
        }, false);

        return textEditor;
    }

    displayData(data = {}, container) {
        let lineNumbers = [];
        let displayString = (value) => {
            return this.createElement({ element: 'span', attributes: { class: 'kerdx-data-str' }, text: `"${value}"` });
        }

        let displayLiteral = (value) => {
            return this.createElement({ element: 'span', attributes: { class: 'kerdx-data-lit' }, text: `${value}` });
        }

        let displayPunctuation = (value) => {
            return this.createElement({ element: 'span', attributes: { class: 'kerdx-data-pun' }, text: `${value}` });
        }

        let displayNewLine = () => {
            increment++;
            return this.createElement({ element: 'span', attributes: { class: 'kerdx-data-pln' } });
        }

        let displayItem = (value, params) => {
            params = params || {};
            let item = this.createElement({ element: 'span', attributes: { class: 'kerdx-data-item' } });
            lineNumbers.push(item);
            if (this.isset(params.key)) {
                item.makeElement([
                    displayString(params.key),
                    displayPunctuation(' : '),
                    chooseDisplay(value),
                ]);
            }
            else {
                item.makeElement([
                    chooseDisplay(value),
                ]);
            }
            return item;
        }

        let displayArray = (value) => {
            let array = this.createElement({ element: 'span', attributes: { class: 'kerdx-data-block' } });
            lineNumbers.push(array);

            array.makeElement(displayPunctuation('['));
            let item;
            for (let i = 0; i < value.length; i++) {
                item = array.makeElement(displayItem(value[i]));

                if (i != value.length - 1) {
                    item.makeElement(displayPunctuation(','));
                }
            }
            array.makeElement(displayPunctuation(']'));
            return array;
        }

        let displayObject = (value) => {
            let object = this.createElement({ element: 'span', attributes: { class: 'kerdx-data-block' } });
            lineNumbers.push(object);

            object.makeElement(displayPunctuation('{'));
            let item;
            let i = 0;
            for (let key in value) {
                item = object.makeElement(displayItem(value[key], { key }));
                if (i != Object.keys(value).length - 1) {
                    item.makeElement(displayPunctuation(','));
                }
                i++;
            }
            object.makeElement(displayPunctuation('}'));
            return object;
        }

        let chooseDisplay = (value) => {
            if (typeof value == "string") {
                return displayString(value);
            }
            else if (Array.isArray(value)) {
                return displayArray(value);
            }
            else if (typeof value == 'object') {
                return displayObject(value);
            }
            else {
                return displayLiteral(value);
            }
        }
        let lineHeight = '25px';
        let displayed = this.createElement({
            element: 'pre', attributes: { class: 'kerdx-data-window' }, children: [
                {
                    element: 'span', attributes: { class: 'kerdx-data-line', style: { lineHeight } }
                },
                {
                    element: 'span', attributes: { class: 'kerdx-data-toggles' }
                },
                {
                    element: 'code', attributes: { class: 'kerdx-data-code', style: { lineHeight } }, children: [
                        chooseDisplay(data)
                    ]
                }
            ]
        });

        if (this.isset(container)) {
            container.append(displayed);
        }

        let code = displayed.find('.kerdx-data-code'),
            numbers,
            toggleButtons,
            height = code.position().height,
            lines = displayed.find('.kerdx-data-line'),
            toggles = displayed.find('.kerdx-data-toggles'),
            count = height / parseInt(lineHeight),
            items = code.findAll('.kerdx-data-item'),
            blocks = code.findAll('.kerdx-data-block');

        let setRange = (block) => {
            let start = Math.floor((block.position().top - code.position().top) / parseInt(lineHeight)) + 1;
            let end = Math.floor((block.position().bottom - code.position().top) / parseInt(lineHeight)) + 1;
            block.range = this.range(end, start);
        }

        let setNumbers = () => {
            for (let i = 0; i < lineNumbers.length; i++) {
                lines.makeElement([
                    { element: 'a', html: `${i / 1 + 1}`, attributes: { class: 'kerdx-data-line-number' } }
                ]);
            }
        }

        let setToggles = () => {
            for (let i = 0; i < blocks.length; i++) {
                let top = blocks[i].position().top - code.position().top + 6 + 'px'
                let toggle = toggles.makeElement({ element: 'i', attributes: { class: 'kerdx-data-toggles-button fas fa-arrow-down', style: { top } } });

                toggle.block = blocks[i];
                blocks[i].toggle = toggle;
            }
        }

        let alignToggles = () => {
            for (let i = 0; i < toggleButtons.length; i++) {
                toggleButtons[i].css({
                    top: toggleButtons[i].block.position().top - code.position().top + 6 + 'px'
                });
            }
        }

        let hideNumbers = (block) => {
            for (let i = 0; i < block.range.length; i++) {
                if (!this.isset(numbers[block.range[i]].controller)) {
                    numbers[block.range[i]].css({ display: 'none' });
                    numbers[block.range[i]].controller = block;
                }
            }
        }

        let hideBlock = (block) => {
            let blockContent = block.children;
            for (let i = 0; i < blockContent.length; i++) {
                if (blockContent[i].classList.contains('kerdx-data-item')) {
                    blockContent[i].css({ display: 'none' });

                    blockContent[i].findAll('.kerdx-data-block').forEach(b => {
                        if (!this.isset(b.toggle.controller)) {
                            b.toggle.controller = block;
                            b.toggle.css({ display: 'none' });
                        }
                    });
                }
            }
        }

        let showNumbers = (block) => {
            for (let i = 0; i < block.range.length; i++) {
                if (numbers[block.range[i]].controller == block) {
                    numbers[block.range[i]].cssRemove(['display']);
                    delete numbers[block.range[i]].controller;
                }
            }
        }

        let showBlock = (block) => {
            let blockContent = block.children;
            for (let i = 0; i < blockContent.length; i++) {
                if (blockContent[i].classList.contains('kerdx-data-item')) {
                    blockContent[i].cssRemove(['display']);

                    blockContent[i].findAll('.kerdx-data-block').forEach(b => {
                        if (b.toggle.controller == block) {
                            delete b.toggle.controller;
                            b.toggle.cssRemove(['display']);
                        }
                    });
                }
            }
        }

        lineNumbers.push(undefined)

        displayed.onAdded(event => {
            setNumbers();
            setToggles();

            numbers = lines.findAll('.kerdx-data-line-number');
            toggleButtons = toggles.findAll('.kerdx-data-toggles-button');

            let blockContent, start, end;
            displayed.addEventListener('click', event => {
                let target = event.target;
                if (target.classList.contains('kerdx-data-toggles-button')) {//if toggled
                    if (!this.isset(target.block.range)) {
                        setRange(target.block);
                    }

                    if (target.classList.contains('fa-arrow-down')) {//if toggle to show
                        hideNumbers(target.block);
                        hideBlock(target.block);
                    }
                    else {
                        showNumbers(target.block);
                        showBlock(target.block);
                    }

                    target.classList.toggle('fa-arrow-up');
                    target.classList.toggle('fa-arrow-down');
                    alignToggles();
                }
            });
        });

        return displayed;
    }
}

module.exports = Components;
},{"./Template":12}],7:[function(require,module,exports){
class Func {

    constructor() {
        this.capitals = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.smalls = "abcdefghijklmnopqrstuvwxyz";
        this.digits = "1234567890";
        this.symbols = ",./?'!@#$%^&*()-_+=`~\\| ";
        this.months = ['January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        this.genders = ['Male', 'Female', 'Do not disclose'];
        this.maritals = ['Married', 'Single', 'Divorced', 'Widowed'];
        this.religions = ['Christainity', 'Islam', 'Judaism', 'Paganism', 'Budism'];
        this.userTypes = ['student', 'staff', 'admin', 'ceo'];
        this.staffRequests = ['leave', 'allowance'];
        this.studentsRequests = ['absence', 'academic'];
        this.subjectList = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Agriculture', 'Literature', 'History'].sort();
        this.subjectLevels = ['General', 'Senior', 'Science', 'Arts', 'Junior'];
        this.fontStyles = ['Arial', 'Times New Roman', 'Helvetica', 'Times', 'Courier New', 'Verdana', 'Courier', 'Arial Narrow', 'Candara', 'Geneva', 'Calibri', 'Optima', 'Cambria', 'Garamond', 'Perpetua', 'Monaco', 'Didot', 'Brush Script MT', 'Lucida Bright', 'Copperplate', 'Serif', 'San-Serif', 'Georgia', 'Segoe UI'];
        this.pixelSizes = ['0px', '1px', '2px', '3px', '4px', '5px', '6px', '7px', '8px', '9px', '10px', '20px', '30px', '40px', '50px', '60px', '70px', '80px', '90px', '100px', 'None', 'Unset', 'auto', '-webkit-fill-available'];
        this.colors = ['Red', 'Green', 'Blue', 'Yellow', 'Black', 'White', 'Purple', 'Violet', 'Indigo', 'Orange', 'Transparent', 'None', 'Unset'];
        this.boldness = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 'lighter', 'bold', 'bolder', 'normal', 'unset'];
        this.borderTypes = ['Solid', 'Dotted', 'Double', 'Groove', 'Dashed', 'Inset', 'None', 'Unset', 'Outset', 'Rigged', 'Inherit', 'Initial'];
        this.shadows = ['2px 2px 5px 2px red', '2px 2px 5px green', '2px 2px yellow', '2px black', 'None', 'Unset'];
        this.borders = ['1px solid black', '2px dotted green', '3px dashed yellow', '1px double red', 'None', 'Unset'];
        this.alignment = ['Left', 'Justified', 'Right', 'Center'];
    }

    extractSource(source) {
        let value = this.inBetween(source, '$#&{', '}&#$');
        try {
            value = JSON.parse(value);
        } catch (error) {
            value = {};
        }
        return value;
    }

    indexAt(haystack = '', needle = '', pos = 0) {
        pos = pos || 0;
        if (haystack.indexOf(needle) == -1) {
            return -1;
        }

        haystack = haystack.split(needle);
        if (pos >= haystack.length) {
            return -1;
        }

        let index = 0;
        for (let i = 0; i < haystack.length; i++) {
            if (i <= pos) {
                index += haystack[i].length;
            }
        }
        index += needle.length * pos;

        return index;
    }

    combine(haystack = '', first = '', second = '', pos = 0) {
        pos = pos || 0;//initialize position if not set
        let at1 = pos,
            at2 = first === second ? pos + 1 : pos; //check if it is the same and change position
        let start = this.indexAt(haystack, first, at1);//get the start
        let end = this.indexAt(haystack, second, at2);//get the end

        if (start == -1 || start + first.length >= haystack.length || end == -1) {//null if one is not found
            return -1;
        }

        return haystack.slice(start, end + second.length);
    }

    allCombine(haystack = '', first = '', second = '') {
        let pos = 0;
        let all = [];
        let found;
        while (found != -1) {
            found = this.combine(haystack, first, second, pos);
            pos++;
            if (found != -1) {
                all.push(found);
            }
        }

        return all;
    }

    inBetween(haystack = '', first = '', second = '', pos = 0) {
        pos = pos || 0;//initialize position if not set
        let at1 = pos,
            at2 = first === second ? pos + 1 : pos; //check if it is the same and change position
        let start = this.indexAt(haystack, first, at1);//get the start
        let end = this.indexAt(haystack, second, at2);//get the end

        if (start == -1 || start + first.length >= haystack.length || end == -1) {//-1 if one is not found or inbetween
            return -1;
        }

        return haystack.slice(start + first.length, end);
    }

    allInBetween(haystack = '', first = '', second = '') {
        let pos = 0;
        let all = [];
        let found;
        while (found != -1) {
            found = this.inBetween(haystack, first, second, pos);
            pos++;
            if (found != -1) {
                all.push(found);
            }
        }

        return all;
    }

    extractCSS(element) {
        let css = element.style.cssText,
            style = {},
            key,
            value;

        if (css != '') {
            css = css.split('; ');
            let pair;
            for (let i of css) {
                pair = this.trem(i);
                key = this.jsStyleName(pair.split(':')[0]);
                value = this.stringReplace(pair.split(':').pop(), ';', '');
                if (key != '') {
                    style[key] = this.trem(value);
                }
            }
        }

        return style;
    }

    trimMonthArray() {
        let months = [];
        for (let i = 0; i < this.months.length; i++) {
            months.push(this.months[i].slice(0, 3));
        }
        return months;
    }

    jsStyleName(name = '') {
        let newName = '';
        for (let i = 0; i < name.length; i++) {
            if (name[i] == '-') {
                i++;
                newName += name[i].toUpperCase();
            }
            else newName += name[i].toLowerCase();
        }
        return newName;
    }

    cssStyleName(name = '') {
        let newName = '';
        for (let i = 0; i < name.length; i++) {
            if (this.isCapital(name[i])) newName += '-';
            newName += name[i].toLowerCase();
        }

        return newName;
    }

    textToCamelCased(text = '') {
        let value = '';
        for (let i in text) {
            if (text[i] == ' ') continue;
            else if (i == 0) value += text[i].toLowerCase();
            else if (this.isset(text[i - 1]) && text[i - 1] == ' ') value += text[i].toUpperCase();
            else value += text[i];
        }
        return value;
    }

    camelCasedToText(camelCase = '') {
        let value = '';
        for (let i in camelCase) {
            if (i != 0 && this.isCapital(camelCase[i])) value += ` ${camelCase[i].toLowerCase()}`;
            else value += camelCase[i];
        }
        return value;
    }

    emptyObject(obj) {
        return JSON.stringify(obj) == JSON.stringify({});
    }

    random(params = { limit: 1, range: 1 }) {
        let random;
        if (this.emptyObject(params)) {
            random = Math.random() * 2 - 1;
        }
        else if (this.isset(params.limit)) {
            random = Math.random() * params.limit;
        }
        else if (this.isset(params.range)) {

        }
        return random;
    }

    range(end = 1, start = 1) {
        let value = [];
        for (let i = start || 0; i < end; i++) {
            value.push(i);
        }

        return value;
    }

    generateRandom(length = 5) {
        var string = this.capitals + this.smalls + this.digits;
        var alphanumeric = '';
        for (var i = 0; i < length; i++) {
            alphanumeric += string[Math.floor(Math.random() * string.length)];
        }
        return alphanumeric;
    }

    generateRandomHex(length = 5) {
        var string = this.capitals.slice(0, 3) + this.smalls.slice(0, 3) + this.digits;
        var alphanumeric = '';
        for (var i = 0; i < length; i++) {
            alphanumeric += string[Math.floor(Math.random() * string.length)];
        }
        return alphanumeric;
    }

    generateKey(length = 5) {
        let key = Date.now().toString(length) + Math.random().toString(length).slice(2);//generate the key
        return key;
    }

    edittedUrl(params) {
        var url = this.urlSplitter(params.url);
        url.vars[params.toAdd] = params.addValue.toLowerCase();
        return this.urlMerger(url, params.toAdd);
    }

    addCommaToMoney(money = '') {
        var inverse = '';
        for (var i = money.length - 1; i >= 0; i--) {
            inverse += money[i];
        }
        money = "";
        for (var i = 0; i < inverse.length; i++) {
            let position = (i + 1) % 3;
            money += inverse[i];
            if (position == 0) {
                if (i != inverse.length - 1) {
                    money += ',';
                }
            }
        }
        inverse = '';
        for (var i = money.length - 1; i >= 0; i--) {
            inverse += money[i];
        }
        return inverse;
    }

    isCapital(value = '') {
        if (value.length == 1) {
            return this.capitals.includes(value);
        }
    }

    capitalize(value = '') {
        if (!this.isCapital(value[0])) {
            value = value.split('');
            value[0] = this.capitals[this.smalls.indexOf(value[0])];
            return this.stringReplace(value.toString(), ',', '');
        }
        return value;
    }

    flip(haystack = '') {
        return haystack.split('').reverse().join('');
    }

    isSmall(value = '') {
        if (value.length == 1) {
            return this.smalls.includes(value);
        }
    }

    isSymbol(value = '') {
        if (value.length == 1) {
            return this.symbols.includes(value);
        }
    }

    isName(value = '') {
        for (var x in value) {
            if (this.isDigit(value[x])) {
                return false;
            }
        }
        return true;
    }

    isPasswordValid(value = '') {
        var len = value.length;
        if (len > 7) {
            for (var a in value) {
                if (this.isCapital(value[a])) {
                    for (var b in value) {
                        if (this.isSmall(value[b])) {
                            for (var c in value) {
                                if (this.isDigit(value[c])) {
                                    for (var d in value) {
                                        if (this.isSymbol(value[d])) {
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    isSubString(haystack = '', value = '') {
        if (haystack.indexOf(value) != -1) return true;
        return false;
    }

    isDigit(value = '') {
        value = new String(value)
        if (value.length == 1) {
            return this.digits.includes(value);
        }
        return false;
    }

    isEmail(value = '') {
        var email_parts = value.split('@');
        if (email_parts.length != 2) {
            return false;
        } else {
            if (this.isSpaceString(email_parts[0])) {
                return false;
            }
            var dot_parts = email_parts[1].split('.');
            if (dot_parts.length != 2) {
                return false;
            } else {
                if (this.isSpaceString(dot_parts[0])) {
                    return false;
                }
                if (this.isSpaceString(dot_parts[1])) {
                    return false;
                }
            }
        }
        return true;
    }

    isTruthy(value) {
        let truthy;
        if (typeof value == 'boolean') {
            truthy = value;
        }
        else if (typeof value == 'string') {
            truthy = (value.toLocaleLowerCase() == 'true' || value.toLocaleLowerCase() == '1');
        }
        else if (typeof value == 'number') {
            truthy = (value == 1);
        }
        return truthy;
    }

    isFalsy(value) {
        let falsy;
        if (typeof value == 'boolean') {
            falsy = value;
        }
        else if (typeof value == 'string') {
            falsy = (value.toLocaleLowerCase() == 'false' || value.toLocaleLowerCase() == '0');
        }
        else if (typeof value == 'number') {
            falsy = (value == 0);
        }
        return falsy;
    }

    objectLength(object = {}) {
        return Object.keys(object).length;
    }

    isSpaceString(value = '') {
        if (value == '') {
            return true;
        } else {
            for (var x in value) {
                if (value[x] != ' ') {
                    return false;
                }
            }
        }
        return true;
    }

    hasString(haystack = '', needle = '') {
        for (var x in haystack) {
            if (needle == haystack[x]) {
                return true;
            }
        }
        return false;
    }

    trem(needle = '') {
        //remove the prepended spaces
        if (needle[0] == ' ') {
            var new_needle = '';
            for (var i = 0; i < needle.length; i++) {
                if (i != 0) {
                    new_needle += needle[i];
                }
            }
            needle = this.trem(new_needle);
        }

        //remove the appended spaces
        if (needle[needle.length - 1] == ' ') {
            var new_needle = '';
            for (var i = 0; i < needle.length; i++) {
                if (i != needle.length - 1) {
                    new_needle += needle[i];
                }
            }
            needle = this.trem(new_needle);
        }
        return needle;
    }

    stringReplace(word = '', from = '', to = '') {
        var value = '';
        for (let i = 0; i < word.length; i++) {
            if (word[i] == from) {
                value += to;
            }
            else {
                value += word[i];
            }
        }
        return value;
    }

    converToRealPath(path = '') {
        if (path[path.length - 1] != '/') {
            path += '/';
        }
        return path;
    }

    isSpacialCharacter(char = '') {
        var specialcharacters = "'\\/:?*<>|!.";
        for (var i = 0; i < specialcharacters.length; i++) {
            if (specialcharacters[i] == char) {
                return true;
            }
        }
        return false;
    }

    countChar(haystack = '', needle = '') {
        var j = 0;
        for (var i = 0; i < haystack.length; i++) {
            if (haystack[i] == needle) {
                j++;
            }
        }
        return j;
    }

    occurancesOf(haystack = '', needle = '') {
        let occurances = [];
        for (let i = 0; i < haystack.length; i++) {
            if (haystack[i] === needle) {
                occurances.push(i);
            }
        }

        return occurances;
    }

    isset(variable) {
        return (typeof variable !== 'undefined');
    }

    isnull(variable) {
        return variable == null;
    }

    notNull(variable) {
        return this.isset(variable) && !this.isnull(variable);
    }

    isArray(variable) {
        let flag = false;
        if (typeof variable == 'object') {
            flag = variable.constructor === Array;
        }
        return flag;
    }

    isObject(variable) {
        let flag = false;
        if (typeof variable == 'object') {
            flag = variable.constructor === Object;
        }
        return flag;
    }

    isString(variable) {
        let flag = false;
        if (typeof variable == 'string') {
            flag = variable.constructor === String;
        }
        return flag;
    }

    isNumber(variable) {
        let flag = false;
        if (typeof variable == 'number') {
            flag = variable.constructor === Number;
        }
        return flag;
    }

    isBool(variable) {
        let flag = false;
        if (typeof variable == 'boolean') {
            flag = variable.constructor === Boolean;
        }
        return flag;
    }

    isfunction(variable) {
        return (typeof variable === 'function');
    }

    async runParallel(functions = [], callBack = () => { }) {
        var results = {};
        for (var f in functions) {
            results[f] = await functions[f];
        }
        callBack(results);
    }

    isMobile() {
        return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }

    urlMerger(splitUrl = '', lastQuery = '') {
        var hostType = (this.isset(splitUrl.hostType)) ? splitUrl.hostType : 'http';
        var hostName = (this.isset(splitUrl.hostName)) ? splitUrl.hostName : '';
        var port = (this.isset(splitUrl.host)) ? splitUrl.port : '';
        var pathName = (this.isset(splitUrl.pathName)) ? splitUrl.pathName : '';
        var queries = '?';
        var keepMapping = true;
        (this.isset(splitUrl.vars)) ?
            Object.keys(splitUrl.vars).map(key => {
                if (keepMapping) queries += key + '=' + splitUrl.vars[key] + '&';
                if (key == lastQuery) keepMapping = false;
            }) : '';
        var location = hostType + '::/' + hostName + ':' + port + '/' + pathName + queries;
        location = (location.lastIndexOf('&') == location.length - 1) ? location.slice(0, location.length - 1) : location;
        location = (location.lastIndexOf('=') == location.length - 1) ? location.slice(0, location.length - 1) : location;
        return location;
    }

    urlSplitter(location = '') {
        if (this.isset(location)) {
            location = location.toString();
            var httpType = (location.indexOf('://') === -1) ? null : location.split('://')[0];
            var fullPath = location.split('://').pop(0);
            var host = fullPath.split('/')[0];
            var hostName = host.split(':')[0];
            var port = host.split(':').pop(0);
            var path = '/' + fullPath.split('/').pop(0);
            var pathName = path.split('?')[0];
            var queries = (path.indexOf('?') === -1) ? null : path.split('?').pop(0);

            var vars = {};
            if (queries != null) {
                var query = queries.split('&');
                for (var x in query) {
                    var parts = query[x].split('=');
                    if (parts[1]) {
                        vars[this.stringReplace(parts[0], '-', ' ')] = this.stringReplace(parts[1], '-', ' ');
                    } else {
                        vars[this.stringReplace(parts[0], '-', ' ')] = '';
                    }
                }
            }
            var httphost = httpType + '://' + host;
            return { location: location, httpType: httpType, fullPath: fullPath, host: host, httphost: httphost, hostName: hostName, port: port, path: path, pathName: pathName, queries: queries, vars: vars };
        }
    }

    getUrlVars(location = '') {
        location = location.toString();
        var queries = (location.indexOf('?') === -1) ? null : location.split('?').pop(0);
        var vars = {};

        if (queries != null) {
            var query = queries.split('&');
            for (var x in query) {
                var parts = query[x].split('=');
                if (parts[1]) {
                    vars[this.stringReplace(parts[0], '-', ' ')] = this.stringReplace(parts[1], '-', ' ');
                } else {
                    vars[this.stringReplace(parts[0], '-', ' ')] = '';
                }
            }
        }
        return vars;
    }
}

module.exports = Func;
},{}],8:[function(require,module,exports){
const Period = require('./Period');
class Empty {
}

class JSElements extends Period {
    constructor(theWindow = Empty) {
        super();
        this.Element = theWindow.Element;
        this.document = theWindow.document;
    }

    loadCss(href = '') {
        let element = this.createElement({ element: 'link', attributes: { rel: 'stylesheet', type: 'text/css', href } });
        if (this.document !== undefined) {
            if (this.document['head'] !== undefined) {
                this.document['head'].append(element);
            }
        }
    }

    jsonForm(form) {
        let json = {};
        let perform = (element) => {
            let children = element.children;
            for (let i = 0; i < children.length; i++) {
                perform(children[i]);
            }
            if (element.hasAttribute('name')) {
                if (element.type == 'file') {
                    if (element.hasAttribute('multiple')) {
                        json[element.getAttribute('name')] = element.files;
                    }
                    else {
                        json[element.getAttribute('name')] = element.files[0];
                    }
                }
                else {
                    json[element.getAttribute('name')] = element.value;
                }
            }
        }

        perform(form);
        return json;
    }

    jsonElement(_element_) {
        let element = _element_.nodeName.toLowerCase();
        let attributes = _element_.getAttributes();
        attributes.style = _element_.css();
        let children = [];
        for (let i = 0; i < _element_.children.length; i++) {
            children.push(_element_.children[i].toJson());
        }
        return { element, attributes, children }
    }

    isElement(object) {
        return object instanceof this.Element;
    }

    createFromObject(object = {}, singleParent) {
        let created, name;

        if (this.isElement(object)) {
            created = object;
            name = created.nodeName;
        }
        else if (this.isElement(object.element)) {
            created = object.element;
            name = created.nodeName;
        }
        else {
            name = object.element.toLowerCase();
            created = document.createElement(object.element);//generate the element
        }


        if (this.isset(object.attributes) && !this.isElement(object)) {//set the attributes
            for (var attr in object.attributes) {
                if (attr == 'style') {//set the styles
                    created.css(object.attributes[attr]);
                }
                else created.setAttribute(attr, object.attributes[attr]);
            }
        }

        if (this.isset(object.text)) {
            created.textContent = object.text;//set the innerText
        }

        if (this.isset(object.html)) {
            created.innerHTML = object.html;//set the innerHTML
        }

        if (this.isset(object.value)) {
            created.value = object.value;//set the value
        }

        if (name.includes('-')) {
            created = this.createFromHTML(created.outerHTML);
        }

        if (this.isset(singleParent)) {
            singleParent.attachElement(created, object.attachment);
        }

        if (this.isset(object.children)) {
            created.makeElement(object.children);
        }

        if (this.isset(object.options) && Array.isArray(object.options)) {//add options if isset           
            for (var i of object.options) {
                let option = created.makeElement({ element: 'option', value: i, text: i, attachment: 'append' });
                if (this.isset(object.selected) && object.selected == i) {
                    option.setAttribute('selected', true);
                }
                if (i.toString().toLowerCase() == 'null') {
                    option.setAttribute('disabled', true);
                }
            }
        }

        if (this.isset(created.dataset.icon)) {
            created.addClasses(created.dataset.icon);
        }

        return created;
    }

    createFromHTML(htmlString = '', singleParent) {
        let parser = new DOMParser();
        let html = parser.parseFromString(htmlString, 'text/html');

        let created = html.body.firstChild;

        if (htmlString.indexOf('html') == 1) {
            created = html;
        }
        else if (htmlString.indexOf('body') == 1) {
            created = html.body;
        }

        if (this.isset(singleParent)) singleParent.attachElement(created, singleParent.attachment);
        return created;
    }

    createPerceptorElement(object, singleParent) {
        let created = this[object.perceptorElement](object.params);
        if (this.isset(singleParent)) {
            singleParent.attachElement(created, object.attachment);
        }
        return created;
    }

    getElement(singleParam = { element: '', attributes: {} }, singleParent) {
        var element;
        //if params is a HTML String
        if (typeof singleParam == 'string') {
            element = this.createFromHTML(singleParam, singleParent);
        }
        else if (this.isElement(singleParam)) {
            element = singleParam;
            if (this.isset(singleParent)) singleParent.attachElement(element, singleParam.attachment);
        }
        //if params is object
        else if (singleParam.constructor == Object) {
            if (singleParam.perceptorElement) {
                element = this.createPerceptorElement(singleParam, singleParent);
            }
            else {
                element = this.createFromObject(singleParam, singleParent);
            }
        }

        if (this.isset(element.setKey) && !this.isset(element.dataset.domKey)) {
            element.setKey();
        }

        if (this.isset(singleParam.list)) {
            let list = element.makeElement({ element: 'datalist', options: singleParam.list });
            element.setAttribute('list', element.dataset.domKey);
            list.setAttribute('id', element.dataset.domKey);
        }

        if (this.isset(singleParam.state)) {
            let owner = element.getParents(singleParam.state.owner, singleParam.state.value);
            if (!this.isnull(owner)) {
                owner.addState({ name: singleParam.state.name, state: element });
                element.dataset.stateStatus = 'set';
            } else {
                element.dataset.stateStatus = 'pending';
            }
        }

        return element;
    };

    createElement(params = { element: '', attributes: {} }, parent) {
        if (Array.isArray(params)) {
            let elements = [];
            for (let param of params) {
                elements.push(this.getElement(param, parent));
            }
            return elements;
        } else {
            let element = this.getElement(params, parent);
            return element;
        }
    }

    validateFormTextarea(element) {
        if (element.value == '') {
            return false;
        }
        return true;
    }

    validateFormInput(element) {
        var type = element.getAttribute('type');
        var value = element.value;

        if (this.isnull(type)) {
            return !this.isSpaceString(value);
        }

        type = type.toLowerCase();
        if (type == 'file') {
            return value != '';
        }
        else if (type == 'text') {
            return !this.isSpaceString(value);
        }
        else if (type == 'date') {
            if (this.hasString(element.className, 'future')) {
                return this.isDate(value);
            } else {
                return this.isDateValid(value);
            }
        }
        else if (type == 'email') {
            return this.isEmail(value);
        }
        else if (type == 'number') {
            return this.isNumber(value);
        }
        else if (type == 'password') {
            return this.isPasswordValid(value);
        }
        else {
            return !this.isSpaceString(value);
        }
    }

    validateFormSelect(element) {
        if (element.value == 0 || element.value.toLowerCase() == 'null') {
            return false;
        }

        return true;
    }

    validateForm(form, options) {
        options = options || {};
        options.nodeNames = options.nodeNames || 'INPUT, SELECT, TEXTAREA';
        let flag = true,
            nodeName,
            elementName,
            elements = form.findAll(options.nodeNames);

        let validateMe = me => {
            let value;
            if (nodeName == 'INPUT') {
                value = this.validateFormInput(me);
            }
            else if (nodeName == 'SELECT') {
                value = this.validateFormSelect(me);
            }
            else if (nodeName == 'TEXTAREA') {
                value = this.validateFormTextarea(me);
            }
            else {
                value = this.validateOtherElements(me);
            }

            return value;
        }

        for (let i = 0; i < elements.length; i++) {
            nodeName = elements[i].nodeName;
            elementName = elements[i].getAttribute('name');

            if (elements[i].getAttribute('ignore') == 'true') {
                continue;
            }

            if (this.isset(options.names)) {
                if (options.names.includes(elementName)) {
                    flag = validateMe(elements[i]);
                }
                else {
                    continue;
                }
            }
            else {
                flag = validateMe(elements[i]);
            }

            if (!flag) {
                break;
            }
        }

        return { flag, elementName };
    }

    validateOtherElements(element) {
        let value = false;
        if (this.isset(element.value) && element.value != '') value = true;
        return value;
    }

    ValidateFormImages(form) {
        return (type == 'file' && !self.isImageValid(value));
    }

    isImageValid(input) {
        var ext = input.substring(input.lastIndexOf('.') + 1).toLowerCase();
        if (ext == "png" || ext == "gif" || ext == "jpeg" || ext == "jpg") {
            return true;
        } else {
            return false;
        }
    }

    imageToJson(file, callBack = () => { }) {
        let fileReader = new FileReader();
        let myfile = {};
        fileReader.onload = (event) => {
            myfile.src = event.target.result;
            callBack(myfile);
        };

        myfile.size = file.size;
        myfile.type = file.type;
        fileReader.readAsDataURL(file);
    }
}

module.exports = JSElements;
},{"./Period":11}],9:[function(require,module,exports){
const Func = require('./Func');
let func = new Func()

class Matrix {
    constructor(params = { rows: 2, cols: 2, contents: [] }) {
        Object.keys(params).map(key => {
            this[key] = params[key];
        });

        this.rows = this.rows || 2;
        this.cols = this.cols || 2;
        this.contents = this.contents || [];
        this.setData(this.contents);
    }

    setData(contents = []) {
        this.contents = contents;
        this.data = [];
        for (let i = 0; i < this.rows; i++) {
            this.data[i] = [];
            for (let j = 0; j < this.rows; j++) {
                this.data[i][j] = contents.shift();
            }
        }
    }

    get structure() {
        let { rows, cols } = this;
        return { rows, cols };
    }

    add(n = 0) {
        if (n instanceof Matrix) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] += n.data[i][j];
                }
            }
        } else if (n instanceof Array) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] += n[i][j];
                }
            }
        }
        else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] += n;
                }
            }
        }
    }

    subtract(n = 0) {
        if (n instanceof Matrix) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] -= n.data[i][j];
                }
            }
        } else if (n instanceof Array) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] -= n[i][j];
                }
            }
        }
        else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] -= n;
                }
            }
        }
    }

    multiply(n = 1) {
        if (n instanceof Matrix) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < n.cols; j++) {
                    this.data[i][j] *= n.data[i][j];
                }
            }
        } else if (n instanceof Array) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] *= n[i][j];
                }
            }
        }
        else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] *= n;
                }
            }
        }
    }

    randomize() {
        this.map(value => {
            return func.random();
        });
    }

    transpose() {
        let newMatrix = new Matrix({ rows: this.cols, cols: this.rows });
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                newMatrix.data[j][i] = this.data[i][j];
            }
        }
        Object.keys(newMatrix).map(key => {
            this[key] = newMatrix[key];
        });
    }

    map(callback = (value, ...pos) => { }) {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                let value = this.data[i][j];
                this.data[i][j] = callback(value, i, j);
            }
        }
    }

    print() {
        console.table(this.data);
    }

    say() {
        console.log(this.toArray())
    }

    toArray() {
        this.contents = []
        Matrix.map(this, value => {
            this.contents.push(value);
        });
        return this.contents;
    }

    reshape(params = { rows: 2, cols: 2 }) {
        this.toArray();
        this.rows = params.rows;
        this.cols = params.cols;
        this.setData(this.contents);
    }

    getColumns(...cols) {
        let value = [];

        for (let i in cols) {
            value.push(Array.each(this.data, row => {
                return row[cols[i]];
            }));
        }

        return value;
    }

    getRows(...rows) {
        let value = [];

        for (let r = 0; r < this.rows; r++) {
            if (rows.includes(r)) {
                value.push(this.data[r]);
            }
        }

        return value;
    }

    static toArray(matrix) {
        let array = []
        Matrix.map(matrix, value => {
            array.push(value);
        });
        return array;
    }

    static subtract(a = new Matrix(), b) {
        let contents = [], rows = a.rows, cols = a.cols;

        if (b instanceof Matrix) {
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    contents.push(a.data[i][j] - b.data[i][j]);
                }
            }
        }
        else if (b instanceof Array) {
            for (let i = 0; i < a.rows; i++) {
                for (let j = 0; j < a.cols; j++) {
                    contents.push(a.data[i][j] - b[i][j]);
                }
            }
        }
        else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    contents.push(a.data[i][j] - b);
                }
            }
        }

        return new Matrix({ rows, cols, contents });
    }

    static add(a = new Matrix(), b) {
        let contents = [], rows = a.rows, cols = a.cols;

        if (b instanceof Matrix) {
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    contents.push(a.data[i][j] + b.data[i][j]);
                }
            }
        }
        else if (b instanceof Array) {
            for (let i = 0; i < a.rows; i++) {
                for (let j = 0; j < a.cols; j++) {
                    contents.push(a.data[i][j] + b[i][j]);
                }
            }
        }
        else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    contents.push(a.data[i][j] + b);
                }
            }
        }

        return new Matrix({ rows, cols, contents });
    }

    static multiply(a = new Matrix(), b) {
        let contents = [], rows, cols;

        if (b instanceof Matrix) {

            if (a.cols !== b.rows) {
                console.log('Columns of A must equal rows of B');
                return;
            }

            rows = a.rows;
            cols = b.cols;

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    let sum = 0;
                    for (let k = 0; k < a.cols; k++) {
                        sum += a.data[i][k] * b.data[k][j];
                    }
                    contents.push(sum);
                }
            }
        }
        else if (b instanceof Array) {

            rows = a.rows;
            cols = a.cols;

            for (let i = 0; i < a.rows; i++) {
                for (let j = 0; j < a.cols; j++) {
                    contents.push(a.data[i][j] * b[i][j]);
                }
            }
        }
        else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    contents.push(a.data[i][j] * b);
                }
            }
        }

        return new Matrix({ rows, cols, contents });
    }

    static divide(a = new Matrix(), b) {
        let contents = [], rows, cols;

        if (b instanceof Matrix) {

            if (a.cols !== b.rows) {
                console.log('Columns of A must equal rows of B');
                return;
            }

            rows = a.rows;
            cols = b.cols;

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    let sum = 0;
                    for (let k = 0; k < a.cols; k++) {
                        sum += (a.data[i][k] / b.data[k][j]) || 0;
                    }
                    contents.push(sum);
                }
            }
        }
        else if (b instanceof Array) {

            rows = a.rows;
            cols = a.cols;

            for (let i = 0; i < a.rows; i++) {
                for (let j = 0; j < a.cols; j++) {
                    contents.push((a.data[i][j] / b[i][j]) || 0);
                }
            }
        }
        else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    contents.push((a.data[i][j] / b) || 0);
                }
            }
        }

        return new Matrix({ rows, cols, contents });
    }

    static randomize(matrix = new Matrix()) {
        return Matrix.map(matrix, (value => {
            return func.random();
        }));
    }

    static transpose(matrix = new Matrix()) {
        let newMatrix = new Matrix({ rows: matrix.cols, cols: matrix.rows });
        for (let i = 0; i < matrix.rows; i++) {
            for (let j = 0; j < matrix.cols; j++) {
                newMatrix.data[j][i] = matrix.data[i][j];
            }
        }
        return newMatrix;
    }

    static map(matrix = new Matrix(), callback = () => { }) {
        let newMatrix = new Matrix({ rows: matrix.rows, cols: matrix.cols });
        for (let i = 0; i < matrix.rows; i++) {
            for (let j = 0; j < matrix.cols; j++) {
                let value = matrix.data[i][j];
                newMatrix.data[i][j] = callback(value, i, j);
            }
        }
        return newMatrix;
    }

    static fromArray(contents = []) {
        return new Matrix({ rows: contents.length, cols: 1, contents });
    }

    static reshape(params = { rows: 2, cols: 2, matrix: new Matrix }) {
        params.contents = Matrix.toArray(params.matrix);
        delete params.matrix;
        return new Matrix(params);
    }

    static normalize(matrix = new Matrix()) {
        let contents = Math.normalize(Matrix.toArray(matrix));
        return new Matrix({ rows: matrix.rows, cols: matrix.cols, contents });
    }

    static diagonal(array = []) {
        let matrix = Matrix.square(array.length);
        for (let i in matrix.data) {
            for (let j in matrix.data[i]) {
                if (i == j) {
                    matrix.data[i][j] = array[i];
                }
            }
        }
        matrix.toArray();
        return matrix;
    }

    static unit(size = 2) {
        let matrix = Matrix.square(size);
        for (let i in matrix.data) {
            for (let j in matrix.data[i]) {
                if (i == j) {
                    matrix.data[i][j] = 1;
                }
            }
        }
        matrix.toArray();
        return matrix;
    }

    static square(size = 2) {
        return new Matrix({ rows: size, cols: size });
    }

    static fromMatrixCols(matrix = new Matrix(), ...cols) {
        let value = matrix.getColumns(...cols);
        let contents = Array.flatten(value);
        let newMatrix = new Matrix({ rows: value.length, cols: matrix.cols, contents });
        newMatrix.transpose();
        return newMatrix;
    }

    static deepMatrix(dimensions = [], contents = []) {
        //split the dimensions into an array of arrays of length 2
        let matrixDimensions = [];
        for (let i = 0; i < dimensions.length; i++) {
            matrixDimensions.push({ rows: dimensions[i], cols: dimensions[++i] || 1 });
        }

        let makeMatrix = (layer) => {
            let matrix = new Matrix(matrixDimensions[layer]);

            if (layer + 1 == matrixDimensions.length) {
                matrix.map(value => {
                    return contents.shift() || 0;
                });
            } else {
                matrix.map(value => {
                    return makeMatrix(layer + 1);
                });
            }
            return matrix;
        }

        return makeMatrix(0);
    }
}

module.exports = Matrix;
},{"./Func":7}],10:[function(require,module,exports){
const Func = require('./Func');
const Matrix = require('./Matrix');
const ArrayLibrary = require('./../functions/ArrayLibrary');

let func = new Func();
let arrayLibrary = ArrayLibrary();

class NeuralNetwork {
    constructor(params) {
        func.object.copy(params, this);
        this.ihWeights = new Matrix({ rows: this.hNodes, cols: this.iNodes });
        this.ihWeights.randomize();

        this.ihBias = new Matrix({ rows: this.hNodes, cols: 1 });
        this.ihBias.randomize();

        this.hoWeights = new Matrix({ rows: this.oNodes, cols: this.hNodes });
        this.hoWeights.randomize();

        this.hoBias = new Matrix({ rows: this.oNodes, cols: 1 });
        this.hoBias.randomize();

        this.lr = this.lr || 0.1;
    }

    feedFoward(inputArray = []) {
        let inputs = inputArray instanceof Matrix ? inputArray : this.prepareInputs(inputArray);

        let hiddens = Matrix.multiply(this.ihWeights, inputs);
        hiddens.add(this.ihBias);
        hiddens.map(sigmoid);

        let outputs = Matrix.multiply(this.hoWeights, hiddens);
        outputs.add(this.hoBias);
        outputs.map(sigmoid);

        return { inputs, hiddens, outputs };
    }

    queryBack(targetArray = []) {

    }

    predict(inputArray = []) {
        return this.feedFoward(inputArray).outputs;
    }

    getWeightsUpdate(inputs = new Matrix(), outputs = new Matrix(), errors = 1) {
        let gradients = Matrix.map(outputs, dSigmoid);
        gradients.multiply(errors);
        gradients.multiply(this.lr);

        let inputsTransposed = Matrix.transpose(inputs);
        let change = Matrix.multiply(gradients, inputsTransposed);

        return { change, gradients };
    }

    backpropagate(inputs = [], targets = new Matrix()) {
        let { hiddens, outputs } = this.feedFoward(inputs);

        let hoErrors = Matrix.subtract(targets, outputs);
        let hoUpdates = this.getWeightsUpdate(hiddens, outputs, hoErrors);
        this.hoWeights.add(hoUpdates.change);
        this.hoBias.add(hoUpdates.gradients);

        let hoWeightsTransposed = Matrix.transpose(this.hoWeights);
        let ihErrors = Matrix.multiply(hoWeightsTransposed, hoErrors);
        let ihUpdates = this.getWeightsUpdate(inputs, hiddens, ihErrors);
        this.ihWeights.add(ihUpdates.change);
        this.ihBias.add(ihUpdates.gradients);
    }

    train(params = { trainingData: [], period: 1, epoch: 1 }) {
        let inputArray = [], targetArray = [];
        for (let data of params.trainingData) {
            inputArray.push(data.inputs);
            targetArray.push(data.targets);
        }

        let inputs = arrayLibrary.each(inputArray, value => {
            return this.prepareInputs(value);
        });

        let targets = arrayLibrary.each(targetArray, value => {
            return this.prepareTargets(value);
        });

        let run = () => {
            for (let i = 0; i < params.period; i++) {
                for (let j in inputs) {
                    this.backpropagate(inputs[j], targets[j]);
                }
            }
        }

        if (func.isset(params.epoch)) {
            for (let p = 0; p < params.epoch; p++) {
                run();
            }
        } else {
            run();
        }
    }

    setLearningRate(lr = 0.1) {
        this.lr = lr;
    }

    prepareInputs(inputArray = []) {
        let inputs = Matrix.fromArray(Math.normalize(inputArray));
        inputs.multiply(0.99);
        inputs.add(0.01);
        return inputs;
    }

    prepareTargets(targetArray = []) {
        let targets = Matrix.fromArray(targetArray);
        targets.add(0.01);
        targets.multiply(0.99);
        return targets;
    }
}

module.exports = NeuralNetwork;
},{"./../functions/ArrayLibrary":14,"./Func":7,"./Matrix":9}],11:[function(require,module,exports){
const Func = require('./Func');

class Period extends Func {

    constructor() {
        super();
    }

    trimMonthArray() {
        let months = [];
        for (let i = 0; i < this.months.length; i++) {
            months.push(this.months[i].slice(0, 3));
        }
        return months;
    }

    getYears(count = 5) {
        let year = new Date().getYear() + 1900;
        let fetched = [];
        for (let i = 0; i < count; i++) {
            fetched.push(`${year - 1}-${year}`);
            year++;
        }
        return fetched;
    }

    isTimeValid(time) {
        time = time.split(':');
        if (time.length == 2 || time.length == 3) {
            var hour = new Number(time[0]);
            var minutes = new Number(time[1]);
            var seconds = 0;
            var total = 0;

            if (time.length == 3) {
                seconds = new Number(time[2]);
                if (hour > 23 || hour < 0 || minutes > 59 || minutes < 0 || seconds > 59 || seconds < 0) {
                    return false;
                }
            } else {
                if (hour > 23 || hour < 0 || minutes > 59 || minutes < 0) {
                    return false;
                }
            }

            var total = (hour * 60 * 60) + (minutes * 60) + seconds;
            return total;
        }
        return false;
    }

    time(time) {
        let date = (this.isset(time)) ? new Date(Math.floor(time)) : new Date();
        let hour = date.getHours().toString();
        let minutes = date.getMinutes().toString();
        let seconds = date.getSeconds().toString();

        hour = (hour.length > 1) ? hour : `0${hour}`;
        minutes = (minutes.length > 1) ? minutes : `0${minutes}`;
        seconds = (seconds.length > 1) ? seconds : `0${seconds}`;

        return `${hour}:${minutes}:${seconds}`;
    }

    date(time) {
        let date = (this.isset(time)) ? new Date(Math.floor(time)) : new Date();
        let day = date.getDate().toString();
        let month = (date.getMonth() + 1).toString();
        let year = date.getFullYear().toString();

        day = (day.length > 1) ? day : `0${day}`;
        month = (month.length > 1) ? month : `0${month}`;

        return `${year}-${month}-${day}`;
    }

    time_date(time) {
        return `${this.time(time)}, ${this.date(time)}`;
    }

    timeToday() {
        let date = new Date();
        let hour = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();

        let time = this.isTimeValid(`${hour}:${minutes}:${seconds}`);
        return time ? time : -1;
    }

    isDateValid(value) {
        if (this.isDate(value)) {
            if (this.isYearValid(value)) {
                if (this.isMonthValid(value)) {
                    if (this.isDayValid(value)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isDayValid(value) {
        var v_day = "";
        for (var i = 0; i < 2; i++) {
            v_day += value[i + 8];
        }
        var limit = 0;
        var month = this.isMonthValid(value);

        if (month == '01') {
            limit = 31;
        } else if (month == '02') {
            if (this.isLeapYear(this.isYearValid(value))) {
                limit = 29;
            } else {
                limit = 28;
            }
        } else if (month == '03') {
            limit = 31;
        } else if (month == '04') {
            limit = 30;
        } else if (month == '05') {
            limit = 31;
        } else if (month == '06') {
            limit = 30;
        } else if (month == '07') {
            limit = 31;
        } else if (month == '08') {
            limit = 31;
        } else if (month == '09') {
            limit = 30;
        } else if (month == '10') {
            limit = 31;
        } else if (month == '11') {
            limit = 30;
        } else if (month == '12') {
            limit = 31;
        }

        if (limit < v_day) {
            return 0;
        }
        return v_day;
    }

    isDate(value) {
        var len = value.length;
        if (len == 10) {
            for (var x in value) {
                if (this.isDigit(value[x])) {
                    continue;
                } else {
                    if (x == 4 || x == 7) {
                        if (value[x] == '-') {
                            continue;
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }
        } else {
            return false;
        }
        return true;
    }

    isMonthValid(value) {
        var v_month = "";
        for (var i = 0; i < 2; i++) {
            v_month += value[i + 5];
        }
        if (v_month > 12 || v_month < 1) {
            return 0;
        }
        return v_month;
    }

    isYearValid(value) {
        var year = new Date().getFullYear('Y');
        var v_year = "";
        for (var i = 0; i < 4; i++) {
            v_year += value[i + 0];
        }
        if (v_year > year) {
            return 0;
        }
        return v_year;
    }

    getYear(value) {
        var v_year = "";
        for (var i = 0; i < 4; i++) {
            v_year += value[i + 0];
        }
        return v_year;
    }

    isLeapYear(value) {
        if (value % 4 == 0) {
            if ((value % 100 == 0) && (value % 400 != 0)) {
                return false;
            }
            return true;
        }
        return false;
    }

    daysInMonth(month, year) {
        var days = 0;
        if (month == '01') {
            days = 31;
        } else if (month == '02') {
            if (this.isLeapYear(year)) {
                days = 29;
            } else {
                days = 28;
            }
        } else if (month == '03') {
            days = 31;
        } else if (month == '04') {
            days = 30;
        } else if (month == '05') {
            days = 31;
        } else if (month == '06') {
            days = 30;
        } else if (month == '07') {
            days = 31;
        } else if (month == '08') {
            days = 31;
        } else if (month == '09') {
            days = 30;
        } else if (month == '10') {
            days = 31;
        } else if (month == '11') {
            days = 30;
        } else if (month == '12') {
            days = 31;
        }
        return days;
    }

    dateValue(date) {
        var value = 0;
        var year = this.getYear(date) * 365;
        var month = 0;
        for (var i = 1; i < this.isMonthValid(date); i++) {
            month = this.daysInMonth(i, this.getYear(date)) / 1 + month / 1;
        }
        var day = this.isDayValid(date);
        value = (year / 1) + (month / 1) + (day / 1);

        return value;
    }

    today() {
        var today = new Date;
        var month = today.getMonth() / 1 + 1;
        if (month.length != 2) {
            month = '0' + month;
        }
        today = (today.getFullYear()) + '-' + month + '-' + today.getDate();
        return today;
    }

    getDateObject(value) {
        let days = Math.floor(value / this.secondsInDays(1));

        value -= this.secondsInDays(days);

        let hours = Math.floor(value / this.secondsInHours(1));
        value -= this.secondsInHours(hours);

        let minutes = Math.floor(value / this.secondsInMinutes(1));
        value -= this.secondsInMinutes(minutes);

        let seconds = value;

        return { days, hours, minutes, seconds };
    }

    dateWithToday(date) {
        var today = Math.floor(this.dateValue(this.today()));
        let dateValue = Math.floor(this.dateValue(date));

        var value = { diff: (dateValue - today), when: '' };
        if (dateValue > today) {
            value.when = 'future';
        }
        else if (dateValue == today) {
            value.when = 'today';
        }
        else {
            value.when = 'past';
        }
        return value;
    }

    dateString(date) {
        var year = new Number(this.getYear(date));
        var month = new Number(this.isMonthValid(date));
        var day = new Number(this.isDayValid(date));

        return day + ' ' + this.months[month - 1] + ', ' + year;
    }

    secondsInDays(days) {
        let value = Math.floor(days * 24 * 60 * 60);
        return value;
    }

    secondsInHours(hours) {
        return Math.floor(hours * 60 * 60);
    }

    secondsInMinutes(minutes) {
        return Math.floor(minutes * 60);
    }

    secondsTillDate(date) {
        return this.secondsInDays(Math.floor(this.dateValue(date)));
    }

    secondsTillToday() {
        return this.secondsTillDate(this.today());
    }

    secondsTillNow() {
        return this.secondsTillDate(this.today()) + this.timeToday();
    }

    secondsTillMoment(moment) {
        return this.secondsTillDate(this.date(moment)) + this.isTimeValid(this.time(moment));
    }

    log(...data) {
        let time = `[${this.time()}]:`;
        console.log(time, ...data);
    }
}

module.exports = Period;
},{"./Func":7}],12:[function(require,module,exports){
const JSElements = require('./JSElements');

class Empty {
}

class Template extends JSElements {
    constructor(theWindow = Empty) {
        super(theWindow);
        this.virtual = {};
        this.elementLibrary(theWindow.Element);
        this.htmlCollectionLibrary(theWindow.HTMLCollection);
        this.nodeLibrary(theWindow.Node);
        this.nodeListLibrary(theWindow.NodeList);
    }

    elementLibrary(Element = Empty) {
        //Framework with jsdom
        let self = this;
        Element.prototype.changeNodeName = function (name) {
            let structure = this.toJson();
            structure.element = name;
            let element = self.createElement(structure);
            return element;
        };

        Element.prototype.toJson = function () {
            let element = this.nodeName.toLowerCase();
            let attributes = this.getAttributes();
            attributes.style = this.css();
            let children = [];
            for (let i = 0; i < this.children.length; i++) {
                children.push(this.children[i].toJson());
            }
            return { element, attributes, children }
        }

        Element.prototype.setOptions = function (options = [], params = { selected: '' }) {
            params = params || {};
            if (self.isset(params.flag)) {
                this.innerHTML = '';
            }

            for (let i = 0; i < options.length; i++) {
                let text = options[i].text || options[i];
                let value = options[i].value || options[i];

                let option = this.makeElement({ element: 'option', attributes: { value }, text });

                if (value.toString().toLowerCase() == 'null') {
                    option.setAttribute('disabled', true);
                }

                if (self.isset(params.selected) && value == params.selected) {
                    option.setAttribute('selected', true);
                }
            }
        };

        Element.prototype.commonAncestor = function (elementA, elementB) {
            for (let ancestorA of elementA.parents()) {
                for (let ancestorB of elementB.parents()) {
                    if (ancestorA == ancestorB) return ancestorA;
                }
            }

            return null;
        }

        Element.prototype.onAdded = function (callback = () => { }) {
            this.addEventListener('DOMNodeInsertedIntoDocument', event => {
                callback();
            });
        }
        //Store the states of an element here
        Element.prototype.states = {};

        //This is a temporary storage for elements attributes
        Element.prototype.temp = {};

        //This listens and handles for multiple bubbled events
        Element.prototype.manyBubbledEvents = function (events, callback = () => { }) {
            events = events.split(',');
            for (let event of events) {
                this.bubbledEvent(event.trim(), callback);
            }
        }

        //This listens and handles for multiple bubbled events that did not bubble
        Element.prototype.manyNotBubbledEvents = function (events, callback = () => { }) {
            events = events.split(',');
            for (let event of events) {
                this.notBubbledEvent(event.trim(), callback);
            }
        }

        //This handles all events that are bubbled within an element and it's children
        Element.prototype.bubbledEvent = function (event, callback = () => { }) {
            //Listen for this event on the entire document
            document.addEventListener(event, event => {
                //if the event bubbles up the element fire the callback
                if (event.target == this || this.isAncestor(event.target)) {
                    callback(event);
                }
            });
        }

        //This handles all events that are not bubbled within an element and it's children
        Element.prototype.notBubbledEvent = function (event, callback = () => { }) {
            document.addEventListener(event, event => {
                if (!(event.target == this || this.isAncestor(event.target))) {
                    callback(event);
                }
            });
        }

        //Listen to multiple events at time with a single callback function
        Element.prototype.addMultipleEventListener = function (events, callback = () => { }) {
            events = events.split(',');
            for (let event of events) {
                this.addEventListener(event.trim(), e => {
                    callback(e);
                });
            }
        }

        //perform actions on mouseenter and mouseleave
        Element.prototype.hover = function (params = { css: {}, do: () => { } }) {

            let css = [];
            let cssValues;

            this.addMultipleEventListener('mouseenter', event => {
                cssValues = this.css();//store the current css values
                if (self.isset(params.css)) {//if action is to change the styling
                    css = self.array.each(Object.keys(params.css), value => {//store the new css style names to remove later
                        return self.cssStyleName(value);
                    });
                    this.css(params.css);//set the css styles
                }
                if (self.isfunction(params.do)) {// if action is to perform do
                    params.do(event);
                }
            });

            this.addMultipleEventListener('mouseleave', event => {
                if (self.isset(params.css)) {//if action was to change the styling
                    this.cssRemove(css);//remove the new styling
                    this.css(cssValues);//set the old ones
                }
            });
        };

        //a shorter name for querySelector
        Element.prototype.find = function (name = '', position = 0) {
            let element = null;
            if (self.isset(position)) {//get the all the elements found and return the one at this particular position
                this.querySelectorAll(name).forEach((e, p) => {
                    if (position == p) element = e;
                });
            }
            else {
                element = this.querySelector(name);
            }
            return element;
        };

        //a shorter name for querySelectorAll
        Element.prototype.findAll = function (name = '') {
            return this.querySelectorAll(name);
        }

        //perform an extended querySelection on this element
        Element.prototype.search = function (name = '', options = { attributes: {}, id: '', nodeName: '', class: '', classes: '' }, position = 0) {
            let element = null;
            let foundElements = [];//all the elements meeting the requirements

            if (self.isset(options)) {//if the options to check is set
                let allElements = this.querySelectorAll(name);//get all the possible elements

                //loop through them and check if the match the options
                for (let i = 0; i < allElements.length; i++) {
                    element = allElements[i];

                    //check for the attributes
                    if (self.isset(options.attributes)) {
                        for (let attr in options.attributes) {
                            // check all the attributes one after the other
                            if (element.getAttribute(attr) != options.attributes[attr]) {
                                element = null;
                                continue;
                            }
                        }
                        //if this element is no long valid skip it
                        if (self.isnull(element)) continue;
                    }

                    //check for the ID
                    if (self.isset(options.id) && options.id != element.id) {
                        element = null;
                        continue;
                    }

                    //check for the class
                    if (self.isset(options.class) && !element.classList.contains(options.class)) {
                        element = null;
                        continue;
                    }

                    //check for the classes
                    if (self.isset(options.classes) && !element.hasClasses(options.classes)) {
                        element = null;
                        continue;
                    }

                    //check for the nodename
                    if (self.isset(options.nodeName) && element.nodeName.toLowerCase() != options.nodeName) {
                        element = null;
                        continue;
                    }

                    //check if to return for a particular position
                    if (position <= 0) return element;
                    foundElements.push(element);
                }
                //get the element at the specified position
                if (foundElements.length && self.isset(foundElements[position])) {
                    element = foundElements[position];
                }
                else {
                    element = null;
                }
            }
            else {
                element = this.find(name);
            }

            return element;
        };

        //perform search for all the elements that meet a requirement
        Element.prototype.searchAll = function (name = '', options = { attributes: {}, id: '', nodeName: '', class: '', classes: '' }) {
            if (self.isset(options)) {
                let allElements = this.querySelectorAll(name);
                let elements = [];
                for (let i = 0; i < allElements.length; i++) {
                    let element = allElements[i];
                    if (self.isset(options.attributes)) {
                        for (let attr in options.attributes) {
                            if (element.getAttribute(attr) != options.attributes[attr]) {
                                element = null;
                                continue;
                            }
                        }
                    }

                    if (self.isset(options.id) && options.id != element.id) {
                        element = null;
                        continue;
                    }

                    if (self.isset(options.class) && !element.classList.contains(options.class)) {
                        element = null;
                        continue;
                    }

                    if (self.isset(options.classes) && !element.hasClasses(options.classes)) {
                        element = null;
                        continue;
                    }

                    if (self.isset(options.nodeName) && element.nodeName.toLowerCase() != options.nodeName) {
                        element = null;
                        continue;
                    }

                    if (!self.isnull(element)) {
                        elements.push(element);
                    }
                }
                return elements;
            }
            return this.querySelectorAll(name);
        }

        //look for multiple single elements at a time
        Element.prototype.fetch = function (names = [], position = 0) {
            let elements = {};
            for (let name of names) {
                elements[name] = this.find(name, position);
            }

            return elements;
        }

        //look for multiple nodelists at a time
        Element.prototype.fetchAll = function (names = []) {
            let elements = {};
            for (let name of names) {
                elements[name] = this.findAll(name);
            }

            return elements;
        }

        //Get the nodes between two child elements
        Element.prototype.nodesBetween = function (elementA, elementB) {
            let inBetweenNodes = [];
            for (let child of Array.from(this.children)) {//get all the children
                //check if the two elements are children of this element
                if (child == elementA || child == elementB || child.isAncestor(elementA) || child.isAncestor(elementB)) {
                    inBetweenNodes.push(child);
                }
            }

            return inBetweenNodes;
        }

        //Get if element is child of an element
        Element.prototype.isAncestor = function (child) {
            let parents = child.parents();//Get all the parents of child
            return parents.includes(this);
        };

        //Get all the parents of an element until document
        Element.prototype.parents = function () {
            let parents = [];
            let currentParent = this.parentNode;
            while (currentParent != null) {
                parents.push(currentParent);
                currentParent = currentParent.parentNode;
            }

            return parents;
        };

        Element.prototype.customParents = function () {
            let parents = this.parents();
            let customParents = [];
            for (let i = 0; i < parents.length; i++) {
                if (parents[i].nodeName.includes('-')) {
                    customParents.push(parents[i]);
                }
            }
            return customParents;
        }

        //Remove a state from an element
        Element.prototype.removeState = function (params = { name: '' }) {
            let state = this.getState(params);//get the state (element)
            if (self.isset(state) && self.isset(params.force)) {//if state exists and should be deleted
                if (self.isset(state.dataset.domKey)) {
                    delete self.virtual[state.dataset.domKey];//delete the element from virtual dom
                }
                state.remove();//remove the element from dom
            }
            this.removeAttribute(`data-${params.name}`);//remove the state from element
        }

        //Get an element's state 
        Element.prototype.getState = function (params = { name: '' }) {
            let state = null;
            let stateName;

            //get the state name
            if (typeof params == 'string') {
                stateName = params;
            }
            else if (self.isset(this.dataset[`${params.name}`])) {
                stateName = params.name;
            }

            if (self.isset(stateName)) {//get the state
                state = self.virtual[this.dataset[stateName]];
                // let state = self.objectToArray(this.states[stateName]).pop();
            }

            return state;
        };

        //add a state to an element
        Element.prototype.addState = function (params = { name: '' }) {
            //make sure the state has a domkey
            if (!self.isset(params.state.dataset.domKey)) {
                params.state.setKey();
            }

            //add the state to the elements dataset
            this.dataset[params.name] = params.state.dataset.domKey;
            this.states[params.name] = {}//initialize the state
            return this;
        };

        //set the state of an element
        Element.prototype.setState = function (params = { name: '', attributes: {}, render: {}, children: [], text: '', html: '', value: '', options: [] }) {
            let state = this.getState(params);

            // let found = this.states[params.name][JSON.stringify(params)];
            // if (self.isset(found)) {
            //     state.innerHTML = found.innerHTML;
            //     state.setAttributes(found.getAttributes());
            // }
            // else {
            //     state.setAttributes(params.attributes);
            //     if (self.isset(params.children)) {//add the children if set
            //         state.makeElement(params.children);
            //     }
            //     if (self.isset(params.render)) {//add the children if set
            //         state.render(params.render);
            //     }
            //     if (self.isset(params.text)) state.textContent = params.text;//set the innerText
            //     if (self.isset(params.value)) state.value = params.value;//set the value
            //     if (self.isset(params.options)) {//add options if isset
            //         for (var i of params.options) {
            //             state.makeElement({ element: 'option', value: i, text: i, attachment: 'append' });
            //         }
            //     }

            //     this.states[params.name][JSON.stringify(params)] = state.cloneNode(true);
            // }

            state.setAttributes(params.attributes);
            if (self.isset(params.children)) {//add the children if set
                state.makeElement(params.children);
            }
            if (self.isset(params.render)) {//add the children if set
                state.render(params.render);
            }
            if (self.isset(params.text)) state.textContent = params.text;//set the innerText
            if (self.isset(params.html)) state.innerHTML = params.html;//set the innerText
            if (self.isset(params.value)) state.value = params.value;//set the value
            if (self.isset(params.options)) {//add options if isset
                for (var i of params.options) {
                    state.makeElement({ element: 'option', value: i, text: i, attachment: 'append' });
                }
            }

            this.states[params.name][JSON.stringify(params)] = state.cloneNode(true);

            return state;
        };

        //async version of setstate
        Element.prototype.setKeyAsync = async function () {
            return await this.setKey();
        };

        //set element's dom key for the virtual dom
        Element.prototype.setKey = function () {
            let key = Date.now().toString(36) + Math.random().toString(36).slice(2);//generate the key
            if (!self.isset(this.dataset.domKey)) {//does this element have a key
                this.dataset.domKey = key;
            } else {
                key = this.dataset.domKey;
            }
            self.virtual[key] = this;//add it to the virtual dom
            return key;
        };

        //drop down a child
        Element.prototype.dropDown = function (element) {
            let parentContent = this.cloneNode(true);
            this.innerHTML = '';
            this.append(parentContent);
            parentContent.css({ boxShadow: '1px 1px 1px 1px #aaaaaa' });
            this.css({ boxShadow: '0.5px 0.5px 0.5px 0.5px #cccccc' });

            let dropContainer = this.makeElement({
                element: 'div', attributes: { class: 'drop-down' }
            });
            dropContainer.append(element);

            this.removeDropDown = () => {
                dropContainer.remove();
                parentContent.css({ boxShadow: 'unset' });
                this.innerHTML = parentContent.innerHTML;
            }

            return this;
        };

        //stop monitoring this element for changes
        Element.prototype.stopMonitor = function () {
            if (this.observe) this.observer.disconnect();//disconnect observer
            return this;
        }

        //Check if an attribute has changed in this element
        Element.prototype.onAttributeChange = function (attribute = '', callback = () => { }) {
            this.addEventListener('attributesChanged', event => {
                if (event.detail.attributeName == attribute) {
                    callback(event);
                }
            });
        }

        // monitor this element for changes
        Element.prototype.monitor = function (config = { attributes: true, childList: true, subtree: true }) {
            this.observer = new MutationObserver((mutationList, observer) => {
                if (mutationList.length) this.dispatchEvent(new CustomEvent('mutated'));//fire mutated event for it
                for (let mutation of mutationList) {
                    if (mutation.type == 'childList') {//if the change was a child fire childlistchanged event
                        this.dispatchEvent(new CustomEvent('childListchanged', { detail: mutation }));
                    }
                    else if (mutation.type == 'attributes') {//if the change was a child fire childlistchanged event
                        this.dispatchEvent(new CustomEvent('attributesChanged', { detail: mutation }));
                    }
                    else if (mutation.type == 'characterData') {//if the change was a child fire childlistchanged event
                        this.dispatchEvent(new CustomEvent('characterDataChanged', { detail: mutation }));
                    }
                }
            });

            this.observer.observe(this, config);
            return this;
        }

        Element.prototype['checkChanges'] = function (callback = () => { }) {
            this.monitor();
            this.addEventListener('mutated', event => {
                callback(event);
            });
        };

        // check when the value of an element is changed
        Element.prototype.onChanged = function (callBack = () => { }) {
            let value = this.getAttribute('value');
            let updateMe = (event) => {
                // if element is input element
                if (event.target.nodeName == 'INPUT') {
                    if (event.target.type == 'date') {// if the type is date, check if the date is valid then update the attribute
                        if (this.isDate(this.value)) this.setAttribute('value', this.value);
                    }
                    else if (event.target.type == 'time') {// if the type is time, check if the time is valid then update the attribute
                        if (this.isTimeValid(this.value)) this.setAttribute('value', this.value);
                    }
                    else if (event.target.type == 'file') {
                        let fileName = event.target.value;
                        let file = event.target.files[0];
                        if (file.type.indexOf('image') == 0) {
                            self.imageToJson(file, callBack);
                        }
                    }
                    else {
                        this.setAttribute('value', this.value);//update the attribute
                    }
                }
                else if (event.target.nodeName == 'SELECT') {// if the element is select
                    for (let i = 0; i < event.target.options.length; i++) {//update the selected option using the selected index
                        if (i == event.target.selectedIndex) {
                            event.target.options[i].setAttribute('selected', true);
                        } else {
                            event.target.options[i].removeAttribute('selected');
                        }
                    }
                }
                else if (event.target.nodeName == 'DATA-ELEMENT') {
                    this.setAttribute('value', this.value);
                }
                else if (event.target.nodeName == 'SELECT-ELEMENT') {
                    this.setAttribute('value', this.value);
                }
                else {
                    this.value = this.textContent;
                }

                if (self.isset(callBack) && event.target.type != 'file') {
                    callBack(this.value, event);//fire the callback function
                }
            };

            // if change is caused by keyboard
            this.addEventListener('keyup', (event) => {
                updateMe(event);
            });

            // if change is caused programatically
            this.addEventListener('change', (event) => {
                updateMe(event);
            });
        };

        //render the contents of an element
        Element.prototype.render = function (params = { element: '', attributes: {} }, except) {
            if (self.isset(except)) this.removeChildren(except);//remove the contents of the element with exceptions
            else this.removeChildren();
            this.makeElement(params);//append the new contents of the element
        }

        //Get all the styles for the ID, the classes and the element
        Element.prototype.getAllCssProperties = function () {
            let styleSheets = Array.from(document.styleSheets),//get all the css styles files and rules
                cssRules,
                id = this.id,
                nodeName = this.nodeName,
                classList = Array.from(this.classList),
                properties = {},
                selectorText;

            for (var i in classList) classList[i] = `.${classList[i]}`;//turn each class to css class format [.class]

            for (var i = 0; i < styleSheets.length; i++) {//loop through all the css rules in document/app
                cssRules = styleSheets[i].cssRules;
                for (var j = 0; j < cssRules.length; j++) {
                    selectorText = cssRules[j].selectorText; //for each selector text check if element has it as a css property
                    if (selectorText == `#${id}` || selectorText == nodeName || classList.indexOf(selectorText) != -1) {
                        properties[selectorText] = {};
                        let style = cssRules[j].style;
                        for (let n in style) {
                            if (style[n] !== '') [
                                properties[selectorText][n] = style[n]
                            ]
                        }
                    }
                }
            }

            //if element has property add it to css property
            properties['style'] = this.css();
            return properties;
        }

        //Get the values of property 
        Element.prototype.getCssProperties = function (property = '') {
            let allProperties = this.getAllCssProperties();
            let properties = {};
            for (let name in allProperties) {
                properties[name] = {};
                for (let p in allProperties[name]) {
                    if (property == p) properties[name][p] = allProperties[name][p];
                }
            }

            return properties;
        }

        // Check if this element has this property
        Element.prototype.hasCssProperty = function (property = '') {
            var properties = this.getCssProperties(property); //get elements css properties
            for (var i in properties) {//loop through json object
                if (self.isset(properties[i]) && properties[i] != '') {
                    return true;// if property is found return true
                }
            }
            return false;
        }

        //Get the most relavant value for the property
        Element.prototype.cssPropertyValue = function (property = '') {
            //check for the value of a property of an element
            var properties = this.getCssProperties(property),
                id = this.id,
                classList = Array.from(this.classList);

            if (self.isset(properties['style']) && properties['style'] != '') return properties['style'];//check if style rule has the propert and return it's value
            if (self.isset(id) && self.isset(properties[`#${id}`]) && properties[`#${id}`] != '') return properties[`#${id}`];//check if element id rule has the propert and return it's value
            for (var i of classList) {//check if any class rule has the propert and return it's value
                if (self.isset(properties[`.${i}`]) && properties[`.${i}`] != '') return properties[`.${i}`];
            }
            //check if node rule has the propert and return it's value
            if (self.isset(properties[this.nodeName]) && properties[this.nodeName] != '') return properties[this.nodeName];
            return '';
        }

        // Get and Set the css values
        Element.prototype.css = function (styles = {}) {
            // set css style of element using json
            if (self.isset(styles)) {
                Object.keys(styles).map((key) => {
                    this.style[key] = styles[key];
                });
            }

            return self.extractCSS(this);
        }

        // Remove a css property
        Element.prototype.cssRemove = function (styles = []) {
            //remove a group of properties from elements style
            if (Array.isArray(styles)) {
                for (var i of styles) {
                    this.style.removeProperty(i);
                }
            }
            else {
                this.style.removeProperty(styles);
            }
            return this.css();
        }

        // Toggle a child element
        Element.prototype.toggleChild = function (child) {
            //Add child if element does not have a child else remove the child form the element
            var name, _classes, id, found = false;
            console.log(child);

            this.children.forEach(node => {
                name = node.nodeName;
                _classes = node.classList;
                id = node.id;
                if (name == child.nodeName && id == child.id && _classes.toString() == child.classList.toString()) {
                    node.remove();
                    found = true;
                }
            });
            if (!found) this.append(child);
        }

        //remove all classes except some
        Element.prototype.clearClasses = function (except = '') {
            except = except.split(',');
            for (let j in except) {
                except[j] = except[j].trim();
            }
            for (let i of this.classList) {
                if (self.isset(except) && except.includes(i)) continue;
                this.classList.remove(i);
            }
        };

        //remove classes
        Element.prototype.removeClasses = function (classes = '') {
            classes = classes.split(',');
            for (let i of classes) {
                i = i.trim();
                if (i != '') {
                    this.classList.remove(i);
                }
            }
        };

        //add classes
        Element.prototype.addClasses = function (classes = '') {
            classes = classes.split(',');
            for (let i of classes) {
                i = i.trim();
                if (i != '') {
                    this.classList.add(i);
                }
            }
        };

        //toggle classes
        Element.prototype.toggleClasses = function (classes = '') {
            classes = classes.split(',');
            for (let i of classes) {
                i = i.trim();
                if (i != '') {
                    this.classList.toggle(i);
                }
            }
        };

        // Remove a class from element classlist
        Element.prototype.removeClass = function (_class = '') {
            this.classList.remove(_class);
            return this;
        }

        // Check if element classlist contains a group of classes
        Element.prototype.hasClasses = function (classList = []) {
            for (let mClass of classList) {
                if (!this.classList.contains(mClass)) return false;
            }
            return true;
        }

        // add a class to element classlist
        Element.prototype.addClass = function (_class = '') {
            this.classList.add(_class);
            return this;
        }

        // toggle a class in element classlist
        Element.prototype.toggleClass = function (_class = '') {
            // (this.classList.contains(_class)) ? this.classList.remove(_class) : this.classList.add(_class);
            this.classList.toggle(_class);
            return this;
        }

        //Get the position of element in dom
        Element.prototype.position = function (params = {}) {
            if (self.isset(params)) {
                Object.keys(params).map(key => {
                    params[key] = (new String(params[key]).slice(params[key].length - 2) == 'px') ? params[key] : `${params[key]}px`;
                });
                this.css(params);
            }
            let position = this.getBoundingClientRect();

            return position;
        }

        //check if element is within container
        Element.prototype.inView = function (parentIdentifier = '') {
            let parent = this.getParents(parentIdentifier);
            let top = this.position().top;
            let flag = false;

            if (!self.isnull(parent)) {
                flag = top >= 0 && top <= parent.clientHeight;
            }
            return flag;
        }

        //Check if a class exists in element's classlist
        Element.prototype.hasClass = function (_class = '') {
            return this.classList.contains(_class);
        }

        // Set a list of properties for an element
        Element.prototype.setProperties = function (properties = {}) {
            for (let i in properties) {
                this[i] = properties[i];
            }
        };

        // Set a list of attributes for an element
        Element.prototype.setAttributes = function (attributes = {}) {
            for (let i in attributes) {
                if (i == 'style') {
                    this.css(attributes[i]);
                }
                else {
                    this.setAttribute(i, attributes[i]);
                }
            }
        };

        // Get the values of a list of attributes
        Element.prototype.getAttributes = function (names = []) {
            if (names.length == 0) names = this.getAttributeNames();
            let attributes = {};

            for (let name of names) {
                attributes[name] = this.getAttribute(name);
            }
            return attributes;
        }

        //Create and attatch an element in an element
        Element.prototype.makeElement = function (params = { element: '', attributes: {} }) {
            this.setKeyAsync();

            let element = self.createElement(params, this);
            return element;
        }

        // Get an elements ancestor with a specific attribute
        Element.prototype.getParents = function (name = '', value = '') {
            var attribute = name.slice(0, 1);
            var parent = this.parentNode;
            if (attribute == '.') {
                while (parent) {
                    if (self.isset(parent.classList) && parent.classList.contains(name.slice(1))) {
                        break;
                    }
                    parent = parent.parentNode;
                }
            }
            else if (attribute == '#') {
                while (parent) {
                    if (self.isset(parent.id) && parent.id == name.slice(1)) {
                        break;
                    }
                    parent = parent.parentNode;
                }
            }
            else {
                while (parent) {
                    if (self.isset(parent.nodeName) && parent.nodeName.toLowerCase() == name.toLowerCase()) {
                        break;
                    }
                    else if (self.isset(parent.hasAttribute) && parent.hasAttribute(name)) {
                        if (self.isset(value) && parent.getAttribute(name) == value) {
                            break;
                        }
                        else break;
                    }
                    parent = parent.parentNode;
                }
            }
            return parent;
        }

        // Toggle the display of an element
        Element.prototype.toggle = function () {
            if (this.style.display == 'none' || this.style.visibility == 'hidden') this.show();
            else this.hide();
        }

        //Hide an element in dom
        Element.prototype.hide = function () {
            // if (self.isset(this.style.display)) this.temp.display = this.style.display;
            // if (self.isset(this.style.visibility)) this.temp.visibility = this.style.visibility;

            this.style.display = 'none';
            // this.style.visibility = 'hidden';
            return this;
        }

        //Show an element in dom
        Element.prototype.show = function () {
            // if (this.style.display == 'none') {
            //     // if (self.isset(this.temp.display)) {
            //     //     this.css({ display: this.temp.display });
            //     // }
            //     // else this.cssRemove(['display']);
            // }
            this.cssRemove(['display']);
            return this;
        }

        //Remove all the children of an element with exceptions of some
        Element.prototype.removeChildren = function (params = { except: [] }) {
            let exceptions = [];
            params = params || {};
            params.except = params.except || [];
            let except = params.except;
            for (let i = 0; i < except.length; i++) {
                let all = this.findAll(except[i]);
                for (let j = 0; j < all.length; j++) {
                    if (!exceptions.includes(all[j])) exceptions.push(all[j]);
                }
            }

            this.children.forEach(node => {
                if (!exceptions.includes(node)) node.remove();
            });

            return this;
        }

        //Delete an element from the dom and virtual dom
        Element.prototype.delete = function () {
            if (self.isset(this.dataset.domKey)) {
                delete self.virtual[this.dataset.domKey];
            }
            this.remove();
        }

        //Delete an elements child from the dom and the virtual dom
        Element.prototype.deleteChild = function (child) {
            child.delete();
            return this;
        }

        // Toggle a list of children of an element
        Element.prototype.toggleChildren = function (params = { name: '', class: '', id: '' }) {
            Array.from(this.children).forEach(node => {
                if (!((self.isset(params.name) && params.name == node.nodeName) || self.isset(params.class) && self.hasArrayElement(Array.from(node.classList), params.class.split(' ')) || (self.isset(params.id) && params.id == node.id))) {
                    node.toggle();

                } else {
                    node.toggle();
                }
            });
        }

        // Attatch an element to another element [append or prepend]
        Element.prototype.attachElement = function (element, attachment = 'append') {
            this[attachment](element);
        }

        Element.prototype.pressed = function (callback = () => { }) {
            let startTime = 0, endTime = 0;
            this.addMultipleEventListener('mousedown, touchstart', event => {
                startTime = event.timeStamp;
            });

            this.addMultipleEventListener('mouseup, touchend', event => {
                endTime = event.timeStamp;
                event.duration = endTime - startTime;

                callback(event);
            });
        }
    }

    htmlCollectionLibrary(HTMLCollection = Empty) {
        let self = this;

        HTMLCollection.prototype.popIndex = function (position = 0) {
            let collection = self.createElement({ element: 'sample' }).children;

            let list = Array.from(this);

            for (let i = 0; i < list.length; i++) {
                if (i == position) continue;
                collection[i] = this.item(i);
                console.log(collection);

            }

            return collection;
        }

        HTMLCollection.prototype.forEach = function (callback = () => { }) {
            let list = Array.from(this);
            for (let i = 0; i < list.length; i++) {
                callback(list[i], i)
            }
        };

        HTMLCollection.prototype.each = function (callback = () => { }) {
            let list = Array.from(this);
            for (let i = 0; i < list.length; i++) {
                callback(list[i], i)
            }
        }


        HTMLCollection.prototype['indexOf'] = function (element) {
            let list = Array.from(this);
            for (let i in list) {
                if (list == element) return i;
            }
            return -1;
        };

        HTMLCollection.prototype['includes'] = function (element) {
            return this.indexOf(element) != -1;
        };

        HTMLCollection.prototype['nodesBetween'] = function (elementA, elementB) {
            let inBetweenNodes = [];
            let list = Array.from(this);

            for (let aParent of list) {
                if (aParent == elementA || aParent == elementB || aParent.isAncestor(elementA) || aParent.isAncestor(elementB)) {
                    inBetweenNodes.push(aParent);
                }
            }

            return inBetweenNodes;
        };
    }

    nodeLibrary(Node = Empty) {
        let self = this;

        Node.prototype.states = {};
    }

    nodeListLibrary(NodeList = Empty) {
        let self = this;

        NodeList.prototype['each'] = function (callback = () => { }) {
            for (let i = 0; i < this.length; i++) {
                callback(this[i], i)
            }
        }

        NodeList.prototype['indexOf'] = function (element) {
            for (let i in this) {
                if (this[i] == element) return i;
            }
            return -1;
        };

        NodeList.prototype['includes'] = function (element) {
            return this.indexOf(element) != -1;
        };

        NodeList.prototype['nodesBetween'] = function (elementA, elementB) {
            let inBetweenNodes = [];
            for (let aParent of this) {
                if (aParent == elementA || aParent == elementB || aParent.isAncestor(elementA) || aParent.isAncestor(elementB)) {
                    inBetweenNodes.push(aParent);
                }
            }

            return inBetweenNodes;
        };
    }
}

module.exports = Template;
},{"./JSElements":8}],13:[function(require,module,exports){
const MathsLibrary = require('./MathsLibrary');
const ObjectsLibrary = require('./ObjectsLibrary');

let mathLibrary = MathsLibrary();
let objectLibrary = ObjectsLibrary();

function AnalysisLibrary() {
    let self = {};

    self.entropy = (data) => {
        let entropy = 0;//initialize entropy
        let values = Object.values(data);//get the values of the object variable
        let sum = mathLibrary.sum(values);//get the sum of the Values
        for (let value of values) {
            entropy -= value / sum * Math.log2(value / sum); //use the formular on each item
        }
        return entropy;
    }

    self.informationGain = (targetNode, variableData) => {
        let arrangeData = (list) => {//arrange the list into an object of counts
            let data = {};
            for (let item of list) {
                data[item] = data[item] || 0;
                data[item]++;
            }

            return data;
        };

        let targetData = arrangeData(targetNode);

        let targetEntropy = self.entropy(targetData);//get the entropy of the target node
        let sumOfInformation = 0;//initialize sum of information gain

        let variableValues = Object.values(variableData);//get the values of this variable
        let variableLength = 0;

        for (let i = 0; i < variableValues.length; i++) {//get the length of the variable by the adding the values
            variableLength += variableValues[i].length;
            variableValues[i] = arrangeData(variableValues[i]);
        }

        for (let v of variableValues) {//get the entropy of each and multiply by the probability
            sumOfInformation += (mathLibrary.sum(Object.values(v)) / variableLength) * self.entropy(v);
        }

        let informationGain = targetEntropy - sumOfInformation;
        return informationGain;
    }

    self.highestInformationGainNode = (data, nodes) => {
        let gainedInformation = {};

        for (let i in nodes) {
            gainedInformation[i] = self.informationGain(data, nodes[i]);
        }

        return objectLibrary.max(gainedInformation);
    }

    self.quartileRange = (data) => {

        let middle = (_dt) => {//get the middle position of a list of numbers
            let middle;
            if ((_dt.length) % 2 == 0) {//if the list count is not even
                middle = [Math.ceil(_dt.length / 2) - 1, Math.ceil(_dt.length / 2)];//get the two in the middle
            }
            else {
                middle = [Math.ceil(_dt.length / 2) - 1];
            }

            return middle;
        }

        let getMiddle = (_dt) => {// get the items in the middle of a list
            let [middle1, middle2] = middle(_dt);
            let middles = [];
            middles.push(_dt[middle1]);
            if (middle2 != undefined) middles.push(_dt[middle2]);

            return middles;
        }

        let halfs = (_dt) => {//divide a list into two equal halfs
            let [middle1, middle2] = middle(_dt);
            if (middle2 == undefined) middle2 = middle1;
            let half1 = _dt.slice(0, middle1);
            let half2 = _dt.slice(middle2 + 1);
            return [half1, half2];
        }

        let layers = halfs(data);//get the halfs of the list
        let [layer1, layer2] = halfs(layers[0]);//divide each half into halfs
        let [layer3, layer4] = halfs(layers[1]);

        let middle1 = getMiddle(layers[0]);//get the middle of the first layers
        let middle3 = getMiddle(layers[1]);

        let q1 = mathLibrary.median(middle1);//get the median of the first and last layers
        let q3 = mathLibrary.median(middle3);

        return q3 - q1;//find the range
    }

    self.normalizeData = (data) => {
        data.sort((a, b) => { return a - b });
        var max = data[data.length - 1];
        var min = data[0];
        var normalized = [];
        for (var i = 0; i < data.length; i++) {
            normalized.push((data[i] - min) / (max - min));
        }
        return normalized;
    }

    return self;
}

module.exports = AnalysisLibrary;
},{"./MathsLibrary":16,"./ObjectsLibrary":17}],14:[function(require,module,exports){
function ArrayLibrary() {
    let self = {};

    self.combine = (haystack, first, second, pos) => {//used to get what is between two items at a particular occurrance in an Array and the items combined
        pos = pos || 0;//initialize position if not set
        let at1 = pos,
            at2 = first === second ? pos + 1 : pos; //check if it is the same and change position
        let start = self.indexAt(haystack, first, at1);//get the start
        let end = self.indexAt(haystack, second, at2) + 1;//get the end

        if (start == -1 || end == 0) {//null if one is not found
            return null;
        }

        return haystack.slice(start, end);
    }

    self.inBetween = (haystack, first, second, pos) => {//used to get what is between two items at a particular occurrance in an Array
        pos = pos || 0;//initialize position if not set
        let at1 = pos,
            at2 = first === second ? pos + 1 : pos; //check if it is the same and change position
        let start = self.indexAt(haystack, first, at1) + 1;//get the start
        let end = self.indexAt(haystack, second, at2);//get the end

        if (start == 0 || end == -1) {//null if one is not found
            return null;
        }

        return haystack.slice(start, end);
    }

    self.contains = (haystack, needle) => {//used to check if an Array has an item
        let flag = false;//set flag to false
        for (let i in haystack) {
            if (haystack[i] == needle) {//if found breakout
                return true;
            }
        }
        return flag;
    }

    self.indexAt = (haystack, needle, pos) => {//used to get the index of an item at a particular occurrance
        pos = pos || 0;
        let count = -1;
        for (let i = 0; i < haystack.length; i++) {
            if (haystack[i] == needle) {
                count++;

                if (count == pos) {
                    return i;
                }
            }
        }

        return -1;
    }

    self.find = (haystack, callback) => {//used as a higher order function to get an items that match the conditions
        for (let i in haystack) {
            if (callback(haystack[i]) == true) {
                return haystack[i];
            }
        }
    }

    self.findAll = (haystack, callback) => {//used as a higher order function to get all the items that match the conditions
        let values = [];
        for (let i in haystack) {
            if (callback(haystack[i]) == true) {
                values.push(haystack[i]);
            }
        }

        return values;
    }

    self.getObject = (haystack, key, value) => {//used to get an Object with an Item in a JsonArray
        let object;
        for (let i in haystack) {
            if (haystack[i][key] == value) object = haystack[i];
        }
        return object;
    }

    self.getAllObjects = (haystack, key, value) => {//used to get all occurrances of an Object with an Item in a JsonArray
        let newArray = [];
        for (let i in haystack) {
            if (haystack[i][key] == value) {
                newArray.push(haystack[i]);
            }
        }
        return newArray;
    }

    self.getAll = (haystack, needle) => {//used to all occurrances of an item in an Array
        let newArray = [];
        for (let i in haystack) {
            if (haystack[i] == needle) newArray.push(i);
        }
        return newArray;
    }

    self.removeAll = (haystack, needle) => {//used to remove instances of an item
        let newArray = [];
        for (let i of haystack) {
            if (i != needle) {
                newArray.push(i);
            }
        }
        return newArray;
    }

    self.putAt = (haystack = [], value, key = 0) => {//used to push an item into an index in Array
        let newArray = [];//storage
        for (let i in haystack) {
            if (i == key) {//matched
                newArray[i] = value;//push in the value
                let next = Math.floor(key);//check if it's a number

                if (isNaN(next)) {
                    next = key + 1;
                }
                else {
                    next++;
                }
                newArray[next] = haystack[i];//add the previous value
            }
            else {
                newArray[i] = haystack[i];
            }
        }

        return newArray;
    }

    self.pushArray = (haystack = [], needle, insert) => {//used to push in an item before another existing item in an Array
        let position = self.arrayIndex(haystack, needle);//get the existing item position
        let newArray = self.putAt(haystack, insert, position);//push in new item
        return newArray;
    }

    self.arrayIndex = (haystack = [], needle = []) => {//used to get position of an item in an Array
        for (let i in haystack) {
            if (JSON.stringify(haystack[i]) == JSON.stringify(needle)) {
                return i;
            }
        }
        return -1;
    }

    self.hasArray = (haystack = [], needle = []) => {//used to check if an Array is a sub-Array to another Array
        haystack = JSON.stringify(haystack);
        needle = JSON.stringify(needle);

        return haystack.indexOf(needle) != -1;
    }

    self.toObject = (array = [], key) => {//used to turn an JsonArray to an Object literal
        let object = {};//storage
        for (let i in array) {
            object[array[i][key]] = array[i];//store the intended [key, value]
            delete object[array[i][key]][key];//remove the key in the value
        }
        return object;
    }

    self.reshape = (params) => {//used to change the shape of an Array
        // Pending
    }

    self.randomPick = (array) => {//used to pick a random item from an Array
        return array[Math.floor(Math.random() * array.length)];
    };

    self.removeEmpty = (array = []) => {//used to truncate an Array
        let newArray = [];//storage
        for (let i in array) {
            if (Array.isArray(array[i]) && array[i].length > 0) {//if array go deep
                newArray.push(self.removeEmpty(array[i]));
            }
            else if (array[i] != undefined && array[i] != null && array[i] != 0 && array[i] != '') {//skip [undefined, null, 0, '']
                newArray.push(array[i]);
            }
        }
        return newArray;
    }

    self.each = (array = [], callback = () => { }) => {//used as a higher order Array function
        let newArray = [];//storage
        for (let i in array) {
            newArray.push(callback(array[i], i));//make changes to the item and store it.
        }
        return newArray;
    }

    self.hasArrayElement = (haystack = [], needle = []) => {//used to check if two arrays has an item in common
        let flag = false;
        for (let i in needle) {
            if (haystack.indexOf(needle[i]) != -1) {
                return true;
            }
        }
        return flag;
    }

    self.toSet = (haystack = []) => {//used to turn an Array into a set(Make sure there a no duplicates)
        let single = [];//storage
        for (let i in haystack) {//skip if already stored
            if (single.indexOf(haystack[i]) == -1) {
                single.push(haystack[i]);
            }
        }
        return single;
    }

    self.popIndex = (array = [], index) => {//used to remove an item at a position in an Array
        let newArray = [];//storage Array
        for (let i in array) {
            if (i != index) {//skip the position
                newArray.push(array[i]);
            }
        }
        return newArray;
    }

    self.dataType = (array = []) => {//used to get the datatypes inside an Array
        let type = typeof array[0];//get the indext type
        for (let i in array) {
            if (typeof array[i] != type) {//if two types do not match return mixed
                return 'mixed';
            }
        }
        return type;
    }

    return self;
}

module.exports = ArrayLibrary;
},{}],15:[function(require,module,exports){
"use strict";

const MathsLibrary = require('./MathsLibrary');

const ObjectsLibrary = require('./ObjectsLibrary');

const ArrayLibrary = require('./ArrayLibrary');

let mathLibrary = MathsLibrary();
let objectLibrary = ObjectsLibrary();
let arrayLibrary = ArrayLibrary(); // import { Tree } from '../classes/Tree.js';

function Compression() {
  const self = {};

  self.getFrequency = (data = []) => {
    //get the occurrance of symbols in a list
    const frequency = {};

    for (let d in data) {
      if (frequency[data[d]] == undefined) {
        frequency[data[d]] = 1;
      } else {
        frequency[data[d]]++;
      }
    }

    return frequency;
  };

  self.getProbabilities = (data = []) => {
    //get the probabilities of all symbols in a list
    let probs = self.getFrequency(data);

    for (let i in probs) {
      probs[i] = probs[i] / data.length;
    }

    return probs;
  };

  self.entropy = (data = []) => {
    //this shows the shortest possible average length of a lossless compression
    let sum = 0;
    let dataType = arrayLibrary.dataType(data); //get the datatype of the list

    let probabilities;

    if (dataType == 'number') {
      probabilities = data;
    } else if (dataType == 'string') {
      //get the symbols probabilities
      probabilities = Object.values(self.getProbabilities(data));
    } //Sum of (-p log base 2 of p)


    for (let prob of probabilities) {
      sum += -prob * Math.log2(prob);
    }

    return sum;
  };

  self.isUDC = (data = []) => {
    //check if a list is uniquely decodable code
    let flag = true,
        noPrefix,
        keepRunning = true;

    let addSurfix = str => {
      //check if suffix is in list already then stop running
      if (data.includes(str)) {
        flag = false;
        keepRunning = false;
        return;
      }

      data.push(str);
    };

    let checkPrefix = pos => {
      //check for prefix
      noPrefix = true;

      for (let i = 0; i < data.length; i++) {
        if (i == pos) {
          //skip the current position
          continue;
        } else if (data[i] == data[pos]) {
          //double found in the list
          flag = false;
          keepRunning = false;
        } else if (data[i].indexOf(data[pos]) == 0) {
          //add suffix found to the list
          addSurfix(data[i].replace(data[pos], ''));
        } //stop checking for prefix


        if (!keepRunning) break;
      }
    };

    while (keepRunning) {
      for (let i = 0; i < data.length; i++) {
        checkPrefix(i);
        if (keepRunning == false) break; //stop running
      }

      if (noPrefix == true) {
        //if no prefix is found stop it is UDC
        keepRunning = false;
      }
    }

    return flag;
  };

  self.sfAlgorithm = (data = []) => {
    let frequency = self.getFrequency(data); //get the frequecies of the symbols

    let sorted = objectLibrary.sort(frequency, {
      value: true
    }); //sort the symbols based on frequecy of occurrance

    let codeWord = '';
    let tree = {
      path: '',
      size: mathLibrary.sum(Object.values(sorted)),
      value: JSON.parse(JSON.stringify(sorted))
    }; //set a copy of the sorted data as a tree

    let table = JSON.parse(JSON.stringify(sorted)); //set the sorted as table

    for (let i in table) {
      table[i] = {
        frequency: table[i]
      };
    }

    let trySwitching = node => {
      //switch nodes if the left size is bigger than the right side
      if (node[0].size > node[1].size) {
        let temp = node[0];
        node[0] = node[1];
        node[1] = temp;
        temp = node[0].path;
        node[0].path = node[1].path;
        node[1].path = temp;
      }

      return node;
    };

    let splitData = comingNode => {
      //split a tree
      let node = [{
        path: comingNode.path + '0',
        size: 0,
        value: []
      }, {
        path: comingNode.path + '1',
        size: 0,
        value: []
      }]; //into two almost equal length

      for (let i in comingNode.value) {
        if (node[0].size < node[1].size) {
          //split into 2 almost equal nodes
          node[0].value[i] = comingNode.value[i];
          node[0].size += comingNode.value[i];
        } else {
          node[1].value[i] = comingNode.value[i];
          node[1].size += comingNode.value[i];
        }
      }

      node = trySwitching(node);

      for (let i in node) {
        if (Object.values(node[i].value).length > 1) {
          //if it has more than 1 symbol it's a node then split it again
          node[i].value = splitData(node[i]);
        } else {
          //it is a leaf, add it to the table and get the properties
          let key = Object.keys(node[i].value)[0];
          table[key].code = node[i].path;
          table[key].length = node[i].path.length;
          table[key].probability = node[i].size / data.length;
          table[key].log = Math.log2(1 / table[key].probability);
        }
      }

      return node;
    };

    tree = splitData(tree);

    for (let d of data) {
      codeWord += table[d].code;
    }

    return {
      codeWord,
      table,
      data,
      tree
    };
  };

  self.huffmanCoding = (data = []) => {
    let frequency = self.getProbabilities(data); //get the frequecies of the symbols

    let sorted = objectLibrary.sort(frequency, {
      value: true
    }); //sort the symbols based on frequecy of occurrance

    let tree = [];
    let table = {};

    for (let i in sorted) {
      //init the table and the tree
      table[i] = {
        probability: sorted[i],
        path: '',
        length: 0,
        prod: 0
      };
      tree.push({
        value: sorted[i],
        origins: i
      });
    }

    let dig = (coming = []) => {
      //run the algorithm loop until one node is remaining with value of '1'
      let length = coming.length; //size of list 

      let node = []; //init node

      if (length > 1) {
        // list has more than one node?
        let down = length - 1; //index of last two items in list

        let up = length - 2;
        let sum = coming[up].value + coming[down].value;
        let added = false;

        for (let i = 0; i < coming.length; i++) {
          if (i == up || i == down) {
            //sum last 2 items and skip adding them
            if (length == 2) {
              //if last 2 sum them and exist digging
              let newLeaf = {
                value: sum,
                origins: [coming[up].origins, coming[down].origins]
              };
              node.push(newLeaf);
              break;
            }

            continue;
          } else if (coming[i].value <= sum && !added) {
            //add sum if it has not been added
            let newLeaf = {
              value: sum,
              origins: [coming[up].origins, coming[down].origins]
            };
            node.push(newLeaf);
            added = true;
          }

          node.push(coming[i]);
        }

        if (length > 2) {
          node = dig(node);
        }
      }

      return node;
    };

    tree = dig(tree); //get the path/codeword foreach symbol

    let nameItems = (origins, path) => {
      for (let i in origins) {
        if (Array.isArray(origins[i])) {
          nameItems(origins[i], path + i);
        } else {
          table[origins[i]].path = path + i;
          table[origins[i]].length = path.length;
          table[origins[i]].prod = path.length * table[origins[i]].probability;
        }
      }
    };

    nameItems(tree[0].origins, ''); //calculate the avevage length of the codes

    let avgLength = mathLibrary.sum(objectLibrary.valueOfObjectArray(table, 'prod'));
    frequency = sorted = undefined;
    return {
      table,
      data,
      avgLength,
      tree
    };
  }; // self.encodeHuffman = (data, dictionary = []) => {
  //     let dictionaryLength = dictionary.length;
  //     let codeWord = '', nytCode, code;
  //     //get the e and r parameters
  //     let { e, r } = (() => {
  //         let ok = false;
  //         let e = 0, r;
  //         while (!ok) {
  //             e++;
  //             r = dictionaryLength - 2 ** e;
  //             ok = r < 2 ** e;
  //         }
  //         return { e, r };
  //     })();
  //     let fixedCode = (symbol) => {//get the fixed code
  //         let k = dictionary.indexOf(symbol) + 1;
  //         let code;
  //         if (k <= 2 * r) { // 1 <= k <= 2r
  //             code = (k - 1).toString(2);
  //             code = Array((e + 1) - code.length).fill(0).join('') + code; // e + 1 representation of k - 1
  //         }
  //         else if (k > 2 * r) {//k > 2r
  //             code = (k - r - 1).toString(2);
  //             code = Array((e) - code.length).fill(0).join('') + code;// e representation of k - r - 1
  //         }
  //         return code;
  //     }
  //     let updateCount = (t) => {//set the count of a node and switch if left is greater than right
  //         let count = t.getAttribute('count');
  //         count++;
  //         t.setAttributes({ count });
  //         let p = t.parentTree;
  //         if (p != null) {
  //             trySwitching(p);
  //             updateCount(p);
  //         }
  //     }
  //     let trySwitching = (node) => {//switch if left is greater than right
  //         if (node.values[0].getAttribute('count') > node.values[1].getAttribute('count')) {
  //             node.reverse();
  //         }
  //     };
  //     let tree = new Tree();
  //     tree.setAttribute('count', 0);
  //     let NYT = tree;
  //     let readSymbol = (symbol) => {
  //         let s = tree.search((v, i) => {//search and get symbol node if added already
  //             return v.getAttribute('id') == symbol;
  //         }, tree.height);
  //         let v = s.value;
  //         nytCode = tree.search((v, i) => {//get the nyt node
  //             return v.getAttribute('id') == 'nyt';
  //         }, tree.height).path.join('');
  //         if (v == undefined) {//has not been added
  //             NYT.removeAttribute('id');//remove the current NYT tag
  //             NYT.push([], []);//add the 2 nodes
  //             let temp = NYT.values[0];
  //             v = NYT.values[1];
  //             temp.setAttributes({ id: 'nyt', count: 0 });//set new nyt
  //             v.setAttributes({ id: symbol, count: 0 });
  //             NYT = temp;
  //             code = nytCode + fixedCode(symbol);//nyt + fixedCode
  //         }
  //         else {
  //             code = s.path.join('');//get path
  //         }
  //         codeWord += code;//concat the code
  //         updateCount(v);//update the count starting from this node to the root
  //     }
  //     for (let symbol of data) {
  //         readSymbol(symbol);
  //     }
  //     return { codeWord, tree, data };
  // }
  // self.decodeHuffman = (codeWord, dictionary = []) => {
  //     let dictionaryLength = dictionary.length;
  //     let data = '', nytCode, code, path = [];
  //     let tree = new Tree();
  //     tree.setAttributes({ count: 0, id: 'nyt' });
  //     let NYT = tree;
  //     let i;
  //     let { e, r } = (() => {
  //         let ok = false;
  //         let e = 0, r;
  //         while (!ok) {
  //             e++;
  //             r = dictionaryLength - 2 ** e;
  //             ok = r < 2 ** e;
  //         }
  //         return { e, r };
  //     })();
  //     let trySwitching = (node) => {//switch nodes if left side is greater than right side
  //         if (node.values[0].getAttribute('count') > node.values[1].getAttribute('count')) {
  //             node.reverse();
  //         }
  //     };
  //     let updateCount = (t) => {//update the size of the current node and it's next parent
  //         let count = t.getAttribute('count');
  //         count++;
  //         t.setAttributes({ count });
  //         let p = t.parentTree;
  //         if (p != null) {
  //             trySwitching(p);
  //             updateCount(p);
  //         }
  //     }
  //     let readSymbol = (symbol) => {
  //         let s = tree.search((v) => {
  //             return v.getAttribute('id') == symbol;//search and get symbol if exists already
  //         }, tree.height);
  //         let v = s.value;
  //         nytCode = tree.search((v, i) => {
  //             return v.getAttribute('id') == 'nyt';//get the NYT code
  //         }, tree.height).path.join('');
  //         if (v == undefined) {//new symbol? add it to the tree with new NYT
  //             NYT.removeAttribute('id');
  //             NYT.push([], []);
  //             let temp = NYT.values[0];
  //             v = NYT.values[1];
  //             temp.setAttributes({ id: 'nyt', count: 0 });
  //             v.setAttributes({ id: symbol, count: 0 });
  //             NYT = temp;
  //         }
  //         updateCount(v);
  //     }
  //     let interprete = (node) => {
  //         let code;
  //         if (node == NYT) {//is node NYT
  //             for (let j = 0; j < e; j++) {//read next 4 codes
  //                 path.push(codeWord[++i]);
  //             }
  //             let p = parseInt(path.join(''), 2);
  //             if (p < r) {//p is more than r, read 1 more
  //                 path.push(codeWord[++i]);
  //                 p = parseInt(path.join(''), 2);
  //             }
  //             else {
  //                 p += r;//add r to p
  //             }
  //             code = dictionary[p];//get symbol from dictionary
  //             readSymbol(code);//add this symbol to tree
  //         }
  //         else {
  //             code = node.getAttribute('id');//get the symbol from the tree
  //             readSymbol(code);//update the symbol
  //         }
  //         return code;
  //     }
  //     for (i = -1; i < codeWord.length; i++) {//start with empty NYT
  //         let code = codeWord[i];
  //         if (code != undefined) {//when not empty
  //             path.push(code);
  //         }
  //         let node = tree.trace(path).value;
  //         if (node.getAttribute('id') != undefined) {//is node labelled
  //             path = [item];
  //             data += interprete(node);//what is this node
  //             path = [];
  //         }
  //     }
  //     return { data, tree, codeWord };
  // }


  self.golomb = (n, m) => {
    let q = Math.floor(n / m); //step 1

    let unary = Array(q).fill(1).join('') + '0'; //unary of q

    let k = Math.ceil(Math.log2(m));
    let c = 2 ** k - m;
    let r = n % m;

    let rC = (() => {
      //r`
      let value = r.toString();

      if (r < c) {
        value = r.toString();
        value = Array(k - 1 - value.length).fill(0).join('') + value; //k-1 bits rep of r
      } else {
        value = (r + c).toString();
        value = Array(k - value.length).fill(0).join('') + value; //k bits rep of r+c
      }

      return value;
    })();

    let code = unary + rC; //concat unary and r'

    return code;
  };

  self.encodeArithmetic = (data, probabilities) => {
    let getX = n => {
      //f(x(n))= sum of x(1) .... x(n)
      let value = 0;

      for (let i in probabilities) {
        if (n == i) break;
        value = (value / 10 + probabilities[i] / 10) * 100 / 10; //handle the JS decimal problem
      }

      return value;
    }; // l(0) = 0, u(0) = 0, fx(0) = 0


    let bounds = [{
      l: 0,
      u: 1
    }];

    let lowerN = n => {
      //lower limit of n l(n) = l(n-1) + (u(n-1) - l(n-1)) * f(x(n-1))
      let bound = bounds[n];
      let l = bound.l + (bound.u - bound.l) * getX(data[n] - 1);
      return l;
    };

    let upperN = n => {
      //lower limit of n u(n) = l(n-1) + (u(n-1) - l(n-1)) * f(x(n))
      let bound = bounds[n];
      let u = bound.l + (bound.u - bound.l) * getX(data[n]);
      return u;
    };

    for (let i = 0; i < data.length; i++) {
      bounds.push({
        l: lowerN(i),
        u: upperN(i)
      });
    }

    let n = bounds.pop();
    return (n.l + n.u) / 2;
  };

  self.decodeArithmetic = (tag = 0, probabilities) => {
    let data = '';

    let getX = n => {
      //f(x(n))= sum of x(1) .... x(n)
      let value = 0;

      for (let i in probabilities) {
        if (n == i) break;
        value = (value / 10 + probabilities[i] / 10) * 100 / 10; //handle the JS decimal problem
      }

      return value;
    }; // l(0) = 0, u(0) = 0, fx(0) = 0


    let bounds = [{
      l: 0,
      u: 1
    }];

    let lowerN = n => {
      //lower limit of n l(n) = l(n-1) + (u(n-1) - l(n-1)) * f(x(n-1))
      let bound = bounds[n];
      let l = bound.l + (bound.u - bound.l) * getX(data[n] - 1);
      return l;
    };

    let upperN = n => {
      //lower limit of n u(n) = l(n-1) + (u(n-1) - l(n-1)) * f(x(n))
      let bound = bounds[n];
      let u = bound.l + (bound.u - bound.l) * getX(data[n]);
      return u;
    };

    let count = 0,
        complete = false;

    while (!complete) {
      //run until all the codes are found
      let found = false,
          x = 1,
          n = {};

      while (!found) {
        // for each new code
        let l = lowerN(count, x);
        let u = upperN(count, x);
        complete = l >= tag && tag <= u;
        if (complete) break; //if all is found stop running

        found = l < tag && tag < u; //check if it sactisfies the conditions

        n = {
          l,
          u,
          x
        };
        x++;
      }

      if (complete) break;
      count++;
      bounds.push(n); //add code

      data += n.x;
    }

    return data;
  };

  self.encodeDiagram = (data = '', dictionary = {}) => {
    //daigram coding
    let i;
    let codeWord = '';

    let encode = () => {
      let first = data[i]; //take two at a time

      let second = data[i + 1];
      let symbol = first + second;
      let code;

      if (dictionary[symbol] != undefined) {
        //is symbol in dictionary
        code = dictionary[symbol];
        i++; //set count to know it read two
      } else {
        code = dictionary[first];
      }

      return code;
    };

    for (i = 0; i < data.length; i++) {
      codeWord += encode();
    }

    return codeWord;
  };

  self.encodeLZ1 = (data = '', params = {
    windowSize: 0,
    searchSize: 0,
    lookAheadSize: 0
  }) => {
    //LZ7//LZ1//Sliding window
    if (params.windowSize == undefined) params.windowSize = params.searchSize + params.lookAheadSize; //init the window, search and lookahead sizes

    if (params.searchSize == undefined) params.searchSize = params.windowSize - params.lookAheadSize;
    if (params.lookAheadSize == undefined) params.lookAheadSize = params.windowSize - params.searchSize;
    let i = 0,
        lookAheadStop,
        searchStop,
        lookAheadBuffer,
        searchBuffer; //init the buffers and locations

    let getTriplet = () => {
      let x = lookAheadBuffer[0];
      let picked = {
        o: 0,
        l: 0,
        c: x
      }; //set the triplet <o, l, c(n)>

      if (searchBuffer.includes(x)) {
        let foundMatches = []; //storage for the matches

        for (let i in searchBuffer) {
          //find all the matches in search buffer
          if (searchBuffer[i] == picked.c) {
            let indexInData = +searchStop + +i,
                //this is the joint of the search and lookAhead buffers
            indexInLookAhead = 0,
                count = 0,
                matching = true,
                matched = [];

            while (matching) {
              //keep getting the matches
              matched.push(data[indexInData]);
              count++;
              matching = lookAheadBuffer[indexInLookAhead + count] === data[indexInData + count];
            }

            foundMatches.push({
              o: searchBuffer.length - i,
              l: matched.length,
              c: lookAheadBuffer[matched.length]
            }); //save matches
          }
        }

        picked = foundMatches[0];

        for (let y of foundMatches) {
          //get the match with most size and closest to the lookAhead buffer
          if (picked.l < y.l) {
            picked = y;
          } else if (picked.l == y.l && picked.o > y.o) {
            picked = y;
          }
        }
      }

      i += picked.l;
      return picked;
    };

    let list = [];

    for (i = 0; i < data.length; i++) {
      searchStop = i - params.searchSize;
      if (searchStop < 0) searchStop = 0;
      lookAheadStop = i + params.lookAheadSize;
      searchBuffer = data.slice(searchStop, i).split('');
      lookAheadBuffer = data.slice(i, lookAheadStop).split('');
      list.push(getTriplet());
    }

    return list;
  };

  self.decodeLZ1 = (triplets = [{
    o: 0,
    l: 0,
    c: ''
  }], params = {
    windowSize: 0,
    searchSize: 0,
    lookAheadSize: 0
  }) => {
    let word = '';
    if (params.windowSize == undefined) params.windowSize = params.searchSize + params.lookAheadSize; //init the window, search and lookahead sizes

    if (params.searchSize == undefined) params.searchSize = params.windowSize - params.lookAheadSize;
    if (params.lookAheadSize == undefined) params.lookAheadSize = params.windowSize - params.searchSize;

    for (let t of triplets) {
      //decode each triplet
      for (let i = 0; i < t.l; i++) {
        word += word[word.length - t.o];
      }

      word += t.c;
    }

    return word;
  };

  self.encodeLZ2 = (data = '') => {
    //LZ8//LZ2
    let duplets = []; //init duplet list

    let entries = []; //init dictionary

    let i, lastIndex;

    let getRange = range => {
      //get the symbols within the range
      let value = '';

      for (let r of range) {
        value += data[r];
      }

      return value;
    };

    let encode = range => {
      let e = getRange(range); //get the value of the range

      let index = entries.indexOf(e);
      let d = {
        i: lastIndex,
        c: e[e.length - 1]
      }; //create duplet

      if (index == -1) {
        //current group of symbols is in not in the dictionary
        entries.push(e);
      } else {
        range.push(++i);
        lastIndex = index + 1;
        d = encode(range);
      }

      return d;
    };

    for (i = 0; i < data.length; i++) {
      lastIndex = 0;
      duplets.push(encode([i]));
    }

    return duplets;
  };

  self.decodeLZ2 = (duplets = [{
    i: 0,
    c: ''
  }]) => {
    let entries = []; //init dictionary

    let c;

    for (let d of duplets) {
      //decode each duplet
      c = '';

      if (d.i != 0) {
        c = entries[d.i - 1]; //get the code from the dictionary
      }

      c += d.c;
      entries.push(c);
    }

    return entries.join('');
  };

  self.encodeLZW = (data = '', initDictionary = []) => {
    let codeWord = [],
        lastIndex,
        i;
    let entries = Array.from(initDictionary);

    let getRange = range => {
      // get the values within the range
      let value = '';

      for (let r of range) {
        value += data[r];
      }

      return value;
    };

    let encode = range => {
      let e = getRange(range);
      let index = entries.indexOf(e);

      if (index == -1) {
        //is value not in dictionary?
        entries.push(e); //add it and set the counter to the last read symbol

        index = 0;
        i--;
      } else {
        i++; //set the counter to the next symbol and try encoding the range

        range.push(i);
        lastIndex = index += 1; //set the last read index, this is the code

        e = encode(range);
      }

      return lastIndex;
    };

    for (i = 0; i < data.length; i++) {
      lastIndex = 0;
      let code = encode([i]);

      if (code != undefined) {
        //code was created
        codeWord.push(code);
      }
    }

    return codeWord;
  };

  self.decodeLZW = (singleton = [], initDictionary = []) => {
    let word = '',
        codeWord = [],
        state,
        count = 0,
        rebuild = false,
        buildWith = '',
        i,
        start = 0;
    let entries = Array.from(initDictionary);

    let getCode = range => {
      //get the code within the range
      let value = '';
      count = 0;
      buildWith = '';

      for (let r of range) {
        if (word[r] == undefined) {
          //it is not complete
          count++;
          rebuild = true; //set to rebuild
        } else {
          buildWith += word[r]; //set to rebuild with incase of not complete
        }

        value += word[r];
      }

      return value;
    };

    let decode = (range = []) => {
      let e = getCode(range);
      let index = entries.indexOf(e);

      if (index == -1) {
        //is not in dictionary?
        entries.push(e);
        i--; //set the counter to the last symbol read
      } else {
        ++i;
        range.push(i);
        decode(range); //add next symbol and decode again
      }

      return e;
    };

    let build = state => {
      //build up the dictionary from the decoded values
      for (i = start; i < word.length; i++) {
        let e = decode([i]);

        if (entries.length == state) {
          //stop at the current decoding point
          start = i + 1 - count; //set next starting point at the current stop

          break;
        }
      }
    };

    for (let s of singleton) {
      let e = entries[s - 1];

      if (e == undefined) {
        build(s); //build the dictionary

        e = entries[s - 1];
      }

      codeWord.push(e);
      word = codeWord.join('');

      if (rebuild) {
        //rebuild the last entry in the dictionary 
        rebuild = false;

        for (let i = 0; i < count; i++) {
          //keep add items to the buildwith to the buildwith until it is complete
          buildWith += buildWith[i];
        }

        codeWord.pop(); //set last built and last decoded to the new build

        codeWord.push(buildWith);
        entries.pop();
        entries.push(buildWith);
        start += count; //set the next build starting point
      }
    }

    return word;
  };

  return self;
}

module.exports = Compression;

},{"./ArrayLibrary":14,"./MathsLibrary":16,"./ObjectsLibrary":17}],16:[function(require,module,exports){
const ArrayLibrary = require('./ArrayLibrary');
let arrayLibrary = ArrayLibrary();

function MathsLibrary() {
    let self = {};

    self.placeUnit = (num, value, count) => {
        num = Math.floor(num).toString();
        value = value || num[0];
        count = count || 0;

        let pos = -1;
        for (let i = 0; i < num.length; i++) {
            if (num[i] == value) {
                if (count == 0) {
                    pos = i;
                }
                count--;
            }
        }


        if (pos != -1) pos = 10 ** (num.length - pos - 1);
        return pos;
    }

    self.round = (params) => {
        params.dir = params.dir || 'round';
        params.to = params.to || 1;

        let value = Math[params.dir](params.num / params.to) * params.to;
        return value;
    }

    self.variance = (data) => {
        let mean = self.mean(data);
        let variance = 0;
        for (let i = 0; i < data.length; i++) {
            variance += (data[i] - mean) ** 2;
        }
        return variance / data.length;
    }

    self.standardDeviation = (data) => {
        let variance = self.variance(data);
        let std = Math.sqrt(variance);
        return std;
    }

    self.range = (data) => {
        let min = Math.min(...data);
        let max = Math.max(...data);

        let range = max - min;
        return range;
    }

    self.mean = (data) => {
        let sum = self.sum(data);

        let mean = sum / data.length;
        return mean;
    }

    self.median = (data) => {
        let length = data.length;
        let median;
        if (length % 2 == 0) {
            median = (data[(length / 2) - 1] + data[length / 2]) / 2;
        } else {
            median = data[Math.floor(length / 2)];
        }

        return median;
    }

    self.mode = (data) => {
        let record = {};
        for (let i = 0; i < data.length; i++) {
            if (record[data[i]] != undefined) record[data[i]]++;
            else record[data[i]] = i;
        }

        let max = Math.max(...Object.value(record));
        let mode;
        for (let i in record) {
            if (record[i] == max) {
                mode = i;
                break;
            }
        }

        return mode;
    }

    self.normalizeData = (data) => {
        data.sort((a, b) => { return a - b });
        var max = data[data.length - 1];
        var min = data[0];
        var normalized = [];
        for (var i = 0; i < data.length; i++) {
            normalized.push((data[i] - min) / (max - min));
        }
        return normalized;
    }

    self.minimuimSwaps = (arr, order) => {
        var swap = 0;
        var checked = [];
        var counter = 0;
        var final = [...arr].sort((a, b) => { return a - b });
        if (order == -1) final = final.reverse();

        for (var i = 0; i < arr.length; i++) {
            var element = arr[i];
            if (i == element || checked[i]) continue;

            counter = 0;

            if (arr[0] == 0) element = i;

            while (!checked[i]) {
                checked[i] = true;
                i = final.indexOf(element);
                element = arr[i];
                counter++;
            }
            if (counter != 0) {
                swap += counter - 1;
            }
        }
        return swap;
    }

    self.primeFactorize = (number) => {
        if (typeof number != "number") return [];
        number = Math.abs(parseInt(number));
        if (number == 1 || number == 0) return []//1 and 0 has no primes
        var divider = 2;
        var dividend;
        var factors = [];
        while (number != 1) {
            dividend = number / divider;
            if (dividend.toString().indexOf('.') != -1) {
                divider++
                continue;
            }
            number = dividend;
            factors.push(divider);
        }
        return factors;
    }

    self.lcf = (numbers) => {
        if (!Array.isArray(numbers)) return [];
        var factors = [];
        var commonFactors = [];
        var value = 1;
        for (var number of numbers) {
            if (typeof number != "number") return [];
            factors.push(self.primeFactorize(number))
        }

        main:
        for (var factor of factors[0]) {
            if (commonFactors.indexOf(factor) == -1) {
                for (var i of factors) {
                    if (i.indexOf(factor) == -1) continue main;
                }
                commonFactors.push(factor);
                value *= factor;
            }
        }
        return value;
    }

    self.stripInteger = (number) => {
        number = number.toString();
        number = (number.indexOf('.') == -1) ? number : number.slice(0, number.indexOf('.'));
        return number;
    }

    self.stripFraction = (number) => {
        number = number.toString();
        number = (number.indexOf('.') == -1) ? '0' : number.slice(number.indexOf('.') + 1);
        return number;
    }

    self.changeBase = (number, from, to) => {
        return parseFloat(number, from).toString(to);
    }

    self.max = (array) => {
        var max = array[0];
        arrayLibrary.each(array, value => {
            if (max < value) max = value;
        });
        return max;
    }

    self.min = (array) => {
        var max = array[0];
        arrayLibrary.each(array, value => {
            if (max > value) max = value;
        });
        return max;
    }

    self.sum = (array) => {
        //for finding the sum of one layer array
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
            if (isNaN(Math.floor(array[i]))) {
                sum = false;
                break;
            }
            sum += array[i] / 1;
        }

        return sum;
    }

    self.product = (array) => {
        //for finding the sum of one layer array
        let product = 1;
        for (let i = 0; i < array.length; i++) {
            if (isNaN(Math.floor(array[i]))) {
                product = false;
                break;
            }
            product *= array[i];
        }

        return product;
    }

    self.add = (...arrays) => {
        let newArray = [];
        arrays[0].forEach((value, position) => {
            arrays.forEach((array, location) => {
                if (location != 0) {
                    let element = Array.isArray(array) ? array[position] : array;
                    value += isNaN(element) == true ? 0 : element;
                }
            })
            newArray.push(value);
        });
        return newArray;
    }

    self.sub = (...arrays) => {
        let newArray = [];
        arrays[0].forEach((value, position) => {
            arrays.forEach((array, location) => {
                if (location != 0) {
                    let element = Array.isArray(array) ? array[position] : array;
                    value -= isNaN(element) == true ? 0 : element;
                }
            })
            newArray.push(value);
        });
        return newArray;
    }

    self.mul = (...arrays) => {
        let newArray = [];
        arrays[0].forEach((value, position) => {
            arrays.forEach((array, location) => {
                if (location != 0) {
                    let element = Array.isArray(array) ? array[position] : array;
                    value *= isNaN(element) == true ? 0 : element;
                }
            })
            newArray.push(value);
        });
        return newArray;
    }

    self.divide = (...arrays) => {
        let newArray = [];
        arrays[0].forEach((value, position) => {
            arrays.forEach((array, location) => {
                if (location != 0) {
                    let element = Array.isArray(array) ? array[position] : array;
                    value /= isNaN(element) == true ? 0 : element;
                }
            })
            newArray.push(value);
        });
        return newArray;
    }

    self.abs = (array) => {
        return arrayLibrary.each(array, value => {
            value = isNaN(value) == true ? 0 : value;
            return Math.abs(value);
        });
    }

    return self;
}

module.exports = MathsLibrary;
},{"./ArrayLibrary":14}],17:[function(require,module,exports){
const ArrayLibrary = require('./ArrayLibrary');
let arrayLibrary = ArrayLibrary();

function ObjectsLibrary() {
    let self = {};

    self.size = (object) => {
        let bytes = 0;
        if (typeof object == 'string') {
            bytes += object.length * 2;
        }
        else if (typeof object == 'number') {
            bytes += 8;
        }
        else if (typeof object == 'boolean') {
            bytes += 4;
        }
        else if (typeof object == 'object') {
            for (let i in object) {
                bytes += roughObjectSize(object[i]);
            }
        }

        return bytes;
    }

    self.extractFromJsonArray = (meta, source) => {//extract a blueprint of data from a JsonArray
        let keys = Object.keys(meta);//get the keys
        let values = Object.values(meta);//get the values

        let eSource = [];
        if (source != undefined) {
            for (let obj of source) {//each item in source
                let object = {};
                for (let i in keys) {//each blueprint key
                    if (arrayLibrary.contains(Object.keys(obj), values[i])) {//source item has blueprint value
                        object[keys[i]] = obj[values[i]];//store according to blueprint
                    }
                }
                eSource.push(object);
            }
        }
        return eSource;
    }

    self.find = (obj, callback) => {//higher order Object function for the first item in an Object that match
        for (let i in obj) {
            if (callback(obj[i]) == true) {
                return obj[i];
            }
        }
    }

    self.findAll = (obj, callback) => {//higher order Object function for all items in an Object that match
        let values = {};
        for (let i in obj) {
            if (callback(obj[i]) == true)
                values[i] = obj[i];
        }

        return values;
    }

    self.makeIterable = (obj) => {//make an object to use 'for in'
        obj[Symbol.iterator] = function* () {
            let properties = Object.keys(obj);
            for (let p of properties) {
                yield this[p];
            }
        }
        return obj;
    }

    self.max = (object) => {
        object = self.sort(object, { value: true });
        return self.getIndex(object);
    }

    self.min = (object) => {//get the mininum in item in an Object
        object = self.sort(object, { value: false });
        return self.getIndex(object);
    }

    self.onChanged = (obj, callback) => {//make an object listen to changes of it's items
        const handler = {
            get(target, property, receiver) {//when an Item is fetched
                try {
                    return new Proxy(target[property], handler);
                } catch (err) {
                    return Reflect.get(target, property, receiver);
                }
            },
            defineProperty(target, property, descriptor) {//when an Item is added
                callback(target, property);
                return Reflect.defineProperty(target, property, descriptor);
            },
            deleteProperty(target, property) {//when an Item is removed
                callback(target, property);
                return Reflect.deleteProperty(target, property);
            }
        };

        return new Proxy(obj, handler);
    }

    self.toArray = (object, named) => {//turn an Object into an Array
        var array = [];
        Object.keys(object).map((key) => {
            if (named == true) {//make it named
                array[key] = object[key];
            }
            else {
                array.push(object[key]);
            }
        });
        return array;
    }

    self.valueOfObjectArray = (array, name) => {//get all the keys in a JsonArray of item name
        var newArray = [];
        for (let i in array) {
            newArray.push(array[i][name]);
        }
        return newArray;
    }

    self.keysOfObjectArray = (array = []) => {//get all the keys in a JsonArray
        var newArray = [];
        for (let i in array) {
            newArray = newArray.concat(Object.keys(array[i]));
        }
        return arrayLibrary.toSet(newArray);//remove duplicates
    }

    self.objectOfObjectArray = (array = [], id, name) => {//strip [key value] from a JsonArray
        var object = {};
        for (let i in array) {
            object[array[i][id]] = array[i][name];
        }
        return object;
    }

    self.copy = (from, to) => {//clone an Object
        Object.keys(from).map(key => {
            to[key] = from[key];
        });
    }

    self.forEach = (object, callback) => {//higher order function for Object literal
        for (let key in object) {
            callback(object[key], key);
        }
    }

    self.each = function (object, callback) {//higher order function for Object literal
        let newObject = {};
        for (let key in object) {
            newObject[key] = callback(object[key], key);
        }
        return newObject;
    }

    self.isSubObject = (data, sample) => {//check if an object is a sub-Object of another Object
        let flag;
        for (let name in sample) {
            flag = JSON.stringify(sample[name]) == JSON.stringify(data[name]);//convert to string and compare
            if (!flag) break;
        }

        return flag;
    }

    self.getSubObject = (data = [], sample = {}) => {//get matched items in Object
        let matched = [], flag = true;
        for (let i in data) {
            flag = self.isSubObject(data[i], sample);//check each object
            if (!flag) continue;
            matched.push(data[i]);
        }

        return matched
    }

    self.sort = (data = {}, params = { items: [], descend: false, key: false, value: false }) => {//sort an Object based on[key, value or items]
        params.item = params.item || '';
        params.descend = params.descend || false;

        let sorted = [], nData = {};
        for (let [key, value] of Object.entries(data)) {
            sorted.push({ key, value });
        }

        if (params.key != undefined) {//sort with key
            console.log('Hello');
            sorted.sort((a, b) => {
                let value = (a.key >= b.key);
                if (params.key == true) value = !value;//descend
                return value;
            });
        }

        if (params.value != undefined) {//sort with value
            sorted.sort((a, b) => {
                let value = (a.value >= b.value);
                if (params.value == true) value = !value;//descend
                return value;
            });
        }

        if (params.items != undefined) {//sort with items
            sorted.sort((a, b) => {
                let greater = 0, lesser = 0;
                for (let item of params.items) {
                    if (a.value[item] >= b.value[item]) greater++
                    else lesser++;
                }
                let value = greater >= lesser;
                if (params.descend == true) value = !value;//descend items
                return value;
            });
        }

        for (let { key, value } of sorted) {
            nData[key] = value;
        }

        return nData;
    }

    self.reverse = (data = {}) => {//reverse an Object
        let keys = Object.keys(data).reverse();
        let newObject = {};
        for (let i of keys) {
            newObject[i] = data[i];
        }
        return newObject;
    }

    self.getIndex = (data = {}) => {//get the first item in the Object
        let key = Object.keys(data).shift();
        let value = data[key];
        return { key, value };
    }

    self.getLast = (data = {}) => {//get the last item in the Object
        let key = Object.keys(data).pop();
        let value = data[key];
        return { key, value };
    }

    self.getAt = (data = {}, index) => {//get the item of index in the Object
        let key = Object.keys(data)[index];
        let value = data[key];
        return { key, value };
    }

    self.keyOf = (data = {}, item) => {//get the first occurrance of an item in an Object
        let index = -1;
        for (let i in data) {
            if (JSON.stringify(data[i]) == JSON.stringify(item)) {
                return i;
            }
        }

        return index;
    }

    self.lastKeyOf = (data = {}, item) => {//get the last occurrance of an item in an object
        let index = -1;
        for (let i in data) {
            if (JSON.stringify(data[i]) == JSON.stringify(item)) {
                index = i;
            }
        }

        return index;
    }

    self.includes = (data = {}, item) => {//check if an Object has an item
        return self.keyOf(data, item) != -1;
    }
    return self;
}

module.exports = ObjectsLibrary;
},{"./ArrayLibrary":14}],18:[function(require,module,exports){
const Func = require('./../classes/Func');
let func = new Func();

function Shadow(element) {
    let self = { element: element.cloneNode(true), children: [element], properties: {}, childProperties: {} };

    self.updateNewElementChildProperties = function (element, propertyCollection = {}) {
        let children, positions;
        for (let identifier in propertyCollection) {
            for (let childProperties of propertyCollection[identifier]) {
                positions = this.setPositions(childProperties.positions);
                children = this.getChildren(identifier, element, positions);
                for (let j = 0; j < children.length; j++) {
                    children[j].setProperties(childProperties.properties);
                }
            }
        }
    }

    self.updateNewElementChildAttributes = function (element, attributeCollection = {}) {
        let children, positions;
        for (let identifier in attributeCollection) {
            for (let childAtrributes of attributeCollection[identifier]) {
                positions = this.setPositions(childAtrributes.positions);
                children = this.getChildren(identifier, element, positions);
                for (let j = 0; j < children.length; j++) {
                    children[j].setAttributes(childAtrributes.attributes);
                }
            }
        }
    }

    self.setPositions = function (positions = 1) {
        if (!Array.isArray(positions)) {
            positions = func.range(positions);
        }

        return positions;
    }

    self.createElement = function (params = { childDetails: { attributes: {}, properties: {} }, details: { attributes: {}, properties: {} } }) {
        let element = this.element.cloneNode(true);
        this.children.push(element);

        this.prepareElement(element, params);
        return element;
    }

    self.prepareElement = function (element, params = { childDetails: { attributes: {}, properties: {} }, details: { attributes: {}, properties: {} } }) {
        if (params.childDetails != undefined) {
            if (params.childDetails.attributes != undefined) {
                this.updateNewElementChildAttributes(element, params.childDetails.attributes);
            }

            if (params.childDetails.properties != undefined) {
                this.updateNewElementChildProperties(element, params.childDetails.properties);
            }
        }

        if (params.details != undefined) {
            if (params.details.attributes != undefined) {
                element.setAttributes(params.details.attributes);
            }

            if (params.details.properties != undefined) {
                element.setProperties(params.details.properties);
            }
        }

        this.updateNewElementChildProperties(element, this.childProperties);
        element.setProperties(this.properties);

        this.makeCloneable(element);
    }

    self.removeElement = function (element) {
        let children = [];
        let position = this.children.indexOf(element);
        for (let i = 0; i < this.children.lengt; i++) {
            if (position != i) {
                children.push(this.children[i]);
            }
        }
        this.children = children;
    }

    self.cloneElement = function (position, params = { childDetails: { attributes: {}, properties: {} }, details: { attributes: {}, properties: {} } }) {
        let element = this.children[position].cloneNode(true);
        this.children.push(element);

        this.prepareElement(element, params);
        return element;
    }

    self.makeCloneable = function (element) {
        let position = this.children.indexOf(element);
        if (position == -1) {
            return;
        }

        element.unitClone = (params) => {
            return this.cloneElement(position, params)
        }
    }

    self.length = function () {
        return this.children.length;
    }

    self.setProperties = function (properties = {}) {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].setProperties(properties);
        }
        this.element.setProperties(properties);
        for (let i in properties) {
            this.properties[i] = properties[i];
        }
    }

    self.css = function (style = {}) {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].css(style);
        }
        this.element.css(style);
    }

    self.setAttributes = function (attributes = {}) {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].setAttributes(attributes);
        }
        this.element.setAttributes(attributes);
    }

    self.addClasses = function (classes = '') {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].addClasses(classes);
        }
        this.element.addClasses(classes);
    }

    self.removeClasses = function (classes = '') {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].removeClasses(classes);
        }
        this.element.removeClasses(classes);
    }

    self.getChildren = function (identifier = '', element, positions = []) {
        let collection = [];
        let children = element.findAll(identifier);//get the children matching identifier in each element
        if (children.length > 0) {//if not empty
            for (let j = 0; j < positions.length; j++) {
                if (children[positions[j]] != undefined) {//if available
                    collection.push(children[positions[j]]);
                }
            }
        }
        return collection;
    }

    self.childCss = function (identifier = '', style = {}, positions = []) {
        positions = this.setPositions(positions);

        let children;
        for (let i = 0; i < this.children.length; i++) {
            children = this.getChildren(identifier, this.children[i], positions);

            for (let j = 0; j < children.length; j++) {
                children[j].css(style);
            }
        }

        children = this.getChildren(identifier, this.element, positions);

        for (let j = 0; j < children.length; j++) {
            children[j].css(style);
        }
    }

    self.setChildProperties = function (identifier = '', properties = {}, positions = []) {
        positions = this.setPositions(positions);

        let children;
        for (let i = 0; i < this.children.length; i++) {
            children = this.getChildren(identifier, this.children[i], positions);

            for (let j = 0; j < children.length; j++) {
                children[j].setProperties(properties);
            }
        }

        children = this.getChildren(identifier, this.element, positions);
        for (let j = 0; j < children.length; j++) {
            children[j].setProperties(properties);
        }

        this.childProperties[identifier] = this.childProperties[identifier] || [];
        this.childProperties[identifier].push({ properties, positions });
    }

    self.setChildAttributes = function (identifier = '', attributes = {}, positions = '') {
        positions = this.setPositions(positions);

        let children;
        for (let i = 0; i < this.children.length; i++) {
            children = this.getChildren(identifier, this.children[i], positions);

            for (let j = 0; j < children.length; j++) {
                children[j].setAttributes(attributes);
            }
        }

        children = this.getChildren(identifier, this.element, positions);

        for (let j = 0; j < children.length; j++) {
            children[j].setAttributes(attributes);
        }
    }

    self.addClassesToChild = function (identifier = '', classes = '', positions = []) {
        positions = this.setPositions(positions);

        let children;
        for (let i = 0; i < this.children.length; i++) {
            children = this.getChildren(identifier, this.children[i], positions);

            for (let j = 0; j < children.length; j++) {
                children[j].addClasses(classes);
            }
        }

        children = this.getChildren(identifier, this.element, positions);

        for (let j = 0; j < children.length; j++) {
            children[j].addClasses(classes);
        }
    }

    self.removeClassesFromChild = function (identifier = '', classes = '', positions = []) {
        positions = this.setPositions(positions);

        let children;
        for (let i = 0; i < this.children.length; i++) {
            children = this.getChildren(identifier, this.children[i], positions);

            for (let j = 0; j < children.length; j++) {
                children[j].removeClasses(classes);
            }
        }

        children = this.getChildren(identifier, this.element, positions);

        for (let j = 0; j < children.length; j++) {
            children[j].removeClasses(classes);
        }
    }
    return self;
}

module.exports = Shadow;
},{"./../classes/Func":7}],19:[function(require,module,exports){
const Func = require('./classes/Func');
const Matrix = require('./classes/Matrix');
const NeuralNetwork = require('./classes/NeuralNetwork');
const Template = require('./classes/Template');
const Components = require('./classes/Components');
const ColorPicker = require('./classes/ColorPicker');
const Period = require('./classes/Period');
const Icons = require('./Icons');
const Shadow = require('./functions/Shadow');
const ArrayLibrary = require('./functions/ArrayLibrary');
const ObjectsLibrary = require('./functions/ObjectsLibrary');
const MathsLibrary = require('./functions/MathsLibrary');
const AnalysisLibrary = require('./functions/AnalysisLibrary');
const Compression = require('./functions/Compression');

class Empty {
}

class Base extends Components {
    constructor(theWindow = Empty) {
        super(theWindow);
        this.colorHandler = new ColorPicker();
        this.array = ArrayLibrary();
        this.object = ObjectsLibrary();
        this.math = MathsLibrary();
        this.analytics = AnalysisLibrary();
        this.icons = Icons;

        this.styles = [
            'https://kade-95.github.io/kerdx/css/table.css',
            'https://kade-95.github.io/kerdx/css/cell.css',
            'https://kade-95.github.io/kerdx/css/form.css',
            'https://kade-95.github.io/kerdx/css/picker.css',
            'https://kade-95.github.io/kerdx/css/select.css',
            'https://kade-95.github.io/kerdx/css/json.css',
            'https://kade-95.github.io/kerdx/css/popup.css'
        ];
        for (let style of this.styles) {
            this.loadCss(style);
        }
    }
}

module.exports = {
    Base,
    ColorPicker,
    Period,
    Matrix,
    Func,
    Components,
    Template,
    NeuralNetwork,
    Icons,
    Shadow,
    ArrayLibrary,
    ObjectsLibrary,
    MathsLibrary,
    AnalysisLibrary,
    Compression,
};

},{"./Icons":4,"./classes/ColorPicker":5,"./classes/Components":6,"./classes/Func":7,"./classes/Matrix":9,"./classes/NeuralNetwork":10,"./classes/Period":11,"./classes/Template":12,"./functions/AnalysisLibrary":13,"./functions/ArrayLibrary":14,"./functions/Compression":15,"./functions/MathsLibrary":16,"./functions/ObjectsLibrary":17,"./functions/Shadow":18}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Logger = Logger;

var _System = require("../functions/System.js");

let system = new _System.System();

function Logger() {
  const self = {
    board: undefined,
    previousCommands: [],
    index: 0,
    commandList: {}
  };

  self.commandList.clear = () => {
    self.board.innerHTML = '';
  };

  self.commandList.log = data => {
    let logItem = kerdx.createElement({
      element: 'div',
      attributes: {
        class: 'log-item'
      }
    });

    if (data instanceof Element) {
      logItem.append(data);
    } else {
      try {
        logItem.innerHTML = data;
      } catch (error) {
        logItem.innerHTML = 'Error writing to the log';
      }
    }

    self.board.append(logItem);
  };

  self.commandList.print = data => {};

  self.commandList.request = data => {
    let props = self.getCommandProps(data, '-');

    if (props.url == undefined) {
      self.commandList.log('Url is required');
      return;
    }

    if (props.method == undefined) {
      self.commandList.log('Method is required');
      return;
    }

    try {
      props.data = JSON.parse(props.data);
      self.disableInput();
      self.write(`Connecting to ${props.url}`);
      system.connect(props).then(result => {
        self.write('Connected');
        self.write(result);
      }).catch(error => {
        console.log(error);
      }).finally(self.enableInput());
    } catch (error) {
      self.write('Data format not valid');
    }
  };

  self.getCommandProps = (data, start) => {
    let commands = {};
    let args = data.split(' ');
    let arg;

    for (let i = 0; i < args.length; i++) {
      arg = args[i];

      if (arg[0] == start) {
        commands[arg.replace(start, '')] = args[i + 1];
      }
    }

    return commands;
  };

  self.createWindow = () => {
    let responseWindow = kerdx.createElement({
      element: 'div',
      attributes: {
        id: 'response-window'
      },
      children: [{
        element: 'span',
        attributes: {
          id: 'response-window-controls'
        },
        children: [{
          element: 'input',
          attributes: {
            id: 'response-window-search'
          }
        }, {
          element: 'i',
          attributes: {
            id: 'response-window-clear',
            class: 'fas fa-minus-circle'
          }
        }, {
          element: 'i',
          attributes: {
            id: 'response-window-toggle',
            class: 'fas fa-arrow-up'
          }
        }]
      }, {
        element: 'span',
        attributes: {
          id: 'response-window-log'
        },
        children: [{
          element: 'span',
          attributes: {
            id: 'response-window-board'
          }
        }, {
          element: 'span',
          attributes: {
            id: 'response-window-command'
          },
          children: [{
            element: 'label',
            text: 'RUN: '
          }, {
            element: 'input',
            attributes: {
              id: 'response-window-input',
              autoComplete: 'off'
            }
          }]
        }]
      }]
    });
    self.commandInput = responseWindow.find('#response-window-input');
    self.board = responseWindow.find('#response-window-board');
    let windowLog = responseWindow.find('#response-window-log');
    responseWindow.addEventListener('click', event => {
      if (event.target == windowLog || windowLog.isAncestor(event.target)) {
        self.commandInput.focus();
        self.commandInput.setSelectionRange(self.commandInput.value.length, self.commandInput.value.length, "forward");
      }
    });
    self.commandInput.addEventListener('keydown', event => {
      let value;

      if (event.key == 'ArrowUp' || event.key == 'ArrowDown') {
        if (event.key == 'ArrowUp') {
          self.index--;
        } else if (event.key == 'ArrowDown') {
          self.index++;
        }

        if (self.previousCommands.length == 0) self.index = 0;else if (self.index < 0) self.index = 0;else if (self.index >= self.previousCommands.length) self.index = self.previousCommands.length - 1;
        value = self.previousCommands[self.index];
        self.commandInput.value = value || '';
        self.commandInput.setSelectionRange(self.commandInput.value.length, self.commandInput.value.length, "forward");
      } else if (event.key == 'Enter') {
        let command = self.commandInput.value;
        self.commandInput.value = '';
        self.commandList.log(`RUN: ${command}`);

        if (command != '') {
          self.previousCommands.push(command);

          if (kerdx.isset(self.commandList[command.split(' ')[0]])) {
            self.commandList[command.split(' ')[0]](command.replace(command.split(' ')[0], '').trim());
          } else {
            self.write(`'${command.split(' ')[0]}' not found`);
          }
        } else {
          self.write(command);
        }

        self.index = self.previousCommands.length - 1;
      }
    });
    self.window = responseWindow;
    self.resize();
    return responseWindow;
  };

  self.write = data => {
    let item;

    if (data instanceof Element) {
      item = data;
    } else if (typeof data == 'object') {
      item = kerdx.displayData(data);
    } else {
      item = kerdx.createElement({
        element: 'span',
        html: data
      });
    }

    let time = `[${kerdx.time()}]:`;
    let logItem = kerdx.createElement({
      element: 'div',
      attributes: {
        style: {
          display: 'grid',
          gridTemplateColumns: 'max-content 1fr'
        }
      },
      children: [{
        element: 'label',
        text: time
      }, item]
    });
    self.commandList.log(logItem);
  };

  self.clean = () => {
    self.commandList.clear();
  };

  self.disableInput = () => {
    self.commandInput.css({
      display: 'none'
    });
  };

  self.enableInput = () => {
    self.commandInput.cssRemove(['display']);
  };

  self.resize = () => {
    self.window.onAdded(() => {
      let parent = self.window.parentNode;
      let canDrag = false;
      let position = self.window.position();

      let hover = event => {
        let diff = event.y - self.window.position().top;

        if (diff < 15 && diff > -15) {
          self.window.css({
            cursor: 'ns-resize'
          });
        } else if (!canDrag) {
          self.window.cssRemove(['cursor']);
        }
      };

      let mousedown = event => {
        let diff = event.y - self.window.position().top;

        if (diff < 15 && diff > -15) {
          self.window.css({
            cursor: 'ns-resize'
          });
          canDrag = true;
        }
      };

      let drag = event => {
        let height = position.bottom - event.y;
        let okHeight = height > 200;
        let within = event.y > parent.position().top;

        if (canDrag && within && okHeight) {
          self.window.css({
            height: `${height}px`
          });
        }
      };

      let mouseup = event => {
        canDrag = false;
      };

      let mouseleave = event => {
        canDrag = false;
      };

      self.window.addEventListener('mousemove', hover);
      self.window.addEventListener('mousedown', mousedown);
      parent.addEventListener('mousemove', drag);
      self.window.addEventListener('mouseup', mouseup);
      parent.addEventListener('mouseup', mouseleave);
    });
  };

  self.clear = () => {
    self.commandList.clear();
  };

  return self;
}

},{"../functions/System.js":21}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.System = System;

function System() {
  const mmu = {};

  mmu.connect = (params = {
    encode: true,
    data: {}
  }) => {
    if (params.encode == undefined) params.encode = true;

    if (params.encode == true) {
      let sentence = JSON.stringify(params.data);
      let dictionary = kerdx.array.toSet(sentence.split('')).join('');
      let code = compressor.encodeLZW(sentence, dictionary);
      params.data = {
        code,
        dictionary,
        encoded: true
      };
    }

    return new Promise((resolve, reject) => {
      appLibrary.ajax(params).then(response => {
        try {
          response = JSON.parse(response);
        } catch (error) {} finally {
          if (response.encoded == true) {
            response = JSON.parse(compressor.decodeLZW(response.code, response.dictionary));
          }

          resolve(response);
        }
      }).catch(err => {
        reject(err);
      });
    });
  };

  return mmu;
}

},{}],22:[function(require,module,exports){
const {Base, Compression, AppLibrary, Template } = require('@thekade/kerd/classes/browser');
window.kerdx = new Base(window);
const t = new Template(window);

const { Logger } = require('./functions/Logger.js');
const { System } = require('./functions/System.js');

window.mmu = {};
window.compressor = Compression();
window.appLibrary = AppLibrary();
let logger = new Logger();
let system = new System();

mmu.generateRequestContent = (params = { name: '', options: [] }) => {
    let label = kerdx.camelCasedToText(params.name);
    let nodeName = 'input';

    if (Array.isArray(params.options)) {
        nodeName = 'select';
    }

    let content = kerdx.createElement({
        element: 'div', attributes: { class: 'request-window-content' }, children: [
            { element: 'label', attributes: { class: 'request-window-content-label', id: name }, text: label },
            { element: nodeName, attributes: { class: 'request-window-content-data', name: params.name } },
        ]
    });

    if (Array.isArray(params.options)) {
        content.find('.request-window-content-data').makeElement({
            element: 'option', attributes: { selected: true, disabled: true, value: null }, text: `Select ${label}`
        });

        for (let option of params.options) {
            content.find('.request-window-content-data').makeElement({
                element: 'option', attributes: { value: option }, text: option
            });
        }
    }

    return content;
}

mmu.generateData = () => {
    let data = kerdx.createElement({
        element: 'div', attributes: { class: 'request-single-data' }, children: [
            { element: 'input', attributes: { class: 'request-single-data-name', placeHolder: 'Name' } },
            { element: 'label', text: '=>' },
            { element: 'input', attributes: { class: 'request-single-data-value', placeHolder: 'Value' } },
            { element: 'select', attributes: { class: 'request-single-data-type' }, options: ['String', 'Array', 'Json'] },
            { element: 'i', attributes: { class: 'request-single-data-remove fas fa-trash' } }
        ]
    });

    return data;
}

mmu.validateRequest = () => {
    let requestContents = document.body.find('#request-contents');
    let validateForm = kerdx.validateForm(requestContents);
    if (!validateForm.flag) {
        logger.write(`${kerdx.camelCasedToText(validateForm.elementName)} is required`);
        return false;
    }

    return true;
}

mmu.sendRequest = () => {
    let requestContents = document.body.find('#request-contents');

    if (mmu.validateRequest()) {
        let params = kerdx.jsonForm(requestContents);
        let requestData = document.body.find('#request-data');
        let allData = requestData.findAll('.request-single-data');
        params.data = {};
        let value, type;
        for (let i = 0; i < allData.length; i++) {
            value = allData[i].find('.request-single-data-value').value;
            type = allData[i].find('.request-single-data-type').value;
            if (type == 'Json') {
                params.data[allData[i].find('.request-single-data-name').value] = JSON.parse(value);
            }
            else if (type == 'Array') {
                params.data[allData[i].find('.request-single-data-name').value] = value == '' ? [] : value.split(',');
            }
            else {
                params.data[allData[i].find('.request-single-data-name').value] = value;
            }
        }
        logger.disableInput();
        logger.write(`Connecting to ${params.url}`);
        system.connect(params).then(result => {
            logger.write('Connected');
            logger.write(result);
        }).catch(error => {
            console.log(error)
        }).finally(logger.enableInput());
    }
}

mmu.render = () => {
    let header = document.body.makeElement({
        element: 'header', attributes: { id: 'header-window' }
    });

    let main = document.body.makeElement({
        element: 'main', attributes: { id: 'main-window' }, children: [
            { element: 'nav', attributes: { id: 'navigator' } },
            {
                element: 'section', attributes: { id: 'request-window' }, children: [
                    {
                        element: 'div', attributes: { id: 'request-contents' }, children: [
                            mmu.generateRequestContent({ name: 'url' }),
                            mmu.generateRequestContent({ name: 'method', options: ['POST', 'GET', 'DELETE'] }),
                            {
                                element: 'div', attributes: { class: 'request-window-content' }, children: [
                                    { element: 'label', attributes: { class: 'request-window-content-label' }, text: 'Request Data' },
                                    { element: 'i', attributes: { class: 'fas fa-plus', id: 'new-data' } }
                                ]
                            },
                        ]
                    },
                    { element: 'div', attributes: { id: 'request-data' } },
                    {
                        element: 'div', attributes: { id: 'request-controls' }, children: [
                            { element: 'button', attributes: { id: 'submit-request' }, text: 'Submit Request' }
                        ]
                    }
                ]
            },
            logger.createWindow()
        ]
    });

    let newData = main.find('#new-data');
    let submitRequest = main.find('#submit-request');
    let requestData = main.find('#request-data');
    let responseWindow = main.find('#response-window');
    let responseWindowClear = main.find('#response-window-clear');
    let responseWindowToggle = main.find('#response-window-toggle');

    newData.addEventListener('click', event => {
        requestData.makeElement(mmu.generateData());
    });

    requestData.addEventListener('click', event => {
        if (event.target.classList.contains('request-single-data-remove')) {
            event.target.parentNode.remove();
        }
    });

    submitRequest.addEventListener('click', event => {
        mmu.sendRequest();
    });

    responseWindowToggle.addEventListener('click', event => {
        responseWindow.toggleClass('response-window-full');
        responseWindowToggle.toggleClass('fa-arrow-down');
        responseWindowToggle.toggleClass('fa-arrow-up');
    });

    responseWindowClear.addEventListener('click', event => {
        logger.clear();
    });
}

document.addEventListener('DOMContentLoaded', event => {
    document.body.innerHTML = '';
    mmu.render();
});

},{"./functions/Logger.js":20,"./functions/System.js":21,"@thekade/kerd/classes/browser":1}]},{},[22])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQHRoZWthZGUva2VyZC9jbGFzc2VzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvQHRoZWthZGUva2VyZC9mdW5jdGlvbnMvQXBwTGlicmFyeS5qcyIsIm5vZGVfbW9kdWxlcy9AdGhla2FkZS9rZXJkL2Z1bmN0aW9ucy9JbmRleGVkTGlicmFyeS5qcyIsIm5vZGVfbW9kdWxlcy9AdGhla2FkZS9rZXJkL25vZGVfbW9kdWxlcy9AdGhla2FkZS9iYXNlL0ljb25zLmpzIiwibm9kZV9tb2R1bGVzL0B0aGVrYWRlL2tlcmQvbm9kZV9tb2R1bGVzL0B0aGVrYWRlL2Jhc2UvY2xhc3Nlcy9Db2xvclBpY2tlci5qcyIsIm5vZGVfbW9kdWxlcy9AdGhla2FkZS9rZXJkL25vZGVfbW9kdWxlcy9AdGhla2FkZS9iYXNlL2NsYXNzZXMvQ29tcG9uZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9AdGhla2FkZS9rZXJkL25vZGVfbW9kdWxlcy9AdGhla2FkZS9iYXNlL2NsYXNzZXMvRnVuYy5qcyIsIm5vZGVfbW9kdWxlcy9AdGhla2FkZS9rZXJkL25vZGVfbW9kdWxlcy9AdGhla2FkZS9iYXNlL2NsYXNzZXMvSlNFbGVtZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9AdGhla2FkZS9rZXJkL25vZGVfbW9kdWxlcy9AdGhla2FkZS9iYXNlL2NsYXNzZXMvTWF0cml4LmpzIiwibm9kZV9tb2R1bGVzL0B0aGVrYWRlL2tlcmQvbm9kZV9tb2R1bGVzL0B0aGVrYWRlL2Jhc2UvY2xhc3Nlcy9OZXVyYWxOZXR3b3JrLmpzIiwibm9kZV9tb2R1bGVzL0B0aGVrYWRlL2tlcmQvbm9kZV9tb2R1bGVzL0B0aGVrYWRlL2Jhc2UvY2xhc3Nlcy9QZXJpb2QuanMiLCJub2RlX21vZHVsZXMvQHRoZWthZGUva2VyZC9ub2RlX21vZHVsZXMvQHRoZWthZGUvYmFzZS9jbGFzc2VzL1RlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL0B0aGVrYWRlL2tlcmQvbm9kZV9tb2R1bGVzL0B0aGVrYWRlL2Jhc2UvZnVuY3Rpb25zL0FuYWx5c2lzTGlicmFyeS5qcyIsIm5vZGVfbW9kdWxlcy9AdGhla2FkZS9rZXJkL25vZGVfbW9kdWxlcy9AdGhla2FkZS9iYXNlL2Z1bmN0aW9ucy9BcnJheUxpYnJhcnkuanMiLCJub2RlX21vZHVsZXMvQHRoZWthZGUva2VyZC9ub2RlX21vZHVsZXMvQHRoZWthZGUvYmFzZS9mdW5jdGlvbnMvQ29tcHJlc3Npb24uanMiLCJub2RlX21vZHVsZXMvQHRoZWthZGUva2VyZC9ub2RlX21vZHVsZXMvQHRoZWthZGUvYmFzZS9mdW5jdGlvbnMvTWF0aHNMaWJyYXJ5LmpzIiwibm9kZV9tb2R1bGVzL0B0aGVrYWRlL2tlcmQvbm9kZV9tb2R1bGVzL0B0aGVrYWRlL2Jhc2UvZnVuY3Rpb25zL09iamVjdHNMaWJyYXJ5LmpzIiwibm9kZV9tb2R1bGVzL0B0aGVrYWRlL2tlcmQvbm9kZV9tb2R1bGVzL0B0aGVrYWRlL2Jhc2UvZnVuY3Rpb25zL1NoYWRvdy5qcyIsIm5vZGVfbW9kdWxlcy9AdGhla2FkZS9rZXJkL25vZGVfbW9kdWxlcy9AdGhla2FkZS9iYXNlL2luZGV4LmpzIiwic3JjL2Z1bmN0aW9ucy9Mb2dnZXIuanMiLCJzcmMvZnVuY3Rpb25zL1N5c3RlbS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3h4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3huQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJjb25zdCB7XHJcbiAgICBCYXNlLFxyXG4gICAgRnVuYyxcclxuICAgIE5ldXJhbE5ldHdvcmssXHJcbiAgICBNYXRyaXgsXHJcbiAgICBUZW1wbGF0ZSxcclxuICAgIENvbXBvbmVudHMsXHJcbiAgICBDb21wcmVzc2lvbixcclxuICAgIENvbG9yUGlja2VyLFxyXG59ID0gcmVxdWlyZSgnQHRoZWthZGUvYmFzZScpO1xyXG5cclxuY29uc3QgQXBwTGlicmFyeSA9IHJlcXVpcmUoJy4uL2Z1bmN0aW9ucy9BcHBMaWJyYXJ5Jyk7XHJcbmNvbnN0IEluZGV4ZWRMaWJyYXJ5ID0gcmVxdWlyZSgnLi4vZnVuY3Rpb25zL0luZGV4ZWRMaWJyYXJ5Jyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEJhc2UsXHJcbiAgICBGdW5jLFxyXG4gICAgTmV1cmFsTmV0d29yayxcclxuICAgIE1hdHJpeCxcclxuICAgIFRlbXBsYXRlLFxyXG4gICAgQ29tcG9uZW50cyxcclxuICAgIENvbXByZXNzaW9uLFxyXG4gICAgQ29sb3JQaWNrZXIsXHJcbiAgICBJbmRleGVkTGlicmFyeSxcclxuICAgIEFwcExpYnJhcnlcclxufVxyXG4iLCJjb25zdCB7IEZ1bmMgfSA9IHJlcXVpcmUoJ0B0aGVrYWRlL2Jhc2UnKTtcclxubGV0IGZ1bmMgPSBuZXcgRnVuYygpO1xyXG5cclxuZnVuY3Rpb24gQXBwTGlicmFyeSgpIHtcclxuICAgIGxldCBzZWxmID0ge307XHJcblxyXG4gICAgc2VsZi5tYWtlV2ViYXBwID0gKGNhbGxiYWNrID0gKCkgPT4geyB9KSA9PiB7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgIGxldCBhbmNob3IgPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgICAgIGxldCBwYXJlbnRBbmNob3IgPSBldmVudC50YXJnZXQuZ2V0UGFyZW50cygnYScpO1xyXG4gICAgICAgICAgICBsZXQgdXJsID0gYW5jaG9yLmdldEF0dHJpYnV0ZSgnaHJlZicpOy8vY2hlY2sgd2hlbiBhIHVybCBpcyBhYm91dCB0byBiZSBvcGVuXHJcblxyXG4gICAgICAgICAgICBpZiAoYW5jaG9yLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgIT0gJ2EnICYmICFmdW5jLmlzbnVsbChwYXJlbnRBbmNob3IpKSB7XHJcbiAgICAgICAgICAgICAgICBhbmNob3IgPSBwYXJlbnRBbmNob3I7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChmdW5jLmlzbnVsbCh1cmwpICYmICFmdW5jLmlzbnVsbChwYXJlbnRBbmNob3IpKSB7XHJcbiAgICAgICAgICAgICAgICBhbmNob3IgPSBwYXJlbnRBbmNob3I7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9nZXQgdGhlIGFuY2hvciBlbGVtZW50XHJcbiAgICAgICAgICAgIHVybCA9IGFuY2hvci5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IGFuY2hvci5nZXRBdHRyaWJ1dGUoJ3RhcmdldCcpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRhcmdldCA9PSAnX2JsYW5rJykgey8vY2hlY2sgaWYgaXQgaXMgZm9yIG5ldyBwYWdlXHJcbiAgICAgICAgICAgICAgICB3aW5kb3cub3BlbihmdW5jLnByZXBhcmVVcmwodXJsKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoIWZ1bmMuaXNudWxsKHVybCkpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7Ly9ibG9jayBhbmQgb3BlbiBpbnNpZGUgYXMgd2ViYXBwXHJcbiAgICAgICAgICAgICAgICBpZiAoZnVuYy5wcmVwYXJlVXJsKHVybCkgIT0gbG9jYXRpb24uaHJlZikgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKCdwYWdlJywgJ3RpdGxlJywgdXJsKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgd2luZG93Lm9ucG9wc3RhdGUgPSBjYWxsYmFjaztcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnByZXBhcmVVcmwgPSAodXJsID0gJycpID0+IHtcclxuICAgICAgICBpZiAoIXVybC5pbmNsdWRlcyhsb2NhdGlvbi5vcmlnaW4pKSB7XHJcbiAgICAgICAgICAgIGxldCBzcGxpdFVybCA9IGZ1bmMudXJsU3BsaXR0ZXIodXJsKTtcclxuICAgICAgICAgICAgaWYgKHNwbGl0VXJsLmxvY2F0aW9uID09IGxvY2F0aW9uLm9yaWdpbikge1xyXG4gICAgICAgICAgICAgICAgdXJsID0gbG9jYXRpb24ub3JpZ2luICsgJy8nICsgdXJsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKCF1cmwuaW5jbHVkZXMobG9jYXRpb24ucHJvdG9jb2wpKSB7XHJcbiAgICAgICAgICAgIHVybCA9IGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIHVybDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB1cmw7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5hamF4ID0gKHBhcmFtcyA9IHsgYXN5bmM6IHRydWUsIGRhdGE6IHt9LCB1cmw6ICcnLCBtZXRob2Q6ICcnLCBzZWN1cmVkOiBmYWxzZSB9KSA9PiB7XHJcbiAgICAgICAgcGFyYW1zLmFzeW5jID0gcGFyYW1zLmFzeW5jIHx8IHRydWU7XHJcbiAgICAgICAgcGFyYW1zLmRhdGEgPSBwYXJhbXMuZGF0YSB8fCB7fTtcclxuICAgICAgICBwYXJhbXMudXJsID0gcGFyYW1zLnVybCB8fCAnLi8nO1xyXG4gICAgICAgIHBhcmFtcy5tZXRob2QgPSBwYXJhbXMubWV0aG9kIHx8ICdQT1NUJztcclxuICAgICAgICBwYXJhbXMuc2VjdXJlZCA9IHBhcmFtcy5zZWN1cmVkIHx8IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAocGFyYW1zLnNlY3VyZWQpIHtcclxuICAgICAgICAgICAgcGFyYW1zLnVybCA9ICdodHRwczovL2NvcnMtYW55d2hlcmUuaGVyb2t1YXBwLmNvbS8nICsgcGFyYW1zLnVybDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XHJcbiAgICAgICAgaWYgKHBhcmFtcy5kYXRhIGluc3RhbmNlb2YgRm9ybURhdGEpIHtcclxuICAgICAgICAgICAgZGF0YSA9IHBhcmFtcy5kYXRhO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBwYXJhbXMuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5hcHBlbmQoaSwgcGFyYW1zLmRhdGFbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cclxuICAgICAgICAgICAgcmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT0gNCAmJiB0aGlzLnN0YXR1cyA9PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzcG9uc2VUZXh0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGlmIChmdW5jLmlzc2V0KHBhcmFtcy5vbnByb2dyZXNzKSkge1xyXG4gICAgICAgICAgICAgICAgcmVxdWVzdC51cGxvYWQub25wcm9ncmVzcyA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vbnByb2dyZXNzKChldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCkgKiA1MCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vbnByb2dyZXNzID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLm9ucHJvZ3Jlc3MoKGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsKSAqIDEwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHJlcXVlc3Qub3BlbihwYXJhbXMubWV0aG9kLCBwYXJhbXMudXJsLCBwYXJhbXMuYXN5bmMpO1xyXG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQoZGF0YSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNlbGY7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXBwTGlicmFyeTsiLCJjb25zdCB7IE9iamVjdHNMaWJyYXJ5IH0gPSByZXF1aXJlKCdAdGhla2FkZS9iYXNlJyk7XHJcbmxldCBvYmplY3RMaWJyYXJ5ID0gT2JqZWN0c0xpYnJhcnkoKTtcclxuXHJcbmZ1bmN0aW9uIEluZGV4ZWRMaWJyYXJ5KG5hbWUsIHZlcnNpb24pIHtcclxuICAgIGxldCBzZWxmID0geyBuYW1lLCB2ZXJzaW9uLCBpbml0aWFsaXplZDogZmFsc2UgfTtcclxuICAgIHNlbGYuaW5kZXhlZERCID0gd2luZG93LmluZGV4ZWREQiB8fCB3aW5kb3cubW96SW5kZXhlZERCIHx8IHdpbmRvdy53ZWJraXRJbmRleGVkREIgfHwgd2luZG93Lm1zSW5kZXhlZERCO1xyXG4gICAgc2VsZi5JREJUcmFuc2FjdGlvbiA9IHdpbmRvdy5JREJUcmFuc2FjdGlvbiB8fCB3aW5kb3cud2Via2l0SURCVHJhbnNhY3Rpb24gfHwgd2luZG93Lm1zSURCVHJhbnNhY3Rpb247XHJcbiAgICBzZWxmLklEQktleVJhbmdlID0gd2luZG93LklEQktleVJhbmdlIHx8IHdpbmRvdy53ZWJraXRJREJLZXlSYW5nZSB8fCB3aW5kb3cubXNJREJLZXlSYW5nZTtcclxuXHJcbiAgICBzZWxmLmluaXQgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHsvL2luaXRpYWxpemUgZGIgYnkgc2V0dGluZyB0aGUgY3VycmVudCB2ZXJzaW9uXHJcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IHNlbGYuaW5kZXhlZERCLm9wZW4oc2VsZi5uYW1lKTtcclxuICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAoY2FsbGJhY2soZXZlbnQudGFyZ2V0LnJlc3VsdCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBzZWxmLnZlcnNpb24gPSBNYXRoLmZsb29yKHJlcXVlc3QucmVzdWx0LnZlcnNpb24pIHx8IE1hdGguZmxvb3Ioc2VsZi52ZXJzaW9uKTtcclxuICAgICAgICAgICAgc2VsZi5pbml0aWFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXZlbnQudGFyZ2V0LmVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRWZXJzaW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBzZWxmLmluZGV4ZWREQi5vcGVuKHNlbGYubmFtZSk7XHJcbiAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi52ZXJzaW9uID09IHVuZGVmaW5lZCB8fCBzZWxmLnZlcnNpb24gPCByZXF1ZXN0LnJlc3VsdC52ZXJzaW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi52ZXJzaW9uID0gcmVxdWVzdC5yZXN1bHQudmVyc2lvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZi52ZXJzaW9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQudGFyZ2V0LmVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5vcGVuID0gYXN5bmMgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgaWYgKHNlbGYudmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgYXdhaXQgc2VsZi5nZXRWZXJzaW9uKCk7Ly9zZXQgdGhlIHZlcnNpb24gaWYgbm90IHNldFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gc2VsZi5pbmRleGVkREIub3BlbihzZWxmLm5hbWUsIHNlbGYudmVyc2lvbik7Ly9vcGVuIGRiXHJcbiAgICAgICAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLnZlcnNpb24gPSByZXF1ZXN0LnJlc3VsdC52ZXJzaW9uOy8vdXBkYXRlIHZlcnNpb24gYWZ0ZXIgdXBncmFkZVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPSB1bmRlZmluZWQpIHsvL3J1biB0aGUgY2FsbGJhY2sgaWYgc2V0XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHdvcmtlZERiID0gY2FsbGJhY2soZXZlbnQudGFyZ2V0LnJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd29ya2VkRGIub25lcnJvciA9IHdvcmtlZEV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHdvcmtlZEV2ZW50LnRhcmdldC5lcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShldmVudC50YXJnZXQucmVzdWx0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQudGFyZ2V0LmVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuY29sbGVjdGlvbkV4aXN0cyA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuIHNlbGYub3BlbigpLnRoZW4oZGIgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhjb2xsZWN0aW9uKTsvL2NoZWNrIGlmIGRiIGhhcyB0aGlzIGNvbGxlY3Rpb24gaW4gb2JqZWN0c3RvcmVcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmNyZWF0ZUNvbGxlY3Rpb24gPSBhc3luYyBmdW5jdGlvbiAoLi4uY29sbGVjdGlvbnMpIHtcclxuICAgICAgICBsZXQgdmVyc2lvbiA9IGF3YWl0IHNlbGYuZ2V0VmVyc2lvbigpOy8vdXBncmFkZSBjb2xsZWN0aW9uXHJcbiAgICAgICAgc2VsZi52ZXJzaW9uID0gdmVyc2lvbiArIDE7XHJcbiAgICAgICAgcmV0dXJuIHNlbGYub3BlbihkYiA9PiB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNvbGxlY3Rpb24gb2YgY29sbGVjdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgIGlmICghZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhjb2xsZWN0aW9uKSkgey8vY3JlYXRlIG5ldyBjb2xsZWN0aW9uIGFuZCBzZXQgX2lkIGFzIHRoZSBrZXlwYXRoXHJcbiAgICAgICAgICAgICAgICAgICAgZGIuY3JlYXRlT2JqZWN0U3RvcmUoY29sbGVjdGlvbiwgeyBrZXlQYXRoOiAnX2lkJyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZGI7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5lbXB0eUNvbGxlY3Rpb24gPSBmdW5jdGlvbiAoY29sbGVjdGlvbikge1xyXG4gICAgICAgIGxldCByZW1vdmVkQ291bnQgPSAwLCBmb3VuZENvdW50ID0gMDsvL3NldCB0aGUgY291bnRlcnNcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBzZWxmLmZpbmQoeyBjb2xsZWN0aW9uLCBxdWVyeToge30sIG1hbnk6IHRydWUgfSkudGhlbihmb3VuZCA9PiB7Ly9maW5kIGFsbCBkb2N1bWVudHNcclxuICAgICAgICAgICAgICAgIHNlbGYub3BlbigpLnRoZW4oZGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYi5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKGNvbGxlY3Rpb24pKSB7Ly9oYW5kbGUgY29sbGVjdGlvbiBub24tZXhpc3RlbmNlIGVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0cmFuc2FjdGlvbiA9IGRiLnRyYW5zYWN0aW9uKGNvbGxlY3Rpb24sICdyZWFkd3JpdGUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoY29sbGVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmVycm9yID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgYWN0aW9uOiAnZW1wdHljb2xsZWN0aW9uJywgcmVtb3ZlZENvdW50LCBvazogcmVtb3ZlZENvdW50ID09IGZvdW5kQ291bnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRDb3VudCA9IGZvdW5kLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZGF0YSBvZiBmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBzdG9yZS5kZWxldGUoZGF0YS5faWQpOy8vZGVsZXRlIGVhY2ggZG9jdW1lbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRXJyb3Igd2hpbGUgZGVsZXRpbmcgZG9jdW1lbnRzID0+ICR7ZXZlbnQudGFyZ2V0LmVycm9yfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWRDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgcmVtb3ZlZENvdW50LCBvazogcmVtb3ZlZENvdW50ID09IGZvdW5kQ291bnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmZpbmQgPSBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgc2VsZi5vcGVuKCkudGhlbihkYiA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZG9jdW1lbnRzID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRiLm9iamVjdFN0b3JlTmFtZXMuY29udGFpbnMocGFyYW1zLmNvbGxlY3Rpb24pKSB7Ly9jb2xsZWN0aW9uIGV4aXN0c1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0cmFuc2FjdGlvbiA9IGRiLnRyYW5zYWN0aW9uKHBhcmFtcy5jb2xsZWN0aW9uLCAncmVhZG9ubHknKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ub25lcnJvciA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1zLm1hbnkgPT0gdHJ1ZSkgey8vbWFueSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZG9jdW1lbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZG9jdW1lbnRzWzBdKTsvL3NpbmdsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShwYXJhbXMuY29sbGVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBzdG9yZS5vcGVuQ3Vyc29yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnNvcjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudC50YXJnZXQuZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnNvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5xdWVyeSA9PSB1bmRlZmluZWQpIHsvL2ZpbmQgYW55XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzLnB1c2goY3Vyc29yLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKG9iamVjdExpYnJhcnkuaXNTdWJPYmplY3QoY3Vyc29yLnZhbHVlLCBwYXJhbXMucXVlcnkpKSB7Ly9maW5kIHNwZWNpZmljXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzLnB1c2goY3Vyc29yLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXMubWFueSA9PSB0cnVlKSB7Ly9tYW55IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRvY3VtZW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRvY3VtZW50c1swXSk7Ly9zaW5nbGVcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZG9jdW1lbnRFeGlzdHMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICAgICAgZGVsZXRlIHBhcmFtcy5tYW55Oy8vY2hlY2sgZm9yIG9ubHkgb25lXHJcbiAgICAgICAgcmV0dXJuIHNlbGYuZmluZChwYXJhbXMpLnRoZW4ocmVzID0+IHsvL1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzICE9IHVuZGVmaW5lZDtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmdlbmVyYXRlSWQgPSBmdW5jdGlvbiAocmVxdWVzdCkge1xyXG4gICAgICAgIGxldCBpZCA9IERhdGUubm93KCkudG9TdHJpbmcoMzYpICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMikgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKTsvL2dlbmVyYXRlIHRoZSBpZCB1c2luZyB0aW1lXHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuY2hlY2tJZCA9IGZ1bmN0aW9uIChyZXF1ZXN0LCBxdWVyeSwgY2FsbGJhY2spIHtcclxuICAgICAgICBsZXQgaWQgPSBxdWVyeS5faWQgfHwgc2VsZi5nZW5lcmF0ZUlkKCk7Ly9nZXQgbmV3IF9pZCBpZiBub3Qgc2V0XHJcbiAgICAgICAgbGV0IGdldCA9IHJlcXVlc3QuZ2V0KGlkKTsvL2NoZWNrIGlmIGV4aXN0aW5nXHJcbiAgICAgICAgZ2V0Lm9uc3VjY2VzcyA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgaWYgKGV2ZW50LnRhcmdldC5yZXN1bHQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmNoZWNrSWQocmVxdWVzdCwgcXVlcnksIGNhbGxiYWNrKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGlkKTsvL3VzZSB0aGUgX2lkXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldC5vbmVycm9yID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgRXJyb3IgY2hlY2tpbmcgSUQgPT4gJHtldmVudC50YXJnZXQuZXJyb3J9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuYWRkID0gZnVuY3Rpb24gKHBhcmFtcywgZGIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdHJhbnNhY3Rpb24gPSBkYi50cmFuc2FjdGlvbihwYXJhbXMuY29sbGVjdGlvbiwgJ3JlYWR3cml0ZScpO1xyXG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmVycm9yID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQudGFyZ2V0LmVycm9yKVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGFjdGlvbjogJ2luc2VydCcsIGRvY3VtZW50czogcGFyYW1zLnF1ZXJ5IH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHBhcmFtcy5jb2xsZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChwYXJhbXMubWFueSA9PSB0cnVlICYmIEFycmF5LmlzQXJyYXkocGFyYW1zLnF1ZXJ5KSkgey8vIGZvciBtYW55XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBxdWVyeSBvZiBwYXJhbXMucXVlcnkpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmNoZWNrSWQocmVxdWVzdCwgcXVlcnksIF9pZCA9PiB7Ly92YWxpZGF0ZSBfaWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnkuX2lkID0gX2lkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LmFkZChxdWVyeSk7Ly9hZGRcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuY2hlY2tJZChyZXF1ZXN0LCBwYXJhbXMucXVlcnksIF9pZCA9PiB7Ly92YWxpZGF0ZSBfaWRcclxuICAgICAgICAgICAgICAgICAgICBwYXJhbXMucXVlcnkuX2lkID0gX2lkO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3QuYWRkKHBhcmFtcy5xdWVyeSk7Ly9hZGRcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5pbnNlcnQgPSBhc3luYyBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICAgICAgbGV0IGlzQ29sbGVjdGlvbiA9IGF3YWl0IHNlbGYuY29sbGVjdGlvbkV4aXN0cyhwYXJhbXMuY29sbGVjdGlvbik7XHJcbiAgICAgICAgaWYgKGlzQ29sbGVjdGlvbikgey8vY29sbGVjdGlvbiBpcyBleGlzdGluZ1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5vcGVuKClcclxuICAgICAgICAgICAgICAgIC50aGVuKGRiID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5hZGQocGFyYW1zLCBkYik7Ly9hZGQgdG8gY29sbGVjdGlvblxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5jcmVhdGVDb2xsZWN0aW9uKHBhcmFtcy5jb2xsZWN0aW9uKS8vY3JlYXRlIGNvbGxlY3Rpb25cclxuICAgICAgICAgICAgICAgIC50aGVuKGRiID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5hZGQocGFyYW1zLCBkYik7Ly9hZGQgdG8gbmV3IENvbGxlY3Rpb25cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnVwZGF0ZSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBzZWxmLm9wZW4oKS50aGVuKGRiID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyhwYXJhbXMuY29sbGVjdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoJ0NvbGxlY3Rpb24gbm90IGZvdW5kJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRyYW5zYWN0aW9uID0gZGIudHJhbnNhY3Rpb24ocGFyYW1zLmNvbGxlY3Rpb24sICdyZWFkd3JpdGUnKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmVycm9yID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChldmVudC50YXJnZXQuZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IGFjdGlvbjogJ3VwZGF0ZScsIGRvY3VtZW50cyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgc3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShwYXJhbXMuY29sbGVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHN0b3JlLm9wZW5DdXJzb3IoKTtcclxuICAgICAgICAgICAgICAgIGxldCBkb2N1bWVudHMgPSB7fTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXZlbnQudGFyZ2V0LmVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjdXJzb3IgPSBldmVudC50YXJnZXQucmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJzb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iamVjdExpYnJhcnkuaXNTdWJPYmplY3QoY3Vyc29yLnZhbHVlLCBwYXJhbXMuY2hlY2spKSB7Ly9yZXRyaWV2ZSB0aGUgbWF0Y2hlZCBkb2N1bWVudHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgaW4gcGFyYW1zLnF1ZXJ5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnZhbHVlW2ldID0gcGFyYW1zLnF1ZXJ5W2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlcyA9IGN1cnNvci51cGRhdGUoY3Vyc29yLnZhbHVlKTsvL3VwZGF0ZVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMub25lcnJvciA9IChyRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzW3JFdmVudC50YXJnZXQucmVzdWx0XSA9IHsgdmFsdWU6IGN1cnNvci52YWx1ZSwgc3RhdHVzOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzLm9uc3VjY2VzcyA9IChyRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnRzW3JFdmVudC50YXJnZXQucmVzdWx0XSA9IHsgdmFsdWU6IGN1cnNvci52YWx1ZSwgc3RhdHVzOiB0cnVlIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1zLm1hbnkgPT0gdHJ1ZSB8fCBmb3VuZCA9PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnNhdmUgPSBmdW5jdGlvbiAocGFyYW1zID0geyBjb2xsZWN0aW9uOiAnJywgcXVlcnk6IHt9LCBjaGVjazoge30gfSkge1xyXG4gICAgICAgIC8vY2hlY2sgZXhpc3RlbmNlIG9mIGRvY3VtZW50XHJcbiAgICAgICAgcmV0dXJuIHNlbGYuZG9jdW1lbnRFeGlzdHMoeyBjb2xsZWN0aW9uOiBwYXJhbXMuY29sbGVjdGlvbiwgcXVlcnk6IHBhcmFtcy5jaGVjayB9KS50aGVuKGV4aXN0cyA9PiB7XHJcbiAgICAgICAgICAgIGlmIChleGlzdHMgPT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmluc2VydChwYXJhbXMpOy8vaW5zZXJ0IGlmIG5vdCBmb3VuZFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYudXBkYXRlKHBhcmFtcyk7Ly8gdXBkYXRlIGlmIGZvdW5kXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmRlbGV0ZSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgICAgICBsZXQgZm91bmRDb3VudCA9IDAsIHJlbW92ZWRDb3VudCA9IDA7Ly9zZXQgdGhlIGNvdW50ZXJzXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgc2VsZi5maW5kKHBhcmFtcykudGhlbihmb3VuZCA9PiB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLm9wZW4oKS50aGVuKGRiID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdHJhbnNhY3Rpb24gPSBkYi50cmFuc2FjdGlvbihwYXJhbXMuY29sbGVjdGlvbiwgJ3JlYWR3cml0ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHBhcmFtcy5jb2xsZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ub25lcnJvciA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgYWN0aW9uOiAnZGVsZXRlJywgcmVtb3ZlZENvdW50LCBvazogcmVtb3ZlZENvdW50ID09IGZvdW5kQ291bnQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShmb3VuZCkpIHsvL2lmIG1hbnlcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRDb3VudCA9IGZvdW5kLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZGF0YSBvZiBmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBzdG9yZS5kZWxldGUoZGF0YS5faWQpOy8vZGVsZXRlIGVhY2hcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRXJyb3Igd2hpbGUgZGVsZXRpbmcgZG9jdW1lbnRzID0+ICR7ZXZlbnQudGFyZ2V0LmVycm9yfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWRDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZENvdW50ID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlcXVlc3QgPSBzdG9yZS5kZWxldGUoZm91bmQuX2lkKTsvL2RlbGV0ZSBkb2N1bWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRXJyb3Igd2hpbGUgZGVsZXRpbmcgZG9jdW1lbnRzID0+ICR7ZXZlbnQudGFyZ2V0LmVycm9yfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWRDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNlbGY7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSW5kZXhlZExpYnJhcnk7XHJcbiIsImxldCBJY29ucyA9IHt9O1xyXG5cclxuSWNvbnNbJ2FkZHJlc3MtYm9vayddID0gJ2ZhcywgZmEtYWRkcmVzcy1ib29rJztcclxuSWNvbnNbJ2FtYXpvbiddID0gJ2ZhcywgZmEtYW1hem9uJztcclxuSWNvbnNbJ2FtYnVsYW5jZSddID0gJ2ZhcywgZmEtYW1idWxhbmNlJztcclxuSWNvbnNbJ2FuZHJvaWQnXSA9ICdmYXMsIGZhLWFuZHJvaWQnO1xyXG5JY29uc1snYXBwbGUnXSA9ICdmYXMsIGZhLWFwcGxlJztcclxuSWNvbnNbJ2FzdGVyaXNrJ10gPSAnZmFzLCBmYS1hc3Rlcmlzayc7XHJcbkljb25zWydhdCddID0gJ2ZhcywgZmEtYXQnO1xyXG5JY29uc1snYmFja3dhcmQnXSA9ICdmYXMsIGZhLWJhY2t3YXJkJztcclxuSWNvbnNbJ2JhbmsnXSA9ICdmYXMsIGZhLWJhbmsnO1xyXG5JY29uc1snYmF0dGVyeSddID0gJ2ZhcywgZmEtYmF0dGVyeSc7XHJcbkljb25zWydiZWQnXSA9ICdmYXMsIGZhLWJlZCc7XHJcbkljb25zWydiZWxsJ10gPSAnZmFzLCBmYS1iZWxsJztcclxuSWNvbnNbJ2JpY3ljbGUnXSA9ICdmYXMsIGZhLWJpY3ljbGUnO1xyXG5JY29uc1snYmlydGhkYXktY2FrZSddID0gJ2ZhcywgZmEtYmlydGhkYXktY2FrZSc7XHJcbkljb25zWydiaXRidWNrZXQnXSA9ICdmYXMsIGZhLWJpdGJ1Y2tldCc7XHJcbkljb25zWydiaXRjb2luJ10gPSAnZmFzLCBmYS1iaXRjb2luJztcclxuSWNvbnNbJ2JsdWV0b290aCddID0gJ2ZhcywgZmEtYmx1ZXRvb3RoJztcclxuSWNvbnNbJ2JvbHQnXSA9ICdmYXMsIGZhLWJvbHQnO1xyXG5JY29uc1snYm9vayddID0gJ2ZhcywgZmEtYm9vayc7XHJcbkljb25zWydidXMnXSA9ICdmYXMsIGZhLWJ1cyc7XHJcbkljb25zWydjYWInXSA9ICdmYXMsIGZhLWNhYic7XHJcbkljb25zWydjYWxjdWxhdG9yJ10gPSAnZmFzLCBmYS1jYWxjdWxhdG9yJztcclxuSWNvbnNbJ2NhbWVyYSddID0gJ2ZhcywgZmEtY2FtZXJhJztcclxuSWNvbnNbJ2NhciddID0gJ2ZhcywgZmEtY2FyJztcclxuSWNvbnNbJ2NlcnRpZmljYXRlJ10gPSAnZmFzLCBmYS1jZXJ0aWZpY2F0ZSc7XHJcbkljb25zWydjaGlsZCddID0gJ2ZhcywgZmEtY2hpbGQnO1xyXG5JY29uc1snY2hyb21lJ10gPSAnZmFzLCBmYS1jaHJvbWUnO1xyXG5JY29uc1snY2xvdWQnXSA9ICdmYXMsIGZhLWNsb3VkJztcclxuSWNvbnNbJ2NvZmZlZSddID0gJ2ZhcywgZmEtY29mZmVlJztcclxuSWNvbnNbJ2NvbW1lbnQnXSA9ICdmYXMsIGZhLWNvbW1lbnQnO1xyXG5JY29uc1snY29tcGFzcyddID0gJ2ZhcywgZmEtY29tcGFzcyc7XHJcbkljb25zWydjb3B5J10gPSAnZmFzLCBmYS1jb3B5JztcclxuSWNvbnNbJ2NvcHlyaWdodCddID0gJ2ZhcywgZmEtY29weXJpZ2h0JztcclxuSWNvbnNbJ2Nsb25lJ10gPSAnZmFzLCBmYS1jbG9uZSc7XHJcbkljb25zWydjcmVkaXQtY2FyZCddID0gJ2ZhcywgZmEtY3JlZGl0LWNhcmQnO1xyXG5JY29uc1snY3ViZSddID0gJ2ZhcywgZmEtY3ViZSc7XHJcbkljb25zWydkZXNrdG9wJ10gPSAnZmFzLCBmYS1kZXNrdG9wJztcclxuSWNvbnNbJ2RpYW1vbmQnXSA9ICdmYXMsIGZhLWRpYW1vbmQnO1xyXG5JY29uc1snZG93bmxvYWQnXSA9ICdmYXMsIGZhLWRvd25sb2FkJztcclxuSWNvbnNbJ2RyaXZlcnMtbGljZW5zZSddID0gJ2ZhcywgZmEtZHJpdmVycy1saWNlbnNlJztcclxuSWNvbnNbJ2Ryb3Bib3gnXSA9ICdmYXMsIGZhLWRyb3Bib3gnO1xyXG5JY29uc1snZHJ1cGFsJ10gPSAnZmFzLCBmYS1kcnVwYWwnO1xyXG5JY29uc1snZWRnZSddID0gJ2ZhcywgZmEtZWRnZSc7XHJcbkljb25zWydlZGl0J10gPSAnZmFzLCBmYS1lZGl0JztcclxuSWNvbnNbJ2VqZWN0J10gPSAnZmFzLCBmYS1lamVjdCc7XHJcbkljb25zWydlbGxpcHNpcy1oJ10gPSAnZmFzLCBmYS1lbGxpcHNpcy1oJztcclxuSWNvbnNbJ2VudmVsb3BlJ10gPSAnZmFzLCBmYS1lbnZlbG9wZSc7XHJcbkljb25zWydlcmFzZXInXSA9ICdmYXMsIGZhLWVyYXNlcic7XHJcbkljb25zWydleGNoYW5nZSddID0gJ2ZhcywgZmEtZXhjaGFuZ2UnO1xyXG5JY29uc1snZXhjbGFtYXRpb24nXSA9ICdmYXMsIGZhLWV4Y2xhbWF0aW9uJztcclxuSWNvbnNbJ2V4cGFuZCddID0gJ2ZhcywgZmEtZXhwYW5kJztcclxuSWNvbnNbJ2V5ZSddID0gJ2ZhcywgZmEtZXllJztcclxuSWNvbnNbJ2V5ZS1zbGFzaCddID0gJ2ZhcywgZmEtZXllLXNsYXNoJztcclxuSWNvbnNbJ2ZheCddID0gJ2ZhcywgZmEtZmF4JztcclxuSWNvbnNbJ2ZlbWFsZSddID0gJ2ZhcywgZmEtZmVtYWxlJztcclxuSWNvbnNbJ2ZpbGUnXSA9ICdmYXMsIGZhLWZpbGUnO1xyXG5JY29uc1snZmlsbSddID0gJ2ZhcywgZmEtZmlsbSc7XHJcbkljb25zWydmaXJlJ10gPSAnZmFzLCBmYS1maXJlJztcclxuSWNvbnNbJ2ZsYWcnXSA9ICdmYXMsIGZhLWZsYWcnO1xyXG5JY29uc1snZmxpY2tyJ10gPSAnZmFzLCBmYS1mbGlja3InO1xyXG5JY29uc1snZm9sZGVyJ10gPSAnZmFzLCBmYS1mb2xkZXInO1xyXG5JY29uc1snZm9yd2FyZCddID0gJ2ZhcywgZmEtZm9yd2FyZCc7XHJcbkljb25zWydmb3Vyc3F1YXJlJ10gPSAnZmFzLCBmYS1mb3Vyc3F1YXJlJztcclxuSWNvbnNbJ2dpZnQnXSA9ICdmYXMsIGZhLWdpZnQnO1xyXG5JY29uc1snZ2xhc3MnXSA9ICdmYXMsIGZhLWdsYXNzJztcclxuSWNvbnNbJ2dsb2JlJ10gPSAnZmFzLCBmYS1nbG9iZSc7XHJcbkljb25zWydnb29nbGUnXSA9ICdmYXMsIGZhLWdvb2dsZSc7XHJcbkljb25zWydncmFkdWF0aW9uLWNhcCddID0gJ2ZhcywgZmEtZ3JhZHVhdGlvbi1jYXAnO1xyXG5JY29uc1snZ3JvdXAnXSA9ICdmYXMsIGZhLWdyb3VwJztcclxuSWNvbnNbJ2hhc2h0YWcnXSA9ICdmYXMsIGZhLWhhc2h0YWcnO1xyXG5JY29uc1snaGVhZHBob25lcyddID0gJ2ZhcywgZmEtaGVhZHBob25lcyc7XHJcbkljb25zWydoZWFydCddID0gJ2ZhcywgZmEtaGVhcnQnO1xyXG5JY29uc1snaGlzdG9yeSddID0gJ2ZhcywgZmEtaGlzdG9yeSc7XHJcbkljb25zWydob21lJ10gPSAnZmFzLCBmYS1ob21lJztcclxuSWNvbnNbJ2hvdGVsJ10gPSAnZmFzLCBmYS1ob3RlbCc7XHJcbkljb25zWydob3VyZ2xhc3MnXSA9ICdmYXMsIGZhLWhvdXJnbGFzcyc7XHJcbkljb25zWydpbWFnZSddID0gJ2ZhcywgZmEtaW1hZ2UnO1xyXG5JY29uc1snaW1kYiddID0gJ2ZhcywgZmEtaW1kYic7XHJcbkljb25zWydpbmJveCddID0gJ2ZhcywgZmEtaW5ib3gnO1xyXG5JY29uc1snaW5kdXN0cnknXSA9ICdmYXMsIGZhLWluZHVzdHJ5JztcclxuSWNvbnNbJ2luZm8nXSA9ICdmYXMsIGZhLWluZm8nO1xyXG5JY29uc1snaW5zdGFncmFtJ10gPSAnZmFzLCBmYS1pbnN0YWdyYW0nO1xyXG5JY29uc1sna2V5J10gPSAnZmFzLCBmYS1rZXknO1xyXG5JY29uc1snbGFuZ3VhZ2UnXSA9ICdmYXMsIGZhLWxhbmd1YWdlJztcclxuSWNvbnNbJ2xhcHRvcCddID0gJ2ZhcywgZmEtbGFwdG9wJztcclxuSWNvbnNbJ2xlYWYnXSA9ICdmYXMsIGZhLWxlYWYnO1xyXG5JY29uc1snbGVnYWwnXSA9ICdmYXMsIGZhLWxlZ2FsJztcclxuSWNvbnNbJ2xpZmUtYm91eSddID0gJ2ZhcywgZmEtbGlmZS1ib3V5JztcclxuSWNvbnNbJ2xpbmtlZGluJ10gPSAnZmFzLCBmYS1saW5rZWRpbic7XHJcbkljb25zWydsaW51eCddID0gJ2ZhcywgZmEtbGludXgnO1xyXG5JY29uc1snbG9jayddID0gJ2ZhcywgZmEtbG9jayc7XHJcbkljb25zWydtYWdpYyddID0gJ2ZhcywgZmEtbWFnaWMnO1xyXG5JY29uc1snbWFnbmV0J10gPSAnZmFzLCBmYS1tYWduZXQnO1xyXG5JY29uc1snbWFsZSddID0gJ2ZhcywgZmEtbWFsZSc7XHJcbkljb25zWydtYXAnXSA9ICdmYXMsIGZhLW1hcCc7XHJcbkljb25zWydtaWNyb3Bob25lJ10gPSAnZmFzLCBmYS1taWNyb3Bob25lJztcclxuSWNvbnNbJ21vYmlsZSddID0gJ2ZhcywgZmEtbW9iaWxlJztcclxuSWNvbnNbJ21vbmV5J10gPSAnZmFzLCBmYS1tb25leSc7XHJcbkljb25zWydtb3RvcmN5Y2xlJ10gPSAnZmFzLCBmYS1tb3RvcmN5Y2xlJztcclxuSWNvbnNbJ211c2ljJ10gPSAnZmFzLCBmYS1tdXNpYyc7XHJcbkljb25zWydvcGVyYSddID0gJ2ZhcywgZmEtb3BlcmEnO1xyXG5JY29uc1sncGFpbnQtYnJ1c2gnXSA9ICdmYXMsIGZhLXBhaW50LWJydXNoJztcclxuSWNvbnNbJ3BhcGVyLXBsYW5lJ10gPSAnZmFzLCBmYS1wYXBlci1wbGFuZSc7XHJcbkljb25zWydwYXVzZSddID0gJ2ZhcywgZmEtcGF1c2UnO1xyXG5JY29uc1sncGF3J10gPSAnZmFzLCBmYS1wYXcnO1xyXG5JY29uc1sncGF5cGFsJ10gPSAnZmFzLCBmYS1wYXlwYWwnO1xyXG5JY29uc1sncGVuJ10gPSAnZmFzLCBmYS1wZW4nO1xyXG5JY29uc1sncGVuY2lsJ10gPSAnZmFzLCBmYS1wZW5jaWwnO1xyXG5JY29uc1sncGhvbmUnXSA9ICdmYXMsIGZhLXBob25lJztcclxuSWNvbnNbJ3Bob3RvJ10gPSAnZmFzLCBmYS1waG90byc7XHJcbkljb25zWydwaW50ZXJlc3QnXSA9ICdmYXMsIGZhLXBpbnRlcmVzdCc7XHJcbkljb25zWydwbGFuZSddID0gJ2ZhcywgZmEtcGxhbmUnO1xyXG5JY29uc1sncGxheSddID0gJ2ZhcywgZmEtcGxheSc7XHJcbkljb25zWydwbHVnJ10gPSAnZmFzLCBmYS1wbHVnJztcclxuSWNvbnNbJ3BsdXMnXSA9ICdmYXMsIGZhLXBsdXMnO1xyXG5JY29uc1sncG9kY2FzdCddID0gJ2ZhcywgZmEtcG9kY2FzdCc7XHJcbkljb25zWydxdWVzdGlvbiddID0gJ2ZhcywgZmEtcXVlc3Rpb24nO1xyXG5JY29uc1sncXVvcmEnXSA9ICdmYXMsIGZhLXF1b3JhJztcclxuSWNvbnNbJ3JlY3ljbGUnXSA9ICdmYXMsIGZhLXJlY3ljbGUnO1xyXG5JY29uc1sncmVkZGl0J10gPSAnZmFzLCBmYS1yZWRkaXQnO1xyXG5JY29uc1sncmVkbyddID0gJ2ZhcywgZmEtcmVkbyc7XHJcbkljb25zWydyZWZyZXNoJ10gPSAnZmFzLCBmYS1yZWZyZXNoJztcclxuSWNvbnNbJ3JlcGx5J10gPSAnZmFzLCBmYS1yZXBseSc7XHJcbkljb25zWydyZXNpc3RhbmNlJ10gPSAnZmFzLCBmYS1yZXNpc3RhbmNlJztcclxuSWNvbnNbJ3JldHdlZXQnXSA9ICdmYXMsIGZhLXJldHdlZXQnO1xyXG5JY29uc1sncm9hZCddID0gJ2ZhcywgZmEtcm9hZCc7XHJcbkljb25zWydyb2NrZXQnXSA9ICdmYXMsIGZhLXJvY2tldCc7XHJcbkljb25zWydyc3MnXSA9ICdmYXMsIGZhLXJzcyc7XHJcbkljb25zWydzYWZhcmknXSA9ICdmYXMsIGZhLXNhZmFyaSc7XHJcbkljb25zWydzY3JpYmUnXSA9ICdmYXMsIGZhLXNjcmliZSc7XHJcbkljb25zWydzZWFyY2gnXSA9ICdmYXMsIGZhLXNlYXJjaCc7XHJcbkljb25zWydzZW5kJ10gPSAnZmFzLCBmYS1zZW5kJztcclxuSWNvbnNbJ3NlcnZlciddID0gJ2ZhcywgZmEtc2VydmVyJztcclxuSWNvbnNbJ3NoaXAnXSA9ICdmYXMsIGZhLXNoaXAnO1xyXG5JY29uc1snc2lnbi1pbiddID0gJ2ZhcywgZmEtc2lnbi1pbic7XHJcbkljb25zWydzaXRlbWFwJ10gPSAnZmFzLCBmYS1zaXRlbWFwJztcclxuSWNvbnNbJ3NreWF0bGFzJ10gPSAnZmFzLCBmYS1za3lhdGxhcyc7XHJcbkljb25zWydza3lwZSddID0gJ2ZhcywgZmEtc2t5cGUnO1xyXG5JY29uc1snc2xpZGVzaGFyZSddID0gJ2ZhcywgZmEtc2xpZGVzaGFyZSc7XHJcbkljb25zWydzbmFwY2hhdCddID0gJ2ZhcywgZmEtc25hcGNoYXQnO1xyXG5JY29uc1snc29ydCddID0gJ2ZhcywgZmEtc29ydCc7XHJcbkljb25zWydzb3VuZGNsb3VkJ10gPSAnZmFzLCBmYS1zb3VuZGNsb3VkJztcclxuSWNvbnNbJ3Nwb29uJ10gPSAnZmFzLCBmYS1zcG9vbic7XHJcbkljb25zWydzcG90aWZ5J10gPSAnZmFzLCBmYS1zcG90aWZ5JztcclxuSWNvbnNbJ3NxdWFyZSddID0gJ2ZhcywgZmEtc3F1YXJlJztcclxuSWNvbnNbJ3N0YWNrLWV4Y2hhbmdlJ10gPSAnZmFzLCBmYS1zdGFjay1leGNoYW5nZSc7XHJcbkljb25zWydzdGFyJ10gPSAnZmFzLCBmYS1zdGFyJztcclxuSWNvbnNbJ3N0ZWFtJ10gPSAnZmFzLCBmYS1zdGVhbSc7XHJcbkljb25zWydzdGlja3ktbm90ZSddID0gJ2ZhcywgZmEtc3RpY2t5LW5vdGUnO1xyXG5JY29uc1snc3RvcCddID0gJ2ZhcywgZmEtc3RvcCc7XHJcbkljb25zWydzdHJlZXQtdmlldyddID0gJ2ZhcywgZmEtc3RyZWV0LXZpZXcnO1xyXG5JY29uc1snc3Vid2F5J10gPSAnZmFzLCBmYS1zdWJ3YXknO1xyXG5JY29uc1snc3VpdGNhc2UnXSA9ICdmYXMsIGZhLXN1aXRjYXNlJztcclxuSWNvbnNbJ3N1cHBvcnQnXSA9ICdmYXMsIGZhLXN1cHBvcnQnO1xyXG5JY29uc1sndGFza3MnXSA9ICdmYXMsIGZhLXRhc2tzJztcclxuSWNvbnNbJ3RheGknXSA9ICdmYXMsIGZhLXRheGknO1xyXG5JY29uc1sndGVsZWdyYW0nXSA9ICdmYXMsIGZhLXRlbGVncmFtJztcclxuSWNvbnNbJ3RlbGV2aXNpb24nXSA9ICdmYXMsIGZhLXRlbGV2aXNpb24nO1xyXG5JY29uc1sndGVybWluYWwnXSA9ICdmYXMsIGZhLXRlcm1pbmFsJztcclxuSWNvbnNbJ3RoZXJtb21ldGVyJ10gPSAnZmFzLCBmYS10aGVybW9tZXRlcic7XHJcbkljb25zWyd0aWNrZXQnXSA9ICdmYXMsIGZhLXRpY2tldCc7XHJcbkljb25zWyd0aW1lcyddID0gJ2ZhcywgZmEtdGltZXMnO1xyXG5JY29uc1sndHJhaW4nXSA9ICdmYXMsIGZhLXRyYWluJztcclxuSWNvbnNbJ3RyYXNoJ10gPSAnZmFzLCBmYS10cmFzaCc7XHJcbkljb25zWyd0cmVlJ10gPSAnZmFzLCBmYS10cmVlJztcclxuSWNvbnNbJ3Ryb3BoeSddID0gJ2ZhcywgZmEtdHJvcGh5JztcclxuSWNvbnNbJ3RydWNrJ10gPSAnZmFzLCBmYS10cnVjayc7XHJcbkljb25zWyd0dW1ibHInXSA9ICdmYXMsIGZhLXR1bWJscic7XHJcbkljb25zWyd0diddID0gJ2ZhcywgZmEtdHYnO1xyXG5JY29uc1sndHdpdHRlciddID0gJ2ZhcywgZmEtdHdpdHRlcic7XHJcbkljb25zWyd1bWJyZWxsYSddID0gJ2ZhcywgZmEtdW1icmVsbGEnO1xyXG5JY29uc1sndW5pdmVyc2l0eSddID0gJ2ZhcywgZmEtdW5pdmVyc2l0eSc7XHJcbkljb25zWyd1bmxvY2snXSA9ICdmYXMsIGZhLXVubG9jayc7XHJcbkljb25zWyd1cGxvYWQnXSA9ICdmYXMsIGZhLXVwbG9hZCc7XHJcbkljb25zWyd1c2InXSA9ICdmYXMsIGZhLXVzYic7XHJcbkljb25zWyd1c2VyJ10gPSAnZmFzLCBmYS11c2VyJztcclxuSWNvbnNbJ3ZpZGVvLWNhbWVyYSddID0gJ2ZhcywgZmEtdmlkZW8tY2FtZXJhJztcclxuSWNvbnNbJ3ZpbWVvJ10gPSAnZmFzLCBmYS12aW1lbyc7XHJcbkljb25zWyd3YXJuaW5nJ10gPSAnZmFzLCBmYS13YXJuaW5nJztcclxuSWNvbnNbJ3dlY2hhdCddID0gJ2ZhcywgZmEtd2VjaGF0JztcclxuSWNvbnNbJ3dlaWJvJ10gPSAnZmFzLCBmYS13ZWlibyc7XHJcbkljb25zWyd3aGF0c2FwcCddID0gJ2ZhcywgZmEtd2hhdHNhcHAnO1xyXG5JY29uc1snd2hlZWxjaGFpciddID0gJ2ZhcywgZmEtd2hlZWxjaGFpcic7XHJcbkljb25zWyd3aWZpJ10gPSAnZmFzLCBmYS13aWZpJztcclxuSWNvbnNbJ3dpa2lwZWRpYS13J10gPSAnZmFzLCBmYS13aWtpcGVkaWEtdyc7XHJcbkljb25zWyd3b3JkcHJlc3MnXSA9ICdmYXMsIGZhLXdvcmRwcmVzcyc7XHJcbkljb25zWyd5ZWxwJ10gPSAnZmFzLCBmYS15ZWxwJztcclxuSWNvbnNbJ3lvYXN0J10gPSAnZmFzLCBmYS15b2FzdCc7XHJcbkljb25zWyd5b3V0dWJlJ10gPSAnZmFzLCBmYS15b3V0dWJlJztcclxuSWNvbnNbJ3VuZG8nXSA9ICdmYXMsIGZhLXVuZG8nO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSWNvbnM7IiwiY29uc3QgRnVuYyA9IHJlcXVpcmUoJy4vRnVuYycpO1xyXG5jb25zdCBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vVGVtcGxhdGUnKTtcclxuXHJcbmZ1bmN0aW9uIENvbG9yUGlja2VyKCkge1xyXG5cclxuICAgIGxldCBzZWxmID0ge307XHJcbiAgICBzZWxmLmZ1bmMgPSBuZXcgRnVuYygpO1xyXG4gICAgc2VsZi5lbGVtZW50TW9kaWZpZXIgPSBuZXcgVGVtcGxhdGUoKTtcclxuICAgIHNlbGYuZWxlbWVudE1vZGlmaWVyLmVsZW1lbnRMaWJyYXJ5KCk7XHJcbiAgICBzZWxmLmNvbG9ySW5kaWNhdG9yUG9zaXRpb24gPSB7IHg6IDAsIHk6IDAgfTtcclxuICAgIHNlbGYub3BhY2l0eUluZGljYXRvclBvc2l0aW9uID0geyB4OiAwLCB5OiAwIH07XHJcbiAgICBzZWxmLmNvbnZlcnRUbyA9ICdSR0InO1xyXG5cclxuICAgIHNlbGYuaW5pdCA9IChwYXJhbXMpID0+IHtcclxuICAgICAgICBzZWxmLnBpY2tlciA9IHNlbGYuZWxlbWVudE1vZGlmaWVyLmNyZWF0ZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBjbGFzczogJ2NvbG9yLXBpY2tlcicgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdjb2xvci1waWNrZXItc2V0dGVycycgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGlkOiAnY29sb3ItcGlja2VyLWNvbG9ycy13aW5kb3cnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnY2FudmFzJywgYXR0cmlidXRlczogeyBpZDogJ2NvbG9yLXBpY2tlci1jb2xvcnMnIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBpZDogJ2NvbG9yLXBpY2tlci1jb2xvci1pbmRpY2F0b3InIH0gfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdjb2xvci1waWNrZXItb3BhY2l0aWVzLXdpbmRvdycgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdjYW52YXMnLCBhdHRyaWJ1dGVzOiB7IGlkOiAnY29sb3ItcGlja2VyLW9wYWNpdGllcycgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGlkOiAnY29sb3ItcGlja2VyLW9wYWNpdHktaW5kaWNhdG9yJyB9IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdjb2xvci1waWNrZXItcmVzdWx0JyB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBpZDogJ3BpY2tlZC1jb2xvcicgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdwaWNrZWQtY29sb3Itd2luZG93JyB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ3NlbGVjdCcsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdwaWNrZWQtY29sb3Itc2V0dGVyJyB9LCBvcHRpb25zOiBbJ1JHQicsICdIRVgnLCAnSFNMJ10gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBpZDogJ3BpY2tlZC1jb2xvci12YWx1ZScgfSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2VsZi5jb2xvcldpbmRvdyA9IHNlbGYucGlja2VyLmZpbmQoJyNjb2xvci1waWNrZXItY29sb3JzLXdpbmRvdycpO1xyXG4gICAgICAgIHNlbGYub3BhY2l0eVdpbmRvdyA9IHNlbGYucGlja2VyLmZpbmQoJyNjb2xvci1waWNrZXItb3BhY2l0aWVzLXdpbmRvdycpO1xyXG4gICAgICAgIHNlbGYuY29sb3JDYW52YXMgPSBzZWxmLnBpY2tlci5maW5kKCcjY29sb3ItcGlja2VyLWNvbG9ycycpO1xyXG4gICAgICAgIHNlbGYub3BhY2l0eUNhbnZhcyA9IHNlbGYucGlja2VyLmZpbmQoJyNjb2xvci1waWNrZXItb3BhY2l0aWVzJyk7XHJcbiAgICAgICAgc2VsZi5jb2xvck1hcmtlciA9IHNlbGYucGlja2VyLmZpbmQoJyNjb2xvci1waWNrZXItY29sb3ItaW5kaWNhdG9yJyk7XHJcbiAgICAgICAgc2VsZi5vcGFjaXR5TWFya2VyID0gc2VsZi5waWNrZXIuZmluZCgnI2NvbG9yLXBpY2tlci1vcGFjaXR5LWluZGljYXRvcicpO1xyXG4gICAgICAgIHNlbGYud2lkdGggPSBwYXJhbXMud2lkdGg7XHJcbiAgICAgICAgc2VsZi5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0O1xyXG4gICAgICAgIHNlbGYucGlja2VkQ29sb3IgPSBwYXJhbXMuY29sb3IgfHwgJ3JnYigwLCAwLCAwKSc7XHJcbiAgICAgICAgc2VsZi5jb2xvcldpbmRvdy5jc3MoeyBoZWlnaHQ6IHNlbGYuaGVpZ2h0ICsgJ3B4JyB9KTtcclxuICAgICAgICBzZWxmLmNvbG9yQ2FudmFzLndpZHRoID0gc2VsZi53aWR0aDtcclxuICAgICAgICBzZWxmLmNvbG9yQ2FudmFzLmhlaWdodCA9IHNlbGYuaGVpZ2h0O1xyXG4gICAgICAgIHNlbGYub3BhY2l0eVdpbmRvdy5jc3MoeyBoZWlnaHQ6IHNlbGYuaGVpZ2h0ICsgJ3B4JyB9KTtcclxuICAgICAgICBzZWxmLm9wYWNpdHlDYW52YXMuaGVpZ2h0ID0gc2VsZi5oZWlnaHQ7XHJcbiAgICAgICAgc2VsZi5vcGFjaXR5Q2FudmFzLndpZHRoID0gMjA7XHJcblxyXG4gICAgICAgIC8vdGhlIGNvbnRleHRcclxuICAgICAgICBzZWxmLmNvbG9yQ29udGV4dCA9IHNlbGYuY29sb3JDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgICBzZWxmLm9wYWNpdHlDb250ZXh0ID0gc2VsZi5vcGFjaXR5Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4gICAgICAgIHNlbGYucGlja2VyLmZpbmQoJyNwaWNrZWQtY29sb3ItdmFsdWUnKS5pbm5lclRleHQgPSBzZWxmLnBpY2tlZENvbG9yO1xyXG4gICAgICAgIHNlbGYucGlja2VyLmZpbmQoJyNwaWNrZWQtY29sb3Itc2V0dGVyJykub25DaGFuZ2VkKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgc2VsZi5jb252ZXJ0VG8gPSB2YWx1ZTtcclxuICAgICAgICAgICAgc2VsZi5yZXBseSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzZWxmLmxpc3RlbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gc2VsZi5waWNrZXI7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5jYWxpYnJhdGVDb2xvciA9ICgpID0+IHtcclxuICAgICAgICBsZXQgY29sb3JHcmFkaWVudCA9IHNlbGYuY29sb3JDb250ZXh0LmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsIDAsIHNlbGYud2lkdGgsIDApO1xyXG5cclxuICAgICAgICAvL2NvbG9yIHN0b3BzXHJcbiAgICAgICAgY29sb3JHcmFkaWVudC5hZGRDb2xvclN0b3AoMCwgXCJyZ2IoMjU1LCAwLCAwKVwiKTtcclxuICAgICAgICBjb2xvckdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjE1LCBcInJnYigyNTUsIDAsIDI1NSlcIik7XHJcbiAgICAgICAgY29sb3JHcmFkaWVudC5hZGRDb2xvclN0b3AoMC4zMywgXCJyZ2IoMCwgMCwgMjU1KVwiKTtcclxuICAgICAgICBjb2xvckdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjQ5LCBcInJnYigwLCAyNTUsIDI1NSlcIik7XHJcbiAgICAgICAgY29sb3JHcmFkaWVudC5hZGRDb2xvclN0b3AoMC42NywgXCJyZ2IoMCwgMjU1LCAwKVwiKTtcclxuICAgICAgICBjb2xvckdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjg3LCBcInJnYigyNTUsIDI1NSwgMClcIik7XHJcbiAgICAgICAgY29sb3JHcmFkaWVudC5hZGRDb2xvclN0b3AoMSwgXCJyZ2IoMjU1LCAwLCAwKVwiKTtcclxuXHJcbiAgICAgICAgc2VsZi5jb2xvckNvbnRleHQuZmlsbFN0eWxlID0gY29sb3JHcmFkaWVudDtcclxuICAgICAgICBzZWxmLmNvbG9yQ29udGV4dC5maWxsUmVjdCgwLCAwLCBzZWxmLndpZHRoLCBzZWxmLmhlaWdodCk7XHJcblxyXG4gICAgICAgIC8vYWRkIGJsYWNrIGFuZCB3aGl0ZSBzdG9wc1xyXG4gICAgICAgIGNvbG9yR3JhZGllbnQgPSBzZWxmLmNvbG9yQ29udGV4dC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCBzZWxmLmhlaWdodCk7XHJcbiAgICAgICAgY29sb3JHcmFkaWVudC5hZGRDb2xvclN0b3AoMCwgXCJyZ2JhKDI1NSwgMjU1LCAyNTUsIDEpXCIpO1xyXG4gICAgICAgIGNvbG9yR3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuNSwgXCJyZ2JhKDI1NSwgMjU1LCAyNTUsIDApXCIpO1xyXG4gICAgICAgIGNvbG9yR3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuNSwgXCJyZ2JhKDAsIDAsIDAsIDApXCIpO1xyXG4gICAgICAgIGNvbG9yR3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsIFwicmdiYSgwLCAwLCAwLCAxKVwiKTtcclxuXHJcbiAgICAgICAgc2VsZi5jb2xvckNvbnRleHQuZmlsbFN0eWxlID0gY29sb3JHcmFkaWVudDtcclxuICAgICAgICBzZWxmLmNvbG9yQ29udGV4dC5maWxsUmVjdCgwLCAwLCBzZWxmLndpZHRoLCBzZWxmLmhlaWdodCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5jYWxpYnJhdGVPcGFjaXR5ID0gKCkgPT4ge1xyXG4gICAgICAgIGxldCByZ2JhO1xyXG5cclxuICAgICAgICBzZWxmLm9wYWNpdHlDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBzZWxmLm9wYWNpdHlDYW52YXMud2lkdGgsIHNlbGYuaGVpZ2h0KTtcclxuICAgICAgICBsZXQgb3BhY2l0eUdyYWRpZW50ID0gc2VsZi5vcGFjaXR5Q29udGV4dC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCBzZWxmLm9wYWNpdHlDYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDEwMDsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICAgICAgcmdiYSA9IHNlbGYuYWRkT3BhY2l0eShzZWxmLnBpY2tlZENvbG9yLCBpIC8gMTAwKTtcclxuICAgICAgICAgICAgb3BhY2l0eUdyYWRpZW50LmFkZENvbG9yU3RvcChpIC8gMTAwLCByZ2JhKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNlbGYub3BhY2l0eUNvbnRleHQuZmlsbFN0eWxlID0gb3BhY2l0eUdyYWRpZW50O1xyXG4gICAgICAgIHNlbGYub3BhY2l0eUNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHNlbGYub3BhY2l0eUNhbnZhcy53aWR0aCwgc2VsZi5vcGFjaXR5Q2FudmFzLmhlaWdodCk7XHJcbiAgICAgICAgc2VsZi5vcGFjaXR5Q29udGV4dC5maWxsUmVjdCgwLCAwLCBzZWxmLm9wYWNpdHlDYW52YXMud2lkdGgsIHNlbGYub3BhY2l0eUNhbnZhcy5oZWlnaHQpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYubGlzdGVuID0gKCkgPT4ge1xyXG4gICAgICAgIGxldCBpc0NvbG9yTW91c2VEb3duID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGlzT3BhY2l0eU1vdXNlRG93biA9IGZhbHNlO1xyXG5cclxuICAgICAgICBzZWxmLnBpY2tlci5ub3RCdWJibGVkRXZlbnQoJ2NsaWNrJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICBpZiAoc2VsZi5hZGRlZCAmJiAhaXNDb2xvck1vdXNlRG93biAmJiAhaXNPcGFjaXR5TW91c2VEb3duKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmRpc3Bvc2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBjb2xvck1vdXNlRG93biA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgY3VycmVudFggPSBldmVudC5jbGllbnRYIC0gc2VsZi5jb2xvckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0O1xyXG4gICAgICAgICAgICBsZXQgY3VycmVudFkgPSBldmVudC5jbGllbnRZIC0gc2VsZi5jb2xvckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3A7XHJcblxyXG4gICAgICAgICAgICAvL2lzIG1vdXNlIGluIGNvbG9yIHBpY2tlclxyXG4gICAgICAgICAgICBpc0NvbG9yTW91c2VEb3duID0gKGN1cnJlbnRYID4gMCAmJiBjdXJyZW50WCA8IHNlbGYuY29sb3JDYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGggJiYgY3VycmVudFkgPiAwICYmIGN1cnJlbnRZIDwgc2VsZi5jb2xvckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbG9yTW91c2VNb3ZlID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChpc0NvbG9yTW91c2VEb3duKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmNvbG9ySW5kaWNhdG9yUG9zaXRpb24ueCA9IGV2ZW50LmNsaWVudFggLSBzZWxmLmNvbG9yQ2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQ7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmNvbG9ySW5kaWNhdG9yUG9zaXRpb24ueSA9IGV2ZW50LmNsaWVudFkgLSBzZWxmLmNvbG9yQ2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcclxuICAgICAgICAgICAgICAgIHNlbGYuY29sb3JNYXJrZXIuY3NzKHsgdG9wOiBzZWxmLmNvbG9ySW5kaWNhdG9yUG9zaXRpb24ueSArICdweCcsIGxlZnQ6IHNlbGYuY29sb3JJbmRpY2F0b3JQb3NpdGlvbi54ICsgJ3B4JyB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcGlja2VkID0gc2VsZi5nZXRQaWNrZWRDb2xvcigpO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5waWNrZWRDb2xvciA9IGByZ2IoJHtwaWNrZWQucn0sICR7cGlja2VkLmd9LCAke3BpY2tlZC5ifSlgO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5yZXBseSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3QgY29sb3JNb3VzZVVwID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlzQ29sb3JNb3VzZURvd24gPSBmYWxzZTtcclxuICAgICAgICAgICAgc2VsZi5jYWxpYnJhdGVPcGFjaXR5KCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9SZWdpc3RlclxyXG4gICAgICAgIHNlbGYuY29sb3JDYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBjb2xvck1vdXNlRG93bik7XHJcbiAgICAgICAgc2VsZi5jb2xvckNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGNvbG9yTW91c2VNb3ZlKTtcclxuICAgICAgICBzZWxmLmNvbG9yQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGNvbG9yTW91c2VVcCk7XHJcblxyXG4gICAgICAgIGNvbnN0IG9wYWNpdHlNb3VzZURvd24gPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRYID0gZXZlbnQuY2xpZW50WCAtIHNlbGYub3BhY2l0eUNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0O1xyXG4gICAgICAgICAgICBsZXQgY3VycmVudFkgPSBldmVudC5jbGllbnRZIC0gc2VsZi5vcGFjaXR5Q2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcclxuXHJcbiAgICAgICAgICAgIC8vaXMgbW91c2UgaW4gY29sb3IgcGlja2VyXHJcbiAgICAgICAgICAgIGlzT3BhY2l0eU1vdXNlRG93biA9IChjdXJyZW50WCA+IDAgJiYgY3VycmVudFggPCBzZWxmLm9wYWNpdHlDYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGggJiYgY3VycmVudFkgPiAwICYmIGN1cnJlbnRZIDwgc2VsZi5vcGFjaXR5Q2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3Qgb3BhY2l0eU1vdXNlTW92ZSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoaXNPcGFjaXR5TW91c2VEb3duKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLm9wYWNpdHlJbmRpY2F0b3JQb3NpdGlvbi54ID0gZXZlbnQuY2xpZW50WCAtIHNlbGYub3BhY2l0eUNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgc2VsZi5vcGFjaXR5SW5kaWNhdG9yUG9zaXRpb24ueSA9IGV2ZW50LmNsaWVudFkgLSBzZWxmLm9wYWNpdHlDYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5vcGFjaXR5TWFya2VyLmNzcyh7IHRvcDogc2VsZi5vcGFjaXR5SW5kaWNhdG9yUG9zaXRpb24ueSArICdweCcgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHBpY2tlZCA9IHNlbGYuZ2V0UGlja2VkT3BhY2l0eSgpO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5waWNrZWRDb2xvciA9IGByZ2IoJHtwaWNrZWQucn0sICR7cGlja2VkLmd9LCAke3BpY2tlZC5ifSwgJHtwaWNrZWQuYX0pYDtcclxuICAgICAgICAgICAgICAgIHNlbGYucmVwbHkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IG9wYWNpdHlNb3VzZVVwID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlzT3BhY2l0eU1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHNlbGYub3BhY2l0eUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG9wYWNpdHlNb3VzZURvd24pO1xyXG4gICAgICAgIHNlbGYub3BhY2l0eUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIG9wYWNpdHlNb3VzZU1vdmUpO1xyXG4gICAgICAgIHNlbGYub3BhY2l0eUNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBvcGFjaXR5TW91c2VVcCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5yZXBseSA9ICgpID0+IHtcclxuICAgICAgICBzZWxmLmNvbnZlckNvbG9yKCk7XHJcbiAgICAgICAgc2VsZi5waWNrZXIuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2NvbG9yQ2hhbmdlZCcpKTtcclxuICAgICAgICBzZWxmLnBpY2tlci5maW5kKCcjcGlja2VkLWNvbG9yJykuY3NzKHsgYmFja2dyb3VuZENvbG9yOiBzZWxmLmNvbnZlcnRlZENvbG9yIH0pO1xyXG4gICAgICAgIHNlbGYucGlja2VyLmZpbmQoJyNwaWNrZWQtY29sb3ItdmFsdWUnKS5pbm5lclRleHQgPSBzZWxmLmNvbnZlcnRlZENvbG9yO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuY29udmVyQ29sb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgaWYgKHNlbGYuY29udmVydFRvID09ICdIRVgnKSB7XHJcbiAgICAgICAgICAgIHNlbGYuY29udmVydGVkQ29sb3IgPSBzZWxmLnJnYlRvSGV4KHNlbGYucGlja2VkQ29sb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChzZWxmLmNvbnZlcnRUbyA9PSAnSFNMJykge1xyXG4gICAgICAgICAgICBzZWxmLmNvbnZlcnRlZENvbG9yID0gc2VsZi5yZ2JUb0hTTChzZWxmLnBpY2tlZENvbG9yKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoc2VsZi5jb252ZXJ0VG8gPT0gJ1JHQicpIHtcclxuICAgICAgICAgICAgc2VsZi5jb252ZXJ0ZWRDb2xvciA9IHNlbGYucGlja2VkQ29sb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGYub25DaGFuZ2VkID0gKGNhbGxCYWNrKSA9PiB7XHJcbiAgICAgICAgc2VsZi5waWNrZXIuYWRkRXZlbnRMaXN0ZW5lcignY29sb3JDaGFuZ2VkJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICBjYWxsQmFjayhzZWxmLmNvbnZlcnRlZENvbG9yKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmdldFBpY2tlZENvbG9yID0gKCkgPT4ge1xyXG4gICAgICAgIGxldCBpbWFnZURhdGEgPSBzZWxmLmNvbG9yQ29udGV4dC5nZXRJbWFnZURhdGEoc2VsZi5jb2xvckluZGljYXRvclBvc2l0aW9uLngsIHNlbGYuY29sb3JJbmRpY2F0b3JQb3NpdGlvbi55LCAxLCAxKTtcclxuICAgICAgICByZXR1cm4geyByOiBpbWFnZURhdGEuZGF0YVswXSwgZzogaW1hZ2VEYXRhLmRhdGFbMV0sIGI6IGltYWdlRGF0YS5kYXRhWzJdIH07XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRQaWNrZWRPcGFjaXR5ID0gKCkgPT4ge1xyXG4gICAgICAgIGxldCBpbWFnZURhdGEgPSBzZWxmLm9wYWNpdHlDb250ZXh0LmdldEltYWdlRGF0YShzZWxmLm9wYWNpdHlJbmRpY2F0b3JQb3NpdGlvbi54LCBzZWxmLm9wYWNpdHlJbmRpY2F0b3JQb3NpdGlvbi55LCAxLCAxKTtcclxuXHJcbiAgICAgICAgbGV0IGFscGhhID0gTWF0aC5jZWlsKCgoaW1hZ2VEYXRhLmRhdGFbM10gLyAyNTUpICogMTAwKSkgLyAxMDA7XHJcbiAgICAgICAgcmV0dXJuIHsgcjogaW1hZ2VEYXRhLmRhdGFbMF0sIGc6IGltYWdlRGF0YS5kYXRhWzFdLCBiOiBpbWFnZURhdGEuZGF0YVsyXSwgYTogYWxwaGEgfTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmRyYXcgPSAocGFyYW1zKSA9PiB7XHJcbiAgICAgICAgc2VsZi5pbml0KHBhcmFtcyk7XHJcbiAgICAgICAgc2VsZi5jYWxpYnJhdGVDb2xvcigpO1xyXG4gICAgICAgIHNlbGYuY2FsaWJyYXRlT3BhY2l0eSgpO1xyXG5cclxuICAgICAgICBsZXQgaW50ZXJ2YWwgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgc2VsZi5hZGRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChpbnRlcnZhbCk7XHJcbiAgICAgICAgfSwgMjAwMCk7XHJcblxyXG4gICAgICAgIHJldHVybiBzZWxmLnBpY2tlcjtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmRpc3Bvc2UgPSAoKSA9PiB7XHJcbiAgICAgICAgY2xlYXJJbnRlcnZhbChzZWxmLmludGVydmFsKTtcclxuICAgICAgICBzZWxmLnBpY2tlci5yZW1vdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmNvbG9yVHlwZSA9IChjb2xvciA9ICcjZmZmZmZmJykgPT4ge1xyXG4gICAgICAgIGxldCB0eXBlID0gJ3N0cmluZyc7XHJcbiAgICAgICAgaWYgKGNvbG9yLmluZGV4T2YoJyMnKSA9PSAwICYmIChjb2xvci5sZW5ndGggLSAxKSAlIDMgPT0gMCkge1xyXG4gICAgICAgICAgICB0eXBlID0gJ2hleCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGNvbG9yLmluZGV4T2YoJ3JnYmEnKSA9PSAwKSB7XHJcbiAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBzZWxmLmZ1bmMuaW5CZXR3ZWVuKGNvbG9yLCAncmdiYSgnLCAnKScpO1xyXG4gICAgICAgICAgICBpZiAodmFsdWVzICE9IC0xICYmIHZhbHVlcy5zcGxpdCgnLCcpLmxlbmd0aCA9PSA0KSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gJ3JnYmEnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGNvbG9yLmluZGV4T2YoJ3JnYicpID09IDApIHtcclxuICAgICAgICAgICAgbGV0IHZhbHVlcyA9IHNlbGYuZnVuYy5pbkJldHdlZW4oY29sb3IsICdyZ2IoJywgJyknKTtcclxuICAgICAgICAgICAgaWYgKHZhbHVlcyAhPSAtMSAmJiB2YWx1ZXMuc3BsaXQoJywnKS5sZW5ndGggPT0gMykge1xyXG4gICAgICAgICAgICAgICAgdHlwZSA9ICdyZ2InO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGNvbG9yLmluZGV4T2YoJ2hzbGEnKSA9PSAwKSB7XHJcbiAgICAgICAgICAgIGxldCB2YWx1ZXMgPSBzZWxmLmZ1bmMuaW5CZXR3ZWVuKGNvbG9yLCAnaHNsYSgnLCAnKScpO1xyXG4gICAgICAgICAgICBpZiAodmFsdWVzICE9IC0xICYmIHZhbHVlcy5zcGxpdCgnLCcpLmxlbmd0aCA9PSA0KSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2hzbGEnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGNvbG9yLmluZGV4T2YoJ2hzbCcpID09IDApIHtcclxuICAgICAgICAgICAgbGV0IHZhbHVlcyA9IHNlbGYuZnVuYy5pbkJldHdlZW4oY29sb3IsICdoc2woJywgJyknKTtcclxuICAgICAgICAgICAgaWYgKHZhbHVlcyAhPSAtMSAmJiB2YWx1ZXMuc3BsaXQoJywnKS5sZW5ndGggPT0gMykge1xyXG4gICAgICAgICAgICAgICAgdHlwZSA9ICdoc2wnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdHlwZTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmhleFRvUkdCID0gKGhleCA9ICcjZmZmZmZmJywgYWxwaGEgPSB0cnVlKSA9PiB7XHJcbiAgICAgICAgbGV0IHIgPSAwLCBnID0gMCwgYiA9IDAsIGEgPSAyNTU7XHJcbiAgICAgICAgaWYgKGhleC5sZW5ndGggPT0gNCkge1xyXG4gICAgICAgICAgICByID0gXCIweFwiICsgaGV4WzFdICsgaGV4WzFdO1xyXG4gICAgICAgICAgICBnID0gXCIweFwiICsgaGV4WzJdICsgaGV4WzJdO1xyXG4gICAgICAgICAgICBiID0gXCIweFwiICsgaGV4WzNdICsgaGV4WzNdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChoZXgubGVuZ3RoID09IDUpIHtcclxuICAgICAgICAgICAgciA9IFwiMHhcIiArIGhleFsxXSArIGhleFsxXTtcclxuICAgICAgICAgICAgZyA9IFwiMHhcIiArIGhleFsyXSArIGhleFsyXTtcclxuICAgICAgICAgICAgYiA9IFwiMHhcIiArIGhleFszXSArIGhleFszXTtcclxuICAgICAgICAgICAgYSA9IFwiMHhcIiArIGhleFs0XSArIGhleFs0XTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaGV4Lmxlbmd0aCA9PSA3KSB7XHJcbiAgICAgICAgICAgIHIgPSBcIjB4XCIgKyBoZXhbMV0gKyBoZXhbMl07XHJcbiAgICAgICAgICAgIGcgPSBcIjB4XCIgKyBoZXhbM10gKyBoZXhbNF07XHJcbiAgICAgICAgICAgIGIgPSBcIjB4XCIgKyBoZXhbNV0gKyBoZXhbNl07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGhleC5sZW5ndGggPT0gOSkge1xyXG4gICAgICAgICAgICByID0gXCIweFwiICsgaGV4WzFdICsgaGV4WzJdO1xyXG4gICAgICAgICAgICBnID0gXCIweFwiICsgaGV4WzNdICsgaGV4WzRdO1xyXG4gICAgICAgICAgICBiID0gXCIweFwiICsgaGV4WzVdICsgaGV4WzZdO1xyXG4gICAgICAgICAgICBhID0gXCIweFwiICsgaGV4WzddICsgaGV4WzhdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhID0gKyhhIC8gMjU1KS50b0ZpeGVkKDMpO1xyXG5cclxuICAgICAgICBpZiAoYWxwaGEgPT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGByZ2IoJHsrcn0sICR7K2d9LCAkeytifSlgO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGByZ2IoJHsrcn0sICR7K2d9LCAkeytifSwgJHthfSlgO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmhleFRvSFNMID0gKGhleCA9ICcjZmZmZmZmJywgYWxwaGEgPSB0cnVlKSA9PiB7XHJcbiAgICAgICAgbGV0IGNvbG9yID0gc2VsZi5oZXhUb1JHQihoZXgsIGFscGhhKTtcclxuICAgICAgICBjb2xvciA9IHNlbGYucmdiVG9IU0woY29sb3IsIGFscGhhKTtcclxuICAgICAgICByZXR1cm4gY29sb3I7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5yZ2JUb0hleCA9IChyZ2IgPSAncmdiKDAsIDAsIDApJywgYWxwaGEgPSB0cnVlKSA9PiB7XHJcbiAgICAgICAgbGV0IHN0YXJ0ID0gcmdiLmluZGV4T2YoJygnKSArIDE7XHJcbiAgICAgICAgbGV0IGVuZCA9IHJnYi5pbmRleE9mKCcpJyk7XHJcbiAgICAgICAgbGV0IFtyLCBnLCBiLCBhXSA9IHJnYi5zbGljZShzdGFydCwgZW5kKS5zcGxpdCgnLCcpO1xyXG5cclxuICAgICAgICBpZiAoIXNlbGYuZnVuYy5pc3NldChhKSkge1xyXG4gICAgICAgICAgICBhID0gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHIgPSAoK3IpLnRvU3RyaW5nKDE2KTtcclxuICAgICAgICBnID0gKCtnKS50b1N0cmluZygxNik7XHJcbiAgICAgICAgYiA9ICgrYikudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgIGEgPSBNYXRoLnJvdW5kKGEgKiAyNTUpLnRvU3RyaW5nKDE2KTtcclxuXHJcbiAgICAgICAgaWYgKHIubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgciA9IGAwJHtyfWA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZy5sZW5ndGggPT0gMSkge1xyXG4gICAgICAgICAgICBnID0gYDAke2d9YDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChiLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgICAgICAgIGIgPSBgMCR7Yn1gO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYS5sZW5ndGggPT0gMSkge1xyXG4gICAgICAgICAgICBhID0gYDAke2F9YDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBoZXggPSAnIyc7XHJcbiAgICAgICAgaWYgKGFscGhhICE9IGZhbHNlKSB7XHJcbiAgICAgICAgICAgIGhleCArPSBgJHtyfSR7Z30ke2J9JHthfWA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBoZXggKz0gYCR7cn0ke2d9JHtifWA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaGV4O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYucmdiVG9IU0wgPSAocmdiID0gJ3JnYigwLCAwLCAwKScsIGFscGhhID0gdHJ1ZSkgPT4ge1xyXG4gICAgICAgIGxldCBzdGFydCA9IHJnYi5pbmRleE9mKCcoJykgKyAxO1xyXG4gICAgICAgIGxldCBlbmQgPSByZ2IuaW5kZXhPZignKScpO1xyXG4gICAgICAgIGxldCBbciwgZywgYiwgYV0gPSByZ2Iuc2xpY2Uoc3RhcnQsIGVuZCkuc3BsaXQoJywnKTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2cociwgZywgYik7XHJcbiAgICAgICAgaWYgKCFzZWxmLmZ1bmMuaXNzZXQoYSkpIHtcclxuICAgICAgICAgICAgYSA9IDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByIC89IDIyNTtcclxuICAgICAgICBnIC89IDIyNTtcclxuICAgICAgICBiIC89IDIyNTtcclxuXHJcbiAgICAgICAgbGV0IGNtaW4gPSBNYXRoLm1pbihyLCBnLCBiKSxcclxuICAgICAgICAgICAgY21heCA9IE1hdGgubWF4KHIsIGcsIGIpLFxyXG4gICAgICAgICAgICBkZWx0YSA9IGNtYXggLSBjbWluLFxyXG4gICAgICAgICAgICBoID0gMCxcclxuICAgICAgICAgICAgcyA9IDAsXHJcbiAgICAgICAgICAgIGwgPSAwO1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgaHVlXHJcbiAgICAgICAgLy8gTm8gZGlmZmVyZW5jZVxyXG4gICAgICAgIGlmIChkZWx0YSA9PSAwKSB7XHJcbiAgICAgICAgICAgIGggPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChjbWF4ID09IHIpIHtcclxuICAgICAgICAgICAgaCA9ICgoZyAtIGIpIC8gZGVsdGEpICUgNjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoY21heCA9PSBnKSB7XHJcbiAgICAgICAgICAgIGggPSAoYiAtIHIpIC8gZGVsdGEgKyAyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChjbWF4ID09IGcpIHtcclxuICAgICAgICAgICAgaCA9IChyIC0gZykgLyBkZWx0YSArIDQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBoID0gTWF0aC5yb3VuZChoICogNjApO1xyXG4gICAgICAgIC8vIE1ha2UgbmVnYXRpdmUgaHVlcyBwb3NpdGl2ZSBiZWhpbmQgMzYwwrBcclxuICAgICAgICBpZiAoaCA8IDApIHtcclxuICAgICAgICAgICAgaCArPSAzNjA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsID0gKGNtYXggKyBjbWluKSAvIDI7XHJcblxyXG4gICAgICAgIHMgPSBkZWx0YSA9PSAwID8gMCA6IGRlbHRhIC8gKDEgLSBNYXRoLmFicygyICogbCAtIDEpKTtcclxuXHJcbiAgICAgICAgbCA9ICsobCAqIDEwMCkudG9GaXhlZCgxKTtcclxuICAgICAgICBzID0gKyhzICogMTAwKS50b0ZpeGVkKDEpO1xyXG5cclxuICAgICAgICBsZXQgaHNsID0gYGhzbGA7XHJcbiAgICAgICAgaWYgKGFscGhhID09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgIGhzbCArPSBgKCR7aH0sICR7c30lLCAke2x9JSlgO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgaHNsICs9IGAoJHtofSwgJHtzfSUsICR7bH0lLCAke2F9KWA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBoc2w7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5oc2xUb1JHQiA9IChoc2wgPSAnaHNsKDAsIDAlLCAwJSknLCBhbHBoYSA9IHRydWUpID0+IHtcclxuICAgICAgICBsZXQgcmdiID0gJ3JnYic7XHJcbiAgICAgICAgbGV0IHN0YXJ0ID0gaHNsLmluZGV4T2YoJygnKSArIDE7XHJcbiAgICAgICAgbGV0IGVuZCA9IGhzbC5pbmRleE9mKCcpJyk7XHJcbiAgICAgICAgbGV0IFtoLCBzLCBsLCBhXSA9IGhzbC5zbGljZShzdGFydCwgZW5kKS5zcGxpdCgnLCcpO1xyXG5cclxuICAgICAgICBpZiAoIXNlbGYuZnVuYy5pc3NldChhKSkge1xyXG4gICAgICAgICAgICBhID0gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKGgsIHMsIGwpO1xyXG5cclxuICAgICAgICBpZiAoaC5pbmRleE9mKFwiZGVnXCIpID4gLTEpXHJcbiAgICAgICAgICAgIGggPSBoLnN1YnN0cigwLCBoLmxlbmd0aCAtIDMpO1xyXG4gICAgICAgIGVsc2UgaWYgKGguaW5kZXhPZihcInJhZFwiKSA+IC0xKVxyXG4gICAgICAgICAgICBoID0gTWF0aC5yb3VuZChoLnN1YnN0cigwLCBoLmxlbmd0aCAtIDMpICogKDE4MCAvIE1hdGguUEkpKTtcclxuICAgICAgICBlbHNlIGlmIChoLmluZGV4T2YoXCJ0dXJuXCIpID4gLTEpXHJcbiAgICAgICAgICAgIGggPSBNYXRoLnJvdW5kKGguc3Vic3RyKDAsIGgubGVuZ3RoIC0gNCkgKiAzNjApO1xyXG4gICAgICAgIC8vIEtlZXAgaHVlIGZyYWN0aW9uIG9mIDM2MCBpZiBlbmRpbmcgdXAgb3ZlclxyXG4gICAgICAgIGlmIChoID49IDM2MClcclxuICAgICAgICAgICAgaCAlPSAzNjA7XHJcblxyXG4gICAgICAgIHMgPSBzLnJlcGxhY2UoJyUnLCAnJykgLyAxMDA7XHJcbiAgICAgICAgbCA9IGwucmVwbGFjZSgnJScsICcnKSAvIDEwMDtcclxuXHJcbiAgICAgICAgbGV0IGMgPSAoMSAtIE1hdGguYWJzKDIgKiBsIC0gMSkpICogcyxcclxuICAgICAgICAgICAgeCA9IGMgKiAoMSAtIE1hdGguYWJzKChoIC8gNjApICUgMiAtIDEpKSxcclxuICAgICAgICAgICAgbSA9IGwgLSBjIC8gMixcclxuICAgICAgICAgICAgciA9IDAsXHJcbiAgICAgICAgICAgIGcgPSAwLFxyXG4gICAgICAgICAgICBiID0gMDtcclxuXHJcbiAgICAgICAgaWYgKDAgPD0gaCAmJiBoIDwgNjApIHtcclxuICAgICAgICAgICAgciA9IGM7IGcgPSB4OyBiID0gMDtcclxuICAgICAgICB9IGVsc2UgaWYgKDYwIDw9IGggJiYgaCA8IDEyMCkge1xyXG4gICAgICAgICAgICByID0geDsgZyA9IGM7IGIgPSAwO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoMTIwIDw9IGggJiYgaCA8IDE4MCkge1xyXG4gICAgICAgICAgICByID0gMDsgZyA9IGM7IGIgPSB4O1xyXG4gICAgICAgIH0gZWxzZSBpZiAoMTgwIDw9IGggJiYgaCA8IDI0MCkge1xyXG4gICAgICAgICAgICByID0gMDsgZyA9IHg7IGIgPSBjO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoMjQwIDw9IGggJiYgaCA8IDMwMCkge1xyXG4gICAgICAgICAgICByID0geDsgZyA9IDA7IGIgPSBjO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoMzAwIDw9IGggJiYgaCA8IDM2MCkge1xyXG4gICAgICAgICAgICByID0gYzsgZyA9IDA7IGIgPSB4O1xyXG4gICAgICAgIH1cclxuICAgICAgICByID0gTWF0aC5yb3VuZCgociArIG0pICogMjU1KTtcclxuICAgICAgICBnID0gTWF0aC5yb3VuZCgoZyArIG0pICogMjU1KTtcclxuICAgICAgICBiID0gTWF0aC5yb3VuZCgoYiArIG0pICogMjU1KTtcclxuXHJcbiAgICAgICAgaWYgKGFscGhhID09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgIHJnYiArPSBgKCR7cn0sICR7Z30sICR7Yn0pYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJnYiArPSBgKCR7cn0sICR7Z30sICR7Yn0sICR7YX0pYDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZ2I7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5oc2xUb0hleCA9IChoc2wgPSAnJywgYWxwaGEgPSB0cnVlKSA9PiB7XHJcbiAgICAgICAgbGV0IGNvbG9yID0gc2VsZi5oc2xUb1JHQihoc2wsIGFscGhhKTtcclxuICAgICAgICByZXR1cm4gc2VsZi5yZ2JUb0hleChjb2xvciwgYWxwaGEpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuYWRkT3BhY2l0eSA9IChjb2xvciA9ICdyZ2IoMCwgMCwgMCknLCBvcGFjaXR5ID0gMC41KSA9PiB7XHJcbiAgICAgICAgbGV0IHN0YXJ0ID0gY29sb3IuaW5kZXhPZignKCcpICsgMTtcclxuICAgICAgICBsZXQgZW5kID0gY29sb3IuaW5kZXhPZignKScpO1xyXG4gICAgICAgIGxldCBwb2ludHMgPSBjb2xvci5zbGljZShzdGFydCwgZW5kKS5zcGxpdCgnLCcpO1xyXG4gICAgICAgIHBvaW50c1szXSA9IG9wYWNpdHk7XHJcblxyXG4gICAgICAgIGxldCBjaGFuZ2VkQ29sb3IgPSBgcmdiYSgke3BvaW50cy5qb2luKCcsJyl9KWA7XHJcblxyXG4gICAgICAgIHJldHVybiBjaGFuZ2VkQ29sb3I7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRPcGFjaXR5ID0gKGNvbG9yID0gJ3JnYigwLCAwLCAwKScpID0+IHtcclxuICAgICAgICBjb2xvciA9IHNlbGYuZnVuYy5pbkJldHdlZW4oY29sb3IsICcoJywgJyknKTtcclxuICAgICAgICBsZXQgW3IsIGcsIGIsIGFdID0gY29sb3Iuc3BsaXQoJywnKTtcclxuICAgICAgICByZXR1cm4gYS50cmltKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5pbnZlcnRDb2xvciA9IChjb2xvciA9ICcjZmZmZmZmJykgPT4ge1xyXG4gICAgICAgIGxldCB0eXBlID0gc2VsZi5jb2xvclR5cGUoY29sb3IpO1xyXG4gICAgICAgIGxldCBpbnZlcnQ7XHJcbiAgICAgICAgaWYgKHR5cGUgPT0gJ2hleCcpIHtcclxuICAgICAgICAgICAgY29sb3IgPSBjb2xvci5yZXBsYWNlKCcjJywgJycpO1xyXG4gICAgICAgICAgICBpbnZlcnQgPSAnIycgKyBzZWxmLmludmVydEhleChjb2xvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT0gJ3JnYicpIHtcclxuICAgICAgICAgICAgY29sb3IgPSBzZWxmLnJnYlRvSGV4KGNvbG9yKS5yZXBsYWNlKCcjJywgJycpO1xyXG4gICAgICAgICAgICBpbnZlcnQgPSBzZWxmLmludmVydEhleChjb2xvcik7XHJcbiAgICAgICAgICAgIGludmVydCA9IHNlbGYuaGV4VG9SR0IoaW52ZXJ0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PSAncmdiYScpIHtcclxuICAgICAgICAgICAgbGV0IG9wYWNpdHkgPSBzZWxmLmdldE9wYWNpdHkoY29sb3IpO1xyXG4gICAgICAgICAgICBjb2xvciA9IHNlbGYucmdiVG9IZXgoY29sb3IpLnJlcGxhY2UoJyMnLCAnJyk7XHJcbiAgICAgICAgICAgIGludmVydCA9IHNlbGYuaW52ZXJ0SGV4KGNvbG9yKTtcclxuICAgICAgICAgICAgaW52ZXJ0ID0gc2VsZi5oZXhUb1JHQihpbnZlcnQpO1xyXG4gICAgICAgICAgICBpbnZlcnQgPSBzZWxmLmFkZE9wYWNpdHkoaW52ZXJ0LCBvcGFjaXR5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGludmVydDtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmludmVydEhleCA9IChoZXggPSAnZmZmZmZmJykgPT4ge1xyXG4gICAgICAgIHJldHVybiAoTnVtYmVyKGAweDEke2hleH1gKSBeIDB4RkZGRkZGKS50b1N0cmluZygxNikuc3Vic3RyKDEpLnRvVXBwZXJDYXNlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNlbGY7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29sb3JQaWNrZXI7IiwiY29uc3QgVGVtcGxhdGUgPSByZXF1aXJlKCcuL1RlbXBsYXRlJyk7XHJcbmNsYXNzIEVtcHR5IHtcclxufVxyXG5cclxuY2xhc3MgQ29tcG9uZW50cyBleHRlbmRzIFRlbXBsYXRlIHtcclxuICAgIGNvbnN0cnVjdG9yKHRoZVdpbmRvdyA9IEVtcHR5KSB7XHJcbiAgICAgICAgc3VwZXIodGhlV2luZG93KTtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVUYWIocGFyYW1zID0geyB0aXRsZXM6IFtdIH0pIHtcclxuICAgICAgICB2YXIgdGFiVGl0bGUgPSB0aGlzLmNyZWF0ZUVsZW1lbnQoeyBlbGVtZW50OiAndWwnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAndGFiJyB9IH0pO1xyXG4gICAgICAgIHBhcmFtcy52aWV3LmFwcGVuZCh0YWJUaXRsZSk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgb2YgcGFyYW1zLnRpdGxlcykge1xyXG4gICAgICAgICAgICB0YWJUaXRsZS5hcHBlbmQoXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUVsZW1lbnQoeyBlbGVtZW50OiAnbGknLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAndGFiLXRpdGxlJyB9LCB0ZXh0OiBpIH0pXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRhYlRpdGxlLmZpbmRBbGwoJ2xpJykuZm9yRWFjaChub2RlID0+IHtcclxuICAgICAgICAgICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIHZhciB1cmwgPSB0aGlzLnVybFNwbGl0dGVyKGxvY2F0aW9uLmhyZWYpO1xyXG4gICAgICAgICAgICAgICAgdXJsLnZhcnMudGFiID0gbm9kZS50ZXh0Q29udGVudC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgcm91dGVyLnJlbmRlcih7IHVybDogJz8nICsgdGhpcy51cmxTcGxpdHRlcih0aGlzLnVybE1lcmdlcih1cmwsICd0YWInKSkucXVlcmllcyB9KTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGNlbGwocGFyYW1zID0geyBlbGVtZW50OiAnaW5wdXQnLCBhdHRyaWJ1dGVzOiB7fSwgbmFtZTogJycsIGRhdGFBdHRyaWJ1dGVzOiB7fSwgdmFsdWU6ICcnLCB0ZXh0OiAnJywgaHRtbDogJycsIGVkaXQ6ICcnIH0pIHtcclxuICAgICAgICAvL3NldCB0aGUgY2VsbC1kYXRhIGlkXHJcbiAgICAgICAgdmFyIGlkID0gdGhpcy5zdHJpbmdSZXBsYWNlKHBhcmFtcy5uYW1lLCAnICcsICctJykgKyAnLWNlbGwnO1xyXG5cclxuICAgICAgICAvL2NyZWF0ZSB0aGUgY2VsbCBsYWJlbFxyXG4gICAgICAgIHZhciBsYWJlbCA9IHRoaXMuY3JlYXRlRWxlbWVudCh7IGVsZW1lbnQ6ICdsYWJlbCcsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdjZWxsLWxhYmVsJyB9LCB0ZXh0OiBwYXJhbXMubmFtZSB9KTtcclxuXHJcbiAgICAgICAgLy9jZWxsIGF0dHJpYnV0ZXNcclxuICAgICAgICBwYXJhbXMuYXR0cmlidXRlcyA9ICh0aGlzLmlzc2V0KHBhcmFtcy5hdHRyaWJ1dGVzKSkgPyBwYXJhbXMuYXR0cmlidXRlcyA6IHt9O1xyXG5cclxuICAgICAgICAvL2NlbGwgZGF0YSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgcGFyYW1zLmRhdGFBdHRyaWJ1dGVzID0gKHRoaXMuaXNzZXQocGFyYW1zLmRhdGFBdHRyaWJ1dGVzKSkgPyBwYXJhbXMuZGF0YUF0dHJpYnV0ZXMgOiB7fTtcclxuICAgICAgICBwYXJhbXMuZGF0YUF0dHJpYnV0ZXMuaWQgPSBpZDtcclxuXHJcbiAgICAgICAgdmFyIGNvbXBvbmVudHM7XHJcblxyXG4gICAgICAgIC8vc2V0IHRoZSBwcm9wZXJ0aWVzIG9mIGNlbGwgZGF0YVxyXG4gICAgICAgIGlmIChwYXJhbXMuZWxlbWVudCA9PSAnc2VsZWN0Jykgey8vY2hlY2sgaWYgY2VsbCBkYXRhIGlzIGluIHNlbGVjdCBlbGVtZW50XHJcbiAgICAgICAgICAgIGNvbXBvbmVudHMgPSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50OiBwYXJhbXMuZWxlbWVudCwgYXR0cmlidXRlczogcGFyYW1zLmRhdGFBdHRyaWJ1dGVzLCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ29wdGlvbicsIGF0dHJpYnV0ZXM6IHsgZGlzYWJsZWQ6ICcnLCBzZWxlY3RlZDogJycgfSwgdGV4dDogYFNlbGVjdCAke3BhcmFtcy5uYW1lfWAsIHZhbHVlOiAnJyB9Ly9zZXQgdGhlIGRlZmF1bHQgb3B0aW9uXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb21wb25lbnRzID0geyBlbGVtZW50OiBwYXJhbXMuZWxlbWVudCwgYXR0cmlidXRlczogcGFyYW1zLmRhdGFBdHRyaWJ1dGVzLCB0ZXh0OiBwYXJhbXMudmFsdWUgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KHBhcmFtcy52YWx1ZSkpIGNvbXBvbmVudHMuYXR0cmlidXRlcy52YWx1ZSA9IHBhcmFtcy52YWx1ZTtcclxuICAgICAgICBpZiAodGhpcy5pc3NldChwYXJhbXMub3B0aW9ucykpIGNvbXBvbmVudHMub3B0aW9ucyA9IHBhcmFtcy5vcHRpb25zO1xyXG5cclxuICAgICAgICBsZXQgZGF0YTtcclxuICAgICAgICBpZiAocGFyYW1zLmVsZW1lbnQgaW5zdGFuY2VvZiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGRhdGEgPSBwYXJhbXMuZWxlbWVudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGRhdGEgPSB0aGlzLmNyZWF0ZUVsZW1lbnQoY29tcG9uZW50cyk7Ly9jcmVhdGUgdGhlIGNlbGwtZGF0YVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGF0YS5jbGFzc0xpc3QuYWRkKCdjZWxsLWRhdGEnKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNzZXQocGFyYW1zLnZhbHVlKSkgZGF0YS52YWx1ZSA9IHBhcmFtcy52YWx1ZTtcclxuXHJcbiAgICAgICAgLy9jcmVhdGUgY2VsbCBlbGVtZW50XHJcbiAgICAgICAgbGV0IGNlbGwgPSB0aGlzLmNyZWF0ZUVsZW1lbnQoeyBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogcGFyYW1zLmF0dHJpYnV0ZXMsIGNoaWxkcmVuOiBbbGFiZWwsIGRhdGFdIH0pO1xyXG5cclxuICAgICAgICBjZWxsLmNsYXNzTGlzdC5hZGQoJ2NlbGwnKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNzZXQocGFyYW1zLnRleHQpKSBkYXRhLnRleHRDb250ZW50ID0gcGFyYW1zLnRleHQ7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KHBhcmFtcy5odG1sKSkgZGF0YS5pbm5lckhUTUwgPSBwYXJhbXMuaHRtbDtcclxuXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KHBhcmFtcy5saXN0KSkge1xyXG4gICAgICAgICAgICBjZWxsLm1ha2VFbGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkYXRhbGlzdCcsIGF0dHJpYnV0ZXM6IHsgaWQ6IGAke2lkfS1saXN0YCB9LCBvcHRpb25zOiBwYXJhbXMubGlzdC5zb3J0KClcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBkYXRhLnNldEF0dHJpYnV0ZSgnbGlzdCcsIGAke2lkfS1saXN0YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZWRpdDtcclxuICAgICAgICBpZiAodGhpcy5pc3NldChwYXJhbXMuZWRpdCkpIHtcclxuICAgICAgICAgICAgZWRpdCA9IGNlbGwubWFrZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ2knLCBhdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IGAke3BhcmFtcy5lZGl0fWAsICdkYXRhLWljb24nOiAnZmFzLCBmYS1wZW4nLCBzdHlsZTogeyBjdXJzb3I6ICdwb2ludGVyJywgYmFja2dyb3VuZENvbG9yOiAndmFyKC0tcHJpbWFyeS1jb2xvciknLCB3aWR0aDogJzFlbScsIGhlaWdodDogJ2F1dG8nLCBwb3NpdGlvbjogJ2Fic29sdXRlJywgdG9wOiAnMHB4JywgcmlnaHQ6ICcwcHgnLCBwYWRkaW5nOiAnLjE1ZW0nIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNlbGwuY3NzKHsgcG9zaXRpb246ICdyZWxhdGl2ZScgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjZWxsO1xyXG4gICAgfVxyXG5cclxuICAgIG1lc3NhZ2UocGFyYW1zID0geyBsaW5rOiAnJywgdGV4dDogJycsIHRlbXA6IDAgfSkge1xyXG4gICAgICAgIHZhciBtZSA9IHRoaXMuY3JlYXRlRWxlbWVudCh7XHJcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2FsZXJ0JyB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVFbGVtZW50KHsgZWxlbWVudDogJ2EnLCB0ZXh0OiBwYXJhbXMudGV4dCwgYXR0cmlidXRlczogeyBjbGFzczogJ3RleHQnLCBocmVmOiBwYXJhbXMubGluayB9IH0pLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVFbGVtZW50KHsgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAnY2xvc2UnIH0gfSlcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pc3NldChwYXJhbXMudGVtcCkpIHtcclxuICAgICAgICAgICAgdmFyIHRpbWUgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIG1lLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWUpO1xyXG4gICAgICAgICAgICB9LCAocGFyYW1zLnRlbXAgIT0gJycpID8gcGFyYW1zLnRpbWUgKiAxMDAwIDogNTAwMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtZS5maW5kKCcuY2xvc2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgbWUucmVtb3ZlKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGJvZHkuZmluZCgnI25vdGlmaWNhdGlvbi1ibG9jaycpLmFwcGVuZChtZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlVGFibGUocGFyYW1zID0geyB0aXRsZTogJycsIGNvbnRlbnRzOiB7fSwgcHJvamVjdGlvbjoge30sIHJlbmFtZToge30sIHNvcnQ6IGZhbHNlLCBzZWFyY2g6IGZhbHNlLCBmaWx0ZXI6IFtdIH0pIHtcclxuICAgICAgICAvL2NyZWF0ZSB0aGUgdGFibGUgZWxlbWVudCAgIFxyXG4gICAgICAgIGxldCBoZWFkZXJzID0gW10sLy90aGUgaGVhZGVyc1xyXG4gICAgICAgICAgICBjb2x1bW5zID0ge30sXHJcbiAgICAgICAgICAgIGNvbHVtbkNvdW50ID0gMCxcclxuICAgICAgICAgICAgaSxcclxuICAgICAgICAgICAgdGFibGUgPSB0aGlzLmNyZWF0ZUVsZW1lbnQoXHJcbiAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiBwYXJhbXMuYXR0cmlidXRlcyB9XHJcbiAgICAgICAgICAgICk7Ly9jcmVhdGUgdGhlIHRhYmxlIFxyXG5cclxuICAgICAgICB0YWJsZS5jbGFzc0xpc3QuYWRkKCdrZXJkeC10YWJsZScpOy8vYWRkIHRhYmxlIHRvIHRoZSBjbGFzc1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjb250ZW50IG9mIHBhcmFtcy5jb250ZW50cykgey8vbG9vcCB0aHJvdWdoIHRoZSBqc29uIGFycmF5XHJcbiAgICAgICAgICAgIGkgPSBwYXJhbXMuY29udGVudHMuaW5kZXhPZihjb250ZW50KTsvL2dldCB0aGUgcG9zaXRpb24gb2YgdGhlIHJvd1xyXG4gICAgICAgICAgICBmb3IgKGxldCBuYW1lIGluIGNvbnRlbnQpIHsvL2xvb3AgdGhyb3VnaCB0aGUgcm93XHJcbiAgICAgICAgICAgICAgICBpZiAoaGVhZGVycy5pbmRleE9mKG5hbWUpID09IC0xKSB7Ly9hZGQgdG8gaGVhZGVyc1xyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnMucHVzaChuYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICBjb2x1bW5zW25hbWVdID0gdGFibGUubWFrZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnY29sdW1uJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXRhYmxlLWNvbHVtbicsICdkYXRhLW5hbWUnOiBuYW1lIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtdGFibGUtY29sdW1uLXRpdGxlJywgJ2RhdGEtbmFtZSc6IG5hbWUgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAncCcsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC10YWJsZS1jb2x1bW4tdGl0bGUtdGV4dCcgfSwgdGV4dDogbmFtZSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2RpdicsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC10YWJsZS1jb2x1bW4tY29udGVudHMnIH0gfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzc2V0KHBhcmFtcy5zb3J0KSkgey8vbWFrZSBzb3J0YWJsZSBpZiBuZWVkZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uc1tuYW1lXS5maW5kKCcua2VyZHgtdGFibGUtY29sdW1uLXRpdGxlJykubWFrZUVsZW1lbnQoeyBlbGVtZW50OiAnaScsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC10YWJsZS1jb2x1bW4tdGl0bGUtc29ydCcsICdkYXRhLWljb24nOiAnZmFzLCBmYS1hcnJvdy1kb3duJyB9IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGFyYW1zLnByb2plY3Rpb24gPSBwYXJhbXMucHJvamVjdGlvbiB8fCB7fTtcclxuXHJcbiAgICAgICAgbGV0IGhpZGUgPSBPYmplY3QudmFsdWVzKHBhcmFtcy5wcm9qZWN0aW9uKS5pbmNsdWRlcygxKTtcclxuXHJcblxyXG4gICAgICAgIGZvciAobGV0IG5hbWUgb2YgaGVhZGVycykgey8vbG9vcCB0aHJvdWdoIHRoZSBoZWFkZXJzIGFuZCBhZGQgdGhlIGNvbnRlbnRzIFxyXG4gICAgICAgICAgICBmb3IgKGxldCBjb250ZW50IG9mIHBhcmFtcy5jb250ZW50cykge1xyXG4gICAgICAgICAgICAgICAgaSA9IHBhcmFtcy5jb250ZW50cy5pbmRleE9mKGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgY29sdW1uc1tuYW1lXS5maW5kKCcua2VyZHgtdGFibGUtY29sdW1uLWNvbnRlbnRzJykubWFrZUVsZW1lbnQoeyBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC10YWJsZS1jb2x1bW4tY2VsbCcsICdkYXRhLW5hbWUnOiBuYW1lLCAnZGF0YS12YWx1ZSc6IGNvbnRlbnRbbmFtZV0gfHwgJycsICdkYXRhLXJvdyc6IGkgfSwgaHRtbDogY29udGVudFtuYW1lXSB8fCAnJyB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHBhcmFtcy5wcm9qZWN0aW9uW25hbWVdID09IC0xIHx8IChoaWRlICYmICF0aGlzLmlzc2V0KHBhcmFtcy5wcm9qZWN0aW9uW25hbWVdKSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbHVtbnNbbmFtZV0uY3NzKHsgZGlzcGxheTogJ25vbmUnIH0pO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbHVtbkNvdW50Kys7Ly9jb3VudCB0aGUgY29sdW1uIGxlbmd0aFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGFibGUuY3NzKHsgZ3JpZFRlbXBsYXRlQ29sdW1uczogYHJlcGVhdCgke2NvbHVtbkNvdW50fSwgMWZyKWAgfSk7XHJcblxyXG4gICAgICAgIGxldCB0YWJsZUNvbnRhaW5lciA9IHRoaXMuY3JlYXRlRWxlbWVudCh7Ly9jcmVhdGUgdGFibGUgY29udGFpbmVyIGFuZCB0aXRsZVxyXG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXRhYmxlLWNvbnRhaW5lcicgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC10YWJsZS10aXRsZWFuZHNlYXJjaCcgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRhYmxlXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IHRpdGxlQ291bnQgPSAwO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pc3NldChwYXJhbXMudGl0bGUpKSB7Ly8gY3JlYXRlIHRoZSB0aXRsZSB0ZXh0IGlmIG5lZWRlZFxyXG4gICAgICAgICAgICB0YWJsZUNvbnRhaW5lci5maW5kKCcua2VyZHgtdGFibGUtdGl0bGVhbmRzZWFyY2gnKS5tYWtlRWxlbWVudCh7IGVsZW1lbnQ6ICdoNScsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC10YWJsZS10aXRsZScgfSwgdGV4dDogcGFyYW1zLnRpdGxlIH0pO1xyXG4gICAgICAgICAgICB0aXRsZUNvdW50Kys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pc3NldChwYXJhbXMuc29ydCkpIHsvLyBzZXQgdGhlIGRhdGEgZm9yIHNvcnRpbmdcclxuICAgICAgICAgICAgdGFibGUuZGF0YXNldC5zb3J0ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KHBhcmFtcy5zZWFyY2gpKSB7Ly8gY3JlYXRlIHRoZSBzZWFyY2ggYXJlYVxyXG4gICAgICAgICAgICB0YWJsZUNvbnRhaW5lci5maW5kKCcua2VyZHgtdGFibGUtdGl0bGVhbmRzZWFyY2gnKS5tYWtlRWxlbWVudCh7IGVsZW1lbnQ6ICdpbnB1dCcsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC10YWJsZS1zZWFyY2gnLCBwbGFjZUhvbGRlcjogJ1NlYXJjaCB0YWJsZS4uLicgfSB9KTtcclxuICAgICAgICAgICAgdGl0bGVDb3VudCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNzZXQocGFyYW1zLmZpbHRlcikpIHsvL2NyZWF0ZSB0aGUgZmlsdGVyIGFyZWFcclxuICAgICAgICAgICAgdGFibGVDb250YWluZXIuZmluZCgnLmtlcmR4LXRhYmxlLXRpdGxlYW5kc2VhcmNoJykubWFrZUVsZW1lbnQoeyBlbGVtZW50OiAnc2VsZWN0JywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXRhYmxlLWZpbHRlcicgfSwgb3B0aW9uczogcGFyYW1zLmZpbHRlciB9KTtcclxuICAgICAgICAgICAgdGl0bGVDb3VudCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy5jb250ZW50cy5sZW5ndGggPT0gMCkgey8vIE5vdGlmeSBpZiB0YWJsZSBpcyBlbXB0eVxyXG4gICAgICAgICAgICB0YWJsZS50ZXh0Q29udGVudCA9ICdFbXB0eSBUYWJsZSc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0YWJsZUNvbnRhaW5lci5tYWtlRWxlbWVudCh7Ly8gYXJyYW5nZSB0aGUgdGFibGUgdGl0bGVcclxuICAgICAgICAgICAgZWxlbWVudDogJ3N0eWxlJywgdGV4dDogYFxyXG4gICAgICAgICAgICBAbWVkaWEobWluLXdpZHRoOiA3MDBweCkge1xyXG4gICAgICAgICAgICAgICAgLmtlcmR4LXRhYmxlLXRpdGxlYW5kc2VhcmNoIHtcclxuICAgICAgICAgICAgICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoJHt0aXRsZUNvdW50fSwgMWZyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgYH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gdGFibGVDb250YWluZXI7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VGFibGVEYXRhKHRhYmxlKSB7XHJcbiAgICAgICAgbGV0IGRhdGEgPSBbXTtcclxuICAgICAgICBsZXQgY2VsbHMgPSB0YWJsZS5maW5kQWxsKCcua2VyZHgtdGFibGUtY29sdW1uLWNlbGwnKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjZWxscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgeyBuYW1lLCB2YWx1ZSwgcm93IH0gPSBjZWxsc1tpXS5kYXRhc2V0O1xyXG4gICAgICAgICAgICBkYXRhW3Jvd10gPSBkYXRhW3Jvd10gfHwge307XHJcbiAgICAgICAgICAgIGRhdGFbcm93XVtuYW1lXSA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgc29ydFRhYmxlKHRhYmxlLCBieSA9ICcnLCBkaXJlY3Rpb24gPSAxKSB7XHJcbiAgICAgICAgbGV0IGRhdGEgPSB0aGlzLmdldFRhYmxlRGF0YSh0YWJsZSk7XHJcblxyXG4gICAgICAgIGRhdGEuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICAgICAgICBhID0gYVtieV07XHJcbiAgICAgICAgICAgIGIgPSBiW2J5XTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzTnVtYmVyKGEpICYmIHRoaXMuaXNOdW1iZXIoYikpIHtcclxuICAgICAgICAgICAgICAgIGEgPSBhIC8gMTtcclxuICAgICAgICAgICAgICAgIGIgPSBiIC8gMTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA+IC0xKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYSA+IGIgPyAxIDogLTE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYSA+IGIgPyAtMSA6IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBsaXN0ZW5UYWJsZShwYXJhbXMgPSB7IHRhYmxlOiB7fSwgb3B0aW9uczogW10gfSwgY2FsbGJhY2tzID0geyBjbGljazogKCkgPT4geyB9LCBmaWx0ZXI6ICgpID0+IHsgfSB9KSB7XHJcbiAgICAgICAgcGFyYW1zLm9wdGlvbnMgPSBwYXJhbXMub3B0aW9ucyB8fCBbXTtcclxuICAgICAgICBjYWxsYmFja3MgPSBjYWxsYmFja3MgfHwgW107XHJcbiAgICAgICAgbGV0IHRhYmxlID0gcGFyYW1zLnRhYmxlLmZpbmQoJy5rZXJkeC10YWJsZScpO1xyXG5cclxuICAgICAgICBsZXQgb3B0aW9ucyA9IHRoaXMuY3JlYXRlRWxlbWVudCh7XHJcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXRhYmxlLW9wdGlvbnMnIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IGxpc3QgPSB7XHJcbiAgICAgICAgICAgIHZpZXc6ICdmYXMgZmEtZXllJyxcclxuICAgICAgICAgICAgZGVsZXRlOiAnZmFzIGZhLXRyYXNoJyxcclxuICAgICAgICAgICAgZWRpdDogJ2ZhcyBmYS1wZW4nLFxyXG4gICAgICAgICAgICByZXZlcnQ6ICdmYXMgZmEtaGlzdG9yeSdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBvcHRpb25DbGFzcztcclxuICAgICAgICBmb3IgKGxldCBvcHRpb24gb2YgcGFyYW1zLm9wdGlvbnMpIHtcclxuICAgICAgICAgICAgb3B0aW9uQ2xhc3MgPSBsaXN0W29wdGlvbl0gfHwgYGZhcyBmYS0ke29wdGlvbn1gO1xyXG4gICAgICAgICAgICBsZXQgYW5PcHRpb24gPSBvcHRpb25zLm1ha2VFbGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdpJywgYXR0cmlidXRlczogeyBjbGFzczogb3B0aW9uQ2xhc3MgKyAnIGtlcmR4LXRhYmxlLW9wdGlvbicsIGlkOiAna2VyZHgtdGFibGUtb3B0aW9uLScgKyBvcHRpb24gfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0YWJsZVRpdGxlcyA9IHRhYmxlLmZpbmRBbGwoJy5rZXJkeC10YWJsZS1jb2x1bW4tdGl0bGUnKTtcclxuICAgICAgICBsZXQgdGFibGVDb2x1bW5zID0gdGFibGUuZmluZEFsbCgnLmtlcmR4LXRhYmxlLWNvbHVtbicpO1xyXG4gICAgICAgIGxldCByb3dzID0gW107XHJcbiAgICAgICAgbGV0IGZpcnN0Q29sdW1uID0gdGFibGVDb2x1bW5zWzBdO1xyXG4gICAgICAgIGxldCBmaXJzdFZpc2libGVDb2x1bW47XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzbnVsbChmaXJzdENvbHVtbikpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YWJsZUNvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKHRhYmxlQ29sdW1uc1tpXS5jc3MoKS5kaXNwbGF5ICE9ICdub25lJykge1xyXG4gICAgICAgICAgICAgICAgZmlyc3RWaXNpYmxlQ29sdW1uID0gdGFibGVDb2x1bW5zW2ldO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBmaXJzdENlbGxzID0gZmlyc3RDb2x1bW4uZmluZEFsbCgnLmtlcmR4LXRhYmxlLWNvbHVtbi1jZWxsJyk7XHJcbiAgICAgICAgbGV0IGZpcnN0VmlzaWJsZUNlbGxzID0gZmlyc3RWaXNpYmxlQ29sdW1uLmZpbmRBbGwoJy5rZXJkeC10YWJsZS1jb2x1bW4tY2VsbCcpO1xyXG5cclxuICAgICAgICBsZXQgdGFibGVSb3c7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmlyc3RDZWxscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICByb3dzLnB1c2goZmlyc3RDZWxsc1tpXS5kYXRhc2V0LnJvdyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFyYW1zLnRhYmxlLmZpbmQoJy5rZXJkeC10YWJsZScpLmRhdGFzZXQuc29ydCA9PSAndHJ1ZScpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YWJsZVRpdGxlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGFibGVUaXRsZXNbaV0uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZVRpdGxlc1tpXS5maW5kKCcua2VyZHgtdGFibGUtY29sdW1uLXRpdGxlLXNvcnQnKS5jc3MoeyBkaXNwbGF5OiAndW5zZXQnIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGFibGVUaXRsZXNbaV0uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZVRpdGxlc1tpXS5maW5kKCcua2VyZHgtdGFibGUtY29sdW1uLXRpdGxlLXNvcnQnKS5jc3MoeyBkaXNwbGF5OiAnbm9uZScgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0YWJsZVRpdGxlc1tpXS5maW5kKCcua2VyZHgtdGFibGUtY29sdW1uLXRpdGxlLXNvcnQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlVGl0bGVzW2ldLmZpbmQoJy5rZXJkeC10YWJsZS1jb2x1bW4tdGl0bGUtc29ydCcpLnRvZ2dsZUNsYXNzZXMoJ2ZhcywgZmEtYXJyb3ctdXAnKTtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZVRpdGxlc1tpXS5maW5kKCcua2VyZHgtdGFibGUtY29sdW1uLXRpdGxlLXNvcnQnKS50b2dnbGVDbGFzc2VzKCdmYXMsIGZhLWFycm93LWRvd24nKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFibGVUaXRsZXNbaV0uZmluZCgnLmtlcmR4LXRhYmxlLWNvbHVtbi10aXRsZS1zb3J0JykuZGF0YXNldC5kaXJlY3Rpb24gPT0gJ3VwJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZVRpdGxlc1tpXS5maW5kKCcua2VyZHgtdGFibGUtY29sdW1uLXRpdGxlLXNvcnQnKS5kYXRhc2V0LmRpcmVjdGlvbiA9ICdkb3duJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlVGl0bGVzW2ldLmZpbmQoJy5rZXJkeC10YWJsZS1jb2x1bW4tdGl0bGUtc29ydCcpLmRhdGFzZXQuZGlyZWN0aW9uID0gJ3VwJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgdGV4dCA9IHRhYmxlVGl0bGVzW2ldLmZpbmQoJy5rZXJkeC10YWJsZS1jb2x1bW4tdGl0bGUtdGV4dCcpLnRleHRDb250ZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IHRoaXMuc29ydFRhYmxlKHBhcmFtcy50YWJsZS5maW5kKCcua2VyZHgtdGFibGUnKSwgdGV4dCwgZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3VGFibGUgPSB0aGlzLmNyZWF0ZVRhYmxlKHsgY29udGVudHM6IGRhdGEgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdUYWJsZUNvbHVtbnMgPSBuZXdUYWJsZS5maW5kQWxsKCcua2VyZHgtdGFibGUtY29sdW1uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBuZXdUYWJsZUNvbHVtbnMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGVDb2x1bW5zW2pdLmZpbmQoJy5rZXJkeC10YWJsZS1jb2x1bW4tY29udGVudHMnKS5pbm5lckhUTUwgPSBuZXdUYWJsZUNvbHVtbnNbal0uZmluZCgnLmtlcmR4LXRhYmxlLWNvbHVtbi1jb250ZW50cycpLmlubmVySFRNTDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlQ29sdW1ucyA9IHRhYmxlLmZpbmRBbGwoJy5rZXJkeC10YWJsZS1jb2x1bW4nKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuaXNudWxsKHBhcmFtcy50YWJsZS5maW5kKCcua2VyZHgtdGFibGUtc2VhcmNoJykpKSB7XHJcbiAgICAgICAgICAgIHBhcmFtcy50YWJsZS5maW5kKCcua2VyZHgtdGFibGUtc2VhcmNoJykub25DaGFuZ2VkKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgICAgIGZpbHRlcigpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5pc251bGwocGFyYW1zLnRhYmxlLmZpbmQoJy5rZXJkeC10YWJsZS1maWx0ZXInKSkpIHtcclxuICAgICAgICAgICAgcGFyYW1zLnRhYmxlLmZpbmQoJy5rZXJkeC10YWJsZS1maWx0ZXInKS5vbkNoYW5nZWQodmFsdWUgPT4ge1xyXG4gICAgICAgICAgICAgICAgZmlsdGVyKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHNlYXJjaFZhbHVlLCBmaWx0ZXJWYWx1ZTtcclxuXHJcbiAgICAgICAgbGV0IGZpbHRlciA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzbnVsbChwYXJhbXMudGFibGUuZmluZCgnLmtlcmR4LXRhYmxlLXNlYXJjaCcpKSkge1xyXG4gICAgICAgICAgICAgICAgc2VhcmNoVmFsdWUgPSBwYXJhbXMudGFibGUuZmluZCgnLmtlcmR4LXRhYmxlLXNlYXJjaCcpLnZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNudWxsKHBhcmFtcy50YWJsZS5maW5kKCcua2VyZHgtdGFibGUtZmlsdGVyJykpKSB7XHJcbiAgICAgICAgICAgICAgICBmaWx0ZXJWYWx1ZSA9IHBhcmFtcy50YWJsZS5maW5kKCcua2VyZHgtdGFibGUtZmlsdGVyJykudmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm93cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGhpZGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRhYmxlUm93ID0gdGFibGUuZmluZEFsbChgLmtlcmR4LXRhYmxlLWNvbHVtbi1jZWxsW2RhdGEtcm93PVwiJHtpfVwiXWApO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGFibGVSb3cubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZVJvd1tqXS5jc3NSZW1vdmUoWydkaXNwbGF5J10pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzc2V0KGZpbHRlclZhbHVlKSAmJiBoaWRlID09IGZhbHNlICYmIHRoaXMuaXNzZXQoY2FsbGJhY2tzLmZpbHRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBoaWRlID0gY2FsbGJhY2tzLmZpbHRlcihmaWx0ZXJWYWx1ZSwgdGFibGVSb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzc2V0KHNlYXJjaFZhbHVlKSAmJiBoaWRlID09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGlkZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0YWJsZVJvdy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFibGVSb3dbal0udGV4dENvbnRlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2hWYWx1ZS50b0xvd2VyQ2FzZSgpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlkZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGhpZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRhYmxlUm93Lmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlUm93W2pdLmNzcyh7IGRpc3BsYXk6ICdub25lJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KGNhbGxiYWNrcy5jbGljaykpIHtcclxuICAgICAgICAgICAgdGFibGUuYWRkTXVsdGlwbGVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24sIHRvdWNoc3RhcnQnLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2tlcmR4LXRhYmxlLW9wdGlvbicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNzZXQoY2FsbGJhY2tzLmNsaWNrKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3MuY2xpY2soZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2tlcmR4LXRhYmxlLWNvbHVtbi1jZWxsJykgfHwgIXRoaXMuaXNudWxsKHRhcmdldC5nZXRQYXJlbnRzKCcua2VyZHgtdGFibGUtY29sdW1uLWNlbGwnKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2tlcmR4LXRhYmxlLWNvbHVtbi1jZWxsJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gdGFyZ2V0LmdldFBhcmVudHMoJy5rZXJkeC10YWJsZS1jb2x1bW4tY2VsbCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSB0YXJnZXQuZGF0YXNldC5yb3c7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RWaXNpYmxlQ2VsbHNbcG9zaXRpb25dLmNzcyh7IHBvc2l0aW9uOiAncmVsYXRpdmUnIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpcnN0VmlzaWJsZUNlbGxzW3Bvc2l0aW9uXS5hcHBlbmQob3B0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXMudGFibGUuY2xhc3NMaXN0LmNvbnRhaW5zKCdrZXJkeC1zZWxlY3RhYmxlJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdyA9IHRhYmxlLmZpbmRBbGwoYC5rZXJkeC10YWJsZS1jb2x1bW4tY2VsbFtkYXRhLXJvdz1cIiR7cG9zaXRpb259XCJdYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm93Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dbaV0uY2xhc3NMaXN0LnRvZ2dsZSgna2VyZHgtdGFibGUtc2VsZWN0ZWQtcm93Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5yZW1vdmUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygna2VyZHgtdGFibGUtc2VsZWN0ZWQtcm93JykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJzdENvbHVtbi5maW5kQWxsKCcua2VyZHgtdGFibGUtc2VsZWN0ZWQtcm93JykubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMudGFibGUuY2xhc3NMaXN0LnJlbW92ZSgna2VyZHgtc2VsZWN0YWJsZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRhYmxlLnByZXNzZWQoZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHRhcmdldCA9IGV2ZW50LnRhcmdldDtcclxuICAgICAgICAgICAgICAgIGlmIChldmVudC5kdXJhdGlvbiA+IDMwMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdrZXJkeC10YWJsZS1jb2x1bW4tY2VsbCcpIHx8ICF0aGlzLmlzbnVsbCh0YXJnZXQuZ2V0UGFyZW50cygnLmtlcmR4LXRhYmxlLWNvbHVtbi1jZWxsJykpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygna2VyZHgtdGFibGUtY29sdW1uLWNlbGwnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gdGFyZ2V0LmdldFBhcmVudHMoJy5rZXJkeC10YWJsZS1jb2x1bW4tY2VsbCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IHRhcmdldC5kYXRhc2V0LnJvdztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJzdENvbHVtbi5maW5kQWxsKCcua2VyZHgtdGFibGUtc2VsZWN0ZWQtcm93JykubGVuZ3RoID09IDAgJiYgIXBhcmFtcy50YWJsZS5jbGFzc0xpc3QuY29udGFpbnMoJ2tlcmR4LXNlbGVjdGFibGUnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnRhYmxlLmNsYXNzTGlzdC5hZGQoJ2tlcmR4LXNlbGVjdGFibGUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb3cgPSB0YWJsZS5maW5kQWxsKGAua2VyZHgtdGFibGUtY29sdW1uLWNlbGxbZGF0YS1yb3c9XCIke3Bvc2l0aW9ufVwiXWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb3cubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dbaV0uY2xhc3NMaXN0LmFkZCgna2VyZHgtdGFibGUtc2VsZWN0ZWQtcm93Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlRm9ybShwYXJhbXMgPSB7IGVsZW1lbnQ6ICcnLCB0aXRsZTogJycsIGNvbHVtbnM6IDEsIGNvbnRlbnRzOiB7fSwgcmVxdWlyZWQ6IFtdLCBidXR0b25zOiB7fSB9KSB7XHJcbiAgICAgICAgbGV0IGZvcm0gPSB0aGlzLmNyZWF0ZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICBlbGVtZW50OiBwYXJhbXMuZWxlbWVudCB8fCAnZm9ybScsIGF0dHJpYnV0ZXM6IHBhcmFtcy5hdHRyaWJ1dGVzLCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnaDMnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZm9ybS10aXRsZScgfSwgdGV4dDogcGFyYW1zLnRpdGxlIH0sXHJcbiAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdzZWN0aW9uJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LWZvcm0tY29udGVudHMnLCBzdHlsZTogeyBncmlkVGVtcGxhdGVDb2x1bW5zOiBgcmVwZWF0KCR7cGFyYW1zLmNvbHVtbnN9LCAxZnIpYCB9IH0gfSxcclxuICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ3NlY3Rpb24nLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZm9ybS1idXR0b25zJyB9IH0sXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZm9ybS5jbGFzc0xpc3QuYWRkKCdrZXJkeC1mb3JtJyk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KHBhcmFtcy5wYXJlbnQpKSBwYXJhbXMucGFyZW50LmFwcGVuZChmb3JtKTtcclxuICAgICAgICBsZXQgbm90ZTtcclxuICAgICAgICBsZXQgZm9ybUNvbnRlbnRzID0gZm9ybS5maW5kKCcua2VyZHgtZm9ybS1jb250ZW50cycpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gcGFyYW1zLmNvbnRlbnRzKSB7XHJcbiAgICAgICAgICAgIG5vdGUgPSAodGhpcy5pc3NldChwYXJhbXMuY29udGVudHNba2V5XS5ub3RlKSkgPyBgKCR7cGFyYW1zLmNvbnRlbnRzW2tleV0ubm90ZX0pYCA6ICcnO1xyXG4gICAgICAgICAgICBsZXQgbGFibGVUZXh0ID0gcGFyYW1zLmNvbnRlbnRzW2tleV0ubGFiZWwgfHwgdGhpcy5jYW1lbENhc2VkVG9UZXh0KGtleSkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgbGV0IGJsb2NrID0gZm9ybUNvbnRlbnRzLm1ha2VFbGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZm9ybS1zaW5nbGUtY29udGVudCcgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdsYWJlbCcsIGh0bWw6IGxhYmxlVGV4dCwgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LWZvcm0tbGFiZWwnLCBmb3I6IGtleS50b0xvd2VyQ2FzZSgpIH0gfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxldCBkYXRhID0gYmxvY2subWFrZUVsZW1lbnQocGFyYW1zLmNvbnRlbnRzW2tleV0pO1xyXG4gICAgICAgICAgICBkYXRhLmNsYXNzTGlzdC5hZGQoJ2tlcmR4LWZvcm0tZGF0YScpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc3NldChwYXJhbXMuY29udGVudHNba2V5XS5ub3RlKSkgYmxvY2subWFrZUVsZW1lbnQoeyBlbGVtZW50OiAnc3BhbicsIHRleHQ6IHBhcmFtcy5jb250ZW50c1trZXldLm5vdGUsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC1mb3JtLW5vdGUnIH0gfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5pc3NldChwYXJhbXMucmVxdWlyZWQpICYmIHBhcmFtcy5yZXF1aXJlZC5pbmNsdWRlcyhrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhLnJlcXVpcmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHBhcmFtcy5idXR0b25zKSB7XHJcbiAgICAgICAgICAgIGZvcm0uZmluZCgnLmtlcmR4LWZvcm0tYnV0dG9ucycpLm1ha2VFbGVtZW50KHBhcmFtcy5idXR0b25zW2tleV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9ybS5tYWtlRWxlbWVudCh7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LWZvcm0tZXJyb3InIH0sIHN0YXRlOiB7IG5hbWU6ICdlcnJvcicsIG93bmVyOiBgIyR7Zm9ybS5pZH1gIH0gfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBmb3JtO1xyXG4gICAgfVxyXG5cclxuICAgIHBpY2tlcihwYXJhbXMgPSB7IHRpdGxlOiAnJywgY29udGVudHM6IFtdIH0sIGNhbGxiYWNrID0gKGV2ZW50KSA9PiB7IH0pIHtcclxuICAgICAgICBsZXQgcGlja2VyID0gdGhpcy5jcmVhdGVFbGVtZW50KHtcclxuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC1waWNrZXInIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdoMycsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC1waWNrZXItdGl0bGUnIH0sIHRleHQ6IHBhcmFtcy50aXRsZSB8fCAnJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXBpY2tlci1jb250ZW50cycgfSB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY29udGVudCBvZiBwYXJhbXMuY29udGVudHMpIHtcclxuICAgICAgICAgICAgcGlja2VyLmZpbmQoJy5rZXJkeC1waWNrZXItY29udGVudHMnKS5tYWtlRWxlbWVudCh7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXBpY2tlci1zaW5nbGUnLCAnZGF0YS1uYW1lJzogY29udGVudCB9LCB0ZXh0OiBjb250ZW50IH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGlja2VyLmFkZEV2ZW50TGlzdGVuZXIoJ2RibGNsaWNrJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygna2VyZHgtcGlja2VyLXNpbmdsZScpKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhldmVudC50YXJnZXQuZGF0YXNldC5uYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gcGlja2VyO1xyXG4gICAgfVxyXG5cclxuICAgIHBvcFVwKGNvbnRlbnQsIHBhcmFtcyA9IHsgdGl0bGU6ICcnLCBhdHRyaWJ1dGVzOiB7fSB9KSB7XHJcbiAgICAgICAgbGV0IGNvbnRhaW5lciA9IHBhcmFtcy5jb250YWluZXIgfHwgZG9jdW1lbnQuYm9keTtcclxuICAgICAgICBsZXQgdGl0bGUgPSBwYXJhbXMudGl0bGUgfHwgJyc7XHJcblxyXG4gICAgICAgIHBhcmFtcy5hdHRyaWJ1dGVzID0gcGFyYW1zLmF0dHJpYnV0ZXMgfHwge307XHJcbiAgICAgICAgcGFyYW1zLmF0dHJpYnV0ZXMuc3R5bGUgPSBwYXJhbXMuYXR0cmlidXRlcy5zdHlsZSB8fCB7fTtcclxuICAgICAgICBwYXJhbXMuYXR0cmlidXRlcy5zdHlsZS53aWR0aCA9IHBhcmFtcy5hdHRyaWJ1dGVzLnN0eWxlLndpZHRoIHx8ICc1MHZ3JztcclxuICAgICAgICBwYXJhbXMuYXR0cmlidXRlcy5zdHlsZS5oZWlnaHQgPSBwYXJhbXMuYXR0cmlidXRlcy5zdHlsZS5oZWlnaHQgfHwgJzUwdmgnO1xyXG5cclxuICAgICAgICBsZXQgcG9wVXAgPSB0aGlzLmNyZWF0ZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXBvcC11cCcgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBpZDogJ3BvcC11cC13aW5kb3cnLCBjbGFzczogJ2tlcmR4LXBvcC11cC13aW5kb3cnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiB7IGlkOiAncG9wLXVwLW1lbnUnLCBjbGFzczogJ2tlcmR4LXBvcC11cC1tZW51JyB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ3AnLCBhdHRyaWJ1dGVzOiB7IGlkOiAnJywgc3R5bGU6IHsgY29sb3I6ICdpbmhlcml0JywgcGFkZGluZzogJzFlbScgfSB9LCB0ZXh0OiB0aXRsZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2knLCBhdHRyaWJ1dGVzOiB7IGlkOiAndG9nZ2xlLXdpbmRvdycsIGNsYXNzOiAna2VyZHgtcG9wLXVwLWNvbnRyb2wgZmFzIGZhLWV4cGFuZC1hbHQnIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdpJywgYXR0cmlidXRlczogeyBpZDogJ2Nsb3NlLXdpbmRvdycsIGNsYXNzOiAna2VyZHgtcG9wLXVwLWNvbnRyb2wgZmFzIGZhLXRpbWVzJyB9IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdwb3AtdXAtY29udGVudCcsIGNsYXNzOiAna2VyZHgtcG9wLXVwLWNvbnRlbnQnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHBvcFVwLmZpbmQoJyNwb3AtdXAtd2luZG93Jykuc2V0QXR0cmlidXRlcyhwYXJhbXMuYXR0cmlidXRlcyk7XHJcblxyXG4gICAgICAgIHBvcFVwLmZpbmQoJyN0b2dnbGUtd2luZG93JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgIHBvcFVwLmZpbmQoJyN0b2dnbGUtd2luZG93JykuY2xhc3NMaXN0LnRvZ2dsZSgnZmEtZXhwYW5kLWFsdCcpO1xyXG4gICAgICAgICAgICBwb3BVcC5maW5kKCcjdG9nZ2xlLXdpbmRvdycpLmNsYXNzTGlzdC50b2dnbGUoJ2ZhLWNvbXByZXNzLWFsdCcpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHBvcFVwLmZpbmQoJyN0b2dnbGUtd2luZG93JykuY2xhc3NMaXN0LmNvbnRhaW5zKCdmYS1leHBhbmQtYWx0JykpIHtcclxuICAgICAgICAgICAgICAgIHBvcFVwLmZpbmQoJyNwb3AtdXAtd2luZG93JykuY3NzKHsgaGVpZ2h0OiBwYXJhbXMuYXR0cmlidXRlcy5zdHlsZS5oZWlnaHQsIHdpZHRoOiBwYXJhbXMuYXR0cmlidXRlcy5zdHlsZS53aWR0aCB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHBvcFVwLmZpbmQoJyNwb3AtdXAtd2luZG93JykuY3NzKHsgaGVpZ2h0OiAndmFyKC0tZmlsbC1wYXJlbnQpJywgd2lkdGg6ICd2YXIoLS1maWxsLXBhcmVudCknIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHBvcFVwLmZpbmQoJyNjbG9zZS13aW5kb3cnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgcG9wVXAucmVtb3ZlKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmQocG9wVXApO1xyXG4gICAgICAgIHJldHVybiBwb3BVcDtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVTZWxlY3QocGFyYW1zID0geyB2YWx1ZTogJycsIGNvbnRlbnRzOiB7fSwgbXVsdGlwbGU6IGZhbHNlIH0pIHtcclxuICAgICAgICBsZXQgc2VsZWN0ZWQgPSBbXSxcclxuICAgICAgICAgICAgYWxsb3dOYXZpZ2F0ZSA9IGZhbHNlLFxyXG4gICAgICAgICAgICBzY3JvbGxQb3NpdGlvbiA9IC0xLFxyXG4gICAgICAgICAgICBhY3RpdmU7XHJcblxyXG4gICAgICAgIC8vY3JlYXRlIHRoZSBlbGVtZW50XHJcbiAgICAgICAgbGV0IHNlbGVjdCA9IHRoaXMuY3JlYXRlRWxlbWVudCh7XHJcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiBwYXJhbXMuYXR0cmlidXRlcywgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC1zZWxlY3QtY29udHJvbCcsIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2lucHV0JywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXNlbGVjdC1pbnB1dCcsIHZhbHVlOiBwYXJhbXMudmFsdWUgfHwgJycsIGlnbm9yZTogdHJ1ZSB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXNlbGVjdC10b2dnbGUnIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdpbnB1dCcsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC1zZWxlY3Qtc2VhcmNoJywgcGxhY2VIb2xkZXI6ICdTZWFyY2ggbWUuLi4nLCBpZ25vcmU6IHRydWUgfSB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXNlbGVjdC1jb250ZW50cycgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc2VsZWN0LmNsYXNzTGlzdC5hZGQoJ2tlcmR4LXNlbGVjdCcpO1xyXG4gICAgICAgIGxldCBzZXRWYWx1ZSA9IHNlbGVjdC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7XHJcbiAgICAgICAgc2VsZWN0LnZhbHVlID0gW107XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzbnVsbChzZXRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgc2VsZWN0LnZhbHVlID0gdGhpcy5hcnJheS5maW5kQWxsKHNldFZhbHVlLnNwbGl0KCcsJyksIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHYudHJpbSgpICE9ICcnO1xyXG4gICAgICAgICAgICB9KTsvL3JlbW92ZSBhbGwgZW1wdHkgc3RyaW5nc1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VsZWN0LmRhdGFzZXQuYWN0aXZlID0gJ2ZhbHNlJztcclxuICAgICAgICAvL2dldCB0aGUgY29udGVudHNcclxuICAgICAgICBsZXQgY29udGVudHMgPSBzZWxlY3QuZmluZCgnLmtlcmR4LXNlbGVjdC1jb250ZW50cycpO1xyXG4gICAgICAgIGxldCBpbnB1dCA9IHNlbGVjdC5maW5kKCcua2VyZHgtc2VsZWN0LWlucHV0Jyk7XHJcbiAgICAgICAgbGV0IHNlYXJjaCA9IHNlbGVjdC5maW5kKCcua2VyZHgtc2VsZWN0LXNlYXJjaCcpO1xyXG4gICAgICAgIGxldCB0b2dnbGUgPSBzZWxlY3QuZmluZCgnLmtlcmR4LXNlbGVjdC10b2dnbGUnKTtcclxuICAgICAgICBwYXJhbXMuY29udGVudHMgPSBwYXJhbXMuY29udGVudHMgfHwge307XHJcbiAgICAgICAgLy9wb3B1bGF0ZSB0aGUgZWxlbWVudCBjb250ZW50c1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhcmFtcy5jb250ZW50cykpIHsvL1R1cm4gY29udGVudHMgdG8gb2JqZWN0IGlmIGl0cyBhcnJheVxyXG4gICAgICAgICAgICBsZXQgaXRlbXMgPSBwYXJhbXMuY29udGVudHM7XHJcbiAgICAgICAgICAgIHBhcmFtcy5jb250ZW50cyA9IHt9O1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXMuY29udGVudHNbaXRlbXNbaV1dID0gaXRlbXNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgaW4gcGFyYW1zLmNvbnRlbnRzKSB7XHJcbiAgICAgICAgICAgIGxldCBvcHRpb24gPSBjb250ZW50cy5tYWtlRWxlbWVudCh7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LXNlbGVjdC1vcHRpb24nLCB2YWx1ZTogaSB9IH0pO1xyXG4gICAgICAgICAgICBvcHRpb24uaW5uZXJIVE1MID0gcGFyYW1zLmNvbnRlbnRzW2ldO1xyXG4gICAgICAgICAgICBvcHRpb24udmFsdWUgPSBpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgdiBvZiBzZWxlY3QudmFsdWUpIHtcclxuICAgICAgICAgICAgaW5wdXQudmFsdWUgKz0gcGFyYW1zLmNvbnRlbnRzW3ZdO1xyXG4gICAgICAgICAgICBpbnB1dC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY2hhbmdlJykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9lbmFibGUgbXVsdGlwbGUgdmFsdWVzXHJcbiAgICAgICAgbGV0IHNpbmdsZSA9ICghdGhpcy5pc3NldChwYXJhbXMubXVsdGlwbGUpIHx8IHBhcmFtcy5tdWx0aXBsZSA9PSBmYWxzZSk7XHJcblxyXG4gICAgICAgIGxldCBvcHRpb25zID0gc2VsZWN0LmZpbmRBbGwoJy5rZXJkeC1zZWxlY3Qtb3B0aW9uJyk7XHJcblxyXG4gICAgICAgIC8vc2VhcmNoIHRoZSBjb250ZW50c1xyXG4gICAgICAgIHNlYXJjaC5vbkNoYW5nZWQodmFsdWUgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9wdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmICghb3B0aW9uc1tpXS50ZXh0Q29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG93ZXJDYXNlKCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uc1tpXS5jc3MoeyBkaXNwbGF5OiAnbm9uZScgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zW2ldLmNzc1JlbW92ZShbJ2Rpc3BsYXknXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9uYXZpZ2F0ZSB0aGUgY29udGVudHNcclxuICAgICAgICBsZXQgbmF2aWdhdGUgPSBldmVudCA9PiB7XHJcbiAgICAgICAgICAgIGFsbG93TmF2aWdhdGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PSAnQXJyb3dEb3duJyAmJiBzY3JvbGxQb3NpdGlvbiA8IG9wdGlvbnMubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgc2Nyb2xsUG9zaXRpb24rKztcclxuICAgICAgICAgICAgICAgIGFsbG93TmF2aWdhdGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGV2ZW50LmtleSA9PSAnQXJyb3dVcCcgJiYgc2Nyb2xsUG9zaXRpb24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBzY3JvbGxQb3NpdGlvbi0tO1xyXG4gICAgICAgICAgICAgICAgYWxsb3dOYXZpZ2F0ZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZXZlbnQua2V5ID09ICdFbnRlcicpIHtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhbGxvd05hdmlnYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBhY3RpdmUgPSBjb250ZW50cy5maW5kKCcua2VyZHgtc2VsZWN0LWFjdGl2ZS1vcHRpb24nKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc251bGwoYWN0aXZlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZS5jbGFzc0xpc3QucmVtb3ZlKCdrZXJkeC1zZWxlY3QtYWN0aXZlLW9wdGlvbicpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIG9wdGlvbnNbc2Nyb2xsUG9zaXRpb25dLmNsYXNzTGlzdC5hZGQoJ2tlcmR4LXNlbGVjdC1hY3RpdmUtb3B0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vdG9nZ2xlIHRoZSBjb250ZW50c1xyXG4gICAgICAgIHRvZ2dsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgbGV0IGFjdGl2ZSA9IHNlbGVjdC5kYXRhc2V0LmFjdGl2ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgIGlmIChhY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgIGRlYWN0aXZhdGUoYWN0aXZlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFjdGl2YXRlKGFjdGl2ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9zaG93IHRoZSBjb250ZW50c1xyXG4gICAgICAgIGxldCBpblZpZXcsIHRvcCwgYm90dG9tO1xyXG4gICAgICAgIGRvY3VtZW50LmJvZHkuY3NzKHsgb3ZlcmZsb3c6ICdhdXRvJyB9KVxyXG5cclxuICAgICAgICBsZXQgcGxhY2VDb250ZW50cyA9ICgpID0+IHtcclxuICAgICAgICAgICAgdG9wID0gc2VsZWN0LnBvc2l0aW9uKCkudG9wO1xyXG4gICAgICAgICAgICBib3R0b20gPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCAtIHNlbGVjdC5wb3NpdGlvbigpLnRvcDtcclxuXHJcbiAgICAgICAgICAgIGlmICh0b3AgPiBib3R0b20pIHtcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRzLmNzcyh7IHRvcDogLWNvbnRlbnRzLnBvc2l0aW9uKCkuaGVpZ2h0ICsgJ3B4JyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRzLmNzcyh7IHRvcDogc2VsZWN0LnBvc2l0aW9uKCkuaGVpZ2h0ICsgJ3B4JyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9zaG93IGNvbnRlbnRzXHJcbiAgICAgICAgbGV0IGFjdGl2YXRlID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoc2VsZWN0LmluVmlldygnYm9keScpKSB7XHJcbiAgICAgICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgbmF2aWdhdGUsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIHNlYXJjaC5jc3MoeyBkaXNwbGF5OiAnZmxleCcgfSk7XHJcbiAgICAgICAgICAgICAgICBjb250ZW50cy5jc3MoeyBkaXNwbGF5OiAnZmxleCcgfSk7XHJcbiAgICAgICAgICAgICAgICBwbGFjZUNvbnRlbnRzKCk7XHJcbiAgICAgICAgICAgICAgICBzZWxlY3QuZGF0YXNldC5hY3RpdmUgPSAndHJ1ZSc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vaGlkZSB0aGUgY29udGVudHNcclxuICAgICAgICBsZXQgZGVhY3RpdmF0ZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgaW5wdXQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIG5hdmlnYXRlLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHNlYXJjaC5jc3NSZW1vdmUoWydkaXNwbGF5J10pO1xyXG4gICAgICAgICAgICBjb250ZW50cy5jc3NSZW1vdmUoWydkaXNwbGF5J10pO1xyXG4gICAgICAgICAgICBzZWxlY3QuZGF0YXNldC5hY3RpdmUgPSAnZmFsc2UnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy91cGRhdGUgdGhlIHNlbGVjdGVkXHJcbiAgICAgICAgbGV0IHVwZGF0ZSA9ICh2YWx1ZXMpID0+IHtcclxuICAgICAgICAgICAgc2VsZWN0ZWQgPSBbXTtcclxuICAgICAgICAgICAgdmFsdWVzID0gdmFsdWVzLnNwbGl0KCcsJyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHZhbHVlIG9mIHZhbHVlcykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50cmltKCk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpIGluIHBhcmFtcy5jb250ZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXMuY29udGVudHNbaV0gPT0gdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZC5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgc2VsZWN0LnZhbHVlID0gc2VsZWN0ZWQ7XHJcbiAgICAgICAgICAgIGlucHV0LnZhbHVlID0gdmFsdWVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9jaGVjayB3aGVuIGFjdGl2YXRlZFxyXG4gICAgICAgIHNlbGVjdC5idWJibGVkRXZlbnQoJ2NsaWNrJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0ICE9IHRvZ2dsZSAmJiBzZWxlY3QuZGF0YXNldC5hY3RpdmUgPT0gJ2ZhbHNlJykge1xyXG4gICAgICAgICAgICAgICAgYWN0aXZhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGV2ZW50LnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2tlcmR4LXNlbGVjdC1vcHRpb24nKSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHRleHQgPSBwYXJhbXMuY29udGVudHNbZXZlbnQudGFyZ2V0LnZhbHVlXTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMubXVsdGlwbGUgPT0gJ3NpbmdsZScpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQudmFsdWUuaW5jbHVkZXModGV4dCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBpbnB1dC52YWx1ZS5yZXBsYWNlKHRleHQsICcnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlICs9IGAsICR7dGV4dH1gO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlICs9IGAsICR7dGV4dH1gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlucHV0LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjaGFuZ2UnKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNpbmdsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYWN0aXZhdGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL2NoZWNrIHdoZW4gZGVhY3RpdmF0ZWRcclxuICAgICAgICBzZWxlY3Qubm90QnViYmxlZEV2ZW50KCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgaWYgKHNlbGVjdC5kYXRhc2V0LmFjdGl2ZSA9PSAndHJ1ZScpIHtcclxuICAgICAgICAgICAgICAgIGRlYWN0aXZhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL3doZW4gaW5wdXQgdmFsdWUgY2hhbmdlc1xyXG4gICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgbGV0IHZhbHVlcyA9IGlucHV0LnZhbHVlLnNwbGl0KCcsJyk7XHJcblxyXG4gICAgICAgICAgICB2YWx1ZXMgPSB0aGlzLmFycmF5LmZpbmRBbGwodmFsdWVzLCB2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUudHJpbSgpICE9ICcnO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHZhbHVlcyA9IHRoaXMuYXJyYXkuZWFjaCh2YWx1ZXMsIHZhbHVlID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS50cmltKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFzaW5nbGUpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMubXVsdGlwbGUgPT0gJ3NpbmdsZScpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMgPSB0aGlzLmFycmF5LnRvU2V0KHZhbHVlcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhbHVlcyA9IHZhbHVlcy5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICB1cGRhdGUodmFsdWVzKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9hbGlnbiBjb250ZW50cyBvbiBzY3JvbGxcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICBpZiAoc2VsZWN0LmluVmlldygnYm9keScpKSB7XHJcbiAgICAgICAgICAgICAgICBwbGFjZUNvbnRlbnRzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHNlbGVjdDtcclxuICAgIH1cclxuXHJcbiAgICBjaG9vc2UocGFyYW1zID0geyBub3RlOiAnJywgb3B0aW9uczogW10gfSkge1xyXG4gICAgICAgIGxldCBjaG9vc2VXaW5kb3cgPSB0aGlzLmNyZWF0ZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdjcmF0ZXItY2hvb3NlJyB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgeyBlbGVtZW50OiAncCcsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdjcmF0ZXItY2hvb3NlLW5vdGUnIH0sIHRleHQ6IHBhcmFtcy5ub3RlIH0sXHJcbiAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2NyYXRlci1jaG9vc2UtY29udHJvbCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ2NyYXRlci1jaG9vc2UtY2xvc2UnLCBjbGFzczogJ2J0bicgfSwgdGV4dDogJ0Nsb3NlJyB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IGNob29zZUNvbnRyb2wgPSBjaG9vc2VXaW5kb3cucXVlcnlTZWxlY3RvcignLmNyYXRlci1jaG9vc2UtY29udHJvbCcpO1xyXG5cclxuICAgICAgICBjaG9vc2VXaW5kb3cucXVlcnlTZWxlY3RvcignI2NyYXRlci1jaG9vc2UtY2xvc2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgY2hvb3NlV2luZG93LnJlbW92ZSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBvcHRpb24gb2YgcGFyYW1zLm9wdGlvbnMpIHtcclxuICAgICAgICAgICAgY2hvb3NlQ29udHJvbC5tYWtlRWxlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBjbGFzczogJ2J0biBjaG9vc2Utb3B0aW9uJyB9LCB0ZXh0OiBvcHRpb25cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBkaXNwbGF5OiBjaG9vc2VXaW5kb3csIGNob2ljZTogbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2hvb3NlQ29udHJvbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnY2hvb3NlLW9wdGlvbicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXZlbnQudGFyZ2V0LnRleHRDb250ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hvb3NlV2luZG93LnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgdGV4dEVkaXRvcihwYXJhbXMgPSB7IGlkOiAnJywgd2lkdGg6ICdtYXgtd2lkdGgnIH0pIHtcclxuICAgICAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICAgICAgcGFyYW1zLmlkID0gcGFyYW1zLmlkIHx8ICd0ZXh0LWVkaXRvcic7XHJcbiAgICAgICAgbGV0IHRleHRFZGl0b3IgPSB0aGlzLmNyZWF0ZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHBhcmFtcy5pZFxyXG4gICAgICAgICAgICB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdzdHlsZScsIHRleHQ6IGBcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZGl2I2NyYXRlci10ZXh0LWVkaXRvcntcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAwIGF1dG87XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6IGdyaWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAke3BhcmFtcy53aWR0aCB8fCAnbWF4LWNvbnRlbnQnfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBtYXgtY29udGVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAycHggc29saWQgcmdiKDQwLCAxMTAsIDg5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogOHB4IDhweCAwcHggMHB4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1wcmltYXJ5LWNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgZGl2I2NyYXRlci1yaWNoLXRleHQtYXJlYXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAxMDAlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMTAwJTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpdiNjcmF0ZXItdGhlLXJpYmJvbntcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyLWJvdHRvbTogbm9uZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDEwMCU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IC41ZW0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogZ3JpZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiBtYXgtY29udGVudCBtYXgtY29udGVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogcmdiKDQwLCAxMTAsIDg5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IHZhcigtLXByaW1hcnktY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0LWFsaWduOiBsZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWZyYW1lI2NyYXRlci10aGUtV1lTSVdZR3tcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAxMDAlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMTAwJTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpdiNjcmF0ZXItdGhlLXJpYmJvbiBidXR0b257XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiB2YXIoLS1wcmltYXJ5LWNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiBub25lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRsaW5lOiBub25lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAuM2VtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46IC41ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBkaXYjY3JhdGVyLXRoZS1yaWJib24gYnV0dG9uOmhvdmVye1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMjAsIDkwLCA3MCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb246IGFsbCAwLjNzIGxpbmVhciAwcztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpdiNjcmF0ZXItdGhlLXJpYmJvbiBpbnB1dCwgIGRpdiNjcmF0ZXItdGhlLXJpYmJvbiBzZWxlY3R7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjogLjVlbTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpdiNjcmF0ZXItdGhlLXJpYmJvbiBpbnB1dFt0eXBlPVwiY29sb3JcIl17XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogbm9uZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0bGluZTogbm9uZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsIGF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdjcmF0ZXItdGhlLXJpYmJvbidcclxuICAgICAgICAgICAgICAgICAgICB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ3VuZG9CdXR0b24nLCB0aXRsZTogJ1VuZG8nIH0sIHRleHQ6ICcmbGFycjsnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ3JlZG9CdXR0b24nLCB0aXRsZTogJ1JlZG8nIH0sIHRleHQ6ICcmcmFycjsnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnc2VsZWN0JywgYXR0cmlidXRlczogeyBpZDogJ2ZvbnRDaGFuZ2VyJyB9LCBvcHRpb25zOiB0aGlzLmZvbnRTdHlsZXMgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdzZWxlY3QnLCBhdHRyaWJ1dGVzOiB7IGlkOiAnZm9udFNpemVDaGFuZ2VyJyB9LCBvcHRpb25zOiB0aGlzLnJhbmdlKDEsIDIwKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2J1dHRvbicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdvcmRlcmVkTGlzdEJ1dHRvbicsIHRpdGxlOiAnTnVtYmVyZWQgTGlzdCcgfSwgdGV4dDogJyhpKScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdidXR0b24nLCBhdHRyaWJ1dGVzOiB7IGlkOiAndW5vcmRlcmVkTGlzdEJ1dHRvbicsIHRpdGxlOiAnQnVsbGV0dGVkIExpc3QnIH0sIHRleHQ6ICcmYnVsbDsnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ2xpbmtCdXR0b24nLCB0aXRsZTogJ0NyZWF0ZSBMaW5rJyB9LCB0ZXh0OiAnTGluaycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdidXR0b24nLCBhdHRyaWJ1dGVzOiB7IGlkOiAndW5MaW5rQnV0dG9uJywgdGl0bGU6ICdSZW1vdmUgTGluaycgfSwgdGV4dDogJ1VubGluaycgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnc3BhbicsIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ2JvbGRCdXR0b24nLCB0aXRsZTogJ0JvbGQnIH0sIGNoaWxkcmVuOiBbeyBlbGVtZW50OiAnYicsIHRleHQ6ICdCJyB9XSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2J1dHRvbicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdpdGFsaWNCdXR0b24nLCB0aXRsZTogJ0l0YWxpYycgfSwgY2hpbGRyZW46IFt7IGVsZW1lbnQ6ICdlbScsIHRleHQ6ICdJJyB9XSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2J1dHRvbicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICd1bmRlcmxpbmVCdXR0b24nLCB0aXRsZTogJ1VuZGVybGluZScgfSwgY2hpbGRyZW46IFt7IGVsZW1lbnQ6ICd1JywgdGV4dDogJ1UnIH1dIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ3N1cEJ1dHRvbicsIHRpdGxlOiAnU3VwZXJzY3JpcHQnIH0sIGNoaWxkcmVuOiBbeyBlbGVtZW50OiAnc3VwJywgdGV4dDogJzInIH1dIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ3N1YkJ1dHRvbicsIHRpdGxlOiAnU3Vic2NyaXB0JyB9LCBjaGlsZHJlbjogW3sgZWxlbWVudDogJ3N1YicsIHRleHQ6ICcyJyB9XSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2J1dHRvbicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdzdHJpa2VCdXR0b24nLCB0aXRsZTogJ1N0cmlrZXRocm91Z2gnIH0sIGNoaWxkcmVuOiBbeyBlbGVtZW50OiAncycsIHRleHQ6ICdhYmMnIH1dIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnaW5wdXQnLCBhdHRyaWJ1dGVzOiB7IHR5cGU6ICdjb2xvcicsIGlkOiAnZm9udENvbG9yQnV0dG9uJywgdGl0bGU6ICdDaGFuZ2UgRm9udCBDb2xvcicsIHZhbHVlOiAnIzAwMDAwMCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2lucHV0JywgYXR0cmlidXRlczogeyB0eXBlOiAnY29sb3InLCBpZDogJ2hpZ2hsaWdodEJ1dHRvbicsIHRpdGxlOiAnSGlnaHRsaWdodCBUZXh0JywgdmFsdWU6ICcjZmZmZmZmJyB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnaW5wdXQnLCBhdHRyaWJ1dGVzOiB7IHR5cGU6ICdjb2xvcicsIGlkOiAnYmFja2dyb3VuZEJ1dHRvbicsIHRpdGxlOiAnQ2hhbmdlIEJhY2tncm91bmQnLCB2YWx1ZTogJyNmZmZmZmYnIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdidXR0b24nLCBhdHRyaWJ1dGVzOiB7IGlkOiAnYWxpZ25MZWZ0QnV0dG9uJywgdGl0bGU6ICdBbGlnbiBMZWZ0JyB9LCBjaGlsZHJlbjogW3sgZWxlbWVudDogJ2EnLCB0ZXh0OiAnTCcgfV0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdidXR0b24nLCBhdHRyaWJ1dGVzOiB7IGlkOiAnYWxpZ25DZW50ZXJCdXR0b24nLCB0aXRsZTogJ0FsaWduIENlbnRlcicgfSwgY2hpbGRyZW46IFt7IGVsZW1lbnQ6ICdhJywgdGV4dDogJ0MnIH1dIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ2FsaWduSnVzdGlmeUJ1dHRvbicsIHRpdGxlOiAnQWxpZ24gSnVzdGlmeScgfSwgY2hpbGRyZW46IFt7IGVsZW1lbnQ6ICdhJywgdGV4dDogJ0onIH1dIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnYnV0dG9uJywgYXR0cmlidXRlczogeyBpZDogJ2FsaWduUmlnaHRCdXR0b24nLCB0aXRsZTogJ0FsaWduIFJpZ2h0JyB9LCBjaGlsZHJlbjogW3sgZWxlbWVudDogJ2EnLCB0ZXh0OiAnUicgfV0gfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2NyYXRlci1yaWNoLXRleHQtYXJlYSdcclxuICAgICAgICAgICAgICAgICAgICB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnaWZyYW1lJywgYXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnY3JhdGVyLXRoZS1XWVNJV1lHJywgZnJhbWVCb3JkZXI6IDAsIG5hbWU6ICd0aGVXWVNJV1lHJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGxldCBmb250cyA9IHRleHRFZGl0b3IuZmluZEFsbCgnc2VsZWN0I2ZvbnQtY2hhbmdlciA+IG9wdGlvbicpO1xyXG4gICAgICAgIGZvbnRzLmZvckVhY2goZm9udCA9PiB7XHJcbiAgICAgICAgICAgIGZvbnQuY3NzKHsgZm9udEZhbWlseTogZm9udC52YWx1ZSB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjdW5vcmRlcmVkTGlzdEJ1dHRvbicpLmlubmVySFRNTCA9ICcmYnVsbDsnO1xyXG4gICAgICAgIHRleHRFZGl0b3IuZmluZCgnI3JlZG9CdXR0b24nKS5pbm5lckhUTUwgPSAnJnJhcnI7JztcclxuICAgICAgICB0ZXh0RWRpdG9yLmZpbmQoJyN1bmRvQnV0dG9uJykuaW5uZXJIVE1MID0gJyZsYXJyOyc7XHJcblxyXG4gICAgICAgIGxldCBzZWxmID0gdGhpcztcclxuICAgICAgICBsZXQgZWRpdG9yV2luZG93ID0gdGV4dEVkaXRvci5maW5kKCcjY3JhdGVyLXRoZS1XWVNJV1lHJyk7XHJcbiAgICAgICAgZWRpdG9yV2luZG93Lm9uQWRkZWQoKCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZWRpdG9yID0gZWRpdG9yV2luZG93LmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQ7XHJcblxyXG4gICAgICAgICAgICBlZGl0b3IuYm9keS5pbm5lckhUTUwgPSAnJztcclxuICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQocGFyYW1zLmNvbnRlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICBlZGl0b3IuYm9keS5pbm5lckhUTUwgPSBwYXJhbXMuY29udGVudC5pbm5lckhUTUw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGVkaXRvci5kZXNpZ25Nb2RlID0gJ29uJztcclxuXHJcbiAgICAgICAgICAgIHRleHRFZGl0b3IuZmluZCgnI2JvbGRCdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnQm9sZCcsIGZhbHNlLCBudWxsKTtcclxuICAgICAgICAgICAgfSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjaXRhbGljQnV0dG9uJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ0l0YWxpYycsIGZhbHNlLCBudWxsKTtcclxuICAgICAgICAgICAgfSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjdW5kZXJsaW5lQnV0dG9uJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ1VuZGVybGluZScsIGZhbHNlLCBudWxsKTtcclxuICAgICAgICAgICAgfSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjc3VwQnV0dG9uJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ1N1cGVyc2NyaXB0JywgZmFsc2UsIG51bGwpO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICB0ZXh0RWRpdG9yLmZpbmQoJyNzdWJCdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnU3Vic2NyaXB0JywgZmFsc2UsIG51bGwpO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICB0ZXh0RWRpdG9yLmZpbmQoJyNzdHJpa2VCdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnU3RyaWtldGhyb3VnaCcsIGZhbHNlLCBudWxsKTtcclxuICAgICAgICAgICAgfSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjb3JkZXJlZExpc3RCdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnSW5zZXJ0T3JkZXJlZExpc3QnLCBmYWxzZSwgYG5ld09MJHtzZWxmLnJhbmRvbSgpfWApO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICB0ZXh0RWRpdG9yLmZpbmQoJyN1bm9yZGVyZWRMaXN0QnV0dG9uJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ0luc2VydFVub3JkZXJlZExpc3QnLCBmYWxzZSwgYG5ld1VMJHtzZWxmLnJhbmRvbSgpfWApO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICB0ZXh0RWRpdG9yLmZpbmQoJyNmb250Q29sb3JCdXR0b24nKS5vbkNoYW5nZWQodmFsdWUgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKCdGb3JlQ29sb3InLCBmYWxzZSwgdmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRleHRFZGl0b3IuZmluZCgnI2hpZ2hsaWdodEJ1dHRvbicpLm9uQ2hhbmdlZCh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlZGl0b3IuZXhlY0NvbW1hbmQoJ0JhY2tDb2xvcicsIGZhbHNlLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjYmFja2dyb3VuZEJ1dHRvbicpLm9uQ2hhbmdlZCh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlZGl0b3IuYm9keS5zdHlsZS5iYWNrZ3JvdW5kID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjZm9udENoYW5nZXInKS5vbkNoYW5nZWQodmFsdWUgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKCdGb250TmFtZScsIGZhbHNlLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjZm9udFNpemVDaGFuZ2VyJykub25DaGFuZ2VkKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnRm9udFNpemUnLCBmYWxzZSwgdmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRleHRFZGl0b3IuZmluZCgnI2xpbmtCdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCB1cmwgPSBwcm9tcHQoJ0VudGVyIGEgVVJMJywgJ2h0dHA6Ly8nKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc251bGwodXJsKSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKCdDcmVhdGVMaW5rJywgZmFsc2UsIHVybCk7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlKTtcclxuXHJcbiAgICAgICAgICAgIHRleHRFZGl0b3IuZmluZCgnI3VuTGlua0J1dHRvbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKCdVbkxpbmsnLCBmYWxzZSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0sIGZhbHNlKTtcclxuXHJcbiAgICAgICAgICAgIHRleHRFZGl0b3IuZmluZCgnI3VuZG9CdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnVW5kbycsIGZhbHNlLCBudWxsKTtcclxuICAgICAgICAgICAgfSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjcmVkb0J1dHRvbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKCdyZWRvJywgZmFsc2UsIG51bGwpO1xyXG4gICAgICAgICAgICB9LCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICB0ZXh0RWRpdG9yLmZpbmQoJyNhbGlnbkxlZnRCdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnanVzdGlmeUxlZnQnLCBmYWxzZSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjYWxpZ25DZW50ZXJCdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnanVzdGlmeUNlbnRlcicsIGZhbHNlLCBudWxsKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0ZXh0RWRpdG9yLmZpbmQoJyNhbGlnbkp1c3RpZnlCdXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGVkaXRvci5leGVjQ29tbWFuZCgnanVzdGlmeUZ1bGwnLCBmYWxzZSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGV4dEVkaXRvci5maW5kKCcjYWxpZ25SaWdodEJ1dHRvbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWRpdG9yLmV4ZWNDb21tYW5kKCdqdXN0aWZ5UmlnaHQnLCBmYWxzZSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sIGZhbHNlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRleHRFZGl0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgZGlzcGxheURhdGEoZGF0YSA9IHt9LCBjb250YWluZXIpIHtcclxuICAgICAgICBsZXQgbGluZU51bWJlcnMgPSBbXTtcclxuICAgICAgICBsZXQgZGlzcGxheVN0cmluZyA9ICh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVFbGVtZW50KHsgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZGF0YS1zdHInIH0sIHRleHQ6IGBcIiR7dmFsdWV9XCJgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGRpc3BsYXlMaXRlcmFsID0gKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUVsZW1lbnQoeyBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC1kYXRhLWxpdCcgfSwgdGV4dDogYCR7dmFsdWV9YCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBkaXNwbGF5UHVuY3R1YXRpb24gPSAodmFsdWUpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlRWxlbWVudCh7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LWRhdGEtcHVuJyB9LCB0ZXh0OiBgJHt2YWx1ZX1gIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGRpc3BsYXlOZXdMaW5lID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBpbmNyZW1lbnQrKztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlRWxlbWVudCh7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LWRhdGEtcGxuJyB9IH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGRpc3BsYXlJdGVtID0gKHZhbHVlLCBwYXJhbXMpID0+IHtcclxuICAgICAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xyXG4gICAgICAgICAgICBsZXQgaXRlbSA9IHRoaXMuY3JlYXRlRWxlbWVudCh7IGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LWRhdGEtaXRlbScgfSB9KTtcclxuICAgICAgICAgICAgbGluZU51bWJlcnMucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNzZXQocGFyYW1zLmtleSkpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0ubWFrZUVsZW1lbnQoW1xyXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlTdHJpbmcocGFyYW1zLmtleSksXHJcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVB1bmN0dWF0aW9uKCcgOiAnKSxcclxuICAgICAgICAgICAgICAgICAgICBjaG9vc2VEaXNwbGF5KHZhbHVlKSxcclxuICAgICAgICAgICAgICAgIF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5tYWtlRWxlbWVudChbXHJcbiAgICAgICAgICAgICAgICAgICAgY2hvb3NlRGlzcGxheSh2YWx1ZSksXHJcbiAgICAgICAgICAgICAgICBdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gaXRlbTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBkaXNwbGF5QXJyYXkgPSAodmFsdWUpID0+IHtcclxuICAgICAgICAgICAgbGV0IGFycmF5ID0gdGhpcy5jcmVhdGVFbGVtZW50KHsgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZGF0YS1ibG9jaycgfSB9KTtcclxuICAgICAgICAgICAgbGluZU51bWJlcnMucHVzaChhcnJheSk7XHJcblxyXG4gICAgICAgICAgICBhcnJheS5tYWtlRWxlbWVudChkaXNwbGF5UHVuY3R1YXRpb24oJ1snKSk7XHJcbiAgICAgICAgICAgIGxldCBpdGVtO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtID0gYXJyYXkubWFrZUVsZW1lbnQoZGlzcGxheUl0ZW0odmFsdWVbaV0pKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaSAhPSB2YWx1ZS5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5tYWtlRWxlbWVudChkaXNwbGF5UHVuY3R1YXRpb24oJywnKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXJyYXkubWFrZUVsZW1lbnQoZGlzcGxheVB1bmN0dWF0aW9uKCddJykpO1xyXG4gICAgICAgICAgICByZXR1cm4gYXJyYXk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZGlzcGxheU9iamVjdCA9ICh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgb2JqZWN0ID0gdGhpcy5jcmVhdGVFbGVtZW50KHsgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZGF0YS1ibG9jaycgfSB9KTtcclxuICAgICAgICAgICAgbGluZU51bWJlcnMucHVzaChvYmplY3QpO1xyXG5cclxuICAgICAgICAgICAgb2JqZWN0Lm1ha2VFbGVtZW50KGRpc3BsYXlQdW5jdHVhdGlvbigneycpKTtcclxuICAgICAgICAgICAgbGV0IGl0ZW07XHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtID0gb2JqZWN0Lm1ha2VFbGVtZW50KGRpc3BsYXlJdGVtKHZhbHVlW2tleV0sIHsga2V5IH0pKTtcclxuICAgICAgICAgICAgICAgIGlmIChpICE9IE9iamVjdC5rZXlzKHZhbHVlKS5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5tYWtlRWxlbWVudChkaXNwbGF5UHVuY3R1YXRpb24oJywnKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb2JqZWN0Lm1ha2VFbGVtZW50KGRpc3BsYXlQdW5jdHVhdGlvbignfScpKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBjaG9vc2VEaXNwbGF5ID0gKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRpc3BsYXlTdHJpbmcodmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGlzcGxheUFycmF5KHZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkaXNwbGF5T2JqZWN0KHZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkaXNwbGF5TGl0ZXJhbCh2YWx1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGxpbmVIZWlnaHQgPSAnMjVweCc7XHJcbiAgICAgICAgbGV0IGRpc3BsYXllZCA9IHRoaXMuY3JlYXRlRWxlbWVudCh7XHJcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdwcmUnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZGF0YS13aW5kb3cnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZGF0YS1saW5lJywgc3R5bGU6IHsgbGluZUhlaWdodCB9IH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAna2VyZHgtZGF0YS10b2dnbGVzJyB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdjb2RlJywgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LWRhdGEtY29kZScsIHN0eWxlOiB7IGxpbmVIZWlnaHQgfSB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaG9vc2VEaXNwbGF5KGRhdGEpXHJcbiAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KGNvbnRhaW5lcikpIHtcclxuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZChkaXNwbGF5ZWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGNvZGUgPSBkaXNwbGF5ZWQuZmluZCgnLmtlcmR4LWRhdGEtY29kZScpLFxyXG4gICAgICAgICAgICBudW1iZXJzLFxyXG4gICAgICAgICAgICB0b2dnbGVCdXR0b25zLFxyXG4gICAgICAgICAgICBoZWlnaHQgPSBjb2RlLnBvc2l0aW9uKCkuaGVpZ2h0LFxyXG4gICAgICAgICAgICBsaW5lcyA9IGRpc3BsYXllZC5maW5kKCcua2VyZHgtZGF0YS1saW5lJyksXHJcbiAgICAgICAgICAgIHRvZ2dsZXMgPSBkaXNwbGF5ZWQuZmluZCgnLmtlcmR4LWRhdGEtdG9nZ2xlcycpLFxyXG4gICAgICAgICAgICBjb3VudCA9IGhlaWdodCAvIHBhcnNlSW50KGxpbmVIZWlnaHQpLFxyXG4gICAgICAgICAgICBpdGVtcyA9IGNvZGUuZmluZEFsbCgnLmtlcmR4LWRhdGEtaXRlbScpLFxyXG4gICAgICAgICAgICBibG9ja3MgPSBjb2RlLmZpbmRBbGwoJy5rZXJkeC1kYXRhLWJsb2NrJyk7XHJcblxyXG4gICAgICAgIGxldCBzZXRSYW5nZSA9IChibG9jaykgPT4ge1xyXG4gICAgICAgICAgICBsZXQgc3RhcnQgPSBNYXRoLmZsb29yKChibG9jay5wb3NpdGlvbigpLnRvcCAtIGNvZGUucG9zaXRpb24oKS50b3ApIC8gcGFyc2VJbnQobGluZUhlaWdodCkpICsgMTtcclxuICAgICAgICAgICAgbGV0IGVuZCA9IE1hdGguZmxvb3IoKGJsb2NrLnBvc2l0aW9uKCkuYm90dG9tIC0gY29kZS5wb3NpdGlvbigpLnRvcCkgLyBwYXJzZUludChsaW5lSGVpZ2h0KSkgKyAxO1xyXG4gICAgICAgICAgICBibG9jay5yYW5nZSA9IHRoaXMucmFuZ2UoZW5kLCBzdGFydCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc2V0TnVtYmVycyA9ICgpID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lTnVtYmVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgbGluZXMubWFrZUVsZW1lbnQoW1xyXG4gICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2EnLCBodG1sOiBgJHtpIC8gMSArIDF9YCwgYXR0cmlidXRlczogeyBjbGFzczogJ2tlcmR4LWRhdGEtbGluZS1udW1iZXInIH0gfVxyXG4gICAgICAgICAgICAgICAgXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzZXRUb2dnbGVzID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJsb2Nrcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHRvcCA9IGJsb2Nrc1tpXS5wb3NpdGlvbigpLnRvcCAtIGNvZGUucG9zaXRpb24oKS50b3AgKyA2ICsgJ3B4J1xyXG4gICAgICAgICAgICAgICAgbGV0IHRvZ2dsZSA9IHRvZ2dsZXMubWFrZUVsZW1lbnQoeyBlbGVtZW50OiAnaScsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdrZXJkeC1kYXRhLXRvZ2dsZXMtYnV0dG9uIGZhcyBmYS1hcnJvdy1kb3duJywgc3R5bGU6IHsgdG9wIH0gfSB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0b2dnbGUuYmxvY2sgPSBibG9ja3NbaV07XHJcbiAgICAgICAgICAgICAgICBibG9ja3NbaV0udG9nZ2xlID0gdG9nZ2xlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYWxpZ25Ub2dnbGVzID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRvZ2dsZUJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRvZ2dsZUJ1dHRvbnNbaV0uY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IHRvZ2dsZUJ1dHRvbnNbaV0uYmxvY2sucG9zaXRpb24oKS50b3AgLSBjb2RlLnBvc2l0aW9uKCkudG9wICsgNiArICdweCdcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgaGlkZU51bWJlcnMgPSAoYmxvY2spID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBibG9jay5yYW5nZS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzc2V0KG51bWJlcnNbYmxvY2sucmFuZ2VbaV1dLmNvbnRyb2xsZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyc1tibG9jay5yYW5nZVtpXV0uY3NzKHsgZGlzcGxheTogJ25vbmUnIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIG51bWJlcnNbYmxvY2sucmFuZ2VbaV1dLmNvbnRyb2xsZXIgPSBibG9jaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGhpZGVCbG9jayA9IChibG9jaykgPT4ge1xyXG4gICAgICAgICAgICBsZXQgYmxvY2tDb250ZW50ID0gYmxvY2suY2hpbGRyZW47XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmxvY2tDb250ZW50Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2tDb250ZW50W2ldLmNsYXNzTGlzdC5jb250YWlucygna2VyZHgtZGF0YS1pdGVtJykpIHtcclxuICAgICAgICAgICAgICAgICAgICBibG9ja0NvbnRlbnRbaV0uY3NzKHsgZGlzcGxheTogJ25vbmUnIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBibG9ja0NvbnRlbnRbaV0uZmluZEFsbCgnLmtlcmR4LWRhdGEtYmxvY2snKS5mb3JFYWNoKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNzZXQoYi50b2dnbGUuY29udHJvbGxlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGIudG9nZ2xlLmNvbnRyb2xsZXIgPSBibG9jaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGIudG9nZ2xlLmNzcyh7IGRpc3BsYXk6ICdub25lJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc2hvd051bWJlcnMgPSAoYmxvY2spID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBibG9jay5yYW5nZS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKG51bWJlcnNbYmxvY2sucmFuZ2VbaV1dLmNvbnRyb2xsZXIgPT0gYmxvY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBudW1iZXJzW2Jsb2NrLnJhbmdlW2ldXS5jc3NSZW1vdmUoWydkaXNwbGF5J10pO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBudW1iZXJzW2Jsb2NrLnJhbmdlW2ldXS5jb250cm9sbGVyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc2hvd0Jsb2NrID0gKGJsb2NrKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBibG9ja0NvbnRlbnQgPSBibG9jay5jaGlsZHJlbjtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBibG9ja0NvbnRlbnQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChibG9ja0NvbnRlbnRbaV0uY2xhc3NMaXN0LmNvbnRhaW5zKCdrZXJkeC1kYXRhLWl0ZW0nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrQ29udGVudFtpXS5jc3NSZW1vdmUoWydkaXNwbGF5J10pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBibG9ja0NvbnRlbnRbaV0uZmluZEFsbCgnLmtlcmR4LWRhdGEtYmxvY2snKS5mb3JFYWNoKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYi50b2dnbGUuY29udHJvbGxlciA9PSBibG9jaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGIudG9nZ2xlLmNvbnRyb2xsZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiLnRvZ2dsZS5jc3NSZW1vdmUoWydkaXNwbGF5J10pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxpbmVOdW1iZXJzLnB1c2godW5kZWZpbmVkKVxyXG5cclxuICAgICAgICBkaXNwbGF5ZWQub25BZGRlZChldmVudCA9PiB7XHJcbiAgICAgICAgICAgIHNldE51bWJlcnMoKTtcclxuICAgICAgICAgICAgc2V0VG9nZ2xlcygpO1xyXG5cclxuICAgICAgICAgICAgbnVtYmVycyA9IGxpbmVzLmZpbmRBbGwoJy5rZXJkeC1kYXRhLWxpbmUtbnVtYmVyJyk7XHJcbiAgICAgICAgICAgIHRvZ2dsZUJ1dHRvbnMgPSB0b2dnbGVzLmZpbmRBbGwoJy5rZXJkeC1kYXRhLXRvZ2dsZXMtYnV0dG9uJyk7XHJcblxyXG4gICAgICAgICAgICBsZXQgYmxvY2tDb250ZW50LCBzdGFydCwgZW5kO1xyXG4gICAgICAgICAgICBkaXNwbGF5ZWQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2tlcmR4LWRhdGEtdG9nZ2xlcy1idXR0b24nKSkgey8vaWYgdG9nZ2xlZFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc3NldCh0YXJnZXQuYmxvY2sucmFuZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFJhbmdlKHRhcmdldC5ibG9jayk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnZmEtYXJyb3ctZG93bicpKSB7Ly9pZiB0b2dnbGUgdG8gc2hvd1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlTnVtYmVycyh0YXJnZXQuYmxvY2spO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlQmxvY2sodGFyZ2V0LmJsb2NrKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3dOdW1iZXJzKHRhcmdldC5ibG9jayk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3dCbG9jayh0YXJnZXQuYmxvY2spO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNsYXNzTGlzdC50b2dnbGUoJ2ZhLWFycm93LXVwJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNsYXNzTGlzdC50b2dnbGUoJ2ZhLWFycm93LWRvd24nKTtcclxuICAgICAgICAgICAgICAgICAgICBhbGlnblRvZ2dsZXMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBkaXNwbGF5ZWQ7XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50czsiLCJjbGFzcyBGdW5jIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmNhcGl0YWxzID0gXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWlwiO1xyXG4gICAgICAgIHRoaXMuc21hbGxzID0gXCJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5elwiO1xyXG4gICAgICAgIHRoaXMuZGlnaXRzID0gXCIxMjM0NTY3ODkwXCI7XHJcbiAgICAgICAgdGhpcy5zeW1ib2xzID0gXCIsLi8/JyFAIyQlXiYqKCktXys9YH5cXFxcfCBcIjtcclxuICAgICAgICB0aGlzLm1vbnRocyA9IFsnSmFudWFyeScsICdGZWJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ107XHJcbiAgICAgICAgdGhpcy5kYXlzID0gWydTdW5kYXknLCAnTW9uZGF5JywgJ1R1ZXNkYXknLCAnV2VkbmVzZGF5JywgJ1RodXJzZGF5JywgJ0ZyaWRheScsICdTYXR1cmRheSddO1xyXG4gICAgICAgIHRoaXMuZ2VuZGVycyA9IFsnTWFsZScsICdGZW1hbGUnLCAnRG8gbm90IGRpc2Nsb3NlJ107XHJcbiAgICAgICAgdGhpcy5tYXJpdGFscyA9IFsnTWFycmllZCcsICdTaW5nbGUnLCAnRGl2b3JjZWQnLCAnV2lkb3dlZCddO1xyXG4gICAgICAgIHRoaXMucmVsaWdpb25zID0gWydDaHJpc3RhaW5pdHknLCAnSXNsYW0nLCAnSnVkYWlzbScsICdQYWdhbmlzbScsICdCdWRpc20nXTtcclxuICAgICAgICB0aGlzLnVzZXJUeXBlcyA9IFsnc3R1ZGVudCcsICdzdGFmZicsICdhZG1pbicsICdjZW8nXTtcclxuICAgICAgICB0aGlzLnN0YWZmUmVxdWVzdHMgPSBbJ2xlYXZlJywgJ2FsbG93YW5jZSddO1xyXG4gICAgICAgIHRoaXMuc3R1ZGVudHNSZXF1ZXN0cyA9IFsnYWJzZW5jZScsICdhY2FkZW1pYyddO1xyXG4gICAgICAgIHRoaXMuc3ViamVjdExpc3QgPSBbJ01hdGhlbWF0aWNzJywgJ0VuZ2xpc2gnLCAnUGh5c2ljcycsICdDaGVtaXN0cnknLCAnQmlvbG9neScsICdBZ3JpY3VsdHVyZScsICdMaXRlcmF0dXJlJywgJ0hpc3RvcnknXS5zb3J0KCk7XHJcbiAgICAgICAgdGhpcy5zdWJqZWN0TGV2ZWxzID0gWydHZW5lcmFsJywgJ1NlbmlvcicsICdTY2llbmNlJywgJ0FydHMnLCAnSnVuaW9yJ107XHJcbiAgICAgICAgdGhpcy5mb250U3R5bGVzID0gWydBcmlhbCcsICdUaW1lcyBOZXcgUm9tYW4nLCAnSGVsdmV0aWNhJywgJ1RpbWVzJywgJ0NvdXJpZXIgTmV3JywgJ1ZlcmRhbmEnLCAnQ291cmllcicsICdBcmlhbCBOYXJyb3cnLCAnQ2FuZGFyYScsICdHZW5ldmEnLCAnQ2FsaWJyaScsICdPcHRpbWEnLCAnQ2FtYnJpYScsICdHYXJhbW9uZCcsICdQZXJwZXR1YScsICdNb25hY28nLCAnRGlkb3QnLCAnQnJ1c2ggU2NyaXB0IE1UJywgJ0x1Y2lkYSBCcmlnaHQnLCAnQ29wcGVycGxhdGUnLCAnU2VyaWYnLCAnU2FuLVNlcmlmJywgJ0dlb3JnaWEnLCAnU2Vnb2UgVUknXTtcclxuICAgICAgICB0aGlzLnBpeGVsU2l6ZXMgPSBbJzBweCcsICcxcHgnLCAnMnB4JywgJzNweCcsICc0cHgnLCAnNXB4JywgJzZweCcsICc3cHgnLCAnOHB4JywgJzlweCcsICcxMHB4JywgJzIwcHgnLCAnMzBweCcsICc0MHB4JywgJzUwcHgnLCAnNjBweCcsICc3MHB4JywgJzgwcHgnLCAnOTBweCcsICcxMDBweCcsICdOb25lJywgJ1Vuc2V0JywgJ2F1dG8nLCAnLXdlYmtpdC1maWxsLWF2YWlsYWJsZSddO1xyXG4gICAgICAgIHRoaXMuY29sb3JzID0gWydSZWQnLCAnR3JlZW4nLCAnQmx1ZScsICdZZWxsb3cnLCAnQmxhY2snLCAnV2hpdGUnLCAnUHVycGxlJywgJ1Zpb2xldCcsICdJbmRpZ28nLCAnT3JhbmdlJywgJ1RyYW5zcGFyZW50JywgJ05vbmUnLCAnVW5zZXQnXTtcclxuICAgICAgICB0aGlzLmJvbGRuZXNzID0gWzEwMCwgMjAwLCAzMDAsIDQwMCwgNTAwLCA2MDAsIDcwMCwgODAwLCA5MDAsIDEwMDAsICdsaWdodGVyJywgJ2JvbGQnLCAnYm9sZGVyJywgJ25vcm1hbCcsICd1bnNldCddO1xyXG4gICAgICAgIHRoaXMuYm9yZGVyVHlwZXMgPSBbJ1NvbGlkJywgJ0RvdHRlZCcsICdEb3VibGUnLCAnR3Jvb3ZlJywgJ0Rhc2hlZCcsICdJbnNldCcsICdOb25lJywgJ1Vuc2V0JywgJ091dHNldCcsICdSaWdnZWQnLCAnSW5oZXJpdCcsICdJbml0aWFsJ107XHJcbiAgICAgICAgdGhpcy5zaGFkb3dzID0gWycycHggMnB4IDVweCAycHggcmVkJywgJzJweCAycHggNXB4IGdyZWVuJywgJzJweCAycHggeWVsbG93JywgJzJweCBibGFjaycsICdOb25lJywgJ1Vuc2V0J107XHJcbiAgICAgICAgdGhpcy5ib3JkZXJzID0gWycxcHggc29saWQgYmxhY2snLCAnMnB4IGRvdHRlZCBncmVlbicsICczcHggZGFzaGVkIHllbGxvdycsICcxcHggZG91YmxlIHJlZCcsICdOb25lJywgJ1Vuc2V0J107XHJcbiAgICAgICAgdGhpcy5hbGlnbm1lbnQgPSBbJ0xlZnQnLCAnSnVzdGlmaWVkJywgJ1JpZ2h0JywgJ0NlbnRlciddO1xyXG4gICAgfVxyXG5cclxuICAgIGV4dHJhY3RTb3VyY2Uoc291cmNlKSB7XHJcbiAgICAgICAgbGV0IHZhbHVlID0gdGhpcy5pbkJldHdlZW4oc291cmNlLCAnJCMmeycsICd9JiMkJyk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdmFsdWUgPSBKU09OLnBhcnNlKHZhbHVlKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICB2YWx1ZSA9IHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgaW5kZXhBdChoYXlzdGFjayA9ICcnLCBuZWVkbGUgPSAnJywgcG9zID0gMCkge1xyXG4gICAgICAgIHBvcyA9IHBvcyB8fCAwO1xyXG4gICAgICAgIGlmIChoYXlzdGFjay5pbmRleE9mKG5lZWRsZSkgPT0gLTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGF5c3RhY2sgPSBoYXlzdGFjay5zcGxpdChuZWVkbGUpO1xyXG4gICAgICAgIGlmIChwb3MgPj0gaGF5c3RhY2subGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBpbmRleCA9IDA7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoYXlzdGFjay5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaSA8PSBwb3MpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4ICs9IGhheXN0YWNrW2ldLmxlbmd0aDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpbmRleCArPSBuZWVkbGUubGVuZ3RoICogcG9zO1xyXG5cclxuICAgICAgICByZXR1cm4gaW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgY29tYmluZShoYXlzdGFjayA9ICcnLCBmaXJzdCA9ICcnLCBzZWNvbmQgPSAnJywgcG9zID0gMCkge1xyXG4gICAgICAgIHBvcyA9IHBvcyB8fCAwOy8vaW5pdGlhbGl6ZSBwb3NpdGlvbiBpZiBub3Qgc2V0XHJcbiAgICAgICAgbGV0IGF0MSA9IHBvcyxcclxuICAgICAgICAgICAgYXQyID0gZmlyc3QgPT09IHNlY29uZCA/IHBvcyArIDEgOiBwb3M7IC8vY2hlY2sgaWYgaXQgaXMgdGhlIHNhbWUgYW5kIGNoYW5nZSBwb3NpdGlvblxyXG4gICAgICAgIGxldCBzdGFydCA9IHRoaXMuaW5kZXhBdChoYXlzdGFjaywgZmlyc3QsIGF0MSk7Ly9nZXQgdGhlIHN0YXJ0XHJcbiAgICAgICAgbGV0IGVuZCA9IHRoaXMuaW5kZXhBdChoYXlzdGFjaywgc2Vjb25kLCBhdDIpOy8vZ2V0IHRoZSBlbmRcclxuXHJcbiAgICAgICAgaWYgKHN0YXJ0ID09IC0xIHx8IHN0YXJ0ICsgZmlyc3QubGVuZ3RoID49IGhheXN0YWNrLmxlbmd0aCB8fCBlbmQgPT0gLTEpIHsvL251bGwgaWYgb25lIGlzIG5vdCBmb3VuZFxyXG4gICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaGF5c3RhY2suc2xpY2Uoc3RhcnQsIGVuZCArIHNlY29uZC5sZW5ndGgpO1xyXG4gICAgfVxyXG5cclxuICAgIGFsbENvbWJpbmUoaGF5c3RhY2sgPSAnJywgZmlyc3QgPSAnJywgc2Vjb25kID0gJycpIHtcclxuICAgICAgICBsZXQgcG9zID0gMDtcclxuICAgICAgICBsZXQgYWxsID0gW107XHJcbiAgICAgICAgbGV0IGZvdW5kO1xyXG4gICAgICAgIHdoaWxlIChmb3VuZCAhPSAtMSkge1xyXG4gICAgICAgICAgICBmb3VuZCA9IHRoaXMuY29tYmluZShoYXlzdGFjaywgZmlyc3QsIHNlY29uZCwgcG9zKTtcclxuICAgICAgICAgICAgcG9zKys7XHJcbiAgICAgICAgICAgIGlmIChmb3VuZCAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgYWxsLnB1c2goZm91bmQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gYWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGluQmV0d2VlbihoYXlzdGFjayA9ICcnLCBmaXJzdCA9ICcnLCBzZWNvbmQgPSAnJywgcG9zID0gMCkge1xyXG4gICAgICAgIHBvcyA9IHBvcyB8fCAwOy8vaW5pdGlhbGl6ZSBwb3NpdGlvbiBpZiBub3Qgc2V0XHJcbiAgICAgICAgbGV0IGF0MSA9IHBvcyxcclxuICAgICAgICAgICAgYXQyID0gZmlyc3QgPT09IHNlY29uZCA/IHBvcyArIDEgOiBwb3M7IC8vY2hlY2sgaWYgaXQgaXMgdGhlIHNhbWUgYW5kIGNoYW5nZSBwb3NpdGlvblxyXG4gICAgICAgIGxldCBzdGFydCA9IHRoaXMuaW5kZXhBdChoYXlzdGFjaywgZmlyc3QsIGF0MSk7Ly9nZXQgdGhlIHN0YXJ0XHJcbiAgICAgICAgbGV0IGVuZCA9IHRoaXMuaW5kZXhBdChoYXlzdGFjaywgc2Vjb25kLCBhdDIpOy8vZ2V0IHRoZSBlbmRcclxuXHJcbiAgICAgICAgaWYgKHN0YXJ0ID09IC0xIHx8IHN0YXJ0ICsgZmlyc3QubGVuZ3RoID49IGhheXN0YWNrLmxlbmd0aCB8fCBlbmQgPT0gLTEpIHsvLy0xIGlmIG9uZSBpcyBub3QgZm91bmQgb3IgaW5iZXR3ZWVuXHJcbiAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBoYXlzdGFjay5zbGljZShzdGFydCArIGZpcnN0Lmxlbmd0aCwgZW5kKTtcclxuICAgIH1cclxuXHJcbiAgICBhbGxJbkJldHdlZW4oaGF5c3RhY2sgPSAnJywgZmlyc3QgPSAnJywgc2Vjb25kID0gJycpIHtcclxuICAgICAgICBsZXQgcG9zID0gMDtcclxuICAgICAgICBsZXQgYWxsID0gW107XHJcbiAgICAgICAgbGV0IGZvdW5kO1xyXG4gICAgICAgIHdoaWxlIChmb3VuZCAhPSAtMSkge1xyXG4gICAgICAgICAgICBmb3VuZCA9IHRoaXMuaW5CZXR3ZWVuKGhheXN0YWNrLCBmaXJzdCwgc2Vjb25kLCBwb3MpO1xyXG4gICAgICAgICAgICBwb3MrKztcclxuICAgICAgICAgICAgaWYgKGZvdW5kICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBhbGwucHVzaChmb3VuZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBhbGw7XHJcbiAgICB9XHJcblxyXG4gICAgZXh0cmFjdENTUyhlbGVtZW50KSB7XHJcbiAgICAgICAgbGV0IGNzcyA9IGVsZW1lbnQuc3R5bGUuY3NzVGV4dCxcclxuICAgICAgICAgICAgc3R5bGUgPSB7fSxcclxuICAgICAgICAgICAga2V5LFxyXG4gICAgICAgICAgICB2YWx1ZTtcclxuXHJcbiAgICAgICAgaWYgKGNzcyAhPSAnJykge1xyXG4gICAgICAgICAgICBjc3MgPSBjc3Muc3BsaXQoJzsgJyk7XHJcbiAgICAgICAgICAgIGxldCBwYWlyO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpIG9mIGNzcykge1xyXG4gICAgICAgICAgICAgICAgcGFpciA9IHRoaXMudHJlbShpKTtcclxuICAgICAgICAgICAgICAgIGtleSA9IHRoaXMuanNTdHlsZU5hbWUocGFpci5zcGxpdCgnOicpWzBdKTtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5zdHJpbmdSZXBsYWNlKHBhaXIuc3BsaXQoJzonKS5wb3AoKSwgJzsnLCAnJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoa2V5ICE9ICcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGVba2V5XSA9IHRoaXMudHJlbSh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBzdHlsZTtcclxuICAgIH1cclxuXHJcbiAgICB0cmltTW9udGhBcnJheSgpIHtcclxuICAgICAgICBsZXQgbW9udGhzID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm1vbnRocy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBtb250aHMucHVzaCh0aGlzLm1vbnRoc1tpXS5zbGljZSgwLCAzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBtb250aHM7XHJcbiAgICB9XHJcblxyXG4gICAganNTdHlsZU5hbWUobmFtZSA9ICcnKSB7XHJcbiAgICAgICAgbGV0IG5ld05hbWUgPSAnJztcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5hbWUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKG5hbWVbaV0gPT0gJy0nKSB7XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgICAgICBuZXdOYW1lICs9IG5hbWVbaV0udG9VcHBlckNhc2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIG5ld05hbWUgKz0gbmFtZVtpXS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3TmFtZTtcclxuICAgIH1cclxuXHJcbiAgICBjc3NTdHlsZU5hbWUobmFtZSA9ICcnKSB7XHJcbiAgICAgICAgbGV0IG5ld05hbWUgPSAnJztcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5hbWUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNDYXBpdGFsKG5hbWVbaV0pKSBuZXdOYW1lICs9ICctJztcclxuICAgICAgICAgICAgbmV3TmFtZSArPSBuYW1lW2ldLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3TmFtZTtcclxuICAgIH1cclxuXHJcbiAgICB0ZXh0VG9DYW1lbENhc2VkKHRleHQgPSAnJykge1xyXG4gICAgICAgIGxldCB2YWx1ZSA9ICcnO1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gdGV4dCkge1xyXG4gICAgICAgICAgICBpZiAodGV4dFtpXSA9PSAnICcpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChpID09IDApIHZhbHVlICs9IHRleHRbaV0udG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5pc3NldCh0ZXh0W2kgLSAxXSkgJiYgdGV4dFtpIC0gMV0gPT0gJyAnKSB2YWx1ZSArPSB0ZXh0W2ldLnRvVXBwZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGVsc2UgdmFsdWUgKz0gdGV4dFtpXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbWVsQ2FzZWRUb1RleHQoY2FtZWxDYXNlID0gJycpIHtcclxuICAgICAgICBsZXQgdmFsdWUgPSAnJztcclxuICAgICAgICBmb3IgKGxldCBpIGluIGNhbWVsQ2FzZSkge1xyXG4gICAgICAgICAgICBpZiAoaSAhPSAwICYmIHRoaXMuaXNDYXBpdGFsKGNhbWVsQ2FzZVtpXSkpIHZhbHVlICs9IGAgJHtjYW1lbENhc2VbaV0udG9Mb3dlckNhc2UoKX1gO1xyXG4gICAgICAgICAgICBlbHNlIHZhbHVlICs9IGNhbWVsQ2FzZVtpXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGVtcHR5T2JqZWN0KG9iaikge1xyXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvYmopID09IEpTT04uc3RyaW5naWZ5KHt9KTtcclxuICAgIH1cclxuXHJcbiAgICByYW5kb20ocGFyYW1zID0geyBsaW1pdDogMSwgcmFuZ2U6IDEgfSkge1xyXG4gICAgICAgIGxldCByYW5kb207XHJcbiAgICAgICAgaWYgKHRoaXMuZW1wdHlPYmplY3QocGFyYW1zKSkge1xyXG4gICAgICAgICAgICByYW5kb20gPSBNYXRoLnJhbmRvbSgpICogMiAtIDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHRoaXMuaXNzZXQocGFyYW1zLmxpbWl0KSkge1xyXG4gICAgICAgICAgICByYW5kb20gPSBNYXRoLnJhbmRvbSgpICogcGFyYW1zLmxpbWl0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0aGlzLmlzc2V0KHBhcmFtcy5yYW5nZSkpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByYW5kb207XHJcbiAgICB9XHJcblxyXG4gICAgcmFuZ2UoZW5kID0gMSwgc3RhcnQgPSAxKSB7XHJcbiAgICAgICAgbGV0IHZhbHVlID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0IHx8IDA7IGkgPCBlbmQ7IGkrKykge1xyXG4gICAgICAgICAgICB2YWx1ZS5wdXNoKGkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGdlbmVyYXRlUmFuZG9tKGxlbmd0aCA9IDUpIHtcclxuICAgICAgICB2YXIgc3RyaW5nID0gdGhpcy5jYXBpdGFscyArIHRoaXMuc21hbGxzICsgdGhpcy5kaWdpdHM7XHJcbiAgICAgICAgdmFyIGFscGhhbnVtZXJpYyA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgYWxwaGFudW1lcmljICs9IHN0cmluZ1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBzdHJpbmcubGVuZ3RoKV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhbHBoYW51bWVyaWM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2VuZXJhdGVSYW5kb21IZXgobGVuZ3RoID0gNSkge1xyXG4gICAgICAgIHZhciBzdHJpbmcgPSB0aGlzLmNhcGl0YWxzLnNsaWNlKDAsIDMpICsgdGhpcy5zbWFsbHMuc2xpY2UoMCwgMykgKyB0aGlzLmRpZ2l0cztcclxuICAgICAgICB2YXIgYWxwaGFudW1lcmljID0gJyc7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBhbHBoYW51bWVyaWMgKz0gc3RyaW5nW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHN0cmluZy5sZW5ndGgpXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFscGhhbnVtZXJpYztcclxuICAgIH1cclxuXHJcbiAgICBnZW5lcmF0ZUtleShsZW5ndGggPSA1KSB7XHJcbiAgICAgICAgbGV0IGtleSA9IERhdGUubm93KCkudG9TdHJpbmcobGVuZ3RoKSArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcobGVuZ3RoKS5zbGljZSgyKTsvL2dlbmVyYXRlIHRoZSBrZXlcclxuICAgICAgICByZXR1cm4ga2V5O1xyXG4gICAgfVxyXG5cclxuICAgIGVkaXR0ZWRVcmwocGFyYW1zKSB7XHJcbiAgICAgICAgdmFyIHVybCA9IHRoaXMudXJsU3BsaXR0ZXIocGFyYW1zLnVybCk7XHJcbiAgICAgICAgdXJsLnZhcnNbcGFyYW1zLnRvQWRkXSA9IHBhcmFtcy5hZGRWYWx1ZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnVybE1lcmdlcih1cmwsIHBhcmFtcy50b0FkZCk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkQ29tbWFUb01vbmV5KG1vbmV5ID0gJycpIHtcclxuICAgICAgICB2YXIgaW52ZXJzZSA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSBtb25leS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgICAgICBpbnZlcnNlICs9IG1vbmV5W2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtb25leSA9IFwiXCI7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbnZlcnNlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IChpICsgMSkgJSAzO1xyXG4gICAgICAgICAgICBtb25leSArPSBpbnZlcnNlW2ldO1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgIT0gaW52ZXJzZS5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9uZXkgKz0gJywnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGludmVyc2UgPSAnJztcclxuICAgICAgICBmb3IgKHZhciBpID0gbW9uZXkubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICAgICAgaW52ZXJzZSArPSBtb25leVtpXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGludmVyc2U7XHJcbiAgICB9XHJcblxyXG4gICAgaXNDYXBpdGFsKHZhbHVlID0gJycpIHtcclxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FwaXRhbHMuaW5jbHVkZXModmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjYXBpdGFsaXplKHZhbHVlID0gJycpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNDYXBpdGFsKHZhbHVlWzBdKSkge1xyXG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnNwbGl0KCcnKTtcclxuICAgICAgICAgICAgdmFsdWVbMF0gPSB0aGlzLmNhcGl0YWxzW3RoaXMuc21hbGxzLmluZGV4T2YodmFsdWVbMF0pXTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RyaW5nUmVwbGFjZSh2YWx1ZS50b1N0cmluZygpLCAnLCcsICcnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGZsaXAoaGF5c3RhY2sgPSAnJykge1xyXG4gICAgICAgIHJldHVybiBoYXlzdGFjay5zcGxpdCgnJykucmV2ZXJzZSgpLmpvaW4oJycpO1xyXG4gICAgfVxyXG5cclxuICAgIGlzU21hbGwodmFsdWUgPSAnJykge1xyXG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT0gMSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zbWFsbHMuaW5jbHVkZXModmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpc1N5bWJvbCh2YWx1ZSA9ICcnKSB7XHJcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PSAxKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN5bWJvbHMuaW5jbHVkZXModmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpc05hbWUodmFsdWUgPSAnJykge1xyXG4gICAgICAgIGZvciAodmFyIHggaW4gdmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNEaWdpdCh2YWx1ZVt4XSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpc1Bhc3N3b3JkVmFsaWQodmFsdWUgPSAnJykge1xyXG4gICAgICAgIHZhciBsZW4gPSB2YWx1ZS5sZW5ndGg7XHJcbiAgICAgICAgaWYgKGxlbiA+IDcpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNDYXBpdGFsKHZhbHVlW2FdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4gdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTbWFsbCh2YWx1ZVtiXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGMgaW4gdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RpZ2l0KHZhbHVlW2NdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBkIGluIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1N5bWJvbCh2YWx1ZVtkXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgaXNTdWJTdHJpbmcoaGF5c3RhY2sgPSAnJywgdmFsdWUgPSAnJykge1xyXG4gICAgICAgIGlmIChoYXlzdGFjay5pbmRleE9mKHZhbHVlKSAhPSAtMSkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGlzRGlnaXQodmFsdWUgPSAnJykge1xyXG4gICAgICAgIHZhbHVlID0gbmV3IFN0cmluZyh2YWx1ZSlcclxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09IDEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlnaXRzLmluY2x1ZGVzKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGlzRW1haWwodmFsdWUgPSAnJykge1xyXG4gICAgICAgIHZhciBlbWFpbF9wYXJ0cyA9IHZhbHVlLnNwbGl0KCdAJyk7XHJcbiAgICAgICAgaWYgKGVtYWlsX3BhcnRzLmxlbmd0aCAhPSAyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc1NwYWNlU3RyaW5nKGVtYWlsX3BhcnRzWzBdKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBkb3RfcGFydHMgPSBlbWFpbF9wYXJ0c1sxXS5zcGxpdCgnLicpO1xyXG4gICAgICAgICAgICBpZiAoZG90X3BhcnRzLmxlbmd0aCAhPSAyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NwYWNlU3RyaW5nKGRvdF9wYXJ0c1swXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NwYWNlU3RyaW5nKGRvdF9wYXJ0c1sxXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgaXNUcnV0aHkodmFsdWUpIHtcclxuICAgICAgICBsZXQgdHJ1dGh5O1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICAgIHRydXRoeSA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgdHJ1dGh5ID0gKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT0gJ3RydWUnIHx8IHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT0gJzEnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHZhbHVlID09ICdudW1iZXInKSB7XHJcbiAgICAgICAgICAgIHRydXRoeSA9ICh2YWx1ZSA9PSAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydXRoeTtcclxuICAgIH1cclxuXHJcbiAgICBpc0ZhbHN5KHZhbHVlKSB7XHJcbiAgICAgICAgbGV0IGZhbHN5O1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICAgIGZhbHN5ID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBmYWxzeSA9ICh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpID09ICdmYWxzZScgfHwgdmFsdWUudG9Mb2NhbGVMb3dlckNhc2UoKSA9PSAnMCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicpIHtcclxuICAgICAgICAgICAgZmFsc3kgPSAodmFsdWUgPT0gMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzeTtcclxuICAgIH1cclxuXHJcbiAgICBvYmplY3RMZW5ndGgob2JqZWN0ID0ge30pIHtcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgaXNTcGFjZVN0cmluZyh2YWx1ZSA9ICcnKSB7XHJcbiAgICAgICAgaWYgKHZhbHVlID09ICcnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZVt4XSAhPSAnICcpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgaGFzU3RyaW5nKGhheXN0YWNrID0gJycsIG5lZWRsZSA9ICcnKSB7XHJcbiAgICAgICAgZm9yICh2YXIgeCBpbiBoYXlzdGFjaykge1xyXG4gICAgICAgICAgICBpZiAobmVlZGxlID09IGhheXN0YWNrW3hdKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdHJlbShuZWVkbGUgPSAnJykge1xyXG4gICAgICAgIC8vcmVtb3ZlIHRoZSBwcmVwZW5kZWQgc3BhY2VzXHJcbiAgICAgICAgaWYgKG5lZWRsZVswXSA9PSAnICcpIHtcclxuICAgICAgICAgICAgdmFyIG5ld19uZWVkbGUgPSAnJztcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuZWVkbGUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChpICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXdfbmVlZGxlICs9IG5lZWRsZVtpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuZWVkbGUgPSB0aGlzLnRyZW0obmV3X25lZWRsZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL3JlbW92ZSB0aGUgYXBwZW5kZWQgc3BhY2VzXHJcbiAgICAgICAgaWYgKG5lZWRsZVtuZWVkbGUubGVuZ3RoIC0gMV0gPT0gJyAnKSB7XHJcbiAgICAgICAgICAgIHZhciBuZXdfbmVlZGxlID0gJyc7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmVlZGxlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSAhPSBuZWVkbGUubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld19uZWVkbGUgKz0gbmVlZGxlW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5lZWRsZSA9IHRoaXMudHJlbShuZXdfbmVlZGxlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5lZWRsZTtcclxuICAgIH1cclxuXHJcbiAgICBzdHJpbmdSZXBsYWNlKHdvcmQgPSAnJywgZnJvbSA9ICcnLCB0byA9ICcnKSB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gJyc7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JkLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmICh3b3JkW2ldID09IGZyb20pIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlICs9IHRvO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgKz0gd29yZFtpXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgY29udmVyVG9SZWFsUGF0aChwYXRoID0gJycpIHtcclxuICAgICAgICBpZiAocGF0aFtwYXRoLmxlbmd0aCAtIDFdICE9ICcvJykge1xyXG4gICAgICAgICAgICBwYXRoICs9ICcvJztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHBhdGg7XHJcbiAgICB9XHJcblxyXG4gICAgaXNTcGFjaWFsQ2hhcmFjdGVyKGNoYXIgPSAnJykge1xyXG4gICAgICAgIHZhciBzcGVjaWFsY2hhcmFjdGVycyA9IFwiJ1xcXFwvOj8qPD58IS5cIjtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNwZWNpYWxjaGFyYWN0ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChzcGVjaWFsY2hhcmFjdGVyc1tpXSA9PSBjaGFyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgY291bnRDaGFyKGhheXN0YWNrID0gJycsIG5lZWRsZSA9ICcnKSB7XHJcbiAgICAgICAgdmFyIGogPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGF5c3RhY2subGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGhheXN0YWNrW2ldID09IG5lZWRsZSkge1xyXG4gICAgICAgICAgICAgICAgaisrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBqO1xyXG4gICAgfVxyXG5cclxuICAgIG9jY3VyYW5jZXNPZihoYXlzdGFjayA9ICcnLCBuZWVkbGUgPSAnJykge1xyXG4gICAgICAgIGxldCBvY2N1cmFuY2VzID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoYXlzdGFjay5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaGF5c3RhY2tbaV0gPT09IG5lZWRsZSkge1xyXG4gICAgICAgICAgICAgICAgb2NjdXJhbmNlcy5wdXNoKGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gb2NjdXJhbmNlcztcclxuICAgIH1cclxuXHJcbiAgICBpc3NldCh2YXJpYWJsZSkge1xyXG4gICAgICAgIHJldHVybiAodHlwZW9mIHZhcmlhYmxlICE9PSAndW5kZWZpbmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaXNudWxsKHZhcmlhYmxlKSB7XHJcbiAgICAgICAgcmV0dXJuIHZhcmlhYmxlID09IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgbm90TnVsbCh2YXJpYWJsZSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmlzc2V0KHZhcmlhYmxlKSAmJiAhdGhpcy5pc251bGwodmFyaWFibGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGlzQXJyYXkodmFyaWFibGUpIHtcclxuICAgICAgICBsZXQgZmxhZyA9IGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFyaWFibGUgPT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgZmxhZyA9IHZhcmlhYmxlLmNvbnN0cnVjdG9yID09PSBBcnJheTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZsYWc7XHJcbiAgICB9XHJcblxyXG4gICAgaXNPYmplY3QodmFyaWFibGUpIHtcclxuICAgICAgICBsZXQgZmxhZyA9IGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFyaWFibGUgPT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgZmxhZyA9IHZhcmlhYmxlLmNvbnN0cnVjdG9yID09PSBPYmplY3Q7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmbGFnO1xyXG4gICAgfVxyXG5cclxuICAgIGlzU3RyaW5nKHZhcmlhYmxlKSB7XHJcbiAgICAgICAgbGV0IGZsYWcgPSBmYWxzZTtcclxuICAgICAgICBpZiAodHlwZW9mIHZhcmlhYmxlID09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIGZsYWcgPSB2YXJpYWJsZS5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmxhZztcclxuICAgIH1cclxuXHJcbiAgICBpc051bWJlcih2YXJpYWJsZSkge1xyXG4gICAgICAgIGxldCBmbGFnID0gZmFsc2U7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YXJpYWJsZSA9PSAnbnVtYmVyJykge1xyXG4gICAgICAgICAgICBmbGFnID0gdmFyaWFibGUuY29uc3RydWN0b3IgPT09IE51bWJlcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZsYWc7XHJcbiAgICB9XHJcblxyXG4gICAgaXNCb29sKHZhcmlhYmxlKSB7XHJcbiAgICAgICAgbGV0IGZsYWcgPSBmYWxzZTtcclxuICAgICAgICBpZiAodHlwZW9mIHZhcmlhYmxlID09ICdib29sZWFuJykge1xyXG4gICAgICAgICAgICBmbGFnID0gdmFyaWFibGUuY29uc3RydWN0b3IgPT09IEJvb2xlYW47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmbGFnO1xyXG4gICAgfVxyXG5cclxuICAgIGlzZnVuY3Rpb24odmFyaWFibGUpIHtcclxuICAgICAgICByZXR1cm4gKHR5cGVvZiB2YXJpYWJsZSA9PT0gJ2Z1bmN0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgcnVuUGFyYWxsZWwoZnVuY3Rpb25zID0gW10sIGNhbGxCYWNrID0gKCkgPT4geyB9KSB7XHJcbiAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBmIGluIGZ1bmN0aW9ucykge1xyXG4gICAgICAgICAgICByZXN1bHRzW2ZdID0gYXdhaXQgZnVuY3Rpb25zW2ZdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsQmFjayhyZXN1bHRzKTtcclxuICAgIH1cclxuXHJcbiAgICBpc01vYmlsZSgpIHtcclxuICAgICAgICByZXR1cm4gKC9BbmRyb2lkfHdlYk9TfGlQaG9uZXxpUGFkfGlQb2R8QmxhY2tCZXJyeXxJRU1vYmlsZXxPcGVyYSBNaW5pL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXJsTWVyZ2VyKHNwbGl0VXJsID0gJycsIGxhc3RRdWVyeSA9ICcnKSB7XHJcbiAgICAgICAgdmFyIGhvc3RUeXBlID0gKHRoaXMuaXNzZXQoc3BsaXRVcmwuaG9zdFR5cGUpKSA/IHNwbGl0VXJsLmhvc3RUeXBlIDogJ2h0dHAnO1xyXG4gICAgICAgIHZhciBob3N0TmFtZSA9ICh0aGlzLmlzc2V0KHNwbGl0VXJsLmhvc3ROYW1lKSkgPyBzcGxpdFVybC5ob3N0TmFtZSA6ICcnO1xyXG4gICAgICAgIHZhciBwb3J0ID0gKHRoaXMuaXNzZXQoc3BsaXRVcmwuaG9zdCkpID8gc3BsaXRVcmwucG9ydCA6ICcnO1xyXG4gICAgICAgIHZhciBwYXRoTmFtZSA9ICh0aGlzLmlzc2V0KHNwbGl0VXJsLnBhdGhOYW1lKSkgPyBzcGxpdFVybC5wYXRoTmFtZSA6ICcnO1xyXG4gICAgICAgIHZhciBxdWVyaWVzID0gJz8nO1xyXG4gICAgICAgIHZhciBrZWVwTWFwcGluZyA9IHRydWU7XHJcbiAgICAgICAgKHRoaXMuaXNzZXQoc3BsaXRVcmwudmFycykpID9cclxuICAgICAgICAgICAgT2JqZWN0LmtleXMoc3BsaXRVcmwudmFycykubWFwKGtleSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoa2VlcE1hcHBpbmcpIHF1ZXJpZXMgKz0ga2V5ICsgJz0nICsgc3BsaXRVcmwudmFyc1trZXldICsgJyYnO1xyXG4gICAgICAgICAgICAgICAgaWYgKGtleSA9PSBsYXN0UXVlcnkpIGtlZXBNYXBwaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0pIDogJyc7XHJcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gaG9zdFR5cGUgKyAnOjovJyArIGhvc3ROYW1lICsgJzonICsgcG9ydCArICcvJyArIHBhdGhOYW1lICsgcXVlcmllcztcclxuICAgICAgICBsb2NhdGlvbiA9IChsb2NhdGlvbi5sYXN0SW5kZXhPZignJicpID09IGxvY2F0aW9uLmxlbmd0aCAtIDEpID8gbG9jYXRpb24uc2xpY2UoMCwgbG9jYXRpb24ubGVuZ3RoIC0gMSkgOiBsb2NhdGlvbjtcclxuICAgICAgICBsb2NhdGlvbiA9IChsb2NhdGlvbi5sYXN0SW5kZXhPZignPScpID09IGxvY2F0aW9uLmxlbmd0aCAtIDEpID8gbG9jYXRpb24uc2xpY2UoMCwgbG9jYXRpb24ubGVuZ3RoIC0gMSkgOiBsb2NhdGlvbjtcclxuICAgICAgICByZXR1cm4gbG9jYXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgdXJsU3BsaXR0ZXIobG9jYXRpb24gPSAnJykge1xyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KGxvY2F0aW9uKSkge1xyXG4gICAgICAgICAgICBsb2NhdGlvbiA9IGxvY2F0aW9uLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIHZhciBodHRwVHlwZSA9IChsb2NhdGlvbi5pbmRleE9mKCc6Ly8nKSA9PT0gLTEpID8gbnVsbCA6IGxvY2F0aW9uLnNwbGl0KCc6Ly8nKVswXTtcclxuICAgICAgICAgICAgdmFyIGZ1bGxQYXRoID0gbG9jYXRpb24uc3BsaXQoJzovLycpLnBvcCgwKTtcclxuICAgICAgICAgICAgdmFyIGhvc3QgPSBmdWxsUGF0aC5zcGxpdCgnLycpWzBdO1xyXG4gICAgICAgICAgICB2YXIgaG9zdE5hbWUgPSBob3N0LnNwbGl0KCc6JylbMF07XHJcbiAgICAgICAgICAgIHZhciBwb3J0ID0gaG9zdC5zcGxpdCgnOicpLnBvcCgwKTtcclxuICAgICAgICAgICAgdmFyIHBhdGggPSAnLycgKyBmdWxsUGF0aC5zcGxpdCgnLycpLnBvcCgwKTtcclxuICAgICAgICAgICAgdmFyIHBhdGhOYW1lID0gcGF0aC5zcGxpdCgnPycpWzBdO1xyXG4gICAgICAgICAgICB2YXIgcXVlcmllcyA9IChwYXRoLmluZGV4T2YoJz8nKSA9PT0gLTEpID8gbnVsbCA6IHBhdGguc3BsaXQoJz8nKS5wb3AoMCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgdmFycyA9IHt9O1xyXG4gICAgICAgICAgICBpZiAocXVlcmllcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcXVlcnkgPSBxdWVyaWVzLnNwbGl0KCcmJyk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB4IGluIHF1ZXJ5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gcXVlcnlbeF0uc3BsaXQoJz0nKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGFydHNbMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyc1t0aGlzLnN0cmluZ1JlcGxhY2UocGFydHNbMF0sICctJywgJyAnKV0gPSB0aGlzLnN0cmluZ1JlcGxhY2UocGFydHNbMV0sICctJywgJyAnKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJzW3RoaXMuc3RyaW5nUmVwbGFjZShwYXJ0c1swXSwgJy0nLCAnICcpXSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgaHR0cGhvc3QgPSBodHRwVHlwZSArICc6Ly8nICsgaG9zdDtcclxuICAgICAgICAgICAgcmV0dXJuIHsgbG9jYXRpb246IGxvY2F0aW9uLCBodHRwVHlwZTogaHR0cFR5cGUsIGZ1bGxQYXRoOiBmdWxsUGF0aCwgaG9zdDogaG9zdCwgaHR0cGhvc3Q6IGh0dHBob3N0LCBob3N0TmFtZTogaG9zdE5hbWUsIHBvcnQ6IHBvcnQsIHBhdGg6IHBhdGgsIHBhdGhOYW1lOiBwYXRoTmFtZSwgcXVlcmllczogcXVlcmllcywgdmFyczogdmFycyB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXRVcmxWYXJzKGxvY2F0aW9uID0gJycpIHtcclxuICAgICAgICBsb2NhdGlvbiA9IGxvY2F0aW9uLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgdmFyIHF1ZXJpZXMgPSAobG9jYXRpb24uaW5kZXhPZignPycpID09PSAtMSkgPyBudWxsIDogbG9jYXRpb24uc3BsaXQoJz8nKS5wb3AoMCk7XHJcbiAgICAgICAgdmFyIHZhcnMgPSB7fTtcclxuXHJcbiAgICAgICAgaWYgKHF1ZXJpZXMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB2YXIgcXVlcnkgPSBxdWVyaWVzLnNwbGl0KCcmJyk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gcXVlcnkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwYXJ0cyA9IHF1ZXJ5W3hdLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFydHNbMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXJzW3RoaXMuc3RyaW5nUmVwbGFjZShwYXJ0c1swXSwgJy0nLCAnICcpXSA9IHRoaXMuc3RyaW5nUmVwbGFjZShwYXJ0c1sxXSwgJy0nLCAnICcpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXJzW3RoaXMuc3RyaW5nUmVwbGFjZShwYXJ0c1swXSwgJy0nLCAnICcpXSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YXJzO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmM7IiwiY29uc3QgUGVyaW9kID0gcmVxdWlyZSgnLi9QZXJpb2QnKTtcclxuY2xhc3MgRW1wdHkge1xyXG59XHJcblxyXG5jbGFzcyBKU0VsZW1lbnRzIGV4dGVuZHMgUGVyaW9kIHtcclxuICAgIGNvbnN0cnVjdG9yKHRoZVdpbmRvdyA9IEVtcHR5KSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLkVsZW1lbnQgPSB0aGVXaW5kb3cuRWxlbWVudDtcclxuICAgICAgICB0aGlzLmRvY3VtZW50ID0gdGhlV2luZG93LmRvY3VtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIGxvYWRDc3MoaHJlZiA9ICcnKSB7XHJcbiAgICAgICAgbGV0IGVsZW1lbnQgPSB0aGlzLmNyZWF0ZUVsZW1lbnQoeyBlbGVtZW50OiAnbGluaycsIGF0dHJpYnV0ZXM6IHsgcmVsOiAnc3R5bGVzaGVldCcsIHR5cGU6ICd0ZXh0L2NzcycsIGhyZWYgfSB9KTtcclxuICAgICAgICBpZiAodGhpcy5kb2N1bWVudCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRvY3VtZW50WydoZWFkJ10gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb2N1bWVudFsnaGVhZCddLmFwcGVuZChlbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBqc29uRm9ybShmb3JtKSB7XHJcbiAgICAgICAgbGV0IGpzb24gPSB7fTtcclxuICAgICAgICBsZXQgcGVyZm9ybSA9IChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBjaGlsZHJlbiA9IGVsZW1lbnQuY2hpbGRyZW47XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHBlcmZvcm0oY2hpbGRyZW5baV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnbmFtZScpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50eXBlID09ICdmaWxlJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnbXVsdGlwbGUnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uW2VsZW1lbnQuZ2V0QXR0cmlidXRlKCduYW1lJyldID0gZWxlbWVudC5maWxlcztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25bZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ25hbWUnKV0gPSBlbGVtZW50LmZpbGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25bZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ25hbWUnKV0gPSBlbGVtZW50LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwZXJmb3JtKGZvcm0pO1xyXG4gICAgICAgIHJldHVybiBqc29uO1xyXG4gICAgfVxyXG5cclxuICAgIGpzb25FbGVtZW50KF9lbGVtZW50Xykge1xyXG4gICAgICAgIGxldCBlbGVtZW50ID0gX2VsZW1lbnRfLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZXMgPSBfZWxlbWVudF8uZ2V0QXR0cmlidXRlcygpO1xyXG4gICAgICAgIGF0dHJpYnV0ZXMuc3R5bGUgPSBfZWxlbWVudF8uY3NzKCk7XHJcbiAgICAgICAgbGV0IGNoaWxkcmVuID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfZWxlbWVudF8uY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY2hpbGRyZW4ucHVzaChfZWxlbWVudF8uY2hpbGRyZW5baV0udG9Kc29uKCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4geyBlbGVtZW50LCBhdHRyaWJ1dGVzLCBjaGlsZHJlbiB9XHJcbiAgICB9XHJcblxyXG4gICAgaXNFbGVtZW50KG9iamVjdCkge1xyXG4gICAgICAgIHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiB0aGlzLkVsZW1lbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlRnJvbU9iamVjdChvYmplY3QgPSB7fSwgc2luZ2xlUGFyZW50KSB7XHJcbiAgICAgICAgbGV0IGNyZWF0ZWQsIG5hbWU7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzRWxlbWVudChvYmplY3QpKSB7XHJcbiAgICAgICAgICAgIGNyZWF0ZWQgPSBvYmplY3Q7XHJcbiAgICAgICAgICAgIG5hbWUgPSBjcmVhdGVkLm5vZGVOYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0aGlzLmlzRWxlbWVudChvYmplY3QuZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgY3JlYXRlZCA9IG9iamVjdC5lbGVtZW50O1xyXG4gICAgICAgICAgICBuYW1lID0gY3JlYXRlZC5ub2RlTmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIG5hbWUgPSBvYmplY3QuZWxlbWVudC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICBjcmVhdGVkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvYmplY3QuZWxlbWVudCk7Ly9nZW5lcmF0ZSB0aGUgZWxlbWVudFxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KG9iamVjdC5hdHRyaWJ1dGVzKSAmJiAhdGhpcy5pc0VsZW1lbnQob2JqZWN0KSkgey8vc2V0IHRoZSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGF0dHIgaW4gb2JqZWN0LmF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChhdHRyID09ICdzdHlsZScpIHsvL3NldCB0aGUgc3R5bGVzXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZC5jc3Mob2JqZWN0LmF0dHJpYnV0ZXNbYXR0cl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBjcmVhdGVkLnNldEF0dHJpYnV0ZShhdHRyLCBvYmplY3QuYXR0cmlidXRlc1thdHRyXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KG9iamVjdC50ZXh0KSkge1xyXG4gICAgICAgICAgICBjcmVhdGVkLnRleHRDb250ZW50ID0gb2JqZWN0LnRleHQ7Ly9zZXQgdGhlIGlubmVyVGV4dFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNzZXQob2JqZWN0Lmh0bWwpKSB7XHJcbiAgICAgICAgICAgIGNyZWF0ZWQuaW5uZXJIVE1MID0gb2JqZWN0Lmh0bWw7Ly9zZXQgdGhlIGlubmVySFRNTFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNzZXQob2JqZWN0LnZhbHVlKSkge1xyXG4gICAgICAgICAgICBjcmVhdGVkLnZhbHVlID0gb2JqZWN0LnZhbHVlOy8vc2V0IHRoZSB2YWx1ZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoJy0nKSkge1xyXG4gICAgICAgICAgICBjcmVhdGVkID0gdGhpcy5jcmVhdGVGcm9tSFRNTChjcmVhdGVkLm91dGVySFRNTCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pc3NldChzaW5nbGVQYXJlbnQpKSB7XHJcbiAgICAgICAgICAgIHNpbmdsZVBhcmVudC5hdHRhY2hFbGVtZW50KGNyZWF0ZWQsIG9iamVjdC5hdHRhY2htZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KG9iamVjdC5jaGlsZHJlbikpIHtcclxuICAgICAgICAgICAgY3JlYXRlZC5tYWtlRWxlbWVudChvYmplY3QuY2hpbGRyZW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNzZXQob2JqZWN0Lm9wdGlvbnMpICYmIEFycmF5LmlzQXJyYXkob2JqZWN0Lm9wdGlvbnMpKSB7Ly9hZGQgb3B0aW9ucyBpZiBpc3NldCAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgb2Ygb2JqZWN0Lm9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBvcHRpb24gPSBjcmVhdGVkLm1ha2VFbGVtZW50KHsgZWxlbWVudDogJ29wdGlvbicsIHZhbHVlOiBpLCB0ZXh0OiBpLCBhdHRhY2htZW50OiAnYXBwZW5kJyB9KTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzc2V0KG9iamVjdC5zZWxlY3RlZCkgJiYgb2JqZWN0LnNlbGVjdGVkID09IGkpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGkudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpID09ICdudWxsJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KGNyZWF0ZWQuZGF0YXNldC5pY29uKSkge1xyXG4gICAgICAgICAgICBjcmVhdGVkLmFkZENsYXNzZXMoY3JlYXRlZC5kYXRhc2V0Lmljb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNyZWF0ZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlRnJvbUhUTUwoaHRtbFN0cmluZyA9ICcnLCBzaW5nbGVQYXJlbnQpIHtcclxuICAgICAgICBsZXQgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xyXG4gICAgICAgIGxldCBodG1sID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhodG1sU3RyaW5nLCAndGV4dC9odG1sJyk7XHJcblxyXG4gICAgICAgIGxldCBjcmVhdGVkID0gaHRtbC5ib2R5LmZpcnN0Q2hpbGQ7XHJcblxyXG4gICAgICAgIGlmIChodG1sU3RyaW5nLmluZGV4T2YoJ2h0bWwnKSA9PSAxKSB7XHJcbiAgICAgICAgICAgIGNyZWF0ZWQgPSBodG1sO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChodG1sU3RyaW5nLmluZGV4T2YoJ2JvZHknKSA9PSAxKSB7XHJcbiAgICAgICAgICAgIGNyZWF0ZWQgPSBodG1sLmJvZHk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pc3NldChzaW5nbGVQYXJlbnQpKSBzaW5nbGVQYXJlbnQuYXR0YWNoRWxlbWVudChjcmVhdGVkLCBzaW5nbGVQYXJlbnQuYXR0YWNobWVudCk7XHJcbiAgICAgICAgcmV0dXJuIGNyZWF0ZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlUGVyY2VwdG9yRWxlbWVudChvYmplY3QsIHNpbmdsZVBhcmVudCkge1xyXG4gICAgICAgIGxldCBjcmVhdGVkID0gdGhpc1tvYmplY3QucGVyY2VwdG9yRWxlbWVudF0ob2JqZWN0LnBhcmFtcyk7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNzZXQoc2luZ2xlUGFyZW50KSkge1xyXG4gICAgICAgICAgICBzaW5nbGVQYXJlbnQuYXR0YWNoRWxlbWVudChjcmVhdGVkLCBvYmplY3QuYXR0YWNobWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjcmVhdGVkO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEVsZW1lbnQoc2luZ2xlUGFyYW0gPSB7IGVsZW1lbnQ6ICcnLCBhdHRyaWJ1dGVzOiB7fSB9LCBzaW5nbGVQYXJlbnQpIHtcclxuICAgICAgICB2YXIgZWxlbWVudDtcclxuICAgICAgICAvL2lmIHBhcmFtcyBpcyBhIEhUTUwgU3RyaW5nXHJcbiAgICAgICAgaWYgKHR5cGVvZiBzaW5nbGVQYXJhbSA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5jcmVhdGVGcm9tSFRNTChzaW5nbGVQYXJhbSwgc2luZ2xlUGFyZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodGhpcy5pc0VsZW1lbnQoc2luZ2xlUGFyYW0pKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBzaW5nbGVQYXJhbTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNzZXQoc2luZ2xlUGFyZW50KSkgc2luZ2xlUGFyZW50LmF0dGFjaEVsZW1lbnQoZWxlbWVudCwgc2luZ2xlUGFyYW0uYXR0YWNobWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vaWYgcGFyYW1zIGlzIG9iamVjdFxyXG4gICAgICAgIGVsc2UgaWYgKHNpbmdsZVBhcmFtLmNvbnN0cnVjdG9yID09IE9iamVjdCkge1xyXG4gICAgICAgICAgICBpZiAoc2luZ2xlUGFyYW0ucGVyY2VwdG9yRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuY3JlYXRlUGVyY2VwdG9yRWxlbWVudChzaW5nbGVQYXJhbSwgc2luZ2xlUGFyZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLmNyZWF0ZUZyb21PYmplY3Qoc2luZ2xlUGFyYW0sIHNpbmdsZVBhcmVudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KGVsZW1lbnQuc2V0S2V5KSAmJiAhdGhpcy5pc3NldChlbGVtZW50LmRhdGFzZXQuZG9tS2V5KSkge1xyXG4gICAgICAgICAgICBlbGVtZW50LnNldEtleSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNzZXQoc2luZ2xlUGFyYW0ubGlzdCkpIHtcclxuICAgICAgICAgICAgbGV0IGxpc3QgPSBlbGVtZW50Lm1ha2VFbGVtZW50KHsgZWxlbWVudDogJ2RhdGFsaXN0Jywgb3B0aW9uczogc2luZ2xlUGFyYW0ubGlzdCB9KTtcclxuICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2xpc3QnLCBlbGVtZW50LmRhdGFzZXQuZG9tS2V5KTtcclxuICAgICAgICAgICAgbGlzdC5zZXRBdHRyaWJ1dGUoJ2lkJywgZWxlbWVudC5kYXRhc2V0LmRvbUtleSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pc3NldChzaW5nbGVQYXJhbS5zdGF0ZSkpIHtcclxuICAgICAgICAgICAgbGV0IG93bmVyID0gZWxlbWVudC5nZXRQYXJlbnRzKHNpbmdsZVBhcmFtLnN0YXRlLm93bmVyLCBzaW5nbGVQYXJhbS5zdGF0ZS52YWx1ZSk7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5pc251bGwob3duZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBvd25lci5hZGRTdGF0ZSh7IG5hbWU6IHNpbmdsZVBhcmFtLnN0YXRlLm5hbWUsIHN0YXRlOiBlbGVtZW50IH0pO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5kYXRhc2V0LnN0YXRlU3RhdHVzID0gJ3NldCc7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmRhdGFzZXQuc3RhdGVTdGF0dXMgPSAncGVuZGluZyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgfTtcclxuXHJcbiAgICBjcmVhdGVFbGVtZW50KHBhcmFtcyA9IHsgZWxlbWVudDogJycsIGF0dHJpYnV0ZXM6IHt9IH0sIHBhcmVudCkge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhcmFtcykpIHtcclxuICAgICAgICAgICAgbGV0IGVsZW1lbnRzID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IHBhcmFtIG9mIHBhcmFtcykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCh0aGlzLmdldEVsZW1lbnQocGFyYW0sIHBhcmVudCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50cztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgZWxlbWVudCA9IHRoaXMuZ2V0RWxlbWVudChwYXJhbXMsIHBhcmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YWxpZGF0ZUZvcm1UZXh0YXJlYShlbGVtZW50KSB7XHJcbiAgICAgICAgaWYgKGVsZW1lbnQudmFsdWUgPT0gJycpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICB2YWxpZGF0ZUZvcm1JbnB1dChlbGVtZW50KSB7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgndHlwZScpO1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IGVsZW1lbnQudmFsdWU7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzbnVsbCh0eXBlKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gIXRoaXMuaXNTcGFjZVN0cmluZyh2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0eXBlID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIGlmICh0eXBlID09ICdmaWxlJykge1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgIT0gJyc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT0gJ3RleHQnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5pc1NwYWNlU3RyaW5nKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PSAnZGF0ZScpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaGFzU3RyaW5nKGVsZW1lbnQuY2xhc3NOYW1lLCAnZnV0dXJlJykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzRGF0ZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc0RhdGVWYWxpZCh2YWx1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PSAnZW1haWwnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzRW1haWwodmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0eXBlID09ICdudW1iZXInKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVtYmVyKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PSAncGFzc3dvcmQnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzUGFzc3dvcmRWYWxpZCh2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gIXRoaXMuaXNTcGFjZVN0cmluZyh2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhbGlkYXRlRm9ybVNlbGVjdChlbGVtZW50KSB7XHJcbiAgICAgICAgaWYgKGVsZW1lbnQudmFsdWUgPT0gMCB8fCBlbGVtZW50LnZhbHVlLnRvTG93ZXJDYXNlKCkgPT0gJ251bGwnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhbGlkYXRlRm9ybShmb3JtLCBvcHRpb25zKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICAgICAgb3B0aW9ucy5ub2RlTmFtZXMgPSBvcHRpb25zLm5vZGVOYW1lcyB8fCAnSU5QVVQsIFNFTEVDVCwgVEVYVEFSRUEnO1xyXG4gICAgICAgIGxldCBmbGFnID0gdHJ1ZSxcclxuICAgICAgICAgICAgbm9kZU5hbWUsXHJcbiAgICAgICAgICAgIGVsZW1lbnROYW1lLFxyXG4gICAgICAgICAgICBlbGVtZW50cyA9IGZvcm0uZmluZEFsbChvcHRpb25zLm5vZGVOYW1lcyk7XHJcblxyXG4gICAgICAgIGxldCB2YWxpZGF0ZU1lID0gbWUgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdmFsdWU7XHJcbiAgICAgICAgICAgIGlmIChub2RlTmFtZSA9PSAnSU5QVVQnKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMudmFsaWRhdGVGb3JtSW5wdXQobWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lID09ICdTRUxFQ1QnKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMudmFsaWRhdGVGb3JtU2VsZWN0KG1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChub2RlTmFtZSA9PSAnVEVYVEFSRUEnKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMudmFsaWRhdGVGb3JtVGV4dGFyZWEobWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnZhbGlkYXRlT3RoZXJFbGVtZW50cyhtZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbm9kZU5hbWUgPSBlbGVtZW50c1tpXS5ub2RlTmFtZTtcclxuICAgICAgICAgICAgZWxlbWVudE5hbWUgPSBlbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoJ25hbWUnKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoJ2lnbm9yZScpID09ICd0cnVlJykge1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzc2V0KG9wdGlvbnMubmFtZXMpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5uYW1lcy5pbmNsdWRlcyhlbGVtZW50TmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBmbGFnID0gdmFsaWRhdGVNZShlbGVtZW50c1tpXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZsYWcgPSB2YWxpZGF0ZU1lKGVsZW1lbnRzW2ldKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFmbGFnKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHsgZmxhZywgZWxlbWVudE5hbWUgfTtcclxuICAgIH1cclxuXHJcbiAgICB2YWxpZGF0ZU90aGVyRWxlbWVudHMoZWxlbWVudCkge1xyXG4gICAgICAgIGxldCB2YWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgIGlmICh0aGlzLmlzc2V0KGVsZW1lbnQudmFsdWUpICYmIGVsZW1lbnQudmFsdWUgIT0gJycpIHZhbHVlID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgVmFsaWRhdGVGb3JtSW1hZ2VzKGZvcm0pIHtcclxuICAgICAgICByZXR1cm4gKHR5cGUgPT0gJ2ZpbGUnICYmICFzZWxmLmlzSW1hZ2VWYWxpZCh2YWx1ZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlzSW1hZ2VWYWxpZChpbnB1dCkge1xyXG4gICAgICAgIHZhciBleHQgPSBpbnB1dC5zdWJzdHJpbmcoaW5wdXQubGFzdEluZGV4T2YoJy4nKSArIDEpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgaWYgKGV4dCA9PSBcInBuZ1wiIHx8IGV4dCA9PSBcImdpZlwiIHx8IGV4dCA9PSBcImpwZWdcIiB8fCBleHQgPT0gXCJqcGdcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGltYWdlVG9Kc29uKGZpbGUsIGNhbGxCYWNrID0gKCkgPT4geyB9KSB7XHJcbiAgICAgICAgbGV0IGZpbGVSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG4gICAgICAgIGxldCBteWZpbGUgPSB7fTtcclxuICAgICAgICBmaWxlUmVhZGVyLm9ubG9hZCA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBteWZpbGUuc3JjID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcclxuICAgICAgICAgICAgY2FsbEJhY2sobXlmaWxlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBteWZpbGUuc2l6ZSA9IGZpbGUuc2l6ZTtcclxuICAgICAgICBteWZpbGUudHlwZSA9IGZpbGUudHlwZTtcclxuICAgICAgICBmaWxlUmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSlNFbGVtZW50czsiLCJjb25zdCBGdW5jID0gcmVxdWlyZSgnLi9GdW5jJyk7XHJcbmxldCBmdW5jID0gbmV3IEZ1bmMoKVxyXG5cclxuY2xhc3MgTWF0cml4IHtcclxuICAgIGNvbnN0cnVjdG9yKHBhcmFtcyA9IHsgcm93czogMiwgY29sczogMiwgY29udGVudHM6IFtdIH0pIHtcclxuICAgICAgICBPYmplY3Qua2V5cyhwYXJhbXMpLm1hcChrZXkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzW2tleV0gPSBwYXJhbXNba2V5XTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5yb3dzID0gdGhpcy5yb3dzIHx8IDI7XHJcbiAgICAgICAgdGhpcy5jb2xzID0gdGhpcy5jb2xzIHx8IDI7XHJcbiAgICAgICAgdGhpcy5jb250ZW50cyA9IHRoaXMuY29udGVudHMgfHwgW107XHJcbiAgICAgICAgdGhpcy5zZXREYXRhKHRoaXMuY29udGVudHMpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldERhdGEoY29udGVudHMgPSBbXSkge1xyXG4gICAgICAgIHRoaXMuY29udGVudHMgPSBjb250ZW50cztcclxuICAgICAgICB0aGlzLmRhdGEgPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGF0YVtpXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMucm93czsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFbaV1bal0gPSBjb250ZW50cy5zaGlmdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBzdHJ1Y3R1cmUoKSB7XHJcbiAgICAgICAgbGV0IHsgcm93cywgY29scyB9ID0gdGhpcztcclxuICAgICAgICByZXR1cm4geyByb3dzLCBjb2xzIH07XHJcbiAgICB9XHJcblxyXG4gICAgYWRkKG4gPSAwKSB7XHJcbiAgICAgICAgaWYgKG4gaW5zdGFuY2VvZiBNYXRyaXgpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnJvd3M7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YVtpXVtqXSArPSBuLmRhdGFbaV1bal07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKG4gaW5zdGFuY2VvZiBBcnJheSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMuY29sczsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhW2ldW2pdICs9IG5baV1bal07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5jb2xzOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFbaV1bal0gKz0gbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdWJ0cmFjdChuID0gMCkge1xyXG4gICAgICAgIGlmIChuIGluc3RhbmNlb2YgTWF0cml4KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5jb2xzOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFbaV1bal0gLT0gbi5kYXRhW2ldW2pdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChuIGluc3RhbmNlb2YgQXJyYXkpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnJvd3M7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YVtpXVtqXSAtPSBuW2ldW2pdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMuY29sczsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhW2ldW2pdIC09IG47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbXVsdGlwbHkobiA9IDEpIHtcclxuICAgICAgICBpZiAobiBpbnN0YW5jZW9mIE1hdHJpeCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG4uY29sczsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhW2ldW2pdICo9IG4uZGF0YVtpXVtqXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAobiBpbnN0YW5jZW9mIEFycmF5KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5jb2xzOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFbaV1bal0gKj0gbltpXVtqXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnJvd3M7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YVtpXVtqXSAqPSBuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJhbmRvbWl6ZSgpIHtcclxuICAgICAgICB0aGlzLm1hcCh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBmdW5jLnJhbmRvbSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zcG9zZSgpIHtcclxuICAgICAgICBsZXQgbmV3TWF0cml4ID0gbmV3IE1hdHJpeCh7IHJvd3M6IHRoaXMuY29scywgY29sczogdGhpcy5yb3dzIH0pO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbmV3TWF0cml4LmRhdGFbal1baV0gPSB0aGlzLmRhdGFbaV1bal07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgT2JqZWN0LmtleXMobmV3TWF0cml4KS5tYXAoa2V5ID0+IHtcclxuICAgICAgICAgICAgdGhpc1trZXldID0gbmV3TWF0cml4W2tleV07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgbWFwKGNhbGxiYWNrID0gKHZhbHVlLCAuLi5wb3MpID0+IHsgfSkge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gdGhpcy5kYXRhW2ldW2pdO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhW2ldW2pdID0gY2FsbGJhY2sodmFsdWUsIGksIGopO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaW50KCkge1xyXG4gICAgICAgIGNvbnNvbGUudGFibGUodGhpcy5kYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBzYXkoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy50b0FycmF5KCkpXHJcbiAgICB9XHJcblxyXG4gICAgdG9BcnJheSgpIHtcclxuICAgICAgICB0aGlzLmNvbnRlbnRzID0gW11cclxuICAgICAgICBNYXRyaXgubWFwKHRoaXMsIHZhbHVlID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jb250ZW50cy5wdXNoKHZhbHVlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb250ZW50cztcclxuICAgIH1cclxuXHJcbiAgICByZXNoYXBlKHBhcmFtcyA9IHsgcm93czogMiwgY29sczogMiB9KSB7XHJcbiAgICAgICAgdGhpcy50b0FycmF5KCk7XHJcbiAgICAgICAgdGhpcy5yb3dzID0gcGFyYW1zLnJvd3M7XHJcbiAgICAgICAgdGhpcy5jb2xzID0gcGFyYW1zLmNvbHM7XHJcbiAgICAgICAgdGhpcy5zZXREYXRhKHRoaXMuY29udGVudHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldENvbHVtbnMoLi4uY29scykge1xyXG4gICAgICAgIGxldCB2YWx1ZSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpIGluIGNvbHMpIHtcclxuICAgICAgICAgICAgdmFsdWUucHVzaChBcnJheS5lYWNoKHRoaXMuZGF0YSwgcm93ID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiByb3dbY29sc1tpXV07XHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRSb3dzKC4uLnJvd3MpIHtcclxuICAgICAgICBsZXQgdmFsdWUgPSBbXTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBpZiAocm93cy5pbmNsdWRlcyhyKSkge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUucHVzaCh0aGlzLmRhdGFbcl0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHRvQXJyYXkobWF0cml4KSB7XHJcbiAgICAgICAgbGV0IGFycmF5ID0gW11cclxuICAgICAgICBNYXRyaXgubWFwKG1hdHJpeCwgdmFsdWUgPT4ge1xyXG4gICAgICAgICAgICBhcnJheS5wdXNoKHZhbHVlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gYXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHN1YnRyYWN0KGEgPSBuZXcgTWF0cml4KCksIGIpIHtcclxuICAgICAgICBsZXQgY29udGVudHMgPSBbXSwgcm93cyA9IGEucm93cywgY29scyA9IGEuY29scztcclxuXHJcbiAgICAgICAgaWYgKGIgaW5zdGFuY2VvZiBNYXRyaXgpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29sczsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMucHVzaChhLmRhdGFbaV1bal0gLSBiLmRhdGFbaV1bal0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGIgaW5zdGFuY2VvZiBBcnJheSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEucm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGEuY29sczsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMucHVzaChhLmRhdGFbaV1bal0gLSBiW2ldW2pdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnJvd3M7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLnB1c2goYS5kYXRhW2ldW2pdIC0gYik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgTWF0cml4KHsgcm93cywgY29scywgY29udGVudHMgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGFkZChhID0gbmV3IE1hdHJpeCgpLCBiKSB7XHJcbiAgICAgICAgbGV0IGNvbnRlbnRzID0gW10sIHJvd3MgPSBhLnJvd3MsIGNvbHMgPSBhLmNvbHM7XHJcblxyXG4gICAgICAgIGlmIChiIGluc3RhbmNlb2YgTWF0cml4KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLnB1c2goYS5kYXRhW2ldW2pdICsgYi5kYXRhW2ldW2pdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChiIGluc3RhbmNlb2YgQXJyYXkpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhLnJvd3M7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBhLmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLnB1c2goYS5kYXRhW2ldW2pdICsgYltpXVtqXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5jb2xzOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5wdXNoKGEuZGF0YVtpXVtqXSArIGIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdHJpeCh7IHJvd3MsIGNvbHMsIGNvbnRlbnRzIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBtdWx0aXBseShhID0gbmV3IE1hdHJpeCgpLCBiKSB7XHJcbiAgICAgICAgbGV0IGNvbnRlbnRzID0gW10sIHJvd3MsIGNvbHM7XHJcblxyXG4gICAgICAgIGlmIChiIGluc3RhbmNlb2YgTWF0cml4KSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoYS5jb2xzICE9PSBiLnJvd3MpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb2x1bW5zIG9mIEEgbXVzdCBlcXVhbCByb3dzIG9mIEInKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcm93cyA9IGEucm93cztcclxuICAgICAgICAgICAgY29scyA9IGIuY29scztcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgYS5jb2xzOyBrKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VtICs9IGEuZGF0YVtpXVtrXSAqIGIuZGF0YVtrXVtqXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMucHVzaChzdW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGIgaW5zdGFuY2VvZiBBcnJheSkge1xyXG5cclxuICAgICAgICAgICAgcm93cyA9IGEucm93cztcclxuICAgICAgICAgICAgY29scyA9IGEuY29scztcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYS5jb2xzOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5wdXNoKGEuZGF0YVtpXVtqXSAqIGJbaV1bal0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMuY29sczsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMucHVzaChhLmRhdGFbaV1bal0gKiBiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXRyaXgoeyByb3dzLCBjb2xzLCBjb250ZW50cyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGl2aWRlKGEgPSBuZXcgTWF0cml4KCksIGIpIHtcclxuICAgICAgICBsZXQgY29udGVudHMgPSBbXSwgcm93cywgY29scztcclxuXHJcbiAgICAgICAgaWYgKGIgaW5zdGFuY2VvZiBNYXRyaXgpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChhLmNvbHMgIT09IGIucm93cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NvbHVtbnMgb2YgQSBtdXN0IGVxdWFsIHJvd3Mgb2YgQicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByb3dzID0gYS5yb3dzO1xyXG4gICAgICAgICAgICBjb2xzID0gYi5jb2xzO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29sczsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBhLmNvbHM7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdW0gKz0gKGEuZGF0YVtpXVtrXSAvIGIuZGF0YVtrXVtqXSkgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMucHVzaChzdW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGIgaW5zdGFuY2VvZiBBcnJheSkge1xyXG5cclxuICAgICAgICAgICAgcm93cyA9IGEucm93cztcclxuICAgICAgICAgICAgY29scyA9IGEuY29scztcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgYS5jb2xzOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5wdXNoKChhLmRhdGFbaV1bal0gLyBiW2ldW2pdKSB8fCAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnJvd3M7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLnB1c2goKGEuZGF0YVtpXVtqXSAvIGIpIHx8IDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3IE1hdHJpeCh7IHJvd3MsIGNvbHMsIGNvbnRlbnRzIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByYW5kb21pemUobWF0cml4ID0gbmV3IE1hdHJpeCgpKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdHJpeC5tYXAobWF0cml4LCAodmFsdWUgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gZnVuYy5yYW5kb20oKTtcclxuICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHRyYW5zcG9zZShtYXRyaXggPSBuZXcgTWF0cml4KCkpIHtcclxuICAgICAgICBsZXQgbmV3TWF0cml4ID0gbmV3IE1hdHJpeCh7IHJvd3M6IG1hdHJpeC5jb2xzLCBjb2xzOiBtYXRyaXgucm93cyB9KTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1hdHJpeC5yb3dzOyBpKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBtYXRyaXguY29sczsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdNYXRyaXguZGF0YVtqXVtpXSA9IG1hdHJpeC5kYXRhW2ldW2pdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXdNYXRyaXg7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIG1hcChtYXRyaXggPSBuZXcgTWF0cml4KCksIGNhbGxiYWNrID0gKCkgPT4geyB9KSB7XHJcbiAgICAgICAgbGV0IG5ld01hdHJpeCA9IG5ldyBNYXRyaXgoeyByb3dzOiBtYXRyaXgucm93cywgY29sczogbWF0cml4LmNvbHMgfSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYXRyaXgucm93czsgaSsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbWF0cml4LmNvbHM7IGorKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gbWF0cml4LmRhdGFbaV1bal07XHJcbiAgICAgICAgICAgICAgICBuZXdNYXRyaXguZGF0YVtpXVtqXSA9IGNhbGxiYWNrKHZhbHVlLCBpLCBqKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3TWF0cml4O1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tQXJyYXkoY29udGVudHMgPSBbXSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0cml4KHsgcm93czogY29udGVudHMubGVuZ3RoLCBjb2xzOiAxLCBjb250ZW50cyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcmVzaGFwZShwYXJhbXMgPSB7IHJvd3M6IDIsIGNvbHM6IDIsIG1hdHJpeDogbmV3IE1hdHJpeCB9KSB7XHJcbiAgICAgICAgcGFyYW1zLmNvbnRlbnRzID0gTWF0cml4LnRvQXJyYXkocGFyYW1zLm1hdHJpeCk7XHJcbiAgICAgICAgZGVsZXRlIHBhcmFtcy5tYXRyaXg7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXRyaXgocGFyYW1zKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgbm9ybWFsaXplKG1hdHJpeCA9IG5ldyBNYXRyaXgoKSkge1xyXG4gICAgICAgIGxldCBjb250ZW50cyA9IE1hdGgubm9ybWFsaXplKE1hdHJpeC50b0FycmF5KG1hdHJpeCkpO1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0cml4KHsgcm93czogbWF0cml4LnJvd3MsIGNvbHM6IG1hdHJpeC5jb2xzLCBjb250ZW50cyB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGlhZ29uYWwoYXJyYXkgPSBbXSkge1xyXG4gICAgICAgIGxldCBtYXRyaXggPSBNYXRyaXguc3F1YXJlKGFycmF5Lmxlbmd0aCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBtYXRyaXguZGF0YSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqIGluIG1hdHJpeC5kYXRhW2ldKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSBqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWF0cml4LmRhdGFbaV1bal0gPSBhcnJheVtpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBtYXRyaXgudG9BcnJheSgpO1xyXG4gICAgICAgIHJldHVybiBtYXRyaXg7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHVuaXQoc2l6ZSA9IDIpIHtcclxuICAgICAgICBsZXQgbWF0cml4ID0gTWF0cml4LnNxdWFyZShzaXplKTtcclxuICAgICAgICBmb3IgKGxldCBpIGluIG1hdHJpeC5kYXRhKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogaW4gbWF0cml4LmRhdGFbaV0pIHtcclxuICAgICAgICAgICAgICAgIGlmIChpID09IGopIHtcclxuICAgICAgICAgICAgICAgICAgICBtYXRyaXguZGF0YVtpXVtqXSA9IDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbWF0cml4LnRvQXJyYXkoKTtcclxuICAgICAgICByZXR1cm4gbWF0cml4O1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzcXVhcmUoc2l6ZSA9IDIpIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdHJpeCh7IHJvd3M6IHNpemUsIGNvbHM6IHNpemUgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGZyb21NYXRyaXhDb2xzKG1hdHJpeCA9IG5ldyBNYXRyaXgoKSwgLi4uY29scykge1xyXG4gICAgICAgIGxldCB2YWx1ZSA9IG1hdHJpeC5nZXRDb2x1bW5zKC4uLmNvbHMpO1xyXG4gICAgICAgIGxldCBjb250ZW50cyA9IEFycmF5LmZsYXR0ZW4odmFsdWUpO1xyXG4gICAgICAgIGxldCBuZXdNYXRyaXggPSBuZXcgTWF0cml4KHsgcm93czogdmFsdWUubGVuZ3RoLCBjb2xzOiBtYXRyaXguY29scywgY29udGVudHMgfSk7XHJcbiAgICAgICAgbmV3TWF0cml4LnRyYW5zcG9zZSgpO1xyXG4gICAgICAgIHJldHVybiBuZXdNYXRyaXg7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGRlZXBNYXRyaXgoZGltZW5zaW9ucyA9IFtdLCBjb250ZW50cyA9IFtdKSB7XHJcbiAgICAgICAgLy9zcGxpdCB0aGUgZGltZW5zaW9ucyBpbnRvIGFuIGFycmF5IG9mIGFycmF5cyBvZiBsZW5ndGggMlxyXG4gICAgICAgIGxldCBtYXRyaXhEaW1lbnNpb25zID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaW1lbnNpb25zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIG1hdHJpeERpbWVuc2lvbnMucHVzaCh7IHJvd3M6IGRpbWVuc2lvbnNbaV0sIGNvbHM6IGRpbWVuc2lvbnNbKytpXSB8fCAxIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1ha2VNYXRyaXggPSAobGF5ZXIpID0+IHtcclxuICAgICAgICAgICAgbGV0IG1hdHJpeCA9IG5ldyBNYXRyaXgobWF0cml4RGltZW5zaW9uc1tsYXllcl0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGxheWVyICsgMSA9PSBtYXRyaXhEaW1lbnNpb25zLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgbWF0cml4Lm1hcCh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnRzLnNoaWZ0KCkgfHwgMDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbWF0cml4Lm1hcCh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ha2VNYXRyaXgobGF5ZXIgKyAxKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBtYXRyaXg7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWFrZU1hdHJpeCgwKTtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNYXRyaXg7IiwiY29uc3QgRnVuYyA9IHJlcXVpcmUoJy4vRnVuYycpO1xyXG5jb25zdCBNYXRyaXggPSByZXF1aXJlKCcuL01hdHJpeCcpO1xyXG5jb25zdCBBcnJheUxpYnJhcnkgPSByZXF1aXJlKCcuLy4uL2Z1bmN0aW9ucy9BcnJheUxpYnJhcnknKTtcclxuXHJcbmxldCBmdW5jID0gbmV3IEZ1bmMoKTtcclxubGV0IGFycmF5TGlicmFyeSA9IEFycmF5TGlicmFyeSgpO1xyXG5cclxuY2xhc3MgTmV1cmFsTmV0d29yayB7XHJcbiAgICBjb25zdHJ1Y3RvcihwYXJhbXMpIHtcclxuICAgICAgICBmdW5jLm9iamVjdC5jb3B5KHBhcmFtcywgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5paFdlaWdodHMgPSBuZXcgTWF0cml4KHsgcm93czogdGhpcy5oTm9kZXMsIGNvbHM6IHRoaXMuaU5vZGVzIH0pO1xyXG4gICAgICAgIHRoaXMuaWhXZWlnaHRzLnJhbmRvbWl6ZSgpO1xyXG5cclxuICAgICAgICB0aGlzLmloQmlhcyA9IG5ldyBNYXRyaXgoeyByb3dzOiB0aGlzLmhOb2RlcywgY29sczogMSB9KTtcclxuICAgICAgICB0aGlzLmloQmlhcy5yYW5kb21pemUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5ob1dlaWdodHMgPSBuZXcgTWF0cml4KHsgcm93czogdGhpcy5vTm9kZXMsIGNvbHM6IHRoaXMuaE5vZGVzIH0pO1xyXG4gICAgICAgIHRoaXMuaG9XZWlnaHRzLnJhbmRvbWl6ZSgpO1xyXG5cclxuICAgICAgICB0aGlzLmhvQmlhcyA9IG5ldyBNYXRyaXgoeyByb3dzOiB0aGlzLm9Ob2RlcywgY29sczogMSB9KTtcclxuICAgICAgICB0aGlzLmhvQmlhcy5yYW5kb21pemUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5sciA9IHRoaXMubHIgfHwgMC4xO1xyXG4gICAgfVxyXG5cclxuICAgIGZlZWRGb3dhcmQoaW5wdXRBcnJheSA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGlucHV0cyA9IGlucHV0QXJyYXkgaW5zdGFuY2VvZiBNYXRyaXggPyBpbnB1dEFycmF5IDogdGhpcy5wcmVwYXJlSW5wdXRzKGlucHV0QXJyYXkpO1xyXG5cclxuICAgICAgICBsZXQgaGlkZGVucyA9IE1hdHJpeC5tdWx0aXBseSh0aGlzLmloV2VpZ2h0cywgaW5wdXRzKTtcclxuICAgICAgICBoaWRkZW5zLmFkZCh0aGlzLmloQmlhcyk7XHJcbiAgICAgICAgaGlkZGVucy5tYXAoc2lnbW9pZCk7XHJcblxyXG4gICAgICAgIGxldCBvdXRwdXRzID0gTWF0cml4Lm11bHRpcGx5KHRoaXMuaG9XZWlnaHRzLCBoaWRkZW5zKTtcclxuICAgICAgICBvdXRwdXRzLmFkZCh0aGlzLmhvQmlhcyk7XHJcbiAgICAgICAgb3V0cHV0cy5tYXAoc2lnbW9pZCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7IGlucHV0cywgaGlkZGVucywgb3V0cHV0cyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHF1ZXJ5QmFjayh0YXJnZXRBcnJheSA9IFtdKSB7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByZWRpY3QoaW5wdXRBcnJheSA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmVlZEZvd2FyZChpbnB1dEFycmF5KS5vdXRwdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFdlaWdodHNVcGRhdGUoaW5wdXRzID0gbmV3IE1hdHJpeCgpLCBvdXRwdXRzID0gbmV3IE1hdHJpeCgpLCBlcnJvcnMgPSAxKSB7XHJcbiAgICAgICAgbGV0IGdyYWRpZW50cyA9IE1hdHJpeC5tYXAob3V0cHV0cywgZFNpZ21vaWQpO1xyXG4gICAgICAgIGdyYWRpZW50cy5tdWx0aXBseShlcnJvcnMpO1xyXG4gICAgICAgIGdyYWRpZW50cy5tdWx0aXBseSh0aGlzLmxyKTtcclxuXHJcbiAgICAgICAgbGV0IGlucHV0c1RyYW5zcG9zZWQgPSBNYXRyaXgudHJhbnNwb3NlKGlucHV0cyk7XHJcbiAgICAgICAgbGV0IGNoYW5nZSA9IE1hdHJpeC5tdWx0aXBseShncmFkaWVudHMsIGlucHV0c1RyYW5zcG9zZWQpO1xyXG5cclxuICAgICAgICByZXR1cm4geyBjaGFuZ2UsIGdyYWRpZW50cyB9O1xyXG4gICAgfVxyXG5cclxuICAgIGJhY2twcm9wYWdhdGUoaW5wdXRzID0gW10sIHRhcmdldHMgPSBuZXcgTWF0cml4KCkpIHtcclxuICAgICAgICBsZXQgeyBoaWRkZW5zLCBvdXRwdXRzIH0gPSB0aGlzLmZlZWRGb3dhcmQoaW5wdXRzKTtcclxuXHJcbiAgICAgICAgbGV0IGhvRXJyb3JzID0gTWF0cml4LnN1YnRyYWN0KHRhcmdldHMsIG91dHB1dHMpO1xyXG4gICAgICAgIGxldCBob1VwZGF0ZXMgPSB0aGlzLmdldFdlaWdodHNVcGRhdGUoaGlkZGVucywgb3V0cHV0cywgaG9FcnJvcnMpO1xyXG4gICAgICAgIHRoaXMuaG9XZWlnaHRzLmFkZChob1VwZGF0ZXMuY2hhbmdlKTtcclxuICAgICAgICB0aGlzLmhvQmlhcy5hZGQoaG9VcGRhdGVzLmdyYWRpZW50cyk7XHJcblxyXG4gICAgICAgIGxldCBob1dlaWdodHNUcmFuc3Bvc2VkID0gTWF0cml4LnRyYW5zcG9zZSh0aGlzLmhvV2VpZ2h0cyk7XHJcbiAgICAgICAgbGV0IGloRXJyb3JzID0gTWF0cml4Lm11bHRpcGx5KGhvV2VpZ2h0c1RyYW5zcG9zZWQsIGhvRXJyb3JzKTtcclxuICAgICAgICBsZXQgaWhVcGRhdGVzID0gdGhpcy5nZXRXZWlnaHRzVXBkYXRlKGlucHV0cywgaGlkZGVucywgaWhFcnJvcnMpO1xyXG4gICAgICAgIHRoaXMuaWhXZWlnaHRzLmFkZChpaFVwZGF0ZXMuY2hhbmdlKTtcclxuICAgICAgICB0aGlzLmloQmlhcy5hZGQoaWhVcGRhdGVzLmdyYWRpZW50cyk7XHJcbiAgICB9XHJcblxyXG4gICAgdHJhaW4ocGFyYW1zID0geyB0cmFpbmluZ0RhdGE6IFtdLCBwZXJpb2Q6IDEsIGVwb2NoOiAxIH0pIHtcclxuICAgICAgICBsZXQgaW5wdXRBcnJheSA9IFtdLCB0YXJnZXRBcnJheSA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGRhdGEgb2YgcGFyYW1zLnRyYWluaW5nRGF0YSkge1xyXG4gICAgICAgICAgICBpbnB1dEFycmF5LnB1c2goZGF0YS5pbnB1dHMpO1xyXG4gICAgICAgICAgICB0YXJnZXRBcnJheS5wdXNoKGRhdGEudGFyZ2V0cyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgaW5wdXRzID0gYXJyYXlMaWJyYXJ5LmVhY2goaW5wdXRBcnJheSwgdmFsdWUgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcmVwYXJlSW5wdXRzKHZhbHVlKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IHRhcmdldHMgPSBhcnJheUxpYnJhcnkuZWFjaCh0YXJnZXRBcnJheSwgdmFsdWUgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcmVwYXJlVGFyZ2V0cyh2YWx1ZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGxldCBydW4gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyYW1zLnBlcmlvZDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqIGluIGlucHV0cykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmFja3Byb3BhZ2F0ZShpbnB1dHNbal0sIHRhcmdldHNbal0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZnVuYy5pc3NldChwYXJhbXMuZXBvY2gpKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgcGFyYW1zLmVwb2NoOyBwKyspIHtcclxuICAgICAgICAgICAgICAgIHJ1bigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcnVuKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldExlYXJuaW5nUmF0ZShsciA9IDAuMSkge1xyXG4gICAgICAgIHRoaXMubHIgPSBscjtcclxuICAgIH1cclxuXHJcbiAgICBwcmVwYXJlSW5wdXRzKGlucHV0QXJyYXkgPSBbXSkge1xyXG4gICAgICAgIGxldCBpbnB1dHMgPSBNYXRyaXguZnJvbUFycmF5KE1hdGgubm9ybWFsaXplKGlucHV0QXJyYXkpKTtcclxuICAgICAgICBpbnB1dHMubXVsdGlwbHkoMC45OSk7XHJcbiAgICAgICAgaW5wdXRzLmFkZCgwLjAxKTtcclxuICAgICAgICByZXR1cm4gaW5wdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHByZXBhcmVUYXJnZXRzKHRhcmdldEFycmF5ID0gW10pIHtcclxuICAgICAgICBsZXQgdGFyZ2V0cyA9IE1hdHJpeC5mcm9tQXJyYXkodGFyZ2V0QXJyYXkpO1xyXG4gICAgICAgIHRhcmdldHMuYWRkKDAuMDEpO1xyXG4gICAgICAgIHRhcmdldHMubXVsdGlwbHkoMC45OSk7XHJcbiAgICAgICAgcmV0dXJuIHRhcmdldHM7XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTmV1cmFsTmV0d29yazsiLCJjb25zdCBGdW5jID0gcmVxdWlyZSgnLi9GdW5jJyk7XHJcblxyXG5jbGFzcyBQZXJpb2QgZXh0ZW5kcyBGdW5jIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHRyaW1Nb250aEFycmF5KCkge1xyXG4gICAgICAgIGxldCBtb250aHMgPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubW9udGhzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIG1vbnRocy5wdXNoKHRoaXMubW9udGhzW2ldLnNsaWNlKDAsIDMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG1vbnRocztcclxuICAgIH1cclxuXHJcbiAgICBnZXRZZWFycyhjb3VudCA9IDUpIHtcclxuICAgICAgICBsZXQgeWVhciA9IG5ldyBEYXRlKCkuZ2V0WWVhcigpICsgMTkwMDtcclxuICAgICAgICBsZXQgZmV0Y2hlZCA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICBmZXRjaGVkLnB1c2goYCR7eWVhciAtIDF9LSR7eWVhcn1gKTtcclxuICAgICAgICAgICAgeWVhcisrO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmV0Y2hlZDtcclxuICAgIH1cclxuXHJcbiAgICBpc1RpbWVWYWxpZCh0aW1lKSB7XHJcbiAgICAgICAgdGltZSA9IHRpbWUuc3BsaXQoJzonKTtcclxuICAgICAgICBpZiAodGltZS5sZW5ndGggPT0gMiB8fCB0aW1lLmxlbmd0aCA9PSAzKSB7XHJcbiAgICAgICAgICAgIHZhciBob3VyID0gbmV3IE51bWJlcih0aW1lWzBdKTtcclxuICAgICAgICAgICAgdmFyIG1pbnV0ZXMgPSBuZXcgTnVtYmVyKHRpbWVbMV0pO1xyXG4gICAgICAgICAgICB2YXIgc2Vjb25kcyA9IDA7XHJcbiAgICAgICAgICAgIHZhciB0b3RhbCA9IDA7XHJcblxyXG4gICAgICAgICAgICBpZiAodGltZS5sZW5ndGggPT0gMykge1xyXG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IG5ldyBOdW1iZXIodGltZVsyXSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaG91ciA+IDIzIHx8IGhvdXIgPCAwIHx8IG1pbnV0ZXMgPiA1OSB8fCBtaW51dGVzIDwgMCB8fCBzZWNvbmRzID4gNTkgfHwgc2Vjb25kcyA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaG91ciA+IDIzIHx8IGhvdXIgPCAwIHx8IG1pbnV0ZXMgPiA1OSB8fCBtaW51dGVzIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIHRvdGFsID0gKGhvdXIgKiA2MCAqIDYwKSArIChtaW51dGVzICogNjApICsgc2Vjb25kcztcclxuICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdGltZSh0aW1lKSB7XHJcbiAgICAgICAgbGV0IGRhdGUgPSAodGhpcy5pc3NldCh0aW1lKSkgPyBuZXcgRGF0ZShNYXRoLmZsb29yKHRpbWUpKSA6IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgbGV0IGhvdXIgPSBkYXRlLmdldEhvdXJzKCkudG9TdHJpbmcoKTtcclxuICAgICAgICBsZXQgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgbGV0IHNlY29uZHMgPSBkYXRlLmdldFNlY29uZHMoKS50b1N0cmluZygpO1xyXG5cclxuICAgICAgICBob3VyID0gKGhvdXIubGVuZ3RoID4gMSkgPyBob3VyIDogYDAke2hvdXJ9YDtcclxuICAgICAgICBtaW51dGVzID0gKG1pbnV0ZXMubGVuZ3RoID4gMSkgPyBtaW51dGVzIDogYDAke21pbnV0ZXN9YDtcclxuICAgICAgICBzZWNvbmRzID0gKHNlY29uZHMubGVuZ3RoID4gMSkgPyBzZWNvbmRzIDogYDAke3NlY29uZHN9YDtcclxuXHJcbiAgICAgICAgcmV0dXJuIGAke2hvdXJ9OiR7bWludXRlc306JHtzZWNvbmRzfWA7XHJcbiAgICB9XHJcblxyXG4gICAgZGF0ZSh0aW1lKSB7XHJcbiAgICAgICAgbGV0IGRhdGUgPSAodGhpcy5pc3NldCh0aW1lKSkgPyBuZXcgRGF0ZShNYXRoLmZsb29yKHRpbWUpKSA6IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgbGV0IGRheSA9IGRhdGUuZ2V0RGF0ZSgpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgbGV0IG1vbnRoID0gKGRhdGUuZ2V0TW9udGgoKSArIDEpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgbGV0IHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgZGF5ID0gKGRheS5sZW5ndGggPiAxKSA/IGRheSA6IGAwJHtkYXl9YDtcclxuICAgICAgICBtb250aCA9IChtb250aC5sZW5ndGggPiAxKSA/IG1vbnRoIDogYDAke21vbnRofWA7XHJcblxyXG4gICAgICAgIHJldHVybiBgJHt5ZWFyfS0ke21vbnRofS0ke2RheX1gO1xyXG4gICAgfVxyXG5cclxuICAgIHRpbWVfZGF0ZSh0aW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIGAke3RoaXMudGltZSh0aW1lKX0sICR7dGhpcy5kYXRlKHRpbWUpfWA7XHJcbiAgICB9XHJcblxyXG4gICAgdGltZVRvZGF5KCkge1xyXG4gICAgICAgIGxldCBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICBsZXQgaG91ciA9IGRhdGUuZ2V0SG91cnMoKTtcclxuICAgICAgICBsZXQgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpO1xyXG4gICAgICAgIGxldCBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKCk7XHJcblxyXG4gICAgICAgIGxldCB0aW1lID0gdGhpcy5pc1RpbWVWYWxpZChgJHtob3VyfToke21pbnV0ZXN9OiR7c2Vjb25kc31gKTtcclxuICAgICAgICByZXR1cm4gdGltZSA/IHRpbWUgOiAtMTtcclxuICAgIH1cclxuXHJcbiAgICBpc0RhdGVWYWxpZCh2YWx1ZSkge1xyXG4gICAgICAgIGlmICh0aGlzLmlzRGF0ZSh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNZZWFyVmFsaWQodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc01vbnRoVmFsaWQodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEYXlWYWxpZCh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBpc0RheVZhbGlkKHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIHZfZGF5ID0gXCJcIjtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDI7IGkrKykge1xyXG4gICAgICAgICAgICB2X2RheSArPSB2YWx1ZVtpICsgOF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBsaW1pdCA9IDA7XHJcbiAgICAgICAgdmFyIG1vbnRoID0gdGhpcy5pc01vbnRoVmFsaWQodmFsdWUpO1xyXG5cclxuICAgICAgICBpZiAobW9udGggPT0gJzAxJykge1xyXG4gICAgICAgICAgICBsaW1pdCA9IDMxO1xyXG4gICAgICAgIH0gZWxzZSBpZiAobW9udGggPT0gJzAyJykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0xlYXBZZWFyKHRoaXMuaXNZZWFyVmFsaWQodmFsdWUpKSkge1xyXG4gICAgICAgICAgICAgICAgbGltaXQgPSAyOTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxpbWl0ID0gMjg7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwMycpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwNCcpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMDtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwNScpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwNicpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMDtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwNycpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwOCcpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwOScpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMDtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcxMCcpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcxMScpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMDtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcxMicpIHtcclxuICAgICAgICAgICAgbGltaXQgPSAzMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChsaW1pdCA8IHZfZGF5KSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdl9kYXk7XHJcbiAgICB9XHJcblxyXG4gICAgaXNEYXRlKHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIGxlbiA9IHZhbHVlLmxlbmd0aDtcclxuICAgICAgICBpZiAobGVuID09IDEwKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRGlnaXQodmFsdWVbeF0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh4ID09IDQgfHwgeCA9PSA3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZVt4XSA9PSAnLScpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgaXNNb250aFZhbGlkKHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIHZfbW9udGggPSBcIlwiO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZfbW9udGggKz0gdmFsdWVbaSArIDVdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodl9tb250aCA+IDEyIHx8IHZfbW9udGggPCAxKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdl9tb250aDtcclxuICAgIH1cclxuXHJcbiAgICBpc1llYXJWYWxpZCh2YWx1ZSkge1xyXG4gICAgICAgIHZhciB5ZWFyID0gbmV3IERhdGUoKS5nZXRGdWxsWWVhcignWScpO1xyXG4gICAgICAgIHZhciB2X3llYXIgPSBcIlwiO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZfeWVhciArPSB2YWx1ZVtpICsgMF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh2X3llYXIgPiB5ZWFyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdl95ZWFyO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFllYXIodmFsdWUpIHtcclxuICAgICAgICB2YXIgdl95ZWFyID0gXCJcIjtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDQ7IGkrKykge1xyXG4gICAgICAgICAgICB2X3llYXIgKz0gdmFsdWVbaSArIDBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdl95ZWFyO1xyXG4gICAgfVxyXG5cclxuICAgIGlzTGVhcFllYXIodmFsdWUpIHtcclxuICAgICAgICBpZiAodmFsdWUgJSA0ID09IDApIHtcclxuICAgICAgICAgICAgaWYgKCh2YWx1ZSAlIDEwMCA9PSAwKSAmJiAodmFsdWUgJSA0MDAgIT0gMCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGRheXNJbk1vbnRoKG1vbnRoLCB5ZWFyKSB7XHJcbiAgICAgICAgdmFyIGRheXMgPSAwO1xyXG4gICAgICAgIGlmIChtb250aCA9PSAnMDEnKSB7XHJcbiAgICAgICAgICAgIGRheXMgPSAzMTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwMicpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNMZWFwWWVhcih5ZWFyKSkge1xyXG4gICAgICAgICAgICAgICAgZGF5cyA9IDI5O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGF5cyA9IDI4O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChtb250aCA9PSAnMDMnKSB7XHJcbiAgICAgICAgICAgIGRheXMgPSAzMTtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwNCcpIHtcclxuICAgICAgICAgICAgZGF5cyA9IDMwO1xyXG4gICAgICAgIH0gZWxzZSBpZiAobW9udGggPT0gJzA1Jykge1xyXG4gICAgICAgICAgICBkYXlzID0gMzE7XHJcbiAgICAgICAgfSBlbHNlIGlmIChtb250aCA9PSAnMDYnKSB7XHJcbiAgICAgICAgICAgIGRheXMgPSAzMDtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcwNycpIHtcclxuICAgICAgICAgICAgZGF5cyA9IDMxO1xyXG4gICAgICAgIH0gZWxzZSBpZiAobW9udGggPT0gJzA4Jykge1xyXG4gICAgICAgICAgICBkYXlzID0gMzE7XHJcbiAgICAgICAgfSBlbHNlIGlmIChtb250aCA9PSAnMDknKSB7XHJcbiAgICAgICAgICAgIGRheXMgPSAzMDtcclxuICAgICAgICB9IGVsc2UgaWYgKG1vbnRoID09ICcxMCcpIHtcclxuICAgICAgICAgICAgZGF5cyA9IDMxO1xyXG4gICAgICAgIH0gZWxzZSBpZiAobW9udGggPT0gJzExJykge1xyXG4gICAgICAgICAgICBkYXlzID0gMzA7XHJcbiAgICAgICAgfSBlbHNlIGlmIChtb250aCA9PSAnMTInKSB7XHJcbiAgICAgICAgICAgIGRheXMgPSAzMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRheXM7XHJcbiAgICB9XHJcblxyXG4gICAgZGF0ZVZhbHVlKGRhdGUpIHtcclxuICAgICAgICB2YXIgdmFsdWUgPSAwO1xyXG4gICAgICAgIHZhciB5ZWFyID0gdGhpcy5nZXRZZWFyKGRhdGUpICogMzY1O1xyXG4gICAgICAgIHZhciBtb250aCA9IDA7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCB0aGlzLmlzTW9udGhWYWxpZChkYXRlKTsgaSsrKSB7XHJcbiAgICAgICAgICAgIG1vbnRoID0gdGhpcy5kYXlzSW5Nb250aChpLCB0aGlzLmdldFllYXIoZGF0ZSkpIC8gMSArIG1vbnRoIC8gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGRheSA9IHRoaXMuaXNEYXlWYWxpZChkYXRlKTtcclxuICAgICAgICB2YWx1ZSA9ICh5ZWFyIC8gMSkgKyAobW9udGggLyAxKSArIChkYXkgLyAxKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIHRvZGF5KCkge1xyXG4gICAgICAgIHZhciB0b2RheSA9IG5ldyBEYXRlO1xyXG4gICAgICAgIHZhciBtb250aCA9IHRvZGF5LmdldE1vbnRoKCkgLyAxICsgMTtcclxuICAgICAgICBpZiAobW9udGgubGVuZ3RoICE9IDIpIHtcclxuICAgICAgICAgICAgbW9udGggPSAnMCcgKyBtb250aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdG9kYXkgPSAodG9kYXkuZ2V0RnVsbFllYXIoKSkgKyAnLScgKyBtb250aCArICctJyArIHRvZGF5LmdldERhdGUoKTtcclxuICAgICAgICByZXR1cm4gdG9kYXk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0RGF0ZU9iamVjdCh2YWx1ZSkge1xyXG4gICAgICAgIGxldCBkYXlzID0gTWF0aC5mbG9vcih2YWx1ZSAvIHRoaXMuc2Vjb25kc0luRGF5cygxKSk7XHJcblxyXG4gICAgICAgIHZhbHVlIC09IHRoaXMuc2Vjb25kc0luRGF5cyhkYXlzKTtcclxuXHJcbiAgICAgICAgbGV0IGhvdXJzID0gTWF0aC5mbG9vcih2YWx1ZSAvIHRoaXMuc2Vjb25kc0luSG91cnMoMSkpO1xyXG4gICAgICAgIHZhbHVlIC09IHRoaXMuc2Vjb25kc0luSG91cnMoaG91cnMpO1xyXG5cclxuICAgICAgICBsZXQgbWludXRlcyA9IE1hdGguZmxvb3IodmFsdWUgLyB0aGlzLnNlY29uZHNJbk1pbnV0ZXMoMSkpO1xyXG4gICAgICAgIHZhbHVlIC09IHRoaXMuc2Vjb25kc0luTWludXRlcyhtaW51dGVzKTtcclxuXHJcbiAgICAgICAgbGV0IHNlY29uZHMgPSB2YWx1ZTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgZGF5cywgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMgfTtcclxuICAgIH1cclxuXHJcbiAgICBkYXRlV2l0aFRvZGF5KGRhdGUpIHtcclxuICAgICAgICB2YXIgdG9kYXkgPSBNYXRoLmZsb29yKHRoaXMuZGF0ZVZhbHVlKHRoaXMudG9kYXkoKSkpO1xyXG4gICAgICAgIGxldCBkYXRlVmFsdWUgPSBNYXRoLmZsb29yKHRoaXMuZGF0ZVZhbHVlKGRhdGUpKTtcclxuXHJcbiAgICAgICAgdmFyIHZhbHVlID0geyBkaWZmOiAoZGF0ZVZhbHVlIC0gdG9kYXkpLCB3aGVuOiAnJyB9O1xyXG4gICAgICAgIGlmIChkYXRlVmFsdWUgPiB0b2RheSkge1xyXG4gICAgICAgICAgICB2YWx1ZS53aGVuID0gJ2Z1dHVyZSc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGRhdGVWYWx1ZSA9PSB0b2RheSkge1xyXG4gICAgICAgICAgICB2YWx1ZS53aGVuID0gJ3RvZGF5JztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhbHVlLndoZW4gPSAncGFzdCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBkYXRlU3RyaW5nKGRhdGUpIHtcclxuICAgICAgICB2YXIgeWVhciA9IG5ldyBOdW1iZXIodGhpcy5nZXRZZWFyKGRhdGUpKTtcclxuICAgICAgICB2YXIgbW9udGggPSBuZXcgTnVtYmVyKHRoaXMuaXNNb250aFZhbGlkKGRhdGUpKTtcclxuICAgICAgICB2YXIgZGF5ID0gbmV3IE51bWJlcih0aGlzLmlzRGF5VmFsaWQoZGF0ZSkpO1xyXG5cclxuICAgICAgICByZXR1cm4gZGF5ICsgJyAnICsgdGhpcy5tb250aHNbbW9udGggLSAxXSArICcsICcgKyB5ZWFyO1xyXG4gICAgfVxyXG5cclxuICAgIHNlY29uZHNJbkRheXMoZGF5cykge1xyXG4gICAgICAgIGxldCB2YWx1ZSA9IE1hdGguZmxvb3IoZGF5cyAqIDI0ICogNjAgKiA2MCk7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIHNlY29uZHNJbkhvdXJzKGhvdXJzKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoaG91cnMgKiA2MCAqIDYwKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWNvbmRzSW5NaW51dGVzKG1pbnV0ZXMpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihtaW51dGVzICogNjApO1xyXG4gICAgfVxyXG5cclxuICAgIHNlY29uZHNUaWxsRGF0ZShkYXRlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2Vjb25kc0luRGF5cyhNYXRoLmZsb29yKHRoaXMuZGF0ZVZhbHVlKGRhdGUpKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2Vjb25kc1RpbGxUb2RheSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZWNvbmRzVGlsbERhdGUodGhpcy50b2RheSgpKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWNvbmRzVGlsbE5vdygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZWNvbmRzVGlsbERhdGUodGhpcy50b2RheSgpKSArIHRoaXMudGltZVRvZGF5KCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2Vjb25kc1RpbGxNb21lbnQobW9tZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2Vjb25kc1RpbGxEYXRlKHRoaXMuZGF0ZShtb21lbnQpKSArIHRoaXMuaXNUaW1lVmFsaWQodGhpcy50aW1lKG1vbWVudCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZyguLi5kYXRhKSB7XHJcbiAgICAgICAgbGV0IHRpbWUgPSBgWyR7dGhpcy50aW1lKCl9XTpgO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHRpbWUsIC4uLmRhdGEpO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBlcmlvZDsiLCJjb25zdCBKU0VsZW1lbnRzID0gcmVxdWlyZSgnLi9KU0VsZW1lbnRzJyk7XHJcblxyXG5jbGFzcyBFbXB0eSB7XHJcbn1cclxuXHJcbmNsYXNzIFRlbXBsYXRlIGV4dGVuZHMgSlNFbGVtZW50cyB7XHJcbiAgICBjb25zdHJ1Y3Rvcih0aGVXaW5kb3cgPSBFbXB0eSkge1xyXG4gICAgICAgIHN1cGVyKHRoZVdpbmRvdyk7XHJcbiAgICAgICAgdGhpcy52aXJ0dWFsID0ge307XHJcbiAgICAgICAgdGhpcy5lbGVtZW50TGlicmFyeSh0aGVXaW5kb3cuRWxlbWVudCk7XHJcbiAgICAgICAgdGhpcy5odG1sQ29sbGVjdGlvbkxpYnJhcnkodGhlV2luZG93LkhUTUxDb2xsZWN0aW9uKTtcclxuICAgICAgICB0aGlzLm5vZGVMaWJyYXJ5KHRoZVdpbmRvdy5Ob2RlKTtcclxuICAgICAgICB0aGlzLm5vZGVMaXN0TGlicmFyeSh0aGVXaW5kb3cuTm9kZUxpc3QpO1xyXG4gICAgfVxyXG5cclxuICAgIGVsZW1lbnRMaWJyYXJ5KEVsZW1lbnQgPSBFbXB0eSkge1xyXG4gICAgICAgIC8vRnJhbWV3b3JrIHdpdGgganNkb21cclxuICAgICAgICBsZXQgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuY2hhbmdlTm9kZU5hbWUgPSBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgICAgICAgICBsZXQgc3RydWN0dXJlID0gdGhpcy50b0pzb24oKTtcclxuICAgICAgICAgICAgc3RydWN0dXJlLmVsZW1lbnQgPSBuYW1lO1xyXG4gICAgICAgICAgICBsZXQgZWxlbWVudCA9IHNlbGYuY3JlYXRlRWxlbWVudChzdHJ1Y3R1cmUpO1xyXG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS50b0pzb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGxldCBlbGVtZW50ID0gdGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICBsZXQgYXR0cmlidXRlcyA9IHRoaXMuZ2V0QXR0cmlidXRlcygpO1xyXG4gICAgICAgICAgICBhdHRyaWJ1dGVzLnN0eWxlID0gdGhpcy5jc3MoKTtcclxuICAgICAgICAgICAgbGV0IGNoaWxkcmVuID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaCh0aGlzLmNoaWxkcmVuW2ldLnRvSnNvbigpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBlbGVtZW50LCBhdHRyaWJ1dGVzLCBjaGlsZHJlbiB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5zZXRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMgPSBbXSwgcGFyYW1zID0geyBzZWxlY3RlZDogJycgfSkge1xyXG4gICAgICAgICAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHBhcmFtcy5mbGFnKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbm5lckhUTUwgPSAnJztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvcHRpb25zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdGV4dCA9IG9wdGlvbnNbaV0udGV4dCB8fCBvcHRpb25zW2ldO1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gb3B0aW9uc1tpXS52YWx1ZSB8fCBvcHRpb25zW2ldO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvcHRpb24gPSB0aGlzLm1ha2VFbGVtZW50KHsgZWxlbWVudDogJ29wdGlvbicsIGF0dHJpYnV0ZXM6IHsgdmFsdWUgfSwgdGV4dCB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpID09ICdudWxsJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQocGFyYW1zLnNlbGVjdGVkKSAmJiB2YWx1ZSA9PSBwYXJhbXMuc2VsZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuY29tbW9uQW5jZXN0b3IgPSBmdW5jdGlvbiAoZWxlbWVudEEsIGVsZW1lbnRCKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGFuY2VzdG9yQSBvZiBlbGVtZW50QS5wYXJlbnRzKCkpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGFuY2VzdG9yQiBvZiBlbGVtZW50Qi5wYXJlbnRzKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5jZXN0b3JBID09IGFuY2VzdG9yQikgcmV0dXJuIGFuY2VzdG9yQTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5vbkFkZGVkID0gZnVuY3Rpb24gKGNhbGxiYWNrID0gKCkgPT4geyB9KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignRE9NTm9kZUluc2VydGVkSW50b0RvY3VtZW50JywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vU3RvcmUgdGhlIHN0YXRlcyBvZiBhbiBlbGVtZW50IGhlcmVcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5zdGF0ZXMgPSB7fTtcclxuXHJcbiAgICAgICAgLy9UaGlzIGlzIGEgdGVtcG9yYXJ5IHN0b3JhZ2UgZm9yIGVsZW1lbnRzIGF0dHJpYnV0ZXNcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS50ZW1wID0ge307XHJcblxyXG4gICAgICAgIC8vVGhpcyBsaXN0ZW5zIGFuZCBoYW5kbGVzIGZvciBtdWx0aXBsZSBidWJibGVkIGV2ZW50c1xyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLm1hbnlCdWJibGVkRXZlbnRzID0gZnVuY3Rpb24gKGV2ZW50cywgY2FsbGJhY2sgPSAoKSA9PiB7IH0pIHtcclxuICAgICAgICAgICAgZXZlbnRzID0gZXZlbnRzLnNwbGl0KCcsJyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGV2ZW50IG9mIGV2ZW50cykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWJibGVkRXZlbnQoZXZlbnQudHJpbSgpLCBjYWxsYmFjayk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVGhpcyBsaXN0ZW5zIGFuZCBoYW5kbGVzIGZvciBtdWx0aXBsZSBidWJibGVkIGV2ZW50cyB0aGF0IGRpZCBub3QgYnViYmxlXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUubWFueU5vdEJ1YmJsZWRFdmVudHMgPSBmdW5jdGlvbiAoZXZlbnRzLCBjYWxsYmFjayA9ICgpID0+IHsgfSkge1xyXG4gICAgICAgICAgICBldmVudHMgPSBldmVudHMuc3BsaXQoJywnKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgZXZlbnQgb2YgZXZlbnRzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vdEJ1YmJsZWRFdmVudChldmVudC50cmltKCksIGNhbGxiYWNrKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UaGlzIGhhbmRsZXMgYWxsIGV2ZW50cyB0aGF0IGFyZSBidWJibGVkIHdpdGhpbiBhbiBlbGVtZW50IGFuZCBpdCdzIGNoaWxkcmVuXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuYnViYmxlZEV2ZW50ID0gZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjayA9ICgpID0+IHsgfSkge1xyXG4gICAgICAgICAgICAvL0xpc3RlbiBmb3IgdGhpcyBldmVudCBvbiB0aGUgZW50aXJlIGRvY3VtZW50XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIC8vaWYgdGhlIGV2ZW50IGJ1YmJsZXMgdXAgdGhlIGVsZW1lbnQgZmlyZSB0aGUgY2FsbGJhY2tcclxuICAgICAgICAgICAgICAgIGlmIChldmVudC50YXJnZXQgPT0gdGhpcyB8fCB0aGlzLmlzQW5jZXN0b3IoZXZlbnQudGFyZ2V0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RoaXMgaGFuZGxlcyBhbGwgZXZlbnRzIHRoYXQgYXJlIG5vdCBidWJibGVkIHdpdGhpbiBhbiBlbGVtZW50IGFuZCBpdCdzIGNoaWxkcmVuXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUubm90QnViYmxlZEV2ZW50ID0gZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjayA9ICgpID0+IHsgfSkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIShldmVudC50YXJnZXQgPT0gdGhpcyB8fCB0aGlzLmlzQW5jZXN0b3IoZXZlbnQudGFyZ2V0KSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9MaXN0ZW4gdG8gbXVsdGlwbGUgZXZlbnRzIGF0IHRpbWUgd2l0aCBhIHNpbmdsZSBjYWxsYmFjayBmdW5jdGlvblxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmFkZE11bHRpcGxlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudHMsIGNhbGxiYWNrID0gKCkgPT4geyB9KSB7XHJcbiAgICAgICAgICAgIGV2ZW50cyA9IGV2ZW50cy5zcGxpdCgnLCcpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBldmVudCBvZiBldmVudHMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihldmVudC50cmltKCksIGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vcGVyZm9ybSBhY3Rpb25zIG9uIG1vdXNlZW50ZXIgYW5kIG1vdXNlbGVhdmVcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5ob3ZlciA9IGZ1bmN0aW9uIChwYXJhbXMgPSB7IGNzczoge30sIGRvOiAoKSA9PiB7IH0gfSkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGNzcyA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgY3NzVmFsdWVzO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRNdWx0aXBsZUV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjc3NWYWx1ZXMgPSB0aGlzLmNzcygpOy8vc3RvcmUgdGhlIGN1cnJlbnQgY3NzIHZhbHVlc1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQocGFyYW1zLmNzcykpIHsvL2lmIGFjdGlvbiBpcyB0byBjaGFuZ2UgdGhlIHN0eWxpbmdcclxuICAgICAgICAgICAgICAgICAgICBjc3MgPSBzZWxmLmFycmF5LmVhY2goT2JqZWN0LmtleXMocGFyYW1zLmNzcyksIHZhbHVlID0+IHsvL3N0b3JlIHRoZSBuZXcgY3NzIHN0eWxlIG5hbWVzIHRvIHJlbW92ZSBsYXRlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5jc3NTdHlsZU5hbWUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3NzKHBhcmFtcy5jc3MpOy8vc2V0IHRoZSBjc3Mgc3R5bGVzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc2Z1bmN0aW9uKHBhcmFtcy5kbykpIHsvLyBpZiBhY3Rpb24gaXMgdG8gcGVyZm9ybSBkb1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kbyhldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRNdWx0aXBsZUV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChwYXJhbXMuY3NzKSkgey8vaWYgYWN0aW9uIHdhcyB0byBjaGFuZ2UgdGhlIHN0eWxpbmdcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNzc1JlbW92ZShjc3MpOy8vcmVtb3ZlIHRoZSBuZXcgc3R5bGluZ1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3NzKGNzc1ZhbHVlcyk7Ly9zZXQgdGhlIG9sZCBvbmVzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vYSBzaG9ydGVyIG5hbWUgZm9yIHF1ZXJ5U2VsZWN0b3JcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKG5hbWUgPSAnJywgcG9zaXRpb24gPSAwKSB7XHJcbiAgICAgICAgICAgIGxldCBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQocG9zaXRpb24pKSB7Ly9nZXQgdGhlIGFsbCB0aGUgZWxlbWVudHMgZm91bmQgYW5kIHJldHVybiB0aGUgb25lIGF0IHRoaXMgcGFydGljdWxhciBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgdGhpcy5xdWVyeVNlbGVjdG9yQWxsKG5hbWUpLmZvckVhY2goKGUsIHApID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gcCkgZWxlbWVudCA9IGU7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IobmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9hIHNob3J0ZXIgbmFtZSBmb3IgcXVlcnlTZWxlY3RvckFsbFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmZpbmRBbGwgPSBmdW5jdGlvbiAobmFtZSA9ICcnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwobmFtZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL3BlcmZvcm0gYW4gZXh0ZW5kZWQgcXVlcnlTZWxlY3Rpb24gb24gdGhpcyBlbGVtZW50XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuc2VhcmNoID0gZnVuY3Rpb24gKG5hbWUgPSAnJywgb3B0aW9ucyA9IHsgYXR0cmlidXRlczoge30sIGlkOiAnJywgbm9kZU5hbWU6ICcnLCBjbGFzczogJycsIGNsYXNzZXM6ICcnIH0sIHBvc2l0aW9uID0gMCkge1xyXG4gICAgICAgICAgICBsZXQgZWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgIGxldCBmb3VuZEVsZW1lbnRzID0gW107Ly9hbGwgdGhlIGVsZW1lbnRzIG1lZXRpbmcgdGhlIHJlcXVpcmVtZW50c1xyXG5cclxuICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQob3B0aW9ucykpIHsvL2lmIHRoZSBvcHRpb25zIHRvIGNoZWNrIGlzIHNldFxyXG4gICAgICAgICAgICAgICAgbGV0IGFsbEVsZW1lbnRzID0gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKG5hbWUpOy8vZ2V0IGFsbCB0aGUgcG9zc2libGUgZWxlbWVudHNcclxuXHJcbiAgICAgICAgICAgICAgICAvL2xvb3AgdGhyb3VnaCB0aGVtIGFuZCBjaGVjayBpZiB0aGUgbWF0Y2ggdGhlIG9wdGlvbnNcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWxsRWxlbWVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gYWxsRWxlbWVudHNbaV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vY2hlY2sgZm9yIHRoZSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQob3B0aW9ucy5hdHRyaWJ1dGVzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRyIGluIG9wdGlvbnMuYXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgYWxsIHRoZSBhdHRyaWJ1dGVzIG9uZSBhZnRlciB0aGUgb3RoZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZShhdHRyKSAhPSBvcHRpb25zLmF0dHJpYnV0ZXNbYXR0cl0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2lmIHRoaXMgZWxlbWVudCBpcyBubyBsb25nIHZhbGlkIHNraXAgaXRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuaXNudWxsKGVsZW1lbnQpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vY2hlY2sgZm9yIHRoZSBJRFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KG9wdGlvbnMuaWQpICYmIG9wdGlvbnMuaWQgIT0gZWxlbWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL2NoZWNrIGZvciB0aGUgY2xhc3NcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChvcHRpb25zLmNsYXNzKSAmJiAhZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMob3B0aW9ucy5jbGFzcykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9jaGVjayBmb3IgdGhlIGNsYXNzZXNcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChvcHRpb25zLmNsYXNzZXMpICYmICFlbGVtZW50Lmhhc0NsYXNzZXMob3B0aW9ucy5jbGFzc2VzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL2NoZWNrIGZvciB0aGUgbm9kZW5hbWVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChvcHRpb25zLm5vZGVOYW1lKSAmJiBlbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgIT0gb3B0aW9ucy5ub2RlTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL2NoZWNrIGlmIHRvIHJldHVybiBmb3IgYSBwYXJ0aWN1bGFyIHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uIDw9IDApIHJldHVybiBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGZvdW5kRWxlbWVudHMucHVzaChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vZ2V0IHRoZSBlbGVtZW50IGF0IHRoZSBzcGVjaWZpZWQgcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIGlmIChmb3VuZEVsZW1lbnRzLmxlbmd0aCAmJiBzZWxmLmlzc2V0KGZvdW5kRWxlbWVudHNbcG9zaXRpb25dKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBmb3VuZEVsZW1lbnRzW3Bvc2l0aW9uXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuZmluZChuYW1lKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9wZXJmb3JtIHNlYXJjaCBmb3IgYWxsIHRoZSBlbGVtZW50cyB0aGF0IG1lZXQgYSByZXF1aXJlbWVudFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnNlYXJjaEFsbCA9IGZ1bmN0aW9uIChuYW1lID0gJycsIG9wdGlvbnMgPSB7IGF0dHJpYnV0ZXM6IHt9LCBpZDogJycsIG5vZGVOYW1lOiAnJywgY2xhc3M6ICcnLCBjbGFzc2VzOiAnJyB9KSB7XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KG9wdGlvbnMpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWxsRWxlbWVudHMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwobmFtZSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudHMgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWxsRWxlbWVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudCA9IGFsbEVsZW1lbnRzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KG9wdGlvbnMuYXR0cmlidXRlcykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgYXR0ciBpbiBvcHRpb25zLmF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZShhdHRyKSAhPSBvcHRpb25zLmF0dHJpYnV0ZXNbYXR0cl0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQob3B0aW9ucy5pZCkgJiYgb3B0aW9ucy5pZCAhPSBlbGVtZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KG9wdGlvbnMuY2xhc3MpICYmICFlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhvcHRpb25zLmNsYXNzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChvcHRpb25zLmNsYXNzZXMpICYmICFlbGVtZW50Lmhhc0NsYXNzZXMob3B0aW9ucy5jbGFzc2VzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChvcHRpb25zLm5vZGVOYW1lKSAmJiBlbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgIT0gb3B0aW9ucy5ub2RlTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXNlbGYuaXNudWxsKGVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwobmFtZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL2xvb2sgZm9yIG11bHRpcGxlIHNpbmdsZSBlbGVtZW50cyBhdCBhIHRpbWVcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uIChuYW1lcyA9IFtdLCBwb3NpdGlvbiA9IDApIHtcclxuICAgICAgICAgICAgbGV0IGVsZW1lbnRzID0ge307XHJcbiAgICAgICAgICAgIGZvciAobGV0IG5hbWUgb2YgbmFtZXMpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRzW25hbWVdID0gdGhpcy5maW5kKG5hbWUsIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9sb29rIGZvciBtdWx0aXBsZSBub2RlbGlzdHMgYXQgYSB0aW1lXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuZmV0Y2hBbGwgPSBmdW5jdGlvbiAobmFtZXMgPSBbXSkge1xyXG4gICAgICAgICAgICBsZXQgZWxlbWVudHMgPSB7fTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbmFtZSBvZiBuYW1lcykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudHNbbmFtZV0gPSB0aGlzLmZpbmRBbGwobmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50cztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vR2V0IHRoZSBub2RlcyBiZXR3ZWVuIHR3byBjaGlsZCBlbGVtZW50c1xyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLm5vZGVzQmV0d2VlbiA9IGZ1bmN0aW9uIChlbGVtZW50QSwgZWxlbWVudEIpIHtcclxuICAgICAgICAgICAgbGV0IGluQmV0d2Vlbk5vZGVzID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNoaWxkIG9mIEFycmF5LmZyb20odGhpcy5jaGlsZHJlbikpIHsvL2dldCBhbGwgdGhlIGNoaWxkcmVuXHJcbiAgICAgICAgICAgICAgICAvL2NoZWNrIGlmIHRoZSB0d28gZWxlbWVudHMgYXJlIGNoaWxkcmVuIG9mIHRoaXMgZWxlbWVudFxyXG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkID09IGVsZW1lbnRBIHx8IGNoaWxkID09IGVsZW1lbnRCIHx8IGNoaWxkLmlzQW5jZXN0b3IoZWxlbWVudEEpIHx8IGNoaWxkLmlzQW5jZXN0b3IoZWxlbWVudEIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5CZXR3ZWVuTm9kZXMucHVzaChjaGlsZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbkJldHdlZW5Ob2RlcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vR2V0IGlmIGVsZW1lbnQgaXMgY2hpbGQgb2YgYW4gZWxlbWVudFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmlzQW5jZXN0b3IgPSBmdW5jdGlvbiAoY2hpbGQpIHtcclxuICAgICAgICAgICAgbGV0IHBhcmVudHMgPSBjaGlsZC5wYXJlbnRzKCk7Ly9HZXQgYWxsIHRoZSBwYXJlbnRzIG9mIGNoaWxkXHJcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnRzLmluY2x1ZGVzKHRoaXMpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vR2V0IGFsbCB0aGUgcGFyZW50cyBvZiBhbiBlbGVtZW50IHVudGlsIGRvY3VtZW50XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUucGFyZW50cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbGV0IHBhcmVudHMgPSBbXTtcclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRQYXJlbnQgPSB0aGlzLnBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgIHdoaWxlIChjdXJyZW50UGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChjdXJyZW50UGFyZW50KTtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRQYXJlbnQgPSBjdXJyZW50UGFyZW50LnBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnRzO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmN1c3RvbVBhcmVudHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGxldCBwYXJlbnRzID0gdGhpcy5wYXJlbnRzKCk7XHJcbiAgICAgICAgICAgIGxldCBjdXN0b21QYXJlbnRzID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcmVudHNbaV0ubm9kZU5hbWUuaW5jbHVkZXMoJy0nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbVBhcmVudHMucHVzaChwYXJlbnRzW2ldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gY3VzdG9tUGFyZW50cztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vUmVtb3ZlIGEgc3RhdGUgZnJvbSBhbiBlbGVtZW50XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUucmVtb3ZlU3RhdGUgPSBmdW5jdGlvbiAocGFyYW1zID0geyBuYW1lOiAnJyB9KSB7XHJcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHRoaXMuZ2V0U3RhdGUocGFyYW1zKTsvL2dldCB0aGUgc3RhdGUgKGVsZW1lbnQpXHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHN0YXRlKSAmJiBzZWxmLmlzc2V0KHBhcmFtcy5mb3JjZSkpIHsvL2lmIHN0YXRlIGV4aXN0cyBhbmQgc2hvdWxkIGJlIGRlbGV0ZWRcclxuICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHN0YXRlLmRhdGFzZXQuZG9tS2V5KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzZWxmLnZpcnR1YWxbc3RhdGUuZGF0YXNldC5kb21LZXldOy8vZGVsZXRlIHRoZSBlbGVtZW50IGZyb20gdmlydHVhbCBkb21cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHN0YXRlLnJlbW92ZSgpOy8vcmVtb3ZlIHRoZSBlbGVtZW50IGZyb20gZG9tXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGUoYGRhdGEtJHtwYXJhbXMubmFtZX1gKTsvL3JlbW92ZSB0aGUgc3RhdGUgZnJvbSBlbGVtZW50XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0dldCBhbiBlbGVtZW50J3Mgc3RhdGUgXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuZ2V0U3RhdGUgPSBmdW5jdGlvbiAocGFyYW1zID0geyBuYW1lOiAnJyB9KSB7XHJcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IG51bGw7XHJcbiAgICAgICAgICAgIGxldCBzdGF0ZU5hbWU7XHJcblxyXG4gICAgICAgICAgICAvL2dldCB0aGUgc3RhdGUgbmFtZVxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtcyA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgc3RhdGVOYW1lID0gcGFyYW1zO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHNlbGYuaXNzZXQodGhpcy5kYXRhc2V0W2Ake3BhcmFtcy5uYW1lfWBdKSkge1xyXG4gICAgICAgICAgICAgICAgc3RhdGVOYW1lID0gcGFyYW1zLm5hbWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHN0YXRlTmFtZSkpIHsvL2dldCB0aGUgc3RhdGVcclxuICAgICAgICAgICAgICAgIHN0YXRlID0gc2VsZi52aXJ0dWFsW3RoaXMuZGF0YXNldFtzdGF0ZU5hbWVdXTtcclxuICAgICAgICAgICAgICAgIC8vIGxldCBzdGF0ZSA9IHNlbGYub2JqZWN0VG9BcnJheSh0aGlzLnN0YXRlc1tzdGF0ZU5hbWVdKS5wb3AoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vYWRkIGEgc3RhdGUgdG8gYW4gZWxlbWVudFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmFkZFN0YXRlID0gZnVuY3Rpb24gKHBhcmFtcyA9IHsgbmFtZTogJycgfSkge1xyXG4gICAgICAgICAgICAvL21ha2Ugc3VyZSB0aGUgc3RhdGUgaGFzIGEgZG9ta2V5XHJcbiAgICAgICAgICAgIGlmICghc2VsZi5pc3NldChwYXJhbXMuc3RhdGUuZGF0YXNldC5kb21LZXkpKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXMuc3RhdGUuc2V0S2V5KCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vYWRkIHRoZSBzdGF0ZSB0byB0aGUgZWxlbWVudHMgZGF0YXNldFxyXG4gICAgICAgICAgICB0aGlzLmRhdGFzZXRbcGFyYW1zLm5hbWVdID0gcGFyYW1zLnN0YXRlLmRhdGFzZXQuZG9tS2V5O1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlc1twYXJhbXMubmFtZV0gPSB7fS8vaW5pdGlhbGl6ZSB0aGUgc3RhdGVcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9zZXQgdGhlIHN0YXRlIG9mIGFuIGVsZW1lbnRcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uIChwYXJhbXMgPSB7IG5hbWU6ICcnLCBhdHRyaWJ1dGVzOiB7fSwgcmVuZGVyOiB7fSwgY2hpbGRyZW46IFtdLCB0ZXh0OiAnJywgaHRtbDogJycsIHZhbHVlOiAnJywgb3B0aW9uczogW10gfSkge1xyXG4gICAgICAgICAgICBsZXQgc3RhdGUgPSB0aGlzLmdldFN0YXRlKHBhcmFtcyk7XHJcblxyXG4gICAgICAgICAgICAvLyBsZXQgZm91bmQgPSB0aGlzLnN0YXRlc1twYXJhbXMubmFtZV1bSlNPTi5zdHJpbmdpZnkocGFyYW1zKV07XHJcbiAgICAgICAgICAgIC8vIGlmIChzZWxmLmlzc2V0KGZvdW5kKSkge1xyXG4gICAgICAgICAgICAvLyAgICAgc3RhdGUuaW5uZXJIVE1MID0gZm91bmQuaW5uZXJIVE1MO1xyXG4gICAgICAgICAgICAvLyAgICAgc3RhdGUuc2V0QXR0cmlidXRlcyhmb3VuZC5nZXRBdHRyaWJ1dGVzKCkpO1xyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIC8vIGVsc2Uge1xyXG4gICAgICAgICAgICAvLyAgICAgc3RhdGUuc2V0QXR0cmlidXRlcyhwYXJhbXMuYXR0cmlidXRlcyk7XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoc2VsZi5pc3NldChwYXJhbXMuY2hpbGRyZW4pKSB7Ly9hZGQgdGhlIGNoaWxkcmVuIGlmIHNldFxyXG4gICAgICAgICAgICAvLyAgICAgICAgIHN0YXRlLm1ha2VFbGVtZW50KHBhcmFtcy5jaGlsZHJlbik7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoc2VsZi5pc3NldChwYXJhbXMucmVuZGVyKSkgey8vYWRkIHRoZSBjaGlsZHJlbiBpZiBzZXRcclxuICAgICAgICAgICAgLy8gICAgICAgICBzdGF0ZS5yZW5kZXIocGFyYW1zLnJlbmRlcik7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoc2VsZi5pc3NldChwYXJhbXMudGV4dCkpIHN0YXRlLnRleHRDb250ZW50ID0gcGFyYW1zLnRleHQ7Ly9zZXQgdGhlIGlubmVyVGV4dFxyXG4gICAgICAgICAgICAvLyAgICAgaWYgKHNlbGYuaXNzZXQocGFyYW1zLnZhbHVlKSkgc3RhdGUudmFsdWUgPSBwYXJhbXMudmFsdWU7Ly9zZXQgdGhlIHZhbHVlXHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoc2VsZi5pc3NldChwYXJhbXMub3B0aW9ucykpIHsvL2FkZCBvcHRpb25zIGlmIGlzc2V0XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgZm9yICh2YXIgaSBvZiBwYXJhbXMub3B0aW9ucykge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBzdGF0ZS5tYWtlRWxlbWVudCh7IGVsZW1lbnQ6ICdvcHRpb24nLCB2YWx1ZTogaSwgdGV4dDogaSwgYXR0YWNobWVudDogJ2FwcGVuZCcgfSk7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gICAgIHRoaXMuc3RhdGVzW3BhcmFtcy5uYW1lXVtKU09OLnN0cmluZ2lmeShwYXJhbXMpXSA9IHN0YXRlLmNsb25lTm9kZSh0cnVlKTtcclxuICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgc3RhdGUuc2V0QXR0cmlidXRlcyhwYXJhbXMuYXR0cmlidXRlcyk7XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHBhcmFtcy5jaGlsZHJlbikpIHsvL2FkZCB0aGUgY2hpbGRyZW4gaWYgc2V0XHJcbiAgICAgICAgICAgICAgICBzdGF0ZS5tYWtlRWxlbWVudChwYXJhbXMuY2hpbGRyZW4pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHBhcmFtcy5yZW5kZXIpKSB7Ly9hZGQgdGhlIGNoaWxkcmVuIGlmIHNldFxyXG4gICAgICAgICAgICAgICAgc3RhdGUucmVuZGVyKHBhcmFtcy5yZW5kZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHBhcmFtcy50ZXh0KSkgc3RhdGUudGV4dENvbnRlbnQgPSBwYXJhbXMudGV4dDsvL3NldCB0aGUgaW5uZXJUZXh0XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHBhcmFtcy5odG1sKSkgc3RhdGUuaW5uZXJIVE1MID0gcGFyYW1zLmh0bWw7Ly9zZXQgdGhlIGlubmVyVGV4dFxyXG4gICAgICAgICAgICBpZiAoc2VsZi5pc3NldChwYXJhbXMudmFsdWUpKSBzdGF0ZS52YWx1ZSA9IHBhcmFtcy52YWx1ZTsvL3NldCB0aGUgdmFsdWVcclxuICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQocGFyYW1zLm9wdGlvbnMpKSB7Ly9hZGQgb3B0aW9ucyBpZiBpc3NldFxyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBvZiBwYXJhbXMub3B0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLm1ha2VFbGVtZW50KHsgZWxlbWVudDogJ29wdGlvbicsIHZhbHVlOiBpLCB0ZXh0OiBpLCBhdHRhY2htZW50OiAnYXBwZW5kJyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zdGF0ZXNbcGFyYW1zLm5hbWVdW0pTT04uc3RyaW5naWZ5KHBhcmFtcyldID0gc3RhdGUuY2xvbmVOb2RlKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vYXN5bmMgdmVyc2lvbiBvZiBzZXRzdGF0ZVxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnNldEtleUFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRLZXkoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL3NldCBlbGVtZW50J3MgZG9tIGtleSBmb3IgdGhlIHZpcnR1YWwgZG9tXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuc2V0S2V5ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBsZXQga2V5ID0gRGF0ZS5ub3coKS50b1N0cmluZygzNikgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKTsvL2dlbmVyYXRlIHRoZSBrZXlcclxuICAgICAgICAgICAgaWYgKCFzZWxmLmlzc2V0KHRoaXMuZGF0YXNldC5kb21LZXkpKSB7Ly9kb2VzIHRoaXMgZWxlbWVudCBoYXZlIGEga2V5XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFzZXQuZG9tS2V5ID0ga2V5O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAga2V5ID0gdGhpcy5kYXRhc2V0LmRvbUtleTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnZpcnR1YWxba2V5XSA9IHRoaXM7Ly9hZGQgaXQgdG8gdGhlIHZpcnR1YWwgZG9tXHJcbiAgICAgICAgICAgIHJldHVybiBrZXk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9kcm9wIGRvd24gYSBjaGlsZFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmRyb3BEb3duID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgbGV0IHBhcmVudENvbnRlbnQgPSB0aGlzLmNsb25lTm9kZSh0cnVlKTtcclxuICAgICAgICAgICAgdGhpcy5pbm5lckhUTUwgPSAnJztcclxuICAgICAgICAgICAgdGhpcy5hcHBlbmQocGFyZW50Q29udGVudCk7XHJcbiAgICAgICAgICAgIHBhcmVudENvbnRlbnQuY3NzKHsgYm94U2hhZG93OiAnMXB4IDFweCAxcHggMXB4ICNhYWFhYWEnIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmNzcyh7IGJveFNoYWRvdzogJzAuNXB4IDAuNXB4IDAuNXB4IDAuNXB4ICNjY2NjY2MnIH0pO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRyb3BDb250YWluZXIgPSB0aGlzLm1ha2VFbGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAnZHJvcC1kb3duJyB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBkcm9wQ29udGFpbmVyLmFwcGVuZChlbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRHJvcERvd24gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkcm9wQ29udGFpbmVyLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgcGFyZW50Q29udGVudC5jc3MoeyBib3hTaGFkb3c6ICd1bnNldCcgfSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlubmVySFRNTCA9IHBhcmVudENvbnRlbnQuaW5uZXJIVE1MO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL3N0b3AgbW9uaXRvcmluZyB0aGlzIGVsZW1lbnQgZm9yIGNoYW5nZXNcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5zdG9wTW9uaXRvciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMub2JzZXJ2ZSkgdGhpcy5vYnNlcnZlci5kaXNjb25uZWN0KCk7Ly9kaXNjb25uZWN0IG9ic2VydmVyXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9DaGVjayBpZiBhbiBhdHRyaWJ1dGUgaGFzIGNoYW5nZWQgaW4gdGhpcyBlbGVtZW50XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUub25BdHRyaWJ1dGVDaGFuZ2UgPSBmdW5jdGlvbiAoYXR0cmlidXRlID0gJycsIGNhbGxiYWNrID0gKCkgPT4geyB9KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignYXR0cmlidXRlc0NoYW5nZWQnLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuZGV0YWlsLmF0dHJpYnV0ZU5hbWUgPT0gYXR0cmlidXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1vbml0b3IgdGhpcyBlbGVtZW50IGZvciBjaGFuZ2VzXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUubW9uaXRvciA9IGZ1bmN0aW9uIChjb25maWcgPSB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9KSB7XHJcbiAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25MaXN0LCBvYnNlcnZlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG11dGF0aW9uTGlzdC5sZW5ndGgpIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ211dGF0ZWQnKSk7Ly9maXJlIG11dGF0ZWQgZXZlbnQgZm9yIGl0XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBtdXRhdGlvbiBvZiBtdXRhdGlvbkxpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobXV0YXRpb24udHlwZSA9PSAnY2hpbGRMaXN0Jykgey8vaWYgdGhlIGNoYW5nZSB3YXMgYSBjaGlsZCBmaXJlIGNoaWxkbGlzdGNoYW5nZWQgZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY2hpbGRMaXN0Y2hhbmdlZCcsIHsgZGV0YWlsOiBtdXRhdGlvbiB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKG11dGF0aW9uLnR5cGUgPT0gJ2F0dHJpYnV0ZXMnKSB7Ly9pZiB0aGUgY2hhbmdlIHdhcyBhIGNoaWxkIGZpcmUgY2hpbGRsaXN0Y2hhbmdlZCBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhdHRyaWJ1dGVzQ2hhbmdlZCcsIHsgZGV0YWlsOiBtdXRhdGlvbiB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKG11dGF0aW9uLnR5cGUgPT0gJ2NoYXJhY3RlckRhdGEnKSB7Ly9pZiB0aGUgY2hhbmdlIHdhcyBhIGNoaWxkIGZpcmUgY2hpbGRsaXN0Y2hhbmdlZCBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjaGFyYWN0ZXJEYXRhQ2hhbmdlZCcsIHsgZGV0YWlsOiBtdXRhdGlvbiB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzLCBjb25maWcpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlWydjaGVja0NoYW5nZXMnXSA9IGZ1bmN0aW9uIChjYWxsYmFjayA9ICgpID0+IHsgfSkge1xyXG4gICAgICAgICAgICB0aGlzLm1vbml0b3IoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdtdXRhdGVkJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBjaGVjayB3aGVuIHRoZSB2YWx1ZSBvZiBhbiBlbGVtZW50IGlzIGNoYW5nZWRcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5vbkNoYW5nZWQgPSBmdW5jdGlvbiAoY2FsbEJhY2sgPSAoKSA9PiB7IH0pIHtcclxuICAgICAgICAgICAgbGV0IHZhbHVlID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7XHJcbiAgICAgICAgICAgIGxldCB1cGRhdGVNZSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gaWYgZWxlbWVudCBpcyBpbnB1dCBlbGVtZW50XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0Lm5vZGVOYW1lID09ICdJTlBVVCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnR5cGUgPT0gJ2RhdGUnKSB7Ly8gaWYgdGhlIHR5cGUgaXMgZGF0ZSwgY2hlY2sgaWYgdGhlIGRhdGUgaXMgdmFsaWQgdGhlbiB1cGRhdGUgdGhlIGF0dHJpYnV0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RhdGUodGhpcy52YWx1ZSkpIHRoaXMuc2V0QXR0cmlidXRlKCd2YWx1ZScsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChldmVudC50YXJnZXQudHlwZSA9PSAndGltZScpIHsvLyBpZiB0aGUgdHlwZSBpcyB0aW1lLCBjaGVjayBpZiB0aGUgdGltZSBpcyB2YWxpZCB0aGVuIHVwZGF0ZSB0aGUgYXR0cmlidXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzVGltZVZhbGlkKHRoaXMudmFsdWUpKSB0aGlzLnNldEF0dHJpYnV0ZSgndmFsdWUnLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZXZlbnQudGFyZ2V0LnR5cGUgPT0gJ2ZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlTmFtZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGUgPSBldmVudC50YXJnZXQuZmlsZXNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlLnR5cGUuaW5kZXhPZignaW1hZ2UnKSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmltYWdlVG9Kc29uKGZpbGUsIGNhbGxCYWNrKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUoJ3ZhbHVlJywgdGhpcy52YWx1ZSk7Ly91cGRhdGUgdGhlIGF0dHJpYnV0ZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGV2ZW50LnRhcmdldC5ub2RlTmFtZSA9PSAnU0VMRUNUJykgey8vIGlmIHRoZSBlbGVtZW50IGlzIHNlbGVjdFxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZXZlbnQudGFyZ2V0Lm9wdGlvbnMubGVuZ3RoOyBpKyspIHsvL3VwZGF0ZSB0aGUgc2VsZWN0ZWQgb3B0aW9uIHVzaW5nIHRoZSBzZWxlY3RlZCBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PSBldmVudC50YXJnZXQuc2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0Lm9wdGlvbnNbaV0uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0Lm9wdGlvbnNbaV0ucmVtb3ZlQXR0cmlidXRlKCdzZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZXZlbnQudGFyZ2V0Lm5vZGVOYW1lID09ICdEQVRBLUVMRU1FTlQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUoJ3ZhbHVlJywgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChldmVudC50YXJnZXQubm9kZU5hbWUgPT0gJ1NFTEVDVC1FTEVNRU5UJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlKCd2YWx1ZScsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMudGV4dENvbnRlbnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQoY2FsbEJhY2spICYmIGV2ZW50LnRhcmdldC50eXBlICE9ICdmaWxlJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrKHRoaXMudmFsdWUsIGV2ZW50KTsvL2ZpcmUgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAvLyBpZiBjaGFuZ2UgaXMgY2F1c2VkIGJ5IGtleWJvYXJkXHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZU1lKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBpZiBjaGFuZ2UgaXMgY2F1c2VkIHByb2dyYW1hdGljYWxseVxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlTWUoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL3JlbmRlciB0aGUgY29udGVudHMgb2YgYW4gZWxlbWVudFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uIChwYXJhbXMgPSB7IGVsZW1lbnQ6ICcnLCBhdHRyaWJ1dGVzOiB7fSB9LCBleGNlcHQpIHtcclxuICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQoZXhjZXB0KSkgdGhpcy5yZW1vdmVDaGlsZHJlbihleGNlcHQpOy8vcmVtb3ZlIHRoZSBjb250ZW50cyBvZiB0aGUgZWxlbWVudCB3aXRoIGV4Y2VwdGlvbnNcclxuICAgICAgICAgICAgZWxzZSB0aGlzLnJlbW92ZUNoaWxkcmVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMubWFrZUVsZW1lbnQocGFyYW1zKTsvL2FwcGVuZCB0aGUgbmV3IGNvbnRlbnRzIG9mIHRoZSBlbGVtZW50XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0dldCBhbGwgdGhlIHN0eWxlcyBmb3IgdGhlIElELCB0aGUgY2xhc3NlcyBhbmQgdGhlIGVsZW1lbnRcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5nZXRBbGxDc3NQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBsZXQgc3R5bGVTaGVldHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnN0eWxlU2hlZXRzKSwvL2dldCBhbGwgdGhlIGNzcyBzdHlsZXMgZmlsZXMgYW5kIHJ1bGVzXHJcbiAgICAgICAgICAgICAgICBjc3NSdWxlcyxcclxuICAgICAgICAgICAgICAgIGlkID0gdGhpcy5pZCxcclxuICAgICAgICAgICAgICAgIG5vZGVOYW1lID0gdGhpcy5ub2RlTmFtZSxcclxuICAgICAgICAgICAgICAgIGNsYXNzTGlzdCA9IEFycmF5LmZyb20odGhpcy5jbGFzc0xpc3QpLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllcyA9IHt9LFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0b3JUZXh0O1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBjbGFzc0xpc3QpIGNsYXNzTGlzdFtpXSA9IGAuJHtjbGFzc0xpc3RbaV19YDsvL3R1cm4gZWFjaCBjbGFzcyB0byBjc3MgY2xhc3MgZm9ybWF0IFsuY2xhc3NdXHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0eWxlU2hlZXRzLmxlbmd0aDsgaSsrKSB7Ly9sb29wIHRocm91Z2ggYWxsIHRoZSBjc3MgcnVsZXMgaW4gZG9jdW1lbnQvYXBwXHJcbiAgICAgICAgICAgICAgICBjc3NSdWxlcyA9IHN0eWxlU2hlZXRzW2ldLmNzc1J1bGVzO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjc3NSdWxlcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yVGV4dCA9IGNzc1J1bGVzW2pdLnNlbGVjdG9yVGV4dDsgLy9mb3IgZWFjaCBzZWxlY3RvciB0ZXh0IGNoZWNrIGlmIGVsZW1lbnQgaGFzIGl0IGFzIGEgY3NzIHByb3BlcnR5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yVGV4dCA9PSBgIyR7aWR9YCB8fCBzZWxlY3RvclRleHQgPT0gbm9kZU5hbWUgfHwgY2xhc3NMaXN0LmluZGV4T2Yoc2VsZWN0b3JUZXh0KSAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzW3NlbGVjdG9yVGV4dF0gPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0eWxlID0gY3NzUnVsZXNbal0uc3R5bGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG4gaW4gc3R5bGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdHlsZVtuXSAhPT0gJycpIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzW3NlbGVjdG9yVGV4dF1bbl0gPSBzdHlsZVtuXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvL2lmIGVsZW1lbnQgaGFzIHByb3BlcnR5IGFkZCBpdCB0byBjc3MgcHJvcGVydHlcclxuICAgICAgICAgICAgcHJvcGVydGllc1snc3R5bGUnXSA9IHRoaXMuY3NzKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0aWVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9HZXQgdGhlIHZhbHVlcyBvZiBwcm9wZXJ0eSBcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5nZXRDc3NQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKHByb3BlcnR5ID0gJycpIHtcclxuICAgICAgICAgICAgbGV0IGFsbFByb3BlcnRpZXMgPSB0aGlzLmdldEFsbENzc1Byb3BlcnRpZXMoKTtcclxuICAgICAgICAgICAgbGV0IHByb3BlcnRpZXMgPSB7fTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBhbGxQcm9wZXJ0aWVzKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzW25hbWVdID0ge307XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBwIGluIGFsbFByb3BlcnRpZXNbbmFtZV0pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkgPT0gcCkgcHJvcGVydGllc1tuYW1lXVtwXSA9IGFsbFByb3BlcnRpZXNbbmFtZV1bcF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0aWVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBlbGVtZW50IGhhcyB0aGlzIHByb3BlcnR5XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuaGFzQ3NzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkgPSAnJykge1xyXG4gICAgICAgICAgICB2YXIgcHJvcGVydGllcyA9IHRoaXMuZ2V0Q3NzUHJvcGVydGllcyhwcm9wZXJ0eSk7IC8vZ2V0IGVsZW1lbnRzIGNzcyBwcm9wZXJ0aWVzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcHJvcGVydGllcykgey8vbG9vcCB0aHJvdWdoIGpzb24gb2JqZWN0XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChwcm9wZXJ0aWVzW2ldKSAmJiBwcm9wZXJ0aWVzW2ldICE9ICcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7Ly8gaWYgcHJvcGVydHkgaXMgZm91bmQgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0dldCB0aGUgbW9zdCByZWxhdmFudCB2YWx1ZSBmb3IgdGhlIHByb3BlcnR5XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuY3NzUHJvcGVydHlWYWx1ZSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSA9ICcnKSB7XHJcbiAgICAgICAgICAgIC8vY2hlY2sgZm9yIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IG9mIGFuIGVsZW1lbnRcclxuICAgICAgICAgICAgdmFyIHByb3BlcnRpZXMgPSB0aGlzLmdldENzc1Byb3BlcnRpZXMocHJvcGVydHkpLFxyXG4gICAgICAgICAgICAgICAgaWQgPSB0aGlzLmlkLFxyXG4gICAgICAgICAgICAgICAgY2xhc3NMaXN0ID0gQXJyYXkuZnJvbSh0aGlzLmNsYXNzTGlzdCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoc2VsZi5pc3NldChwcm9wZXJ0aWVzWydzdHlsZSddKSAmJiBwcm9wZXJ0aWVzWydzdHlsZSddICE9ICcnKSByZXR1cm4gcHJvcGVydGllc1snc3R5bGUnXTsvL2NoZWNrIGlmIHN0eWxlIHJ1bGUgaGFzIHRoZSBwcm9wZXJ0IGFuZCByZXR1cm4gaXQncyB2YWx1ZVxyXG4gICAgICAgICAgICBpZiAoc2VsZi5pc3NldChpZCkgJiYgc2VsZi5pc3NldChwcm9wZXJ0aWVzW2AjJHtpZH1gXSkgJiYgcHJvcGVydGllc1tgIyR7aWR9YF0gIT0gJycpIHJldHVybiBwcm9wZXJ0aWVzW2AjJHtpZH1gXTsvL2NoZWNrIGlmIGVsZW1lbnQgaWQgcnVsZSBoYXMgdGhlIHByb3BlcnQgYW5kIHJldHVybiBpdCdzIHZhbHVlXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgb2YgY2xhc3NMaXN0KSB7Ly9jaGVjayBpZiBhbnkgY2xhc3MgcnVsZSBoYXMgdGhlIHByb3BlcnQgYW5kIHJldHVybiBpdCdzIHZhbHVlXHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChwcm9wZXJ0aWVzW2AuJHtpfWBdKSAmJiBwcm9wZXJ0aWVzW2AuJHtpfWBdICE9ICcnKSByZXR1cm4gcHJvcGVydGllc1tgLiR7aX1gXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL2NoZWNrIGlmIG5vZGUgcnVsZSBoYXMgdGhlIHByb3BlcnQgYW5kIHJldHVybiBpdCdzIHZhbHVlXHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHByb3BlcnRpZXNbdGhpcy5ub2RlTmFtZV0pICYmIHByb3BlcnRpZXNbdGhpcy5ub2RlTmFtZV0gIT0gJycpIHJldHVybiBwcm9wZXJ0aWVzW3RoaXMubm9kZU5hbWVdO1xyXG4gICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHZXQgYW5kIFNldCB0aGUgY3NzIHZhbHVlc1xyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmNzcyA9IGZ1bmN0aW9uIChzdHlsZXMgPSB7fSkge1xyXG4gICAgICAgICAgICAvLyBzZXQgY3NzIHN0eWxlIG9mIGVsZW1lbnQgdXNpbmcganNvblxyXG4gICAgICAgICAgICBpZiAoc2VsZi5pc3NldChzdHlsZXMpKSB7XHJcbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhzdHlsZXMpLm1hcCgoa2V5KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZVtrZXldID0gc3R5bGVzW2tleV07XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZXh0cmFjdENTUyh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlbW92ZSBhIGNzcyBwcm9wZXJ0eVxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmNzc1JlbW92ZSA9IGZ1bmN0aW9uIChzdHlsZXMgPSBbXSkge1xyXG4gICAgICAgICAgICAvL3JlbW92ZSBhIGdyb3VwIG9mIHByb3BlcnRpZXMgZnJvbSBlbGVtZW50cyBzdHlsZVxyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzdHlsZXMpKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIG9mIHN0eWxlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkoaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KHN0eWxlcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3NzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUb2dnbGUgYSBjaGlsZCBlbGVtZW50XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUudG9nZ2xlQ2hpbGQgPSBmdW5jdGlvbiAoY2hpbGQpIHtcclxuICAgICAgICAgICAgLy9BZGQgY2hpbGQgaWYgZWxlbWVudCBkb2VzIG5vdCBoYXZlIGEgY2hpbGQgZWxzZSByZW1vdmUgdGhlIGNoaWxkIGZvcm0gdGhlIGVsZW1lbnRcclxuICAgICAgICAgICAgdmFyIG5hbWUsIF9jbGFzc2VzLCBpZCwgZm91bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coY2hpbGQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbi5mb3JFYWNoKG5vZGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgbmFtZSA9IG5vZGUubm9kZU5hbWU7XHJcbiAgICAgICAgICAgICAgICBfY2xhc3NlcyA9IG5vZGUuY2xhc3NMaXN0O1xyXG4gICAgICAgICAgICAgICAgaWQgPSBub2RlLmlkO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5hbWUgPT0gY2hpbGQubm9kZU5hbWUgJiYgaWQgPT0gY2hpbGQuaWQgJiYgX2NsYXNzZXMudG9TdHJpbmcoKSA9PSBjaGlsZC5jbGFzc0xpc3QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKCFmb3VuZCkgdGhpcy5hcHBlbmQoY2hpbGQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9yZW1vdmUgYWxsIGNsYXNzZXMgZXhjZXB0IHNvbWVcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5jbGVhckNsYXNzZXMgPSBmdW5jdGlvbiAoZXhjZXB0ID0gJycpIHtcclxuICAgICAgICAgICAgZXhjZXB0ID0gZXhjZXB0LnNwbGl0KCcsJyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGogaW4gZXhjZXB0KSB7XHJcbiAgICAgICAgICAgICAgICBleGNlcHRbal0gPSBleGNlcHRbal0udHJpbSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgb2YgdGhpcy5jbGFzc0xpc3QpIHtcclxuICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KGV4Y2VwdCkgJiYgZXhjZXB0LmluY2x1ZGVzKGkpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LnJlbW92ZShpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vcmVtb3ZlIGNsYXNzZXNcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5yZW1vdmVDbGFzc2VzID0gZnVuY3Rpb24gKGNsYXNzZXMgPSAnJykge1xyXG4gICAgICAgICAgICBjbGFzc2VzID0gY2xhc3Nlcy5zcGxpdCgnLCcpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpIG9mIGNsYXNzZXMpIHtcclxuICAgICAgICAgICAgICAgIGkgPSBpLnRyaW0oKTtcclxuICAgICAgICAgICAgICAgIGlmIChpICE9ICcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGFzc0xpc3QucmVtb3ZlKGkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9hZGQgY2xhc3Nlc1xyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmFkZENsYXNzZXMgPSBmdW5jdGlvbiAoY2xhc3NlcyA9ICcnKSB7XHJcbiAgICAgICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzLnNwbGl0KCcsJyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgb2YgY2xhc3Nlcykge1xyXG4gICAgICAgICAgICAgICAgaSA9IGkudHJpbSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgIT0gJycpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvL3RvZ2dsZSBjbGFzc2VzXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUudG9nZ2xlQ2xhc3NlcyA9IGZ1bmN0aW9uIChjbGFzc2VzID0gJycpIHtcclxuICAgICAgICAgICAgY2xhc3NlcyA9IGNsYXNzZXMuc3BsaXQoJywnKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSBvZiBjbGFzc2VzKSB7XHJcbiAgICAgICAgICAgICAgICBpID0gaS50cmltKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSAhPSAnJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LnRvZ2dsZShpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFJlbW92ZSBhIGNsYXNzIGZyb20gZWxlbWVudCBjbGFzc2xpc3RcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5yZW1vdmVDbGFzcyA9IGZ1bmN0aW9uIChfY2xhc3MgPSAnJykge1xyXG4gICAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoX2NsYXNzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDaGVjayBpZiBlbGVtZW50IGNsYXNzbGlzdCBjb250YWlucyBhIGdyb3VwIG9mIGNsYXNzZXNcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5oYXNDbGFzc2VzID0gZnVuY3Rpb24gKGNsYXNzTGlzdCA9IFtdKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG1DbGFzcyBvZiBjbGFzc0xpc3QpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jbGFzc0xpc3QuY29udGFpbnMobUNsYXNzKSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gYWRkIGEgY2xhc3MgdG8gZWxlbWVudCBjbGFzc2xpc3RcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5hZGRDbGFzcyA9IGZ1bmN0aW9uIChfY2xhc3MgPSAnJykge1xyXG4gICAgICAgICAgICB0aGlzLmNsYXNzTGlzdC5hZGQoX2NsYXNzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0b2dnbGUgYSBjbGFzcyBpbiBlbGVtZW50IGNsYXNzbGlzdFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnRvZ2dsZUNsYXNzID0gZnVuY3Rpb24gKF9jbGFzcyA9ICcnKSB7XHJcbiAgICAgICAgICAgIC8vICh0aGlzLmNsYXNzTGlzdC5jb250YWlucyhfY2xhc3MpKSA/IHRoaXMuY2xhc3NMaXN0LnJlbW92ZShfY2xhc3MpIDogdGhpcy5jbGFzc0xpc3QuYWRkKF9jbGFzcyk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LnRvZ2dsZShfY2xhc3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vR2V0IHRoZSBwb3NpdGlvbiBvZiBlbGVtZW50IGluIGRvbVxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnBvc2l0aW9uID0gZnVuY3Rpb24gKHBhcmFtcyA9IHt9KSB7XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHBhcmFtcykpIHtcclxuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHBhcmFtcykubWFwKGtleSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zW2tleV0gPSAobmV3IFN0cmluZyhwYXJhbXNba2V5XSkuc2xpY2UocGFyYW1zW2tleV0ubGVuZ3RoIC0gMikgPT0gJ3B4JykgPyBwYXJhbXNba2V5XSA6IGAke3BhcmFtc1trZXldfXB4YDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jc3MocGFyYW1zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb24gPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHBvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9jaGVjayBpZiBlbGVtZW50IGlzIHdpdGhpbiBjb250YWluZXJcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5pblZpZXcgPSBmdW5jdGlvbiAocGFyZW50SWRlbnRpZmllciA9ICcnKSB7XHJcbiAgICAgICAgICAgIGxldCBwYXJlbnQgPSB0aGlzLmdldFBhcmVudHMocGFyZW50SWRlbnRpZmllcik7XHJcbiAgICAgICAgICAgIGxldCB0b3AgPSB0aGlzLnBvc2l0aW9uKCkudG9wO1xyXG4gICAgICAgICAgICBsZXQgZmxhZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFzZWxmLmlzbnVsbChwYXJlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICBmbGFnID0gdG9wID49IDAgJiYgdG9wIDw9IHBhcmVudC5jbGllbnRIZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZsYWc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0NoZWNrIGlmIGEgY2xhc3MgZXhpc3RzIGluIGVsZW1lbnQncyBjbGFzc2xpc3RcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5oYXNDbGFzcyA9IGZ1bmN0aW9uIChfY2xhc3MgPSAnJykge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jbGFzc0xpc3QuY29udGFpbnMoX2NsYXNzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNldCBhIGxpc3Qgb2YgcHJvcGVydGllcyBmb3IgYW4gZWxlbWVudFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnNldFByb3BlcnRpZXMgPSBmdW5jdGlvbiAocHJvcGVydGllcyA9IHt9KSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gcHJvcGVydGllcykge1xyXG4gICAgICAgICAgICAgICAgdGhpc1tpXSA9IHByb3BlcnRpZXNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBTZXQgYSBsaXN0IG9mIGF0dHJpYnV0ZXMgZm9yIGFuIGVsZW1lbnRcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5zZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKGF0dHJpYnV0ZXMgPSB7fSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpIGluIGF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpID09ICdzdHlsZScpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNzcyhhdHRyaWJ1dGVzW2ldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlKGksIGF0dHJpYnV0ZXNbaV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gR2V0IHRoZSB2YWx1ZXMgb2YgYSBsaXN0IG9mIGF0dHJpYnV0ZXNcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5nZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKG5hbWVzID0gW10pIHtcclxuICAgICAgICAgICAgaWYgKG5hbWVzLmxlbmd0aCA9PSAwKSBuYW1lcyA9IHRoaXMuZ2V0QXR0cmlidXRlTmFtZXMoKTtcclxuICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZXMgPSB7fTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG5hbWUgb2YgbmFtZXMpIHtcclxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNbbmFtZV0gPSB0aGlzLmdldEF0dHJpYnV0ZShuYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYXR0cmlidXRlcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vQ3JlYXRlIGFuZCBhdHRhdGNoIGFuIGVsZW1lbnQgaW4gYW4gZWxlbWVudFxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLm1ha2VFbGVtZW50ID0gZnVuY3Rpb24gKHBhcmFtcyA9IHsgZWxlbWVudDogJycsIGF0dHJpYnV0ZXM6IHt9IH0pIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRLZXlBc3luYygpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGVsZW1lbnQgPSBzZWxmLmNyZWF0ZUVsZW1lbnQocGFyYW1zLCB0aGlzKTtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHZXQgYW4gZWxlbWVudHMgYW5jZXN0b3Igd2l0aCBhIHNwZWNpZmljIGF0dHJpYnV0ZVxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmdldFBhcmVudHMgPSBmdW5jdGlvbiAobmFtZSA9ICcnLCB2YWx1ZSA9ICcnKSB7XHJcbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGUgPSBuYW1lLnNsaWNlKDAsIDEpO1xyXG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlID09ICcuJykge1xyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHBhcmVudC5jbGFzc0xpc3QpICYmIHBhcmVudC5jbGFzc0xpc3QuY29udGFpbnMobmFtZS5zbGljZSgxKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGF0dHJpYnV0ZSA9PSAnIycpIHtcclxuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChwYXJlbnQuaWQpICYmIHBhcmVudC5pZCA9PSBuYW1lLnNsaWNlKDEpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5pc3NldChwYXJlbnQubm9kZU5hbWUpICYmIHBhcmVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09IG5hbWUudG9Mb3dlckNhc2UoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoc2VsZi5pc3NldChwYXJlbnQuaGFzQXR0cmlidXRlKSAmJiBwYXJlbnQuaGFzQXR0cmlidXRlKG5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzc2V0KHZhbHVlKSAmJiBwYXJlbnQuZ2V0QXR0cmlidXRlKG5hbWUpID09IHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcGFyZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVG9nZ2xlIHRoZSBkaXNwbGF5IG9mIGFuIGVsZW1lbnRcclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS50b2dnbGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnN0eWxlLmRpc3BsYXkgPT0gJ25vbmUnIHx8IHRoaXMuc3R5bGUudmlzaWJpbGl0eSA9PSAnaGlkZGVuJykgdGhpcy5zaG93KCk7XHJcbiAgICAgICAgICAgIGVsc2UgdGhpcy5oaWRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0hpZGUgYW4gZWxlbWVudCBpbiBkb21cclxuICAgICAgICBFbGVtZW50LnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAvLyBpZiAoc2VsZi5pc3NldCh0aGlzLnN0eWxlLmRpc3BsYXkpKSB0aGlzLnRlbXAuZGlzcGxheSA9IHRoaXMuc3R5bGUuZGlzcGxheTtcclxuICAgICAgICAgICAgLy8gaWYgKHNlbGYuaXNzZXQodGhpcy5zdHlsZS52aXNpYmlsaXR5KSkgdGhpcy50ZW1wLnZpc2liaWxpdHkgPSB0aGlzLnN0eWxlLnZpc2liaWxpdHk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vU2hvdyBhbiBlbGVtZW50IGluIGRvbVxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLnN0eWxlLmRpc3BsYXkgPT0gJ25vbmUnKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAvLyBpZiAoc2VsZi5pc3NldCh0aGlzLnRlbXAuZGlzcGxheSkpIHtcclxuICAgICAgICAgICAgLy8gICAgIC8vICAgICB0aGlzLmNzcyh7IGRpc3BsYXk6IHRoaXMudGVtcC5kaXNwbGF5IH0pO1xyXG4gICAgICAgICAgICAvLyAgICAgLy8gfVxyXG4gICAgICAgICAgICAvLyAgICAgLy8gZWxzZSB0aGlzLmNzc1JlbW92ZShbJ2Rpc3BsYXknXSk7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgdGhpcy5jc3NSZW1vdmUoWydkaXNwbGF5J10pO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vUmVtb3ZlIGFsbCB0aGUgY2hpbGRyZW4gb2YgYW4gZWxlbWVudCB3aXRoIGV4Y2VwdGlvbnMgb2Ygc29tZVxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnJlbW92ZUNoaWxkcmVuID0gZnVuY3Rpb24gKHBhcmFtcyA9IHsgZXhjZXB0OiBbXSB9KSB7XHJcbiAgICAgICAgICAgIGxldCBleGNlcHRpb25zID0gW107XHJcbiAgICAgICAgICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcclxuICAgICAgICAgICAgcGFyYW1zLmV4Y2VwdCA9IHBhcmFtcy5leGNlcHQgfHwgW107XHJcbiAgICAgICAgICAgIGxldCBleGNlcHQgPSBwYXJhbXMuZXhjZXB0O1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4Y2VwdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGFsbCA9IHRoaXMuZmluZEFsbChleGNlcHRbaV0pO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBhbGwubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4Y2VwdGlvbnMuaW5jbHVkZXMoYWxsW2pdKSkgZXhjZXB0aW9ucy5wdXNoKGFsbFtqXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChub2RlID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghZXhjZXB0aW9ucy5pbmNsdWRlcyhub2RlKSkgbm9kZS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vRGVsZXRlIGFuIGVsZW1lbnQgZnJvbSB0aGUgZG9tIGFuZCB2aXJ0dWFsIGRvbVxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHNlbGYuaXNzZXQodGhpcy5kYXRhc2V0LmRvbUtleSkpIHtcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBzZWxmLnZpcnR1YWxbdGhpcy5kYXRhc2V0LmRvbUtleV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vRGVsZXRlIGFuIGVsZW1lbnRzIGNoaWxkIGZyb20gdGhlIGRvbSBhbmQgdGhlIHZpcnR1YWwgZG9tXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuZGVsZXRlQ2hpbGQgPSBmdW5jdGlvbiAoY2hpbGQpIHtcclxuICAgICAgICAgICAgY2hpbGQuZGVsZXRlKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVG9nZ2xlIGEgbGlzdCBvZiBjaGlsZHJlbiBvZiBhbiBlbGVtZW50XHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUudG9nZ2xlQ2hpbGRyZW4gPSBmdW5jdGlvbiAocGFyYW1zID0geyBuYW1lOiAnJywgY2xhc3M6ICcnLCBpZDogJycgfSkge1xyXG4gICAgICAgICAgICBBcnJheS5mcm9tKHRoaXMuY2hpbGRyZW4pLmZvckVhY2gobm9kZSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoISgoc2VsZi5pc3NldChwYXJhbXMubmFtZSkgJiYgcGFyYW1zLm5hbWUgPT0gbm9kZS5ub2RlTmFtZSkgfHwgc2VsZi5pc3NldChwYXJhbXMuY2xhc3MpICYmIHNlbGYuaGFzQXJyYXlFbGVtZW50KEFycmF5LmZyb20obm9kZS5jbGFzc0xpc3QpLCBwYXJhbXMuY2xhc3Muc3BsaXQoJyAnKSkgfHwgKHNlbGYuaXNzZXQocGFyYW1zLmlkKSAmJiBwYXJhbXMuaWQgPT0gbm9kZS5pZCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS50b2dnbGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUudG9nZ2xlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQXR0YXRjaCBhbiBlbGVtZW50IHRvIGFub3RoZXIgZWxlbWVudCBbYXBwZW5kIG9yIHByZXBlbmRdXHJcbiAgICAgICAgRWxlbWVudC5wcm90b3R5cGUuYXR0YWNoRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50LCBhdHRhY2htZW50ID0gJ2FwcGVuZCcpIHtcclxuICAgICAgICAgICAgdGhpc1thdHRhY2htZW50XShlbGVtZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIEVsZW1lbnQucHJvdG90eXBlLnByZXNzZWQgPSBmdW5jdGlvbiAoY2FsbGJhY2sgPSAoKSA9PiB7IH0pIHtcclxuICAgICAgICAgICAgbGV0IHN0YXJ0VGltZSA9IDAsIGVuZFRpbWUgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmFkZE11bHRpcGxlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duLCB0b3VjaHN0YXJ0JywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgc3RhcnRUaW1lID0gZXZlbnQudGltZVN0YW1wO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkTXVsdGlwbGVFdmVudExpc3RlbmVyKCdtb3VzZXVwLCB0b3VjaGVuZCcsIGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGVuZFRpbWUgPSBldmVudC50aW1lU3RhbXA7XHJcbiAgICAgICAgICAgICAgICBldmVudC5kdXJhdGlvbiA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaHRtbENvbGxlY3Rpb25MaWJyYXJ5KEhUTUxDb2xsZWN0aW9uID0gRW1wdHkpIHtcclxuICAgICAgICBsZXQgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAgIEhUTUxDb2xsZWN0aW9uLnByb3RvdHlwZS5wb3BJbmRleCA9IGZ1bmN0aW9uIChwb3NpdGlvbiA9IDApIHtcclxuICAgICAgICAgICAgbGV0IGNvbGxlY3Rpb24gPSBzZWxmLmNyZWF0ZUVsZW1lbnQoeyBlbGVtZW50OiAnc2FtcGxlJyB9KS5jaGlsZHJlbjtcclxuXHJcbiAgICAgICAgICAgIGxldCBsaXN0ID0gQXJyYXkuZnJvbSh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gcG9zaXRpb24pIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbltpXSA9IHRoaXMuaXRlbShpKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNvbGxlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBIVE1MQ29sbGVjdGlvbi5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIChjYWxsYmFjayA9ICgpID0+IHsgfSkge1xyXG4gICAgICAgICAgICBsZXQgbGlzdCA9IEFycmF5LmZyb20odGhpcyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobGlzdFtpXSwgaSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEhUTUxDb2xsZWN0aW9uLnByb3RvdHlwZS5lYWNoID0gZnVuY3Rpb24gKGNhbGxiYWNrID0gKCkgPT4geyB9KSB7XHJcbiAgICAgICAgICAgIGxldCBsaXN0ID0gQXJyYXkuZnJvbSh0aGlzKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhsaXN0W2ldLCBpKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgSFRNTENvbGxlY3Rpb24ucHJvdG90eXBlWydpbmRleE9mJ10gPSBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBsZXQgbGlzdCA9IEFycmF5LmZyb20odGhpcyk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gbGlzdCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxpc3QgPT0gZWxlbWVudCkgcmV0dXJuIGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEhUTUxDb2xsZWN0aW9uLnByb3RvdHlwZVsnaW5jbHVkZXMnXSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluZGV4T2YoZWxlbWVudCkgIT0gLTE7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgSFRNTENvbGxlY3Rpb24ucHJvdG90eXBlWydub2Rlc0JldHdlZW4nXSA9IGZ1bmN0aW9uIChlbGVtZW50QSwgZWxlbWVudEIpIHtcclxuICAgICAgICAgICAgbGV0IGluQmV0d2Vlbk5vZGVzID0gW107XHJcbiAgICAgICAgICAgIGxldCBsaXN0ID0gQXJyYXkuZnJvbSh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGFQYXJlbnQgb2YgbGlzdCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGFQYXJlbnQgPT0gZWxlbWVudEEgfHwgYVBhcmVudCA9PSBlbGVtZW50QiB8fCBhUGFyZW50LmlzQW5jZXN0b3IoZWxlbWVudEEpIHx8IGFQYXJlbnQuaXNBbmNlc3RvcihlbGVtZW50QikpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbkJldHdlZW5Ob2Rlcy5wdXNoKGFQYXJlbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW5CZXR3ZWVuTm9kZXM7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBub2RlTGlicmFyeShOb2RlID0gRW1wdHkpIHtcclxuICAgICAgICBsZXQgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgICAgIE5vZGUucHJvdG90eXBlLnN0YXRlcyA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIG5vZGVMaXN0TGlicmFyeShOb2RlTGlzdCA9IEVtcHR5KSB7XHJcbiAgICAgICAgbGV0IHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICBOb2RlTGlzdC5wcm90b3R5cGVbJ2VhY2gnXSA9IGZ1bmN0aW9uIChjYWxsYmFjayA9ICgpID0+IHsgfSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRoaXNbaV0sIGkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIE5vZGVMaXN0LnByb3RvdHlwZVsnaW5kZXhPZiddID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiB0aGlzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpc1tpXSA9PSBlbGVtZW50KSByZXR1cm4gaTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgTm9kZUxpc3QucHJvdG90eXBlWydpbmNsdWRlcyddID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXhPZihlbGVtZW50KSAhPSAtMTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBOb2RlTGlzdC5wcm90b3R5cGVbJ25vZGVzQmV0d2VlbiddID0gZnVuY3Rpb24gKGVsZW1lbnRBLCBlbGVtZW50Qikge1xyXG4gICAgICAgICAgICBsZXQgaW5CZXR3ZWVuTm9kZXMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgYVBhcmVudCBvZiB0aGlzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYVBhcmVudCA9PSBlbGVtZW50QSB8fCBhUGFyZW50ID09IGVsZW1lbnRCIHx8IGFQYXJlbnQuaXNBbmNlc3RvcihlbGVtZW50QSkgfHwgYVBhcmVudC5pc0FuY2VzdG9yKGVsZW1lbnRCKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGluQmV0d2Vlbk5vZGVzLnB1c2goYVBhcmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbkJldHdlZW5Ob2RlcztcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlOyIsImNvbnN0IE1hdGhzTGlicmFyeSA9IHJlcXVpcmUoJy4vTWF0aHNMaWJyYXJ5Jyk7XHJcbmNvbnN0IE9iamVjdHNMaWJyYXJ5ID0gcmVxdWlyZSgnLi9PYmplY3RzTGlicmFyeScpO1xyXG5cclxubGV0IG1hdGhMaWJyYXJ5ID0gTWF0aHNMaWJyYXJ5KCk7XHJcbmxldCBvYmplY3RMaWJyYXJ5ID0gT2JqZWN0c0xpYnJhcnkoKTtcclxuXHJcbmZ1bmN0aW9uIEFuYWx5c2lzTGlicmFyeSgpIHtcclxuICAgIGxldCBzZWxmID0ge307XHJcblxyXG4gICAgc2VsZi5lbnRyb3B5ID0gKGRhdGEpID0+IHtcclxuICAgICAgICBsZXQgZW50cm9weSA9IDA7Ly9pbml0aWFsaXplIGVudHJvcHlcclxuICAgICAgICBsZXQgdmFsdWVzID0gT2JqZWN0LnZhbHVlcyhkYXRhKTsvL2dldCB0aGUgdmFsdWVzIG9mIHRoZSBvYmplY3QgdmFyaWFibGVcclxuICAgICAgICBsZXQgc3VtID0gbWF0aExpYnJhcnkuc3VtKHZhbHVlcyk7Ly9nZXQgdGhlIHN1bSBvZiB0aGUgVmFsdWVzXHJcbiAgICAgICAgZm9yIChsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XHJcbiAgICAgICAgICAgIGVudHJvcHkgLT0gdmFsdWUgLyBzdW0gKiBNYXRoLmxvZzIodmFsdWUgLyBzdW0pOyAvL3VzZSB0aGUgZm9ybXVsYXIgb24gZWFjaCBpdGVtXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBlbnRyb3B5O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuaW5mb3JtYXRpb25HYWluID0gKHRhcmdldE5vZGUsIHZhcmlhYmxlRGF0YSkgPT4ge1xyXG4gICAgICAgIGxldCBhcnJhbmdlRGF0YSA9IChsaXN0KSA9PiB7Ly9hcnJhbmdlIHRoZSBsaXN0IGludG8gYW4gb2JqZWN0IG9mIGNvdW50c1xyXG4gICAgICAgICAgICBsZXQgZGF0YSA9IHt9O1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpdGVtIG9mIGxpc3QpIHtcclxuICAgICAgICAgICAgICAgIGRhdGFbaXRlbV0gPSBkYXRhW2l0ZW1dIHx8IDA7XHJcbiAgICAgICAgICAgICAgICBkYXRhW2l0ZW1dKys7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCB0YXJnZXREYXRhID0gYXJyYW5nZURhdGEodGFyZ2V0Tm9kZSk7XHJcblxyXG4gICAgICAgIGxldCB0YXJnZXRFbnRyb3B5ID0gc2VsZi5lbnRyb3B5KHRhcmdldERhdGEpOy8vZ2V0IHRoZSBlbnRyb3B5IG9mIHRoZSB0YXJnZXQgbm9kZVxyXG4gICAgICAgIGxldCBzdW1PZkluZm9ybWF0aW9uID0gMDsvL2luaXRpYWxpemUgc3VtIG9mIGluZm9ybWF0aW9uIGdhaW5cclxuXHJcbiAgICAgICAgbGV0IHZhcmlhYmxlVmFsdWVzID0gT2JqZWN0LnZhbHVlcyh2YXJpYWJsZURhdGEpOy8vZ2V0IHRoZSB2YWx1ZXMgb2YgdGhpcyB2YXJpYWJsZVxyXG4gICAgICAgIGxldCB2YXJpYWJsZUxlbmd0aCA9IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmFyaWFibGVWYWx1ZXMubGVuZ3RoOyBpKyspIHsvL2dldCB0aGUgbGVuZ3RoIG9mIHRoZSB2YXJpYWJsZSBieSB0aGUgYWRkaW5nIHRoZSB2YWx1ZXNcclxuICAgICAgICAgICAgdmFyaWFibGVMZW5ndGggKz0gdmFyaWFibGVWYWx1ZXNbaV0ubGVuZ3RoO1xyXG4gICAgICAgICAgICB2YXJpYWJsZVZhbHVlc1tpXSA9IGFycmFuZ2VEYXRhKHZhcmlhYmxlVmFsdWVzW2ldKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHYgb2YgdmFyaWFibGVWYWx1ZXMpIHsvL2dldCB0aGUgZW50cm9weSBvZiBlYWNoIGFuZCBtdWx0aXBseSBieSB0aGUgcHJvYmFiaWxpdHlcclxuICAgICAgICAgICAgc3VtT2ZJbmZvcm1hdGlvbiArPSAobWF0aExpYnJhcnkuc3VtKE9iamVjdC52YWx1ZXModikpIC8gdmFyaWFibGVMZW5ndGgpICogc2VsZi5lbnRyb3B5KHYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGluZm9ybWF0aW9uR2FpbiA9IHRhcmdldEVudHJvcHkgLSBzdW1PZkluZm9ybWF0aW9uO1xyXG4gICAgICAgIHJldHVybiBpbmZvcm1hdGlvbkdhaW47XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5oaWdoZXN0SW5mb3JtYXRpb25HYWluTm9kZSA9IChkYXRhLCBub2RlcykgPT4ge1xyXG4gICAgICAgIGxldCBnYWluZWRJbmZvcm1hdGlvbiA9IHt9O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpIGluIG5vZGVzKSB7XHJcbiAgICAgICAgICAgIGdhaW5lZEluZm9ybWF0aW9uW2ldID0gc2VsZi5pbmZvcm1hdGlvbkdhaW4oZGF0YSwgbm9kZXNbaV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG9iamVjdExpYnJhcnkubWF4KGdhaW5lZEluZm9ybWF0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnF1YXJ0aWxlUmFuZ2UgPSAoZGF0YSkgPT4ge1xyXG5cclxuICAgICAgICBsZXQgbWlkZGxlID0gKF9kdCkgPT4gey8vZ2V0IHRoZSBtaWRkbGUgcG9zaXRpb24gb2YgYSBsaXN0IG9mIG51bWJlcnNcclxuICAgICAgICAgICAgbGV0IG1pZGRsZTtcclxuICAgICAgICAgICAgaWYgKChfZHQubGVuZ3RoKSAlIDIgPT0gMCkgey8vaWYgdGhlIGxpc3QgY291bnQgaXMgbm90IGV2ZW5cclxuICAgICAgICAgICAgICAgIG1pZGRsZSA9IFtNYXRoLmNlaWwoX2R0Lmxlbmd0aCAvIDIpIC0gMSwgTWF0aC5jZWlsKF9kdC5sZW5ndGggLyAyKV07Ly9nZXQgdGhlIHR3byBpbiB0aGUgbWlkZGxlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBtaWRkbGUgPSBbTWF0aC5jZWlsKF9kdC5sZW5ndGggLyAyKSAtIDFdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbWlkZGxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGdldE1pZGRsZSA9IChfZHQpID0+IHsvLyBnZXQgdGhlIGl0ZW1zIGluIHRoZSBtaWRkbGUgb2YgYSBsaXN0XHJcbiAgICAgICAgICAgIGxldCBbbWlkZGxlMSwgbWlkZGxlMl0gPSBtaWRkbGUoX2R0KTtcclxuICAgICAgICAgICAgbGV0IG1pZGRsZXMgPSBbXTtcclxuICAgICAgICAgICAgbWlkZGxlcy5wdXNoKF9kdFttaWRkbGUxXSk7XHJcbiAgICAgICAgICAgIGlmIChtaWRkbGUyICE9IHVuZGVmaW5lZCkgbWlkZGxlcy5wdXNoKF9kdFttaWRkbGUyXSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbWlkZGxlcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBoYWxmcyA9IChfZHQpID0+IHsvL2RpdmlkZSBhIGxpc3QgaW50byB0d28gZXF1YWwgaGFsZnNcclxuICAgICAgICAgICAgbGV0IFttaWRkbGUxLCBtaWRkbGUyXSA9IG1pZGRsZShfZHQpO1xyXG4gICAgICAgICAgICBpZiAobWlkZGxlMiA9PSB1bmRlZmluZWQpIG1pZGRsZTIgPSBtaWRkbGUxO1xyXG4gICAgICAgICAgICBsZXQgaGFsZjEgPSBfZHQuc2xpY2UoMCwgbWlkZGxlMSk7XHJcbiAgICAgICAgICAgIGxldCBoYWxmMiA9IF9kdC5zbGljZShtaWRkbGUyICsgMSk7XHJcbiAgICAgICAgICAgIHJldHVybiBbaGFsZjEsIGhhbGYyXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBsYXllcnMgPSBoYWxmcyhkYXRhKTsvL2dldCB0aGUgaGFsZnMgb2YgdGhlIGxpc3RcclxuICAgICAgICBsZXQgW2xheWVyMSwgbGF5ZXIyXSA9IGhhbGZzKGxheWVyc1swXSk7Ly9kaXZpZGUgZWFjaCBoYWxmIGludG8gaGFsZnNcclxuICAgICAgICBsZXQgW2xheWVyMywgbGF5ZXI0XSA9IGhhbGZzKGxheWVyc1sxXSk7XHJcblxyXG4gICAgICAgIGxldCBtaWRkbGUxID0gZ2V0TWlkZGxlKGxheWVyc1swXSk7Ly9nZXQgdGhlIG1pZGRsZSBvZiB0aGUgZmlyc3QgbGF5ZXJzXHJcbiAgICAgICAgbGV0IG1pZGRsZTMgPSBnZXRNaWRkbGUobGF5ZXJzWzFdKTtcclxuXHJcbiAgICAgICAgbGV0IHExID0gbWF0aExpYnJhcnkubWVkaWFuKG1pZGRsZTEpOy8vZ2V0IHRoZSBtZWRpYW4gb2YgdGhlIGZpcnN0IGFuZCBsYXN0IGxheWVyc1xyXG4gICAgICAgIGxldCBxMyA9IG1hdGhMaWJyYXJ5Lm1lZGlhbihtaWRkbGUzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHEzIC0gcTE7Ly9maW5kIHRoZSByYW5nZVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGYubm9ybWFsaXplRGF0YSA9IChkYXRhKSA9PiB7XHJcbiAgICAgICAgZGF0YS5zb3J0KChhLCBiKSA9PiB7IHJldHVybiBhIC0gYiB9KTtcclxuICAgICAgICB2YXIgbWF4ID0gZGF0YVtkYXRhLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIHZhciBtaW4gPSBkYXRhWzBdO1xyXG4gICAgICAgIHZhciBub3JtYWxpemVkID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIG5vcm1hbGl6ZWQucHVzaCgoZGF0YVtpXSAtIG1pbikgLyAobWF4IC0gbWluKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBub3JtYWxpemVkO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzZWxmO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFuYWx5c2lzTGlicmFyeTsiLCJmdW5jdGlvbiBBcnJheUxpYnJhcnkoKSB7XHJcbiAgICBsZXQgc2VsZiA9IHt9O1xyXG5cclxuICAgIHNlbGYuY29tYmluZSA9IChoYXlzdGFjaywgZmlyc3QsIHNlY29uZCwgcG9zKSA9PiB7Ly91c2VkIHRvIGdldCB3aGF0IGlzIGJldHdlZW4gdHdvIGl0ZW1zIGF0IGEgcGFydGljdWxhciBvY2N1cnJhbmNlIGluIGFuIEFycmF5IGFuZCB0aGUgaXRlbXMgY29tYmluZWRcclxuICAgICAgICBwb3MgPSBwb3MgfHwgMDsvL2luaXRpYWxpemUgcG9zaXRpb24gaWYgbm90IHNldFxyXG4gICAgICAgIGxldCBhdDEgPSBwb3MsXHJcbiAgICAgICAgICAgIGF0MiA9IGZpcnN0ID09PSBzZWNvbmQgPyBwb3MgKyAxIDogcG9zOyAvL2NoZWNrIGlmIGl0IGlzIHRoZSBzYW1lIGFuZCBjaGFuZ2UgcG9zaXRpb25cclxuICAgICAgICBsZXQgc3RhcnQgPSBzZWxmLmluZGV4QXQoaGF5c3RhY2ssIGZpcnN0LCBhdDEpOy8vZ2V0IHRoZSBzdGFydFxyXG4gICAgICAgIGxldCBlbmQgPSBzZWxmLmluZGV4QXQoaGF5c3RhY2ssIHNlY29uZCwgYXQyKSArIDE7Ly9nZXQgdGhlIGVuZFxyXG5cclxuICAgICAgICBpZiAoc3RhcnQgPT0gLTEgfHwgZW5kID09IDApIHsvL251bGwgaWYgb25lIGlzIG5vdCBmb3VuZFxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBoYXlzdGFjay5zbGljZShzdGFydCwgZW5kKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmluQmV0d2VlbiA9IChoYXlzdGFjaywgZmlyc3QsIHNlY29uZCwgcG9zKSA9PiB7Ly91c2VkIHRvIGdldCB3aGF0IGlzIGJldHdlZW4gdHdvIGl0ZW1zIGF0IGEgcGFydGljdWxhciBvY2N1cnJhbmNlIGluIGFuIEFycmF5XHJcbiAgICAgICAgcG9zID0gcG9zIHx8IDA7Ly9pbml0aWFsaXplIHBvc2l0aW9uIGlmIG5vdCBzZXRcclxuICAgICAgICBsZXQgYXQxID0gcG9zLFxyXG4gICAgICAgICAgICBhdDIgPSBmaXJzdCA9PT0gc2Vjb25kID8gcG9zICsgMSA6IHBvczsgLy9jaGVjayBpZiBpdCBpcyB0aGUgc2FtZSBhbmQgY2hhbmdlIHBvc2l0aW9uXHJcbiAgICAgICAgbGV0IHN0YXJ0ID0gc2VsZi5pbmRleEF0KGhheXN0YWNrLCBmaXJzdCwgYXQxKSArIDE7Ly9nZXQgdGhlIHN0YXJ0XHJcbiAgICAgICAgbGV0IGVuZCA9IHNlbGYuaW5kZXhBdChoYXlzdGFjaywgc2Vjb25kLCBhdDIpOy8vZ2V0IHRoZSBlbmRcclxuXHJcbiAgICAgICAgaWYgKHN0YXJ0ID09IDAgfHwgZW5kID09IC0xKSB7Ly9udWxsIGlmIG9uZSBpcyBub3QgZm91bmRcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaGF5c3RhY2suc2xpY2Uoc3RhcnQsIGVuZCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5jb250YWlucyA9IChoYXlzdGFjaywgbmVlZGxlKSA9PiB7Ly91c2VkIHRvIGNoZWNrIGlmIGFuIEFycmF5IGhhcyBhbiBpdGVtXHJcbiAgICAgICAgbGV0IGZsYWcgPSBmYWxzZTsvL3NldCBmbGFnIHRvIGZhbHNlXHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBoYXlzdGFjaykge1xyXG4gICAgICAgICAgICBpZiAoaGF5c3RhY2tbaV0gPT0gbmVlZGxlKSB7Ly9pZiBmb3VuZCBicmVha291dFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZsYWc7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5pbmRleEF0ID0gKGhheXN0YWNrLCBuZWVkbGUsIHBvcykgPT4gey8vdXNlZCB0byBnZXQgdGhlIGluZGV4IG9mIGFuIGl0ZW0gYXQgYSBwYXJ0aWN1bGFyIG9jY3VycmFuY2VcclxuICAgICAgICBwb3MgPSBwb3MgfHwgMDtcclxuICAgICAgICBsZXQgY291bnQgPSAtMTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGhheXN0YWNrLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChoYXlzdGFja1tpXSA9PSBuZWVkbGUpIHtcclxuICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvdW50ID09IHBvcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5maW5kID0gKGhheXN0YWNrLCBjYWxsYmFjaykgPT4gey8vdXNlZCBhcyBhIGhpZ2hlciBvcmRlciBmdW5jdGlvbiB0byBnZXQgYW4gaXRlbXMgdGhhdCBtYXRjaCB0aGUgY29uZGl0aW9uc1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gaGF5c3RhY2spIHtcclxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKGhheXN0YWNrW2ldKSA9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaGF5c3RhY2tbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5maW5kQWxsID0gKGhheXN0YWNrLCBjYWxsYmFjaykgPT4gey8vdXNlZCBhcyBhIGhpZ2hlciBvcmRlciBmdW5jdGlvbiB0byBnZXQgYWxsIHRoZSBpdGVtcyB0aGF0IG1hdGNoIHRoZSBjb25kaXRpb25zXHJcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gaGF5c3RhY2spIHtcclxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKGhheXN0YWNrW2ldKSA9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZXMucHVzaChoYXlzdGFja1tpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRPYmplY3QgPSAoaGF5c3RhY2ssIGtleSwgdmFsdWUpID0+IHsvL3VzZWQgdG8gZ2V0IGFuIE9iamVjdCB3aXRoIGFuIEl0ZW0gaW4gYSBKc29uQXJyYXlcclxuICAgICAgICBsZXQgb2JqZWN0O1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gaGF5c3RhY2spIHtcclxuICAgICAgICAgICAgaWYgKGhheXN0YWNrW2ldW2tleV0gPT0gdmFsdWUpIG9iamVjdCA9IGhheXN0YWNrW2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gb2JqZWN0O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZ2V0QWxsT2JqZWN0cyA9IChoYXlzdGFjaywga2V5LCB2YWx1ZSkgPT4gey8vdXNlZCB0byBnZXQgYWxsIG9jY3VycmFuY2VzIG9mIGFuIE9iamVjdCB3aXRoIGFuIEl0ZW0gaW4gYSBKc29uQXJyYXlcclxuICAgICAgICBsZXQgbmV3QXJyYXkgPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpIGluIGhheXN0YWNrKSB7XHJcbiAgICAgICAgICAgIGlmIChoYXlzdGFja1tpXVtrZXldID09IHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdBcnJheS5wdXNoKGhheXN0YWNrW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRBbGwgPSAoaGF5c3RhY2ssIG5lZWRsZSkgPT4gey8vdXNlZCB0byBhbGwgb2NjdXJyYW5jZXMgb2YgYW4gaXRlbSBpbiBhbiBBcnJheVxyXG4gICAgICAgIGxldCBuZXdBcnJheSA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gaGF5c3RhY2spIHtcclxuICAgICAgICAgICAgaWYgKGhheXN0YWNrW2ldID09IG5lZWRsZSkgbmV3QXJyYXkucHVzaChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYucmVtb3ZlQWxsID0gKGhheXN0YWNrLCBuZWVkbGUpID0+IHsvL3VzZWQgdG8gcmVtb3ZlIGluc3RhbmNlcyBvZiBhbiBpdGVtXHJcbiAgICAgICAgbGV0IG5ld0FycmF5ID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSBvZiBoYXlzdGFjaykge1xyXG4gICAgICAgICAgICBpZiAoaSAhPSBuZWVkbGUpIHtcclxuICAgICAgICAgICAgICAgIG5ld0FycmF5LnB1c2goaSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYucHV0QXQgPSAoaGF5c3RhY2sgPSBbXSwgdmFsdWUsIGtleSA9IDApID0+IHsvL3VzZWQgdG8gcHVzaCBhbiBpdGVtIGludG8gYW4gaW5kZXggaW4gQXJyYXlcclxuICAgICAgICBsZXQgbmV3QXJyYXkgPSBbXTsvL3N0b3JhZ2VcclxuICAgICAgICBmb3IgKGxldCBpIGluIGhheXN0YWNrKSB7XHJcbiAgICAgICAgICAgIGlmIChpID09IGtleSkgey8vbWF0Y2hlZFxyXG4gICAgICAgICAgICAgICAgbmV3QXJyYXlbaV0gPSB2YWx1ZTsvL3B1c2ggaW4gdGhlIHZhbHVlXHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dCA9IE1hdGguZmxvb3Ioa2V5KTsvL2NoZWNrIGlmIGl0J3MgYSBudW1iZXJcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4obmV4dCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0ID0ga2V5ICsgMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG5ld0FycmF5W25leHRdID0gaGF5c3RhY2tbaV07Ly9hZGQgdGhlIHByZXZpb3VzIHZhbHVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBuZXdBcnJheVtpXSA9IGhheXN0YWNrW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5wdXNoQXJyYXkgPSAoaGF5c3RhY2sgPSBbXSwgbmVlZGxlLCBpbnNlcnQpID0+IHsvL3VzZWQgdG8gcHVzaCBpbiBhbiBpdGVtIGJlZm9yZSBhbm90aGVyIGV4aXN0aW5nIGl0ZW0gaW4gYW4gQXJyYXlcclxuICAgICAgICBsZXQgcG9zaXRpb24gPSBzZWxmLmFycmF5SW5kZXgoaGF5c3RhY2ssIG5lZWRsZSk7Ly9nZXQgdGhlIGV4aXN0aW5nIGl0ZW0gcG9zaXRpb25cclxuICAgICAgICBsZXQgbmV3QXJyYXkgPSBzZWxmLnB1dEF0KGhheXN0YWNrLCBpbnNlcnQsIHBvc2l0aW9uKTsvL3B1c2ggaW4gbmV3IGl0ZW1cclxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5hcnJheUluZGV4ID0gKGhheXN0YWNrID0gW10sIG5lZWRsZSA9IFtdKSA9PiB7Ly91c2VkIHRvIGdldCBwb3NpdGlvbiBvZiBhbiBpdGVtIGluIGFuIEFycmF5XHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBoYXlzdGFjaykge1xyXG4gICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoaGF5c3RhY2tbaV0pID09IEpTT04uc3RyaW5naWZ5KG5lZWRsZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmhhc0FycmF5ID0gKGhheXN0YWNrID0gW10sIG5lZWRsZSA9IFtdKSA9PiB7Ly91c2VkIHRvIGNoZWNrIGlmIGFuIEFycmF5IGlzIGEgc3ViLUFycmF5IHRvIGFub3RoZXIgQXJyYXlcclxuICAgICAgICBoYXlzdGFjayA9IEpTT04uc3RyaW5naWZ5KGhheXN0YWNrKTtcclxuICAgICAgICBuZWVkbGUgPSBKU09OLnN0cmluZ2lmeShuZWVkbGUpO1xyXG5cclxuICAgICAgICByZXR1cm4gaGF5c3RhY2suaW5kZXhPZihuZWVkbGUpICE9IC0xO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYudG9PYmplY3QgPSAoYXJyYXkgPSBbXSwga2V5KSA9PiB7Ly91c2VkIHRvIHR1cm4gYW4gSnNvbkFycmF5IHRvIGFuIE9iamVjdCBsaXRlcmFsXHJcbiAgICAgICAgbGV0IG9iamVjdCA9IHt9Oy8vc3RvcmFnZVxyXG4gICAgICAgIGZvciAobGV0IGkgaW4gYXJyYXkpIHtcclxuICAgICAgICAgICAgb2JqZWN0W2FycmF5W2ldW2tleV1dID0gYXJyYXlbaV07Ly9zdG9yZSB0aGUgaW50ZW5kZWQgW2tleSwgdmFsdWVdXHJcbiAgICAgICAgICAgIGRlbGV0ZSBvYmplY3RbYXJyYXlbaV1ba2V5XV1ba2V5XTsvL3JlbW92ZSB0aGUga2V5IGluIHRoZSB2YWx1ZVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gb2JqZWN0O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYucmVzaGFwZSA9IChwYXJhbXMpID0+IHsvL3VzZWQgdG8gY2hhbmdlIHRoZSBzaGFwZSBvZiBhbiBBcnJheVxyXG4gICAgICAgIC8vIFBlbmRpbmdcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnJhbmRvbVBpY2sgPSAoYXJyYXkpID0+IHsvL3VzZWQgdG8gcGljayBhIHJhbmRvbSBpdGVtIGZyb20gYW4gQXJyYXlcclxuICAgICAgICByZXR1cm4gYXJyYXlbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyYXkubGVuZ3RoKV07XHJcbiAgICB9O1xyXG5cclxuICAgIHNlbGYucmVtb3ZlRW1wdHkgPSAoYXJyYXkgPSBbXSkgPT4gey8vdXNlZCB0byB0cnVuY2F0ZSBhbiBBcnJheVxyXG4gICAgICAgIGxldCBuZXdBcnJheSA9IFtdOy8vc3RvcmFnZVxyXG4gICAgICAgIGZvciAobGV0IGkgaW4gYXJyYXkpIHtcclxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYXJyYXlbaV0pICYmIGFycmF5W2ldLmxlbmd0aCA+IDApIHsvL2lmIGFycmF5IGdvIGRlZXBcclxuICAgICAgICAgICAgICAgIG5ld0FycmF5LnB1c2goc2VsZi5yZW1vdmVFbXB0eShhcnJheVtpXSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGFycmF5W2ldICE9IHVuZGVmaW5lZCAmJiBhcnJheVtpXSAhPSBudWxsICYmIGFycmF5W2ldICE9IDAgJiYgYXJyYXlbaV0gIT0gJycpIHsvL3NraXAgW3VuZGVmaW5lZCwgbnVsbCwgMCwgJyddXHJcbiAgICAgICAgICAgICAgICBuZXdBcnJheS5wdXNoKGFycmF5W2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5lYWNoID0gKGFycmF5ID0gW10sIGNhbGxiYWNrID0gKCkgPT4geyB9KSA9PiB7Ly91c2VkIGFzIGEgaGlnaGVyIG9yZGVyIEFycmF5IGZ1bmN0aW9uXHJcbiAgICAgICAgbGV0IG5ld0FycmF5ID0gW107Ly9zdG9yYWdlXHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBhcnJheSkge1xyXG4gICAgICAgICAgICBuZXdBcnJheS5wdXNoKGNhbGxiYWNrKGFycmF5W2ldLCBpKSk7Ly9tYWtlIGNoYW5nZXMgdG8gdGhlIGl0ZW0gYW5kIHN0b3JlIGl0LlxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5oYXNBcnJheUVsZW1lbnQgPSAoaGF5c3RhY2sgPSBbXSwgbmVlZGxlID0gW10pID0+IHsvL3VzZWQgdG8gY2hlY2sgaWYgdHdvIGFycmF5cyBoYXMgYW4gaXRlbSBpbiBjb21tb25cclxuICAgICAgICBsZXQgZmxhZyA9IGZhbHNlO1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gbmVlZGxlKSB7XHJcbiAgICAgICAgICAgIGlmIChoYXlzdGFjay5pbmRleE9mKG5lZWRsZVtpXSkgIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmbGFnO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYudG9TZXQgPSAoaGF5c3RhY2sgPSBbXSkgPT4gey8vdXNlZCB0byB0dXJuIGFuIEFycmF5IGludG8gYSBzZXQoTWFrZSBzdXJlIHRoZXJlIGEgbm8gZHVwbGljYXRlcylcclxuICAgICAgICBsZXQgc2luZ2xlID0gW107Ly9zdG9yYWdlXHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBoYXlzdGFjaykgey8vc2tpcCBpZiBhbHJlYWR5IHN0b3JlZFxyXG4gICAgICAgICAgICBpZiAoc2luZ2xlLmluZGV4T2YoaGF5c3RhY2tbaV0pID09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBzaW5nbGUucHVzaChoYXlzdGFja1tpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHNpbmdsZTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnBvcEluZGV4ID0gKGFycmF5ID0gW10sIGluZGV4KSA9PiB7Ly91c2VkIHRvIHJlbW92ZSBhbiBpdGVtIGF0IGEgcG9zaXRpb24gaW4gYW4gQXJyYXlcclxuICAgICAgICBsZXQgbmV3QXJyYXkgPSBbXTsvL3N0b3JhZ2UgQXJyYXlcclxuICAgICAgICBmb3IgKGxldCBpIGluIGFycmF5KSB7XHJcbiAgICAgICAgICAgIGlmIChpICE9IGluZGV4KSB7Ly9za2lwIHRoZSBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgbmV3QXJyYXkucHVzaChhcnJheVtpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZGF0YVR5cGUgPSAoYXJyYXkgPSBbXSkgPT4gey8vdXNlZCB0byBnZXQgdGhlIGRhdGF0eXBlcyBpbnNpZGUgYW4gQXJyYXlcclxuICAgICAgICBsZXQgdHlwZSA9IHR5cGVvZiBhcnJheVswXTsvL2dldCB0aGUgaW5kZXh0IHR5cGVcclxuICAgICAgICBmb3IgKGxldCBpIGluIGFycmF5KSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJyYXlbaV0gIT0gdHlwZSkgey8vaWYgdHdvIHR5cGVzIGRvIG5vdCBtYXRjaCByZXR1cm4gbWl4ZWRcclxuICAgICAgICAgICAgICAgIHJldHVybiAnbWl4ZWQnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0eXBlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzZWxmO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFycmF5TGlicmFyeTsiLCJjb25zdCBNYXRoc0xpYnJhcnkgPSByZXF1aXJlKCcuL01hdGhzTGlicmFyeScpO1xyXG5jb25zdCBPYmplY3RzTGlicmFyeSA9IHJlcXVpcmUoJy4vT2JqZWN0c0xpYnJhcnknKTtcclxuY29uc3QgQXJyYXlMaWJyYXJ5ID0gcmVxdWlyZSgnLi9BcnJheUxpYnJhcnknKTtcclxuXHJcbmxldCBtYXRoTGlicmFyeSA9IE1hdGhzTGlicmFyeSgpO1xyXG5sZXQgb2JqZWN0TGlicmFyeSA9IE9iamVjdHNMaWJyYXJ5KCk7XHJcbmxldCBhcnJheUxpYnJhcnkgPSBBcnJheUxpYnJhcnkoKTtcclxuXHJcbi8vIGltcG9ydCB7IFRyZWUgfSBmcm9tICcuLi9jbGFzc2VzL1RyZWUuanMnO1xyXG5cclxuZnVuY3Rpb24gQ29tcHJlc3Npb24oKSB7XHJcbiAgICBjb25zdCBzZWxmID0ge307XHJcblxyXG4gICAgc2VsZi5nZXRGcmVxdWVuY3kgPSAoZGF0YSA9IFtdKSA9PiB7Ly9nZXQgdGhlIG9jY3VycmFuY2Ugb2Ygc3ltYm9scyBpbiBhIGxpc3RcclxuICAgICAgICBjb25zdCBmcmVxdWVuY3kgPSB7fTtcclxuICAgICAgICBmb3IgKGxldCBkIGluIGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGZyZXF1ZW5jeVtkYXRhW2RdXSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGZyZXF1ZW5jeVtkYXRhW2RdXSA9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmcmVxdWVuY3lbZGF0YVtkXV0rKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZyZXF1ZW5jeTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmdldFByb2JhYmlsaXRpZXMgPSAoZGF0YSA9IFtdKSA9PiB7Ly9nZXQgdGhlIHByb2JhYmlsaXRpZXMgb2YgYWxsIHN5bWJvbHMgaW4gYSBsaXN0XHJcbiAgICAgICAgbGV0IHByb2JzID0gc2VsZi5nZXRGcmVxdWVuY3koZGF0YSk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgaW4gcHJvYnMpIHtcclxuICAgICAgICAgICAgcHJvYnNbaV0gPSBwcm9ic1tpXSAvIGRhdGEubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcHJvYnM7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5lbnRyb3B5ID0gKGRhdGEgPSBbXSkgPT4gey8vdGhpcyBzaG93cyB0aGUgc2hvcnRlc3QgcG9zc2libGUgYXZlcmFnZSBsZW5ndGggb2YgYSBsb3NzbGVzcyBjb21wcmVzc2lvblxyXG4gICAgICAgIGxldCBzdW0gPSAwO1xyXG4gICAgICAgIGxldCBkYXRhVHlwZSA9IGFycmF5TGlicmFyeS5kYXRhVHlwZShkYXRhKTsvL2dldCB0aGUgZGF0YXR5cGUgb2YgdGhlIGxpc3RcclxuICAgICAgICBsZXQgcHJvYmFiaWxpdGllcztcclxuICAgICAgICBpZiAoZGF0YVR5cGUgPT0gJ251bWJlcicpIHtcclxuICAgICAgICAgICAgcHJvYmFiaWxpdGllcyA9IGRhdGE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGRhdGFUeXBlID09ICdzdHJpbmcnKSB7Ly9nZXQgdGhlIHN5bWJvbHMgcHJvYmFiaWxpdGllc1xyXG4gICAgICAgICAgICBwcm9iYWJpbGl0aWVzID0gT2JqZWN0LnZhbHVlcyhzZWxmLmdldFByb2JhYmlsaXRpZXMoZGF0YSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9TdW0gb2YgKC1wIGxvZyBiYXNlIDIgb2YgcClcclxuICAgICAgICBmb3IgKGxldCBwcm9iIG9mIHByb2JhYmlsaXRpZXMpIHtcclxuICAgICAgICAgICAgc3VtICs9ICgtcHJvYiAqIE1hdGgubG9nMihwcm9iKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gc3VtO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuaXNVREMgPSAoZGF0YSA9IFtdKSA9PiB7Ly9jaGVjayBpZiBhIGxpc3QgaXMgdW5pcXVlbHkgZGVjb2RhYmxlIGNvZGVcclxuICAgICAgICBsZXQgZmxhZyA9IHRydWUsIG5vUHJlZml4LCBrZWVwUnVubmluZyA9IHRydWU7XHJcblxyXG4gICAgICAgIGxldCBhZGRTdXJmaXggPSAoc3RyKSA9PiB7XHJcbiAgICAgICAgICAgIC8vY2hlY2sgaWYgc3VmZml4IGlzIGluIGxpc3QgYWxyZWFkeSB0aGVuIHN0b3AgcnVubmluZ1xyXG4gICAgICAgICAgICBpZiAoZGF0YS5pbmNsdWRlcyhzdHIpKSB7XHJcbiAgICAgICAgICAgICAgICBmbGFnID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBrZWVwUnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkYXRhLnB1c2goc3RyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBjaGVja1ByZWZpeCA9IChwb3MpID0+IHsvL2NoZWNrIGZvciBwcmVmaXhcclxuICAgICAgICAgICAgbm9QcmVmaXggPSB0cnVlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChpID09IHBvcykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vc2tpcCB0aGUgY3VycmVudCBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZGF0YVtpXSA9PSBkYXRhW3Bvc10pIHtcclxuICAgICAgICAgICAgICAgICAgICAvL2RvdWJsZSBmb3VuZCBpbiB0aGUgbGlzdFxyXG4gICAgICAgICAgICAgICAgICAgIGZsYWcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBrZWVwUnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZGF0YVtpXS5pbmRleE9mKGRhdGFbcG9zXSkgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vYWRkIHN1ZmZpeCBmb3VuZCB0byB0aGUgbGlzdFxyXG4gICAgICAgICAgICAgICAgICAgIGFkZFN1cmZpeChkYXRhW2ldLnJlcGxhY2UoZGF0YVtwb3NdLCAnJykpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vc3RvcCBjaGVja2luZyBmb3IgcHJlZml4XHJcbiAgICAgICAgICAgICAgICBpZiAoIWtlZXBSdW5uaW5nKSBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2hpbGUgKGtlZXBSdW5uaW5nKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY2hlY2tQcmVmaXgoaSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoa2VlcFJ1bm5pbmcgPT0gZmFsc2UpIGJyZWFrOy8vc3RvcCBydW5uaW5nXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChub1ByZWZpeCA9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAvL2lmIG5vIHByZWZpeCBpcyBmb3VuZCBzdG9wIGl0IGlzIFVEQ1xyXG4gICAgICAgICAgICAgICAga2VlcFJ1bm5pbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZsYWc7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5zZkFsZ29yaXRobSA9IChkYXRhID0gW10pID0+IHtcclxuICAgICAgICBsZXQgZnJlcXVlbmN5ID0gc2VsZi5nZXRGcmVxdWVuY3koZGF0YSk7Ly9nZXQgdGhlIGZyZXF1ZWNpZXMgb2YgdGhlIHN5bWJvbHNcclxuICAgICAgICBsZXQgc29ydGVkID0gb2JqZWN0TGlicmFyeS5zb3J0KGZyZXF1ZW5jeSwgeyB2YWx1ZTogdHJ1ZSB9KTsvL3NvcnQgdGhlIHN5bWJvbHMgYmFzZWQgb24gZnJlcXVlY3kgb2Ygb2NjdXJyYW5jZVxyXG4gICAgICAgIGxldCBjb2RlV29yZCA9ICcnO1xyXG5cclxuICAgICAgICBsZXQgdHJlZSA9IHsgcGF0aDogJycsIHNpemU6IG1hdGhMaWJyYXJ5LnN1bShPYmplY3QudmFsdWVzKHNvcnRlZCkpLCB2YWx1ZTogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzb3J0ZWQpKSB9Oy8vc2V0IGEgY29weSBvZiB0aGUgc29ydGVkIGRhdGEgYXMgYSB0cmVlXHJcbiAgICAgICAgbGV0IHRhYmxlID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzb3J0ZWQpKTsvL3NldCB0aGUgc29ydGVkIGFzIHRhYmxlXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgaW4gdGFibGUpIHtcclxuICAgICAgICAgICAgdGFibGVbaV0gPSB7IGZyZXF1ZW5jeTogdGFibGVbaV0gfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0cnlTd2l0Y2hpbmcgPSAobm9kZSkgPT4gey8vc3dpdGNoIG5vZGVzIGlmIHRoZSBsZWZ0IHNpemUgaXMgYmlnZ2VyIHRoYW4gdGhlIHJpZ2h0IHNpZGVcclxuICAgICAgICAgICAgaWYgKG5vZGVbMF0uc2l6ZSA+IG5vZGVbMV0uc2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHRlbXAgPSBub2RlWzBdO1xyXG4gICAgICAgICAgICAgICAgbm9kZVswXSA9IG5vZGVbMV07XHJcbiAgICAgICAgICAgICAgICBub2RlWzFdID0gdGVtcDtcclxuXHJcbiAgICAgICAgICAgICAgICB0ZW1wID0gbm9kZVswXS5wYXRoO1xyXG4gICAgICAgICAgICAgICAgbm9kZVswXS5wYXRoID0gbm9kZVsxXS5wYXRoXHJcbiAgICAgICAgICAgICAgICBub2RlWzFdLnBhdGggPSB0ZW1wO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHNwbGl0RGF0YSA9IChjb21pbmdOb2RlKSA9PiB7Ly9zcGxpdCBhIHRyZWVcclxuICAgICAgICAgICAgbGV0IG5vZGUgPSBbeyBwYXRoOiBjb21pbmdOb2RlLnBhdGggKyAnMCcsIHNpemU6IDAsIHZhbHVlOiBbXSB9LCB7IHBhdGg6IGNvbWluZ05vZGUucGF0aCArICcxJywgc2l6ZTogMCwgdmFsdWU6IFtdIH1dOy8vaW50byB0d28gYWxtb3N0IGVxdWFsIGxlbmd0aFxyXG4gICAgICAgICAgICBmb3IgKGxldCBpIGluIGNvbWluZ05vZGUudmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlWzBdLnNpemUgPCBub2RlWzFdLnNpemUpIHsvL3NwbGl0IGludG8gMiBhbG1vc3QgZXF1YWwgbm9kZXNcclxuICAgICAgICAgICAgICAgICAgICBub2RlWzBdLnZhbHVlW2ldID0gY29taW5nTm9kZS52YWx1ZVtpXTtcclxuICAgICAgICAgICAgICAgICAgICBub2RlWzBdLnNpemUgKz0gY29taW5nTm9kZS52YWx1ZVtpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVbMV0udmFsdWVbaV0gPSBjb21pbmdOb2RlLnZhbHVlW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVbMV0uc2l6ZSArPSBjb21pbmdOb2RlLnZhbHVlW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBub2RlID0gdHJ5U3dpdGNoaW5nKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBub2RlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnZhbHVlcyhub2RlW2ldLnZhbHVlKS5sZW5ndGggPiAxKSB7Ly9pZiBpdCBoYXMgbW9yZSB0aGFuIDEgc3ltYm9sIGl0J3MgYSBub2RlIHRoZW4gc3BsaXQgaXQgYWdhaW5cclxuICAgICAgICAgICAgICAgICAgICBub2RlW2ldLnZhbHVlID0gc3BsaXREYXRhKG5vZGVbaV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7Ly9pdCBpcyBhIGxlYWYsIGFkZCBpdCB0byB0aGUgdGFibGUgYW5kIGdldCB0aGUgcHJvcGVydGllc1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBrZXkgPSBPYmplY3Qua2V5cyhub2RlW2ldLnZhbHVlKVswXTtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZVtrZXldLmNvZGUgPSBub2RlW2ldLnBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGVba2V5XS5sZW5ndGggPSBub2RlW2ldLnBhdGgubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW2tleV0ucHJvYmFiaWxpdHkgPSBub2RlW2ldLnNpemUgLyBkYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZVtrZXldLmxvZyA9IE1hdGgubG9nMigxIC8gdGFibGVba2V5XS5wcm9iYWJpbGl0eSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cmVlID0gc3BsaXREYXRhKHRyZWUpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBkIG9mIGRhdGEpIHtcclxuICAgICAgICAgICAgY29kZVdvcmQgKz0gdGFibGVbZF0uY29kZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IGNvZGVXb3JkLCB0YWJsZSwgZGF0YSwgdHJlZSB9O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuaHVmZm1hbkNvZGluZyA9IChkYXRhID0gW10pID0+IHtcclxuICAgICAgICBsZXQgZnJlcXVlbmN5ID0gc2VsZi5nZXRQcm9iYWJpbGl0aWVzKGRhdGEpOy8vZ2V0IHRoZSBmcmVxdWVjaWVzIG9mIHRoZSBzeW1ib2xzXHJcbiAgICAgICAgbGV0IHNvcnRlZCA9IG9iamVjdExpYnJhcnkuc29ydChmcmVxdWVuY3ksIHsgdmFsdWU6IHRydWUgfSk7Ly9zb3J0IHRoZSBzeW1ib2xzIGJhc2VkIG9uIGZyZXF1ZWN5IG9mIG9jY3VycmFuY2VcclxuXHJcbiAgICAgICAgbGV0IHRyZWUgPSBbXTtcclxuICAgICAgICBsZXQgdGFibGUgPSB7fTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBzb3J0ZWQpIHsvL2luaXQgdGhlIHRhYmxlIGFuZCB0aGUgdHJlZVxyXG4gICAgICAgICAgICB0YWJsZVtpXSA9IHsgcHJvYmFiaWxpdHk6IHNvcnRlZFtpXSwgcGF0aDogJycsIGxlbmd0aDogMCwgcHJvZDogMCB9O1xyXG4gICAgICAgICAgICB0cmVlLnB1c2goeyB2YWx1ZTogc29ydGVkW2ldLCBvcmlnaW5zOiBpIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGRpZyA9IChjb21pbmcgPSBbXSkgPT4gey8vcnVuIHRoZSBhbGdvcml0aG0gbG9vcCB1bnRpbCBvbmUgbm9kZSBpcyByZW1haW5pbmcgd2l0aCB2YWx1ZSBvZiAnMSdcclxuICAgICAgICAgICAgbGV0IGxlbmd0aCA9IGNvbWluZy5sZW5ndGg7Ly9zaXplIG9mIGxpc3QgXHJcbiAgICAgICAgICAgIGxldCBub2RlID0gW107Ly9pbml0IG5vZGVcclxuICAgICAgICAgICAgaWYgKGxlbmd0aCA+IDEpIHsvLyBsaXN0IGhhcyBtb3JlIHRoYW4gb25lIG5vZGU/XHJcbiAgICAgICAgICAgICAgICBsZXQgZG93biA9IGxlbmd0aCAtIDE7Ly9pbmRleCBvZiBsYXN0IHR3byBpdGVtcyBpbiBsaXN0XHJcbiAgICAgICAgICAgICAgICBsZXQgdXAgPSBsZW5ndGggLSAyO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IGNvbWluZ1t1cF0udmFsdWUgKyBjb21pbmdbZG93bl0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWRkZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29taW5nLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT0gdXAgfHwgaSA9PSBkb3duKSB7Ly9zdW0gbGFzdCAyIGl0ZW1zIGFuZCBza2lwIGFkZGluZyB0aGVtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsZW5ndGggPT0gMikgey8vaWYgbGFzdCAyIHN1bSB0aGVtIGFuZCBleGlzdCBkaWdnaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3TGVhZiA9IHsgdmFsdWU6IHN1bSwgb3JpZ2luczogW2NvbWluZ1t1cF0ub3JpZ2lucywgY29taW5nW2Rvd25dLm9yaWdpbnNdIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnB1c2gobmV3TGVhZik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29taW5nW2ldLnZhbHVlIDw9IHN1bSAmJiAhYWRkZWQpIHsvL2FkZCBzdW0gaWYgaXQgaGFzIG5vdCBiZWVuIGFkZGVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdMZWFmID0geyB2YWx1ZTogc3VtLCBvcmlnaW5zOiBbY29taW5nW3VwXS5vcmlnaW5zLCBjb21pbmdbZG93bl0ub3JpZ2luc10gfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5wdXNoKG5ld0xlYWYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBub2RlLnB1c2goY29taW5nW2ldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBkaWcobm9kZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJlZSA9IGRpZyh0cmVlKTtcclxuXHJcbiAgICAgICAgLy9nZXQgdGhlIHBhdGgvY29kZXdvcmQgZm9yZWFjaCBzeW1ib2xcclxuICAgICAgICBsZXQgbmFtZUl0ZW1zID0gKG9yaWdpbnMsIHBhdGgpID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBvcmlnaW5zKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvcmlnaW5zW2ldKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVJdGVtcyhvcmlnaW5zW2ldLCBwYXRoICsgaSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW29yaWdpbnNbaV1dLnBhdGggPSBwYXRoICsgaTtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZVtvcmlnaW5zW2ldXS5sZW5ndGggPSBwYXRoLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZVtvcmlnaW5zW2ldXS5wcm9kID0gcGF0aC5sZW5ndGggKiB0YWJsZVtvcmlnaW5zW2ldXS5wcm9iYWJpbGl0eTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbmFtZUl0ZW1zKHRyZWVbMF0ub3JpZ2lucywgJycpO1xyXG5cclxuICAgICAgICAvL2NhbGN1bGF0ZSB0aGUgYXZldmFnZSBsZW5ndGggb2YgdGhlIGNvZGVzXHJcbiAgICAgICAgbGV0IGF2Z0xlbmd0aCA9IG1hdGhMaWJyYXJ5LnN1bShvYmplY3RMaWJyYXJ5LnZhbHVlT2ZPYmplY3RBcnJheSh0YWJsZSwgJ3Byb2QnKSk7XHJcblxyXG4gICAgICAgIGZyZXF1ZW5jeSA9IHNvcnRlZCA9IHVuZGVmaW5lZDtcclxuICAgICAgICByZXR1cm4geyB0YWJsZSwgZGF0YSwgYXZnTGVuZ3RoLCB0cmVlIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc2VsZi5lbmNvZGVIdWZmbWFuID0gKGRhdGEsIGRpY3Rpb25hcnkgPSBbXSkgPT4ge1xyXG4gICAgLy8gICAgIGxldCBkaWN0aW9uYXJ5TGVuZ3RoID0gZGljdGlvbmFyeS5sZW5ndGg7XHJcbiAgICAvLyAgICAgbGV0IGNvZGVXb3JkID0gJycsIG55dENvZGUsIGNvZGU7XHJcblxyXG4gICAgLy8gICAgIC8vZ2V0IHRoZSBlIGFuZCByIHBhcmFtZXRlcnNcclxuICAgIC8vICAgICBsZXQgeyBlLCByIH0gPSAoKCkgPT4ge1xyXG4gICAgLy8gICAgICAgICBsZXQgb2sgPSBmYWxzZTtcclxuICAgIC8vICAgICAgICAgbGV0IGUgPSAwLCByO1xyXG4gICAgLy8gICAgICAgICB3aGlsZSAoIW9rKSB7XHJcbiAgICAvLyAgICAgICAgICAgICBlKys7XHJcbiAgICAvLyAgICAgICAgICAgICByID0gZGljdGlvbmFyeUxlbmd0aCAtIDIgKiogZTtcclxuICAgIC8vICAgICAgICAgICAgIG9rID0gciA8IDIgKiogZTtcclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICByZXR1cm4geyBlLCByIH07XHJcbiAgICAvLyAgICAgfSkoKTtcclxuXHJcbiAgICAvLyAgICAgbGV0IGZpeGVkQ29kZSA9IChzeW1ib2wpID0+IHsvL2dldCB0aGUgZml4ZWQgY29kZVxyXG4gICAgLy8gICAgICAgICBsZXQgayA9IGRpY3Rpb25hcnkuaW5kZXhPZihzeW1ib2wpICsgMTtcclxuICAgIC8vICAgICAgICAgbGV0IGNvZGU7XHJcbiAgICAvLyAgICAgICAgIGlmIChrIDw9IDIgKiByKSB7IC8vIDEgPD0gayA8PSAyclxyXG4gICAgLy8gICAgICAgICAgICAgY29kZSA9IChrIC0gMSkudG9TdHJpbmcoMik7XHJcbiAgICAvLyAgICAgICAgICAgICBjb2RlID0gQXJyYXkoKGUgKyAxKSAtIGNvZGUubGVuZ3RoKS5maWxsKDApLmpvaW4oJycpICsgY29kZTsgLy8gZSArIDEgcmVwcmVzZW50YXRpb24gb2YgayAtIDFcclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICBlbHNlIGlmIChrID4gMiAqIHIpIHsvL2sgPiAyclxyXG4gICAgLy8gICAgICAgICAgICAgY29kZSA9IChrIC0gciAtIDEpLnRvU3RyaW5nKDIpO1xyXG4gICAgLy8gICAgICAgICAgICAgY29kZSA9IEFycmF5KChlKSAtIGNvZGUubGVuZ3RoKS5maWxsKDApLmpvaW4oJycpICsgY29kZTsvLyBlIHJlcHJlc2VudGF0aW9uIG9mIGsgLSByIC0gMVxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgIHJldHVybiBjb2RlO1xyXG4gICAgLy8gICAgIH1cclxuXHJcbiAgICAvLyAgICAgbGV0IHVwZGF0ZUNvdW50ID0gKHQpID0+IHsvL3NldCB0aGUgY291bnQgb2YgYSBub2RlIGFuZCBzd2l0Y2ggaWYgbGVmdCBpcyBncmVhdGVyIHRoYW4gcmlnaHRcclxuICAgIC8vICAgICAgICAgbGV0IGNvdW50ID0gdC5nZXRBdHRyaWJ1dGUoJ2NvdW50Jyk7XHJcbiAgICAvLyAgICAgICAgIGNvdW50Kys7XHJcbiAgICAvLyAgICAgICAgIHQuc2V0QXR0cmlidXRlcyh7IGNvdW50IH0pO1xyXG4gICAgLy8gICAgICAgICBsZXQgcCA9IHQucGFyZW50VHJlZTtcclxuICAgIC8vICAgICAgICAgaWYgKHAgIT0gbnVsbCkge1xyXG4gICAgLy8gICAgICAgICAgICAgdHJ5U3dpdGNoaW5nKHApO1xyXG4gICAgLy8gICAgICAgICAgICAgdXBkYXRlQ291bnQocCk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGxldCB0cnlTd2l0Y2hpbmcgPSAobm9kZSkgPT4gey8vc3dpdGNoIGlmIGxlZnQgaXMgZ3JlYXRlciB0aGFuIHJpZ2h0XHJcbiAgICAvLyAgICAgICAgIGlmIChub2RlLnZhbHVlc1swXS5nZXRBdHRyaWJ1dGUoJ2NvdW50JykgPiBub2RlLnZhbHVlc1sxXS5nZXRBdHRyaWJ1dGUoJ2NvdW50JykpIHtcclxuICAgIC8vICAgICAgICAgICAgIG5vZGUucmV2ZXJzZSgpO1xyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfTtcclxuXHJcbiAgICAvLyAgICAgbGV0IHRyZWUgPSBuZXcgVHJlZSgpO1xyXG4gICAgLy8gICAgIHRyZWUuc2V0QXR0cmlidXRlKCdjb3VudCcsIDApO1xyXG4gICAgLy8gICAgIGxldCBOWVQgPSB0cmVlO1xyXG5cclxuICAgIC8vICAgICBsZXQgcmVhZFN5bWJvbCA9IChzeW1ib2wpID0+IHtcclxuICAgIC8vICAgICAgICAgbGV0IHMgPSB0cmVlLnNlYXJjaCgodiwgaSkgPT4gey8vc2VhcmNoIGFuZCBnZXQgc3ltYm9sIG5vZGUgaWYgYWRkZWQgYWxyZWFkeVxyXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIHYuZ2V0QXR0cmlidXRlKCdpZCcpID09IHN5bWJvbDtcclxuICAgIC8vICAgICAgICAgfSwgdHJlZS5oZWlnaHQpO1xyXG5cclxuICAgIC8vICAgICAgICAgbGV0IHYgPSBzLnZhbHVlO1xyXG4gICAgLy8gICAgICAgICBueXRDb2RlID0gdHJlZS5zZWFyY2goKHYsIGkpID0+IHsvL2dldCB0aGUgbnl0IG5vZGVcclxuICAgIC8vICAgICAgICAgICAgIHJldHVybiB2LmdldEF0dHJpYnV0ZSgnaWQnKSA9PSAnbnl0JztcclxuICAgIC8vICAgICAgICAgfSwgdHJlZS5oZWlnaHQpLnBhdGguam9pbignJyk7XHJcblxyXG4gICAgLy8gICAgICAgICBpZiAodiA9PSB1bmRlZmluZWQpIHsvL2hhcyBub3QgYmVlbiBhZGRlZFxyXG4gICAgLy8gICAgICAgICAgICAgTllULnJlbW92ZUF0dHJpYnV0ZSgnaWQnKTsvL3JlbW92ZSB0aGUgY3VycmVudCBOWVQgdGFnXHJcbiAgICAvLyAgICAgICAgICAgICBOWVQucHVzaChbXSwgW10pOy8vYWRkIHRoZSAyIG5vZGVzXHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgdGVtcCA9IE5ZVC52YWx1ZXNbMF07XHJcbiAgICAvLyAgICAgICAgICAgICB2ID0gTllULnZhbHVlc1sxXTtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICB0ZW1wLnNldEF0dHJpYnV0ZXMoeyBpZDogJ255dCcsIGNvdW50OiAwIH0pOy8vc2V0IG5ldyBueXRcclxuICAgIC8vICAgICAgICAgICAgIHYuc2V0QXR0cmlidXRlcyh7IGlkOiBzeW1ib2wsIGNvdW50OiAwIH0pO1xyXG4gICAgLy8gICAgICAgICAgICAgTllUID0gdGVtcDtcclxuICAgIC8vICAgICAgICAgICAgIGNvZGUgPSBueXRDb2RlICsgZml4ZWRDb2RlKHN5bWJvbCk7Ly9ueXQgKyBmaXhlZENvZGVcclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICBlbHNlIHtcclxuICAgIC8vICAgICAgICAgICAgIGNvZGUgPSBzLnBhdGguam9pbignJyk7Ly9nZXQgcGF0aFxyXG4gICAgLy8gICAgICAgICB9XHJcblxyXG4gICAgLy8gICAgICAgICBjb2RlV29yZCArPSBjb2RlOy8vY29uY2F0IHRoZSBjb2RlXHJcblxyXG4gICAgLy8gICAgICAgICB1cGRhdGVDb3VudCh2KTsvL3VwZGF0ZSB0aGUgY291bnQgc3RhcnRpbmcgZnJvbSB0aGlzIG5vZGUgdG8gdGhlIHJvb3RcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGZvciAobGV0IHN5bWJvbCBvZiBkYXRhKSB7XHJcbiAgICAvLyAgICAgICAgIHJlYWRTeW1ib2woc3ltYm9sKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIHJldHVybiB7IGNvZGVXb3JkLCB0cmVlLCBkYXRhIH07XHJcbiAgICAvLyB9XHJcblxyXG4gICAgLy8gc2VsZi5kZWNvZGVIdWZmbWFuID0gKGNvZGVXb3JkLCBkaWN0aW9uYXJ5ID0gW10pID0+IHtcclxuICAgIC8vICAgICBsZXQgZGljdGlvbmFyeUxlbmd0aCA9IGRpY3Rpb25hcnkubGVuZ3RoO1xyXG4gICAgLy8gICAgIGxldCBkYXRhID0gJycsIG55dENvZGUsIGNvZGUsIHBhdGggPSBbXTtcclxuICAgIC8vICAgICBsZXQgdHJlZSA9IG5ldyBUcmVlKCk7XHJcbiAgICAvLyAgICAgdHJlZS5zZXRBdHRyaWJ1dGVzKHsgY291bnQ6IDAsIGlkOiAnbnl0JyB9KTtcclxuICAgIC8vICAgICBsZXQgTllUID0gdHJlZTtcclxuICAgIC8vICAgICBsZXQgaTtcclxuICAgIC8vICAgICBsZXQgeyBlLCByIH0gPSAoKCkgPT4ge1xyXG4gICAgLy8gICAgICAgICBsZXQgb2sgPSBmYWxzZTtcclxuICAgIC8vICAgICAgICAgbGV0IGUgPSAwLCByO1xyXG4gICAgLy8gICAgICAgICB3aGlsZSAoIW9rKSB7XHJcbiAgICAvLyAgICAgICAgICAgICBlKys7XHJcbiAgICAvLyAgICAgICAgICAgICByID0gZGljdGlvbmFyeUxlbmd0aCAtIDIgKiogZTtcclxuICAgIC8vICAgICAgICAgICAgIG9rID0gciA8IDIgKiogZTtcclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICByZXR1cm4geyBlLCByIH07XHJcbiAgICAvLyAgICAgfSkoKTtcclxuXHJcbiAgICAvLyAgICAgbGV0IHRyeVN3aXRjaGluZyA9IChub2RlKSA9PiB7Ly9zd2l0Y2ggbm9kZXMgaWYgbGVmdCBzaWRlIGlzIGdyZWF0ZXIgdGhhbiByaWdodCBzaWRlXHJcbiAgICAvLyAgICAgICAgIGlmIChub2RlLnZhbHVlc1swXS5nZXRBdHRyaWJ1dGUoJ2NvdW50JykgPiBub2RlLnZhbHVlc1sxXS5nZXRBdHRyaWJ1dGUoJ2NvdW50JykpIHtcclxuICAgIC8vICAgICAgICAgICAgIG5vZGUucmV2ZXJzZSgpO1xyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfTtcclxuXHJcbiAgICAvLyAgICAgbGV0IHVwZGF0ZUNvdW50ID0gKHQpID0+IHsvL3VwZGF0ZSB0aGUgc2l6ZSBvZiB0aGUgY3VycmVudCBub2RlIGFuZCBpdCdzIG5leHQgcGFyZW50XHJcbiAgICAvLyAgICAgICAgIGxldCBjb3VudCA9IHQuZ2V0QXR0cmlidXRlKCdjb3VudCcpO1xyXG4gICAgLy8gICAgICAgICBjb3VudCsrO1xyXG4gICAgLy8gICAgICAgICB0LnNldEF0dHJpYnV0ZXMoeyBjb3VudCB9KTtcclxuICAgIC8vICAgICAgICAgbGV0IHAgPSB0LnBhcmVudFRyZWU7XHJcbiAgICAvLyAgICAgICAgIGlmIChwICE9IG51bGwpIHtcclxuICAgIC8vICAgICAgICAgICAgIHRyeVN3aXRjaGluZyhwKTtcclxuICAgIC8vICAgICAgICAgICAgIHVwZGF0ZUNvdW50KHApO1xyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBsZXQgcmVhZFN5bWJvbCA9IChzeW1ib2wpID0+IHtcclxuICAgIC8vICAgICAgICAgbGV0IHMgPSB0cmVlLnNlYXJjaCgodikgPT4ge1xyXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIHYuZ2V0QXR0cmlidXRlKCdpZCcpID09IHN5bWJvbDsvL3NlYXJjaCBhbmQgZ2V0IHN5bWJvbCBpZiBleGlzdHMgYWxyZWFkeVxyXG4gICAgLy8gICAgICAgICB9LCB0cmVlLmhlaWdodCk7XHJcblxyXG4gICAgLy8gICAgICAgICBsZXQgdiA9IHMudmFsdWU7XHJcbiAgICAvLyAgICAgICAgIG55dENvZGUgPSB0cmVlLnNlYXJjaCgodiwgaSkgPT4ge1xyXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIHYuZ2V0QXR0cmlidXRlKCdpZCcpID09ICdueXQnOy8vZ2V0IHRoZSBOWVQgY29kZVxyXG4gICAgLy8gICAgICAgICB9LCB0cmVlLmhlaWdodCkucGF0aC5qb2luKCcnKTtcclxuXHJcbiAgICAvLyAgICAgICAgIGlmICh2ID09IHVuZGVmaW5lZCkgey8vbmV3IHN5bWJvbD8gYWRkIGl0IHRvIHRoZSB0cmVlIHdpdGggbmV3IE5ZVFxyXG4gICAgLy8gICAgICAgICAgICAgTllULnJlbW92ZUF0dHJpYnV0ZSgnaWQnKTtcclxuICAgIC8vICAgICAgICAgICAgIE5ZVC5wdXNoKFtdLCBbXSk7XHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgdGVtcCA9IE5ZVC52YWx1ZXNbMF07XHJcbiAgICAvLyAgICAgICAgICAgICB2ID0gTllULnZhbHVlc1sxXTtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICB0ZW1wLnNldEF0dHJpYnV0ZXMoeyBpZDogJ255dCcsIGNvdW50OiAwIH0pO1xyXG4gICAgLy8gICAgICAgICAgICAgdi5zZXRBdHRyaWJ1dGVzKHsgaWQ6IHN5bWJvbCwgY291bnQ6IDAgfSk7XHJcbiAgICAvLyAgICAgICAgICAgICBOWVQgPSB0ZW1wO1xyXG4gICAgLy8gICAgICAgICB9XHJcblxyXG4gICAgLy8gICAgICAgICB1cGRhdGVDb3VudCh2KTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGxldCBpbnRlcnByZXRlID0gKG5vZGUpID0+IHtcclxuICAgIC8vICAgICAgICAgbGV0IGNvZGU7XHJcbiAgICAvLyAgICAgICAgIGlmIChub2RlID09IE5ZVCkgey8vaXMgbm9kZSBOWVRcclxuICAgIC8vICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZTsgaisrKSB7Ly9yZWFkIG5leHQgNCBjb2Rlc1xyXG4gICAgLy8gICAgICAgICAgICAgICAgIHBhdGgucHVzaChjb2RlV29yZFsrK2ldKTtcclxuICAgIC8vICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgIGxldCBwID0gcGFyc2VJbnQocGF0aC5qb2luKCcnKSwgMik7XHJcbiAgICAvLyAgICAgICAgICAgICBpZiAocCA8IHIpIHsvL3AgaXMgbW9yZSB0aGFuIHIsIHJlYWQgMSBtb3JlXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgcGF0aC5wdXNoKGNvZGVXb3JkWysraV0pO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgIHAgPSBwYXJzZUludChwYXRoLmpvaW4oJycpLCAyKTtcclxuICAgIC8vICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgIHAgKz0gcjsvL2FkZCByIHRvIHBcclxuICAgIC8vICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgIGNvZGUgPSBkaWN0aW9uYXJ5W3BdOy8vZ2V0IHN5bWJvbCBmcm9tIGRpY3Rpb25hcnlcclxuICAgIC8vICAgICAgICAgICAgIHJlYWRTeW1ib2woY29kZSk7Ly9hZGQgdGhpcyBzeW1ib2wgdG8gdHJlZVxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgIGVsc2Uge1xyXG4gICAgLy8gICAgICAgICAgICAgY29kZSA9IG5vZGUuZ2V0QXR0cmlidXRlKCdpZCcpOy8vZ2V0IHRoZSBzeW1ib2wgZnJvbSB0aGUgdHJlZVxyXG4gICAgLy8gICAgICAgICAgICAgcmVhZFN5bWJvbChjb2RlKTsvL3VwZGF0ZSB0aGUgc3ltYm9sXHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgcmV0dXJuIGNvZGU7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBmb3IgKGkgPSAtMTsgaSA8IGNvZGVXb3JkLmxlbmd0aDsgaSsrKSB7Ly9zdGFydCB3aXRoIGVtcHR5IE5ZVFxyXG4gICAgLy8gICAgICAgICBsZXQgY29kZSA9IGNvZGVXb3JkW2ldO1xyXG4gICAgLy8gICAgICAgICBpZiAoY29kZSAhPSB1bmRlZmluZWQpIHsvL3doZW4gbm90IGVtcHR5XHJcbiAgICAvLyAgICAgICAgICAgICBwYXRoLnB1c2goY29kZSk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgbGV0IG5vZGUgPSB0cmVlLnRyYWNlKHBhdGgpLnZhbHVlO1xyXG4gICAgLy8gICAgICAgICBpZiAobm9kZS5nZXRBdHRyaWJ1dGUoJ2lkJykgIT0gdW5kZWZpbmVkKSB7Ly9pcyBub2RlIGxhYmVsbGVkXHJcbiAgICAvLyAgICAgICAgICAgICBwYXRoID0gW2l0ZW1dO1xyXG4gICAgLy8gICAgICAgICAgICAgZGF0YSArPSBpbnRlcnByZXRlKG5vZGUpOy8vd2hhdCBpcyB0aGlzIG5vZGVcclxuICAgIC8vICAgICAgICAgICAgIHBhdGggPSBbXTtcclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgIH1cclxuXHJcbiAgICAvLyAgICAgcmV0dXJuIHsgZGF0YSwgdHJlZSwgY29kZVdvcmQgfTtcclxuICAgIC8vIH1cclxuXHJcbiAgICBzZWxmLmdvbG9tYiA9IChuLCBtKSA9PiB7XHJcbiAgICAgICAgbGV0IHEgPSBNYXRoLmZsb29yKG4gLyBtKTsvL3N0ZXAgMVxyXG4gICAgICAgIGxldCB1bmFyeSA9IEFycmF5KHEpLmZpbGwoMSkuam9pbignJykgKyAnMCc7Ly91bmFyeSBvZiBxXHJcblxyXG4gICAgICAgIGxldCBrID0gTWF0aC5jZWlsKE1hdGgubG9nMihtKSk7XHJcbiAgICAgICAgbGV0IGMgPSAyICoqIGsgLSBtO1xyXG4gICAgICAgIGxldCByID0gbiAlIG07XHJcbiAgICAgICAgbGV0IHJDID0gKCgpID0+IHsvL3JgXHJcbiAgICAgICAgICAgIGxldCB2YWx1ZSA9IHIudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgaWYgKHIgPCBjKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHIudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gQXJyYXkoKGsgLSAxKSAtIHZhbHVlLmxlbmd0aCkuZmlsbCgwKS5qb2luKCcnKSArIHZhbHVlOy8vay0xIGJpdHMgcmVwIG9mIHJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gKHIgKyBjKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBBcnJheShrIC0gdmFsdWUubGVuZ3RoKS5maWxsKDApLmpvaW4oJycpICsgdmFsdWU7Ly9rIGJpdHMgcmVwIG9mIHIrY1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9KSgpO1xyXG5cclxuICAgICAgICBsZXQgY29kZSA9IHVuYXJ5ICsgckM7Ly9jb25jYXQgdW5hcnkgYW5kIHInXHJcbiAgICAgICAgcmV0dXJuIGNvZGU7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5lbmNvZGVBcml0aG1ldGljID0gKGRhdGEsIHByb2JhYmlsaXRpZXMpID0+IHtcclxuICAgICAgICBsZXQgZ2V0WCA9IChuKSA9PiB7Ly9mKHgobikpPSBzdW0gb2YgeCgxKSAuLi4uIHgobilcclxuICAgICAgICAgICAgbGV0IHZhbHVlID0gMDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBwcm9iYWJpbGl0aWVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobiA9PSBpKSBicmVhaztcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gKHZhbHVlIC8gMTAgKyBwcm9iYWJpbGl0aWVzW2ldIC8gMTApICogMTAwIC8gMTA7Ly9oYW5kbGUgdGhlIEpTIGRlY2ltYWwgcHJvYmxlbVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGwoMCkgPSAwLCB1KDApID0gMCwgZngoMCkgPSAwXHJcbiAgICAgICAgbGV0IGJvdW5kcyA9IFt7IGw6IDAsIHU6IDEgfV07XHJcblxyXG4gICAgICAgIGxldCBsb3dlck4gPSAobikgPT4gey8vbG93ZXIgbGltaXQgb2YgbiBsKG4pID0gbChuLTEpICsgKHUobi0xKSAtIGwobi0xKSkgKiBmKHgobi0xKSlcclxuICAgICAgICAgICAgbGV0IGJvdW5kID0gYm91bmRzW25dO1xyXG4gICAgICAgICAgICBsZXQgbCA9IGJvdW5kLmwgKyAoKGJvdW5kLnUgLSBib3VuZC5sKSAqIGdldFgoZGF0YVtuXSAtIDEpKTtcclxuICAgICAgICAgICAgcmV0dXJuIGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdXBwZXJOID0gKG4pID0+IHsvL2xvd2VyIGxpbWl0IG9mIG4gdShuKSA9IGwobi0xKSArICh1KG4tMSkgLSBsKG4tMSkpICogZih4KG4pKVxyXG4gICAgICAgICAgICBsZXQgYm91bmQgPSBib3VuZHNbbl07XHJcbiAgICAgICAgICAgIGxldCB1ID0gYm91bmQubCArICgoYm91bmQudSAtIGJvdW5kLmwpICogZ2V0WChkYXRhW25dKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB1O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGJvdW5kcy5wdXNoKHsgbDogbG93ZXJOKGkpLCB1OiB1cHBlck4oaSkgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbiA9IGJvdW5kcy5wb3AoKTtcclxuICAgICAgICByZXR1cm4gKG4ubCArIG4udSkgLyAyO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZGVjb2RlQXJpdGhtZXRpYyA9ICh0YWcgPSAwLCBwcm9iYWJpbGl0aWVzKSA9PiB7XHJcbiAgICAgICAgbGV0IGRhdGEgPSAnJztcclxuICAgICAgICBsZXQgZ2V0WCA9IChuKSA9PiB7Ly9mKHgobikpPSBzdW0gb2YgeCgxKSAuLi4uIHgobilcclxuICAgICAgICAgICAgbGV0IHZhbHVlID0gMDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBwcm9iYWJpbGl0aWVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobiA9PSBpKSBicmVhaztcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gKHZhbHVlIC8gMTAgKyBwcm9iYWJpbGl0aWVzW2ldIC8gMTApICogMTAwIC8gMTA7Ly9oYW5kbGUgdGhlIEpTIGRlY2ltYWwgcHJvYmxlbVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGwoMCkgPSAwLCB1KDApID0gMCwgZngoMCkgPSAwXHJcbiAgICAgICAgbGV0IGJvdW5kcyA9IFt7IGw6IDAsIHU6IDEgfV07XHJcblxyXG4gICAgICAgIGxldCBsb3dlck4gPSAobikgPT4gey8vbG93ZXIgbGltaXQgb2YgbiBsKG4pID0gbChuLTEpICsgKHUobi0xKSAtIGwobi0xKSkgKiBmKHgobi0xKSlcclxuICAgICAgICAgICAgbGV0IGJvdW5kID0gYm91bmRzW25dO1xyXG4gICAgICAgICAgICBsZXQgbCA9IGJvdW5kLmwgKyAoKGJvdW5kLnUgLSBib3VuZC5sKSAqIGdldFgoZGF0YVtuXSAtIDEpKTtcclxuICAgICAgICAgICAgcmV0dXJuIGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdXBwZXJOID0gKG4pID0+IHsvL2xvd2VyIGxpbWl0IG9mIG4gdShuKSA9IGwobi0xKSArICh1KG4tMSkgLSBsKG4tMSkpICogZih4KG4pKVxyXG4gICAgICAgICAgICBsZXQgYm91bmQgPSBib3VuZHNbbl07XHJcbiAgICAgICAgICAgIGxldCB1ID0gYm91bmQubCArICgoYm91bmQudSAtIGJvdW5kLmwpICogZ2V0WChkYXRhW25dKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB1O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGNvdW50ID0gMCwgY29tcGxldGUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgd2hpbGUgKCFjb21wbGV0ZSkgey8vcnVuIHVudGlsIGFsbCB0aGUgY29kZXMgYXJlIGZvdW5kXHJcbiAgICAgICAgICAgIGxldCBmb3VuZCA9IGZhbHNlLCB4ID0gMSwgbiA9IHt9O1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKCFmb3VuZCkgey8vIGZvciBlYWNoIG5ldyBjb2RlXHJcbiAgICAgICAgICAgICAgICBsZXQgbCA9IGxvd2VyTihjb3VudCwgeCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgdSA9IHVwcGVyTihjb3VudCwgeCk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29tcGxldGUgPSAobCA+PSB0YWcgJiYgdGFnIDw9IHUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlKSBicmVhazsvL2lmIGFsbCBpcyBmb3VuZCBzdG9wIHJ1bm5pbmdcclxuXHJcbiAgICAgICAgICAgICAgICBmb3VuZCA9IChsIDwgdGFnICYmIHRhZyA8IHUpOy8vY2hlY2sgaWYgaXQgc2FjdGlzZmllcyB0aGUgY29uZGl0aW9uc1xyXG4gICAgICAgICAgICAgICAgbiA9IHsgbCwgdSwgeCB9O1xyXG4gICAgICAgICAgICAgICAgeCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjb21wbGV0ZSkgYnJlYWs7XHJcbiAgICAgICAgICAgIGNvdW50Kys7XHJcblxyXG4gICAgICAgICAgICBib3VuZHMucHVzaChuKTsvL2FkZCBjb2RlXHJcbiAgICAgICAgICAgIGRhdGEgKz0gbi54O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmVuY29kZURpYWdyYW0gPSAoZGF0YSA9ICcnLCBkaWN0aW9uYXJ5ID0ge30pID0+IHsvL2RhaWdyYW0gY29kaW5nXHJcbiAgICAgICAgbGV0IGk7XHJcbiAgICAgICAgbGV0IGNvZGVXb3JkID0gJyc7XHJcbiAgICAgICAgbGV0IGVuY29kZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgbGV0IGZpcnN0ID0gZGF0YVtpXTsvL3Rha2UgdHdvIGF0IGEgdGltZVxyXG4gICAgICAgICAgICBsZXQgc2Vjb25kID0gZGF0YVtpICsgMV07XHJcbiAgICAgICAgICAgIGxldCBzeW1ib2wgPSBmaXJzdCArIHNlY29uZDtcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2RlO1xyXG4gICAgICAgICAgICBpZiAoZGljdGlvbmFyeVtzeW1ib2xdICE9IHVuZGVmaW5lZCkgey8vaXMgc3ltYm9sIGluIGRpY3Rpb25hcnlcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBkaWN0aW9uYXJ5W3N5bWJvbF07XHJcbiAgICAgICAgICAgICAgICBpKys7Ly9zZXQgY291bnQgdG8ga25vdyBpdCByZWFkIHR3b1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IGRpY3Rpb25hcnlbZmlyc3RdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gY29kZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvZGVXb3JkICs9IGVuY29kZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNvZGVXb3JkO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZW5jb2RlTFoxID0gKGRhdGEgPSAnJywgcGFyYW1zID0geyB3aW5kb3dTaXplOiAwLCBzZWFyY2hTaXplOiAwLCBsb29rQWhlYWRTaXplOiAwIH0pID0+IHsvL0xaNy8vTFoxLy9TbGlkaW5nIHdpbmRvd1xyXG4gICAgICAgIGlmIChwYXJhbXMud2luZG93U2l6ZSA9PSB1bmRlZmluZWQpIHBhcmFtcy53aW5kb3dTaXplID0gcGFyYW1zLnNlYXJjaFNpemUgKyBwYXJhbXMubG9va0FoZWFkU2l6ZTsvL2luaXQgdGhlIHdpbmRvdywgc2VhcmNoIGFuZCBsb29rYWhlYWQgc2l6ZXNcclxuICAgICAgICBpZiAocGFyYW1zLnNlYXJjaFNpemUgPT0gdW5kZWZpbmVkKSBwYXJhbXMuc2VhcmNoU2l6ZSA9IHBhcmFtcy53aW5kb3dTaXplIC0gcGFyYW1zLmxvb2tBaGVhZFNpemU7XHJcbiAgICAgICAgaWYgKHBhcmFtcy5sb29rQWhlYWRTaXplID09IHVuZGVmaW5lZCkgcGFyYW1zLmxvb2tBaGVhZFNpemUgPSBwYXJhbXMud2luZG93U2l6ZSAtIHBhcmFtcy5zZWFyY2hTaXplO1xyXG5cclxuXHJcbiAgICAgICAgbGV0IGkgPSAwLCBsb29rQWhlYWRTdG9wLCBzZWFyY2hTdG9wLCBsb29rQWhlYWRCdWZmZXIsIHNlYXJjaEJ1ZmZlcjsvL2luaXQgdGhlIGJ1ZmZlcnMgYW5kIGxvY2F0aW9uc1xyXG5cclxuICAgICAgICBsZXQgZ2V0VHJpcGxldCA9ICgpID0+IHtcclxuICAgICAgICAgICAgbGV0IHggPSBsb29rQWhlYWRCdWZmZXJbMF07XHJcbiAgICAgICAgICAgIGxldCBwaWNrZWQgPSB7IG86IDAsIGw6IDAsIGM6IHggfTsvL3NldCB0aGUgdHJpcGxldCA8bywgbCwgYyhuKT5cclxuXHJcbiAgICAgICAgICAgIGlmIChzZWFyY2hCdWZmZXIuaW5jbHVkZXMoeCkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBmb3VuZE1hdGNoZXMgPSBbXTsvL3N0b3JhZ2UgZm9yIHRoZSBtYXRjaGVzXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpIGluIHNlYXJjaEJ1ZmZlcikgey8vZmluZCBhbGwgdGhlIG1hdGNoZXMgaW4gc2VhcmNoIGJ1ZmZlclxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hCdWZmZXJbaV0gPT0gcGlja2VkLmMpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbmRleEluRGF0YSA9ICtzZWFyY2hTdG9wICsgK2ksLy90aGlzIGlzIHRoZSBqb2ludCBvZiB0aGUgc2VhcmNoIGFuZCBsb29rQWhlYWQgYnVmZmVyc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXhJbkxvb2tBaGVhZCA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGluZyA9IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChtYXRjaGluZykgey8va2VlcCBnZXR0aW5nIHRoZSBtYXRjaGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkLnB1c2goZGF0YVtpbmRleEluRGF0YV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoaW5nID0gbG9va0FoZWFkQnVmZmVyW2luZGV4SW5Mb29rQWhlYWQgKyBjb3VudF0gPT09IGRhdGFbaW5kZXhJbkRhdGEgKyBjb3VudF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRNYXRjaGVzLnB1c2goeyBvOiBzZWFyY2hCdWZmZXIubGVuZ3RoIC0gaSwgbDogbWF0Y2hlZC5sZW5ndGgsIGM6IGxvb2tBaGVhZEJ1ZmZlclttYXRjaGVkLmxlbmd0aF0gfSk7Ly9zYXZlIG1hdGNoZXNcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcGlja2VkID0gZm91bmRNYXRjaGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgeSBvZiBmb3VuZE1hdGNoZXMpIHsvL2dldCB0aGUgbWF0Y2ggd2l0aCBtb3N0IHNpemUgYW5kIGNsb3Nlc3QgdG8gdGhlIGxvb2tBaGVhZCBidWZmZXJcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGlja2VkLmwgPCB5LmwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGlja2VkID0geTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAocGlja2VkLmwgPT0geS5sICYmIHBpY2tlZC5vID4geS5vKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBpY2tlZCA9IHk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpICs9IHBpY2tlZC5sO1xyXG4gICAgICAgICAgICByZXR1cm4gcGlja2VkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGxpc3QgPSBbXTtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBzZWFyY2hTdG9wID0gaSAtIHBhcmFtcy5zZWFyY2hTaXplO1xyXG4gICAgICAgICAgICBpZiAoc2VhcmNoU3RvcCA8IDApIHNlYXJjaFN0b3AgPSAwO1xyXG4gICAgICAgICAgICBsb29rQWhlYWRTdG9wID0gaSArIHBhcmFtcy5sb29rQWhlYWRTaXplO1xyXG4gICAgICAgICAgICBzZWFyY2hCdWZmZXIgPSBkYXRhLnNsaWNlKHNlYXJjaFN0b3AsIGkpLnNwbGl0KCcnKTtcclxuICAgICAgICAgICAgbG9va0FoZWFkQnVmZmVyID0gZGF0YS5zbGljZShpLCBsb29rQWhlYWRTdG9wKS5zcGxpdCgnJyk7XHJcbiAgICAgICAgICAgIGxpc3QucHVzaChnZXRUcmlwbGV0KCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGxpc3Q7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5kZWNvZGVMWjEgPSAodHJpcGxldHMgPSBbeyBvOiAwLCBsOiAwLCBjOiAnJyB9XSwgcGFyYW1zID0geyB3aW5kb3dTaXplOiAwLCBzZWFyY2hTaXplOiAwLCBsb29rQWhlYWRTaXplOiAwIH0pID0+IHtcclxuICAgICAgICBsZXQgd29yZCA9ICcnO1xyXG5cclxuICAgICAgICBpZiAocGFyYW1zLndpbmRvd1NpemUgPT0gdW5kZWZpbmVkKSBwYXJhbXMud2luZG93U2l6ZSA9IHBhcmFtcy5zZWFyY2hTaXplICsgcGFyYW1zLmxvb2tBaGVhZFNpemU7Ly9pbml0IHRoZSB3aW5kb3csIHNlYXJjaCBhbmQgbG9va2FoZWFkIHNpemVzXHJcbiAgICAgICAgaWYgKHBhcmFtcy5zZWFyY2hTaXplID09IHVuZGVmaW5lZCkgcGFyYW1zLnNlYXJjaFNpemUgPSBwYXJhbXMud2luZG93U2l6ZSAtIHBhcmFtcy5sb29rQWhlYWRTaXplO1xyXG4gICAgICAgIGlmIChwYXJhbXMubG9va0FoZWFkU2l6ZSA9PSB1bmRlZmluZWQpIHBhcmFtcy5sb29rQWhlYWRTaXplID0gcGFyYW1zLndpbmRvd1NpemUgLSBwYXJhbXMuc2VhcmNoU2l6ZTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgdCBvZiB0cmlwbGV0cykgey8vZGVjb2RlIGVhY2ggdHJpcGxldFxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHQubDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB3b3JkICs9ICh3b3JkW3dvcmQubGVuZ3RoIC0gdC5vXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgd29yZCArPSAodC5jKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB3b3JkO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZW5jb2RlTFoyID0gKGRhdGEgPSAnJykgPT4gey8vTFo4Ly9MWjJcclxuICAgICAgICBsZXQgZHVwbGV0cyA9IFtdOy8vaW5pdCBkdXBsZXQgbGlzdFxyXG4gICAgICAgIGxldCBlbnRyaWVzID0gW107Ly9pbml0IGRpY3Rpb25hcnlcclxuICAgICAgICBsZXQgaSwgbGFzdEluZGV4O1xyXG5cclxuICAgICAgICBsZXQgZ2V0UmFuZ2UgPSAocmFuZ2UpID0+IHsvL2dldCB0aGUgc3ltYm9scyB3aXRoaW4gdGhlIHJhbmdlXHJcbiAgICAgICAgICAgIGxldCB2YWx1ZSA9ICcnO1xyXG4gICAgICAgICAgICBmb3IgKGxldCByIG9mIHJhbmdlKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSArPSBkYXRhW3JdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBlbmNvZGUgPSAocmFuZ2UpID0+IHtcclxuICAgICAgICAgICAgbGV0IGUgPSBnZXRSYW5nZShyYW5nZSk7Ly9nZXQgdGhlIHZhbHVlIG9mIHRoZSByYW5nZVxyXG4gICAgICAgICAgICBsZXQgaW5kZXggPSBlbnRyaWVzLmluZGV4T2YoZSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgZCA9IHsgaTogbGFzdEluZGV4LCBjOiBlW2UubGVuZ3RoIC0gMV0gfTsvL2NyZWF0ZSBkdXBsZXRcclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IC0xKSB7Ly9jdXJyZW50IGdyb3VwIG9mIHN5bWJvbHMgaXMgaW4gbm90IGluIHRoZSBkaWN0aW9uYXJ5XHJcbiAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByYW5nZS5wdXNoKCsraSk7XHJcbiAgICAgICAgICAgICAgICBsYXN0SW5kZXggPSBpbmRleCArIDE7XHJcbiAgICAgICAgICAgICAgICBkID0gZW5jb2RlKHJhbmdlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsYXN0SW5kZXggPSAwO1xyXG4gICAgICAgICAgICBkdXBsZXRzLnB1c2goZW5jb2RlKFtpXSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGR1cGxldHM7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5kZWNvZGVMWjIgPSAoZHVwbGV0cyA9IFt7IGk6IDAsIGM6ICcnIH1dKSA9PiB7XHJcbiAgICAgICAgbGV0IGVudHJpZXMgPSBbXTsvL2luaXQgZGljdGlvbmFyeVxyXG4gICAgICAgIGxldCBjO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBkIG9mIGR1cGxldHMpIHsvL2RlY29kZSBlYWNoIGR1cGxldFxyXG4gICAgICAgICAgICBjID0gJyc7XHJcbiAgICAgICAgICAgIGlmIChkLmkgIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgYyA9IGVudHJpZXNbZC5pIC0gMV07Ly9nZXQgdGhlIGNvZGUgZnJvbSB0aGUgZGljdGlvbmFyeVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGMgKz0gZC5jO1xyXG4gICAgICAgICAgICBlbnRyaWVzLnB1c2goYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZW50cmllcy5qb2luKCcnKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmVuY29kZUxaVyA9IChkYXRhID0gJycsIGluaXREaWN0aW9uYXJ5ID0gW10pID0+IHtcclxuICAgICAgICBsZXQgY29kZVdvcmQgPSBbXSwgbGFzdEluZGV4LCBpO1xyXG4gICAgICAgIGxldCBlbnRyaWVzID0gQXJyYXkuZnJvbShpbml0RGljdGlvbmFyeSk7XHJcblxyXG4gICAgICAgIGxldCBnZXRSYW5nZSA9IChyYW5nZSkgPT4gey8vIGdldCB0aGUgdmFsdWVzIHdpdGhpbiB0aGUgcmFuZ2VcclxuICAgICAgICAgICAgbGV0IHZhbHVlID0gJyc7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgb2YgcmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlICs9IGRhdGFbcl07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGVuY29kZSA9IChyYW5nZSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZSA9IGdldFJhbmdlKHJhbmdlKTtcclxuICAgICAgICAgICAgbGV0IGluZGV4ID0gZW50cmllcy5pbmRleE9mKGUpO1xyXG4gICAgICAgICAgICBpZiAoaW5kZXggPT0gLTEpIHsvL2lzIHZhbHVlIG5vdCBpbiBkaWN0aW9uYXJ5P1xyXG4gICAgICAgICAgICAgICAgZW50cmllcy5wdXNoKGUpOy8vYWRkIGl0IGFuZCBzZXQgdGhlIGNvdW50ZXIgdG8gdGhlIGxhc3QgcmVhZCBzeW1ib2xcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGkrKzsvL3NldCB0aGUgY291bnRlciB0byB0aGUgbmV4dCBzeW1ib2wgYW5kIHRyeSBlbmNvZGluZyB0aGUgcmFuZ2VcclxuICAgICAgICAgICAgICAgIHJhbmdlLnB1c2goaSk7XHJcbiAgICAgICAgICAgICAgICBsYXN0SW5kZXggPSBpbmRleCArPSAxOy8vc2V0IHRoZSBsYXN0IHJlYWQgaW5kZXgsIHRoaXMgaXMgdGhlIGNvZGVcclxuICAgICAgICAgICAgICAgIGUgPSBlbmNvZGUocmFuZ2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBsYXN0SW5kZXg7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsYXN0SW5kZXggPSAwO1xyXG4gICAgICAgICAgICBsZXQgY29kZSA9IGVuY29kZShbaV0pO1xyXG4gICAgICAgICAgICBpZiAoY29kZSAhPSB1bmRlZmluZWQpIHsvL2NvZGUgd2FzIGNyZWF0ZWRcclxuICAgICAgICAgICAgICAgIGNvZGVXb3JkLnB1c2goY29kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2RlV29yZDtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmRlY29kZUxaVyA9IChzaW5nbGV0b24gPSBbXSwgaW5pdERpY3Rpb25hcnkgPSBbXSkgPT4ge1xyXG4gICAgICAgIGxldCB3b3JkID0gJycsIGNvZGVXb3JkID0gW10sIHN0YXRlLCBjb3VudCA9IDAsIHJlYnVpbGQgPSBmYWxzZSwgYnVpbGRXaXRoID0gJycsIGksIHN0YXJ0ID0gMDtcclxuICAgICAgICBsZXQgZW50cmllcyA9IEFycmF5LmZyb20oaW5pdERpY3Rpb25hcnkpO1xyXG5cclxuICAgICAgICBsZXQgZ2V0Q29kZSA9IChyYW5nZSkgPT4gey8vZ2V0IHRoZSBjb2RlIHdpdGhpbiB0aGUgcmFuZ2VcclxuICAgICAgICAgICAgbGV0IHZhbHVlID0gJyc7XHJcbiAgICAgICAgICAgIGNvdW50ID0gMDtcclxuICAgICAgICAgICAgYnVpbGRXaXRoID0gJyc7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgb2YgcmFuZ2UpIHtcclxuICAgICAgICAgICAgICAgIGlmICh3b3JkW3JdID09IHVuZGVmaW5lZCkgey8vaXQgaXMgbm90IGNvbXBsZXRlXHJcbiAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICByZWJ1aWxkID0gdHJ1ZTsvL3NldCB0byByZWJ1aWxkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBidWlsZFdpdGggKz0gd29yZFtyXTsvL3NldCB0byByZWJ1aWxkIHdpdGggaW5jYXNlIG9mIG5vdCBjb21wbGV0ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFsdWUgKz0gd29yZFtyXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZGVjb2RlID0gKHJhbmdlID0gW10pID0+IHtcclxuICAgICAgICAgICAgbGV0IGUgPSBnZXRDb2RlKHJhbmdlKTtcclxuICAgICAgICAgICAgbGV0IGluZGV4ID0gZW50cmllcy5pbmRleE9mKGUpO1xyXG4gICAgICAgICAgICBpZiAoaW5kZXggPT0gLTEpIHsvL2lzIG5vdCBpbiBkaWN0aW9uYXJ5P1xyXG4gICAgICAgICAgICAgICAgZW50cmllcy5wdXNoKGUpO1xyXG4gICAgICAgICAgICAgICAgaS0tOy8vc2V0IHRoZSBjb3VudGVyIHRvIHRoZSBsYXN0IHN5bWJvbCByZWFkXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgICAgICByYW5nZS5wdXNoKGkpO1xyXG4gICAgICAgICAgICAgICAgZGVjb2RlKHJhbmdlKTsvL2FkZCBuZXh0IHN5bWJvbCBhbmQgZGVjb2RlIGFnYWluXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYnVpbGQgPSAoc3RhdGUpID0+IHsvL2J1aWxkIHVwIHRoZSBkaWN0aW9uYXJ5IGZyb20gdGhlIGRlY29kZWQgdmFsdWVzXHJcbiAgICAgICAgICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgd29yZC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGUgPSBkZWNvZGUoW2ldKTtcclxuICAgICAgICAgICAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PSBzdGF0ZSkgey8vc3RvcCBhdCB0aGUgY3VycmVudCBkZWNvZGluZyBwb2ludFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDEgLSBjb3VudDsvL3NldCBuZXh0IHN0YXJ0aW5nIHBvaW50IGF0IHRoZSBjdXJyZW50IHN0b3BcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgcyBvZiBzaW5nbGV0b24pIHtcclxuICAgICAgICAgICAgbGV0IGUgPSBlbnRyaWVzW3MgLSAxXTtcclxuICAgICAgICAgICAgaWYgKGUgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBidWlsZChzKTsvL2J1aWxkIHRoZSBkaWN0aW9uYXJ5XHJcbiAgICAgICAgICAgICAgICBlID0gZW50cmllc1tzIC0gMV07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvZGVXb3JkLnB1c2goZSk7XHJcbiAgICAgICAgICAgIHdvcmQgPSBjb2RlV29yZC5qb2luKCcnKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyZWJ1aWxkKSB7Ly9yZWJ1aWxkIHRoZSBsYXN0IGVudHJ5IGluIHRoZSBkaWN0aW9uYXJ5IFxyXG4gICAgICAgICAgICAgICAgcmVidWlsZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7Ly9rZWVwIGFkZCBpdGVtcyB0byB0aGUgYnVpbGR3aXRoIHRvIHRoZSBidWlsZHdpdGggdW50aWwgaXQgaXMgY29tcGxldGVcclxuICAgICAgICAgICAgICAgICAgICBidWlsZFdpdGggKz0gYnVpbGRXaXRoW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29kZVdvcmQucG9wKCk7Ly9zZXQgbGFzdCBidWlsdCBhbmQgbGFzdCBkZWNvZGVkIHRvIHRoZSBuZXcgYnVpbGRcclxuICAgICAgICAgICAgICAgIGNvZGVXb3JkLnB1c2goYnVpbGRXaXRoKTtcclxuICAgICAgICAgICAgICAgIGVudHJpZXMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICBlbnRyaWVzLnB1c2goYnVpbGRXaXRoKTtcclxuICAgICAgICAgICAgICAgIHN0YXJ0ICs9IGNvdW50Oy8vc2V0IHRoZSBuZXh0IGJ1aWxkIHN0YXJ0aW5nIHBvaW50XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB3b3JkO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzZWxmO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbXByZXNzaW9uO1xyXG4iLCJjb25zdCBBcnJheUxpYnJhcnkgPSByZXF1aXJlKCcuL0FycmF5TGlicmFyeScpO1xyXG5sZXQgYXJyYXlMaWJyYXJ5ID0gQXJyYXlMaWJyYXJ5KCk7XHJcblxyXG5mdW5jdGlvbiBNYXRoc0xpYnJhcnkoKSB7XHJcbiAgICBsZXQgc2VsZiA9IHt9O1xyXG5cclxuICAgIHNlbGYucGxhY2VVbml0ID0gKG51bSwgdmFsdWUsIGNvdW50KSA9PiB7XHJcbiAgICAgICAgbnVtID0gTWF0aC5mbG9vcihudW0pLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgdmFsdWUgPSB2YWx1ZSB8fCBudW1bMF07XHJcbiAgICAgICAgY291bnQgPSBjb3VudCB8fCAwO1xyXG5cclxuICAgICAgICBsZXQgcG9zID0gLTE7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW0ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKG51bVtpXSA9PSB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvdW50ID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBwb3MgPSBpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY291bnQtLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmIChwb3MgIT0gLTEpIHBvcyA9IDEwICoqIChudW0ubGVuZ3RoIC0gcG9zIC0gMSk7XHJcbiAgICAgICAgcmV0dXJuIHBvcztcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnJvdW5kID0gKHBhcmFtcykgPT4ge1xyXG4gICAgICAgIHBhcmFtcy5kaXIgPSBwYXJhbXMuZGlyIHx8ICdyb3VuZCc7XHJcbiAgICAgICAgcGFyYW1zLnRvID0gcGFyYW1zLnRvIHx8IDE7XHJcblxyXG4gICAgICAgIGxldCB2YWx1ZSA9IE1hdGhbcGFyYW1zLmRpcl0ocGFyYW1zLm51bSAvIHBhcmFtcy50bykgKiBwYXJhbXMudG87XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYudmFyaWFuY2UgPSAoZGF0YSkgPT4ge1xyXG4gICAgICAgIGxldCBtZWFuID0gc2VsZi5tZWFuKGRhdGEpO1xyXG4gICAgICAgIGxldCB2YXJpYW5jZSA9IDA7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhcmlhbmNlICs9IChkYXRhW2ldIC0gbWVhbikgKiogMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhcmlhbmNlIC8gZGF0YS5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5zdGFuZGFyZERldmlhdGlvbiA9IChkYXRhKSA9PiB7XHJcbiAgICAgICAgbGV0IHZhcmlhbmNlID0gc2VsZi52YXJpYW5jZShkYXRhKTtcclxuICAgICAgICBsZXQgc3RkID0gTWF0aC5zcXJ0KHZhcmlhbmNlKTtcclxuICAgICAgICByZXR1cm4gc3RkO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYucmFuZ2UgPSAoZGF0YSkgPT4ge1xyXG4gICAgICAgIGxldCBtaW4gPSBNYXRoLm1pbiguLi5kYXRhKTtcclxuICAgICAgICBsZXQgbWF4ID0gTWF0aC5tYXgoLi4uZGF0YSk7XHJcblxyXG4gICAgICAgIGxldCByYW5nZSA9IG1heCAtIG1pbjtcclxuICAgICAgICByZXR1cm4gcmFuZ2U7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5tZWFuID0gKGRhdGEpID0+IHtcclxuICAgICAgICBsZXQgc3VtID0gc2VsZi5zdW0oZGF0YSk7XHJcblxyXG4gICAgICAgIGxldCBtZWFuID0gc3VtIC8gZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgcmV0dXJuIG1lYW47XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5tZWRpYW4gPSAoZGF0YSkgPT4ge1xyXG4gICAgICAgIGxldCBsZW5ndGggPSBkYXRhLmxlbmd0aDtcclxuICAgICAgICBsZXQgbWVkaWFuO1xyXG4gICAgICAgIGlmIChsZW5ndGggJSAyID09IDApIHtcclxuICAgICAgICAgICAgbWVkaWFuID0gKGRhdGFbKGxlbmd0aCAvIDIpIC0gMV0gKyBkYXRhW2xlbmd0aCAvIDJdKSAvIDI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbWVkaWFuID0gZGF0YVtNYXRoLmZsb29yKGxlbmd0aCAvIDIpXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtZWRpYW47XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5tb2RlID0gKGRhdGEpID0+IHtcclxuICAgICAgICBsZXQgcmVjb3JkID0ge307XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChyZWNvcmRbZGF0YVtpXV0gIT0gdW5kZWZpbmVkKSByZWNvcmRbZGF0YVtpXV0rKztcclxuICAgICAgICAgICAgZWxzZSByZWNvcmRbZGF0YVtpXV0gPSBpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1heCA9IE1hdGgubWF4KC4uLk9iamVjdC52YWx1ZShyZWNvcmQpKTtcclxuICAgICAgICBsZXQgbW9kZTtcclxuICAgICAgICBmb3IgKGxldCBpIGluIHJlY29yZCkge1xyXG4gICAgICAgICAgICBpZiAocmVjb3JkW2ldID09IG1heCkge1xyXG4gICAgICAgICAgICAgICAgbW9kZSA9IGk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1vZGU7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5ub3JtYWxpemVEYXRhID0gKGRhdGEpID0+IHtcclxuICAgICAgICBkYXRhLnNvcnQoKGEsIGIpID0+IHsgcmV0dXJuIGEgLSBiIH0pO1xyXG4gICAgICAgIHZhciBtYXggPSBkYXRhW2RhdGEubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgdmFyIG1pbiA9IGRhdGFbMF07XHJcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbm9ybWFsaXplZC5wdXNoKChkYXRhW2ldIC0gbWluKSAvIChtYXggLSBtaW4pKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5taW5pbXVpbVN3YXBzID0gKGFyciwgb3JkZXIpID0+IHtcclxuICAgICAgICB2YXIgc3dhcCA9IDA7XHJcbiAgICAgICAgdmFyIGNoZWNrZWQgPSBbXTtcclxuICAgICAgICB2YXIgY291bnRlciA9IDA7XHJcbiAgICAgICAgdmFyIGZpbmFsID0gWy4uLmFycl0uc29ydCgoYSwgYikgPT4geyByZXR1cm4gYSAtIGIgfSk7XHJcbiAgICAgICAgaWYgKG9yZGVyID09IC0xKSBmaW5hbCA9IGZpbmFsLnJldmVyc2UoKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBhcnJbaV07XHJcbiAgICAgICAgICAgIGlmIChpID09IGVsZW1lbnQgfHwgY2hlY2tlZFtpXSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBjb3VudGVyID0gMDtcclxuXHJcbiAgICAgICAgICAgIGlmIChhcnJbMF0gPT0gMCkgZWxlbWVudCA9IGk7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAoIWNoZWNrZWRbaV0pIHtcclxuICAgICAgICAgICAgICAgIGNoZWNrZWRbaV0gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaSA9IGZpbmFsLmluZGV4T2YoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gYXJyW2ldO1xyXG4gICAgICAgICAgICAgICAgY291bnRlcisrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjb3VudGVyICE9IDApIHtcclxuICAgICAgICAgICAgICAgIHN3YXAgKz0gY291bnRlciAtIDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHN3YXA7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5wcmltZUZhY3Rvcml6ZSA9IChudW1iZXIpID0+IHtcclxuICAgICAgICBpZiAodHlwZW9mIG51bWJlciAhPSBcIm51bWJlclwiKSByZXR1cm4gW107XHJcbiAgICAgICAgbnVtYmVyID0gTWF0aC5hYnMocGFyc2VJbnQobnVtYmVyKSk7XHJcbiAgICAgICAgaWYgKG51bWJlciA9PSAxIHx8IG51bWJlciA9PSAwKSByZXR1cm4gW10vLzEgYW5kIDAgaGFzIG5vIHByaW1lc1xyXG4gICAgICAgIHZhciBkaXZpZGVyID0gMjtcclxuICAgICAgICB2YXIgZGl2aWRlbmQ7XHJcbiAgICAgICAgdmFyIGZhY3RvcnMgPSBbXTtcclxuICAgICAgICB3aGlsZSAobnVtYmVyICE9IDEpIHtcclxuICAgICAgICAgICAgZGl2aWRlbmQgPSBudW1iZXIgLyBkaXZpZGVyO1xyXG4gICAgICAgICAgICBpZiAoZGl2aWRlbmQudG9TdHJpbmcoKS5pbmRleE9mKCcuJykgIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGRpdmlkZXIrK1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbnVtYmVyID0gZGl2aWRlbmQ7XHJcbiAgICAgICAgICAgIGZhY3RvcnMucHVzaChkaXZpZGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhY3RvcnM7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5sY2YgPSAobnVtYmVycykgPT4ge1xyXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShudW1iZXJzKSkgcmV0dXJuIFtdO1xyXG4gICAgICAgIHZhciBmYWN0b3JzID0gW107XHJcbiAgICAgICAgdmFyIGNvbW1vbkZhY3RvcnMgPSBbXTtcclxuICAgICAgICB2YXIgdmFsdWUgPSAxO1xyXG4gICAgICAgIGZvciAodmFyIG51bWJlciBvZiBudW1iZXJzKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbnVtYmVyICE9IFwibnVtYmVyXCIpIHJldHVybiBbXTtcclxuICAgICAgICAgICAgZmFjdG9ycy5wdXNoKHNlbGYucHJpbWVGYWN0b3JpemUobnVtYmVyKSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1haW46XHJcbiAgICAgICAgZm9yICh2YXIgZmFjdG9yIG9mIGZhY3RvcnNbMF0pIHtcclxuICAgICAgICAgICAgaWYgKGNvbW1vbkZhY3RvcnMuaW5kZXhPZihmYWN0b3IpID09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIG9mIGZhY3RvcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaS5pbmRleE9mKGZhY3RvcikgPT0gLTEpIGNvbnRpbnVlIG1haW47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb21tb25GYWN0b3JzLnB1c2goZmFjdG9yKTtcclxuICAgICAgICAgICAgICAgIHZhbHVlICo9IGZhY3RvcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5zdHJpcEludGVnZXIgPSAobnVtYmVyKSA9PiB7XHJcbiAgICAgICAgbnVtYmVyID0gbnVtYmVyLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgbnVtYmVyID0gKG51bWJlci5pbmRleE9mKCcuJykgPT0gLTEpID8gbnVtYmVyIDogbnVtYmVyLnNsaWNlKDAsIG51bWJlci5pbmRleE9mKCcuJykpO1xyXG4gICAgICAgIHJldHVybiBudW1iZXI7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5zdHJpcEZyYWN0aW9uID0gKG51bWJlcikgPT4ge1xyXG4gICAgICAgIG51bWJlciA9IG51bWJlci50b1N0cmluZygpO1xyXG4gICAgICAgIG51bWJlciA9IChudW1iZXIuaW5kZXhPZignLicpID09IC0xKSA/ICcwJyA6IG51bWJlci5zbGljZShudW1iZXIuaW5kZXhPZignLicpICsgMSk7XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmNoYW5nZUJhc2UgPSAobnVtYmVyLCBmcm9tLCB0bykgPT4ge1xyXG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KG51bWJlciwgZnJvbSkudG9TdHJpbmcodG8pO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYubWF4ID0gKGFycmF5KSA9PiB7XHJcbiAgICAgICAgdmFyIG1heCA9IGFycmF5WzBdO1xyXG4gICAgICAgIGFycmF5TGlicmFyeS5lYWNoKGFycmF5LCB2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChtYXggPCB2YWx1ZSkgbWF4ID0gdmFsdWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG1heDtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLm1pbiA9IChhcnJheSkgPT4ge1xyXG4gICAgICAgIHZhciBtYXggPSBhcnJheVswXTtcclxuICAgICAgICBhcnJheUxpYnJhcnkuZWFjaChhcnJheSwgdmFsdWUgPT4ge1xyXG4gICAgICAgICAgICBpZiAobWF4ID4gdmFsdWUpIG1heCA9IHZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBtYXg7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5zdW0gPSAoYXJyYXkpID0+IHtcclxuICAgICAgICAvL2ZvciBmaW5kaW5nIHRoZSBzdW0gb2Ygb25lIGxheWVyIGFycmF5XHJcbiAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaXNOYU4oTWF0aC5mbG9vcihhcnJheVtpXSkpKSB7XHJcbiAgICAgICAgICAgICAgICBzdW0gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHN1bSArPSBhcnJheVtpXSAvIDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gc3VtO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYucHJvZHVjdCA9IChhcnJheSkgPT4ge1xyXG4gICAgICAgIC8vZm9yIGZpbmRpbmcgdGhlIHN1bSBvZiBvbmUgbGF5ZXIgYXJyYXlcclxuICAgICAgICBsZXQgcHJvZHVjdCA9IDE7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaXNOYU4oTWF0aC5mbG9vcihhcnJheVtpXSkpKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBwcm9kdWN0ICo9IGFycmF5W2ldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHByb2R1Y3Q7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5hZGQgPSAoLi4uYXJyYXlzKSA9PiB7XHJcbiAgICAgICAgbGV0IG5ld0FycmF5ID0gW107XHJcbiAgICAgICAgYXJyYXlzWzBdLmZvckVhY2goKHZhbHVlLCBwb3NpdGlvbikgPT4ge1xyXG4gICAgICAgICAgICBhcnJheXMuZm9yRWFjaCgoYXJyYXksIGxvY2F0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24gIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbGVtZW50ID0gQXJyYXkuaXNBcnJheShhcnJheSkgPyBhcnJheVtwb3NpdGlvbl0gOiBhcnJheTtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBpc05hTihlbGVtZW50KSA9PSB0cnVlID8gMCA6IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIG5ld0FycmF5LnB1c2godmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBuZXdBcnJheTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnN1YiA9ICguLi5hcnJheXMpID0+IHtcclxuICAgICAgICBsZXQgbmV3QXJyYXkgPSBbXTtcclxuICAgICAgICBhcnJheXNbMF0uZm9yRWFjaCgodmFsdWUsIHBvc2l0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgIGFycmF5cy5mb3JFYWNoKChhcnJheSwgbG9jYXRpb24pID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChsb2NhdGlvbiAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQgPSBBcnJheS5pc0FycmF5KGFycmF5KSA/IGFycmF5W3Bvc2l0aW9uXSA6IGFycmF5O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlIC09IGlzTmFOKGVsZW1lbnQpID09IHRydWUgPyAwIDogZWxlbWVudDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgbmV3QXJyYXkucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYubXVsID0gKC4uLmFycmF5cykgPT4ge1xyXG4gICAgICAgIGxldCBuZXdBcnJheSA9IFtdO1xyXG4gICAgICAgIGFycmF5c1swXS5mb3JFYWNoKCh2YWx1ZSwgcG9zaXRpb24pID0+IHtcclxuICAgICAgICAgICAgYXJyYXlzLmZvckVhY2goKGFycmF5LCBsb2NhdGlvbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudCA9IEFycmF5LmlzQXJyYXkoYXJyYXkpID8gYXJyYXlbcG9zaXRpb25dIDogYXJyYXk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgKj0gaXNOYU4oZWxlbWVudCkgPT0gdHJ1ZSA/IDAgOiBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICBuZXdBcnJheS5wdXNoKHZhbHVlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gbmV3QXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5kaXZpZGUgPSAoLi4uYXJyYXlzKSA9PiB7XHJcbiAgICAgICAgbGV0IG5ld0FycmF5ID0gW107XHJcbiAgICAgICAgYXJyYXlzWzBdLmZvckVhY2goKHZhbHVlLCBwb3NpdGlvbikgPT4ge1xyXG4gICAgICAgICAgICBhcnJheXMuZm9yRWFjaCgoYXJyYXksIGxvY2F0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24gIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbGVtZW50ID0gQXJyYXkuaXNBcnJheShhcnJheSkgPyBhcnJheVtwb3NpdGlvbl0gOiBhcnJheTtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSAvPSBpc05hTihlbGVtZW50KSA9PSB0cnVlID8gMCA6IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIG5ld0FycmF5LnB1c2godmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBuZXdBcnJheTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmFicyA9IChhcnJheSkgPT4ge1xyXG4gICAgICAgIHJldHVybiBhcnJheUxpYnJhcnkuZWFjaChhcnJheSwgdmFsdWUgPT4ge1xyXG4gICAgICAgICAgICB2YWx1ZSA9IGlzTmFOKHZhbHVlKSA9PSB0cnVlID8gMCA6IHZhbHVlO1xyXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5hYnModmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzZWxmO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1hdGhzTGlicmFyeTsiLCJjb25zdCBBcnJheUxpYnJhcnkgPSByZXF1aXJlKCcuL0FycmF5TGlicmFyeScpO1xyXG5sZXQgYXJyYXlMaWJyYXJ5ID0gQXJyYXlMaWJyYXJ5KCk7XHJcblxyXG5mdW5jdGlvbiBPYmplY3RzTGlicmFyeSgpIHtcclxuICAgIGxldCBzZWxmID0ge307XHJcblxyXG4gICAgc2VsZi5zaXplID0gKG9iamVjdCkgPT4ge1xyXG4gICAgICAgIGxldCBieXRlcyA9IDA7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QgPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgYnl0ZXMgKz0gb2JqZWN0Lmxlbmd0aCAqIDI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QgPT0gJ251bWJlcicpIHtcclxuICAgICAgICAgICAgYnl0ZXMgKz0gODtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdCA9PSAnYm9vbGVhbicpIHtcclxuICAgICAgICAgICAgYnl0ZXMgKz0gNDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdCA9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpIGluIG9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgYnl0ZXMgKz0gcm91Z2hPYmplY3RTaXplKG9iamVjdFtpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBieXRlcztcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmV4dHJhY3RGcm9tSnNvbkFycmF5ID0gKG1ldGEsIHNvdXJjZSkgPT4gey8vZXh0cmFjdCBhIGJsdWVwcmludCBvZiBkYXRhIGZyb20gYSBKc29uQXJyYXlcclxuICAgICAgICBsZXQga2V5cyA9IE9iamVjdC5rZXlzKG1ldGEpOy8vZ2V0IHRoZSBrZXlzXHJcbiAgICAgICAgbGV0IHZhbHVlcyA9IE9iamVjdC52YWx1ZXMobWV0YSk7Ly9nZXQgdGhlIHZhbHVlc1xyXG5cclxuICAgICAgICBsZXQgZVNvdXJjZSA9IFtdO1xyXG4gICAgICAgIGlmIChzb3VyY2UgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IG9iaiBvZiBzb3VyY2UpIHsvL2VhY2ggaXRlbSBpbiBzb3VyY2VcclxuICAgICAgICAgICAgICAgIGxldCBvYmplY3QgPSB7fTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgaW4ga2V5cykgey8vZWFjaCBibHVlcHJpbnQga2V5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFycmF5TGlicmFyeS5jb250YWlucyhPYmplY3Qua2V5cyhvYmopLCB2YWx1ZXNbaV0pKSB7Ly9zb3VyY2UgaXRlbSBoYXMgYmx1ZXByaW50IHZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdFtrZXlzW2ldXSA9IG9ialt2YWx1ZXNbaV1dOy8vc3RvcmUgYWNjb3JkaW5nIHRvIGJsdWVwcmludFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVTb3VyY2UucHVzaChvYmplY3QpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBlU291cmNlO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZmluZCA9IChvYmosIGNhbGxiYWNrKSA9PiB7Ly9oaWdoZXIgb3JkZXIgT2JqZWN0IGZ1bmN0aW9uIGZvciB0aGUgZmlyc3QgaXRlbSBpbiBhbiBPYmplY3QgdGhhdCBtYXRjaFxyXG4gICAgICAgIGZvciAobGV0IGkgaW4gb2JqKSB7XHJcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayhvYmpbaV0pID09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvYmpbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5maW5kQWxsID0gKG9iaiwgY2FsbGJhY2spID0+IHsvL2hpZ2hlciBvcmRlciBPYmplY3QgZnVuY3Rpb24gZm9yIGFsbCBpdGVtcyBpbiBhbiBPYmplY3QgdGhhdCBtYXRjaFxyXG4gICAgICAgIGxldCB2YWx1ZXMgPSB7fTtcclxuICAgICAgICBmb3IgKGxldCBpIGluIG9iaikge1xyXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sob2JqW2ldKSA9PSB0cnVlKVxyXG4gICAgICAgICAgICAgICAgdmFsdWVzW2ldID0gb2JqW2ldO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLm1ha2VJdGVyYWJsZSA9IChvYmopID0+IHsvL21ha2UgYW4gb2JqZWN0IHRvIHVzZSAnZm9yIGluJ1xyXG4gICAgICAgIG9ialtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgbGV0IHByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhvYmopO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBwIG9mIHByb3BlcnRpZXMpIHtcclxuICAgICAgICAgICAgICAgIHlpZWxkIHRoaXNbcF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLm1heCA9IChvYmplY3QpID0+IHtcclxuICAgICAgICBvYmplY3QgPSBzZWxmLnNvcnQob2JqZWN0LCB7IHZhbHVlOiB0cnVlIH0pO1xyXG4gICAgICAgIHJldHVybiBzZWxmLmdldEluZGV4KG9iamVjdCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5taW4gPSAob2JqZWN0KSA9PiB7Ly9nZXQgdGhlIG1pbmludW0gaW4gaXRlbSBpbiBhbiBPYmplY3RcclxuICAgICAgICBvYmplY3QgPSBzZWxmLnNvcnQob2JqZWN0LCB7IHZhbHVlOiBmYWxzZSB9KTtcclxuICAgICAgICByZXR1cm4gc2VsZi5nZXRJbmRleChvYmplY3QpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYub25DaGFuZ2VkID0gKG9iaiwgY2FsbGJhY2spID0+IHsvL21ha2UgYW4gb2JqZWN0IGxpc3RlbiB0byBjaGFuZ2VzIG9mIGl0J3MgaXRlbXNcclxuICAgICAgICBjb25zdCBoYW5kbGVyID0ge1xyXG4gICAgICAgICAgICBnZXQodGFyZ2V0LCBwcm9wZXJ0eSwgcmVjZWl2ZXIpIHsvL3doZW4gYW4gSXRlbSBpcyBmZXRjaGVkXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJveHkodGFyZ2V0W3Byb3BlcnR5XSwgaGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5nZXQodGFyZ2V0LCBwcm9wZXJ0eSwgcmVjZWl2ZXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5LCBkZXNjcmlwdG9yKSB7Ly93aGVuIGFuIEl0ZW0gaXMgYWRkZWRcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRhcmdldCwgcHJvcGVydHkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wZXJ0eSwgZGVzY3JpcHRvcik7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHkpIHsvL3doZW4gYW4gSXRlbSBpcyByZW1vdmVkXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0YXJnZXQsIHByb3BlcnR5KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eShvYmosIGhhbmRsZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYudG9BcnJheSA9IChvYmplY3QsIG5hbWVkKSA9PiB7Ly90dXJuIGFuIE9iamVjdCBpbnRvIGFuIEFycmF5XHJcbiAgICAgICAgdmFyIGFycmF5ID0gW107XHJcbiAgICAgICAgT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoKGtleSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAobmFtZWQgPT0gdHJ1ZSkgey8vbWFrZSBpdCBuYW1lZFxyXG4gICAgICAgICAgICAgICAgYXJyYXlba2V5XSA9IG9iamVjdFtrZXldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYXJyYXkucHVzaChvYmplY3Rba2V5XSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gYXJyYXk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi52YWx1ZU9mT2JqZWN0QXJyYXkgPSAoYXJyYXksIG5hbWUpID0+IHsvL2dldCBhbGwgdGhlIGtleXMgaW4gYSBKc29uQXJyYXkgb2YgaXRlbSBuYW1lXHJcbiAgICAgICAgdmFyIG5ld0FycmF5ID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBhcnJheSkge1xyXG4gICAgICAgICAgICBuZXdBcnJheS5wdXNoKGFycmF5W2ldW25hbWVdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ld0FycmF5O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYua2V5c09mT2JqZWN0QXJyYXkgPSAoYXJyYXkgPSBbXSkgPT4gey8vZ2V0IGFsbCB0aGUga2V5cyBpbiBhIEpzb25BcnJheVxyXG4gICAgICAgIHZhciBuZXdBcnJheSA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gYXJyYXkpIHtcclxuICAgICAgICAgICAgbmV3QXJyYXkgPSBuZXdBcnJheS5jb25jYXQoT2JqZWN0LmtleXMoYXJyYXlbaV0pKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFycmF5TGlicmFyeS50b1NldChuZXdBcnJheSk7Ly9yZW1vdmUgZHVwbGljYXRlc1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYub2JqZWN0T2ZPYmplY3RBcnJheSA9IChhcnJheSA9IFtdLCBpZCwgbmFtZSkgPT4gey8vc3RyaXAgW2tleSB2YWx1ZV0gZnJvbSBhIEpzb25BcnJheVxyXG4gICAgICAgIHZhciBvYmplY3QgPSB7fTtcclxuICAgICAgICBmb3IgKGxldCBpIGluIGFycmF5KSB7XHJcbiAgICAgICAgICAgIG9iamVjdFthcnJheVtpXVtpZF1dID0gYXJyYXlbaV1bbmFtZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBvYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5jb3B5ID0gKGZyb20sIHRvKSA9PiB7Ly9jbG9uZSBhbiBPYmplY3RcclxuICAgICAgICBPYmplY3Qua2V5cyhmcm9tKS5tYXAoa2V5ID0+IHtcclxuICAgICAgICAgICAgdG9ba2V5XSA9IGZyb21ba2V5XTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmZvckVhY2ggPSAob2JqZWN0LCBjYWxsYmFjaykgPT4gey8vaGlnaGVyIG9yZGVyIGZ1bmN0aW9uIGZvciBPYmplY3QgbGl0ZXJhbFxyXG4gICAgICAgIGZvciAobGV0IGtleSBpbiBvYmplY3QpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sob2JqZWN0W2tleV0sIGtleSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7Ly9oaWdoZXIgb3JkZXIgZnVuY3Rpb24gZm9yIE9iamVjdCBsaXRlcmFsXHJcbiAgICAgICAgbGV0IG5ld09iamVjdCA9IHt9O1xyXG4gICAgICAgIGZvciAobGV0IGtleSBpbiBvYmplY3QpIHtcclxuICAgICAgICAgICAgbmV3T2JqZWN0W2tleV0gPSBjYWxsYmFjayhvYmplY3Rba2V5XSwga2V5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ld09iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmlzU3ViT2JqZWN0ID0gKGRhdGEsIHNhbXBsZSkgPT4gey8vY2hlY2sgaWYgYW4gb2JqZWN0IGlzIGEgc3ViLU9iamVjdCBvZiBhbm90aGVyIE9iamVjdFxyXG4gICAgICAgIGxldCBmbGFnO1xyXG4gICAgICAgIGZvciAobGV0IG5hbWUgaW4gc2FtcGxlKSB7XHJcbiAgICAgICAgICAgIGZsYWcgPSBKU09OLnN0cmluZ2lmeShzYW1wbGVbbmFtZV0pID09IEpTT04uc3RyaW5naWZ5KGRhdGFbbmFtZV0pOy8vY29udmVydCB0byBzdHJpbmcgYW5kIGNvbXBhcmVcclxuICAgICAgICAgICAgaWYgKCFmbGFnKSBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmbGFnO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuZ2V0U3ViT2JqZWN0ID0gKGRhdGEgPSBbXSwgc2FtcGxlID0ge30pID0+IHsvL2dldCBtYXRjaGVkIGl0ZW1zIGluIE9iamVjdFxyXG4gICAgICAgIGxldCBtYXRjaGVkID0gW10sIGZsYWcgPSB0cnVlO1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gZGF0YSkge1xyXG4gICAgICAgICAgICBmbGFnID0gc2VsZi5pc1N1Yk9iamVjdChkYXRhW2ldLCBzYW1wbGUpOy8vY2hlY2sgZWFjaCBvYmplY3RcclxuICAgICAgICAgICAgaWYgKCFmbGFnKSBjb250aW51ZTtcclxuICAgICAgICAgICAgbWF0Y2hlZC5wdXNoKGRhdGFbaV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1hdGNoZWRcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnNvcnQgPSAoZGF0YSA9IHt9LCBwYXJhbXMgPSB7IGl0ZW1zOiBbXSwgZGVzY2VuZDogZmFsc2UsIGtleTogZmFsc2UsIHZhbHVlOiBmYWxzZSB9KSA9PiB7Ly9zb3J0IGFuIE9iamVjdCBiYXNlZCBvbltrZXksIHZhbHVlIG9yIGl0ZW1zXVxyXG4gICAgICAgIHBhcmFtcy5pdGVtID0gcGFyYW1zLml0ZW0gfHwgJyc7XHJcbiAgICAgICAgcGFyYW1zLmRlc2NlbmQgPSBwYXJhbXMuZGVzY2VuZCB8fCBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IHNvcnRlZCA9IFtdLCBuRGF0YSA9IHt9O1xyXG4gICAgICAgIGZvciAobGV0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhkYXRhKSkge1xyXG4gICAgICAgICAgICBzb3J0ZWQucHVzaCh7IGtleSwgdmFsdWUgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGFyYW1zLmtleSAhPSB1bmRlZmluZWQpIHsvL3NvcnQgd2l0aCBrZXlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0hlbGxvJyk7XHJcbiAgICAgICAgICAgIHNvcnRlZC5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSAoYS5rZXkgPj0gYi5rZXkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5rZXkgPT0gdHJ1ZSkgdmFsdWUgPSAhdmFsdWU7Ly9kZXNjZW5kXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy52YWx1ZSAhPSB1bmRlZmluZWQpIHsvL3NvcnQgd2l0aCB2YWx1ZVxyXG4gICAgICAgICAgICBzb3J0ZWQuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gKGEudmFsdWUgPj0gYi52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLnZhbHVlID09IHRydWUpIHZhbHVlID0gIXZhbHVlOy8vZGVzY2VuZFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwYXJhbXMuaXRlbXMgIT0gdW5kZWZpbmVkKSB7Ly9zb3J0IHdpdGggaXRlbXNcclxuICAgICAgICAgICAgc29ydGVkLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBncmVhdGVyID0gMCwgbGVzc2VyID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGl0ZW0gb2YgcGFyYW1zLml0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGEudmFsdWVbaXRlbV0gPj0gYi52YWx1ZVtpdGVtXSkgZ3JlYXRlcisrXHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBsZXNzZXIrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IGdyZWF0ZXIgPj0gbGVzc2VyO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5kZXNjZW5kID09IHRydWUpIHZhbHVlID0gIXZhbHVlOy8vZGVzY2VuZCBpdGVtc1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHsga2V5LCB2YWx1ZSB9IG9mIHNvcnRlZCkge1xyXG4gICAgICAgICAgICBuRGF0YVtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbkRhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5yZXZlcnNlID0gKGRhdGEgPSB7fSkgPT4gey8vcmV2ZXJzZSBhbiBPYmplY3RcclxuICAgICAgICBsZXQga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpLnJldmVyc2UoKTtcclxuICAgICAgICBsZXQgbmV3T2JqZWN0ID0ge307XHJcbiAgICAgICAgZm9yIChsZXQgaSBvZiBrZXlzKSB7XHJcbiAgICAgICAgICAgIG5ld09iamVjdFtpXSA9IGRhdGFbaV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXdPYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRJbmRleCA9IChkYXRhID0ge30pID0+IHsvL2dldCB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgT2JqZWN0XHJcbiAgICAgICAgbGV0IGtleSA9IE9iamVjdC5rZXlzKGRhdGEpLnNoaWZ0KCk7XHJcbiAgICAgICAgbGV0IHZhbHVlID0gZGF0YVtrZXldO1xyXG4gICAgICAgIHJldHVybiB7IGtleSwgdmFsdWUgfTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmdldExhc3QgPSAoZGF0YSA9IHt9KSA9PiB7Ly9nZXQgdGhlIGxhc3QgaXRlbSBpbiB0aGUgT2JqZWN0XHJcbiAgICAgICAgbGV0IGtleSA9IE9iamVjdC5rZXlzKGRhdGEpLnBvcCgpO1xyXG4gICAgICAgIGxldCB2YWx1ZSA9IGRhdGFba2V5XTtcclxuICAgICAgICByZXR1cm4geyBrZXksIHZhbHVlIH07XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRBdCA9IChkYXRhID0ge30sIGluZGV4KSA9PiB7Ly9nZXQgdGhlIGl0ZW0gb2YgaW5kZXggaW4gdGhlIE9iamVjdFxyXG4gICAgICAgIGxldCBrZXkgPSBPYmplY3Qua2V5cyhkYXRhKVtpbmRleF07XHJcbiAgICAgICAgbGV0IHZhbHVlID0gZGF0YVtrZXldO1xyXG4gICAgICAgIHJldHVybiB7IGtleSwgdmFsdWUgfTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmtleU9mID0gKGRhdGEgPSB7fSwgaXRlbSkgPT4gey8vZ2V0IHRoZSBmaXJzdCBvY2N1cnJhbmNlIG9mIGFuIGl0ZW0gaW4gYW4gT2JqZWN0XHJcbiAgICAgICAgbGV0IGluZGV4ID0gLTE7XHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBkYXRhKSB7XHJcbiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShkYXRhW2ldKSA9PSBKU09OLnN0cmluZ2lmeShpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbmRleDtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmxhc3RLZXlPZiA9IChkYXRhID0ge30sIGl0ZW0pID0+IHsvL2dldCB0aGUgbGFzdCBvY2N1cnJhbmNlIG9mIGFuIGl0ZW0gaW4gYW4gb2JqZWN0XHJcbiAgICAgICAgbGV0IGluZGV4ID0gLTE7XHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiBkYXRhKSB7XHJcbiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShkYXRhW2ldKSA9PSBKU09OLnN0cmluZ2lmeShpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5pbmNsdWRlcyA9IChkYXRhID0ge30sIGl0ZW0pID0+IHsvL2NoZWNrIGlmIGFuIE9iamVjdCBoYXMgYW4gaXRlbVxyXG4gICAgICAgIHJldHVybiBzZWxmLmtleU9mKGRhdGEsIGl0ZW0pICE9IC0xO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHNlbGY7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0c0xpYnJhcnk7IiwiY29uc3QgRnVuYyA9IHJlcXVpcmUoJy4vLi4vY2xhc3Nlcy9GdW5jJyk7XHJcbmxldCBmdW5jID0gbmV3IEZ1bmMoKTtcclxuXHJcbmZ1bmN0aW9uIFNoYWRvdyhlbGVtZW50KSB7XHJcbiAgICBsZXQgc2VsZiA9IHsgZWxlbWVudDogZWxlbWVudC5jbG9uZU5vZGUodHJ1ZSksIGNoaWxkcmVuOiBbZWxlbWVudF0sIHByb3BlcnRpZXM6IHt9LCBjaGlsZFByb3BlcnRpZXM6IHt9IH07XHJcblxyXG4gICAgc2VsZi51cGRhdGVOZXdFbGVtZW50Q2hpbGRQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKGVsZW1lbnQsIHByb3BlcnR5Q29sbGVjdGlvbiA9IHt9KSB7XHJcbiAgICAgICAgbGV0IGNoaWxkcmVuLCBwb3NpdGlvbnM7XHJcbiAgICAgICAgZm9yIChsZXQgaWRlbnRpZmllciBpbiBwcm9wZXJ0eUNvbGxlY3Rpb24pIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY2hpbGRQcm9wZXJ0aWVzIG9mIHByb3BlcnR5Q29sbGVjdGlvbltpZGVudGlmaWVyXSkge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb25zID0gdGhpcy5zZXRQb3NpdGlvbnMoY2hpbGRQcm9wZXJ0aWVzLnBvc2l0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oaWRlbnRpZmllciwgZWxlbWVudCwgcG9zaXRpb25zKTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbltqXS5zZXRQcm9wZXJ0aWVzKGNoaWxkUHJvcGVydGllcy5wcm9wZXJ0aWVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnVwZGF0ZU5ld0VsZW1lbnRDaGlsZEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAoZWxlbWVudCwgYXR0cmlidXRlQ29sbGVjdGlvbiA9IHt9KSB7XHJcbiAgICAgICAgbGV0IGNoaWxkcmVuLCBwb3NpdGlvbnM7XHJcbiAgICAgICAgZm9yIChsZXQgaWRlbnRpZmllciBpbiBhdHRyaWJ1dGVDb2xsZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNoaWxkQXRycmlidXRlcyBvZiBhdHRyaWJ1dGVDb2xsZWN0aW9uW2lkZW50aWZpZXJdKSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnMgPSB0aGlzLnNldFBvc2l0aW9ucyhjaGlsZEF0cnJpYnV0ZXMucG9zaXRpb25zKTtcclxuICAgICAgICAgICAgICAgIGNoaWxkcmVuID0gdGhpcy5nZXRDaGlsZHJlbihpZGVudGlmaWVyLCBlbGVtZW50LCBwb3NpdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjaGlsZHJlbi5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuW2pdLnNldEF0dHJpYnV0ZXMoY2hpbGRBdHJyaWJ1dGVzLmF0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuc2V0UG9zaXRpb25zID0gZnVuY3Rpb24gKHBvc2l0aW9ucyA9IDEpIHtcclxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocG9zaXRpb25zKSkge1xyXG4gICAgICAgICAgICBwb3NpdGlvbnMgPSBmdW5jLnJhbmdlKHBvc2l0aW9ucyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcG9zaXRpb25zO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uIChwYXJhbXMgPSB7IGNoaWxkRGV0YWlsczogeyBhdHRyaWJ1dGVzOiB7fSwgcHJvcGVydGllczoge30gfSwgZGV0YWlsczogeyBhdHRyaWJ1dGVzOiB7fSwgcHJvcGVydGllczoge30gfSB9KSB7XHJcbiAgICAgICAgbGV0IGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQuY2xvbmVOb2RlKHRydWUpO1xyXG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChlbGVtZW50KTtcclxuXHJcbiAgICAgICAgdGhpcy5wcmVwYXJlRWxlbWVudChlbGVtZW50LCBwYXJhbXMpO1xyXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYucHJlcGFyZUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCwgcGFyYW1zID0geyBjaGlsZERldGFpbHM6IHsgYXR0cmlidXRlczoge30sIHByb3BlcnRpZXM6IHt9IH0sIGRldGFpbHM6IHsgYXR0cmlidXRlczoge30sIHByb3BlcnRpZXM6IHt9IH0gfSkge1xyXG4gICAgICAgIGlmIChwYXJhbXMuY2hpbGREZXRhaWxzICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBpZiAocGFyYW1zLmNoaWxkRGV0YWlscy5hdHRyaWJ1dGVzICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVOZXdFbGVtZW50Q2hpbGRBdHRyaWJ1dGVzKGVsZW1lbnQsIHBhcmFtcy5jaGlsZERldGFpbHMuYXR0cmlidXRlcyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChwYXJhbXMuY2hpbGREZXRhaWxzLnByb3BlcnRpZXMgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZU5ld0VsZW1lbnRDaGlsZFByb3BlcnRpZXMoZWxlbWVudCwgcGFyYW1zLmNoaWxkRGV0YWlscy5wcm9wZXJ0aWVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy5kZXRhaWxzICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBpZiAocGFyYW1zLmRldGFpbHMuYXR0cmlidXRlcyAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlcyhwYXJhbXMuZGV0YWlscy5hdHRyaWJ1dGVzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHBhcmFtcy5kZXRhaWxzLnByb3BlcnRpZXMgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnNldFByb3BlcnRpZXMocGFyYW1zLmRldGFpbHMucHJvcGVydGllcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlTmV3RWxlbWVudENoaWxkUHJvcGVydGllcyhlbGVtZW50LCB0aGlzLmNoaWxkUHJvcGVydGllcyk7XHJcbiAgICAgICAgZWxlbWVudC5zZXRQcm9wZXJ0aWVzKHRoaXMucHJvcGVydGllcyk7XHJcblxyXG4gICAgICAgIHRoaXMubWFrZUNsb25lYWJsZShlbGVtZW50KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnJlbW92ZUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgICAgIGxldCBjaGlsZHJlbiA9IFtdO1xyXG4gICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuY2hpbGRyZW4uaW5kZXhPZihlbGVtZW50KTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRyZW4ubGVuZ3Q7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb24gIT0gaSkge1xyXG4gICAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaCh0aGlzLmNoaWxkcmVuW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW47XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5jbG9uZUVsZW1lbnQgPSBmdW5jdGlvbiAocG9zaXRpb24sIHBhcmFtcyA9IHsgY2hpbGREZXRhaWxzOiB7IGF0dHJpYnV0ZXM6IHt9LCBwcm9wZXJ0aWVzOiB7fSB9LCBkZXRhaWxzOiB7IGF0dHJpYnV0ZXM6IHt9LCBwcm9wZXJ0aWVzOiB7fSB9IH0pIHtcclxuICAgICAgICBsZXQgZWxlbWVudCA9IHRoaXMuY2hpbGRyZW5bcG9zaXRpb25dLmNsb25lTm9kZSh0cnVlKTtcclxuICAgICAgICB0aGlzLmNoaWxkcmVuLnB1c2goZWxlbWVudCk7XHJcblxyXG4gICAgICAgIHRoaXMucHJlcGFyZUVsZW1lbnQoZWxlbWVudCwgcGFyYW1zKTtcclxuICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLm1ha2VDbG9uZWFibGUgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgICAgIGxldCBwb3NpdGlvbiA9IHRoaXMuY2hpbGRyZW4uaW5kZXhPZihlbGVtZW50KTtcclxuICAgICAgICBpZiAocG9zaXRpb24gPT0gLTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZWxlbWVudC51bml0Q2xvbmUgPSAocGFyYW1zKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb25lRWxlbWVudChwb3NpdGlvbiwgcGFyYW1zKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbi5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5zZXRQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKHByb3BlcnRpZXMgPSB7fSkge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB0aGlzLmNoaWxkcmVuW2ldLnNldFByb3BlcnRpZXMocHJvcGVydGllcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRQcm9wZXJ0aWVzKHByb3BlcnRpZXMpO1xyXG4gICAgICAgIGZvciAobGV0IGkgaW4gcHJvcGVydGllcykge1xyXG4gICAgICAgICAgICB0aGlzLnByb3BlcnRpZXNbaV0gPSBwcm9wZXJ0aWVzW2ldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmNzcyA9IGZ1bmN0aW9uIChzdHlsZSA9IHt9KSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW5baV0uY3NzKHN0eWxlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LmNzcyhzdHlsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5zZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKGF0dHJpYnV0ZXMgPSB7fSkge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB0aGlzLmNoaWxkcmVuW2ldLnNldEF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuYWRkQ2xhc3NlcyA9IGZ1bmN0aW9uIChjbGFzc2VzID0gJycpIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbltpXS5hZGRDbGFzc2VzKGNsYXNzZXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmVsZW1lbnQuYWRkQ2xhc3NlcyhjbGFzc2VzKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLnJlbW92ZUNsYXNzZXMgPSBmdW5jdGlvbiAoY2xhc3NlcyA9ICcnKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW5baV0ucmVtb3ZlQ2xhc3NlcyhjbGFzc2VzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUNsYXNzZXMoY2xhc3Nlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRDaGlsZHJlbiA9IGZ1bmN0aW9uIChpZGVudGlmaWVyID0gJycsIGVsZW1lbnQsIHBvc2l0aW9ucyA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGNvbGxlY3Rpb24gPSBbXTtcclxuICAgICAgICBsZXQgY2hpbGRyZW4gPSBlbGVtZW50LmZpbmRBbGwoaWRlbnRpZmllcik7Ly9nZXQgdGhlIGNoaWxkcmVuIG1hdGNoaW5nIGlkZW50aWZpZXIgaW4gZWFjaCBlbGVtZW50XHJcbiAgICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCA+IDApIHsvL2lmIG5vdCBlbXB0eVxyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHBvc2l0aW9ucy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkcmVuW3Bvc2l0aW9uc1tqXV0gIT0gdW5kZWZpbmVkKSB7Ly9pZiBhdmFpbGFibGVcclxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uLnB1c2goY2hpbGRyZW5bcG9zaXRpb25zW2pdXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5jaGlsZENzcyA9IGZ1bmN0aW9uIChpZGVudGlmaWVyID0gJycsIHN0eWxlID0ge30sIHBvc2l0aW9ucyA9IFtdKSB7XHJcbiAgICAgICAgcG9zaXRpb25zID0gdGhpcy5zZXRQb3NpdGlvbnMocG9zaXRpb25zKTtcclxuXHJcbiAgICAgICAgbGV0IGNoaWxkcmVuO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oaWRlbnRpZmllciwgdGhpcy5jaGlsZHJlbltpXSwgcG9zaXRpb25zKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2pdLmNzcyhzdHlsZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNoaWxkcmVuID0gdGhpcy5nZXRDaGlsZHJlbihpZGVudGlmaWVyLCB0aGlzLmVsZW1lbnQsIHBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgY2hpbGRyZW5bal0uY3NzKHN0eWxlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5zZXRDaGlsZFByb3BlcnRpZXMgPSBmdW5jdGlvbiAoaWRlbnRpZmllciA9ICcnLCBwcm9wZXJ0aWVzID0ge30sIHBvc2l0aW9ucyA9IFtdKSB7XHJcbiAgICAgICAgcG9zaXRpb25zID0gdGhpcy5zZXRQb3NpdGlvbnMocG9zaXRpb25zKTtcclxuXHJcbiAgICAgICAgbGV0IGNoaWxkcmVuO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oaWRlbnRpZmllciwgdGhpcy5jaGlsZHJlbltpXSwgcG9zaXRpb25zKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2pdLnNldFByb3BlcnRpZXMocHJvcGVydGllcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNoaWxkcmVuID0gdGhpcy5nZXRDaGlsZHJlbihpZGVudGlmaWVyLCB0aGlzLmVsZW1lbnQsIHBvc2l0aW9ucyk7XHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjaGlsZHJlbi5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICBjaGlsZHJlbltqXS5zZXRQcm9wZXJ0aWVzKHByb3BlcnRpZXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jaGlsZFByb3BlcnRpZXNbaWRlbnRpZmllcl0gPSB0aGlzLmNoaWxkUHJvcGVydGllc1tpZGVudGlmaWVyXSB8fCBbXTtcclxuICAgICAgICB0aGlzLmNoaWxkUHJvcGVydGllc1tpZGVudGlmaWVyXS5wdXNoKHsgcHJvcGVydGllcywgcG9zaXRpb25zIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuc2V0Q2hpbGRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKGlkZW50aWZpZXIgPSAnJywgYXR0cmlidXRlcyA9IHt9LCBwb3NpdGlvbnMgPSAnJykge1xyXG4gICAgICAgIHBvc2l0aW9ucyA9IHRoaXMuc2V0UG9zaXRpb25zKHBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIGxldCBjaGlsZHJlbjtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY2hpbGRyZW4gPSB0aGlzLmdldENoaWxkcmVuKGlkZW50aWZpZXIsIHRoaXMuY2hpbGRyZW5baV0sIHBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBjaGlsZHJlbltqXS5zZXRBdHRyaWJ1dGVzKGF0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oaWRlbnRpZmllciwgdGhpcy5lbGVtZW50LCBwb3NpdGlvbnMpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgIGNoaWxkcmVuW2pdLnNldEF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuYWRkQ2xhc3Nlc1RvQ2hpbGQgPSBmdW5jdGlvbiAoaWRlbnRpZmllciA9ICcnLCBjbGFzc2VzID0gJycsIHBvc2l0aW9ucyA9IFtdKSB7XHJcbiAgICAgICAgcG9zaXRpb25zID0gdGhpcy5zZXRQb3NpdGlvbnMocG9zaXRpb25zKTtcclxuXHJcbiAgICAgICAgbGV0IGNoaWxkcmVuO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oaWRlbnRpZmllciwgdGhpcy5jaGlsZHJlbltpXSwgcG9zaXRpb25zKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2pdLmFkZENsYXNzZXMoY2xhc3Nlcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNoaWxkcmVuID0gdGhpcy5nZXRDaGlsZHJlbihpZGVudGlmaWVyLCB0aGlzLmVsZW1lbnQsIHBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgY2hpbGRyZW5bal0uYWRkQ2xhc3NlcyhjbGFzc2VzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5yZW1vdmVDbGFzc2VzRnJvbUNoaWxkID0gZnVuY3Rpb24gKGlkZW50aWZpZXIgPSAnJywgY2xhc3NlcyA9ICcnLCBwb3NpdGlvbnMgPSBbXSkge1xyXG4gICAgICAgIHBvc2l0aW9ucyA9IHRoaXMuc2V0UG9zaXRpb25zKHBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgIGxldCBjaGlsZHJlbjtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY2hpbGRyZW4gPSB0aGlzLmdldENoaWxkcmVuKGlkZW50aWZpZXIsIHRoaXMuY2hpbGRyZW5baV0sIHBvc2l0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBjaGlsZHJlbltqXS5yZW1vdmVDbGFzc2VzKGNsYXNzZXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oaWRlbnRpZmllciwgdGhpcy5lbGVtZW50LCBwb3NpdGlvbnMpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgIGNoaWxkcmVuW2pdLnJlbW92ZUNsYXNzZXMoY2xhc3Nlcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHNlbGY7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2hhZG93OyIsImNvbnN0IEZ1bmMgPSByZXF1aXJlKCcuL2NsYXNzZXMvRnVuYycpO1xyXG5jb25zdCBNYXRyaXggPSByZXF1aXJlKCcuL2NsYXNzZXMvTWF0cml4Jyk7XHJcbmNvbnN0IE5ldXJhbE5ldHdvcmsgPSByZXF1aXJlKCcuL2NsYXNzZXMvTmV1cmFsTmV0d29yaycpO1xyXG5jb25zdCBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vY2xhc3Nlcy9UZW1wbGF0ZScpO1xyXG5jb25zdCBDb21wb25lbnRzID0gcmVxdWlyZSgnLi9jbGFzc2VzL0NvbXBvbmVudHMnKTtcclxuY29uc3QgQ29sb3JQaWNrZXIgPSByZXF1aXJlKCcuL2NsYXNzZXMvQ29sb3JQaWNrZXInKTtcclxuY29uc3QgUGVyaW9kID0gcmVxdWlyZSgnLi9jbGFzc2VzL1BlcmlvZCcpO1xyXG5jb25zdCBJY29ucyA9IHJlcXVpcmUoJy4vSWNvbnMnKTtcclxuY29uc3QgU2hhZG93ID0gcmVxdWlyZSgnLi9mdW5jdGlvbnMvU2hhZG93Jyk7XHJcbmNvbnN0IEFycmF5TGlicmFyeSA9IHJlcXVpcmUoJy4vZnVuY3Rpb25zL0FycmF5TGlicmFyeScpO1xyXG5jb25zdCBPYmplY3RzTGlicmFyeSA9IHJlcXVpcmUoJy4vZnVuY3Rpb25zL09iamVjdHNMaWJyYXJ5Jyk7XHJcbmNvbnN0IE1hdGhzTGlicmFyeSA9IHJlcXVpcmUoJy4vZnVuY3Rpb25zL01hdGhzTGlicmFyeScpO1xyXG5jb25zdCBBbmFseXNpc0xpYnJhcnkgPSByZXF1aXJlKCcuL2Z1bmN0aW9ucy9BbmFseXNpc0xpYnJhcnknKTtcclxuY29uc3QgQ29tcHJlc3Npb24gPSByZXF1aXJlKCcuL2Z1bmN0aW9ucy9Db21wcmVzc2lvbicpO1xyXG5cclxuY2xhc3MgRW1wdHkge1xyXG59XHJcblxyXG5jbGFzcyBCYXNlIGV4dGVuZHMgQ29tcG9uZW50cyB7XHJcbiAgICBjb25zdHJ1Y3Rvcih0aGVXaW5kb3cgPSBFbXB0eSkge1xyXG4gICAgICAgIHN1cGVyKHRoZVdpbmRvdyk7XHJcbiAgICAgICAgdGhpcy5jb2xvckhhbmRsZXIgPSBuZXcgQ29sb3JQaWNrZXIoKTtcclxuICAgICAgICB0aGlzLmFycmF5ID0gQXJyYXlMaWJyYXJ5KCk7XHJcbiAgICAgICAgdGhpcy5vYmplY3QgPSBPYmplY3RzTGlicmFyeSgpO1xyXG4gICAgICAgIHRoaXMubWF0aCA9IE1hdGhzTGlicmFyeSgpO1xyXG4gICAgICAgIHRoaXMuYW5hbHl0aWNzID0gQW5hbHlzaXNMaWJyYXJ5KCk7XHJcbiAgICAgICAgdGhpcy5pY29ucyA9IEljb25zO1xyXG5cclxuICAgICAgICB0aGlzLnN0eWxlcyA9IFtcclxuICAgICAgICAgICAgJ2h0dHBzOi8va2FkZS05NS5naXRodWIuaW8va2VyZHgvY3NzL3RhYmxlLmNzcycsXHJcbiAgICAgICAgICAgICdodHRwczovL2thZGUtOTUuZ2l0aHViLmlvL2tlcmR4L2Nzcy9jZWxsLmNzcycsXHJcbiAgICAgICAgICAgICdodHRwczovL2thZGUtOTUuZ2l0aHViLmlvL2tlcmR4L2Nzcy9mb3JtLmNzcycsXHJcbiAgICAgICAgICAgICdodHRwczovL2thZGUtOTUuZ2l0aHViLmlvL2tlcmR4L2Nzcy9waWNrZXIuY3NzJyxcclxuICAgICAgICAgICAgJ2h0dHBzOi8va2FkZS05NS5naXRodWIuaW8va2VyZHgvY3NzL3NlbGVjdC5jc3MnLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly9rYWRlLTk1LmdpdGh1Yi5pby9rZXJkeC9jc3MvanNvbi5jc3MnLFxyXG4gICAgICAgICAgICAnaHR0cHM6Ly9rYWRlLTk1LmdpdGh1Yi5pby9rZXJkeC9jc3MvcG9wdXAuY3NzJ1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgZm9yIChsZXQgc3R5bGUgb2YgdGhpcy5zdHlsZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5sb2FkQ3NzKHN0eWxlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgQmFzZSxcclxuICAgIENvbG9yUGlja2VyLFxyXG4gICAgUGVyaW9kLFxyXG4gICAgTWF0cml4LFxyXG4gICAgRnVuYyxcclxuICAgIENvbXBvbmVudHMsXHJcbiAgICBUZW1wbGF0ZSxcclxuICAgIE5ldXJhbE5ldHdvcmssXHJcbiAgICBJY29ucyxcclxuICAgIFNoYWRvdyxcclxuICAgIEFycmF5TGlicmFyeSxcclxuICAgIE9iamVjdHNMaWJyYXJ5LFxyXG4gICAgTWF0aHNMaWJyYXJ5LFxyXG4gICAgQW5hbHlzaXNMaWJyYXJ5LFxyXG4gICAgQ29tcHJlc3Npb24sXHJcbn07XHJcbiIsImltcG9ydCB7IFN5c3RlbSB9IGZyb20gJy4uL2Z1bmN0aW9ucy9TeXN0ZW0uanMnO1xyXG5sZXQgc3lzdGVtID0gbmV3IFN5c3RlbSgpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIExvZ2dlcigpIHtcclxuICAgIGNvbnN0IHNlbGYgPSB7IGJvYXJkOiB1bmRlZmluZWQsIHByZXZpb3VzQ29tbWFuZHM6IFtdLCBpbmRleDogMCwgY29tbWFuZExpc3Q6IHt9IH07XHJcblxyXG4gICAgc2VsZi5jb21tYW5kTGlzdC5jbGVhciA9ICgpID0+IHtcclxuICAgICAgICBzZWxmLmJvYXJkLmlubmVySFRNTCA9ICcnO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuY29tbWFuZExpc3QubG9nID0gKGRhdGEpID0+IHtcclxuICAgICAgICBsZXQgbG9nSXRlbSA9IGtlcmR4LmNyZWF0ZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBjbGFzczogJ2xvZy1pdGVtJyB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGxvZ0l0ZW0uYXBwZW5kKGRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGxvZ0l0ZW0uaW5uZXJIVE1MID0gZGF0YTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxvZ0l0ZW0uaW5uZXJIVE1MID0gJ0Vycm9yIHdyaXRpbmcgdG8gdGhlIGxvZyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgc2VsZi5ib2FyZC5hcHBlbmQobG9nSXRlbSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5jb21tYW5kTGlzdC5wcmludCA9IChkYXRhKSA9PiB7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNlbGYuY29tbWFuZExpc3QucmVxdWVzdCA9IChkYXRhKSA9PiB7XHJcbiAgICAgICAgbGV0IHByb3BzID0gc2VsZi5nZXRDb21tYW5kUHJvcHMoZGF0YSwgJy0nKTtcclxuICAgICAgICBpZiAocHJvcHMudXJsID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBzZWxmLmNvbW1hbmRMaXN0LmxvZygnVXJsIGlzIHJlcXVpcmVkJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwcm9wcy5tZXRob2QgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHNlbGYuY29tbWFuZExpc3QubG9nKCdNZXRob2QgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcHJvcHMuZGF0YSA9IEpTT04ucGFyc2UocHJvcHMuZGF0YSk7XHJcbiAgICAgICAgICAgIHNlbGYuZGlzYWJsZUlucHV0KCk7XHJcbiAgICAgICAgICAgIHNlbGYud3JpdGUoYENvbm5lY3RpbmcgdG8gJHtwcm9wcy51cmx9YCk7XHJcbiAgICAgICAgICAgIHN5c3RlbS5jb25uZWN0KHByb3BzKS50aGVuKHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLndyaXRlKCdDb25uZWN0ZWQnKTtcclxuICAgICAgICAgICAgICAgIHNlbGYud3JpdGUocmVzdWx0KTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpXHJcbiAgICAgICAgICAgIH0pLmZpbmFsbHkoc2VsZi5lbmFibGVJbnB1dCgpKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBzZWxmLndyaXRlKCdEYXRhIGZvcm1hdCBub3QgdmFsaWQnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5nZXRDb21tYW5kUHJvcHMgPSAoZGF0YSwgc3RhcnQpID0+IHtcclxuICAgICAgICBsZXQgY29tbWFuZHMgPSB7fTtcclxuICAgICAgICBsZXQgYXJncyA9IGRhdGEuc3BsaXQoJyAnKTtcclxuICAgICAgICBsZXQgYXJnO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBhcmcgPSBhcmdzW2ldO1xyXG4gICAgICAgICAgICBpZiAoYXJnWzBdID09IHN0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICBjb21tYW5kc1thcmcucmVwbGFjZShzdGFydCwgJycpXSA9IGFyZ3NbaSArIDFdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY29tbWFuZHM7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5jcmVhdGVXaW5kb3cgPSAoKSA9PiB7XHJcbiAgICAgICAgbGV0IHJlc3BvbnNlV2luZG93ID0ga2VyZHguY3JlYXRlRWxlbWVudCh7XHJcbiAgICAgICAgICAgIGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiB7IGlkOiAncmVzcG9uc2Utd2luZG93JyB9LCBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICdzcGFuJywgYXR0cmlidXRlczogeyBpZDogJ3Jlc3BvbnNlLXdpbmRvdy1jb250cm9scycgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnaW5wdXQnLCBhdHRyaWJ1dGVzOiB7IGlkOiAncmVzcG9uc2Utd2luZG93LXNlYXJjaCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdpJywgYXR0cmlidXRlczogeyBpZDogJ3Jlc3BvbnNlLXdpbmRvdy1jbGVhcicsIGNsYXNzOiAnZmFzIGZhLW1pbnVzLWNpcmNsZScgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdpJywgYXR0cmlidXRlczogeyBpZDogJ3Jlc3BvbnNlLXdpbmRvdy10b2dnbGUnLCBjbGFzczogJ2ZhcyBmYS1hcnJvdy11cCcgfSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGlkOiAncmVzcG9uc2Utd2luZG93LWxvZycgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnc3BhbicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICdyZXNwb25zZS13aW5kb3ctYm9hcmQnIH0gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJ3NwYW4nLCBhdHRyaWJ1dGVzOiB7IGlkOiAncmVzcG9uc2Utd2luZG93LWNvbW1hbmQnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnbGFiZWwnLCB0ZXh0OiAnUlVOOiAnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBlbGVtZW50OiAnaW5wdXQnLCBhdHRyaWJ1dGVzOiB7IGlkOiAncmVzcG9uc2Utd2luZG93LWlucHV0JywgYXV0b0NvbXBsZXRlOiAnb2ZmJyB9IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHNlbGYuY29tbWFuZElucHV0ID0gcmVzcG9uc2VXaW5kb3cuZmluZCgnI3Jlc3BvbnNlLXdpbmRvdy1pbnB1dCcpO1xyXG4gICAgICAgIHNlbGYuYm9hcmQgPSByZXNwb25zZVdpbmRvdy5maW5kKCcjcmVzcG9uc2Utd2luZG93LWJvYXJkJyk7XHJcbiAgICAgICAgbGV0IHdpbmRvd0xvZyA9IHJlc3BvbnNlV2luZG93LmZpbmQoJyNyZXNwb25zZS13aW5kb3ctbG9nJyk7XHJcbiAgICAgICAgcmVzcG9uc2VXaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChldmVudC50YXJnZXQgPT0gd2luZG93TG9nIHx8IHdpbmRvd0xvZy5pc0FuY2VzdG9yKGV2ZW50LnRhcmdldCkpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuY29tbWFuZElucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmNvbW1hbmRJbnB1dC5zZXRTZWxlY3Rpb25SYW5nZShzZWxmLmNvbW1hbmRJbnB1dC52YWx1ZS5sZW5ndGgsIHNlbGYuY29tbWFuZElucHV0LnZhbHVlLmxlbmd0aCwgXCJmb3J3YXJkXCIpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzZWxmLmNvbW1hbmRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdmFsdWU7XHJcbiAgICAgICAgICAgIGlmIChldmVudC5rZXkgPT0gJ0Fycm93VXAnIHx8IGV2ZW50LmtleSA9PSAnQXJyb3dEb3duJykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PSAnQXJyb3dVcCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmluZGV4LS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChldmVudC5rZXkgPT0gJ0Fycm93RG93bicpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYucHJldmlvdXNDb21tYW5kcy5sZW5ndGggPT0gMCkgc2VsZi5pbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzZWxmLmluZGV4IDwgMCkgc2VsZi5pbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzZWxmLmluZGV4ID49IHNlbGYucHJldmlvdXNDb21tYW5kcy5sZW5ndGgpIHNlbGYuaW5kZXggPSBzZWxmLnByZXZpb3VzQ29tbWFuZHMubGVuZ3RoIC0gMVxyXG5cclxuICAgICAgICAgICAgICAgIHZhbHVlID0gc2VsZi5wcmV2aW91c0NvbW1hbmRzW3NlbGYuaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5jb21tYW5kSW5wdXQudmFsdWUgPSB2YWx1ZSB8fCAnJztcclxuICAgICAgICAgICAgICAgIHNlbGYuY29tbWFuZElucHV0LnNldFNlbGVjdGlvblJhbmdlKHNlbGYuY29tbWFuZElucHV0LnZhbHVlLmxlbmd0aCwgc2VsZi5jb21tYW5kSW5wdXQudmFsdWUubGVuZ3RoLCBcImZvcndhcmRcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZXZlbnQua2V5ID09ICdFbnRlcicpIHtcclxuICAgICAgICAgICAgICAgIGxldCBjb21tYW5kID0gc2VsZi5jb21tYW5kSW5wdXQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmNvbW1hbmRJbnB1dC52YWx1ZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5jb21tYW5kTGlzdC5sb2coYFJVTjogJHtjb21tYW5kfWApO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbW1hbmQgIT0gJycpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLnByZXZpb3VzQ29tbWFuZHMucHVzaChjb21tYW5kKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2VyZHguaXNzZXQoc2VsZi5jb21tYW5kTGlzdFtjb21tYW5kLnNwbGl0KCcgJylbMF1dKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmNvbW1hbmRMaXN0W2NvbW1hbmQuc3BsaXQoJyAnKVswXV0oY29tbWFuZC5yZXBsYWNlKGNvbW1hbmQuc3BsaXQoJyAnKVswXSwgJycpLnRyaW0oKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLndyaXRlKGAnJHtjb21tYW5kLnNwbGl0KCcgJylbMF19JyBub3QgZm91bmRgKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYud3JpdGUoY29tbWFuZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2VsZi5pbmRleCA9IHNlbGYucHJldmlvdXNDb21tYW5kcy5sZW5ndGggLSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHNlbGYud2luZG93ID0gcmVzcG9uc2VXaW5kb3c7XHJcbiAgICAgICAgc2VsZi5yZXNpemUoKTtcclxuICAgICAgICByZXR1cm4gcmVzcG9uc2VXaW5kb3c7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi53cml0ZSA9IChkYXRhKSA9PiB7XHJcbiAgICAgICAgbGV0IGl0ZW07XHJcbiAgICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGl0ZW0gPSBkYXRhO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgZGF0YSA9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICBpdGVtID0ga2VyZHguZGlzcGxheURhdGEoZGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBpdGVtID0ga2VyZHguY3JlYXRlRWxlbWVudCh7IGVsZW1lbnQ6ICdzcGFuJywgaHRtbDogZGF0YSB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0aW1lID0gYFske2tlcmR4LnRpbWUoKX1dOmA7XHJcbiAgICAgICAgbGV0IGxvZ0l0ZW0gPSBrZXJkeC5jcmVhdGVFbGVtZW50KHtcclxuICAgICAgICAgICAgZWxlbWVudDogJ2RpdicsIGF0dHJpYnV0ZXM6IHsgc3R5bGU6IHsgZGlzcGxheTogJ2dyaWQnLCBncmlkVGVtcGxhdGVDb2x1bW5zOiAnbWF4LWNvbnRlbnQgMWZyJyB9IH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdsYWJlbCcsIHRleHQ6IHRpbWUgfSxcclxuICAgICAgICAgICAgICAgIGl0ZW1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzZWxmLmNvbW1hbmRMaXN0LmxvZyhsb2dJdGVtKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmNsZWFuID0gKCkgPT4ge1xyXG4gICAgICAgIHNlbGYuY29tbWFuZExpc3QuY2xlYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmRpc2FibGVJbnB1dCA9ICgpID0+IHtcclxuICAgICAgICBzZWxmLmNvbW1hbmRJbnB1dC5jc3MoeyBkaXNwbGF5OiAnbm9uZScgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2VsZi5lbmFibGVJbnB1dCA9ICgpID0+IHtcclxuICAgICAgICBzZWxmLmNvbW1hbmRJbnB1dC5jc3NSZW1vdmUoWydkaXNwbGF5J10pO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbGYucmVzaXplID0gKCkgPT4ge1xyXG4gICAgICAgIHNlbGYud2luZG93Lm9uQWRkZWQoKCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgcGFyZW50ID0gc2VsZi53aW5kb3cucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgbGV0IGNhbkRyYWcgPSBmYWxzZTtcclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gc2VsZi53aW5kb3cucG9zaXRpb24oKVxyXG4gICAgICAgICAgICBsZXQgaG92ZXIgPSBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlmZiA9IGV2ZW50LnkgLSBzZWxmLndpbmRvdy5wb3NpdGlvbigpLnRvcDtcclxuICAgICAgICAgICAgICAgIGlmIChkaWZmIDwgMTUgJiYgZGlmZiA+IC0xNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYud2luZG93LmNzcyh7IGN1cnNvcjogJ25zLXJlc2l6ZScgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICghY2FuRHJhZykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYud2luZG93LmNzc1JlbW92ZShbJ2N1cnNvciddKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtb3VzZWRvd24gPSBldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlmZiA9IGV2ZW50LnkgLSBzZWxmLndpbmRvdy5wb3NpdGlvbigpLnRvcDtcclxuICAgICAgICAgICAgICAgIGlmIChkaWZmIDwgMTUgJiYgZGlmZiA+IC0xNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYud2luZG93LmNzcyh7IGN1cnNvcjogJ25zLXJlc2l6ZScgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FuRHJhZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBsZXQgZHJhZyA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBoZWlnaHQgPSBwb3NpdGlvbi5ib3R0b20gLSBldmVudC55O1xyXG4gICAgICAgICAgICAgICAgbGV0IG9rSGVpZ2h0ID0gaGVpZ2h0ID4gMjAwO1xyXG4gICAgICAgICAgICAgICAgbGV0IHdpdGhpbiA9IGV2ZW50LnkgPiBwYXJlbnQucG9zaXRpb24oKS50b3A7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2FuRHJhZyAmJiB3aXRoaW4gJiYgb2tIZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLndpbmRvdy5jc3MoeyBoZWlnaHQ6IGAke2hlaWdodH1weGAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBsZXQgbW91c2V1cCA9IGV2ZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGNhbkRyYWcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtb3VzZWxlYXZlID0gZXZlbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2FuRHJhZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2VsZi53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgaG92ZXIpO1xyXG4gICAgICAgICAgICBzZWxmLndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBtb3VzZWRvd24pO1xyXG4gICAgICAgICAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZyk7XHJcbiAgICAgICAgICAgIHNlbGYud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBtb3VzZXVwKTtcclxuICAgICAgICAgICAgcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBtb3VzZWxlYXZlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmNsZWFyID0gKCkgPT4ge1xyXG4gICAgICAgIHNlbGYuY29tbWFuZExpc3QuY2xlYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2VsZjtcclxufSIsImV4cG9ydCBmdW5jdGlvbiBTeXN0ZW0oKSB7XHJcbiAgICBjb25zdCBtbXUgPSB7fTtcclxuICAgIG1tdS5jb25uZWN0ID0gKHBhcmFtcyA9IHsgZW5jb2RlOiB0cnVlLCBkYXRhOiB7fSB9KSA9PiB7XHJcbiAgICAgICAgaWYgKHBhcmFtcy5lbmNvZGUgPT0gdW5kZWZpbmVkKSBwYXJhbXMuZW5jb2RlID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgaWYgKHBhcmFtcy5lbmNvZGUgPT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICBsZXQgc2VudGVuY2UgPSBKU09OLnN0cmluZ2lmeShwYXJhbXMuZGF0YSk7XHJcbiAgICAgICAgICAgIGxldCBkaWN0aW9uYXJ5ID0ga2VyZHguYXJyYXkudG9TZXQoc2VudGVuY2Uuc3BsaXQoJycpKS5qb2luKCcnKTtcclxuICAgICAgICAgICAgbGV0IGNvZGUgPSBjb21wcmVzc29yLmVuY29kZUxaVyhzZW50ZW5jZSwgZGljdGlvbmFyeSk7XHJcbiAgICAgICAgICAgIHBhcmFtcy5kYXRhID0geyBjb2RlLCBkaWN0aW9uYXJ5LCBlbmNvZGVkOiB0cnVlIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGFwcExpYnJhcnkuYWpheChwYXJhbXMpXHJcbiAgICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5lbmNvZGVkID09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gSlNPTi5wYXJzZShjb21wcmVzc29yLmRlY29kZUxaVyhyZXNwb25zZS5jb2RlLCByZXNwb25zZS5kaWN0aW9uYXJ5KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5jYXRjaChlcnIgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbW11O1xyXG59IiwiY29uc3Qge0Jhc2UsIENvbXByZXNzaW9uLCBBcHBMaWJyYXJ5LCBUZW1wbGF0ZSB9ID0gcmVxdWlyZSgnQHRoZWthZGUva2VyZC9jbGFzc2VzL2Jyb3dzZXInKTtcclxud2luZG93LmtlcmR4ID0gbmV3IEJhc2Uod2luZG93KTtcclxuY29uc3QgdCA9IG5ldyBUZW1wbGF0ZSh3aW5kb3cpO1xyXG5cclxuY29uc3QgeyBMb2dnZXIgfSA9IHJlcXVpcmUoJy4vZnVuY3Rpb25zL0xvZ2dlci5qcycpO1xyXG5jb25zdCB7IFN5c3RlbSB9ID0gcmVxdWlyZSgnLi9mdW5jdGlvbnMvU3lzdGVtLmpzJyk7XHJcblxyXG53aW5kb3cubW11ID0ge307XHJcbndpbmRvdy5jb21wcmVzc29yID0gQ29tcHJlc3Npb24oKTtcclxud2luZG93LmFwcExpYnJhcnkgPSBBcHBMaWJyYXJ5KCk7XHJcbmxldCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XHJcbmxldCBzeXN0ZW0gPSBuZXcgU3lzdGVtKCk7XHJcblxyXG5tbXUuZ2VuZXJhdGVSZXF1ZXN0Q29udGVudCA9IChwYXJhbXMgPSB7IG5hbWU6ICcnLCBvcHRpb25zOiBbXSB9KSA9PiB7XHJcbiAgICBsZXQgbGFiZWwgPSBrZXJkeC5jYW1lbENhc2VkVG9UZXh0KHBhcmFtcy5uYW1lKTtcclxuICAgIGxldCBub2RlTmFtZSA9ICdpbnB1dCc7XHJcblxyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGFyYW1zLm9wdGlvbnMpKSB7XHJcbiAgICAgICAgbm9kZU5hbWUgPSAnc2VsZWN0JztcclxuICAgIH1cclxuXHJcbiAgICBsZXQgY29udGVudCA9IGtlcmR4LmNyZWF0ZUVsZW1lbnQoe1xyXG4gICAgICAgIGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAncmVxdWVzdC13aW5kb3ctY29udGVudCcgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgeyBlbGVtZW50OiAnbGFiZWwnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAncmVxdWVzdC13aW5kb3ctY29udGVudC1sYWJlbCcsIGlkOiBuYW1lIH0sIHRleHQ6IGxhYmVsIH0sXHJcbiAgICAgICAgICAgIHsgZWxlbWVudDogbm9kZU5hbWUsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdyZXF1ZXN0LXdpbmRvdy1jb250ZW50LWRhdGEnLCBuYW1lOiBwYXJhbXMubmFtZSB9IH0sXHJcbiAgICAgICAgXVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGFyYW1zLm9wdGlvbnMpKSB7XHJcbiAgICAgICAgY29udGVudC5maW5kKCcucmVxdWVzdC13aW5kb3ctY29udGVudC1kYXRhJykubWFrZUVsZW1lbnQoe1xyXG4gICAgICAgICAgICBlbGVtZW50OiAnb3B0aW9uJywgYXR0cmlidXRlczogeyBzZWxlY3RlZDogdHJ1ZSwgZGlzYWJsZWQ6IHRydWUsIHZhbHVlOiBudWxsIH0sIHRleHQ6IGBTZWxlY3QgJHtsYWJlbH1gXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IG9wdGlvbiBvZiBwYXJhbXMub3B0aW9ucykge1xyXG4gICAgICAgICAgICBjb250ZW50LmZpbmQoJy5yZXF1ZXN0LXdpbmRvdy1jb250ZW50LWRhdGEnKS5tYWtlRWxlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50OiAnb3B0aW9uJywgYXR0cmlidXRlczogeyB2YWx1ZTogb3B0aW9uIH0sIHRleHQ6IG9wdGlvblxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGNvbnRlbnQ7XHJcbn1cclxuXHJcbm1tdS5nZW5lcmF0ZURhdGEgPSAoKSA9PiB7XHJcbiAgICBsZXQgZGF0YSA9IGtlcmR4LmNyZWF0ZUVsZW1lbnQoe1xyXG4gICAgICAgIGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAncmVxdWVzdC1zaW5nbGUtZGF0YScgfSwgY2hpbGRyZW46IFtcclxuICAgICAgICAgICAgeyBlbGVtZW50OiAnaW5wdXQnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAncmVxdWVzdC1zaW5nbGUtZGF0YS1uYW1lJywgcGxhY2VIb2xkZXI6ICdOYW1lJyB9IH0sXHJcbiAgICAgICAgICAgIHsgZWxlbWVudDogJ2xhYmVsJywgdGV4dDogJz0+JyB9LFxyXG4gICAgICAgICAgICB7IGVsZW1lbnQ6ICdpbnB1dCcsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdyZXF1ZXN0LXNpbmdsZS1kYXRhLXZhbHVlJywgcGxhY2VIb2xkZXI6ICdWYWx1ZScgfSB9LFxyXG4gICAgICAgICAgICB7IGVsZW1lbnQ6ICdzZWxlY3QnLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAncmVxdWVzdC1zaW5nbGUtZGF0YS10eXBlJyB9LCBvcHRpb25zOiBbJ1N0cmluZycsICdBcnJheScsICdKc29uJ10gfSxcclxuICAgICAgICAgICAgeyBlbGVtZW50OiAnaScsIGF0dHJpYnV0ZXM6IHsgY2xhc3M6ICdyZXF1ZXN0LXNpbmdsZS1kYXRhLXJlbW92ZSBmYXMgZmEtdHJhc2gnIH0gfVxyXG4gICAgICAgIF1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBkYXRhO1xyXG59XHJcblxyXG5tbXUudmFsaWRhdGVSZXF1ZXN0ID0gKCkgPT4ge1xyXG4gICAgbGV0IHJlcXVlc3RDb250ZW50cyA9IGRvY3VtZW50LmJvZHkuZmluZCgnI3JlcXVlc3QtY29udGVudHMnKTtcclxuICAgIGxldCB2YWxpZGF0ZUZvcm0gPSBrZXJkeC52YWxpZGF0ZUZvcm0ocmVxdWVzdENvbnRlbnRzKTtcclxuICAgIGlmICghdmFsaWRhdGVGb3JtLmZsYWcpIHtcclxuICAgICAgICBsb2dnZXIud3JpdGUoYCR7a2VyZHguY2FtZWxDYXNlZFRvVGV4dCh2YWxpZGF0ZUZvcm0uZWxlbWVudE5hbWUpfSBpcyByZXF1aXJlZGApO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxubW11LnNlbmRSZXF1ZXN0ID0gKCkgPT4ge1xyXG4gICAgbGV0IHJlcXVlc3RDb250ZW50cyA9IGRvY3VtZW50LmJvZHkuZmluZCgnI3JlcXVlc3QtY29udGVudHMnKTtcclxuXHJcbiAgICBpZiAobW11LnZhbGlkYXRlUmVxdWVzdCgpKSB7XHJcbiAgICAgICAgbGV0IHBhcmFtcyA9IGtlcmR4Lmpzb25Gb3JtKHJlcXVlc3RDb250ZW50cyk7XHJcbiAgICAgICAgbGV0IHJlcXVlc3REYXRhID0gZG9jdW1lbnQuYm9keS5maW5kKCcjcmVxdWVzdC1kYXRhJyk7XHJcbiAgICAgICAgbGV0IGFsbERhdGEgPSByZXF1ZXN0RGF0YS5maW5kQWxsKCcucmVxdWVzdC1zaW5nbGUtZGF0YScpO1xyXG4gICAgICAgIHBhcmFtcy5kYXRhID0ge307XHJcbiAgICAgICAgbGV0IHZhbHVlLCB0eXBlO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWxsRGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YWx1ZSA9IGFsbERhdGFbaV0uZmluZCgnLnJlcXVlc3Qtc2luZ2xlLWRhdGEtdmFsdWUnKS52YWx1ZTtcclxuICAgICAgICAgICAgdHlwZSA9IGFsbERhdGFbaV0uZmluZCgnLnJlcXVlc3Qtc2luZ2xlLWRhdGEtdHlwZScpLnZhbHVlO1xyXG4gICAgICAgICAgICBpZiAodHlwZSA9PSAnSnNvbicpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtcy5kYXRhW2FsbERhdGFbaV0uZmluZCgnLnJlcXVlc3Qtc2luZ2xlLWRhdGEtbmFtZScpLnZhbHVlXSA9IEpTT04ucGFyc2UodmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGUgPT0gJ0FycmF5Jykge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1zLmRhdGFbYWxsRGF0YVtpXS5maW5kKCcucmVxdWVzdC1zaW5nbGUtZGF0YS1uYW1lJykudmFsdWVdID0gdmFsdWUgPT0gJycgPyBbXSA6IHZhbHVlLnNwbGl0KCcsJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXMuZGF0YVthbGxEYXRhW2ldLmZpbmQoJy5yZXF1ZXN0LXNpbmdsZS1kYXRhLW5hbWUnKS52YWx1ZV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsb2dnZXIuZGlzYWJsZUlucHV0KCk7XHJcbiAgICAgICAgbG9nZ2VyLndyaXRlKGBDb25uZWN0aW5nIHRvICR7cGFyYW1zLnVybH1gKTtcclxuICAgICAgICBzeXN0ZW0uY29ubmVjdChwYXJhbXMpLnRoZW4ocmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgbG9nZ2VyLndyaXRlKCdDb25uZWN0ZWQnKTtcclxuICAgICAgICAgICAgbG9nZ2VyLndyaXRlKHJlc3VsdCk7XHJcbiAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcilcclxuICAgICAgICB9KS5maW5hbGx5KGxvZ2dlci5lbmFibGVJbnB1dCgpKTtcclxuICAgIH1cclxufVxyXG5cclxubW11LnJlbmRlciA9ICgpID0+IHtcclxuICAgIGxldCBoZWFkZXIgPSBkb2N1bWVudC5ib2R5Lm1ha2VFbGVtZW50KHtcclxuICAgICAgICBlbGVtZW50OiAnaGVhZGVyJywgYXR0cmlidXRlczogeyBpZDogJ2hlYWRlci13aW5kb3cnIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGxldCBtYWluID0gZG9jdW1lbnQuYm9keS5tYWtlRWxlbWVudCh7XHJcbiAgICAgICAgZWxlbWVudDogJ21haW4nLCBhdHRyaWJ1dGVzOiB7IGlkOiAnbWFpbi13aW5kb3cnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgIHsgZWxlbWVudDogJ25hdicsIGF0dHJpYnV0ZXM6IHsgaWQ6ICduYXZpZ2F0b3InIH0gfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudDogJ3NlY3Rpb24nLCBhdHRyaWJ1dGVzOiB7IGlkOiAncmVxdWVzdC13aW5kb3cnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBpZDogJ3JlcXVlc3QtY29udGVudHMnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtbXUuZ2VuZXJhdGVSZXF1ZXN0Q29udGVudCh7IG5hbWU6ICd1cmwnIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW11LmdlbmVyYXRlUmVxdWVzdENvbnRlbnQoeyBuYW1lOiAnbWV0aG9kJywgb3B0aW9uczogWydQT1NUJywgJ0dFVCcsICdERUxFVEUnXSB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBjbGFzczogJ3JlcXVlc3Qtd2luZG93LWNvbnRlbnQnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2xhYmVsJywgYXR0cmlidXRlczogeyBjbGFzczogJ3JlcXVlc3Qtd2luZG93LWNvbnRlbnQtbGFiZWwnIH0sIHRleHQ6ICdSZXF1ZXN0IERhdGEnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZWxlbWVudDogJ2knLCBhdHRyaWJ1dGVzOiB7IGNsYXNzOiAnZmFzIGZhLXBsdXMnLCBpZDogJ25ldy1kYXRhJyB9IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdkaXYnLCBhdHRyaWJ1dGVzOiB7IGlkOiAncmVxdWVzdC1kYXRhJyB9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnZGl2JywgYXR0cmlidXRlczogeyBpZDogJ3JlcXVlc3QtY29udHJvbHMnIH0sIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGVsZW1lbnQ6ICdidXR0b24nLCBhdHRyaWJ1dGVzOiB7IGlkOiAnc3VibWl0LXJlcXVlc3QnIH0sIHRleHQ6ICdTdWJtaXQgUmVxdWVzdCcgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsb2dnZXIuY3JlYXRlV2luZG93KClcclxuICAgICAgICBdXHJcbiAgICB9KTtcclxuXHJcbiAgICBsZXQgbmV3RGF0YSA9IG1haW4uZmluZCgnI25ldy1kYXRhJyk7XHJcbiAgICBsZXQgc3VibWl0UmVxdWVzdCA9IG1haW4uZmluZCgnI3N1Ym1pdC1yZXF1ZXN0Jyk7XHJcbiAgICBsZXQgcmVxdWVzdERhdGEgPSBtYWluLmZpbmQoJyNyZXF1ZXN0LWRhdGEnKTtcclxuICAgIGxldCByZXNwb25zZVdpbmRvdyA9IG1haW4uZmluZCgnI3Jlc3BvbnNlLXdpbmRvdycpO1xyXG4gICAgbGV0IHJlc3BvbnNlV2luZG93Q2xlYXIgPSBtYWluLmZpbmQoJyNyZXNwb25zZS13aW5kb3ctY2xlYXInKTtcclxuICAgIGxldCByZXNwb25zZVdpbmRvd1RvZ2dsZSA9IG1haW4uZmluZCgnI3Jlc3BvbnNlLXdpbmRvdy10b2dnbGUnKTtcclxuXHJcbiAgICBuZXdEYXRhLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXZlbnQgPT4ge1xyXG4gICAgICAgIHJlcXVlc3REYXRhLm1ha2VFbGVtZW50KG1tdS5nZW5lcmF0ZURhdGEoKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXF1ZXN0RGF0YS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcclxuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygncmVxdWVzdC1zaW5nbGUtZGF0YS1yZW1vdmUnKSkge1xyXG4gICAgICAgICAgICBldmVudC50YXJnZXQucGFyZW50Tm9kZS5yZW1vdmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBzdWJtaXRSZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXZlbnQgPT4ge1xyXG4gICAgICAgIG1tdS5zZW5kUmVxdWVzdCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmVzcG9uc2VXaW5kb3dUb2dnbGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgcmVzcG9uc2VXaW5kb3cudG9nZ2xlQ2xhc3MoJ3Jlc3BvbnNlLXdpbmRvdy1mdWxsJyk7XHJcbiAgICAgICAgcmVzcG9uc2VXaW5kb3dUb2dnbGUudG9nZ2xlQ2xhc3MoJ2ZhLWFycm93LWRvd24nKTtcclxuICAgICAgICByZXNwb25zZVdpbmRvd1RvZ2dsZS50b2dnbGVDbGFzcygnZmEtYXJyb3ctdXAnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJlc3BvbnNlV2luZG93Q2xlYXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XHJcbiAgICAgICAgbG9nZ2VyLmNsZWFyKCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGV2ZW50ID0+IHtcclxuICAgIGRvY3VtZW50LmJvZHkuaW5uZXJIVE1MID0gJyc7XHJcbiAgICBtbXUucmVuZGVyKCk7XHJcbn0pO1xyXG4iXX0=
