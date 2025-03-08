import React, { useState } from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// Helius RPC URL
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=85a0c15f-2d67-4170-b9e1-64e56f59c1f7", "confirmed");

const OWNER_WALLET = new PublicKey("4ofLfgCmaJYC233vTGv78WFD4AfezzcMiViu26dF3cVU");
const SPL_TOKEN_MINT = new PublicKey("3EwV6VTHYHrkrZ3UJcRRAxnuHiaeb8EntqX85Khj98Zo");
const TOKEN_PRICE = 0.00048;

const ExchangeComponent = () => {
    const [amount, setAmount] = useState("");
    const [selectedToken, setSelectedToken] = useState("USDT");
    const [transactionLoading, setTransactionLoading] = useState(false);
    const { publicKey, sendTransaction, connected, disconnect } = useWallet();

    const handleExchange = async () => {
        if (!publicKey) {
            alert("Будь ласка, підключіть гаманець!");
            return;
        }

        setTransactionLoading(true);

        try {
            const amountInLamports = amount * Math.pow(10, 6);
            const tokenAmount = Math.round(amountInLamports / (TOKEN_PRICE * 1e6));

            let mint;
            if (selectedToken === "USDT") {
                mint = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
            } else if (selectedToken === "USDC") {
                mint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
            } else {
                throw new Error("Невірний токен для отримання.");
            }

            const senderTokenAccount = await getOrCreateAssociatedTokenAccount(connection, publicKey, mint, publicKey);
            const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(connection, publicKey, mint, OWNER_WALLET);

            const transaction = new Transaction().add(
                createTransferInstruction(senderTokenAccount.address, recipientTokenAccount.address, publicKey, amountInLamports)
            );

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // Відправка основної транзакції
            const signature = await sendTransaction(transaction, connection, { preflightCommitment: "processed" });

            // Затримка для перевірки статусу
            setTimeout(async () => {
                const status = await connection.getSignatureStatus(signature);

                if (status && status.confirmationStatus === "finalized") {
                    alert(`USDT/USDC успішно отримано. TX ID: ${signature}`);

                    const receiverTokenAccount = await getAssociatedTokenAddress(SPL_TOKEN_MINT, publicKey);
                    const ownerTokenAccount = await getAssociatedTokenAddress(SPL_TOKEN_MINT, OWNER_WALLET);

                    const splTransaction = new Transaction().add(
                        createTransferInstruction(ownerTokenAccount, receiverTokenAccount, OWNER_WALLET, tokenAmount)
                    );

                    const { blockhash: splBlockhash } = await connection.getLatestBlockhash();
                    splTransaction.recentBlockhash = splBlockhash;
                    splTransaction.feePayer = OWNER_WALLET;

                    const splSignature = await sendTransaction(splTransaction, connection, { preflightCommitment: "processed" });
                    const splStatus = await connection.getSignatureStatus(splSignature);

                    if (splStatus && splStatus.confirmationStatus === "finalized") {
                        alert(`SPL токени успішно відправлені. TX ID: ${splSignature}`);
                    } else {
                        alert("Транзакція SPL токенів не була підтверджена.");
                    }
                } else {
                    alert("Основна транзакція не була підтверджена.");
                }
            }, 5000);
        } catch (error) {
            console.error("Помилка транзакції:", error);
            alert("Помилка транзакції: " + error.message);
        } finally {
            setTransactionLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-[#143021]">
            <div className="bg-[#143021] p-8 rounded-lg shadow-lg max-w-md w-full text-center border border-gray-600">
                <h1 className="text-white text-4xl font-anta mb-6">PRESALE</h1>

                {/* Іконки гаманців ліворуч */}
                <div className="flex items-center justify-center mb-4">
                    <img src="/phantom.png" alt="Phantom Wallet" className="w-10 h-10 mr-3" />
                    <img src="/solflare.png" alt="Solflare Wallet" className="w-10 h-10" />
                </div>

                <WalletMultiButton className="w-full bg-[#98ff38] text-black py-2 px-4 rounded-md font-semibold text-lg" />

                {connected && (
                    <>
                        <p className="text-white text-sm mt-2">Гаманець: {publicKey?.toBase58()}</p>
                        <button onClick={disconnect} className="text-white text-sm mt-4 block">
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

export default function App() {
    return (
        <WalletProvider wallets={[new PhantomWalletAdapter(), new SolflareWalletAdapter()]} autoConnect>
            <WalletModalProvider>
                <ExchangeComponent />
            </WalletModalProvider>
        </WalletProvider>
    );
}

