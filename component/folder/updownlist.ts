import { IdName, Node, NodeRef } from '../../src/model/foundation'
import { Action, Action2, ItemType, MenuList } from './menu'
export { Action, IdName, ItemType, Node, NodeRef }

export interface ListSelect {
    ResetItems();
    ItemSelected: Action2<IdName, ItemType>;
    Scope?: IdName;
}

export abstract class UpDownList extends MenuList implements ListSelect {
    protected _scope: IdName;
    set Scope(scope: IdName) {
        this._scope = scope;
    }
    protected _parentFolder: NodeRef;
    set ParentFolder(parentFolder: NodeRef) {
        if (this._parentFolder != parentFolder) {
            this._parentFolder = parentFolder;
            this.notifyProperty("ParentFolder", this._parentFolder);
        }
    }
    get ParentFolder(): NodeRef {
        return this._parentFolder;
    }

    populate(callback: Action<IdName[]>) {
        this.populateChildren(null, (folders) => {
            if (folders != null)
                this.scopeToParent(null);
            callback(folders);
        });
    }

    populateParent(parentFolder: NodeRef) {
        this.ParentFolder = parentFolder;
        this.populateChildren(this.ParentFolder, (folders) => {
            if (folders) {
                Node.SetParent(folders, this.ParentFolder);
                this.scopeToParent(this.ParentFolder);
                this.Items = folders;
            }
        });
    }

    scopeToParent(folder: NodeRef) {
        if (!folder && !this.ParentFolder && this._scope && this._scope.Name)
            this.ParentFolder = { Id: this._scope.Id, Name: this._scope.Name };
    }

    onItem(item: IdName, itemType: ItemType): boolean {
        if (item && item == this.ParentFolder && Node.IsRootFolder(this.ParentFolder))
            itemType = ItemType.Root;
        return super.onItem(item, itemType);
    }

    abstract populateChildren(parentFolder: NodeRef, callback: Action<NodeRef[]>);

    ResetItems() {
        super.ResetItems();
        this.ParentFolder = null;
    }

    HandleAction(action: string, folder: NodeRef) {
        switch (action) {
            case "FolderUp":
                if (folder.Parent && folder.ParentId > 0)
                    this.populateParent(folder.Parent);
                else
                    this.populateParent(null);
                break;
            case "FolderDown":
                this.populateParent(folder);
                break;
            default:
                return;
        }
    }
}