import Task from "../models/task.model.js";
import Staff from "../models/staff.model.js";
import mongoose from "mongoose";
import { emitEvent } from "../socket/socketHandler.js";
import { createNotificationInternal } from "../controllers/notification.controller.js";
import sendEmail from "../utils/emailService.js";

// ✅ Create Task (Admin)
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;

    if (!title || !assignedTo || !dueDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Handle Admin Attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => ({
            url: `/uploads/tasks/${file.filename}`,
            filename: file.originalname,
            fileType: file.mimetype
        }));
    }

    const task = new Task({
      title,
      description,
      assignedTo,
      priority,
      dueDate,
      attachments, // Save admin uploads
      createdBy: req.user.id || req.user._id
    });

    await task.save();
    
    // Notify Employee
    await createNotificationInternal(
        assignedTo,
        "New Task Assigned",
        `You have been assigned a new task: ${title}`,
        "task_assigned",
        "/employee/dashboard?tab=tasks",
        task._id
    );

    // Populate for immediate return & email
    const populatedTask = await Task.findById(task._id).populate("assignedTo", "name email");

    // Send Email to Employee
    if (populatedTask.assignedTo && populatedTask.assignedTo.email) {
        const emailSubject = `New Task Assigned: ${title}`;
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
            <style>
                .email-container { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
                .header { background: linear-gradient(135deg, #00c8ff 0%, #a855f7 100%); padding: 30px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 24px; letter-spacing: 1px; }
                .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
                .welcome-text { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
                .task-box { background-color: #f8f9fa; border-left: 4px solid #00c8ff; padding: 20px; margin: 25px 0; border-radius: 4px; }
                .task-item { margin-bottom: 10px; font-size: 15px; }
                .task-label { font-weight: 600; color: #666; width: 100px; display: inline-block; }
                .task-value { color: #000; font-weight: 500; }
                .priority-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; color: white; }
                .priority-High { background-color: #ef4444; }
                .priority-Medium { background-color: #f59e0b; }
                .priority-Low { background-color: #10b981; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
                .btn-view { display: inline-block; background: #00c8ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            </style>
            </head>
            <body style="background-color: #f4f4f4; padding: 20px;">
            <div class="email-container">
                <div class="header">
                <h1>New Task Assigned</h1>
                </div>
                <div class="content">
                <div class="welcome-text">Hello, ${populatedTask.assignedTo.name}</div>
                <p>You have been assigned a new task by the admin.</p>
                
                <div class="task-box">
                    <div class="task-item">
                    <span class="task-label">Title:</span>
                    <span class="task-value">${title}</span>
                    </div>
                    <div class="task-item">
                    <span class="task-label">Priority:</span>
                    <span class="priority-badge priority-${priority}">${priority}</span>
                    </div>
                    <div class="task-item">
                    <span class="task-label">Due Date:</span>
                    <span class="task-value">${new Date(dueDate).toLocaleDateString()}</span>
                    </div>
                </div>

                <p><strong>Description:</strong><br/>${description || "No description provided."}</p>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/employee/dashboard?tab=tasks" class="btn-view" style="color: #ffffff;">View Task</a>
                </div>
                </div>
                <div class="footer">
                <p>&copy; ${new Date().getFullYear()} IIPL. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
            </body>
            </html>
        `;
        sendEmail(populatedTask.assignedTo.email, emailSubject, emailHtml);
    }

    return res.status(201).json({ success: true, message: "Task created successfully", task: populatedTask });
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get All Tasks (Admin: All, Employee: Assigned)
export const getTasks = async (req, res) => {
  try {
    const userRole = req.user.role; // 'MASTER_ADMIN', 'admin', 'EMPLOYEE'
    const userId = req.user.id || req.user._id;

    let query = {};
    if (userRole === 'EMPLOYEE' || userRole === 'employee') {
      // Find staff ID for this employee user if structure differs, or assume userId is Staff ID
      // Usually employee auth middleware sets req.user to the employee document or payload
      // In staff.auth.controller, payload is { userId: staff._id, role: staff.role }
      query = { assignedTo: userId };
    }

    // Filter by query params (status, employeeId for admin)
    if (req.query.status) query.status = req.query.status;
    if (req.query.employeeId && (userRole !== 'EMPLOYEE' && userRole !== 'employee')) {
        query.assignedTo = req.query.employeeId;
    }

    // Filter by Date Range (createdAt)
    if (req.query.startDate || req.query.endDate) {
        query.createdAt = {};
        if (req.query.startDate) {
            query.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
            // Set end date to end of day
            const end = new Date(req.query.endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email profileImage")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Update Task (Admin - Edit details)
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, assignedTo } = req.body;

    const task = await Task.findByIdAndUpdate(
      id,
      { title, description, priority, dueDate, assignedTo },
      { new: true }
    ).populate("assignedTo", "name email");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    emitEvent("task_data_change", { action: "update", task });

    return res.status(200).json({ success: true, message: "Task updated", task });
  } catch (error) {
    console.error("Update task error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Delete Task (Admin)
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);
    
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    emitEvent("task_data_change", { action: "delete", taskId: id });

    return res.status(200).json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Update Task Status (Employee)
export const updateTaskStatusEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, summary, links } = req.body;
    const employeeId = req.user.id || req.user._id;

    const task = await Task.findOne({ _id: id, assignedTo: employeeId });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or unauthorized" });
    }

    // If submitting work
    if (status === "Submitted") {
      if (!summary) return res.status(400).json({ success: false, message: "Summary is required for submission" });
      
      const dueDate = new Date(task.dueDate);
      const isLate = new Date() > dueDate;
      
      // Handle file uploads
      let attachments = [];
      if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => ({
            url: `/uploads/tasks/${file.filename}`,
            filename: file.originalname,
            fileType: file.mimetype
        }));
      }

      // Parse links if sent as string (FormData behavior)
      let parsedLinks = links;
      if (typeof links === 'string') {
          try {
              parsedLinks = JSON.parse(links);
          } catch (e) {
              parsedLinks = links ? [links] : [];
          }
      } else if (!parsedLinks) {
          parsedLinks = [];
      }

      task.submission = {
        summary,
        links: parsedLinks,
        attachments: attachments,
        submittedAt: new Date(),
        isLate
      };
      
      task.status = "Submitted";
    } else if (status === "In Progress") {
        task.status = "In Progress";
    } else {
         return res.status(400).json({ success: false, message: "Invalid status update" });
    }

    await task.save();

    const updatedTask = await Task.findById(id).populate("assignedTo", "name email");
    emitEvent("task_data_change", { action: "update", task: updatedTask });

    return res.status(200).json({ success: true, message: `Task ${status}`, task: updatedTask });
  } catch (error) {
    console.error("Update task status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Admin Review (Approve/Reject)
export const reviewTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // Approved / Rejected

    if (!['Completed', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status for review" });
    }

    const task = await Task.findByIdAndUpdate(
        id,
        { status, remarks },
        { new: true }
    ).populate("assignedTo", "name email");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    emitEvent("task_data_change", { action: "review", task });

    return res.status(200).json({ success: true, message: `Task ${status}`, task });
  } catch (error) {
    console.error("Review task error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Dashboard Stats
export const getTaskStats = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id || req.user._id;
        
        let query = {};
        if (userRole === 'EMPLOYEE' || userRole === 'employee') {
            query = { assignedTo: userId };
        }

        const stats = await Task.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
                    submitted: { $sum: { $cond: [{ $eq: ["$status", "Submitted"] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
                    overdue: { 
                        $sum: { 
                            $cond: [
                                { $and: [
                                    { $lt: ["$dueDate", new Date()] },
                                    { $ne: ["$status", "Completed"] }
                                ]}, 
                                1, 
                                0
                            ] 
                        } 
                    }
                }
            }
        ]);

        return res.status(200).json({ success: true, stats: stats[0] || { total: 0, pending: 0, inProgress: 0, submitted: 0, completed: 0, rejected: 0, overdue: 0 } });

    } catch (error) {
        console.error("Task stats error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// ✅ Task Performance Stats (Employee Graphs)
export const getTaskPerformance = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { range = 30 } = req.query; // default 30 days
        // mongoose is imported as default, so use mongoose.Types.ObjectId
        const userObjectId = new mongoose.Types.ObjectId(userId);
    
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - range);
        startDate.setHours(0, 0, 0, 0); // Start of the day
    
        // 1. Aggregation for Completed by Date
        const completedByDate = await Task.aggregate([
          { 
            $match: { 
              assignedTo: userObjectId,
              status: "Completed",
              updatedAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
              count: { $sum: 1 }
            }
          }
        ]);
    
        // 2. Aggregation for Due by Date (Deadlines -> Pending/Upcoming)
        const dueByDate = await Task.aggregate([
          {
            $match: {
              assignedTo: userObjectId,
              dueDate: { $gte: startDate } 
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
              count: { $sum: 1 }
            }
          }
        ]);

        // 3. Aggregation for Assigned by Date (Created)
        const assignedByDate = await Task.aggregate([
            {
                $match: {
                    assignedTo: userObjectId,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            }
        ]);
    
        // Format Data for Time-Series Charts
        const dateMap = {};
        const tempDate = new Date(startDate);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (range > 7 ? 30 : 7)); // Future buffer based on range
        
        while (tempDate <= endDate) {
            const dateStr = tempDate.toISOString().split('T')[0];
            dateMap[dateStr] = { date: dateStr, completed: 0, due: 0, assigned: 0 };
            tempDate.setDate(tempDate.getDate() + 1);
        }
    
        completedByDate.forEach(item => {
            if (dateMap[item._id]) dateMap[item._id].completed = item.count;
        });
    
        dueByDate.forEach(item => {
            if (dateMap[item._id]) dateMap[item._id].due = item.count;
        });

        assignedByDate.forEach(item => {
            if (dateMap[item._id]) dateMap[item._id].assigned = item.count;
        });
    
        const performanceTrend = Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));
        
        return res.status(200).json({ 
            success: true, 
            performanceTrend
        });
    
      } catch (error) {
          console.error("Task performance error:", error);
          return res.status(500).json({ success: false, message: "Server error" });
      }
};
