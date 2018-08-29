/*stub*/
import { Service as ServiceSettings, Session as SessionSettings, WebSite as WebSiteSettings } from './settings'
import { Cache } from './session/cache'
import { User, SigninFlags, SigninStatus, ServiceProvider } from './session/user'
import { Cookie } from './session/cookie'
import { Shell } from './navigation'
export { Cache, SigninStatus }

interface SessionContext {
    Interactive?: boolean;
    SameOrigin?: boolean;
    Requirement?: Requirement;
    EnterPromise?: any;
    Entered?: boolean;
    Navigating?: boolean | any;
    SuppressAutoLogin?: boolean;
    SigninToken?: any;
    ValidToken?: boolean;
    NewSession?: boolean;
    Resetting?: boolean;
    Id?: string;
}

export const Context: SessionContext = function () {
    //http://bl.ocks.org/abernier/3070589
    WebSiteSettings.Origin.Host = location.hostname.toLowerCase();
    WebSiteSettings.Origin.AbsoluteUri = location.origin.toLowerCase();

    //document.referrer will be google when site is searched
    var foreignRequest; //=document.referrer && document.referrer.search(new RegExp(WebSiteSettings.Origin.Host, "i")) == -1 ? true : false; //document.referrer.indexOf(WebSiteSettings.Origin.Host)
    if (foreignRequest)
        console.warn('Foreign origin detected (' + document.referrer + ')');
    return {
        //http://stackoverflow.com/questions/20084513/detect-search-crawlers-via-javascript
        Interactive: /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent) || foreignRequest ? false : true, //navigator.userAgent == "adscrl_headless"
        SameOrigin: ServiceSettings.Origin.match(location.host.toLowerCase() + '$') ? true : false //endsWith(location.host.toLowerCase()) (https://stackoverflow.com/questions/3715309/how-to-know-that-a-string-starts-ends-with-a-specific-string-in-jquery)
    }
}();


export interface StoredSession {
    token?: string;
    user?: User;
}

export const Storage = sessionStorage;

export class Session {
    static _user: User;
    static get User(): User {
        return Session._user || function () {
            Session._user = new User();
            //TODO: *.html import
            window['Session']['User'] = Session._user;
            return Session._user;
        }();
    }

    static AuthenticateToken(token) { }
    static ReflectToken(token) { }
}

namespace SessionService {
    export function SignIn_Auto (token, callback, faultCallback?) { };

    export function Enter(callback, faultCallback) { };

    export function SignOut () { };
}

export namespace Session {
    export const Enabled = Storage ? true : false;

    export function Preserve() {
        //Prevent refresh loop for page snapshot by search engine or other site
        if (!Context.Interactive || Context.Resetting)
            return;

        var sessionState: StoredSession;

        if (Context.Id)
            sessionState = { token: Context.Id };
        else
            sessionState = {};

        if (Session.User.Id)
            sessionState.user = Session.User.Clone;
        else { 
            sessionState.user = { Id: 0 };
            if (Context.SigninToken)
                sessionState.user.GotoSignin = true;
        }

        Storage.setItem(SessionSettings.StorageItemName, JSON.stringify(sessionState));
        Cache.Preserve();
    }

    export function Reset(token: any) {
        //Prevent refresh loop for page snapshot by search engine or other site
        if (!Context.Interactive || Context.Resetting)
            return;

        var sessionState = Storage.getItem(SessionSettings.StorageItemName);
        if (sessionState || Context.Id || Session.User.Id > 0) {
            console.warn('Trying to restart session');
            if (sessionState)
                Storage.removeItem(SessionSettings.StorageItemName)
            if (Context.Id)
                Context.Id = '';
            if (Session.User.Id)
                Session.User.Exit();
            Context.Resetting = true;
            Shell.Refresh(token);
            return true;
        }
    }

    export function TrySignIn(callback?) {
        var loginCookie = Cookie.Get(SessionSettings.AutoSignin.CookieName);
        if (loginCookie) {
            var token = loginCookie.Value.Token;
            var expireAfter = SessionSettings.AutoSignin.ExpireAfter;
            var cb = (loginResponse) => {
                if (loginResponse && loginResponse.Status == SigninStatus.Success) {
                    Session.User.AutoSignin = ServiceProvider.BizSrt; //loginCookie.Value.Type
                    Session.User.AutoSigninToken = token;
                    var date = new Date();
                    date.setDate(date.getDate() + expireAfter);
                    loginCookie.Expires = date;
                    Cookie.Set(loginCookie);
                }
                else
                    Cookie.Delete(SessionSettings.AutoSignin.CookieName);
                if (callback)
                    callback(loginResponse);
            }
            switch (loginCookie.Value.Type) {
                case ServiceProvider.BizSrt:
                    SessionService.SignIn_Auto(token, cb);
                    break;
            }
        }
        else if (callback)
            callback(null);
    }

    export const Enter = SessionService.Enter;
    export const SignOut = SessionService.SignOut;
}

export enum Requirement {
    None = 0,
    BeforeLoad = 1,
    AfterLoad = 2
}