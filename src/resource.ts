/*stub*/
export const Exception = {
    Operation_Invalid: "Operation is not allowed",
    Operation_InvalidInput: "Invalid or missing input parameter(s) for this operation",
    Operation_InvalidInteraction: "Actor or Addressee for this interaction is missing or invalid",
    Operation_UnexpectedState: "Operation is not valid for this state of object",
    Operation_NotSupported: "Operation is not supported",
    Operation_InternalError: "Internal server has error occured",
    Data_RecordNotFound: "Record could not be found",
    Data_DuplicateRecord: "Record already exists",
    Data_ReferentialIntegrity: "Record could not be deleted due to referential integrity constraints",
    Data_StaleRecord: "Your version of the record is not current, please refresh and try again",
    Session_Unavailable: "Server is unavailable",
    Session_NotAuthenticated: "This operation requires authentication, please sign-in",
    Session_Unauthorized: "You are not authorized to perform this operation",
    Session_QuotaExceeded: "Maximum allowed quota has been reached for you account",
    Argument_Invalid: "Invalid value for {0}",
    Argument_ValueRequired: "Value required for {0}",
    Argument_ValueExists: "Value exists for {0} already",
    Unknown: "An unknown error was encountered, please contact technical support for more information"
};

export const Global = {
    Editor_Error_Enter_X: "Please enter {0}",
    Editor_Error_Enter_X_Name: "Please enter {0} name",
    Folder_Error_Name_Exists: "{0} with this name exists already"
}