const config = {
    stories: ["../src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))"],
    addons: ["@storybook/addon-themes"],
    framework: {
        name: "@storybook/react-vite",
        options: {
            builder: {
                viteConfigPath: "vite.config.ts",
            },
        },
    },
};
export default config;
