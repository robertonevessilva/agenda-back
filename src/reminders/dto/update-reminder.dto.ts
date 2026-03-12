import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ReminderPriority } from './create-reminder.dto';

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  remindAt?: string;

  @IsOptional()
  @IsEnum(ReminderPriority)
  priority?: ReminderPriority;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
