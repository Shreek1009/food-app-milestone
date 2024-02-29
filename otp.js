const express = require('express');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')('your_stripe_secret_key');
const twilio = require('twilio')('your_account_sid', 'your_auth_token');
const mongoose = require('mongoose');

// Initialize Express router
const router = express.Router();

// Load Order model
const Order = require('./models/Order');

// Route for processing payments
router.post('/process-payment', async (req, res) => {
    try {
        const { amount, userId } = req.body;

        // Process payment using Stripe API
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd'
        });

        // Store payment details and invoice ID in order collection
        const order = new Order({
            userId: userId,
            invoiceId: paymentIntent.id,
            status: 'pending'
        });
        await order.save();

        res.json({ success: true, message: 'Payment processed successfully', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error processing payment' });
    }
});

// Route to retrieve orders for the authenticated user
router.get('/orders', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await Order.find({ userId });
        res.json({ orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to send OTP for order delivery confirmation
router.post('/deliver-order/:orderId', verifyToken, async (req, res) => {
    try {
        const otp = generateOTP(); // Implement a function to generate OTP
        const updatedOrder = await Order.findByIdAndUpdate(req.params.orderId, { status: 'delivered', otp });

        // Send OTP to user's mobile number using Twilio
        const message = await twilio.messages.create({
            body: Your order has been delivered. Please use the following OTP to confirm the delivery: ${otp},
            from: 'your_twilio_phone_number',
            to: 'user_mobile_number' // Replace with actual user's mobile number
        });

        console.log('OTP sent:', message.sid);
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'Token not provided' });
    }
    jwt.verify(token, 'your_secret_key', (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
}

// Function to generate OTP
function generateOTP() {
    // Implement OTP generation logic
}

module.exports = router;