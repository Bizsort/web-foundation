import { DomModule, IView } from './polymer'

export interface ITreeView extends IView {
    Populate: (Object, Array) => boolean;
    ExpandItem: (Object) => boolean;
    SelectedItem: Object;
}

/*export class TreeView extends ViewModel {
    //ItemSelected: Event<Model.Group.NodeRef>;
    ItemExpanded: Event<Model.Group.NodeRef>;

    SelectedItem: Model.Group.NodeRef;

    constructor(view: IView) {
        super(view);
        this.ItemExpanded = new Event<Model.Group.NodeRef>();
    }

    ExpandItem(folder: Model.Group.NodeRef) {
    }
}*/

//Maintaining a mapping would have been cleaner, smth like ItemContainerGenerator in SL
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
//https://www.polymer-project.org/1.0/docs/api/dom-repeat
export class TreeViewDomModule extends DomModule implements ITreeView {
    static _containerCount = 0;
    _container;

    constructor(_dom_host/*: IHost*/) {
        super(_dom_host);
        this._container = '$tvi' + (++TreeViewDomModule._containerCount);
        //this._container = new WeakMap(); //using WeakMap
    }
        
    setItemContainer(item, treeViewItem) {
        if (item && treeViewItem) {
            item[this._container] = treeViewItem; //this._container.set(item, treeViewItem); //using WeakMap
            //Temp workaround: TreeListItem seems to keep expanded attribute value when recycled
            //Test: Expand a couple of Categories, create root Category to reload the tree
            if (treeViewItem.expanded)
                treeViewItem.expanded = false;
            //ExpandItem on first Load lacks container refs
            if (this._selectedItem) { //_itemsControl.PrepareContainer in Foundation.Controls.Folder.TreeList<T> SL
                if (item == this._selectedItem) {
                    this.reflectSelected(true, treeViewItem);
                    if (item.HasChildren && !treeViewItem.expanded)
                        treeViewItem.expanded = true;
                }
                else {
                    var parent = this._selectedItem.Parent;
                    while (parent) {
                        if (parent.Id == item.Id) {
                            treeViewItem.expanded = true;
                            break;
                        }
                        parent = parent.Parent;
                    }
                }
            }
        }
    }

    getItemContainer(item) {
        return item && item[this._container]; //return this._container.get(item); //using WeakMap
    }

    _selectedItem;
    set SelectedItem(selectedItem) {
        if (this._selectedItem != selectedItem) {
            this.reflectSelected(false);
            this._selectedItem = selectedItem;
            this.reflectSelected(true);
        }
    }
    get SelectedItem() {
        return this._selectedItem;
    }
    reflectSelected(selected: boolean, treeViewItem?) {
        if (this._selectedItem) {
            treeViewItem = treeViewItem || this.getItemContainer(this._selectedItem);
            if (treeViewItem)
                treeViewItem.selected = selected ? true : false;
        }
    }

    Populate (item, items) {
        var treeViewItem = this.getItemContainer(item);
        if (treeViewItem) {
            if (item.Children != items) 
                treeViewItem.set('item.Children', items);
            else
                treeViewItem.notifyPath('item.Children', items);
            return true;
        }
    }

    ExpandItem (item) {
        var treeViewItem = this.getItemContainer(item);
        if (treeViewItem) {
            treeViewItem.expanded = true;
            return true;
        }
    }
}