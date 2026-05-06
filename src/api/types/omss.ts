export type OmssStreamType = 'hls' | 'dash' | 'http' | 'mp4' | 'mkv' | 'webm';

export type OmssSubtitleFormat = 'vtt' | 'srt' | 'ass' | 'ssa';

export type OmssDiagnosticSeverity = 'info' | 'warning' | 'error';

export type OmssDiagnosticCode =
  | 'QUALITY_INFERRED'
  | 'LANGUAGE_INFERRED'
  | 'TYPE_INFERRED'
  | 'SUBTITLE_LABEL_INFERRED'
  | 'PROVIDER_ERROR'
  | 'PARTIAL_SCRAPE';

export type OmssErrorCode =
  | 'INVALID_TMDB_ID'
  | 'INVALID_PARAMETER'
  | 'MISSING_PARAMETER'
  | 'INVALID_SEASON'
  | 'INVALID_EPISODE'
  | 'INVALID_RESPONSE_ID'
  | 'RESPONSE_ID_NOT_FOUND'
  | 'NO_SOURCES_AVAILABLE'
  | 'ENDPOINT_NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR'
  | 'UNSUPPORTED_MEDIA_TYPE';

export type OmssAudioTrack = {
  language: string;
  label: string;
};

export type OmssProvider = {
  id: string;
  name: string;
};

export type OmssSource = {
  id?: string;
  url: string;
  type: OmssStreamType;
  quality: string;
  audioTracks: OmssAudioTrack[];
  provider: OmssProvider;
};

export type OmssSubtitle = {
  url: string;
  label: string;
  format: OmssSubtitleFormat;
};

export type OmssDiagnostic = {
  code: OmssDiagnosticCode;
  message: string;
  field?: string;
  severity: OmssDiagnosticSeverity;
};

export type OmssSourceResponse = {
  responseId: string;
  expiresAt: string;
  sources: OmssSource[];
  subtitles: OmssSubtitle[];
  diagnostics: OmssDiagnostic[];
};

export type OmssErrorBody = {
  error: {
    code: OmssErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  traceId: string;
};

export type OmssHealthResponse = {
  name: string;
  version: string;
  status: 'operational' | 'degraded' | 'maintenance' | 'offline';
  spec: 'omss';
  endpoints?: {
    movie?: string;
    tv?: string;
    proxy?: string;
  };
  note?: string;
};

export type OmssRefreshResponse = {
  status: 'OK';
};

export class OmssHttpError extends Error {
  readonly status: number;
  readonly body?: OmssErrorBody;

  constructor(message: string, status: number, body?: OmssErrorBody) {
    super(message);
    this.name = 'OmssHttpError';
    this.status = status;
    this.body = body;
  }
}
