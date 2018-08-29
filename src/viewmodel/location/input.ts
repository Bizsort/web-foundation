import { ElementType, ErrorInfo, ErrorMessageType, IView, Validateable, ViewModel } from '../../viewmodel'
import { Event } from '../../system'
import { Address, Geocoder as GeocoderModel, ResolvedLocation } from '../../model'
import { Location as LocationSettings } from '../../settings'
import * as GeocoderService from '../../service/geocoder'
import * as LocationService from '../../service/location'
import * as Resource from '../../resource'

export { ErrorMessageType, IView, LocationService, Validateable }

declare global {
    interface Window {
        google: any;
    }
}

export interface IInput extends ViewModel {
    //Id: number;
    Validateable: Validateable;
    Text: string;
    Reset: () => void;
}

/*LocationService.GetName
export function GetName(locationId: number, callback: Action<IdName>) {
    if (locationId && (locationId != LocationSettings.Country.Id || !LocationSettings.Country.Name)) {
        LocationService.Get(locationId, (location) => {
            callback({
                Id: location.Id,
                Name: location.Name
            });
        });
    }
    else
        callback(LocationSettings.Country);
}*/

export class Input extends ViewModel implements IInput {
    //mixins
    protected _geoinput: Geocoder.Input;

    constructor(view: IView) {
        super(view);
        this._geoinput = new Geocoder.Input(this);
        //this._validateable = new Validateable(this, null, null, this._geoinput.Validate.bind(this._geoinput));
    }

    InitAutocomplete(inputElement, types?) {
        this._geoinput.InitAutocomplete(inputElement, types);
    }

    protected _text: string = '';
    get Text(): string {
        return this._text;
    }
    set Text(text: string) {
        if (this.setText(text))
            this.Reset();
    }

    protected setText(text: string) {
        if (this._text != text) {
            this._text = text;
            this.notifyProperty('Text', this._text);
            return true;
        }
    }

    Reset() {
        this._geoinput.Geocoded = null;
    }

    get Geolocation(): GeocoderModel.Geolocation {
        return this._geoinput.Geovalidated;
    }

    GetErrorMessage(error, data, options?) {
        switch (error) {
            case ErrorMessageType.Argument_Invalid:
                if (data.ParamName == "Country" && data.ParamValue)
                    return String.format(Resource.Global.Country_Error_NotSupported, data.ParamValue);
                else
                    return super.GetErrorMessage(error, data, options);
            default:
                return super.GetErrorMessage(error, data, options);
        }
    }
}

export namespace Geocoder {
    //Foundation.Controls.Location.TextBox
    export class Input {
        public ErrorInfo: ErrorInfo;

        protected _inputElement: HTMLInputElement;
        get InputElement(): HTMLInputElement {
            return this._inputElement;
        }
        set InputElement(inputElement: HTMLInputElement) {
            this._inputElement = inputElement;
        }
        ErrorElementName = "location"
        protected _autocomplete: google.maps.places.Autocomplete;
        get Autocomplete(): google.maps.places.Autocomplete {
            return this._autocomplete;
        }
        protected _geocoded: GeocoderModel.Location;
        get Geocoded(): GeocoderModel.Location {
            return this._geocoded;
        }
        set Geocoded(geocoded: GeocoderModel.Location) {
            if (geocoded)
                this._geocoded = geocoded;
            else if (this._geocoded)
                delete this._geocoded;

            if (this._geovalidated)
                delete this._geovalidated;

            if (this._georesolved)
                delete this._georesolved;

        }
        protected _geovalidated: GeocoderModel.Geolocation;
        get Geovalidated(): GeocoderModel.Geolocation {
            return this._geovalidated;
        }
        _georesolved: GeocoderModel.Address;
        get Georesolved(): GeocoderModel.Address {
            return this._georesolved;
        }
        Resolved: Event<ResolvedLocation>;

        Requirement: Address.Requirement;

        constructor(protected _master: IInput, protected _autoResolve: boolean = false) {
            this._inputElement = this._master.getElement<HTMLInputElement>(ElementType.ChildElement_Selector, 'input');
            this.Resolved = new Event<ResolvedLocation>();
        }

        _placeChanged: google.maps.MapsEventListener
        InitAutocomplete(inputElement?, types = ['geocode']) {
            this._inputElement = inputElement || this._inputElement;
            if (window.google && google.maps) {
                //http://stackoverflow.com/questions/27717493/polymer-paper-input-with-google-places-autocomplete
                this.ClearAutocomplete();
                if (this._inputElement) {
                    var options: google.maps.places.AutocompleteOptions = { types: types };
                    //https://developers.google.com/maps/documentation/javascript/reference#GeocoderComponentRestrictions
                    if (LocationSettings.Country.Id && LocationSettings.Country.Code) {
                        options.componentRestrictions = { country: LocationSettings.Country.Code };
                    }
                    //http://stackoverflow.com/questions/32994634/this-api-project-is-not-authorized-to-use-this-api-please-ensure-that-this-api
                    this._autocomplete = new google.maps.places.Autocomplete(this._inputElement, options);
                    this._placeChanged = google.maps.event.addListener(this._autocomplete, 'place_changed', () => {
                        var place = this._autocomplete.getPlace();
                        if (place)
                            this.FromGeocoder(GeocoderService.Parse(place), false);
                        else
                            this.Geocoded = null;
                    });
                }
            }
        }

        ClearAutocomplete () {
            if (this._autocomplete && window.google && google.maps) {
                //https://code.google.com/p/gmaps-api-issues/issues/detail?id=3429
                if (this._inputElement === document.activeElement) //In google.maps v3.22 (Nov 19, 2015) Autocomplete seems to remain open 
                    google.maps.event.trigger(this._inputElement, 'blur');
                google.maps.event.removeListener(this._placeChanged); //http://stackoverflow.com/questions/33049322/no-way-to-remove-google-places-autocomplete
                this._autocomplete.unbindAll();
                google.maps.event.clearInstanceListeners(this._inputElement);
                delete this._autocomplete;
            }
        }

        FromGeocoder(geocoded, resolveCreate?) {
            if (!Object.isEmpty(geocoded) && geocoded.Text && geocoded.Geolocation) {
                this._master.Text = geocoded.Text; //will reset _geocoded
                this._geocoded = new GeocoderModel.Location(geocoded); //_geovalidated will be set in ValidateGeocoded;
            }
            else
                this._master.Reset();

            if (typeof resolveCreate == 'boolean' || this._autoResolve)
                this.Resolve(resolveCreate);
        }

        /*Map (location) {
            location = this.Text();
            if (!String.isNullOrWhiteSpace(location))
                Foundation.Controls.Geocoder.ShowMap(Foundation.Controls.Geocoder.MapType.Entry, JSON.stringify({ Text: location }));
        }*/

        Validate(proceed, address1?) {
            var valid = true;
            var location = this._master.Text;
            if (location) {
                if (!this.Geocoded) {
                    GeocoderService.Geocode(location, (geocoded) => {
                        this.FromGeocoder(geocoded, false);
                        this.ValidateGeocoded(proceed);
                    }, (errorMessage) => {
                        this._master.Validateable.ErrorInfo.SetError(this.ErrorElementName, errorMessage);
                        proceed(false);
                    });
                    return;
                }
                else if (!this.Geovalidated) {
                    this.ValidateGeocoded(proceed, address1);
                    return;
                }
            }
            else if (this.Requirement != Address.Requirement.None) {
                valid = false;
                this._master.Validateable.ErrorInfo.SetError(this.ErrorElementName, String.format(Resource.Global.Editor_Error_Enter_X, Resource.Dictionary.Location));
            }
            proceed(/*!this._master.Validateable.ErrorInfo.HasErrors && */ valid); //if ErrorInfo is shared it may contain other errors
        }

        ValidateGeocoded(proceed, address1?) {
            var geocoded = this._geocoded;
            if (!Object.isEmpty(this._geocoded)) {
                var valid = true;
                if (geocoded.Address && !String.isNullOrEmpty(geocoded.Address.Country)) {
                    debugger;
                    //State and County may not get populated (London, UK)
                    if (!String.isNullOrEmpty(geocoded.Address.City)/* && !String.isNullOrEmpty(geocoded.Address.State)*/) {
                        if (!String.isNullOrEmpty(geocoded.Address.PostalCode)) {
                            if (this.Requirement > Address.Requirement.PostalCode && (String.isNullOrEmpty(geocoded.Address.StreetName) || String.isNullOrEmpty(geocoded.Address.StreetNumber))) {
                                if (address1 && address1.replace(/\./g, '').toLowerCase().indexOf('po box') >= 0)
                                    geocoded.Address.Address1 = address1;
                                else
                                    valid = false;
                            }
                        }
                        else if (this.Requirement > Address.Requirement.City)
                            valid = false;
                    }
                    else if (this.Requirement > Address.Requirement.Country)
                        valid = false;
                }
                else if (this.Requirement != Address.Requirement.None)
                    valid = false;

                if (!valid) {
                    var text = '';
                    switch (this.Requirement) {
                        case Address.Requirement.Country:
                            text = Resource.Dictionary.Country;
                            break;
                        case Address.Requirement.City:
                            text = Resource.Dictionary.City;
                            break;
                        case Address.Requirement.PostalCode:
                            text = Resource.Dictionary.Postal_code;
                            break;
                        case Address.Requirement.StreetAddress:
                            text = Resource.Dictionary.Street_address;
                            break;
                    }
                    if (text)
                        this._master.Validateable.ErrorInfo.SetError(this.ErrorElementName, String.format(Resource.Global.Location_Error_X, text));
                    else
                        this._master.Validateable.ErrorInfo.SetError(this.ErrorElementName, String.format(Resource.Global.Editor_Error_Enter_X, Resource.Dictionary.Location));
                }
                else
                    this._geovalidated = geocoded.Geolocation;

                proceed(/*!this._master.Validateable.ErrorInfo.HasErrors && */valid); //if ErrorInfo is shared it may contain other errors
            }
        }

        Resolve(allowCreate?: boolean, callback?) {
            var geocoded = this._geocoded;
            if (geocoded && geocoded.Address && geocoded.Address.Country) {
                var match = geocoded.Address.EqualsTo(this._georesolved);
                if (!match) {
                    if (this._georesolved)
                        delete this._georesolved;
                    var city: any = { Country: geocoded.Address.Country };
                    //State and County may not get populated (London, UK)
                    if (geocoded.Address.State) {
                        city.State = geocoded.Address.State;
                        //if (geocoded.Address.City)
                        //    city.Name = geocoded.Address.City;
                    }
                    if (geocoded.Address.County)
                        city.County = geocoded.Address.County;
                    if (geocoded.Address.City)
                        city.Name = geocoded.Address.City;
                    if (geocoded.Address.Area)
                        city.Area = geocoded.Address.Area;
                    LocationService.Resolve(city, geocoded.Address.StreetName, allowCreate, (location_) => {
                        if (location_ && location_.Id > 0) {
                            if (!geocoded.Address.City) //Hold onto resolved City (if needed) for ValidateGeocoded later on
                                geocoded.Address.City = location_.City && location_.City.Name;
                            //When allowCreate=false location maybe Partially Resolved for Country specific formating, etc
                            //Don't set _georesolved when Partially Resolved otherwise Submit Validation will skip Resolve with allowCreate=true
                            if (/*allowCreate*/!location_.Partial)
                                this._georesolved = geocoded.Address;
                            //Return (possibly partially) resolved for Country specific formating, etc
                            this.Resolved.Invoke(this, location_);
                        }
                        if (callback)
                            callback(match, location_);
                    },(ex) => {
                            this._master.Validateable.ErrorInfo.SetError(this.ErrorElementName, this._master.Validateable.ViewModel.GetErrorMessage(ex.ErrorMessageType, ex));
                            this.Resolved.Invoke(this, null);
                            if (callback)
                                callback();
                        });
                    return;
                }
            }
            else {
                match = false;
                this.Resolved.Invoke(this, null);
            }
            if (callback)
                callback(match);
        }
    }
}