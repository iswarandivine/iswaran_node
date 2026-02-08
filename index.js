require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const uniqid = require('uniqid');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environmental Variables
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;
const PORT = process.env.PORT || 4000;

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// In-memory store for transaction details
const transactionStore = new Map();

app.post('/api/pay', async (req, res) => {
    const { amount, type = 'donation', userDetails } = req.body;
    const transactionId = uniqid("txn_");

    console.log(`Initiating payment for ${amount} (${type}) with TxnId: ${transactionId}`);
    console.log('Received UserDetails:', JSON.stringify(userDetails, null, 2)); // Debug Log

    // Store user details associated with this transaction ID
    if (userDetails) {
        transactionStore.set(transactionId, { ...userDetails, amount, type });
        console.log(`Stored details for ${transactionId}:`, transactionStore.get(transactionId)); // Debug Log
    } else {
        console.warn(`WARNING: No userDetails received for ${transactionId}`);
    }

    const payload = {
        merchantId: MERCHANT_ID,
        merchantTransactionId: transactionId,
        merchantUserId: "MUID123", // Aligned with working QA script
        amount: amount * 100, // Amount in paise
        redirectUrl: `http://localhost:4000/api/payment-redirect?type=${type}`, // Pass type in redirect URL
        redirectMode: "POST",
        callbackUrl: "http://localhost:4000/api/callback",
        mobileNumber: "9999999999",
        paymentInstrument: {
            type: "PAY_PAGE"
        }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");

    const stringToSign = base64Payload + "/pg/v1/pay" + SALT_KEY;
    const sha256 = crypto.createHash("sha256").update(stringToSign).digest("hex");
    const checksum = sha256 + "###" + SALT_INDEX;

    console.log('Sending request to:', "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay");
    console.log('X-VERIFY:', checksum);

    try {
        const response = await axios.post(
            "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
            { request: base64Payload },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-VERIFY": checksum
                }
            }
        );

        console.log("Payment Success:", JSON.stringify(response.data));
        res.json(response.data);
    } catch (error) {
        console.error("Payment Error:", error.response?.data || error.message);
        res.status(500).json(error.response?.data || { error: error.message });
    }
});

// Handle PhonePe Redirect (POST) and forward to Frontend (GET)
app.post('/api/payment-redirect', (req, res) => {
    console.log("Received Redirect from PhonePe");
    console.log("Headers:", JSON.stringify(req.headers));
    console.log("Body:", req.body);

    // Check if the payment was successful
    const { code } = req.body || {};
    const merchantTransactionId = req.body.merchantTransactionId || req.body.transactionId;
    const { type } = req.query; // Get type from query params

    if (code === 'PAYMENT_SUCCESS') {
        // Retrieve user details
        const details = transactionStore.get(merchantTransactionId);


        if (details) {
            console.log("Sending email to:", 'iswarandivine@gmail.com');
            const subject = `New Successful Payment: ${type.toUpperCase()}`;
            let text = `A new payment of ₹${details.amount} was received.\n\n` +
                `Transaction ID: ${merchantTransactionId}\n` +
                `Type: ${type}\n\n`;

            if (type === 'donation') {
                text += `Donation Type: ${details.category}\nName: ${details.name}\nEmail: ${details.email}\nWhatsApp: ${details.whatsapp}\nMessage: ${details.message}`;
            } else if (type === 'service') {
                text += `Product: ${details.productName}\nPreferred Date: ${details.preferredDate}\n\nArchana Details:\n`;
                if (details.archanaDetails && Array.isArray(details.archanaDetails)) {
                    details.archanaDetails.forEach((p, i) => {
                        text += `\nPerson ${i + 1}:\nName: ${p.name}\nRasi: ${p.rasi}\nStar: ${p.star}\nGothram: ${p.gothram}\nPreferred Time (India): ${details.preferredTime || 'Not specified'}`;
                    });
                }
            }

            const mailOptions = {
                from: 'iswarandivine@gmail.com',
                to: `iswarandivine@gmail.com, ${details.email}`, // Send to Admin AND Donor
                subject: subject,
                text: text
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });

            // Cleanup
            transactionStore.delete(merchantTransactionId);
        }

        res.redirect(`http://localhost:3000/payment-status?success=true&type=${type}`);
    } else {
        res.redirect(`http://localhost:3000/payment-status?success=false&type=${type}`);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));