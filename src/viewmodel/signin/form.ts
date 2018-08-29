import { Action as Action$, Event } from '../../system'
import { IView, ReadyState, Submittable, Validateable, ValidationContext, ViewModel } from '../../viewmodel'
import { ServiceProvider, Session, SigninStatus, SigninFlags } from '../../service/session'
import { ErrorMessageType, ArgumentException, ArgumentExceptionType, OperationException, OperationExceptionType, SessionException, SessionExceptionType } from '../../exception'
import * as ValidationSettings from '../../settings/validation'
import * as Resource from '../../resource'
export { IView, ReadyState, Session }

export interface OpenAction {
    pwd?: string;
    prompt?: string;
    callback?: Action$<boolean>;
}

export interface SuccessAction {
    showTerms?: boolean;
    callback?: Action$<boolean>;
}

export interface Action {
    open?: OpenAction;
    close?: boolean;
    success?: SuccessAction;
    remember?: boolean; //Used in ChromeEx (page.ts)
}

export abstract class Form extends Submittable(ViewModel) {
    protected _options: OpenAction;
    get Prompt(): string {
        return (this._options && this._options.prompt) || '';
    }
    set Prompt(prompt: string) {
        if (this._options)
            this._options.prompt = prompt;
    }
    Email: string = '';
    Password: string = '';
    Remember: boolean = false;
        
    abstract Show(options?: OpenAction);
    abstract Hide(byUser?: boolean);
    SignInAction: Event<Action>;

    constructor(view: IView) {
        super(view);
        this._validateable = new Validateable(this, new ValidationContext(null, {
            LocationSettings: {
                EmailValid: ValidationSettings.EmailValid
            }
        }), {
            rules: {
                email: "validateEmail",
                /*email: {
                    required: true,
                    email: true
                }*/
                password: "required" //"validatePassword"
            },

            messages: {
                email: String.format(Resource.Global.Editor_Error_Enter_X_Valid, Resource.Dictionary.Email),
                password: String.format(Resource.Global.Editor_Error_Enter_X, Resource.Dictionary.Password)
            },

            methods: {
                validateEmail: ValidationSettings.ValidateEmail
                /*validatePassword: function (password, name, element, param, ctx: ValidationContext): any {
                    return password || ctx.Items.SkipPassword ? true : false;
                }*/
            }
        });

        this.SignInAction = new Event<Action>(this);
        this.SubmitHandler/*_submittable = new Submittable(this,*/ = (suppressSignedIn) => {
            Session.SignIn(this.Email, this.Password, (loginResponse) => {
                if (loginResponse && loginResponse.Status == SigninStatus.Success) {
                    this.SubmitComplete(); //close the form and reset remember.checked
                    if (!suppressSignedIn)
                        this.onSignedIn(loginResponse);

                    if (this.Remember /*&& (!loginResponse.Flags || (loginResponse.Flags & SigninFlags.AdminLogon) == 0)*/) {
                        this.remember(ServiceProvider.BizSrt);
                    }

                    if (this._options && this._options.callback)
                        this._options.callback(true);
                }
                else if (loginResponse && loginResponse.Status == SigninStatus.AccountLocked)
                    this.Invalidate(Resource.Global.SignIn_Error_AccountLocked);
                else
                    this.Invalidate(new OperationException(OperationExceptionType.UnexpectedState));
            }, this.Invalidate.bind(this/*._submittable*/));
        };
    }

    SignInExternal(provider: ServiceProvider, userId: string, accessToken: string) {
        try {
            this.ReadyState = ReadyState.Submitting;
            var signIn = (loginResponse) => {
                if (loginResponse && loginResponse.Status == SigninStatus.Success) {
                    this.SubmitComplete();
                    this.onSignedIn(loginResponse);

                    //Not sure how to check if "Keep me logged in" option was selected, so assume that it was
                    this.remember(ServiceProvider.BizSrt); //provider
                }
                else
                    this.Invalidate(new SessionException(SessionExceptionType.Unauthorized));
            };
            Session.SignIn_External(provider, userId, accessToken, null, signIn, (ex) => {
                if (ex instanceof ArgumentException && (<ArgumentException>ex).Type == ArgumentExceptionType.ValueRequired && (<ArgumentException>ex).ParamName == "Location") {
                    //https://freegeoip.net/json/stackoverflow.com
                    //https://github.com/ebidel/geo-location/blob/master/geo-location.html                        
                    //https://developers.google.com/maps/documentation/javascript/examples/map-geolocation?csw=1
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((position) => {
                            Session.SignIn_External(provider, userId, accessToken, {
                                Lat: position.coords.latitude,
                                Lng: position.coords.longitude
                            }, signIn, this.Invalidate.bind(this/*._submittable*/));
                        }, () => {
                            this.Invalidate(ex);
                        });
                    }
                    else
                        this.Invalidate(ex);
                }
                else
                    this.Invalidate(ex);
            });
        }
        catch (ex) {
            this.Invalidate(ex);
        }
    }

    protected onSignedIn(loginResponse) {
        var successAction: SuccessAction = {
            showTerms: (loginResponse.Flags && (loginResponse.Flags & SigninFlags.ShowTerms) > 0 ? true : false)
        };
        if (this._options && this._options.callback)
            successAction.callback = this._options.callback;
        this.SignInAction.Invoke(this, {
            success: successAction
        });
    }

    abstract remember(signinType: ServiceProvider);

    GetErrorMessage(error, data, options?) {
        switch (error) {
            case ErrorMessageType.Data_DuplicateRecord:
                var email;
                if (data.KeyValue)
                    email = data.KeyValue;
                return String.format(Resource.Global.Account_Email_Error_Duplicate, email || this.Email);
            case ErrorMessageType.Argument_Invalid:
                if (data.ParamName == "EmailPassword")
                    return Resource.Global.SignIn_Error_InvalidEmailPassword;
                else if (data.ParamName == "Country" && data.ParamValue)
                    return String.format(Resource.Global.Country_Error_NotSupported, data.ParamValue);
                else
                    return super.GetErrorMessage(error, data, options);
            case ErrorMessageType.Data_RecordNotFound:
                return Resource.Global.SignIn_Error_InvalidEmailPassword;
            case ErrorMessageType.Operation_UnexpectedState:
                return Resource.Global.SignIn_Error_AccountInactive;
            default:
                return super.GetErrorMessage(error, data, options);
        }
    }
}