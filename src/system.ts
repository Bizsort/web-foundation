import * as Ajax from './system/ajax'
export { Array } from './system/array'
export { Date } from './system/date'
export { Object } from './system/object'
export { String, StringFormatter } from './system/string'
export { Ajax }

export interface Action<T> {
    (arg: T): void;
}

export interface Action2<T1, T2> {
    (arg1: T1, arg2?: T2): void;
}

declare global {
    interface ErrorConstructor {
        getMessage(e, data?): string;
    }
}

Error.getMessage = function (error, data?) {
    var errorMessage;
    if (data) {
        if (data.Message)
            errorMessage = data.Message;
        else
            error = data;
    }
    else if (error && error.description)
        errorMessage = error.description;

    if (!errorMessage) //Built-in Javascript Error object has it's message property name with lowercase m
        errorMessage = error.message || (typeof error == "string" && error) || (error.toString && error.toString()) || "Unknown error";

    if (errorMessage.length > 2048)
        return errorMessage.substring(0, 2048);
    else
        return errorMessage;
}

declare let Error: ErrorConstructor;
export { Error };

//http://stackoverflow.com/questions/12881212/does-typescript-support-events-on-classes
export class Event<T> {
    private _handlers: IEventHandler<T>[] = [];

    constructor(private _master?: Object) {
    }

    public AddHandler(handler: IEventHandler<T>) {
        this._handlers.push(handler);
    }

    public RemoveHandler(handler: IEventHandler<T>) {
        this._handlers = this._handlers.filter(h => h !== handler);
    }

    public get InvokationList(): IEventHandler<T>[] {
        return this._handlers;
    }

    public Invoke(sender?: Object, e?: T) {
        if (this._handlers) {
            this._handlers.slice().forEach(h => h(sender || this._master, e)); //make a copy
        }
    }
}

export namespace Guid {
    export const Empty: string = '00000000-0000-0000-0000-000000000000'

    export function isEmpty(guid) {
        return guid && guid.length > 0 && guid.indexOf('0000') == -1 ? false : true;
    }

    export function Deserialize(guid) {
        return guid.replace(/-/g, '')
    }

    //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    //http://guid.us/GUID/JavaScript
    export function newGuid() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    var s4 = function () {
        return Math.floor(((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
}

export interface IEventHandler<T> {
    (sender: Object, e?: T): void;
}
