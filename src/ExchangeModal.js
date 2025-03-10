import React, { useState } from "react";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";


// Helius RPC URL
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=21612465-a2ab-4b89-bbb3-831280f9df4c", "confirmed");

// Отримуємо значення з змінних середовища
const OWNER_WALLET = new PublicKey("4ofLfgCmaJYC233vTGv78WFD4AfezzcMiViu26dF3cVU");
const SPL_TOKEN_MINT = new PublicKey("3EwV6VTHYHrkrZ3UJcRRAxnuHiaeb8EntqX85Khj98Zo");
const TOKEN_PRICE = 0.00048

const checkTransactionStatus = async (signature) => {
    try {
        const transaction = await connection.getTransaction(signature);
        if (transaction) {
            return transaction.meta?.err === null;
        }
        return false;
    } catch (error) {
        console.error("Error checking transaction status:", error);
        return false;
    }
};

const ExchangeComponent = () => {
    const [amount, setAmount] = useState("");
    const [selectedToken, setSelectedToken] = useState("USDT");
    const [transactionLoading, setTransactionLoading] = useState(false);
    const { publicKey, sendTransaction, connected, disconnect, wallet } = useWallet();

    const tokenAmount = amount ? (amount / TOKEN_PRICE).toFixed(2) : "0";

    const handleExchange = async () => {
        if (!publicKey) {
            alert("Please connect your wallet!");
            return;
        }

        setTransactionLoading(true);
        try {
            const amountInLamports = amount * Math.pow(10, 6);
            const tokenAmount = Math.round(amountInLamports / (TOKEN_PRICE * 1e6));

            // Вибір мiнту
            let mint;
            if (selectedToken === "USDT") {
                mint = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
            } else if (selectedToken === "USDC") {
                mint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
            } else {
                throw new Error("Invalid token selection.");
            }

            const senderTokenAccount = await getOrCreateAssociatedTokenAccount(connection, publicKey, mint, publicKey);
            const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(connection, OWNER_WALLET, mint, OWNER_WALLET);

            const transaction = new Transaction().add(
                createTransferInstruction(senderTokenAccount.address, recipientTokenAccount.address, publicKey, amountInLamports)
            );

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // Завантажуємо приватний ключ із .env
            const privateKey = "FzK5DovUzrEx6k9K5uXJxNsfQFcD7jTkfbkLgqVXgzqz";
            const keypair = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(privateKey, 'base58')));
            transaction.sign(keypair);

            // Надсилаємо транзакцію
            const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, preflightCommitment: 'processed' });

            // Перевірка транзакції в циклі з паузою
            let isConfirmed = false;
            while (!isConfirmed) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Пауза 2 секунди
                isConfirmed = await checkTransactionStatus(signature);
            }

            alert(`USDT/USDC received successfully. TX ID: ${signature}`);

            const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(connection, publicKey, SPL_TOKEN_MINT, publicKey);
            const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(connection, OWNER_WALLET, SPL_TOKEN_MINT, OWNER_WALLET);

            const splTransaction = new Transaction().add(
                createTransferInstruction(ownerTokenAccount.address, receiverTokenAccount.address, OWNER_WALLET, tokenAmount * Math.pow(10, 6))
            );

            const { blockhash: splBlockhash } = await connection.getLatestBlockhash();
            splTransaction.recentBlockhash = splBlockhash;
            splTransaction.feePayer = OWNER_WALLET;

            // Підписуємо транзакцію локально з приватного ключа
            splTransaction.sign(keypair);

            // Надсилаємо транзакцію
            const splSignature = await connection.sendRawTransaction(splTransaction.serialize(), { skipPreflight: false, preflightCommitment: 'processed' });

            // Перевірка статусу SPL транзакції
            let splStatus = false;
            while (!splStatus) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Пауза 2 секунди
                splStatus = await checkTransactionStatus(splSignature);
            }

            alert(`SPL tokens sent successfully. TX ID: ${splSignature}`);
        } catch (error) {
            console.error("Transaction error:", error);
            alert("Transaction error: " + error.message);
        } finally {
            setTransactionLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-[#143021]">
            <div className="bg-[#143021] p-8 rounded-lg shadow-lg max-w-md w-full text-center border border-gray-600">
                <h1 className="text-white text-4xl font-anta mb-8">PRESALE</h1>
                <WalletMultiButton />
                {connected && (
                    <>
                        <p className="text-white text-sm mt-2">Wallet: {publicKey?.toBase58()}</p>
                        <button onClick={disconnect} className="text-white text-sm mt-2">Disconnect Wallet</button>
                    </>
                )}
                {!connected && <p className="text-white text-sm mt-2">Wallet not connected</p>}
                <div className="mt-4">
                    <select value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)} className="w-full bg-white text-black py-2 px-4 rounded-md text-lg border border-black">
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                    </select>
                </div>
                <div className="mt-4">
                    <input type="number" placeholder="Enter the amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-white text-black py-2 px-4 rounded-md text-lg border border-black text-center" />
                    <p className="text-white mt-2">You will get: {tokenAmount} tokens</p>
                </div>
                <button className="w-full bg-[#98ff38] text-black py-2 px-4 rounded-md font-semibold text-lg mt-4" onClick={handleExchange} disabled={transactionLoading}>
                    {transactionLoading ? "Processing..." : "Buy"}
                </button>
            </div>
        </div>
    );
};

export default function App() {
    return (
        <ConnectionProvider endpoint="https://mainnet.helius-rpc.com/?api-key=21612465-a2ab-4b89-bbb3-831280f9df4c">
            <WalletProvider wallets={[new SolflareWalletAdapter()]} autoConnect>
                <WalletModalProvider>
                    <ExchangeComponent />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}





