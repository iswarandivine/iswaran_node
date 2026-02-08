const axios = require('axios');

const BACKEND_URL = 'http://localhost:4000';

async function testEmailFlow() {
    try {
        console.log('--- Starting Email Verification Test ---');

        // 1. Simulate /pay request (like Frontend)
        console.log('1. Initiating Payment...');
        const payPayload = {
            amount: 100,
            type: 'service',
            userDetails: {
                productName: 'Special Puja',
                preferredDate: '2023-12-25',
                preferredTime: '10:30 AM',
                name: 'Test Service User',
                email: 'test-service@example.com',
                whatsapp: '1234567890',
                archanaDetails: [
                    { name: 'Devotee 1', rasi: 'Mesham', star: 'Ashwini', gothram: 'Kasyapa' }
                ]
            }
        };

        const payResponse = await axios.post(`${BACKEND_URL}/pay`, payPayload);

        // Correctly extract data from PhonePe response structure
        // structure: { success: true, code: '...', data: { merchantTransactionId: '...', ... } }
        if (!payResponse.data.success || !payResponse.data.data) {
            throw new Error('Payment initiation failed: ' + JSON.stringify(payResponse.data));
        }

        const merchantTransactionId = payResponse.data.data.merchantTransactionId;

        console.log(`   Transaction ID: ${merchantTransactionId}`);
        console.log('   Payment Initiated Successfully.');

        // 2. Simulate PhonePe Redirect (Success)
        console.log('\n2. Simulating PhonePe Success Redirect...');

        const redirectPayload = {
            code: 'PAYMENT_SUCCESS',
            merchantId: 'PGTESTPAYUAT86',
            merchantTransactionId: merchantTransactionId,
            amount: 10000
        };

        const redirectResponse = await axios.post(`${BACKEND_URL}/payment-redirect?type=${payPayload.type}`, redirectPayload, {
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400
        });

        console.log(`   Response Status: ${redirectResponse.status}`);

        if (redirectResponse.status === 302) {
            const location = redirectResponse.headers.location;
            console.log(`   Redirect Location: ${location}`);

            if (location.includes('success=true')) {
                console.log('\n--- TEST PASSED: Backend handled success redirect correctly. ---');
                console.log('CHECK SERVER TERMINAL for "Email sent successfully" log.');
            } else {
                console.error('\n--- TEST FAILED: Redirect location indicates failure. ---');
            }
        } else {
            console.error(`\n--- TEST FAILED: Expected 302 Redirect, got ${redirectResponse.status} ---`);
        }

    } catch (error) {
        console.error('\n--- TEST FAILED: Error occurred ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error);
        }
    }
}

testEmailFlow();
