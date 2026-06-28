/**
 * Razorpay Payment Service for SPORS
 *
 * Uses browser-based checkout (Expo-compatible — no native module needed).
 * The flow:
 *   1. Client calls /create-order on the Express server to get an order ID
 *   2. Client opens Razorpay checkout in a WebView / Alert mock
 *   3. On success, the payment ID is stored locally
 *
 * For now this uses a MOCK flow since the payment server isn't deployed yet.
 * When you deploy the server to Render, update PAYMENT_SERVER_URL.
 */

import RazorpayCheckout from 'react-native-razorpay'
import { RAZORPAY_KEY_ID } from '../constants/subscription'

// Using existing Render deployment — update if you create a separate SPORS service
const PAYMENT_SERVER_URL = 'https://online-food-ordering-system-ffv5.onrender.com'

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
}

export type PaymentResult = {
  success: boolean
  paymentId?: string
  orderId?: string
  error?: string
}

/**
 * Creates a Razorpay order via the backend server.
 */
async function createOrder(amountInRupees: number): Promise<RazorpayOrder> {
  try {
    const response = await fetch(`${PAYMENT_SERVER_URL}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountInRupees }),
    })

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`)
    }

    return (await response.json()) as RazorpayOrder
  } catch (error) {
    console.warn('[SPORS-PAY] Server order creation failed:', error)
    throw new Error('Failed to connect to payment server')
  }
}

/**
 * Opens the real Razorpay checkout flow using the native SDK.
 */
export function openCheckout(
  amountInRupees: number,
  planName: string,
  userInfo: { name: string; email: string }
): Promise<PaymentResult> {
  return new Promise(async (resolve) => {
    try {
      // Step 1: Create order on server
      const order = await createOrder(amountInRupees)

      // Step 2: Configure Razorpay options
      const options = {
        description: `SPORS ${planName} Subscription`,
        image: 'https://your-logo-url.com/logo.png', // Optional: Add SPORS logo URL here
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        name: 'SPORS',
        order_id: order.id,
        prefill: {
          email: userInfo.email,
          contact: '', // Optionally provide contact if available
          name: userInfo.name
        },
        theme: { color: '#418fff' } // Using inversePrimary color from your theme
      }

      // Step 3: Open Razorpay Checkout
      RazorpayCheckout.open(options).then((data: any) => {
        // Success
        resolve({
          success: true,
          paymentId: data.razorpay_payment_id,
          orderId: order.id,
        })
      }).catch((error: any) => {
        // Failure or Cancelled
        resolve({
          success: false,
          error: error.description || error.message || 'Payment failed or cancelled',
        })
      })
    } catch (err: any) {
      resolve({
        success: false,
        error: err.message || 'Payment initialization failed',
      })
    }
  })
}

export const razorpayService = {
  createOrder,
  openCheckout,
  RAZORPAY_KEY_ID,
  PAYMENT_SERVER_URL,
}
