import Notification from "../models/notification.model.js";
import { emitEvent } from "../socket/socketHandler.js";

// Helper to create notification (internal use)
export const createNotificationInternal = async (recipientId, title, message, type, link, relatedId) => {
    try {
        const notification = await Notification.create({
            recipient: recipientId,
            title,
            message,
            type,
            link,
            relatedId
        });
        
        // Emit socket event to specific user room if we interpret room architecture, 
        // or just broadcast to 'employee_notification_${recipientId}' event name for simplicity in this project structure
        // Since the current socket handler emits generally or creates rooms, we'll emit a specific event name pattern 
        // that the client can listen to, OR utilize a room based approach.
        // Looking at Dashboard.jsx: `socket.on("client_data_change", ...)` - it seems global.
        // For individual targeting without auth context in socket, we might need a specific channel key.
        // Let's use `notification_${recipientId}`.
        
        emitEvent(`notification_${recipientId}`, notification);
        
        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

// GET my notifications
export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        
        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 for now
            
        return res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// Mark as Read
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id || req.user._id;
        
        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: userId },
            { isRead: true },
            { new: true }
        );
        
        if(!notification) return res.status(404).json({ success: false, message: "Notification not found" });
        
        return res.status(200).json({ success: true, notification });
    } catch (error) {
        console.error("Mark read error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// Mark ALL as Read
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        
        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );
        
        return res.status(200).json({ success: true, message: "All marked as read" });
    } catch (error) {
        console.error("Mark all read error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
