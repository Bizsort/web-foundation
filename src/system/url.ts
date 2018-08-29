//http://aknosis.com/2011/07/17/using-jquery-to-rewrite-relative-urls-to-absolute-urls-revisited
//http://stackoverflow.com/questions/7544550/javascript-regex-to-change-all-relative-urls-to-absolute
export function toAbsolute(url, baseUrl) {
    if (url && baseUrl) {
        if (/^(https?|file|ftps?|mailto|javascript|data:image\/[^;]{2,9};):/i.test(url))
            return url;
        else if (url.substr(0, 2) === '//') {
            return 'http:' + url;
        }
        else if (url.substr(0, 1) !== '/') {
            url = (baseUrl.pathname || '') + url;
        }
        return (baseUrl.origin || '') + url;
    }
    return url;
}

export function windowLocation() {
    //http://bl.ocks.org/abernier/3070589
    var l = {
        origin: (window.location.protocol + '//' + window.location.hostname).toLowerCase(), //window.location.origin
        hostname: window.location.hostname.toLowerCase(),
        pathname: window.location.pathname.toLowerCase().substr(0, window.location.pathname.lastIndexOf('/') + 1)
    };
    return l;
};

export function getBaseUrl(url) {
    var index = url && url.indexOf("://");
    if (index > 0) {
        index = url.indexOf('/', index + 3);
        if (index > 0)
            return url.substring(0, index);
    }
    return url
}

export function getDomainName(url: string) {
    var index1 = url && url.indexOf("://");
    if (index1 > 0) {
        index1 += 3;
        /*if (url.indexOf('www.', index1) >= 7)
            index1 += 4;*/
        var index2 = url.indexOf('/', index1);
        return index2 > 0 ? url.substring(index1, index2) : url.substring(index1);
    }
    return url
}