# Frontend Notification System Guide

## Toast Notifications
All API responses now include a `toast` object for user-friendly notifications:

### Example API Response Structure:
```json
{
  "status": "success",
  "message": "🎉 Booking Confirmed!",
  "data": {
    "booking": { ... },
    "toast": {
      "title": "Booking Confirmed!",
      "message": "Your ticket has been booked successfully. Check your email for confirmation.",
      "type": "success",
      "duration": 5000,
      "actions": [
        {
          "label": "Download Ticket",
          "action": "downloadTicket",
          "bookingId": "booking-id"
        },
        {
          "label": "View Details",
          "action": "viewBooking"
        }
      ]
    }
  }
}
```

### Toast Types:
- `success` - Green toast for successful operations
- `error` - Red toast for errors
- `warning` - Yellow toast for warnings
- `info` - Blue toast for information

## Frontend Integration Examples

### React Toast Component (src/components/Toast.tsx):
```typescript
interface ToastAction {
  label: string;
  action: string;
  bookingId?: string;
}

interface ToastData {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  actions?: ToastAction[];
}

export const Toast = ({ toast, onAction, onClose }: {
  toast: ToastData;
  onAction: (action: string, bookingId?: string) => void;
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const getToastStyle = () => {
    switch (toast.type) {
      case 'success': return 'bg-green-500 text-white';
      case 'error': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className={\`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 \${getToastStyle()}\`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold">{toast.title}</h4>
          <p className="text-sm mt-1">{toast.message}</p>
          {toast.actions && (
            <div className="mt-3 space-x-2">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => onAction(action.action, action.bookingId)}
                  className="px-3 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onClose} className="ml-4 text-xl">&times;</button>
      </div>
    </div>
  );
};
```

### API Call with Toast Integration:
```typescript
const handleBooking = async (eventId: string, quantity: number) => {
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
      },
      body: JSON.stringify({ eventId, quantity })
    });

    const data = await response.json();
    
    if (data.toast) {
      showToast(data.toast);
    }

    if (response.ok) {
      // Handle successful booking
      console.log('Booking created:', data.data.booking);
    }
  } catch (error) {
    showToast({
      title: "Network Error",
      message: "Failed to connect to server. Please try again.",
      type: "error",
      duration: 5000
    });
  }
};

const showToast = (toastData: ToastData) => {
  setCurrentToast(toastData);
};

const handleToastAction = (action: string, bookingId?: string) => {
  switch (action) {
    case 'downloadTicket':
      if (bookingId) {
        window.open(\`/api/tickets/\${bookingId}/download\`, '_blank');
      }
      break;
    case 'viewBooking':
      router.push('/bookings');
      break;
    default:
      console.log('Unknown action:', action);
  }
};
```

## Notification History API

### Get User Notifications:
```
GET /api/notifications/user/:userId
```

### Mark Notification as Read:
```
POST /api/notifications/mark-read
Body: { "notificationId": "notification-id" }
```

### Get Notification Status:
```
GET /api/notifications/status
```

## Admin Dashboard APIs

### Admin Overview:
```
GET /api/admin/dashboard/overview
```

### All Users:
```
GET /api/admin/users?page=1&limit=20&search=email
```

### User Details:
```
GET /api/admin/users/:userId/details
```

## Push Notification Integration
All booking confirmations and waitlist notifications now include both email and push notifications. The toast system provides immediate user feedback while the notification system handles the backend delivery.

### Key Features Implemented:
1. ✅ Toast notifications for all user actions
2. ✅ Booking confirmation with congratulatory messages
3. ✅ Email notifications with SMTP
4. ✅ Push notifications with VAPID keys
5. ✅ QR code ticket generation
6. ✅ Admin dashboard for user management
7. ✅ Notification history system
8. ✅ Search and filtering
9. ✅ Waitlist management

### Next Steps for Frontend:
1. Implement the Toast component
2. Add notification history page
3. Create admin dashboard UI
4. Add push notification subscription UI
5. Integrate seat selection interface (when seat-level booking is completed)
