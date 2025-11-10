import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteTicketsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids!: string[];
}

