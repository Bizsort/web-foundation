import { DataException, DataExceptionType, OperationException, OperationExceptionType, SessionException, SessionExceptionType } from './exception'
import { Location as LocationSettings,  Session as SessionSettings } from './settings'
import { Post, TranslateFault } from './service'
import { Event, Guid } from './system'
import { Cache, Context as SessionContext, Requirement as SessionRequirement, Session, Storage, StoredSession, SigninStatus } from './session'
import { ErrorOptions, IView, ViewModel } from './viewmodel'
import { Action as NavigationAction, Token as NavigationToken, Shell } from './navigation'
import * as Signin from './viewmodel/signin/form'

export { IView, NavigationAction, NavigationToken, ViewModel, Shell, Session }

//http://www.google.com/design/spec/layout/adaptive-ui.html#adaptive-ui-breakpoints
export const ResponsiveWidth = {
    xsmall: 480,
    small: 600,
    mediumsmall: 780,
    medium: 840,
    large: 960,
    xlarge: 1280
}
export const MOBILE_WIDTH_THRESHOLD = ResponsiveWidth.small;

export enum NavigationState {
    Inactive = 0,
    Active = 1,
    Navigating = 2
}

/*interface IViewModel {
    Error: string;
    notifyProperty: (propertyName: string, propertyValue, oldValue?, eventArgs?: Object) => void;
}*/

export interface PageModel extends ViewModel {
    Meta?: PageMetadata;
    Token?: NavigationToken;
    ValidateToken(token: NavigationToken);
    ValidateOrRedirect?: (token: NavigationToken) => any;
    ReflectUser?: (evaluateActions?: boolean) => void;
    ReflectToken?: (populateParams?: boolean) => void;
    Home?: () => NavigationToken | string;
    Search?: (...args: any[]) => void | boolean;
    SearchBox?: ISearchBox;
    Load?: () => void;
    Loaded?: boolean;
    NavigationState?: NavigationState;
}

//ViewModel properties are set upon successfull navigation
export class PageMetadata {
    constructor(protected _page: PageModel) { }

    //CanonicalToken used to reset properties such as Page and NavigationFlags.Tab_Products
    _token: NavigationToken;
    set Token(token: NavigationToken) {
        this._token = token;
        this.CanonicalLink = Shell.Href(token);
    }
        
    get Token(): NavigationToken {
        var token = this._token || this._page.Token;
        if (token.Page || token.NavigationFlags) { //Reset properties such as Page and NavigationFlags.Tab_Products
            token = token.Clone;
            if (token.Page)
                token.Page = 0;
            if (token.NavigationFlags)
                token.NavigationFlags = 0;
        }
        return token;
    }

    _title: string;
    set Title(title: string) {
        this._title = title;
        if ((this._page.NavigationState & NavigationState.Active) > 0)
            PageMetadata.setTitle(this._title);
    }
    //http://stackoverflow.com/questions/26324990/title-of-history-pushstate-is-unsupported-whats-a-good-alternative/26325048#26325048
    //https://github.com/browserstate/history.js/blob/master/scripts/uncompressed/history.js#L1293
    private static setTitle(title: string) {
        /*try {
            //only the first occurrence will be replaced
            document.getElementsByTagName('title')[0].innerHTML = title.replace('<', '&lt;').replace('>', '&gt;').replace(' & ', ' &amp; ');
        }
        catch (e) { }*/
        document.title = title;
    }

    _description: string;
    set Description(description: string) {
        this._description = description;
        if ((this._page.NavigationState & NavigationState.Active) > 0)
            PageMetadata.setMetaTag("description", description)
    }

    private _canonicalLinkHref: string;
    set CanonicalLink(canonicalLink: string) {
        this._canonicalLinkHref = canonicalLink;
        if ((this._page.NavigationState & NavigationState.Active) > 0)
            PageMetadata.setCanonicalLink(this._canonicalLinkHref);
    }
    private static _canonicalLink: HTMLLinkElement;
    private static setCanonicalLink(href: string) {
        if (!PageMetadata._canonicalLink)
            PageMetadata._canonicalLink = PageMetadata.setLinkTag("canonical", href);
        else
            PageMetadata._canonicalLink.href = href;
    }

    //https://developers.google.com/search/mobile-sites/mobile-seo/separate-urls
    private _alternateLinkHref: string;
    set AlternateLink(alternateLink: string) {
        this._alternateLinkHref = alternateLink;
        if ((this._page.NavigationState & NavigationState.Active) > 0)
            PageMetadata.setAlternateLink(this._alternateLinkHref);
    }
    private static _alternateLink: HTMLLinkElement;
    private static setAlternateLink(href: string) {
        if (!PageMetadata._alternateLink) {
            PageMetadata._alternateLink = PageMetadata.setLinkTag("alternate", href);
            if (PageMetadata._alternateLink)
                PageMetadata._alternateLink.media = 'only screen and (max-width: ' + MOBILE_WIDTH_THRESHOLD + 'px)';
        }
        else
            PageMetadata._alternateLink.href = href;
    }

    static setLinkTag(rel: string, href: string): HTMLLinkElement {
        var link = <HTMLLinkElement>document.head.querySelector('link[rel="' + rel + '"]');
        if (!link && href) {
            link = document.createElement("link");
            link.rel = rel;
            document.head.appendChild(link);
        }
        else if (!href)
            return;
        link.href = href;
        return link;
    }

    private _entity: HTMLScriptElement;
    set Entity(jsonld: Object) {
        if (!this._entity) {
            this._entity = PageMetadata.setScriptTag("entityMetatata", "application/ld+json", JSON.stringify(jsonld), this._page.View.HostElement);
        }
        else
            this._entity.innerText = JSON.stringify(jsonld);
    }

    //https://developers.google.com/structured-data/breadcrumbs#examples
    private _breadcrumbsJsonld: Object;
    set Breadcrumbs(breadcrumbs: MetaBreadcrumb[]) {
        var ile = [], index = 1;
        breadcrumbs.forEach(bc => {
            ile.push({
                "@type": "ListItem",
                "position": index++,
                "item": {
                    "@id": bc.url,
                    "name": bc.name
                }
            });
        });

        this._breadcrumbsJsonld = {
            "@context": "http://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": ile
        };
            
        if ((this._page.NavigationState & NavigationState.Active) > 0) {
            PageMetadata.setBreadcrumbList(this._breadcrumbsJsonld);
        }
    }
    private static _breadcrumbList: HTMLScriptElement;
    private static setBreadcrumbList(breadcrumbsList: Object) {
        if (!PageMetadata._breadcrumbList) {
            PageMetadata._breadcrumbList = PageMetadata.setScriptTag("breadcrumbList", "application/ld+json", JSON.stringify(breadcrumbsList));
        }
        else
            PageMetadata._breadcrumbList.innerText = JSON.stringify(breadcrumbsList);
    }

    static setScriptTag(id: string, type: string, text: string, appendTo?: HTMLElement): HTMLScriptElement {
        var script = <HTMLScriptElement>document.querySelector("#" + id);
        if (!script) {
            script = document.createElement("script");
            script.id = id;
            script.type = type;
            if (!appendTo)
                appendTo = document.head;
        }
        else if (appendTo)
            appendTo = null;
        script.innerText = text;
        if (appendTo)
            appendTo.appendChild(script);
        return script;
    }

    Reflect() {
        if (this._title)
            PageMetadata.setTitle(this._title);
        if (this._description)
            PageMetadata.setMetaTag("description", this._description);
        if (this._breadcrumbsJsonld)
            PageMetadata.setBreadcrumbList(this._breadcrumbsJsonld);
        PageMetadata.setCanonicalLink(this._canonicalLinkHref || ''); //https://productforums.google.com/forum/#!topic/webmasters/07wbuebu90Y
        PageMetadata.setAlternateLink(this._alternateLinkHref || '');
    }

    static setMetaTag(name, value) {
        var meta = <HTMLMetaElement>document.head.querySelector('meta[name="' + name + '"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = value;
    }
}

export interface MetaBreadcrumb {
    url: string;
    name: string;
}

interface ISearchBox {
    query: String;
}

export class Page {
    static _page: Page;
    static get Current(): Page
    {
        return Page._page || function () {
            Page._page = new Page();
            Page.ReflectSize();
            return Page._page;
        }();
    }

    get Token(): NavigationToken {
        return this._viewModel && this._viewModel.Token;
    }

    static MobileScreen: boolean;
    static ReflectSize(contentWidth?) {
        if (!document.body) return;
        var width = contentWidth || Math.floor(document.documentElement.clientWidth);
        if (width && Page.Current) {
            Page.Current.ContentWidth = width;
            Page.MobileScreen = (width <= MOBILE_WIDTH_THRESHOLD ? true : false);
            //Page.Current.ContentHeight = Math.floor(document.documentElement.clientHeight);
        }
    }

    static OnlineDebug(message: string) {
        var div = <HTMLDivElement>document.createElement("div");
        div.innerText = message;
        document.body.appendChild(div);
    }

    constructor() {
        //Page.Current = this; -> Page.Current.get
        //Session.User = new SessionModel.User(); -> Session.User.get

        Session.User.SignedInChanged.AddHandler(() => {
            if ((<any>this._viewModel.View.HostElement).reflectUser)
                (<any>this._viewModel.View.HostElement).reflectUser(true);
            if (Session.User.Id) {
                //Check User.GotoSignin before closing the dialog as it will get reset
                if (Session.User.GotoSignin) {
                    Session.User.GotoSignin = false;
                    Shell.TryForward(this._viewModel.Token);
                }
                if (this._signIn)
                    this._signIn.Hide(); //Will reset User.GotoSignin
            }
        });

        var newSession = Storage.getItem("newSession");
        var passwordReset = Storage.getItem("passwordReset");
        if (!(newSession || passwordReset)) {
            var sessionState: string | StoredSession = Storage.getItem(SessionSettings.StorageItemName);
            if (sessionState && SessionContext.Interactive) {
                console.log('Session state present');

                sessionState = <StoredSession>JSON.parse(sessionState);
                if (sessionState.token) {
                    //Could also check if session was created by the same browser window and if not, ignore?
                    SessionContext.Id = sessionState.token;

                    console.log('Session ' + sessionState.token + ' assigned from session state');
                }

                if (sessionState.user) {
                    Session.User.Enter(sessionState.user, true); //Suppress SignedInChanged, will raise it later on

                    if (Session.User.Id) {
                        console.log('User ' + Session.User.Id + ' restored from session state');

                        if (sessionState.user.AutoSignin && sessionState.user.AutoSigninToken) {
                            Session.User.AutoSignin = sessionState.user.AutoSignin;
                            Session.User.AutoSigninToken = sessionState.user.AutoSigninToken;
                        }
                    }
                    else if (sessionState.user.GotoSignin) {
                        Session.User.GotoSignin = true;
                    }
                }
            }
        }
        else {
            if (passwordReset) {
                Storage.removeItem("passwordReset");
                Session.User.GotoSignin = passwordReset;
            }
            if (newSession)
                Storage.removeItem("newSession");

            SessionContext.NewSession = true;
        }

        //Comment this out to break on the actual error
        window.onerror = (e: any, file, line, column, error) => {
            debugger;
            if (error) {
                console.error(error);

                //To test Fetch as Google
                //Page.OnlineDebug(error + (file ? ", " + file : "") + (line ? " line:" + line : ""));
            }
            if (e instanceof SessionException && (<SessionException>e).Type == SessionExceptionType.Unavailable) {
                this.HandleSessionError(e);
            }
            else {
                var message = 'JavaScript error: \t' + Error.getMessage(e);
                if (file) {
                    message += '\nFile name:      \t' + file;
                    if (line)
                        message += '\nLine number:       \t' + line;
                }
                this.HandleError(message);
            }
            return true;
        };

        //Page refresh, Back and Forward
        window.addEventListener("beforeunload", function () { //$(window).bind("beforeunload", ...) //window.onbeforeunload = won't work in FF
            //Preserve session periodically as if Browser Back button is clicked it will bypass the Navigation routine
            try {
                if (SessionContext.Id)
                    console.log('Preserving session ' + SessionContext.Id + (Session.User.Id ? ' (user: ' + Session.User.Id + ')' : ' (not sigened in)'));
                Session.Preserve();
            }
            catch (e) {
                console.error(Error.getMessage(e));
            }
        });
    }

    protected _viewModel: PageModel;
    get ViewModel(): PageModel {
        return this._viewModel;
    }
    set ViewModel(viewModel: PageModel) {
        if (viewModel) {
            if (this._viewModel && !(SessionContext.Navigating || this._viewModel.Error))  //Page redirect or Navigation error
                throw "Page's ViewModel has already been assigned";
            viewModel.Page = viewModel;
            //https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/Mixins.md
            /*var vmPrototype = Object.getPrototypeOf(viewModel);
            Object.getOwnPropertyNames(PageModel.prototype).forEach(name => {
                if (!vmPrototype[name])
                    vmPrototype[name] = PageModel.prototype[name];
            });*/
            viewModel.Meta = new PageMetadata(viewModel);

            var token = SessionContext.Navigating instanceof NavigationToken ? SessionContext.Navigating : Shell.ParseToken();
            SessionContext.Navigating = false;

            //Set page's Token right away (this.Page.Token calls in controls, etc)
            this._validateToken(viewModel, token);
            if (viewModel.Token)
                this._viewModel = viewModel;
        }
        else if (this._viewModel)
            this._viewModel = null;
    }
    get Error(): string {
        return this._viewModel && this._viewModel.Error; 
    }

    protected _validateToken(viewModel: PageModel, token: NavigationToken) {
        try {
            SessionContext.ValidToken = false;
            var valid = this._validateOrRedirect(viewModel, token);
            if (valid === true) {
                viewModel.Token = token;
                SessionContext.ValidToken = true;

                if (Session.User.GotoSignin)
                    console.warn('Token requires a signed-on user');
            }
            else if (valid instanceof NavigationToken) { //Page issued own Token
                console.log('ValidateOrRedirect has issued a new token');
                viewModel.Token = valid;
                SessionContext.ValidToken = true;
            }
            else if (typeof valid === "string") { //Page redirected to new Url
                console.warn('ValidateOrRedirect redirected to ' + valid);
                SessionContext.Navigating = true;
            }
            //else if (validToken === false && SessionContext.SigninToken)
            //    console.warn('Token requires a signed-on user');
            else {
                viewModel.Error = 'Token validation failed or was not implemented';
                console.warn(viewModel.Error);
            }
        }
        catch (e) {
            debugger;
            viewModel.Error = Error.getMessage(e);
        }

        if (viewModel.Token && !viewModel.Error) {
            /*if (viewModel.Token.CategoryId || viewModel.Token.ToUser)
                Session.User.CategoryId = viewModel.Token.CategoryId;
            if ((viewModel.Token.LocationId && viewModel.Token.LocationId != LocationSettings.Country.Id) ||  viewModel.Token.ToUser)
                Session.User.LocationId = viewModel.Token.LocationId;*/
            Session.ReflectToken(viewModel.Token);
        }

        //Some controls may need to access this.Page.Token property (Search Home, Category and Location Input)
        viewModel.Token = token || new NavigationToken(NavigationAction.Default);
    }

    protected _validateOrRedirect(viewModel: PageModel, token: NavigationToken): any {
        if (!viewModel.ValidateOrRedirect) {
            /*if (token && token.IsAdmin) {
                if (Session.User.Id > 0) {
                    //Former SessionContext.Token.SetCurrent
                    if (token.AccountType == AccountType.Business && token.Action != NavigationAction.ProfileNew) {
                        var business = Session.User.Business.Id;
                        if (Session.User.Business.Id <= 0 || token.AccountId != Session.User.Business.Id)
                            throw new SessionException(SessionExceptionType.Unauthorized);
                    }
                    else if (token.AccountId != Session.User.Id)
                        throw new SessionException(SessionExceptionType.Unauthorized);
                }
                else {
                    //Redirect to User page to Signin
                    //return Shell.Go(new Token(NavigationAction.Default, Settings.WebSite.HomePage, null, token));
                    Session.User.GotoSignin = true;
                }
            }*/
            Session.AuthenticateToken(token);

            return viewModel.ValidateToken(token);
        }
        else
            return viewModel.ValidateOrRedirect(token);
    }

    protected _responsiveWidth: number = 0;
    get ResponsiveWidth(): number {
        return this._responsiveWidth;
    }
    set ResponsiveWidth(responsiveWidth: number) {
        if (this._responsiveWidth != responsiveWidth) {
            this._responsiveWidth = responsiveWidth;
            if (this.ViewModel && (this.ViewModel.NavigationState & NavigationState.Active) > 0)
                this.ViewModel.notifyProperty("ResponsiveWidth", this._responsiveWidth);
        }
    }
    setResponsiveWidth(width: number) {
        var w1 = 0, w2;
        for (var rw in ResponsiveWidth) {
            w2 = ResponsiveWidth[rw];
            if (w1 <= width && (width <= w2 || w2 == ResponsiveWidth.xlarge)) {
                this.ResponsiveWidth = w1;
                break;
            }
            w1 = w2;
        }
    }

    protected _contentWidth: number = 0;
    get ContentWidth(): number {
        return this._contentWidth;
    }
    set ContentWidth(contentWidth: number) {
        if (this._contentWidth != contentWidth) {
            this._contentWidth = contentWidth;
            if (this.ViewModel && (this.ViewModel.NavigationState & NavigationState.Active) > 0)
                this.ViewModel.notifyProperty("ContentWidth", this._contentWidth);
            this.setResponsiveWidth(this._contentWidth);
        }
    }
    get ContentHeight(): number {
        return document.documentElement.clientHeight;
    }

    protected _dialogs = {};
    get Dialogs(): Object {
        return this._dialogs;
    }
    public OpenDialog(form: string, options?) {
        switch (form) {
            case "SignIn":
                this._showSignIn(<Signin.OpenAction>options);
                break;
            default:
                var dialog = this._dialogs[form];
                if (!dialog) {
                    dialog = document.createElement(form);
                    document.body.appendChild(dialog);
                    this._dialogs[form] = dialog;
                }
                dialog.open(options);
                return dialog;
        }
    }

    protected _signIn: Signin.Form;
    protected _showSignIn(options?: Signin.OpenAction): boolean {
        if (!this._signIn) {
            var signIn = document.createElement('signin-form');
            document.body.appendChild(signIn);
            this._signIn = (<any>signIn).model;
        }
        this._signIn.Show(options);
        return true;
    }

    Initialize() {
        if (!this._viewModel)
            throw "Page's ViewModel has not been assigned";
        else if (SessionContext.Navigating || this._viewModel.Error) //Page redirect or Navigation error
            return;

        if (SessionContext.NewSession) {
            if (Session.Enabled) {
                Storage.clear();
                Cache.Reset();
            }
            SessionContext.NewSession = false;
        }

        this._viewModel.Initialize();
        this._viewModel.Initialized = true;
        if ((<any>this._viewModel.View.HostElement).reflectToken)
            (<any>this._viewModel.View.HostElement).reflectToken(true);

        /*Googlebot does not support Promises https://plus.google.com/+JohnMueller/posts/LT4fU7kFB8W
        It doesn't seem to support CORS either so we need an IIS Forward Proxy using Application Request Routing and URL Rewrite
        http://www.iis.net/learn/extensions/configuring-application-request-routing-arr/creating-a-forward-proxy-using-application-request-routing*/
        if (SessionContext.Requirement === SessionRequirement.BeforeLoad || SessionContext.Id || Session.User.Id > 0)
            this._enterSession(true);
        else
            this._load(SessionContext.Requirement === SessionRequirement.AfterLoad);

        return true;
    }

    protected _enterSession(load?: boolean) {
        if (SessionContext.Interactive && !SessionContext.Entered) {
            console.log('Entering session ' + SessionContext.Id);
            try {
                SessionContext.EnterPromise = Session.Enter((enterResponse) => {
                    try {
                        if (SessionContext.EnterPromise)
                            delete SessionContext.EnterPromise;
                        if (enterResponse) {
                            if (!Guid.isEmpty(enterResponse.Token)) {
                                //New session was created
                                if (!Guid.isEmpty(SessionContext.Id) && SessionContext.Id != enterResponse.Token) {
                                    debugger;
                                    console.warn('Server session ' + SessionContext.Id + ' has been recycled, new session ' + enterResponse.Token);
                                    if (Session.User.Id) {
                                        console.warn('User obtained from session state');
                                        Session.User.Exit();
                                    }
                                }
                                else
                                    console.log('Entered session ' + enterResponse.Token);

                                SessionContext.Id = enterResponse.Token;
                                SessionContext.Entered = true;
                            }
                            else if (SessionContext.Requirement)
                                throw new SessionException(SessionExceptionType.Unavailable);

                            if (Session.User.Id > 0) {
                                if (!Guid.isEmpty(enterResponse.Key))
                                    Post.Key(enterResponse.Key);
                                else
                                    throw new SessionException(SessionExceptionType.NotAuthenticated);
                            }

                            if (load)
                                this._load();
                        }
                        else
                            throw new SessionException(SessionExceptionType.Unavailable);
                    }
                    catch (e) {
                        console.error('Session handhshake error [1]: ' + Error.getMessage(e));
                        this.HandleSessionError(e);
                    }
                }, (ex) => {
                    if (ex instanceof OperationException && (<OperationException>ex).Type == OperationExceptionType.InvalidInteraction)
                        console.error('Session handhshake error [1]: Server user mismatch, attempting to Reset');
                    else
                        console.error('Session handhshake error [2]: ' + Error.getMessage(ex) + ', attempting to Reset');
                    if (!Session.Reset(this._viewModel.Token))
                        this.HandleSessionError(ex, true);
                });
            }
            catch (e) {
                console.error('Session handhshake error [3]: ' + Error.getMessage(e));
                this.HandleSessionError(e);
            }
        }
        else if (load)
            this._load();
    }

    protected _load(enterSession?: boolean) {
        //this._viewModel.Loaded = ($("#content").attr('data-loaded') === "true" ? true : false);
        //if (!this._viewModel.Loaded) ...

        //Important - don't login if token is not valid, otherwise after the redirect SessionContext.Enter will fail due to server session having a userId already
        //Used to Enter Session regardless of the token validity so it doesn't get recycled (may need to revisit the server logic)
        if (SessionContext.ValidToken) {
            if (Session.User.Id)
                Session.User.SignedInChanged.Invoke();
            else {
                if (Session.User.GotoSignin)
                    this._showSignIn(typeof Session.User.GotoSignin === "string" && {
                        pwd: Session.User.GotoSignin
                    });
                if (SessionContext.Interactive && !SessionContext.SuppressAutoLogin) {
                    Session.TrySignIn(enterSession ? (loginResponse) => {
                        if (!loginResponse || loginResponse.Status !== SigninStatus.Success)
                            this._enterSession();
                    } : null);
                    enterSession = false;
                }
            }

            if (this._viewModel.Load/* && !loaded*/)
                this._viewModel.Load();

            if (enterSession)
                this._enterSession();

            return;
        }
        else if (SessionContext.SigninToken) {
            Shell.Go(SessionContext.SigninToken);
            return;
        }

        debugger;
        Shell.Home();
    }

    showTerms() {
    }

    HandleAction(action: string, param?): any {
        return this._viewModel.HandleAction(action, param);
    }

    DispatchEvent(target, event, detail?) {
        target.dispatchEvent(new CustomEvent(event, {
            bubbles: true,
            composed: true,
            detail: detail || { item: target }
        }));
    }

    HandleError(error, options?: ErrorOptions) {
        if (this._viewModel)
            this._viewModel.HandleError(error, options);

        if (!SessionContext.Navigating)
            PageMetadata.setMetaTag("robots", "noindex");
    }

    HandleAjaxError(request, error, handler) {
        debugger;
        error = TranslateFault(request) || request.statusText || error;
        if (!handler || typeof handler !== 'function') {
            this.HandleError(error, {
                ajax: true,
                silent: handler && handler.silent
            });
        }
        else
            handler(error, { ajax: true });
    }

    HandleSessionError(error, ajax?) {
        //Display the Toast instead of the error page
        //Shell.Error(error);
        if (!ajax)
            this.HandleError(error);
        //else //Page.Current.HandleAjaxError has already been called in Post
    }

    HandleEntityFetchError(error) {
        if (error instanceof DataException && (<DataException>error).Type == DataExceptionType.RecordNotFound)
            Shell.Error(error);
        else
            this.HandleError(error, { silent: true });
    }
}

declare var Mixins: any;
export { Mixins };

declare global {
    interface CustomEventInit {
        composed?: boolean;
    }
}

//TODO: *.html import
window['Page'] = Page;
