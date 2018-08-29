import { RegExp } from './regexp'

declare global {
    interface DateConstructor {
        serialize(date: Date): string;
        deserialize(date: string): Date;
        toString(date: Date, prefix?: boolean): string;
    }
}

//http://www.west-wind.com/weblog/posts/2009/Sep/15/Making-jQuery-calls-to-WCFASMX-with-a-ServiceProxy-Client
Date.serialize = function (date) {
    var wcfDate = '/Date(' + date.valueOf() + ')/';
    return wcfDate;
};

Date.deserialize = function (jsonDate: string) {
    var parser = RegExp.Patterns.Date_ISO.exec(jsonDate);
    if (parser) {
        var msec = parser.length > 6 ? parser[7] || "000" : "000";
        while (msec.length < 3) {
            msec += "0";
        }
        var utcMilliseconds = Date.UTC(+parser[1], +parser[2] - 1, +parser[3], +parser[4], +parser[5], +parser[6], +msec || 0);
        return new Date(utcMilliseconds);
    }
};

Date.toString = (function () {
    var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var func = function (date, prefix) {
        if (date) {
            var today = new Date();

            if (date.getFullYear() == today.getFullYear()) {
                if (date.getMonth() == today.getMonth() && date.getDate() == today.getDate()) {
                    var hours = date.getHours();
                    var ap = hours < 12 ? "AM" : "PM";
                    hours = hours % 12 || 12;
                    var minutes = date.getMinutes();
                    return (prefix ? 'at ' : '') + hours + ':' + (minutes >= 10 ? minutes : '0' + minutes) + ' ' + ap;
                }
                else
                    return (prefix ? 'on ' : '') + month[date.getMonth()] + ' ' + date.getDate();
            }
            else
                return (prefix ? 'on ' : '') + month[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear().toString().slice(2);
        }
    };
    return func;
})();

declare let Date: DateConstructor;
export { Date };