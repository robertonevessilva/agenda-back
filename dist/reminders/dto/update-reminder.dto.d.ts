import { ReminderPriority } from './create-reminder.dto';
export declare class UpdateReminderDto {
    title?: string;
    notes?: string;
    remindAt?: string;
    priority?: ReminderPriority;
    done?: boolean;
}
