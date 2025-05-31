export interface Constants {
  __OB_KEY_EXPR__?: number;
  __OB_PARTS__?: RegExpMatchArray;
  __FETCH_EXPR__?: string;
  __T_PARAM_EXPR__?: string;
  __H_PARAM_EXPR__?: string;
  __SITE_ID_EXPR__?: string;
  __SUBSCRIBER_EXPR__?: string;
  __LAST_UPDATE_EXPR__?: string;
}

export async function loadConstants(): Promise<Constants> {
  const c: { constants: Constants } = await import("./scripts/constants").catch(
    () => {
      console.warn("scripts/constants not found, using default constants");
      return {
        constants: {},
      };
    }
  );
  return c.constants;
}
