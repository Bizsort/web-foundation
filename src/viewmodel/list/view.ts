import { EntityId, List, Semantic } from '../../model/foundation'
import { Image as ImageSettings } from '../../settings'
import { Action, Event, InitOptions, IView, ViewModel } from '../../viewmodel'
import { PageMetadata } from '../../page'
import { OperationException, OperationExceptionType } from '../../exception'
import { Header as ListHeader } from '../../../component/list/header'
import { ItemOption, View as ListView, ViewType } from '../../../component/list/view'
import { Applied as FilterApplied, Available as FilterAvailable } from '../../../component/list/filter'
import { Shell } from '../../navigation'
export { Action, EntityId, IView, ListHeader, ListView, Shell, ViewType }

type Constructor<T> = new (...args: any[]) => T;

export function Filterable<T extends Constructor<View>>(superclass: T) {
    abstract class Filterable extends superclass {
        //protected _facets: Semantic.Facet[];
        protected _filterAvail: FilterAvailable;
        get Avail(): FilterAvailable {
            return this._filterAvail;
        }
        protected _filterApplied: FilterApplied;
        get Applied(): FilterApplied {
            return this._filterApplied;
        }

        KnownFacetNames: string[] = [];

        constructor(...args: any[]) {
            super(...args);
        }

        public Initialize() {
            super.Initialize();
            this._filterAvail = this.View.getViewModel<FilterAvailable>('filterAvail');
            this._filterApplied = this.View.getViewModel<FilterApplied>('filterApplied');
            if (this._filterAvail && this._filterApplied) {
                this._filterAvail.FilterSelected = this.applyFilter.bind(this);
                this._filterApplied.FilterSelected = this.removeFilter.bind(this);
            }
            else
                throw 'Filter elements are not found';
        }

        protected populate(pageIndex: number, ...args: any[]) {
            //if (this._filterAvail && this._filterApplied)
                var queryInput = new List.Filter.QueryInput(this._filterApplied.Facets);
                queryInput.StartIndex = (pageIndex > 0 ? this.Pager.FetchIndex : 0);
                queryInput.Length = this.Pager.FetchLimit;
                this._fetchPending = true;
                this.Pager.CanChangePage = false;
                this.fetchList(queryInput, (data: List.Filter.QueryOutput) => {
                    this._fetchPending = false;
                    switch (this.Pager.Populate(data, pageIndex)) {
                        case PopulateStatus.Buffer_Initialized:
                            this._filterAvail.Populate(data.Facets);
                            this.formatActions(data.Series.length == 0 ? true : false);
                            break;
                        case PopulateStatus.Empty:
                            this._filterAvail.Populate([]);
                            this.onEmpty();
                            break;
                    }
                }, (ex) => {
                    this._fetchPending = false;
                    this.Page.HandleError(ex, { ajax: true });
                });
            /*else
                super.populate(pageIndex, args);*/
        }

        applyFilter(facet: Semantic.Facet) {
            if (!this._fetchPending) {
                this._fetchPending = true;
                this._filterApplied.Add(facet);
                //this._facets = this._filterApplied.Facets;
                if (!facet.Exclude && this.KnownFacetNames.indexOf(facet.NameText) >= 0)
                    this.ListView.setItemOption(facet.NameText, ItemOption.DisplayOptOut);
                this.populate(0);
            }
        }

        removeFilter(facet: Semantic.Facet) {
            if (!this._fetchPending) {
                this._fetchPending = true;
                this._filterApplied.Remove(facet);
                //this._facets = this._filterApplied.Facets;
                if (!facet.Exclude && this.KnownFacetNames.indexOf(facet.NameText))
                    this.ListView.setItemOption(facet.NameText, ItemOption.DisplayOptIn);
                this.populate(0);
            }
        }

        Load(...args: any[]) {
            this.Applied.Clear();
            super.Load(...args);
        }

        Search(...args: any[]) {
            this.Applied.Clear();
            super.Search(...args);
        }
    }
    return Filterable; //return abstract class
}

export interface IHeader {
    Entity: string;
    TotalCount: number;
    FromRecord?: number;
    ToRecord?: number;
}

/*interface IView {
    fetchPage?: (page: EntityId[], fetchAction: Action<Object[]>, faultCallback: Action<any>) => void;
}*/

export /*abstract*/ interface IViewInitialize extends InitOptions {
    listView?: ListView;
    listHeader?: ListHeader;
}

export namespace Header {
    export class Data {
        Entity: string;
        TotalCount: number;
        FromRecord: number;
        ToRecord: number;
        Query: string;
        Folder: string;

        constructor(data: IHeader) {
            Object.mixin(this, data);
        }

        get IsEmpty() {
            return this.FromRecord && this.FromRecord > 0 && this.ToRecord && this.ToRecord > 0 ? false : true;
        }

        ToArray() {
            var a = [];
            for (var i in this)
                if (!(typeof this[i] == 'function' || i == 'Format'))
                    a.push(this[i]);
            return a;
        }
    }
}

export enum PopulateStatus {
    Empty = 0,
    Buffer_Initialized = 1,
    Buffer_Expanded = 2
}

export class Pager {
    IsPageChanging = false;
    TotalItemCount = -1;

    FromRecord = -1;
    ToRecord = -1;
    PropertyChange: Event<string>;

    PageSizeOptions = [12, 24, 48, 96]; //Cad divide evenly by 2,3 and 4 for card layout

    protected _buffer = null;
    protected _fetchCount = 0;
    get FetchIndex(): number {
        return this._buffer ? this._buffer.length : 0;
    }
    Reset() {
        if (this._buffer || this._fetchCount || this._pageIndex !== -1) {
            this._buffer = null;
            this._itemCount = 0;
            this._fetchCount = 0;
            this._pageIndex = -1;
        }
    }

    PopulatePage: Action<EntityId[]>;
    PopulateBuffer: Action<number>;

    PageChanging: Action<number>;
    PageChanged;

    constructor() {
        this.PropertyChange = new Event<string>();
    }

    protected _canChangePage = false;
    get CanChangePage(): boolean {
        return this._canChangePage;
    }
    set CanChangePage(canChangePage: boolean) {
        if (this._canChangePage != canChangePage) {
            this._canChangePage = canChangePage;
            this.notifyProperty("CanChangePage");
        }
    }

    protected _itemCount = 0;
    get ItemCount(): number {
        return this._itemCount;
    }
    set ItemCount(itemCount: number) {
        if (this._itemCount != itemCount) {
            this._itemCount = itemCount;
            this.notifyProperty("ItemCount");
        }
    }

    protected _pageIndex = -1;
    get PageIndex(): number {
        return this._pageIndex;
    }
    set PageIndex(pageIndex: number) {
        if (this._pageIndex != pageIndex) {
            this._pageIndex = pageIndex;
            this.notifyProperty("PageIndex");
        }
    }

    protected _pageSize = 12;
    get PageSize(): number {
        return this._pageSize;
    }
    set PageSize(pageSize: number) {
        if (this._pageSize != pageSize) {
            this._pageSize = pageSize;
            this.populatePage(0, true);
        }
    }

    notifyProperty(propertyName) {
        this.PropertyChange.Invoke(this, propertyName);
    }

    MoveToPage(pageIndex) {
        if (this.CanChangePage && pageIndex >= 0 && pageIndex < this.PageCount && pageIndex != this.PageIndex) {
            if (this.FetchLimit > 0 && this.FetchIndex > 0 && ((pageIndex + 1) * this.PageSize) > this._fetchCount) {
                if (this.PopulateBuffer)
                    this.PopulateBuffer(pageIndex);
                else
                    throw 'Pager integrity check failed: MoveToPage';
            }
            else
                return this.populatePage(pageIndex, true) > 0;
        }

        return false;
    }

    MoveToPreviousPage() {
        return this.MoveToPage(this.PageIndex - 1);
    }

    MoveToNextPage() {
        return this.MoveToPage(this.PageIndex + 1);
    }

    MoveToFirstPage() {
        return this.MoveToPage(0);
    }

    MoveToLastPage() {
        return this.MoveToPage(this.PageCount - 1);
    }

    get PageCount(): number {
        //SL: return (ItemCount / PageSize) + ((ItemCount % PageSize) > 0 ? 1 : 0);
        if (this.PageSize > 0) {
            return Math.max(1, Math.ceil(this.ItemCount / this.PageSize));
        }
        else {
            return 1;
        }
    }

    notifyPopulatePage(pageIndex: number, page: EntityId[], setPage?: boolean) {
        if (setPage) {
            this.IsPageChanging = true;
            if (this.PageChanging)
                this.PageChanging(pageIndex);

            this.PageIndex = pageIndex;
        }
        else if (this.PageIndex != pageIndex)
            throw new OperationException(OperationExceptionType.UnexpectedState);

        if (this.PopulatePage)
            this.PopulatePage(page);

        if (setPage) {
            this.IsPageChanging = false;
            if (this.PageChanged)
                this.PageChanged();
        }
    }

    populatePage(pageIndex, setPage) {
        if (this._buffer && this._buffer.length > 0 && pageIndex >= 0) {
            var startIndex = pageIndex * this.PageSize;
            var page = this._buffer.slice(startIndex, startIndex + this.PageSize);

            this.FromRecord = startIndex + 1;
            this.ToRecord = startIndex + page.length;

            this.notifyPopulatePage(pageIndex, page, setPage);

            return page.length;
        } //List.View.Initialize: Pager.PageSize = x  
        //else
        //    throw new OperationException(OperationExceptionType.Invalid);
    }

    RefreshPage() {
        if (this.PageIndex >= 0)
            this.populatePage(this.PageIndex, false);
    }

    protected _fetchLimit = 0;
    get FetchLimit(): number {
        return this._fetchLimit;
    }
    set FetchLimit(fetchLimit: number) {
        if (this._fetchLimit != fetchLimit) {
            this._fetchLimit = fetchLimit;
        }
    }

    Populate(data: List.QueryOutput, pageIndex: number) {
        this.CanChangePage = false;
        var populateStatus;
        if (!this._buffer || !data || !data.StartIndex) {
            if (data && data.Series && data.Series.length > 0) {
                this._buffer = data.Series;
                this._fetchCount = (this._fetchLimit > 0 ? this._fetchLimit : this._buffer.length);

                if (data.TotalCount) {
                    this.ItemCount = data.TotalCount;
                    //this.TotalItemCount = data.TotalCount;
                }
                else {
                    this.ItemCount = data.Series.length;
                    //this.TotalItemCount = -1;
                }
                if ((pageIndex * this.PageSize) >= data.Series.length)
                    pageIndex = 0;
                populateStatus = PopulateStatus.Buffer_Initialized;
            }
            else {
                this._fetchCount = 0;
                this._buffer = null;
                this.ItemCount = 0;
                //TotalItemCount = -1;
                pageIndex = -1;
                populateStatus = PopulateStatus.Empty;
            }
        }
        else if (this._buffer.length == data.StartIndex && pageIndex == this.PageIndex + 1) {
            this._fetchCount = this._buffer.length + this._fetchLimit;

            if (data.Series.length > 0) {
                this._buffer.push.apply(this._buffer, data.Series)
            }
            else
                pageIndex = this.PageIndex;
            populateStatus = PopulateStatus.Buffer_Expanded;
        }
        else
            throw 'Pager integrity check failed: Populate';

        if (pageIndex < 0) {
            this.FromRecord = -1;
            this.ToRecord = -1;

            this.notifyPopulatePage(pageIndex, null, true);
        }
        else if (pageIndex == 0 || pageIndex != this.PageIndex) {
            this.populatePage(pageIndex, true);
        }

        return populateStatus;
    }
}

export abstract class View extends ViewModel //implements IView
{
    //_filterable: ViewModel.List.Filterable;
    ListHeader: ListHeader;
    ListView: ListView;
    get ViewType(): ViewType {
        return this.ListView && this.ListView.Type;
    }

    protected _selectedItems: EntityId[] = [];
    get SelectedItems(): EntityId[] {
        return this._selectedItems;
    }
    set SelectedItems(selectedItems: EntityId[]) {
        if (this._selectedItems != selectedItems) {
            this._selectedItems = selectedItems;
            this.notifyProperty("SelectedItems", this._selectedItems);
        }
    }
    protected clearSelected() {
        if (this.SelectedItems.length)
            this.arraySplice('SelectedItems', 0, this.SelectedItems.length);
    }

    protected _fetchPending: boolean;

    protected abstract fetchList(queryInput: List.QueryInput | List.Filter.QueryInput, callback: Action<List.QueryOutput | List.Filter.QueryOutput>, faultCallback: Action<any>, arg1?: any);
    //{ callback(null); }

    _pager: Pager
    get Pager(): Pager {
        return this._pager;
    }
    constructor(view: IView) {
        super(view);
        this._pager = new Pager();
        this._pager.PopulateBuffer = this.populate;
        this._pager.PopulatePage = this.populatePage.bind(this);
        this._pager.PropertyChange.AddHandler((sender, propertyName) => {
            this.notifyProperty('Pager.' + propertyName, this.Pager[propertyName]);
        });
        this._fetchPending = false;
    }

    public Initialize(options: IViewInitialize = {}) {
        super.Initialize();
        this.ListView = options.listView || this.getViewModel<ListView>('listView');
        this.ListHeader = options.listHeader || this.getViewModel<ListHeader>('listHeader') || new ListHeader(this.View);
    }

    set ListItems(items) {
        if (this.ListView)
            this.ListView.Items = items;
        this.clearSelected();
        this.updateDescription(items);
    }

    protected updateDescription(items) {
        var description = this.ListHeader ? this.ListHeader.Text : '';
        if (items && items.length) {
            var i = 0;
            if (items[0].Name) {
                while (i < items.length && i <= 10) {
                    description += ' ';
                    description += items[i++].Name;
                }
            }
            if (i < 10 && items[0].Text)
                description += (' ' + items[0].Text);
        }
        this.Page.Meta.Description = description;
    }

    protected populateHeader(header) {
        if (this.Page.Token.SearchQuery) {
            header.Query = this.Page.Token.SearchQuery;
        }
        return header;
    }

    ReflectToken(populateParams?: boolean) {
        if (this.ListHeader && populateParams)
            this.ListHeader.SetFormat(this.Page.Token.SearchQuery ? true : false, true);
    }

    Search(...args: any[]) {
        /*if (this._filterable)
            this._filterable.Applied.Clear();*/
        Shell.Reflect(this.Page.Token);
        this.ReflectToken(true);
        this.Pager.Reset();
        this.populate(0);
    }

    //http://stackoverflow.com/questions/12739149/typescript-type-signatures-for-functions-with-variable-argument-counts
    Load(...args: any[]) {
        this.ClearError();
        this.Pager.Reset();
        //Foundation.Page.prototype.Load.call(this); //Set the loaded flag
        this.populate(this.Page.Token.Page >= 0 ? this.Page.Token.Page : 0);
    }

    protected onEmpty() {
        this.formatActions(true);
        PageMetadata.setMetaTag("robots", "noindex");
    }

    protected formatActions(isEmpty?: boolean) {
    }

    protected populate(pageIndex: number, ...args: any[]) {
        var queryInput = {
            StartIndex: (pageIndex > 0 ? this.Pager.FetchIndex : 0),
            Length: this.Pager.FetchLimit
        };
        this._fetchPending = true;
        this.Pager.CanChangePage = false;
        this.fetchList(queryInput, (data) => {
            this._fetchPending = false;
            switch (this.Pager.Populate(data, pageIndex)) {
                case PopulateStatus.Buffer_Initialized:
                    this.formatActions(data.Series.length == 0 ? true : false);
                    break;
                case PopulateStatus.Empty:
                    this.onEmpty();
                    break;
            }
        }, (ex) => {
            this._fetchPending = false;
            this.Page.HandleError(ex, { ajax: true });
        });
    }

    protected preparePage(refs: EntityId[], items: EntityId[], valueSetter?, pager?): Object[] { //customValues?
        if (items && items.length > 0 && items.length <= refs.length) {
            var item;
            var sorted = [];
            pager = pager || this.Pager;
            //var valuesIndex = pager.PageIndex * pager.PageSize;
            //var values = customValues ? customValues.slice(valuesIndex, valuesIndex + pager.PageSize) : null;
            for (var i = 0, l = refs.length; i < l; i++) {
                if (items[i].Id == refs[i].Id) {
                    item = items[i];
                }
                else {
                    item = null;
                    for (var j = 0, l2 = items.length; j < l2; j++) {
                        if (items[j].Id == refs[i].Id) {
                            item = items[j];
                            break;
                        }
                    }
                }
                if (item) {
                    if (valueSetter/* && values*/)
                        valueSetter(item, refs[i]/*values[i]*/);
                    if (item.Image && !item.Image.ImageSize)
                        item.Image.ImageSize = this.ViewType === ViewType.Card ? ImageSettings.Small : ImageSettings.Thumbnail;
                    sorted.push(item);
                }
            }
            return sorted;
        }
        return items;
    }

    abstract fetchPage(page: EntityId[], fetchAction: Action<Object[]>, faultCallback: Action<any>);

    protected populatePage(page, selected) {
        if (page && page.length > 0) {
            if (this.ListHeader)
                this.ListHeader.Data = this.populateHeader(new Header.Data({ FromRecord: this.Pager.FromRecord, ToRecord: this.Pager.ToRecord, TotalCount: this.Pager.ItemCount, Entity: String.pluralize(this.ListHeader.Entity, this.Pager.ItemCount)/*, Format: this.List.HeaderFormat*/ }));
            this.Pager.CanChangePage = false;
            if (this.Page.Token.Page != this.Pager.PageIndex) {
                this.Page.Token.Page = this.Pager.PageIndex;
                Shell.Reflect(this.Page.Token);
            }
            this._fetchPending = true;
            this.fetchPage(page, (data) => {
                this._fetchPending = false;
                this.ListItems = data;
                this.Pager.CanChangePage = true;
                //this.Page.ViewModel.Loaded = true;
            }, (ex) => {
                this._fetchPending = false;
                this.Page.HandleError(ex, { ajax: true });
            });
        } else {
            if (this.ListHeader)
                this.ListHeader.Data = this.populateHeader(new Header.Data({ Entity: String.pluralize(this.ListHeader.Entity, 0), TotalCount: 0/*, Format: this.List.EmptyHeaderFormat*/ }));
            this.ListItems = [];
        }
    }
}

export abstract class Searchview extends View {
    fetchList(queryInput: List.SearchInput, callback: Action<List.SearchOutput>, faultCallback: Action<any>, fetchDelegate) {
        queryInput.Category = this.Page.Token.CategoryId;
        if (this.Page.Token.SearchQuery)
            queryInput.SearchQuery = this.Page.Token.SearchQuery;

        if (this.Page.Token.SearchNear) {
            queryInput.SearchNear = this.Page.Token.SearchNear.Geolocation;
            fetchDelegate(queryInput, (queryOutput) => {
                if (queryOutput.Series && queryOutput.Series.length) {
                    if (typeof queryOutput.Series[0].Distance === 'undefined')
                        throw new OperationException(OperationExceptionType.UnexpectedState);
                }
                callback(queryOutput);
            }, faultCallback);
        }
        else {
            queryInput.Location = this.Page.Token.LocationId;
            fetchDelegate(queryInput, callback, faultCallback);
        }
    }

    //https://github.com/Microsoft/TypeScript/issues/14439
    Search() {
        this.populate(0);
    }
}

export interface IViewable {
    ListHeader: ListHeader;
    ListView: ListView;
    Initialize: (options: IViewInitialize) => void;
    Populate: (items: EntityId[]) => void;
}

export function Viewable<T extends Constructor<ViewModel>>(superclass: T) {
    return class extends superclass {
        ListHeader: ListHeader;
        ListView: ListView;

        public Initialize(options: IViewInitialize = {}) {
            super.Initialize();
            this.ListView = options.listView || this.getViewModel<ListView>('listView');
            this.ListHeader = options.listHeader || this.getViewModel<ListHeader>('listHeader') || new ListHeader(this.View);
        }

        set ListItems(items) {
            if (this.ListView)
                this.ListView.Items = items;
        }

        Populate(items: EntityId[]) {
            if (items && items.length > 0) {
                if (this.ListHeader)
                    this.ListHeader.Data = this.populateHeader(new Header.Data({ FromRecord: 1, ToRecord: items.length, TotalCount: items.length, Entity: String.pluralize(this.ListHeader.Entity, items.length)/*, Format: this.List.HeaderFormat*/ }));
                this.ListItems = items;
            } else {
                if (this.ListHeader)
                    this.ListHeader.Data = this.populateHeader(new Header.Data({ Entity: String.pluralize(this.ListHeader.Entity, 0), TotalCount: 0/*, Format: this.List.EmptyHeaderFormat*/ }));
                this.ListItems = [];
            }
        }

        protected populateHeader(header) {
            return header;
        }
    }
}

export const Container = Viewable(ViewModel)