import type { Config } from "tailwindcss";

export default {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                bnb: {
                    50: '#fff9e6',
                    100: '#fff3cc',
                    200: '#ffe799',
                    300: '#ffdb66',
                    400: '#ffcf33',
                    500: '#F3BA2F', // BNB Yellow
                    600: '#c29526',
                    700: '#92701c',
                    800: '#614a13',
                    900: '#312509',
                },
                background: "var(--background)",
                foreground: "var(--foreground)",
            },
        },
    },
    plugins: [],
} satisfies Config;
