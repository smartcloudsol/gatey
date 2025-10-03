import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  AuthenticatorConfig,
  store,
  type Account,
  type Store,
} from "@smart-cloud/gatey-core";
import { MantineProvider, createTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

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

store.then((store) => {
  const root = createRoot(document.getElementById("gatey-admin")!);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <Notifications position="top-right" zIndex={100000} />
          <ModalsProvider>
            <Main store={store} {...Gatey} />
          </ModalsProvider>
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>
  );
});
