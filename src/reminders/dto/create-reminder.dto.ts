import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReminderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateReminderDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  remindAt!: string;

  @IsOptional()
  @IsEnum(ReminderPriority)
  priority?: ReminderPriority;
}
