import { IsString, IsEnum, IsInt, IsOptional, IsDateString, IsBoolean, IsObject, Min } from 'class-validator';

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export class CreateRecurringTicketDto {
  @IsString()
  siteId: string;

  @IsString()
  typeKey: string;

  @IsString()
  description: string;

  @IsEnum(['P1', 'P2', 'P3', 'P4'])
  priority: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsInt()
  @Min(1)
  intervalValue: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsInt()
  @Min(0)
  leadTimeDays: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
