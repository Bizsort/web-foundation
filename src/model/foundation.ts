export interface Autocomplete extends IdNameNodeType {
    HasChildren?: boolean;
    Path: string;
}

export interface EntityId {
    Id: number;
}

export interface IdName extends EntityId {
    Name: string;
}

export interface ILocation extends LocationRef {
    Type: LocationType;
    Parent: ILocation;
}

export enum ImageType {
    Jpeg = 1,
    Png = 2,
    Gif = 3
}

export interface INodeType {
    NodeType: NodeType;
    Locked?: boolean;
}

export namespace Geocoder {
    export class Address {
        Country: string;
        State: string;
        County: string;
        City: string;
        Area: string;
        StreetNumber: string;
        StreetName: string;
        PostalCode: string;
        Address1: string;

        constructor(object?: Address) {
            if (object)
                Object.deserialize(this, object);
        }

        EqualsTo(address: Address): boolean {
            if (!address ||
                this.Country != address.Country ||
                //Geocoder does not seem to populate State for UK address
                (this.State != address.State && this.State && !this.County) ||
                this.County != address.County ||
                this.City != address.City ||
                this.StreetName != address.StreetName)
                return false;
            else
                return true;
        }
    }

    export interface Geolocation {
        Lat: number;
        Lng: number;
    }

    export class Location {
        constructor(data?) {
            if (data) {
                this.Id = data.Id;
                this.Address = new Address(data.Address);
                if (data.Text)
                    this.Text = data.Text;
                if (data.Geolocation)
                    this.Geolocation = data.Geolocation;
            }
            else
                this.Address = new Address();

        }
        Id: number;
        Address: Address;
        Text: string;
        Geolocation: Geolocation;
    }
}

export namespace List {
    export namespace Filter {
        export class QueryInput implements List.QueryInput {
            SearchQuery: string;
            StartIndex: number;
            Length: number;
            InclFacets: Semantic.FacetFilter;
            ExclFacets: Semantic.FacetFilter;

            constructor(facets: Semantic.Facet[]) {
                if (facets && facets.length > 0) {
                    facets = facets.slice(); //make a copy
                    var sorted = facets.sort((f1, f2) => {
                        return f1.Name - f2.Name;
                    });

                    this.InclFacets = this.facetFilter(sorted, false);
                    this.ExclFacets = this.facetFilter(sorted, true);
                }
                else {
                    this.InclFacets = this.facetFilter();
                    this.ExclFacets = this.facetFilter();
                }
            }

            facetFilter(facets?: Semantic.Facet[], excluded?): Semantic.FacetFilter {
                if (facets && facets.length > 0) {
                    var fiters = facets.filter(f => (f.Exclude || false) == excluded);

                    if (fiters.length > 0) {
                        return {
                            NoFilters: fiters.length,
                            FilterNames: fiters.map(f => f.Name),
                            FilterValues: fiters.map(f => f.Value)
                        };
                    }
                }
                return {
                    NoFilters: 0
                }
            }
        }

        export interface QueryOutput extends List.QueryOutput {
            Facets: Semantic.FacetName[];
        }
    }

    export interface QueryInput {
        SearchQuery?: string;
        StartIndex: number;
        Length: number;
    }

    export interface QueryOutput {
        StartIndex: number;
        Series: EntityId[];
        TotalCount?: number;
    }

    export interface SearchInput extends QueryInput {
        Category: number;
        Location: number;
        SearchNear: Geocoder.Geolocation;
    }

    export interface SearchOutput extends QueryOutput {
        Distances: number[];
    }

    export interface LocationQueryInput extends QueryInput {
        Location: number;
    }

    export interface SliceInput {
        Index: number;
        Length: number;
    }

    export interface DirectorySliceInput extends SliceInput {
        Category: number;
        Location: number;
        Skip: number[];
    }

    export interface SliceOutput {
        Series: number[];
        Index: number;
    }
}

export interface LocationRef extends IdName {
    Type: LocationType;
}

export enum LocationType {
    Unknown = 0,
    Country = 1,
    State = 2,
    County = 4,
    City = 8,
    Street = 16,
    Area = 32
}

export interface IdNameNodeType extends IdName {
    NodeType: NodeType;
}

export interface Node extends IdNameNodeType {
    Parent?: Node;
    HasChildren?: boolean;
    Children?: Node[];
    NavToken?: any;
    Locked?: boolean;
}

export namespace Node {
    export interface DeserializeOptions {
        populate?: (NodeRef) => void;
        navToken?: any;
    }

    export function Deserialize(node: Node, dic: Object, options: DeserializeOptions = {}) {
        var parent = node.Parent;
        if (parent && parent['$ref'])
            node.Parent = dic[parent['$ref']];
        if (node.Children) {
            dic[node['$id']] = node;
            for (var i = 0, l = node.Children.length; i < l; i++) {
                Deserialize(node.Children[i], dic, options);
            }
        }
        if (options.populate)
            options.populate(node)
        else
            ReflectLocked(node);
        if (options.navToken)
            node.NavToken = options.navToken(node);
    }

    export function DeserializeChildren(nodes: NodeRef[], parent: NodeRef, options: DeserializeOptions = {}) {
        for (var i = 0, l = nodes.length; i < l; i++) {
            if (parent)
                setParent(nodes[i], parent.Id, parent);
            if (nodes[i].HasChildren) {
                if (nodes[i].Children) {
                    DeserializeChildren(nodes[i].Children, nodes[i], options);
                }
                else
                    nodes[i].Children = [{ Id: 0, Name: "...", HasChildren: false }];
            }
            if (options.populate)
                options.populate(nodes[i]);
            else
                ReflectLocked(<any>nodes[i]);
            if (options.navToken)
                nodes[i].NavToken = options.navToken(nodes[i]);
        }
    }

    export function SetParent(nodes: NodeRef[], parent) {
        var parentId = parent ? parent.Id : 0;
        for (var i = 0, l = nodes.length; i < l; i++) {
            setParent(nodes[i], parentId, parent);
        }
    }

    function setParent(node: NodeRef, parentId: number, parent: NodeRef) {
        if (!node.ParentId)
            node.ParentId = parentId;
        else if (node.ParentId != parentId)
            throw 'Parent folder mismatch: ' + node.ParentId + '!=' + parentId;
        if (parentId && parent && !node.Parent) //It's important to keep .ContainerX props
            node.Parent = parent;
    }

    export function IsRootFolder(node: NodeRef) {
        return node && node.Id == 0 ? true : false;
    }
}

export interface NodeRef extends IdName {
    ParentId?: number;
    Parent?: NodeRef;
    HasChildren?: boolean;
    Children?: NodeRef[];
    NavToken?: any;
    Locked?: boolean;
}

export enum NodeType {
    Super = 1,
    Class = 2
}

export function ReflectLocked(group: INodeType) {
    if ((group.NodeType & NodeType.Class) == 0)
        group.Locked = true;
}

export class ResolvedLocation implements ILocation {
    Id: number;
    Name: string;
    Type: LocationType;
    Parent: ILocation;
    Partial: boolean;

    constructor(data?) {
        if (data) {
            this.Id = data.Id;
            this.Name = data.Name;
            this.Type = data.Type;
            if (data.Parent)
                this.Parent = data.Parent;
            if (data.Partial)
                this.Partial = data.Partial;
        }
    }

    get County(): LocationRef {
        return this.get(LocationType.Country);
    }

    get City(): LocationRef {
        return this.get(LocationType.City);
    }

    get(locationType) {
        var location: ILocation = this;
        while (location) {
            if (location.Type === locationType)
                break;
            else if (location.Type > locationType)
                location = location.Parent;
            else
                location = null;
        }
        return location;
    }
}

export namespace Semantic {
    export namespace Facet {
        export function Deserialize(facets) {
            if (facets && facets.length > 0)
                for (var i = 0, l = facets.length; i < l; i++) {
                    _deserialize(facets[i]);
                }
        }

        function _deserialize(facet) {
            if (facet.Values && facet.Values.length > 0)
                for (var i = 0; i < facet.Values.length; i++) {
                    facet.Values[i].Name = facet;
                }
        }
    }

    export interface Facet {
        Name: number;
        NameText: string;
        Value: number;
        ValueText: string;
        Exclude?: boolean;
    }

    export interface FacetFilter {
        NoFilters: number;
        FilterNames?: number[];
        FilterValues?: number[];
    }

    export interface FacetName {
        Key: number;
        Text: string;
        Values: FacetValue[];
    }

    export interface FacetValue {
        Name: FacetName;
        Key: number;
        Text: string;
        Count: number;
    }
}

export enum ServiceProvider {
    BizSrt = 1,
    Google = 2,
    Facebook = 3
}

export enum SubType {
    None = 0,
    Siblings = 1,
    Children = 2,
    GrandChildren = 4
}