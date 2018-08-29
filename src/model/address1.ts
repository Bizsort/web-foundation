var anchors = ["Unit", "Suite", "PO Box", "P.O. Box", "Ste", "RR", '#'];
var anchorOuter = " ,";
var anchorInner = " #:.";
var valueChars = "0123456789-abcdefghijklmnopqrstuwxyz";
var numbers = "0123456789";
var replaceValue = {
    '-': ''
};
var replaceName = {
    'Ste': 'Suite',
    'PO Box': 'P.O. Box',
    '#': 'Unit'
};

export interface IAddress {
    value: string
}

export function Parse(address: IAddress) {
    var addr = address && typeof address.value == 'string' && address.value.toLowerCase() || '';
    var _anchorIdx = -1, address1;

    var startEndIdx: IStartEndIdx =
    {
        startIdx: -1,
        endIdx: -1
    }
    //var _anchorIdx = address && anchors.findIndex(function (anchor) {
    for (var anchorIdx = 0, l = anchors.length; anchorIdx < l; anchorIdx++) {
        address1 = address1Value(addr, anchorIdx, startEndIdx);
        if (address1) {
            _anchorIdx = anchorIdx;
            break;
        }
    };

    if (_anchorIdx >= 0 && address1) {
        var anchor = anchors[_anchorIdx];
        if (anchor in replaceName)
            anchor = replaceName[anchor];
        //startIdx will point to the first charachter of the anchor
        while (startEndIdx.startIdx > 0 && (addr[startEndIdx.startIdx - 1] === ' ' || addr[startEndIdx.startIdx - 1] === ','))
            startEndIdx.startIdx--;
        //endIdx will point to the charachter after the value
        while (startEndIdx.endIdx + 1 < addr.length && (addr[startEndIdx.endIdx] === ' ' || addr[startEndIdx.endIdx] === ','))
            startEndIdx.endIdx++;
        address.value = address.value.substr(0, startEndIdx.startIdx) + (startEndIdx.endIdx + 1 < addr.length ? ', ' + address.value.substr(startEndIdx.endIdx) : '');
        return anchor + ' ' + address1;
    }
}

export interface IStartEndIdx {
    startIdx: number;
    endIdx: number;
}

function address1Value(address, anchorIdx, startEndIdx: IStartEndIdx) {
    var charIdx = 0, anchor = anchors[anchorIdx], step, value, hasNum;
    while (charIdx >= 0) {
        charIdx = startEndIdx.startIdx = address.indexOf(anchor.toLowerCase(), charIdx + 1);
        if ((charIdx > 0 && charIdx < (address.length - 1) && anchorOuter.indexOf(address[charIdx - 1]) >= 0 &&
            (anchorInner.indexOf(address[charIdx + anchor.length]) >= 0 || (anchor === '#' && valueChars.indexOf(address[charIdx + anchor.length]) >= 0)))
            || (charIdx === 0 && anchor[0] == 'P')) {
            charIdx += anchor.length;
            step = 0;
            value = '';
            hasNum = false;
            while ((step == 0 || step == 1) && charIdx < address.length) {
                switch (step) {
                    case 0:
                        if (valueChars.indexOf(address[charIdx]) >= 0)
                            step = 1;
                        else if (anchorInner.indexOf(address[charIdx]) === -1)
                            step = -1;
                        break;
                    case 1:
                        if (valueChars.indexOf(address[charIdx]) === -1) {
                            if (anchorOuter.indexOf(address[charIdx]) >= 0)
                                step = 3;
                            else
                                step = -1;
                        }
                        break;
                }
                if (step === 1) {
                    if (!(address[charIdx] in replaceValue))
                        value += address[charIdx].toUpperCase();
                    else
                        value += replaceValue[address[charIdx]];
                    if (!hasNum && numbers.indexOf(address[charIdx]) >= 0)
                        hasNum = true;
                }
                charIdx++;
            }
            if (step === 3 && hasNum) {
                startEndIdx.endIdx = charIdx - 1;
                return value;
            }
        }
    }
    startEndIdx.startIdx = -1;
    startEndIdx.endIdx = -1;
}