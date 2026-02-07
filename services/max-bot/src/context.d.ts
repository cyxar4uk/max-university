/**
 * Ambient declarations for @maxhub/max-bot-api when the package is installed from GitHub
 * (no dist/types shipped). Ensures our code compiles; runtime uses the actual package.
 */
declare module '@maxhub/max-bot-api' {
  export interface Context {
    chatId: string | number;
    user?: { user_id: string | number; first_name?: string; last_name?: string; username?: string };
    message?: { body?: { text?: string } };
    reply(text: string, options?: { attachments?: unknown[]; format?: string }): Promise<unknown>;
    answerOnCallback(options: {
      notification?: string;
      message?: { text: string; attachments?: unknown[] };
    }): Promise<unknown>;
    deleteMessage?(): Promise<{ success: boolean }>;
  }

  export interface BotApi {
    setMyCommands(commands: { name: string; description?: string }[]): Promise<unknown>;
  }

  export class Bot {
    constructor(token: string, options?: { contextType?: new () => Context });
    api: BotApi;
    command(name: string, handler: (ctx: Context) => void | Promise<unknown>): void;
    command(pattern: RegExp, handler: (ctx: Context & { match?: string[] }) => void | Promise<unknown>): void;
    action(
      payload: string | RegExp,
      handler: (ctx: Context & { match?: string[] }) => void | Promise<unknown>
    ): void;
    on(
      event: string,
      handler: (ctx: Context, next?: () => void) => void | Promise<unknown>
    ): void;
    start(): void;
  }

  export namespace Keyboard {
    function inlineKeyboard(rows: unknown[][]): unknown;
    namespace button {
      function callback(text: string, payload: string, opts?: { intent?: string }): unknown;
      function link(text: string, url: string): unknown;
    }
  }
}
