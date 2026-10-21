"use client";

import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { useWriteContract, useReadContract, useBalance } from 'wagmi';
import { Wallet, Users, Shield, ArrowRightLeft, Plus, LogOut } from 'lucide-react';

const VAULT_ABI = [
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address payable", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_member", "type": "address" }, { "internalType": "uint256", "name": "_dailyLimit", "type": "uint256" }], "name": "addMember", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
] as const;

// CONSTANTS (Replace with deployed address)
const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000";

export default function Home() {
  const { login, logout, authenticated, user } = usePrivy();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'balance' | 'members' | 'recovery'>('balance');

  // Contract Reads
  const { data: vaultBalance } = useBalance({ address: VAULT_ADDRESS });

  // Contract Writes
  const { writeContract: withdraw } = useWriteContract();
  const { writeContract: addMember } = useWriteContract();

  // Form State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [newMember, setNewMember] = useState('');
  const [limit, setLimit] = useState('');

  const handleWithdraw = () => {
    if (!withdrawAmount || !recipient) return;
    withdraw({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [recipient as `0x${string}`, parseEther(withdrawAmount)],
    });
  };

  const handleAddMember = () => {
    if (!newMember || !limit) return;
    addMember({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'addMember',
      args: [newMember as `0x${string}`, parseEther(limit)],
    });
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <header className="flex justify-between items-center mb-12 max-w-5xl mx-auto backdrop-blur-md bg-black/30 p-4 rounded-full border border-yellow-500/20 sticky top-4 z-50">
        <div className="flex items-center gap-3 pl-4">
          <div className="bg-yellow-500 p-2 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]">
            <Shield className="w-6 h-6 text-black fill-current" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 drop-shadow-sm">
            MPC Social Vault
          </h1>
        </div>
        <div className="pr-2 flex gap-4 items-center">
          {authenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 hidden md:block">{user?.wallet?.address?.slice(0, 6)}...{user?.wallet?.address?.slice(-4)}</span>
              <button onClick={logout} className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-500" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-2 rounded-full transition-all shadow-lg hover:shadow-yellow-500/20"
            >
              Login
            </button>
          )}
        </div>
      </header>

      {!authenticated ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="p-8 bg-gray-800 rounded-2xl border border-gray-700 max-w-md">
            <Shield className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Secure Family Treasury</h2>
            <p className="text-gray-400 mb-8">
              Login with Google, Email, or Wallet.
              Manage allowances for family members and set up social recovery.
            </p>
            <button
              onClick={login}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-yellow-500/20 flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" /> Connect via Privy
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {/* Navigation Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-700 pb-2">
            <button
              onClick={() => setActiveTab('balance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'balance' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Wallet className="w-4 h-4" /> Balance & Send
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'members' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Family Members
            </button>
            <button
              onClick={() => setActiveTab('recovery')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'recovery' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Shield className="w-4 h-4" /> Recovery
            </button>
          </div>

          {/* Content Area */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 min-h-[400px]">
            {activeTab === 'balance' && (
              <div className="space-y-6">
                <div className="bg-gray-700/50 p-6 rounded-xl text-center">
                  <p className="text-gray-400 mb-2">Vault Balance</p>
                  <h2 className="text-4xl font-bold text-white">
                    {vaultBalance ? formatEther(vaultBalance.value) : '0.00'} <span className="text-yellow-500">tBNB</span>
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Send / Withdraw</h3>
                    <input
                      type="text"
                      placeholder="Recipient Address (0x...)"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:border-yellow-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Amount (BNB)"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:border-yellow-500 outline-none"
                      />
                      <button
                        onClick={handleWithdraw}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 rounded-lg transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Family Allowances</h3>
                </div>

                <div className="bg-gray-700/30 p-4 rounded-xl space-y-4">
                  <h4 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add New Member</h4>
                  <div className="flex gap-2 flex-col md:flex-row">
                    <input
                      type="text"
                      placeholder="Member Address"
                      value={newMember}
                      onChange={(e) => setNewMember(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-3 focus:border-yellow-500 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Daily Limit (BNB)"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                      className="w-32 bg-gray-900 border border-gray-600 rounded-lg p-3 focus:border-yellow-500 outline-none"
                    />
                    <button
                      onClick={handleAddMember}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'recovery' && (
              <div className="text-center py-12 text-gray-400">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">Social Recovery Config</h3>
                <p>Contact your designated guardians to initiate account recovery.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
