import { AppError } from '../errors/app-error';
import { CHAT_LIMITS, ChatMessage, Conversation, SystemMessageData } from './chat.models';

export type Translate = (key: string, params?: Record<string, unknown>) => string;
/** A member's name by user id; undefined when not known (e.g. the member list is not loaded). */
export type NameOf = (userId: number) => string | undefined;

export function conversationTitle(conversation: Conversation, lang: string): string {
  if (conversation.kind === 'direct') {
    return conversation.other_user?.name || conversation.title;
  }
  return (lang === 'ar' && conversation.name_ar) || conversation.name_en || conversation.title;
}

/** Company and team chats show an icon instead of an avatar. */
export function conversationIcon(conversation: Conversation): string | null {
  return conversation.kind === 'company' ? 'pi-building' : conversation.kind === 'team' ? 'pi-users' : null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export type BodySegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; userId: number; name: string | null }
  | { kind: 'all' };

/** `@[45]` mentions user 45; `@all` only as a word of its own (not in `a@all.com`, `@all-hands`). */
const MENTION = /@\[(\d+)\]|(?<![\w@.])@all(?![\w-])/g;

export function bodySegments(body: string, nameOf: NameOf): BodySegment[] {
  const segments: BodySegment[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ kind: 'text', text: body.slice(last, index) });
    }
    if (match[1]) {
      const userId = Number(match[1]);
      segments.push({ kind: 'mention', userId, name: nameOf(userId) ?? null });
    } else {
      segments.push({ kind: 'all' });
    }
    last = index + match[0].length;
  }
  if (last < body.length) {
    segments.push({ kind: 'text', text: body.slice(last) });
  }
  return segments;
}

/** The body as plain text, mentions as `@Name` (`@<fallback>` when unknown). */
export function plainBody(body: string, nameOf: NameOf, fallback: string): string {
  return bodySegments(body, nameOf)
    .map((s) => (s.kind === 'text' ? s.text : s.kind === 'all' ? '@all' : `@${s.name ?? fallback}`))
    .join('');
}

export function systemText(data: SystemMessageData, nameOf: NameOf, t: Translate): string {
  if (data.event === 'role_changed') {
    return t('chat.system.roleChanged', { name: nameOf(data.user_id) ?? t('chat.someone'), role: t(`chat.roles.${data.role}`) });
  }
  return t(data.posting_policy === 'admins_only' ? 'chat.system.adminsOnly' : 'chat.system.everyone');
}

/** One line for the conversation list. */
export function messagePreview(message: ChatMessage, myId: number, nameOf: NameOf, t: Translate): string {
  if (message.is_deleted) {
    return t('chat.deletedPreview');
  }
  if (!message.sender) {
    return systemText(message.data as SystemMessageData, nameOf, t);
  }
  const text = message.body.trim() ? plainBody(message.body, nameOf, t('chat.someone')).replace(/\s+/g, ' ').trim() : t('chat.attachment');
  return message.sender.id === myId ? t('chat.you', { text }) : text;
}

function locale(lang: string): string {
  return lang === 'ar' ? 'ar-EG' : 'en-GB';
}

/** `HH:mm` today, otherwise a short date. */
export function chatTime(iso: string, lang: string, now = new Date()): string {
  const date = new Date(iso);
  if (dayKey(iso) === dayKey(now.toISOString())) {
    return new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(date);
}

/** Local calendar day, `yyyy-mm-dd`. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayLabel(iso: string, lang: string, t: Translate, now = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now.toISOString())) {
    return t('chat.today');
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === dayKey(yesterday.toISOString())) {
    return t('chat.yesterday');
  }
  return new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function isImageFile(name: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension(name));
}

export interface RejectedFile {
  name: string;
  reason: 'type' | 'size' | 'count';
}

/** The backend's file rules, checked before upload so the user hears why at once. */
export function checkFiles(current: File[], added: File[]): { accepted: File[]; rejected: RejectedFile[] } {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of added) {
    if (!(CHAT_LIMITS.extensions as readonly string[]).includes(extension(file.name))) {
      rejected.push({ name: file.name, reason: 'type' });
    } else if (file.size > CHAT_LIMITS.maxFileSize) {
      rejected.push({ name: file.name, reason: 'size' });
    } else if (current.length + accepted.length >= CHAT_LIMITS.maxFiles) {
      rejected.push({ name: file.name, reason: 'count' });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

/** The sentence to show for a failed chat request: the first field error, else the message (which can be an array). */
export function errorText(error: AppError): string {
  const field = Object.values(error.errors ?? {}).flat()[0];
  if (field) {
    return field;
  }
  const message = error.message as unknown;
  return Array.isArray(message) ? message.join(' ') : String(message ?? '');
}
