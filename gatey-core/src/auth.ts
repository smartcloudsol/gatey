import { Amplify, type ResourcesConfig } from "aws-amplify";
import {
  fetchAuthSession,
  fetchMFAPreference,
  fetchUserAttributes,
  getCurrentUser,
  signOut,
  updateMFAPreference,
  type AuthSession,
  type FetchAuthSessionOptions,
  type FetchMFAPreferenceOutput,
  type FetchUserAttributesOutput,
} from "aws-amplify/auth";

import { getGateyPlugin } from "./runtime";
import { getAccountFromStorage, type ApiConfiguration } from "./store";

export interface Account {
  username?: string;
  loaded?: boolean;
  userAttributes?: FetchUserAttributesOutput;
  mfaPreferences?: FetchMFAPreferenceOutput;
}

export const getAmplifyConfig = () => {
  return Amplify.getConfig();
};

export const configureAmplify = (
  resourcesConfig: ResourcesConfig,
  libraryOptions?: Record<string, unknown>
) => {
  Amplify.configure(resourcesConfig, libraryOptions);
};

export const loadAuthSession = (
  options?: FetchAuthSessionOptions
): Promise<AuthSession> => {
  return fetchAuthSession(options);
};

export const loadUserAttributes = (): Promise<FetchUserAttributesOutput> => {
  return fetchUserAttributes();
};

export const loadMFAPreferences = (): Promise<FetchMFAPreferenceOutput> => {
  return fetchMFAPreference();
};

export const loadUser = async (
  checkStorage: boolean = true
): Promise<Account> => {
  const account: Account = checkStorage ? await getAccountFromStorage() : {};
  if (account?.username) {
    return account;
  }
  try {
    const authSession = await fetchAuthSession();
    if (authSession.tokens) {
      const acc: Account = {
        username: (await getCurrentUser()).username,
        userAttributes: await loadUserAttributes(),
        mfaPreferences: await loadMFAPreferences(),
      };
      return acc;
    }
  } catch (err) {
    console.error(err);
    try {
      await signOut();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err0) {
      // ignore
    }
  }
  return {};
};

export const clearMfaPreferences = async () => {
  await updateMFAPreference({ totp: "DISABLED" });
};

/*
export const setupMfaDevice = async () => {
  const user = await Auth.currentAuthenticatedUser();
  return await Auth.setupTOTP(user);
};

export const verifyMfaDevice = async (challengeAnswer) => {
  const user = await Auth.currentAuthenticatedUser();
  await Auth.verifyTotpToken(user, challengeAnswer);
  await Auth.setPreferredMFA(user, "TOTP");
  return await init(window.localStorage.getItem(COGNITO_TOKEN));
};

const loadMfaDevices = async (
  user,
  devices = null,
  limit = 60,
  paginationToken = null
) => {
  return await new Promise((resolve, reject) =>
    user.listDevices(limit, paginationToken, {
      onSuccess: async (result) => {
        if (!devices) {
          devices = [];
        }
        result.Devices.forEach((device) => {
          const dev = {
            id: device.DeviceKey,
            created: new Date(),
            lastAuthenticated: new Date(),
          };
          dev.created.setTime(parseInt(device.DeviceCreateDate * 1000));
          dev.lastAuthenticated.setTime(
            parseInt(device.DeviceLastAuthenticatedDate * 1000)
          );
          device.DeviceAttributes.forEach((attr) => {
            if (attr.Name === "device_name") {
              dev.name = attr.Value;
            } else if (attr.Name === "last_ip_used") {
              dev.address = attr.Value;
            }
          });
          devices.push(dev);
        });
        if (result.PaginationToken) {
          await loadMfaDevices(user, devices, limit, result.PaginationToken);
        }
        resolve(devices);
      },
      onFailure: (err) => reject(err),
    })
  );
};

export const listMfaDevices = async () => {
  const user = await Auth.currentAuthenticatedUser();
  return await loadMfaDevices(user);
};

export const forgetMfaDevice = async (deviceKey) => {
  return await new Promise((resolve, reject) =>
    Auth.currentAuthenticatedUser().then((user) =>
      user.forgetSpecificDevice(deviceKey, {
        onSuccess: (result) => resolve(result),
        onFailure: (err) => reject(err),
      })
    )
  );
};
*/

export const getUsername = (): Promise<string | undefined> => {
  return getAccountFromStorage().then((account) => account?.username);
};

export const getUserAttributes = (): Promise<
  FetchUserAttributesOutput | undefined
> => {
  return getAccountFromStorage().then((account) => account?.userAttributes);
};

export const getMfaPreferences = (): Promise<
  FetchMFAPreferenceOutput | undefined
> => {
  return getAccountFromStorage().then((account) => account?.mfaPreferences);
};

export const isAuthenticated = (): Promise<boolean> => {
  return getAccountFromStorage().then((account) => !!account?.username);
};

export const isInGroup = (group: string): Promise<boolean> => {
  return getGroups().then((groups) => groups?.includes(group) || false);
};

export const getGroups = (): Promise<string[] | undefined> => {
  return loadAuthSession()
    .then((authSession) => {
      if (
        !(
          authSession.tokens?.idToken?.payload["cognito:groups"] instanceof
          Array
        )
      ) {
        return [];
      }
      return authSession.tokens.idToken.payload["cognito:groups"].map(
        (item) => item as string
      );
    })
    .catch((err) => {
      console.error(err);
      return undefined;
    });
};

export const getRoles = async (): Promise<string[] | undefined> => {
  return loadAuthSession()
    .then((authSession) => {
      if (
        !(
          authSession.tokens?.idToken?.payload["cognito:roles"] instanceof Array
        )
      ) {
        return [];
      }
      return authSession.tokens.idToken.payload["cognito:roles"]
        .map((item) => item as string)
        .map((r) => r.substring(r.indexOf("/") + 1));
    })
    .catch((err) => {
      console.error(err);
      return undefined;
    });
};

export const getPreferredRole = async (): Promise<string | undefined> => {
  return loadAuthSession()
    .then((authSession) => {
      if (!authSession.tokens?.idToken?.payload["cognito:preferred_role"]) {
        return undefined;
      }
      const preferredRole: string = authSession.tokens.idToken.payload[
        "cognito:preferred_role"
      ] as string;
      return preferredRole.substring(preferredRole.indexOf("/") + 1);
    })
    .catch((err) => {
      console.error(err);
      return undefined;
    });
};

export const getScopes = (): Promise<string[] | undefined> => {
  return loadAuthSession()
    .then((authSession) => {
      return authSession.tokens?.accessToken.payload["scope"]?.split(" ") ?? [];
    })
    .catch((err) => {
      console.error(err);
      return undefined;
    });
};

export const login = async (signInHook: ApiConfiguration["signInHook"]) => {
  let nextUrl: string | undefined;
  const gatey = getGateyPlugin();
  if (!gatey) {
    throw new Error("Gatey plugin is not available");
  }
  if (gatey.settings.integrateWpLogin && gatey.restUrl?.startsWith("http")) {
    const restOperation = gatey.cognito.post({
      apiName: "admin",
      path: "/login",
      /*
      options: {
        headers: {
          "X-WP-Nonce": Gatey.nonce,
        },
      },
      */
    });
    nextUrl = await restOperation.response
      .then((response) => response.body.json())
      .then((response) => {
        if (response instanceof Object && "redirect" in response) {
          return response?.redirect as string;
        }
        return undefined;
      })
      .catch((err) => {
        console.error(err);
        return undefined;
      });
  }
  if (signInHook) {
    await gatey.cognito
      .get({
        apiName: signInHook.apiName,
        path: signInHook.path,
        options: signInHook.options,
      })
      .response.catch((err) => console.error(err));
  }
  return gatey.settings.redirectSignIn ?? nextUrl;
};

export const logout = async (
  signOutHook: ApiConfiguration["signOutHook"]
): Promise<string | undefined> => {
  const gatey = getGateyPlugin();
  if (!gatey) {
    throw new Error("Gatey plugin is not available");
  }
  let nextUrl: string | undefined;
  if (gatey.settings.integrateWpLogin) {
    nextUrl = await gatey.cognito
      .get({
        apiName: "admin",
        path: "/logout",
        /*
        options: {
          headers: {
            "X-WP-Nonce": Gatey.nonce,
          },
        },
        */
      })
      .response.then((response) => response.body.json())
      .then((response) => {
        if (response instanceof Object && "redirect" in response) {
          return response?.redirect as string;
        }
        return undefined;
      })
      .catch((err) => {
        console.error(err);
        return undefined;
      });
  }
  if (signOutHook) {
    await gatey.cognito
      .get({
        apiName: signOutHook.apiName,
        path: signOutHook.path,
        options: signOutHook.options,
      })
      .response.catch((err) => console.error(err));
  }
  try {
    await signOut();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    /* ts-ignore */
  }
  return gatey.settings.redirectSignOut ?? nextUrl;
};
