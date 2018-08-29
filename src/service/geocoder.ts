import { Location as LocationSettings } from '../settings'
import { Geocoder } from '../model/foundation'
import { Parse as Address1 } from '../model/address1'

//http://stackoverflow.com/questions/12709074/how-do-you-explicitly-set-a-new-property-on-window-in-typescript
//interface Window { google: any; }

export enum CitySource {
    Locality = 1,
    PostalTown = 2,
    SubLocality = 3
}

export interface AddressOptions {
    Country?: boolean;
    County?: boolean;
    StreetAddress?: boolean;
    PostalCode?: boolean;
    Address1?: boolean;
}

export function Stringify(address: Geocoder.Address, options: AddressOptions = {}): string {
    var parts = [], text: string;
    var country = (options.Country !== true /*&& LocationSettings.Country.Id*/ && LocationSettings.Country.Name) || '';
    if (!Object.isEmpty(address)) {
        if (address.City) {
            if (address.StreetName && options.StreetAddress !== false) {
                if (address.StreetNumber) {
                    if (address.Address1 && options.Address1 !== false) {
                        if (address.Address1.length <= LocationSettings.Address1Threshold)
                            parts.push(address.StreetNumber + ' ' + address.StreetName + ' ' + address.Address1);
                        else
                            parts.push(address.Address1 + ' ' + address.StreetNumber + ' ' + address.StreetName);
                    }
                    else
                        parts.push(address.StreetNumber + ' ' + address.StreetName);
                }
                else {
                    if (address.Address1 && options.Address1 !== false)
                        parts.push(address.Address1 + ' ' + address.StreetName);
                    else
                        parts.push(address.StreetName);
                }
                parts.push(address.City);
            }
            else if (address.Address1 && options.Address1 !== false)
                parts.push(address.Address1 + ' ' + address.City);
            else
                parts.push(address.City);
        }
        if (address.State) {
            if (address.County && options.County !== false)
                parts.push(address.County);
            if (address.PostalCode && options.PostalCode !== false)
                parts.push(address.State + ' ' + address.PostalCode);
            else
                parts.push(address.State);
        }
        else if (address.County && options.County !== false) {
            if (address.PostalCode && options.PostalCode !== false)
                parts.push(address.County + ' ' + address.PostalCode);
            else
                parts.push(address.County);
        }
        else if (address.PostalCode && options.PostalCode !== false)
            parts.push(address.PostalCode);
        if (address.Country && address.Country != country)
            parts.push(address.Country);
    }

    if (parts.length > 1) {
        text = parts[0];
        for (var i = 1, l = parts.length; i < l; i++)
            text += ', ' + parts[i];
    }
    else if (parts.length == 1)
        text = parts[0];

    return text;
}

//http://schema.org/address
export function Schema_org(address: Geocoder.Address, options: AddressOptions = {}) {
    var jsonld: any = {
        "@type": "PostalAddress"
    }
    if (!Object.isEmpty(address)) {
        if (address.StreetNumber && address.StreetName)
            jsonld.streetAddress = address.StreetNumber + ' ' + address.StreetName;
        if (address.City)
            jsonld.addressLocality = address.City;
        if (address.State)
            jsonld.addressRegion = address.State;
        if (address.PostalCode)
            jsonld.postalCode = address.PostalCode;
        if (address.Country)
            jsonld.addressCountry = address.Country;
    }
    return jsonld;
}

//https://maps.googleapis.com/maps/api/geocode/json?address=
export function Parse(gData) {
    var output: any = {};
    var address: any = {};
    if (gData.formatted_address) {
        output.Text = gData.formatted_address;
    }
    if (gData.address_components) {
        var type, name, citySource = 0;
        for (var i = 0, l = gData.address_components.length; i < l; i++) {
            if (gData.address_components[i].types) {
                type = null;
                name = 'long_name';
                for (var j = 0; j < gData.address_components[i].types.length; j++) {
                    switch (gData.address_components[i].types[j]) {
                        case 'country':
                            type = 'Country';
                            break;
                        case 'administrative_area_level_1':
                            type = 'State';
                            break;
                        case 'administrative_area_level_2':
                            type = 'County';
                            break;
                        //When postal_town is present and it differs from locality it carries more significance
                        //2 Lower Castle Street, Old Market, Bristol BS1 3AD, United Kingdom
                        //81 School Lane, Hartford, Northwich CW8 1PW, United Kingdom
                        //34 Saturday Market, Beverley HU17 8BE, United Kingdom
                        case 'postal_town':
                            if (address.City)
                                address.Address1 = address.City
                            type = 'City';
                            citySource = CitySource.PostalTown;
                            break;
                        case 'locality':
                            if (!address.City || citySource == CitySource.SubLocality) {
                                if (!address.Address1 && address.City)
                                    address.Address1 = address.City
                                type = 'City';
                                citySource = CitySource.Locality;
                            }
                            else
                                type = 'Address1';
                            break;
                        //10 Stardust Drive, Dorchester, ON N0L 1G5, Canada
                        case 'sublocality_level_1':
                        case 'sublocality':
                            if (!address.City) {
                                type = 'City';
                                citySource = CitySource.SubLocality;
                            }
                            else
                                type = 'Address1';
                            break;
                        //200 Shebeshekong Rd, Carling, ON P0G, Canada
                        //3850 Milton Rd, Navan, ON K4B 1H8, Canada
                        case 'administrative_area_level_3':
                        case 'neighborhood':
                            type = 'Area';
                            break;
                        case 'street_number':
                            type = 'StreetNumber';
                            break;
                        case 'route':
                            type = 'StreetName';
                            name = 'short_name';
                            break;
                        case 'postal_code':
                            type = 'PostalCode';
                            break;
                        default:
                            type = null;
                            break;
                    }
                    if (type)
                        address[type] = gData.address_components[i][name];
                }
            }
        }
        if (address.Address1 && address.Address1 == address.City)
            delete address.Address1;
        if (!Object.isEmpty(address))
            output.Address = address;
    }

    if (gData.geometry) {
        output.Geolocation = { Lat: gData.geometry.location.lat(), Lng: gData.geometry.location.lng() };
        output.geometry = gData.geometry;
    }

    return output;
}

//https://developers.google.com/maps/documentation/geocoding/
export function Geocode(textLocation: string | Geocoder.Geolocation, callback, faultCallback) {
    var request: any/*google.maps.GeocoderRequest*/ = {};
    var dashIdx: number, address1: string;
    if (typeof textLocation === 'string') {
        //User.Data.Master.Location.AddressFromText

        debugger;
        dashIdx = textLocation.replace(/–/g, '-').indexOf("-");
        //Look for xxx-yyy Street name
        var oneThird = textLocation.length / 3;
        if (dashIdx > 0 && dashIdx < oneThird) {
            for (var i = 0; i < dashIdx; i++) {
                if (!(textLocation[i].toLowerCase() !== textLocation[i].toUpperCase() || numbers.indexOf(textLocation[i]) !== -1 || textLocation[i] == '#' || textLocation[i] == ' ')) {
                    dashIdx = -1;
                    break;
                }
            }
            if (dashIdx >= 0 && numbers.indexOf(textLocation.substring(dashIdx + 1).trim()[0]) >= 0) {
                address1 = textLocation.substr(0, dashIdx).trim();
                //textLocation = textLocation.substr(dashIdx + 1);
                if (address1.indexOf('#') >= 0) {
                    address1 = address1.replace(/#/g, '');
                    textLocation = textLocation.replace(/#/g, '');
                }
            }
        }

        if (!address1) {
            dashIdx = -1;

            var address = {
                value: textLocation
            };

            address1 = Address1(address);

            if (address1)
                textLocation = address.value;
        }

        request.address = textLocation;
    }
    else
        request.location = new google.maps.LatLng(textLocation.Lat, textLocation.Lng);

    if (request.address || request.location) {
        var geocoder = new google.maps.Geocoder();

        geocoder.geocode(request/*{ 'address': address }*/, (results, status) => {
            if (status == google.maps.GeocoderStatus.OK) {
                var geocoded = Parse(results[0]);

                if (address1 && geocoded && geocoded.Address) {
                    if (dashIdx > 0 && (geocoded.Text.indexOf(address1) === -1 || address1.length == 1)) {
                        var letters = 2;
                        for (var i = 0; i < dashIdx; i++) {
                            if (address1[i].toLowerCase() !== address1[i].toUpperCase())
                                letters--;
                            if (letters < 0)
                                break;
                        }
                        if (letters >= 0)
                            geocoded.Address.Address1 = "Unit " + address1.toUpperCase();
                        else
                            geocoded.Address.Address1 = address1;
                    }
                    else if (dashIdx == -1)
                        geocoded.Address.Address1 = address1;
                }

                callback(geocoded);
            }
            else if (faultCallback) {
                faultCallback(status);
            }
        });
    }
}
var numbers = "0123456789";