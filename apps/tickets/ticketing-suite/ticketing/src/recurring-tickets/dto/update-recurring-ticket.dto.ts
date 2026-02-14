import { IsString, IsEnum, IsInt, IsOptional, IsDateString, IsBoolean, IsObject, Min } from 'class-validator';
import { RecurrenceFrequency } from './create-recurring-ticket.dto';

export class UpdateRecurringTicketDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  typeKey?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['P1', 'P2', 'P3', 'P4'])
  priority?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalValue?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
