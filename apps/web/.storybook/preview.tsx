import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";
import { initialize, mswLoader } from "msw-storybook-addon";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { setFaker, custom } from "zod-schema-faker/v4";
import { PostContent } from "@repo/rest-contracts";
import React from "react";
import { Provider as JotaiProvider } from "jotai";
import store from "../src/lib/atoms/store";
import "../src/index.css";

// Initialize zod-schema-faker with @faker-js/faker
setFaker(faker);

// PostContent uses .refine() to require at least one content field, which
// zod-schema-faker cannot satisfy automatically. Register a custom faker that
// always produces a valid text post so generated Post objects render correctly.
custom(PostContent, () => ({
  text: faker.lorem.paragraph(),
}));

// Initialize MSW
initialize();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
    },
  },
});

const preview: Preview = {
  parameters: {
    docs: {
      codePanel: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  loaders: [mswLoader],
  decorators: [
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "dark",
    }),
    (Story) => {
      queryClient.clear();

      return <JotaiProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      </JotaiProvider>
    }
  ],
};

export default preview;
