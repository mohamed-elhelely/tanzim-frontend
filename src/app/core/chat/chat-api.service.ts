import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../api/base-api.service';
import { ApiResponse } from '../models/api-response.model';
import { ChatMember, ChatMessage, Conversation, MessageDraft, UnreadSummary } from './chat.models';

const BASE = 'chat/v1/';

function data<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

/** `/api/chat/v1/` (docs/API_REFERENCE_CHAT.md). Errors arrive as AppError. */
@Injectable({ providedIn: 'root' })
export class ChatApiService extends BaseApiService {
  conversations(): Observable<Conversation[]> {
    return this.get<Conversation[]>(`${BASE}conversations/`).pipe(data<Conversation[]>());
  }

  conversation(id: number): Observable<Conversation> {
    return this.get<Conversation>(`${BASE}conversations/${id}/`).pipe(data<Conversation>());
  }

  /** The existing direct chat with that person (200) or a new one (201). */
  direct(userId: number): Observable<Conversation> {
    return this.post<Conversation>(`${BASE}conversations/direct/`, { user_id: userId }).pipe(data<Conversation>());
  }

  members(id: number): Observable<ChatMember[]> {
    return this.get<ChatMember[]>(`${BASE}conversations/${id}/members/`).pipe(data<ChatMember[]>());
  }

  /** Newest first, deleted messages included. */
  messages(id: number, cursor: { before?: number; after?: number; limit?: number }): Observable<ChatMessage[]> {
    const params: Record<string, number> = {};
    for (const key of ['before', 'after', 'limit'] as const) {
      if (cursor[key] !== undefined) {
        params[key] = cursor[key]!;
      }
    }
    return this.get<ChatMessage[]>(`${BASE}conversations/${id}/messages/`, { params }).pipe(data<ChatMessage[]>());
  }

  /** JSON for text, multipart (repeated `files`) when files are attached. */
  send(id: number, draft: MessageDraft): Observable<ChatMessage> {
    const path = `${BASE}conversations/${id}/messages/`;
    if (!draft.files.length) {
      return this.post<ChatMessage>(path, { body: draft.body, reply_to: draft.replyTo, client_id: draft.clientId }).pipe(data<ChatMessage>());
    }
    const form = new FormData();
    form.append('body', draft.body);
    if (draft.replyTo !== null) {
      form.append('reply_to', String(draft.replyTo));
    }
    form.append('client_id', draft.clientId);
    for (const file of draft.files) {
      form.append('files', file, file.name);
    }
    return this.post<ChatMessage>(path, form).pipe(data<ChatMessage>());
  }

  edit(messageId: number, body: string): Observable<ChatMessage> {
    return this.patch<ChatMessage>(`${BASE}messages/${messageId}/`, { body }).pipe(data<ChatMessage>());
  }

  remove(messageId: number): Observable<void> {
    return this.delete<null>(`${BASE}messages/${messageId}/`).pipe(map(() => undefined));
  }

  /** Moves my read marker forward; answers the effective marker. */
  read(id: number, messageId: number): Observable<number> {
    return this.post<{ last_read_message_id: number }>(`${BASE}conversations/${id}/read/`, { message_id: messageId }).pipe(
      map((response) => response.data?.last_read_message_id ?? messageId),
    );
  }

  unread(): Observable<UnreadSummary> {
    return this.get<UnreadSummary>(`${BASE}unread/`).pipe(data<UnreadSummary>());
  }

  /** Needs the Authorization header, so it is fetched as a blob (an `<img src>` cannot send it). */
  attachment(url: string): Observable<Blob> {
    return this.getBlob(attachmentPath(url));
  }
}

/** `/api/chat/v1/…` (or an absolute URL) → the path under API_BASE_URL. */
export function attachmentPath(url: string): string {
  const index = url.indexOf('/api/');
  return index >= 0 ? url.slice(index + '/api/'.length) : url.replace(/^\/+/, '');
}
