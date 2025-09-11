// 🎫 Complete Event Booking Frontend Integration Examples

// ================================
// 1. BOOKING FLOW WITH TOAST NOTIFICATIONS
// ================================

interface BookingResponse {
  status: string;
  message: string;
  data: {
    booking: any;
    ticketLinks?: {
      download: string;
      qrCode: string;
      details: string;
    };
    toast: {
      type: 'success' | 'error' | 'warning' | 'info';
      title: string;
      message: string;
      duration: number;
      actions?: Array<{
        label: string;
        action: string;
        url: string;
      }>;
    };
    notification: {
      type: string;
      title: string;
      message: string;
      eventName: string;
      venue: string;
      eventDate: string;
      bookingId: string;
      quantity: number;
      totalPrice: number;
    };
  };
}

// Example: Book Event
const handleBookEvent = async (eventId: string, quantity: number) => {
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ eventId, quantity })
    });

    const data: BookingResponse = await response.json();
    
    if (response.ok && data.toast) {
      // Show success toast with action buttons
      showToast({
        ...data.toast,
        onAction: (action: string, url: string) => {
          if (action === 'download_ticket') {
            window.open(url, '_blank');
          } else if (action === 'view_qr') {
            openQRModal(url);
          }
        }
      });
      
      // Update UI state
      setBookingConfirmed(true);
      setBookingId(data.data.booking.id);
      
    } else if (!response.ok) {
      // Handle booking failure
      showToast({
        type: 'error',
        title: 'Booking Failed',
        message: data.message || 'Unable to complete booking',
        duration: 5000
      });
    }
  } catch (error) {
    showToast({
      type: 'error',
      title: 'Network Error',
      message: 'Please check your connection and try again',
      duration: 5000
    });
  }
};

// ================================
// 2. WAITLIST SYSTEM
// ================================

interface WaitlistResponse {
  status: string;
  data: {
    waitlistEntry: {
      id: string;
      position: number;
      status: string;
    };
    toast: {
      type: string;
      title: string;
      message: string;
      duration: number;
    };
  };
}

// Join Waitlist when event is full
const handleJoinWaitlist = async (eventId: string) => {
  try {
    const response = await fetch(`/api/waitlist/join/${eventId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data: WaitlistResponse = await response.json();
    
    if (response.ok) {
      showToast({
        type: 'success',
        title: '📝 Joined Waitlist!',
        message: `You are #${data.data.waitlistEntry.position} in line. We'll notify you when tickets become available.`,
        duration: 6000
      });
      
      setWaitlistPosition(data.data.waitlistEntry.position);
      setIsOnWaitlist(true);
    }
  } catch (error) {
    console.error('Failed to join waitlist:', error);
  }
};

// ================================
// 3. EVENT DISPLAY WITH AVAILABILITY
// ================================

interface EventDetails {
  event: {
    id: string;
    name: string;
    venue: string;
    startTime: string;
    availableCapacity: number;
    capacity: number;
    price: number;
  };
  userStatus: {
    hasBooking: boolean;
    bookingId?: string;
    waitlistPosition?: number;
    canJoinWaitlist: boolean;
    canBook: boolean;
  } | null;
  availability: {
    isFull: boolean;
    available: number;
    total: number;
    waitlistCount: number;
    bookingsCount: number;
  };
}

// React Component for Event Card
const EventCard = ({ eventId }: { eventId: string }) => {
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  
  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    const response = await fetch(`/api/events/${eventId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setEventDetails(data.data);
  };

  const renderBookingButton = () => {
    if (!eventDetails) return null;
    
    const { userStatus, availability } = eventDetails;
    
    if (userStatus?.hasBooking) {
      return (
        <div className="space-y-2">
          <div className="bg-green-100 text-green-800 px-3 py-2 rounded">
            ✅ You have a ticket for this event
          </div>
          <button 
            onClick={() => downloadTicket(userStatus.bookingId!)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            📱 Download Ticket
          </button>
        </div>
      );
    }
    
    if (userStatus?.waitlistPosition) {
      return (
        <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded">
          ⏳ You're #{userStatus.waitlistPosition} on the waitlist
        </div>
      );
    }
    
    if (availability.isFull && userStatus?.canJoinWaitlist) {
      return (
        <div className="space-y-2">
          <div className="text-red-600 font-semibold">
            🔴 Event Full ({availability.waitlistCount} people waiting)
          </div>
          <button 
            onClick={() => handleJoinWaitlist(eventDetails.event.id)}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            📝 Join Waitlist
          </button>
        </div>
      );
    }
    
    if (userStatus?.canBook) {
      return (
        <button 
          onClick={() => handleBookEvent(eventDetails.event.id, 1)}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          🎫 Book Now (${eventDetails.event.price})
        </button>
      );
    }
    
    return (
      <div className="text-gray-500">
        Event no longer available for booking
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-bold text-lg">{eventDetails?.event.name}</h3>
      <p className="text-gray-600">📍 {eventDetails?.event.venue}</p>
      <p className="text-gray-600">🗓️ {new Date(eventDetails?.event.startTime || '').toLocaleDateString()}</p>
      
      <div className="text-sm text-gray-500">
        {eventDetails?.availability.available} / {eventDetails?.availability.total} tickets available
      </div>
      
      {renderBookingButton()}
    </div>
  );
};

// ================================
// 4. NOTIFICATION HISTORY
// ================================

interface NotificationHistory {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    data?: any;
  }>;
}

const NotificationsPage = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<NotificationHistory['notifications']>([]);

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setNotifications(data.data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId })
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">📬 Your Notifications</h2>
      
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`border rounded-lg p-4 ${
            notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="font-semibold">{notification.title}</h3>
              <p className="text-gray-700">{notification.message}</p>
              <p className="text-sm text-gray-500">
                {new Date(notification.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            {!notification.read && (
              <button
                onClick={() => markAsRead(notification.id)}
                className="text-blue-600 text-sm hover:underline"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ================================
// 5. ADMIN DASHBOARD
// ================================

const AdminDashboard = () => {
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminOverview();
    fetchUsers();
  }, []);

  const fetchAdminOverview = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/overview', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await response.json();
      setOverview(data.data.overview);
    } catch (error) {
      console.error('Failed to fetch admin overview:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=50', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await response.json();
      setUsers(data.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎛️ Admin Dashboard</h1>
      
      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-semibold">Total Users</h3>
            <p className="text-2xl">{overview.totalUsers}</p>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <h3 className="font-semibold">Total Events</h3>
            <p className="text-2xl">{overview.totalEvents}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded">
            <h3 className="font-semibold">Total Bookings</h3>
            <p className="text-2xl">{overview.totalBookings}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded">
            <h3 className="font-semibold">Revenue Today</h3>
            <p className="text-2xl">${overview.revenueToday}</p>
          </div>
        </div>
      )}
      
      {/* Recent Users */}
      <div>
        <h2 className="text-xl font-semibold mb-4">👥 Recent Users</h2>
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id} className="border rounded p-3 flex justify-between">
              <div>
                <p className="font-medium">{user.name || 'Anonymous'}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <div className="text-right text-sm">
                <p>Role: {user.role}</p>
                <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ================================
// 6. UTILITY FUNCTIONS
// ================================

const downloadTicket = (bookingId: string) => {
  window.open(`/api/tickets/${bookingId}/download`, '_blank');
};

const openQRModal = (qrUrl: string) => {
  // Open QR code in modal or new window
  window.open(qrUrl, '_blank', 'width=400,height=400');
};

const showToast = (toast: any) => {
  // Implement your toast notification system
  console.log('Toast:', toast);
};

export {
  EventCard,
  NotificationsPage,
  AdminDashboard,
  handleBookEvent,
  handleJoinWaitlist
};
