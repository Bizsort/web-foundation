/*stub*/
import { Event } from '../system'
import { IdName, ServiceProvider } from '../model/foundation'
import { Location as LocationSettings } from '../settings'
import { GetName } from '../service/location'
export { ServiceProvider }

//https://github.com/google/closure-compiler/issues/1189
export abstract class Profile$ {
    Id: number;
    Name: string;
    constructor() {
        this.Id = 0;
    }

    Exit() {
        this.Id = 0;
        delete this.Name;

    }
}

export class Business extends Profile$ {
    StatusChanged: Event<any>;

    constructor() {
        super();
        this.StatusChanged = new Event<any>(this);
    }

    Enter(business, suppressEvent?: boolean) {
        this.Id = business.Id;
        this.Name = business.Name;

        if (!suppressEvent)
            this.StatusChanged.Invoke(this);
    }

    Exit() {
        super.Exit();

        this.StatusChanged.Invoke(this);
    }
}

export enum SigninFlags {
    ShowTerms = 1,
    AdminLogon = 2
}

export enum SigninStatus {
    Success = 1,
    AccountLocked = 2
}

export class User extends Profile$ {
    Business: Business;
    GotoSignin;
    AutoSignin: ServiceProvider;
    AutoSigninToken: string;

    SignedInChanged: Event<any>;

    constructor() {
        super();
        this.SignedInChanged = new Event<any>(this);
    }

    Enter(user: User, suppressEvent?: boolean) {

        if (user.Id) {
            //this.GuestId = 0;
            this.Id = user.Id;
            this.Name = user.Name;

            if (!suppressEvent)
                this.SignedInChanged.Invoke(this);
        }
    }

    //Used by Session.Handoff
    get Clone() {
        return {
            Id: this.Id,
            Name: this.Name,
            GotoSignin: this.GotoSignin,
            AutoSignin: this.AutoSignin,
            AutoSigninToken: this.AutoSigninToken
        };
    }

    Exit() {
        super.Exit();

        this.SignedInChanged.Invoke(this);
    }
}