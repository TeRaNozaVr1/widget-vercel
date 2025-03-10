// /api/check-transaction.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { signature } = req.query;

    if (!signature) {
        return res.status(400).json({ error: 'Signature parameter is required' });
    }

    const url = `https://api.helius.xyz/v0/transactions/?api-key=21612465-a2ab-4b89-bbb3-831280f9df4c&signature=${signature}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error fetching transaction status' });
        }
        const data = await response.json();
        return res.json(data);  // Повертаємо відповідь від Helius API
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
