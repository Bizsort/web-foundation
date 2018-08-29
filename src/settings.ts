/*stub*/
export const Image = (function () {
    return {
        Thumbnail: {
            Width: 130,
            Height: 0
        },
        Small: {
            Width: 240,
            Height: 0
        },
        Medium: {
            Width: 640,
            Height: 0
        },
        JpegQuality: 80,
        SizeThreshold: 85
    }
})();

export const Location = {
    Country: { Id: 0, Name: "" },
    Address1Threshold: 10
}

export const Session = {
    StorageItemName: "bizsrtSession",
    //Handling: 6, //CreateOnDemand, ReenterClosed
    HttpHeader: {
        Token: "X-AdScrl-Session",
        Key: "Authorize"
    },
    AutoSignin: {
        CookieName: "AdScrl.User.Token",
        ExpireAfter: 10
    }
};

export const Service = {
    Origin: "",
    HttpHeader: {
        Fault: "X-App-Fault"
    },
    Facebook: {
        AppId: ""
    },
    Google: {
        ClientId: "",
        ApiKey: ""
    }
};

export const WebSite = {
    Origin: {
        Host: "",
        ServerPath: "",
        AbsoluteUri: ""
    },
    HomePage: "/",
    NavToken: {
        Placement: 1,
        Qualifier: "t",
    },
    MobileUrl: ""
};