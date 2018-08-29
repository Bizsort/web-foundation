import { Action, Action2, Event, Error } from './system'
import { ErrorMessageType } from './exception'
import { TranslateFault } from './service'
import { Page, PageModel } from './page'

export { Action, Action2, Event, ErrorMessageType }

type Constructor<T> = new (...args: any[]) => T;

export enum ElementType {
    HostElement = 1,
    ChildElement = 2,
    ErrorContainer = 3,
    ChildElement_Selector = 4
}

export class ErrorInfo {
    protected _errors;
    get Errors() {
        return this._errors;
    }
    HasErrors: boolean;

    constructor(public Validateable: Validateable) {
        this._errors = {};
        this.HasErrors = false;
    }

    SetError(name: string, error: string, element?: HTMLElement) {
        this.HasErrors = true;
        this._errors[name] = error;
        this.Validateable.ErrorShow(error, name, element);
    }

    GetError(name: string) {
        return this._errors[name];
    }

    Clear() {
        for (var name in this._errors) {
            this.Validateable.ErrorHide(name);
        }
        this._errors = {};
        this.HasErrors = false;
        this.Validateable.ViewModel.ClearError();
    }
}

export interface ErrorOptions {
    ajax?: boolean;
    silent?: boolean;
    viewModel?: ViewModel;
}

export interface IDialogView extends IView {
    Opened: Event<any>;
    Closed: Event<any>;
    Open: (options?) => void;
    Close: () => void;
}

interface IHTMLElements {
    [name: string]: HTMLElement;
}

export interface InitOptions {
    ctor?: boolean;
    view?: boolean;
}

export class InputValidator {
    protected static options = {
        ignore: ":hidden"
    };

    /*_options =
    {
    rules: {
        elementName: function (value, element) {
        }.bind(this)
    }
    or
    rules: {
        elementName: "validateMethod"
    },
    methods: {
        validateMethod: function (value, name, element) {
        }.bind(this)
    }
    */
    get Options(): ValidationOptions {
        return this._options;
    }
    constructor(protected _validateable: Validateable, protected _options: ValidationOptions) { }

    protected elements(): IHTMLElements {
        /*var name, $this = this;
        var errorContext = jQuery(this._validateable.ViewModel.getElement(ElementType.HostElement));
        return errorContext
            .find('input, select, textarea')
            .not(":submit, :reset, :image")
            .not(typeof this._options.ignore == "string" ? this._options.ignore : InputValidator.options.ignore)
            .map(function () {
            name = this.name || this.id;
            if (name && $this._options.rules[name]) {
                return {
                    name: name,
                    dom: this
                }
            }
            }).get();*/

        var elem, elems: IHTMLElements = {};
        for (var name in this._options.rules) {
            elem = this._validateable.ViewModel.getElement(ElementType.ChildElement, name);
            if (elem)
                elems[name] = elem;
        }
        return elems;
    }

    Validate(filter, ctx?: ValidationContext) {
        var valid = true;
        var elements = this.elements();
        for (var elemName in elements) {
            if (filter && !(elemName in filter)) continue;
            if (this.validateElement(elemName, elements[elemName], null, ctx))
                valid = false;
        }
        return valid;
    }

    ValidateElement(element: string | HTMLElement, value?, ctx?: ValidationContext) {
        var elementName: string;
        if (typeof element === "string") {
            elementName = <string>element;
            element = this._validateable.ViewModel.getElement<HTMLElement>(ElementType.ChildElement, elementName);
            if (!element)
                throw 'Could not find element ' + elementName;
        }
        else if (element instanceof HTMLElement)
            elementName = element.getAttribute("name")/*element.name*/ || element.id;
        /*else if (element instanceof jQuery && element.length) {
            element = element[0];
            elementName = element.name || element.id;
        }*/
        else
            throw 'Invalid argument: ' + element;

        return this.validateElement(elementName, <HTMLElement>element, value, ctx) ? false : true;
    }

    protected validateElement(name: string, element: HTMLElement, value?, ctx?: ValidationContext) {
        var rules = this._options.rules ? this._options.rules[name] : null;
        if (rules) {
            value = value || this._validateable.ViewModel.getValue(element); //InputValidator.elementValue(element);
            var error = null;
            if (typeof rules == "string" || typeof rules == "function") {
                error = this.executeRule(rules, value, name, element, null, ctx);
            }
            else {
                for (var rule in rules) {
                    error = this.executeRule(rule, value, name, element, rules[rule], ctx);

                    if (error)
                        break;
                }
            }

            if (error)
                this.setError(error, name, element);
            return error;
        }
        else
            throw 'No rules defined for ' + name;
    }

    protected executeRule(rule, value, elementName: string, element: HTMLElement, param, ctx: ValidationContext) {
        var result;
        if (typeof rule === "string") {
            if (InputValidator.methods[rule])
                result = InputValidator.methods[rule].call(this, value, elementName, element, param, ctx);
            else if (this._options.methods[rule])
                result = this._options.methods[rule](value, elementName, element, param, ctx);
            else
                throw 'Method ' + rule + ' is not defined';
        }
        else if (typeof rule === "function") {
            result = rule(value, elementName, element, param, ctx);
            if (typeof result === 'undefined')
                result = true;
        }
        else
            throw 'Invalid argument: ' + rule;

        if (result !== true)
            return typeof result !== "string" ? this.getErrorMessage(rule, elementName, element, param) : result;
    }

    protected getErrorMessage(rule, elementName: string, element: HTMLElement, param) {
        var message, ruleName;
        if (typeof rule === "string")
            ruleName = rule;
        if (this._options && this._options.messages) {
            message = this._options.messages[elementName];
            if (message && typeof message === "object") //jQuery.isPlainObject(message)
                message = message[ruleName];
        }

        if (!message && ruleName) {
            message = InputValidator.messages[ruleName];
            if (message && typeof message == "function")
                message = message(param);
        }

        if (!message) {
            message = "Value did not pass '" + (ruleName || elementName) + "' validation rule and no error message was defined";
        }
        else if (typeof message == "function") {
            var regex = /\$?\{(\d+)\}/g;
            if (regex.test(message)) {
                message = String.format(message.replace(regex, "{$1}"), param);
            }
        }

        return message;
    }

    protected setError(error, name, element) {
        var errorMsg = error.toString();
        this._validateable.ErrorInfo.SetError(name, errorMsg, element);
    }

    protected static methods = {
        required: function (value, elementName: string, element: HTMLElement, param) {
            if (element.nodeName.toLowerCase() === "select") {
                // could be an array for select-multiple or a string, both are fine this way
                var val = (<HTMLSelectElement>element).value; //jQuery(element).val()
                return val && val.length > 0;
            }
            if (InputValidator.checkable(element)) {
                return InputValidator.getLength(value, element) > 0;
            }
            return String.trim(value).length > 0;
        },

        equalTo: function (value, elementName: string, element: HTMLElement, targetName) {
            var target = this._validateable.ViewModel.getElement(ElementType.ChildElement, targetName);
            return value === this._validateable.ViewModel.getValue(target); //target.val();
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/maxlength
        maxlength: function (value, elementName: string, element: HTMLElement, param) {
            var length = Array.isArray(value) ? value.length : InputValidator.getLength(String.trim(value), element);
            return /*ViewModel.Validation.Validator.optional(element, param) ||*/ length <= param;
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/range
        range: function (value, elementName: string, element: HTMLElement, param) {
            return /*ViewModel.Validation.Validator.optional(element) ||*/ (value >= param[0] && value <= param[1]);
        },

        // http://docs.jquery.com/Plugins/Validation/Methods/rangelength
        rangelength: function (value, elementName: string, element: HTMLElement, param) {
            var length = Array.isArray(value) ? value.length : InputValidator.getLength(String.trim(value), element);
            return /*ViewModel.Validation.Validator.optional(element, param) ||*/ (length >= param[0] && length <= param[1]);
        }
    };

    protected static messages = {
        required: "Value is required",
        equalTo: "Value does not match",
        maxlength: String.formatFunc("Please enter no more than {0} characters"),
        range: String.formatFunc("Please enter a value between {0} and {1}")
    };

    protected static checkable(element) {
        return (/radio|checkbox/i).test(element.type);
    }

    protected static getLength(value, element) {
        var options;
        switch (element.nodeName.toLowerCase()) {
            case "select":
                //return jQuery("option:selected", element).length;
                options = element.querySelectorAll("option");
                return options ? options.filter(o => o.hasAttribute("selected")).length : 0;
            case "input":
                if (InputValidator.checkable(element)) {
                    options = InputValidator.findByName(element.form, element.name, true);
                    return options ? options.filter(o => o.hasAttribute("checked")).length : 0; //.filter(":checked").length
                }
                break;
        }
        return value.length;
    }

    protected static findByName(form, name, all?) {
        var selector = "[name='" + name + "']";
        return all ? form.querySelectorAll(selector) : form.querySelector(selector); //jQuery(form).find("[name='" + name + "']");
    }
}

export interface IValidateStep {
    (proceed: Action2<boolean, number>, ctx: ValidationContext, param: number): void;
}

export interface IView {
    Initialize?: (options) => void;
    Ready: boolean;
    Visible: boolean;
    HostElement: HTMLElement;
    Elements: IViewElements;
    notifyProperty(propertyPath: string, propertyValue);
    notifyEvent(eventName: string, eventData?);
    setProperty(propertyPath: string, propertyValue);
    //https://github.com/Polymer/polymer/issues/1854
    arraySet(arrayPath: string, index: number, value, propertyName?: string);
    //http://stackoverflow.com/questions/30791297/dynamic-update-of-dom-repeat-templates-by-changing-the-underlying-array
    arrayPush(arrayPath: string, items: any);
    arraySplice(arrayPath: string, start: number, deleteCount: number);
    getElement(elementType: ElementType, elementName: string, element?): any;
    getViewModel<T extends ViewModel>(elementName: string): T;
    getElementValue(element): any;
    showElementError(error: string, elementName?: string, element?: any);
    hideElementError(elementName?: string, element?: any);
    handleAction(action: string): any;
}

export interface IViewElements {
    [name: string]: any;
}

export class MultiValidator {
    protected _steps: number;
    protected _valid: boolean;
    protected _validators: IValidateStep[];

    constructor(protected _proceed?: Action<boolean>) {
        this._steps = 0;
        this._valid = true;
        this._validators = [];
    }

    public get Valid(): boolean {
        return this._valid ? true : false;
    }

    Invalidate() {
        this._valid = false;
    }

    AddStep(validator: IValidateStep) {
        this._validators.push(validator);
    }

    get HasSteps() {
        return this._validators.length ? true : false;
    }

    Execute(ctx: ValidationContext, proceed?: Action<boolean>) {
        this._valid = true;
        proceed = proceed || this._proceed;
        if (this.HasSteps) {
            var step = 1;
            var size = this._validators.length;
            if (size > 0) {
                for (var i = 1, l = size; i <= l; i++) {
                    this._steps |= step;
                    step *= 2;
                }
            }
            step = 1;
            for (var i = 0, l = this._validators.length; i < l; i++) {
                var validator = this._validators[i];
                validator((valid, param) => {
                    if (this._valid && !valid)
                        this._valid = false;

                    this._steps &= ~param;
                    if (this._steps == 0 && proceed) {
                        proceed(this._valid);
                    }
                }, ctx, step);

                step *= 2;
            }
        }
        else if (proceed)
            proceed(this._valid);
    }
}

export interface PropertyChangeEventArgs {
    name: string;
    value: any;
    oldValue?: any;
    init?: any;
}

export enum ReadyState {
    Initializing = 0,
    Submitting = 1,
    Ready = 2,
    Success = 4,
    Error = 8
}

export function Submittable<T extends Constructor<ViewModel>>(superclass: T) {
    return class extends superclass {
        constructor(...args: any[]) {
            super(...args);
            this.ReadyState = ReadyState.Ready;
        }

        PropertyChange = new Event<PropertyChangeEventArgs>();

        protected _readyState: ReadyState = ReadyState.Initializing;
        get ReadyState(): ReadyState {
            return this._readyState;
        }
        set ReadyState(readyState: ReadyState) {
            if (this._readyState != readyState) {
                this._readyState = readyState;
                this.notifyProperty('ReadyState', this._readyState);
            }
        }

        Invalidate(error, options: ErrorOptions = {}) {
            options.viewModel = this;
            this.HandleError(error, options); //raise page-level event
            this.ReadyState = (ReadyState.Ready | ReadyState.Error);
        }

        SubmitComplete(options: SubmitOptions = {}) {
            if (typeof options.notifyExternal !== 'undefined' && this.SubmitHandler)
                this.SubmitHandler(options.notifyExternal);
            this.ReadyState = options.suppressMessage ? ReadyState.Ready : (ReadyState.Ready | ReadyState.Success);
        }

        SubmitHandler: Action<any>;
        Submit(handler?: Action<any>, param?) {
            if (!this.ValidationContext)
                throw 'Validation context has not been initialized';
            if ((this._readyState & ReadyState.Ready) > 0 && this.ValidationContext) {
                this.ReadyState = ReadyState.Ready; //reset Success & Error
                this.ValidationContext.Validate((valid) => {
                    if (valid) {
                        this.submit(handler || this.SubmitHandler, param);
                    }
                    else
                        this.ReadyState |= ReadyState.Error;
                });
            }
        }

        submit(handler?: Action<any>, param?) {
            if (handler) {
                this.ReadyState = ReadyState.Submitting;
                try {
                    handler(param);
                }
                catch (ex) {
                    this.Invalidate(ex);
                }
            }
            else
                throw 'Handler is undefined';
        }
    }
}

export interface SubmitOptions {
    suppressMessage?: boolean;
    notifyExternal?: any;
}

export class Validateable {
    ErrorInfo: ErrorInfo;
    protected _inputValidator: InputValidator;

    //Use with a set of options for InputValidator to auto-validate input fields and/or a custom validation function that would call ErrorInfo.SetError
    /*options =
    {
    rules: {
        elementName: function (value, element) {
        }.bind(this)
    }
    or
    rules: {
        elementName: "validateMethod"
    },
    methods: {
        validateMethod: function (value, name, element) {
        }.bind(this)
    }
    validate =
    (proceed, validator) => {
        var valid = ... //execute some custom validation logic
        //optionally call validator to validate additional fields
        valid = valid && validator.validate('elementName');
        proceed(valid);
    }
    */
    constructor(public ViewModel: ViewModel, validationContext: ValidationContext, options?: ValidationOptions, protected validate?: (proceed: Action<boolean>, context?: ValidationContext, validator?: InputValidator) => void) {
        this.ErrorInfo = new ErrorInfo(this);
        if (validationContext)
            this.Context = validationContext;
        if (options)
            this._inputValidator = new InputValidator(this, options);
        this.validate = this.validate || function (proceed: Action<boolean>, context: ValidationContext, validator: InputValidator) {
            var valid = validator ? validator.Validate(null, context) : true;
            proceed(valid && !this.ErrorInfo.HasErrors);
        };
    }

    protected _validationContext: ValidationContext;
    get Context(): ValidationContext {
        return this._validationContext;
    }
    set Context(validationContext: ValidationContext) {
        if (validationContext) {
            this._validationContext = validationContext;
            this._validationContext.AddStep(this.ValidateStep.bind(this));
        }
        else
            this._validationContext = null;
    }

    //Method can be used as a step in MultiValidator
    ValidateStep(proceed: Action2<boolean, number>, context: ValidationContext, param: number) {
        if (this.ErrorInfo && this.ErrorInfo.Validateable == this)
            this.ErrorInfo.Clear();

        this.validate((valid) => {
            proceed(valid, param);
        }, context, this._inputValidator);
    }

    ValidateElements(elements, proceed: Action<boolean>) {
        if (this.ErrorInfo && this.ErrorInfo.Validateable == this)
            this.ErrorInfo.Clear();

        var valid = this._inputValidator.Validate(elements, this._validationContext);
        proceed(valid && !this.ErrorInfo.HasErrors);
    }

    ErrorShow(error: string, elementName?: string, element?: HTMLElement) {
        if (elementName) {
            this.ViewModel.View.showElementError(error, elementName, element);
        }
        else
            this.ViewModel.Error = error;
    }

    ErrorHide(elementName: string, element?: HTMLElement) {
        if (elementName) {
            this.ViewModel.View.hideElementError(elementName, element);
        }
        else
            this.ViewModel.Error = '';
    }
}

export class ValidationContext {
    protected _multiValidator: MultiValidator;

    constructor(proceed?: Action<boolean>, public Items: any = {}) { //(valid: boolean) => void)
        this._multiValidator = new MultiValidator(proceed);
    }

    get MultiValidator(): MultiValidator {
        return this._multiValidator;
    }

    AddStep(validate: IValidateStep) {
        this._multiValidator.AddStep(validate);
    }

    get Valid(): boolean {
        return this._multiValidator.Valid;
    }

    Invalidate() {
        this._multiValidator.Invalidate();
    }

    Validate(proceed?: Action<boolean>) {
        this._multiValidator.Execute(this, proceed);
    }
}

export interface ValidationOptions {
    rules?: Object;
    messages?: Object;
    methods?: Object;
}

export class ViewModel {
    protected _page: ViewModel & PageModel;
    set Page(page: ViewModel & PageModel) {
        var old = this._page;
        this._page = page;
        this.notifyProperty("Page", this._page, old);
    }
    get Page(): ViewModel & PageModel {
        return <ViewModel & PageModel>(this._page || (Page.Current && Page.Current.ViewModel));
    }

    constructor(public View: IView) {
        this._page = <ViewModel & PageModel>(Page.Current && Page.Current.ViewModel);
        this.PropertyChange = new Event<PropertyChangeEventArgs>();
        if (View.Ready)
            this.Initialize({ctor: true});
    }

    protected _validateable: Validateable;
    protected _validationContext: ValidationContext;
    get Validateable(): Validateable {
        return this._validateable;
    }
    get ValidationContext(): ValidationContext {
        return this._validateable ? this._validateable.Context : this._validationContext;
    }

    get ResponsiveWidth(): number {
        return Page.Current.ResponsiveWidth;
    }
    get ContentWidth(): number {
        return Page.Current.ContentWidth;
    }
    get ContentHeight(): number {
        return Page.Current.ContentHeight;
    }

    protected _initialized = false;
    Initialize(options: InitOptions = {}) {
        if (this.View.Initialize && options.view !== false)
            this.View.Initialize(options);
        this._initialized = true;
    }
    get Initialized(): boolean {
        return this._initialized;
    }
    set Initialized(initialized: boolean) {
        this._initialized = initialized;
    }

    PropertyChange: Event<PropertyChangeEventArgs>;
    notifyProperty(propertyName: string, propertyValue, oldValue?, eventArgs?: Object) {
        var e: PropertyChangeEventArgs = { name: propertyName, value: propertyValue };
        if (oldValue)
            e.oldValue = oldValue;
        if (eventArgs)
            for (var p in eventArgs)
                e[p] = eventArgs[p];
        //Raise before View notifyProperty, so we can set properties prior to binding notification
        //Category.NavToken in business-profile, business-product
        this.PropertyChange.Invoke(this, e);
        this.View.notifyProperty(propertyName, propertyValue);
    }

    setProperty(propertyPath: string, propertyValue) {
        this.View.setProperty(propertyPath, propertyValue);
    }

    arraySet(arrayPath: string, index: number, value, propertyName?: string) {
        this.View.arraySet(arrayPath, index, value, propertyName);
    }

    arrayPush(arrayPath: string, item: any) {
        this.View.arrayPush(arrayPath, item);
    }

    arraySplice(arrayPath: string, start: number, deleteCount: number) {
        this.View.arraySplice(arrayPath, start, deleteCount);
    }

    getElement<T>(elementType: ElementType, elementName?: string, element?): T {
        return <T>this.View.getElement(elementType, elementName, element);
    }

    getViewModel<T extends ViewModel>(elementName: string): T {
        return this.View.getViewModel<T>(elementName);
    }

    getValue(element) {
        return this.View.getElementValue(element);
    }

    protected _error: string;
    get Error(): string {
        return this._error;
    }
    set Error(error: string) {
        if (this._error != error) {
            this._error = error;
            this.notifyProperty("Error", this._error);
        }
    }

    HandleError(error, options: ErrorOptions = {}) {
        debugger;
        var errorMessage = Error.getMessage(error);
        console.error(errorMessage); //Log the original message

        if (options.ajax || error.ErrorMessageType)
            errorMessage = this.GetErrorMessage(error.ErrorMessageType || ErrorMessageType.Unknown, error, options);

        if (errorMessage && !options.silent) {
            this.Error = errorMessage;

            if (<ViewModel>this.Page != this) //raise page-level event
                this.Page.Error = errorMessage; //this.View.notifyEvent("view-model-error", errorMessage); //If element is a child of the document body (signin-form) - page wouldn't get the view-model-error event

            //return errorMessage;
        }
    }

    ClearError() {
        if (this.Error)
            this.Error = '';
    }

    GetErrorMessage(error: ErrorMessageType, data, options?) {
        if (!this.Page || <ViewModel>this.Page == this)
            return Error.getMessage(error, data);
        else
            return this.Page.GetErrorMessage(error, data, options);
    }

    HandleAction(action: string, param?): any {
        return this.View.handleAction(action);
    }
}