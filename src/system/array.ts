declare global {
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    interface Array<T> {
        find(predicate: (value: T, index: number, array: Array<T>) => boolean, thisArg?: any): T;
        findIndex(predicate: (value: T, index: number, array: Array<T>) => boolean, thisArg?: any): number;
    }

    interface ArrayConstructor {
        //find2(predicate, thisValue): any;
        //mapReduce<T, U>(array: T[], callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
        //jQuery
        mapReduce<T, U>(array: T[], callback: (elementOfArray: T, indexInArray: number) => U): U[];
    }
}

//https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/find
if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
        value: function (predicate) {
            'use strict';
            if (this == null) {
                throw new TypeError('Array.prototype.find called on null or undefined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var list = Object(this);
            var length = list.length >>> 0;
            var thisArg = arguments[1];
            var value;

            for (var i = 0; i < length; i++) {
                value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return value;
                }
            }
            return undefined;
        }
    });
}

Array.mapReduce = function(elems, callback/*, arg*/) {
    var value,
        i = 0,
        length = elems.length,
        ret = [];

    // Go through the array, translating each of the items to their new values
    //if (isArraylike(elems)) {
        for (; i < length; i++) {
            value = callback(elems[i], i/*, arg*/);

            if (value != null) {
                ret.push(value);
            }
        }

    // Go through every key on the object,
    //} else {
    //    for (i in elems) {
    //        value = callback(elems[i], i, arg);

    //        if (value != null) {
    //            ret.push(value);
    //        }
    //    }
    //}

    // Flatten any nested arrays
    //return concat.apply([], ret);
    return ret;
};

declare let Array: ArrayConstructor;
export { Array };