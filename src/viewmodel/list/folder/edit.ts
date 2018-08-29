import { EntityId } from '../../../model/foundation'
import { IFolder, IViewInitialize, SelectedType, SetOptions, View, ViewType } from './view'
import { EditAction, Form as Folder } from '../../../../component/folder/form'
import { Action, ItemType, ListSelect, NodeRef, UpDownList } from '../../../../component/folder/updownlist'
import { Form as Confirm, StringFormatter } from '../../../../component/confirm/form'
import { Deletable } from '../../editable'
import { OperationException, OperationExceptionType } from '../../../exception'
export { EditAction, IFolder, IViewInitialize, SetOptions, StringFormatter, ViewType }

export abstract class Edit extends View {
    IsFolderItemSelected = false;

    protected _folderForm: Folder;
    protected _folderDeleteConfirm: Confirm;

    protected _itemFolder: ListSelect;
    protected _itemFolderConfirm: Confirm;
    protected _itemDeleteConfirm: Confirm;

    Initialize() {
        super.Initialize();

        this._folderForm = this.getViewModel<Folder>('folderForm');
        if (this._folderForm) {
            this._folderForm.SubmitHandler = () => {
                var folder = this._folderForm.Folder;
                var action = this._folderForm.Action;
                var parentFolder = (action == EditAction.CreateSub && this._folderForm.ParentFolder ? this._folderForm.ParentFolder.Id : 0);
                if (folder.Id == 0 && (action == EditAction.Create || (parentFolder > 0 && action == EditAction.CreateSub))) {
                    this.createFolder(folder, parentFolder, this._folderForm, (id) => {
                        folder.Id = id;
                        if (folder.Id > 0) {
                            this.populate(folder.Id, 0, SetOptions.ClearSearchQuery | SetOptions.PopulateList); //Always populate top-level list
                            /*if(action == EditAction.CreateSub && parentFolder.CompareTo(zero) > 0)
                                populate(folder.Id, parentFolder, SetOptions.ClearSearchQuery | SetOptions.PopulateSubFolders | SetOptions.PopulateList);
                            else
                                populate(folder.Id, zero, SetOptions.ClearSearchQuery | SetOptions.PopulateList);*/
                            if (this._itemFolder != null)
                                this._itemFolder.ResetItems();
                        }
                        this._folderForm.SubmitComplete();
                    }, this._folderForm.Invalidate.bind(this._folderForm));
                }
                else if (folder.Id > 0 && (action == EditAction.Rename || action == EditAction.Edit)) {
                    this.updateFolder(folder, this._folderForm, (success) => {
                        if (success) {
                            this.populateFolders(0, folder.Id, (folders, _) => {
                                this.Folders.Populate(folders, folder.Id, SetOptions.SuppressEvent | SetOptions.Refresh);
                                this.Folder = this.Folders.Lookup(folders, folder.Id);
                                this.Folders.SelectFolder(this.Folder);
                            });
                            if (this.Folder.Name != folder.Name) {
                                this.Folder.Name = folder.Name;
                                this._folderDeleteConfirm.MessageArgs["Folder"] = folder.Name;
                                if (this.ListHeader && this.ListHeader.Data.Folder)
                                    this.ListHeader.Data.Folder = folder.Name;
                                if (this._itemFolder)
                                    this._itemFolder.ResetItems();
                            }
                        }
                        this._folderForm.SubmitComplete();
                    }, this._folderForm.Invalidate.bind(this._folderForm));
                }
            };
        }

        this._folderDeleteConfirm = this.getViewModel<Confirm>('folderDeleteConfirm');
        if (this._folderDeleteConfirm) {
            this._folderDeleteConfirm.Confirm = () => {
                if (this.Folder.Id && (this.Folder.Type === SelectedType.Regular || typeof this.Folder.Type === 'undefined')) {
                    this.deleteFolder(this.Folder.Id, (success) => {
                        if (success) {
                            this.populate(this._parentFolder, 0, SetOptions.ClearSearchQuery);
                            if (this._itemFolder)
                                this._itemFolder.ResetItems();
                        }
                        this._folderDeleteConfirm.Hide();
                    }, this._folderDeleteConfirm.Invalidate.bind(this._folderDeleteConfirm));
                    return;
                }
                throw new OperationException(OperationExceptionType.Invalid);
            };
        }

        this._itemDeleteConfirm = this.getViewModel<Confirm>('itemDeleteConfirm');
        if (this._itemDeleteConfirm) {
            this._itemDeleteConfirm.Confirm = () => { this.onItemAction(this._itemDeleteConfirm); };
        }

        this._itemFolder = this.getViewModel<UpDownList>('itemFolder');
        this._itemFolderConfirm = this.getViewModel<Confirm>('itemFolderConfirm');
        if (this._itemFolder && this._itemFolderConfirm) {
            this._itemFolder.ItemSelected = (folder, itemType) => {
                if ((folder.Id > 0 || itemType == ItemType.Root) && this.SelectedItems.length) {
                    this._itemFolderConfirm.MessageArgs["Selected"] = this.SelectedItems.length;
                    this._itemFolderConfirm.MessageArgs["Folder"] = folder.Name;
                    this._itemFolderConfirm.Args = folder;
                    this._itemFolderConfirm.Show();
                }
                else if (folder.Id === 0 && itemType == ItemType.New && this._folderForm) {
                    this._folderForm.InitCreate(null);
                    this._folderForm.Show();
                }
            };
            this._itemFolderConfirm.Confirm = () => this.onItemAction(this._itemFolderConfirm);
        }
        else if (this._itemFolder || this. _itemFolderConfirm)
            throw "Folder action must be accompanied by a confirmation dialog";
    }

    folderChanged(folder: IFolder) {
        this.IsFolderItemSelected = (folder.Id > 0 && this.SelectedItems.length ? true : false);

        if (this._folderDeleteConfirm) {
            if (folder.Id > 0)
                this._folderDeleteConfirm.MessageArgs["Folder"] = folder.Name;
            else
                this._folderDeleteConfirm.MessageArgs = {};
        }
             
        //super.folderChanged(folder);
    }

    HandleAction(action: string) {
        var folder = this.Folder.Id && (this.Folder.Type === SelectedType.Regular || typeof this.Folder.Type === 'undefined');

        if (/Folder$/.test(action)) {
            if (!this._folderForm) return;

            if (/^Create/.test(action)) {
                if (action == "CreateSubFolder" || folder)
                    this._folderForm.InitCreateSub(this.Folder);
                else
                    this._folderForm.InitCreate();
            }
            else if (folder) {
                switch (action) {
                    case "EditFolder":
                    case "RenameFolder":
                        this._folderForm.InitEdit(this.Folder, (<NodeRef>this.Folder).Parent, action === "RenameFolder");
                        break;
                    default:
                        return;
                }
            }
            else
                return;
            this._folderForm.Show();
        }
        else if (/^Delete/.test(action)) {
            if (action == "DeleteFolder" || !this.SelectedItems.length) {
                if (folder && this._folderDeleteConfirm)
                    this._folderDeleteConfirm.Show();
            }
            else if (action == "DeleteItem" || this.SelectedItems.length) {
                if (this.SelectedItems.length && this.canDeleteItem(this.Folder, this.SelectedItems)) {
                    this._itemDeleteConfirm.MessageArgs["Selected"] = this.SelectedItems.length;
                    this._itemDeleteConfirm.MessageArgs["Folder"] = this.Folder.Name;
                    this._itemDeleteConfirm.Args = this.Folder;
                    this._itemDeleteConfirm.Show();
                }
            }
        }
        else
            return super.HandleAction(action);
    }

    canDeleteItem(folder: IFolder, items: EntityId[]) {
        return folder && items && items.length ? true : false;
    }

    createFolder(folder: IFolder, parent: number, folderForm: Folder, callback: Action<number>, faultCallback) {
        callback(0);
    }

    updateFolder(folder: IFolder, folderForm: Folder, callback: Action<boolean>, faultCallback) {
        callback(false);
    }

    deleteFolder(id: number, callback: Action<boolean>, faultCallback) {
        callback(false);
    }

    onItemAction(confirmForm: Confirm)
    {
        if (this.SelectedItems.length) {
            var callback: Action<boolean> = (success) => {
                confirmForm.Hide();
                if (success)
                    this.populateList();
            };
            var folder = <IFolder>confirmForm.Args;
            if (confirmForm == this._itemFolderConfirm && folder.Id >= 0) //Root folder may have Id=0
                this.addFolderItem(folder, this.SelectedItems, callback, confirmForm.Invalidate.bind(confirmForm));
            else if (confirmForm == this._itemDeleteConfirm && this.canDeleteItem(folder, this.SelectedItems))
                this.deleteItem(folder, this.SelectedItems, callback, confirmForm.Invalidate.bind(confirmForm));
            else
                throw new OperationException(OperationExceptionType.Invalid);
        }
    }

    addFolderItem(folder: IFolder, items: EntityId[], callback: Action<boolean>, faultCallback) {
        callback(false);
    }

    deleteItem(folder: IFolder, items: EntityId[], callback: Action<boolean>, faultCallback) {
        callback(false);
    }
}