# 📱 **My Bookings - PDF Download Guide**

## ✅ **Yes, you can download PDF tickets from "My Bookings"!**

I've enhanced the booking system to include download links and actions in the "My Bookings" section.

---

## 🔗 **API Endpoints for My Bookings:**

### **Get My Bookings:**
```
GET /api/bookings/my
Authorization: Bearer <your-token>
```

### **Response includes download links:**
```json
{
  "status": "success",
  "message": "📋 Found 3 bookings for John Doe",
  "data": {
    "bookings": [
      {
        "id": "booking-id",
        "quantity": 2,
        "totalPrice": 50.00,
        "status": "CONFIRMED",
        "displayStatus": "✅ Confirmed",
        "event": {
          "name": "Music Concert",
          "venue": "Arena Hall",
          "startTime": "2025-09-15T19:00:00.000Z"
        },
        "ticket": {
          "ticketNumber": "EVT-ABC12345",
          "downloadUrl": "/api/tickets/booking-id/download",
          "qrCodeUrl": "/api/tickets/booking-id/qr",
          "detailsUrl": "/api/tickets/booking-id/details",
          "canDownload": true,
          "canView": true
        },
        "actions": [
          {
            "label": "Download Ticket",
            "action": "download",
            "url": "/api/tickets/booking-id/download",
            "icon": "📱"
          },
          {
            "label": "View QR Code",
            "action": "view_qr",
            "url": "/api/tickets/booking-id/qr",
            "icon": "📱"
          }
        ]
      }
    ],
    "summary": {
      "total": 3,
      "confirmed": 2,
      "cancelled": 1,
      "pending": 0
    }
  }
}
```

---

## 💻 **Frontend Implementation Example:**

### **React Component for My Bookings:**
```typescript
import React, { useState, useEffect } from 'react';

interface Booking {
  id: string;
  quantity: number;
  totalPrice: number;
  status: string;
  displayStatus: string;
  event: {
    name: string;
    venue: string;
    startTime: string;
  };
  ticket?: {
    ticketNumber: string;
    downloadUrl: string;
    qrCodeUrl: string;
    canDownload: boolean;
  };
  actions: Array<{
    label: string;
    action: string;
    url: string;
    icon: string;
    method?: string;
  }>;
}

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      const response = await fetch('/api/bookings/my', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setBookings(data.data.bookings);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, url: string, method = 'GET') => {
    try {
      if (action === 'download') {
        // Download PDF ticket
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `ticket-${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(downloadUrl);
          
          // Show success message
          alert('✅ Ticket downloaded successfully!');
        }
      } else if (action === 'view_qr') {
        // Open QR code in new window
        window.open(url, '_blank', 'width=400,height=400');
      } else if (action === 'cancel') {
        // Cancel booking
        if (confirm('Are you sure you want to cancel this booking?')) {
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            alert('✅ Booking cancelled successfully!');
            fetchMyBookings(); // Refresh list
          }
        }
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('❌ Action failed. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your bookings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🎫 My Bookings</h1>
      
      {bookings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No bookings found. Book your first event!
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="border rounded-lg p-6 bg-white shadow-sm">
              {/* Event Info */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{booking.event.name}</h3>
                  <p className="text-gray-600">📍 {booking.event.venue}</p>
                  <p className="text-gray-600">
                    🗓️ {new Date(booking.event.startTime).toLocaleDateString()} at{' '}
                    {new Date(booking.event.startTime).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{booking.displayStatus}</div>
                  <div className="text-sm text-gray-600">
                    Quantity: {booking.quantity} | Total: ${booking.totalPrice}
                  </div>
                </div>
              </div>

              {/* Ticket Info */}
              {booking.ticket && (
                <div className="bg-gray-50 rounded p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Ticket #: </span>
                      <span className="font-mono text-blue-600">{booking.ticket.ticketNumber}</span>
                    </div>
                    <div className="text-sm text-green-600">
                      ✅ Ready for download
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {booking.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action.action, action.url, action.method)}
                    className={`px-4 py-2 rounded font-medium flex items-center gap-2 ${
                      action.action === 'download' 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : action.action === 'view_qr'
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
```

---

## 🎯 **What You Get in My Bookings:**

### **For Each Booking:**
- ✅ **Event Details**: Name, venue, date, time
- ✅ **Booking Status**: Confirmed, Cancelled, or Pending
- ✅ **Ticket Number**: `EVT-ABC12345` format
- ✅ **Download Button**: Direct PDF download with QR code
- ✅ **View QR Button**: Quick QR code preview
- ✅ **Cancel Button**: Cancel if still valid

### **PDF Download Features:**
- ✅ **Automatic Download**: Saves as `ticket-[timestamp].pdf`
- ✅ **QR Code Included**: Scannable at event entrance
- ✅ **Event Details**: All booking and event information
- ✅ **Professional Format**: Clean, printable design

---

## 🚀 **How to Use:**

1. **Get My Bookings**: `GET /api/bookings/my`
2. **Download PDF**: Click "📱 Download Ticket" button
3. **View QR Code**: Click "📱 View QR Code" for quick preview
4. **Cancel if Needed**: Click "❌ Cancel Booking" if allowed

---

## ✅ **Summary:**

**Yes, you can absolutely download PDF tickets from your "My Bookings" section!**

- 📱 **Download Button** on each confirmed booking
- 🎫 **PDF includes QR code** for event entry
- 📧 **Same QR code** as in your email
- 🖥️ **Works in browser** - no app needed
- 📱 **Mobile friendly** - works on all devices

The system is fully ready - you just need to implement the frontend component using the example above!
