import Checklist, { IChecklist } from '../models/Checklist';
import { publishMessage } from '../redis';

const CHECKLIST_CHANNEL = 'checklists:updates';

interface ChecklistFilter {
  title?: string;
  type?: 'maintenance' | 'inspection' | 'safety' | 'procedure' | 'other';
  assetId?: string;
  workOrderId?: string;
  assignedTo?: string;
  status?: 'draft' | 'active' | 'completed' | 'overdue' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdBy?: string;
  dueDate?: Date;
  dueBefore?: Date;
  dueAfter?: Date;
}

export const checklistService = {
  // Create a new checklist
  async createChecklist(data: Omit<IChecklist, '_id' | 'progress'>): Promise<IChecklist> {
    const checklist = new Checklist({
      ...data,
      progress: 0
    });
    
    const savedChecklist = await checklist.save();
    
    await publishMessage(CHECKLIST_CHANNEL, {
      type: 'CHECKLIST_CREATED',
      data: savedChecklist,
    });
    
    return savedChecklist;
  },
  
  // Get checklists with filtering
  async getChecklists(
    filter: ChecklistFilter, 
    options: { limit?: number; skip?: number; sort?: string } = {}
  ): Promise<IChecklist[]> {
    const { limit = 50, skip = 0, sort = '-createdAt' } = options;
    const query: any = {};
    
    if (filter.title) query.title = { $regex: filter.title, $options: 'i' };
    if (filter.type) query.type = filter.type;
    if (filter.assetId) query.assetId = filter.assetId;
    if (filter.workOrderId) query.workOrderId = filter.workOrderId;
    if (filter.assignedTo) query.assignedTo = filter.assignedTo;
    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.createdBy) query.createdBy = filter.createdBy;
    
    // Handle due date filtering
    if (filter.dueDate) query.dueDate = filter.dueDate;
    if (filter.dueBefore) query.dueDate = { ...query.dueDate, $lte: filter.dueBefore };
    if (filter.dueAfter) query.dueDate = { ...query.dueDate, $gte: filter.dueAfter };
    
    return Checklist.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  },
  
  // Get checklist by ID
  async getChecklistById(checklistId: string): Promise<IChecklist | null> {
    return Checklist.findById(checklistId);
  },
  
  // Update checklist
  async updateChecklist(checklistId: string, updates: Partial<IChecklist>, userId: string): Promise<IChecklist | null> {
    // Add modifiedBy field
    const updateData = {
      ...updates,
      modifiedBy: userId
    };
    
    const updatedChecklist = await Checklist.findByIdAndUpdate(
      checklistId,
      updateData,
      { new: true }
    );
    
    if (updatedChecklist) {
      await publishMessage(CHECKLIST_CHANNEL, {
        type: 'CHECKLIST_UPDATED',
        data: updatedChecklist,
      });
    }
    
    return updatedChecklist;
  },
  
  // Update checklist item status
  async updateChecklistItem(
    checklistId: string, 
    itemId: string, 
    updates: { isCompleted: boolean; notes?: string; }, 
    userId: string
  ): Promise<IChecklist | null> {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) return null;
    
    // Find the item
    const item = checklist.items.id(itemId);
    if (!item) return null;
    
    // Update the item
    item.isCompleted = updates.isCompleted;
    if (updates.notes) item.notes = updates.notes;
    
    if (updates.isCompleted) {
      item.completedBy = userId;
      item.completedAt = new Date();
    }
    
    // Add modified by information
    checklist.modifiedBy = userId;
    
    // Save the checklist (progress will be auto-calculated in pre-save hook)
    const savedChecklist = await checklist.save();
    
    await publishMessage(CHECKLIST_CHANNEL, {
      type: 'CHECKLIST_ITEM_UPDATED',
      data: {
        checklist: savedChecklist,
        itemId,
        userId,
      },
    });
    
    return savedChecklist;
  },
  
  // Add an item to a checklist
  async addChecklistItem(
    checklistId: string, 
    item: { title: string; description?: string; }, 
    userId: string
  ): Promise<IChecklist | null> {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) return null;
    
    // Add the new item
    checklist.items.push({
      title: item.title,
      description: item.description,
      isCompleted: false,
    });
    
    // Add modified by information
    checklist.modifiedBy = userId;
    
    // Save the checklist
    const savedChecklist = await checklist.save();
    
    await publishMessage(CHECKLIST_CHANNEL, {
      type: 'CHECKLIST_ITEM_ADDED',
      data: {
        checklist: savedChecklist,
        userId,
      },
    });
    
    return savedChecklist;
  },
  
  // Remove an item from a checklist
  async removeChecklistItem(
    checklistId: string, 
    itemId: string, 
    userId: string
  ): Promise<IChecklist | null> {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) return null;
    
    // Remove the item
    checklist.items.id(itemId)?.deleteOne();
    
    // Add modified by information
    checklist.modifiedBy = userId;
    
    // Save the checklist
    const savedChecklist = await checklist.save();
    
    await publishMessage(CHECKLIST_CHANNEL, {
      type: 'CHECKLIST_ITEM_REMOVED',
      data: {
        checklist: savedChecklist,
        itemId,
        userId,
      },
    });
    
    return savedChecklist;
  },
  
  // Mark checklist as completed
  async completeChecklist(checklistId: string, userId: string): Promise<IChecklist | null> {
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) return null;
    
    // Mark all items as completed
    checklist.items.forEach(item => {
      if (!item.isCompleted) {
        item.isCompleted = true;
        item.completedBy = userId;
        item.completedAt = new Date();
      }
    });
    
    // Update checklist status
    checklist.status = 'completed';
    checklist.completedBy = userId;
    checklist.completedAt = new Date();
    checklist.modifiedBy = userId;
    
    // Save the checklist
    const savedChecklist = await checklist.save();
    
    await publishMessage(CHECKLIST_CHANNEL, {
      type: 'CHECKLIST_COMPLETED',
      data: {
        checklist: savedChecklist,
        userId,
      },
    });
    
    return savedChecklist;
  },
  
  // Delete checklist
  async deleteChecklist(checklistId: string): Promise<boolean> {
    const result = await Checklist.findByIdAndDelete(checklistId);
    
    if (result) {
      await publishMessage(CHECKLIST_CHANNEL, {
        type: 'CHECKLIST_DELETED',
        data: {
          checklistId,
        },
      });
    }
    
    return !!result;
  },
  
  // Get checklists due soon
  async getChecklistsDueSoon(daysThreshold: number = 3): Promise<IChecklist[]> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    return Checklist.find({
      status: 'active',
      dueDate: { $gte: now, $lte: thresholdDate }
    }).sort({ dueDate: 1 });
  },
  
  // Get overdue checklists
  async getOverdueChecklists(): Promise<IChecklist[]> {
    const now = new Date();
    
    // Find active checklists with due date in the past
    const overdueChecklists = await Checklist.find({
      status: 'active',
      dueDate: { $lt: now }
    });
    
    // Update their status to overdue
    for (const checklist of overdueChecklists) {
      checklist.status = 'overdue';
      await checklist.save();
    }
    
    return overdueChecklists;
  },
  
  // Get checklist counts by status
  async getChecklistCountsByStatus(): Promise<Record<string, number>> {
    const result = await Checklist.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    
    const counts: Record<string, number> = {
      draft: 0,
      active: 0,
      completed: 0,
      overdue: 0,
      cancelled: 0,
    };
    
    result.forEach((item) => { counts[item._id] = item.count; });
    return counts;
  }
};

export default checklistService;