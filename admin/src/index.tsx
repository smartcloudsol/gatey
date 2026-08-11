import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  AuthenticatorConfig,
  getStore,
  getGateyPlugin,
  type Account,
  type Store,
} from "@smart-cloud/gatey-core";
import { MantineProvider, createTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Amplify } from "aws-amplify";

import Main from "./main";

export const signUpAttributes = [
  "name",
  "family_name",
  "given_name",
  "middle_name",
  "nickname",
  "preferred_username",
  "birthdate",
  "email",
  "phone_number",
  "profile",
  "website",
];

const production = process.env?.NODE_ENV === "production";
if (!production) {
  import("./index.css");
}

const theme = createTheme({
  respectReducedMotion: true,
});

declare global {
  const wp: {
    data: {
      select: (store: Store) => {
        getConfig: () => AuthenticatorConfig | null;
        getAccount: () => Account | undefined;
      };
    };
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: false,
      retryDelay: 0,
    },
  },
});

getStore()
  .then((store) => {
    const gatey = getGateyPlugin();
    if (!gatey) {
      throw new Error("Gatey plugin is not available");
    }

    // Gatey's core runtime has already selected the active user-pool
    // configuration for this site. The admin bundle has its own aws-amplify
    // module instance, so copy that configuration before mounting any
    // Authenticator provider or issuing an auth call from this bundle.
    Amplify.configure(gatey.cognito.getAmplifyConfig());

    const root = createRoot(document.getElementById("smartcloud-gatey-admin")!);
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <MantineProvider theme={theme}>
            <Notifications position="top-right" zIndex={100000} />
            <ModalsProvider>
              <Main store={store} {...gatey} />
            </ModalsProvider>
          </MantineProvider>
        </QueryClientProvider>
      </StrictMode>,
    );
  })
  .catch((error) => {
    console.error("Error initializing Gatey Admin:", error);
  });
