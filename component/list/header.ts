import { StringFormatter } from '../../src/system'
import { IView, ViewModel } from '../../src/viewmodel'
import * as Resource from '../../src/resource'

export class Header extends ViewModel {

    Format: StringFormatter;
    EmptyFormat: StringFormatter;
    Entity: string = Resource.Dictionary.record;
        
    constructor(view: IView) {
        super(view);
        this.Format = new StringFormatter(Resource.Global.List_Header_Format, ["FromRecord", "ToRecord", "TotalCount", "Entity", "Query"]);
        this.EmptyFormat = new StringFormatter(Resource.Global.List_Header_EmptyFormat, ["Entity", "Query"]);
    }

    protected _text = '';
    set Text(text) {
        if (this._text != text) {
            this._text = text;
            this.notifyProperty("Text", this._text);
        }
    }
    get Text() {
        return this._text;
    }

    protected _data;
    set Data(data) {
        if (this._data != data) {
            this._data = data;
            this.notifyProperty("Data", this._data);

            if (this._data != undefined) {
                if (this._data.Format && this[this._data.Format]) {
                    this.Text = this[this._data.Format](this._data);
                }
                else if (!this._data.IsEmpty) {
                    this.Text = this.Format.ToString(this._data);
                }
                else
                    this.Text = this.EmptyFormat.ToString(this._data);
            }
        }
    }
    get Data() {
        return this._data;
    }

    SetFormat(searchEnabled: boolean, reset?: boolean) {
        if (searchEnabled && this.Page.Token.SearchQuery) {
            this.Format.FormatString = Resource.Global.Search_Header_Format;
            this.EmptyFormat.FormatString = Resource.Global.Search_Header_EmptyFormat;
        } else if (reset) {
            this.Format.FormatString = Resource.Global.List_Header_Format;
            this.EmptyFormat.FormatString = Resource.Global.List_Header_EmptyFormat;
        }
    }
}