import { IDialogView, ErrorOptions, ValidationContext, ViewModel } from '../../src/viewmodel'
import { Action, Event, StringFormatter } from '../../src/system'
import * as Resource from '../../src/resource'
export { StringFormatter }

export interface IMessageArgs {
    Format?: string;
}

export class Form extends ViewModel  {
    Args;
    Confirm: Action<any>;
    get Closed(): Event<any> {
        return this._popup.Closed;
    }

    constructor(protected _popup: IDialogView) {
        super(_popup);
        this.MessageFormat = new StringFormatter(Resource.Global.Are_you_sure);
        this._validationContext = new ValidationContext((valid) => {
            if (valid && this.Confirm)
                this.Confirm(this.Args)
        }); //Required when used in Deletable/Submittable
    }

    MessageFormat: StringFormatter;
    protected _messageArgs: IMessageArgs = {};
    set MessageArgs(messageArgs) {
        if (this._messageArgs != messageArgs) {
            this._messageArgs = messageArgs;
        }
    }
    get MessageArgs() {
        return this._messageArgs;
    }

    protected _messageText = '';
    set MessageText(messageText: string) {
        if (this._messageText != messageText) {
            this._messageText = messageText;
            this.notifyProperty("MessageText", this._messageText);
        }
    }
    get MessageText(): string {
        return this._messageText;
    }

    protected format() {
        if (this._messageArgs && this._messageArgs.Format && this[this._messageArgs.Format])
            this.MessageText = this[this._messageArgs.Format](this._messageArgs);
        else
            this.MessageText = this.MessageFormat.ToString(this._messageArgs);
    }

    Show() {
        this.format();
        this._popup.Open();
    }

    Hide() {
        this._popup.Close();
    }

    Invalidate(error, options: ErrorOptions = {}) {
        options.viewModel = this;
        this.Page.HandleError(error, options); //raise page-level event
    }
}