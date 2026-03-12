export declare enum ReminderPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH"
}
export declare class CreateReminderDto {
    title: string;
    notes?: string;
    remindAt: string;
    priority?: ReminderPriority;
}
