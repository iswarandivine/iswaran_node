const axios = require('axios');

async function testPayment() {
    try {
        console.log("Testing payment API...");
        const response = await axios.post('http://localhost:4000/pay', { amount: 100 });
        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error Status:", error.response ? error.response.status : "Unknown");
        console.error("Error Data:", error.response ? error.response.data : error.message);
    }
}

testPayment();
