declare global {
    interface ObjectConstructor {
        isEmpty(value): boolean;
        mixin(target: any, object1?: any, ...objectN: any[]): any;
        extend(derived: any, base: any[]): any;
        deserialize(target: Object, object: any, props?: string[], exclude?: boolean): any;
    }
}

Object.isEmpty = function (obj): boolean {
    if (obj) {
        for (var name in obj) {
            if (obj.hasOwnProperty(name))
                return false;
        }
    }

    return true;
};

Object.mixin = function (target: any, object1?: any, ...objectN: any[]): any {
    //jQuery.extend.apply(this, arguments);
    var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // Handle a deep copy situation
    if (typeof target === "boolean") {
        deep = target;

        // Skip the boolean and the target
        target = arguments[i] || {};
        i++;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== "object" && typeof target !== "function") {
        target = {};
    }

    // Extend jQuery itself if only one argument is passed
    if (i === length) {
        target = this;
        i--;
    }

    for (; i < length; i++) {
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) != null) {
            // Extend the base object
            for (name in options) {
                src = target[name];
                copy = options[name];

                // Prevent never-ending loop
                if (target === copy) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if (deep && copy && (typeof copy === "object" || (copyIsArray = (copy.constructor === Array)))) {
                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && src.constructor === Array ? src : [];

                    } else {
                        clone = src && typeof copy === "object" ? src : {};
                    }

                    // Never move original objects, clone them
                    target[name] = Object.mixin(deep, clone, copy);

                    // Don't bring in undefined values
                } else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;

    /*var baseCtors: any[]; //String.format
    if (arguments.length > 2 && object1.constructor !== Array) {
        baseCtors = Array.prototype.slice.call(arguments, 1);
    }
    else if (object1.constructor !== Array) {
        baseCtors = [object1];
    }
    else
        baseCtors = object1;
    //https://www.typescriptlang.org/docs/handbook/mixins.html
    return Object.extend(target, baseCtors)*/
};

//https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/Mixins.md
Object.extend = function (derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        })
    });
};

Object.deserialize = function (target: Object, object: any, props?: string[], exclude?: boolean): Object {
    for (var prop in object) {
        if (prop == "Properties") {
            for (var p in object.Properties) {
                if (!(props && exclude && props.indexOf(<string>p) >= 0))
                    target[p] = object.Properties[p];
            }
        }
        else if (!(props && exclude && props.indexOf(<string>prop) >= 0))
            target[prop] = object[prop];
    }
    return target;
};

declare let Object: ObjectConstructor;
export { Object };