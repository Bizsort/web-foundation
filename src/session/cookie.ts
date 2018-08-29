import { Array, Error } from '../system'
import { Session as SessionSettings, WebSite as WebSiteSettings } from '../settings'

export interface Cookie {
    Name: string;
    Expires: Date;
    Value?;
}

class CookieCollection {
    domain: string;
    cookies = {};

    constructor() {
        this.domain = WebSiteSettings.Origin.Host/*location.hostname*/ != 'localhost' ? '; domain=.' + WebSiteSettings.Origin.Host/*location.hostname*/ : '';
        var badCookies = [];
        if (document.cookie) {
            var cookies = Array.mapReduce(document.cookie.split(";"), (cookieStr) => {
                try {
                    cookieStr = String.trim(cookieStr);
                    var index = cookieStr.indexOf('=');
                    var cookie;
                    var cookieName = '';
                    var cookieValue = '';
                    if (index > 0 && cookieStr.length > index) {
                        cookieName = cookieStr.substr(0, index);
                        cookie = { Name: cookieName };
                        try {
                            if (cookieName == SessionSettings.AutoSignin.CookieName) {
                                cookieValue = JSON.parse(cookieStr.substr(index + 1));
                            }
                            else {
                                cookieValue = cookieStr.substr(index + 1);
                            }
                        } catch (e) {
                            console.error(Error.getMessage(e));
                            badCookies.push(cookieName);
                        }
                    }
                    if (cookieName && cookieValue) {
                        cookie.Value = cookieValue;
                        return cookie;
                    }
                }
                catch (e) {
                    console.error(Error.getMessage(e));
                }
            });
            for (var i = 0, l = cookies.length; i < l; i++) {
                if (!cookies[i] || !cookies[i].Name)
                    continue;
                if (!this.cookies[cookies[i].Name])
                    this.cookies[cookies[i].Name] = cookies[i];
                else
                    badCookies.push(cookies[i].Name);
            }
        }
        //Chrome allows for diplicate cookies that have the same name but may differ in (sub-)domain, etc
        if (badCookies.length) {
            for (var i = 0, l = badCookies.length; i < l; i++) {
                this.Delete(badCookies[i]);
            }
        }
    }

    Get(name) {
        if (name) {
            return this.cookies[name];
        }
    }

    Set(cookie: Cookie) {
        if (cookie && cookie.Name) {
            var c = this.cookies[cookie.Name];
            var remove = cookie.Expires <= new Date() ? true : false;
            var cookieValue;
            if (typeof cookie.Value == "object")
                cookieValue = JSON.stringify(cookie.Value);
            else if (typeof cookie.Value == "string")
                cookieValue = cookie.Value;
            if (cookieValue)
                document.cookie = cookie.Name + '=' + cookieValue + '; expires=' + cookie.Expires.toUTCString() + '; path=/' + this.domain;
            if (c) {
                if (!remove) {
                    c.Value = cookie.Value;
                    c.Expires = cookie.Expires;
                }
                else
                    delete this.cookies[cookie.Name];
            }
            else if (!remove)
                this.cookies[cookie.Name] = cookie.Value;
        }
    }

    Delete(name) {
        var cookie = this.cookies[name];
        if (cookie) {
            var expires = new Date();
            expires.setDate(expires.getDate() - 1);
            document.cookie = name + '=; expires=' + expires.toUTCString() + '; path=/' + this.domain; //(new Date(0)).toUTCString()
            delete this.cookies[name];
        }
    }
}

export const Cookie = new CookieCollection();
