import { Event } from '../system';
import * as Resource from '../resource';
import { ElementType, IView, IDialogView, ViewModel } from '../viewmodel';
export { IView }
//declare var Polymer: any;

export interface IViewModel {
    model: ViewModel;
}

/*export interface IHost extends polymer.PolymerBase {
    resource?: Resource;
    handleAction?: (action: string) => any;
}*/

export class DomModule implements IView {
    constructor(protected _dom_host/*: IHost*/) {
        _dom_host.resource = Resource;
    }

    get HostElement(): any/*polymer.PolymerBase*/ {
        return this._dom_host;
    }

    get Ready(): boolean {
        //https://github.com/Polymer/polymer/pull/3947
        return this._dom_host.shadowRoot  ? true : false;
    }

    //http://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
    //https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js
    get Visible(): boolean {
        //return Polymer.dom(this._dom_host).getAttribute('hidden') ? false : true;
        return !!(this._dom_host.offsetWidth || this._dom_host.offsetHeight || this._dom_host.getClientRects().length); //jQuery(this._dom_host).is(":hidden");
    }

    get Elements() {
        return this._dom_host.$;
    }

    //polymer/lib/legacy/legacy-element-mixin.html $$
    //https://www.polymer-project.org/1.0/docs/devguide/local-dom.html#node-finding
    getElement(elementType: ElementType, elementName?: string, element?): any {
        if (elementName) {
            switch (elementType) {
                case ElementType.ErrorContainer:
                    element = element || this.Elements[elementName] || this._dom_host.root.querySelector('#' + elementName);
                    //var errorContainer = element && jQuery(element).closest("[role='error-container']").get(0);

                    var e = element, errorContainer;
                    do {
                        if (e.nodeType === 1/*e.getAttribute*/ && e.getAttribute('role') === 'error-container') {
                            errorContainer = e;
                            break;
                        }
                        e = e.parentNode;
                        //https://github.com/w3c/webcomponents/issues/325
                        //http://stackoverflow.com/questions/24765227/how-do-i-traverse-up-out-of-shadow-dom
                        if (e && e.nodeType == 11) //ShadowRoot
                            e = e.host;
                    } while (e)
                    return errorContainer || element;
                case ElementType.ChildElement:
                    return this.Elements[elementName] || this._dom_host.root.querySelector('#' + elementName) /*|| jQuery(this._dom_host).find('#' + elementName).get(0)*/; //Look through to child elements
                case ElementType.ChildElement_Selector:
                    if (element && element.querySelector)
                        return element.querySelector(elementName);
                    else
                        return this._dom_host.querySelector(elementName); /*|| jQuery(this._dom_host).find(elementName).get(0)*/; //Look through to child elements
            }
        }
        else {
            switch (elementType) {
                case ElementType.HostElement:
                    return this._dom_host;
            }
        }
    }

    getViewModel<T extends ViewModel>(elementName: string): T {
        var element = <IViewModel>this.getElement(ElementType.ChildElement, elementName)
        return <T>(element ? element.model : null);
    }

    setProperty(propertyPath: string, propertyValue)
    {
        this._dom_host.set('model.' + propertyPath, propertyValue);
    }

    //https://github.com/Polymer/polymer/issues/1854
    arraySet(arrayPath: string, index: number, value, propertyName?: string) {
        //https://github.com/Polymer/polymer/issues/1854
        this._dom_host.set('model.' + arrayPath + '.' + index + (propertyName ? '.' + propertyName : ''), value);
    }

    //http://stackoverflow.com/questions/30791297/dynamic-update-of-dom-repeat-templates-by-changing-the-underlying-array
    //https://www.polymer-project.org/1.0/docs/devguide/properties#array-mutation
    arrayPush(arrayPath: string, item: any) {
        this._dom_host.push('model.' + arrayPath, item);
    }

    arraySplice(arrayPath: string, start: number, deleteCount: number)
    {
        this._dom_host.splice('model.' + arrayPath, start, deleteCount);
    }

    notifyProperty(propertyPath: string, propertyValue)
    {
        if (this.Ready) //TypeError: Cannot read property 'model' of undefined
            this._dom_host.notifyPath('model.' + propertyPath, propertyValue);
    }

    notifyEvent(eventName: string, eventData?) {
        this._dom_host.dispatchEvent(new CustomEvent(eventName, <any>{
            composed: true,
            detail: eventData
        }));
    }

    getElementValue(element) {
        var vlaue = element.value;
        if (!vlaue) { //TODO: implement jQuery val?
            /*element = jQuery(element);
            var elementType = element.attr("type");
            if (elementType === "radio" || elementType === "checkbox") {
                return jQuery("input[name='" + element.attr("name") + "']:checked").val();
            }
            else
                return element.val();*/
            return '';
        }
        else {
            //jQuery val function
            if (typeof vlaue === "string") {
                return vlaue.replace(/\r/g, "");
            }

            return vlaue;
        }
    }

    //https://github.com/PolymerElements/paper-input/pull/26
    showElementError(error: string, elementName?: string, element?: any) {
        element = this.getElement(ElementType.ErrorContainer, elementName) || element;
        if (element && element.nodeName) {
            switch (element.nodeName.toLowerCase()) {
                case 'paper-input':
                case 'paper-textarea':
                //case 'gold-email-input':
                case 'gold-phone-input':
                    DomModule.toggleError(element, error);
                    break;
                default:
                    if (element.getAttribute("role") == 'error-container' || element.setCustomValidity)
                        DomModule.toggleError(element, error);
                    return;
            }
            //addErrorTipsy(this.ErrorContext.find('label[for=' + elementName + ']'), element, error);
        }
    }

    hideElementError(elementName: string, element?: any) {
        element = this.getElement(ElementType.ErrorContainer, elementName) || element;
        if (element && element.nodeName) {
            switch (element.nodeName.toLowerCase()) {
                case 'paper-input':
                case 'paper-textarea':
                //case 'gold-email-input':
                case 'gold-phone-input':
                    DomModule.toggleError(element, '');
                    break;
                default:
                    if (element.getAttribute("role") == 'error-container' || element.setCustomValidity)
                        DomModule.toggleError(element, '');
                    return;
            }
            //removeErrorTipsy(this.ErrorContext.find('label[for=' + elementName + ']'), element, true);
        }
    }

    static toggleError(element, error) {
        if (!element.setCustomValidity) {
            element.errorMessage = error;
            element.invalid = error ? true : false;
        }
        else
            element.setCustomValidity(error);
    }

    handleAction(action: string): any {
        return this._dom_host.handleAction ? this._dom_host.handleAction(action) : false;
    }
}

export class DialogDomModule extends DomModule implements IDialogView {
    public Opened: Event<any>;
    public Closed: Event<any>;

    constructor(_dom_host, protected _overlay) {
        super(_dom_host);
        this.Opened = new Event<any>(this);
        this.Closed = new Event<any>(this);
    }

    Initialize(options) {
        if (options && options.overlay)
            this._overlay = options.overlay;
    }

    Open(options?) {
        if (this._overlay && !this._overlay.opened) {
            this._overlay.open();
            this.Opened.Invoke(this, options);
        }
    }

    Close() {
        if (this._overlay && this._overlay.opened)
            this._overlay.close();
    }
}

/*export interface IListView extends IView {
    SelectedItems;
}

export class ListViewDomModule extends DomModule implements IListView {
    get SelectedItems() {
        return (<any>this._dom_host).selectedItems;
    }
}*/

//TODO: *.html import
window['View'] = {
    'DomModule': DomModule,
    'DialogDomModule': DialogDomModule
}