// api/eas.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const order = req.body?.data?.object;
    if (!order || order.financialStatus !== 'PAID') {
      return res.status(200).json({ status: 'ignored' });
    }

    const payload = {
      external_id: order.id,
      order_number: order.orderNumber || order.id,
      created_at: order.createdOn,
      customer: { email: order.customerEmail },
      billing_address: { country_code: order.billingAddress?.countryCode || 'US' },
      shipping_address: { country_code: order.shippingAddress?.countryCode || 'US' },
      line_items: order.lineItems.map(item => ({
        title: item.productName,
        quantity: item.quantity,
        price: parseFloat(item.unitPricePaid.value)
      })),
      grand_total: parseFloat(order.grandTotal.value),
      currency: order.grandTotal.currency,
      financial_status: 'paid'
    };

    const response = await fetch('https://manager.easproject.com/api/v2/orders/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('OC47441-db54322e1a820b985c696a3b354d1ecab1c564:15de0634aa7e7bf7334fdd6eab3fc8d7d631')
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errorText = await response.text();
      console.error('EAS ERROR:', errorText);
      return res.status(500).json({ error: 'EAS rejected', details: errorText });
    }
  } catch (err) {
    console.error('CRASH:', err);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
}
