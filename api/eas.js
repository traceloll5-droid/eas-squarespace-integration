// api/eas.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const order = req.body?.data?.object;
    if (!order || order.financialStatus !== 'PAID') {
      return res.status(200).json({ ignored: true });
    }

    const payload = {
      external_id: order.id,
      order_number: order.orderNumber || order.id,
      created_at: order.createdOn,
      customer: { email: order.customerEmail },
      billing_address: { country_code: order.billingAddress?.countryCode || '' },
      shipping_address: { country_code: order.shippingAddress?.countryCode || '' },
      line_items: order.lineItems.map(i => ({
        title: i.productName,
        quantity: i.quantity,
        price: parseFloat(i.unitPricePaid.value)
      })),
      grand_total: parseFloat(order.grandTotal.value),
      currency: order.grandTotal.currency,
      financial_status: 'paid'
    };

    const easResponse = await fetch('https://manager.easproject.com/api/v2/orders/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('OC47441-db54322e1a820b985c696a3b354d1ecab1c564:15de0634aa7e7bf7334fdd6eab3fc8d7d631')
      },
      body: JSON.stringify(payload)
    });

    if (easResponse.ok) {
      console.log('EAS: ORDER IMPORTED SUCCESSFULLY');
      return res.status(200).json({ success: true });
    } else {
      const err = await easResponse.text();
      console.error('EAS REJECTED:', err);
      return res.status(500).json({ error: 'EAS import failed', details: err });
    }
  } catch (error) {
    console.error('FATAL CRASH:', error);
    return res.status(500).json({ error: 'Server crashed', details: error.message });
  }
}
