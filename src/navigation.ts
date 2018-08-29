/*stub*/
export enum Action {
    None = 0,
    Default = 1
}

export namespace Shell {
    export function Error(error) {
    }

    export function Go(token) {
    }

    export function Home() {
    }

    export function Href(token) {
        return '';
    }

    export function ParseToken(): any {
        return null;
    }
    
    export function Reflect(token) {
    }

    export function Refresh(token) {
    }

    export function TryForward(token) {
        return false;
    }
}

export class Token {
    constructor(public Action: Action) {
    }

    Authenticate;
    get Clone() {
        return this;
    }
    CategoryId: number;
    LocationId: number;
    NavigationFlags: number;
    Page: number;
    ReflectUser;
    SearchQuery;
    SearchNear;
};