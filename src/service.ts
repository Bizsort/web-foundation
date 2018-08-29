import * as Exception from './exception'
import { Service as ServiceSettings, Session as SessionSettings } from './settings'
import { Action, Ajax } from './system'
import { Context as Session } from './session'
import { Exception as ExceptionResource } from './resource'
import { Page } from './page'

export { Action, Page }

export namespace Fault {
    export enum Type {
        Unknown = 0,
        Operation = 1,
        Data = 2,
        Session = 3,
        Argument = 4
    }
}

var ajax = new Ajax.IronAjaxElement();

export const Get = ((baseUrl) => {
    var invoke: any = (url, options) => {
        if (!baseUrl)
            throw "Service Url is not set";
        else if (!(url && options && options.callback))
            throw "Url and options callback are required";

        var settings: Ajax.RequestOptions = {
            url: baseUrl + '/svc' + url,
            method: 'GET',
            async: true,
            handleAs: "json"
        };
        if (options.session && Session.Id) {
            settings.headers = {};
            settings.headers[SessionSettings.HttpHeader.Token] = Session.Id;
        }
        return ajax.generateRequest(settings, options.callback, (request: Ajax.IronRequestElement, error) => {
            if (request.status === 200) { //callback threw an error
                if (options.faultCallback)
                    options.faultCallback(error);
                else
                    Page.Current.HandleError(error);
            }
            else
                Page.Current.HandleAjaxError(request, error, options.faultCallback);
        });
    };

    invoke.Url = (url) => {
        if (url) {
            baseUrl = url;
        }
    };

    return invoke;
})(ServiceSettings.Origin)

export const Post = ((baseUrl, secureUrl?, key?) => {
    secureUrl = secureUrl || baseUrl;
    var invoke: any = (url, options) => {
        if (!baseUrl)
            throw "Service Url is not set";
        else if (!(url && options && options.data && options.callback))
            throw "Url, options data and callback are required";

        var settings: Ajax.RequestOptions = {
            url: baseUrl + '/svc' + url,
            method: 'POST',
            async: options.async !== false ? true : false,
            body: JSON.stringify(options.data),
            headers: {
                'content-type': 'application/json',
            },
            handleAs: 'json'
        };

        if (Session.Id) {
            settings.headers[SessionSettings.HttpHeader.Token] = Session.Id;
        }

        if (options.withCredentials === true) {
            settings.withCredentials = true;
        }

        if (options.secure || options.authorize) {
            settings.url = secureUrl + '/svc' + url;
            if (options.authorize && key)
                settings.headers[SessionSettings.HttpHeader.Key] = key;
        }

        return ajax.generateRequest(settings, options.callback, (request: Ajax.IronRequestElement, error) => {
            if (request.status == 200) { //callback threw an error
                if (options.faultCallback)
                    options.faultCallback(error)
                else
                    Page.Current.HandleError(error);
            }
            else
                Page.Current.HandleAjaxError(request, error, options.faultCallback);
        });
    };

    invoke.Url = (url, sUrl) => {
        if (url) {
            baseUrl = url;
            secureUrl = sUrl || url;
        }
    };

    invoke.Key = (newKey) => {
        key = newKey;
    };

    return invoke;
})(ServiceSettings.Origin)

export function TranslateFault(request) {
    if (request && request.status == 500 && request.xhr && (request.statusText == "AdScrl_Fault" || request.xhr.getResponseHeader(ServiceSettings.HttpHeader.Fault) == "AdScrl_Fault") && (request.response || request.xhr.response || request.responseText)) {
        try {
            var fault = request.response || request.xhr.response || JSON.parse(request.responseText);
        }
        catch (e) {
            return new Error(ExceptionResource.Unknown);
        }
        var ex: Exception.CustomError;
        switch (fault.Type) { //Foundation.X.Message
            case Fault.Type.Operation:
                if (fault.OperationExceptionType != undefined) {
                    var operationException = new Exception.OperationException(fault.OperationExceptionType);
                    if (fault.OperationName) {
                        operationException.OperationName = fault.OperationName;
                        operationException.message += ' (' + fault.OperationName + ')';
                    }
                    ex = operationException;
                }
                break;
            case Fault.Type.Data:
                if (fault.DataExceptionType != undefined) {
                    var dataException = new Exception.DataException(fault.DataExceptionType);
                    if (fault.DataExceptionType == Exception.DataExceptionType.DuplicateRecord) {
                        if (fault.KeyName) {
                            dataException.KeyName = fault.KeyName;
                            dataException.message += ' (' + fault.KeyName + ')';
                        }
                        if (fault.KeyValue)
                            dataException.KeyValue = fault.KeyValue;
                    }
                    ex = dataException;
                }
                break;
            case Fault.Type.Session:
                if (fault.SessionExceptionType != undefined) {
                    var sessionException = new Exception.SessionException(fault.SessionExceptionType);
                    if (fault.DataExceptionType == Exception.SessionExceptionType.QuotaExceeded) {
                        if (fault.Quota)
                            sessionException.Quota = fault.Quota;
                        if (fault.QuotaType)
                            sessionException.QuotaType = fault.QuotaType;
                    }
                    ex = sessionException;
                }
                break;
            case Fault.Type.Argument:
                if (fault.ArgumentExceptionType != undefined) {
                    var argumentException = new Exception.ArgumentException(fault.ArgumentExceptionType, fault.ParamName);
                    if (fault.ParamValue) {
                        argumentException.ParamValue = fault.ParamValue;
                        argumentException.message += ' (' + fault.ParamValue + ')';
                    }
                    ex = argumentException;
                }
                break;
        }
        if (!ex)
            ex = new Exception.UnknownException(fault.UnknownType, fault.Message);
        if (fault.EventLogId)
            ex.EventLogId = fault.EventLogId;
        return ex;
    }
    else if (request && request.status === 0)
        return new Exception.SessionException(Exception.SessionExceptionType.Unavailable);
}