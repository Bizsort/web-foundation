import { Autocomplete, IdName, Node, ResolvedLocation, SubType } from '../model/foundation'
import { Action, Get as Get$, Post as Post$, Page } from '../service'
import { Location as LocationSettings } from '../settings'
import { Shell } from '../navigation'
export { LocationSettings as Settings }

export function Autocomplete(parent: number, name: string, scope: IdName, callback: Action<Autocomplete[]>, faultCallback) {
    return Get$("/master/location/Autocomplete?parent=" + parent + "&name=" + name + (scope ? "&scope=" + JSON.stringify(scope) : ''), {
        callback: callback,
        faultCallback: faultCallback
    });
}

export function Get(location, ...args) {
    var callback, faultCallback;
    if (arguments.length >= 2) {
        if (typeof arguments[1] == 'number' && typeof arguments[2] == "function") {
            var type = arguments[1];
            callback = arguments[2];
            if (arguments.length == 4)
                faultCallback = arguments[3];
            return Get$("/master/location/Get_Ref?location=" + location + "&type=" + type, { callback: callback, faultCallback: faultCallback });
        }
        else if (typeof arguments[1] == "function") {
            callback = arguments[1];
            if (arguments.length == 3)
                faultCallback = arguments[2];
            return Get$("/master/location/Get?location=" + location, { callback: callback, faultCallback: faultCallback });
        }
    }
}

export function GetName(locationId: number, callback: Action<IdName>) {
    if (locationId && (locationId != LocationSettings.Country.Id || !LocationSettings.Country.Name)) {
        Get(locationId, (location) => {
            callback({
                Id: location.Id,
                Name: location.Name
            });
        });
    }
    else
        callback(LocationSettings.Country);
}

export function PopulateWithChildren(parent: number, type: SubType, memberType: number, callback: Action<Node>, faultCallback) {
    return Get$("/master/location/PopulateWithChildren?parent=" + parent + "&type=" + type + "&memberType=" + memberType, {
        callback: (data) => {
            if (data) {
                var token = Page.Current.Token.Clone;
                Node.Deserialize(data, {}, {
                    navToken: (location) => {
                        token.LocationId = location.Id;
                        return Shell.Href(token);
                    }
                });
            }
            callback(data);
        },
        faultCallback: faultCallback
    });
}

export function PopulateWithPath(location_, ...args: any[]) {
    var callback, faultCallback;
    switch (typeof arguments[1]) {
        case 'function':
            callback = arguments[1];
            if (arguments.length == 3)
                faultCallback = arguments[2];
            break;
        case 'undefined':
            callback = arguments[2];
            if (arguments.length == 4)
                faultCallback = arguments[3];
            break;
        case 'number':
            var street = arguments[1];
            callback = arguments[2];
            if (arguments.length == 4)
                faultCallback = arguments[3];
            return Get$("/master/location/PopulateWithPath_Street?city=" + location_ + "&street=" + street, { callback: callback, faultCallback: faultCallback });
    }

    return Get$("/master/location/PopulateWithPath?location=" + location_, { callback: callback, faultCallback: faultCallback });
}

export function Resolve(city, street, allowCreate, callback: Action<ResolvedLocation>, faultCallback) {
    var data: any = {
        City: city,
        AllowCreate: allowCreate
    };
    if (street)
        data.Street = street;
    return Post$("/master/location/Resolve", {
        authorize: true,
        data: data,
        callback: (data) => {
            callback(new ResolvedLocation(data));
        },
        faultCallback: faultCallback
    });
}

/*export function Resolve_Geo(location: Model$.Geocoder.Geolocation, callback: Action<Model$.IAddress>, faultCallback) {
    return Post$("/master/location/Resolve_Geo", {
        authorize: true,
        data: {
            Location: location
        },
        callback: callback,
        faultCallback: faultCallback
    });
}*/