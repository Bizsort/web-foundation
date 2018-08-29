import { IdName, Node, NodeRef } from '../../src/model/foundation'
import { Action, Action2, ViewModel } from '../../src/viewmodel'
import { ITreeView } from '../../src/view/treeview'
export { Action, Action2, IdName }

export enum SetOptions {
    Default = 0,
    ClearSearchQuery = 1,
    ClearSelectedFolder = 2,
    UserInitiated = 4,
    SuppressEvent = 8,
    PopulateList = 16,
    Refresh = 32,
}

export class List extends ViewModel {
    Master: ViewModel;
    SetFolder: Action2<IdName, SetOptions>;

    protected _items: IdName[];
    set Items(items: IdName[]) {
        if (this._items != items) {
            this._items = items;
            this.notifyProperty("Items", this._items);
            this.Master.notifyProperty("Folders.ItemCount", this.ItemCount);
            //this.notifyProperty("ItemCount", this._items);
        }
    }
    get Items(): IdName[] {
        return this._items;
    }

    get ItemCount(): number {
        return this._items ? this._items.length : 0;
    }

    ClearSelection() {
    }

    ItemAction (folder) {
        if (folder && folder.Id > 0) {
            this.onFolder(folder, SetOptions.UserInitiated);
        }
    }

    Populate(folders: IdName[], selectedFolder: number, options: SetOptions) {
        this.ClearSelection();

        /*Name is not getting reflected in the folder tree
        dom-repeat in treelist-items does not notify treelist-item
        if ((options & SetOptions.Refresh) > 0 && this._items == folders)
            this._items = []; //This doesn't help*/
        this.Items = folders;

        if (!options || (options & SetOptions.SuppressEvent) == 0) {
            var folder = this.Lookup(folders, selectedFolder);
            if (folder)
                this.onFolder(folder, options);
        }
    }

    Lookup(folders: IdName[], id: number): IdName {
        if (id > 0)
            return folders.find((f) => { return f.Id == id ? true : false; });
    }

    onFolder(folder: IdName, options: SetOptions) {
        if (this.SetFolder(folder, options)) {
            this.SelectFolder(folder);
            return true;
        }

        return false;
    }

    SelectFolder(folder: IdName) {
    }
}

/*interface IPopulateFolders {
    (parentFolder: number, lookupFolder: number, callback: Action2<NodeRef[], number>): void;
}*/

export abstract class TreeList extends List {
    constructor(protected treeView: ITreeView) {
        super(treeView);
    }

    Initialize(options) {
        super.Initialize();

        //treelist.html folder-treelist _itemExpanded & _itemSelected
        /*this.treeView.ItemSelected.AddHandler((sender, folder) => {
            if (selectedItem != undefined) {
                $this.ItemAction(selectedItem);
            }
            else
                return Foundation.Controls.Layout.ItemSelector.prototype.SelectedItem.call(this);
        }
        this.treeView.ItemExpanded.AddHandler((sender, folder) => {
            this.ensureSubFolders(folder);
        });*/
    }

    /*https://github.com/Microsoft/TypeScript/issues/10025
    https://github.com/Microsoft/TypeScript/issues/7294*/
    Lookup(folders: IdName[]/*NodeRef[]*/, id: number): IdName {
        if (folders && folders.length > 0 && !(typeof (<NodeRef>folders[0]).ParentId === 'undefined' || typeof (<NodeRef>folders[0]).HasChildren === 'undefined')) {
            if (id > 0)
                return this.lookup(null, folders, id);
        }
        else
            return super.Lookup(folders, id);
    }

    lookup(parent: NodeRef, folders: NodeRef[], id: number): IdName {
        var folder = <NodeRef>super.Lookup(folders, id);
        if (folder) {
            if (parent && folder.Parent != parent)
                folder.Parent = parent;
            return folder;
        }
        else {
            for (var i = 0, l = folders.length; i < l; i++) {
                if (folders[i].HasChildren && folders[i].Children) {
                    folder = this.lookup(folders[i], folders[i].Children, id);
                    if (folder) {
                        if (parent && folders[i].Parent != parent)
                            folders[i].Parent = parent;
                        return folder;
                    }
                }
            }
        }
    }

    PopulateFolders: (parentFolder: number, lookupFolder: number, callback: Action2<NodeRef[], number>) => void;
    ensureSubFolders(folder: NodeRef, callback?: Action<NodeRef[]>) {
        if (folder && folder.HasChildren && folder.Children && folder.Children.length == 1 && folder.Children[0].Id == 0) {
            this.PopulateFolders(folder.Id, 0, (folders, parentFolder) => {
                if (folders && folders.length > 0) {
                    Node.SetParent(folders, folder);
                    //Populate TreeView Item before setting the Children property so that binding con do it's job
                    if (!this.treeView.Populate(folder, folders) || folder.Children != folders)
                        folder.Children = folders;
                }
            });
        }
    }

    onFolder(folder: NodeRef, options) {
        if (folder.Id > 0 && super.onFolder(folder, options)) { //ignore children placeholders
            this.ensureSubFolders(folder);
            return true;
        }

        return false;
    }

    ClearSelection() {
        if (this.treeView.SelectedItem)
            this.treeView.SelectedItem = null;
    }

    /*https://github.com/Microsoft/TypeScript/issues/10025
    https://github.com/Microsoft/TypeScript/issues/7294*/
    SelectFolder(folder: IdName/*NodeRef*/) {
        folder = <NodeRef>folder;
        if (this.treeView.SelectedItem != folder) {
            if (folder) {
                this.ExpandFolder((<NodeRef>folder).HasChildren ? folder : (<NodeRef>folder).Parent);
                this.treeView.SelectedItem = folder;
            }
            else
                this.treeView.SelectedItem = null;
        }
    }

    ExpandFolder(folder: NodeRef) {
        if (folder) {
            this.ExpandFolder(folder.Parent);
            this.treeView.ExpandItem(folder);
        }
    }
}