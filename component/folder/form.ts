import { Action2, IDialogView, Submittable, SubmitOptions, Validateable, ValidationContext, ViewModel } from '../../src/viewmodel'
import { IdName } from '../../src/model/foundation'
import { ErrorMessageType, ArgumentException, ArgumentExceptionType } from '../../src/exception'
import * as Resource from '../../src/resource'
export { IDialogView }

export enum EditAction {
    Create = 1,
    CreateSub = 2,
    Rename = 3,
    Edit = 4
}

export class Form extends Submittable(ViewModel) {

    EntityName: string;
    NameLength: number;
    constructor(protected _popup: IDialogView) {
        super(_popup);
        this._validateable = new Validateable(this, new ValidationContext(), {
            rules: {
                folderName: {
                    required: true,
                    maxlength: this.NameLength
                }
            },

            messages: {
                message: {
                    required: String.format(Resource.Global.Editor_Error_Enter_X, this.EntityName + " name"),
                    maxlength: this.EntityName + " name is too long"
                }
            }
        });
    }

    _action: EditAction;
    set Action(action: EditAction) {
        if (this._action != action) {
            this._action = action;
            this.notifyProperty("Action", this._action);
        }
    }
    get Action(): EditAction {
        return this._action;
    }
        
    protected _folder: IdName;
    set Folder(folder: IdName) {
        if (this._folder != folder) {
            this._folder = folder;
            this.notifyProperty("Folder", this._folder);
        }
    }
    get Folder(): IdName {
        return this._folder;
    }
    SetFolder: Action2<EditAction, IdName>;

    protected _parentFolder: IdName;
    set ParentFolder(parentFolder: IdName) {
        if (this._parentFolder != parentFolder) {
            this._parentFolder = parentFolder;
            this.notifyProperty("ParentFolder", this._parentFolder);
        }
    }
    get ParentFolder(): IdName {
        return this._parentFolder;
    }

    InitCreate(folder?: IdName) {
        this.Action = EditAction.Create;
        this.ParentFolder = null;
        if (!this.SetFolder) {
            this.Folder = folder || {
                Id: 0,
                Name: ''
            };
        }
        else
            this.SetFolder(this.Action, folder);
    }

    InitCreateSub(parent: IdName, folder?: IdName) {
        if (parent && parent.Id && parent.Name) {
            this.Action = EditAction.CreateSub;
            this.ParentFolder = parent;
            if (!this.SetFolder) {
                //Clone to prevent changes to the original object before validation and saving
                this.Folder = folder || {
                    Id: 0,
                    Name: ''
                };
            }
            else
                this.SetFolder(this.Action, folder);
        }
        else
            throw new ArgumentException(ArgumentExceptionType.ValueRequired, "ParentFolder");
    }

    InitEdit(folder: IdName, parent: IdName, rename?: boolean) {
        if (folder && folder.Id && folder.Name) {
            if (rename)
                this.Action = EditAction.Rename;
            else
                this.Action = EditAction.Edit;
            this.ParentFolder = parent;
            if (!this.SetFolder) //Clone to prevent changes to the original object before validating and saving
                this.Folder = Object.mixin({}, folder);
            else
                this.SetFolder(this.Action, folder);
        }
        else
            throw new ArgumentException(ArgumentExceptionType.ValueRequired, "Folder");
    }

    Show() {
        this._popup.Open();
    }

    Hide() {
        this._popup.Close();
    }

    SubmitComplete(options?: SubmitOptions) {
        super.SubmitComplete(options)
            this.Hide();
    }

    GetErrorMessage(error, data, options?): string {
        switch (error) {
            case ErrorMessageType.Argument_ValueRequired:
                return String.format(Resource.Global.Editor_Error_Enter_X_Name, this.EntityName);
            case ErrorMessageType.Data_DuplicateRecord:
                return String.format(Resource.Global.Folder_Error_Name_Exists, this.EntityName);
            default:
                return super.GetErrorMessage(error, data, options);
        }
    }
}