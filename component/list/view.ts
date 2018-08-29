import { EntityId } from '../../src/model/foundation'
import { Action2, Event, IView, ViewModel } from '../../src/viewmodel'
export { IView }

export enum ViewType {
    Card = 1,
    List = 2,
    Grid = 3
}

export enum ItemOption
{
    FetchOptIn = 1,
    FetchOptOut = 2,
    DisplayOptOut = 3,
    DisplayOptIn = 4
}

enum ItemFetchOption {
    None = 0,
    In = 1,
    Out = 2
}

enum ItemDisplayOption {
    None = 0,
    In = 1,
    Out = 2
}

interface ItemProperty {
    Fetch: ItemFetchOption;
    Display: ItemDisplayOption;
}

export class View extends ViewModel {
    public ItemSelectedChanged: Event<EntityId>;

    protected _type: ViewType = ViewType.Card;
    set Type(viewType: ViewType) {
        if (this._type != viewType) {
            this._type = viewType;
            this.notifyProperty("Type", this._type);
        }
    }
    get Type(): ViewType {
        return this._type;
    }

    protected _items;
    set Items(items) {
        if (this._items != items) {
            var old = this._items;
            this._items = items;
            this.notifyProperty("Items", this._items, old);
        }
    }
    get Items() {
        return this._items;
    }

    ItemAction: Action2<Object,string>;

    constructor(view: IView)
    {
        super(view);
        this.ItemSelectedChanged = new Event<EntityId>();
    }

    Initialize(options) {
        super.Initialize(options);
        if (this.View.HostElement['selectable'])
            this.Selectable = true;
    }

    protected _itemOptions: { [propertyName: string]: ItemProperty } = {};
    get FetchOptions(): string[] 
    {
        var fetchOptions = [];
        for (var n in this._itemOptions) {
            var ip = <ItemProperty>this._itemOptions[n];
            if (ip.Fetch == ItemFetchOption.In && ip.Display != ItemDisplayOption.Out)
                fetchOptions.push(n);
        }
        return fetchOptions;
    }

    protected _displayOptions = {};
    protected _cachedDisplayOptions;
    set DisplayOptions(displayOptions: Object) {
        this._displayOptions = displayOptions || {};
        this._cachedDisplayOptions = null;
    };
    get DisplayOptions() {
        if(!this._cachedDisplayOptions) {
            var displayOptions = {}, itemProperty;
            for (var propertyName in this._displayOptions) {
                displayOptions[propertyName] = this._displayOptions[propertyName];
            }
            for (var propertyName in this._itemOptions) {
                itemProperty = this._itemOptions[propertyName];
                if (itemProperty.Fetch != ItemFetchOption.None || itemProperty.Display != ItemDisplayOption.None)
                    displayOptions[propertyName] = itemProperty.Display === ItemDisplayOption.In || (itemProperty.Fetch === ItemFetchOption.In && itemProperty.Display !== ItemDisplayOption.Out) ? true : false;
            }
            this._cachedDisplayOptions = displayOptions;
        }
        return this._cachedDisplayOptions;
    };

    /*protected*/setItemOption(propertyName, option: ItemOption) {
        var itemProperty = this._itemOptions[propertyName];
        switch (option) {
            case ItemOption.FetchOptIn:
                if (itemProperty == undefined)
                    this._itemOptions[propertyName] = { Fetch: ItemFetchOption.In, Display: ItemDisplayOption.In };
                else if (itemProperty.Fetch == ItemFetchOption.Out)
                    throw String.format("Item property {1} has already been opted out", propertyName);
                break;
            case ItemOption.FetchOptOut:
                if (itemProperty == undefined)
                    this._itemOptions[propertyName] = { Fetch: ItemFetchOption.Out, Display: ItemDisplayOption.None };
                else if (itemProperty.Fetch == ItemFetchOption.In)
                    throw String.format("Item property {1} has already been opted in", propertyName);
                break;
            case ItemOption.DisplayOptIn:
                if (itemProperty == undefined)
                    this._itemOptions[propertyName] = { Fetch: ItemFetchOption.None, Display: ItemDisplayOption.In };
                else if (itemProperty.Display != ItemDisplayOption.In)
                    itemProperty.Display = ItemDisplayOption.In;
                break;
            case ItemOption.DisplayOptOut:
                if (itemProperty != undefined)
                    this._itemOptions[propertyName] = { Fetch: ItemFetchOption.None, Display: ItemDisplayOption.Out };
                //else if (itemProperty.Fetch == ItemFetchOption.None)
                //    delete this._itemOptions[propertyName];
                else if (itemProperty.Display != ItemDisplayOption.Out)
                    itemProperty.Display = ItemDisplayOption.Out;
                break;
        }
        
        this._cachedDisplayOptions = null;
    }

    set Selectable(value) {
        this.setItemOption("Selectable", (value ? ItemOption.DisplayOptIn : ItemOption.DisplayOptOut));
    }
}