import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** unit / integration テスト共有の MSW サーバー。 */
export const server = setupServer(...handlers);
