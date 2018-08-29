import { Action, Action2, Error } from '../system'
import { Session, Storage } from '../session'
import { Page } from '../page'
import { DataException, DataExceptionType, SessionException, SessionExceptionType } from '../exception'
import { NodeRef } from '../model/foundation'

export namespace Cache {
    var masterCache = {};

    export function Get(cacheType, factory) {
        var cache = masterCache[cacheType];
        if (!cache) {
            cache = factory(cacheType);
            masterCache[cacheType] = cache;
        }
        return cache;
    }

    export function Preserve() {
        for (var cacheType in masterCache)
            masterCache[cacheType].Preserve();
    }

    export function Reset(full?) {
        var cache;
        for (var cacheType in masterCache) {
            cache = masterCache[cacheType];
            if (cache.IsUserSpecific || full)
                cache.Reset();
        }
    }
}

//http://www.webreference.com/authoring/languages/html/HTML5-Client-Side/
abstract class CacheBase<T> {
    IsUserSpecific = true;
    IsBusinessSpecific = false;
    Enabled = false;
    ItemKey = "Id";
    abstract Serialize(items: T[]): string;

    constructor(protected type: number, protected items: T[]) {
        if (Session.Enabled) {
            this.Enabled = true;
            try {
                var cachedItems = Storage.getItem(this.typeString);
                if (cachedItems) {
                    if (!this.DoNotStore) {
                        this.items = this.Deserialize(cachedItems);
                        return;
                    }
                    else
                        Storage.removeItem(this.typeString);
                }
                this.items = items;
            }
            catch (e) {
                console.error(Error.getMessage(e));
                this.items = items;
            }
        }
        else
            this.Enabled = false;
    }

    get typeString(): string {
        return this.type.toString();
    }

    Deserialize (items) {
        return JSON.parse(items)
    }

    CheckSession () {
        if (this.IsUserSpecific) {
            if (Session.User.Id > 0 && (!this.IsBusinessSpecific || Session.User.Business.Id > 0))
                return true;
            else
                throw new SessionException(SessionExceptionType.NotAuthenticated);
        }
        else
            return true;
    }

    DoNotStore: boolean;
    ShouldPreserve: boolean;
    Preserve () {
        if (this.Enabled && this.ShouldPreserve && !this.DoNotStore) {
            var json = this.Serialize(this.items);
            if (json)
                Storage.setItem(this.typeString, json);
        }
    }

    Reset (...args: any[]) {
        if (this.Enabled) {
            Storage.removeItem(this.typeString);

            if (this.items && this.items.length > 0)
                this.items.length = 0;

            this.ShouldPreserve = false;
        }
    }

    Add (item: T) {
        if (this.Enabled) {
            this.items.push(item);
            this.ShouldPreserve = true;
        }
    }

    Remove (key: number) {
        if (this.Enabled) {
            var index = -1;
            for (var i = 0, l = this.items.length; i < l; i++) {
                if (this.items[i][this.ItemKey] == key) {
                    index = i;
                    break;
                }
            }
            if (index >= 0)
                this.items.splice(index, 1);
            this.ShouldPreserve = true;
        }
    }

    GetItems(callback: Action<T[]>) {
        callback(this.items);
    }

    GetItem(key: number, callback: Action<T>) {
        if (this.Enabled) {
            return this.GetItems((items) => {
                callback(this.GetItemInner(items, key));
            });
        }
    }

    GetItemInner(items: T[], key: number): T {
        if (this.Enabled && items) {
            for (var i = 0, l = items.length; i < l; i++)
                if (items[i][this.ItemKey] == key) {
                    return items[i];
                }
        }
    }

    //2 overloads
    //void Exists(string name, K key, Action<bool> callback)
    //bool Exists(string name, K key, IdName<K>[] items)
    Exists(name: string, key: number, ...args) {
        if (arguments.length == 3) {
            if (typeof arguments[2] == 'function') {
                var callback = arguments[2];
                if (this.Enabled) {
                    this.GetItems((items) => {
                        callback(this.Exists(name, key, items));
                    });
                }
            }
            else if (arguments[2] && arguments[2].any) {
                name = name.toLowerCase();
                return arguments[2].any((i) => { return i != key && i.Name.toLowerCase() == name ? true : false });
            }
        }
    }
}

export abstract class FetchOneCache<T> extends CacheBase<T>{
    pending = [];
    fetching;

    abstract fetch(key: number, callback: Action<T>, faultCallback?: Action<any>);

    constructor(type: number) {
        super(type, []);
    }

    //sequence managing:
    //UI logic may issue two subsequent requests to the cache for items with different keys 1 and 2 
    //If second request superseds the first one, that is it replaces it, 
    //If first is a miss it will start asynchronous fetch 
    //If second is a hit and returns requested data immediately
    //asynchronous fetch for first comes back out-of-sequence and may overwrite UI
    get(getMethod: Action2<any, Action<T>>, key, callback: Action<T>, pendingCallbacks) {
        if (!this.fetching) {
            var promise = getMethod.call(this, key, callback);
            if (promise && promise.then) {
                this.fetching = true;
                promise.then(() => {
                    this.fetching = false;
                    console.log('FetchOneCache.get1(' + key + '): Promise finished');
                    while (pendingCallbacks.length > 0 && !this.fetching) {
                        var queuedItem = pendingCallbacks.pop();
                        console.log('FetchOneCache.get1(' + queuedItem.Key + '): Processing queued request');
                        this.get(getMethod, queuedItem.Key, queuedItem.Value, pendingCallbacks);
                    }
                });
                console.log('FetchOneCache.get1(' + key + '): Promise created');
            }
            return promise;
        }
        else {
            console.log('FetchOneCache.get1(' + key + '): Fetch in progress, queuing up request');
            pendingCallbacks.push({ Key: key, Value: callback });
        }
    }

    GetItem(key, callback: Action<T>) {
        this.get((key, callback) => {
            this.CheckSession();
            if (this.Enabled) {
                var item = this.GetItemInner(this.items, key);
                if (typeof item === 'undefined') {
                    console.log('FetchOneCache.get2(' + key + '): cache miss, fetching data');
                    var promise = this.fetch(key, (data) => {
                        console.log('FetchOneCache.get2(' + key + '): fetch callback');
                        if (data != undefined && !this.GetItemInner(this.items, data[this.ItemKey])) {
                            this.items.push(data);
                            this.ShouldPreserve = true;
                        }

                        callback(data);
                    });
                    return promise;
                }
                else {
                    console.log('FetchOneCache.get2(' + key + '): cache hit');
                    callback(item);
                }
            }
            else {
                this.fetch(key, callback);
            }
        }, key, callback, this.pending);
    }
}

export abstract class FetchAllCache<T> extends CacheBase<T>{
    callbacks: Array<any>;
    fetching;

    abstract fetch(callback: Action<T[]>, faultCallback);

    constructor(type: number) {
        super(type, null);
        this.fetching = false;
        this.callbacks = [];
    }

    //overload for void Get(Foundation.Controls.Action<V[]> callback)
    GetItems(callback: Action<T[]>) {
        //void Get(K key, Foundation.Controls.Action<V> callback) in CacheBase
        /*if (arguments.length == 2 && typeof arguments[0] == 'number' && typeof arguments[1] == 'function') {
            return Session.CacheBase.prototype.GetItem.apply(this, arguments);
        }
        else if(arguments.length == 1 && typeof arguments[0] == 'function')*/
        this.CheckSession();
        if (this.Enabled) {
            if (this.items == undefined) {
                if (!this.fetching) {
                    this.fetching = true;
                    return this.fetch((items) => {
                        this.fetching = false;
                        if (items) {
                            //Test for duplicates
                            var key;
                            var test = {};
                            for (var i = 0, l = items.length; i < l; i++) {
                                key = items[i][this.ItemKey];
                                if (test[key]) {
                                    throw new DataException(DataExceptionType.DuplicateRecord);
                                }
                                else
                                    test[key] = items[i];
                            }
                            this.items = items;
                        }
                        else if (!this.items)
                            this.items = [];
                        else if (this.items.length > 0)
                            this.items.length = 0;
                        this.ShouldPreserve = true;
                        callback(this.items);
                        while (this.callbacks.length > 0)
                            this.callbacks.pop()(this.items);
                    }, (ex) => {
                        this.fetching = false;
                        Page.Current.HandleError(ex, { silent: true });
                    });
                }
                else
                    this.callbacks.push(callback);
            }
            else
                callback(this.items);
        }
        else {
            return this.fetch((items) => {
                callback(items);
            }, null);
        }
    }

    Find(keys: number[], callback: Action<T[]>) {
        this.GetItems((values) => {
            var value, q = [];
            for (var i = 0, l = keys.length; i < l; i++) {
                value = this.GetItemInner(values, keys[i]);
                if (value)
                    q.push(value);
            }
            callback(q);
        });
    }

    Reset(...args: any[]) {
        super.Reset();
        if (this.Enabled)
            this.items = null;
    }
}

export abstract class TreeCache<T extends NodeRef> extends FetchAllCache<T>{
    isFlat;

    Reset(...args: any[]) {
        super.Reset();
        delete this.isFlat;
    }

    Deserialize (items) {
        if (this.isFlat != undefined)
            delete this.isFlat;
        items = JSON.parse(items);
        this.build(items);
        return items;
    }

    GetChildren(parentKey: number, callback: Action<T[]>) {
        this.GetItems((items) => {
            if (this.isFlat === true && parentKey == 0)
                callback(items.slice()); //make a copy
            else if (this.isFlat === false) {
                callback(Array.mapReduce(items, (n) => {
                    if (n.ParentId == parentKey)
                        return n;
                }));
            }
            else
                callback(null);
        });
    }

    GetItems(callback: Action<T[]>) {
        //void Get(K key, Foundation.Controls.Action<V> callback) in CacheBase
        /*if (arguments.length == 2 && typeof arguments[0] == 'number' && typeof arguments[1] == 'function') {
            return Session.CacheBase.prototype.Get.apply(this, arguments);
        }
        else if (arguments.length == 1 && typeof arguments[0] == 'function')*/
        return super.GetItems((items) => {
            this.build(items)
            callback(items);
        });
    }

    build(items: T[]) {
        if (this.isFlat == undefined) {
            for (var i = 0, l = items.length; i < l; i++) {
                if (items[i].ParentId > 0) {
                    this.isFlat = false;
                    break;
                }
            }
            if (this.isFlat === false) {
                for (var i = 0, l = items.length; i < l; i++) {
                    for (var j = 0; j < items.length; j++) {
                        if (items[j].ParentId == items[i].Id) {
                            items[i].HasChildren = true;
                            this.setChildren(items[i], items);
                        }
                    }
                }
            }
            else
                this.isFlat = true;
        }
    }

    setChildren (parent: T, items: T[]) {
        if (parent.HasChildren && !parent.Children) {
            var children = [];
            for (var i = 0, l = items.length; i < l; i++) {
                if (items[i].ParentId == parent.Id) {
                    children.push(items[i]);
                    items[i].Parent = parent;
                    this.setChildren(items[i], items);
                }
            }

            parent.Children = children;
        }
    }

    Add (item: T) {
        super.Add(item);
        //could simply reset too
        if (item.ParentId > 0 && this.isFlat !== undefined) {
            if (this.isFlat)
                this.isFlat = false;
            this.GetItems((items) => {
                var parent = this.GetItemInner(items, item.ParentId);
                if (parent) {
                    item.Parent = parent;
                    if (!parent.Children)
                        parent.Children = [];
                    parent.Children.push(item);
                    parent.HasChildren = true;
                }
            });
        }
    }

    Remove (key: number) {
        this.GetItems((items) => {
            var item = this.GetItemInner(items, key);
            super.Remove(key);
            //could simply reset too
            if (item && item.ParentId > 0 && this.isFlat === false) {
                var parent = this.GetItemInner(items, item.ParentId);
                if (parent && parent.Children) {
                    if (parent.Children.length == 1 && parent.Children[0].Id == key) {
                        delete parent.Children;
                        delete parent.HasChildren;
                    }
                    else {
                        var index = -1;
                        for (var i = 0, l = parent.Children.length; i < l; i++) {
                            if (parent.Children[i][this.ItemKey] == key) {
                                index = i;
                                break;
                            }
                        }
                        if (index >= 0)
                            parent.Children.splice(index, 1);
                        if (parent.Children.length == 0) {
                            delete parent.Children;
                            delete parent.HasChildren;
                        }
                    }

                    if (!parent.Children) {
                        var isFlat = true;
                        for (var i = 0, l = items.length; i < l; i++) {
                            for (var j = 0; j < items.length; j++) {
                                if (items[j].ParentId == items[i].Id) {
                                    isFlat = false;
                                    break;
                                }
                            }
                            if (!isFlat)
                                break;
                        }

                        if (isFlat === true)
                            this.isFlat = true;
                    }
                }
            }
        });
    }

    //Not utilized
    /*GetParent(key, callback) {
        this.GetItems((items) => {
            var item = this.GetItemInner(items, key);
            if (item)
                callback(item.ParentId);
            else
                callback(0);
        });
    }*/

    //Not utilized
    /*GetDisplayPath(key: number, callback: Action<T>) {
        this.GetItems((items) => {
            var path = '', parent = key, node;
            while (parent > 0) {
                node = this.GetItemInner(items, parent);
                if (node) {
                    if (path.length)
                        path += '\\';
                    path = node.Name + path;
                    parent = node.ParentId;
                }
                else
                    parent = 0;
            }
            callback(<T>{
                Id: key,
                Name: path
            });
        });
    }*/

    //Not utilized
    /*GetPath(key: number, callback: Action<T[]>) {
        this.GetItems((items) => {
            var path = [];
            this.getPathInner(items, path, key);
            callback(path);
        });
    }

    getPathInner(items: T[], path: any[], key: number) {
        if (key > 0) {
            var item = this.GetItemInner(items, key);
            if (item) {
                this.getPathInner(items, path, item.ParentId);
                path.push({ Id: item.Id, Name: item.Name, ParentId: item.ParentId });
            }
        }
    }*/
}