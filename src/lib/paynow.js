import { Paynow } from 'paynow';

const paynow = new Paynow(
  process.env.REACT_APP_PAYNOW_ID,
  process.env.REACT_APP_PAYNOW_KEY
);

paynow.resultUrl = 'http://localhost:8080/payment/result';
paynow.returnUrl = 'http://localhost:8080/payment/return';

export const initiatePayment = async (email, items) => {
  const payment = paynow.createPayment(`Order-${Date.now()}`, email);
  
  items.forEach(item => {
    payment.add(item.name, item.amount);
  });

  try {
    const response = await paynow.send(payment);
    
    if (response.success) {
      return {
        success: true,
        redirectUrl: response.redirectUrl,
        pollUrl: response.pollUrl
      };
    } else {
      return { success: false, error: 'Payment initiation failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const checkPaymentStatus = async (pollUrl) => {
  try {
    const status = await paynow.pollTransaction(pollUrl);
    return {
      paid: status.paid,
      status: status.status
    };
  } catch (error) {
    return { paid: false, error: error.message };
  }
};