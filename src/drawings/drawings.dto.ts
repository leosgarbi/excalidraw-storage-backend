import {
  Allow,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const EMPTY_CONTENT = {
  type: 'excalidraw',
  version: 2,
  source: 'excalidraw-saas',
  elements: [],
  appState: {},
  files: {},
};

export class CreateDrawingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;
}

export class UpdateContentDto {
  // shape valid Excalidraw content; we sanitize at service level.
  // @Allow() libera o whitelist do ValidationPipe sem impor tipo (JSON livre).
  @Allow()
  elements?: unknown;

  @Allow()
  appState?: unknown;

  @Allow()
  files?: unknown;
}

export class RenameDrawingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UpdateMemberDto {
  @IsIn(['EDITOR', 'VIEWER'])
  role!: 'EDITOR' | 'VIEWER';
}

export class CreateInviteDto {
  @IsString()
  email!: string;

  @IsIn(['EDITOR', 'VIEWER'])
  role!: 'EDITOR' | 'VIEWER';
}
