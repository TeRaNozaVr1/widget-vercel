import React, { useState } from "react";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import {WalletMultiButton, WalletModalProvider  } from "@solana/wallet-adapter-react-ui";
import bs58 from 'bs58';

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=21612465-a2ab-4b89-bbb3-831280f9df4c", "confirmed");

const OWNER_WALLET = new PublicKey("4ofLfgCmaJYC233vTGv78WFD4AfezzcMiViu26dF3cVU");
const SPL_TOKEN_MINT = new PublicKey("3EwV6VTHYHrkrZ3UJcRRAxnuHiaeb8EntqX85Khj98Zo");
const TOKEN_PRICE = 0.00048;
const PRIVATE_KEY = bs58.decode(process.env.REACT_APP_PRIVATE_KEY);

const checkTransactionStatus = async (signature) => {
    try {
        const transaction = await connection.getTransaction(signature, { commitment: "confirmed" });
        return transaction && transaction.meta?.err === null;
    } catch (error) {
        console.error("Error checking transaction status:", error);
        return false;
    }
};

const ExchangeComponent = () => {
    const [amount, setAmount] = useState("");
    const [selectedToken, setSelectedToken] = useState("USDT");
    const [transactionLoading, setTransactionLoading] = useState(false);
    const { publicKey, sendTransaction, connected, disconnect } = useWallet();

    const tokenAmount = amount ? (amount / (TOKEN_PRICE * 1e2)).toFixed(2) : "0";

    const handleExchange = async () => {
        if (!publicKey) return alert("Wallet not connected");
        setTransactionLoading(true);

        try {
            const amountInLamports = amount * 1e6;
            const mint = selectedToken === "USDT"
                ? new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")
                : new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

            const senderTokenAccount = await getAssociatedTokenAddress(mint, publicKey);
            const recipientTokenAccount = await getAssociatedTokenAddress(mint, OWNER_WALLET);

            const transaction = new Transaction().add(
                createTransferInstruction(senderTokenAccount, recipientTokenAccount, publicKey, amountInLamports)
            );

            // Fetch the recent blockhash
            const { blockhash } = await connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);
            alert(`Transaction sent: ${signature}`);

            let isConfirmed = false;
            while (!isConfirmed) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                isConfirmed = await checkTransactionStatus(signature);
            }

            alert("USDT/USDC received successfully.");
            await sendSPLTokens(publicKey, tokenAmount);
        } catch (error) {
            console.error("Transaction error:", error);
            alert("Transaction error: " + error.message);
        } finally {
            setTransactionLoading(false);
        }
    };

    const sendSPLTokens = async (recipient, amount) => {
        try {
            const keypair = Keypair.fromSecretKey(PRIVATE_KEY);
            const ownerTokenAccount = await getAssociatedTokenAddress(SPL_TOKEN_MINT, OWNER_WALLET);
            const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(connection, keypair, SPL_TOKEN_MINT, recipient);

            const transaction = new Transaction().add(
                createTransferInstruction(ownerTokenAccount, receiverTokenAccount.address, OWNER_WALLET, amount * 1e6)
            );

            // Fetch the recent blockhash
            const { blockhash } = await connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = keypair.publicKey;

            transaction.sign(keypair);

            const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, preflightCommitment: 'processed' });
            alert(`SPL tokens sent: ${signature}`);
        } catch (error) {
            console.error("SPL Transaction error:", error);
            alert("SPL Transaction error: " + error.message);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-[#143021]">
            <div className="bg-[#143021] p-8 rounded-lg shadow-lg max-w-md w-full text-center border border-gray-600">
                <h1 className="text-white text-4xl font-anta mb-8">PRESALE</h1>
            
                <WalletMultiButton/>
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
            <WalletProvider wallets={[new PhantomWalletAdapter(), new SolflareWalletAdapter()]} autoConnect>
                <WalletModalProvider>
                    <ExchangeComponent />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
