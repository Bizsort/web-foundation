declare global {
    interface StringConstructor {
        //format(format: string, arg0?, arg1?): string;
        format(format: string, arg0?, arg1?): string;
        formatFunc(format: string): (...args) => string;
        formatPhone(phone: string): string;
        isNullOrWhiteSpace(value: string): boolean;
        isNullOrEmpty(value: string): boolean;
        trim(value: string): string;
        pluralize(value: string, count?: number): string;
        capitalize(value: string): string;
        toTitleCase(value: string): string;
        toDOM(html: string): NodeList;
    }
}

//babel-polyfill
//if (!String.prototype.endsWith) {
//    Object.defineProperty(String.prototype, 'endsWith', {
//        value: function (searchString /*, endPosition = @length */) {
//            var that = context(this, searchString, ENDS_WITH)
//                , endPosition = arguments.length > 1 ? arguments[1] : undefined
//                , len = toLength(that.length)
//                , end = endPosition === undefined ? len : Math.min(toLength(endPosition), len)
//                , search = String(searchString);
//            return $endsWith
//                ? $endsWith.call(that, search, end)
//                : that.slice(end - search.length, end) === search;
//        }
//    });
//}

//From jQuery Validation Plugin
String.format = function (format: string, arg0?, arg1?) {
    if (arguments.length === 1) {
        return format;
    }
    var args: any[];
    if (arguments.length > 2 && arg0.constructor !== Array) {
        //http://stackoverflow.com/questions/960866/how-can-i-convert-the-arguments-object-to-an-array-in-javascript
        args = Array.prototype.slice.call(arguments, 1); //jQuery.makeArray(arguments).slice(1);
    }
    else if (arg0.constructor !== Array) {
        args = [arg0];
    }
    else
        args = arg0;
    args.forEach((arg, index) => {
        format = format.replace(new RegExp("\\{" + index + "\\}", "g"), function () {
            return arg;
        });
    });
    return format;
};

String.formatFunc = (formatString: string) => {
    return (...args) => {
        if (!Array.isArray(args))
            args = [formatString];
        else
            args.unshift(formatString);
        return String.format.apply(undefined, args); //String.format.apply(this, args);
    };
};

String.formatPhone = function (phone: string) {
    if (typeof phone == 'string' && phone.length >= 10) {
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.length > 10 && phone.substring(0, 1) == '1')
            phone = phone.substring(1, 10);
        phone = phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }
    return phone;
};

String.isNullOrWhiteSpace = function (value: string): boolean {
    if (value) {
        var valueType = typeof value;
        if (valueType === 'undefined')
            return true;
        else if (valueType === 'string')
            return value.length == 0 || value.replace(/^\s\s*/, '').replace(/\s\s*$/, '').length == 0 ? true : false;
        else
            throw String.format('Expected string, got {0} ({1})', valueType, value);
    }
    else
        return true;
};

String.isNullOrEmpty = function (value) {
    if (value) {
        var valueType = typeof value;
        if (valueType === 'undefined')
            return true;
        else if (valueType === 'string')
            return value.length == 0 ? true : false;
        else
            throw String.format('Expected string, got {0} ({1})', valueType, value);
    }
    else
        return true;
};

String.trim = function (value: string): string {
    return value.trim();
};

String.pluralize = function (value: string, count?: number): string {
    if (value && (count || count === 0)) {
        if (value.charAt(value.length - 1) == 'y')
            return value.slice(0, value.length - 1) + 'ies';
        else if (value.charAt(value.length - 1) != 's')
            return value + 's';
    }
    return value;
};

String.capitalize = function (value: string): string {
    if (value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
    else
        return value;
};

//http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
String.toTitleCase = function (value: string): string {
    if (value) {
        return value.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }
    else
        return value;
};

//http://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro
String.toDOM = function (html: string): NodeList {
    if (html) {
        //jQuery(html);
        if (typeof html === "string") {
            //http://stackoverflow.com/questions/15458876/check-if-a-string-is-html-or-not
            if (!/<[a-z][\s\S]*>/i.test(html))
                html = '<p>' + html + '</p>';
            var template = <HTMLTemplateElement>document.createElement('template');
            template.innerHTML = html;
            return template.content.childNodes;
        }
    }
};

declare let String: StringConstructor;
export { String };

export class StringFormatter {
    //protected _formatString;
    protected _formatFunc;

    constructor(formatString: string, protected _args?: string[]) {
        this.FormatString = formatString;
    }

    set FormatString(formatString: string) {
        //if (this._formatString != formatString)
        //    this._formatString = formatString; ...
        this._formatFunc = String.formatFunc(formatString);
    }

    ToString(args): string {
        var a = [];
        if (this._args) {
            this._args.forEach((arg) => {
                a.push(args[arg]);
            });
        }
        else if (Array.isArray(args))
            a = args;

        return this._formatFunc(a);
    }
}