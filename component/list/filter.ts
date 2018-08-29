import { Semantic } from '../../src/model/foundation'
import { Action, ViewModel } from '../../src/viewmodel'

export class Available extends ViewModel {
    FilterSelected: Action<Semantic.Facet>;

    protected _facets: Semantic.FacetName[];
    get Facets(): Semantic.FacetName[] {
        return this._facets;
    }

    Populate(facets: Semantic.FacetName[]) {
        if (this._facets != facets) {
            this._facets = facets;
            this.notifyProperty("Facets", this._facets);
        }
    }

    FilterIn(facet: Semantic.FacetValue) {
        if (facet)
            this.onFilterSelected({
                Name: facet.Name.Key,
                NameText: facet.Name.Text,
                Value: facet.Key,
                ValueText: facet.Text,
                Exclude: false
            });
    }

    FilterOut(facet: Semantic.FacetValue) {
        if (facet)
            this.onFilterSelected({
                Name: facet.Name.Key,
                NameText: facet.Name.Text,
                Value: facet.Key,
                ValueText: facet.Text,
                Exclude: true
            });
    }

    onFilterSelected(facet: Semantic.Facet) {
        if (this.FilterSelected)
            this.FilterSelected(facet);
    }
}

export class Applied extends ViewModel {
    FilterSelected: Action<Semantic.Facet>;

    protected _facets: Semantic.Facet[] = [];
    get Facets(): Semantic.Facet[] {
        return this._facets;
    }

    Clear() {
        if (this._facets.length)
            this.arraySplice('Facets', 0, this._facets.length);
    }

    Add(facet: Semantic.Facet) {
        this.arrayPush('Facets', facet);
    }

    Remove(facet: Semantic.Facet, index?: number) {
        if (!index)
            index = facet ? this._facets.indexOf(facet) : -1;

        this.arraySplice('Facets', index, 1);
    }

    onFilterSelected(facet: Semantic.Facet) {
        if (this.FilterSelected)
            this.FilterSelected(facet);
    }
}