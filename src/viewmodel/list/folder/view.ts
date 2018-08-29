import { IView as IView$, IViewInitialize as IViewInitialize$, Shell, View as ListView, ViewType } from '../../../viewmodel/list/view'
import { Action, Action2, IdName, List as FolderList, TreeList as FolderTree, SetOptions } from '../../../../component/folder/list'
export { Action, Action2, IdName, IViewInitialize, ViewType, SetOptions }

export interface IFolder extends IdName  {
    Type?: SelectedType;
}

export enum AutosetType {
    None = 0,
    First = 1,
    Root = 2
}

export enum SelectedType {
    None = 0,
    Special = 1,
    Regular = 2
}

interface IView {
    setFolder?: (folder: IdName, options: SetOptions) => void;
    populateFolders: (parentFolder: number, lookupFolder: number, callback: Action<IdName[]>) => void;
    folderChanged(folder: IFolder);
}

interface IViewInitialize extends IViewInitialize$  {
    folders?: FolderList | FolderTree;
}

export abstract class View extends ListView implements IView {
    protected _parentFolder: number;
    protected _folder: IFolder;
    get Folder(): IFolder {
        return this._folder;
    }
    set Folder(folder: IFolder) {
        if (this._folder != folder) {
            this._folder = folder;
            this.folderChanged(this._folder);
            this.notifyProperty("Folder", this._folder);
        }
    }
    protected resetFolder() {
        this._folder = {
            Id: 0,
            Name: '',
            Type: SelectedType.None
        };
        this._parentFolder = 0;
    }

    abstract populateFolders(parentFolder: number, lookupFolder: number, callback: Action2<IdName[], number>);
    abstract folderChanged(folder: IFolder);

    RootFolderName: string;
    protected _allFolders: boolean;

    constructor(view: IView$) {
        super(view);
        this.resetFolder();
    }

    /*https://github.com/Microsoft/TypeScript/issues/10025
    https://github.com/Microsoft/TypeScript/issues/7294*/
    Folders: FolderList /*| FolderTree*/;
    Initialize(options: IViewInitialize = {}) {
        super.Initialize();
        this.Folders = options.folders || this.getViewModel<FolderList /*| FolderTree*/>('folders');
        if (this.Folders) {
            this.Folders.Master = this;
            this.Folders.SetFolder = (folder, options) => {
                if (!this._fetchPending && (this.Folder.Id != folder.Id || options && (options & SetOptions.PopulateList) > 0)) {
                    this.setFolder(folder, SetOptions.ClearSearchQuery);
                    return true;
                }

                return false;
            };
            if (this.Folders instanceof FolderTree)
                (<FolderTree>this.Folders).PopulateFolders = this.populateFolders.bind(this);
            /*else if (this._folders instanceof Foundation.Controls.Folder.TwoLevelList)
                this._folders.SetSubFolder = jQuery.proxy(this.parentOrSubFolderSelected, this);*/
        }
    }

    protected autosetFolder(folders?: IdName[]): AutosetType {
        return AutosetType.First;
    }

    protected populateList() {
        super.populate(0);
    }

    Search(populate?: () => boolean) {
        /*if (this._filterable)
            this._filterable.Applied.Clear();*/
        Shell.Reflect(this.Page.Token);
        this.ReflectToken(true);
        if (!populate) {
            this.setFolder({
                Id: 0,
                Name: ''
            }, SetOptions.ClearSelectedFolder);
            return true;
        }
        else
            return populate();
    }

    Load (folder: number, parentFolder: number) {
        if (arguments.length < 2 || typeof folder !== 'number' || typeof parentFolder !== 'number') {
            folder = this.Folder.Id;
            parentFolder = this._parentFolder;
        }
        this.ClearError();
        this.Pager.Reset();
        this.resetFolder();
        this.populate(folder, parentFolder, SetOptions.Default);
    }

    protected populate(folderId: number, parentFolderId: number, options: SetOptions = SetOptions.Default) {
        if (arguments.length <= 1 || typeof parentFolderId === 'undefined') {
            super.populate(0);
            return;
        }
        else if (this._parentFolder != parentFolderId)
            this._parentFolder = parentFolderId;

        //When service does not support sub-tree fetch it would return a top-level list and set foldersParent to 0
        this.populateFolders(parentFolderId, folderId, (folders, foldersParent) => {
            if (!folders || folders.length == 0) {
                //this.folders.Visible = false;

                folderId = 0;

                if (this.autosetFolder() === AutosetType.Root)
                    this.setFolder({
                        Id: folderId,
                        Name: ''
                    }, options);
                else {
                    var folderName = this.RootFolderName;
                    if (!folderName)
                        folderName = 'Empty'; //Resource.Global.Folders_Empty

                    this.Folder = {
                        Id: folderId,
                        Name: folderName,
                        Type: SelectedType.None,
                    };

                    if (this.Folders && (!this.Folders.Items || this.Folders.Items.length)) //Notify
                        this.Folders.Populate(folders, 0, SetOptions.SuppressEvent);
                    this.Pager.Populate(null, -1);
                    this.onEmpty();
                }
            }
            else {
                var folder;
                if (folders.length > 0) {
                    folder = folderId && this.Folders && this.Folders.Lookup(folders, folderId);
                    if (!folder)
                        folderId = 0;

                    if (this.autosetFolder(folders) === AutosetType.First && folders.length > 0 && (!folder || !folderId)) {
                        folder = folders[0];
                        folderId = folders[0].Id;
                    }
                }
                else {
                    folder = null;
                    folderId = 0;
                }

                //PopulateSubFolders functionality - not-utilized (could be used by Create&Update (Sub)Folder in ViewModel.List.Folder.Edit<TFolderKey, TItemKey>)
                /*var parentFolder = $this.Folder.Data;
                if ((options & ViewModel.List.Folder.Folder.SetOptions.PopulateSubFolders) > 0 && foldersParent > 0 && $this.Folder.Id == foldersParent &&
                    folder && folderId && parentFolder) {
                    parentFolder.HasChildren = true;
                    Model.Group.Node.SetParent(folders, parentFolder.Id, parentFolder);

                    //Foundation.Controls.Folder.TreeList.ensureSubFolders
                    parentFolder.Children = folders;
                    var treeViewItem = $this.folders.itemsControl.containerFromItem(parentFolder);
                    if (treeViewItem)
                        treeViewItem.Populate(folders);

                    $this.folders.SelectFolder(folder);
                    $this.setFolder(folder.Id, folder.Name, options, folder);
                }
                else*/if (true) {  //Regular path
                    if (this.Folders)
                        this.Folders.Populate(folders, folderId, options);

                    if (folderId == 0 && this.autosetFolder(folders) === AutosetType.Root)
                        this.setFolder({
                            Id: 0,
                            Name: ''
                        }, options);
                }
            }
        });
    }

    setFolder(folder: IFolder, options: SetOptions)
    {
        if ((options & SetOptions.ClearSearchQuery) > 0 && this.Page.Token.SearchQuery)
        {
            this.Page.Token.SearchQuery = null;
            if (this.Page.SearchBox)
                this.Page.SearchBox.query = '';
            this.ReflectToken(true);
        }

        //var folderType = SelectedType.None;
        if (folder.Id > 0)
        {
            if (!folder.Name)
                folder.Type = SelectedType.Special;
            //else
            //    folderType = SelectedType.Regular;
                    
        }
        else
        {
            var message = this.RootFolderName;
            if (message)
                folder.Name = message;

            folder.Type = SelectedType.Special;

            if (this.Folders)
                this.Folders.ClearSelection();
        }

        if (this._allFolders && folder.Id > 0)
            this._allFolders = false;

        this.Folder = folder;
        //thus.updateFolderPath();

        //this._facets = [];
        super.populate(0);
    }
}