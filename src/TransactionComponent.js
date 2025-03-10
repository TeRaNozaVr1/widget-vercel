import React, { useEffect, useState } from "react";

const TransactionComponent = ({ signature }) => {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        const checkTransactionStatus = async () => {
            try {
                const response = await fetch(`https://api.helius.xyz/v0/transactions/?api-key=21612465-a2ab-4b89-bbb3-831280f9df4c&signature=${signature}`);
                const data = await response.json();
                if (data.success) {
                    setStatus("Transaction confirmed.");
                } else {
                    setStatus("Transaction not confirmed.");
                }
            } catch (error) {
                setStatus("Error checking transaction.");
                console.error("Transaction error:", error);
            }
        };

        if (signature) {
            checkTransactionStatus();
        }
    }, [signature]);

    return (
        <div className="mt-4 text-white">
            {status ? <p>{status}</p> : <p>Checking transaction status...</p>}
        </div>
    );
};

export default TransactionComponent;
