import { IsEnum, IsOptional, IsUUID, IsString, IsDateString } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';
export class QueryTicketDto {
  @IsOptional() @IsUUID() siteId?: string;
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() cf_key?: string;
  @IsOptional() @IsString() cf_val?: string;
  @IsOptional() @IsUUID() assignedUserId?: string;
  @IsOptional() @IsDateString() createdFrom?: string;
  @IsOptional() @IsDateString() createdTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() limit = '50';
}
