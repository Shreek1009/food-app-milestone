import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import passport from 'passport';
import session from 'express-session';
import twilio from 'twilio';

// Import models
import User from './models/User';
import Order from './models/Order';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Express middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy for authentication
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Twilio client for sending OTP
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Route for processing payments
app.post('/payment', async (req, res) => {
  try {
    const { userId, totalAmount } = req.body;
    const invoiceId = 'generateInvoiceId'; // Generate invoice ID

    // Store order details in the database
    const order = new Order({
      userId,
      invoiceId,
      totalAmount,
      paymentStatus: 'pending',
      deliveryStatus: 'pending'
    });
    await order.save();

    res.status(200).json({ message: 'Payment successful', invoiceId });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to retrieve orders for a specific user
app.get('/orders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await Order.find({ userId });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Order retrieval error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route for OTP verification
app.post('/verify-otp', async (req, res) => {
  try {
    const { orderId, otp } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Update delivery status to 'delivered'
    order.deliveryStatus = 'delivered';
    await order.save();

    res.status(200).json({ message: 'Order delivered successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to generate OTP
function generateOTP() {
  // Implement OTP generation logic (e.g., random 6-digit number)
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
