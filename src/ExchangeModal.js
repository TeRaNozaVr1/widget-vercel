import React, { useState, useEffect } from "react";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";

// Підключення до Solana mainnet
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=85a0c15f-2d67-4170-b9e1-64e56f59c1f7");

// Адреси токенів та гаманця
const USDT_ADDRESS = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
const USDC_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const YOUR_TOKEN_ADDRESS = new PublicKey("3EwV6VTHYHrkrZ3UJcRRAxnuHiaeb8EntqX85Khj98Zo");
const YOUR_WALLET_ADDRESS = new PublicKey("4ofLfgCmaJYC233vTGv78WFD4AfezzcMiViu26dF3cVU");
const EXCHANGE_RATE = 0.00048;

const Presale = () => {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [transactionLoading, setTransactionLoading] = useState(false);
  const { publicKey, sendTransaction, connected, connect, disconnect } = useWallet();

  // Викликається при натисканні кнопки "Обміняти"
  const handleExchange = async () => {
    if (!publicKey) {
      alert("Будь ласка, підключіть гаманець!");
      return;
    }
    setTransactionLoading(true);

    try {
      const transaction = new Transaction();
      const amountInLamports = amount * Math.pow(10, 6);
      const tokenAmount = amountInLamports / EXCHANGE_RATE;
      const tokenAddress = selectedToken === "USDT" ? USDT_ADDRESS : USDC_ADDRESS;

      const senderTokenAccount = await getAssociatedTokenAddress(tokenAddress, publicKey);
      const receiverTokenAccount = await getAssociatedTokenAddress(YOUR_TOKEN_ADDRESS, publicKey);

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: YOUR_WALLET_ADDRESS,
        lamports: amountInLamports,
      });
      transaction.add(transferInstruction);

      const transferSPLInstruction = createTransferInstruction(
        senderTokenAccount,
        receiverTokenAccount,
        publicKey,
        tokenAmount
      );
      transaction.add(transferSPLInstruction);

      const signature = await sendTransaction(transaction, connection);
      const isTransactionConfirmed = await checkTransactionStatus(signature);

      if (isTransactionConfirmed) {
        alert("Транзакція підтверджена, токени відправлено!");
      } else {
        alert("Транзакція не підтверджена!");
      }
    } catch (error) {
      console.error(error);
      alert("Помилка при відправці транзакції!");
    } finally {
      setTransactionLoading(false);
    }
  };

  const checkTransactionStatus = async (signature) => {
    try {
      const url = `https://mainnet.helius-rpc.com/v0/transaction/${signature}?api-key=85a0c15f-2d67-4170-b9e1-64e56f59c1f7`;
      const response = await fetch(url);
      const data = await response.json();
      return data.status === "confirmed";
    } catch (error) {
      console.error("Помилка при перевірці транзакції:", error);
      return false;
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#143021]">
      <div className="bg-[#143021] p-8 rounded-lg shadow-lg max-w-md w-full text-center border border-gray-600">
        <h1 className="text-white text-4xl font-anta mb-6">PRESALE</h1>
        
        <WalletMultiButton className="w-full bg-[#98ff38] text-black py-2 px-4 rounded-md font-semibold text-lg" />

        {connected && (
          <>
            <p className="text-white text-sm mt-2">Гаманець: {publicKey?.toBase58()}</p>
            <button onClick={disconnect} className="text-white text-sm mt-2">
              Відключити гаманець
            </button>
          </>
        )}

        {!connected && <p className="text-white text-sm mt-2">Гаманець не підключено</p>}

        {/* Вибір токена */}
        <div className="mt-4">
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="w-full bg-white text-black py-2 px-4 rounded-md text-lg border border-black"
          >
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
          </select>
        </div>

        {/* Введення суми */}
        <div className="mt-4">
          <input
            type="number"
            placeholder="Введіть суму"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white text-black py-2 px-4 rounded-md text-lg border border-black text-center"
          />
        </div>

        {/* Кнопка обміну */}
        <button
          className="w-full bg-[#98ff38] text-black py-2 px-4 rounded-md font-semibold text-lg mt-4"
          onClick={handleExchange}
          disabled={transactionLoading}
        >
          {transactionLoading ? "Обробка..." : "Обміняти"}
        </button>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <WalletProvider
      wallets={[new PhantomWalletAdapter(), new SolflareWalletAdapter()]}
      autoConnect
    >
      <WalletModalProvider>
        <Presale />
      </WalletModalProvider>
    </WalletProvider>
  );
};

export default App;

