// src/app/page.tsx

import WalletConnect from "@/components/WalletConnect";
import MintingForm from "@/components/MintingForm"; // 导入新组件

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-900 text-white">
      <div className="absolute top-8 right-8">
        <WalletConnect />
      </div>
      
      <div className="flex flex-col items-center justify-center w-full flex-grow">
        <MintingForm />
      </div>
    </main>
  );
}