import { IdName } from '../../src/model/foundation'
import { Action, Action2, IDialogView, ViewModel } from '../../src/viewmodel'
export { Action, Action2 }

export enum ItemType {
    Existing = 1,
    New = 2,
    Root = 3
}

export abstract class MenuList extends ViewModel {
    ItemSelected: Action2<IdName, ItemType>;
    protected _populated: boolean;

    constructor(protected _popup: IDialogView) {
        super(_popup);
        _popup.Opened.AddHandler((sender, e) => {
            if (!this._populated) {
                this.Populate();
                this._populated = true;
            }
        });
    }

    protected _items: IdName[];
    set Items(items: IdName[]) {
        if (this._items != items) {
            this._items = items;
            this.notifyProperty("Items", this._items);
        }
    }
    get Items(): IdName[] {
        return this._items;
    }

    ItemAction(item: IdName) {
        this.onItem(item, ItemType.Existing);
    }

    /*NewItemAction() {
        this.onItem({ Id: 0, Name: '' }, ItemType.New);
    }*/

    onItem(item: IdName, itemType: ItemType): boolean {
        this._popup.Close();
        if (/*this.Actor > 0 &&*/ (item.Id > 0 || itemType == ItemType.New || itemType == ItemType.Root)) {
            this.ItemSelected(item, itemType);
            return true;
        }
    }

    abstract populate(populateMethod: Action<IdName[]>);
    Populate () {
        this.populate((items) => {
            if (items && items.length) {
                this.Items = items;
            }
            /*else if (!this.NewItemTemplate)
                this.Enabled = false;*/
        });
    }

    ResetItems () {
        this.Items = null;
        this._populated = false;
    }
}