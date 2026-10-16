import { NameOf } from '../../core/chat/chat-format';

/** A mention the user picked: the box shows `display` (`@Sara Ali`), the body gets `@[id]`. */
export interface MentionToken {
  id: number;
  display: string;
}

/** Longest names first, so `@Sara Ali` is not read as `@Sara` + ` Ali`. */
export function encodeMentions(text: string, tokens: MentionToken[]): string {
  let out = text;
  for (const token of [...tokens].sort((a, b) => b.display.length - a.display.length)) {
    out = out.split(token.display).join(`@[${token.id}]`);
  }
  return out;
}

/** A stored body back into editable text; unknown ids stay as `@[id]` so they survive the edit. */
export function decodeMentions(body: string, nameOf: NameOf): { text: string; tokens: MentionToken[] } {
  const tokens: MentionToken[] = [];
  const text = body.replace(/@\[(\d+)\]/g, (raw, id: string) => {
    const name = nameOf(Number(id));
    if (!name) {
      return raw;
    }
    const display = `@${name}`;
    if (!tokens.some((t) => t.id === Number(id))) {
      tokens.push({ id: Number(id), display });
    }
    return display;
  });
  return { text, tokens };
}

/** The `@query` right before the caret (start of text or after a space), or null. */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
  return match ? { start: caret - match[2].length - 1, query: match[2] } : null;
}
