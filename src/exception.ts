import { Action, String } from './system'
import { Exception as ExceptionResource } from './resource'

export class CustomError implements Error {
    ErrorMessageType: ErrorMessageType;
    EventLogId;
    constructor(public name: string, public message: string) {
    }
}

export enum ErrorMessageType {
    Operation_Invalid = 11,
    Operation_InvalidInput = 12,
    Operation_InvalidInteraction = 13,
    Operation_UnexpectedState = 14,
    Operation_NotSupported = 15,
    Operation_InternalError = 16,
    Data_RecordNotFound = 21,
    Data_DuplicateRecord = 22,
    Data_ReferentialIntegrity = 23,
    Data_StaleRecord = 24,
    Session_Unavailable = 31,
    Session_NotAuthenticated = 32,
    Session_Unauthorized = 33,
    Session_QuotaExceeded = 34,
    Argument_Invalid = 41,
    Argument_ValueRequired = 42,
    Argument_ValueExists = 43,
    Unknown = 0
}

export enum ArgumentExceptionType {
    Invalid = 1,
    ValueRequired = 2,
    ValueExists = 3
}

export class ArgumentException extends CustomError {
    Type: ArgumentExceptionType;
    ParamName: string;
    ParamValue;

    constructor(exceptionType: ArgumentExceptionType, paramName: string) {
        var message, errorMessageType;
        if (paramName) {
            switch (exceptionType) {
                case ArgumentExceptionType.Invalid:
                    errorMessageType = ErrorMessageType.Argument_Invalid;
                    message = String.format(ExceptionResource.Argument_Invalid, paramName);
                    break;
                case ArgumentExceptionType.ValueRequired:
                    errorMessageType = ErrorMessageType.Argument_ValueRequired;
                    message = String.format(ExceptionResource.Argument_ValueRequired, paramName);
                    break;
                case ArgumentExceptionType.ValueExists:
                    errorMessageType = ErrorMessageType.Argument_ValueExists;
                    message = String.format(ExceptionResource.Argument_ValueExists, paramName);
                    break;
                default:
                    errorMessageType = ErrorMessageType.Unknown;
                    message = ExceptionResource.Unknown;
            }
        }
        else {
            errorMessageType = ErrorMessageType.Unknown;
            message = ExceptionResource.Unknown;
        }

        super('ArgumentException', message);
        if (paramName)
            this.ParamName = paramName;
        this.ErrorMessageType = errorMessageType;
        this.Type = exceptionType;
    }
}

export enum DataExceptionType {
    RecordNotFound = 1,
    DuplicateRecord = 2,
    ReferentialIntegrity = 3,
    StaleRecord = 4
}

export class DataException extends CustomError {
    Type: DataExceptionType;
    KeyName: string;
    KeyValue;

    constructor(exceptionType: DataExceptionType) {
        var message, errorMessageType;
        switch (exceptionType) {
            case DataExceptionType.RecordNotFound:
                errorMessageType = ErrorMessageType.Data_RecordNotFound;
                message = ExceptionResource.Data_RecordNotFound;
                break;
            case DataExceptionType.DuplicateRecord:
                errorMessageType = ErrorMessageType.Data_DuplicateRecord;
                message = ExceptionResource.Data_DuplicateRecord;
                break;
            case DataExceptionType.ReferentialIntegrity:
                errorMessageType = ErrorMessageType.Data_ReferentialIntegrity;
                message = ExceptionResource.Data_ReferentialIntegrity;
                break;
            case DataExceptionType.StaleRecord:
                errorMessageType = ErrorMessageType.Data_StaleRecord;
                message = ExceptionResource.Data_StaleRecord;
                break;
            default:
                errorMessageType = ErrorMessageType.Unknown;
                message = ExceptionResource.Unknown;
        }

        super('DataException', message);
        this.ErrorMessageType = errorMessageType;
        this.Type = exceptionType;
    }
}

export enum OperationExceptionType {
    Invalid = 1,
    InvalidInput = 2,
    InvalidInteraction = 3,
    UnexpectedState = 4,
    NotSupported = 5,
    InternalError = 6
}

export class OperationException extends CustomError {
    Type: OperationExceptionType;
    OperationName: string;

    constructor(exceptionType: OperationExceptionType) {
        var message, errorMessageType;
        switch (exceptionType) {
            case OperationExceptionType.Invalid:
                errorMessageType = ErrorMessageType.Operation_Invalid;
                message = ExceptionResource.Operation_Invalid;
                break;
            case OperationExceptionType.InvalidInput:
                errorMessageType = ErrorMessageType.Operation_InvalidInput;
                message = ExceptionResource.Operation_InvalidInput;
                break;
            case OperationExceptionType.InvalidInteraction:
                errorMessageType = ErrorMessageType.Operation_InvalidInteraction;
                message = ExceptionResource.Operation_InvalidInteraction;
                break;
            case OperationExceptionType.UnexpectedState:
                errorMessageType = ErrorMessageType.Operation_UnexpectedState;
                message = ExceptionResource.Operation_UnexpectedState;
                break;
            case OperationExceptionType.NotSupported:
                errorMessageType = ErrorMessageType.Operation_NotSupported;
                message = ExceptionResource.Operation_NotSupported;
                break;
            case OperationExceptionType.InternalError:
                errorMessageType = ErrorMessageType.Operation_InternalError;
                message = ExceptionResource.Operation_InternalError;
                break;
            default:
                errorMessageType = ErrorMessageType.Unknown;
                message = ExceptionResource.Unknown;
        }

        super('OperationException', message);
        this.ErrorMessageType = errorMessageType;
        this.Type = exceptionType;
    }
}

export enum SessionExceptionType
{
    Unavailable = 1,
    NotAuthenticated = 2,
    Unauthorized = 3,
    QuotaExceeded = 4
}

export class SessionException extends CustomError {
    Type: SessionExceptionType;
    Quota: number;
    QuotaType;

    constructor(exceptionType: SessionExceptionType, d?: Action<SessionException>) {
        var message, errorMessageType;
        switch (exceptionType) {
            case SessionExceptionType.Unavailable:
                errorMessageType = ErrorMessageType.Session_Unavailable;
                message = ExceptionResource.Session_Unavailable;
                break;
            case SessionExceptionType.NotAuthenticated:
                errorMessageType = ErrorMessageType.Session_NotAuthenticated;
                message = ExceptionResource.Session_NotAuthenticated;
                break;
            case SessionExceptionType.Unauthorized:
                errorMessageType = ErrorMessageType.Session_Unauthorized;
                message = ExceptionResource.Session_Unauthorized;
                break;
            case SessionExceptionType.QuotaExceeded:
                errorMessageType = ErrorMessageType.Session_QuotaExceeded;
                message = ExceptionResource.Session_QuotaExceeded;
                break;
            default:
                errorMessageType = ErrorMessageType.Unknown;
                message = ExceptionResource.Unknown;
        }
        super('SessionException', message);
        this.ErrorMessageType = errorMessageType;
        this.Type = exceptionType;
        if (d)
            d(this);
    }
}

export class UnknownException extends CustomError {
    Type;
    constructor(exceptionType, message?: string) {
        super('UnknownException', message || ExceptionResource.Unknown);
        this.Type = exceptionType;
        this.ErrorMessageType = ErrorMessageType.Unknown;
    }
}
