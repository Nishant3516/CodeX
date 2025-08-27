
export const FS_FILE_CONTENT_UPDATE = "fs_file_content_update";
export const FS_LOAD_DIR = "fs_load_dir";
export const FS_FETCH_FILE_CONTENT = "fs_fetch_file_content";
export const FS_NEW_FILE = "fs_new_file";
export const FS_DELETE_FILE = "fs_delete_file";
export const FS_EDIT_FILE_META = "fs_edit_file_meta";
export const FS_FETCH_QUEST_META = "fs_fetch_quest_meta";
export const FS_INITIALIZE_CLIENT = "fs_initialize_client";

export type ProjectParams = {
    labId:string;
    language:string
}

export type FSMessageType =
    | typeof FS_FILE_CONTENT_UPDATE
    | typeof FS_LOAD_DIR
    | typeof FS_FETCH_FILE_CONTENT
    | typeof FS_NEW_FILE
    | typeof FS_DELETE_FILE
    | typeof FS_EDIT_FILE_META
    | typeof FS_FETCH_QUEST_META;

export interface EventMessage {
    type: FSMessageType | string;
    payload: any;
}

/* Payload shapes for file system events */
export interface FileContentUpdatePayload {
    path: string;
    content: string;
}

export interface LoadDirPayload {
    path: string;
}

export interface FetchFileContentPayload {
    path: string;
}

export interface NewFilePayload {
    path: string;
    isDir: boolean;
    content?: string;
}

export interface DeleteFilePayload {
    path: string;
}

export interface EditFileMetaPayload {
    oldPath: string;
    newPath: string;
}

export interface FetchQuestMetaPayload {
    path: string;
}



/* Response structures */
export interface FileInfo {
    name: string;
    path: string;
    isDir: boolean;
    size: number;
    modTime: string;
}

export interface DirContentResponse {
    path: string;
    files: FileInfo[];
}

export interface FileContentResponse {
    path: string;
    content: string;
}

export interface QuestMetaResponse {
    path: string;
    files: FileInfo[];
}

/* Standardized WebSocket response */
export type WSStatus = "success" | "error" | "info";

export interface WSResponse<T = unknown> {
    type: string;
    status: WSStatus;
    data?: T;
    message?: string;
    timestamp: string;
    request_id?: string;
}

/* Status constants */
export const STATUS_SUCCESS = "success";
export const STATUS_ERROR = "error";
export const STATUS_INFO = "info";

/* Standard response type constants */
export const RESPONSE_DIR_CONTENT = "dir_content";
export const RESPONSE_FILE_CONTENT = "file_content";
export const RESPONSE_FILE_UPDATED = "file_updated";
export const RESPONSE_FILE_CREATED = "file_created";
export const RESPONSE_FILE_DELETED = "file_deleted";
export const RESPONSE_FILE_RENAMED = "file_renamed";
export const RESPONSE_QUEST_META = "quest_meta";
export const RESPONSE_ERROR = "error";
export const RESPONSE_CONNECTION = "connection";
export const RESPONSE_HEARTBEAT = "heartbeat";
export const RESPONSE_INFO = "info";

export type WSResponseType =
    | typeof RESPONSE_DIR_CONTENT
    | typeof RESPONSE_FILE_CONTENT
    | typeof RESPONSE_FILE_UPDATED
    | typeof RESPONSE_FILE_CREATED
    | typeof RESPONSE_FILE_DELETED
    | typeof RESPONSE_FILE_RENAMED
    | typeof RESPONSE_QUEST_META
    | typeof RESPONSE_ERROR
    | typeof RESPONSE_CONNECTION
    | typeof RESPONSE_HEARTBEAT
    | typeof RESPONSE_INFO;