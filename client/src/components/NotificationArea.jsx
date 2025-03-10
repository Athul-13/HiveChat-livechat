import { useState, useEffect } from "react";
import { Bell, CheckCircle } from "lucide-react";
import { notificationService, userService } from "../utils/api";

export default function NotificationsArea({ 
  notifications, 
  setNotifications, 
  setUnreadCount
}) {
  const [loading, setLoading] = useState(false);

  // Auto-mark all notifications as read when component mounts
  useEffect(() => {
    // Only mark as read if there are unread notifications
    const hasUnreadNotifications = notifications.some(notification => !notification.read);
    
    if (hasUnreadNotifications) {
      handleMarkAllAsRead();
    }
  }, []);

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllNotificationsAsRead();
      
      // Update the local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      // Update unread count
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter notifications from the last 2 days
  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

  const recentNotifications = notifications.filter(notification => 
    new Date(notification.createdAt) >= tenMinutesAgo
  );


  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold flex items-center text-black">
          <Bell className="mr-2 text-black" size={18} /> Notifications
        </h2>
        
        {notifications.some(notification => !notification.read) && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={loading}
            className={`flex items-center text-sm px-3 py-1 rounded-md transition-colors ${
              loading
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
            }`}
          >
            <CheckCircle className="mr-1" size={16} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 scrollbar-thin">
        {recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Bell className="text-indigo-400" size={24} />
            </div>
            <p className="text-gray-500">No notifications from the last 2 days</p>
          </div>
        ) : (
          <ul className="p-4 space-y-3">
            {recentNotifications.map((notification) => (
              <li
                key={notification._id}
                className="relative p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-white border border-gray-200"
              >
                <div className="flex justify-between items-center pt-4">
                  <p className="text-sm text-gray-800">{notification.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>

                {/* Notification Type Badge */}
                {notification.type && (
                  <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                    {notification.type}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}