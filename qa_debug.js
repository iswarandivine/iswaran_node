const axios = require('axios');
const crypto = require('crypto');
const uniqid = require('uniqid');

// PhonePe UAT credentials
const MERCHANT_ID = "PGTESTPAYUAT86";
const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = 1;

async function testPayment() {
    console.log("Starting QA Test...");

    const transactionId = uniqid("txn_");
    const payload = {
        merchantId: MERCHANT_ID,
        merchantTransactionId: transactionId,
        merchantUserId: "MUID123",
        amount: 10000, // 100 INR
        redirectUrl: "http://localhost:3000/payment-status",
        redirectMode: "POST",
        callbackUrl: "http://localhost:4000/callback",
        mobileNumber: "9999999999",
        paymentInstrument: {
            type: "PAY_PAGE"
        }
    };

    // 1. Base64 Encode
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    console.log("Base64 Payload Length:", base64Payload.length);

    // 2. Generate Checksum
    const apiEndpoint = "/pg/v1/pay";
    const stringToSign = base64Payload + apiEndpoint + SALT_KEY;
    const sha256 = crypto.createHash("sha256").update(stringToSign).digest("hex");
    const checksum = sha256 + "###" + SALT_INDEX;

    console.log("Checksum:", checksum);
    console.log("Target URL:", "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay");

    // 3. Make Request
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

        console.log("✅ SUCCESS!");
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log("❌ FAILED");
        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Data:", JSON.stringify(error.response.data, null, 2));
            console.log("Headers:", JSON.stringify(error.response.headers, null, 2));
        } else {
            console.log("Error Message:", error.message);
        }
    }
}

testPayment();
