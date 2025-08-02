"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { bnbTestnet } from "../lib/bnbTestnet"; // adjust path as needed

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
            config={{
                embeddedWallets: {
                    createOnLogin: "all-users",
                },
                defaultChain: bnbTestnet,
                supportedChains: [bnbTestnet],
            }}
        >
            {children}
        </PrivyProvider>
    );
}
