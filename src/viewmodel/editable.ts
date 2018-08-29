import { Action, ErrorOptions, ReadyState, Submittable, SubmitOptions, ViewModel } from '../viewmodel'
import { Form as Confirm } from '../../component/confirm/form'
export { ReadyState }

export enum EditMode {
    New = 0,
    Edit = 1
}

type Constructor<T> = new (...args: any[]) => T;

export function Deletable<T extends Constructor<ViewModel & ISubmittable>>(superclass: T) {
    return class extends superclass {
        constructor(...args: any[]) {
            super(...args);
            this.ReadyState = ReadyState.Ready;
        }

        deleteHandler: Action<any>;

        private __deleteConfirm: Confirm;
        get _deleteConfirm(): Confirm {
            return this.__deleteConfirm;
        }
        set _deleteConfirm(deleteConfirm: Confirm) {
            this.__deleteConfirm = deleteConfirm;;
            deleteConfirm.Confirm = () => {
                //Don't validate (this.Submit)
                if ((super.ReadyState & ReadyState.Ready) > 0)
                    super.submit(this.deleteHandler);
            };

            deleteConfirm.Closed.AddHandler((sender, e) => {
                this.ReadyState = ReadyState.Ready;
            });
        }

        DeleteComplete(ex?) {
            if (!ex) {
                this.SubmitComplete();
                this._deleteConfirm.Hide();
            }
            else
                this.Invalidate(ex);
        }
    }
}

export interface ISubmittable {
    ReadyState: ReadyState;
    Invalidate: (error, options?: ErrorOptions) => void;
    SubmitComplete: (options?: SubmitOptions) => void;
    Submit: (submit?: Action<any>, param?) => void;
    submit: (submit?: Action<any>, param?) => void;
}

export function Editable<T extends Constructor<ViewModel>>(superclass: T) {
    //https://github.com/Microsoft/TypeScript/pull/13604
    //TS2507 Type '{ new (...args: any[]): Submittable<T>.(Anonymous class); prototype: Submittable<any>.(Anonymous ...' is not a constructor function type.
    return class extends (Submittable(superclass) as Constructor<ViewModel & ISubmittable>) {
        protected _entity: Object;
        get Entity(): Object {
            return this._entity;
        }
        set Entity(entity: Object) {
            this._entity = entity;
            this.Validateable.ErrorInfo.Clear();
            var editMode = this.EditMode;
            if (this._editMode != editMode) {
                this._editMode = editMode;
                this.notifyProperty('EditMode', this._editMode);
            }
            this.ReadyState = ReadyState.Ready;
        }

        protected _editMode: EditMode = EditMode.New;
        get EditMode(): EditMode {
            return this._entity && this._entity['Id'] ? EditMode.Edit : EditMode.New;
        }
    }
}